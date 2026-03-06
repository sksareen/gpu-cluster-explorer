import { useRef, useEffect, useState } from 'react';
import { ClusterState, Job, TEAM_COLORS } from '../types';

interface Props {
  cluster: ClusterState;
  runningJobs: Job[];
  compact?: boolean;
}

const GPU_SIZE = 10;
const GPU_GAP = 2;
const NODE_GAP = 6;
const RACK_GAP = 16;
const POOL_GAP = 24;
const LABEL_HEIGHT = 20;

const LEGEND_ITEMS = [
  { label: 'Research-A', color: TEAM_COLORS['Research-A'] },
  { label: 'Research-B', color: TEAM_COLORS['Research-B'] },
  { label: 'Production', color: TEAM_COLORS['Production'] },
  { label: 'Platform', color: TEAM_COLORS['Platform'] },
  { label: 'ML-Infra', color: TEAM_COLORS['ML-Infra'] },
  { label: 'Idle', color: '#242842' },
];

export function ClusterGrid({ cluster, runningJobs, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const jobMapRef = useRef<Map<string, Job>>(new Map());

  const scale = compact ? 0.7 : 1;
  const gpuSize = GPU_SIZE * scale;
  const gpuGap = GPU_GAP * scale;
  const nodeGap = NODE_GAP * scale;
  const rackGap = RACK_GAP * scale;
  const poolGap = POOL_GAP * scale;
  const labelH = compact ? 14 : LABEL_HEIGHT;

  // Update job map
  useEffect(() => {
    const map = new Map<string, Job>();
    for (const job of runningJobs) {
      map.set(job.id, job);
    }
    jobMapRef.current = map;
  }, [runningJobs]);

  // Node width = 8 GPUs in 2x4 grid
  const nodeW = 4 * gpuSize + 3 * gpuGap;
  const nodeH = 2 * gpuSize + gpuGap;
  // Rack = 8 nodes in 2x4 grid
  const rackW = 4 * (nodeW + nodeGap) - nodeGap;
  const rackH = 2 * (nodeH + nodeGap) - nodeGap;
  // Pool = 2 racks side by side
  const poolW = 2 * rackW + rackGap;
  const poolH = rackH;

  const canvasW = poolW + 32;
  const canvasH = 2 * (poolH + labelH + 8) + poolGap;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    ctx.clearRect(0, 0, canvasW, canvasH);

    const pools: { label: string; racks: number[]; y: number }[] = [
      { label: 'Training GPUs (128)', racks: [0, 1], y: 0 },
      { label: 'Inference GPUs (128)', racks: [2, 3], y: poolH + labelH + 8 + poolGap },
    ];

    for (const pool of pools) {
      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${compact ? 10 : 12}px Inter, sans-serif`;
      ctx.fillText(pool.label, 8, pool.y + (compact ? 10 : 14));

      const baseY = pool.y + labelH;

      pool.racks.forEach((rackIdx, ri) => {
        const rackX = 8 + ri * (rackW + rackGap);

        // Rack background
        ctx.fillStyle = '#1a1d2e';
        ctx.strokeStyle = '#2d3154';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(rackX - 3, baseY - 3, rackW + 6, rackH + 6, 4);
        ctx.fill();
        ctx.stroke();

        // Nodes in rack
        for (let ni = 0; ni < 8; ni++) {
          const nodeCol = ni % 4;
          const nodeRow = Math.floor(ni / 4);
          const nodeX = rackX + nodeCol * (nodeW + nodeGap);
          const nodeY = baseY + nodeRow * (nodeH + nodeGap);

          // Node background
          ctx.fillStyle = '#0f1117';
          ctx.beginPath();
          ctx.roundRect(nodeX, nodeY, nodeW, nodeH, 2);
          ctx.fill();

          // GPUs in node (2x4)
          const globalNode = rackIdx * 8 + ni;
          for (let gi = 0; gi < 8; gi++) {
            const gpuCol = gi % 4;
            const gpuRow = Math.floor(gi / 4);
            const gx = nodeX + gpuCol * (gpuSize + gpuGap);
            const gy = nodeY + gpuRow * (gpuSize + gpuGap);

            const gpuId = globalNode * 8 + gi;
            const gpu = cluster.gpus[gpuId];

            if (gpu && gpu.jobId) {
              const job = jobMapRef.current.get(gpu.jobId);
              ctx.fillStyle = job ? (TEAM_COLORS[job.team] ?? '#3b82f6') : '#3b82f6';
            } else {
              ctx.fillStyle = '#242842';
            }

            ctx.beginPath();
            ctx.roundRect(gx, gy, gpuSize, gpuSize, 1);
            ctx.fill();
          }
        }
      });
    }
  }, [cluster, runningJobs, compact, canvasW, canvasH, gpuSize, gpuGap, nodeGap, rackGap, nodeW, nodeH, rackW, rackH, poolH, labelH, poolGap]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find which GPU the mouse is over
    for (const gpu of cluster.gpus) {
      const poolIdx = gpu.pool === 'training' ? 0 : 1;
      const poolY = poolIdx === 0 ? 0 : poolH + labelH + 8 + poolGap;
      const baseY = poolY + labelH;
      const rackInPool = gpu.rack % 2;
      const rackX = 8 + rackInPool * (rackW + rackGap);
      const nodeInRack = gpu.node % 8;
      const nodeCol = nodeInRack % 4;
      const nodeRow = Math.floor(nodeInRack / 4);
      const nodeX = rackX + nodeCol * (nodeW + nodeGap);
      const nodeY = baseY + nodeRow * (nodeH + nodeGap);
      const gpuCol = gpu.localIndex % 4;
      const gpuRow = Math.floor(gpu.localIndex / 4);
      const gx = nodeX + gpuCol * (gpuSize + gpuGap);
      const gy = nodeY + gpuRow * (gpuSize + gpuGap);

      if (x >= gx && x <= gx + gpuSize && y >= gy && y <= gy + gpuSize) {
        if (gpu.jobId) {
          const job = jobMapRef.current.get(gpu.jobId);
          if (job) {
            setTooltip({
              x: e.clientX,
              y: e.clientY,
              text: `${job.name} · ${job.team} · ${job.numGPUs} GPUs · ${job.priority} priority`,
            });
            return;
          }
        }
        setTooltip({ x: e.clientX, y: e.clientY, text: `GPU ${gpu.id} — idle` });
        return;
      }
    }
    setTooltip(null);
  };

  return (
    <div>
      {/* Pool descriptions (non-compact only) */}
      {!compact && (
        <div className="flex flex-wrap gap-6 mb-3">
          <div className="text-xs" style={{ color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>Training GPUs</span> — for large model training, needs fast GPU-to-GPU connections
          </div>
          <div className="text-xs" style={{ color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>Inference GPUs</span> — for serving AI responses, needs lots of memory
          </div>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          className="cursor-crosshair"
        />
        {tooltip && (
          <div
            className="fixed z-50 px-2 py-1 text-xs rounded shadow-lg pointer-events-none"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              background: '#1a1d2e',
              border: '1px solid #2d3154',
              color: '#e2e8f0',
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: item.color, border: item.color === '#242842' ? '1px solid #4b5563' : undefined }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
