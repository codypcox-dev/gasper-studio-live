/**
 * Gasper low-frequency piloting kernel contracts (v1).
 *
 * Low-frequency = semantic plans and state snapshots only.
 * Frame authority remains GSAP / native animation inside standalone Gasper Studio.
 * MCP, CDP, Playwright, REST, and HQ must never drive per-frame values through this kernel.
 * Runtime survival does not require AgentBridge or Headquarters connectivity.
 */

export const GASPER_PILOT_SCHEMA = "gasper.pilot.plan.v1" as const;
export const GASPER_PILOT_STATE_SCHEMA = "gasper.pilot.state.v1" as const;
export const GASPER_PILOT_RESULT_SCHEMA = "gasper.pilot.result.v1" as const;
export const GASPER_PILOT_KERNEL_VERSION = "1.0.0" as const;

/** Closed set of pilot operations — bounded first kernel. */
export const PILOT_OPS = [
  "get_state",
  "validate_plan",
  "apply_plan",
  "get_result",
] as const;
export type PilotOp = (typeof PILOT_OPS)[number];

export const PILOT_INTENT_KINDS = [
  "set_operational_state",
  "transition_scenario",
  "hold",
  "recover",
  "interrupt",
] as const;
export type PilotIntentKind = (typeof PILOT_INTENT_KINDS)[number];

/**
 * Safe interrupt policies for low-frequency retarget.
 * All policies preserve current values as GSAP start points (no teleport).
 */
export const INTERRUPT_POLICIES = [
  /** Freeze visible pose; cancel pending pilot transition. */
  "hold",
  /** Blend from current values toward new targets (default). */
  "blend",
  /** Immediate retarget from current values via GSAP native. */
  "retarget",
  /** Queue until current transition settles (bounded wait). */
  "queue",
] as const;
export type InterruptPolicy = (typeof INTERRUPT_POLICIES)[number];

export const RECOVERY_MODES = [
  /** Resume last good applied plan without bridge. */
  "standalone_resume",
  /** Hold last good visible pose. */
  "hold_last_good",
  /** Return to presence-neutral-settled endpoint. */
  "return_to_settled",
] as const;
export type RecoveryMode = (typeof RECOVERY_MODES)[number];

export const PILOT_PLAYBACK = [
  "idle",
  "transitioning",
  "holding",
  "interrupted",
  "recovering",
  "settled",
] as const;
export type PilotPlayback = (typeof PILOT_PLAYBACK)[number];

export const PILOT_OPERATIONAL_MODES = [
  "standalone",
  "bridged",
  "degraded",
  "recovering",
] as const;
export type PilotOperationalMode = (typeof PILOT_OPERATIONAL_MODES)[number];

export const PILOT_ERROR_CODES = [
  "INVALID_PLAN",
  "UNKNOWN_INTENT",
  "REVISION_CONFLICT",
  "IDEMPOTENCY_MISMATCH",
  "CONSTRAINT_VIOLATION",
  "TOPOLOGY_LOCK_VIOLATION",
  "UNSAFE_FRAME_AUTHORITY",
  "MCP_FRAME_FORBIDDEN",
  "QUEUE_FULL",
  "NOT_APPLIED",
  "RESULT_NOT_FOUND",
  "KERNEL_CLOSED",
  "CHANNEL_HINT_OUT_OF_RANGE",
] as const;
export type PilotErrorCode = (typeof PILOT_ERROR_CODES)[number];

/** Sparse channel hints only — not a full evaluated frame. */
export type PilotChannelHints = Record<string, number>;

export type PilotConstraints = {
  /** Topology counts must match architecture lock when set. */
  topologyLock?: boolean;
  identityLock?: boolean;
  /** Reject plans that would drive frames through MCP. */
  forbidMcpFrames?: true;
  /** Max absolute channel hint delta from current (optional safety). */
  maxChannelDelta?: number;
  /** Protected channel ids that must not be written by hints. */
  protectedChannels?: readonly string[];
};

/**
 * Typed low-frequency pilot plan.
 * Does not contain per-frame samples, timeline keyframes, or MCP transport.
 */
export type GasperPilotPlan = {
  schema: typeof GASPER_PILOT_SCHEMA;
  planId: string;
  /** Same key + same plan content hash ⇒ deterministic replay (no double apply). */
  idempotencyKey: string;
  /** Optimistic concurrency against pilot kernel revision. */
  expectedRevision?: number;
  intent: GasperPilotIntent;
  interrupt: InterruptPolicy;
  constraints?: PilotConstraints;
  /**
   * Animation handoff. v1 only allows gsap-native.
   * Frame interpolation is never performed inside this kernel.
   */
  animationHandoff: "gsap-native";
  /**
   * Who may produce continuous frames after apply.
   * "hold" freezes; never "mcp" / "cdp" / "react".
   */
  frameAuthority: "gsap-native" | "hold";
  provenance?: {
    source: string;
    notes?: string;
    /** Explicit: plan is low-frequency; not a frame stream. */
    frequency: "low";
  };
};

