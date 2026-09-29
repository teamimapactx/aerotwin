import React, { useState, useEffect } from 'react';
import {
  AeroTwinTelemetry,
  WhatIfInput,
  WhatIfResult,
} from '../types';
import { runWhatIf } from '../services/api';
import { hudAudio } from '../utils/audio';
import { Play, AlertTriangle, Shield, Clock, ChevronDown, ChevronRight, Activity, Zap, Thermometer, Droplet, Settings } from 'lucide-react';

interface WhatIfScreenProps {
  telemetry: AeroTwinTelemetry | null;
  isFaultActive: boolean;
}

interface InputCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  params: {
    key: keyof WhatIfInput;
    label: string;
    min: number;
    max: number;
    step?: number;
    unit: string;
  }[];
}

const inputCategories: InputCategory[] = [
  {
    id: 'engine',
    name: 'ENGINE',
    icon: Settings,
    params: [
      { key: 'engine_load', label: 'Engine Load', min: 0, max: 100, step: 5, unit: '%' },
      { key: 'throttle', label: 'Throttle', min: 0, max: 100, step: 5, unit: '%' },
      { key: 'rpm', label: 'RPM', min: 3000, max: 5500, step: 10, unit: '' },
    ]
  },
  {
    id: 'thermal',
    name: 'THERMAL',
    icon: Thermometer,
    params: [
      { key: 'ambient_temp', label: 'Ambient Temp', min: -10, max: 50, step: 1, unit: '°C' },
      { key: 'cooling_airflow', label: 'Cooling Airflow', min: 20, max: 100, step: 1, unit: '%' },
      { key: 'cht', label: 'CHT', min: 60, max: 200, step: 1, unit: '°C' },
      { key: 'egt', label: 'EGT', min: 400, max: 850, step: 1, unit: '°C' },
    ]
  },
  {
    id: 'lubrication',
    name: 'LUBRICATION',
    icon: Droplet,
    params: [
      { key: 'oil_pressure', label: 'Oil Pressure', min: 10, max: 70, step: 1, unit: 'psi' },
      { key: 'oil_temp', label: 'Oil Temp', min: 60, max: 120, step: 1, unit: '°C' },
    ]
  },
  {
    id: 'fuel',
    name: 'FUEL',
    icon: Activity,
    params: [
      { key: 'fuel_pressure', label: 'Fuel Pressure', min: 10, max: 50, step: 1, unit: 'psi' },
      { key: 'fuel_flow', label: 'Fuel Flow', min: 4, max: 15, step: 0.1, unit: 'L/h' },
      { key: 'injector_health', label: 'Injector Health', min: 40, max: 100, step: 1, unit: '%' },
    ]
  },
  {
    id: 'ignition',
    name: 'IGNITION',
    icon: Zap,
    params: [
      { key: 'magneto_health', label: 'Magneto Health', min: 20, max: 100, step: 1, unit: '%' },
      { key: 'ignition_stability', label: 'Ignition Stability', min: 30, max: 100, step: 1, unit: '%' },
    ]
  },
  {
    id: 'mechanical',
    name: 'MECHANICAL',
    icon: Settings,
    params: [
      { key: 'vibration', label: 'Vibration', min: 0.2, max: 4.0, step: 0.1, unit: 'g' },
      { key: 'bearing_health', label: 'Bearing Health', min: 20, max: 100, step: 1, unit: '%' },
      { key: 'piston_health', label: 'Piston Health', min: 30, max: 100, step: 1, unit: '%' },
      { key: 'valve_health', label: 'Valve Health', min: 30, max: 100, step: 1, unit: '%' },
    ]
  },
  {
    id: 'mission',
    name: 'MISSION',
    icon: Clock,
    params: [
      { key: 'mission_duration', label: 'Mission Duration', min: 1, max: 12, step: 0.5, unit: 'hrs' },
      { key: 'remaining_fuel', label: 'Remaining Fuel', min: 10, max: 200, step: 1, unit: 'L' },
    ]
  }
];

