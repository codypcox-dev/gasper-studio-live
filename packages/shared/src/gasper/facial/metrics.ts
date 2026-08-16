/**
 * Dense sequence metrics for facial continuum analysis:
 * position, velocity, acceleration, jerk, area, symmetry, attachment, ownership.
 */

import { attachmentResiduals, featuresAttached, oneBodyCoMotion } from "./featureAnchors";
import {
  detectSnapFrames,
  eyeAsymmetryMetric,
  isMouthInverted,
  shellArea,
} from "./tissueBounds";
import {
  DEFAULT_FACIAL_POLICY,
  FACE_ONLY_CHANNELS,
  type FacialChannelMap,
  type FacialContinuumPolicy,
  type FacialFrame,
  type FacialOwner,
} from "./types";

export function finiteDifferences(
  positions: readonly number[],
  dt: number,
): { velocity: number[]; acceleration: number[]; jerk: number[] } {
  const n = positions.length;
  const safeDt = dt > 0 ? dt : 1 / 60;
  const velocity = new Array<number>(n).fill(0);
  const acceleration = new Array<number>(n).fill(0);
  const jerk = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    velocity[i] = (positions[i]! - positions[i - 1]!) / safeDt;
  }
  for (let i = 1; i < n; i++) {
    acceleration[i] = (velocity[i]! - velocity[i - 1]!) / safeDt;
  }
  for (let i = 1; i < n; i++) {
    jerk[i] = (acceleration[i]! - acceleration[i - 1]!) / safeDt;
  }
  return { velocity, acceleration, jerk };
}

export function maxAbs(series: readonly number[]): number {
  let m = 0;
  for (const v of series) {
    const a = Math.abs(v);
    if (a > m) m = a;
  }
  return m;
}

export type ChannelSeriesMetrics = {
  channel: string;
  position: number[];
  velocity: number[];
  acceleration: number[];
  jerk: number[];
  maxVelocity: number;
  maxAcceleration: number;
  maxJerk: number;
  snapFrames: number[];
};

export function metricsForChannel(
  channel: string,
  positions: readonly number[],
  dt: number,
  maxStep: number,
): ChannelSeriesMetrics {
  const { velocity, acceleration, jerk } = finiteDifferences(positions, dt);
  return {
    channel,
    position: [...positions],
    velocity,
    acceleration,
    jerk,
    maxVelocity: maxAbs(velocity),
    maxAcceleration: maxAbs(acceleration),
    maxJerk: maxAbs(jerk),
    snapFrames: detectSnapFrames(positions, maxStep),
  };
}

export type FacialSequenceReport = {
  frameCount: number;
  dt: number;
  channels: Record<string, ChannelSeriesMetrics>;
  areas: number[];
  symmetry: number[];
  attachmentMaxError: number[];
  ownership: Record<string, FacialOwner[]>;
  ownershipOscillations: Record<string, number>;
  oneBodyViolations: number;
  mouthInversions: number;
  snapCount: number;
  maxVelocity: number;
  maxAcceleration: number;
  maxJerk: number;
  bounded: boolean;
  featuresAttached: boolean;
  singleOwnerPerFrame: boolean;
  holdLastGoodHonored: boolean;
};

