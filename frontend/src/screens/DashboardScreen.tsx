import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Gauge,
  Thermometer,
  Zap,
  Droplet,
  Fuel,
  Fan,
  Cog,
  Radio,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { generateHistoricalData, HistoricalDataPoint } from '../data/mockTelemetry';
import { AeroTwinTelemetry, NavigationScreen, SimulationParams } from '../types';
import { hudAudio } from '../utils/audio';

interface DashboardScreenProps {
  simulationParams: SimulationParams;
  isFaultActive: boolean;
  onNavigate: (screen: NavigationScreen) => void;
  telemetry?: AeroTwinTelemetry | null;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  simulationParams,
  isFaultActive,
  onNavigate,
  telemetry,
}) => {
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '6h' | '24h'>('1h');
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'spark' | 'cht' | 'rpm' | 'egt'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalDataPoint | null>(null);

  // Generate historical data points based on time range and fault status
  const pointCount = timeRange === '15m' ? 15 : timeRange === '1h' ? 30 : timeRange === '6h' ? 60 : 90;
  const historyData = useMemo(() => {
    return generateHistoricalData(pointCount, isFaultActive);
  }, [pointCount, isFaultActive]);

  // Primary powerplant gauges
  const rpm = telemetry?.rpm ?? simulationParams.rpm;
  const mapInHg = telemetry?.manifold_pressure ?? 28.5;
  const oilPressure = telemetry?.oil_pressure ?? (isFaultActive ? 52 : 68);
  const oilTemp = telemetry?.oil_temp ?? (isFaultActive ? 94 : 82);
  const fuelFlow = telemetry?.fuel_flow ?? (isFaultActive ? 14.8 : 12.4);
  const busVolts = telemetry?.battery_v ?? (isFaultActive ? 27.4 : 28.2);
  const healthIndex = telemetry?.health_index ?? (isFaultActive ? 81.4 : 96.8);
  const cht = telemetry?.cht ?? (isFaultActive ? 188 : 162);
  const egt = telemetry?.egt ?? (isFaultActive ? 760 : 712);
  const vibration = telemetry?.vibration ?? (isFaultActive ? 2.0 : 0.8);

  // Cylinder telemetry readings — use backend data if available
  const cylData = telemetry?.cylinders?.length
    ? telemetry.cylinders.map(c => ({
        cyl: c.id,
        cht: c.cht,
        egt: c.egt,
        status: c.cht > 180 ? 'critical' : c.cht > 130 ? 'warning' : 'nominal' as const,
      }))
    : [
        { cyl: 1, cht, egt, status: cht > 112 ? 'warning' as const : 'nominal' as const },
        { cyl: 2, cht: cht + (isFaultActive ? 10 : 0), egt: egt + (isFaultActive ? 35 : 0), status: cht > 125 ? 'critical' as const : cht > 112 ? 'warning' as const : 'nominal' as const },
        { cyl: 3, cht: Math.max(0, cht - 3), egt: Math.max(0, egt - 8), status: 'nominal' as const },
        { cyl: 4, cht: cht + 2, egt: egt + 10, status: cht > 112 ? 'warning' as const : 'nominal' as const },
      ];

  // Subsystems health cards — use real backend engine_health data when available
  const engineHealth = telemetry?.engine_health;
  const lub = telemetry?.lubrication;
  const fuelSys = telemetry?.fuel;
  const cool = telemetry?.cooling;
  const mech = telemetry?.mechanical;

  const subsystems = [
    {
      id: 'magneto',
      name: 'Magneto & Ignition',
      icon: Zap,
      health: engineHealth?.magneto_health ?? telemetry?.magneto_health ?? (isFaultActive ? 68 : 92),
      status: (engineHealth?.magneto_health ?? 100) < 70 ? 'CRITICAL' : (engineHealth?.magneto_health ?? 100) < 85 ? 'WARNING' : 'NOMINAL',
      detail: `${(telemetry?.spark_spike_kv ?? 32.4).toFixed(1)} kV · ${(telemetry?.ignition_stability ?? 94).toFixed(0)}% Stability`,
      warning: (engineHealth?.magneto_health ?? 100) < 85,
    },
    {
      id: 'lubrication',
      name: 'Lubrication',
      icon: Droplet,
      health: engineHealth?.lubrication_health ?? lub?.health ?? Math.min(100, Math.max(0, 100 - Math.max(0, 60 - oilPressure) * 1.5)),
      status: (lub?.health ?? 100) < 60 ? 'CRITICAL' : (lub?.health ?? 100) < 80 ? 'WARNING' : 'NOMINAL',
      detail: `${(lub?.oil_pressure ?? oilPressure).toFixed(1)} PSI · ${(lub?.oil_temp ?? oilTemp).toFixed(1)}°C`,
      warning: (lub?.health ?? 100) < 80,
    },
    {
      id: 'fuel',
      name: 'Fuel System',
      icon: Fuel,
      health: engineHealth?.fuel_health ?? fuelSys?.health ?? Math.min(100, Math.max(0, 100 - Math.max(0, fuelFlow - 10) * 2)),
      status: (fuelSys?.health ?? 100) < 60 ? 'CRITICAL' : (fuelSys?.health ?? 100) < 80 ? 'WARNING' : 'NOMINAL',
      detail: `${(fuelSys?.flow_rate ?? fuelFlow).toFixed(1)} L/h · ${(fuelSys?.tank_level ?? 78).toFixed(0)}% Tank`,
      warning: (fuelSys?.health ?? 100) < 80,
    },
    {
      id: 'cooling',
      name: 'Cooling System',
      icon: Fan,
      health: engineHealth?.cooling_health ?? cool?.health ?? (isFaultActive ? 84 : 91),
      status: (cool?.health ?? 100) < 60 ? 'CRITICAL' : (cool?.health ?? 100) < 80 ? 'WARNING' : 'NOMINAL',
      detail: `CHT ${(cool?.cht ?? cht).toFixed(0)}°C · Margin ${(cool?.thermal_margin ?? 125).toFixed(0)}°C`,
      warning: (cool?.health ?? 100) < 80,
    },
    {
      id: 'mechanical',
      name: 'Mechanical Assembly',
      icon: Cog,
      health: engineHealth?.mechanical_health ?? mech?.health ?? Math.max(0, 100 - Math.max(0, vibration - 0.8) * 12),
      status: (mech?.health ?? 100) < 60 ? 'CRITICAL' : (mech?.health ?? 100) < 80 ? 'WARNING' : 'NOMINAL',
      detail: `Vib ${(mech?.crankshaft_vibration ?? vibration).toFixed(2)}g · ${(mech?.mechanical_efficiency ?? 93).toFixed(0)}% Eff`,
      warning: (mech?.health ?? 100) < 80,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-tactical-grid bg-[#090b10] text-[#dfe2eb] select-none font-mono">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#38bdf8]/15">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-[#64748b] tracking-wider uppercase">
            <span>AEROTWIN</span>
            <span>//</span>
            <span>POWERPLANT OVERVIEW</span>
            <span>//</span>
            <span className="text-[#38bdf8]">GLOBAL TELEMETRY BUS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[#f1f5f9] mt-0.5">
            POWERPLANT SENSOR DASHBOARD &amp; HISTORICAL TRENDS
          </h1>
        </div>

        {/* Global Stats Ribbon */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-[#0d1117] border border-[#38bdf8]/20 flex items-center gap-2 text-xs">
            <Radio className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span className="text-[#64748b] uppercase">SAMPLING:</span>
            <span className="text-[#00f0ff] font-bold">20 Hz SYNCHRONOUS</span>
          </div>
          <div className="px-3 py-1.5 bg-[#0d1117] border border-[#38bdf8]/20 flex items-center gap-2 text-xs">
            <span className="text-[#64748b] uppercase">OVERALL INTEGRITY:</span>
            <span className={`font-bold ${isFaultActive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {healthIndex.toFixed(1)}% {healthIndex < 75 ? 'DEGRADED' : 'OPTIMAL'}
            </span>
          </div>
        </div>
      </div>

      {/* Subsystem Health Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {subsystems.map((sub) => {
          const Icon = sub.icon;
          return (
            <div
              key={sub.id}
              onClick={() => {
                hudAudio.playBlip(800);
                if (sub.id === 'magneto') onNavigate('magneto');
              }}
              className={`p-3 border transition-all cursor-pointer group ${
                sub.warning
                  ? 'border-[#ef4444]/60 bg-[#ef4444]/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                  : 'border-[#38bdf8]/20 bg-[#0d1117] hover:border-[#00f0ff]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 border ${
                      sub.warning
                        ? 'border-[#ef4444]/40 bg-[#ef4444]/20 text-[#ef4444]'
                        : 'border-[#38bdf8]/30 bg-[#131924] text-[#00f0ff]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#f1f5f9] tracking-wider truncate">
                    {sub.name}
                  </span>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    sub.warning ? 'text-[#ef4444]' : 'text-[#00f0ff]'
                  }`}
                >
                  {sub.health}%
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-[#64748b] truncate">{sub.detail}</span>
                <span
                  className={`font-semibold uppercase tracking-wider ${
                    sub.warning ? 'text-[#ef4444]' : 'text-[#10b981]'
                  }`}
                >
                  {sub.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Row: Real-time Telemetry Cluster & Engine Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Engine Primary Sensor Clusters (6 cols) */}
        <div className="lg:col-span-6 bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#38bdf8]/15 mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#00f0ff]" />
              <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
                CORE ENGINE INSTRUMENTS &amp; FLUID DYNAMICS
              </h2>
            </div>
            <span className="text-[10px] text-[#64748b] uppercase">FADEC CHANNEL A/B</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* RPM Gauge Box */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[9px] uppercase tracking-wider text-[#64748b]">ENGINE SPEED</div>
              <div
                className={`text-xl font-bold tracking-tight tabular-nums mt-1 ${
                  isFaultActive ? 'text-[#f59e0b]' : 'text-[#00f0ff]'
                }`}
              >
                {rpm.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#64748b]">RPM</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-[#1e293b]">
                <div
                  className="h-full bg-[#00f0ff]"
                  style={{ width: `${(rpm / 2800) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>IDLE 900</span>
                <span>MAX 2700</span>
              </div>
            </div>

            {/* Manifold Air Pressure (MAP) */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[9px] uppercase tracking-wider text-[#64748b]">MANIFOLD PRESS</div>
              <div className="text-xl font-bold tracking-tight text-[#dfe2eb] tabular-nums mt-1">
                {mapInHg}{' '}
                <span className="text-xs font-normal text-[#64748b]">inHg</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-[#1e293b]">
                <div
                  className="h-full bg-[#38bdf8]"
                  style={{ width: `${(mapInHg / 32) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>BOOST 30</span>
                <span>CRUISE 24</span>
              </div>
            </div>

            {/* Fuel Flow */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[9px] uppercase tracking-wider text-[#64748b]">FUEL MASS FLOW</div>
              <div className="text-xl font-bold tracking-tight text-[#dfe2eb] tabular-nums mt-1">
                {fuelFlow}{' '}
                <span className="text-xs font-normal text-[#64748b]">GPH</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-[#1e293b]">
                <div
                  className="h-full bg-[#10b981]"
                  style={{ width: `${(fuelFlow / 20) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>LEAN 9.5</span>
                <span>FULL 18.0</span>
              </div>
            </div>

            {/* Oil Pressure */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[9px] uppercase tracking-wider text-[#64748b]">OIL PRESSURE</div>
              <div
                className={`text-xl font-bold tracking-tight tabular-nums mt-1 ${
                  oilPressure < 55 ? 'text-[#f59e0b]' : 'text-[#dfe2eb]'
                }`}
              >
                {oilPressure}{' '}
                <span className="text-xs font-normal text-[#64748b]">PSI</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-[#1e293b]">
                <div
                  className="h-full bg-[#38bdf8]"
                  style={{ width: `${(oilPressure / 100) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>MIN 30</span>
                <span>NORM 65-85</span>
              </div>
            </div>

            {/* Oil Temp */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[9px] uppercase tracking-wider text-[#64748b]">OIL TEMPERATURE</div>
              <div
                className={`text-xl font-bold tracking-tight tabular-nums mt-1 ${
                  oilTemp > 90 ? 'text-[#f59e0b]' : 'text-[#dfe2eb]'
                }`}
              >
                {oilTemp}{' '}
                <span className="text-xs font-normal text-[#64748b]">°C</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-[#1e293b]">
                <div
                  className="h-full bg-[#f59e0b]"
                  style={{ width: `${(oilTemp / 120) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>NORM 75-90</span>
                <span>MAX 105</span>
              </div>
            </div>

            {/* Bus Voltage */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[9px] uppercase tracking-wider text-[#64748b]">AVIONICS BUS</div>
              <div className="text-xl font-bold tracking-tight text-[#00f0ff] tabular-nums mt-1">
                {busVolts}{' '}
                <span className="text-xs font-normal text-[#64748b]">VDC</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-[#1e293b]">
                <div
                  className="h-full bg-[#00f0ff]"
                  style={{ width: `${(busVolts / 32) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>ALT: 42A</span>
                <span>BATT: 100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cylinder Thermal Matrix CHT / EGT (6 cols) */}
        <div className="lg:col-span-6 bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#38bdf8]/15 mb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-[#00f0ff]" />
              <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
                CYLINDER HEAD &amp; EXHAUST GAS THERMAL MATRIX (CHT / EGT)
              </h2>
            </div>
            <span className="text-[10px] text-[#64748b] uppercase">LIMIT: 215°C CHT</span>
          </div>

          <div className="space-y-3">
            {cylData.map((c) => {
              const isCrit = c.cht > 200;
              const isWarn = c.cht > 185;

              return (
                <div
                  key={c.cyl}
                  className={`p-2.5 border transition-all ${
                    isCrit
                      ? 'border-[#ef4444]/60 bg-[#ef4444]/10'
                      : isWarn
                      ? 'border-[#f59e0b]/50 bg-[#f59e0b]/5'
                      : 'border-[#38bdf8]/15 bg-[#090b10]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-bold text-[#f1f5f9]">CYLINDER #{c.cyl}</span>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[#64748b] uppercase text-[9px] mr-1">CHT:</span>
                        <span
                          className={`font-bold tabular-nums ${
                            isCrit ? 'text-[#ef4444]' : isWarn ? 'text-[#f59e0b]' : 'text-[#dfe2eb]'
                          }`}
                        >
                          {c.cht}°C
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b] uppercase text-[9px] mr-1">EGT:</span>
                        <span
                          className={`font-bold tabular-nums ${
                            isCrit ? 'text-[#ef4444]' : 'text-[#38bdf8]'
                          }`}
                        >
                          {c.egt}°C
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual bar: CHT & EGT */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="h-1.5 w-full bg-[#1e293b]">
                        <div
                          className={`h-full ${
                            isCrit ? 'bg-[#ef4444]' : isWarn ? 'bg-[#f59e0b]' : 'bg-[#00f0ff]'
                          }`}
                          style={{ width: `${(c.cht / 240) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="h-1.5 w-full bg-[#1e293b]">
                        <div
                          className="h-full bg-[#f59e0b]"
                          style={{ width: `${(c.egt / 950) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-[10px] text-[#64748b] flex justify-between">
            <span>● CYAN: CHT (CYLINDER HEAD)</span>
            <span>● AMBER: EGT (EXHAUST GAS)</span>
            <span className={isFaultActive ? 'text-[#ef4444] font-bold' : 'text-[#10b981]'}>
              {isFaultActive ? '⚠ THERMAL DIVERGENCE DETECTED' : 'BALANCED SPREAD &lt; 25°C'}
            </span>
          </div>
        </div>
      </div>

      {/* Historical Trend Multi-Channel Chart Visualization */}
      <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col font-mono">
        {/* Trend chart header with time range & channel filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#38bdf8]/15 gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
            <div>
              <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
                HISTORICAL TELEMETRY TRENDS &amp; CORRELATION OSCILLOGRAM
              </h2>
              <div className="text-[10px] text-[#64748b]">
                MULTI-CHANNEL TIME-SERIES WITH TIME-BASE SCRUBBER
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Channel filter tabs */}
            <div className="flex items-center border border-[#38bdf8]/20 bg-[#090b10] p-0.5 text-[10px]">
              {(['all', 'spark', 'cht', 'rpm', 'egt'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => {
                    hudAudio.playBlip(900);
                    setSelectedChannel(ch);
                  }}
                  className={`px-2 py-0.5 uppercase tracking-wider transition-colors ${
                    selectedChannel === ch
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold'
                      : 'text-[#64748b] hover:text-[#dfe2eb]'
                  }`}
                >
                  {ch === 'all' ? 'ALL' : ch.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Time range buttons */}
            <div className="flex items-center border border-[#38bdf8]/20 bg-[#090b10] p-0.5 text-[10px]">
              {(['15m', '1h', '6h', '24h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    hudAudio.playBlip(950);
                    setTimeRange(r);
                  }}
                  className={`px-2.5 py-0.5 uppercase tracking-wider transition-colors ${
                    timeRange === r
                      ? 'bg-[#38bdf8] text-[#090b10] font-bold'
                      : 'text-[#64748b] hover:text-[#dfe2eb]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive SVG / Canvas Multi-Curve Chart */}
        <div className="relative h-64 w-full bg-[#090b10] mt-3 border border-[#38bdf8]/20 p-2 overflow-hidden">
          {/* SVG Multi-Line Chart */}
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 1000 240"
            preserveAspectRatio="none"
          >
            {/* Horizontal datum lines */}
            {[0, 60, 120, 180, 240].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="1000"
                y2={y}
                stroke="rgba(56, 189, 248, 0.08)"
                strokeWidth="1"
              />
            ))}

            {/* Vertical time grid lines */}
            {[0, 200, 400, 600, 800, 1000].map((x) => (
              <line
                key={x}
                x1={x}
                y1="0"
                x2={x}
                y2="240"
                stroke="rgba(56, 189, 248, 0.08)"
                strokeWidth="1"
              />
            ))}

            {/* Curve 1: Spark kV (Scale 20 to 36 kV -> Y 220 to 20) */}
            {(selectedChannel === 'all' || selectedChannel === 'spark') && (
              <polyline
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2"
                points={historyData
                  .map((d, i) => {
                    const x = (i / (historyData.length - 1)) * 1000;
                    const norm = (d.sparkKv - 20) / 16;
                    const y = 220 - norm * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Curve 2: CHT Avg (Scale 140 to 230 C -> Y 220 to 20) */}
            {(selectedChannel === 'all' || selectedChannel === 'cht') && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 2"
                points={historyData
                  .map((d, i) => {
                    const x = (i / (historyData.length - 1)) * 1000;
                    const norm = (d.chtAvg - 140) / 90;
                    const y = 220 - norm * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Curve 3: RPM (Scale 2000 to 2600 -> Y 220 to 20) */}
            {(selectedChannel === 'all' || selectedChannel === 'rpm') && (
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1.8"
                points={historyData
                  .map((d, i) => {
                    const x = (i / (historyData.length - 1)) * 1000;
                    const norm = (d.rpm - 2000) / 600;
                    const y = 220 - norm * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Curve 4: Misfire Rate (Scale 0 to 40% -> Y 220 to 20) */}
            {(selectedChannel === 'all' || selectedChannel === 'egt') && (
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.8"
                points={historyData
                  .map((d, i) => {
                    const x = (i / (historyData.length - 1)) * 1000;
                    const norm = d.misfireRate / 40;
                    const y = 220 - norm * 180;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}
          </svg>

          {/* Interactive Scrub Line & Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute top-2 right-4 bg-[#0d1117]/95 border border-[#00f0ff] p-2 text-[10px] space-y-0.5 pointer-events-none shadow-lg"
            >
              <div className="font-bold text-[#00f0ff] border-b border-[#38bdf8]/30 pb-0.5">
                TIMESTAMP: {hoveredPoint.timeStr}
              </div>
              <div className="text-[#dfe2eb]">
                SPARK VOLTAGE: <span className="font-bold text-[#00f0ff]">{hoveredPoint.sparkKv} kV</span>
              </div>
              <div className="text-[#dfe2eb]">
                CHT AVG: <span className="font-bold text-[#38bdf8]">{hoveredPoint.chtAvg} °C</span>
              </div>
              <div className="text-[#dfe2eb]">
                ENGINE RPM: <span className="font-bold text-[#10b981]">{hoveredPoint.rpm}</span>
              </div>
              <div className="text-[#dfe2eb]">
                MISFIRE RATE: <span className="font-bold text-[#ef4444]">{hoveredPoint.misfireRate} %</span>
              </div>
            </div>
          )}

          {/* Hover overlay tracks */}
          <div
            className="absolute inset-0 cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const idx = Math.floor(ratio * (historyData.length - 1));
              setHoveredPoint(historyData[idx]);
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        </div>

        {/* Legend & Channel Statistics */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] pt-3 border-t border-[#38bdf8]/15">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#00f0ff]" />
            <span className="text-[#64748b]">MAGNETO SPARK:</span>
            <span className="font-bold text-[#00f0ff]">32.4 kV AVG</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#38bdf8]" />
            <span className="text-[#64748b]">CHT AVERAGE:</span>
            <span className="font-bold text-[#38bdf8]">168 °C</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#10b981]" />
            <span className="text-[#64748b]">PROP SPEED:</span>
            <span className="font-bold text-[#10b981]">2,420 RPM</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#ef4444]" />
            <span className="text-[#64748b]">MISFIRE PROB:</span>
            <span className={`font-bold ${isFaultActive ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
              {isFaultActive ? '31% (EXCEEDED)' : '6% (SAFE)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
