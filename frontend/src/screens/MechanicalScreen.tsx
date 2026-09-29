import React from 'react';
import { Cog, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AeroTwinTelemetry } from '../types';

interface MechanicalScreenProps {
  telemetry: AeroTwinTelemetry | null;
  isFaultActive: boolean;
}

export const MechanicalScreen: React.FC<MechanicalScreenProps> = ({ telemetry, isFaultActive }) => {
  const mech = telemetry?.mechanical;
  
  const getStatusColor = (val: number | undefined, warn: number, crit: number, lowerIsBetter = true) => {
    if (val === undefined) return 'text-[#64748b]';
    if (lowerIsBetter) {
      if (val >= crit) return 'text-[#ef4444]';
      if (val >= warn) return 'text-[#f59e0b]';
      return 'text-[#10b981]';
    } else {
      if (val <= crit) return 'text-[#ef4444]';
      if (val <= warn) return 'text-[#f59e0b]';
      return 'text-[#10b981]';
    }
  };

  const formatVal = (val: number | undefined, decimals = 1) => 
    val !== undefined ? val.toFixed(decimals) : '---';

  const SensorCard = ({ label, value, unit, statusClass }: { label: string, value: string, unit: string, statusClass?: string }) => (
    <div className="bg-[#090b10] border border-[#38bdf8]/15 p-4 rounded-sm flex flex-col justify-between">
      <div className="text-[#64748b] text-[10px] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-mono tabular-nums ${statusClass || 'text-[#00f0ff]'}`}>{value}</span>
        <span className="text-[#64748b] text-xs font-mono">{unit}</span>
      </div>
    </div>
  );

  const RiskIndicator = ({ label, risk }: { label: string, risk: number | undefined }) => {
    let colorClass = 'text-[#64748b] bg-[#090b10]';
    let dotColor = 'bg-[#64748b]';
    
    if (risk !== undefined) {
      if (risk > 75) { colorClass = 'text-[#ef4444] bg-[#ef4444]/10'; dotColor = 'bg-[#ef4444]'; }
      else if (risk > 50) { colorClass = 'text-[#f59e0b] bg-[#f59e0b]/10'; dotColor = 'bg-[#f59e0b]'; }
      else { colorClass = 'text-[#10b981] bg-[#10b981]/10'; dotColor = 'bg-[#10b981]'; }
    }

    return (
      <div className="bg-[#090b10] border border-[#38bdf8]/15 p-3 rounded-sm flex items-center justify-between">
        <span className="text-[10px] text-[#f1f5f9] uppercase tracking-wider">{label}</span>
        <div className={`px-2 py-1 flex items-center gap-2 rounded-sm border border-[#38bdf8]/10 ${colorClass}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
          <span className="font-mono text-xs">{formatVal(risk, 0)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#090b10] text-[#f1f5f9] font-mono p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#38bdf8]/20 pb-2">
        <div className="flex items-center gap-2 text-[#00f0ff]">
          <Cog size={16} />
          <span className="text-xs uppercase tracking-widest">AEROTWIN // MECHANICAL ASSEMBLY // STRUCTURAL INTEGRITY</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0d1117] border border-[#38bdf8]/20 rounded-sm">
            <span className="text-[#64748b] text-[10px] uppercase">Mech Health</span>
            <span className={`text-xs font-bold ${getStatusColor(mech?.health, 75, 50, false)}`}>
              {formatVal(mech?.health, 1)}%
            </span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-sm text-xs ${
            isFaultActive 
              ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]' 
              : 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
          }`}>
            {isFaultActive ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
            <span className="uppercase tracking-wider">{isFaultActive ? 'SYS_FAULT' : 'SYS_NOMINAL'}</span>
          </div>
        </div>
      </div>

      <div className="text-lg text-[#00f0ff] uppercase tracking-widest font-semibold">
        MECHANICAL ASSEMBLY HEALTH & STRUCTURAL ANALYSIS
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-3 gap-3">
        <SensorCard 
          label="Crankshaft RPM" 
          value={formatVal(mech?.crankshaft_rpm, 0)} 
          unit="RPM" 
        />
        <SensorCard 
          label="Crankshaft Speed Var" 
          value={formatVal(mech?.crankshaft_speed_variation, 2)} 
          unit="%" 
        />
        <SensorCard 
          label="Crankshaft Vibration" 
          value={formatVal(mech?.crankshaft_vibration, 3)} 
          unit="g"
          statusClass={getStatusColor(mech?.crankshaft_vibration, 1.0, 2.0)}
        />
        <SensorCard 
          label="Conn Rod Stress" 
          value={formatVal(mech?.connecting_rod_stress, 1)} 
          unit="% yield"
          statusClass={getStatusColor(mech?.connecting_rod_stress, 65, 80)}
        />
        <SensorCard 
          label="Piston Temp" 
          value={formatVal(mech?.piston_temp, 1)} 
          unit="°C" 
        />
        <SensorCard 
          label="Piston Health" 
          value={formatVal(mech?.piston_health, 1)} 
          unit="%"
          statusClass={getStatusColor(mech?.piston_health, 75, 50, false)}
        />
        <SensorCard 
          label="Cylinder Pressure" 
          value={formatVal(mech?.cylinder_pressure, 1)} 
          unit="psi" 
        />
        <SensorCard 
          label="Bearing Temp" 
          value={formatVal(mech?.bearing_temp, 1)} 
          unit="°C"
          statusClass={getStatusColor(mech?.bearing_temp, 90, 100)}
        />
        <SensorCard 
          label="Main Bearing Health" 
          value={formatVal(mech?.main_bearing_health, 1)} 
          unit="%"
          statusClass={getStatusColor(mech?.main_bearing_health, 75, 50, false)}
        />
        <SensorCard 
          label="Con Rod Bearing Health" 
          value={formatVal(mech?.con_rod_bearing_health, 1)} 
          unit="%"
          statusClass={getStatusColor(mech?.con_rod_bearing_health, 75, 50, false)}
        />
        <SensorCard 
          label="Valve Timing Offset" 
          value={formatVal(mech?.valve_timing, 2)} 
          unit="deg"
          statusClass={getStatusColor(Math.abs(mech?.valve_timing || 0), 2, 4)}
        />
        <SensorCard 
          label="Valve Health" 
          value={formatVal(mech?.valve_health, 1)} 
          unit="%"
          statusClass={getStatusColor(mech?.valve_health, 75, 50, false)}
        />
        <SensorCard 
          label="Crankcase Pressure" 
          value={formatVal(mech?.crankcase_pressure, 2)} 
          unit="psi" 
        />
        <SensorCard 
          label="Mechanical Efficiency" 
          value={formatVal(mech?.mechanical_efficiency, 1)} 
          unit="%"
          statusClass={getStatusColor(mech?.mechanical_efficiency, 90, 80, false)}
        />
        <SensorCard 
          label="Wear Index" 
          value={formatVal(mech?.wear_index, 2)} 
          unit="%"
          statusClass={getStatusColor(mech?.wear_index, 50, 75)}
        />
      </div>

      {/* Risk Indicators section */}
      <div className="bg-[#0d1117] border border-[#38bdf8]/15 rounded-sm p-4 mt-2">
        <div className="text-[10px] text-[#64748b] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity size={12} />
          Structural Risk Assessment
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <RiskIndicator label="Wear Risk" risk={mech?.wear_risk} />
          <RiskIndicator label="Bearing Fail Risk" risk={mech?.bearing_failure_risk} />
          <RiskIndicator label="Piston Fail Risk" risk={mech?.piston_failure_risk} />
          <RiskIndicator label="Valve Fail Risk" risk={mech?.valve_failure_risk} />
          
          {/* Overall Health indicator in Risk format but inverted color logic */}
          <div className="bg-[#090b10] border border-[#38bdf8]/15 p-3 rounded-sm flex items-center justify-between">
            <span className="text-[10px] text-[#f1f5f9] uppercase tracking-wider">Overall Health</span>
            <div className={`px-2 py-1 flex items-center gap-2 rounded-sm border border-[#38bdf8]/10 ${
              (mech?.health ?? 100) < 50 ? 'text-[#ef4444] bg-[#ef4444]/10' :
              (mech?.health ?? 100) < 75 ? 'text-[#f59e0b] bg-[#f59e0b]/10' :
              'text-[#10b981] bg-[#10b981]/10'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                (mech?.health ?? 100) < 50 ? 'bg-[#ef4444]' :
                (mech?.health ?? 100) < 75 ? 'bg-[#f59e0b]' :
                'bg-[#10b981]'
              }`}></div>
              <span className="font-mono text-xs">{formatVal(mech?.health, 0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
