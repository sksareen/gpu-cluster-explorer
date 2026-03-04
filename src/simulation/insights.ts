import { Insight, Job, ClusterState, Metrics } from '../types';

let insightCounter = 0;

export function resetInsightCounter(): void {
  insightCounter = 0;
}

export function detectInsights(
  tick: number,
  cluster: ClusterState,
  queue: Job[],
  runningJobs: Job[],
  metrics: Metrics,
  prevInsights: Insight[],
): Insight[] {
  const newInsights: Insight[] = [];
  const recentIds = new Set(prevInsights.slice(-5).map(i => i.id.split('-')[0]));

  // Head-of-line blocking
  if (queue.length > 0) {
    const holJob = queue[0];
    const freeTraining = cluster.trainingGPUs.filter(g => g.jobId === null).length;
    const freeInference = cluster.inferenceGPUs.filter(g => g.jobId === null).length;
    const totalFree = freeTraining + freeInference;

    if (totalFree >= holJob.numGPUs && holJob.hardwareType !== 'flexible') {
      const neededPool = holJob.hardwareType === 'training' ? freeTraining : freeInference;
      if (neededPool < holJob.numGPUs && !recentIds.has('hol')) {
        newInsights.push({
          id: `hol-${++insightCounter}`,
          type: 'warning',
          title: 'Head-of-Line Blocking',
          description: `${holJob.numGPUs}-GPU ${holJob.hardwareType} job waiting while ${totalFree} GPUs idle (wrong pool)`,
          tick,
        });
      }
    }
  }

  // Priority spiral
  const urgentInQueue = queue.filter(j => j.priority === 'urgent').length;
  if (queue.length > 3 && urgentInQueue / queue.length > 0.6 && !recentIds.has('spiral')) {
    newInsights.push({
      id: `spiral-${++insightCounter}`,
      type: 'critical',
      title: 'Priority Spiral',
      description: `${Math.round(urgentInQueue / queue.length * 100)}% of queued jobs marked urgent — priority system ineffective`,
      tick,
    });
  }

  // Fragmentation
  if (metrics.fragmentationScore > 0.5 && queue.length > 0 && !recentIds.has('frag')) {
    const partialNodes = Math.round(metrics.fragmentationScore * 32);
    newInsights.push({
      id: `frag-${++insightCounter}`,
      type: 'info',
      title: 'GPU Fragmentation',
      description: `${partialNodes} nodes partially allocated — large jobs may not fit despite free GPUs`,
      tick,
    });
  }

  // Starvation detection
  const longWaiters = queue.filter(j => tick - j.arrivalTime > 50);
  if (longWaiters.length > 2 && !recentIds.has('starve')) {
    const teams = [...new Set(longWaiters.map(j => j.team))];
    newInsights.push({
      id: `starve-${++insightCounter}`,
      type: 'warning',
      title: 'Job Starvation',
      description: `${longWaiters.length} jobs waiting 50+ ticks (teams: ${teams.join(', ')})`,
      tick,
    });
  }

  return newInsights;
}
