"""
AeroTwin - AI/ML Layer
-----------------------
1. AnomalyDetector: IsolationForest trained on "healthy" telemetry.
   Flags deviations in real time + gives a per-feature contribution
   score for explainability (which sensor is driving the anomaly).
2. RULEstimator: lightweight regression that maps current fault
   severity + trend of health_index to an estimated Remaining Useful
   Life (in seconds/minutes of flight before recommended abort).

Kept intentionally lightweight (scikit-learn only) so it trains in
seconds during a hackathon demo and has no heavy GPU/deep-learning
dependency -- but the interface is swappable for an LSTM later.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, IsolationForest, RandomForestClassifier
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import os

FEATURES = [
    "rpm", "cht", "egt", "oil_pressure", "oil_temp",
    "fuel_flow", "vibration", "battery_v", "injection_timing",
]

MISSIONS = ["nominal_cruise", "high_altitude", "hot_weather", "rapid_throttle_transitions"]


def _mission_onehot(mission: str):
    return [1.0 if mission == m else 0.0 for m in MISSIONS]

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)


class AnomalyDetector:
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=200, contamination=0.05, random_state=42
        )
        self.fitted = False

    def fit(self, df: pd.DataFrame):
        base = df[FEATURES].values
        mission_oh = np.array([_mission_onehot(m) for m in df["mission"]])
        X = np.hstack([base, mission_oh])
        Xs = self.scaler.fit_transform(X)
        self.model.fit(Xs)
        self.fitted = True

    def score(self, row: dict) -> dict:
        """Return an anomaly flag, score, and top contributing sensors."""
        base = [row[f] for f in FEATURES]
        mission_oh = _mission_onehot(row.get("mission", "nominal_cruise"))
        x = np.array([base + mission_oh])
        xs = self.scaler.transform(x)
        raw_score = self.model.decision_function(xs)[0]
        is_anomaly = self.model.predict(xs)[0] == -1
        z = xs[0][:len(FEATURES)]
        contrib = sorted(zip(FEATURES, np.abs(z)), key=lambda kv: kv[1], reverse=True)[:3]
        return {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": round(float(-raw_score), 4),
            "top_contributors": [{"feature": f, "z_score": round(float(v), 2)} for f, v in contrib],
        }

    def save(self):
        joblib.dump((self.scaler, self.model), os.path.join(MODEL_DIR, "anomaly.pkl"))

    def load(self):
        self.scaler, self.model = joblib.load(os.path.join(MODEL_DIR, "anomaly.pkl"))
        self.fitted = True


class AutoencoderAnomalyDetector:
    """Small healthy-only reconstruction model for sensor anomaly scoring."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.model = MLPRegressor(hidden_layer_sizes=(16, 8, 16), max_iter=300, random_state=42)
        self.threshold = 0.0
        self.fitted = False

    def fit(self, df: pd.DataFrame):
        X = self.scaler.fit_transform(df[FEATURES].values)
        self.model.fit(X, X)
        errors = np.mean((self.model.predict(X) - X) ** 2, axis=1)
        self.threshold = float(np.percentile(errors, 97.5))
        self.fitted = True

    def score(self, row: dict) -> dict:
        x = self.scaler.transform([[row[f] for f in FEATURES]])
        error = float(np.mean((self.model.predict(x)[0] - x[0]) ** 2))
        return {
            "is_anomaly": error > self.threshold,
            "anomaly_score": round(error / max(self.threshold, 1e-6), 4),
        }

    def save(self):
        joblib.dump((self.scaler, self.model, self.threshold), os.path.join(MODEL_DIR, "autoencoder.pkl"))

    def load(self):
        self.scaler, self.model, self.threshold = joblib.load(os.path.join(MODEL_DIR, "autoencoder.pkl"))
        self.fitted = True


class FaultClassifier:
    """Random Forest classifier trained on labeled simulator fault modes."""

    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=180, random_state=42, class_weight="balanced")
        self.fitted = False

    def fit(self, df: pd.DataFrame):
        self.model.fit(df[FEATURES].values, df["fault_mode"].values)
        self.fitted = True

    def predict(self, row: dict) -> dict:
        X = [[row[f] for f in FEATURES]]
        label = str(self.model.predict(X)[0])
        probabilities = self.model.predict_proba(X)[0]
        confidence = float(max(probabilities))
        return {"fault": label, "confidence": round(confidence, 3)}

    def save(self):
        joblib.dump(self.model, os.path.join(MODEL_DIR, "fault_classifier.pkl"))

    def load(self):
        self.model = joblib.load(os.path.join(MODEL_DIR, "fault_classifier.pkl"))
        self.fitted = True


class RULEstimator:
    """
    Trains on (health_index, fault_severity, rate-of-change of health_index)
    -> remaining_seconds_to_critical, using labeled synthetic degradation
    runs (health_index crosses a critical threshold at the end of each run).
    """

    CRITICAL_HEALTH = 40.0

    def __init__(self):
        self.model = HistGradientBoostingRegressor(max_iter=180, learning_rate=0.06, max_leaf_nodes=15, random_state=42)
        self.fitted = False

    def _build_training_rows(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["health_roll"] = df["health_index"].rolling(10, min_periods=1).mean()
        df["health_slope"] = df["health_index"].diff().rolling(10, min_periods=1).mean().fillna(0)

        # find first time health crosses critical (if it does in this run)
        below = df.index[df["health_index"] <= self.CRITICAL_HEALTH]
        t_critical = df.loc[below[0], "t"] if len(below) else None

        if t_critical is None:
            df["rul_seconds"] = np.nan  # no failure in this run, drop later
        else:
            df["rul_seconds"] = (t_critical - df["t"]).clip(lower=0)
        return df.dropna(subset=["rul_seconds"])

    def fit(self, df: pd.DataFrame):
        rows = self._build_training_rows(df)
        if len(rows) < 20:
            # not enough failure examples in this run; still fit on what's there
            pass
        X = rows[["health_index", "fault_severity", "health_slope"]].values
        y = rows["rul_seconds"].values
        self.model.fit(X, y)
        self.fitted = True

    def predict(self, health_index: float, fault_severity: float, health_slope: float) -> float:
        x = np.array([[health_index, fault_severity, health_slope]])
        pred = float(self.model.predict(x)[0])
        return max(0.0, pred)

    def save(self):
        joblib.dump(self.model, os.path.join(MODEL_DIR, "rul.pkl"))

    def load(self):
        self.model = joblib.load(os.path.join(MODEL_DIR, "rul.pkl"))
        self.fitted = True


def classify_fault_heuristic(row: dict) -> str:
    """
    Lightweight rule-augmented classifier (explainable by design, per the
    PS's 'Explainable AI for fault diagnosis' innovation area) that maps
    current sensor pattern -> most likely fault category. Runs alongside
    the anomaly detector; anomaly detector says "something's wrong",
    this says "here's probably what".
    """
    if row["oil_pressure"] < 40 and row["oil_temp"] > 95:
        return "lubrication_loss"
    if row["cht"] > 112 or row["egt"] > 690:
        return "overheating"
    if row["vibration"] > 1.6:
        return "abnormal_vibration"
    if row["rpm"] < 4200 and row["fuel_flow"] < 7.8:
        return "misfire"
    return "nominal"
