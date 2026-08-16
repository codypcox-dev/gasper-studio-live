/**
 * No-blackout temporal invariant for Gasper living continuity.
 *
 * Explicit policy over character visibility, shell continuity, facial
 * attachment, energy release/hold, and topology ownership. Pure analysis +
 * floor enforcement — does not own GSAP tick / MCP frames.
 *
 * R4: closes contact-sheet P0 blackouts (Wake dark-until-snap, Dormant Maintain
 * decay to empty orb, bidirectional face loss, interrupt/reset outer-orb-only)
 * while allowing intentional dormant dimming that remains legible.
 *
 * Structural pass ≠ Cody / product visual acceptance (Oath video-first).
 */

import type { ContinuityChannelMap, ContinuityFrame } from "./types";
import { quantize } from "./derivatives";
import {
  ANTI_COLLAPSE_FLOORS,
  type AntiCollapseMode,
  channelVolume,
  VOLUME_FLOOR,
  registerNoBlackoutAfterAntiCollapse,
} from "./energyGrammar";

// Wire energy grammar (applyEnergyGrammar / stepEnergyTowardTarget) so scalar
// anti-collapse alone cannot leave facialAttached composite blackout.
registerNoBlackoutAfterAntiCollapse((channels, mode) =>
  enforceNoBlackoutFloors(channels, noBlackoutModeFromAntiCollapse(mode)),
);

/** Modes with distinct readability floors (dormant may be dimmer). */
export type NoBlackoutMode =
  | "ordinary"
  | "dormant"
  | "wake"
  | "interrupt"
  | "reset"
  | "expression";

/**
 * Per-mode floors for face-present / shell-continuous / facially-attached /
 * energy-non-black / topology-owned readability.
 *
 * Dormant is intentionally lower energy/emissive but never empty-orb-only.
 * Wake floors are the reconstruct *start* — intermediates must meet these
 * immediately and climb toward ordinary.
 */
export const NO_BLACKOUT_FLOORS = {
  ordinary: {
    face_scale: 0.88,
    overall_height: 0.9,
    overall_width: 0.9,
    lower_body_fullness: 0.55,
    energy_level: 0.2,
    eye_openness: 0.14,
    mouth_openness: 0.04,
    face_emissive: 0.18,
    internal_glow: 0.22,
    /** Composite face presence score floor. */
    face_presence: 0.22,
    /** Shell volume proxy floor. */
    shell_volume: VOLUME_FLOOR,
    /** Facial attachment: face_scale * emissive proxy. */
    facial_attachment: 0.16,
  },
  dormant: {
    // Dim but legible same-character — never empty outer orb.
    face_scale: 0.88,
    overall_height: 0.9,
    overall_width: 0.9,
    lower_body_fullness: 0.55,
    energy_level: 0.14,
    eye_openness: 0.1,
    mouth_openness: 0.03,
    face_emissive: 0.12,
    internal_glow: 0.14,
    face_presence: 0.14,
    shell_volume: VOLUME_FLOOR,
    facial_attachment: 0.1,
  },
  wake: {
    // Reconstruct start floors — must already be readable mid-wake.
    face_scale: 0.9,
    overall_height: 0.92,
    overall_width: 0.92,
    lower_body_fullness: 0.55,
    energy_level: 0.18,
    eye_openness: 0.12,
    mouth_openness: 0.04,
    face_emissive: 0.14,
    internal_glow: 0.18,
    face_presence: 0.16,
    shell_volume: VOLUME_FLOOR,
    facial_attachment: 0.12,
  },
  interrupt: {
    face_scale: 0.88,
    overall_height: 0.9,
    overall_width: 0.9,
    lower_body_fullness: 0.55,
    energy_level: 0.2,
    eye_openness: 0.12,
    mouth_openness: 0.04,
    face_emissive: 0.16,
    internal_glow: 0.2,
    face_presence: 0.18,
    shell_volume: VOLUME_FLOOR,
    facial_attachment: 0.14,
  },
  reset: {
    face_scale: 0.92,
    overall_height: 0.94,
    overall_width: 0.94,
    lower_body_fullness: 0.55,
    energy_level: 0.28,
    eye_openness: 0.18,
    mouth_openness: 0.06,
    face_emissive: 0.2,
    internal_glow: 0.28,
    face_presence: 0.24,
    shell_volume: VOLUME_FLOOR,
    facial_attachment: 0.18,
  },
  expression: {
    face_scale: 0.9,
    overall_height: 0.92,
    overall_width: 0.92,
    lower_body_fullness: 0.55,
    energy_level: 0.22,
    eye_openness: 0.12,
    mouth_openness: 0.04,
    face_emissive: 0.16,
    internal_glow: 0.24,
    face_presence: 0.2,
    shell_volume: VOLUME_FLOOR,
    facial_attachment: 0.14,
  },
} as const;

