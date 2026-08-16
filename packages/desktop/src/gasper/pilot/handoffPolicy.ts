/**
 * Pure handoff policy + measurement helpers for GASPER-PILOT-002.
 *
 * Laws:
 * - GSAP / native owns continuous frame timing; this module only measures and hints.
 * - Pilot is low-frequency; never schedules blink frames or rAF loops.
 * - Mid-blink and mouth continuity policies are declared here; living runtime enforces.
 * - Topology and survival are asserted, not rewritten.
 */

import type { InterruptPolicy, TopologyLockSnapshot } from "../../../../shared/src/gasper-pilot";
import { PILOT_DEFAULT_TOPOLOGY } from "../../../../shared/src/gasper-pilot";

/** Blink phase below this is treated as mid-blink (eye closing / closed). */
export const MID_BLINK_PHASE_THRESHOLD = 0.25;

/**
 * GSAP-owned duration hints (seconds) by interrupt policy.
 * Adapter may pass these as options; living/GSAP owns actual interpolation.
 */
export const INTERRUPT_DURATION_SEC: Record<
  InterruptPolicy,
  number | null
> = {
  /** Freeze — no living transition duration. */
  hold: null,
  /** Soft blend from current values. */
  blend: 0.75,
  /** Immediate retarget from current (shorter). */
  retarget: 0.55,
  /** Wait for settle — no immediate duration until drained. */
  queue: null,
};

export type LivingStatusSnapshot = {
  running?: boolean;
  eightStateLoop?: boolean;
  blinkPhase?: number;
  gaze?: number;
  interruptCount?: number;
  lastInterruptAt?: number | null;
  eightState?: string | null;
  microstate?: string | null;
  loopPhase?: string | null;
  mouthOpenness?: number | null;
};

export type HandoffTimingHint = {
  /** Whether living should be invoked with interrupt:true. */
  livingInterrupt: boolean;
  /** Duration hint for GSAP (null = skip living or wait). */
  durationSec: number | null;
  /** Explicit: timing remains GSAP/native authority. */
  gsapOwnedTiming: true;
  policy: InterruptPolicy;
};

export type MidBlinkEvaluation = {
  /** True when blink phase indicates mid-blink. */
  midBlink: boolean;
  /** Living must not snap eye closed→open or open→closed teleport. */
  protectEyeRest: boolean;
  /** Soft-retarget rest only when eye is open enough (matches living). */
  softRetargetEyeRest: boolean;
  blinkPhase: number | null;
  threshold: typeof MID_BLINK_PHASE_THRESHOLD;
};

export type MouthRetargetEvaluation = {
  /** Policy flag: always retarget mouth from current interpolated value. */
  mouthRetargetFromCurrent: true;
  /** Forbidden: absolute mouth snap from canonical zero. */
  forbidCanonicalMouthSnap: true;
  currentMouth: number | null;
  targetMouth: number | null;
};

export type TopologyStabilityEvaluation = {
  stable: boolean;
  before: TopologyLockSnapshot;
  after: TopologyLockSnapshot;
  deltas: string[];
};

export type DisconnectSurvivalEvaluation = {
  bridgeRequiredForSurvival: false;
  hqRequiredForSurvival: false;
  bridgeConnected: boolean;
  hqConnected: boolean;
  /** Apply/recover must still succeed when both are false. */
  canOperateStandalone: true;
  operationalModeExpected: "standalone" | "bridged" | "degraded" | "recovering";
};

/**
 * Resolve GSAP timing hint from pilot interrupt policy.
 * Never invents a frame stream — duration is a handoff option only.
 */
export function resolveInterruptTiming(
  policy: InterruptPolicy,
): HandoffTimingHint {
  const durationSec = INTERRUPT_DURATION_SEC[policy] ?? null;
  return {
    livingInterrupt: policy === "blend" || policy === "retarget",
    durationSec,
    gsapOwnedTiming: true,
    policy,
  };
}

/**
 * Evaluate mid-blink protection for a living status snapshot.
 * Matches GasperLivingRuntime / EightStateLoopController soft-retarget rules.
 */
