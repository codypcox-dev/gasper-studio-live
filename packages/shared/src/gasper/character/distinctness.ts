/**
 * Pairwise state distinctness — multi-domain signatures must be immediately legible.
 * Incomplete profiles and illegible semantics REJECT.
 */

import {
  EIGHT_STATE_HOLD_ORDER,
  EIGHT_STATE_VISUAL_ORDER,
  GASPER_STATE_PROFILES,
  REQUIRED_PROFILE_CHANNEL_KEYS,
  getCharacterStateProfile,
} from "./stateProfiles";
import type {
  CharacterChannelMap,
  CharacterStateProfile,
  CharacterValidationFailure,
  EightStateVisualId,
} from "./types";

/** Minimum L2 separation on the multi-domain signature vector. */
export const MIN_STATE_SEPARATION = 0.18;

/** Required domains that must contribute measurable delta across pairs. */
export const REQUIRED_DISTINCT_DOMAINS = [
  "face",
  "shell",
  "energy",
  "motion",
] as const;

const FACE_SIG = [
  "eye_openness",
  "eye_spacing",
  "mouth_openness",
  "mouth_width",
  "face_scale",
  "gaze",
  "corner_pull_l",
  "corner_pull_r",
] as const;

const SHELL_SIG = [
  "overall_width",
  "overall_height",
  "crown_height",
  "ground_flattening",
  "skin_tension",
  "pearl_intensity",
] as const;

const ENERGY_SIG = [
  "energy_level",
  "energy_pulse",
  "internal_glow",
  "face_emissive",
] as const;

const MOTION_SIG = ["inertia", "settling", "rebound", "motion"] as const;

function num(v: number | undefined, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

/**
 * Multi-domain signature feature vector for pairwise distinctness.
 */
export function stateSignatureVector(channels: CharacterChannelMap): number[] {
  const keys = [
    ...FACE_SIG,
    ...SHELL_SIG,
    ...ENERGY_SIG,
    ...MOTION_SIG,
  ] as const;
  return keys.map((k) => num(channels[k]));
}

export function stateSignatureDistance(
  a: CharacterChannelMap,
  b: CharacterChannelMap,
): number {
  const va = stateSignatureVector(a);
  const vb = stateSignatureVector(b);
  let s = 0;
  for (let i = 0; i < va.length; i++) {
    const d = va[i]! - vb[i]!;
    s += d * d;
  }
  return Math.sqrt(s);
}

function domainDelta(
  a: CharacterChannelMap,
  b: CharacterChannelMap,
  keys: readonly string[],
): number {
  let s = 0;
  for (const k of keys) {
    const d = num(a[k]) - num(b[k]);
    s += d * d;
  }
  return Math.sqrt(s);
}

export type PairDistinctness = {
  a: EightStateVisualId;
  b: EightStateVisualId;
  distance: number;
  domainDeltas: Record<(typeof REQUIRED_DISTINCT_DOMAINS)[number], number>;
  /** True when overall distance and ≥2 domains show measurable separation. */
  distinct: boolean;
};

/**
 * Pairwise distinctness across hold states (or full set including wake).
 */
export function pairwiseStateDistinctness(
  minDistance: number = MIN_STATE_SEPARATION,
  includeWake = true,
): { ok: boolean; pairs: PairDistinctness[] } {
  const ids = includeWake ? EIGHT_STATE_VISUAL_ORDER : EIGHT_STATE_HOLD_ORDER;
  const pairs: PairDistinctness[] = [];
  let ok = true;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const aId = ids[i]!;
      const bId = ids[j]!;
      const a = GASPER_STATE_PROFILES[aId].channels;
      const b = GASPER_STATE_PROFILES[bId].channels;
      const distance = stateSignatureDistance(a, b);
      const domainDeltas = {
        face: domainDelta(a, b, FACE_SIG),
        shell: domainDelta(a, b, SHELL_SIG),
        energy: domainDelta(a, b, ENERGY_SIG),
        motion: domainDelta(a, b, MOTION_SIG),
      };
      // Immediately legible: overall min distance + at least 2 domains with material delta.
      const domainHits = REQUIRED_DISTINCT_DOMAINS.filter(
        (d) => domainDeltas[d] >= 0.04,
      ).length;
      const distinct = distance >= minDistance && domainHits >= 2;
      pairs.push({ a: aId, b: bId, distance, domainDeltas, distinct });
      if (!distinct) ok = false;
    }
  }
  return { ok, pairs };
}

/**
 * Check that a profile is complete (all required fields + multi-domain channels).
 */
