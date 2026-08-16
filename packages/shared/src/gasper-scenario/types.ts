/**
 * Versioned contracts for GASPER-007-G eight-state living loop (R2).
 * Naming: Gasper*V1 equivalents with schema ids for fail-closed compile.
 */

import type {
  GasperChannelDomainId,
  GasperChannelTargetV1,
} from "./channels";

export const SCENARIO_COMPILER_ID = "gasper-scenario-compiler" as const;
export const SCENARIO_COMPILER_VERSION = "1.0.0" as const;
export const SCENARIO_SCHEMA_FAMILY = "gasper.scenario" as const;

/** Exact eight showcase scenario IDs (closed living loop). */
export const EIGHT_SCENARIO_IDS = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
] as const;

export type EightScenarioId = (typeof EIGHT_SCENARIO_IDS)[number];

export const EMBODIMENT_IDS = [
  "presence",
  "comet",
  "dormant-orbit",
  "singularity",
] as const;
export type EmbodimentId = (typeof EMBODIMENT_IDS)[number];

export const COGNITIVE_MODES = [
  "idle",
  "attending",
  "listening",
  "integrating",
  "thinking",
  "executing",
  "blocked",
  "reviewing",
  "dormant",
  "waking",
] as const;
export type CognitiveMode = (typeof COGNITIVE_MODES)[number];

export type ValidationStatus =
  | "provisional_authored"
  | "synthetic_provisional"
  | "human_validated";

export type AffectPointV1 = {
  valence: number;
  arousal: number;
  expression_gain: number;
  attention: number;
  certainty: number;
  social_openness?: number;
  urgency?: number;
};

export type AppraisalV1 = {
  novelty: number;
  relevance: number;
  congruence: number;
  certainty: number;
  predictability: number;
  coping: number;
  urgency: number;
  self_agency?: number;
  interruption_pressure?: number;
};

export type ActionTendencyV1 = {
  orient: number;
  explore: number;
  approach: number;
  affiliate: number;
  persist: number;
  reject: number;
  withdraw: number;
  inhibit: number;
  repair: number;
  release: number;
  assert_direction?: number;
};

export type SocialStanceV1 = {
  availability: number;
  warmth: number;
  playfulness: number;
  guardedness: number;
};

export type IdentityConstraintsV1 = {
  character: "gasper";
  identity_lock: true;
  topology_lock: true;
  max_deviation: number;
  protected_invariants: string[];
  no_color_only_distinction: true;
  no_mouth_only_distinction: true;
};

/**
 * Scenario intent seed — authored hypothesis, not measured science.
 * Current-value start is provided separately at compile time.
 */
export type GasperScenarioIntentV1 = {
  schema: "gasper.scenario.intent.v1";
  id: EightScenarioId | string;
  title: string;
  seed: number;
  event: {
    description: string;
    stimulus_class: string;
  };
  appraisal: AppraisalV1;
  affect: AffectPointV1;
  action_tendencies: ActionTendencyV1;
  cognition: {
    mode: CognitiveMode;
    load: number;
    focus: number;
  };
  social: SocialStanceV1;
  embodiment: EmbodimentId;
  visual_semantic: string[];
  historical_fixture_affinities?: string[];
  identity: IdentityConstraintsV1;
  reduced_motion_policy: "scale_durations" | "skip_secondary" | "hold_static";
  validation_status: ValidationStatus;
  provenance: {
    source: string;
    megabook_section?: string;
    notes?: string;
  };
};

/**
 * Compiled scenario state (endpoint identity for one showcase state).
 */
export type GasperScenarioStateV1 = {
  schema: "gasper.scenario.state.v1";
  id: EightScenarioId;
  title: string;
  embodiment: EmbodimentId;
  cognitive_mode: CognitiveMode;
  intent_content_hash: string;
  state_content_hash: string;
  channel_targets: Record<GasperChannelDomainId, GasperChannelTargetV1>;
  affect: AffectPointV1;
  appraisal: AppraisalV1;
  action_tendencies: ActionTendencyV1;
  social: SocialStanceV1;
  identity: IdentityConstraintsV1;
  reduced_motion_policy: GasperScenarioIntentV1["reduced_motion_policy"];
  historical_fixture_affinities: string[];
  visual_semantic: string[];
  validation_status: ValidationStatus;
};

/**
 * Intermediate representation after accepted lowering.
 * Volatile fields (compiled_at) excluded from content_hash.
 */