export type GasperPilotIntent = {
  kind: PilotIntentKind;
  embodiment?: string;
  cognitiveMode?: string;
  /** Eight-state scenario id or named operational state. */
  scenarioId?: string;
  expressionFixtureId?: string;
  /** Sparse semantic hints only (0..1 typical). Not a full frame. */
  channelHints?: PilotChannelHints;
  reducedMotion?: boolean;
  recoveryMode?: RecoveryMode;
};

export type TopologyLockSnapshot = {
  locked: boolean;
  contourSamples: number;
  structuralNodes: number;
  structuralTriangles: number;
  reliefWidth: number;
  reliefHeight: number;
  reliefMaxSamples: number;
};

/**
 * Eye/mouth temporal coherence flags for PilotOps embodiment.
 * Kernel tracks policy state only; GSAP owns continuous timing.
 */
export type EyeMouthCoherenceSnapshot = {
  /** Blink must not fight gaze ownership. */
  blinkGazeExclusive: boolean;
  /** Mouth open/width must not jump without retarget-from-current. */
  mouthRetargetFromCurrent: boolean;
  /** Minimum gap policy id (native scheduler owns timing). */
  temporalPolicy: "eight-state-gaze-blink" | "hold" | "reduced-motion";
};

export type GasperPilotState = {
  schema: typeof GASPER_PILOT_STATE_SCHEMA;
  kernelVersion: typeof GASPER_PILOT_KERNEL_VERSION;
  revision: number;
  operationalMode: PilotOperationalMode;
  /**
   * Survival invariant: false always.
   * Bridge may enrich piloting; it must not be required for runtime life.
   */
  bridgeRequiredForSurvival: false;
  bridgeConnected: boolean;
  hqConnected: boolean;
  embodiment: string;
  cognitiveMode: string;
  scenarioId: string | null;
  expressionFixtureId: string | null;
  playback: PilotPlayback;
  activePlanId: string | null;
  lastPlanId: string | null;
  lastResultId: string | null;
  interruptPolicy: InterruptPolicy;
  topology: TopologyLockSnapshot;
  eyeMouthCoherence: EyeMouthCoherenceSnapshot;
  reducedMotion: boolean;
  /** Frame authority claim — always GSAP/native or hold. */
  frameAuthority: "gsap-native" | "hold";
  gsapAuthority: true;
  mcpFrameDriving: false;
  /** Pending queue depth for interrupt=queue plans. */
  queueDepth: number;
  contentHash: string;
  updatedAtMs: number;
};

export type GasperPilotResultStatus =
  | "accepted"
  | "applied"
  | "idempotent_replay"
  | "rejected"
  | "interrupted"
  | "recovered"
  | "queued"
  | "holding";

export type GasperPilotResult = {
  schema: typeof GASPER_PILOT_RESULT_SCHEMA;
  resultId: string;
  planId: string;
  idempotencyKey: string;
  planContentHash: string;
  status: GasperPilotResultStatus;
  ok: boolean;
  revisionBefore: number;
  revisionAfter: number;
  /** True when apply expects native GSAP to retarget (not this kernel). */
  gsapHandoffExpected: boolean;
  /** Explicit: this result is not a frame and was not produced by MCP. */
  isFrame: false;
  mcpFrameDriving: false;
  error?: PilotErrorCode;
  detail?: string;
  issues?: PilotValidationIssue[];
  appliedIntent?: GasperPilotIntent;
  recoveredVia?: RecoveryMode;
  createdAtMs: number;
};

export type PilotValidationIssue = {
  code: PilotErrorCode | string;
  message: string;
  path?: string;
  severity: "error" | "warning" | "info";
};

export type PilotValidateOutcome =
  | { ok: true; planContentHash: string; issues: PilotValidationIssue[] }
  | {
      ok: false;
      planContentHash: string | null;
      error: PilotErrorCode;
      detail: string;
      issues: PilotValidationIssue[];
    };

export type PilotApplyOutcome =
  | { ok: true; result: GasperPilotResult; state: GasperPilotState }
  | { ok: false; result: GasperPilotResult; state: GasperPilotState };

export type PilotKernelConfig = {
  /** Architecture-lock topology defaults. */
  topology?: Partial<TopologyLockSnapshot>;
  /** Max queued plans under interrupt=queue (default 4). */
  maxQueueDepth?: number;
  /** Seed embodiment. */
  embodiment?: string;
  cognitiveMode?: string;
  scenarioId?: string | null;
  expressionFixtureId?: string | null;
  /** Clock for tests (ms). */
  nowMs?: () => number;
};

/** Explicit boundary markers for structural tests and audits. */
export const PILOT_FORBIDDEN_FRAME_AUTHORITIES = [
  "mcp",
  "cdp",
  "playwright",
  "rest",
  "react",
  "postMessage",
  "iframe",
] as const;

export const PILOT_DEFAULT_TOPOLOGY: TopologyLockSnapshot = {
  locked: true,
  contourSamples: 512,
  structuralNodes: 360,
  structuralTriangles: 672,
  reliefWidth: 25,
  reliefHeight: 40,
  reliefMaxSamples: 1000,
};

export const PILOT_DEFAULT_EYE_MOUTH: EyeMouthCoherenceSnapshot = {
  blinkGazeExclusive: true,
  mouthRetargetFromCurrent: true,
  temporalPolicy: "eight-state-gaze-blink",
};
