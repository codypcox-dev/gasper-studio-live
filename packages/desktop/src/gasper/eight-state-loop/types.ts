/**
 * GASPER-007-G R4 — thin local adapter types for frozen R2 interface names.
 *
 * Root will reconcile these with R2 (`packages/desktop/src/gasper/scenario/**`)
 * when that lane merges. Do not invent conflicting parallel shapes elsewhere.
 *
 * Ownership: R4 motion runtime only. Forbidden to write scenario/** from R4.
 */

import type { DomainScalarMap } from "../GasperDomainState";

/** Eight showcase scenarios + wake closing transition. */
export type EightStateId =
  | "presence-neutral-settled"
  | "presence-listening-receive"
  | "presence-thinking-knit"
  | "presence-recognition-spark"
  | "comet-executing-drive"
  | "presence-blocked-strain"
  | "presence-pleased-resolve"
  | "dormant-orbit-maintain"
  | "wake";

/** Loop route nodes that hold (wake is transitional). */
export type EightStateHoldId = Exclude<EightStateId, "wake">;

/**
 * GASPER-BEH-001 — one typed three-beat envelope for every hold state and wake.
 * gather → peak → settle are finite positive phase durations; holdSeconds is the
 * post-settle sustain (0 for pure wake transition envelopes).
 */
export type ThreeBeatSpec = Readonly<{
  gatherSeconds: number;
  peakSeconds: number;
  settleSeconds: number;
  holdSeconds: number;
  dominantChannels: readonly string[];
  phaseOffset: number;
}>;

export type ThreeBeatPhase = "gather" | "peak" | "settle" | "hold";

export type ThreeBeatProgress = Readonly<{
  stateId: EightStateId;
  phase: ThreeBeatPhase;
  phaseProgress: number;
  envelope: number;
  elapsedInBeatSeconds: number;
  seed: number;
  phaseOffset: number;
  threeBeat: ThreeBeatSpec;
}>;

/**
 * Frozen-name adapter: GasperChannelTargetV1
 * R2 will own the canonical definition; this matches the expected shape.
 */
export type GasperChannelTargetV1 = {
  stateId: EightStateId;
  channels: DomainScalarMap;
  motionSignature: MotionSignatureV1;
  reducedMotionScale?: number;
  /** Optional BEH-001 three-beat envelope (identity contract; projection later). */
  threeBeat?: ThreeBeatSpec;
};

/**
 * Frozen-name adapter: GasperLoopManifestV1
 */
export type GasperLoopManifestV1 = {
  id: string;
  version: 1;
  route: readonly EightStateId[];
  totalCycleTargetSeconds: { min: number; max: number };
  steps: readonly LoopStepV1[];
  proofSeedDefault: number;
};

export type LoopStepV1 = {
  from: EightStateId;
  to: EightStateId;
  /** Transition duration seconds (semantic, not uniform). */
  transitionSeconds: number;
  /** Hold duration at `to` before next transition (0 for pure transitions like wake mid-route). */
  holdSeconds: number;
  easeBias: string;
  phaseOffsets?: Partial<Record<string, number>>;
  channelDurationScale?: Partial<Record<string, number>>;
  /**
   * Arrival-state three-beat envelope (GASPER-BEH-001).
   * Canonical DEFAULT_LOOP_MANIFEST / CONTINUOUS_LOOP_MANIFEST always populate this;
   * custom or legacy GasperLoopManifestV1 steps may omit it for backward compatibility.
   */
  threeBeat?: ThreeBeatSpec;
  /** Authored rest punctuation recorded in the scene manifest (Task 5). */
  restPolicy?: BeatRestPolicy;
};

/**
 * GASPER-FINISH-01 Task 5 — authored rest punctuation policy (MOTION-037).
 * postAccentRestMs must exceed preAccentGatherMs on routes that need
 * punctuation; anchoredRest keeps long loops from accumulating drift.
 */
export type BeatRestPolicy = Readonly<{
  preAccentGatherMs: number;
  postAccentRestMs: number;
  enforcePunctuation: boolean;
  anchoredRest: boolean;
}>;

/**
 * Frozen-name adapter: GasperDistinctnessBudgetV1 (minimal motion-facing view)
 */
export type GasperDistinctnessBudgetV1 = {
  minChannelDelta: number;
  minMotionSignatureDistance: number;
  requiredDistinctChannels: readonly string[];
};

export type LabanWeight = "light" | "medium-light" | "medium" | "strong-medium" | "strong";
export type LabanTime = "sustained" | "sudden" | "sudden-to-sustained";
export type LabanSpace = "indirect" | "slightly-indirect" | "direct" | "circular-indirect";
export type LabanFlow = "free" | "mostly-free" | "controlled" | "bound" | "tightly-controlled";
export type PhrasingKind =
  | "increasing"
  | "decreasing"
  | "impulse"
  | "rebound"
  | "sustained"
  | "interrupted"
  | "settling";

