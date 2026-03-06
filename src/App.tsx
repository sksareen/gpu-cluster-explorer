import { useState, useEffect, useRef } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { ClusterGrid } from './components/ClusterGrid';
import { MetricsPanel } from './components/MetricsPanel';
import { SimulationControls } from './components/SimulationControls';
import { InsightCallout } from './components/InsightCallout';
import { PolicyComparison } from './components/PolicyComparison';
import { PriorityEscalationLab } from './components/PriorityEscalationLab';
import { DEFAULT_WORKLOAD_CONFIG, PresetScenario } from './types';
import { Layers, Activity, Zap, Server, ChevronDown } from 'lucide-react';

// ── Scroll stages ──
// Stages 0-3: cluster chapter (sticky panel = GPU grid + progressive controls)
// Stage 4: comparison chapter (sticky panel = side-by-side policy comparison)
// Stage 5: priority chapter (sticky panel = escalation lab)

const STAGES = [
  {
    title: 'This is a GPU cluster',
    body: 'These 256 squares are GPUs — the processors that power AI. Each colored square is busy running a job for one of 5 teams. Dark squares are idle, waiting for work.',
  },
  {
    title: 'Jobs arrive and compete',
    body: 'Every few minutes, new AI jobs show up — training runs that need dozens of GPUs, inference requests that need just a few. The numbers on the left show how the cluster is holding up.',
  },
  {
    title: 'The scheduling rule decides who goes first',
    body: 'Right now it\'s first-come-first-served. But what if shorter jobs went first? Or we shared equally across teams? Try switching the scheduling rule and watch what changes.',
  },
  {
    title: 'What happens under pressure?',
    body: 'Normal conditions are easy. The real test is when things get intense — a giant training job shows up, or everyone marks their work as "urgent." Try a scenario and watch the cluster react.',
  },
  {
    title: 'What if we tried a different strategy?',
    body: 'Same jobs, same arrival order — but two different scheduling rules running side by side. Watch how the same workload plays out differently depending on who gets to go first.',
  },
  {
    title: 'What happens when everyone\'s job is "urgent"?',
    body: 'Every team thinks their work is the most important. Drag the slider to see what happens when more and more jobs get marked as top priority — and how a simple approval step can fix it.',
  },
];

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

function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <Landing onStart={() => setStarted(true)} />;
  }

  return <ScrollExperience />;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isDesktop;
}

