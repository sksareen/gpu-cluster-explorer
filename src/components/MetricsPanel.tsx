import { useRef, useEffect } from 'react';
import { Metrics, MetricsHistory } from '../types';

interface Props {
  metrics: Metrics;
  history: MetricsHistory;
  compact?: boolean;
}

function Sparkline({ data, color, height = 32, width = 80 }: { data: number[]; color: string; height?: number; width?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, width, height);

    const max = Math.max(...data, 0.01);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const step = width / (data.length - 1);
    data.forEach((val, i) => {
      const x = i * step;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color + '15';
    ctx.fill();
  }, [data, color, height, width]);

  return <canvas ref={canvasRef} />;
}

function MetricCard({ label, value, unit, hint, sparkData, color, compact }: {
  label: string; value: string; unit?: string; hint?: string; sparkData: number[]; color: string; compact?: boolean;
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#1a1d2e', border: '1px solid #2d3154' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
        {unit && <span className="text-xs" style={{ color: '#64748b' }}>{unit}</span>}
      </div>
      <div className="flex items-end justify-between">
        <span className={`font-semibold ${compact ? 'text-lg' : 'text-xl'}`} style={{ color }}>{value}</span>
        <Sparkline data={sparkData} color={color} height={compact ? 24 : 32} width={compact ? 60 : 80} />
      </div>
      {hint && !compact && (
        <div className="text-xs mt-1" style={{ color: '#4b5563' }}>{hint}</div>
      )}
    </div>
  );
}

export function MetricsPanel({ metrics, history, compact = false }: Props) {
  const utilizationHint = metrics.utilization > 0.8 ? 'Cluster is busy' : metrics.utilization > 0.5 ? 'Moderate load' : 'Lots of idle GPUs';
  const waitHint = metrics.avgWaitTime < 10 ? 'Jobs start quickly' : metrics.avgWaitTime < 30 ? 'Some jobs are waiting' : 'Long waits — cluster congested';
  const fairnessHint = metrics.fairnessIndex > 0.8 ? 'Resources shared fairly' : metrics.fairnessIndex > 0.5 ? 'Some teams getting more' : 'Very unequal sharing';

  return (
    <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3'}`}>
      <MetricCard
        label="GPU Utilization"
        value={`${(metrics.utilization * 100).toFixed(0)}%`}
        hint={utilizationHint}
        sparkData={history.utilization}
        color={metrics.utilization > 0.8 ? '#22c55e' : metrics.utilization > 0.5 ? '#f59e0b' : '#ef4444'}
        compact={compact}
      />
      <MetricCard
        label="Avg Wait"
        value={metrics.avgWaitTime.toFixed(1)}
        unit="min"
        hint={waitHint}
        sparkData={history.avgWaitTime}
        color={metrics.avgWaitTime < 10 ? '#22c55e' : metrics.avgWaitTime < 30 ? '#f59e0b' : '#ef4444'}
        compact={compact}
      />
      <MetricCard
        label="Jobs Waiting"
        value={`${metrics.queueDepth}`}
        hint={metrics.queueDepth === 0 ? 'No queue' : `${metrics.queueDepth} jobs in line`}
        sparkData={history.queueDepth}
        color={metrics.queueDepth < 5 ? '#22c55e' : metrics.queueDepth < 15 ? '#f59e0b' : '#ef4444'}
        compact={compact}
      />
      <MetricCard
        label="Fairness"
        value={metrics.fairnessIndex.toFixed(2)}
        hint={fairnessHint}
        sparkData={history.fairnessIndex}
        color={metrics.fairnessIndex > 0.8 ? '#22c55e' : metrics.fairnessIndex > 0.5 ? '#f59e0b' : '#ef4444'}
        compact={compact}
      />
      {!compact && (
        <>
          <MetricCard
            label="Training GPUs"
            value={`${(metrics.trainingUtilization * 100).toFixed(0)}%`}
            sparkData={history.utilization}
            color="#3b82f6"
            compact={compact}
          />
          <MetricCard
            label="Inference GPUs"
            value={`${(metrics.inferenceUtilization * 100).toFixed(0)}%`}
            sparkData={history.utilization}
            color="#a855f7"
            compact={compact}
          />
        </>
      )}
    </div>
  );
}