export function isProfileComplete(
  profile: CharacterStateProfile | null | undefined,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!profile) {
    return { ok: false, missing: ["profile"] };
  }
  if (!profile.stateId) missing.push("stateId");
  if (!profile.label) missing.push("label");
  if (!profile.semanticIntent) missing.push("semanticIntent");
  if (!profile.personalityRead) missing.push("personalityRead");
  if (!profile.visualSignature) missing.push("visualSignature");
  if (!profile.channels) missing.push("channels");
  if (!profile.layerActivations) missing.push("layerActivations");
  if (!profile.silhouetteDelta) missing.push("silhouetteDelta");
  if (!profile.volumePolicy) missing.push("volumePolicy");
  if (!profile.centerOfMass) missing.push("centerOfMass");
  if (!profile.facialAttachment) missing.push("facialAttachment");
  if (!profile.materialMods) missing.push("materialMods");
  if (!profile.paletteMods) missing.push("paletteMods");
  if (profile.qualityFloorRef !== "dormant-orbit-maintain") {
    missing.push("qualityFloorRef");
  }
  if (!profile.embodimentId) missing.push("embodimentId");
  if (!profile.expressionAffinity) missing.push("expressionAffinity");

  if (profile.channels) {
    for (const k of REQUIRED_PROFILE_CHANNEL_KEYS) {
      if (typeof profile.channels[k] !== "number") {
        missing.push(`channels.${k}`);
      }
    }
  }

  if (profile.visualSignature) {
    if (
      !profile.visualSignature.domains ||
      profile.visualSignature.domains.length < 4
    ) {
      missing.push("visualSignature.domains");
    }
    if (!profile.visualSignature.primaryCue) {
      missing.push("visualSignature.primaryCue");
    }
    if (
      !profile.visualSignature.signatureChannels ||
      profile.visualSignature.signatureChannels.length < 8
    ) {
      missing.push("visualSignature.signatureChannels");
    }
  }

  if (profile.personalityRead) {
    for (const k of [
      "friendly",
      "intelligent",
      "slightlyUpToSomething",
      "summary",
    ] as const) {
      if (
        profile.personalityRead[k] === undefined ||
        profile.personalityRead[k] === null ||
        profile.personalityRead[k] === ""
      ) {
        missing.push(`personalityRead.${k}`);
      }
    }
  }

  if (profile.facialAttachment && profile.facialAttachment.attached !== true) {
    missing.push("facialAttachment.attached");
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Semantic legibility: unique primary cues + pairwise multi-domain separation.
 */
export function assertSemanticLegibility(
  minDistance: number = MIN_STATE_SEPARATION,
): CharacterValidationFailure[] {
  const failures: CharacterValidationFailure[] = [];
  const cues = new Map<string, string>();

  for (const id of EIGHT_STATE_VISUAL_ORDER) {
    const p = GASPER_STATE_PROFILES[id];
    const cue = p.visualSignature.primaryCue;
    if (cues.has(cue)) {
      failures.push({
        code: "illegible_semantics",
        stateId: id,
        message: `duplicate primaryCue "${cue}" shared with ${cues.get(cue)}`,
      });
    } else {
      cues.set(cue, id);
    }
  }

  const distinct = pairwiseStateDistinctness(minDistance, true);
  for (const pair of distinct.pairs) {
    if (!pair.distinct) {
      failures.push({
        code: "illegible_semantics",
        stateId: pair.a,
        message: `pair ${pair.a} ↔ ${pair.b} not multi-domain distinct (d=${pair.distance.toFixed(4)})`,
        details: {
          b: pair.b,
          distance: pair.distance,
          domainDeltas: pair.domainDeltas,
        },
      });
    }
  }

  return failures;
}

/**
 * Reject incomplete profiles across the full authored set.
 */
export function assertAllProfilesComplete(): CharacterValidationFailure[] {
  const failures: CharacterValidationFailure[] = [];
  for (const id of EIGHT_STATE_VISUAL_ORDER) {
    const p = getCharacterStateProfile(id);
    const check = isProfileComplete(p);
    if (!check.ok) {
      failures.push({
        code: "incomplete_profile",
        stateId: id,
        message: `incomplete profile: missing ${check.missing.join(", ")}`,
        details: { missing: check.missing },
      });
    }
  }
  // Ensure all eight holds + wake exist.
  if (EIGHT_STATE_HOLD_ORDER.length !== 8) {
    failures.push({
      code: "incomplete_profile",
      message: `expected 8 hold states, got ${EIGHT_STATE_HOLD_ORDER.length}`,
    });
  }
  if (!GASPER_STATE_PROFILES.wake) {
    failures.push({
      code: "incomplete_profile",
      stateId: "wake",
      message: "wake transitional profile missing",
    });
  }
  return failures;
}

/** All hold states pairwise distinct (excludes wake for pure hold tests). */
export function allHoldStatesDistinct(
  minDistance: number = MIN_STATE_SEPARATION,
): { ok: boolean; pairs: PairDistinctness[] } {
  return pairwiseStateDistinctness(minDistance, false);
}
