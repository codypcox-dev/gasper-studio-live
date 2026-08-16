/**
 * GASPER-TASK-006 — long-rest is a dormant maintenance mode, not a ninth state.
 * All elapsed time is supplied by VEC-401; this module owns no scheduler.
 */
import {
  evaluateThreeBeatProgress,
  threeBeatFor,
  threeBeatSeed,
} from "./motion-grammar";
import type { EightStateId, ThreeBeatPhase, ThreeBeatSpec } from "./types";
import type { DomainScalarMap } from "../GasperDomainState";

export const LONG_REST_POLICY = Object.freeze({
  schema: "gasper.long-rest-policy.v1",
  stateId: "dormant-orbit-maintain" as const,
  defaultDurationSeconds: 120,
  maintenanceBeatSeconds: 4.8,
  allowBlink: false,
  allowSaccade: false,
});

export type LongRestMaintenance = Readonly<{
  stateId: typeof LONG_REST_POLICY.stateId;
  elapsedSeconds: number;
  beatIndex: number;
  phase: ThreeBeatPhase;
  phaseProgress: number;
  envelope: number;
  seed: number;
  threeBeat: ThreeBeatSpec;
  maintenanceBeatSeconds: number;
  allowBlink: false;
  allowSaccade: false;
}>;

export type LongRestStatus = LongRestMaintenance &
  Readonly<{
    active: boolean;
    startedAtMs: number | null;
  }>;

const LONG_REST_MODULATION: Readonly<Partial<Record<string, number>>> =
  Object.freeze({
    energy_level: 0.035,
    face_scale: 0.012,
    overall_height: 0.009,
    eye_openness: 0.008,
  });

/** Sample one deterministic maintenance beat from organism-clock elapsed time. */
export function evaluateLongRestMaintenance(
  elapsedSeconds: number,
  baseSeed = 1007,
): LongRestMaintenance {
  const elapsed = Math.max(
    0,
    Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
  );
  const beatSeconds = LONG_REST_POLICY.maintenanceBeatSeconds;
  const beatIndex = Math.floor(elapsed / beatSeconds);
  const elapsedInBeat = elapsed - beatIndex * beatSeconds;
  const stateId: EightStateId = LONG_REST_POLICY.stateId;
  const threeBeat = threeBeatFor(stateId);
  const progress = evaluateThreeBeatProgress(threeBeat, elapsedInBeat, {
    stateId,
    seed: threeBeatSeed(stateId, baseSeed),
  });
  // Long-rest is periodic maintenance, so its cycle must close on the same
  // envelope it opens with. The shared three-beat grammar normally begins at
  // zero, which is correct for a one-shot transition but would create a
  // visible drop when this 4.8s maintenance cycle wraps from hold to gather.
  // Keep the canonical phase timings/labels while lifting the gather floor to
  // the settled rest level and retaining a continuous 0.65 boundary.
  const envelope =
    progress.phase === "gather"
      ? 0.65 - 0.15 * progress.phaseProgress
      : progress.phase === "peak"
        ? 0.5 + 0.5 * progress.phaseProgress
        : progress.phase === "settle"
          ? 1 - 0.35 * progress.phaseProgress
          : 0.65;
  return Object.freeze({
    stateId,
    elapsedSeconds: elapsed,
    beatIndex,
    phase: progress.phase,
    phaseProgress: progress.phaseProgress,
    envelope,
    seed: progress.seed,
    threeBeat,
    maintenanceBeatSeconds: beatSeconds,
    allowBlink: LONG_REST_POLICY.allowBlink,
    allowSaccade: LONG_REST_POLICY.allowSaccade,
  });
}

/** Apply the small low-energy maintenance beat to live channels. */
export function applyLongRestMaintenance(
  values: DomainScalarMap,
  maintenance: LongRestMaintenance,
): DomainScalarMap {
  const out = { ...values };
  const delta = maintenance.envelope - 0.65;
  for (const [key, amplitude] of Object.entries(LONG_REST_MODULATION)) {
    const current = out[key];
    if (typeof current === "number" && typeof amplitude === "number") {
      out[key] = current + delta * amplitude;
    }
  }
  return out;
}