export type NoBlackoutFloors = (typeof NO_BLACKOUT_FLOORS)[NoBlackoutMode];

/** Temporal suite floors for route proofs. */
export const NO_BLACKOUT_TEMPORAL = {
  /** Max fraction of frames that may fail readability (strict: near-zero). */
  maxBlackoutFrameFraction: 0.02,
  /** Min consecutive readable frames required on each route interior. */
  minConsecutiveReadable: 4,
  /** Min fraction of frames with face_presence above mode floor. */
  minFacePresenceContinuity: 0.96,
  /** Max |Δchannel| allowed when inverse of forward restores (eps). */
  inverseRestorationEps: 0.12,
  /**
   * Min late-half − early-half face_presence for wake progressive reconstruct.
   * late must be ≥ early + this (non-regression with measurable lift when early
   * is near the wake floor). Flat-at-floor-only wake series fail.
   */
  wakeMinProgressiveLift: 0.01,
} as const;

/** Map energy anti-collapse mode → no-blackout mode. */
export function noBlackoutModeFromAntiCollapse(
  mode: AntiCollapseMode | string | null | undefined,
): NoBlackoutMode {
  if (!mode) return "ordinary";
  if (mode in NO_BLACKOUT_FLOORS) return mode as NoBlackoutMode;
  return "ordinary";
}

/** Resolve mode from route / transition label. */
export function resolveNoBlackoutMode(
  routeId: string | null | undefined,
): NoBlackoutMode {
  if (!routeId) return "ordinary";
  const id = routeId.toLowerCase();
  if (id.includes("dormant")) return "dormant";
  if (id === "wake" || id.includes("wake")) return "wake";
  if (id.includes("interrupt") || id === "recovering") return "interrupt";
  if (id === "reset") return "reset";
  if (id.startsWith("expression")) return "expression";
  return "ordinary";
}

/**
 * Face presence composite ∈ [0,1]:
 * weighted eyes + mouth + emissive + scale (communication, not silhouette alone).
 */
export function facePresenceScore(channels: ContinuityChannelMap): number {
  const eye = clamp01(channels.eye_openness ?? 0);
  const mouth = clamp01(channels.mouth_openness ?? 0);
  const em = clamp01(channels.face_emissive ?? 0);
  const fs = clamp01((channels.face_scale ?? 1) / 1.2);
  const glow = clamp01(channels.internal_glow ?? 0);
  // Eyes dominate communication; emissive/scale prevent empty-shell false positives.
  return quantize(
    eye * 0.38 + mouth * 0.12 + em * 0.28 + fs * 0.12 + glow * 0.1,
    6,
  );
}

/** Shell continuity: volume + finite height/width (never zero-scale orb wipe). */
export function shellContinuityScore(channels: ContinuityChannelMap): number {
  const vol = channelVolume(channels);
  const h = channels.overall_height ?? 1;
  const w = channels.overall_width ?? 1;
  const fs = channels.face_scale ?? 1;
  if (h < 0.05 || w < 0.05 || fs < 0.05) return 0;
  return quantize(Math.min(1, vol / Math.max(VOLUME_FLOOR, 1e-6)), 6);
}

/**
 * Facial attachment: face remains bound to shell (scale × emissive × eye).
 * Outer-orb-only fails this (emissive≈0, eyes≈0 while shell may remain).
 */
export function facialAttachmentScore(channels: ContinuityChannelMap): number {
  const fs = clamp01(channels.face_scale ?? 1);
  const em = clamp01(channels.face_emissive ?? 0);
  const eye = clamp01(channels.eye_openness ?? 0);
  return quantize(fs * (0.45 * em + 0.55 * eye), 6);
}

