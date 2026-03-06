import { useRef, useEffect } from 'react';
import { Job, TEAM_COLORS } from '../types';

interface Props {
  runningJobs: Job[];
  completedJobs: Job[];
  queue: Job[];
  tick: number;
  compact?: boolean;
}

export function GanttChart({ runningJobs, completedJobs, queue, tick, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const height = compact ? 120 : 180;
  const width = compact ? 360 : 500;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(0, 0, width, height);

    const barHeight = compact ? 10 : 14;
    const barGap = 2;
    const leftMargin = compact ? 60 : 80;
    const timelineW = width - leftMargin - 10;

    // Show window of time
    const windowSize = 100;
    const startTick = Math.max(0, tick - windowSize);
    const endTick = tick + 20;
    const tickToX = (t: number) => leftMargin + ((t - startTick) / (endTick - startTick)) * timelineW;

    // Draw grid lines
    ctx.strokeStyle = '#242842';
    ctx.lineWidth = 0.5;
    for (let t = Math.ceil(startTick / 10) * 10; t < endTick; t += 10) {
      const x = tickToX(t);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText(`${t}m`, x, height - 2);
    }

    // "Now" line
    const nowX = tickToX(tick);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, height - 14);
    ctx.stroke();
    ctx.setLineDash([]);

    // Collect visible jobs
    const visibleJobs: Job[] = [
      ...runningJobs,
      ...completedJobs.filter(j => (j.endTime ?? 0) > startTick),
      ...queue.slice(0, 5), // show first 5 queued
    ].slice(0, Math.floor((height - 20) / (barHeight + barGap)));

    visibleJobs.forEach((job, i) => {
      const y = 4 + i * (barHeight + barGap);
      const color = TEAM_COLORS[job.team] ?? '#3b82f6';

      // Job label
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${compact ? 8 : 9}px Inter, sans-serif`;
      const label = job.name.length > 10 ? job.name.slice(0, 10) + '..' : job.name;
      ctx.fillText(label, 2, y + barHeight - 2);

      if (job.startTime !== undefined) {
        // Running or completed
        const sx = tickToX(job.startTime);
        const ex = job.endTime ? tickToX(job.endTime) : tickToX(tick);
        const w = Math.max(2, ex - sx);

        // Wait time hatching
        if (job.waitTime && job.waitTime > 0) {
          const waitStart = tickToX(job.arrivalTime);
          const waitEnd = tickToX(job.startTime);
          ctx.fillStyle = '#242842';
          ctx.fillRect(waitStart, y, Math.max(0, waitEnd - waitStart), barHeight);
          // Hatch pattern
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 0.5;
          for (let hx = waitStart; hx < waitEnd; hx += 4) {
            ctx.beginPath();
            ctx.moveTo(hx, y);
            ctx.lineTo(hx + barHeight, y + barHeight);
            ctx.stroke();
          }
        }

        ctx.fillStyle = color;
        ctx.globalAlpha = job.endTime ? 0.5 : 0.9;
        ctx.beginPath();
        ctx.roundRect(sx, y, w, barHeight, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // Queued - show as hollow bar at current tick
        const sx = tickToX(job.arrivalTime);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.strokeRect(sx, y, 20, barHeight);
        ctx.globalAlpha = 1;
      }
    });
  }, [runningJobs, completedJobs, queue, tick, compact, height, width]);

  return (
    <canvas ref={canvasRef} className="rounded" />
  );
}
