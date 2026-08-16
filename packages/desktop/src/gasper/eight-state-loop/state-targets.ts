/**
 * Eight-state channel targets for R4 motion runtime.
 * GASPER-007-H: hold-state coefficients are projected from R2 compiled IR only.
 * Wake remains a transitional blend toward neutral (not a separate coefficient table).
 */

import type { DomainScalarMap } from "../GasperDomainState";
import {
  STATE_MOTION_SIGNATURES,
  THREE_BEAT_SPECS,
  threeBeatFor,
} from "./motion-grammar";
import type {
  EightStateId,
  GasperChannelTargetV1,
  GasperDistinctnessBudgetV1,
  ThreeBeatSpec,
} from "./types";
import {
  buildEightStateTargetsFromIr,
  loadCompiledScenario,
} from "./ir-targets";

/** Full eight-state (+ wake) channel endpoints — holds from R2 IR. */
export const EIGHT_STATE_TARGETS: Record<EightStateId, DomainScalarMap> = (() => {
  const holds = buildEightStateTargetsFromIr();
  const neutral = holds["presence-neutral-settled"];
  // Wake: transitional toward neutral from dormant-ish values (derived, not dual-authored).
  const dormant = holds["dormant-orbit-maintain"];
  const wake: DomainScalarMap = {};
  for (const k of new Set([...Object.keys(neutral), ...Object.keys(dormant)])) {
    const n = neutral[k] ?? 0;
    const d = dormant[k] ?? n;
    wake[k] = d + (n - d) * 0.55;
  }
  return {
    ...holds,
    wake,
  } as Record<EightStateId, DomainScalarMap>;
})();

export function channelTargetFor(stateId: EightStateId): GasperChannelTargetV1 {
  return {
    stateId,
    channels: { ...EIGHT_STATE_TARGETS[stateId] },
    motionSignature: STATE_MOTION_SIGNATURES[stateId],
    reducedMotionScale: 0.35,
    threeBeat: threeBeatFor(stateId),
  };
}

/** Channel target subset for a state's three-beat dominant channels. */
export function threeBeatChannelTarget(stateId: EightStateId): DomainScalarMap {
  const beat: ThreeBeatSpec = THREE_BEAT_SPECS[stateId];
  const full = EIGHT_STATE_TARGETS[stateId] ?? {};
  const out: DomainScalarMap = {};
  for (const ch of beat.dominantChannels) {
    out[ch] = full[ch] ?? 0;
  }
  return out;
}

export const ALL_CHANNEL_TARGETS: GasperChannelTargetV1[] = (
  Object.keys(EIGHT_STATE_TARGETS) as EightStateId[]
).map(channelTargetFor);

export const DISTINCTNESS_BUDGET: GasperDistinctnessBudgetV1 = {
  minChannelDelta: 0.04,
  minMotionSignatureDistance: 2,
  requiredDistinctChannels: [
    "energy_level",
    "eye_openness",
    "skin_tension",
    "overall_height",
    "internal_glow",
  ],
};

/** Apply reduced-motion projection: scale deltas vs neutral, never blank face. */
export function projectReducedMotion(
  targets: DomainScalarMap,
  scale = 0.35,
): DomainScalarMap {
  const neutral = EIGHT_STATE_TARGETS["presence-neutral-settled"];
  const out: DomainScalarMap = {};
  for (const [k, v] of Object.entries(targets)) {
    const base = neutral[k] ?? v;
    out[k] = base + (v - base) * scale;
  }
  // Preserve minimum face presence
  out.eye_openness = Math.max(0.28, out.eye_openness ?? 0.28);
  out.face_scale = Math.max(0.88, out.face_scale ?? 0.88);
  out.energy_level = Math.max(0.22, out.energy_level ?? 0.22);
  return out;
}

export function maxChannelDelta(a: DomainScalarMap, b: DomainScalarMap): number {
  let max = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = Math.abs((a[k] ?? 0) - (b[k] ?? 0));
    if (d > max) max = d;
  }
  return max;
}

/** Active scenario binding fingerprint for Proof / runtime inspection. */
export function activeScenarioIrHash(stateId: EightStateId): string | null {
  if (stateId === "wake") return null;
  try {
    return loadCompiledScenario(stateId).bindingFingerprint;
  } catch {
    return null;
  }
}