/** Energy non-black: level + glow never flat to darkness as motion vehicle. */
export function energyHoldScore(channels: ContinuityChannelMap): number {
  const e = clamp01(channels.energy_level ?? 0);
  const g = clamp01(channels.internal_glow ?? 0);
  const p = clamp01(channels.energy_pulse ?? 0);
  return quantize(e * 0.7 + g * 0.2 + p * 0.1, 6);
}

/** Topology ownership stable flag from frame (defaults true for channel-only). */
export function topologyOwnershipOk(
  frame: ContinuityFrame | { topology?: { topologyStable?: boolean } } | null,
): boolean {
  if (!frame || !frame.topology) return true;
  return frame.topology.topologyStable !== false;
}

export type FrameReadability = {
  facePresent: boolean;
  shellContinuous: boolean;
  facialAttached: boolean;
  energyNonBlack: boolean;
  topologyOwned: boolean;
  facePresence: number;
  shellContinuity: number;
  facialAttachment: number;
  energyHold: number;
  /** True when any invariant axis fails its mode floor. */
  blackout: boolean;
  mode: NoBlackoutMode;
};

/** Evaluate single-frame readability against mode floors. */
export function evaluateFrameReadability(
  channels: ContinuityChannelMap,
  mode: NoBlackoutMode = "ordinary",
  frame?: ContinuityFrame | { topology?: { topologyStable?: boolean } } | null,
): FrameReadability {
  const floors = NO_BLACKOUT_FLOORS[mode] ?? NO_BLACKOUT_FLOORS.ordinary;
  const facePresence = facePresenceScore(channels);
  const shellContinuity = shellContinuityScore(channels);
  const facialAttachment = facialAttachmentScore(channels);
  const energyHold = energyHoldScore(channels);
  const topologyOwned = topologyOwnershipOk(frame ?? null);

  const facePresent = facePresence >= floors.face_presence - 1e-9;
  const shellContinuous =
    shellContinuity >= 0.98 &&
    (channels.overall_height ?? 1) >= floors.overall_height - 1e-9 &&
    (channels.overall_width ?? 1) >= floors.overall_width - 1e-9 &&
    (channels.face_scale ?? 1) >= floors.face_scale - 1e-9;
  const facialAttached =
    facialAttachment >= floors.facial_attachment - 1e-9 &&
    (channels.face_emissive ?? 0) >= floors.face_emissive - 1e-9 &&
    (channels.eye_openness ?? 0) >= floors.eye_openness - 1e-9;
  const energyNonBlack =
    energyHold >= floors.energy_level * 0.85 - 1e-9 &&
    (channels.energy_level ?? 0) >= floors.energy_level - 1e-9;

  const blackout =
    !facePresent ||
    !shellContinuous ||
    !facialAttached ||
    !energyNonBlack ||
    !topologyOwned;

  return {
    facePresent,
    shellContinuous,
    facialAttached,
    energyNonBlack,
    topologyOwned,
    facePresence,
    shellContinuity,
    facialAttachment,
    energyHold,
    blackout,
    mode,
  };
}

/**
 * Enforce no-blackout floors on a channel map.
 * Extends anti-collapse with face_emissive / internal_glow / composite rescue.
 */
