import React, { useEffect, useState } from 'react';
import { AlertTriangle, UserCheck, Wifi, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { NotificationSettings } from '../types';
import { hudAudio } from '../utils/audio';

interface AvionicsHeaderProps {
  isFaultActive: boolean;
  activeFaultName?: string;
  onTriggerFault: (faultName?: string) => void;
  onClearFault: () => void;
  notifications: NotificationSettings;
  alertCount: number;
  connectionStatus?: 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
}

export const AvionicsHeader: React.FC<AvionicsHeaderProps> = ({
  isFaultActive,
  onTriggerFault,
  onClearFault,
  notifications,
  alertCount,
  connectionStatus = 'CONNECTED',
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-10 bg-[#0d1117] border-b border-[#38bdf8]/15 px-4 flex items-center justify-between text-xs font-mono select-none shrink-0 z-30">
      {/* Left zone: Aircraft Telemetry Identifiers */}
      <div className="flex items-center gap-4 text-[#94a3b8] overflow-x-auto py-1">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[#64748b]">UAV:</span>
          <span className="text-[#f1f5f9] font-semibold">{notifications.uavId}</span>
        </div>

        <span className="text-[#38bdf8]/30">|</span>

        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[#64748b]">ENG:</span>
          <span className="text-[#f1f5f9] font-semibold">AP-01</span>
        </div>

        <span className="text-[#38bdf8]/30">|</span>

        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[#64748b]">SORTIE:</span>
          <span className="text-[#38bdf8] font-semibold">{notifications.sortieCode}</span>
        </div>

        <span className="text-[#38bdf8]/30">|</span>

        <div className="flex items-center gap-2 text-[#00f0ff] whitespace-nowrap">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus === 'CONNECTED' ? 'bg-[#00f0ff]' : connectionStatus === 'RECONNECTING' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}></span>
          </span>
          <span className="tracking-wider">{connectionStatus === 'CONNECTED' ? 'LIVE' : connectionStatus} {utcTime || '14:32:08 UTC'}</span>
        </div>
      </div>

      {/* Right zone: State Toggles, Alert Badge & Operator */}
      <div className="flex items-center gap-3 shrink-0">
        {/* State Toggle Buttons */}
        <div className="flex items-center border border-[#38bdf8]/20 bg-[#090b10] p-0.5">
          <button
            onClick={() => {
              if (isFaultActive) {
                if (notifications.audioAlarmChime) hudAudio.playSuccessChime();
                onClearFault();
              } else {
                hudAudio.playBlip(1000);
              }
            }}
            className={`px-3 py-1 text-[11px] font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
              !isFaultActive
                ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                : 'text-[#64748b] hover:text-[#dfe2eb]'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            NORMAL STATE
          </button>
          <button
            onClick={() => {
              if (!isFaultActive) {
                if (notifications.audioAlarmChime) hudAudio.playFaultAlarm();
                onTriggerFault('Secondary Coil Breakdown & Phase Flutter');
              } else {
                hudAudio.playBlip(600);
              }
            }}
            className={`px-3 py-1 text-[11px] font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
              isFaultActive
                ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/50 animate-pulse'
                : 'text-[#64748b] hover:text-[#ef4444]'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            FAULT STATE
          </button>
        </div>

        {/* Alerts Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase border transition-colors ${
            alertCount > 0 || isFaultActive
              ? 'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444]'
              : 'border-[#38bdf8]/20 bg-[#090b10] text-[#64748b]'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${isFaultActive ? 'text-[#ef4444] animate-bounce' : 'text-[#64748b]'}`} />
          <span>{alertCount} ALERTS</span>
        </div>

        {/* Satellite Link */}
        <div className="hidden sm:flex items-center gap-1 text-[#00f0ff] text-[11px] px-2 py-0.5 border border-[#00f0ff]/20 bg-[#00f0ff]/5">
          <Wifi className="w-3 h-3" />
          <span>99.8%</span>
        </div>

        {/* Download Prototype ZIP Button */}
        <button
          onClick={async () => {
            hudAudio.playBlip(1100);
            console.log("Project export feature is not available in this prototype.");
            
          }}
          className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-[#00f0ff] text-[#090b10] hover:bg-[#38bdf8] transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,240,255,0.4)]"
          title="Download complete source code as a ZIP archive"
        >
          <span className="text-xs">⬇</span>
          <span>DOWNLOAD ZIP</span>
        </button>

        {/* Operator Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#38bdf8]/20 text-[#dfe2eb]">
          <div className="w-6 h-6 rounded-none bg-[#131924] border border-[#38bdf8]/30 flex items-center justify-center text-[#00f0ff]">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-[11px] font-bold tracking-tight text-[#f1f5f9] leading-none">
              {notifications.operatorCallSign}
            </span>
            <span className="text-[9px] text-[#64748b] tracking-wider uppercase">SYS OPERATOR</span>
          </div>
        </div>
      </div>
    </header>
  );
};
