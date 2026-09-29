import React, { useState } from 'react';
import { SimulationParams, WhatIfResult } from '../types';
import { runWhatIf } from '../services/api';
import { hudAudio } from '../utils/audio';

interface WhatIfSandboxProps {
  simulationParams: SimulationParams;
  onUpdateParams: (newParams: Partial<SimulationParams>) => void;
  isFaultActive: boolean;
  onTriggerFault: (faultName?: string) => void;
  onClearFault: () => void;
  onIsolate3D: () => void;
}

export const WhatIfSandbox: React.FC<WhatIfSandboxProps> = () => {
  const [vibIncrease, setVibIncrease] = useState('0.8');
  const [tempIncrease, setTempIncrease] = useState('15');
  const [horizon, setHorizon] = useState('900');
  const [isRunningAnalysis, setIsRunningAnalysis] = useState<boolean>(false);
  const [backendProjection, setBackendProjection] = useState<WhatIfResult | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const handleRunWhatIf = async () => {
    hudAudio.playBlip(1000);
    setIsRunningAnalysis(true);
    setBackendError(null);
    try {
      const result = await runWhatIf({
        vibration_delta: parseFloat(vibIncrease),
        temperature_delta: parseFloat(tempIncrease),
        horizon_seconds: parseInt(horizon, 10),
      });
      setBackendProjection(result);
      hudAudio.playSuccessChime();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Backend projection unavailable');
      hudAudio.playFaultAlarm();
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  return (
    <div className="bg-[#090b10] border border-[#1e293b] p-6 text-[#f1f5f9] w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: What-if Scenario Inputs */}
        <div>
          <h2 className="text-xl font-bold mb-4 font-sans tracking-wide">What-if Scenario</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Vibration increase (g)</label>
              <input
                type="number"
                step="0.1"
                value={vibIncrease}
                onChange={(e) => setVibIncrease(e.target.value)}
                className="w-full bg-[#131924] border border-[#1e293b] rounded p-2.5 text-[#f1f5f9] focus:outline-none focus:border-[#38bdf8]"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Temperature increase (°C)</label>
              <input
                type="number"
                step="1"
                value={tempIncrease}
                onChange={(e) => setTempIncrease(e.target.value)}
                className="w-full bg-[#131924] border border-[#1e293b] rounded p-2.5 text-[#f1f5f9] focus:outline-none focus:border-[#38bdf8]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Projection horizon (seconds)</label>
              <input
                type="number"
                step="100"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="w-full bg-[#131924] border border-[#1e293b] rounded p-2.5 text-[#f1f5f9] focus:outline-none focus:border-[#38bdf8]"
              />
            </div>

            <button
              onClick={handleRunWhatIf}
              disabled={isRunningAnalysis}
              className="w-full bg-transparent border border-[#38bdf8] text-[#38bdf8] hover:bg-[#38bdf8]/10 rounded py-2.5 mt-4 transition-colors disabled:opacity-50"
            >
              {isRunningAnalysis ? 'Running...' : 'Run What-if Projection'}
            </button>

            {backendError && (
              <div className="text-[#ef4444] text-sm mt-2">{backendError}</div>
            )}

            {!backendProjection && !isRunningAnalysis && (
              <p className="text-sm text-[#64748b] mt-4 pt-4 border-t border-[#1e293b]">No scenario run yet.</p>
            )}
          </div>
        </div>

        {/* Right Side: What-if Projection Results */}
        <div className="md:border-l border-[#1e293b] md:pl-8">
          <h3 className="text-lg font-bold mb-4 tracking-wide uppercase">WHAT-IF PROJECTION</h3>
          
          <div className="border-b border-[#1e293b] pb-4 mb-4">
            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
              <div className="text-[#f1f5f9]">Parameter</div>
              <div className="text-[#64748b]">Current</div>
              <div className="text-[#64748b]">Projected</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm mb-2 text-[#94a3b8]">
              <div>Vibration</div>
              <div>--</div>
              <div className="text-[#f1f5f9]">{backendProjection ? backendProjection.projection.vibration.toFixed(2) : '--'}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm mb-4 text-[#94a3b8]">
              <div>Temperature</div>
              <div>--</div>
              <div className="text-[#f1f5f9]">{backendProjection ? backendProjection.projection.cht.toFixed(0) : '--'}</div>
            </div>

            <div className="text-[#f1f5f9] text-sm mt-4">
              Projection Horizon: {backendProjection ? horizon : '--'}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-[#f1f5f9] mb-3 text-sm font-semibold">AI Prediction</h4>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-2 text-[#94a3b8]">
              <div>Fault Probability</div>
              <div className="text-[#f1f5f9]">{backendProjection ? (backendProjection.projection.fault_probability * 100).toFixed(0) + '%' : '--'}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-2 text-[#94a3b8]">
              <div>Engine Health</div>
              <div className="text-[#f1f5f9]">{backendProjection ? backendProjection.projection.engine_health.toFixed(1) + '%' : '--'}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-[#94a3b8]">
              <div>Predicted Fault</div>
              <div className="text-[#f1f5f9]">{backendProjection ? backendProjection.projection.fault_guess : '--'}</div>
            </div>
          </div>

          <div className="text-[#f1f5f9] text-sm font-semibold mb-4 mt-6">
            Estimated RUL <span className="text-[#f59e0b] ml-1">{backendProjection ? backendProjection.projection.rul_hours.toFixed(1) + 'h' : '--'}</span>
          </div>

          <div className="mb-4">
            <div className="text-[#f1f5f9] text-sm font-semibold mb-1">Mission Reliability</div>
            <div className="text-[#ef4444] font-bold">
              {backendProjection ? backendProjection.projection.mission_reliability.toFixed(1) + '%' : '--'}
            </div>
          </div>

          <div>
            <div className="text-[#94a3b8] text-sm mb-1">Recommendation:</div>
            <div className="text-[#f1f5f9] text-sm">
              {backendProjection ? backendProjection.projection.maintenance?.action || backendProjection.projection.maintenance?.priority || 'None' : '--'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
