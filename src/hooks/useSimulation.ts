import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationState, WorkloadConfig, SchedulingPolicy, DEFAULT_WORKLOAD_CONFIG } from '../types';
import { createSimulation, tickSimulation, SimContext } from '../simulation/engine';

export function useSimulation(
  initialPolicy: SchedulingPolicy = 'fifo',
  initialConfig: WorkloadConfig = DEFAULT_WORKLOAD_CONFIG,
  seed: number = 42,
) {
  const ctxRef = useRef<SimContext>(null!);
  const [sim, setSim] = useState<SimulationState>(() => {
    const { sim: s, ctx } = createSimulation(initialPolicy, initialConfig, seed);
    ctxRef.current = ctx;
    return s;
  });

  const simRef = useRef(sim);
  simRef.current = sim;

  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const tick = useCallback(() => {
    setSim(prev => tickSimulation(prev, ctxRef.current));
  }, []);

  const play = useCallback(() => {
    setSim(prev => ({ ...prev, running: true }));
  }, []);

  const pause = useCallback(() => {
    setSim(prev => ({ ...prev, running: false }));
  }, []);

  const step = useCallback(() => {
    setSim(prev => {
      const next = tickSimulation(prev, ctxRef.current);
      return { ...next, running: false };
    });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setSim(prev => ({ ...prev, speed }));
  }, []);

  const setPolicy = useCallback((policy: SchedulingPolicy) => {
    setSim(prev => ({ ...prev, policy }));
  }, []);

  const reset = useCallback((policy?: SchedulingPolicy, config?: WorkloadConfig, newSeed?: number) => {
    const p = policy ?? simRef.current.policy;
    const c = config ?? initialConfig;
    const s = newSeed ?? seed;
    const { sim: fresh, ctx } = createSimulation(p, c, s);
    ctxRef.current = ctx;
    setSim(fresh);
  }, [initialConfig, seed]);

  // Animation loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      const current = simRef.current;
      if (current.running) {
        const interval = Math.max(16, 200 / current.speed);
        if (timestamp - lastTickRef.current >= interval) {
          lastTickRef.current = timestamp;
          setSim(prev => tickSimulation(prev, ctxRef.current));
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return { sim, tick, play, pause, step, setSpeed, setPolicy, reset };
}
