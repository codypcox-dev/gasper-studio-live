/**
 * Provisional Gasper-specific motion grammar (Laban-informed).
 * R1 findings may adjust; record deltas in MOTION/MOTION_GRAMMAR.md.
 * GASPER-BEH-001: typed three-beat envelopes per canonical state + wake.
 */

import type {
  EightStateId,
  MotionSignatureV1,
  ThreeBeatPhase,
  ThreeBeatProgress,
  ThreeBeatSpec,
} from "./types";
import { quinticMinimumJerk } from "../physics";

/**
 * Authored three-beat envelopes. Durations are finite positive gather/peak/settle;
 * holdSeconds is post-settle sustain (0 for pure wake transition). Dominant channels
 * are state-specific targets used by later embodiment/behavior packets.
 */
export const THREE_BEAT_SPECS: Record<EightStateId, ThreeBeatSpec> = Object.freeze({
  "presence-neutral-settled": Object.freeze({
    gatherSeconds: 0.35,
    peakSeconds: 0.45,
    settleSeconds: 0.7,
    holdSeconds: 1.0,
    dominantChannels: Object.freeze(["energy_level", "eye_openness", "overall_height"]),
    phaseOffset: 0.0,
  }),
  "presence-listening-receive": Object.freeze({
    gatherSeconds: 0.4,
    peakSeconds: 0.5,
    settleSeconds: 0.7,
    holdSeconds: 0.9,
    dominantChannels: Object.freeze(["gaze", "eye_openness", "energy_level", "overall_width"]),
    phaseOffset: 0.17,
  }),
  "presence-thinking-knit": Object.freeze({
    gatherSeconds: 0.55,
    peakSeconds: 0.7,
    settleSeconds: 0.85,
    holdSeconds: 0.9,
    dominantChannels: Object.freeze(["crown_height", "eye_spacing", "energy_lag", "gaze"]),
    phaseOffset: 0.34,
  }),
  "presence-recognition-spark": Object.freeze({
    // Surprise keeps a near-zero gather but still pays a bounded anticipation
    // sliver; recovery is deliberately the longest beat per LAW-9.
    gatherSeconds: 0.15,
    peakSeconds: 0.28,
    settleSeconds: 1.05,
    holdSeconds: 0.25,
    dominantChannels: Object.freeze(["energy_level", "energy_pulse", "eye_openness", "internal_glow"]),
    phaseOffset: 0.51,
  }),
  "comet-executing-drive": Object.freeze({
    gatherSeconds: 0.35,
    peakSeconds: 0.55,
    settleSeconds: 0.7,
    holdSeconds: 0.9,
    dominantChannels: Object.freeze(["energy_pulse", "energy_level", "overall_height", "skin_tension"]),
    phaseOffset: 0.68,
  }),
  "presence-blocked-strain": Object.freeze({
    gatherSeconds: 0.25,
    peakSeconds: 0.45,
    settleSeconds: 0.7,
    holdSeconds: 0.9,
    dominantChannels: Object.freeze(["skin_tension", "overall_height", "energy_level", "rebound"]),
    phaseOffset: 0.85,
  }),
  "presence-pleased-resolve": Object.freeze({
    gatherSeconds: 0.4,
    peakSeconds: 0.5,
    settleSeconds: 0.65,
    holdSeconds: 0.75,
    dominantChannels: Object.freeze(["mouth_openness", "corner_pull_r", "energy_level", "internal_glow"]),
    phaseOffset: 1.02,
  }),
  "dormant-orbit-maintain": Object.freeze({
    gatherSeconds: 0.5,
    peakSeconds: 0.6,
    settleSeconds: 0.8,
    holdSeconds: 0.85,
    dominantChannels: Object.freeze(["face_scale", "energy_level", "overall_height", "eye_openness"]),
    phaseOffset: 1.19,
  }),
  wake: Object.freeze({
    gatherSeconds: 0.3,
    peakSeconds: 0.4,
    settleSeconds: 0.75,
    holdSeconds: 0,
    dominantChannels: Object.freeze(["energy_level", "face_scale", "overall_height", "internal_glow"]),
    phaseOffset: 1.36,
  }),
}) as Record<EightStateId, ThreeBeatSpec>;

