import { useState } from 'react';
import { ViewType } from './types';
import { ClusterView } from './components/ClusterView';
import { PolicyComparison } from './components/PolicyComparison';
import { PriorityEscalationLab } from './components/PriorityEscalationLab';
import { Cpu, GitCompare, TrendingDown, ChevronDown, ChevronUp, Layers } from 'lucide-react';

const VIEWS: { id: ViewType; label: string; icon: typeof Cpu; desc: string }[] = [
  { id: 'cluster', label: 'Cluster Explorer', icon: Cpu, desc: 'Visualize GPU allocation in real-time' },
  { id: 'comparison', label: 'Policy Comparison', icon: GitCompare, desc: 'Compare scheduling policies side-by-side' },
  { id: 'escalation', label: 'Priority Lab', icon: TrendingDown, desc: 'Explore the priority escalation spiral' },
];

function App() {
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<ViewType>('cluster');
  const [aboutOpen, setAboutOpen] = useState(false);

  if (!started) {
    return <Landing onStart={() => setStarted(true)} />;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-2"
        style={{ background: '#0f1117ee', borderBottom: '1px solid #2d3154', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-3">
          <Layers size={18} color="#3b82f6" />
          <span className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>GPU Scheduler Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          {VIEWS.map(v => {
            const Icon = v.icon;
            const active = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  active ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            className="ml-2 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          >
            About
          </button>
        </div>
      </nav>

      {/* About drawer */}
      {aboutOpen && <AboutSection onClose={() => setAboutOpen(false)} />}

      {/* View */}
      <main className="max-w-[1400px] mx-auto">
        {view === 'cluster' && <ClusterView />}
        {view === 'comparison' && <PolicyComparison />}
        {view === 'escalation' && <PriorityEscalationLab />}
      </main>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0f1117' }}>
      <div className="max-w-2xl text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Layers size={32} color="#3b82f6" />
          <h1 className="text-3xl font-bold" style={{ color: '#e2e8f0' }}>
            GPU Cluster Scheduling Explorer
          </h1>
        </div>
        <p className="text-base leading-relaxed mb-8" style={{ color: '#94a3b8' }}>
          An interactive tool for understanding GPU scheduling tradeoffs at scale.
          Explore how different scheduling policies handle real-world scenarios —
          priority escalation spirals, hardware heterogeneity, and the bin-packing
          tensions that make compute platform management a uniquely PM-shaped problem.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <div key={v.id} className="rounded-lg p-4 text-left"
                style={{ background: '#1a1d2e', border: '1px solid #2d3154' }}>
                <Icon size={20} color="#3b82f6" className="mb-2" />
                <div className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>{v.label}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>{v.desc}</div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onStart}
          className="px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
        >
          Start Exploring
        </button>

        <p className="mt-6 text-xs" style={{ color: '#64748b' }}>
          256 GPUs across 2 hardware pools | 4 scheduling policies | Real-time simulation
        </p>
      </div>
    </div>
  );
}

function AboutSection({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-b" style={{ background: '#0d0f16', borderColor: '#2d3154' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>About This Tool</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <ChevronUp size={16} />
          </button>
        </div>
        <div className="text-sm leading-relaxed space-y-3" style={{ color: '#94a3b8' }}>
          <p>
            This is a <span style={{ color: '#e2e8f0' }}>decision-support tool</span> for GPU cluster scheduling,
            built to make the core tradeoffs in compute platform management visible and intuitive.
            It's not a production scheduler — it's a PM artifact that demonstrates how scheduling
            decisions affect utilization, fairness, and wait times.
          </p>
          <p>
            <span style={{ color: '#e2e8f0' }}>The priority escalation insight</span> is the key differentiator.
            Most scheduler visualizations model algorithms. This one models <em>human behavior</em>:
            what happens when every team marks their jobs as urgent, and how governance mechanisms
            (approval gates) restore signal to the priority system. This is a tragedy-of-the-commons
            problem, not an algorithms problem.
          </p>
          <p>
            <span style={{ color: '#e2e8f0' }}>Hardware heterogeneity</span> is modeled explicitly:
            128 training GPUs (high interconnect, NVLink) and 128 inference GPUs (high memory).
            This creates the bin-packing tension that makes real cluster management hard — a 64-GPU
            training job can be blocked by the wrong GPU pool being full, even when the other pool
            has capacity.
          </p>
          <p>
            <span style={{ color: '#e2e8f0' }}>The comparison view</span> is designed for the way
            leadership actually evaluates decisions: not dashboards of metrics, but "if we do A,
            here's what happens vs B." Same workload, different policies, quantified deltas.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
