export type NavigationScreen = 'magneto' | 'dashboard' | 'settings' | 'reports' | 'lubrication' | 'fuel' | 'cooling' | 'mechanical' | 'whatif';

export interface PowerChainStep {
  id: string;
  stepNum: number;
  title: string;
  subtitle: string;
  metric: string;
  metricSub: string;
  status: 'nominal' | 'warning' | 'critical';
  details: string;
}

export interface CylinderGap {
  cylinder: number;
  location: string;
  gapMm: number;
  erosionPct: number;
  status: 'nominal' | 'warning' | 'critical';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  channel: 'P-LEAD' | 'COIL-01' | 'SYNCHRO' | 'FAULT' | 'ALERT' | 'FADEC' | 'SYS' | 'SIM';
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export interface SimulationParams {
  magnetoHealth: number; // 0-100
  ignitionStability: number; // 0-100
  misfireProb: number; // 0-100
  primaryResistance: number; // Ohms (nom 0.85)
  secondaryResistance: number; // kOhms (nom 11.2)
  sparkSpikeKv: number; // kV (nom 32.4)
  burnTimeMs: number; // ms (nom 1.45)
  timingDriftDeg: number; // deg BTDC
  rpm: number;
  magTemp: number; // deg C
  isFaultActive: boolean;
  activeFaultName?: string;
  simulatedHealthDegradation: number; // %
}

// --- Subsystem telemetry interfaces ---

export interface LubricationTelemetry {
  oil_pressure: number;       // psi
  oil_temp: number;           // °C
  oil_flow_rate: number;      // L/min
  oil_level: number;          // %
  oil_filter_dp: number;      // psi
  oil_pump_health: number;    // %
  bearing_temp: number;       // °C
  crankcase_pressure: number; // psi
  oil_quality_index: number;  // %
  oil_contamination: number;  // %
  oil_debris_level: number;   // ppm
  health: number;             // %
  oil_system_health: number;  // %
  lubrication_risk: number;   // %
  bearing_risk: number;       // %
  oil_starvation_risk: number; // %
}

export interface FuelTelemetry {
  tank_level: number;          // %
  flow_rate: number;           // L/h
  pressure: number;            // psi
  temperature: number;         // °C
  filter_dp: number;           // psi
  injector_duty_cycle: number; // %
  injector_health: number;     // %
  pump_health: number;         // %
  consumption_rate: number;    // L/h
  remaining_fuel: number;      // L
  air_fuel_ratio: number;
  health: number;              // %
  starvation_risk: number;     // %
  estimated_endurance: number; // hours
  fuel_remaining_time: number; // hours
  fuel_efficiency: number;     // %
  fuel_system_risk: number;    // %
}

export interface CoolingTelemetry {
  cht: number;                  // °C
  egt: number;                  // °C
  intake_air_temp: number;      // °C
  ambient_temp: number;         // °C
  cooling_air_temp: number;     // °C
  cooling_airflow: number;      // %
  cylinder_temp_spread: number; // °C
  cooling_effectiveness: number; // %
  health: number;               // %
  overheat_risk: number;        // %
  thermal_margin: number;       // °C
}

export interface MechanicalTelemetry {
  crankshaft_rpm: number;
  crankshaft_speed_variation: number; // %
  crankshaft_vibration: number;       // g
  connecting_rod_stress: number;      // %
  piston_temp: number;                // °C
  piston_health: number;              // %
  cylinder_pressure: number;          // psi
  bearing_temp: number;               // °C
  main_bearing_health: number;        // %
  con_rod_bearing_health: number;     // %
  valve_timing: number;               // deg offset
  valve_health: number;               // %
  crankcase_pressure: number;         // psi
  mechanical_efficiency: number;      // %
  health: number;                     // %
  wear_index: number;                 // %
  wear_risk: number;                  // %
  bearing_failure_risk: number;       // %
  piston_failure_risk: number;        // %
  valve_failure_risk: number;         // %
}

export interface CylinderData {
  id: number;
  cht: number;
  egt: number;
  cylinder_pressure: number;
  misfire_probability: number;
  ignition_status: string;
  health: number;
}

export interface EngineHealthData {
  overall: number;
  lubrication_health: number;
  fuel_health: number;
  cooling_health: number;
  mechanical_health: number;
  magneto_health: number;
  ignition_health: number;
  critical_risk: number;
  warning_risk: number;
  mission_reliability: number;
}

export interface AeroTwinTelemetry {
  t: number;
  mission: string;
  throttle: number;
  engine_load: number;
  altitude: number;
  ambient_temp: number;
  manifold_pressure: number;
  air_fuel_ratio: number;
  rpm: number;
  cht: number;
  egt: number;
  oil_pressure: number;
  oil_temp: number;
  fuel_flow: number;
  vibration: number;
  battery_v: number;
  injection_timing: number;
  health_index: number;
  fault_probability: number;
  rul_hours: number;
  warning_level: string;
  engine_status: string;
  maintenance_required: boolean;
  fault_mode: string;
  fault_severity: number;
  sensor_anomaly: boolean;
  anomaly_score: number;
  magneto_health: number;
  ignition_stability: number;
  misfire_probability: number;
  spark_spike_kv: number;
  burn_time_ms: number;
  timing_drift_deg: number;
  magneto_temp: number;
  // Subsystem data
  lubrication?: LubricationTelemetry;
  fuel?: FuelTelemetry;
  cooling?: CoolingTelemetry;
  mechanical?: MechanicalTelemetry;
  cylinders?: CylinderData[];
  engine_health?: EngineHealthData;
  // ML enrichments
  anomaly?: { is_anomaly?: boolean; anomaly_score?: number; top_contributors?: Array<{ feature: string; z_score: number }> };
  fault_prediction?: { fault: string; confidence: number };
  fault_guess?: string;
  mission_reliability?: number;
  maintenance?: { priority: string; action: string; details?: string[] };
  rul_seconds?: number;
}

// --- What-If types ---

export interface WhatIfInput {
  // Engine
  engine_load?: number;
  throttle?: number;
  rpm?: number;
  air_fuel_ratio?: number;
  // Thermal
  ambient_temp?: number;
  cooling_airflow?: number;
  cht?: number;
  egt?: number;
  // Lubrication
  oil_pressure?: number;
  oil_temp?: number;
  oil_flow?: number;
  oil_level?: number;
  // Fuel
  fuel_pressure?: number;
  fuel_flow?: number;
  fuel_level?: number;
  injector_health?: number;
  // Ignition
  magneto_health?: number;
  ignition_stability?: number;
  timing_drift?: number;
  misfire_probability?: number;
  // Mechanical
  vibration?: number;
  bearing_health?: number;
  piston_health?: number;
  valve_health?: number;
  mechanical_wear?: number;
  // Mission
  mission_duration?: number;
  remaining_fuel?: number;
  // Legacy
  vibration_delta?: number;
  temperature_delta?: number;
  horizon_seconds?: number;
}

export interface WhatIfTimelinePoint {
  time_minutes: number;
  engine_health: number;
  rul_hours: number;
  cht: number;
  egt: number;
  oil_pressure: number;
  vibration: number;
  fault_probability: number;
  mission_reliability: number;
}

export interface WhatIfProjection {
  engine_health: number;
  health_index: number;
  rul_hours: number;
  rul_seconds: number;
  mission_reliability: number;
  fault_probability: number;
  fault_guess: string;
  risk_level: string;
  maintenance_priority: string;
  rpm: number;
  cht: number;
  egt: number;
  oil_pressure: number;
  vibration: number;
  fuel_flow: number;
  thermal_margin: number;
  overheat_risk: number;
  subsystem_health: {
    lubrication: number;
    fuel: number;
    cooling: number;
    mechanical: number;
    magneto: number;
    ignition: number;
  };
  maintenance: { priority: string; action: string; details?: string[] };
}

export interface WhatIfMissionImpact {
  mission_reliability: number;
  mission_status: string;
  estimated_remaining_time: number;
  fuel_endurance: number;
  engine_risk: string;
  abort_risk: number;
  maintenance_urgency: string;
}

export interface WhatIfResult {
  inputs: WhatIfInput;
  baseline: Record<string, number | string | null | undefined>;
  projection: WhatIfProjection;
  mission_impact: WhatIfMissionImpact;
  timeline: WhatIfTimelinePoint[];
}

export interface AlertThresholds {
  sparkBreakdownLimitKv: number;
  maxCoilTempC: number;
  chtWarningC: number;
  chtCriticalC: number;
  maxGapErosionMm: number;
  misfireCeilingPct: number;
  maxTimingJitterDeg: number;
}

export interface NotificationSettings {
  audioAlarmChime: boolean;
  pLeadAutoGround: boolean;
  visualAlertStrobe: boolean;
  satHeartbeatLossAlert: boolean;
  streamRateHz: number;
  operatorCallSign: string;
  uavId: string;
  sortieCode: string;
}
