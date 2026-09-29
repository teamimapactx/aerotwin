import React, { useState, useEffect, useCallback } from 'react';
import { AvionicsHeader } from './components/AvionicsHeader';
import { NavigationRail } from './components/NavigationRail';
import { MagnetoScreen } from './screens/MagnetoScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { LubricationScreen } from './screens/LubricationScreen';
import { FuelSystemScreen } from './screens/FuelSystemScreen';
import { CoolingSystemScreen } from './screens/CoolingSystemScreen';
import { MechanicalScreen } from './screens/MechanicalScreen';
import { WhatIfScreen } from './screens/WhatIfScreen';
import {
  DEFAULT_ALERT_THRESHOLDS,
  DEFAULT_NOTIFICATIONS,
  INITIAL_CYLINDER_GAPS,
  INITIAL_LOGS,
  INITIAL_POWER_CHAIN,
  INITIAL_SIMULATION_PARAMS,
} from './data/mockTelemetry';
import {
  AlertThresholds,
  CylinderGap,
  LogEntry,
  NavigationScreen,
  NotificationSettings,
  PowerChainStep,
  SimulationParams,
  AeroTwinTelemetry,
} from './types';
import { hudAudio } from './utils/audio';
import { connectTelemetry } from './services/telemetry';
import { clearFault as clearBackendFault, triggerFault as triggerBackendFault } from './services/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<NavigationScreen>('magneto');
  const [subsystem, setSubsystem] = useState<string>('magneto');
  const [simulationParams, setSimulationParams] = useState<SimulationParams>(INITIAL_SIMULATION_PARAMS);
  const [powerChain] = useState<PowerChainStep[]>(INITIAL_POWER_CHAIN);
  const [cylinderGaps] = useState<CylinderGap[]>(INITIAL_CYLINDER_GAPS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [telemetry, setTelemetry] = useState<AeroTwinTelemetry | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'>('CONNECTING');

  // Live AeroTwin backend stream. The Stitch UI remains usable with its local
  // demo state until the backend connects, then backend telemetry becomes the source of truth.
  useEffect(() => {
    return connectTelemetry((data) => {
      setTelemetry(data as AeroTwinTelemetry);
      setSimulationParams((prev) => ({
        ...prev,
        rpm: Number(data.rpm ?? prev.rpm),
        magnetoHealth: Number(data.magneto_health ?? prev.magnetoHealth),
        ignitionStability: Number(data.ignition_stability ?? prev.ignitionStability),
        misfireProb: Number(data.misfire_probability ?? prev.misfireProb),
        sparkSpikeKv: Number(data.spark_spike_kv ?? prev.sparkSpikeKv),
        burnTimeMs: Number(data.burn_time_ms ?? prev.burnTimeMs),
        timingDriftDeg: Number(data.timing_drift_deg ?? prev.timingDriftDeg),
        magTemp: Number(data.magneto_temp ?? prev.magTemp),
        isFaultActive: Boolean(data.fault_mode && data.fault_mode !== 'none'),
        activeFaultName: data.fault_mode && data.fault_mode !== 'none' ? data.fault_mode : undefined,
      }));
    }, setConnectionStatus);
  }, []);

  // Trigger Fault Handler
  const handleTriggerFault = useCallback(
    (faultName: string = 'misfire') => {
      // Map display fault names to backend FaultMode enum values
      const faultMap: Record<string, string> = {
        'overheat': 'overheating', 'overheating': 'overheating', 'overheat_fault': 'overheat',
        'lubric': 'lubrication_loss', 'lubrication': 'lubrication_loss',
        'vibr': 'abnormal_vibration', 'vibration': 'abnormal_vibration',
        'misfire': 'misfire',
        'magneto_degradation': 'magneto_degradation', 'ignition_instability': 'ignition_instability',
        'low_oil_pressure': 'low_oil_pressure', 'high_oil_temperature': 'high_oil_temperature',
        'oil_filter_blockage': 'oil_filter_blockage', 'oil_starvation': 'oil_starvation',
        'low_fuel_pressure': 'low_fuel_pressure', 'fuel_filter_blockage': 'fuel_filter_blockage',
        'injector_degradation': 'injector_degradation', 'fuel_starvation': 'fuel_starvation',
        'fuel_pump_degradation': 'fuel_pump_degradation',
        'cooling_degradation': 'cooling_degradation', 'airflow_reduction': 'airflow_reduction',
        'bearing_degradation': 'bearing_degradation', 'piston_wear': 'piston_wear',
        'valve_timing_fault': 'valve_timing_fault', 'crankshaft_vibration': 'crankshaft_vibration',
        'mechanical_wear': 'mechanical_wear',
      };
      const lowerFault = faultName.toLowerCase();
      const backendFault = faultMap[lowerFault] ||
        Object.entries(faultMap).find(([k]) => lowerFault.includes(k))?.[1] || 'misfire';
      triggerBackendFault(backendFault).catch((error) => console.warn('Backend fault trigger unavailable:', error));
      const now = new Date();
      const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
        now.getUTCMinutes()
      ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}.${String(
        now.getMilliseconds()
      ).padStart(3, '0')}`;

      setSimulationParams((prev) => ({
        ...prev,
        isFaultActive: true,
        activeFaultName: faultName,
        magnetoHealth: 68,
        ignitionStability: 72,
        misfireProb: 31,
        sparkSpikeKv: 23.8,
        burnTimeMs: 0.82,
        timingDriftDeg: 0.38,
        magTemp: 78.4,
        rpm: 2280,
      }));

      const newFaultLog: LogEntry = {
        id: `fault-${Date.now()}`,
        timestamp: timeStr,
        channel: 'FAULT',
        message: `CRITICAL TRIP: ${faultName} detected on Mag-L. Spark energy dropped below 50 mJ.`,
        level: 'error',
      };

      const newAlertLog: LogEntry = {
        id: `alert-${Date.now() + 1}`,
        timestamp: timeStr,
        channel: 'ALERT',
        message: 'FADEC governor hunting event initiated: RPM surge ±180. EGT divergence alert on Cyl 2.',
        level: 'warn',
      };

      setLogs((prev) => [...prev, newFaultLog, newAlertLog]);
    },
    []
  );

  // Clear Fault Handler
  const handleClearFault = useCallback(() => {
    clearBackendFault().catch((error) => console.warn('Backend fault clear unavailable:', error));
    const now = new Date();
    const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
      now.getUTCMinutes()
    ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}.${String(
      now.getMilliseconds()
    ).padStart(3, '0')}`;

    setSimulationParams((prev) => ({
      ...prev,
      isFaultActive: false,
      activeFaultName: undefined,
      magnetoHealth: 88,
      ignitionStability: 94,
      misfireProb: 6,
      sparkSpikeKv: 32.4,
      burnTimeMs: 1.45,
      timingDriftDeg: 0.04,
      magTemp: 64.8,
      rpm: 2420,
    }));

    const clearLog: LogEntry = {
      id: `sys-${Date.now()}`,
      timestamp: timeStr,
      channel: 'SYS',
      message: 'Operator cleared fault state. FADEC closed-loop ignition re-synchronized to 28.00° BTDC.',
      level: 'success',
    };

    setLogs((prev) => [...prev, clearLog]);
  }, []);

  // Update simulation parameters
  const handleUpdateParams = useCallback((newParams: Partial<SimulationParams>) => {
    setSimulationParams((prev) => ({
      ...prev,
      ...newParams,
    }));
  }, []);

  // Clear all logs
  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Toggle streaming
  const handleToggleStreaming = useCallback(() => {
    hudAudio.playBlip(850);
    setIsStreaming((prev) => !prev);
  }, []);

  // Periodic Telemetry Log Generator when streaming is active
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
        now.getUTCMinutes()
      ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}.${String(
        now.getMilliseconds()
      ).padStart(3, '0')}`;

      const normalMessages = [
        {
          channel: 'COIL-01' as const,
          message: `Secondary discharge timing locked: 28.02° BTDC, arc energy 78.${Math.floor(
            Math.random() * 9
          )} mJ.`,
          level: 'info' as const,
        },
        {
          channel: 'P-LEAD' as const,
          message: 'P-Lead primary switch continuous ground isolation verified nominal (>100 MΩ).',
          level: 'info' as const,
        },
        {
          channel: 'SYNCHRO' as const,
          message: `Cam rotation pickup 40.3 Hz synchronized with FADEC master clock. Jitter < 0.05°.`,
          level: 'info' as const,
        },
        {
          channel: 'FADEC' as const,
          message: `Closed-loop combustion pressure index λ 1.02. CHT spread within 12°C envelope.`,
          level: 'info' as const,
        },
      ];

      const faultMessages = [
        {
          channel: 'FAULT' as const,
          message: `Intermittent secondary coil arc breakdown. Peak voltage suppressed: 23.8 kV.`,
          level: 'error' as const,
        },
        {
          channel: 'ALERT' as const,
          message: `Cylinder 2 flame front quenching risk elevated. Misfire index 31%.`,
          level: 'warn' as const,
        },
        {
          channel: 'SYNCHRO' as const,
          message: `Phase flutter exceeding threshold (+0.38° BTDC). Governor hunting detected.`,
          level: 'warn' as const,
        },
      ];

      const pool = simulationParams.isFaultActive ? faultMessages : normalMessages;
      const picked = pool[Math.floor(Math.random() * pool.length)];

      const newEntry: LogEntry = {
        id: `auto-${Date.now()}`,
        timestamp: timeStr,
        channel: picked.channel,
        message: picked.message,
        level: picked.level,
      };

      setLogs((prev) => {
        // Keep last 150 entries to prevent memory overflow
        const slice = prev.length > 150 ? prev.slice(prev.length - 149) : prev;
        return [...slice, newEntry];
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isStreaming, simulationParams.isFaultActive]);

  // Compute alert count
  const alertCount = telemetry?.anomaly?.is_anomaly || simulationParams.isFaultActive ? 3 : 0;

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#090b10] text-[#dfe2eb] ${
        notifications.visualAlertStrobe && simulationParams.isFaultActive
          ? 'ring-1 ring-inset ring-[#ef4444]/40'
          : ''
      }`}
    >
      {/* Persistent Avionics Top Status Ribbon */}
      <AvionicsHeader
        isFaultActive={simulationParams.isFaultActive}
        activeFaultName={simulationParams.activeFaultName}
        onTriggerFault={handleTriggerFault}
        onClearFault={handleClearFault}
        notifications={notifications}
        alertCount={alertCount}
        connectionStatus={connectionStatus}
      />

      {/* Main Workspace Frame: Left Rail + Active Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Tactical Navigation Rail (Hidden during print) */}
        <div className="no-print hidden md:flex shrink-0">
          <NavigationRail
            currentScreen={currentScreen}
            onSelectScreen={(screen) => setCurrentScreen(screen)}
            subsystem={subsystem}
            onSelectSubsystem={(sub) => setSubsystem(sub)}
            isFaultActive={simulationParams.isFaultActive}
          />
        </div>

        {/* Screen 1: Magneto Digital Twin & Simulation Screen */}
        {currentScreen === 'magneto' && (
          <MagnetoScreen
            simulationParams={simulationParams}
            onUpdateParams={handleUpdateParams}
            isFaultActive={simulationParams.isFaultActive}
            onTriggerFault={handleTriggerFault}
            onClearFault={handleClearFault}
            powerChain={powerChain}
            cylinderGaps={cylinderGaps}
            logs={logs}
            onClearLogs={handleClearLogs}
            isStreaming={isStreaming}
            onToggleStreaming={handleToggleStreaming}
          />
        )}

        {/* Screen 2: Dashboard Sensor Data & Historical Trends */}
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            simulationParams={simulationParams}
            isFaultActive={simulationParams.isFaultActive}
            onNavigate={(screen) => setCurrentScreen(screen)}
            telemetry={telemetry}
          />
        )}

        {/* Screen 3: Settings & Alert Thresholds */}
        {currentScreen === 'settings' && (
          <SettingsScreen
            thresholds={thresholds}
            onUpdateThresholds={(t) => setThresholds(t)}
            notifications={notifications}
            onUpdateNotifications={(n) => setNotifications(n)}
          />
        )}

        {/* Screen 4: Diagnostic Reports & PDF Export */}
        {currentScreen === 'reports' && (
          <ReportsScreen
            simulationParams={simulationParams}
            cylinderGaps={cylinderGaps}
            logs={logs}
            notifications={notifications}
            isFaultActive={simulationParams.isFaultActive}
          />
        )}

        {/* Screen 5: Lubrication System */}
        {currentScreen === 'lubrication' && (
          <LubricationScreen
            telemetry={telemetry}
            isFaultActive={simulationParams.isFaultActive}
          />
        )}

        {/* Screen 6: Fuel System */}
        {currentScreen === 'fuel' && (
          <FuelSystemScreen
            telemetry={telemetry}
            isFaultActive={simulationParams.isFaultActive}
          />
        )}

        {/* Screen 7: Cooling System */}
        {currentScreen === 'cooling' && (
          <CoolingSystemScreen
            telemetry={telemetry}
            isFaultActive={simulationParams.isFaultActive}
          />
        )}

        {/* Screen 8: Mechanical Assembly */}
        {currentScreen === 'mechanical' && (
          <MechanicalScreen
            telemetry={telemetry}
            isFaultActive={simulationParams.isFaultActive}
          />
        )}

        {/* Screen 9: What-If Simulation */}
        {currentScreen === 'whatif' && (
          <WhatIfScreen
            telemetry={telemetry}
            isFaultActive={simulationParams.isFaultActive}
          />
        )}
      </div>

      {/* Mobile Bottom Screen Selector Bar - Visible on small screens */}
      <div className="md:hidden no-print h-12 bg-[#0d1117] border-t border-[#38bdf8]/15 flex items-center justify-around text-[10px] font-mono select-none px-2 shrink-0">
        <button
          onClick={() => setCurrentScreen('magneto')}
          className={`px-2 py-1 uppercase font-bold tracking-wider ${
            currentScreen === 'magneto' ? 'text-[#00f0ff] border-b-2 border-[#00f0ff]' : 'text-[#64748b]'
          }`}
        >
          Magneto
        </button>
        <button
          onClick={() => setCurrentScreen('dashboard')}
          className={`px-2 py-1 uppercase font-bold tracking-wider ${
            currentScreen === 'dashboard' ? 'text-[#00f0ff] border-b-2 border-[#00f0ff]' : 'text-[#64748b]'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setCurrentScreen('settings')}
          className={`px-2 py-1 uppercase font-bold tracking-wider ${
            currentScreen === 'settings' ? 'text-[#00f0ff] border-b-2 border-[#00f0ff]' : 'text-[#64748b]'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setCurrentScreen('reports')}
          className={`px-2 py-1 uppercase font-bold tracking-wider ${
            currentScreen === 'reports' ? 'text-[#00f0ff] border-b-2 border-[#00f0ff]' : 'text-[#64748b]'
          }`}
        >
          Reports
        </button>
      </div>
    </div>
  );
}