export type MotionSignatureV1 = {
  weight: LabanWeight;
  time: LabanTime;
  space: LabanSpace;
  flow: LabanFlow;
  vertical: "rise" | "neutral" | "sink";
  horizontal: "widen" | "neutral" | "narrow";
  sagittal: "advance" | "neutral" | "retreat";
  phrasing: PhrasingKind;
};

export type MotionLayerId =
  | "base_form"
  | "embodiment_transition"
  | "expression_state_target"
  | "primary_scenario_transition"
  | "blink"
  | "gaze_saccade"
  | "breathing"
  | "energy_pulse_lag"
  | "relief_drift"
  | "microvariation"
  | "secondary_wobble"
  | "interruption_recovery"
  | "manual_override"
  | "reduced_motion_projection";

export type LayerMixMode = "replace" | "additive" | "modulate" | "gate";

export type LayerAuthorityEntry = {
  id: MotionLayerId;
  precedence: number;
  mix: LayerMixMode;
  owns: readonly string[];
  neverOwns: readonly string[];
  notes: string;
};

export type GazeBlinkPolicy = {
  stateId: EightStateId;
  blinkMinGapSec: number;
  blinkMaxGapSec: number;
  blinkCloseDur: [number, number];
  blinkOpenDur: [number, number];
  saccadeMinGapSec: number;
  saccadeMaxGapSec: number;
  saccadeAmp: number;
  gazeCenterBias: number;
  allowBlink: boolean;
  allowSaccade: boolean;
};

export type EightStateLoopOptions = {
  seed?: number;
  reducedMotion?: boolean;
  /** When true, auto-advance the showcase loop. */
  autoLoop?: boolean;
  /** Deterministic proof mode (seeded RNG, fixed timings). */
  proofMode?: boolean;
  /** Optional override of default step timing scale (1 = nominal). */
  timingScale?: number;
};

export type EightStateLoopStatus = {
  running: boolean;
  stateId: EightStateId;
  routeIndex: number;
  phase: "hold" | "transition" | "interrupted" | "idle";
  cycleCount: number;
  reducedMotion: boolean;
  proofMode: boolean;
  seed: number | null;
  interruptCount: number;
  lastInterruptAt: number | null;
  lastInterruptFrom: EightStateId | null;
  lastInterruptTo: EightStateId | null;
  engine: "gsap";
  livingLayersActive: boolean;
  elapsedCycleSeconds: number;
  targetCycleSeconds: number;
  /** GASPER-UNIFIED-LIFE-001 profile grammar currently driving the hold. */
  embodimentId?: string;
  /** Explicit production-consumed 8×9 profile/state authority entry. */
  matrixTargetKey?: string;
  lifePhase?: ThreeBeatPhase;
  activeRest?: boolean;
  /** CONTINUOUS_FLUID_LOOP: live oscillator readout so the running eight-state
   * loop's breath/blink/gaze are surfaced honestly (the runtime's own Bank-A
   * oscillators are not started under the loop). Optional for back-compat. */
  breath?: number;
  blinkPhase?: number;
  gaze?: number;
  /** Unified Theory readout from the same temporal authority as the channels. */
  unifiedOscillatorCount?: number;
  unifiedDampingRatio?: number;
  unifiedVolumeProduct?: number;
  unifiedBreathRateHz?: number;
  unifiedPulseRateHz?: number;
  unifiedTimeScale?: number;
  unifiedWanderPink?: number;
  unifiedMood?: number;
  unifiedLightIntensity?: number;
  dispositionMood?: number;
  habitSalience?: number;
  audioBindingWindowMs?: number;
  unifiedAudioSourceFrameIndex?: number;
  /** Explicit dormant maintenance mode; this is not a ninth character state. */
  longRestActive?: boolean;
  longRestElapsedSeconds?: number;
  longRestBeatIndex?: number;
  autoLoop?: boolean;
  /** GASPER-SCENE-001: active embodiment scene suite telemetry (null before first frame). */
  sceneSuiteId?: string | null;
  sceneMovementId?: string | null;
  sceneIntent?: "in" | "during" | "out" | null;
};

export type InterruptionSample = {
  caseId: string;
  from: EightStateId;
  toward: EightStateId;
  interruptWith: EightStateId;
  atProgress: number;
  immediateDeltaMax: number;
  velocityDiscontinuityMax: number;
  faceContinuity: boolean;
  silhouetteContinuity: boolean;
  energyContinuity: boolean;
  snapped: boolean;
  notes: string;
};

/** Binding keys that form face identity continuity checks. */
export const FACE_CONTINUITY_KEYS = [
  "eye_openness",
  "eye_spacing",
  "mouth_openness",
  "mouth_width",
  "face_scale",
  "corner_pull_l",
  "corner_pull_r",
  "gaze",
] as const;

export const SILHOUETTE_CONTINUITY_KEYS = [
  "overall_height",
  "overall_width",
  "crown_height",
  "ground_flattening",
  "lower_body_fullness",
] as const;

export const ENERGY_CONTINUITY_KEYS = [
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "internal_glow",
  "face_emissive",
] as const;
