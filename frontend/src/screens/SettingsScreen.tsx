import React, { useState } from 'react';
import {
  Sliders,
  Bell,
  Shield,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  AlertTriangle,
  Radio,
  Cpu,
  Save,
} from 'lucide-react';
import { AlertThresholds, NotificationSettings } from '../types';
import { DEFAULT_ALERT_THRESHOLDS, DEFAULT_NOTIFICATIONS } from '../data/mockTelemetry';
import { hudAudio } from '../utils/audio';

interface SettingsScreenProps {
  thresholds: AlertThresholds;
  onUpdateThresholds: (thresholds: AlertThresholds) => void;
  notifications: NotificationSettings;
  onUpdateNotifications: (settings: NotificationSettings) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  thresholds,
  onUpdateThresholds,
  notifications,
  onUpdateNotifications,
}) => {
  const [localThresholds, setLocalThresholds] = useState<AlertThresholds>(thresholds);
  const [localNotifs, setLocalNotifs] = useState<NotificationSettings>(notifications);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const handleSave = () => {
    hudAudio.playSuccessChime();
    onUpdateThresholds(localThresholds);
    onUpdateNotifications(localNotifs);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleResetDefaults = () => {
    hudAudio.playBlip(700);
    setLocalThresholds(DEFAULT_ALERT_THRESHOLDS);
    setLocalNotifs(DEFAULT_NOTIFICATIONS);
    onUpdateThresholds(DEFAULT_ALERT_THRESHOLDS);
    onUpdateNotifications(DEFAULT_NOTIFICATIONS);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const testAudioAlarm = () => {
    hudAudio.playFaultAlarm();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-tactical-grid bg-[#090b10] text-[#dfe2eb] select-none font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#38bdf8]/15">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-[#64748b] tracking-wider uppercase">
            <span>AEROTWIN</span>
            <span>//</span>
            <span>AVIONICS CONFIGURATION</span>
            <span>//</span>
            <span className="text-[#38bdf8]">FAILSAFE CALIBRATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[#f1f5f9] mt-0.5">
            ALERT THRESHOLDS &amp; NOTIFICATION PREFERENCES
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase bg-[#131924] border border-[#38bdf8]/30 hover:border-[#dfe2eb] text-[#dfe2eb] transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET FACTORY SPECS
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase bg-[#00f0ff] text-[#090b10] hover:bg-[#38bdf8] transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
          >
            <Save className="w-3.5 h-3.5" />
            SAVE SETTINGS
          </button>
        </div>
      </div>

      {/* Confirmation Toast */}
      {savedToast && (
        <div className="p-3 bg-[#10b981]/20 border border-[#10b981] text-[#10b981] flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span className="font-bold">SYSTEM PARAMETERS SAVED:</span>
            <span>Failsafe threshold table flashed to FADEC non-volatile memory.</span>
          </div>
          <span className="text-[10px] uppercase font-bold">200 OK</span>
        </div>
      )}

      {/* Grid: Alert Thresholds & Notification Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 1: Alert Thresholds */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#38bdf8]/15 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#00f0ff]" />
              <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
                IGNITION &amp; THERMAL SAFETY BOUNDARIES
              </h2>
            </div>
            <span className="text-[10px] text-[#64748b] uppercase">MIL-HDBK-516B</span>
          </div>

          <div className="space-y-4">
            {/* Spark Breakdown Limit */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold text-[#dfe2eb] uppercase">
                  Spark Breakdown Voltage Ceiling
                </span>
                <span className="font-bold text-[#00f0ff] tabular-nums">
                  {localThresholds.sparkBreakdownLimitKv.toFixed(1)} kV
                </span>
              </div>
              <input
                type="range"
                min="28.0"
                max="40.0"
                step="0.5"
                value={localThresholds.sparkBreakdownLimitKv}
                onChange={(e) =>
                  setLocalThresholds({
                    ...localThresholds,
                    sparkBreakdownLimitKv: Number(e.target.value),
                  })
                }
                className="w-full accent-[#00f0ff] h-1.5 bg-[#1e293b]"
              />
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>NOM: 32.4 kV</span>
                <span>CRITICAL TRIP: 35.0 kV</span>
                <span>MAX: 40.0 kV</span>
              </div>
            </div>

            {/* Coil Max Temperature */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold text-[#dfe2eb] uppercase">
                  Magneto Coil Case Thermal Ceiling
                </span>
                <span className="font-bold text-[#f59e0b] tabular-nums">
                  {localThresholds.maxCoilTempC.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                min="55.0"
                max="95.0"
                step="1"
                value={localThresholds.maxCoilTempC}
                onChange={(e) =>
                  setLocalThresholds({
                    ...localThresholds,
                    maxCoilTempC: Number(e.target.value),
                  })
                }
                className="w-full accent-[#f59e0b] h-1.5 bg-[#1e293b]"
              />
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>NOM: 64.8 °C</span>
                <span>WARN: 75.0 °C</span>
                <span>PERM LIMIT: 95.0 °C</span>
              </div>
            </div>

            {/* Spark Plug Gap Erosion Limit */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold text-[#dfe2eb] uppercase">
                  Spark Plug Gap Wear Rejection Limit
                </span>
                <span className="font-bold text-[#00f0ff] tabular-nums">
                  {localThresholds.maxGapErosionMm.toFixed(2)} mm
                </span>
              </div>
              <input
                type="range"
                min="0.55"
                max="0.85"
                step="0.01"
                value={localThresholds.maxGapErosionMm}
                onChange={(e) =>
                  setLocalThresholds({
                    ...localThresholds,
                    maxGapErosionMm: Number(e.target.value),
                  })
                }
                className="w-full accent-[#00f0ff] h-1.5 bg-[#1e293b]"
              />
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>FACTORY: 0.50 mm</span>
                <span>DISCARD: 0.70 mm</span>
                <span>FAIL: 0.85 mm</span>
              </div>
            </div>

            {/* Misfire Ceiling Probability */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold text-[#dfe2eb] uppercase">
                  Misfire Probability Abort Threshold
                </span>
                <span className="font-bold text-[#ef4444] tabular-nums">
                  {localThresholds.misfireCeilingPct.toFixed(1)} %
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="25.0"
                step="0.5"
                value={localThresholds.misfireCeilingPct}
                onChange={(e) =>
                  setLocalThresholds({
                    ...localThresholds,
                    misfireCeilingPct: Number(e.target.value),
                  })
                }
                className="w-full accent-[#ef4444] h-1.5 bg-[#1e293b]"
              />
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>NOM: 4-6%</span>
                <span>SAFETY CEILING: 10.0%</span>
                <span>ABORT: 25.0%</span>
              </div>
            </div>

            {/* CHT Critical Threshold */}
            <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold text-[#dfe2eb] uppercase">
                  Cylinder Head Temperature (CHT) Max Limit
                </span>
                <span className="font-bold text-[#ef4444] tabular-nums">
                  {localThresholds.chtCriticalC} °C
                </span>
              </div>
              <input
                type="range"
                min="180"
                max="235"
                step="1"
                value={localThresholds.chtCriticalC}
                onChange={(e) =>
                  setLocalThresholds({
                    ...localThresholds,
                    chtCriticalC: Number(e.target.value),
                  })
                }
                className="w-full accent-[#ef4444] h-1.5 bg-[#1e293b]"
              />
              <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
                <span>NOM: 160-175 °C</span>
                <span>WARN: 185 °C</span>
                <span>REDLINE: 215 °C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Notification & Automation Preferences */}
        <div className="bg-[#0d1117] border border-[#38bdf8]/15 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#38bdf8]/15 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#00f0ff]" />
                <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
                  COCKPIT ALERTS &amp; AUTOMATION PROTOCOLS
                </h2>
              </div>
              <span className="text-[10px] text-[#64748b] uppercase">AUDIO / VISUAL / Failsafe</span>
            </div>

            <div className="space-y-3">
              {/* Audio Alarm Toggle */}
              <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#dfe2eb] uppercase">
                    HUD Audio Tactical Chime Alerts
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    Synthesize frequency alert chimes on threshold exceedance &amp; state changes.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={testAudioAlarm}
                    className="px-2 py-1 text-[10px] uppercase border border-[#38bdf8]/30 hover:border-[#00f0ff] text-[#00f0ff] transition-colors"
                  >
                    Test Tone
                  </button>
                  <button
                    onClick={() => {
                      hudAudio.playBlip(900);
                      setLocalNotifs({ ...localNotifs, audioAlarmChime: !localNotifs.audioAlarmChime });
                    }}
                    className={`p-1.5 border transition-colors ${
                      localNotifs.audioAlarmChime
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]'
                        : 'bg-[#1e293b] text-[#64748b] border-transparent'
                    }`}
                  >
                    {localNotifs.audioAlarmChime ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* P-Lead Automatic Grounding */}
              <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#dfe2eb] uppercase">
                    Automatic P-Lead Emergency Grounding
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    Automatically ground primary coil to isolate short circuit upon thermal runaway.
                  </div>
                </div>
                <button
                  onClick={() => {
                    hudAudio.playBlip(900);
                    setLocalNotifs({ ...localNotifs, pLeadAutoGround: !localNotifs.pLeadAutoGround });
                  }}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                    localNotifs.pLeadAutoGround
                      ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]'
                      : 'bg-[#1e293b] text-[#64748b] border-transparent'
                  }`}
                >
                  {localNotifs.pLeadAutoGround ? 'ENABLED' : 'MANUAL ONLY'}
                </button>
              </div>

              {/* Visual Alert Strobe */}
              <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#dfe2eb] uppercase">
                    HUD Visual Strobe on Critical Anomaly
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    Pulsate avionics banner and telemetry borders in stark red upon critical fault.
                  </div>
                </div>
                <button
                  onClick={() => {
                    hudAudio.playBlip(900);
                    setLocalNotifs({ ...localNotifs, visualAlertStrobe: !localNotifs.visualAlertStrobe });
                  }}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                    localNotifs.visualAlertStrobe
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]'
                      : 'bg-[#1e293b] text-[#64748b] border-transparent'
                  }`}
                >
                  {localNotifs.visualAlertStrobe ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {/* Sat Heartbeat loss */}
              <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#dfe2eb] uppercase">
                    MIL-SAT Uplink Telemetry Watchdog
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    Trip failsafe return-to-base sequence if packet loss exceeds 2000 ms.
                  </div>
                </div>
                <button
                  onClick={() => {
                    hudAudio.playBlip(900);
                    setLocalNotifs({ ...localNotifs, satHeartbeatLossAlert: !localNotifs.satHeartbeatLossAlert });
                  }}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                    localNotifs.satHeartbeatLossAlert
                      ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]'
                      : 'bg-[#1e293b] text-[#64748b] border-transparent'
                  }`}
                >
                  {localNotifs.satHeartbeatLossAlert ? 'ARMED' : 'STANDBY'}
                </button>
              </div>

              {/* Telemetry Stream Frequency */}
              <div className="p-3 bg-[#090b10] border border-[#38bdf8]/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#dfe2eb] uppercase">
                    Log Stream Bus Frequency
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    Configured downlink rate for continuous spark breakdown sampling.
                  </div>
                </div>
                <select
                  value={localNotifs.streamRateHz}
                  onChange={(e) => {
                    hudAudio.playBlip(900);
                    setLocalNotifs({ ...localNotifs, streamRateHz: Number(e.target.value) });
                  }}
                  className="bg-[#131924] border border-[#38bdf8]/30 text-[#00f0ff] px-2 py-1 text-xs font-bold focus:outline-none focus:border-[#00f0ff]"
                >
                  <option value={5}>5 Hz</option>
                  <option value={10}>10 Hz (STD)</option>
                  <option value={20}>20 Hz (HIGH)</option>
                  <option value={50}>50 Hz (BURST)</option>
                </select>
              </div>
            </div>

            {/* Operator Credentials Calibration */}
            <div className="mt-4 pt-3 border-t border-[#38bdf8]/15 space-y-3">
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                SORTIE REGISTRY &amp; OPERATOR CALLSIGN
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[9px] text-[#64748b] uppercase block mb-1">CALL SIGN</label>
                  <input
                    type="text"
                    value={localNotifs.operatorCallSign}
                    onChange={(e) => setLocalNotifs({ ...localNotifs, operatorCallSign: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#38bdf8]/20 px-2 py-1 text-[#f1f5f9] text-xs font-bold focus:border-[#00f0ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-[#64748b] uppercase block mb-1">UAV REGISTRATION</label>
                  <input
                    type="text"
                    value={localNotifs.uavId}
                    onChange={(e) => setLocalNotifs({ ...localNotifs, uavId: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#38bdf8]/20 px-2 py-1 text-[#f1f5f9] text-xs font-bold focus:border-[#00f0ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-[#64748b] uppercase block mb-1">SORTIE CODE</label>
                  <input
                    type="text"
                    value={localNotifs.sortieCode}
                    onChange={(e) => setLocalNotifs({ ...localNotifs, sortieCode: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#38bdf8]/20 px-2 py-1 text-[#f1f5f9] text-xs font-bold focus:border-[#00f0ff] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
