import { useState, useEffect, useRef, ReactNode } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { ClusterGrid } from './components/ClusterGrid';
import { MetricsPanel } from './components/MetricsPanel';
import { SimulationControls } from './components/SimulationControls';
import { InsightCallout } from './components/InsightCallout';
import { PolicyComparison } from './components/PolicyComparison';
import { PriorityEscalationLab } from './components/PriorityEscalationLab';
import { DEFAULT_WORKLOAD_CONFIG, PresetScenario } from './types';
import { Layers, Activity, Zap, Server } from 'lucide-react';

function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
      }}
    >
      {children}
    </div>
  );
}

const STAGES = [
  {
    title: 'This is a GPU cluster',
    body: 'These 256 squares are GPUs — the processors that power AI. Each colored square is busy running a job for one of 5 teams. Dark squares are idle, waiting for work.',
  },
  {
    title: 'Jobs arrive and compete',
    body: 'Every few minutes, new AI jobs show up — training runs that need dozens of GPUs, inference requests that need just a few. The numbers on the right show how the cluster is holding up.',
  },
  {
    title: 'The scheduling rule decides who goes first',
    body: 'Right now it\'s first-come-first-served. But what if shorter jobs went first? Or we shared equally across teams? Try switching the scheduling rule and watch what changes.',
  },
  {
    title: 'What happens under pressure?',
    body: 'Normal conditions are easy. The real test is when things get intense — a giant training job shows up, or everyone marks their work as "urgent." Try a scenario and watch the cluster react.',
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

  const stage = isDesktop ? activeStage : 3; // show everything on mobile

  const loadPreset = (preset: PresetScenario) => {
    sim.reset(sim.sim.policy, preset.config);
    setTimeout(() => sim.play(), 100);
  };

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

      {/* ── Scrollytelling section ── */}
      <div className="lg:flex max-w-[1400px] mx-auto relative">
        {/* Left column — sticky on desktop */}
        <div className="lg:sticky lg:top-[41px] lg:self-start lg:w-[55%] lg:h-[calc(100vh-41px)] lg:overflow-y-auto p-4">
          {/* Mobile-only intro (hidden on desktop where the scroll sections provide it) */}
          <div className="lg:hidden mb-4">
            <h2 className="text-lg font-semibold mb-1" style={{ color: '#e2e8f0' }}>
              This is a GPU cluster
            </h2>
            <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
              Each square is one GPU. Colors show which team is using it. Dark squares are idle.
            </p>
          </div>

          {/* GPU Grid — always visible */}
          <div className="rounded-xl p-4" style={{ background: '#0d0f16', border: '1px solid #2d3154' }}>
            <ClusterGrid cluster={sim.sim.cluster} runningJobs={sim.sim.runningJobs} />
          </div>

          {/* Stage 1+: Metrics */}
          <div
            className="mt-3 transition-all duration-500"
            style={{ opacity: stage >= 1 ? 1 : 0, maxHeight: stage >= 1 ? '500px' : '0', overflow: 'hidden' }}
          >
            <MetricsPanel metrics={sim.sim.metrics} history={sim.sim.metricsHistory} />
          </div>

          {/* Stage 2+: Controls */}
          <div
            className="mt-3 transition-all duration-500"
            style={{ opacity: stage >= 2 ? 1 : 0, maxHeight: stage >= 2 ? '200px' : '0', overflow: 'hidden' }}
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

          {/* Stage 3+: Presets + Insights */}
          <div
            className="mt-3 transition-all duration-500"
            style={{ opacity: stage >= 3 ? 1 : 0, maxHeight: stage >= 3 ? '600px' : '0', overflow: 'hidden' }}
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

        {/* Right column — scroll narrative (desktop only) */}
        <div className="hidden lg:block lg:w-[45%]">
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

      {/* ── Policy Comparison ── */}
      <div className="max-w-[1400px] mx-auto pt-24">
        <ScrollReveal className="px-4 mb-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
              What if we tried a different strategy?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              Same jobs, same arrival order — but two different scheduling rules running side by side.
              Watch how the same workload plays out differently depending on who gets to go first.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <PolicyComparison />
        </ScrollReveal>
      </div>

      {/* ── Priority Escalation ── */}
      <div className="max-w-[1400px] mx-auto pt-24">
        <ScrollReveal className="px-4 mb-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
              What happens when everyone's job is "urgent"?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              Every team thinks their work is the most important. Drag the slider to see what happens
              when more and more jobs get marked as top priority — and how a simple approval step can fix it.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <PriorityEscalationLab />
        </ScrollReveal>
      </div>

      {/* Footer */}
      <ScrollReveal>
        <footer className="px-4 py-16 text-center">
          <p className="text-xs" style={{ color: '#4b5563' }}>
            256 GPUs &middot; 5 teams &middot; Real-time simulation running in your browser
          </p>
        </footer>
      </ScrollReveal>
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