export function enforceNoBlackoutFloors(
  channels: ContinuityChannelMap,
  mode: NoBlackoutMode = "ordinary",
): ContinuityChannelMap {
  const floors = NO_BLACKOUT_FLOORS[mode] ?? NO_BLACKOUT_FLOORS.ordinary;
  const anti = ANTI_COLLAPSE_FLOORS[mode as AntiCollapseMode] ?? ANTI_COLLAPSE_FLOORS.ordinary;
  const out: ContinuityChannelMap = { ...channels };

  const lift = (key: string, floor: number) => {
    const v = out[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < floor) {
      out[key] = floor;
    }
  };

  lift("face_scale", Math.max(floors.face_scale, anti.face_scale));
  lift("overall_height", Math.max(floors.overall_height, anti.overall_height));
  lift("overall_width", Math.max(floors.overall_width, anti.overall_width));
  lift(
    "lower_body_fullness",
    Math.max(floors.lower_body_fullness, anti.lower_body_fullness),
  );
  lift("energy_level", Math.max(floors.energy_level, anti.energy_level));
  lift("eye_openness", Math.max(floors.eye_openness, anti.eye_openness));
  lift("mouth_openness", Math.max(floors.mouth_openness, anti.mouth_openness));
  lift("face_emissive", floors.face_emissive);
  lift("internal_glow", floors.internal_glow);

  // Volume rescue (same spirit as anti-collapse)
  let vol = channelVolume(out);
  if (vol < floors.shell_volume - 1e-6) {
    const h = out.overall_height ?? 1;
    const w = out.overall_width ?? 1;
    const needPow = floors.shell_volume / Math.max(1e-6, w * h);
    const needF = Math.pow(Math.max(needPow, 0.5), 1 / 0.35);
    out.lower_body_fullness = Math.max(
      out.lower_body_fullness ?? 0,
      Math.min(1.2, needF + 0.02),
    );
    vol = channelVolume(out);
  }
  if (vol < floors.shell_volume - 1e-6) {
    const scale = Math.sqrt(floors.shell_volume / Math.max(1e-6, vol)) * 1.001;
    out.overall_height = (out.overall_height ?? 1) * scale;
    out.overall_width = (out.overall_width ?? 1) * scale;
  }

  // Composite facial attachment + face presence rescue: iterate so partial
  // scalar lifts cannot leave composites just under floor (blackout residual).
  for (let i = 0; i < 4; i++) {
    const att = facialAttachmentScore(out);
    const fp = facePresenceScore(out);
    if (
      att >= floors.facial_attachment - 1e-9 &&
      fp >= floors.face_presence - 1e-9
    ) {
      break;
    }
    if (att < floors.facial_attachment - 1e-9) {
      // Need fs * (0.45*em + 0.55*eye) >= floor → raise eye/em proportionally.
      const fs = Math.max(out.face_scale ?? floors.face_scale, floors.face_scale);
      out.face_scale = fs;
      const needInner = floors.facial_attachment / Math.max(fs, 1e-6);
      const eye = out.eye_openness ?? floors.eye_openness;
      const em = out.face_emissive ?? floors.face_emissive;
      // Prefer lifting both evenly toward needInner
      const targetEye = Math.max(eye, needInner * 1.05, floors.eye_openness);
      const targetEm = Math.max(em, needInner * 1.05, floors.face_emissive);
      out.eye_openness = Math.min(1.2, targetEye);
      out.face_emissive = Math.min(1, targetEm);
    }
    if (fp < floors.face_presence - 1e-9) {
      out.eye_openness = Math.min(
        1.2,
        Math.max(out.eye_openness ?? 0, floors.eye_openness * 1.2),
      );
      out.face_emissive = Math.min(
        1,
        Math.max(out.face_emissive ?? 0, floors.face_emissive * 1.25),
      );
      out.internal_glow = Math.max(
        out.internal_glow ?? 0,
        floors.internal_glow,
      );
      out.mouth_openness = Math.max(
        out.mouth_openness ?? 0,
        floors.mouth_openness,
      );
    }
  }

  return out;
}

/**
 * Wake reconstruction envelope: progress 0→1 samples face/energy from dormant
 * dim floors toward ordinary readable — never dark-until-snap.
 */
