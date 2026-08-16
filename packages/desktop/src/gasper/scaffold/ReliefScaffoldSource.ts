/**
 * Book 009 ReliefScaffoldSource — endogenous field → scaffold samples.
 *
 * Resamples a scalar field onto the 25×40 scaffold with bilinear
 * wrapped-u / clamped-v. Amplitude 0 returns byte-stable +0 samples.
 * This is a SOURCE, not a renderer. No ellipse painter. No face.
 */
import {
  SCAFFOLD_RINGS,
  SCAFFOLD_SECTORS,
  SCAFFOLD_VERTEX_COUNT,
  scaffoldUV,
  zeroSource,
  type ScaffoldSource,
} from "./AdaptiveShellScaffold";

export const RELIEF_RESAMPLE = "bilinear.wrapped-u.clamped-v" as const;

export type ScalarField = Readonly<{
  width: number;
  height: number;
  samples: Float32Array;
}>;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n <= 0 ? 0 : n >= 1 ? 1 : n;
}

function wrap01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const w = n - Math.floor(n);
  return w < 0 ? w + 1 : w;
}

/** Bilinear sample; u wraps, v clamps. */
export function sampleFieldBilinear(field: ScalarField, u: number, v: number): number {
  const w = field.width;
  const h = field.height;
  if (w <= 0 || h <= 0 || field.samples.length < w * h) return 0;
  const vv = clamp01(v) * Math.max(0, h - 1);
  const r0 = Math.min(h - 1, Math.max(0, Math.floor(vv)));
  const r1 = Math.min(h - 1, r0 + 1);
  const tv = vv - r0;
  const uu = wrap01(u) * w;
  const s0 = ((Math.floor(uu) % w) + w) % w;
  const s1 = (s0 + 1) % w;
  const tu = uu - Math.floor(uu);
  const n00 = field.samples[r0 * w + s0] ?? 0;
  const n10 = field.samples[r0 * w + s1] ?? 0;
  const n01 = field.samples[r1 * w + s0] ?? 0;
  const n11 = field.samples[r1 * w + s1] ?? 0;
  return n00 * (1 - tu) * (1 - tv) + n10 * tu * (1 - tv) + n01 * (1 - tu) * tv + n11 * tu * tv;
}

export function resampleFieldToScaffold(field: ScalarField, amplitude: number): Float32Array {
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  if (amplitude === 0) {
    for (let i = 0; i < out.length; i++) out[i] = 0;
    return out;
  }
  for (let i = 0; i < SCAFFOLD_VERTEX_COUNT; i++) {
    const { u, v } = scaffoldUV(i);
    out[i] = sampleFieldBilinear(field, u, v);
  }
  return out;
}

export function reliefScaffoldSource(field: ScalarField, amplitude: number): ScaffoldSource {
  if (amplitude === 0) return zeroSource("relief");
  return {
    kind: "relief",
    amplitude,
    samples: resampleFieldToScaffold(field, amplitude),
  };
}

export function pressureScaffoldSource(field: ScalarField, amplitude: number): ScaffoldSource {
  if (amplitude === 0) return zeroSource("pressure");
  return {
    kind: "pressure",
    amplitude,
    samples: resampleFieldToScaffold(field, amplitude),
  };
}

export function capturedScaffoldSource(samples: Float32Array | null, amplitude: number): ScaffoldSource {
  if (amplitude === 0 || !samples) return zeroSource("captured");
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  const n = Math.min(SCAFFOLD_VERTEX_COUNT, samples.length);
  for (let i = 0; i < n; i++) out[i] = samples[i] ?? 0;
  return { kind: "captured", amplitude, samples: out };
}

export function emptyReliefField(): ScalarField {
  return {
    width: SCAFFOLD_SECTORS,
    height: SCAFFOLD_RINGS,
    samples: new Float32Array(SCAFFOLD_VERTEX_COUNT),
  };
}
