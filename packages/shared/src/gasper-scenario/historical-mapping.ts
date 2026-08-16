/**
 * Map 18 historical Gasper 6.5.5 fixtures → eight showcase scenarios.
 * Do not discard historical fixtures; preserve as anchors / affinities.
 */

import type { EightScenarioId } from "./types";

export type HistoricalFixtureRecord = {
  fixture_id: string;
  legacy_family: string;
  descriptive_intent: string;
  affect_valence: number;
  affect_arousal: number;
  validation_status: "provisional_authored";
  provenance: string;
  /** Primary showcase affinity (may be null if ablation / bridge only). */
  primary_scenario: EightScenarioId | null;
  /** Secondary affinities (reusable anchors). */
  secondary_scenarios: EightScenarioId[];
  role:
    | "primary_anchor"
    | "secondary_anchor"
    | "transition_precedent"
    | "visual_candidate"
    | "deprecated_redundant"
    | "bridge_only";
  notes: string;
};

/** Canonical 18 from expression-core AnchorRegistry::gasper_v655_legacy. */
export const HISTORICAL_18_FIXTURES: HistoricalFixtureRecord[] = [
  {
    fixture_id: "neutral-settled",
    legacy_family: "neutral",
    descriptive_intent: "quiet available presence",
    affect_valence: 0.1,
    affect_arousal: 0.25,
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
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
    validation_status: "provisional_authored",
    provenance: "gasper-6.5.5-legacy-18@provisional",
    primary_scenario: "presence-blocked-strain",
    secondary_scenarios: [],
    role: "primary_anchor",
    notes: "Direct namesake of blocked showcase state.",
  },
];

/** Native desktop fixtures (subset) also mapped. */
export const NATIVE_FIXTURE_BRIDGES: Array<{
  fixture_id: string;
  primary_scenario: EightScenarioId | null;
  notes: string;
}> = [
  {
    fixture_id: "listening-orient",
    primary_scenario: "presence-listening-receive",
    notes: "Native rename of listening-open/orient family.",
  },
  {
    fixture_id: "recovering",
    primary_scenario: null,
    notes: "Bridge-only between blocked → pleased / wake; not a showcase endpoint.",
  },
  {
    fixture_id: "recognition-spark",
    primary_scenario: "presence-recognition-spark",
    notes: "Hero-pack / demo content expression id.",
  },
  {
    fixture_id: "listening-receive",
    primary_scenario: "presence-listening-receive",
    notes: "Hero-pack expression id.",
  },
];

export type AblationCandidate = {
  id: string;
  kind: "fixture" | "channel_param" | "scenario_variant";
  target: string;
  hypothesis: string;
  expected_effect: string;
  keep_if: string;
  discard_if: string;
};

export const ABLATION_CANDIDATES: AblationCandidate[] = [
  {
    id: "ablate-mischievous-hold",
    kind: "fixture",
    target: "mischievous-hold",
    hypothesis: "Redundant with recognition-spark + pleased-soft containment.",
    expected_effect: "No loss of pairwise distinctness if removed from affinities.",
    keep_if: "Perceptual review finds unique lateral play cue.",
    discard_if: "No unique channel contribution vs recognition/pleased.",
  },
  {
    id: "ablate-neutral-wry",
    kind: "fixture",
    target: "neutral-wry",
    hypothesis: "Asymmetry can be microvariation, not fixture.",
    expected_effect: "Neutral still distinct via form/energy.",
    keep_if: "Controlled asymmetry fails without wry anchor.",
    discard_if: "Microvariation policy covers wry read.",
  },
  {
    id: "ablate-mouth-corner-only",
    kind: "channel_param",
    target: "mouth.corner_pull",
    hypothesis: "Mouth-only distinction is forbidden; test pairs still pass without it.",
    expected_effect: "All pairs remain ≥4 domains.",
    keep_if: "Face super-group fails without mouth for any pair.",
    discard_if: "Eyes/gaze/face_plane alone satisfy attention_face.",
  },
  {
    id: "ablate-color-proxy-pearl",
    kind: "channel_param",
    target: "material.pearl",
    hypothesis: "Pearl alone must never separate states.",
    expected_effect: "Engineering gate still pass with pearl equalized.",
    keep_if: "Material super-group needs pearl for energy_material hit.",
    discard_if: "Energy level/relief/skin suffice.",
  },
  {
    id: "ablate-blocked-stall",
    kind: "fixture",
    target: "blocked-stall",
    hypothesis: "blocked-strain covers showcase obstruction.",
    expected_effect: "Strain remains competent (not helpless) without stall.",
    keep_if: "Need low-arousal block for transition grammar.",
    discard_if: "Only strain used in loop.",
  },
  {
    id: "ablate-recovering-bridge",
    kind: "scenario_variant",
    target: "recovering",
    hypothesis: "Loop uses blocked→pleased directly; recovering is optional bridge.",
    expected_effect: "R4 can skip recovering hold layer.",
    keep_if: "Interruption tests require mid-recovery endpoint.",
    discard_if: "Pleased-resolve absorbs recovery settle.",
  },
];

export function buildHistoricalMappingDocument(): {
  schema: string;
  version: string;
  historical_count: number;
  fixtures: HistoricalFixtureRecord[];
  native_bridges: typeof NATIVE_FIXTURE_BRIDGES;
  scenario_primary_sources: Record<EightScenarioId, string[]>;
} {
  const scenario_primary_sources = {} as Record<EightScenarioId, string[]>;
  const ids: EightScenarioId[] = [
    "presence-neutral-settled",
    "presence-listening-receive",
    "presence-thinking-knit",
    "presence-recognition-spark",
    "comet-executing-drive",
    "presence-blocked-strain",
    "presence-pleased-resolve",
    "dormant-orbit-maintain",
  ];
  for (const id of ids) scenario_primary_sources[id] = [];
  for (const f of HISTORICAL_18_FIXTURES) {
    if (f.primary_scenario) {
      scenario_primary_sources[f.primary_scenario].push(f.fixture_id);
    }
  }
  // Comet has no exclusive historical family — document synthetic.
  if (scenario_primary_sources["comet-executing-drive"].length === 0) {
    scenario_primary_sources["comet-executing-drive"] = [
      "(synthetic from embodiment routes + mischievous-spark energy bias)",
    ];
  }
  return {
    schema: "gasper.historical-18-to-8.v1",
    version: "1.0.0",
    historical_count: HISTORICAL_18_FIXTURES.length,
    fixtures: HISTORICAL_18_FIXTURES,
    native_bridges: NATIVE_FIXTURE_BRIDGES,
    scenario_primary_sources,
  };
}
