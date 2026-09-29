"""
AeroTwin - Model Training
--------------------------
Generates several synthetic flight runs (healthy + faulted) and trains:
 - AnomalyDetector on healthy-only data
 - RULEstimator on faulted runs that cross the critical health threshold

Run this once before starting the backend:  python3 train_models.py
"""

import pandas as pd
from simulator import generate_dataset, MissionProfile, FaultMode
from ml_models import AutoencoderAnomalyDetector, AnomalyDetector, FaultClassifier, RULEstimator


def main():
    print("Generating healthy training data...")
    healthy_rows = []
    for mission in MissionProfile:
        healthy_rows += generate_dataset(
            n_seconds=1200, mission=mission, seed=hash(mission.value) % 1000
        )
    df_healthy = pd.DataFrame(healthy_rows)

    print(f"  {len(df_healthy)} healthy samples across {len(MissionProfile)} mission profiles")

    print("Training anomaly detector...")
    anomaly = AnomalyDetector()
    anomaly.fit(df_healthy)
    anomaly.save()

    print("Training healthy-only autoencoder...")
    autoencoder = AutoencoderAnomalyDetector()
    autoencoder.fit(df_healthy)
    autoencoder.save()

    print("Generating faulted runs for RUL training...")
    faulted_frames = []
    fault_scenarios = [
        (FaultMode.OVERHEATING, 200, 1600),
        (FaultMode.LUBRICATION, 150, 1600),
        (FaultMode.MISFIRE, 300, 1600),
        (FaultMode.VIBRATION, 250, 1600),
    ]
    for i, (fm, start, end) in enumerate(fault_scenarios):
        rows = generate_dataset(
            n_seconds=1800,
            mission=MissionProfile.NOMINAL,
            fault_windows=[(start, end, fm)],
            seed=100 + i,
        )
        faulted_frames.append(pd.DataFrame(rows))

    df_faulted = pd.concat(faulted_frames, ignore_index=True)
    print(f"  {len(df_faulted)} faulted samples across {len(fault_scenarios)} scenarios")

    print("Training RUL estimator...")
    rul = RULEstimator()
    rows = rul._build_training_rows(df_faulted)
    print(f"  {len(rows)} labeled RUL rows (health crossed critical threshold)")
    rul.fit(df_faulted)
    rul.save()

    print("Training Random Forest fault classifier...")
    classifier = FaultClassifier()
    classifier.fit(pd.concat([df_healthy, df_faulted], ignore_index=True))
    classifier.save()

    print("Done. Models saved to ./models/")


if __name__ == "__main__":
    main()
