# AeroTwin — Digital Twin for MALE UAV Aero Piston Engines

Prototype for **SIH26054** (DRDO): *AI-Enabled Real-Time Digital Twin System
for Health Monitoring, Fault Prediction and Mission Reliability Enhancement
of Aero Piston Engines used in MALE UAVs.*

## What this is

A working, runnable demonstrator of the full pipeline the problem statement
asks for — built on **simulated** engine telemetry (no dataset was published
for this PS, so a physics-informed simulator stands in for real CAN
bus/ECU-FADEC data). The architecture is designed so the simulator can be
swapped for a real data source later without touching the ML or dashboard
layers.

```
simulator.py   -> generates live engine telemetry + injects fault modes
ml_models.py   -> IsolationForest anomaly detector, RUL regressor,
                  explainable rule-based fault classifier
train_models.py-> trains + saves both models on synthetic runs
backend.py     -> FastAPI service: streams enriched telemetry over
                  WebSocket, exposes fault-injection + replay REST API
dashboard.html -> single-file live dashboard (no build step) — charts,
                  health gauge, RUL countdown, anomaly alert banner
```

## Run it

```bash
pip install -r requirements.txt
python3 train_models.py        # trains + saves models/ (takes ~10s)
uvicorn backend:app --reload --port 8000
```

Then open `dashboard.html` directly in a browser (it connects to
`ws://localhost:8000/ws/stream`).

Use the left panel to:
- switch mission profile (nominal cruise / high altitude / hot weather / rapid throttle)
- **trigger a fault** (overheating, misfire, lubrication loss, vibration, sensor drift) and watch health index, RUL, and the anomaly banner respond live
- clear the fault and watch the engine recover

## How it maps to the PS requirements

| PS ask | This prototype |
|---|---|
| Real-time virtual engine representation | `simulator.py` + WebSocket stream, 1Hz |
| Health monitoring (RPM, CHT, EGT, oil P/T, fuel flow, vibration, battery, injection timing) | All 9 parameters simulated + streamed + charted |
| Anomaly detection | IsolationForest, trained per-mission so "normal" is relative to flight phase |
| Fault prediction / RUL | Ridge regression on health trend + fault severity → seconds-to-critical |
| Mission-wise behavior simulation | 4 mission profiles with distinct baselines |
| Post-flight replay | `/api/replay` endpoint + rolling flight log buffer |
| Explainable AI | Anomaly detector returns top contributing sensors (z-scores); separate rule-based classifier gives a human-readable fault guess as a second opinion |
| Dashboard/HMI | `dashboard.html` — health score, live charts, fault alert banner |

## Known limitations / next steps (good to mention in the pitch)

- Telemetry is simulated, not from a real engine — the ingestion layer is
  built to swap in SocketCAN/ECU data later (`simulator.step()` is the only
  thing that would change)
- RUL model is a lightweight Ridge regression for hackathon speed; a
  physics-informed LSTM would generalize better across unseen fault
  combinations — noted as a roadmap item, not attempted here to keep the
  36-hour build realistic
- Anomaly detector currently isolation-forest per-mission; a longer build
  would add a proper autoencoder for smoother anomaly scoring
