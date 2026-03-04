import { SimulationState, WorkloadConfig, SchedulingPolicy, ClusterState, TEAMS } from '../types';
import { createCluster, freeGPUs } from './cluster';
import { scheduleJobs } from './scheduler';
import { generateJobs, resetJobCounter } from './workload';
import { computeMetrics } from './metrics';
import { detectInsights, resetInsightCounter } from './insights';
import { SeededRandom } from '../lib/math';

export interface SimContext {
  rng: SeededRandom;
  config: WorkloadConfig;
  teamGpuHours: Map<string, number>;
}

export function createSimulation(
  policy: SchedulingPolicy,
  config: WorkloadConfig,
  seed: number = 42,
): { sim: SimulationState; ctx: SimContext } {
  resetJobCounter();
  resetInsightCounter();
  const cluster = createCluster();
  const metrics = computeMetrics(0, cluster, [], [], [], new Map());
  const sim: SimulationState = {
    tick: 0,
    cluster,
    runningJobs: [],
    queue: [],
    completedJobs: [],
    metrics,
    metricsHistory: { utilization: [], avgWaitTime: [], queueDepth: [], fairnessIndex: [] },
    insights: [],
    policy,
    speed: 1,
    running: false,
  };
  const ctx: SimContext = {
    rng: new SeededRandom(seed),
    config,
    teamGpuHours: new Map(TEAMS.map(t => [t, 0])),
  };
  return { sim, ctx };
}

export function tickSimulation(sim: SimulationState, ctx: SimContext): SimulationState {
  const { rng, config, teamGpuHours } = ctx;
  const next = { ...sim };
  next.tick = sim.tick + 1;

  // Deep copy cluster
  next.cluster = deepCopyCluster(sim.cluster);

  // 1. Complete finished jobs
  next.runningJobs = [];
  next.completedJobs = [...sim.completedJobs];

  for (const job of sim.runningJobs) {
    const effectiveDuration = Math.ceil(job.duration * (job.topologyPenalty ?? 1));
    if (next.tick - job.startTime! >= effectiveDuration) {
      freeGPUs(next.cluster, job.allocatedGPUs!);
      job.endTime = next.tick;
      next.completedJobs.push(job);
    } else {
      next.runningJobs.push(job);
      // Track GPU-hours
      const hours = teamGpuHours.get(job.team) ?? 0;
      teamGpuHours.set(job.team, hours + job.numGPUs);
    }
  }

  // 2. Generate new jobs
  const newJobs = generateJobs(rng, next.tick, config);
  next.queue = [...sim.queue, ...newJobs];

  // 3. Schedule jobs from queue
  const { scheduled, remaining } = scheduleJobs(
    next.queue,
    next.cluster,
    sim.policy,
    next.tick,
    teamGpuHours,
  );

  next.runningJobs = [...next.runningJobs, ...scheduled];
  next.queue = remaining;

  // 4. Compute metrics
  next.metrics = computeMetrics(
    next.tick,
    next.cluster,
    next.runningJobs,
    next.queue,
    next.completedJobs,
    teamGpuHours,
  );

  // 5. Update history (keep last 100)
  const h = sim.metricsHistory;
  next.metricsHistory = {
    utilization: [...h.utilization.slice(-99), next.metrics.utilization],
    avgWaitTime: [...h.avgWaitTime.slice(-99), next.metrics.avgWaitTime],
    queueDepth: [...h.queueDepth.slice(-99), next.metrics.queueDepth],
    fairnessIndex: [...h.fairnessIndex.slice(-99), next.metrics.fairnessIndex],
  };

  // 6. Detect insights
  const newInsights = detectInsights(
    next.tick,
    next.cluster,
    next.queue,
    next.runningJobs,
    next.metrics,
    sim.insights,
  );
  next.insights = [...sim.insights.slice(-10), ...newInsights];

  return next;
}

function deepCopyCluster(cluster: ClusterState): ClusterState {
  const gpus = cluster.gpus.map(g => ({ ...g }));
  return {
    gpus,
    trainingGPUs: gpus.filter(g => g.pool === 'training'),
    inferenceGPUs: gpus.filter(g => g.pool === 'inference'),
  };
}
