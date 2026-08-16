/**
 * GASPER-FINISH-01 Task 5 — interruption retarget from current pose + velocity.
 *
 * MOTION-063: input-driven interruption retargets from the current resolved
 * pose and velocity — never a restart-from-target. Pure numeric evaluator.
 */

import type { DomainScalarMap } from "../GasperDomainState";
import type { BeatSequence, InterruptionPolicy } from "./beat-sequence";
import {
  ENERGY_CONTINUITY_KEYS,
  FACE_CONTINUITY_KEYS,
  SILHOUETTE_CONTINUITY_KEYS,
} from "./types";

export type InterruptionDisposition = Readonly<{
  supported: true;
  policy: InterruptionPolicy;
  immediateDeltaMax: number;
  velocityDiscontinuityMax: number;
  faceContinuity: boolean;
  silhouetteContinuity: boolean;
  energyContinuity: boolean;
  snapped: boolean;
  retargetInitial: Readonly<Record<string, number>>;
  notes: string;
}>;

/** Velocity-continuation window used to preserve momentum on retarget (ms). */
export const INTERRUPT_ANTICIPATION_MS = 80;

const MAX_RETARGET_STEP = 0.35;

function maxAbsDelta(
  a: DomainScalarMap,
  b: DomainScalarMap,
  keys: readonly string[],
): number {
  let max = 0;
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (av === undefined || bv === undefined) continue;
    const d = Math.abs(av - bv);
    if (d > max) max = d;
  }
  return max;
}

/**
 * Resolve an interruption retarget. `current` is the resolved pose at the
 * interruption moment; `velocity` is the per-channel velocity estimate; the
 * initial retarget continues that velocity for a bounded anticipation window
 * and clamps the first step so no channel teleports.
 */
export function resolveInterruptionRetarget(opts: {
  sequence: BeatSequence;
  current: DomainScalarMap;
  velocity: DomainScalarMap;
  toward: DomainScalarMap;
}): InterruptionDisposition {
  const { current, velocity, toward } = opts;
  const dt = INTERRUPT_ANTICIPATION_MS / 1000;
  const keys = new Set([
    ...Object.keys(current),
    ...Object.keys(toward),
    ...Object.keys(velocity),
  ]);
  const initial: DomainScalarMap = {};
  for (const k of keys) {
    const cur = current[k] ?? 0;
    const tgt = toward[k] ?? cur;
    const vel = velocity[k] ?? 0;
    const projected = cur + vel * dt;
    const clamped =
      projected > tgt + MAX_RETARGET_STEP
        ? tgt + MAX_RETARGET_STEP
        : projected < tgt - MAX_RETARGET_STEP
          ? tgt - MAX_RETARGET_STEP
          : projected;
    initial[k] = clamped;
  }
  // Face floors must survive the retarget initial frame.
  if (initial.face_scale !== undefined) {
    initial.face_scale = Math.max(0.88, initial.face_scale);
  }
  if (initial.eye_openness !== undefined) {
    initial.eye_openness = Math.max(0.1, initial.eye_openness);
  }
  if (initial.face_emissive !== undefined) {
    initial.face_emissive = Math.max(0.12, initial.face_emissive);
  }
  if (initial.energy_level !== undefined) {
    initial.energy_level = Math.max(0.14, initial.energy_level);
  }

  const immediateDeltaMax = maxAbsDelta(current, initial, [...keys]);
  // First-step velocity after retarget vs pre-interrupt velocity.
  let velocityDiscontinuityMax = 0;
  for (const k of keys) {
    const vel = velocity[k] ?? 0;
    const firstStepVel = ((initial[k] ?? 0) - (current[k] ?? 0)) / dt;
    const d = Math.abs(firstStepVel - vel);
    if (d > velocityDiscontinuityMax) velocityDiscontinuityMax = d;
  }
  const faceContinuity = maxAbsDelta(current, initial, FACE_CONTINUITY_KEYS) < 0.5;
  const silhouetteContinuity =
    maxAbsDelta(current, initial, SILHOUETTE_CONTINUITY_KEYS) < 0.45;
  const energyContinuity =
    maxAbsDelta(current, initial, ENERGY_CONTINUITY_KEYS) < 0.55;
  const snapped = immediateDeltaMax > 0.85;
  return Object.freeze({
    supported: true,
    policy: opts.sequence.interruptionPolicy,
    immediateDeltaMax: Math.round(immediateDeltaMax * 10000) / 10000,
    velocityDiscontinuityMax:
      Math.round(velocityDiscontinuityMax * 10000) / 10000,
    faceContinuity,
    silhouetteContinuity,
    energyContinuity,
    snapped,
    retargetInitial: Object.freeze(initial),
    notes: snapped
      ? "FAIL: channel teleport detected"
      : "retarget-current from resolved pose + velocity",
  });
}

/** Estimate per-channel velocity between two samples (units per second). */
export function estimateVelocity(
  before: DomainScalarMap,
  after: DomainScalarMap,
  dtSeconds: number,
): DomainScalarMap {
  const dt = Math.max(1e-3, dtSeconds);
  const out: DomainScalarMap = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const b = before[k] ?? 0;
    const a = after[k] ?? b;
    out[k] = (a - b) / dt;
  }
  return out;
}
