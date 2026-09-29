import React from 'react';
import { Thermometer, Fan, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
import { AeroTwinTelemetry } from '../types';

interface CoolingSystemScreenProps {
  telemetry: AeroTwinTelemetry | null;
  isFaultActive: boolean;
}

// Utility to format numbers safely
const formatNumber = (val: number | undefined | null, decimals: number = 1) => {
  if (val === undefined || val === null) return '---';
  return val.toFixed(decimals);
};

export const CoolingSystemScreen: React.FC<CoolingSystemScreenProps> = ({ telemetry, isFaultActive }) => {
  const data = telemetry?.cooling;
  const cylinders = telemetry?.cylinders || [];
  
  const healthStatus = data?.health || 1.0;
  
  // Health styling
  const healthColor = healthStatus > 0.8 ? 'text-[#10b981]' : healthStatus > 0.5 ? 'text-[#f59e0b]' : 'text-[#ef4444]';
  const HealthIcon = healthStatus > 0.8 ? CheckCircle : AlertTriangle;
  
  // CHT/EGT Color logic
  const getChtColor = (val?: number) => {
    if (!val) return 'text-[#00f0ff]';
    if (val > 180) return 'text-[#ef4444]';
    if (val > 130) return 'text-[#f59e0b]';
    return 'text-[#10b981]';
  };

  const getEgtColor = (val?: number) => {
    if (!val) return 'text-[#00f0ff]';
    if (val > 800) return 'text-[#ef4444]';
    if (val > 720) return 'text-[#f59e0b]';
    return 'text-[#10b981]';
  };

  const getChtWidth = (val?: number) => val ? Math.min((val / 220) * 100, 100) : 0;
  const getEgtWidth = (val?: number) => val ? Math.min((val / 1000) * 100, 100) : 0;

  // Global thresholds
  const chtGlobalColor = getChtColor(data?.cht);
  const egtGlobalColor = getEgtColor(data?.egt);
  const spreadColor = (data?.cylinder_temp_spread || 0) > 25 ? 'text-[#ef4444]' : (data?.cylinder_temp_spread || 0) > 15 ? 'text-[#f59e0b]' : 'text-[#10b981]';

  return (
    <div className="flex flex-col h-full bg-[#090b10] text-[#f1f5f9] p-4 font-mono overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-[#38bdf8]/20 pb-2">
        <div className="flex items-center space-x-3">
          <Thermometer className="text-[#00f0ff] w-6 h-6" />
          <h1 className="text-xl tracking-wider font-semibold text-[#00f0ff]">
            AEROTWIN // COOLING SYSTEM // THERMAL MANAGEMENT
          </h1>
        </div>
        <div className="text-[10px] tracking-widest text-[#64748b]">
          AIR-COOLED PRIMARY CONFIGURATION
        </div>
      </div>

      {/* Title & Health */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg tracking-widest">COOLING SYSTEM HEALTH & THERMAL ANALYSIS</h2>
        <div className={`flex items-center space-x-2 px-3 py-1 bg-[#0d1117] border border-[#38bdf8]/20 rounded ${healthColor}`}>
          <HealthIcon className="w-5 h-5" />
          <span className="text-sm font-bold tracking-wider">
            HEALTH: {formatNumber(healthStatus * 100, 1)}%
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Thermal Margin - Big Display */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/20 p-4 rounded flex flex-col justify-center items-center">
          <div className="text-[10px] text-[#64748b] tracking-wider mb-2 uppercase">THERMAL MARGIN TO LIMIT (220°C)</div>
          <div className={`text-5xl font-bold tabular-nums mb-4 ${
             (data?.thermal_margin || 0) < 20 ? 'text-[#ef4444]' : (data?.thermal_margin || 0) < 50 ? 'text-[#f59e0b]' : 'text-[#10b981]'
          }`}>
            {formatNumber(data?.thermal_margin, 1)}<span className="text-xl">°C</span>
          </div>
          <div className="w-full h-2 bg-[#090b10] rounded overflow-hidden">
             <div 
               className={`h-full ${
                  (data?.thermal_margin || 0) < 20 ? 'bg-[#ef4444]' : (data?.thermal_margin || 0) < 50 ? 'bg-[#f59e0b]' : 'bg-[#10b981]'
               }`}
               style={{ width: `${Math.min(100, Math.max(0, ((data?.thermal_margin || 0)/100)*100))}%` }}
             ></div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/20 p-4 rounded lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center justify-center border-r border-[#38bdf8]/15 last:border-0">
            <span className="text-[10px] text-[#64748b] mb-1">OVERHEAT RISK</span>
            <span className={`text-lg font-bold ${(data?.overheat_risk || 0) > 0.5 ? 'text-[#ef4444]' : (data?.overheat_risk || 0) > 0.3 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
              {formatNumber((data?.overheat_risk || 0) * 100, 1)}%
            </span>
          </div>
          <div className="flex flex-col items-center justify-center border-r border-[#38bdf8]/15 last:border-0">
            <span className="text-[10px] text-[#64748b] mb-1">COOLING EFFECTIVENESS</span>
            <span className="text-lg font-bold text-[#00f0ff]">{formatNumber((data?.cooling_effectiveness || 0) * 100, 1)}%</span>
          </div>
          <div className="flex flex-col items-center justify-center border-r border-[#38bdf8]/15 last:border-0">
            <span className="text-[10px] text-[#64748b] mb-1">TEMP SPREAD</span>
            <span className={`text-lg font-bold ${spreadColor}`}>{formatNumber(data?.cylinder_temp_spread, 1)}°C</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] text-[#64748b] mb-1">COOLING AIRFLOW</span>
            <span className="text-lg font-bold text-[#00f0ff]">{formatNumber(data?.cooling_airflow, 1)}%</span>
          </div>
        </div>
      </div>

      {/* Sensor Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'GLOBAL CHT', value: formatNumber(data?.cht), unit: '°C', color: chtGlobalColor },
          { label: 'GLOBAL EGT', value: formatNumber(data?.egt), unit: '°C', color: egtGlobalColor },
          { label: 'INTAKE AIR', value: formatNumber(data?.intake_air_temp), unit: '°C', color: 'text-[#00f0ff]' },
          { label: 'AMBIENT TEMP', value: formatNumber(data?.ambient_temp), unit: '°C', color: 'text-[#00f0ff]' },
          { label: 'COOLING AIR', value: formatNumber(data?.cooling_air_temp), unit: '°C', color: 'text-[#00f0ff]' },
          { label: 'AIRFLOW', value: formatNumber(data?.cooling_airflow), unit: '%', color: 'text-[#00f0ff]' },
          { label: 'TEMP SPREAD', value: formatNumber(data?.cylinder_temp_spread), unit: '°C', color: spreadColor },
          { label: 'EFFECTIVENESS', value: formatNumber((data?.cooling_effectiveness || 0)*100), unit: '%', color: 'text-[#00f0ff]' },
        ].map((sensor, idx) => (
          <div key={idx} className="bg-[#0d1117] border border-[#38bdf8]/15 p-3 rounded flex flex-col">
            <span className="text-[10px] text-[#64748b] mb-1">{sensor.label}</span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-xl font-bold tabular-nums ${sensor.color}`}>{sensor.value}</span>
              <span className="text-xs text-[#64748b]">{sensor.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cylinder Thermal Matrix */}
      <div className="bg-[#0d1117] border border-[#38bdf8]/20 rounded p-4 flex-1">
        <h3 className="text-sm tracking-wider text-[#00f0ff] mb-4 flex items-center">
          <Flame className="w-4 h-4 mr-2" />
          CYLINDER THERMAL MATRIX
        </h3>
        
        {cylinders.length > 0 ? (
          <div className="space-y-4">
            {cylinders.map((cyl) => (
              <div key={cyl.id} className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <div className="w-24 text-sm font-bold text-[#f1f5f9]">
                  CYL {cyl.id}
                </div>
                
                {/* CHT Bar */}
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#64748b]">CHT</span>
                    <span className={`tabular-nums ${getChtColor(cyl.cht)}`}>{formatNumber(cyl.cht, 1)} °C</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#090b10] rounded overflow-hidden">
                    <div 
                      className={`h-full ${getChtColor(cyl.cht).replace('text-', 'bg-')}`} 
                      style={{ width: `${getChtWidth(cyl.cht)}%` }}
                    ></div>
                  </div>
                </div>

                {/* EGT Bar */}
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#64748b]">EGT</span>
                    <span className={`tabular-nums ${getEgtColor(cyl.egt)}`}>{formatNumber(cyl.egt, 1)} °C</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#090b10] rounded overflow-hidden">
                    <div 
                      className={`h-full ${getEgtColor(cyl.egt).replace('text-', 'bg-')}`} 
                      style={{ width: `${getEgtWidth(cyl.egt)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-[#64748b] py-8">
            NO CYLINDER DATA AVAILABLE
          </div>
        )}
      </div>

    </div>
  );
};
