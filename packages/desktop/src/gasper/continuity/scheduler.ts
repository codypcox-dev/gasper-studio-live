/**
 * Deterministic fixed-dt scheduler for proof-mode continuity capture.
 * Does not replace GSAP as frame authority — produces ordered sample times only.
 */

import type { ContinuityChannelMap } from "./types";

/** Mulberry32 PRNG — matches GasperLivingRuntime seed stream. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DeterministicSchedule = {
  seed: number;
  dt: number;
  frameCount: number;
  times: number[];
  /** Sample phase progress along a unit interval [0,1] for each frame. */
  progress: number[];
  /** Frame indices marked as interrupt edges (if forceInterrupt). */
  interruptFrameIndices: number[];
};

/**
 * Build a fully deterministic sample schedule from seed + fixed dt.
 * When forceInterrupt, marks a single mid-sequence frame as interrupt edge.
 */
export function buildDeterministicSchedule(opts: {
  seed: number;
  dt?: number;
  frameCount?: number;
  forceInterrupt?: boolean;
  /** Fraction of sequence where interrupt lands (default 0.45). */
  interruptAt?: number;
}): DeterministicSchedule {
  const seed = opts.seed >>> 0;
  const dt = opts.dt ?? 1 / 60;
  const frameCount = Math.max(2, opts.frameCount ?? 48);
  const times: number[] = [];
  const progress: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    times.push(Number((i * dt).toFixed(9)));
    progress.push(frameCount === 1 ? 0 : i / (frameCount - 1));
  }
  const interruptFrameIndices: number[] = [];
  if (opts.forceInterrupt) {
    const at = opts.interruptAt ?? 0.45;
    const idx = Math.min(
      frameCount - 1,
      Math.max(1, Math.round(at * (frameCount - 1))),
    );
    interruptFrameIndices.push(idx);
  }
  // Consume one RNG draw so seed side-effects match living path expectations.
  const rng = mulberry32(seed);
  void rng();
  return { seed, dt, frameCount, times, progress, interruptFrameIndices };
}

/**
 * Linear interpolate maps by progress (retarget-from-current style, no snap).
 */
export function lerpMaps(
  from: ContinuityChannelMap,
  to: ContinuityChannelMap,
  progress: number,
): ContinuityChannelMap {
  const p = Math.min(1, Math.max(0, progress));
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  const out: ContinuityChannelMap = {};
  for (const k of keys) {
    const a = from[k] ?? to[k] ?? 0;
    const b = to[k] ?? a;
    out[k] = a + (b - a) * p;
  }
  return out;
}

/**
 * Smoothstep for interrupt-safe transition curves (C1 continuous at ends).
 */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Perlin smootherstep — C2 continuous at ends (zero first and second derivatives).
 * Preferred for bounded-jerk continuity captures.
 */
export function smootherstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}
