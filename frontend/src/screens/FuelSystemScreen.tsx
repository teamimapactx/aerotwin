import React from 'react';
import { Fuel, Droplet, Activity, AlertTriangle, CheckCircle, Gauge, GaugeCircle, Thermometer } from 'lucide-react';
import { AeroTwinTelemetry } from '../types';

interface FuelSystemScreenProps {
  telemetry: AeroTwinTelemetry | null;
  isFaultActive: boolean;
}

export const FuelSystemScreen: React.FC<FuelSystemScreenProps> = ({ telemetry, isFaultActive }) => {
  const fuel = telemetry?.fuel;

  const getHealthColor = (health: number | undefined) => {
    if (health === undefined) return 'text-[#64748b]';
    if (health >= 85) return 'text-[#10b981]';
    if (health >= 60) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const getPressureColor = (p: number | undefined) => {
    if (p === undefined) return 'text-[#64748b]';
    if (p < 20) return 'text-[#ef4444]';
    if (p < 28) return 'text-[#f59e0b]';
    return 'text-[#10b981]';
  };

  const getFilterDpColor = (dp: number | undefined) => {
    if (dp === undefined) return 'text-[#64748b]';
    if (dp > 8) return 'text-[#ef4444]';
    if (dp > 5) return 'text-[#f59e0b]';
    return 'text-[#10b981]';
  };

  const safeVal = (val: number | undefined, dec: number = 1) => val !== undefined ? val.toFixed(dec) : '---';

  return (
    <div className="min-h-full bg-[#090b10] text-[#f1f5f9] p-6 font-mono selection:bg-[#38bdf8]/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-[#38bdf8]/20 pb-4 gap-4">
        <div>
          <div className="text-[10px] text-[#64748b] tracking-widest uppercase mb-1">AEROTWIN // FUEL SYSTEM // INJECTION & SUPPLY MONITOR</div>
          <h1 className="text-xl text-[#00f0ff] uppercase tracking-wider font-semibold flex items-center gap-3">
            <Fuel className="w-6 h-6" />
            FUEL SYSTEM HEALTH & SUPPLY CHAIN ANALYSIS
          </h1>
        </div>
        <div className={`px-4 py-2 border flex items-center gap-2 w-fit ${
          fuel?.health && fuel.health < 60 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {fuel?.health && fuel.health < 60 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm font-bold tracking-wider">
            SYS HEALTH: {safeVal(fuel?.health, 0)}%
          </span>
        </div>
      </div>

      {/* Main Gauge Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-5 relative overflow-hidden">
          <div className="text-[10px] text-[#64748b] tracking-wider mb-2">MAIN TANK LEVEL</div>
          <div className="text-5xl text-[#00f0ff] tabular-nums font-light mb-2">{safeVal(fuel?.tank_level, 1)}<span className="text-xl text-[#64748b]">%</span></div>
          <div className="w-full h-2 bg-[#090b10] mt-4">
            <div 
              className="h-full bg-[#00f0ff] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, fuel?.tank_level || 0))}%` }}
            />
          </div>
        </div>
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-5">
          <div className="text-[10px] text-[#64748b] tracking-wider mb-2">REMAINING FUEL</div>
          <div className="text-4xl text-[#f1f5f9] tabular-nums font-light">{safeVal(fuel?.remaining_fuel, 1)}<span className="text-xl text-[#64748b] ml-1">L</span></div>
          <div className="text-[10px] text-[#64748b] mt-4 uppercase">Calculated usable volume</div>
        </div>
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-5">
          <div className="text-[10px] text-[#64748b] tracking-wider mb-2">ESTIMATED ENDURANCE</div>
          <div className="text-4xl text-[#10b981] tabular-nums font-light">{safeVal(fuel?.estimated_endurance, 2)}<span className="text-xl text-[#64748b] ml-1">hrs</span></div>
          <div className="text-[10px] text-[#64748b] mt-4 uppercase">At current burn rate</div>
        </div>
      </div>

      {/* Grid of Sensors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Fuel Pressure */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">FUEL PRESSURE</div>
            <GaugeCircle className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className={`text-3xl tabular-nums ${getPressureColor(fuel?.pressure)}`}>
            {safeVal(fuel?.pressure)}<span className="text-sm text-[#64748b] ml-1">psi</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">NORM: 35-42 | WARN: &lt;28 | CRIT: &lt;20</div>
        </div>

        {/* Fuel Flow Rate */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">FLOW RATE</div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="text-3xl text-[#f1f5f9] tabular-nums">
            {safeVal(fuel?.flow_rate)}<span className="text-sm text-[#64748b] ml-1">L/h</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">SUPPLY LINE SENSOR</div>
        </div>

        {/* Fuel Temperature */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">TEMPERATURE</div>
            <Thermometer className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="text-3xl text-[#f1f5f9] tabular-nums">
            {safeVal(fuel?.temperature)}<span className="text-sm text-[#64748b] ml-1">°C</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">TANK/LINE TEMP</div>
        </div>

        {/* Filter ΔP */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">FILTER ΔP</div>
            <Gauge className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className={`text-3xl tabular-nums ${getFilterDpColor(fuel?.filter_dp)}`}>
            {safeVal(fuel?.filter_dp, 2)}<span className="text-sm text-[#64748b] ml-1">psi</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">WARN: &gt;5 | CRIT: &gt;8</div>
        </div>

        {/* Air-Fuel Ratio */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">AIR-FUEL RATIO</div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="text-3xl text-[#00f0ff] tabular-nums">
            {safeVal(fuel?.air_fuel_ratio, 2)}
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">NOMINAL: 14.7:1</div>
        </div>

        {/* Consumption Rate */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">CONSUMPTION RATE</div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="text-3xl text-[#f1f5f9] tabular-nums">
            {safeVal(fuel?.consumption_rate, 2)}<span className="text-sm text-[#64748b] ml-1">L/h</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">COMPUTED BURN</div>
        </div>
        
        {/* Injector Duty Cycle */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">INJECTOR DUTY CYCLE</div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="text-3xl text-[#f1f5f9] tabular-nums">
            {safeVal(fuel?.injector_duty_cycle, 1)}<span className="text-sm text-[#64748b] ml-1">%</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">AVERAGE PWM CYCLE</div>
        </div>

        {/* Fuel Efficiency */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">FUEL EFFICIENCY</div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className={`text-3xl tabular-nums ${getHealthColor(fuel?.fuel_efficiency)}`}>
            {safeVal(fuel?.fuel_efficiency, 1)}<span className="text-sm text-[#64748b] ml-1">%</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">ENGINE PERFORMANCE METRIC</div>
        </div>
        
        {/* Injector Health */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">INJECTOR HEALTH</div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className={`text-3xl tabular-nums ${getHealthColor(fuel?.injector_health)}`}>
            {safeVal(fuel?.injector_health, 1)}<span className="text-sm text-[#64748b] ml-1">%</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">DIAGNOSTIC ESTIMATE</div>
        </div>

        {/* Pump Health */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] text-[#64748b] tracking-wider">PUMP HEALTH</div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className={`text-3xl tabular-nums ${getHealthColor(fuel?.pump_health)}`}>
            {safeVal(fuel?.pump_health, 1)}<span className="text-sm text-[#64748b] ml-1">%</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-2">DIAGNOSTIC ESTIMATE</div>
        </div>
      </div>

      {/* Risk & Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#64748b] tracking-wider mb-1">FUEL SYSTEM RISK</div>
            <div className={`text-2xl tabular-nums ${fuel?.fuel_system_risk && fuel.fuel_system_risk > 50 ? 'text-[#ef4444]' : 'text-[#f1f5f9]'}`}>
              {safeVal(fuel?.fuel_system_risk, 1)}<span className="text-sm text-[#64748b] ml-1">%</span>
            </div>
          </div>
          <AlertTriangle className={`w-8 h-8 ${fuel?.fuel_system_risk && fuel.fuel_system_risk > 50 ? 'text-[#ef4444]' : 'text-[#10b981]'}`} />
        </div>
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#64748b] tracking-wider mb-1">STARVATION RISK</div>
            <div className={`text-2xl tabular-nums ${fuel?.starvation_risk && fuel.starvation_risk > 50 ? 'text-[#ef4444]' : 'text-[#f1f5f9]'}`}>
              {safeVal(fuel?.starvation_risk, 1)}<span className="text-sm text-[#64748b] ml-1">%</span>
            </div>
          </div>
          <AlertTriangle className={`w-8 h-8 ${fuel?.starvation_risk && fuel.starvation_risk > 50 ? 'text-[#ef4444]' : 'text-[#10b981]'}`} />
        </div>
      </div>

      {/* Status Footer */}
      <div className="mt-8 flex items-center gap-3 border-t border-[#38bdf8]/20 pt-4">
        <div className={`w-2 h-2 rounded-full ${isFaultActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
        <span className="text-xs text-[#64748b] uppercase tracking-wider">
          {isFaultActive ? 'ACTIVE FAULT DETECTED - CHECK TELEMETRY LOGS' : 'SYSTEM NOMINAL - CONTINUOUS MONITORING ACTIVE'}
        </span>
      </div>
    </div>
  );
};
