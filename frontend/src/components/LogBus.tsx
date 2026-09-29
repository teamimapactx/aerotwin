import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Pause, Play, Trash2, Copy, Check, Filter } from 'lucide-react';
import { LogEntry } from '../types';
import { hudAudio } from '../utils/audio';

interface LogBusProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
}

export const LogBus: React.FC<LogBusProps> = ({
  logs,
  onClearLogs,
  isStreaming,
  onToggleStreaming,
}) => {
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [copied, setCopied] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of log stream if enabled
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (filterChannel === 'ALL') return true;
    return log.channel === filterChannel;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `${l.timestamp} [${l.channel}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    hudAudio.playBlip(1200);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: LogEntry['level'], channel: LogEntry['channel']) => {
    if (level === 'error' || channel === 'FAULT') return 'text-[#ef4444]';
    if (level === 'warn') return 'text-[#f59e0b]';
    if (level === 'success') return 'text-[#10b981]';
    if (channel === 'P-LEAD') return 'text-[#38bdf8]';
    if (channel === 'COIL-01') return 'text-[#00f0ff]';
    if (channel === 'SYNCHRO') return 'text-[#aee0ff]';
    return 'text-[#dfe2eb]';
  };

  return (
    <div className="bg-[#0d1117] border border-[#38bdf8]/15 flex flex-col font-mono">
      {/* Header Bar */}
      <div className="px-4 py-2 border-b border-[#38bdf8]/15 bg-[#131924]/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00f0ff]" />
          <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
            MAGNETO & IGNITION HARNESS LOG BUS
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Channel Filter Selector */}
          <div className="flex items-center gap-1 text-[10px]">
            <Filter className="w-3 h-3 text-[#64748b]" />
            <select
              value={filterChannel}
              onChange={(e) => {
                hudAudio.playBlip(900);
                setFilterChannel(e.target.value);
              }}
              className="bg-[#090b10] border border-[#38bdf8]/20 text-[#dfe2eb] px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-[#00f0ff]"
            >
              <option value="ALL">ALL CHANNELS</option>
              <option value="P-LEAD">P-LEAD</option>
              <option value="COIL-01">COIL-01</option>
              <option value="SYNCHRO">SYNCHRO</option>
              <option value="FAULT">FAULT</option>
              <option value="FADEC">FADEC</option>
              <option value="SYS">SYS</option>
            </select>
          </div>

          {/* Stream Pause/Resume */}
          <button
            onClick={onToggleStreaming}
            className={`p-1 border text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors ${
              isStreaming
                ? 'border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10'
                : 'border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/10'
            }`}
            title={isStreaming ? 'Pause stream' : 'Resume stream'}
          >
            {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            className="p-1 border border-[#38bdf8]/30 hover:border-[#00f0ff] text-[#dfe2eb] hover:text-[#00f0ff] transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
          </button>

          {/* Clear Logs */}
          <button
            onClick={() => {
              hudAudio.playBlip(700);
              onClearLogs();
            }}
            className="p-1 border border-[#38bdf8]/30 hover:border-[#ef4444] text-[#dfe2eb] hover:text-[#ef4444] transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {/* Stream Active Indicator */}
          <div className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-semibold text-[#dfe2eb]">
            <span
              className={`w-2 h-2 rounded-full ${
                isStreaming ? 'bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-[#64748b]'
              }`}
            />
            <span className={isStreaming ? 'text-[#10b981]' : 'text-[#64748b]'}>
              {isStreaming ? 'STREAM ACTIVE' : 'STREAM PAUSED'}
            </span>
          </div>
        </div>
      </div>

      {/* Log Console Output Area */}
      <div
        ref={logContainerRef}
        className="p-3.5 bg-[#090b10] max-h-48 min-h-[105px] overflow-y-auto space-y-1.5 font-mono text-[11px] leading-relaxed border-t border-[#38bdf8]/10"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-[#64748b] italic py-2 text-center">
            No telemetry log packets recorded for channel: {filterChannel}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2.5 transition-colors hover:bg-[#131924]/60 px-1 py-0.5 rounded-none ${
                log.level === 'error' ? 'bg-[#ef4444]/10 border-l-2 border-[#ef4444]' : ''
              }`}
            >
              {/* Timestamp */}
              <span className="text-[#64748b] select-none shrink-0 tabular-nums">
                {log.timestamp}
              </span>

              {/* Channel badge */}
              <span
                className={`shrink-0 font-bold ${
                  log.channel === 'FAULT'
                    ? 'text-[#ef4444]'
                    : log.channel === 'P-LEAD'
                    ? 'text-[#38bdf8]'
                    : log.channel === 'COIL-01'
                    ? 'text-[#00f0ff]'
                    : 'text-[#94a3b8]'
                }`}
              >
                [{log.channel}]
              </span>

              {/* Message */}
              <span className={`flex-1 break-words ${getLevelColor(log.level, log.channel)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
