"""
AeroTwin - Engine Simulator
----------------------------
Generates realistic time-series telemetry for a MALE UAV aero piston engine,
with a lightweight physics-informed model (thermodynamic-ish heuristics) plus
noise, and the ability to inject specific fault modes over time.

This stands in for the real CAN bus / ECU-FADEC data feed the actual DRDO
deployment would use. Swap `EngineSimulator.step()` for a real data source
later without touching the rest of the pipeline.

Extended with comprehensive subsystem telemetry:
  - Lubrication system (oil circuit, bearings, contamination)
  - Fuel system (tank, pump, injectors, filters)
  - Cooling system (air-cooled primary, thermal margins)
  - Mechanical assembly (crankshaft, pistons, valves, bearings)
  - Cylinder-level digital twin data
  - Unified engine health model with weighted subsystem contributions
"""

import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict


class FaultMode(str, Enum):
    NONE = "none"
    # Original faults (preserved)
    MISFIRE = "misfire"
    OVERHEATING = "overheating"
    LUBRICATION = "lubrication_loss"
    SENSOR_DRIFT = "sensor_drift"
    VIBRATION = "abnormal_vibration"
    # Magneto / Ignition
    MAGNETO_DEGRADATION = "magneto_degradation"
    IGNITION_INSTABILITY = "ignition_instability"
    # Lubrication
    LOW_OIL_PRESSURE = "low_oil_pressure"
    HIGH_OIL_TEMPERATURE = "high_oil_temperature"
    OIL_FILTER_BLOCKAGE = "oil_filter_blockage"
    OIL_STARVATION = "oil_starvation"
    # Fuel
    LOW_FUEL_PRESSURE = "low_fuel_pressure"
    FUEL_FILTER_BLOCKAGE = "fuel_filter_blockage"
    INJECTOR_DEGRADATION = "injector_degradation"
    FUEL_STARVATION = "fuel_starvation"
    FUEL_PUMP_DEGRADATION = "fuel_pump_degradation"
    # Cooling
    COOLING_DEGRADATION = "cooling_degradation"
    AIRFLOW_REDUCTION = "airflow_reduction"
    OVERHEAT = "overheat"
    # Mechanical
    BEARING_DEGRADATION = "bearing_degradation"
    PISTON_WEAR = "piston_wear"
    VALVE_TIMING_FAULT = "valve_timing_fault"
    CRANKSHAFT_VIBRATION = "crankshaft_vibration"
    MECHANICAL_WEAR = "mechanical_wear"


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
class CylinderState:
    id: int = 1
    cht: float = 95.0
    egt: float = 650.0
    cylinder_pressure: float = 145.0  # psi
    misfire_probability: float = 6.0
    ignition_status: str = "NORMAL"
    health: float = 100.0


@dataclass
class EngineState:
    # --- EXISTING core fields (all preserved) ---
    throttle: float = 0.70
    engine_load: float = 0.65
    altitude: float = 20000.0  # ft
    ambient_temp: float = 15.0  # C
    manifold_pressure: float = 28.0  # inHg
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
    fault_severity: float = 0.0
    sensor_anomaly: bool = False
    anomaly_score: float = 0.0
    # Magneto / Ignition (existing)
    magneto_health: float = 88.0
    ignition_stability: float = 94.0
    misfire_probability: float = 6.0
    spark_spike_kv: float = 32.4
    burn_time_ms: float = 1.45
    timing_drift_deg: float = 0.04
    magneto_temp: float = 64.8

    # --- NEW: Lubrication subsystem ---
    lub_oil_pressure: float = 55.0       # psi
    lub_oil_temp: float = 85.0           # C
    lub_oil_flow_rate: float = 4.2       # L/min
    lub_oil_level: float = 92.0          # %
    lub_oil_filter_dp: float = 2.1       # psi
    lub_oil_pump_health: float = 96.0    # %
    lub_bearing_temp: float = 78.0       # C
    lub_crankcase_pressure: float = 0.5  # psi (slight positive)
    lub_oil_quality_index: float = 94.0  # %
    lub_oil_contamination: float = 3.0   # %
    lub_oil_debris_level: float = 1.2    # ppm
    lub_health: float = 95.0             # %
    lub_oil_system_health: float = 94.0  # %
    lub_lubrication_risk: float = 5.0    # %
    lub_bearing_risk: float = 3.0        # %
    lub_oil_starvation_risk: float = 2.0 # %

    # --- NEW: Fuel subsystem ---
    fuel_tank_level: float = 78.0        # %
    fuel_flow_rate: float = 8.5          # L/h
    fuel_pressure: float = 38.0          # psi
    fuel_temperature: float = 32.0       # C
    fuel_filter_dp: float = 1.5          # psi
    fuel_injector_duty_cycle: float = 62.0  # %
    fuel_injector_health: float = 96.0   # %
    fuel_pump_health: float = 97.0       # %
    fuel_consumption_rate: float = 8.5   # L/h
    fuel_remaining: float = 156.0        # L
    fuel_air_fuel_ratio: float = 14.7
    fuel_health: float = 95.0            # %
    fuel_starvation_risk: float = 2.0    # %
    fuel_estimated_endurance: float = 18.4  # hours
    fuel_remaining_time: float = 18.4    # hours
    fuel_efficiency: float = 94.0        # %
    fuel_system_risk: float = 3.0        # %

    # --- NEW: Cooling subsystem ---
    cool_cht: float = 95.0               # C (mirrors main cht)
    cool_egt: float = 650.0              # C (mirrors main egt)
    cool_intake_air_temp: float = 22.0   # C
    cool_ambient_temp: float = 15.0      # C
    cool_cooling_air_temp: float = 18.0  # C
    cool_cooling_airflow: float = 92.0   # % of nominal
    cool_cylinder_temp_spread: float = 8.0  # C
    cool_cooling_effectiveness: float = 94.0  # %
    cool_health: float = 95.0            # %
    cool_overheat_risk: float = 3.0      # %
    cool_thermal_margin: float = 125.0   # C (max safe - current)

    # --- NEW: Mechanical subsystem ---
    mech_crankshaft_rpm: float = 4500.0
    mech_crankshaft_speed_variation: float = 0.3  # %
    mech_crankshaft_vibration: float = 0.4  # g
    mech_connecting_rod_stress: float = 42.0  # % of yield
    mech_piston_temp: float = 180.0      # C
    mech_piston_health: float = 97.0     # %
    mech_cylinder_pressure: float = 145.0  # psi avg
    mech_bearing_temp: float = 78.0      # C
    mech_main_bearing_health: float = 96.0  # %
    mech_con_rod_bearing_health: float = 95.0  # %
    mech_valve_timing: float = 0.0       # deg offset from ideal
    mech_valve_health: float = 97.0      # %
    mech_crankcase_pressure: float = 0.5  # psi
    mech_mechanical_efficiency: float = 93.0  # %
    mech_health: float = 95.0            # %
    mech_wear_index: float = 5.0         # %
    mech_wear_risk: float = 4.0          # %
    mech_bearing_failure_risk: float = 3.0  # %
    mech_piston_failure_risk: float = 2.0  # %
    mech_valve_failure_risk: float = 2.0  # %

    # --- NEW: Unified engine health ---
    engine_health_overall: float = 95.0
    engine_health_critical_risk: float = 2.0
    engine_health_warning_risk: float = 5.0
    engine_health_mission_reliability: float = 97.0