export function sampleWakeReconstruction(
  progress: number,
  from?: ContinuityChannelMap,
): ContinuityChannelMap {
  const p = clamp01(progress);
  // Progressive lift uses smoother-than-linear mid emphasis so early frames
  // already clear wake floors (not zero until terminal snap).
  const lift = p * p * (3 - 2 * p); // smoothstep
  const d = NO_BLACKOUT_FLOORS.dormant;
  const o = NO_BLACKOUT_FLOORS.ordinary;
  const wake = NO_BLACKOUT_FLOORS.wake;

  const lerp = (a: number, b: number) => a + (b - a) * lift;

  const base: ContinuityChannelMap = {
    face_scale: lerp(
      from?.face_scale ?? d.face_scale,
      from && from.face_scale != null && from.face_scale > o.face_scale
        ? from.face_scale
        : 1,
    ),
    overall_height: lerp(from?.overall_height ?? d.overall_height, 1),
    overall_width: lerp(from?.overall_width ?? d.overall_width, 1),
    lower_body_fullness: lerp(
      from?.lower_body_fullness ?? d.lower_body_fullness,
      0.7,
    ),
    energy_level: lerp(from?.energy_level ?? d.energy_level, 0.52),
    energy_pulse: lerp(from?.energy_pulse ?? 0.08, 0.16),
    energy_lag: lerp(from?.energy_lag ?? 0.7, 0.35),
    internal_glow: lerp(from?.internal_glow ?? d.internal_glow, 0.48),
    face_emissive: lerp(from?.face_emissive ?? d.face_emissive, 0.32),
    eye_openness: lerp(from?.eye_openness ?? d.eye_openness, 0.56),
    mouth_openness: lerp(from?.mouth_openness ?? d.mouth_openness, 0.32),
  };

  // Guarantee wake intermediate floors at every progress (including 0).
  const floored = enforceNoBlackoutFloors(base, "wake");
  // Extra progressive guarantee: face_presence climbs with progress (not flat floor).
  if (p > 0.15) {
    const targetEm = lerp(wake.face_emissive, 0.32);
    floored.face_emissive = Math.max(floored.face_emissive ?? 0, targetEm);
    floored.eye_openness = Math.max(
      floored.eye_openness ?? 0,
      lerp(wake.eye_openness, 0.5),
    );
  }
  return floored;
}

/**
 * Dormant maintain hold sample: settles to dim-but-readable living identity.
 * Never decays below dormant floors (no empty-orb collapse over time).
 */
export function sampleDormantMaintain(
  progress: number,
  from?: ContinuityChannelMap,
): ContinuityChannelMap {
  const p = clamp01(progress);
  const d = NO_BLACKOUT_FLOORS.dormant;
  const settle = p * p * (3 - 2 * p);
  const lerp = (a: number, b: number) => a + (b - a) * settle;

  // Settle toward dormant steady targets, never under floors.
  const steady: ContinuityChannelMap = {
    face_scale: 0.92,
    overall_height: 0.94,
    overall_width: 0.94,
    lower_body_fullness: 0.65,
    energy_level: 0.22,
    energy_pulse: 0.08,
    energy_lag: 0.7,
    internal_glow: 0.2,
    face_emissive: 0.16,
    eye_openness: 0.18,
    mouth_openness: 0.06,
  };

  const out: ContinuityChannelMap = {};
  for (const [k, target] of Object.entries(steady)) {
    const start = from?.[k] ?? target;
    out[k] = lerp(typeof start === "number" ? start : target, target);
  }
  // Hold residual pulse so maintain stays "living"
  out.energy_pulse = Math.max(out.energy_pulse ?? 0, d.energy_level * 0.4);
  return enforceNoBlackoutFloors(out, "dormant");
}

export type TemporalNoBlackoutReport = {
  schema: "gasper.continuity.no-blackout-temporal.v1";
  frameCount: number;
  blackoutFrameCount: number;
  blackoutFrameFraction: number;
  maxConsecutiveReadable: number;
  minConsecutiveReadableMet: boolean;
  facePresenceContinuity: number;
  facePresenceContinuityMet: boolean;
  blackoutWithinBudget: boolean;
  allTopologyOwned: boolean;
  wakeProgressive: boolean | null;
  inverseConsistent: boolean | null;
  readable: boolean;
  mode: NoBlackoutMode | "mixed";
  notes: string[];
  perFrame: FrameReadability[];
};

/**
 * Temporal predicates over an ordered frame series.
 * mode: fixed mode for all frames, or "mixed" to resolve per transition.to.
 */
