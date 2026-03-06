import { useState, useCallback } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { ClusterGrid } from './ClusterGrid';
import { MetricsPanel } from './MetricsPanel';
import { GanttChart } from './GanttChart';
import { SchedulingPolicy, DEFAULT_WORKLOAD_CONFIG } from '../types';
import { Play, Pause, RotateCcw, ArrowUpDown } from 'lucide-react';

const POLICIES: { value: SchedulingPolicy; label: string }[] = [
  { value: 'fifo', label: 'First come, first served' },
  { value: 'sjf', label: 'Shortest jobs first' },
  { value: 'fair-share', label: 'Share equally across teams' },
  { value: 'backfill', label: 'Fill gaps with small jobs' },
];

const SHARED_SEED = 12345;

export function PolicyComparison() {
  const [policyA, setPolicyA] = useState<SchedulingPolicy>('fifo');
  const [policyB, setPolicyB] = useState<SchedulingPolicy>('backfill');

  const simA = useSimulation(policyA, DEFAULT_WORKLOAD_CONFIG, SHARED_SEED);
  const simB = useSimulation(policyB, DEFAULT_WORKLOAD_CONFIG, SHARED_SEED);

  const playBoth = useCallback(() => { simA.play(); simB.play(); }, [simA, simB]);
  const pauseBoth = useCallback(() => { simA.pause(); simB.pause(); }, [simA, simB]);
  const stepBoth = useCallback(() => { simA.step(); simB.step(); }, [simA, simB]);
  const resetBoth = useCallback(() => {
    simA.reset(policyA, DEFAULT_WORKLOAD_CONFIG, SHARED_SEED);
    simB.reset(policyB, DEFAULT_WORKLOAD_CONFIG, SHARED_SEED);
  }, [simA, simB, policyA, policyB]);

  const running = simA.sim.running || simB.sim.running;

  const changePolicyA = (p: SchedulingPolicy) => {
    setPolicyA(p);
    simA.reset(p, DEFAULT_WORKLOAD_CONFIG, SHARED_SEED);
  };
  const changePolicyB = (p: SchedulingPolicy) => {
    setPolicyB(p);
    simB.reset(p, DEFAULT_WORKLOAD_CONFIG, SHARED_SEED);
  };

  // Delta calculations
  const utilDelta = simA.sim.metrics.utilization - simB.sim.metrics.utilization;
  const waitDelta = simA.sim.metrics.avgWaitTime - simB.sim.metrics.avgWaitTime;
  const fairDelta = simA.sim.metrics.fairnessIndex - simB.sim.metrics.fairnessIndex;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#1a1d2e', border: '1px solid #2d3154' }}>
          <button onClick={running ? pauseBoth : playBoth} className="p-1.5 rounded hover:bg-[#242842]">
            {running ? <Pause size={16} color="#e2e8f0" /> : <Play size={16} color="#e2e8f0" />}
          </button>
          <button onClick={stepBoth} className="p-1.5 rounded hover:bg-[#242842]" title="Step forward 1 minute">
            <ArrowUpDown size={16} color="#e2e8f0" />
          </button>
          <button onClick={resetBoth} className="p-1.5 rounded hover:bg-[#242842]" title="Reset both">
            <RotateCcw size={16} color="#e2e8f0" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => { simA.setSpeed(s); simB.setSpeed(s); }}
              className={`text-xs px-2 py-0.5 rounded ${simA.sim.speed === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {s}x
            </button>
          ))}
        </div>

        <span className="text-xs font-mono" style={{ color: '#64748b' }}>{simA.sim.tick} min</span>
      </div>

      {/* Delta highlights */}
      {simA.sim.tick > 10 && (
        <div className="flex flex-wrap gap-3">
          <DeltaBadge
            label="Utilization"
            valueA={`${(simA.sim.metrics.utilization * 100).toFixed(0)}%`}
            valueB={`${(simB.sim.metrics.utilization * 100).toFixed(0)}%`}
            delta={utilDelta}
            format={v => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`}
            positiveIsGood={true}
          />
          <DeltaBadge
            label="Avg Wait"
            valueA={`${simA.sim.metrics.avgWaitTime.toFixed(1)} min`}
            valueB={`${simB.sim.metrics.avgWaitTime.toFixed(1)} min`}
            delta={waitDelta}
            format={v => `${v > 0 ? '+' : ''}${v.toFixed(1)} min`}
            positiveIsGood={false}
          />
          <DeltaBadge
            label="Fairness"
            valueA={simA.sim.metrics.fairnessIndex.toFixed(2)}
            valueB={simB.sim.metrics.fairnessIndex.toFixed(2)}
            delta={fairDelta}
            format={v => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
            positiveIsGood={true}
          />
        </div>
      )}

      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PolicyPanel
          label="Strategy A"
          policy={policyA}
          onPolicyChange={changePolicyA}
          sim={simA.sim}
          policies={POLICIES}
        />
        <PolicyPanel
          label="Strategy B"
          policy={policyB}
          onPolicyChange={changePolicyB}
          sim={simB.sim}
          policies={POLICIES}
        />
      </div>
    </div>
  );
}

function PolicyPanel({ label, policy, onPolicyChange, sim, policies }: {
  label: string;
  policy: SchedulingPolicy;
  onPolicyChange: (p: SchedulingPolicy) => void;
  sim: ReturnType<typeof useSimulation>['sim'];
  policies: { value: SchedulingPolicy; label: string }[];
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>{label}</span>
        <select
          value={policy}
          onChange={e => onPolicyChange(e.target.value as SchedulingPolicy)}
          className="text-sm rounded px-2 py-1 outline-none"
          style={{ background: '#1a1d2e', border: '1px solid #2d3154', color: '#e2e8f0' }}
        >
          {policies.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <ClusterGrid cluster={sim.cluster} runningJobs={sim.runningJobs} compact />
      <div className="mt-3">
        <MetricsPanel metrics={sim.metrics} history={sim.metricsHistory} compact />
      </div>
      <div className="mt-3">
        <GanttChart
          runningJobs={sim.runningJobs}
          completedJobs={sim.completedJobs}
          queue={sim.queue}
          tick={sim.tick}
          compact
        />
      </div>
    </div>
  );
}

function DeltaBadge({ label, valueA, valueB, delta, format, positiveIsGood }: {
  label: string; valueA: string; valueB: string; delta: number; format: (v: number) => string; positiveIsGood: boolean;
}) {
  const isGood = positiveIsGood ? delta > 0 : delta < 0;
  const color = Math.abs(delta) < 0.01 ? '#64748b' : isGood ? '#22c55e' : '#ef4444';
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#1a1d2e', border: '1px solid #2d3154' }}>
      <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{valueA} vs {valueB}</span>
      <span className="text-xs font-bold" style={{ color }}>({format(delta)})</span>
    </div>
  );
}
