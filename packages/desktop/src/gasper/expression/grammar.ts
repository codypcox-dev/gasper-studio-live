/**
 * Deterministic morphology/expression grammar for packaged Gasper Studio.
 * Composes anchors + Control-as-gain + chirality + bounded deformation.
 */

import {
  applyControlAsGain,
  applyVolumeConservation,
  assertEighteenAnchors,
  clampChannelMap,
  clampExpressionGain,
  deriveChiralityFromAffect,
  chiralityToChannelHints,
  getExpressionAnchor,
  listExpressionAnchorIds,
  planTransition,
  readChiralityAxes,
  resolveExpressionAnchorId,
  type PlannedTransition,
  type ChiralityReading,
} from "../../../../shared/src/gasper/index";
import {
  blendFacialChannels,
  interpolateExpressionContinuum,
} from "../../../../shared/src/gasper/facial";
import type { DomainScalarMap } from "../GasperDomainState";
import {
  getAnchorBindings,
  listAnchorBindingIds,
  resolveBindingId,
  type ExpressionBindingSpec,
} from "./anchorBindings";
import { toKernelFixtureId } from "./formMasterBridge";

export type ExpressionGrammarState = {
  fixtureId: string;
  family: string;
  embodiment: string;
  expressionGain: number;
  affect: {
    valence: number;
    arousal: number;
    expression_gain: number;
  };
  channels: DomainScalarMap;
  chirality: ChiralityReading[];
  transition: PlannedTransition | null;
};

export type ProjectExpressionInput = {
  fixtureId: string;
  embodiment?: string;
  expressionGain?: number;
  /** Optional previous fixture for transition planning. */
  fromFixtureId?: string;
  fromEmbodiment?: string;
  /** soft = aesthetic comfort band; hard = physical max. */
  boundMode?: "hard" | "soft";
};

export type ProjectExpressionResult = {
  ok: boolean;
  error?: string;
  state?: ExpressionGrammarState;
  binding?: ExpressionBindingSpec;
};

const PHYSICAL_BASELINE: DomainScalarMap = {
  energy_level: 0.52,
  energy_pulse: 0.16,
  energy_lag: 0.35,
  eye_openness: 0.56,
  eye_spacing: 0,
  mouth_openness: 0.32,
  mouth_width: 1,
  face_scale: 1,
  gaze: 0,
  corner_pull_l: 0,
  corner_pull_r: 0,
  // Whole-face morphology rest floor (Neutral identity).
  brow_raise: 0.04,
  upper_lid_aperture: 0.56,
  lower_lid_aperture: 0.48,
  eye_tilt: 0,
  inter_eye_relation: 0,
  mouth_curvature: 0.04,
  mouth_aperture: 0.32,
  cheek_tension: 0.3,
  face_plane_tension: 0.34,
  contour_bias: 0,
  face_asymmetry: 0.01,
  gaze_action: 0.02,
  relief_amplitude: 0.42,
  skin_tension: 0.36,
  internal_glow: 0.48,
  face_emissive: 0.32,
  overall_height: 1,
  overall_width: 1,
  crown_height: 0.04,
  ground_flattening: 0,
  inertia: 0.35,
  settling: 0.4,
  rebound: 0.15,
};

export function expressionKernelStatus(): {
  ok: true;
  anchorCount: number;
  bindingCount: number;
  ids: string[];
} {
  const a = assertEighteenAnchors();
  const bindingIds = listAnchorBindingIds();
  if (bindingIds.length !== 18) {
    throw new Error(`expected 18 binding specs, got ${bindingIds.length}`);
  }
  for (const id of a.ids) {
    if (!getAnchorBindings(id)) {
      throw new Error(`missing binding for anchor ${id}`);
    }
  }
  return {
    ok: true,
    anchorCount: a.count,
    bindingCount: bindingIds.length,
    ids: a.ids,
  };
}

/**
 * Project an expression anchor into multi-domain channels with Control-as-gain
 * and chirality channel hints. Output is volume-conserved and bound-clamped.
 */
