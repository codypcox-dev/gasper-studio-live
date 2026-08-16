/**
 * Accepted deterministic 18-anchor emotion kernel (Gasper 6.5.5 legacy).
 * Recovered from crates/expression-core AnchorRegistry::gasper_v655_legacy
 * and packages/shared gasper-scenario historical-mapping.
 * validation_status remains provisional_authored — not human-validated.
 */

export const ANCHOR_REGISTRY_VERSION = "gasper-6.5.5-legacy-18@provisional" as const;
export const ANCHOR_VALIDATION_STATUS = "provisional_authored" as const;
export const HISTORICAL_ANCHOR_COUNT = 18 as const;

export type AnchorRole =
  | "primary_anchor"
  | "secondary_anchor"
  | "transition_precedent"
  | "visual_candidate"
  | "deprecated_redundant"
  | "bridge_only";

export type ExpressionFamily =
  | "neutral"
  | "listening"
  | "thinking"
  | "mischievous"
  | "pleased"
  | "blocked";

export type EightScenarioId =
  | "presence-neutral-settled"
  | "presence-listening-receive"
  | "presence-thinking-knit"
  | "presence-recognition-spark"
  | "comet-executing-drive"
  | "presence-blocked-strain"
  | "presence-pleased-resolve"
  | "dormant-orbit-maintain";

export type ExpressionAnchor = {
  fixture_id: string;
  legacy_family: ExpressionFamily;
  descriptive_intent: string;
  affect_valence: number;
  affect_arousal: number;
  expression_gain_default: number;
  validation_status: typeof ANCHOR_VALIDATION_STATUS;
  provenance: string;
  primary_scenario: EightScenarioId | null;
  secondary_scenarios: EightScenarioId[];
  role: AnchorRole;
  notes: string;
};

