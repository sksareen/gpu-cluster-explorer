import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { SchedulingPolicy } from '../types';

interface Props {
  running: boolean;
  speed: number;
  policy: SchedulingPolicy;
  tick: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onPolicyChange: (policy: SchedulingPolicy) => void;
}

const POLICIES: { value: SchedulingPolicy; label: string; desc: string }[] = [
  { value: 'fifo', label: 'FIFO', desc: 'First come, first served' },
  { value: 'sjf', label: 'SJF', desc: 'Shortest jobs go first' },
  { value: 'fair-share', label: 'Fair-Share', desc: 'Share equally across teams' },
  { value: 'backfill', label: 'Backfill', desc: 'Fill gaps with small jobs' },
];

export function SimulationControls({
  running, speed, policy, tick,
  onPlay, onPause, onStep, onReset, onSpeedChange, onPolicyChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Playback */}
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#1a1d2e', border: '1px solid #2d3154' }}>
        <button
          onClick={running ? onPause : onPlay}
          className="p-1.5 rounded hover:bg-[#242842] transition-colors"
          title={running ? 'Pause' : 'Play'}
        >
          {running ? <Pause size={16} color="#e2e8f0" /> : <Play size={16} color="#e2e8f0" />}
        </button>
        <button onClick={onStep} className="p-1.5 rounded hover:bg-[#242842] transition-colors" title="Step forward 1 minute">
          <SkipForward size={16} color="#e2e8f0" />
        </button>
        <button onClick={onReset} className="p-1.5 rounded hover:bg-[#242842] transition-colors" title="Reset simulation">
          <RotateCcw size={16} color="#e2e8f0" />
        </button>
      </div>

      {/* Speed */}
      <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: '#1a1d2e', border: '1px solid #2d3154' }}>
        <span className="text-xs" style={{ color: '#64748b' }}>Speed</span>
        {[1, 2, 5, 10].map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${speed === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Policy */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: '#64748b' }}>Scheduling rule:</span>
        <select
          value={policy}
          onChange={e => onPolicyChange(e.target.value as SchedulingPolicy)}
          className="text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
          style={{ background: '#1a1d2e', border: '1px solid #2d3154', color: '#e2e8f0' }}
        >
          {POLICIES.map(p => (
            <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
          ))}
        </select>
      </div>

      {/* Time counter */}
      <span className="text-xs font-mono" style={{ color: '#64748b' }}>{tick} min</span>
    </div>
  );
}
