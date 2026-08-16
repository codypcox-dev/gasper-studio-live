/**
 * Machine-inspectable distinctness budget for eight showcase states.
 * Engineering gates only — not perceptual human proof.
 */

import {
  CHANNEL_SUPER_GROUPS,
  differingDomains,
  flattenChannelVector,
  type GasperChannelDomainId,
} from "./channels";
import { EIGHT_STATE_DEFINITIONS } from "./eight-states";
import { contentHash, q6 } from "./hash";
import type {
  EightScenarioId,
  GasperDistinctnessBudgetV1,
  GasperPerceptualReviewManifestV1,
  PairwiseDistanceV1,
} from "./types";
import { EIGHT_SCENARIO_IDS } from "./types";

const EPSILON = 0.04;
const MIN_DOMAINS = 4;

function l2(
  a: Record<string, number>,
  b: Record<string, number>,
  prefixFilter?: (key: string) => boolean,
): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let sum = 0;
  let n = 0;
  for (const k of keys) {
    if (prefixFilter && !prefixFilter(k)) continue;
    const da = a[k] ?? 0;
    const db = b[k] ?? 0;
    const d = da - db;
    sum += d * d;
    n += 1;
  }
  if (n === 0) return 0;
  return q6(Math.sqrt(sum / n));
}

function superGroupHit(
  domains: GasperChannelDomainId[],
  group: keyof typeof CHANNEL_SUPER_GROUPS,
): boolean {
  const set = new Set(domains);
  return CHANNEL_SUPER_GROUPS[group].some((d) => set.has(d));
}

function mouthOnlyRisk(
  domains: GasperChannelDomainId[],
  va: Record<string, number>,
  vb: Record<string, number>,
): boolean {
  // Mouth-only if only mouth domain differs among attention_face and form is weak.
  const faceish = domains.filter((d) =>
    (CHANNEL_SUPER_GROUPS.attention_face as readonly string[]).includes(d),
  );
  if (faceish.length === 1 && faceish[0] === "mouth" && domains.length <= 2) {
    return true;
  }
  // If non-mouth full distance is near zero
  const nonMouth = l2(va, vb, (k) => !k.startsWith("mouth."));
  const mouth = l2(va, vb, (k) => k.startsWith("mouth."));
  return mouth > EPSILON && nonMouth < EPSILON * 0.5;
}

function colorOnlyRisk(
  domains: GasperChannelDomainId[],
  va: Record<string, number>,
  vb: Record<string, number>,
): boolean {
  // Color-only proxy: only material/lighting hue-like params differ, no form/motion/face.
  const hasForm = superGroupHit(domains, "form");
  const hasMotion = superGroupHit(domains, "motion");
  const hasFace = superGroupHit(domains, "attention_face");
  if (hasForm || hasMotion || hasFace) return false;
  const energyOnly =
    domains.every((d) =>
      (CHANNEL_SUPER_GROUPS.energy_material as readonly string[]).includes(d),
    ) && domains.length > 0;
  if (!energyOnly) return false;
  // If structural energy params also differ substantially, not color-only.
  const structuralEnergy = l2(
    va,
    vb,
    (k) =>
      k.includes("level") ||
      k.includes("pulse") ||
      k.includes("tension") ||
      k.includes("amplitude"),
  );
  return structuralEnergy < EPSILON;
}

