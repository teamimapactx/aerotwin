import React, { useRef, useEffect, useState } from 'react';
import { Gauge, AlertCircle, CheckCircle, Sliders } from 'lucide-react';
import { SimulationParams } from '../types';

interface MagnetoAnalysisProps {
  simulationParams: SimulationParams;
  isFaultActive: boolean;
}

export const MagnetoAnalysis: React.FC<MagnetoAnalysisProps> = ({
  simulationParams,
  isFaultActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredX, setHoveredX] = useState<number | null>(null);

  // Dynamic values based on fault
  const health = isFaultActive ? Math.round(simulationParams.magnetoHealth * 0.75) : simulationParams.magnetoHealth;
  const primaryR = isFaultActive ? (simulationParams.primaryResistance + 0.38).toFixed(2) : simulationParams.primaryResistance.toFixed(2);
  const secondaryR = isFaultActive ? (simulationParams.secondaryResistance - 3.4).toFixed(1) : simulationParams.secondaryResistance.toFixed(1);
  const spikeKv = isFaultActive ? (simulationParams.sparkSpikeKv - 8.6).toFixed(1) : simulationParams.sparkSpikeKv.toFixed(1);
  const burnTime = isFaultActive ? '0.82' : simulationParams.burnTimeMs.toFixed(2);

  // Draw the oscilloscope spark voltage waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Grid division lines (250 µs/div)
      const numDivsX = 10;
      const numDivsY = 5;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= numDivsX; i++) {
        const x = (width / numDivsX) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let j = 0; j <= numDivsY; j++) {
        const y = (height / numDivsY) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 35.0 kV Breakdown Limit Line
      const breakdownY = height * 0.22;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, breakdownY);
      ctx.lineTo(width, breakdownY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('35.0 kV BREAKDOWN LIMIT', 8, breakdownY - 4);

      // Spark Waveform Curve:
      // Pre-ignition low level -> sharp spike -> inductive burn plateau -> coil ring-down
      const baseLineY = height * 0.78;
      const spikeX = width * 0.52;
      const spikePeakY = isFaultActive ? height * 0.38 : height * 0.16;
      const arcPlateauY = isFaultActive ? height * 0.65 : height * 0.58;
      const arcEndX = isFaultActive ? width * 0.72 : width * 0.88;

      ctx.strokeStyle = isFaultActive ? '#ef4444' : '#00f0ff';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = isFaultActive ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 240, 255, 0.6)';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      // Section 1: Pre-dwell
      ctx.moveTo(0, baseLineY);
      for (let x = 0; x < spikeX - 8; x += 4) {
        const jitter = Math.sin((x + tick) * 0.1) * (isFaultActive ? 3.5 : 1.2);
        ctx.lineTo(x, baseLineY + jitter);
      }

      // Section 2: Sudden Sharp Voltage Spike (Breakdown)
      ctx.lineTo(spikeX - 4, baseLineY);
      ctx.lineTo(spikeX, spikePeakY); // High Peak
      ctx.lineTo(spikeX + 4, arcPlateauY + (Math.sin(tick * 0.2) * 2)); // Drop to burn voltage

      // Section 3: Inductive Arc Burn Shelf (Flame sustaining)
      for (let x = spikeX + 4; x <= arcEndX; x += 4) {
        const burnNoise = (Math.random() - 0.5) * (isFaultActive ? 4 : 1.5);
        const slightSlope = ((x - spikeX) / (arcEndX - spikeX)) * 8;
        ctx.lineTo(x, arcPlateauY + slightSlope + burnNoise);
      }

      // Section 4: Coil Ring-Down Oscillation
      const ringLength = width - arcEndX;
      for (let x = arcEndX; x <= width; x += 3) {
        const decay = Math.exp(-((x - arcEndX) / (ringLength * 0.35)));
        const osc = Math.sin((x - arcEndX) * 0.45) * 14 * decay;
        ctx.lineTo(x, baseLineY + osc);
      }

      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Active pulse dot moving along the wave
      const pulseX = spikeX;
      ctx.fillStyle = isFaultActive ? '#ef4444' : '#00f0ff';
      ctx.beginPath();
      ctx.arc(pulseX, spikePeakY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Interactive hover hairline crosshair
      if (hoveredX !== null) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(hoveredX, 0);
        ctx.lineTo(hoveredX, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      tick += 0.8;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [simulationParams, isFaultActive, hoveredX]);

  return (
    <div className="bg-[#0d1117] border border-[#38bdf8]/15 flex flex-col font-mono">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#38bdf8]/15 bg-[#131924]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-none border border-[#00f0ff] flex items-center justify-center text-[#00f0ff]">
            <Gauge className="w-3 h-3" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
              MAGNETO ANALYSIS
            </h2>
            <div className="text-[10px] text-[#64748b]">
              COIL & INTERNAL TIMING DEVIATION
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-lg font-bold tracking-tight ${
              isFaultActive ? 'text-[#ef4444]' : 'text-[#00f0ff]'
            }`}
          >
            {health}%
          </span>
          <span className="text-[10px] text-[#64748b] uppercase">HEALTH</span>
        </div>
      </div>

      {/* Row 1 Metrics: Output Status, Perf Trend, Anomalies */}
      <div className="grid grid-cols-3 border-b border-[#38bdf8]/15 bg-[#090b10]">
        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">OUTPUT STATUS</div>
          <div className={`text-xs font-bold mt-0.5 ${isFaultActive ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
            {isFaultActive ? 'DEGRADED' : 'NORMAL'}
          </div>
          <div className="text-[10px] text-[#00f0ff] font-semibold">{spikeKv} kV Peak</div>
        </div>

        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">PERF. TREND</div>
          <div className={`text-xs font-bold mt-0.5 ${isFaultActive ? 'text-[#ef4444]' : 'text-[#dfe2eb]'}`}>
            {isFaultActive ? 'DIVERGING' : 'STABLE'}
          </div>
          <div className={`text-[10px] font-semibold ${isFaultActive ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
            {isFaultActive ? '▼ -4.2% / hr' : '▲ +0.1% / hr'}
          </div>
        </div>

        <div className="p-3">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">ANOMALIES</div>
          <div className={`text-xs font-bold mt-0.5 ${isFaultActive ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
            {isFaultActive ? '3 CRITICAL' : '1 DETECTED'}
          </div>
          <div className="text-[10px] text-[#64748b] truncate">
            {isFaultActive ? 'Arc leakage detected' : 'Minor flutter'}
          </div>
        </div>
      </div>

      {/* Row 2: Coil Resistances */}
      <div className="grid grid-cols-2 border-b border-[#38bdf8]/15 p-3 gap-4 bg-[#0d1117]">
        <div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#64748b] uppercase">PRIMARY COIL RESISTANCE</span>
            <span className="text-[#64748b]">0.80-0.90 Ω NOM</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-bold tracking-tight tabular-nums ${
                Number(primaryR) > 0.95 ? 'text-[#ef4444]' : 'text-[#dfe2eb]'
              }`}
            >
              {primaryR} Ω
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-1 py-0.2 border ${
                Number(primaryR) > 0.95
                  ? 'border-[#ef4444]/40 text-[#ef4444]'
                  : 'border-[#10b981]/40 text-[#10b981]'
              }`}
            >
              {Number(primaryR) > 0.95 ? 'HIGH RES' : 'OPTIMAL'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#64748b] uppercase">SECONDARY COIL RESISTANCE</span>
            <span className="text-[#64748b]">10.5-12.0 kΩ NOM</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-bold tracking-tight tabular-nums ${
                Number(secondaryR) < 10.0 ? 'text-[#ef4444]' : 'text-[#dfe2eb]'
              }`}
            >
              {secondaryR} kΩ
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-1 py-0.2 border ${
                Number(secondaryR) < 10.0
                  ? 'border-[#ef4444]/40 text-[#ef4444]'
                  : 'border-[#10b981]/40 text-[#10b981]'
              }`}
            >
              {Number(secondaryR) < 10.0 ? 'DEGRADED' : 'STABLE'}
            </span>
          </div>
        </div>
      </div>

      {/* Spark Voltage Waveform Oscilloscope Display */}
      <div className="p-3 bg-[#090b10] border-b border-[#38bdf8]/15">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#f1f5f9] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
            SPARK VOLTAGE WAVEFORM (KV VS MICROSECONDS)
          </div>
          <div className="text-[10px] text-[#64748b] uppercase">TIMEBASE: 250 µs/div</div>
        </div>

        {/* Canvas Oscillogram */}
        <div
          className="relative h-28 w-full bg-[#07090e] border border-[#38bdf8]/20"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoveredX(e.clientX - rect.left);
          }}
          onMouseLeave={() => setHoveredX(null)}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>

        {/* Readout below scope */}
        <div className="flex items-center justify-between text-[11px] mt-2 text-[#dfe2eb]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
            <span className="text-[#64748b] uppercase">KV SPIKE:</span>
            <span className="font-bold text-[#00f0ff]">{spikeKv} kV</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748b] uppercase">BURN TIME:</span>
            <span className="font-bold text-[#dfe2eb]">{burnTime} ms</span>
          </div>
        </div>
      </div>

      {/* Phase Flutter Bottom Notice Banner */}
      <div className="p-2.5 bg-[#0d1117] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2 text-[#f59e0b] truncate">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isFaultActive
              ? 'Phase flutter: Cylinder 2 secondary timing drift exceeds threshold (+0.38°)'
              : 'Phase flutter: Cylinder 2 secondary firing delay within 0.12° threshold'}
          </span>
        </div>
        <div
          className={`shrink-0 font-bold uppercase tracking-wider px-1.5 py-0.5 border ${
            isFaultActive
              ? 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]'
              : 'border-[#00f0ff]/30 text-[#00f0ff]'
          }`}
        >
          {isFaultActive ? 'EXCEEDED LIMITS' : 'RESOLVED IN LIMITS'}
        </div>
      </div>
    </div>
  );
};
