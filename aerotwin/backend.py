"""
AeroTwin - Backend
-------------------
FastAPI service that:
 - Runs the engine simulator in a background loop
 - Passes each telemetry sample through the anomaly detector + RUL
   estimator + heuristic fault classifier
 - Streams the enriched telemetry to the dashboard over WebSocket
 - Exposes REST endpoints to trigger faults / change mission profile
   (for demo control) and to fetch the flight log for "mission replay"

Run: uvicorn backend:app --reload --port 8000
"""

import asyncio
import json
from collections import deque
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from simulator import EngineSimulator, FaultMode, MissionProfile
from ml_models import AutoencoderAnomalyDetector, AnomalyDetector, FaultClassifier, RULEstimator, classify_fault_heuristic

app = FastAPI(title="AeroTwin API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

sim = EngineSimulator(mission=MissionProfile.NOMINAL, seed=7)

anomaly = AnomalyDetector()
autoencoder = AutoencoderAnomalyDetector()
fault_classifier = FaultClassifier()
rul = RULEstimator()
for model in (anomaly, autoencoder, fault_classifier, rul):
    try:
        model.load()
    except FileNotFoundError:
        print(f"WARNING: {model.__class__.__name__} not found -- run `python3 train_models.py` first.")

flight_log = deque(maxlen=3600)  # rolling 1hr buffer for replay
health_history = deque(maxlen=20)  # for RUL slope calc
event_log = deque(maxlen=250)
last_event_state = {"fault_mode": "none", "anomaly": False}

connected_clients: list[WebSocket] = []


def maintenance_recommendation(row: dict) -> dict:
    if row["health_index"] <= 40 or row.get("rul_seconds", 999999) <= 300:
        return {"priority": "critical", "action": "Abort mission and inspect engine before restart."}
    if row["oil_pressure"] < 40 or row["oil_temp"] > 110:
        return {"priority": "high", "action": "Land at the earliest safe opportunity; inspect lubrication system."}
    if row["cht"] > 112 or row["egt"] > 700:
        return {"priority": "high", "action": "Reduce power and schedule cylinder cooling and ignition inspection."}
    if row["vibration"] > 1.6:
        return {"priority": "high", "action": "Inspect propeller balance, mounts, bearings, and crank train."}
    if row["health_index"] < 75:
        return {"priority": "medium", "action": "Schedule maintenance at the next turnaround and trend the flagged sensors."}
    return {"priority": "normal", "action": "Continue monitoring; no immediate maintenance action required."}


def mission_reliability(row: dict) -> float:
    """Heuristic probability-like score for the current mission state."""
    health_factor = row["health_index"] / 100
    rul_factor = min(1.0, row.get("rul_seconds", 3600) / 3600)
    anomaly_penalty = 0.12 if row.get("anomaly", {}).get("is_anomaly") else 0.0
    return round(max(0.0, min(100.0, (0.7 * health_factor + 0.3 * rul_factor - anomaly_penalty) * 100)), 1)


def record_event(kind: str, message: str, severity: str = "info"):
    event_log.appendleft({
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "kind": kind,
        "severity": severity,
        "message": message,
    })


def enrich(row: dict) -> dict:
    result = dict(row)
    if anomaly.fitted:
        result["anomaly"] = anomaly.score(row)
    if autoencoder.fitted:
        result["autoencoder_anomaly"] = autoencoder.score(row)
        if result["autoencoder_anomaly"]["is_anomaly"]:
            result["anomaly"] = {
                **result.get("anomaly", {}),
                **result["autoencoder_anomaly"],
                "top_contributors": result.get("anomaly", {}).get("top_contributors", []),
            }
    if fault_classifier.fitted:
        result["fault_prediction"] = fault_classifier.predict(row)
        result["fault_guess"] = result["fault_prediction"]["fault"]
    else:
        result["fault_guess"] = classify_fault_heuristic(row)

    health_history.append(row["health_index"])
    slope = 0.0
    if len(health_history) >= 2:
        slope = (health_history[-1] - health_history[0]) / len(health_history)

    if rul.fitted:
        result["rul_seconds"] = round(
            rul.predict(row["health_index"], row["fault_severity"], slope), 1
        )
    result["mission_reliability"] = mission_reliability(result)
    result["maintenance"] = maintenance_recommendation(result)

    anomaly_active = bool(result.get("anomaly", {}).get("is_anomaly"))
    if result["fault_mode"] != last_event_state["fault_mode"]:
        if result["fault_mode"] == "none":
            record_event("fault_cleared", "Active engine fault cleared", "info")
        else:
            record_event("fault_changed", f"Fault mode: {result['fault_mode']}", "warning")
        last_event_state["fault_mode"] = result["fault_mode"]
    if anomaly_active and not last_event_state["anomaly"]:
        record_event("anomaly", f"Anomaly detected: {result['fault_guess']}", "warning")
    last_event_state["anomaly"] = anomaly_active
    return result


@app.get("/api/health")
def api_health():
    return {"status": "ok", "models_loaded": anomaly.fitted and rul.fitted}


@app.post("/api/fault/clear")
def clear_fault():
    sim.clear_fault()
    return {"cleared": True}


@app.post("/api/fault/{fault_name}")
def trigger_fault(fault_name: str):
    try:
        fm = FaultMode(fault_name)
    except ValueError:
        return JSONResponse({"error": f"unknown fault '{fault_name}'"}, status_code=400)
    sim.trigger_fault(fm)
    return {"triggered": fm.value}


@app.post("/api/mission/{mission_name}")
def set_mission(mission_name: str):
    try:
        mp = MissionProfile(mission_name)
    except ValueError:
        return JSONResponse({"error": f"unknown mission '{mission_name}'"}, status_code=400)
    sim.mission = mp
    return {"mission": mp.value}

@app.get("/api/missions")
def list_missions():
    return {"missions": [m.value for m in MissionProfile], "faults": [f.value for f in FaultMode]}

@app.get("/api/replay")
def get_replay(last_n: int = 300):
    return {"log": list(flight_log)[-last_n:]}


@app.get("/api/events")
def get_events(last_n: int = 50):
    return {"events": list(event_log)[:max(1, min(last_n, 250))]}


@app.get("/api/reliability")
def get_reliability():
    if not flight_log:
        return {"mission_reliability": None, "maintenance": None}
    latest = flight_log[-1]
    return {
        "mission_reliability": latest["mission_reliability"],
        "maintenance": latest["maintenance"],
    }


@app.post("/api/what-if")
def what_if(payload: dict):
    """Project health and RUL for sensor stress without mutating live state."""
    if not flight_log:
        return JSONResponse({"error": "telemetry is not ready"}, status_code=409)
    latest = dict(flight_log[-1])
    vibration_delta = float(payload.get("vibration_delta", 0))
    temperature_delta = float(payload.get("temperature_delta", 0))
    horizon = max(60, min(int(payload.get("horizon_seconds", 900)), 7200))
    projected = dict(latest)
    projected["vibration"] = max(0, latest["vibration"] + vibration_delta)
    projected["cht"] = latest["cht"] + temperature_delta
    projected["egt"] = latest["egt"] + temperature_delta * 1.35
    projected["oil_temp"] = latest["oil_temp"] + temperature_delta * 0.45
    stress_penalty = (max(0, vibration_delta) * 8) + (max(0, temperature_delta) * 0.6)
    projected["health_index"] = max(0.0, latest["health_index"] - stress_penalty * (horizon / 900))
    projected["fault_severity"] = min(1.0, latest["fault_severity"] + stress_penalty / 100)
    projected["rul_seconds"] = max(0.0, latest.get("rul_seconds", 0) - stress_penalty * horizon / 10)
    projected["anomaly"] = {"is_anomaly": stress_penalty > 3}
    projected["mission_reliability"] = mission_reliability(projected)
    projected["maintenance"] = maintenance_recommendation(projected)
    return {
        "inputs": {"vibration_delta": vibration_delta, "temperature_delta": temperature_delta, "horizon_seconds": horizon},
        "baseline": {
            "health_index": latest["health_index"],
            "rul_seconds": latest.get("rul_seconds"),
            "vibration": latest["vibration"],
            "cht": latest["cht"],
        },
        "projection": {
            "health_index": round(projected["health_index"], 1),
            "rul_seconds": round(projected["rul_seconds"], 1),
            "mission_reliability": projected["mission_reliability"],
            "fault_guess": classify_fault_heuristic(projected),
            "maintenance": projected["maintenance"],
            "vibration": round(projected["vibration"], 3),
            "cht": round(projected["cht"], 1),
            "egt": round(projected["egt"], 1),
        },
    }


@app.websocket("/ws/stream")
async def stream(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            await asyncio.sleep(2)  # heartbeat / keep-alive; data pushed by background loop
    except WebSocketDisconnect:
        connected_clients.remove(ws)


async def simulation_loop():
    while True:
        row = sim.step(dt=1.0)
        enriched = enrich(row)
        flight_log.append(enriched)
        dead = []
        for client in connected_clients:
            try:
                await client.send_text(json.dumps(enriched))
            except Exception:
                dead.append(client)
        for d in dead:
            if d in connected_clients:
                connected_clients.remove(d)
        await asyncio.sleep(1.0)  # 1 Hz telemetry, matches sim dt


@app.on_event("startup")
async def startup():
    asyncio.create_task(simulation_loop())
