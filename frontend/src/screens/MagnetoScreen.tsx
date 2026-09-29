import React, { useState } from 'react';
import { Activity, ShieldCheck, ShieldAlert, Cpu, GitFork, RefreshCw, Zap } from 'lucide-react';
import { DigitalTwin3D } from '../components/DigitalTwin3D';
import { FiringPowerChain } from '../components/FiringPowerChain';
import { MagnetoAnalysis } from '../components/MagnetoAnalysis';
import { IgnitionSystemAnalysis } from '../components/IgnitionSystemAnalysis';
import { WhatIfSandbox } from '../components/WhatIfSandbox';
import { LogBus } from '../components/LogBus';
import { CylinderGap, LogEntry, PowerChainStep, SimulationParams } from '../types';
import { hudAudio } from '../utils/audio';

interface MagnetoScreenProps {
  simulationParams: SimulationParams;
  onUpdateParams: (params: Partial<SimulationParams>) => void;
  isFaultActive: boolean;
  onTriggerFault: (faultName?: string) => void;
  onClearFault: () => void;
  powerChain: PowerChainStep[];
  cylinderGaps: CylinderGap[];
  logs: LogEntry[];
  onClearLogs: () => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
}

export const MagnetoScreen: React.FC<MagnetoScreenProps> = ({
  simulationParams,
  onUpdateParams,
  isFaultActive,
  onTriggerFault,
  onClearFault,
  powerChain,
  cylinderGaps,
  logs,
  onClearLogs,
  isStreaming,
  onToggleStreaming,
}) => {
  const [schematicMode, setSchematicMode] = useState<boolean>(false);
  const [isolationMode, setIsolationMode] = useState<boolean>(false);

  // Overall subsystem health
  const subsystemHealth = isFaultActive ? 68 : 92;
  const statusLabel = isFaultActive ? 'CRITICAL ANOMALY' : 'NOMINAL';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-tactical-grid bg-[#090b10] text-[#dfe2eb] select-none font-mono">
      {/* Subsystem Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#38bdf8]/15">
        <div>
          {/* Breadcrumb line */}
          <div className="flex items-center gap-2 text-[10px] text-[#64748b] tracking-wider uppercase">
            <span>AEROTWIN</span>
            <span>//</span>
            <span>TELEMETRY NODE</span>
            <span>//</span>
            <span className="text-[#38bdf8]">ENG-AP01</span>
            <span>//</span>
            <div className="flex items-center gap-1 text-[#00f0ff]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
              <span>CHANNEL-04 [IGNITION]</span>
            </div>
          </div>

          {/* Large Main Subsystem Title */}
          <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[#f1f5f9] mt-0.5">
            MAGNETO &amp; IGNITION SUBSYSTEM HEALTH
          </h1>
        </div>

        {/* Right Status Badges & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Subsystem Verdict */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border border-[#38bdf8]/20">
            <span
              className={`w-2 h-2 rounded-full ${
                isFaultActive ? 'bg-[#ef4444] animate-ping' : 'bg-[#00f0ff]'
              }`}
            />
            <div className="text-[11px] uppercase tracking-wider">
              <span className="text-[#64748b] mr-1.5">SUBSYSTEM VERDICT</span>
              <span className="text-[#dfe2eb] font-bold">SYSTEM HEALTH:</span>{' '}
              <span className={isFaultActive ? 'text-[#ef4444] font-bold' : 'text-[#00f0ff] font-bold'}>
                {subsystemHealth}%
              </span>{' '}
              <span className="text-[#64748b]">●</span>{' '}
              <span
                className={`font-semibold ${
                  isFaultActive ? 'text-[#ef4444]' : 'text-[#10b981]'
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Schematic Mode Toggle */}
          <button
            onClick={() => {
              hudAudio.playBlip(950);
              setSchematicMode(!schematicMode);
            }}
            className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase border transition-colors flex items-center gap-1.5 ${
              schematicMode
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]'
                : 'bg-[#131924] text-[#dfe2eb] border-[#38bdf8]/30 hover:border-[#00f0ff]'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            SCHEMATIC MODE
          </button>

          {/* Firing Order Badge */}
          <div className="px-3 py-1.5 bg-[#131924] border border-[#38bdf8]/20 text-[11px] text-[#dfe2eb] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span className="text-[#64748b] uppercase">FIRING:</span>
            <span className="text-[#dfe2eb] font-bold tracking-wider">1-3-4-2</span>
            <span className="text-[#00f0ff] font-bold tabular-nums">
              {simulationParams.rpm.toLocaleString()} RPM
            </span>
          </div>
        </div>
      </div>

      {/* Schematic Diagram View if enabled */}
      {schematicMode && (
        <div className="p-4 bg-[#0d1117] border border-[#00f0ff]/40 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#00f0ff] uppercase tracking-wider">
              CIRCUIT SCHEMATIC // MAGNETO DUAL-COIL &amp; P-LEAD ISOLATION TOPOLOGY
            </span>
            <span className="text-[10px] text-[#64748b]">MIL-STD-1553 COMPLIANT BUS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px]">
            <div className="p-2.5 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[#64748b] uppercase text-[9px]">P-Lead Ignition Switch</div>
              <div className="font-bold text-[#10b981] mt-1">OPEN (RUNNING)</div>
              <div className="text-[10px] text-[#64748b] mt-1">Isolated from ground. Key switch in BOTH position.</div>
            </div>
            <div className="p-2.5 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[#64748b] uppercase text-[9px]">Cam &amp; Breaker Points</div>
              <div className="font-bold text-[#00f0ff] mt-1">GAP 0.016 in (CALIBRATED)</div>
              <div className="text-[10px] text-[#64748b] mt-1">E-gap 10° past neutral flux transition.</div>
            </div>
            <div className="p-2.5 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[#64748b] uppercase text-[9px]">Condenser / Capacitor</div>
              <div className="font-bold text-[#dfe2eb] mt-1">0.36 µF NOMINAL</div>
              <div className="text-[10px] text-[#64748b] mt-1">Arc quenching across points verified nominal.</div>
            </div>
            <div className="p-2.5 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="text-[#64748b] uppercase text-[9px]">Distributor Rotor &amp; Block</div>
              <div className="font-bold text-[#00f0ff] mt-1">4-POINT RADIAL FIRING</div>
              <div className="text-[10px] text-[#64748b] mt-1">1-3-4-2 rotor sequence to shielded harnesses.</div>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: 3D Spatial Digital Twin & Firing Power Chain */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 3D Spatial Digital Twin (7 cols on lg) */}
        <div className="lg:col-span-7">
          <DigitalTwin3D
            isFaultActive={isFaultActive}
            magTemp={simulationParams.magTemp}
            rpm={simulationParams.rpm}
            isolationMode={isolationMode}
            onToggleIsolation={() => {
              hudAudio.playBlip(1000);
              setIsolationMode(!isolationMode);
            }}
          />
        </div>

        {/* Right: Firing Power Chain (5 cols on lg) */}
        <div className="lg:col-span-5">
          <FiringPowerChain isFaultActive={isFaultActive} steps={powerChain} />
        </div>
      </div>

      {/* Row 2: Magneto Analysis & Ignition System Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MagnetoAnalysis simulationParams={simulationParams} isFaultActive={isFaultActive} />
        <IgnitionSystemAnalysis
          simulationParams={simulationParams}
          cylinderGaps={cylinderGaps}
          isFaultActive={isFaultActive}
        />
      </div>

      {/* Row 3: Magneto Performance Anomaly Simulation (What-If Sandbox) */}
      <div id="whatif-section">
        <WhatIfSandbox
          simulationParams={simulationParams}
          onUpdateParams={onUpdateParams}
          isFaultActive={isFaultActive}
          onTriggerFault={onTriggerFault}
          onClearFault={onClearFault}
          onIsolate3D={() => {
            setIsolationMode(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>

      {/* Row 4: Magneto & Ignition Harness Log Bus */}
      <LogBus
        logs={logs}
        onClearLogs={onClearLogs}
        isStreaming={isStreaming}
        onToggleStreaming={onToggleStreaming}
      />
    </div>
  );
};
