import { Job, WorkloadConfig, Priority, HardwareType, TEAMS } from '../types';
import { SeededRandom, poissonArrival } from '../lib/math';

let jobCounter = 0;

export function resetJobCounter(): void {
  jobCounter = 0;
}

const JOB_NAMES = {
  research: ['GPT-Finetune', 'RLHF-Exp', 'Ablation-Study', 'Eval-Run', 'Embedding-Train', 'Reward-Model'],
  production: ['Serving-v2', 'Inference-Batch', 'API-Serving', 'Completion-Svc', 'Chat-Endpoint', 'Embedding-API'],
  platform: ['Foundation-Train', 'Pre-Training', 'Large-Scale-Exp', 'Infra-Benchmark', 'Scaling-Law-Run'],
};

export function generateJobs(
  rng: SeededRandom,
  tick: number,
  config: WorkloadConfig,
): Job[] {
  const jobs: Job[] = [];

  // Check for large job injection
  if (config.largeJobInjection && tick === config.largeJobInjection.tick) {
    jobs.push(createJob(rng, tick, 'platform', config, {
      numGPUs: config.largeJobInjection.numGPUs,
      duration: config.largeJobInjection.duration,
      priority: 'urgent',
    }));
  }

  if (!poissonArrival(rng, config.arrivalRate)) return jobs;

  // Pick workload type
  const workloadType = rng.weightedPick(
    ['research', 'production', 'platform'] as const,
    [config.researchPct, config.productionPct, config.platformPct]
  );

  jobs.push(createJob(rng, tick, workloadType, config));
  return jobs;
}

function createJob(
  rng: SeededRandom,
  tick: number,
  workloadType: 'research' | 'production' | 'platform',
  config: WorkloadConfig,
  overrides?: Partial<Job>,
): Job {
  const id = `job-${++jobCounter}`;

  let numGPUs: number;
  let duration: number;
  let hardwareType: HardwareType;
  let name: string;
  let isGangScheduled = false;

  switch (workloadType) {
    case 'research':
      numGPUs = rng.weightedPick([1, 2, 4, 8, 16, 32], [15, 20, 25, 20, 12, 8]);
      duration = rng.randInt(5, 40);
      hardwareType = 'training';
      name = rng.pick(JOB_NAMES.research);
      isGangScheduled = numGPUs >= 8;
      break;
    case 'production':
      numGPUs = rng.weightedPick([1, 2, 4, 8], [25, 35, 25, 15]);
      duration = rng.randInt(10, 80);
      hardwareType = 'inference';
      name = rng.pick(JOB_NAMES.production);
      break;
    case 'platform':
      numGPUs = rng.weightedPick([32, 64, 128], [40, 40, 20]);
      duration = rng.randInt(30, 120);
      hardwareType = 'training';
      name = rng.pick(JOB_NAMES.platform);
      isGangScheduled = true;
      break;
  }

  // Priority assignment (potentially modified by approval gate)
  let priority = rng.weightedPick<Priority>(
    ['urgent', 'high', 'normal', 'low'],
    [config.urgentPct, config.highPct, config.normalPct, config.lowPct]
  );

  // Approval gate: if enabled, most urgent jobs get downgraded
  if (config.requireApproval && priority === 'urgent') {
    // Only 20% of "urgent" requests get approved
    priority = rng.next() < 0.2 ? 'urgent' : 'high';
  }

  const team = rng.pick(TEAMS);

  return {
    id,
    name: `${name}-${id.split('-')[1]}`,
    numGPUs,
    duration,
    priority,
    team,
    hardwareType,
    arrivalTime: tick,
    isGangScheduled,
    ...overrides,
  };
}
