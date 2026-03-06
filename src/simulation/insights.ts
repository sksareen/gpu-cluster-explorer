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
          title: 'Wrong GPU Type',
          description: `A ${holJob.numGPUs}-GPU ${holJob.hardwareType} job is waiting even though ${totalFree} GPUs are free — they're the wrong type`,
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
      description: `${Math.round(urgentInQueue / queue.length * 100)}% of waiting jobs are marked urgent — when everything is urgent, nothing is`,
      tick,
    });
  }

  // Fragmentation
  if (metrics.fragmentationScore > 0.5 && queue.length > 0 && !recentIds.has('frag')) {
    const partialNodes = Math.round(metrics.fragmentationScore * 32);
    newInsights.push({
      id: `frag-${++insightCounter}`,
      type: 'info',
      title: 'Fragmented Resources',
      description: `GPUs are scattered across ${partialNodes} nodes — like empty seats spread across a theater, a big group can't sit together`,
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
      title: 'Jobs Stuck Waiting',
      description: `${longWaiters.length} jobs from ${teams.join(', ')} have been waiting 50+ min — they keep getting skipped`,
      tick,
    });
  }

  return newInsights;
}
