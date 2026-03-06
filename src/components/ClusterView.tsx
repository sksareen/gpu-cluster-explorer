import { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { ClusterGrid } from './ClusterGrid';
import { GanttChart } from './GanttChart';
import { MetricsPanel } from './MetricsPanel';
import { InsightCallout } from './InsightCallout';
import { SimulationControls } from './SimulationControls';
import { PresetScenario, DEFAULT_WORKLOAD_CONFIG } from '../types';
import { Activity, Zap, Server, ChevronDown, ChevronUp } from 'lucide-react';

const PRESETS: PresetScenario[] = [
  {
    name: 'Normal Load',
    description: 'A healthy cluster with a balanced mix of work',
    icon: 'activity',
    config: { ...DEFAULT_WORKLOAD_CONFIG },
  },
  {
    name: 'Priority Spiral',
    description: '60% of jobs marked urgent — watch the queue grow',
    icon: 'zap',
    config: {
      ...DEFAULT_WORKLOAD_CONFIG,
      urgentPct: 0.6,
      highPct: 0.25,
      normalPct: 0.1,
      lowPct: 0.05,
      arrivalRate: 0.4,
    },
  },
  {
    name: 'Large Job Arrives',
    description: 'A huge 128-GPU training job hits a busy cluster',
    icon: 'server',
    config: {
      ...DEFAULT_WORKLOAD_CONFIG,
      largeJobInjection: { tick: 30, numGPUs: 128, duration: 60 },
    },
  },
];

const PRESET_ICONS: Record<string, typeof Activity> = {
  activity: Activity,
  zap: Zap,
  server: Server,
};

export function ClusterView() {
  const { sim, play, pause, step, setSpeed, setPolicy, reset } = useSimulation();
  const [showDetails, setShowDetails] = useState(false);

  const loadPreset = (preset: PresetScenario) => {
    reset(sim.policy, preset.config);
    setTimeout(() => play(), 100);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Intro context */}
      <div className="max-w-2xl pt-4 pb-2">
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#e2e8f0' }}>
          Live Cluster
        </h2>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Each square is one GPU. Colors show which team is using it.
          Dark squares are idle. Hit play and watch jobs arrive and compete for resources.
        </p>
      </div>

      {/* Controls */}
      <SimulationControls
        running={sim.running}
        speed={sim.speed}
        policy={sim.policy}
        tick={sim.tick}
        onPlay={play}
        onPause={pause}
        onStep={step}
        onReset={() => reset()}
        onSpeedChange={setSpeed}
        onPolicyChange={setPolicy}
      />

      {/* Try a scenario */}
      <div>
        <p className="text-xs mb-2" style={{ color: '#64748b' }}>Try a scenario:</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => {
            const Icon = PRESET_ICONS[preset.icon] ?? Activity;
            return (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:scale-[1.02]"
                style={{ background: '#1a1d2e', border: '1px solid #2d3154', color: '#e2e8f0' }}
              >
                <Icon size={14} />
                <div className="text-left">
                  <div className="font-medium text-xs">{preset.name}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{preset.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <InsightCallout insights={sim.insights} />

      {/* Main content */}
      <div className="flex flex-wrap gap-4">
        {/* Left: Cluster Grid */}
        <div className="flex flex-col gap-4 flex-1 min-w-[400px]">
          <div className="rounded-xl p-4" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
            <ClusterGrid cluster={sim.cluster} runningJobs={sim.runningJobs} />
          </div>
        </div>

        {/* Right: Key Metrics */}
        <div className="w-full lg:w-80">
          <MetricsPanel metrics={sim.metrics} history={sim.metricsHistory} />
        </div>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg self-start transition-colors hover:bg-[#1a1d2e]"
        style={{ color: '#64748b' }}
      >
        {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showDetails ? 'Hide' : 'Show'} job timeline & queue details
      </button>

      {showDetails && (
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[400px] rounded-xl p-4" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: '#94a3b8' }}>
              Job Timeline
              <span className="font-normal ml-2" style={{ color: '#4b5563' }}>
                — colored bars show running jobs, hatched areas show wait time
              </span>
            </h3>
            <GanttChart
              runningJobs={sim.runningJobs}
              completedJobs={sim.completedJobs}
              queue={sim.queue}
              tick={sim.tick}
            />
          </div>

          <div className="w-full lg:w-80 rounded-xl p-4" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
              Running ({sim.runningJobs.length}) &middot; Waiting ({sim.queue.length})
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sim.runningJobs.slice(0, 8).map(job => (
                <div key={job.id} className="flex items-center justify-between text-xs py-1">
                  <span className="truncate" style={{ color: '#e2e8f0' }}>{job.name}</span>
                  <span className="shrink-0 ml-2" style={{ color: '#64748b' }}>{job.numGPUs} GPU</span>
                </div>
              ))}
              {sim.runningJobs.length > 8 && (
                <div className="text-xs" style={{ color: '#64748b' }}>+{sim.runningJobs.length - 8} more</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