export const WhatIfScreen: React.FC<WhatIfScreenProps> = ({ telemetry, isFaultActive }) => {
  const [params, setParams] = useState<WhatIfInput>({
    engine_load: 75,
    throttle: 75,
    rpm: 4500,
    ambient_temp: 20,
    cooling_airflow: 80,
    cht: 120,
    egt: 650,
    oil_pressure: 45,
    oil_temp: 90,
    fuel_pressure: 30,
    fuel_flow: 8,
    injector_health: 95,
    magneto_health: 95,
    ignition_stability: 95,
    vibration: 0.5,
    bearing_health: 95,
    piston_health: 95,
    valve_health: 95,
    mission_duration: 4,
    remaining_fuel: 100
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    engine: true,
    thermal: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WhatIfResult | null>(null);

  // Initialize from telemetry if available
  useEffect(() => {
    if (telemetry && !result) {
      setParams(prev => ({
        ...prev,
        rpm: telemetry.rpm,
        engine_load: (telemetry.engine_load ?? 0.65) * 100,
        throttle: (telemetry.throttle ?? 0.70) * 100,
        ambient_temp: telemetry.ambient_temp ?? 20,
        oil_pressure: telemetry.lubrication?.oil_pressure ?? telemetry.oil_pressure ?? 55,
        oil_temp: telemetry.lubrication?.oil_temp ?? telemetry.oil_temp ?? 85,
        fuel_pressure: telemetry.fuel?.pressure ?? 38,
        vibration: telemetry.mechanical?.crankshaft_vibration ?? telemetry.vibration ?? 0.8,
        cht: telemetry.cylinders?.[0]?.cht ?? telemetry.cht ?? 95,
        egt: telemetry.cylinders?.[0]?.egt ?? telemetry.egt ?? 650,
        magneto_health: telemetry.magneto_health ?? 88,
        ignition_stability: telemetry.ignition_stability ?? 94,
        bearing_health: telemetry.mechanical?.main_bearing_health ?? 96,
        piston_health: telemetry.mechanical?.piston_health ?? 97,
        valve_health: telemetry.mechanical?.valve_health ?? 97,
        remaining_fuel: telemetry.fuel?.remaining_fuel ?? 156,
        cooling_airflow: telemetry.cooling?.cooling_airflow ?? 92,
        injector_health: telemetry.fuel?.injector_health ?? 96,
      }));
    }
  }, [telemetry]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
    hudAudio.playBlip(800);
  };

  const handleParamChange = (key: keyof WhatIfInput, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleRunWhatIf = async () => {
    try {
      setLoading(true);
      setError(null);
      hudAudio.playBlip(1000);

      const res = await runWhatIf(params);
      setResult(res);

      if (res.projection.risk_level === 'CRITICAL' || res.projection.risk_level === 'HIGH') {
        hudAudio.playFaultAlarm();
      } else {
        hudAudio.playSuccessChime();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run what-if simulation');
      hudAudio.playBlip(400);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-[#10b981] border-[#10b981] bg-[#10b981]/10';
      case 'MODERATE': return 'text-[#f59e0b] border-[#f59e0b] bg-[#f59e0b]/10';
      case 'HIGH': return 'text-[#ef4444] border-[#ef4444] bg-[#ef4444]/10';
      case 'CRITICAL': return 'text-[#ef4444] border-[#ef4444] bg-[#ef4444]/20 animate-pulse';
      default: return 'text-[#00f0ff] border-[#00f0ff] bg-[#00f0ff]/10';
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('CONTINUE')) return 'text-[#10b981]';
    if (status.includes('CAUTION')) return 'text-[#f59e0b]';
    if (status.includes('ABORT') || status.includes('RTB')) return 'text-[#ef4444]';
    return 'text-[#00f0ff]';
  };

  const renderComparison = (label: string, current: number | string, projected: number | string, isBetterHigh: boolean = true) => {
    const numCurrent = Number(current);
    const numProjected = Number(projected);
    let colorClass = 'text-[#f1f5f9]';
    if (!isNaN(numCurrent) && !isNaN(numProjected)) {
      if (numProjected > numCurrent) {
        colorClass = isBetterHigh ? 'text-[#10b981]' : 'text-[#ef4444]';
      } else if (numProjected < numCurrent) {
        colorClass = isBetterHigh ? 'text-[#ef4444]' : 'text-[#10b981]';
      }
    }
    return (
      <div className="flex justify-between items-center py-1 border-b border-[#38bdf8]/10 last:border-0">
        <span className="text-[10px] text-[#64748b] w-1/3">{label}</span>
        <span className="text-xs text-[#f1f5f9] font-mono tabular-nums w-1/3 text-center">{typeof current === 'number' ? current.toFixed(1) : current}</span>
        <span className={`text-xs font-mono tabular-nums w-1/3 text-right ${colorClass}`}>{typeof projected === 'number' ? projected.toFixed(1) : projected}</span>
      </div>
    );
  };

  const renderTimelineChart = () => {
    if (!result || !result.timeline || result.timeline.length === 0) return null;
    const maxTime = Math.max(...result.timeline.map(p => p.time_minutes));
    const points = result.timeline;
    const w = 400;
    const h = 150;
    const padding = 20;
    const getX = (t: number) => padding + (t / Math.max(1, maxTime)) * (w - padding * 2);
    const getY = (val: number, max: number = 100) => h - padding - (val / max) * (h - padding * 2);

    const healthPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.time_minutes)} ${getY(p.engine_health)}`).join(' ');
    const probPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.time_minutes)} ${getY(p.fault_probability * 100)}`).join(' ');
    const relPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.time_minutes)} ${getY(p.mission_reliability)}`).join(' ');

    return (
      <div className="mt-4 bg-[#090b10] p-4 border border-[#38bdf8]/20">
        <div className="flex justify-between text-[10px] text-[#64748b] mb-2">
          <span>0 min</span>
          <span>{maxTime} min</span>
        </div>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#38bdf8" strokeOpacity="0.2" />
          <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="#38bdf8" strokeOpacity="0.2" />
          <path d={healthPath} fill="none" stroke="#10b981" strokeWidth="2" />
          <path d={relPath} fill="none" stroke="#00f0ff" strokeWidth="2" strokeDasharray="4 4" />
          <path d={probPath} fill="none" stroke="#ef4444" strokeWidth="2" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={getX(p.time_minutes)} cy={getY(p.engine_health)} r="3" fill="#10b981" />
              <circle cx={getX(p.time_minutes)} cy={getY(p.fault_probability * 100)} r="3" fill="#ef4444" />
            </g>
          ))}
        </svg>
        <div className="flex justify-center gap-4 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#10b981] rounded-full"></div> Health</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#00f0ff] rounded-full"></div> Reliability</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#ef4444] rounded-full"></div> Fault Prob</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#090b10] text-[#f1f5f9] font-mono p-4">

      {/* Header */}
      <div className="mb-6 flex justify-between items-end border-b border-[#38bdf8]/20 pb-2">
        <div>
          <div className="text-[10px] text-[#00f0ff] tracking-widest mb-1">AEROTWIN // WHAT-IF SIMULATION // PREDICTIVE ANALYSIS ENGINE</div>
          <h1 className="text-xl font-bold tracking-wider text-[#f1f5f9]">COMPREHENSIVE WHAT-IF PROJECTION & MISSION IMPACT</h1>
        </div>
        {isFaultActive && (
          <div className="flex items-center gap-2 text-[#ef4444] text-xs border border-[#ef4444]/50 px-3 py-1 bg-[#ef4444]/10">
            <AlertTriangle size={14} className="animate-pulse" />
            ACTIVE FAULT DETECTED
          </div>
        )}
      </div>

      <div className="flex flex-1 gap-6 min-h-0">

        {/* Left Panel - Inputs */}
        <div className="w-[350px] flex flex-col h-full bg-[#0d1117] border border-[#38bdf8]/20 p-4 overflow-y-auto">
          <div className="text-xs text-[#00f0ff] mb-4 tracking-wider flex items-center justify-between">
            <span>PARAMETER SCENARIO</span>
            <button
              onClick={() => {
                const allClosed = Object.keys(expandedCategories).length === 0;
                const nextState: Record<string, boolean> = {};
                if (allClosed) {
                  inputCategories.forEach(c => nextState[c.id] = true);
                }
                setExpandedCategories(nextState);
              }}
              className="text-[10px] text-[#64748b] hover:text-[#00f0ff]"
            >
              TOGGLE ALL
            </button>
          </div>

          <div className="space-y-2 flex-1">
            {inputCategories.map(cat => (
              <div key={cat.id} className="border border-[#38bdf8]/15 bg-[#090b10]">
                <div
                  className="flex items-center p-2 cursor-pointer hover:bg-[#38bdf8]/5 select-none"
                  onClick={() => toggleCategory(cat.id)}
                >
                  {expandedCategories[cat.id] ? <ChevronDown size={14} className="text-[#38bdf8]" /> : <ChevronRight size={14} className="text-[#38bdf8]" />}
                  <cat.icon size={12} className="ml-2 mr-2 text-[#64748b]" />
                  <span className="text-[11px] font-bold text-[#f1f5f9] tracking-wider">{cat.name}</span>
                </div>

                {expandedCategories[cat.id] && (
                  <div className="p-3 pt-1 space-y-4 border-t border-[#38bdf8]/15">
                    {cat.params.map(param => (
                      <div key={param.key} className="flex flex-col gap-1">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] text-[#64748b]">{param.label}</label>
                          <div className="text-[11px] text-[#00f0ff] tabular-nums">
                            {(params as any)[param.key]} {param.unit}
                          </div>
                        </div>
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step || 1}
                          value={(params as any)[param.key] ?? param.min}
                          onChange={(e) => handleParamChange(param.key, parseFloat(e.target.value))}
                          className="w-full h-1 bg-[#38bdf8]/20 appearance-none cursor-pointer accent-[#00f0ff]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleRunWhatIf}
            disabled={loading}
            className="mt-4 w-full bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 text-[#00f0ff] border border-[#00f0ff] py-3 font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            {loading ? 'ANALYZING...' : 'RUN WHAT-IF SIMULATION'}
          </button>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col bg-[#0d1117] border border-[#38bdf8]/20 p-4 overflow-y-auto">
          {!result && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-[#64748b]">
              <Settings size={48} className="mb-4 opacity-50" />
              <p className="text-sm tracking-widest uppercase">Configure parameters and run simulation</p>
            </div>
          )}

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444] text-[#ef4444] p-4 mb-4 text-sm">
              <div className="font-bold flex items-center gap-2 mb-1"><AlertTriangle size={16} /> ERROR</div>
              {error}
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-[#00f0ff]">
              <div className="w-12 h-12 border-4 border-[#00f0ff]/20 border-t-[#00f0ff] rounded-full animate-spin mb-4" />
              <p className="text-xs tracking-widest animate-pulse">COMPUTING PROJECTIONS...</p>
            </div>
          )}

          {result && !loading && (
            <div className="flex-1 flex flex-col gap-6">

              {/* Current vs Projected & Risk Assessment */}
              <div className="flex gap-4">
                <div className="flex-1 bg-[#090b10] border border-[#38bdf8]/15 p-4">
                  <h3 className="text-[10px] text-[#00f0ff] tracking-widest mb-3 border-b border-[#38bdf8]/20 pb-1">STATE COMPARISON</h3>
                  <div className="flex justify-between items-center text-[9px] text-[#64748b] mb-2 uppercase">
                    <span className="w-1/3">Parameter</span>
                    <span className="w-1/3 text-center">Current</span>
                    <span className="w-1/3 text-right">Projected</span>
                  </div>
                  {renderComparison('Engine Health %', telemetry?.engine_health?.overall ?? telemetry?.health_index ?? 0, result.projection.engine_health, true)}
                  {renderComparison('RUL (hrs)', telemetry?.rul_hours ?? 0, result.projection.rul_hours, true)}
                  {renderComparison('Mission Rel. %', telemetry?.engine_health?.mission_reliability ?? telemetry?.mission_reliability ?? 0, result.projection.mission_reliability, true)}
                  {renderComparison('Fault Prob.', telemetry?.fault_probability ?? 0, result.projection.fault_probability, false)}
                  {renderComparison('RPM', telemetry?.rpm ?? 0, result.projection.rpm, true)}
                  {renderComparison('Oil Press. psi', telemetry?.lubrication?.oil_pressure ?? telemetry?.oil_pressure ?? 0, result.projection.oil_pressure, true)}
                  {renderComparison('CHT °C', telemetry?.cht ?? 0, result.projection.cht, false)}
                  {renderComparison('Vibration g', telemetry?.vibration ?? 0, result.projection.vibration, false)}
                </div>

                {/* Risk Assessment */}
                <div className="w-64 flex flex-col gap-4">
                  <div className={`border p-4 flex flex-col items-center justify-center text-center ${getRiskColor(result.projection.risk_level)}`}>
                    <Shield size={24} className="mb-2" />
                    <div className="text-[10px] tracking-widest uppercase mb-1">RISK LEVEL</div>
                    <div className="text-xl font-bold tracking-wider">{result.projection.risk_level}</div>
                  </div>

                  <div className="bg-[#090b10] border border-[#38bdf8]/15 p-3 flex-1 flex flex-col justify-center">
                    <div className="text-[9px] text-[#64748b] uppercase mb-1">Predicted Fault</div>
                    <div className="text-xs text-[#f1f5f9] mb-3 truncate">{result.projection.fault_guess || 'NONE DETECTED'}</div>
                    <div className="text-[9px] text-[#64748b] uppercase mb-1">Maintenance Priority</div>
                    <div className="text-xs text-[#f1f5f9]">{result.projection.maintenance_priority || 'ROUTINE'}</div>
                  </div>
                </div>
              </div>

              {/* Subsystem Health & Mission Impact */}
              <div className="flex gap-4">
                <div className="flex-1 bg-[#090b10] border border-[#38bdf8]/15 p-4">
                  <h3 className="text-[10px] text-[#00f0ff] tracking-widest mb-3 border-b border-[#38bdf8]/20 pb-1">PROJECTED SUBSYSTEM HEALTH</h3>
                  <div className="space-y-3">
                    {Object.entries(result.projection.subsystem_health).map(([system, health]) => (
                      <div key={system}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="uppercase text-[#f1f5f9]">{system.replace('_', ' ')}</span>
                          <span className="tabular-nums text-[#00f0ff]">{(health as number).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#1e293b] overflow-hidden">
                          <div
                            className={`h-full ${(health as number) > 80 ? 'bg-[#10b981]' : (health as number) > 50 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}
                            style={{ width: `${health}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 bg-[#090b10] border border-[#38bdf8]/15 p-4">
                  <h3 className="text-[10px] text-[#00f0ff] tracking-widest mb-3 border-b border-[#38bdf8]/20 pb-1">MISSION IMPACT</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-[#64748b] uppercase mb-1">Mission Status</div>
                      <div className={`text-sm font-bold tracking-wide ${getStatusColor(result.mission_impact.mission_status)}`}>
                        {result.mission_impact.mission_status}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#64748b] uppercase mb-1">Abort Risk</div>
                      <div className={`text-sm font-mono tabular-nums ${result.mission_impact.abort_risk > 30 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                        {result.mission_impact.abort_risk.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#64748b] uppercase mb-1">Fuel Endurance</div>
                      <div className="text-sm text-[#f1f5f9] font-mono tabular-nums">
                        {result.mission_impact.fuel_endurance.toFixed(1)} hrs
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#64748b] uppercase mb-1">Maintenance Urgency</div>
                      <div className="text-sm text-[#f1f5f9]">
                        {result.mission_impact.maintenance_urgency}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-[#090b10] border border-[#38bdf8]/15 p-4">
                <h3 className="text-[10px] text-[#00f0ff] tracking-widest border-b border-[#38bdf8]/20 pb-1">PROJECTION TIMELINE</h3>
                {renderTimelineChart()}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
