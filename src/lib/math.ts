// Seeded PRNG (Mulberry32)
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Uniform int in [min, max]
  randInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Pick from array
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Weighted pick
  weightedPick<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

// Poisson arrival: returns true if an event occurs this tick
export function poissonArrival(rng: SeededRandom, rate: number): boolean {
  return rng.next() < rate;
}

// Jain's fairness index: J(x1..xn) = (sum(xi))^2 / (n * sum(xi^2))
export function jainsFairnessIndex(shares: number[]): number {
  if (shares.length === 0) return 1;
  const n = shares.length;
  const sum = shares.reduce((a, b) => a + b, 0);
  const sumSq = shares.reduce((a, b) => a + b * b, 0);
  if (sumSq === 0) return 1;
  return (sum * sum) / (n * sumSq);
}

// Exponential distribution sample
export function exponentialSample(rng: SeededRandom, mean: number): number {
  return -mean * Math.log(1 - rng.next());
}