/** Canonical 18 anchors — do not invent arbitrary morphs. */
export const EXPRESSION_18_ANCHORS: readonly ExpressionAnchor[] = Object.freeze([
  {
    fixture_id: "neutral-settled",
    legacy_family: "neutral",
    descriptive_intent: "quiet available presence",
    affect_valence: 0.1,
    affect_arousal: 0.25,
    expression_gain_default: 0.32,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-neutral-settled",
    secondary_scenarios: ["dormant-orbit-maintain"],
    role: "primary_anchor",
    notes: "Strongest neutral resting anchor; also wake recovery target.",
  },
  {
    fixture_id: "neutral-social",
    legacy_family: "neutral",
    descriptive_intent: "soft social readiness",
    affect_valence: 0.25,
    affect_arousal: 0.35,
    expression_gain_default: 0.4,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-neutral-settled",
    secondary_scenarios: ["presence-listening-receive", "presence-pleased-resolve"],
    role: "secondary_anchor",
    notes: "Openness bias for social-available neutrals.",
  },
  {
    fixture_id: "neutral-wry",
    legacy_family: "neutral",
    descriptive_intent: "slight knowing tilt",
    affect_valence: 0.15,
    affect_arousal: 0.4,
    expression_gain_default: 0.42,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-neutral-settled",
    secondary_scenarios: ["presence-recognition-spark"],
    role: "visual_candidate",
    notes: "Asymmetry / wry micro-expression candidate; not a separate showcase state.",
  },
  {
    fixture_id: "listening-open",
    legacy_family: "listening",
    descriptive_intent: "receptive orient",
    affect_valence: 0.2,
    affect_arousal: 0.4,
    expression_gain_default: 0.48,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-listening-receive",
    secondary_scenarios: [],
    role: "primary_anchor",
    notes: "Primary listening reception posture.",
  },
  {
    fixture_id: "listening-focus",
    legacy_family: "listening",
    descriptive_intent: "narrowed attention",
    affect_valence: 0.1,
    affect_arousal: 0.45,
    expression_gain_default: 0.5,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-listening-receive",
    secondary_scenarios: ["presence-thinking-knit"],
    role: "secondary_anchor",
    notes: "Narrowed aperture parameters reusable for listening→thinking.",
  },
  {
    fixture_id: "listening-warm",
    legacy_family: "listening",
    descriptive_intent: "affiliative listen",
    affect_valence: 0.35,
    affect_arousal: 0.4,
    expression_gain_default: 0.52,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-listening-receive",
    secondary_scenarios: ["presence-pleased-resolve"],
    role: "visual_candidate",
    notes: "Warmth bias for affiliative listen.",
  },
  {
    fixture_id: "thinking-knit",
    legacy_family: "thinking",
    descriptive_intent: "inward cognitive load",
    affect_valence: 0.0,
    affect_arousal: 0.45,
    expression_gain_default: 0.45,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-thinking-knit",
    secondary_scenarios: [],
    role: "primary_anchor",
    notes: "Direct namesake of showcase thinking state.",
  },
  {
    fixture_id: "thinking-scan",
    legacy_family: "thinking",
    descriptive_intent: "exploratory cognition",
    affect_valence: 0.05,
    affect_arousal: 0.5,
    expression_gain_default: 0.48,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-thinking-knit",
    secondary_scenarios: ["presence-recognition-spark"],
    role: "secondary_anchor",
    notes: "Gaze microvariation / exploratory scan precedent.",
  },
  {
    fixture_id: "thinking-resolve",
    legacy_family: "thinking",
    descriptive_intent: "converging solution",
    affect_valence: 0.2,
    affect_arousal: 0.4,
    expression_gain_default: 0.5,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-recognition-spark",
    secondary_scenarios: ["presence-thinking-knit", "presence-pleased-resolve"],
    role: "transition_precedent",
    notes: "Bridge thinking → recognition / resolve.",
  },
  {
    fixture_id: "mischievous-spark",
    legacy_family: "mischievous",
    descriptive_intent: "playful approach",
    affect_valence: 0.45,
    affect_arousal: 0.65,
    expression_gain_default: 0.7,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-recognition-spark",
    secondary_scenarios: ["comet-executing-drive"],
    role: "primary_anchor",
    notes: "High-activation spark energy for recognition (not pure mischief showcase).",
  },
  {
    fixture_id: "mischievous-side",
    legacy_family: "mischievous",
    descriptive_intent: "lateral tease",
    affect_valence: 0.4,
    affect_arousal: 0.55,
    expression_gain_default: 0.62,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-recognition-spark",
    secondary_scenarios: [],
    role: "visual_candidate",
    notes: "Lateral asymmetry candidate; not required for eight-state loop.",
  },
  {
    fixture_id: "mischievous-hold",
    legacy_family: "mischievous",
    descriptive_intent: "contained mischief",
    affect_valence: 0.35,
    affect_arousal: 0.5,
    expression_gain_default: 0.55,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: null,
    secondary_scenarios: ["presence-recognition-spark", "presence-pleased-resolve"],
    role: "deprecated_redundant",
    notes: "Contained play absorbed into recognition/pleased; keep as ablation control.",
  },
  {
    fixture_id: "pleased-glow",
    legacy_family: "pleased",
    descriptive_intent: "warm satisfaction",
    affect_valence: 0.55,
    affect_arousal: 0.4,
    expression_gain_default: 0.55,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-pleased-resolve",
    secondary_scenarios: [],
    role: "secondary_anchor",
    notes: "Energy release / glow for pleased resolve.",
  },
  {
    fixture_id: "pleased-soft",
    legacy_family: "pleased",
    descriptive_intent: "gentle contentment",
    affect_valence: 0.45,
    affect_arousal: 0.3,
    expression_gain_default: 0.48,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-pleased-resolve",
    secondary_scenarios: [],
    role: "primary_anchor",
    notes: "Native fixture + historical soft please alignment.",
  },
  {
    fixture_id: "pleased-bright",
    legacy_family: "pleased",
    descriptive_intent: "celebratory lift",
    affect_valence: 0.6,
    affect_arousal: 0.55,
    expression_gain_default: 0.62,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-pleased-resolve",
    secondary_scenarios: ["presence-recognition-spark"],
    role: "visual_candidate",
    notes: "Upper bound for lift; showcase uses contained satisfaction, not broad celebration.",
  },
  {
    fixture_id: "blocked-stall",
    legacy_family: "blocked",
    descriptive_intent: "goal incongruence",
    affect_valence: -0.35,
    affect_arousal: 0.45,
    expression_gain_default: 0.3,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-blocked-strain",
    secondary_scenarios: [],
    role: "secondary_anchor",
    notes: "Lower-arousal block; used for ablation vs strain.",
  },
  {
    fixture_id: "blocked-guard",
    legacy_family: "blocked",
    descriptive_intent: "defensive withdraw",
    affect_valence: -0.3,
    affect_arousal: 0.5,
    expression_gain_default: 0.32,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-blocked-strain",
    secondary_scenarios: ["dormant-orbit-maintain"],
    role: "visual_candidate",
    notes: "Guarded withdraw cues; avoid fear caricature in showcase.",
  },
  {
    fixture_id: "blocked-strain",
    legacy_family: "blocked",
    descriptive_intent: "effort under constraint",
    affect_valence: -0.25,
    affect_arousal: 0.6,
    expression_gain_default: 0.33,
    validation_status: ANCHOR_VALIDATION_STATUS,
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-blocked-strain",
    secondary_scenarios: [],
    role: "primary_anchor",
    notes: "Direct namesake of blocked showcase state.",
  },
] as const);

