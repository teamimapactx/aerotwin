import React from 'react';
import { Droplet, AlertTriangle, Activity } from 'lucide-react';
import { AeroTwinTelemetry } from '../types';

interface LubricationScreenProps {
  telemetry: AeroTwinTelemetry | null;
  isFaultActive: boolean;
}

interface SensorConfig {
  label: string;
  value: number | undefined;
  unit: string;
  min: number;
  max: number;
  critLow?: number;
  warnLow?: number;
  warnHigh?: number;
  critHigh?: number;
}

export const LubricationScreen: React.FC<LubricationScreenProps> = ({
  telemetry,
  isFaultActive,
}) => {
  const data = telemetry?.lubrication;

  const getValueColor = (val: number | undefined, config: Omit<SensorConfig, 'label' | 'value' | 'unit' | 'min' | 'max'>) => {
    if (val === undefined) return 'text-[#64748b]';
    if (config.critLow !== undefined && val <= config.critLow) return 'text-[#ef4444]';
    if (config.critHigh !== undefined && val >= config.critHigh) return 'text-[#ef4444]';
    if (config.warnLow !== undefined && val <= config.warnLow) return 'text-[#f59e0b]';
    if (config.warnHigh !== undefined && val >= config.warnHigh) return 'text-[#f59e0b]';
    return 'text-[#10b981]';
  };

  const getBarColor = (val: number | undefined, config: Omit<SensorConfig, 'label' | 'value' | 'unit' | 'min' | 'max'>) => {
    if (val === undefined) return 'bg-[#64748b]';
    if (config.critLow !== undefined && val <= config.critLow) return 'bg-[#ef4444]';
    if (config.critHigh !== undefined && val >= config.critHigh) return 'bg-[#ef4444]';
    if (config.warnLow !== undefined && val <= config.warnLow) return 'bg-[#f59e0b]';
    if (config.warnHigh !== undefined && val >= config.warnHigh) return 'bg-[#f59e0b]';
    return 'bg-[#10b981]';
  };

  const SensorCard = ({ config }: { config: SensorConfig }) => {
    const { label, value, unit, min, max } = config;
    const pct = value !== undefined ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
    const colorClass = getValueColor(value, config);
    const barClass = getBarColor(value, config);

    return (
      <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
        <div className="text-[10px] text-[#64748b] uppercase tracking-wider mb-2">{label}</div>
        <div className="flex items-baseline space-x-1 mb-3">
          <span className={`text-xl font-bold font-mono tabular-nums ${colorClass}`}>
            {value !== undefined ? value.toFixed(1) : '---'}
          </span>
          <span className="text-[10px] text-[#64748b] uppercase">{unit}</span>
        </div>
        <div className="w-full bg-[#090b10] h-1.5 rounded-full overflow-hidden mb-1 border border-[#38bdf8]/10">
          <div
            className={`h-full ${barClass} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-[#64748b] font-mono">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  const sensors: SensorConfig[] = [
    { label: 'Oil Pressure', value: data?.oil_pressure, unit: 'psi', min: 0, max: 100, warnLow: 45, critLow: 35 },
    { label: 'Oil Temperature', value: data?.oil_temp, unit: '°C', min: 20, max: 150, warnHigh: 95, critHigh: 105 },
    { label: 'Oil Flow Rate', value: data?.oil_flow_rate, unit: 'L/min', min: 0, max: 10, warnLow: 3.5, critLow: 2.5 },
    { label: 'Oil Level', value: data?.oil_level, unit: '%', min: 0, max: 100, warnLow: 30, critLow: 15 },
    { label: 'Oil Filter ΔP', value: data?.oil_filter_dp, unit: 'psi', min: 0, max: 20, warnHigh: 6, critHigh: 10 },
    { label: 'Oil Pump Health', value: data?.oil_pump_health, unit: '%', min: 0, max: 100, warnLow: 75, critLow: 50 },
    { label: 'Bearing Temperature', value: data?.bearing_temp, unit: '°C', min: 20, max: 150, warnHigh: 90, critHigh: 100 },
    { label: 'Crankcase Pressure', value: data?.crankcase_pressure, unit: 'psi', min: 0, max: 50, warnHigh: 20, critHigh: 30 },
    { label: 'Oil Quality Index', value: data?.oil_quality_index, unit: '%', min: 0, max: 100, warnLow: 50, critLow: 30 },
    { label: 'Oil Contamination', value: data?.oil_contamination, unit: '%', min: 0, max: 100, warnHigh: 10, critHigh: 20 },
    { label: 'Oil Debris Level', value: data?.oil_debris_level, unit: 'ppm', min: 0, max: 50, warnHigh: 5, critHigh: 10 },
  ];

  const overallHealth = data?.health ?? 100;
  const healthColor = overallHealth >= 80 ? 'text-[#10b981]' : overallHealth >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]';

  return (
    <div className="flex flex-col h-full bg-[#090b10] text-[#f1f5f9] p-6 font-mono overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-[#38bdf8]/20 pb-4">
        <div>
          <div className="text-[10px] text-[#38bdf8] uppercase tracking-widest mb-1 flex items-center">
            <Activity className="w-3 h-3 mr-2" />
            AEROTWIN // LUBRICATION SYSTEM // OIL CIRCUIT MONITOR
          </div>
          <h1 className="text-xl font-bold tracking-wider flex items-center">
            <Droplet className="w-5 h-5 mr-3 text-[#00f0ff]" />
            LUBRICATION SYSTEM HEALTH & OIL CIRCUIT ANALYSIS
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-[#0d1117] border border-[#38bdf8]/15 px-4 py-2 flex items-center">
            <span className="text-[10px] text-[#64748b] uppercase mr-3">Sys Health</span>
            <span className={`text-lg font-bold ${healthColor} tabular-nums`}>
              {overallHealth.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {sensors.map((sensor, idx) => (
          <SensorCard key={idx} config={sensor} />
        ))}
        {/* Placeholder to make it 12 items / 4 rows in 3 cols */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-center items-center opacity-50">
           <Droplet className="w-8 h-8 text-[#64748b] mb-2" />
           <span className="text-[10px] text-[#64748b] uppercase">Monitoring Active</span>
        </div>
      </div>

      {/* Bottom Section: Risk Indicators & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Indicators */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4">
          <h2 className="text-[10px] text-[#38bdf8] uppercase tracking-widest mb-4">Risk Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Oil System Health', val: data?.oil_system_health },
              { label: 'Lubrication Risk', val: data?.lubrication_risk },
              { label: 'Bearing Risk', val: data?.bearing_risk },
              { label: 'Oil Starvation Risk', val: data?.oil_starvation_risk },
            ].map((risk, idx) => {
               // Assuming risks are 0-100 probabilities or health scores.
               // Let's just display them simply. High risk usually bad, but health is good.
               let color = 'text-[#64748b]';
               if (risk.val !== undefined) {
                 if (risk.label.includes('Health')) {
                    color = risk.val >= 80 ? 'text-[#10b981]' : risk.val >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]';
                 } else {
                    color = risk.val <= 20 ? 'text-[#10b981]' : risk.val <= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]';
                 }
               }
               return (
                 <div key={idx} className="flex flex-col border border-[#38bdf8]/10 bg-[#090b10] p-3">
                   <span className="text-[9px] text-[#64748b] uppercase mb-1">{risk.label}</span>
                   <span className={`text-lg font-bold font-mono tabular-nums ${color}`}>
                     {risk.val !== undefined ? risk.val.toFixed(1) + '%' : '---'}
                   </span>
                 </div>
               );
            })}
          </div>
        </div>

        {/* Status Area */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-[10px] text-[#38bdf8] uppercase tracking-widest mb-4">System Status</h2>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${overallHealth < 50 ? 'bg-[#ef4444]' : overallHealth < 80 ? 'bg-[#f59e0b]' : 'bg-[#10b981]'}`} />
              <span className="text-sm uppercase tracking-wider">
                {overallHealth < 50 ? 'CRITICAL CONDITION' : overallHealth < 80 ? 'WARNING STATE' : 'NORMAL OPERATION'}
              </span>
            </div>
            {isFaultActive && (
              <div className="mt-4 flex items-center text-[#ef4444] border border-[#ef4444]/30 bg-[#ef4444]/10 p-3">
                <AlertTriangle className="w-4 h-4 mr-3" />
                <span className="text-[10px] uppercase tracking-wider">Active Fault Detected in System</span>
              </div>
            )}
          </div>
          <div className="text-[9px] text-[#64748b] uppercase text-right">
            Last Updated: {new Date().toISOString()}
          </div>
        </div>
      </div>
    </div>
  );
};
