/**
 * Re-authored facial semantics for Neutral, Listening, Recognition, Thinking,
 * Blocked, and Pleased — unmistakable in multi-domain feature space.
 * Backed by the whole-face morphology vocabulary (not same-mask scale variants).
 */

import type {
  FacialChannelMap,
  FacialSemanticId,
  FacialSemanticKernelId,
} from "./types";
import {
  WHOLE_FACE_MORPHOLOGY_TARGETS,
  type WholeFaceSemanticKey,
} from "./wholeFaceMorphology";

export type FacialSemanticTarget = {
  id: FacialSemanticId;
  kernelId: FacialSemanticKernelId;
  label: string;
  intent: string;
  /** Multi-domain absolute channel targets (continuous deformation, not pose swaps). */
  channels: FacialChannelMap;
  affect: { valence: number; arousal: number };
};

function fromWholeFace(key: WholeFaceSemanticKey): FacialSemanticTarget {
  const t = WHOLE_FACE_MORPHOLOGY_TARGETS[key];
  return {
    id: key as FacialSemanticId,
    kernelId: t.kernelId as FacialSemanticKernelId,
    label: t.label,
    intent: t.intent,
    affect: t.affect,
    channels: { ...t.channels },
  };
}

/**
 * Six mature semantic faces. Values stay inside morphology soft band;
 * pairwise separation is intentional and testable across multiple facial domains.
 */
export const FACIAL_SEMANTIC_TARGETS: Record<FacialSemanticId, FacialSemanticTarget> =
  Object.freeze({
    neutral: fromWholeFace("neutral"),
    listening: fromWholeFace("listening"),
    recognition: fromWholeFace("recognition"),
    thinking: fromWholeFace("thinking"),
    blocked: fromWholeFace("blocked"),
    pleased: fromWholeFace("pleased"),
  }) as Record<FacialSemanticId, FacialSemanticTarget>;

export const SEMANTIC_ORDER: readonly FacialSemanticId[] = Object.freeze([
  "neutral",
  "listening",
  "recognition",
  "thinking",
  "blocked",
  "pleased",
]);

export function getFacialSemantic(id: FacialSemanticId): FacialSemanticTarget {
  return FACIAL_SEMANTIC_TARGETS[id];
}

export function listFacialSemantics(): FacialSemanticId[] {
  return [...SEMANTIC_ORDER];
}

/** Map kernel / alias fixture ids onto the six semantic faces when possible. */
export function resolveFacialSemantic(id: string): FacialSemanticId | null {
  const direct: Record<string, FacialSemanticId> = {
    neutral: "neutral",
    "neutral-settled": "neutral",
    "neutral-social": "neutral",
    "neutral-wry": "neutral",
    listening: "listening",
    "listening-open": "listening",
    "listening-orient": "listening",
    "listening-warm": "listening",
    "listening-focus": "listening",
    "listening-receive": "listening",
    Listening: "listening",
    recognition: "recognition",
    "recognition-spark": "recognition",
    "mischievous-spark": "recognition",
    thinking: "thinking",
    "thinking-knit": "thinking",
    "thinking-scan": "thinking",
    "thinking-resolve": "thinking",
    executing: "thinking",
    blocked: "blocked",
    "blocked-strain": "blocked",
    "blocked-stall": "blocked",
    "blocked-guard": "blocked",
    "blocked-retry": "blocked",
    pleased: "pleased",
    "pleased-glow": "pleased",
    "pleased-soft": "pleased",
    "pleased-warm": "pleased",
    "pleased-bright": "pleased",
    "pleased-contained": "pleased",
  };
  return direct[id] ?? null;
}

/**
 * L2 distance on a fixed feature vector for semantic distinctness tests.
 * Includes whole-face morphology channels so same-mask scale-only pairs fail.
 */
export function semanticFeatureVector(channels: FacialChannelMap): number[] {
  const keys = [
    "brow_raise",
    "upper_lid_aperture",
    "lower_lid_aperture",
    "eye_tilt",
    "inter_eye_relation",
    "mouth_curvature",
    "mouth_aperture",
    "cheek_tension",
    "face_plane_tension",
    "contour_bias",
    "face_asymmetry",
    "gaze_action",
    "eye_openness",
    "eye_spacing",
    "mouth_openness",
    "mouth_width",
    "face_scale",
    "gaze",
    "corner_pull_l",
    "corner_pull_r",
    "energy_level",
    "energy_pulse",
    "internal_glow",
    "face_emissive",
    "overall_height",
    "overall_width",
    "skin_tension",
    "ground_flattening",
  ];
  return keys.map((k) => {
    const v = channels[k];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  });
}

export function semanticDistance(
  a: FacialChannelMap,
  b: FacialChannelMap,
): number {
  const va = semanticFeatureVector(a);
  const vb = semanticFeatureVector(b);
  let s = 0;
  for (let i = 0; i < va.length; i++) {
    const d = va[i]! - vb[i]!;
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Minimum pairwise L2 separation expected among the six re-authored faces. */
export const MIN_SEMANTIC_SEPARATION = 0.18;

export function allSemanticsDistinct(
  minDistance: number = MIN_SEMANTIC_SEPARATION,
): { ok: boolean; pairs: Array<{ a: FacialSemanticId; b: FacialSemanticId; d: number }> } {
  const ids = listFacialSemantics();
  const pairs: Array<{ a: FacialSemanticId; b: FacialSemanticId; d: number }> = [];
  let ok = true;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const d = semanticDistance(
        FACIAL_SEMANTIC_TARGETS[a].channels,
        FACIAL_SEMANTIC_TARGETS[b].channels,
      );
      pairs.push({ a, b, d });
      if (d < minDistance) ok = false;
    }
  }
  return { ok, pairs };
}