export function analyzeFacialSequence(
  frames: readonly FacialFrame[],
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): FacialSequenceReport {
  const dt = frames.length >= 2 ? frames[1]!.t - frames[0]!.t : policy.dtDefault;
  const safeDt = dt > 0 ? dt : policy.dtDefault;

  const channelIds = new Set<string>();
  for (const f of frames) {
    for (const k of Object.keys(f.channels)) channelIds.add(k);
  }

  const channels: Record<string, ChannelSeriesMetrics> = {};
  let snapCount = 0;
  let maxVelocity = 0;
  let maxAcceleration = 0;
  let maxJerk = 0;

  for (const id of channelIds) {
    const pos = frames.map((f) => f.channels[id] ?? 0);
    const step =
      FACE_ONLY_CHANNELS.includes(id as (typeof FACE_ONLY_CHANNELS)[number])
        ? policy.maxFaceStep
        : policy.maxFaceStep * 1.5;
    const m = metricsForChannel(id, pos, safeDt, step);
    channels[id] = m;
    snapCount += m.snapFrames.length;
    maxVelocity = Math.max(maxVelocity, m.maxVelocity);
    maxAcceleration = Math.max(maxAcceleration, m.maxAcceleration);
    maxJerk = Math.max(maxJerk, m.maxJerk);
  }

  const areas = frames.map((f) => shellArea(f.channels));
  const symmetry = frames.map((f) => eyeAsymmetryMetric(f.channels));
  const attachmentMaxError = frames.map((f) => {
    const r = f.attachmentError;
    let m = 0;
    for (const v of Object.values(r)) m = Math.max(m, Math.abs(v));
    return m;
  });

  const ownership: Record<string, FacialOwner[]> = {};
  const ownershipKeys = new Set<string>();
  for (const f of frames) {
    for (const k of Object.keys(f.ownership)) ownershipKeys.add(k);
  }
  for (const k of ownershipKeys) {
    ownership[k] = frames.map((f) => f.ownership[k] ?? "none");
  }

  const ownershipOscillations: Record<string, number> = {};
  for (const [k, series] of Object.entries(ownership)) {
    ownershipOscillations[k] = countOscillations(series);
  }

  let oneBodyViolations = 0;
  let mouthInversions = 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    if (isMouthInverted(f.channels, policy)) mouthInversions += 1;
    if (i > 0) {
      const body = oneBodyCoMotion(frames[i - 1]!.channels, f.channels);
      // Material multi-frame face travel without shell/energy is a violation
      // only when not a pure hold (already handled in oneBodyCoMotion).
      if (!body.ok) oneBodyViolations += 1;
    }
  }

  const bounded =
    maxVelocity <= policy.maxVelocity + 1e-6 &&
    maxAcceleration <= policy.maxAcceleration + 1e-6 &&
    maxJerk <= policy.maxJerk + 1e-3 &&
    snapCount === 0 &&
    mouthInversions === 0 &&
    symmetry.every((s) => s <= policy.maxEyeAsymmetry + 1e-6);

  // Honor frame.attachmentError when present (injectFloatingOverlay path) and
  // fall back to channel lattice residuals for continuum-authored frames.
  const allAttached = frames.every((f) =>
    featuresAttached(
      f.channels,
      undefined,
      policy.maxAttachmentError,
      f.attachmentError,
    ),
  );
  const contested = ["eye_openness", "gaze", "mouth_openness", "mouth_width", "face_scale"];
  const singleOwnerPerFrame = frames.every((f) => {
    for (const k of contested) {
      const o = f.ownership[k];
      if (!o || o === "none") return false;
    }
    return true;
  });

  // Hold-last-good: on interrupt edges, owner must be hold_last_good or interrupt_blend
  // and position must equal previous (no teleport).
  let holdLastGoodHonored = true;
  for (let i = 1; i < frames.length; i++) {
    if (!frames[i]!.interruptEdge) continue;
    const owners = frames[i]!.ownership;
    const faceOwner = owners.eye_openness ?? owners.mouth_openness ?? "none";
    if (faceOwner !== "hold_last_good" && faceOwner !== "interrupt_blend") {
      holdLastGoodHonored = false;
    }
    // Immediate delta on interrupt must respect maxFaceStep.
    for (const k of FACE_ONLY_CHANNELS) {
      const a = frames[i - 1]!.channels[k] ?? 0;
      const b = frames[i]!.channels[k] ?? 0;
      if (Math.abs(b - a) > policy.maxFaceStep + 1e-6) {
        holdLastGoodHonored = false;
      }
    }
  }

  return {
    frameCount: frames.length,
    dt: safeDt,
    channels,
    areas,
    symmetry,
    attachmentMaxError,
    ownership,
    ownershipOscillations,
    oneBodyViolations,
    mouthInversions,
    snapCount,
    maxVelocity,
    maxAcceleration,
    maxJerk,
    bounded,
    featuresAttached: allAttached,
    singleOwnerPerFrame,
    holdLastGoodHonored,
  };
}

export function countOscillations(owners: readonly FacialOwner[]): number {
  let n = 0;
  for (let i = 2; i < owners.length; i++) {
    if (owners[i] === owners[i - 2] && owners[i] !== owners[i - 1]) n += 1;
  }
  return n;
}

/** Adversarial: inject a 1-frame snap into a channel series (for test self-checks). */
export function injectSnap(
  frames: FacialFrame[],
  channel: string,
  frameIndex: number,
  delta: number,
): FacialFrame[] {
  return frames.map((f, i) => {
    if (i !== frameIndex) return f;
    return {
      ...f,
      channels: {
        ...f.channels,
        [channel]: (f.channels[channel] ?? 0) + delta,
      },
    };
  });
}

/** Adversarial: inject mouth inversion. */
export function injectMouthInversion(
  frames: FacialFrame[],
  frameIndex: number,
): FacialFrame[] {
  return frames.map((f, i) => {
    if (i !== frameIndex) return f;
    return {
      ...f,
      channels: { ...f.channels, mouth_openness: -0.2 },
    };
  });
}

/** Adversarial: inject floating overlay offset into attachment error. */
export function injectFloatingOverlay(
  frames: FacialFrame[],
  frameIndex: number,
  error = 0.2,
): FacialFrame[] {
  return frames.map((f, i) => {
    if (i !== frameIndex) return f;
    return {
      ...f,
      attachmentError: {
        ...f.attachmentError,
        eye_left: error,
        eye_right: error,
      },
    };
  });
}

export function attachmentErrorFromChannels(channels: FacialChannelMap): Record<string, number> {
  return attachmentResiduals(channels);
}
