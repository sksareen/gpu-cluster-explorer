# GPU Cluster Scheduling Explorer

**[Live Demo](https://gpu-cluster-explorer.vercel.app)**

An interactive decision-support tool that makes GPU scheduling tradeoffs visible and intuitive. Built to demonstrate the core PM challenge in compute platform: helping organizations make good allocation decisions under real-world constraints.

## Why This Exists

Scheduling GPU clusters is not primarily an algorithms problem — it's a governance problem. The hardest part isn't choosing FIFO vs. Fair-Share. It's that:

- **Everyone marks their jobs as urgent**, defeating the priority system entirely
- **Hardware heterogeneity creates invisible bottlenecks** — a 64-GPU training job can be blocked while 80 inference GPUs sit idle
- **Leadership needs scenario comparison, not dashboards** — "What happens if we switch to Backfill?" is a more useful question than "What's our current utilization?"

This tool makes those dynamics explorable.

## Three Views

### Cluster Explorer
Real-time simulation of a 256-GPU cluster (128 training + 128 inference GPUs) across 4 racks. Watch jobs get allocated with topology-aware placement (same-node NVLink > same-rack InfiniBand > cross-rack). Auto-detected insights surface problems like head-of-line blocking, priority spirals, and GPU fragmentation as they emerge.

Preset scenarios:
- **Normal Load** — balanced mix of research, production, and platform workloads
- **Priority Spiral** — 60% urgent jobs, watch the scheduling system degrade to FIFO
- **Large Job Arrives** — stable cluster disrupted by a 128-GPU training run

### Policy Comparison
Same workload (seeded PRNG), two different scheduling policies, running side-by-side. Quantified deltas for utilization, wait time, and fairness. This is the format leadership actually uses to evaluate decisions.

### Priority Escalation Lab
The unique insight. Drag a slider from 0% to 100% urgent jobs and watch the tragedy of the commons unfold in real-time: as more teams mark jobs urgent, the "urgent" lane loses its advantage and wait times spike for everyone. Toggle the approval gate to see how adding friction restores signal to the priority system.

## Cluster Model

| Pool | Racks | Nodes | GPUs | Characteristics |
|------|-------|-------|------|-----------------|
| Training | 2 | 16 | 128 | High interconnect (NVLink within node) |
| Inference | 2 | 16 | 128 | High memory, optimized for serving |

Jobs specify hardware requirements. Training jobs need training GPUs, inference jobs need inference GPUs, flexible jobs can use either. This creates the bin-packing tension that makes real cluster management hard.

## Scheduling Policies

- **FIFO** — Queue order, first-fit. Simple, predictable, but large jobs block everything
- **SJF** — Shortest job first. Great throughput, but starves large training runs
- **Fair-Share** — Tracks GPU-hours per team, prioritizes underserved teams
- **Backfill** — FIFO primary, but fills gaps with smaller jobs that won't delay the head-of-line job

## Metrics

- GPU utilization (per pool and aggregate)
- Average and P99 wait time
- Jain's fairness index across teams
- Fragmentation score (partially-allocated nodes)
- Queue depth
- Priority effectiveness (wait time reduction for urgent vs. normal)

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS. All simulation runs in-browser with no backend. Canvas rendering for the GPU grid and Gantt chart. ~240KB gzipped.

## Development

```bash
npm install
npm run dev
```

## Deploy

Deployed as a static site to Vercel. Any push to `master` triggers a production deployment.

```bash
npm run build   # outputs to dist/
vercel --prod
```
