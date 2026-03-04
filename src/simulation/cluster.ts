import { GPU, ClusterState, Job } from '../types';

// 4 racks × 8 nodes × 8 GPUs = 256 GPUs
// Racks 0-1: Training (128 GPUs), Racks 2-3: Inference (128 GPUs)
export function createCluster(): ClusterState {
  const gpus: GPU[] = [];
  let id = 0;
  for (let rack = 0; rack < 4; rack++) {
    const pool: 'training' | 'inference' = rack < 2 ? 'training' : 'inference';
    for (let node = 0; node < 8; node++) {
      for (let local = 0; local < 8; local++) {
        gpus.push({
          id,
          pool,
          rack,
          node: rack * 8 + node,
          localIndex: local,
          jobId: null,
        });
        id++;
      }
    }
  }

  return {
    gpus,
    trainingGPUs: gpus.filter(g => g.pool === 'training'),
    inferenceGPUs: gpus.filter(g => g.pool === 'inference'),
  };
}

export interface AllocationResult {
  gpuIds: number[];
  pool: 'training' | 'inference';
  topologyPenalty: number;
}

// Try to allocate GPUs for a job, topology-aware
export function tryAllocate(
  cluster: ClusterState,
  job: Job
): AllocationResult | null {
  const pools: ('training' | 'inference')[] =
    job.hardwareType === 'training' ? ['training'] :
    job.hardwareType === 'inference' ? ['inference'] :
    ['training', 'inference']; // flexible tries both

  for (const pool of pools) {
    const poolGPUs = pool === 'training' ? cluster.trainingGPUs : cluster.inferenceGPUs;
    const result = allocateFromPool(poolGPUs, job.numGPUs, job.isGangScheduled);
    if (result) {
      return { gpuIds: result.gpuIds, pool, topologyPenalty: result.penalty };
    }
  }
  return null;
}

function allocateFromPool(
  poolGPUs: GPU[],
  numGPUs: number,
  gangScheduled: boolean
): { gpuIds: number[]; penalty: number } | null {
  const freeGPUs = poolGPUs.filter(g => g.jobId === null);
  if (freeGPUs.length < numGPUs) return null;

  // Strategy 1: Same node (NVLink - best)
  const nodeGroups = groupBy(freeGPUs, g => g.node);
  for (const [, gpus] of nodeGroups) {
    if (gpus.length >= numGPUs) {
      return { gpuIds: gpus.slice(0, numGPUs).map(g => g.id), penalty: 1.0 };
    }
  }

  // Strategy 2: Same rack (InfiniBand)
  const rackGroups = groupBy(freeGPUs, g => g.rack);
  for (const [, gpus] of rackGroups) {
    if (gpus.length >= numGPUs) {
      return { gpuIds: gpus.slice(0, numGPUs).map(g => g.id), penalty: 1.2 };
    }
  }

  // Strategy 3: Cross-rack (refuse for gang-scheduled)
  if (gangScheduled) return null;

  if (freeGPUs.length >= numGPUs) {
    return { gpuIds: freeGPUs.slice(0, numGPUs).map(g => g.id), penalty: 1.5 };
  }

  return null;
}

export function allocateGPUs(cluster: ClusterState, gpuIds: number[], jobId: string): void {
  for (const id of gpuIds) {
    cluster.gpus[id].jobId = jobId;
  }
}

export function freeGPUs(cluster: ClusterState, gpuIds: number[]): void {
  for (const id of gpuIds) {
    cluster.gpus[id].jobId = null;
  }
}

export function getUtilization(gpus: GPU[]): number {
  if (gpus.length === 0) return 0;
  const used = gpus.filter(g => g.jobId !== null).length;
  return used / gpus.length;
}

export function getFragmentationScore(cluster: ClusterState): number {
  const nodes = new Set(cluster.gpus.map(g => g.node));
  let partial = 0;
  let total = 0;
  for (const node of nodes) {
    const nodeGPUs = cluster.gpus.filter(g => g.node === node);
    const used = nodeGPUs.filter(g => g.jobId !== null).length;
    total++;
    if (used > 0 && used < 8) partial++;
  }
  return total > 0 ? partial / total : 0;
}

function groupBy<T>(arr: T[], key: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of arr) {
    const k = key(item);
    const group = map.get(k);
    if (group) group.push(item);
    else map.set(k, [item]);
  }
  return map;
}
