/**
 * GASPER-FINISH-01 Task 5 — seeded bounded microvariation layer.
 *
 * Pure numeric layer: deterministic per (seed, timeMs, channel), bounded
 * amplitude, and collapsed under reduced motion. It must never change
 * topology, feature identity, face ownership, or beat ordering.
 */

import type { DomainScalarMap } from "../GasperDomainState";

export const MICROVARIATION_KEYS = [
  "skin_tension",
  "internal_glow",
  "face_emissive",
] as const;

export type MicrovariationChannel = (typeof MICROVARIATION_KEYS)[number];

export const MICROVARIATION_AMPLITUDE = 0.012;
export const MICROVARIATION_REDUCED_AMPLITUDE = 0.004;

/** Per-channel periods mirror the unified-theory spring family (ms). */
const MICROVARIATION_PERIOD_MS: Readonly<
  Record<MicrovariationChannel, number>
> = Object.freeze({
  skin_tension: 1700,
  internal_glow: 2300,
  face_emissive: 3100,
});

function hashPhase(seed: number, key: string): number {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) / 0x100000000) * Math.PI * 2;
}

/**
 * Deterministic bounded microvariation deltas for one clock frame.
 * Deltas are zero-mean oscillations — they never accumulate drift.
 */
export function evaluateMicrovariation(opts: {
  seed: number;
  timeMs: number;
  reducedMotion?: boolean;
  amplitude?: number;
}): Readonly<Record<MicrovariationChannel, number>> {
  const baseAmp = opts.reducedMotion
    ? MICROVARIATION_REDUCED_AMPLITUDE
    : MICROVARIATION_AMPLITUDE;
  const amp = Math.max(0, Math.min(0.05, baseAmp * (opts.amplitude ?? 1)));
  const t = Math.max(0, Number.isFinite(opts.timeMs) ? opts.timeMs : 0);
  const out = {} as Record<MicrovariationChannel, number>;
  for (const key of MICROVARIATION_KEYS) {
    const period = MICROVARIATION_PERIOD_MS[key];
    const phase = hashPhase(opts.seed, key);
    out[key] =
      Math.sin((Math.PI * 2 * t) / period + phase) * amp;
  }
  return Object.freeze(out);
}

/** Apply bounded additive microvariation; clamps channels to [0, 1]. */
export function applyMicrovariationToChannels(
  values: DomainScalarMap,
  micro: Readonly<Record<MicrovariationChannel, number>>,
): DomainScalarMap {
  const out: DomainScalarMap = { ...values };
  for (const key of MICROVARIATION_KEYS) {
    const delta = micro[key] ?? 0;
    const current = out[key];
    out[key] = Math.max(
      0,
      Math.min(1, (typeof current === "number" ? current : 0.4) + delta),
    );
  }
  return out;
}