# Number of cylinders (configurable)
NUM_CYLINDERS = 4
MAX_SAFE_CHT = 220.0  # C


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

    def __init__(self, mission: MissionProfile = MissionProfile.NOMINAL, seed: int = None,
                 num_cylinders: int = NUM_CYLINDERS):
        self.rng = np.random.default_rng(seed)
        self.mission = mission
        self.state = EngineState()
        self.num_cylinders = num_cylinders
        self.cylinders: List[CylinderState] = [CylinderState(id=i+1) for i in range(num_cylinders)]
        self._apply_baseline()
        self._fault_start_t = None
        # Fuel consumption tracking
        self._initial_fuel = 200.0  # L
        self._fuel_remaining = self._initial_fuel

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
        self.state.manifold_pressure = round(18 + 14 * self.state.throttle - self.state.altitude / 10000, 2)
        self.state.air_fuel_ratio = 14.7 if self.mission != MissionProfile.HIGH_ALTITUDE else 15.2

        # Subsystem baselines linked to core baselines
        self.state.lub_oil_pressure = b["oil_p"]
        self.state.lub_oil_temp = b["oil_t"]
        self.state.lub_oil_flow_rate = 3.5 + b["oil_p"] * 0.015
        self.state.lub_bearing_temp = b["oil_t"] - 7.0
        self.state.lub_crankcase_pressure = 0.5

        self.state.fuel_flow_rate = b["fuel"]
        self.state.fuel_consumption_rate = b["fuel"]
        self.state.fuel_pressure = 35.0 + b["throttle"] * 8.0
        self.state.fuel_temperature = max(20.0, b["ambient"] + 17.0)
        self.state.fuel_air_fuel_ratio = self.state.air_fuel_ratio
        self.state.fuel_injector_duty_cycle = 50.0 + b["throttle"] * 30.0

        self.state.cool_cht = b["cht"]
        self.state.cool_egt = b["egt"]
        self.state.cool_ambient_temp = b["ambient"]
        self.state.cool_intake_air_temp = b["ambient"] + 7.0
        self.state.cool_cooling_air_temp = b["ambient"] + 3.0

        self.state.mech_crankshaft_rpm = b["rpm"]
        self.state.mech_piston_temp = b["cht"] + 85.0
        self.state.mech_cylinder_pressure = 130.0 + b["throttle"] * 30.0

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

        # ---- ORIGINAL FAULTS (preserved) ----
        if fm == FaultMode.OVERHEATING:
            st.cht += 45 * s
            st.egt += 60 * s
            st.oil_temp += 25 * s
            st.oil_pressure -= 8 * s
            st.vibration += 0.3 * s
            # Cascade to cooling
            st.cool_overheat_risk += 40 * s
            st.cool_cooling_effectiveness -= 20 * s
            st.cool_thermal_margin -= 60 * s
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
            # Cascade to lubrication subsystem
            st.lub_oil_pressure -= 25 * s
            st.lub_oil_temp += 20 * s
            st.lub_bearing_temp += 15 * s
            st.lub_oil_starvation_risk += 35 * s
            st.lub_bearing_risk += 25 * s
        elif fm == FaultMode.SENSOR_DRIFT:
            st.oil_pressure += 12 * s
        elif fm == FaultMode.VIBRATION:
            st.vibration += 2.5 * s
            st.rpm -= 100 * s
            st.mech_crankshaft_vibration += 2.0 * s

        # ---- MAGNETO / IGNITION FAULTS ----
        elif fm == FaultMode.MAGNETO_DEGRADATION:
            st.magneto_health -= 30 * s
            st.spark_spike_kv -= 12 * s
            st.timing_drift_deg += 0.5 * s
            st.magneto_temp += 18 * s
            st.misfire_probability += 15 * s
            st.ignition_stability -= 15 * s
        elif fm == FaultMode.IGNITION_INSTABILITY:
            st.ignition_stability -= 35 * s
            st.misfire_probability += 25 * s
            st.rpm -= 150 * s * (0.5 + 0.5 * np.sin(st.t * 2))
            st.vibration += 0.5 * s
            st.burn_time_ms -= 0.4 * s
            st.egt += 20 * s

        # ---- LUBRICATION FAULTS ----
        elif fm == FaultMode.LOW_OIL_PRESSURE:
            st.oil_pressure -= 22 * s
            st.lub_oil_pressure -= 22 * s
            st.lub_bearing_temp += 18 * s
            st.lub_bearing_risk += 40 * s
            st.lub_oil_starvation_risk += 30 * s
            st.lub_health -= 30 * s
            st.vibration += 0.4 * s
            st.cht += 8 * s
        elif fm == FaultMode.HIGH_OIL_TEMPERATURE:
            st.oil_temp += 30 * s
            st.lub_oil_temp += 30 * s
            st.lub_oil_quality_index -= 25 * s
            st.lub_lubrication_risk += 30 * s
            st.lub_oil_contamination += 8 * s
        elif fm == FaultMode.OIL_FILTER_BLOCKAGE:
            st.lub_oil_filter_dp += 12 * s
            st.lub_oil_pressure -= 10 * s
            st.oil_pressure -= 10 * s
            st.lub_oil_contamination += 15 * s
            st.lub_oil_debris_level += 8 * s
        elif fm == FaultMode.OIL_STARVATION:
            st.oil_pressure -= 35 * s
            st.lub_oil_pressure -= 35 * s
            st.lub_bearing_temp += 30 * s
            st.lub_bearing_risk += 60 * s
            st.lub_oil_starvation_risk += 70 * s
            st.lub_health -= 50 * s
            st.vibration += 1.0 * s
            st.cht += 15 * s
            st.mech_bearing_temp += 25 * s

        # ---- FUEL FAULTS ----
        elif fm == FaultMode.LOW_FUEL_PRESSURE:
            st.fuel_pressure -= 18 * s
            st.fuel_injector_duty_cycle += 15 * s
            st.fuel_injector_health -= 10 * s
            st.fuel_air_fuel_ratio += 1.5 * s * np.sin(st.t * 2)  # unstable AFR
            st.air_fuel_ratio += 1.5 * s * np.sin(st.t * 2)
            st.rpm -= 120 * s * (0.5 + 0.5 * np.sin(st.t))
            st.fuel_system_risk += 35 * s
        elif fm == FaultMode.FUEL_FILTER_BLOCKAGE:
            st.fuel_filter_dp += 10 * s
            st.fuel_pressure -= 12 * s
            st.fuel_flow_rate -= 1.5 * s
            st.fuel_flow -= 1.5 * s
            st.fuel_system_risk += 25 * s
        elif fm == FaultMode.INJECTOR_DEGRADATION:
            st.fuel_injector_health -= 30 * s
            st.fuel_air_fuel_ratio += 0.8 * s
            st.air_fuel_ratio += 0.8 * s
            st.fuel_efficiency -= 15 * s
            st.egt += 25 * s
            st.cht += 8 * s
        elif fm == FaultMode.FUEL_STARVATION:
            st.fuel_pressure -= 25 * s
            st.fuel_air_fuel_ratio += 3.0 * s  # lean
            st.air_fuel_ratio += 3.0 * s
            st.rpm -= 400 * s
            st.fuel_flow -= 3.0 * s
            st.fuel_starvation_risk += 60 * s
            st.fuel_health -= 45 * s
            st.egt += 40 * s
        elif fm == FaultMode.FUEL_PUMP_DEGRADATION:
            st.fuel_pump_health -= 35 * s
            st.fuel_pressure -= 15 * s
            st.fuel_flow_rate -= 2.0 * s
            st.fuel_flow -= 2.0 * s
            st.fuel_system_risk += 30 * s

        # ---- COOLING FAULTS ----
        elif fm == FaultMode.COOLING_DEGRADATION:
            st.cool_cooling_effectiveness -= 30 * s
            st.cht += 30 * s
            st.egt += 25 * s
            st.cool_overheat_risk += 35 * s
            st.cool_thermal_margin -= 50 * s
            st.cool_health -= 35 * s
            st.oil_temp += 10 * s
        elif fm == FaultMode.AIRFLOW_REDUCTION:
            st.cool_cooling_airflow -= 40 * s
            st.cht += 25 * s
            st.egt += 20 * s
            st.cool_thermal_margin -= 40 * s
            st.cool_overheat_risk += 30 * s
            st.cool_cylinder_temp_spread += 15 * s
        elif fm == FaultMode.OVERHEAT:
            st.cht += 55 * s
            st.egt += 70 * s
            st.cool_overheat_risk += 60 * s
            st.cool_thermal_margin -= 80 * s
            st.cool_health -= 50 * s
            st.oil_temp += 20 * s
            st.oil_pressure -= 10 * s
            st.vibration += 0.5 * s

        # ---- MECHANICAL FAULTS ----
        elif fm == FaultMode.BEARING_DEGRADATION:
            st.vibration += 1.8 * s
            st.mech_bearing_temp += 25 * s
            st.lub_oil_debris_level += 12 * s
            st.lub_oil_contamination += 10 * s
            st.mech_crankcase_pressure += 1.5 * s
            st.mech_main_bearing_health -= 30 * s
            st.mech_con_rod_bearing_health -= 25 * s
            st.mech_health -= 35 * s
            st.mech_bearing_failure_risk += 45 * s
            st.mech_crankshaft_vibration += 1.5 * s
        elif fm == FaultMode.PISTON_WEAR:
            st.mech_piston_health -= 30 * s
            st.mech_cylinder_pressure -= 20 * s
            st.vibration += 0.8 * s
            st.mech_piston_failure_risk += 35 * s
            st.cool_cylinder_temp_spread += 12 * s
            st.cht += 12 * s
            st.mech_health -= 25 * s
        elif fm == FaultMode.VALVE_TIMING_FAULT:
            st.mech_valve_timing += 4.0 * s
            st.mech_valve_health -= 25 * s
            st.mech_mechanical_efficiency -= 12 * s
            st.egt += 30 * s
            st.rpm -= 200 * s * (0.5 + 0.5 * np.sin(st.t * 1.5))
            st.mech_valve_failure_risk += 30 * s
        elif fm == FaultMode.CRANKSHAFT_VIBRATION:
            st.mech_crankshaft_vibration += 3.0 * s
            st.vibration += 2.0 * s
            st.mech_crankshaft_speed_variation += 2.5 * s
            st.rpm -= 80 * s * np.sin(st.t * 4)
            st.mech_health -= 30 * s
        elif fm == FaultMode.MECHANICAL_WEAR:
            st.mech_wear_index += 30 * s
            st.mech_mechanical_efficiency -= 15 * s
            st.mech_health -= 25 * s
            st.vibration += 0.6 * s
            st.mech_wear_risk += 35 * s
            st.mech_bearing_failure_risk += 15 * s
            st.mech_piston_failure_risk += 10 * s

    def _update_subsystems(self):
        """Compute derived subsystem values from core sensor state."""
        st = self.state

        # --- Lubrication derived health ---
        lub_penalty = 0.0
        lub_penalty += max(0, 50 - st.lub_oil_pressure) * 1.0
        lub_penalty += max(0, st.lub_oil_temp - 95) * 0.8
        lub_penalty += max(0, st.lub_bearing_temp - 90) * 0.7
        lub_penalty += max(0, st.lub_oil_filter_dp - 5) * 3.0
        lub_penalty += max(0, st.lub_oil_contamination - 10) * 1.5
        st.lub_health = float(np.clip(95 - lub_penalty, 0, 100))
        st.lub_oil_system_health = float(np.clip(94 - lub_penalty * 0.8, 0, 100))
        st.lub_lubrication_risk = float(np.clip(5 + lub_penalty * 0.6, 0, 100))
        st.lub_bearing_risk = float(np.clip(3 + max(0, st.lub_bearing_temp - 85) * 1.2, 0, 100))
        st.lub_oil_starvation_risk = float(np.clip(2 + max(0, 40 - st.lub_oil_pressure) * 2.5, 0, 100))

        # --- Fuel derived health ---
        fuel_penalty = 0.0
        fuel_penalty += max(0, 30 - st.fuel_pressure) * 1.5
        fuel_penalty += max(0, st.fuel_filter_dp - 4) * 3.0
        fuel_penalty += max(0, 85 - st.fuel_injector_health) * 0.5
        fuel_penalty += max(0, 85 - st.fuel_pump_health) * 0.6
        fuel_penalty += max(0, abs(st.fuel_air_fuel_ratio - 14.7) - 0.5) * 8.0
        st.fuel_health = float(np.clip(95 - fuel_penalty, 0, 100))
        st.fuel_system_risk = float(np.clip(3 + fuel_penalty * 0.5, 0, 100))
        st.fuel_starvation_risk = float(np.clip(2 + max(0, 25 - st.fuel_pressure) * 3.0, 0, 100))
        st.fuel_efficiency = float(np.clip(94 - fuel_penalty * 0.4, 50, 100))

        # Fuel consumption and endurance
        self._fuel_remaining = max(0, self._fuel_remaining - st.fuel_flow_rate / 3600.0)
        st.fuel_remaining = round(self._fuel_remaining, 1)
        st.fuel_tank_level = round(self._fuel_remaining / self._initial_fuel * 100, 1)
        if st.fuel_flow_rate > 0.1:
            st.fuel_estimated_endurance = round(self._fuel_remaining / st.fuel_flow_rate, 1)
            st.fuel_remaining_time = st.fuel_estimated_endurance
        else:
            st.fuel_estimated_endurance = 0.0
            st.fuel_remaining_time = 0.0

        # --- Cooling derived health ---
        st.cool_cht = st.cht
        st.cool_egt = st.egt
        st.cool_ambient_temp = st.ambient_temp
        st.cool_thermal_margin = float(np.clip(MAX_SAFE_CHT - st.cht, 0, 200))
        cool_penalty = 0.0
        cool_penalty += max(0, st.cht - 110) * 0.8
        cool_penalty += max(0, st.egt - 700) * 0.3
        cool_penalty += max(0, 80 - st.cool_cooling_airflow) * 0.5
        cool_penalty += max(0, st.cool_cylinder_temp_spread - 15) * 1.5
        st.cool_health = float(np.clip(95 - cool_penalty, 0, 100))
        st.cool_cooling_effectiveness = float(np.clip(
            94 - max(0, st.engine_load - 0.75) * 20 - max(0, st.ambient_temp - 25) * 0.5 -
            max(0, 90 - st.cool_cooling_airflow) * 0.8 - cool_penalty * 0.3, 30, 100))
        st.cool_overheat_risk = float(np.clip(
            3 + max(0, st.cht - 130) * 1.2 + max(0, st.egt - 720) * 0.3, 0, 100))

        # --- Mechanical derived health ---
        st.mech_crankshaft_rpm = st.rpm
        mech_penalty = 0.0
        mech_penalty += max(0, st.vibration - 1.0) * 8
        mech_penalty += max(0, st.mech_bearing_temp - 90) * 0.8
        mech_penalty += max(0, abs(st.mech_valve_timing) - 1.0) * 5
        mech_penalty += max(0, st.mech_wear_index - 10) * 0.8
        mech_penalty += max(0, st.mech_crankshaft_vibration - 0.8) * 6
        st.mech_health = float(np.clip(95 - mech_penalty, 0, 100))
        st.mech_mechanical_efficiency = float(np.clip(93 - mech_penalty * 0.4, 50, 100))
        st.mech_connecting_rod_stress = float(np.clip(
            42 + st.engine_load * 15 + max(0, st.vibration - 1.0) * 8, 20, 95))
        st.mech_wear_risk = float(np.clip(4 + mech_penalty * 0.5, 0, 100))
        st.mech_bearing_failure_risk = float(np.clip(
            3 + max(0, st.mech_bearing_temp - 85) * 1.5 + max(0, st.mech_crankshaft_vibration - 0.8) * 5, 0, 100))
        st.mech_piston_failure_risk = float(np.clip(
            2 + max(0, 90 - st.mech_piston_health) * 1.0, 0, 100))
        st.mech_valve_failure_risk = float(np.clip(
            2 + max(0, 90 - st.mech_valve_health) * 1.0, 0, 100))

    def _update_cylinders(self):
        """Generate per-cylinder telemetry with slight variations."""
        st = self.state
        for i, cyl in enumerate(self.cylinders):
            offset = (i - self.num_cylinders / 2) * 0.5  # slight spread
            cyl.cht = st.cht + offset + self.rng.normal(0, 0.8)
            cyl.egt = st.egt + offset * 2 + self.rng.normal(0, 2.0)
            cyl.cylinder_pressure = st.mech_cylinder_pressure + offset * 1.5 + self.rng.normal(0, 1.0)
            cyl.misfire_probability = st.misfire_probability + self.rng.normal(0, 0.5)

            # If misfire fault, cylinder 2 is particularly affected
            if st.fault_mode in (FaultMode.MISFIRE, FaultMode.IGNITION_INSTABILITY) and i == 1:
                cyl.cht += 15 * st.fault_severity
                cyl.egt += 30 * st.fault_severity
                cyl.misfire_probability += 20 * st.fault_severity
                cyl.ignition_status = "MISFIRE" if st.fault_severity > 0.3 else "WARNING"
            elif st.fault_mode == FaultMode.PISTON_WEAR and i == 2:
                cyl.cylinder_pressure -= 25 * st.fault_severity
                cyl.cht += 10 * st.fault_severity
                cyl.ignition_status = "WARNING" if st.fault_severity > 0.4 else "NORMAL"
            else:
                cyl.ignition_status = "NORMAL"

            cyl.misfire_probability = float(np.clip(cyl.misfire_probability, 0, 100))
            cyl.health = float(np.clip(100 - max(0, cyl.cht - 130) * 0.8 -
                                       max(0, cyl.misfire_probability - 10) * 1.5, 0, 100))

    def _compute_unified_health(self):
        """Weighted engine health combining all subsystems."""
        st = self.state
        # Weights (sum = 1.0) — configurable
        weights = {
            "lubrication": 0.18,
            "fuel": 0.18,
            "cooling": 0.16,
            "mechanical": 0.18,
            "magneto": 0.12,
            "ignition": 0.10,
            "anomaly": 0.08,
        }
        # Normalize health values to 0-1
        lubrication_h = st.lub_health / 100
        fuel_h = st.fuel_health / 100
        cooling_h = st.cool_health / 100
        mechanical_h = st.mech_health / 100
        magneto_h = st.magneto_health / 100
        ignition_h = st.ignition_stability / 100
        anomaly_h = max(0, 1.0 - st.anomaly_score)

        weighted = (weights["lubrication"] * lubrication_h +
                    weights["fuel"] * fuel_h +
                    weights["cooling"] * cooling_h +
                    weights["mechanical"] * mechanical_h +
                    weights["magneto"] * magneto_h +
                    weights["ignition"] * ignition_h +
                    weights["anomaly"] * anomaly_h)

        # Critical fault penalty
        critical_penalty = 0.0
        if st.lub_oil_starvation_risk > 50:
            critical_penalty += 0.15
        if st.cool_overheat_risk > 50:
            critical_penalty += 0.15
        if st.fuel_starvation_risk > 50:
            critical_penalty += 0.15
        if st.mech_bearing_failure_risk > 50:
            critical_penalty += 0.10
        critical_penalty += st.fault_severity * 0.20

        st.engine_health_overall = float(np.clip((weighted - critical_penalty) * 100, 0, 100))
        st.engine_health_critical_risk = float(np.clip(critical_penalty * 100, 0, 100))
        st.engine_health_warning_risk = float(np.clip(
            max(st.lub_lubrication_risk, st.fuel_system_risk,
                st.cool_overheat_risk, st.mech_wear_risk) * 0.8, 0, 100))
        st.engine_health_mission_reliability = float(np.clip(
            st.engine_health_overall * 0.7 +
            (1 - st.fault_probability) * 30 -
            critical_penalty * 20, 0, 100))

    def step(self, dt: float = 1.0) -> dict:
        st = self.state
        st.t += dt
        self._apply_baseline()

        if st.fault_mode != FaultMode.NONE:
            elapsed = st.t - self._fault_start_t
            st.fault_severity = min(1.0, elapsed / 120.0)
            self._fault_dynamics(st.fault_severity)

        # sensor noise (core)
        st.rpm += self.rng.normal(0, 15)
        st.cht += self.rng.normal(0, 0.6)
        st.egt += self.rng.normal(0, 2.0)
        st.oil_pressure += self.rng.normal(0, 0.5)
        st.oil_temp += self.rng.normal(0, 0.4)
        st.fuel_flow += self.rng.normal(0, 0.1)
        st.vibration = max(0.05, st.vibration + self.rng.normal(0, 0.05))
        st.battery_v += self.rng.normal(0, 0.03)
        st.injection_timing += self.rng.normal(0, 0.1)

        # Subsystem sensor noise
        st.lub_oil_pressure += self.rng.normal(0, 0.4)
        st.lub_oil_temp += self.rng.normal(0, 0.3)
        st.lub_oil_flow_rate += self.rng.normal(0, 0.05)
        st.lub_bearing_temp += self.rng.normal(0, 0.3)
        st.lub_oil_filter_dp += self.rng.normal(0, 0.05)
        st.lub_oil_quality_index += self.rng.normal(0, 0.1)
        st.lub_oil_contamination += self.rng.normal(0, 0.05)
        st.lub_oil_debris_level += self.rng.normal(0, 0.02)

        st.fuel_pressure += self.rng.normal(0, 0.3)
        st.fuel_temperature += self.rng.normal(0, 0.2)
        st.fuel_filter_dp += self.rng.normal(0, 0.03)
        st.fuel_flow_rate += self.rng.normal(0, 0.1)
        st.fuel_injector_duty_cycle += self.rng.normal(0, 0.3)

        st.cool_cooling_airflow += self.rng.normal(0, 0.3)
        st.cool_intake_air_temp += self.rng.normal(0, 0.15)
        st.cool_cooling_air_temp += self.rng.normal(0, 0.1)
        st.cool_cylinder_temp_spread += self.rng.normal(0, 0.2)

        st.mech_crankshaft_vibration = max(0.05, st.mech_crankshaft_vibration + self.rng.normal(0, 0.03))
        st.mech_crankshaft_speed_variation += self.rng.normal(0, 0.02)
        st.mech_piston_temp += self.rng.normal(0, 0.5)
        st.mech_bearing_temp += self.rng.normal(0, 0.3)
        st.mech_cylinder_pressure += self.rng.normal(0, 0.8)
        st.mech_valve_timing += self.rng.normal(0, 0.01)

        # Clamp values
        st.lub_oil_pressure = max(5, st.lub_oil_pressure)
        st.lub_oil_level = float(np.clip(st.lub_oil_level, 0, 100))
        st.lub_oil_quality_index = float(np.clip(st.lub_oil_quality_index, 0, 100))
        st.lub_oil_contamination = float(np.clip(st.lub_oil_contamination, 0, 100))
        st.lub_oil_debris_level = max(0, st.lub_oil_debris_level)
        st.fuel_pressure = max(0, st.fuel_pressure)
        st.fuel_flow_rate = max(0, st.fuel_flow_rate)
        st.fuel_injector_health = float(np.clip(st.fuel_injector_health, 0, 100))
        st.fuel_pump_health = float(np.clip(st.fuel_pump_health, 0, 100))
        st.cool_cooling_airflow = float(np.clip(st.cool_cooling_airflow, 10, 100))
        st.cool_cylinder_temp_spread = max(0, st.cool_cylinder_temp_spread)
        st.mech_piston_health = float(np.clip(st.mech_piston_health, 0, 100))
        st.mech_main_bearing_health = float(np.clip(st.mech_main_bearing_health, 0, 100))
        st.mech_con_rod_bearing_health = float(np.clip(st.mech_con_rod_bearing_health, 0, 100))
        st.mech_valve_health = float(np.clip(st.mech_valve_health, 0, 100))
        st.mech_wear_index = float(np.clip(st.mech_wear_index, 0, 100))

        # --- Existing composite health index (preserved for ML compatibility) ---
        penalty = 0.0
        penalty += max(0, st.cht - 100) * 0.6
        penalty += max(0, 60 - st.oil_pressure) * 1.2
        penalty += max(0, st.vibration - 1.0) * 8
        penalty += max(0, st.oil_temp - 95) * 0.5
        penalty += 65 * st.fault_severity
        st.health_index = float(np.clip(100 - penalty, 0, 100))

        # Existing derived outputs (preserved)
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

        # Magneto / ignition signals (existing logic preserved, extended for new faults)
        ms = st.fault_severity if st.fault_mode in (
            FaultMode.MISFIRE, FaultMode.VIBRATION,
            FaultMode.MAGNETO_DEGRADATION, FaultMode.IGNITION_INSTABILITY) else 0.0
        if st.fault_mode not in (FaultMode.MAGNETO_DEGRADATION, FaultMode.IGNITION_INSTABILITY):
            st.magneto_health = float(np.clip(88 - 20 * ms, 0, 100))
            st.ignition_stability = float(np.clip(94 - 28 * ms, 0, 100))
            st.misfire_probability = float(np.clip(6 + 40 * ms + (12 if st.fault_mode == FaultMode.MISFIRE else 0), 0, 100))
            st.spark_spike_kv = float(np.clip(32.4 - 8.6 * ms, 10, 40))
            st.burn_time_ms = float(np.clip(1.45 - 0.63 * ms, 0.3, 2.0))
            st.timing_drift_deg = float(0.04 + 0.34 * ms)
            st.magneto_temp = float(64.8 + 13.6 * ms)
        else:
            # Already set by _fault_dynamics, just clamp
            st.magneto_health = float(np.clip(st.magneto_health, 0, 100))
            st.ignition_stability = float(np.clip(st.ignition_stability, 0, 100))
            st.misfire_probability = float(np.clip(st.misfire_probability, 0, 100))
            st.spark_spike_kv = float(np.clip(st.spark_spike_kv, 10, 40))
            st.burn_time_ms = float(np.clip(st.burn_time_ms, 0.3, 2.0))
            st.magneto_temp = float(np.clip(st.magneto_temp, 40, 120))

        st.warning_level = "CRITICAL" if st.health_index <= 40 else "WARNING" if st.health_index < 75 else "NORMAL"
        st.engine_status = "FAULT" if st.fault_mode != FaultMode.NONE else "DEGRADED" if st.health_index < 75 else "HEALTHY"
        st.maintenance_required = st.health_index < 75 or st.sensor_anomaly
        st.rul_hours = round(max(0.0, 100 * st.health_index / 100 * (1 - st.fault_severity)), 2)

        # Update subsystem derived values
        self._update_subsystems()
        self._update_cylinders()
        self._compute_unified_health()

        return self.as_dict()

    def as_dict(self) -> dict:
        st = self.state
        return {
            # --- EXISTING fields (all preserved) ---
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
            "magneto_health": round(st.magneto_health, 1),
            "ignition_stability": round(st.ignition_stability, 1),
            "misfire_probability": round(st.misfire_probability, 1),
            "spark_spike_kv": round(st.spark_spike_kv, 2),
            "burn_time_ms": round(st.burn_time_ms, 2),
            "timing_drift_deg": round(st.timing_drift_deg, 3),
            "magneto_temp": round(st.magneto_temp, 1),

            # --- NEW: Lubrication subsystem ---
            "lubrication": {
                "oil_pressure": round(st.lub_oil_pressure, 1),
                "oil_temp": round(st.lub_oil_temp, 1),
                "oil_flow_rate": round(st.lub_oil_flow_rate, 2),
                "oil_level": round(st.lub_oil_level, 1),
                "oil_filter_dp": round(st.lub_oil_filter_dp, 2),
                "oil_pump_health": round(st.lub_oil_pump_health, 1),
                "bearing_temp": round(st.lub_bearing_temp, 1),
                "crankcase_pressure": round(st.lub_crankcase_pressure, 2),
                "oil_quality_index": round(st.lub_oil_quality_index, 1),
                "oil_contamination": round(st.lub_oil_contamination, 1),
                "oil_debris_level": round(st.lub_oil_debris_level, 2),
                "health": round(st.lub_health, 1),
                "oil_system_health": round(st.lub_oil_system_health, 1),
                "lubrication_risk": round(st.lub_lubrication_risk, 1),
                "bearing_risk": round(st.lub_bearing_risk, 1),
                "oil_starvation_risk": round(st.lub_oil_starvation_risk, 1),
            },

            # --- NEW: Fuel subsystem ---
            "fuel": {
                "tank_level": round(st.fuel_tank_level, 1),
                "flow_rate": round(st.fuel_flow_rate, 2),
                "pressure": round(st.fuel_pressure, 1),
                "temperature": round(st.fuel_temperature, 1),
                "filter_dp": round(st.fuel_filter_dp, 2),
                "injector_duty_cycle": round(st.fuel_injector_duty_cycle, 1),
                "injector_health": round(st.fuel_injector_health, 1),
                "pump_health": round(st.fuel_pump_health, 1),
                "consumption_rate": round(st.fuel_consumption_rate, 2),
                "remaining_fuel": round(st.fuel_remaining, 1),
                "air_fuel_ratio": round(st.fuel_air_fuel_ratio, 2),
                "health": round(st.fuel_health, 1),
                "starvation_risk": round(st.fuel_starvation_risk, 1),
                "estimated_endurance": round(st.fuel_estimated_endurance, 1),
                "fuel_remaining_time": round(st.fuel_remaining_time, 1),
                "fuel_efficiency": round(st.fuel_efficiency, 1),
                "fuel_system_risk": round(st.fuel_system_risk, 1),
            },

            # --- NEW: Cooling subsystem ---
            "cooling": {
                "cht": round(st.cool_cht, 1),
                "egt": round(st.cool_egt, 1),
                "intake_air_temp": round(st.cool_intake_air_temp, 1),
                "ambient_temp": round(st.cool_ambient_temp, 1),
                "cooling_air_temp": round(st.cool_cooling_air_temp, 1),
                "cooling_airflow": round(st.cool_cooling_airflow, 1),
                "cylinder_temp_spread": round(st.cool_cylinder_temp_spread, 1),
                "cooling_effectiveness": round(st.cool_cooling_effectiveness, 1),
                "health": round(st.cool_health, 1),
                "overheat_risk": round(st.cool_overheat_risk, 1),
                "thermal_margin": round(st.cool_thermal_margin, 1),
            },

            # --- NEW: Mechanical subsystem ---
            "mechanical": {
                "crankshaft_rpm": round(st.mech_crankshaft_rpm, 1),
                "crankshaft_speed_variation": round(st.mech_crankshaft_speed_variation, 2),
                "crankshaft_vibration": round(st.mech_crankshaft_vibration, 3),
                "connecting_rod_stress": round(st.mech_connecting_rod_stress, 1),
                "piston_temp": round(st.mech_piston_temp, 1),
                "piston_health": round(st.mech_piston_health, 1),
                "cylinder_pressure": round(st.mech_cylinder_pressure, 1),
                "bearing_temp": round(st.mech_bearing_temp, 1),
                "main_bearing_health": round(st.mech_main_bearing_health, 1),
                "con_rod_bearing_health": round(st.mech_con_rod_bearing_health, 1),
                "valve_timing": round(st.mech_valve_timing, 2),
                "valve_health": round(st.mech_valve_health, 1),
                "crankcase_pressure": round(st.mech_crankcase_pressure, 2),
                "mechanical_efficiency": round(st.mech_mechanical_efficiency, 1),
                "health": round(st.mech_health, 1),
                "wear_index": round(st.mech_wear_index, 1),
                "wear_risk": round(st.mech_wear_risk, 1),
                "bearing_failure_risk": round(st.mech_bearing_failure_risk, 1),
                "piston_failure_risk": round(st.mech_piston_failure_risk, 1),
                "valve_failure_risk": round(st.mech_valve_failure_risk, 1),
            },

            # --- NEW: Cylinder-level data ---
            "cylinders": [
                {
                    "id": cyl.id,
                    "cht": round(cyl.cht, 1),
                    "egt": round(cyl.egt, 1),
                    "cylinder_pressure": round(cyl.cylinder_pressure, 1),
                    "misfire_probability": round(cyl.misfire_probability, 1),
                    "ignition_status": cyl.ignition_status,
                    "health": round(cyl.health, 1),
                }
                for cyl in self.cylinders
            ],

            # --- NEW: Unified engine health ---
            "engine_health": {
                "overall": round(st.engine_health_overall, 1),
                "lubrication_health": round(st.lub_health, 1),
                "fuel_health": round(st.fuel_health, 1),
                "cooling_health": round(st.cool_health, 1),
                "mechanical_health": round(st.mech_health, 1),
                "magneto_health": round(st.magneto_health, 1),
                "ignition_health": round(st.ignition_stability, 1),
                "critical_risk": round(st.engine_health_critical_risk, 1),
                "warning_risk": round(st.engine_health_warning_risk, 1),
                "mission_reliability": round(st.engine_health_mission_reliability, 1),
            },
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
        d = sim.step()
        print(f"t={d['t']} rpm={d['rpm']} lub_h={d['lubrication']['health']} "
              f"fuel_h={d['fuel']['health']} cool_h={d['cooling']['health']} "
              f"mech_h={d['mechanical']['health']} cyls={len(d['cylinders'])}")
    sim.trigger_fault(FaultMode.BEARING_DEGRADATION)
    for _ in range(5):
        d = sim.step()
        print(f"t={d['t']} vib={d['vibration']} mech_h={d['mechanical']['health']} "
              f"bearing_risk={d['mechanical']['bearing_failure_risk']}")