export function threeBeatFor(stateId: EightStateId): ThreeBeatSpec {
  return THREE_BEAT_SPECS[stateId];
}

/** Deterministic per-state beat seed from the loop/proof base seed (mulberry32 family). */
export function threeBeatSeed(stateId: EightStateId, baseSeed: number): number {
  let h = (baseSeed >>> 0) ^ 0xbea7001;
  for (let i = 0; i < stateId.length; i++) {
    h = Math.imul(h ^ stateId.charCodeAt(i), 0x01000193);
  }
  // Fold in authored phaseOffset so seed stream is beat-family specific.
  const phaseBits = Math.floor((THREE_BEAT_SPECS[stateId].phaseOffset * 1000) % 100000);
  h = Math.imul(h ^ phaseBits, 0x85ebca6b);
  return h >>> 0;
}

/**
 * Pure elapsed→phase evaluation for structural proofs and controller sampling.
 * Elapsed is seconds since beat anchor (organism-clock derived).
 */
export function evaluateThreeBeatProgress(
  spec: ThreeBeatSpec,
  elapsedSeconds: number,
  meta: { stateId: EightStateId; seed: number },
): ThreeBeatProgress {
  const elapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  const g = spec.gatherSeconds;
  const p = spec.peakSeconds;
  const s = spec.settleSeconds;
  const h = Math.max(0, spec.holdSeconds);
  const gatherEnd = g;
  const peakEnd = g + p;
  const settleEnd = g + p + s;
  const total = settleEnd + h;

  let phase: ThreeBeatPhase;
  let phaseProgress: number;
  let envelope: number;

  if (elapsed < gatherEnd) {
    phase = "gather";
    phaseProgress = g > 0 ? Math.min(1, elapsed / g) : 1;
    const eased = quinticMinimumJerk(phaseProgress);
    envelope = 0.5 * eased;
  } else if (elapsed < peakEnd) {
    phase = "peak";
    phaseProgress = p > 0 ? Math.min(1, (elapsed - gatherEnd) / p) : 1;
    envelope = 0.5 + 0.5 * quinticMinimumJerk(phaseProgress);
  } else if (elapsed < settleEnd || h <= 0) {
    phase = "settle";
    const intoSettle = Math.max(0, elapsed - peakEnd);
    phaseProgress = s > 0 ? Math.min(1, intoSettle / s) : 1;
    envelope = 1 - 0.35 * quinticMinimumJerk(phaseProgress);
    if (h <= 0 && elapsed >= settleEnd) {
      phaseProgress = 1;
      envelope = 0.65;
    }
  } else {
    phase = "hold";
    phaseProgress = h > 0 ? Math.min(1, (elapsed - settleEnd) / h) : 1;
    envelope = 0.65;
  }

  void total;
  return Object.freeze({
    stateId: meta.stateId,
    phase,
    phaseProgress,
    envelope,
    elapsedInBeatSeconds: elapsed,
    seed: meta.seed,
    phaseOffset: spec.phaseOffset,
    threeBeat: spec,
  });
}

