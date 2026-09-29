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
 - Comprehensive What-If simulation with multi-parameter projection

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
    """Generate subsystem-specific maintenance recommendations based on current state."""
    recs = []

    # Critical conditions
    if row["health_index"] <= 40 or row.get("rul_seconds", 999999) <= 300:
        return {"priority": "critical", "action": "Abort mission and inspect engine before restart.",
                "details": recs}

    # Lubrication subsystem checks
    lub = row.get("lubrication", {})
    if lub.get("oil_pressure", 99) < 40 or lub.get("oil_starvation_risk", 0) > 40:
        recs.append("Inspect oil pump, oil level and lubrication circuit.")
    if lub.get("oil_temp", 0) > 100 or lub.get("oil_quality_index", 100) < 70:
        recs.append("Check oil quality and cooling — oil temperature elevated.")
    if lub.get("oil_filter_dp", 0) > 8:
        recs.append("Replace oil filter — differential pressure exceeded limit.")
    if lub.get("bearing_risk", 0) > 30:
        recs.append("Inspect main and connecting rod bearings — elevated risk detected.")

    # Fuel subsystem checks
    fuel = row.get("fuel", {})
    if fuel.get("pressure", 99) < 25:
        recs.append("Inspect fuel pump, filter and fuel supply line — pressure low.")
    if fuel.get("filter_dp", 0) > 6:
        recs.append("Replace fuel filter — differential pressure exceeded limit.")
    if fuel.get("injector_health", 100) < 75:
        recs.append("Inspect and clean fuel injectors — degraded performance detected.")
    if fuel.get("starvation_risk", 0) > 30:
        recs.append("Check fuel supply — starvation risk elevated.")
    if fuel.get("pump_health", 100) < 75:
        recs.append("Inspect fuel pump — degraded health detected.")

    # Cooling subsystem checks
    cool = row.get("cooling", {})
    if row["cht"] > 112 or row["egt"] > 700 or cool.get("overheat_risk", 0) > 30:
        recs.append("Inspect cooling airflow, cylinder cooling fins and thermal condition.")
    if cool.get("thermal_margin", 999) < 50:
        recs.append("Reduce power — thermal margin critically low.")
    if cool.get("cooling_effectiveness", 100) < 70:
        recs.append("Inspect cooling system — effectiveness degraded.")

    # Mechanical subsystem checks
    mech = row.get("mechanical", {})
    if row["vibration"] > 1.6 or mech.get("crankshaft_vibration", 0) > 1.5:
        recs.append("Inspect propeller balance, mounts, bearings, and crank train.")
    if mech.get("bearing_failure_risk", 0) > 30:
        recs.append("Inspect bearing condition and oil debris indicators.")
    if mech.get("valve_failure_risk", 0) > 25:
        recs.append("Inspect valve train — timing drift or wear detected.")
    if mech.get("piston_failure_risk", 0) > 25:
        recs.append("Inspect pistons and cylinders — wear indicators elevated.")

    # Magneto / Ignition checks
    if row.get("magneto_health", 100) < 70 or row.get("ignition_stability", 100) < 70:
        recs.append("Inspect magneto, spark plugs and ignition timing.")

    # Oil/temp legacy checks
    if row["oil_pressure"] < 40 or row["oil_temp"] > 110:
        if not any("lubrication" in r.lower() or "oil pump" in r.lower() for r in recs):
            recs.append("Land at the earliest safe opportunity; inspect lubrication system.")

    if row["health_index"] < 75:
        if not recs:
            recs.append("Schedule maintenance at the next turnaround and trend the flagged sensors.")

    # Determine priority
    if any("critical" in r.lower() or "abort" in r.lower() for r in recs):
        priority = "critical"
    elif len(recs) >= 3 or row["health_index"] < 60:
        priority = "high"
    elif recs:
        priority = "medium"
    else:
        priority = "normal"
        recs = ["Continue monitoring; no immediate maintenance action required."]

    return {
        "priority": priority,
        "action": recs[0] if recs else "Continue monitoring; no immediate maintenance action required.",
        "details": recs,
    }


