/**
 * Compiler-facing TypeScript types for GASPER-006 Performance Grammar contracts.
 * D001 freezes schemas + types; behavioral compiler body is out of scope.
 */

/** Closed intent vocabulary (Book §4.1.3). Extensions require ADR + registry bump. */
export const INTENT_TAGS = [
  "notice",
  "orient",
  "narrow_attention",
  "think",
  "knit",
  "realize",
  "excite",
  "compress",
  "launch",
  "travel",
  "settle",
  "return",
  "hold",
  "listen",
  "spark",
] as const;

export type IntentTag = (typeof INTENT_TAGS)[number];

/** Interrupt classes (D08). */
export const INTERRUPT_CLASSES = ["soft", "hard", "barrier", "morph_safe"] as const;
export type InterruptClass = (typeof INTERRUPT_CLASSES)[number];

/** Recognized embodiment ids for route graph. */
export const EMBODIMENT_IDS = [
  "presence",
  "singularity",
  "comet",
  "comet-left",
  "comet-right",
  "dormant-orbit",
] as const;
export type EmbodimentId = (typeof EMBODIMENT_IDS)[number];

/** Priority bands (D05) — higher wins. */
export const PRIORITY_BANDS = {
  identity_lock: { min: 90, max: 100 },
  embodiment_route: { min: 70, max: 89 },
  expression_affect: { min: 50, max: 69 },
  living_idle_secondary: { min: 20, max: 49 },
  debug_lab_override: { min: 0, max: 19 },
} as const;

export type ChannelCombinator =
  | "replace"
  | "max"
  | "weighted_sum"
  | "override_by_priority";

export type ChannelVelocity = "low" | "medium" | "high";

export type AffectDimensionStatus = "freeze" | "provisional";

/** Frozen day-1 affect dimensions (D01). */
export const AFFECT_DIMENSIONS_REQUIRED = [
  "valence",
  "arousal",
  "expression_gain",
  "attention",
  "certainty",
] as const;

/** Provisional affect dimensions (may omit without breaking day-1 compile). */
export const AFFECT_DIMENSIONS_PROVISIONAL = ["social_openness", "urgency"] as const;

export type RequiredAffectDimension = (typeof AFFECT_DIMENSIONS_REQUIRED)[number];
export type ProvisionalAffectDimension = (typeof AFFECT_DIMENSIONS_PROVISIONAL)[number];
export type AffectDimensionId = RequiredAffectDimension | ProvisionalAffectDimension;

export type AffectPoint = {
  valence: number;
  arousal: number;
  expression_gain: number;
  attention: number;
  certainty: number;
  social_openness?: number;
  urgency?: number;
};

export type DurationHintMs = {
  min: number;
  target: number;
  max: number;
};

export type PerformanceIntentPhase = {
  id: string;
  label?: string;
  intent_tags: IntentTag[];
  duration_hint_ms?: DurationHintMs;
  affect_target: AffectPoint;
  embodiment_preference?: EmbodimentId;
  expression_anchor?: string;
  interrupt_class: InterruptClass;
  constraints?: {
    preserve_identity?: boolean;
    max_channel_velocity?: ChannelVelocity;
  };
};

export type PerformanceIntent = {
  schema: "gasper.performance.intent.v1";
  id: string;
  title?: string;
  seed: number;
  character: "gasper";
  identity_lock: boolean;
  phases: PerformanceIntentPhase[];
  global_constraints: {
    topology_lock: boolean;
    legacy_authority_required: boolean;
    no_arbitrary_gsap: boolean;
    reduced_motion_policy?: "scale_durations" | "skip_secondary" | "hold_static";
  };
  provenance?: {
    authored_by?: "human" | "mcp" | "hybrid";
    source_refs?: string[];
  };
};

export type AffectSpan = {
  t0_ms: number;
  t1_ms: number;
  from: AffectPoint;
  to: AffectPoint;
  easing: string;
};

export type AffectHold = {
  t_ms: number;
  point: AffectPoint;
  duration_ms: number;
};

export type AffectTrajectory = {
  sample_rate_hz_hint?: number;
  spans: AffectSpan[];
  holds?: AffectHold[];
};

export type ChannelKey = {
  t_ms: number;
  value: number;
  easing?: string;
};

export type ChannelTrajectory = {
  channel_id: string;
  keys: ChannelKey[];
  priority?: number;
  combinator?: ChannelCombinator;
};

export type RouteStep = {
  route_id: string;
  from: string;
  to: string;
  t0_ms?: number;
  duration_ms?: number;
  clip_template_ref?: string | null;
  interrupt_class?: InterruptClass;
};

export type RoutePlan = {
  steps: RouteStep[];
  expression_only?: boolean;
};

