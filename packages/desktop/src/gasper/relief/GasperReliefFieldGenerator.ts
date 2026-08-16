/**
 * Deterministic adaptive relief field generator (Lane R1).
 * Replaces placeholder filter-only relief with real sample fields.
 */

import {
  RELIEF_DEFAULT_HEIGHT,
  RELIEF_DEFAULT_WIDTH,
  RELIEF_MAX_SAMPLES,
  type ReliefField,
  type ReliefGenerationInput,
  type ReliefMetrics,
} from "./types";

/** FNV-1a style 32-bit hash for deterministic noise. */
function hashU32(seed: number, x: number, y: number, t: number): number {
  let h = 2166136261 >>> 0;
  h = Math.imul(h ^ (seed >>> 0), 16777619) >>> 0;
  h = Math.imul(h ^ (x >>> 0), 16777619) >>> 0;
  h = Math.imul(h ^ (y >>> 0), 16777619) >>> 0;
  h = Math.imul(h ^ (Math.floor(t * 1000) >>> 0), 16777619) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function noise01(seed: number, x: number, y: number, t: number): number {
  return hashU32(seed, x, y, t) / 0xffffffff;
}

function valueNoise(seed: number, x: number, y: number, t: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = noise01(seed, x0, y0, t) * 2 - 1;
  const n10 = noise01(seed, x0 + 1, y0, t) * 2 - 1;
  const n01 = noise01(seed, x0, y0 + 1, t) * 2 - 1;
  const n11 = noise01(seed, x0 + 1, y0 + 1, t) * 2 - 1;
  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

function fnv1aHex(bytes: Float32Array): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    // Quantize to stable milli-units for hash stability across float noise
    const q = Math.round(bytes[i]! * 1e6);
    h = Math.imul(h ^ (q & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 8) & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 16) & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 24) & 0xff), 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Reusable buffer pool — avoids per-frame allocation explosion.
 * One generator instance owns its working buffer.
 */
export class GasperReliefFieldGenerator {
  private buffer: Float32Array;
  private prev: Float32Array;
  private lastW = 0;
  private lastH = 0;

  constructor(maxSamples = RELIEF_MAX_SAMPLES) {
    this.buffer = new Float32Array(maxSamples);
    this.prev = new Float32Array(maxSamples);
  }

  generate(input: ReliefGenerationInput): ReliefField {
    const width = Math.max(1, Math.min(RELIEF_DEFAULT_WIDTH, Math.floor(input.width) || RELIEF_DEFAULT_WIDTH));
    const height = Math.max(1, Math.min(RELIEF_DEFAULT_HEIGHT, Math.floor(input.height) || RELIEF_DEFAULT_HEIGHT));
    const n = Math.min(RELIEF_MAX_SAMPLES, width * height);
    if (this.lastW !== width || this.lastH !== height) {
      this.buffer.fill(0);
      this.prev.fill(0);
      this.lastW = width;
      this.lastH = height;
    }

    const amplitude = clamp(input.amplitude, 0, 1);
    const scale = Math.max(0.05, input.scale || 1);
    const seed = input.seed | 0;
    const t = input.timeSeconds;
    const motion = clamp01(input.motion);
    const energy = clamp01(input.energy);
    const tension = clamp01(input.tension);
    const damping = clamp01(input.damping);
    const coupling = clamp01(input.coupling);

    // Zero amplitude: stable zeros, no temporal drift
    if (amplitude <= 1e-9) {
      this.buffer.fill(0, 0, n);
      this.prev.fill(0, 0, n);
      return this.pack(width, height, n);
    }

    const motionGain = 0.35 + motion * 0.85;
    const energyGain = 0.25 + energy * 0.9;
    const dampKeep = 0.15 + damping * 0.75; // higher damping → more temporal hold
    const tensionGain = 0.4 + tension * 0.9;
    const couple = coupling;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (i >= n) break;
        const u = x / width;
        const v = y / height;
        // Multi-octave deterministic field with energy/motion coupling
        const sx = u * 4 * scale + t * (0.15 + motion * 0.45);
        const sy = v * 5 * scale - t * (0.08 + energy * 0.2);
        let h =
          valueNoise(seed, sx, sy, t) * 0.55 +
          valueNoise(seed + 17, sx * 2.1, sy * 2.1, t * 1.3) * 0.3 +
          valueNoise(seed + 41, sx * 4.3, sy * 4.3, t * 0.7) * 0.15;

        // Spatial envelope — stronger mid-body, softer face crown
        const faceSuppress = 1 - Math.exp(-((v - 0.28) ** 2) / 0.04) * 0.55;
        const edge = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        h *= faceSuppress * (0.35 + 0.65 * edge);

        // Motion / energy coupling (not pure additive glow)
        h *= motionGain * (1 - couple * 0.35) + energyGain * couple * 0.65;
        h *= tensionGain;
        h *= amplitude;

        // Temporal damping against previous frame
        const prev = this.prev[i] ?? 0;
        const blended = prev * dampKeep + h * (1 - dampKeep);
        this.buffer[i] = blended;
      }
    }

    // Commit to prev for next generate call
    this.prev.set(this.buffer.subarray(0, n));
    return this.pack(width, height, n);
  }

  private pack(width: number, height: number, n: number): ReliefField {
    const samples = this.buffer.subarray(0, n);
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = samples[i]!;
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
    if (n === 0) {
      min = 0;
      max = 0;
    }
    const mean = n ? sum / n : 0;
    const hash = fnv1aHex(samples);
    // Return a copy so consumers can't mutate the working buffer
    return {
      width,
      height,
      samples: Float32Array.from(samples),
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 0,
      mean,
      hash,
    };
  }

  metrics(field: ReliefField, updateCostMs = 0): ReliefMetrics {
    let nonzero = 0;
    let sumSq = 0;
    for (let i = 0; i < field.samples.length; i++) {
      const v = field.samples[i]!;
      if (Math.abs(v) > 1e-8) nonzero++;
      sumSq += v * v;
    }
    return {
      sampleCount: field.samples.length,
      nonzeroCount: nonzero,
      rms: Math.sqrt(sumSq / Math.max(1, field.samples.length)),
      min: field.min,
      max: field.max,
      mean: field.mean,
      hash: field.hash,
      amplitude: Math.max(Math.abs(field.min), Math.abs(field.max)),
      updateCostMs,
    };
  }
}

export function createReliefGenerator(): GasperReliefFieldGenerator {
  return new GasperReliefFieldGenerator();
}
