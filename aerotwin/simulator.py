"""
AeroTwin - Engine Simulator
----------------------------
Generates realistic time-series telemetry for a MALE UAV aero piston engine,
with a lightweight physics-informed model (thermodynamic-ish heuristics) plus
noise, and the ability to inject specific fault modes over time.

This stands in for the real CAN bus / ECU-FADEC data feed the actual DRDO
deployment would use. Swap `EngineSimulator.step()` for a real data source
later without touching the rest of the pipeline.
"""

import numpy as np
from dataclasses import dataclass
from enum import Enum


class FaultMode(str, Enum):
    NONE = "none"
    MISFIRE = "misfire"
    OVERHEATING = "overheating"
    LUBRICATION = "lubrication_loss"
    SENSOR_DRIFT = "sensor_drift"
    VIBRATION = "abnormal_vibration"


class MissionProfile(str, Enum):
    """
    NOTE: these represent environmental/operational stress *relative to*
    the engine's designed steady-state -- not literal low-vs-high altitude.
    A MALE (Medium Altitude Long Endurance) UAV's normal cruise regime
    already IS at altitude (typically 15,000-30,000 ft); NOMINAL below
    represents that designed cruise point. HIGH_ALTITUDE represents
    pushing further toward the airframe's service ceiling, where thinner
    air stresses cooling/combustion beyond the nominal design point.
    """
    NOMINAL = "nominal_cruise"
    HIGH_ALTITUDE = "high_altitude"
    HOT_WEATHER = "hot_weather"
    RAPID_THROTTLE = "rapid_throttle_transitions"


@dataclass
class EngineState:
    throttle: float = 0.70
    engine_load: float = 0.65
    altitude: float = 20000.0  # ft
    ambient_temp: float = 15.0  # C
    manifold_pressure: float = 28.0  # atm
    air_fuel_ratio: float = 14.7
    t: float = 0.0
    rpm: float = 4500.0
    cht: float = 95.0          # Cylinder Head Temp (C)
    egt: float = 650.0         # Exhaust Gas Temp (C)
    oil_pressure: float = 55.0  # psi
    oil_temp: float = 85.0     # C
    fuel_flow: float = 8.5      # L/h
    vibration: float = 0.8      # g (RMS)
    battery_v: float = 13.8     # V
    injection_timing: float = 18.0  # deg BTDC
    health_index: float = 100.0
    fault_probability: float = 0.0
    rul_hours: float = 100.0
    warning_level: str = "NORMAL"
    engine_status: str = "HEALTHY"
    maintenance_required: bool = False
    fault_mode: FaultMode = FaultMode.NONE
    fault_severity: float = 0.0  # 0-1, ramps up over time once triggered
    sensor_anomaly: bool = False
    anomaly_score: float = 0.0


