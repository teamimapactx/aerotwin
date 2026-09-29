import React, { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  Radio,
  Zap,
  Droplet,
  Fuel,
  Fan,
  Cog,
  BrainCircuit,
  Sliders,
  Wrench,
  FileText,
  History,
  ChevronDown,
  ChevronRight,
  Wifi,
  Settings as SettingsIcon,
} from 'lucide-react';
import { NavigationScreen } from '../types';
import { hudAudio } from '../utils/audio';

interface NavigationRailProps {
  currentScreen: NavigationScreen;
  onSelectScreen: (screen: NavigationScreen) => void;
  subsystem?: string;
  onSelectSubsystem?: (subsystem: string) => void;
  isFaultActive?: boolean;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentScreen,
  onSelectScreen,
  subsystem = 'magneto',
  onSelectSubsystem,
  isFaultActive,
}) => {
  const [subsystemsOpen, setSubsystemsOpen] = useState(true);

  const handleNav = (screen: NavigationScreen) => {
    hudAudio.playBlip(750);
    onSelectScreen(screen);
  };

  const handleSubsystemClick = (id: string) => {
    hudAudio.playBlip(820);
    if (onSelectSubsystem) {
      onSelectSubsystem(id);
    }
    // Route each subsystem to its dedicated screen
    const screenMap: Record<string, NavigationScreen> = {
      magneto: 'magneto',
      lubrication: 'lubrication',
      fuel: 'fuel',
      cooling: 'cooling',
      mechanical: 'mechanical',
    };
    onSelectScreen(screenMap[id] || 'dashboard');
  };

  return (
    <aside className="w-64 bg-[#090b10] border-r border-[#38bdf8]/15 flex flex-col justify-between select-none shrink-0 font-mono text-xs">
      {/* Top Brand Section */}
      <div>
        <div className="p-4 border-b border-[#38bdf8]/15 bg-[#0d1117]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border border-[#00f0ff] flex items-center justify-center bg-[#00f0ff]/10 text-[#00f0ff]">
                <Zap className="w-3.5 h-3.5 fill-[#00f0ff]/40" />
              </div>
              <span className="font-heading font-bold text-sm tracking-widest text-[#f1f5f9]">
                AEROTWIN
              </span>
            </div>
            <span className="text-[10px] text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/30 px-1 py-0.5 font-bold">
              v4.2
            </span>
          </div>
          <div className="mt-1 text-[10px] tracking-wider text-[#64748b] uppercase">
            MALE UAV PISTON DT
          </div>
        </div>

        {/* Main Navigation List */}
        <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-170px)]">
          {/* Overview */}
          <button
            onClick={() => handleNav('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors ${
              currentScreen === 'dashboard'
                ? 'bg-[#182234] text-[#00f0ff] border-l-2 border-[#00f0ff]'
                : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">OVERVIEW</span>
          </button>

          {/* Digital Twin */}
          <button
            onClick={() => handleNav('magneto')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors ${
              currentScreen === 'magneto'
                ? 'bg-[#182234] text-[#00f0ff] border-l-2 border-[#00f0ff]'
                : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
            }`}
          >
            <Box className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">DIGITAL TWIN</span>
          </button>

          {/* Live Telemetry */}
          <button
            onClick={() => handleNav('dashboard')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924] transition-colors"
          >
            <Radio className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">LIVE TELEMETRY</span>
          </button>

          {/* Subsystems Dropdown Header */}
          <div className="pt-2 pb-1">
            <button
              onClick={() => setSubsystemsOpen(!subsystemsOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-[#64748b] tracking-wider uppercase hover:text-[#94a3b8]"
            >
              <span>SUBSYSTEMS</span>
              {subsystemsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {subsystemsOpen && (
              <div className="pl-2 space-y-0.5 mt-1 border-l border-[#38bdf8]/10 ml-3">
                {/* Magneto & Ignition Subsystem */}
                <button
                  onClick={() => handleSubsystemClick('magneto')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                    currentScreen === 'magneto' && subsystem === 'magneto'
                      ? 'bg-[#00f0ff]/10 text-[#00f0ff] font-semibold border-l-2 border-[#00f0ff]'
                      : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Zap className={`w-3.5 h-3.5 ${isFaultActive ? 'text-[#ef4444]' : 'text-[#00f0ff]'}`} />
                    <span className="truncate">Magneto & Ignition</span>
                  </div>
                  {isFaultActive && (
                    <span className="w-1.5 h-1.5 bg-[#ef4444] rounded-full animate-ping shrink-0" />
                  )}
                </button>

                {/* Lubrication */}
                <button
                  onClick={() => handleSubsystemClick('lubrication')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                    currentScreen === 'lubrication'
                      ? 'bg-[#00f0ff]/10 text-[#00f0ff] font-semibold border-l-2 border-[#00f0ff]'
                      : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
                  }`}
                >
                  <Droplet className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Lubrication</span>
                </button>

                {/* Fuel System */}
                <button
                  onClick={() => handleSubsystemClick('fuel')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                    currentScreen === 'fuel'
                      ? 'bg-[#00f0ff]/10 text-[#00f0ff] font-semibold border-l-2 border-[#00f0ff]'
                      : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
                  }`}
                >
                  <Fuel className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Fuel System</span>
                </button>

                {/* Cooling System */}
                <button
                  onClick={() => handleSubsystemClick('cooling')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                    currentScreen === 'cooling'
                      ? 'bg-[#00f0ff]/10 text-[#00f0ff] font-semibold border-l-2 border-[#00f0ff]'
                      : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
                  }`}
                >
                  <Fan className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Cooling System</span>
                </button>

                {/* Mechanical Assembly */}
                <button
                  onClick={() => handleSubsystemClick('mechanical')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                    currentScreen === 'mechanical'
                      ? 'bg-[#00f0ff]/10 text-[#00f0ff] font-semibold border-l-2 border-[#00f0ff]'
                      : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
                  }`}
                >
                  <Cog className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Mechanical Assembly</span>
                </button>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-[#38bdf8]/10" />

          {/* AI Fault Prediction */}
          <button
            onClick={() => handleNav('magneto')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924] transition-colors"
          >
            <BrainCircuit className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">AI FAULT PREDICTION</span>
          </button>

          {/* What-If Simulation */}
          <button
            onClick={() => handleNav('magneto')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors ${
              currentScreen === 'magneto'
                ? 'text-[#00f0ff]'
                : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">WHAT-IF SIMULATION</span>
          </button>

          {/* Settings / Thresholds */}
          <button
            onClick={() => handleNav('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors ${
              currentScreen === 'settings'
                ? 'bg-[#182234] text-[#00f0ff] border-l-2 border-[#00f0ff]'
                : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
            }`}
          >
            <SettingsIcon className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">SETTINGS & THRESHOLDS</span>
          </button>

          {/* Diagnostic Reports / PDF */}
          <button
            onClick={() => handleNav('reports')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors ${
              currentScreen === 'reports'
                ? 'bg-[#182234] text-[#00f0ff] border-l-2 border-[#00f0ff]'
                : 'text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924]'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">DIAGNOSTIC REPORTS</span>
          </button>

          {/* Mission History */}
          <button
            onClick={() => handleNav('reports')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-medium text-[#94a3b8] hover:text-[#dfe2eb] hover:bg-[#131924] transition-colors"
          >
            <History className="w-4 h-4 shrink-0 text-[#38bdf8]" />
            <span className="tracking-wider uppercase text-[11px]">MISSION HISTORY</span>
          </button>
        </nav>
      </div>

      {/* Bottom Link Quality */}
      <div className="p-3 border-t border-[#38bdf8]/15 bg-[#0d1117] flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">LINK QUALITY</div>
          <div className="text-xs font-bold text-[#00f0ff] tracking-wider">99.8% MIL-SAT</div>
        </div>
        <div className="w-7 h-7 bg-[#131924] border border-[#38bdf8]/30 flex items-center justify-center text-[#00f0ff]">
          <Wifi className="w-4 h-4" />
        </div>
      </div>
    </aside>
  );
};
