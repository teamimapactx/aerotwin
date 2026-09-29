import React from 'react';
import { Zap, Activity, Flame, ShieldAlert, Cpu } from 'lucide-react';
import { PowerChainStep } from '../types';

interface FiringPowerChainProps {
  isFaultActive: boolean;
  steps: PowerChainStep[];
}

export const FiringPowerChain: React.FC<FiringPowerChainProps> = ({ isFaultActive }) => {
  return (
    <div className="bg-[#0d1117] border border-[#38bdf8]/15 flex flex-col font-mono h-full justify-between">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#38bdf8]/15 bg-[#131924]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00f0ff]" />
          <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
            FIRING POWER CHAIN
          </h2>
        </div>
        <div className="text-[10px] text-[#00f0ff] uppercase tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
          REAL-TIME PROPAGATION
        </div>
      </div>

      {/* 4 sequential step cards with connectors */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-around">
        {/* Step 1: Magneto Generator */}
        <div className="flex items-start justify-between group">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 border mt-0.5 ${isFaultActive ? 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]' : 'border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]'}`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#f1f5f9] tracking-wider uppercase">
                1. MAGNETO GENERATOR
              </div>
              <div className="text-[11px] text-[#64748b]">
                Permanent NdFeB Rotor Induction
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold tracking-tight ${isFaultActive ? 'text-[#ef4444]' : 'text-[#00f0ff]'}`}>
              {isFaultActive ? '23.8 kV' : '32.4 kV'}
            </div>
            <div className="text-[10px] text-[#64748b] tracking-wider uppercase">
              {isFaultActive ? '360 Hz WARP' : '400 Hz WAVE'}
            </div>
          </div>
        </div>

        {/* Connector Line 1 */}
        <div className="pl-5 flex items-center gap-2 text-[10px] text-[#64748b]">
          <span className={`w-1.5 h-1.5 rounded-full ${isFaultActive ? 'bg-[#ef4444]' : 'bg-[#00f0ff]'}`} />
          <div className="h-4 border-l border-dashed border-[#38bdf8]/30 mr-2 -ml-2.5 my-[-8px]" />
          <span className="uppercase tracking-wider">LOW-IMPEDANCE FEED</span>
        </div>

        {/* Step 2: Ignition Harness */}
        <div className="flex items-start justify-between group">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 border mt-0.5 ${isFaultActive ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]' : 'border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]'}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#f1f5f9] tracking-wider uppercase">
                2. IGNITION HARNESS
              </div>
              <div className="text-[11px] text-[#64748b]">
                Shielded Mil-Spec High-Tension Leads
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold tracking-tight ${isFaultActive ? 'text-[#f59e0b]' : 'text-[#dfe2eb]'}`}>
              {isFaultActive ? '0.48 Ω Loss' : '0.02 Ω Loss'}
            </div>
            <div className="text-[10px] text-[#64748b] tracking-wider uppercase">
              {isFaultActive ? 'EMI LEAKAGE' : 'EMI SUPPRESSED'}
            </div>
          </div>
        </div>

        {/* Connector Line 2 */}
        <div className="pl-5 flex items-center gap-2 text-[10px] text-[#64748b]">
          <span className={`w-1.5 h-1.5 rounded-full ${isFaultActive ? 'bg-[#f59e0b]' : 'bg-[#00f0ff]'}`} />
          <span className="uppercase tracking-wider">
            {isFaultActive ? 'BREAKDOWN DELAY 34ms (ERR)' : 'BREAKDOWN DELAY 12ms'}
          </span>
        </div>

        {/* Step 3: High-Energy Spark */}
        <div className="flex items-start justify-between group">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 border mt-0.5 ${isFaultActive ? 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]' : 'border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]'}`}>
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#f1f5f9] tracking-wider uppercase">
                3. HIGH-ENERGY SPARK
              </div>
              <div className="text-[11px] text-[#64748b]">
                Gap Ionization & Thermal Kernels
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold tracking-tight ${isFaultActive ? 'text-[#ef4444]' : 'text-[#00f0ff]'}`}>
              {isFaultActive ? '44 mJ' : '78 mJ'}
            </div>
            <div className={`text-[10px] tracking-wider uppercase ${isFaultActive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {isFaultActive ? 'DISCHARGE WEAK' : 'DISCHARGE NOMINAL'}
            </div>
          </div>
        </div>

        {/* Connector Line 3 */}
        <div className="pl-5 flex items-center gap-2 text-[10px] text-[#64748b]">
          <span className={`w-1.5 h-1.5 rounded-full ${isFaultActive ? 'bg-[#ef4444]' : 'bg-[#00f0ff]'}`} />
          <span className="uppercase tracking-wider">
            {isFaultActive ? 'FLAME PROPAGATION 14 m/s (QUENCH)' : 'FLAME PROPAGATION 24 m/s'}
          </span>
        </div>

        {/* Step 4: Optimal Combustion */}
        <div className="flex items-start justify-between group">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 border mt-0.5 ${isFaultActive ? 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]' : 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'}`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#f1f5f9] tracking-wider uppercase">
                4. OPTIMAL COMBUSTION
              </div>
              <div className="text-[11px] text-[#64748b]">
                Stoichiometric Peak Pressure Index
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold tracking-tight ${isFaultActive ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
              {isFaultActive ? 'λ 0.88' : 'λ 1.02'}
            </div>
            <div className={`text-[10px] tracking-wider uppercase ${isFaultActive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {isFaultActive ? 'EFFICIENCY 78.2%' : 'EFFICIENCY 98.4%'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Cycle Duration */}
      <div className="px-4 py-2 border-t border-[#38bdf8]/15 bg-[#090b10] text-[10px] text-[#64748b] flex items-center justify-between">
        <span className="uppercase tracking-wider">
          CYCLE DURATION: <span className="text-[#dfe2eb] font-bold">24.8 ms</span>
        </span>
        <span className="text-[#00f0ff] uppercase tracking-wider font-semibold">
          SYNCHRONIZED WITH FADEC
        </span>
      </div>
    </div>
  );
};
