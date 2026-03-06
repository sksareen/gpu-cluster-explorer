import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkloadConfig, DEFAULT_WORKLOAD_CONFIG, SchedulingPolicy } from '../types';
import { createSimulation, tickSimulation } from '../simulation/engine';
import { Shield, TrendingUp } from 'lucide-react';

interface DataPoint {
  urgentPct: number;
  avgWaitAll: number;
  avgWaitUrgent: number;
  avgWaitNormal: number;
  utilization: number;
}

export function PriorityEscalationLab() {
  const [urgentPct, setUrgentPct] = useState(10);
  const [requireApproval, setRequireApproval] = useState(false);
  const [data, setData] = useState<DataPoint[]>([]);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef(false);

  const runSweep = useCallback(async () => {
    setRunning(true);
    abortRef.current = false;
    const results: DataPoint[] = [];

    for (let pct = 0; pct <= 100; pct += 5) {
      if (abortRef.current) break;

      const config: WorkloadConfig = {
        ...DEFAULT_WORKLOAD_CONFIG,
        urgentPct: pct / 100,
        highPct: Math.max(0.05, (100 - pct) / 300),
        normalPct: Math.max(0.05, (100 - pct) / 200),
        lowPct: Math.max(0.05, (100 - pct) / 600),
        arrivalRate: 0.35,
        requireApproval,
      };

      const policy: SchedulingPolicy = 'fifo';
      let { sim, ctx } = createSimulation(policy, config, 42);

      // Run 200 ticks
      for (let t = 0; t < 200; t++) {
        sim = tickSimulation(sim, ctx);
      }

      const completed = sim.completedJobs;
      const allWaits = completed.filter(j => j.waitTime !== undefined).map(j => j.waitTime!);
      const urgentWaits = completed.filter(j => j.priority === 'urgent' && j.waitTime !== undefined).map(j => j.waitTime!);
      const normalWaits = completed.filter(j => j.priority === 'normal' && j.waitTime !== undefined).map(j => j.waitTime!);

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      results.push({
        urgentPct: pct,
        avgWaitAll: avg(allWaits),
        avgWaitUrgent: avg(urgentWaits),
        avgWaitNormal: avg(normalWaits),
        utilization: sim.metrics.utilization,
      });

      setData([...results]);

      // Yield to UI
      await new Promise(r => setTimeout(r, 10));
    }

    setRunning(false);
  }, [requireApproval]);

  // Auto-run on mount and when approval changes
  useEffect(() => {
    runSweep();
    return () => { abortRef.current = true; };
  }, [runSweep]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = 600;
    const h = 300;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(0, 0, w, h);

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;

    const maxWait = Math.max(...data.map(d => Math.max(d.avgWaitAll, d.avgWaitUrgent, d.avgWaitNormal)), 1);

    const xScale = (pct: number) => margin.left + (pct / 100) * plotW;
    const yScale = (val: number) => margin.top + plotH - (val / maxWait) * plotH;

    // Grid
    ctx.strokeStyle = '#242842';
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= 4; y++) {
      const yy = margin.top + (y / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(margin.left, yy);
      ctx.lineTo(w - margin.right, yy);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxWait * (1 - y / 4)).toFixed(0)} min`, margin.left - 8, yy + 4);
    }

    // X-axis
    ctx.textAlign = 'center';
    for (let x = 0; x <= 100; x += 20) {
      ctx.fillText(`${x}%`, xScale(x), h - margin.bottom + 16);
    }
    ctx.fillText('% of jobs marked urgent', w / 2, h - 4);
    ctx.textAlign = 'right';
    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Avg Wait (min)', 0, 0);
    ctx.restore();

    // Draw lines
    const drawLine = (key: keyof DataPoint, color: string, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = xScale(d.urgentPct);
        const y = yScale(d[key] as number);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine('avgWaitAll', '#94a3b8', []);
    drawLine('avgWaitUrgent', '#ef4444', []);
    drawLine('avgWaitNormal', '#3b82f6', [4, 3]);

    // Current position marker
    const currentData = data.find(d => d.urgentPct === urgentPct);
    if (currentData) {
      const cx = xScale(urgentPct);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, margin.top);
      ctx.lineTo(cx, margin.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dots
      [currentData.avgWaitUrgent, currentData.avgWaitNormal, currentData.avgWaitAll].forEach((val, i) => {
        const colors = ['#ef4444', '#3b82f6', '#94a3b8'];
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(cx, yScale(val), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Legend
    const legend = [
      { label: 'Urgent jobs', color: '#ef4444', dash: false },
      { label: 'Normal jobs', color: '#3b82f6', dash: true },
      { label: 'All jobs', color: '#94a3b8', dash: false },
    ];
    legend.forEach((item, i) => {
      const lx = margin.left + 10 + i * 120;
      const ly = margin.top + 10;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.setLineDash(item.dash ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 20, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, lx + 24, ly + 4);
    });
  }, [data, urgentPct]);

  const currentData = data.find(d => d.urgentPct === urgentPct);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-xl p-6" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
        {/* Slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              Jobs marked as "urgent": <span className="text-amber-400 font-bold">{urgentPct}%</span>
            </span>
            <span className="text-xs" style={{ color: '#64748b' }}>
              {urgentPct < 20 ? 'Healthy — urgent lane works' : urgentPct < 50 ? 'Degrading — urgent losing its edge' : urgentPct < 80 ? 'Spiral forming — everyone waits longer' : 'Collapsed — "urgent" means nothing'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={urgentPct}
            onChange={e => setUrgentPct(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #22c55e 0%, #f59e0b 40%, #ef4444 70%, #7f1d1d 100%)`,
            }}
          />
        </div>

        {/* Chart */}
        <div className="relative">
          <canvas ref={canvasRef} className="rounded" />
          {running && (
            <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300">Calculating...</span>
          )}
        </div>

        {/* Current values */}
        {currentData && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <StatBox label="Urgent jobs wait" value={currentData.avgWaitUrgent.toFixed(1)} unit="min" color="#ef4444" />
            <StatBox label="Normal jobs wait" value={currentData.avgWaitNormal.toFixed(1)} unit="min" color="#3b82f6" />
            <StatBox label="Everyone waits" value={currentData.avgWaitAll.toFixed(1)} unit="min" color="#94a3b8" />
          </div>
        )}
      </div>

      {/* Approval Gate */}
      <div className="rounded-xl p-6" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} color="#22c55e" />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>The Fix: Require Approval for Urgent</h3>
            <p className="text-xs" style={{ color: '#64748b' }}>
              What if teams need manager sign-off to mark a job as urgent? Only ~20% get approved.
            </p>
          </div>
        </div>

        <button
          onClick={() => setRequireApproval(!requireApproval)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            requireApproval
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}
        >
          <Shield size={14} />
          {requireApproval ? 'Approval Gate ON — watch wait times drop' : 'Enable Approval Gate'}
        </button>

        {requireApproval && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: '#0c2912', border: '1px solid #166534' }}>
            <TrendingUp size={14} color="#22c55e" className="mt-0.5 shrink-0" />
            <span style={{ color: '#e2e8f0' }}>
              With approval, most "urgent" requests get downgraded. The urgent lane
              works again, and <em>everyone's</em> wait time goes down.
            </span>
          </div>
        )}
      </div>

      {/* Takeaway */}
      <div className="rounded-xl p-6" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: '#f59e0b' }}>Why does this happen?</h3>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          It's a <span style={{ color: '#e2e8f0' }}>tragedy of the commons</span>. Each team marks their jobs urgent because
          it reduces <em>their</em> wait time — until everyone does the same thing. Then "urgent" just means "normal"
          and the fast lane disappears. Adding a small approval step (friction) makes teams think twice, which
          restores the signal that makes priority systems work.
        </p>
      </div>
    </div>
  );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#1a1d2e', border: '1px solid #2d3154' }}>
      <div className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</div>
      <div className="font-semibold" style={{ color }}>{value} <span className="text-xs font-normal" style={{ color: '#64748b' }}>{unit}</span></div>
    </div>
  );
}
