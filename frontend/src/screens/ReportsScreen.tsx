import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  Shield,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { CylinderGap, LogEntry, NotificationSettings, SimulationParams } from '../types';
import { hudAudio } from '../utils/audio';

interface ReportsScreenProps {
  simulationParams: SimulationParams;
  cylinderGaps: CylinderGap[];
  logs: LogEntry[];
  notifications: NotificationSettings;
  isFaultActive: boolean;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  simulationParams,
  cylinderGaps,
  logs,
  notifications,
  isFaultActive,
}) => {
  const [reportType, setReportType] = useState<'full' | 'ignition_only' | 'faults_only'>('full');
  const [reportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Export to PDF / Print handler
  const handleExportPDF = () => {
    hudAudio.playBlip(1100);
    window.print();
  };

  // Export JSON handler
  const handleExportJSON = () => {
    hudAudio.playBlip(900);
    const data = {
      reportId: `AERO-DT-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      uavId: notifications.uavId,
      sortieCode: notifications.sortieCode,
      operator: notifications.operatorCallSign,
      systemHealth: isFaultActive ? 68 : 92,
      isFaultActive,
      simulationParams,
      cylinderGaps,
      logs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aerotwin_Diagnostic_Report_${notifications.sortieCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV handler
  const handleExportCSV = () => {
    hudAudio.playBlip(900);
    const headers = ['Timestamp', 'Channel', 'Level', 'Message'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.channel}"`,
      `"${l.level}"`,
      `"${l.message.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aerotwin_Event_Logs_${notifications.sortieCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (reportType === 'faults_only') return log.level === 'error' || log.channel === 'FAULT';
    if (reportType === 'ignition_only') return log.channel === 'COIL-01' || log.channel === 'P-LEAD' || log.channel === 'SYNCHRO';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-tactical-grid bg-[#090b10] text-[#dfe2eb] font-mono">
      {/* Top Action Ribbon - Hidden during print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#38bdf8]/15 select-none">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-[#64748b] tracking-wider uppercase">
            <span>AEROTWIN</span>
            <span>//</span>
            <span>DIAGNOSTIC ARCHIVE</span>
            <span>//</span>
            <span className="text-[#38bdf8]">POST-SORTIE REPORTING</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[#f1f5f9] mt-0.5">
            DIAGNOSTIC LOG &amp; POWERPLANT AIRWORTHINESS REPORT
          </h1>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter options */}
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as unknown as typeof reportType)}
            className="bg-[#131924] border border-[#38bdf8]/30 text-[#dfe2eb] px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#00f0ff]"
          >
            <option value="full">FULL POWERPLANT AUDIT</option>
            <option value="ignition_only">MAGNETO &amp; IGNITION LOGS</option>
            <option value="faults_only">ANOMALIES &amp; FAULTS ONLY</option>
          </select>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 text-xs font-semibold tracking-wider uppercase bg-[#131924] border border-[#38bdf8]/30 hover:border-[#00f0ff] text-[#dfe2eb] transition-colors flex items-center gap-1.5"
            title="Download JSON telemetry packet"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold tracking-wider uppercase bg-[#131924] border border-[#38bdf8]/30 hover:border-[#00f0ff] text-[#dfe2eb] transition-colors flex items-center gap-1.5"
            title="Download CSV log rows"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </button>

          {/* Download Entire Project ZIP */}
          <button
            onClick={async () => {
              hudAudio.playBlip(1100);
              console.log("Project export feature is not available in this prototype.");
             
            }}
            className="px-3 py-1.5 text-xs font-bold tracking-wider uppercase bg-[#131924] border border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors flex items-center gap-1.5"
            title="Download complete prototype project as ZIP"
          >
            <Download className="w-3.5 h-3.5" />
            SOURCE ZIP
          </button>

          {/* Export to PDF / Print Button */}
          <button
            onClick={handleExportPDF}
            className="px-4 py-1.5 text-xs font-bold tracking-wider uppercase bg-[#00f0ff] text-[#090b10] hover:bg-[#38bdf8] transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
          >
            <Printer className="w-4 h-4" />
            EXPORT TO PDF (PRINT)
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="print-card bg-[#0d1117] border border-[#38bdf8]/20 p-6 max-w-5xl mx-auto shadow-2xl relative">
        {/* Printable Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-4 border-b-2 border-[#38bdf8]/30 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 px-1.5 py-0.5 font-bold tracking-widest uppercase">
                MIL-STD-178C LEVEL A
              </span>
              <span className="text-xs text-[#64748b]">TELEMETRY ARCHIVE RECORD</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[#f1f5f9] mt-1">
              UAV POWERPLANT SUBSYSTEM DIAGNOSTIC AUDIT
            </h2>
            <div className="text-xs text-[#64748b] mt-0.5">
              PROPULSION TELEMETRY &amp; DIGITAL TWIN HEALTH CERTIFICATION
            </div>
          </div>

          <div className="text-right text-xs space-y-1">
            <div className="text-[#dfe2eb]">
              DOC ID: <span className="font-bold text-[#00f0ff]">AERO-DT-AP01-8492</span>
            </div>
            <div className="text-[#64748b]">
              DATE: <span className="text-[#dfe2eb]">{reportDate}</span>
            </div>
            <div className="text-[#64748b]">
              SORTIE: <span className="text-[#38bdf8] font-bold">{notifications.sortieCode}</span>
            </div>
          </div>
        </div>

        {/* Aircraft & Operator Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-[#38bdf8]/15 text-xs">
          <div>
            <span className="text-[10px] uppercase text-[#64748b] block">AIRCRAFT PLATFORM</span>
            <span className="font-bold text-[#f1f5f9]">{notifications.uavId} MALE UAV</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#64748b] block">POWERPLANT ENGINE</span>
            <span className="font-bold text-[#f1f5f9]">AP-01 Piston DT (4-Cyl)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#64748b] block">SYSTEM OPERATOR</span>
            <span className="font-bold text-[#00f0ff]">{notifications.operatorCallSign}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-[#64748b] block">AIRWORTHINESS STATUS</span>
            <span
              className={`font-bold uppercase tracking-wider ${
                isFaultActive ? 'text-[#ef4444]' : 'text-[#10b981]'
              }`}
            >
              {isFaultActive ? 'RESTRICTED (FAULT DETECTED)' : 'AIRWORTHY / NOMINAL'}
            </span>
          </div>
        </div>

        {/* Section 1: Magneto Subsystem Diagnostic Summary Table */}
        <div className="py-4 border-b border-[#38bdf8]/15">
          <h3 className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            1. MAGNETO &amp; IGNITION SUBSYSTEM AUDIT SPECIFICATIONS
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-[#38bdf8]/20">
              <thead className="bg-[#131924] text-[#64748b] uppercase text-[10px]">
                <tr>
                  <th className="p-2 border-r border-[#38bdf8]/20">Parameter</th>
                  <th className="p-2 border-r border-[#38bdf8]/20">Measured Value</th>
                  <th className="p-2 border-r border-[#38bdf8]/20">Nominal Spec</th>
                  <th className="p-2 border-r border-[#38bdf8]/20">Tolerance Bound</th>
                  <th className="p-2">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38bdf8]/15 bg-[#090b10]">
                <tr>
                  <td className="p-2 font-bold text-[#dfe2eb]">Magneto Peak Discharge</td>
                  <td className="p-2 font-bold text-[#00f0ff]">
                    {isFaultActive ? '23.8 kV' : '32.4 kV'}
                  </td>
                  <td className="p-2 text-[#64748b]">32.0 - 34.0 kV</td>
                  <td className="p-2 text-[#64748b]">&lt; 35.0 kV Limit</td>
                  <td className="p-2">
                    <span className={isFaultActive ? 'text-[#ef4444] font-bold' : 'text-[#10b981] font-bold'}>
                      {isFaultActive ? 'DEGRADED (LOW)' : 'NOMINAL'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-[#dfe2eb]">Primary Coil Resistance</td>
                  <td className="p-2 font-bold text-[#dfe2eb]">
                    {isFaultActive ? '1.23 Ω' : '0.85 Ω'}
                  </td>
                  <td className="p-2 text-[#64748b]">0.85 Ω</td>
                  <td className="p-2 text-[#64748b]">0.80 - 0.90 Ω</td>
                  <td className="p-2">
                    <span className={isFaultActive ? 'text-[#ef4444] font-bold' : 'text-[#10b981] font-bold'}>
                      {isFaultActive ? 'OUT OF SPEC' : 'PASS'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-[#dfe2eb]">Secondary Coil Resistance</td>
                  <td className="p-2 font-bold text-[#dfe2eb]">
                    {isFaultActive ? '7.8 kΩ' : '11.2 kΩ'}
                  </td>
                  <td className="p-2 text-[#64748b]">11.0 kΩ</td>
                  <td className="p-2 text-[#64748b]">10.5 - 12.0 kΩ</td>
                  <td className="p-2">
                    <span className={isFaultActive ? 'text-[#ef4444] font-bold' : 'text-[#10b981] font-bold'}>
                      {isFaultActive ? 'INSULATION LEAK' : 'PASS'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-[#dfe2eb]">P-Lead Ground Circuit</td>
                  <td className="p-2 font-bold text-[#dfe2eb]">
                    {isFaultActive ? 'GROUND SHORT' : 'ISOLATED (OK)'}
                  </td>
                  <td className="p-2 text-[#64748b]">&gt; 10 MΩ Open</td>
                  <td className="p-2 text-[#64748b]">&gt; 1 MΩ Min</td>
                  <td className="p-2">
                    <span className={isFaultActive ? 'text-[#ef4444] font-bold' : 'text-[#10b981] font-bold'}>
                      {isFaultActive ? 'FAIL' : 'PASS'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-[#dfe2eb]">Spark Dwell Arc Time</td>
                  <td className="p-2 font-bold text-[#dfe2eb]">
                    {isFaultActive ? '0.82 ms' : '2.14 ms'}
                  </td>
                  <td className="p-2 text-[#64748b]">1.45 - 2.20 ms</td>
                  <td className="p-2 text-[#64748b]">&gt; 1.20 ms Min</td>
                  <td className="p-2">
                    <span className={isFaultActive ? 'text-[#ef4444] font-bold' : 'text-[#10b981] font-bold'}>
                      {isFaultActive ? 'PREMATURE ARC' : 'PASS'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Cylinder Spark Plug Wear Log */}
        <div className="py-4 border-b border-[#38bdf8]/15">
          <h3 className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            2. CYLINDER 1-4 SPARK PLUG CLEARANCE &amp; LIFE CONSUMPTION
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {cylinderGaps.map((cyl) => {
              const gap = isFaultActive && cyl.cylinder === 2 ? 0.69 : cyl.gapMm;
              const erosion = isFaultActive && cyl.cylinder === 2 ? 38 : cyl.erosionPct;

              return (
                <div key={cyl.cylinder} className="p-2.5 bg-[#090b10] border border-[#38bdf8]/20">
                  <div className="flex justify-between text-[#64748b]">
                    <span className="font-bold text-[#dfe2eb]">CYLINDER #{cyl.cylinder}</span>
                    <span>{cyl.location}</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#f1f5f9]">
                    {gap.toFixed(2)} mm
                  </div>
                  <div className="text-[10px] text-[#64748b] mt-0.5">
                    Erosion: <span className={gap > 0.65 ? 'text-[#ef4444] font-bold' : 'text-[#00f0ff]'}>{erosion}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Chronological Telemetry & Diagnostic Event Logs */}
        <div className="py-4 border-b border-[#38bdf8]/15">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              3. RECORDED TELEMETRY BUS LOGS &amp; ANOMALY TRACES ({filteredLogs.length} ENTRIES)
            </h3>
            <span className="text-[10px] text-[#64748b] uppercase">FILTER: {reportType}</span>
          </div>

          <div className="space-y-1 bg-[#090b10] p-3 border border-[#38bdf8]/20 max-h-60 overflow-y-auto font-mono text-[11px]">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-0.5">
                <span className="text-[#64748b] shrink-0">{log.timestamp}</span>
                <span
                  className={`font-bold shrink-0 ${
                    log.channel === 'FAULT' ? 'text-[#ef4444]' : 'text-[#00f0ff]'
                  }`}
                >
                  [{log.channel}]
                </span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-[#ef4444]'
                      : log.level === 'warn'
                      ? 'text-[#f59e0b]'
                      : 'text-[#dfe2eb]'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Military Compliance Sign-off Block */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="border border-[#38bdf8]/20 p-3 bg-[#090b10] flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-[#64748b] uppercase">FLIGHT SYSTEMS OPERATOR</div>
              <div className="text-sm font-bold text-[#f1f5f9] mt-1">{notifications.operatorCallSign}</div>
              <div className="text-[10px] text-[#64748b]">Tactical Drone Command · Sys Spec 4</div>
            </div>
            <div className="mt-4 pt-2 border-t border-[#38bdf8]/20 flex items-center justify-between text-[10px] text-[#64748b]">
              <span>DIGITALLY SIGNED</span>
              <span className="text-[#00f0ff] font-mono">0x4F9B...88A1</span>
            </div>
          </div>

          <div className="border border-[#38bdf8]/20 p-3 bg-[#090b10] flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-[#64748b] uppercase">MAINTENANCE &amp; AIRWORTHINESS VERIFICATION</div>
              <div className="text-sm font-bold text-[#f1f5f9] mt-1">CHIEF PROPULSION INSPECTOR</div>
              <div className="text-[10px] text-[#64748b]">Avionics Powerplant Evaluation Directorate</div>
            </div>
            <div className="mt-4 pt-2 border-t border-[#38bdf8]/20 flex items-center justify-between text-[10px] text-[#64748b]">
              <span>RECORD SEALED</span>
              <span className="text-[#10b981] font-mono font-bold">VERIFIED AUTHENTIC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
