import { CylinderGap, LogEntry, PowerChainStep, SimulationParams, AlertThresholds, NotificationSettings } from '../types';

export const INITIAL_SIMULATION_PARAMS: SimulationParams = {
  magnetoHealth: 88,
  ignitionStability: 94,
  misfireProb: 6,
  primaryResistance: 0.85,
  secondaryResistance: 11.2,
  sparkSpikeKv: 32.4,
  burnTimeMs: 1.45,
  timingDriftDeg: 0.04,
  rpm: 2420,
  magTemp: 64.8,
  isFaultActive: false,
  activeFaultName: undefined,
  simulatedHealthDegradation: -20,
};

export const INITIAL_POWER_CHAIN: PowerChainStep[] = [
  {
    id: 'step-1',
    stepNum: 1,
    title: 'MAGNETO GENERATOR',
    subtitle: 'Permanent NdFeB Rotor Induction',
    metric: '32.4 kV',
    metricSub: '400 Hz WAVE',
    status: 'nominal',
    details: 'LOW-IMPEDANCE FEED',
  },
  {
    id: 'step-2',
    stepNum: 2,
    title: 'IGNITION HARNESS',
    subtitle: 'Shielded Mil-Spec High-Tension Leads',
    metric: '0.02 Ω Loss',
    metricSub: 'EMI SUPPRESSED',
    status: 'nominal',
    details: 'BREAKDOWN DELAY 12ms',
  },
  {
    id: 'step-3',
    stepNum: 3,
    title: 'HIGH-ENERGY SPARK',
    subtitle: 'Gap Ionization & Thermal Kernels',
    metric: '78 mJ',
    metricSub: 'DISCHARGE NOMINAL',
    status: 'nominal',
    details: 'FLAME PROPAGATION 24 m/s',
  },
  {
    id: 'step-4',
    stepNum: 4,
    title: 'OPTIMAL COMBUSTION',
    subtitle: 'Stoichiometric Peak Pressure Index',
    metric: 'λ 1.02',
    metricSub: 'EFFICIENCY 98.4%',
    status: 'nominal',
    details: 'CYCLE DURATION: 24.8 ms SYNCHRONIZED WITH FADEC',
  },
];

export const INITIAL_CYLINDER_GAPS: CylinderGap[] = [
  { cylinder: 1, location: 'TOP', gapMm: 0.53, erosionPct: 6, status: 'nominal' },
  { cylinder: 2, location: 'TOP', gapMm: 0.54, erosionPct: 8, status: 'nominal' },
  { cylinder: 3, location: 'TOP', gapMm: 0.52, erosionPct: 4, status: 'nominal' },
  { cylinder: 4, location: 'TOP', gapMm: 0.55, erosionPct: 10, status: 'nominal' },
];

export const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: '14:32:04.120',
    channel: 'P-LEAD',
    message: 'Left magneto primary switch circuit verified ground isolation normal.',
    level: 'info',
  },
  {
    id: 'log-2',
    timestamp: '14:32:05.480',
    channel: 'COIL-01',
    message: 'Secondary discharge timing synchronized: 28.02° BTDC, arc energy 78.4 mJ.',
    level: 'info',
  },
  {
    id: 'log-3',
    timestamp: '14:32:07.892',
    channel: 'SYNCHRO',
    message: 'Minor high-RPM phase flutter observed on Mag-R pickoff. Delta 0.04° - nominal dampening applied.',
    level: 'warn',
  },
  {
    id: 'log-4',
    timestamp: '14:32:08.012',
    channel: 'FADEC',
    message: 'Closed-loop ignition feedback verified: 2,420 RPM, advance envelope stable.',
    level: 'info',
  },
];

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  sparkBreakdownLimitKv: 35.0,
  maxCoilTempC: 75.0,
  chtWarningC: 185.0,
  chtCriticalC: 215.0,
  maxGapErosionMm: 0.70,
  misfireCeilingPct: 10.0,
  maxTimingJitterDeg: 0.15,
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  audioAlarmChime: true,
  pLeadAutoGround: true,
  visualAlertStrobe: true,
  satHeartbeatLossAlert: true,
  streamRateHz: 10,
  operatorCallSign: 'CAPT. R. VANCE',
  uavId: 'AT-01',
  sortieCode: 'SURVEILLANCE-07',
};

export interface HistoricalDataPoint {
  timeStr: string;
  timestamp: number;
  rpm: number;
  sparkKv: number;
  chtAvg: number;
  egtAvg: number;
  mapInHg: number;
  misfireRate: number;
  coilTemp: number;
}

export function generateHistoricalData(count: number = 30, faultActive: boolean = false): HistoricalDataPoint[] {
  const points: HistoricalDataPoint[] = [];
  const now = Date.now();
  const stepMs = 60 * 1000; // 1 min per sample

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * stepMs);
    const timeStr = time.toTimeString().split(' ')[0];
    const isRecentFault = faultActive && i < 10;

    const baseRpm = isRecentFault ? 2280 + Math.sin(i * 0.8) * 120 : 2420 + Math.sin(i * 0.3) * 25;
    const baseKv = isRecentFault ? 24.5 + Math.cos(i * 0.5) * 4.2 : 32.4 + (Math.random() - 0.5) * 0.8;
    const baseCht = isRecentFault ? 198 + i * 1.5 : 162 + Math.sin(i * 0.2) * 5;
    const baseEgt = isRecentFault ? 785 + i * 4 : 712 + Math.cos(i * 0.2) * 12;
    const baseMisfire = isRecentFault ? 28 + Math.random() * 8 : 4 + Math.random() * 2;
    const baseTemp = isRecentFault ? 76 + i * 0.8 : 64.8 + Math.sin(i * 0.4) * 2;

    points.push({
      timeStr,
      timestamp: time.getTime(),
      rpm: Math.round(baseRpm),
      sparkKv: Number(baseKv.toFixed(1)),
      chtAvg: Math.round(baseCht),
      egtAvg: Math.round(baseEgt),
      mapInHg: Number((28.4 + Math.sin(i * 0.1) * 0.4).toFixed(1)),
      misfireRate: Number(baseMisfire.toFixed(1)),
      coilTemp: Number(baseTemp.toFixed(1)),
    });
  }
  return points;
}