export function analyzeNoBlackoutSequence(
  frames: readonly ContinuityFrame[],
  opts?: {
    mode?: NoBlackoutMode | "mixed";
    /** Optional forward series for inverse restoration check against this series. */
    forwardFrames?: readonly ContinuityFrame[];
    /** When true, treat as wake route and require progressive face lift. */
    wakeRoute?: boolean;
  },
): TemporalNoBlackoutReport {
  const modeOpt = opts?.mode ?? "mixed";
  const perFrame: FrameReadability[] = [];
  let blackoutFrameCount = 0;
  let faceOk = 0;
  let allTopologyOwned = true;
  let maxRun = 0;
  let run = 0;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    const mode: NoBlackoutMode =
      modeOpt === "mixed"
        ? resolveNoBlackoutMode(f.transition?.to ?? f.transition?.from)
        : modeOpt;
    const r = evaluateFrameReadability(f.channels, mode, f);
    perFrame.push(r);
    if (r.blackout) {
      blackoutFrameCount++;
      run = 0;
    } else {
      run++;
      if (run > maxRun) maxRun = run;
    }
    if (r.facePresent) faceOk++;
    if (!r.topologyOwned) allTopologyOwned = false;
  }

  const n = frames.length;
  const blackoutFrameFraction = n === 0 ? 1 : blackoutFrameCount / n;
  const facePresenceContinuity = n === 0 ? 0 : faceOk / n;
  const blackoutWithinBudget =
    blackoutFrameFraction <= NO_BLACKOUT_TEMPORAL.maxBlackoutFrameFraction + 1e-12;
  const minConsecutiveReadableMet =
    n === 0
      ? false
      : maxRun >= Math.min(NO_BLACKOUT_TEMPORAL.minConsecutiveReadable, n);
  const facePresenceContinuityMet =
    facePresenceContinuity >= NO_BLACKOUT_TEMPORAL.minFacePresenceContinuity - 1e-12;

  // Wake progressive reconstruction: face presence must rise early→late half.
  // No allowed regression; require non-negative lift (and early non-black).
  let wakeProgressive: boolean | null = null;
  if (opts?.wakeRoute && n >= 4) {
    const mid = Math.floor(n / 2);
    const early =
      perFrame.slice(0, mid).reduce((s, r) => s + r.facePresence, 0) /
      Math.max(1, mid);
    const late =
      perFrame.slice(mid).reduce((s, r) => s + r.facePresence, 0) /
      Math.max(1, n - mid);
    const lift = late - early;
    // Early readable; late ≥ early; if early near floor, require positive lift.
    const nearFloor =
      early < NO_BLACKOUT_FLOORS.wake.face_presence + 0.08;
    wakeProgressive =
      early >= NO_BLACKOUT_FLOORS.wake.face_presence - 0.02 &&
      late + 1e-9 >= early &&
      (!nearFloor || lift >= NO_BLACKOUT_TEMPORAL.wakeMinProgressiveLift - 1e-9);
  }

  // Inverse-consistent restoration: reverse series should restore forward start
  let inverseConsistent: boolean | null = null;
  if (opts?.forwardFrames && opts.forwardFrames.length > 0 && n > 0) {
    const forwardStart = opts.forwardFrames[0]!.channels;
    const reverseEnd = frames[n - 1]!.channels;
    const keys = [
      "face_scale",
      "energy_level",
      "eye_openness",
      "face_emissive",
      "overall_height",
      "overall_width",
    ];
    let maxDiff = 0;
    for (const k of keys) {
      const d = Math.abs((forwardStart[k] ?? 0) - (reverseEnd[k] ?? 0));
      if (d > maxDiff) maxDiff = d;
    }
    inverseConsistent = maxDiff <= NO_BLACKOUT_TEMPORAL.inverseRestorationEps;
  }

  const notes: string[] = [];
  if (!blackoutWithinBudget) {
    notes.push(
      `blackoutFrameFraction ${blackoutFrameFraction.toFixed(3)} exceeds budget ${NO_BLACKOUT_TEMPORAL.maxBlackoutFrameFraction}`,
    );
  }
  if (!minConsecutiveReadableMet) {
    notes.push(
      `maxConsecutiveReadable ${maxRun} < ${NO_BLACKOUT_TEMPORAL.minConsecutiveReadable}`,
    );
  }
  if (!facePresenceContinuityMet) {
    notes.push(
      `facePresenceContinuity ${facePresenceContinuity.toFixed(3)} below ${NO_BLACKOUT_TEMPORAL.minFacePresenceContinuity}`,
    );
  }
  if (wakeProgressive === false) notes.push("wake progressive reconstruction failed");
  if (inverseConsistent === false) notes.push("inverse restoration inconsistent");
  if (!allTopologyOwned) notes.push("topology ownership unstable");
  if (notes.length === 0) notes.push("no-blackout temporal invariant held");

  const readable =
    blackoutWithinBudget &&
    minConsecutiveReadableMet &&
    facePresenceContinuityMet &&
    allTopologyOwned &&
    wakeProgressive !== false &&
    inverseConsistent !== false;

  return {
    schema: "gasper.continuity.no-blackout-temporal.v1",
    frameCount: n,
    blackoutFrameCount,
    blackoutFrameFraction,
    maxConsecutiveReadable: maxRun,
    minConsecutiveReadableMet,
    facePresenceContinuity,
    facePresenceContinuityMet,
    blackoutWithinBudget,
    allTopologyOwned,
    wakeProgressive,
    inverseConsistent,
    readable,
    mode: modeOpt,
    notes,
    perFrame,
  };
}

