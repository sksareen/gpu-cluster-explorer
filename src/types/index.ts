export type HardwareType = 'training' | 'inference' | 'flexible';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type SchedulingPolicy = 'fifo' | 'sjf' | 'fair-share' | 'backfill';
export type ViewType = 'cluster' | 'comparison' | 'escalation';

export interface Job {
  id: string;
  name: string;
  numGPUs: number;
  duration: number;
  priority: Priority;
  team: string;
  hardwareType: HardwareType;
  arrivalTime: number;
  isGangScheduled: boolean;
  // Runtime state
  startTime?: number;
  endTime?: number;
  allocatedGPUs?: number[]; // GPU indices
  allocatedPool?: 'training' | 'inference';
  waitTime?: number;
  topologyPenalty?: number; // 1.0 = same node, 1.2 = same rack, 1.5 = cross-rack
}

export interface GPU {
  id: number;
  pool: 'training' | 'inference';
  rack: number;
  node: number;
  localIndex: number; // 0-7 within node
  jobId: string | null;
}

export interface ClusterState {
  gpus: GPU[];
  trainingGPUs: GPU[];
  inferenceGPUs: GPU[];
}

export interface TeamStats {
  name: string;
  gpuHoursUsed: number;
  gpuHoursShare: number; // target share
  jobsCompleted: number;
  jobsWaiting: number;
}

export interface Metrics {
  tick: number;
  utilization: number;
  trainingUtilization: number;
  inferenceUtilization: number;
  avgWaitTime: number;
  p99WaitTime: number;
  queueDepth: number;
  fairnessIndex: number;
  fragmentationScore: number;
  priorityEffectiveness: number;
  teamStats: TeamStats[];
}

export interface MetricsHistory {
  utilization: number[];
  avgWaitTime: number[];
  queueDepth: number[];
  fairnessIndex: number[];
}

export interface Insight {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  tick: number;
}

export interface SimulationState {
  tick: number;
  cluster: ClusterState;
  runningJobs: Job[];
  queue: Job[];
  completedJobs: Job[];
  metrics: Metrics;
  metricsHistory: MetricsHistory;
  insights: Insight[];
  policy: SchedulingPolicy;
  speed: number;
  running: boolean;
}

export interface PresetScenario {
  name: string;
  description: string;
  icon: string;
  config: WorkloadConfig;
}

export interface WorkloadConfig {
  arrivalRate: number; // jobs per tick
  urgentPct: number;
  highPct: number;
  normalPct: number;
  lowPct: number;
  researchPct: number;
  productionPct: number;
  platformPct: number;
  largeJobInjection?: { tick: number; numGPUs: number; duration: number };
  requireApproval: boolean;
}

export const TEAMS = ['Research-A', 'Research-B', 'Production', 'Platform', 'ML-Infra'] as const;

export const DEFAULT_WORKLOAD_CONFIG: WorkloadConfig = {
  arrivalRate: 0.3,
  urgentPct: 0.1,
  highPct: 0.2,
  normalPct: 0.5,
  lowPct: 0.2,
  researchPct: 0.4,
  productionPct: 0.35,
  platformPct: 0.25,
  requireApproval: false,
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  normal: '#3b82f6',
  low: '#64748b',
};

export const TEAM_COLORS: Record<string, string> = {
  'Research-A': '#3b82f6',
  'Research-B': '#8b5cf6',
  'Production': '#22c55e',
  'Platform': '#f59e0b',
  'ML-Infra': '#ec4899',
};
