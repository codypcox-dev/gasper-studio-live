/**
 * GASPER-FINISH-01 Task 5 — moving hold + absolute rest-pose anchoring.
 *
 * Pure evaluator (VEC-ANIM-064 + MOTION-037): while macro motion rests,
 * breath, subtle sway, eye life, material phase, and a small bounded drift
 * continue. Drift is anchored — it returns to the rest pose at every hold
 * window boundary, so long loops never accumulate deformation drift.
 */

import type { BeatSequence } from "./beat-sequence";

export type MovingHoldSample = Readonly<{
  active: boolean;
  breath: number;
  sway: number;
  eyeLife: number;
  materialPhase: number;
  drift: number;
  restPoseError: number;
  amplitudeScale: number;
}>;

const TAU = Math.PI * 2;

function hashPhase(seed: number, salt: number): number {
  let h = ((seed >>> 0) ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return ((h >>> 0) / 0x100000000) * TAU;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Evaluate the moving-hold life for a beat sequence at organism-clock ms.
 * The drift term uses the hold-window local progress, so sin(0) = sin(2π) ≈ 0:
 * every hold window opens and closes on the authored rest pose.
 */
export function evaluateMovingHold(
  seq: BeatSequence,
  elapsedMs: number,
  opts: { seed: number; reducedMotion?: boolean },
): MovingHoldSample {
  const policy = seq.phases[2].movingHold;
  const preHoldMs =
    seq.phases[0].durationMs +
    seq.phases[1].durationMs +
    seq.phases[2].durationMs;
  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const inHoldMs = Math.max(0, t - preHoldMs);
  const holdMs = Math.max(1, seq.holdMs);
  const active = policy.enabled && t >= preHoldMs;
  const scale = opts.reducedMotion === true ? 0.35 : 1;
  const breathPhase = hashPhase(opts.seed, 0x1011);
  const swayPhase = hashPhase(opts.seed, 0x1012);
  const eyePhase = hashPhase(opts.seed, 0x1013);
  const materialPhase = hashPhase(opts.seed, 0x1014);
  const driftLocal = (inHoldMs % holdMs) / holdMs;
  const breath = active
    ? policy.breathAmp * scale * Math.sin((TAU * inHoldMs) / 4000 + breathPhase)
    : 0;
  const sway = active
    ? policy.swayAmp * scale * Math.sin((TAU * inHoldMs) / 6300 + swayPhase)
    : 0;
  const eyeLife = active
    ? policy.eyeLifeAmp *
      scale *
      Math.sin((TAU * inHoldMs) / 2700 + eyePhase)
    : 0;
  const material =
    active
      ? policy.materialPhaseAmp *
        scale *
        Math.sin((TAU * inHoldMs) / 5100 + materialPhase)
      : 0;
  // Anchored: zero at every hold-window boundary (sin(0) and sin(2π) ≈ 0).
  const drift = active
    ? policy.driftAmp * scale * Math.sin(TAU * driftLocal)
    : 0;
  return Object.freeze({
    active,
    breath,
    sway,
    eyeLife,
    materialPhase: material,
    drift,
    restPoseError: active ? Math.abs(drift) : 0,
    amplitudeScale: scale,
  });
}

/** Bound check helper for proof deposits (all amplitudes within policy). */
export function movingHoldBounds(sample: MovingHoldSample): {
  bounded: boolean;
  maxAbs: number;
} {
  const values = [
    sample.breath,
    sample.sway,
    sample.eyeLife,
    sample.materialPhase,
    sample.drift,
  ];
  const maxAbs = values.reduce(
    (max, v) => Math.max(max, Math.abs(v)),
    0,
  );
  return { bounded: maxAbs <= 0.25 + 1e-9 && clamp(maxAbs, 0, 1) === maxAbs, maxAbs };
}
