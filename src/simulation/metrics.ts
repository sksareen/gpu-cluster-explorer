import { Job, Metrics, TeamStats, TEAMS, ClusterState } from '../types';
import { getUtilization, getFragmentationScore } from './cluster';
import { jainsFairnessIndex } from '../lib/math';

export function computeMetrics(
  tick: number,
  cluster: ClusterState,
  runningJobs: Job[],
  queue: Job[],
  completedJobs: Job[],
  teamGpuHours: Map<string, number>,
): Metrics {
  const allFinished = [...completedJobs];
  const allWithWait = allFinished.filter(j => j.waitTime !== undefined);

  const waitTimes = allWithWait.map(j => j.waitTime!);
  const avgWaitTime = waitTimes.length > 0
    ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
    : 0;

  const sortedWaits = [...waitTimes].sort((a, b) => a - b);
  const p99WaitTime = sortedWaits.length > 0
    ? sortedWaits[Math.floor(sortedWaits.length * 0.99)]
    : 0;

  // Fairness: GPU-hours per team normalized
  const teamHoursArr = TEAMS.map(t => teamGpuHours.get(t) ?? 0);
  const fairnessIndex = jainsFairnessIndex(teamHoursArr);

  // Priority effectiveness: avg wait for urgent vs normal
  const urgentWaits = allWithWait.filter(j => j.priority === 'urgent').map(j => j.waitTime!);
  const normalWaits = allWithWait.filter(j => j.priority === 'normal').map(j => j.waitTime!);
  const avgUrgentWait = urgentWaits.length > 0 ? urgentWaits.reduce((a, b) => a + b, 0) / urgentWaits.length : 0;
  const avgNormalWait = normalWaits.length > 0 ? normalWaits.reduce((a, b) => a + b, 0) / normalWaits.length : 0;
  const priorityEffectiveness = avgNormalWait > 0 ? 1 - (avgUrgentWait / avgNormalWait) : 0;

  const teamStats: TeamStats[] = TEAMS.map(name => ({
    name,
    gpuHoursUsed: teamGpuHours.get(name) ?? 0,
    gpuHoursShare: 1 / TEAMS.length,
    jobsCompleted: completedJobs.filter(j => j.team === name).length,
    jobsWaiting: queue.filter(j => j.team === name).length,
  }));

  return {
    tick,
    utilization: getUtilization(cluster.gpus),
    trainingUtilization: getUtilization(cluster.trainingGPUs),
    inferenceUtilization: getUtilization(cluster.inferenceGPUs),
    avgWaitTime,
    p99WaitTime,
    queueDepth: queue.length,
    fairnessIndex,
    fragmentationScore: getFragmentationScore(cluster),
    priorityEffectiveness,
    teamStats,
  };
}