export function projectExpression(
  input: ProjectExpressionInput,
): ProjectExpressionResult {
  // Prefer FormMaster bridge → kernel, then binding aliases.
  const bridged = toKernelFixtureId(input.fixtureId);
  const resolved = resolveBindingId(bridged) ?? resolveBindingId(input.fixtureId);
  if (!resolved) {
    return { ok: false, error: `Unknown expression fixture: ${input.fixtureId}` };
  }
  const binding = getAnchorBindings(resolved)!;
  const anchor = getExpressionAnchor(resolved);
  const gain = clampExpressionGain(
    input.expressionGain ??
      anchor?.expression_gain_default ??
      0.4,
  );
  const valence = anchor?.affect_valence ?? 0;
  const arousal = anchor?.affect_arousal ?? 0.4;

  // Always start from physical baseline so sparse anchors remain multi-domain
  // (Architecture Pack: contour-only / host-scale-only morphs are invalid).
  const absoluteTargets: DomainScalarMap = {
    ...PHYSICAL_BASELINE,
    ...binding.bindings,
  };

  // Control-as-gain: scale displacement of anchor targets from physical baseline.
  const gained = applyControlAsGain(absoluteTargets, gain, {
    baseline: PHYSICAL_BASELINE,
    absoluteTargets: true,
  });

  // Chirality channel hints blend lightly into motion-bearing channels.
  const chiralityVals = deriveChiralityFromAffect({
    valence,
    arousal,
    urgency: arousal * 0.55,
    attention: arousal * 0.7 + Math.max(0, valence) * 0.2,
    certainty: 0.45 + valence * 0.15,
    social_openness: 0.5 + valence * 0.3,
  });
  const hints = chiralityToChannelHints(chiralityVals);
  const withChirality: DomainScalarMap = {
    ...gained,
    gaze:
      typeof gained.gaze === "number"
        ? gained.gaze * 0.7 + hints.gaze * 0.3
        : hints.gaze * 0.3,
    energy_pulse:
      typeof gained.energy_pulse === "number"
        ? gained.energy_pulse * 0.75 + hints.energy_pulse * 0.25
        : hints.energy_pulse,
  };

  if (typeof withChirality.overall_width === "number") {
    withChirality.overall_width =
      withChirality.overall_width * (0.92 + hints.expand * 0.16);
  }
  if (typeof withChirality.overall_height === "number") {
    withChirality.overall_height =
      withChirality.overall_height * (0.94 + hints.expand * 0.12);
  }

  const bounded = applyVolumeConservation(
    clampChannelMap(withChirality, input.boundMode ?? "hard"),
  );

  const embodiment = input.embodiment ?? "presence";
  const fromEmb = input.fromEmbodiment ?? embodiment;
  const fromFix = input.fromFixtureId
    ? resolveExpressionAnchorId(input.fromFixtureId) ?? input.fromFixtureId
    : resolved;
  const transition = planTransition({
    fromEmbodiment: fromEmb,
    toEmbodiment: embodiment,
    fromExpression: fromFix,
    toExpression: resolved,
  });

  const state: ExpressionGrammarState = {
    fixtureId: resolved,
    family: binding.family,
    embodiment,
    expressionGain: gain,
    affect: {
      valence,
      arousal,
      expression_gain: gain,
    },
    channels: bounded,
    chirality: readChiralityAxes(chiralityVals),
    transition,
  };

  return { ok: true, state, binding };
}

/**
 * Blend two projected expression channel maps (t in [0,1]).
 * Routes through continuous facial continuum laws (tissue clamp, chirality,
 * volume) so callers never discrete-swap eye/mouth poses.
 */
export function blendExpressionChannels(
  a: DomainScalarMap,
  b: DomainScalarMap,
  t: number,
): DomainScalarMap {
  return blendFacialChannels(a, b, t);
}

/**
 * Continuous frame sample along from→to (anticipation / transition / settle).
 * Prefer this over discrete fixture swaps for multi-frame facial motion.
 */
export function sampleExpressionContinuum(
  a: DomainScalarMap,
  b: DomainScalarMap,
  frame: number,
  totalFrames: number,
): { channels: DomainScalarMap; phase: string; mix: number } {
  return interpolateExpressionContinuum(a, b, frame, totalFrames);
}

export function listProductionExpressionIds(): string[] {
  return listExpressionAnchorIds();
}

export { PHYSICAL_BASELINE };
