import { Job, SchedulingPolicy, ClusterState } from '../types';
import { tryAllocate, allocateGPUs } from './cluster';

export interface ScheduleResult {
  scheduled: Job[];
  remaining: Job[];
}

export function scheduleJobs(
  queue: Job[],
  cluster: ClusterState,
  policy: SchedulingPolicy,
  tick: number,
  teamStats: Map<string, number>,
): ScheduleResult {
  const scheduled: Job[] = [];
  let remaining = [...queue];

  switch (policy) {
    case 'fifo':
      return scheduleFIFO(remaining, cluster, tick, scheduled);
    case 'sjf':
      remaining.sort((a, b) => a.duration - b.duration);
      return scheduleFIFO(remaining, cluster, tick, scheduled);
    case 'fair-share':
      return scheduleFairShare(remaining, cluster, tick, scheduled, teamStats);
    case 'backfill':
      return scheduleBackfill(remaining, cluster, tick, scheduled);
  }
}

function scheduleFIFO(
  queue: Job[],
  cluster: ClusterState,
  tick: number,
  scheduled: Job[],
): ScheduleResult {
  const remaining: Job[] = [];
  for (const job of queue) {
    const result = tryAllocate(cluster, job);
    if (result) {
      allocateGPUs(cluster, result.gpuIds, job.id);
      job.allocatedGPUs = result.gpuIds;
      job.allocatedPool = result.pool;
      job.startTime = tick;
      job.waitTime = tick - job.arrivalTime;
      job.topologyPenalty = result.topologyPenalty;
      scheduled.push(job);
    } else {
      remaining.push(job);
    }
  }
  return { scheduled, remaining };
}

function scheduleFairShare(
  queue: Job[],
  cluster: ClusterState,
  tick: number,
  scheduled: Job[],
  teamStats: Map<string, number>,
): ScheduleResult {
  // Sort by team deficit (teams that have used less GPU-hours go first)
  const totalHours = Array.from(teamStats.values()).reduce((a, b) => a + b, 0) || 1;
  const fairShare = totalHours / (teamStats.size || 1);

  const sorted = [...queue].sort((a, b) => {
    const aUsed = teamStats.get(a.team) ?? 0;
    const bUsed = teamStats.get(b.team) ?? 0;
    const aDeficit = fairShare - aUsed;
    const bDeficit = fairShare - bUsed;
    // Higher deficit (less usage) = higher priority
    if (Math.abs(aDeficit - bDeficit) > 0.01) return bDeficit - aDeficit;
    // Tie-break by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return scheduleFIFO(sorted, cluster, tick, scheduled);
}

function scheduleBackfill(
  queue: Job[],
  cluster: ClusterState,
  tick: number,
  scheduled: Job[],
): ScheduleResult {
  const remaining: Job[] = [];

  // First pass: try to schedule in FIFO order
  let headBlocked = false;
  for (const job of queue) {
    if (!headBlocked) {
      const result = tryAllocate(cluster, job);
      if (result) {
        allocateGPUs(cluster, result.gpuIds, job.id);
        job.allocatedGPUs = result.gpuIds;
        job.allocatedPool = result.pool;
        job.startTime = tick;
        job.waitTime = tick - job.arrivalTime;
        job.topologyPenalty = result.topologyPenalty;
        scheduled.push(job);
      } else {
        headBlocked = true;
        remaining.push(job);
      }
    } else {
      remaining.push(job);
    }
  }

  // Second pass: backfill with smaller jobs that won't delay HOL
  if (headBlocked && remaining.length > 1) {
    const holJob = remaining[0];
    const backfillCandidates = remaining.slice(1);
    const stillRemaining = [holJob];

    for (const job of backfillCandidates) {
      // Only backfill if the job is small enough and short enough
      if (job.numGPUs <= holJob.numGPUs / 2) {
        const result = tryAllocate(cluster, job);
        if (result) {
          allocateGPUs(cluster, result.gpuIds, job.id);
          job.allocatedGPUs = result.gpuIds;
          job.allocatedPool = result.pool;
          job.startTime = tick;
          job.waitTime = tick - job.arrivalTime;
          job.topologyPenalty = result.topologyPenalty;
          scheduled.push(job);
        } else {
          stillRemaining.push(job);
        }
      } else {
        stillRemaining.push(job);
      }
    }
    return { scheduled, remaining: stillRemaining };
  }

  return { scheduled, remaining };
}
