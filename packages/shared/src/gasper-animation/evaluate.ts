/**
 * Pure evaluation of canonical animation clips (no React / MCP / DOM).
 * Piecewise segments with per-keyframe easing weights approximated for scrub;
 * GSAP uses the same easing ids on play.
 */

import type {
  AnimationClip,
  AnimationKeyframe,
  AnimationTrack,
} from "./types.js";
import { clamp01, timeMsToNormalized } from "./types.js";

export type DomainScalarMap = Record<string, number>;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Approximate easing for offline evaluate/scrub (matches common GSAP curves closely enough for authoring).
 * Play path uses real GSAP with the same easing id string.
 */
export function applyEasing(u: number, easing: string): number {
  const t = clamp01(u);
  switch (easing) {
    case "linear":
      return t;
    case "power1.in":
      return t * t;
    case "power1.out":
      return 1 - (1 - t) * (1 - t);
    case "power1.inOut":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "power2.in":
      return t * t * t;
    case "power2.out":
      return 1 - Math.pow(1 - t, 3);
    case "power2.inOut":
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "back.out": {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    default:
      return t;
  }
}

function activeTracks(clip: AnimationClip): AnimationTrack[] {
  const anySolo = clip.tracks.some((t) => t.solo && !t.muted);
  return clip.tracks.filter((t) => {
    if (t.muted) return false;
    if (anySolo && !t.solo) return false;
    return true;
  });
}

/** Merge keyframes across active tracks into a unified timeline of poses at distinct times. */
export function collectMergedKeyframes(clip: AnimationClip): AnimationKeyframe[] {
  const tracks = activeTracks(clip);
  const byTime = new Map<number, AnimationKeyframe>();
  for (const tr of tracks) {
    for (const kf of tr.keyframes) {
      const existing = byTime.get(kf.time_ms);
      if (!existing) {
        byTime.set(kf.time_ms, {
          ...kf,
          values: { ...kf.values },
        });
      } else {
        byTime.set(kf.time_ms, {
          ...existing,
          values: { ...existing.values, ...kf.values },
          easing: kf.easing || existing.easing,
        });
      }
    }
  }
  return [...byTime.values()].sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * Evaluate authored pose at normalized t∈[0,1] (or absolute time_ms if provided).
 */
export function evaluateClipAt(
  clip: AnimationClip,
  opts: { t?: number; time_ms?: number },
): DomainScalarMap {
  const timeMs =
    typeof opts.time_ms === "number"
      ? Math.max(0, Math.min(clip.duration_ms, opts.time_ms))
      : normalizedToMs(opts.t ?? 0, clip.duration_ms);

  const kfs = collectMergedKeyframes(clip);
  if (kfs.length === 0) return {};
  const first = kfs[0]!;
  const last = kfs[kfs.length - 1]!;
  if (kfs.length === 1) return { ...first.values };

  if (timeMs <= first.time_ms) return { ...first.values };
  if (timeMs >= last.time_ms) {
    return { ...last.values };
  }

  let i = 0;
  while (i < kfs.length - 1 && (kfs[i + 1]?.time_ms ?? 0) < timeMs) i += 1;
  const a = kfs[i]!;
  const b = kfs[i + 1]!;
  const span = Math.max(1, b.time_ms - a.time_ms);
  const rawU = (timeMs - a.time_ms) / span;
  const u = applyEasing(rawU, a.easing || "power2.inOut");

  const keys = new Set([...Object.keys(a.values), ...Object.keys(b.values)]);
  // Carry channels forward: a channel absent from one merged keyframe ramps
  // from its last-known value instead of snapping to the next value
  // (VEC-ANIM-064 — motion begins from the rendered state).
  const carry: DomainScalarMap[] = [];
  let carried: DomainScalarMap = {};
  for (const kf of kfs) {
    carried = { ...carried, ...kf.values };
    carry.push(carried);
  }
  const out: DomainScalarMap = {};
  for (const id of keys) {
    const av = a.values[id];
    const bv = b.values[id];
    if (typeof av === "number" && typeof bv === "number") {
      out[id] = lerp(av, bv, u);
    } else if (typeof bv === "number") {
      const start = carry[i]?.[id];
      out[id] =
        typeof start === "number" ? lerp(start, bv, u) : bv;
    } else if (typeof av === "number") {
      out[id] = av;
    }
  }
  return out;
}

function normalizedToMs(t: number, durationMs: number): number {
  return Math.round(clamp01(t) * Math.max(1, durationMs));
}

export function poseDistinctness(
  a: DomainScalarMap,
  b: DomainScalarMap,
  keys: string[],
): number {
  let sum = 0;
  let n = 0;
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === "number" && typeof bv === "number") {
      sum += Math.abs(av - bv);
      n += 1;
    }
  }
  return n ? sum / n : 0;
}

export { timeMsToNormalized };