/**
 * FormMaster / native / hero-pack ids → kernel ids.
 * Aligned with packages/desktop expression formMasterBridge FORM_MASTER_TO_KERNEL.
 */
export const NATIVE_FIXTURE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  "listening-orient": "listening-open",
  "listening-hold": "listening-focus",
  "listening-receive": "listening-warm",
  "mischievous-left": "mischievous-side",
  "mischievous-right": "mischievous-hold",
  "pleased-warm": "pleased-glow",
  "pleased-contained": "pleased-soft",
  "blocked-uncertain": "blocked-stall",
  "blocked-compressed": "blocked-guard",
  "blocked-retry": "blocked-strain",
  recovering: "neutral-settled",
  "recognition-spark": "mischievous-spark",
});

const BY_ID = new Map(EXPRESSION_18_ANCHORS.map((a) => [a.fixture_id, a]));

export function listExpressionAnchorIds(): string[] {
  return EXPRESSION_18_ANCHORS.map((a) => a.fixture_id);
}

export function getExpressionAnchor(id: string): ExpressionAnchor | null {
  if (BY_ID.has(id)) return BY_ID.get(id)!;
  const alias = NATIVE_FIXTURE_ALIASES[id];
  if (alias && BY_ID.has(alias)) return BY_ID.get(alias)!;
  return null;
}

export function resolveExpressionAnchorId(id: string): string | null {
  if (BY_ID.has(id)) return id;
  const alias = NATIVE_FIXTURE_ALIASES[id];
  if (alias && BY_ID.has(alias)) return alias;
  return null;
}

export function assertEighteenAnchors(): {
  ok: true;
  count: number;
  ids: string[];
  version: string;
} {
  if (EXPRESSION_18_ANCHORS.length !== HISTORICAL_ANCHOR_COUNT) {
    throw new Error(
      `expression kernel expected ${HISTORICAL_ANCHOR_COUNT} anchors, got ${EXPRESSION_18_ANCHORS.length}`,
    );
  }
  const ids = listExpressionAnchorIds();
  const unique = new Set(ids);
  if (unique.size !== HISTORICAL_ANCHOR_COUNT) {
    throw new Error("expression kernel anchor ids are not unique");
  }
  for (const a of EXPRESSION_18_ANCHORS) {
    if (a.validation_status !== ANCHOR_VALIDATION_STATUS) {
      throw new Error(`anchor ${a.fixture_id} missing provisional_authored status`);
    }
  }
  return {
    ok: true,
    count: HISTORICAL_ANCHOR_COUNT,
    ids,
    version: ANCHOR_REGISTRY_VERSION,
  };
}

export function anchorsByFamily(): Record<ExpressionFamily, ExpressionAnchor[]> {
  const out = {
    neutral: [] as ExpressionAnchor[],
    listening: [] as ExpressionAnchor[],
    thinking: [] as ExpressionAnchor[],
    mischievous: [] as ExpressionAnchor[],
    pleased: [] as ExpressionAnchor[],
    blocked: [] as ExpressionAnchor[],
  };
  for (const a of EXPRESSION_18_ANCHORS) {
    out[a.legacy_family].push(a);
  }
  return out;
}