function ScrollExperience() {
  const sim = useSimulation();
  const [activeStage, setActiveStage] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isDesktop = useIsDesktop();

  // Auto-play on mount
  useEffect(() => {
    sim.play();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection Observer for scroll-triggered stages (desktop only)
  useEffect(() => {
    if (!isDesktop) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = sectionRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) {
              setActiveStage(index);
            }
          }
        }
      },
      { threshold: 0.4, rootMargin: '-30% 0px -30% 0px' },
    );

    sectionRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [isDesktop]);

  // Determine which chapter the sticky panel shows
  const chapter: 'cluster' | 'comparison' | 'priority' =
    activeStage <= 3 ? 'cluster' : activeStage === 4 ? 'comparison' : 'priority';

  const clusterStage = isDesktop ? Math.min(activeStage, 3) : 3;

  const loadPreset = (preset: PresetScenario) => {
    sim.reset(sim.sim.policy, preset.config);
    setTimeout(() => sim.play(), 100);
  };

  const [showScrollHint, setShowScrollHint] = useState(true);

  // Hide scroll hint after user scrolls
  useEffect(() => {
    const handler = () => {
      if (window.scrollY > 80) setShowScrollHint(false);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 flex items-center px-4 py-2"
        style={{ background: '#0f1117ee', borderBottom: '1px solid #2d3154', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3">
          <Layers size={18} color="#3b82f6" />
          <span className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>GPU Scheduler Explorer</span>
        </div>
      </nav>

      {/* Scroll hint — fades out after first scroll */}
      <div
        className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex-col items-center gap-1 transition-opacity duration-700"
        style={{ opacity: showScrollHint ? 1 : 0, pointerEvents: 'none' }}
      >
        <span className="text-xs" style={{ color: '#64748b' }}>Scroll to explore</span>
        <ChevronDown size={16} color="#64748b" className="animate-bounce" />
      </div>

      {/* Progress dots — desktop only */}
      <div className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-2">
        {STAGES.map((s, i) => (
          <button
            key={i}
            onClick={() => sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="group relative flex items-center"
            title={s.title}
          >
            <div
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: activeStage === i ? '#3b82f6' : activeStage > i ? '#3b82f680' : '#2d3154',
                transform: activeStage === i ? 'scale(1.5)' : 'scale(1)',
              }}
            />
            {/* Tooltip on hover */}
            <span
              className="absolute right-5 whitespace-nowrap text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: '#1a1d2e', border: '1px solid #2d3154', color: '#e2e8f0' }}
            >
              {s.title}
            </span>
          </button>
        ))}
      </div>

      {/* ── Desktop: scrollytelling two-column layout ── */}
      <div className="hidden lg:flex max-w-[1400px] mx-auto relative">
        {/* Left column — sticky panel that swaps content by chapter */}
        <div className="sticky top-[41px] self-start w-[55%] h-[calc(100vh-41px)] overflow-y-auto p-4">
          {/* Chapter 1: Cluster grid with progressive controls */}
          <div
            className="transition-opacity duration-500"
            style={{
              opacity: chapter === 'cluster' ? 1 : 0,
              pointerEvents: chapter === 'cluster' ? 'auto' : 'none',
              position: chapter === 'cluster' ? 'relative' : 'absolute',
              top: chapter === 'cluster' ? undefined : 0,
              left: chapter === 'cluster' ? undefined : 0,
              right: chapter === 'cluster' ? undefined : 0,
            }}
          >
            <div className="rounded-xl p-4" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
              <ClusterGrid cluster={sim.sim.cluster} runningJobs={sim.sim.runningJobs} />
            </div>

            <div
              className="mt-3 transition-all duration-500"
              style={{ opacity: clusterStage >= 1 ? 1 : 0, maxHeight: clusterStage >= 1 ? '500px' : '0', overflow: 'hidden' }}
            >
              <MetricsPanel metrics={sim.sim.metrics} history={sim.sim.metricsHistory} />
            </div>

            <div
              className="mt-3 transition-all duration-500"
              style={{ opacity: clusterStage >= 2 ? 1 : 0, maxHeight: clusterStage >= 2 ? '200px' : '0', overflow: 'hidden' }}
            >
              <SimulationControls
                running={sim.sim.running}
                speed={sim.sim.speed}
                policy={sim.sim.policy}
                tick={sim.sim.tick}
                onPlay={sim.play}
                onPause={sim.pause}
                onStep={sim.step}
                onReset={() => sim.reset()}
                onSpeedChange={sim.setSpeed}
                onPolicyChange={sim.setPolicy}
              />
            </div>

            <div
              className="mt-3 transition-all duration-500"
              style={{ opacity: clusterStage >= 3 ? 1 : 0, maxHeight: clusterStage >= 3 ? '600px' : '0', overflow: 'hidden' }}
            >
              <InsightCallout insights={sim.sim.insights} />
              <div className="mt-3">
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
            </div>
          </div>

          {/* Chapter 2: Policy Comparison */}
          <div
            className="transition-opacity duration-500"
            style={{
              opacity: chapter === 'comparison' ? 1 : 0,
              pointerEvents: chapter === 'comparison' ? 'auto' : 'none',
              position: chapter === 'comparison' ? 'relative' : 'absolute',
              top: chapter === 'comparison' ? undefined : 0,
              left: chapter === 'comparison' ? undefined : 0,
              right: chapter === 'comparison' ? undefined : 0,
            }}
          >
            <PolicyComparison />
          </div>

          {/* Chapter 3: Priority Escalation */}
          <div
            className="transition-opacity duration-500"
            style={{
              opacity: chapter === 'priority' ? 1 : 0,
              pointerEvents: chapter === 'priority' ? 'auto' : 'none',
              position: chapter === 'priority' ? 'relative' : 'absolute',
              top: chapter === 'priority' ? undefined : 0,
              left: chapter === 'priority' ? undefined : 0,
              right: chapter === 'priority' ? undefined : 0,
            }}
          >
            <PriorityEscalationLab />
          </div>
        </div>

        {/* Right column — scroll narrative */}
        <div className="w-[45%]">
          {STAGES.map((s, i) => (
            <div
              key={i}
              ref={el => { sectionRefs.current[i] = el; }}
              className="min-h-[80vh] flex items-center px-8"
            >
              <div
                className="max-w-md transition-all duration-700"
                style={{
                  opacity: activeStage >= i ? 1 : 0.15,
                  transform: activeStage >= i ? 'translateY(0)' : 'translateY(20px)',
                }}
              >
                <h2 className="text-xl font-semibold mb-3" style={{ color: '#e2e8f0' }}>
                  {s.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile: linear layout ── */}
      <div className="lg:hidden max-w-[1400px] mx-auto">
        {/* Cluster section */}
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1" style={{ color: '#e2e8f0' }}>
              This is a GPU cluster
            </h2>
            <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
              Each square is one GPU. Colors show which team is using it. Dark squares are idle.
            </p>
          </div>

          <div className="rounded-xl p-4 mb-3" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
            <ClusterGrid cluster={sim.sim.cluster} runningJobs={sim.sim.runningJobs} />
          </div>
          <MetricsPanel metrics={sim.sim.metrics} history={sim.sim.metricsHistory} />
          <div className="mt-3">
            <SimulationControls
              running={sim.sim.running}
              speed={sim.sim.speed}
              policy={sim.sim.policy}
              tick={sim.sim.tick}
              onPlay={sim.play}
              onPause={sim.pause}
              onStep={sim.step}
              onReset={() => sim.reset()}
              onSpeedChange={sim.setSpeed}
              onPolicyChange={sim.setPolicy}
            />
          </div>
          <div className="mt-3">
            <InsightCallout insights={sim.sim.insights} />
            <div className="mt-3">
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
          </div>
        </div>

        {/* Comparison section */}
        <div className="p-4 pt-12">
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
            What if we tried a different strategy?
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
            Same jobs, same arrival order — two different rules side by side.
          </p>
          <PolicyComparison />
        </div>

        {/* Priority section */}
        <div className="p-4 pt-12">
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
            What happens when everyone's job is "urgent"?
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
            Drag the slider to see the tragedy of the commons unfold.
          </p>
          <PriorityEscalationLab />
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-16 text-center">
        <p className="text-xs" style={{ color: '#4b5563' }}>
          256 GPUs &middot; 5 teams &middot; Real-time simulation running in your browser
        </p>
      </footer>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0f1117' }}>
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold leading-tight mb-6" style={{ color: '#e2e8f0' }}>
          When you send a prompt to an AI,<br />
          hundreds of GPUs have to decide<br />
          who goes first.
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: '#94a3b8' }}>
          Training runs, inference requests, research experiments —{' '}
          all competing for the same hardware. This is what that looks like.
        </p>

        <button
          onClick={onStart}
          className="px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
        >
          Start Exploring
        </button>
      </div>
    </div>
  );
}

export default App;