export function computePairwiseDistance(
  a: EightScenarioId,
  b: EightScenarioId,
  epsilon = EPSILON,
): PairwiseDistanceV1 {
  const ca = EIGHT_STATE_DEFINITIONS[a].channels;
  const cb = EIGHT_STATE_DEFINITIONS[b].channels;
  const va = flattenChannelVector(ca);
  const vb = flattenChannelVector(cb);
  const differing = differingDomains(ca, cb, epsilon);

  const full = l2(va, vb);
  const face = l2(va, vb, (k) =>
    ["face_plane", "eyes", "mouth", "gaze_attention"].some((p) =>
      k.startsWith(`${p}.`),
    ),
  );
  const motion = l2(va, vb, (k) =>
    [
      "secondary_dynamics",
      "microvariation",
      "blink_scheduler_policy",
      "reduced_motion_behavior",
    ].some((p) => k.startsWith(`${p}.`)),
  );
  const silhouette = l2(va, vb, (k) =>
    ["contour_silhouette", "structural_lattice", "macro_deformation"].some(
      (p) => k.startsWith(`${p}.`),
    ),
  );
  const energy = l2(va, vb, (k) =>
    [
      "adaptive_relief",
      "internal_energy",
      "skin_texture",
      "material",
      "world_lighting_optics",
    ].some((p) => k.startsWith(`${p}.`)),
  );

  const super_group_hits = {
    form: superGroupHit(differing, "form"),
    motion: superGroupHit(differing, "motion"),
    attention_face: superGroupHit(differing, "attention_face"),
    energy_material: superGroupHit(differing, "energy_material"),
  };

  const passes_min_domains = differing.length >= MIN_DOMAINS;
  const passes_super_groups =
    super_group_hits.form &&
    super_group_hits.motion &&
    super_group_hits.attention_face &&
    super_group_hits.energy_material;

  const color_only_risk = colorOnlyRisk(differing, va, vb);
  const mouth_only_risk = mouthOnlyRisk(differing, va, vb);
  // Soft confusion flag (engineering advisory). Hard gate is separate.
  const confusion_risk =
    full < 0.055 ||
    !passes_min_domains ||
    !passes_super_groups ||
    color_only_risk ||
    mouth_only_risk;

  const engineering_gate: "pass" | "fail" =
    passes_min_domains &&
    passes_super_groups &&
    !color_only_risk &&
    !mouth_only_risk
      ? "pass"
      : "fail";

  return {
    a,
    b,
    differing_domains: differing,
    differing_domain_count: differing.length,
    full_channel_distance: full,
    face_only_distance: face,
    motion_only_distance: motion,
    silhouette_only_distance: silhouette,
    energy_material_only_distance: energy,
    super_group_hits,
    passes_min_domains,
    passes_super_groups,
    color_only_risk,
    mouth_only_risk,
    confusion_risk,
    engineering_gate,
  };
}

export function computeDistinctnessBudget(
  epsilon = EPSILON,
): GasperDistinctnessBudgetV1 {
  const pairs: PairwiseDistanceV1[] = [];
  for (let i = 0; i < EIGHT_SCENARIO_IDS.length; i++) {
    for (let j = i + 1; j < EIGHT_SCENARIO_IDS.length; j++) {
      pairs.push(
        computePairwiseDistance(EIGHT_SCENARIO_IDS[i]!, EIGHT_SCENARIO_IDS[j]!, epsilon),
      );
    }
  }
  const confusion_flags = pairs
    .filter((p) => p.confusion_risk)
    .map((p) => `${p.a}↔${p.b}`);
  const all_pairs_pass = pairs.every((p) => p.engineering_gate === "pass");

  const budget: GasperDistinctnessBudgetV1 = {
    schema: "gasper.distinctness-budget.v1",
    version: "1.0.0",
    label: "provisional_engineering_gate",
    min_differing_domains: 4,
    required_super_groups: [
      "form",
      "motion",
      "attention_face",
      "energy_material",
    ],
    epsilon,
    pairs,
    all_pairs_pass,
    confusion_flags,
    budget_content_hash: "",
  };
  budget.budget_content_hash = contentHash({
    schema: budget.schema,
    version: budget.version,
    label: budget.label,
    min_differing_domains: budget.min_differing_domains,
    required_super_groups: budget.required_super_groups,
    epsilon: budget.epsilon,
    pairs: budget.pairs,
    all_pairs_pass: budget.all_pairs_pass,
    confusion_flags: budget.confusion_flags,
  });
  return budget;
}

export function buildPerceptualReviewManifest(): GasperPerceptualReviewManifestV1 {
  const budget = computeDistinctnessBudget();
  const pairwise_tasks = budget.pairs.map((p) => ({
    pair_id: `${p.a}__${p.b}`,
    a: p.a as EightScenarioId,
    b: p.b as EightScenarioId,
    prompt: `Compare ${p.a} vs ${p.b}: form, motion, face/attention, energy/material — not color or mouth alone.`,
    channels_to_score: p.differing_domains,
  }));
  return {
    schema: "gasper.perceptual-review-manifest.v1",
    version: "1.0.0",
    scenario_ids: [...EIGHT_SCENARIO_IDS],
    pairwise_tasks,
    notes: [
      "Engineering distinctness is necessary but not sufficient for human acceptance.",
      "Cody retains visual acceptance authority.",
      "R1 perceptual protocol may consume this manifest + DISTINCTNESS_BUDGET.json.",
    ],
    consumes_distinctness_budget: true,
  };
}