def mission_reliability(row: dict) -> float:
    """Heuristic probability-like score for the current mission state."""
    health_factor = row["health_index"] / 100
    rul_factor = min(1.0, row.get("rul_seconds", 3600) / 3600)
    anomaly_penalty = 0.12 if row.get("anomaly", {}).get("is_anomaly") else 0.0

    # Additional subsystem penalties
    engine_health = row.get("engine_health", {})
    critical_risk = engine_health.get("critical_risk", 0) / 100

    return round(max(0.0, min(100.0,
        (0.6 * health_factor + 0.2 * rul_factor - anomaly_penalty - critical_risk * 0.3) * 100
    )), 1)


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
    """
    Comprehensive What-If projection.

    Accepts multi-category parameters and returns:
    - Current state vs Projected state comparison
    - Per-subsystem projected health
    - Time-series projection at multiple horizons
    - Mission impact assessment
    """
    if not flight_log:
        return JSONResponse({"error": "telemetry is not ready"}, status_code=409)
    latest = dict(flight_log[-1])

    # ---- Parse input parameters (all optional, defaults to current) ----
    # Engine
    engine_load = float(payload.get("engine_load", latest.get("engine_load", 0.65)))
    throttle = float(payload.get("throttle", latest.get("throttle", 0.70)))
    rpm_override = float(payload.get("rpm", latest.get("rpm", 4500)))
    afr = float(payload.get("air_fuel_ratio", latest.get("air_fuel_ratio", 14.7)))

    # Thermal
    ambient_temp = float(payload.get("ambient_temp", latest.get("ambient_temp", 15)))
    cooling_airflow = float(payload.get("cooling_airflow",
                            latest.get("cooling", {}).get("cooling_airflow", 92)))
    cht_override = float(payload.get("cht", latest.get("cht", 95)))
    egt_override = float(payload.get("egt", latest.get("egt", 650)))

    # Lubrication
    oil_pressure = float(payload.get("oil_pressure", latest.get("oil_pressure", 55)))
    oil_temp = float(payload.get("oil_temp", latest.get("oil_temp", 85)))
    oil_flow = float(payload.get("oil_flow",
                     latest.get("lubrication", {}).get("oil_flow_rate", 4.2)))
    oil_level = float(payload.get("oil_level",
                      latest.get("lubrication", {}).get("oil_level", 92)))

    # Fuel
    fuel_pressure = float(payload.get("fuel_pressure",
                          latest.get("fuel", {}).get("pressure", 38)))
    fuel_flow = float(payload.get("fuel_flow", latest.get("fuel_flow", 8.5)))
    fuel_level = float(payload.get("fuel_level",
                       latest.get("fuel", {}).get("tank_level", 78)))
    injector_health = float(payload.get("injector_health",
                            latest.get("fuel", {}).get("injector_health", 96)))

    # Ignition
    magneto_health = float(payload.get("magneto_health", latest.get("magneto_health", 88)))
    ignition_stability = float(payload.get("ignition_stability",
                               latest.get("ignition_stability", 94)))
    timing_drift = float(payload.get("timing_drift", latest.get("timing_drift_deg", 0.04)))
    misfire_prob = float(payload.get("misfire_probability",
                         latest.get("misfire_probability", 6)))

    # Mechanical
    vibration = float(payload.get("vibration", latest.get("vibration", 0.8)))
    bearing_health = float(payload.get("bearing_health",
                           latest.get("mechanical", {}).get("main_bearing_health", 96)))
    piston_health = float(payload.get("piston_health",
                          latest.get("mechanical", {}).get("piston_health", 97)))
    valve_health = float(payload.get("valve_health",
                         latest.get("mechanical", {}).get("valve_health", 97)))
    mechanical_wear = float(payload.get("mechanical_wear",
                            latest.get("mechanical", {}).get("wear_index", 5)))

    # Mission
    mission_duration = float(payload.get("mission_duration", 4.0))  # hours
    remaining_fuel = float(payload.get("remaining_fuel",
                           latest.get("fuel", {}).get("remaining_fuel", 156)))

    # Legacy compatibility
    vibration_delta = float(payload.get("vibration_delta", 0))
    temperature_delta = float(payload.get("temperature_delta", 0))
    horizon = max(60, min(int(payload.get("horizon_seconds", 3600)), 14400))

    # Apply legacy deltas
    vibration += vibration_delta
    cht_override += temperature_delta
    egt_override += temperature_delta * 1.35

    # ---- Compute projected subsystem health ----
    # Lubrication health projection
    lub_penalty = (max(0, 50 - oil_pressure) * 1.0 +
                   max(0, oil_temp - 95) * 0.8 +
                   max(0, 100 - oil_level) * 0.3)
    proj_lub_health = max(0, min(100, 95 - lub_penalty))

    # Fuel health projection
    fuel_penalty = (max(0, 30 - fuel_pressure) * 1.5 +
                    max(0, 85 - injector_health) * 0.5 +
                    max(0, abs(afr - 14.7) - 0.5) * 8)
    proj_fuel_health = max(0, min(100, 95 - fuel_penalty))

    # Cooling health projection
    cool_penalty = (max(0, cht_override - 110) * 0.8 +
                    max(0, egt_override - 700) * 0.3 +
                    max(0, 80 - cooling_airflow) * 0.5 +
                    max(0, ambient_temp - 25) * 0.5)
    proj_cool_health = max(0, min(100, 95 - cool_penalty))
    proj_thermal_margin = max(0, 220 - cht_override)
    proj_overheat_risk = min(100, max(0, 3 + max(0, cht_override - 130) * 1.2))

    # Mechanical health projection
    mech_penalty = (max(0, vibration - 1.0) * 8 +
                    max(0, 85 - bearing_health) * 0.8 +
                    max(0, 85 - piston_health) * 0.6 +
                    max(0, 85 - valve_health) * 0.5 +
                    max(0, mechanical_wear - 10) * 0.8)
    proj_mech_health = max(0, min(100, 95 - mech_penalty))

    # Magneto / ignition health projection
    proj_magneto = max(0, min(100, magneto_health))
    proj_ignition = max(0, min(100, ignition_stability))

    # Overall engine health (weighted)
    weights = {"lub": 0.18, "fuel": 0.18, "cool": 0.16, "mech": 0.18,
               "mag": 0.12, "ign": 0.10, "other": 0.08}
    proj_overall = (weights["lub"] * proj_lub_health +
                    weights["fuel"] * proj_fuel_health +
                    weights["cool"] * proj_cool_health +
                    weights["mech"] * proj_mech_health +
                    weights["mag"] * proj_magneto +
                    weights["ign"] * proj_ignition +
                    weights["other"] * max(0, 100 - misfire_prob * 2))

    # Critical risk and fault probability
    crit_risk = 0.0
    if oil_pressure < 30: crit_risk += 20
    if proj_overheat_risk > 50: crit_risk += 15
    if fuel_pressure < 20: crit_risk += 15
    if bearing_health < 60: crit_risk += 15
    crit_risk = min(100, crit_risk)

    proj_fault_prob = min(1.0, max(0, (100 - proj_overall) / 100 * 0.65 + crit_risk / 100 * 0.35))
    proj_rul = max(0, proj_overall * (1 - proj_fault_prob) * 2)  # hours (simplified)

    # Mission reliability
    proj_mission_rel = max(0, min(100,
        proj_overall * 0.6 + (1 - proj_fault_prob) * 30 + min(1, remaining_fuel / 50) * 10))

    # Fuel endurance
    fuel_endurance = remaining_fuel / max(0.1, fuel_flow) if fuel_flow > 0 else 0

    # Risk level determination
    if proj_overall < 40 or crit_risk > 50:
        risk_level = "CRITICAL"
    elif proj_overall < 65 or crit_risk > 25:
        risk_level = "HIGH"
    elif proj_overall < 80 or crit_risk > 10:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    # Predicted fault
    predicted_fault = "nominal"
    if proj_cool_health < 50 or proj_overheat_risk > 50:
        predicted_fault = "Thermal Overstress"
    elif proj_lub_health < 50:
        predicted_fault = "Lubrication Failure"
    elif proj_fuel_health < 50:
        predicted_fault = "Fuel System Degradation"
    elif proj_mech_health < 50:
        predicted_fault = "Mechanical Wear"
    elif proj_magneto < 60 or proj_ignition < 60:
        predicted_fault = "Ignition System Degradation"
    elif vibration > 2.0:
        predicted_fault = "Abnormal Vibration"

    # Mission status
    if risk_level == "CRITICAL":
        mission_status = "ABORT RECOMMENDED"
        maintenance_urgency = "IMMEDIATE"
    elif risk_level == "HIGH":
        mission_status = "RTB ADVISORY"
        maintenance_urgency = "URGENT"
    elif risk_level == "MODERATE":
        mission_status = "CAUTION"
        maintenance_urgency = "SCHEDULED"
    else:
        mission_status = "CONTINUE"
        maintenance_urgency = "ROUTINE"

    # ---- Time-series projection ----
    time_points = [0, 15, 30, 60, 120, 240]  # minutes
    timeline = []
    for t_min in time_points:
        decay_factor = 1.0 - (t_min / 480) * max(0, 1 - proj_overall / 100)
        t_fault_growth = min(1.0, proj_fault_prob + t_min / 600 * proj_fault_prob)
        timeline.append({
            "time_minutes": t_min,
            "engine_health": round(max(0, proj_overall * decay_factor), 1),
            "rul_hours": round(max(0, proj_rul - t_min / 60 * (1 - decay_factor) * 2), 1),
            "cht": round(cht_override + t_min * 0.05 * max(0, 1 - proj_cool_health / 100), 1),
            "egt": round(egt_override + t_min * 0.08 * max(0, 1 - proj_cool_health / 100), 1),
            "oil_pressure": round(max(5, oil_pressure - t_min * 0.02 * max(0, 1 - proj_lub_health / 100)), 1),
            "vibration": round(max(0.1, vibration + t_min * 0.005 * max(0, 1 - proj_mech_health / 100)), 3),
            "fault_probability": round(min(1.0, t_fault_growth), 3),
            "mission_reliability": round(max(0, proj_mission_rel * decay_factor), 1),
        })

    # ---- Build response ----
    return {
        "inputs": payload,
        "baseline": {
            "health_index": latest["health_index"],
            "rul_hours": latest.get("rul_hours"),
            "rul_seconds": latest.get("rul_seconds"),
            "vibration": latest["vibration"],
            "cht": latest["cht"],
            "egt": latest["egt"],
            "oil_pressure": latest["oil_pressure"],
            "rpm": latest["rpm"],
            "fuel_flow": latest["fuel_flow"],
            "fault_probability": latest["fault_probability"],
            "mission_reliability": latest.get("mission_reliability"),
            "magneto_health": latest.get("magneto_health"),
            "ignition_stability": latest.get("ignition_stability"),
            "lubrication_health": latest.get("lubrication", {}).get("health"),
            "fuel_health": latest.get("fuel", {}).get("health"),
            "cooling_health": latest.get("cooling", {}).get("health"),
            "mechanical_health": latest.get("mechanical", {}).get("health"),
        },
        "projection": {
            "engine_health": round(proj_overall, 1),
            "health_index": round(proj_overall, 1),
            "rul_hours": round(proj_rul, 1),
            "rul_seconds": round(proj_rul * 3600, 1),
            "mission_reliability": round(proj_mission_rel, 1),
            "fault_probability": round(proj_fault_prob, 3),
            "fault_guess": predicted_fault,
            "risk_level": risk_level,
            "maintenance_priority": maintenance_urgency,
            "rpm": round(rpm_override, 1),
            "cht": round(cht_override, 1),
            "egt": round(egt_override, 1),
            "oil_pressure": round(oil_pressure, 1),
            "vibration": round(vibration, 3),
            "fuel_flow": round(fuel_flow, 2),
            "thermal_margin": round(proj_thermal_margin, 1),
            "overheat_risk": round(proj_overheat_risk, 1),
            "subsystem_health": {
                "lubrication": round(proj_lub_health, 1),
                "fuel": round(proj_fuel_health, 1),
                "cooling": round(proj_cool_health, 1),
                "mechanical": round(proj_mech_health, 1),
                "magneto": round(proj_magneto, 1),
                "ignition": round(proj_ignition, 1),
            },
            "maintenance": maintenance_recommendation({
                **latest,
                "health_index": proj_overall,
                "oil_pressure": oil_pressure,
                "oil_temp": oil_temp,
                "cht": cht_override,
                "egt": egt_override,
                "vibration": vibration,
                "magneto_health": magneto_health,
                "ignition_stability": ignition_stability,
                "lubrication": {"oil_pressure": oil_pressure, "oil_temp": oil_temp,
                               "bearing_risk": max(0, 100 - bearing_health),
                               "oil_starvation_risk": max(0, 50 - oil_pressure) * 2},
                "fuel": {"pressure": fuel_pressure, "injector_health": injector_health,
                        "starvation_risk": max(0, 25 - fuel_pressure) * 3,
                        "pump_health": 97},
                "cooling": {"overheat_risk": proj_overheat_risk,
                           "thermal_margin": proj_thermal_margin,
                           "cooling_effectiveness": proj_cool_health},
                "mechanical": {"crankshaft_vibration": vibration * 0.5,
                              "bearing_failure_risk": max(0, 100 - bearing_health),
                              "valve_failure_risk": max(0, 100 - valve_health),
                              "piston_failure_risk": max(0, 100 - piston_health)},
            }),
        },
        "mission_impact": {
            "mission_reliability": round(proj_mission_rel, 1),
            "mission_status": mission_status,
            "estimated_remaining_time": round(min(fuel_endurance, mission_duration), 1),
            "fuel_endurance": round(fuel_endurance, 1),
            "engine_risk": risk_level,
            "abort_risk": round(crit_risk, 1),
            "maintenance_urgency": maintenance_urgency,
        },
        "timeline": timeline,
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

# -------------------------------------------------------------------
# PRODUCTION / DEPLOYMENT STATIC FILE SERVING
# -------------------------------------------------------------------
import os
import pathlib
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

frontend_path = pathlib.Path(__file__).parent.parent / "frontend" / "dist"

if frontend_path.exists():
    # Mount the assets folder (CSS, JS, images)
    app.mount("/assets", StaticFiles(directory=frontend_path / "assets"), name="assets")

    # Catch-all route to serve the React SPA
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Ignore API and WS routes so they return normal 404s if invalid
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
            
        file_path = frontend_path / full_path
        
        # If the file exists (like vite.svg, favicon.ico), serve it
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
            
        # Otherwise, fallback to index.html to let React handle the routing
        return FileResponse(frontend_path / "index.html")