/**
 * Projector face-visibility floor (SVG opacity domain).
 * Dormant may be dim; never zero. Wake reconstruct starts above floor.
 */
export const PROJECTOR_FACE_VIS_FLOORS = {
  ordinary: 0.85,
  dormant: 0.38,
  wake: 0.42,
  featureOrdinary: 0.45,
  featureDormant: 0.22,
  emissionOrdinary: 0.55,
  emissionDormant: 0.2,
} as const;

/**
 * Resolve projector face visibility with no-blackout floors.
 * progress: morph mix 0→1; fromFace/toFace: profile face flags.
 * routeHint: "wake" | "dormant" | ordinary.
 */
export function resolveProjectorFaceVisibility(opts: {
  progress: number;
  fromFace: boolean;
  toFace: boolean;
  routeHint?: "wake" | "dormant" | "ordinary";
}): {
  faceVis: number;
  featureOp: number;
  emissionOp: number;
  recessOp: number;
  dormantFamily: boolean;
} {
  const t = clamp01(opts.progress);
  const dormantFamily =
    opts.routeHint === "dormant" ||
    (!opts.toFace && t >= 0.5) ||
    (!opts.fromFace && t < 0.5) ||
    opts.routeHint === "wake";

  // Raw interpolate when face flags differ
  let raw: number;
  if (opts.fromFace === opts.toFace) {
    raw = opts.toFace ? 1 : 0;
  } else if (opts.toFace) {
    // Wake-like: reconstruct face over time (start from dormant floor, not 0)
    raw = t;
  } else {
    // Enter dormant: dim but never wipe
    raw = 1 - t;
  }

  const floor =
    opts.routeHint === "wake"
      ? PROJECTOR_FACE_VIS_FLOORS.wake
      : dormantFamily || opts.routeHint === "dormant"
        ? PROJECTOR_FACE_VIS_FLOORS.dormant
        : PROJECTOR_FACE_VIS_FLOORS.ordinary;

  // Progressive wake: blend floor → 1 with smoothstep so intermediates readable
  let faceVis: number;
  if (opts.routeHint === "wake" || (opts.toFace && !opts.fromFace)) {
    const lift = t * t * (3 - 2 * t);
    faceVis = PROJECTOR_FACE_VIS_FLOORS.wake + (1 - PROJECTOR_FACE_VIS_FLOORS.wake) * lift;
  } else if (opts.routeHint === "dormant" || (!opts.toFace && opts.fromFace)) {
    const settle = t * t * (3 - 2 * t);
    faceVis =
      1 * (1 - settle) + PROJECTOR_FACE_VIS_FLOORS.dormant * settle;
    faceVis = Math.max(PROJECTOR_FACE_VIS_FLOORS.dormant, faceVis);
  } else if (!opts.toFace && !opts.fromFace) {
    faceVis = PROJECTOR_FACE_VIS_FLOORS.dormant;
  } else {
    faceVis = Math.max(floor, raw);
  }

  faceVis = Math.max(floor, Math.min(1, faceVis));

  const featureOp = dormantFamily
    ? Math.max(PROJECTOR_FACE_VIS_FLOORS.featureDormant, faceVis * 0.55)
    : Math.max(PROJECTOR_FACE_VIS_FLOORS.featureOrdinary, faceVis * 0.75);

  const emissionOp = dormantFamily
    ? Math.max(PROJECTOR_FACE_VIS_FLOORS.emissionDormant, faceVis * 0.55)
    : Math.max(PROJECTOR_FACE_VIS_FLOORS.emissionOrdinary, faceVis * 0.85);

  const recessOp = faceVis;

  return { faceVis, featureOp, emissionOp, recessOp, dormantFamily };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
