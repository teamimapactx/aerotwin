import React from 'react';
import { Zap, CheckCircle2, Shield, Clock, AlertTriangle } from 'lucide-react';
import { CylinderGap, SimulationParams } from '../types';

interface IgnitionSystemAnalysisProps {
  simulationParams: SimulationParams;
  cylinderGaps: CylinderGap[];
  isFaultActive: boolean;
}

export const IgnitionSystemAnalysis: React.FC<IgnitionSystemAnalysisProps> = ({
  simulationParams,
  cylinderGaps,
  isFaultActive,
}) => {
  const stability = isFaultActive ? 72 : simulationParams.ignitionStability;
  const misfire = isFaultActive ? 31 : simulationParams.misfireProb;
  const consistency = isFaultActive ? 81 : 96;
  const timingStatus = isFaultActive ? 'UNSTABLE' : 'NORMAL';
  const timingValue = isFaultActive ? '31.4° BTDC (DRIFT)' : '28° BTDC ±0.5°';

  return (
    <div className="bg-[#0d1117] border border-[#38bdf8]/15 flex flex-col font-mono justify-between">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#38bdf8]/15 bg-[#131924]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border border-[#00f0ff] flex items-center justify-center text-[#00f0ff]">
            <Zap className="w-3 h-3" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
              IGNITION SYSTEM ANALYSIS
            </h2>
            <div className="text-[10px] text-[#64748b]">
              HARNESS INTEGRITY & COMBUSTION KERNEL
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-lg font-bold tracking-tight ${
              isFaultActive ? 'text-[#ef4444]' : 'text-[#00f0ff]'
            }`}
          >
            {isFaultActive ? '72%' : '92%'}
          </span>
          <span className="text-[10px] text-[#64748b] uppercase">HEALTH</span>
        </div>
      </div>

      {/* Row 1 Metrics: Stability, Consistency, Misfire, Timing */}
      <div className="grid grid-cols-4 border-b border-[#38bdf8]/15 bg-[#090b10]">
        {/* Stability */}
        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">STABILITY</div>
          <div className={`text-sm font-bold mt-0.5 ${stability < 80 ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
            {stability}%
          </div>
          <div className={`text-[10px] uppercase font-semibold ${stability < 80 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
            {stability < 80 ? 'HIGH VIB' : 'Nominal'}
          </div>
        </div>

        {/* Consistency */}
        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">CONSISTENCY</div>
          <div className={`text-sm font-bold mt-0.5 ${consistency < 85 ? 'text-[#f59e0b]' : 'text-[#dfe2eb]'}`}>
            {consistency}%
          </div>
          <div className={`text-[10px] uppercase font-semibold ${consistency < 85 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
            {consistency < 85 ? 'Jittering' : 'Synchronous'}
          </div>
        </div>

        {/* Misfire Prob */}
        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">MISFIRE PROB.</div>
          <div className={`text-sm font-bold mt-0.5 ${misfire > 10 ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
            {misfire}%
          </div>
          <div className={`text-[10px] uppercase font-semibold ${misfire > 10 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
            {misfire > 10 ? 'EXCEEDED' : 'Under 10% Safe'}
          </div>
        </div>

        {/* Timing Status */}
        <div className="p-3">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">TIMING STATUS</div>
          <div className={`text-xs font-bold mt-0.5 ${isFaultActive ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
            {timingStatus}
          </div>
          <div className="text-[10px] text-[#64748b] truncate">{timingValue}</div>
        </div>
      </div>

      {/* Cylinder 1-4 Spark Plug Gap Erosion Section */}
      <div className="p-3.5 bg-[#0d1117] border-b border-[#38bdf8]/15 flex-1 flex flex-col justify-around">
        <div className="flex items-center justify-between text-[10px] mb-2">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#f1f5f9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
            CYLINDER 1-4 SPARK PLUG GAP EROSION
          </div>
          <div className="text-[#64748b] uppercase">FACTORY CLEARANCE: 0.50 mm</div>
        </div>

        {/* 4 Cylinder Gap Columns */}
        <div className="grid grid-cols-4 gap-2">
          {cylinderGaps.map((cyl) => {
            const gap = isFaultActive && cyl.cylinder === 2 ? 0.69 : cyl.gapMm;
            const erosion = isFaultActive && cyl.cylinder === 2 ? 38 : cyl.erosionPct;
            const isCritical = gap > 0.65;

            return (
              <div
                key={cyl.cylinder}
                className={`p-2.5 border transition-all ${
                  isCritical
                    ? 'border-[#ef4444]/60 bg-[#ef4444]/10'
                    : 'border-[#38bdf8]/20 bg-[#090b10]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#64748b]">
                  <span className="font-bold text-[#dfe2eb]">CYL #0{cyl.cylinder}</span>
                  <span className="text-[9px] uppercase">{cyl.location}</span>
                </div>

                <div className="flex items-baseline gap-1 my-1">
                  <span
                    className={`text-lg font-bold tracking-tight tabular-nums ${
                      isCritical ? 'text-[#ef4444]' : 'text-[#dfe2eb]'
                    }`}
                  >
                    {gap.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#64748b]">mm</span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className={`${isCritical ? 'text-[#ef4444] font-bold' : 'text-[#38bdf8]'}`}>
                    Erosion {erosion}%
                  </span>
                  {isCritical ? (
                    <AlertTriangle className="w-3 h-3 text-[#ef4444]" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Limit threshold & Est. remaining life */}
        <div className="flex items-center justify-between text-[10px] text-[#64748b] mt-3 pt-2 border-t border-[#38bdf8]/10">
          <div>LIMIT THRESHOLD: <span className="text-[#dfe2eb] font-semibold">0.70 MM</span></div>
          <div className="text-[#00f0ff] font-semibold uppercase tracking-wider">
            EST. REMAINING LIFE: {isFaultActive ? '45 FLIGHT HRS' : '340 FLIGHT HRS'}
          </div>
        </div>
      </div>

      {/* Bottom Row: Shielding Resistance & Dwell Time Arc */}
      <div className="grid grid-cols-2 p-3 bg-[#090b10] border-t border-[#38bdf8]/15">
        <div className="flex items-center justify-between pr-4 border-r border-[#38bdf8]/15">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#64748b]">SHIELDING RESISTANCE</div>
            <div className="text-sm font-bold text-[#dfe2eb] mt-0.5">&gt; 100 MΩ</div>
          </div>
          <Shield className="w-4 h-4 text-[#00f0ff]" />
        </div>

        <div className="flex items-center justify-between pl-4">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#64748b]">DWELL TIME ARC</div>
            <div className={`text-sm font-bold mt-0.5 ${isFaultActive ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
              {isFaultActive ? '1.42 ms (SHORT)' : '2.14 ms'}
            </div>
          </div>
          <Clock className="w-4 h-4 text-[#00f0ff]" />
        </div>
      </div>
    </div>
  );
};
