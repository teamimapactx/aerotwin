# AeroTwin — Integrated Mission Control

This package combines the **new Stitch-generated React frontend** with the **existing AeroTwin FastAPI + simulator + ML backend**.

## What is already connected

- Stitch React/Vite frontend
- FastAPI backend
- Live WebSocket telemetry: `/ws/stream`
- Existing `simulator.py`
- Existing anomaly/RUL/fault ML models
- Fault trigger and clear controls
- What-If API
- Mission reliability and maintenance data
- Live Magneto & Ignition telemetry
- Backend connection indicator: CONNECTED / RECONNECTING / DISCONNECTED

## Easiest Windows setup

1. Install Python 3.11+ and Node.js 20+.
2. Double-click `RUN_AEROTWIN_WINDOWS.bat`.
3. Wait for both terminals to start.
4. Open `http://localhost:3000`.
5. Backend API docs are at `http://localhost:8000/docs`.

## Manual setup

### Backend

```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn backend:app --reload --port 8000
```

### Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:3000`).

## Important architecture

```text
Stitch React Frontend
        |
        | REST + WebSocket
        v
FastAPI backend
        |
        +-- simulator.py
        +-- ML models
        +-- fault injection
        +-- What-If engine
        +-- mission reliability
        +-- maintenance logic
```

The frontend keeps its visual design/components, but live engine values are now supplied by the AeroTwin backend instead of being the primary source of truth.

## If the dashboard says RECONNECTING

Make sure the backend terminal is running first:

```bash
cd backend
py -m uvicorn backend:app --reload --port 8000
```

Then refresh the frontend.