export type GasperStateIRV1 = {
  schema: "gasper.scenario.ir.v1";
  ir_version: "1.0.0";
  compiler_id: typeof SCENARIO_COMPILER_ID;
  compiler_version: typeof SCENARIO_COMPILER_VERSION;
  scenario_id: string;
  seed: number;
  intent_content_hash: string;
  content_hash: string;
  /** Wall-clock optional; never part of content_hash basis. */
  compiled_at?: string;
  state: GasperScenarioStateV1;
  /** Current-value start is input, not mutated intent. */
  start_snapshot_hash: string | null;
  lowered: {
    binding_targets: Record<string, number>;
    channel_domain_count: number;
    accepted: true;
  };
  validation: {
    status: "compiled" | "failed";
    issues: ValidationIssueV1[];
  };
};

export type ValidationIssueV1 = {
  code: string;
  message: string;
  path?: string;
  severity: "error" | "warning" | "info";
};

export type GasperTransitionPlanV1 = {
  schema: "gasper.transition-plan.v1";
  id: string;
  from: EightScenarioId | string;
  to: EightScenarioId | string;
  /** True wake route for dormant → neutral. */
  kind: "intra_embodiment" | "embodiment_morph" | "wake" | "settle";
  duration_hint_ms: { min: number; target: number; max: number };
  interrupt_class: "soft" | "hard" | "barrier" | "morph_safe";
  easing: string;
  preserve_channels: GasperChannelDomainId[];
  notes?: string;
  transition_content_hash?: string;
};

export type GasperLoopManifestV1 = {
  schema: "gasper.loop-manifest.v1";
  id: string;
  version: "1.0.0";
  loop_content_hash: string;
  closed: true;
  order: EightScenarioId[];
  states: Array<{
    id: EightScenarioId;
    state_content_hash: string;
    embodiment: EmbodimentId;
  }>;
  transitions: GasperTransitionPlanV1[];
  wake_route: {
    from: "dormant-orbit-maintain";
    to: "presence-neutral-settled";
    transition_id: string;
  };
  seed: number;
};

/**
 * Evaluated frame snapshot for evidence / perceptual review (deterministic).
 */
export type GasperEvaluatedFrameV1 = {
  schema: "gasper.evaluated-frame.v1";
  scenario_id: string;
  t_ms: number;
  seed: number;
  embodiment: EmbodimentId;
  binding_targets: Record<string, number>;
  channel_digest: Record<GasperChannelDomainId, string>;
  frame_content_hash: string;
};

export type PairwiseDistanceV1 = {
  a: string;
  b: string;
  differing_domains: GasperChannelDomainId[];
  differing_domain_count: number;
  full_channel_distance: number;
  face_only_distance: number;
  motion_only_distance: number;
  silhouette_only_distance: number;
  energy_material_only_distance: number;
  super_group_hits: {
    form: boolean;
    motion: boolean;
    attention_face: boolean;
    energy_material: boolean;
  };
  passes_min_domains: boolean;
  passes_super_groups: boolean;
  color_only_risk: boolean;
  mouth_only_risk: boolean;
  confusion_risk: boolean;
  /** Engineering gate only — not perceptual proof. */
  engineering_gate: "pass" | "fail";
};

export type GasperDistinctnessBudgetV1 = {
  schema: "gasper.distinctness-budget.v1";
  version: "1.0.0";
  label: "provisional_engineering_gate";
  min_differing_domains: 4;
  required_super_groups: Array<
    "form" | "motion" | "attention_face" | "energy_material"
  >;
  epsilon: number;
  pairs: PairwiseDistanceV1[];
  all_pairs_pass: boolean;
  confusion_flags: string[];
  budget_content_hash: string;
};

export type GasperPerceptualReviewManifestV1 = {
  schema: "gasper.perceptual-review-manifest.v1";
  version: "1.0.0";
  scenario_ids: EightScenarioId[];
  pairwise_tasks: Array<{
    pair_id: string;
    a: EightScenarioId;
    b: EightScenarioId;
    prompt: string;
    channels_to_score: GasperChannelDomainId[];
  }>;
  notes: string[];
  consumes_distinctness_budget: true;
};

export type CompileInputV1 = {
  intent: GasperScenarioIntentV1;
  /**
   * Current-value start state provided separately from scenario intent.
   * Never merged into intent; hashed for provenance only.
   */
  current_value_start?: Record<string, number> | null;
  /** When true, attach ISO compiled_at (excluded from content_hash). */
  include_compiled_at?: boolean;
};

export type CompileResultV1 =
  | { ok: true; ir: GasperStateIRV1 }
  | {
      ok: false;
      error: string;
      issues: ValidationIssueV1[];
      /** Fail closed: no IR mutation artifact. */
      ir: null;
    };
