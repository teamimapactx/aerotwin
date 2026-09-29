import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Eye, Shield, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { hudAudio } from '../utils/audio';

interface DigitalTwin3DProps {
  isFaultActive: boolean;
  magTemp?: number;
  rpm?: number;
  isolationMode?: boolean;
  onToggleIsolation?: () => void;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  isFaultActive,
  magTemp = 64.8,
  rpm = 2420,
  isolationMode = false,
  onToggleIsolation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [xRayMode, setXRayMode] = useState<boolean>(false);
  const [rotationAngle, setRotationAngle] = useState<{ x: number; y: number }>({ x: 25, y: -35 });
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  // Bearing frequency calculation from RPM (2-pole magneto = RPM / 60)
  const bearingFreq = (rpm / 60).toFixed(1);
  const fluxDensity = isFaultActive ? '0.98 T' : '1.42 T';

  // Canvas 3D isometric wireframe renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let localRotation = 0;

    const render = () => {
      // High-DPI scaling
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Background grid & radar sweeps
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 28;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center crosshair & radar concentric circles
      const cx = width / 2;
      const cy = height / 2;

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      [50, 100, 150].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * zoomLevel, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Crosshair lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy);
      ctx.lineTo(cx + 30, cy);
      ctx.moveTo(cx, cy - 30);
      ctx.lineTo(cx, cy + 30);
      ctx.stroke();

