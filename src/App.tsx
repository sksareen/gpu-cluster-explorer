import { useState } from 'react';
import { ClusterView } from './components/ClusterView';
import { PolicyComparison } from './components/PolicyComparison';
import { PriorityEscalationLab } from './components/PriorityEscalationLab';
import { Layers } from 'lucide-react';

function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <Landing onStart={() => setStarted(true)} />;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center px-4 py-2"
        style={{ background: '#0f1117ee', borderBottom: '1px solid #2d3154', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-3">
          <Layers size={18} color="#3b82f6" />
          <span className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>GPU Scheduler Explorer</span>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto">
        {/* Section 1: Live Cluster */}
        <ClusterView />

        {/* Section 2: Policy Comparison */}
        <section className="px-4 pt-20 pb-2">
          <div className="max-w-2xl mb-6">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
              What if we tried a different strategy?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              Same jobs, same arrival order — but two different scheduling rules running side by side.
              Watch how the same workload plays out differently depending on who gets to go first.
            </p>
          </div>
        </section>
        <PolicyComparison />

        {/* Section 3: Priority Escalation */}
        <section className="px-4 pt-20 pb-2">
          <div className="max-w-2xl mb-6">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
              What happens when everyone's job is "urgent"?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              Every team thinks their work is the most important. Drag the slider to see what happens
              when more and more jobs get marked as top priority — and how a simple approval step can fix it.
            </p>
          </div>
        </section>
        <PriorityEscalationLab />

        {/* Footer */}
        <footer className="px-4 py-12 text-center">
          <p className="text-xs" style={{ color: '#4b5563' }}>
            256 GPUs &middot; 5 teams &middot; Real-time simulation running in your browser
          </p>
        </footer>
      </main>
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