export const STATE_MOTION_SIGNATURES: Record<EightStateId, MotionSignatureV1> = {
  "presence-neutral-settled": {
    weight: "light",
    time: "sustained",
    space: "slightly-indirect",
    flow: "mostly-free",
    vertical: "neutral",
    horizontal: "neutral",
    sagittal: "neutral",
    phrasing: "settling",
  },
  "presence-listening-receive": {
    weight: "light",
    time: "sustained",
    space: "direct",
    flow: "bound",
    vertical: "rise",
    horizontal: "widen",
    sagittal: "advance",
    phrasing: "sustained",
  },
  "presence-thinking-knit": {
    weight: "medium-light",
    time: "sustained",
    space: "indirect",
    flow: "bound",
    vertical: "sink",
    horizontal: "narrow",
    sagittal: "retreat",
    phrasing: "increasing",
  },
  "presence-recognition-spark": {
    weight: "light",
    time: "sudden",
    space: "direct",
    flow: "free",
    vertical: "rise",
    horizontal: "widen",
    sagittal: "advance",
    phrasing: "impulse",
  },
  "comet-executing-drive": {
    weight: "strong-medium",
    time: "sudden-to-sustained",
    space: "direct",
    flow: "controlled",
    vertical: "rise",
    horizontal: "neutral",
    sagittal: "advance",
    phrasing: "increasing",
  },
  "presence-blocked-strain": {
    weight: "strong",
    time: "sudden",
    space: "direct",
    flow: "bound",
    vertical: "sink",
    horizontal: "narrow",
    sagittal: "retreat",
    phrasing: "interrupted",
  },
  "presence-pleased-resolve": {
    weight: "medium-light",
    time: "sustained",
    space: "slightly-indirect",
    flow: "free",
    vertical: "rise",
    horizontal: "widen",
    sagittal: "neutral",
    phrasing: "rebound",
  },
  "dormant-orbit-maintain": {
    weight: "light",
    time: "sustained",
    space: "circular-indirect",
    flow: "tightly-controlled",
    vertical: "sink",
    horizontal: "narrow",
    sagittal: "retreat",
    phrasing: "sustained",
  },
  wake: {
    weight: "medium-light",
    time: "sudden-to-sustained",
    space: "direct",
    flow: "controlled",
    vertical: "rise",
    horizontal: "widen",
    sagittal: "advance",
    phrasing: "increasing",
  },
};

/** GSAP ease names biased by phrasing / weight. */
export function easeForTransition(from: EightStateId, to: EightStateId): string {
  const sig = STATE_MOTION_SIGNATURES[to];
  if (to === "presence-blocked-strain") {
    return "power3.in";
  }
  if (to === "presence-recognition-spark") return "power3.out";
  if (to === "wake" || from === "dormant-orbit-maintain") return "power2.inOut";
  if (to === "presence-pleased-resolve") return "power1.out";
  if (sig.phrasing === "impulse") return "back.out(1.2)";
  if (sig.phrasing === "settling") return "power2.out";
  if (sig.flow === "bound") return "power2.inOut";
  return "power2.out";
}

/** Per-channel duration multipliers (semantic phase offsets via scale). */
export function channelDurationScales(to: EightStateId): Record<string, number> {
  switch (to) {
    case "presence-recognition-spark":
      return {
        energy_level: 0.55,
        energy_pulse: 0.4,
        eye_openness: 0.7,
        gaze: 0.45,
        overall_height: 0.85,
        relief_amplitude: 1.1,
      };
    case "presence-blocked-strain":
      return {
        skin_tension: 0.7,
        overall_height: 0.85,
        energy_level: 1.15,
        eye_openness: 0.9,
        rebound: 1.2,
      };
    case "dormant-orbit-maintain":
      return {
        face_scale: 1.25,
        energy_level: 1.35,
        overall_height: 1.1,
        eye_openness: 1.4,
      };
    case "wake":
      return {
        energy_level: 0.75,
        face_scale: 0.9,
        overall_height: 1.0,
        eye_openness: 0.85,
        internal_glow: 0.7,
      };
    case "presence-thinking-knit":
      return {
        eye_spacing: 0.9,
        crown_height: 1.15,
        energy_lag: 1.2,
        gaze: 1.1,
      };
    case "comet-executing-drive":
      return {
        energy_pulse: 0.65,
        energy_level: 0.8,
        overall_height: 0.95,
        skin_tension: 1.05,
      };
    default:
      return {};
  }
}

export function motionSignatureDistance(a: MotionSignatureV1, b: MotionSignatureV1): number {
  const axes: Array<keyof MotionSignatureV1> = [
    "weight",
    "time",
    "space",
    "flow",
    "vertical",
    "horizontal",
    "sagittal",
    "phrasing",
  ];
  let d = 0;
  for (const k of axes) {
    if (a[k] !== b[k]) d += 1;
  }
  return d;
}