      // Tick marks on axes
      [-120, -80, -40, 40, 80, 120].forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(cx + offset * zoomLevel, cy - 3);
        ctx.lineTo(cx + offset * zoomLevel, cy + 3);
        ctx.moveTo(cx - 3, cy + offset * zoomLevel);
        ctx.lineTo(cx + 3, cy + offset * zoomLevel);
        ctx.stroke();
      });

      // 3D Engine Projection helper
      const radX = ((rotationAngle.x + (isFaultActive ? Math.sin(Date.now() / 150) * 2 : 0)) * Math.PI) / 180;
      const radY = ((rotationAngle.y + localRotation) * Math.PI) / 180;

      const project = (x: number, y: number, z: number): [number, number] => {
        // Rotate around Y
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;

        // Rotate around X
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;

        // Isometric scale with zoom
        const scale = (280 / (280 + z2 * 0.5)) * zoomLevel;
        return [cx + x1 * scale, cy + y2 * scale];
      };

      // Draw Magneto Housing / Rotor / Primary & Secondary Coils
      ctx.lineWidth = xRayMode ? 1.2 : 1.8;

      // 1. Stator / Case Rings (Cylindrical shell)
      const numSegments = 16;
      const rOuter = 75;
      const rInner = 45;
      const caseHeight = 70;

      // Primary color palette
      const primaryColor = isFaultActive ? 'rgba(239, 68, 68, 0.85)' : 'rgba(0, 240, 255, 0.85)';
      const accentColor = isFaultActive ? 'rgba(245, 158, 11, 0.8)' : 'rgba(76, 214, 251, 0.7)';
      const xRayAlpha = xRayMode ? 0.35 : 0.85;

      // Draw Stator Housing Rings
      for (let h = -caseHeight / 2; h <= caseHeight / 2; h += caseHeight / 3) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(56, 189, 248, ${xRayAlpha * 0.4})`;
        for (let i = 0; i <= numSegments; i++) {
          const theta = (i / numSegments) * Math.PI * 2;
          const px = Math.cos(theta) * rOuter;
          const pz = Math.sin(theta) * rOuter;
          const [sx, sy] = project(px, h, pz);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Longitudinal struts of magneto case
      ctx.strokeStyle = `rgba(56, 189, 248, ${xRayAlpha * 0.3})`;
      for (let i = 0; i < 8; i++) {
        const theta = (i / 8) * Math.PI * 2;
        const px = Math.cos(theta) * rOuter;
        const pz = Math.sin(theta) * rOuter;
        const [sx1, sy1] = project(px, -caseHeight / 2, pz);
        const [sx2, sy2] = project(px, caseHeight / 2, pz);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }

      // 2. Central Rotor Core (NdFeB Magnet shaft)
      ctx.strokeStyle = primaryColor;
      for (let h = -caseHeight / 2 - 15; h <= caseHeight / 2 + 15; h += 10) {
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const theta = (i / 10) * Math.PI * 2;
          const px = Math.cos(theta) * (rInner * 0.35);
          const pz = Math.sin(theta) * (rInner * 0.35);
          const [sx, sy] = project(px, h, pz);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // 3. Primary & Secondary High-Tension Induction Coils
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      const coilLayers = 7;
      for (let l = 0; l < coilLayers; l++) {
        const coilY = -caseHeight / 3 + l * 8;
        ctx.beginPath();
        for (let i = 0; i <= numSegments; i++) {
          const theta = (i / numSegments) * Math.PI * 2;
          const px = Math.cos(theta) * (rInner + (l % 2) * 4);
          const pz = Math.sin(theta) * (rInner + (l % 2) * 4);
          const [sx, sy] = project(px, coilY, pz);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // 4. Contact Breaker Cam & Distributor Rotor (Top End)
      const camY = -caseHeight / 2 - 25;
      ctx.strokeStyle = isFaultActive ? '#ef4444' : '#00f0ff';
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const theta = (i / 12) * Math.PI * 2;
        // Cam lobe deformation
        const lobe = 1 + 0.25 * Math.sin(theta * 2);
        const px = Math.cos(theta) * 25 * lobe;
        const pz = Math.sin(theta) * 25 * lobe;
        const [sx, sy] = project(px, camY, pz);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Distributor pickup leads (4 cylinder nodes)
      const leadLabels = ['CYL-1', 'CYL-3', 'CYL-4', 'CYL-2'];
      ctx.fillStyle = '#dfe2eb';
      ctx.font = '9px "JetBrains Mono", monospace';
      for (let c = 0; c < 4; c++) {
        const angle = (c * Math.PI) / 2 + (localRotation * Math.PI) / 180;
        const lx = Math.cos(angle) * (rOuter + 25);
        const lz = Math.sin(angle) * (rOuter + 25);
        const [sx, sy] = project(lx, -caseHeight / 2 - 10, lz);
        const [rootX, rootY] = project(Math.cos(angle) * rOuter, -caseHeight / 2 - 10, Math.sin(angle) * rOuter);

        ctx.strokeStyle = isFaultActive && c === 1 ? '#ef4444' : 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = isFaultActive && c === 1 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Node dot
        ctx.fillStyle = isFaultActive && c === 1 ? '#ef4444' : '#00f0ff';
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText(leadLabels[c], sx + 6, sy - 2);
      }

      // 5. Magnetic Flux Field Loops (Dynamic visualization)
      ctx.strokeStyle = isFaultActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 240, 255, 0.25)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1;
      for (let f = 0; f < 3; f++) {
        const fAngle = (f * Math.PI) / 3;
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 2; t += 0.2) {
          const fx = Math.cos(t) * (rOuter + 35 + f * 12);
          const fy = Math.sin(t) * (caseHeight * 0.9);
          const fz = Math.sin(fAngle) * 30;
          const [sx, sy] = project(fx, fy, fz);
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Fault indicator spark arcing effect if fault active
      if (isFaultActive) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        const [arcX, arcY] = project(rInner + 5, -5, 0);
        ctx.beginPath();
        ctx.moveTo(arcX - 10, arcY - 10);
        ctx.lineTo(arcX + (Math.random() - 0.5) * 20, arcY + (Math.random() - 0.5) * 15);
        ctx.lineTo(arcX + 15, arcY + 8);
        ctx.stroke();

        // Warning text callout in canvas
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('⚡ HARNESS ARCING', arcX + 22, arcY);
      }

      // Smooth idle rotation if not dragging
      if (!isDragging) {
        localRotation += 0.35;
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [rotationAngle, zoomLevel, isFaultActive, xRayMode, isDragging, rpm]);

  // Mouse interaction handlers for 3D orbit
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotationAngle((prev) => ({
      x: Math.max(-85, Math.min(85, prev.x + dy * 0.5)),
      y: prev.y + dx * 0.5,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetCamera = () => {
    hudAudio.playBlip(900);
    setRotationAngle({ x: 25, y: -35 });
    setZoomLevel(1.0);
  };

  return (
    <div className="bg-[#0d1117] border border-[#38bdf8]/15 flex flex-col font-mono relative overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-2.5 border-b border-[#38bdf8]/15 bg-[#131924]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00f0ff]" />
          <h2 className="text-xs font-bold font-heading tracking-wider uppercase text-[#f1f5f9]">
            3D SPATIAL DIGITAL TWIN: MAGNETO & COIL ASSEMBLY
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-[#64748b]">
            ISOLATION:{' '}
            <span
              onClick={onToggleIsolation}
              className={`cursor-pointer font-bold px-1.5 py-0.5 border transition-colors ${
                isolationMode
                  ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff]'
                  : 'border-[#38bdf8]/30 text-[#38bdf8] hover:border-[#00f0ff]'
              }`}
            >
              MAG-L & HARN-A
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Viewport Stage */}
      <div
        className="relative h-72 w-full bg-[#090b10] cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Top-left Telemetry Overlays */}
        <div className="absolute top-3 left-4 space-y-1 pointer-events-none">
          <div className="text-[11px] font-semibold text-[#00f0ff] bg-[#090b10]/80 px-2 py-0.5 border border-[#00f0ff]/20 inline-block backdrop-blur-xs">
            BEARING ROTATION: <span className="tabular-nums font-bold">{bearingFreq} Hz</span>
          </div>
          <div className="text-[11px] font-semibold text-[#00f0ff] bg-[#090b10]/80 px-2 py-0.5 border border-[#00f0ff]/20 block backdrop-blur-xs">
            FLUX DENSITY: <span className="tabular-nums font-bold">{fluxDensity}</span>
          </div>
        </div>

        {/* Control Buttons Bottom-Right */}
        <div className="absolute bottom-3 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
            className="p-1.5 bg-[#131924]/80 border border-[#38bdf8]/30 hover:border-[#00f0ff] text-[#dfe2eb] hover:text-[#00f0ff] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 bg-[#131924]/80 border border-[#38bdf8]/30 hover:border-[#00f0ff] text-[#dfe2eb] hover:text-[#00f0ff] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetCamera}
            className="px-2.5 py-1 text-[10px] tracking-wider font-semibold uppercase bg-[#131924]/90 border border-[#38bdf8]/30 hover:border-[#00f0ff] text-[#dfe2eb] hover:text-[#00f0ff] transition-colors flex items-center gap-1.5 backdrop-blur-xs"
          >
            <RotateCcw className="w-3 h-3" />
            RESET CAM
          </button>
          <button
            onClick={() => {
              hudAudio.playBlip(1100);
              setXRayMode(!xRayMode);
            }}
            className={`px-2.5 py-1 text-[10px] tracking-wider font-semibold uppercase border transition-colors flex items-center gap-1.5 backdrop-blur-xs ${
              xRayMode
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]'
                : 'bg-[#131924]/90 text-[#dfe2eb] border-[#38bdf8]/30 hover:border-[#00f0ff]'
            }`}
          >
            <Eye className="w-3 h-3" />
            X-RAY BUS
          </button>
        </div>

        {/* Orbit indicator hint */}
        <div className="absolute bottom-3 left-4 text-[9px] text-[#64748b] pointer-events-none uppercase">
          DRAG TO ORBIT 3D VIEWPORT // ROTATION: {rotationAngle.x.toFixed(0)}°, {rotationAngle.y.toFixed(0)}°
        </div>
      </div>

      {/* Bottom Telemetry Parameter Readout Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-[#38bdf8]/15 bg-[#090b10]">
        {/* Coupling Angle */}
        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">COUPLING ANGLE</div>
          <div className="text-sm font-bold text-[#dfe2eb] tracking-tight mt-0.5">
            0.04° <span className="text-[#00f0ff] text-xs">LEAD</span>
          </div>
        </div>

        {/* Impulse Relay */}
        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">IMPULSE RELAY</div>
          <div className="text-sm font-bold text-[#00f0ff] tracking-wider mt-0.5">
            LATCHED
          </div>
        </div>

        {/* Mag Temp Case */}
        <div className="p-3 border-r border-[#38bdf8]/15">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">MAG TEMP (CASE)</div>
          <div
            className={`text-sm font-bold tracking-tight mt-0.5 ${
              magTemp > 75 ? 'text-[#ef4444]' : magTemp > 70 ? 'text-[#f59e0b]' : 'text-[#dfe2eb]'
            }`}
          >
            {magTemp.toFixed(1)} <span className="text-[#64748b] text-xs">°C</span>
          </div>
        </div>

        {/* Ground Circuit */}
        <div className="p-3">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b]">GROUND CIRCUIT</div>
          <div
            className={`text-sm font-bold tracking-wider mt-0.5 flex items-center gap-1.5 ${
              isFaultActive ? 'text-[#ef4444]' : 'text-[#10b981]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isFaultActive ? 'P-LEAD FAULT' : 'P-LEAD OK'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