export type InterruptBoundary = {
  phase_id: string;
  t_ms?: number;
  interrupt_class: InterruptClass;
  notes?: string;
};

export type InterruptPlan = {
  default_class: InterruptClass;
  boundaries: InterruptBoundary[];
};

export type CausalContribution = {
  source: string;
  channels: string[];
  weight: number;
};

export type CausalEntry = {
  t_ms: number;
  phase_id: string;
  contributions: CausalContribution[];
};

export type ValidationIssue = {
  code: string;
  message: string;
  path?: string;
  severity?: "error" | "warning" | "info";
};

export type ValidationReport = {
  status: "compiled" | "warnings" | "failed";
  issues: ValidationIssue[];
};

/**
 * Performance IR envelope (D10).
 * `compiled_at` is volatile and excluded from content_hash / determinism basis.
 */
export type PerformanceIR = {
  schema: "gasper.performance.ir.v1";
  ir_version: string;
  compiler_id: string;
  compiler_version: string;
  intent_id: string;
  intent_content_hash: string;
  seed: number;
  /** Wall-clock; excluded from determinism hash basis. */
  compiled_at?: string;
  content_hash: string;
  registry_hash?: string;
  route_graph_hash?: string;
  affect_dimension_registry_hash?: string;
  affect_trajectory: AffectTrajectory;
  channel_trajectories: Record<string, ChannelTrajectory>;
  routes: RoutePlan;
  interrupt_plan: InterruptPlan;
  lowered?: {
    animation_plan_ref?: string | null;
    clip_library_delta?: unknown | null;
    schema_target?: string;
  };
  causal_index?: CausalEntry[];
  validation: ValidationReport;
};

export type ChannelRange = {
  min: number;
  max: number;
};

export type ChannelRegistryEntry = {
  id: string;
  domain: string;
  unit: string;
  range: ChannelRange;
  default: number;
  priority: number;
  combinator: ChannelCombinator;
  conflict_group: string;
  interrupt_sample: boolean;
  topology_sensitive: boolean;
  legacy_binding: string;
  coverage?: string[];
  embodiment_gated?: boolean;
};

export type ChannelRegistry = {
  schema: string;
  version: string;
  description?: string;
  priority_bands: typeof PRIORITY_BANDS | Record<string, { min: number; max: number }>;
  combinators: ChannelCombinator[];
  default_combinator: ChannelCombinator;
  sources_scanned?: string[];
  channels: ChannelRegistryEntry[];
};

export type AffectDimensionEntry = {
  id: AffectDimensionId | string;
  range: ChannelRange;
  default: number;
  unit: string;
  meaning: string;
  status: AffectDimensionStatus;
  required_day1: boolean;
  freeze_gate?: string;
  source?: string;
};

export type AffectDimensionRegistry = {
  schema: string;
  version: string;
  description?: string;
  dimensions: AffectDimensionEntry[];
};

export type EmbodimentRoute = {
  route_id: string;
  from: string;
  to: string;
  duration_ms_default: number;
  channel_mask: string[];
  clip_template_ref: string | null;
  interrupt_class_default: InterruptClass;
  identity_checks: boolean;
  status: string;
  notes?: string;
};

export type GatedEmbodimentRoute = {
  route_id: string;
  from: string;
  to: string;
  status: string;
  open_decision: string;
  reason: string;
  allowed_workaround: string;
};

export type EmbodimentRouteGraph = {
  schema: string;
  version: string;
  description?: string;
  embodiments: string[];
  priority_band?: { min: number; max: number; label?: string };
  routes: EmbodimentRoute[];
  gated_routes: GatedEmbodimentRoute[];
  selection_rules?: string[];
};

/**
 * Canonical hash basis for future compilation (determinism contract).
 * Wall-clock compilation time is intentionally excluded.
 */
export type DeterminismHashBasis = {
  intent_content: unknown;
  seed: number;
  compiler_version: string;
  registry_hash: string;
  route_graph_hash: string;
  affect_dimension_registry_hash: string;
};

/** Numeric quantization for hash stability (O03: fixed at 6 decimal places for D001). */
export const HASH_FLOAT_DECIMALS = 6;

export const PERFORMANCE_SCHEMA_IDS = {
  intent: "gasper.performance.intent.v1",
  ir: "gasper.performance.ir.v1",
  affectDimensions: "gasper.performance.affect-dimensions.v1",
  channelRegistry: "gasper.performance.channel-registry.v1",
  embodimentRoutes: "gasper.performance.embodiment-routes.v1",
} as const;

export const COMPILER_ID = "gasper-behavioral-compiler";
export const COMPILER_VERSION_STUB = "0.1.0";