export function evaluateMidBlink(
  living: LivingStatusSnapshot | null | undefined,
): MidBlinkEvaluation {
  const phase =
    living && typeof living.blinkPhase === "number"
      ? living.blinkPhase
      : null;
  const midBlink = phase != null && phase <= MID_BLINK_PHASE_THRESHOLD;
  return {
    midBlink,
    protectEyeRest: true,
    // Living only soft-retargets eye rest when open enough (> threshold).
    softRetargetEyeRest: phase == null || phase > MID_BLINK_PHASE_THRESHOLD,
    blinkPhase: phase,
    threshold: MID_BLINK_PHASE_THRESHOLD,
  };
}

/**
 * Mouth continuity: pilot never teleports mouth; GSAP retargets from current.
 */
export function evaluateMouthRetarget(
  living: LivingStatusSnapshot | null | undefined,
  targetMouth?: number | null,
): MouthRetargetEvaluation {
  const current =
    living && typeof living.mouthOpenness === "number"
      ? living.mouthOpenness
      : null;
  return {
    mouthRetargetFromCurrent: true,
    forbidCanonicalMouthSnap: true,
    currentMouth: current,
    targetMouth: typeof targetMouth === "number" ? targetMouth : null,
  };
}

/**
 * Topology lock must be bitwise-stable across low-frequency pilot applies.
 */
export function evaluateTopologyStability(
  before: TopologyLockSnapshot,
  after: TopologyLockSnapshot,
): TopologyStabilityEvaluation {
  const keys: (keyof TopologyLockSnapshot)[] = [
    "locked",
    "contourSamples",
    "structuralNodes",
    "structuralTriangles",
    "reliefWidth",
    "reliefHeight",
    "reliefMaxSamples",
  ];
  const deltas: string[] = [];
  for (const k of keys) {
    if (before[k] !== after[k]) {
      deltas.push(`${String(k)}: ${String(before[k])} → ${String(after[k])}`);
    }
  }
  return {
    stable: deltas.length === 0 && after.locked === true,
    before: { ...before },
    after: { ...after },
    deltas,
  };
}

/**
 * Survival is never bound to bridge or HQ.
 */
export function evaluateDisconnectSurvival(args: {
  bridgeConnected: boolean;
  hqConnected: boolean;
  operationalMode: string;
}): DisconnectSurvivalEvaluation {
  return {
    bridgeRequiredForSurvival: false,
    hqRequiredForSurvival: false,
    bridgeConnected: args.bridgeConnected,
    hqConnected: args.hqConnected,
    canOperateStandalone: true,
    operationalModeExpected:
      args.operationalMode === "bridged" ||
      args.operationalMode === "degraded" ||
      args.operationalMode === "recovering"
        ? args.operationalMode
        : "standalone",
  };
}

/** Architecture-lock topology for headed/structural proofs. */
export function architectureTopology(): TopologyLockSnapshot {
  return { ...PILOT_DEFAULT_TOPOLOGY };
}

/**
 * Compact living status for evidence (no heavy snapshots).
 */
export function compactLivingStatus(
  living: LivingStatusSnapshot | null | undefined,
): LivingStatusSnapshot | null {
  if (!living) return null;
  return {
    running: living.running,
    eightStateLoop: living.eightStateLoop,
    blinkPhase:
      typeof living.blinkPhase === "number"
        ? Math.round(living.blinkPhase * 1000) / 1000
        : undefined,
    gaze:
      typeof living.gaze === "number"
        ? Math.round(living.gaze * 1000) / 1000
        : undefined,
    interruptCount: living.interruptCount,
    lastInterruptAt: living.lastInterruptAt ?? null,
    eightState: living.eightState ?? null,
    microstate: living.microstate ?? null,
    loopPhase: living.loopPhase ?? null,
    mouthOpenness:
      typeof living.mouthOpenness === "number"
        ? Math.round(living.mouthOpenness * 1000) / 1000
        : living.mouthOpenness ?? null,
  };
}