class EngineSimulator:
    """
    Physics-informed-ish simulator: base setpoints per mission profile,
    with coupled parameter drift (e.g. overheating raises oil temp AND
    drops oil pressure AND raises vibration slightly), plus injected faults
    that ramp in severity rather than switching on instantly -- mirrors
    real degradation trends the PS asks for.
    """

    BASELINES = {
        MissionProfile.NOMINAL: dict(rpm=4500, cht=95, egt=650, oil_p=55, oil_t=85, fuel=8.5, vib=0.8,
                                      altitude=20000, ambient=15, throttle=0.70),
        MissionProfile.HIGH_ALTITUDE: dict(rpm=4700, cht=88, egt=670, oil_p=50, oil_t=80, fuel=9.2, vib=0.9,
                                           altitude=28000, ambient=-5, throttle=0.72),
        MissionProfile.HOT_WEATHER: dict(rpm=4500, cht=108, egt=660, oil_p=52, oil_t=98, fuel=8.7, vib=0.85,
                                          altitude=18000, ambient=38, throttle=0.70),
        MissionProfile.RAPID_THROTTLE: dict(rpm=5200, cht=102, egt=690, oil_p=48, oil_t=90, fuel=10.5, vib=1.4,
                                            altitude=20000, ambient=15, throttle=0.85),
    }

    def __init__(self, mission: MissionProfile = MissionProfile.NOMINAL, seed: int = None):
        self.rng = np.random.default_rng(seed)
        self.mission = mission
        self.state = EngineState()
        self._apply_baseline()
        self._fault_start_t = None

    def _apply_baseline(self):
        b = self.BASELINES[self.mission]
        self.state.rpm = b["rpm"]
        self.state.cht = b["cht"]
        self.state.egt = b["egt"]
        self.state.oil_pressure = b["oil_p"]
        self.state.oil_temp = b["oil_t"]
        self.state.fuel_flow = b["fuel"]
        self.state.vibration = b["vib"]
        self.state.altitude = b["altitude"]
        self.state.ambient_temp = b["ambient"]
        self.state.throttle = b["throttle"]
        self.state.engine_load = np.clip(b["throttle"] - 0.05, 0.0, 1.0)
        # Approximate manifold pressure response to throttle and altitude.
        self.state.manifold_pressure = round(18 + 14 * self.state.throttle - self.state.altitude / 10000, 2)
        self.state.air_fuel_ratio = 14.7 if self.mission != MissionProfile.HIGH_ALTITUDE else 15.2

    def trigger_fault(self, fault: FaultMode):
        self.state.fault_mode = fault
        self.state.fault_severity = 0.0
        self._fault_start_t = self.state.t

    def clear_fault(self):
        self.state.fault_mode = FaultMode.NONE
        self.state.fault_severity = 0.0
        self._fault_start_t = None

    def _fault_dynamics(self, s: float):
        """Apply coupled degradation effects proportional to severity s (0-1)."""
        st = self.state
        fm = st.fault_mode
        if fm == FaultMode.OVERHEATING:
            st.cht += 45 * s
            st.egt += 60 * s
            st.oil_temp += 25 * s
            st.oil_pressure -= 8 * s
            st.vibration += 0.3 * s
        elif fm == FaultMode.MISFIRE:
            st.rpm -= 300 * s * (0.5 + 0.5 * np.sin(st.t * 3))
            st.egt -= 40 * s
            st.vibration += 1.2 * s
            st.fuel_flow -= 0.6 * s
        elif fm == FaultMode.LUBRICATION:
            st.oil_pressure -= 25 * s
            st.oil_temp += 20 * s
            st.vibration += 0.6 * s
            st.cht += 10 * s
        elif fm == FaultMode.SENSOR_DRIFT:
            # a sensor slowly reports wrong values w/o real engine change
            st.oil_pressure += 12 * s  # phantom drift, not a real physical change
        elif fm == FaultMode.VIBRATION:
            st.vibration += 2.5 * s
            st.rpm -= 100 * s

    def step(self, dt: float = 1.0) -> dict:
        st = self.state
        st.t += dt
        self._apply_baseline()

        if st.fault_mode != FaultMode.NONE:
            elapsed = st.t - self._fault_start_t
            # severity ramps up over ~120s then plateaus near 1.0 (mirrors
            # gradual degradation trend rather than a hard step failure)
            st.fault_severity = min(1.0, elapsed / 120.0)
            self._fault_dynamics(st.fault_severity)

        # sensor noise
        st.rpm += self.rng.normal(0, 15)
        st.cht += self.rng.normal(0, 0.6)
        st.egt += self.rng.normal(0, 2.0)
        st.oil_pressure += self.rng.normal(0, 0.5)
        st.oil_temp += self.rng.normal(0, 0.4)
        st.fuel_flow += self.rng.normal(0, 0.1)
        st.vibration = max(0.05, st.vibration + self.rng.normal(0, 0.05))
        st.battery_v += self.rng.normal(0, 0.03)
        st.injection_timing += self.rng.normal(0, 0.1)

        # simple composite health index (for dashboard gauge / RUL heuristic ground truth)
        penalty = 0.0
        penalty += max(0, st.cht - 100) * 0.6
        penalty += max(0, 60 - st.oil_pressure) * 1.2
        penalty += max(0, st.vibration - 1.0) * 8
        penalty += max(0, st.oil_temp - 95) * 0.5
        # baseline degradation directly proportional to active fault severity,
        # on top of the sensor-driven penalties above -- ensures health trends
        # toward critical as a fault progresses regardless of which sensors
        # it happens to move most (keeps RUL training data well-labeled)
        penalty += 65 * st.fault_severity
        st.health_index = float(np.clip(100 - penalty, 0, 100))

        # Derived digital-twin outputs. These are intentionally explainable
        # heuristics and remain available even when ML models are offline.
        st.anomaly_score = round(float(
            max(0, st.cht - 112) / 20
            + max(0, 45 - st.oil_pressure) / 20
            + max(0, st.vibration - 1.4) / 1.5
            + st.fault_severity
        ), 3)
        st.sensor_anomaly = st.anomaly_score >= 1.0
        st.fault_probability = round(float(np.clip(
            0.65 * st.fault_severity + 0.35 * (1 - st.health_index / 100), 0, 1
        )), 3)
        st.warning_level = "CRITICAL" if st.health_index <= 40 else "WARNING" if st.health_index < 75 else "NORMAL"
        st.engine_status = "FAULT" if st.fault_mode != FaultMode.NONE else "DEGRADED" if st.health_index < 75 else "HEALTHY"
        st.maintenance_required = st.health_index < 75 or st.sensor_anomaly
        st.rul_hours = round(max(0.0, 100 * st.health_index / 100 * (1 - st.fault_severity)), 2)

        return self.as_dict()

    def as_dict(self) -> dict:
        st = self.state
        return {
            "t": round(st.t, 1),
            "mission": self.mission.value,
            "throttle": round(st.throttle, 2),
            "engine_load": round(st.engine_load, 2),
            "altitude": round(st.altitude, 1),
            "ambient_temp": round(st.ambient_temp, 2),
            "manifold_pressure": round(st.manifold_pressure, 2),
            "air_fuel_ratio": round(st.air_fuel_ratio, 2),
            "rpm": round(st.rpm, 1),
            "cht": round(st.cht, 2),
            "egt": round(st.egt, 2),
            "oil_pressure": round(st.oil_pressure, 2),
            "oil_temp": round(st.oil_temp, 2),
            "fuel_flow": round(st.fuel_flow, 2),
            "vibration": round(st.vibration, 3),
            "battery_v": round(st.battery_v, 2),
            "injection_timing": round(st.injection_timing, 2),
            "health_index": round(st.health_index, 1),
            "fault_probability": round(st.fault_probability, 3),
            "rul_hours": round(st.rul_hours, 2),
            "warning_level": st.warning_level,
            "engine_status": st.engine_status,
            "maintenance_required": st.maintenance_required,
            "fault_mode": st.fault_mode.value,
            "fault_severity": round(st.fault_severity, 3),
            "sensor_anomaly": st.sensor_anomaly,
            "anomaly_score": round(st.anomaly_score, 3),
        }


def generate_dataset(n_seconds: int = 3600, dt: float = 1.0, fault_windows=None, mission=MissionProfile.NOMINAL, seed=42):
    """
    Generate a labeled offline dataset for training the ML models.
    fault_windows: list of (start_s, end_s, FaultMode) to inject during generation.
    Returns a list[dict] of telemetry rows (JSON-serializable).
    """
    sim = EngineSimulator(mission=mission, seed=seed)
    rows = []
    fault_windows = fault_windows or []
    active = None
    for i in range(int(n_seconds / dt)):
        t = i * dt
        for (s, e, fm) in fault_windows:
            if s <= t < e and active != fm:
                sim.trigger_fault(fm)
                active = fm
            elif not (s <= t < e) and active == fm:
                sim.clear_fault()
                active = None
        rows.append(sim.step(dt))
    return rows


if __name__ == "__main__":
    # quick smoke test
    sim = EngineSimulator(mission=MissionProfile.NOMINAL, seed=1)
    for _ in range(5):
        print(sim.step())
    sim.trigger_fault(FaultMode.OVERHEATING)
    for _ in range(5):
        print(sim.step())
