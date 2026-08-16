/**
 * Bounded tissue / volume behavior for continuous facial deformation.
 * Prevents mouth inversion, feature scale jumps, and unbounded overshoot.
 */

import { applyVolumeConservation, clampChannelMap } from "../morphologyBounds";
import {
  DEFAULT_FACIAL_POLICY,
  type FacialChannelMap,
  type FacialContinuumPolicy,
} from "./types";
import { WHOLE_FACE_IDENTITY_BOUNDS } from "./wholeFaceMorphology";

export type TissueClampResult = {
  channels: FacialChannelMap;
  clampedKeys: string[];
  mouthInverted: boolean;
  scaleJump: boolean;
  volumeOk: boolean;
};

/**
 * Soft-clamp a channel map into tissue-safe morphology.
 * Mouth openness stays non-inverted within [min,max]; face_scale jumps limited
 * relative to `previous` when provided.
 */
export function clampTissue(
  proposed: FacialChannelMap,
  previous?: FacialChannelMap,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): TissueClampResult {
  const clampedKeys: string[] = [];
  let map = clampChannelMap({ ...proposed }, "hard") as FacialChannelMap;

  // Mouth non-inversion: openness never crosses below morphological floor
  // and never exceeds width-coupled ceiling (openness cannot invert lips).
  const mouthOpen = map.mouth_openness;
  if (typeof mouthOpen === "number") {
    const width = typeof map.mouth_width === "number" ? map.mouth_width : 1;
    // Wider mouth allows slightly more open; narrow mouth tightens open max.
    const openMax = Math.min(
      policy.mouthOpennessMax,
      0.55 + Math.max(0, width - 1) * 0.4,
    );
    const openMin = policy.mouthOpennessMin;
    const next = Math.max(openMin, Math.min(openMax, mouthOpen));
    if (next !== mouthOpen) clampedKeys.push("mouth_openness");
    map.mouth_openness = next;
  }

  // Feature scale jump limit vs previous frame.
  let scaleJump = false;
  if (previous && typeof previous.face_scale === "number" && typeof map.face_scale === "number") {
    const d = map.face_scale - previous.face_scale;
    if (Math.abs(d) > policy.maxFaceScaleStep) {
      map.face_scale = previous.face_scale + Math.sign(d) * policy.maxFaceScaleStep;
      clampedKeys.push("face_scale");
      scaleJump = true;
    }
  }

  // Eye asymmetry soft-link from policy.maxEyeAsymmetry (chirality noise floor).
  const el = map.corner_pull_l;
  const er = map.corner_pull_r;
  if (typeof el === "number" && typeof er === "number") {
    const maxSpread = policy.maxEyeAsymmetry * 2.5;
    const half = policy.maxEyeAsymmetry * 1.25;
    const spread = Math.abs(el - er);
    if (spread > maxSpread) {
      const mid = (el + er) / 2;
      map.corner_pull_l = mid + Math.sign(el - mid) * half;
      map.corner_pull_r = mid + Math.sign(er - mid) * half;
      clampedKeys.push("corner_pull_l", "corner_pull_r");
    }
  }

  // Whole-face morphology identity band (soft). CHANNEL_BOUNDS in morphologyBounds
  // may not list R3 keys; clamp here so continuum tissue path cannot leave
  // identity-breaking extremes on semantic facial channels.
  for (const [key, bound] of Object.entries(WHOLE_FACE_IDENTITY_BOUNDS)) {
    const v = map[key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const next = Math.max(bound.min, Math.min(bound.max, v));
    if (next !== v) {
      map[key] = next;
      clampedKeys.push(key);
    }
  }

  map = applyVolumeConservation(map) as FacialChannelMap;
  const w = map.overall_width ?? 1;
  const h = map.overall_height ?? 1;
  const area = w * h;
  const volumeOk = area >= policy.areaMin && area <= policy.areaMax;

  const mouthInverted =
    typeof map.mouth_openness === "number" &&
    (map.mouth_openness < policy.mouthOpennessMin - 1e-9 ||
      map.mouth_openness > policy.mouthOpennessMax + 1e-9);

  return { channels: map, clampedKeys, mouthInverted, scaleJump, volumeOk };
}

/** Detect mouth inversion in a raw (unclamped) proposal. */
export function isMouthInverted(
  channels: FacialChannelMap,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): boolean {
  const o = channels.mouth_openness;
  if (typeof o !== "number" || !Number.isFinite(o)) return true;
  // Negative openness or extreme flip relative to width is inversion.
  if (o < policy.mouthOpennessMin) return true;
  if (o > policy.mouthOpennessMax) return true;
  const w = channels.mouth_width;
  if (typeof w === "number" && w < 0.5 && o > 0.6) return true;
  return false;
}

/** Detect one- or two-frame snap teleports in a position series. */
export function detectSnapFrames(
  positions: readonly number[],
  maxStep: number,
): number[] {
  const snaps: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    if (Math.abs(positions[i]! - positions[i - 1]!) > maxStep + 1e-12) {
      snaps.push(i);
    }
  }
  return snaps;
}

/**
 * Eye chirality/symmetry policy: absolute left−right openness proxy
 * (using corner pulls + spacing as asymmetry signal).
 */
export function eyeAsymmetryMetric(channels: FacialChannelMap): number {
  const cl = typeof channels.corner_pull_l === "number" ? channels.corner_pull_l : 0;
  const cr = typeof channels.corner_pull_r === "number" ? channels.corner_pull_r : 0;
  const spacing = typeof channels.eye_spacing === "number" ? channels.eye_spacing : 0;
  // Combined asymmetry energy; pure noise would exceed policy maxEyeAsymmetry.
  return Math.abs(cl - cr) * 0.5 + Math.abs(spacing) * 0.35;
}

export function eyeAsymmetryWithinPolicy(
  channels: FacialChannelMap,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): boolean {
  return eyeAsymmetryMetric(channels) <= policy.maxEyeAsymmetry + 1e-9;
}

/** Soft volume area of shell macro channels. */
export function shellArea(channels: FacialChannelMap): number {
  const w = typeof channels.overall_width === "number" ? channels.overall_width : 1;
  const h = typeof channels.overall_height === "number" ? channels.overall_height : 1;
  return w * h;
}
