/**
 * Eye / mouth / contour / topology / transition discontinuity detectors.
 */

import {
  CONTOUR_CHANNELS,
  EYE_CHANNELS,
  MOUTH_CHANNELS,
  TOPOLOGY_LOCK,
} from "./channels";
import { maxAbs } from "./derivatives";
import { countOwnershipOscillations } from "./ownership";
import type {
  ContinuityFrame,
  ContinuityThresholds,
  DiscontinuityFlags,
  FrameSequenceSeries,
} from "./types";
import { DEFAULT_CONTINUITY_THRESHOLDS } from "./types";

function maxPairwiseAbsDelta(
  seriesMap: Record<string, number[]>,
  keys: readonly string[],
): number {
  let m = 0;
  for (const k of keys) {
    const s = seriesMap[k];
    if (!s || s.length < 2) continue;
    for (let i = 1; i < s.length; i++) {
      const d = Math.abs(s[i]! - s[i - 1]!);
      if (d > m) m = d;
    }
  }
  return m;
}

function maxDeltaAtInterruptEdges(
  seriesMap: Record<string, number[]>,
  keys: readonly string[],
  interruptEdges: readonly boolean[],
): number {
  let m = 0;
  for (const k of keys) {
    const s = seriesMap[k];
    if (!s) continue;
    for (let i = 1; i < s.length; i++) {
      if (!interruptEdges[i]) continue;
      const d = Math.abs(s[i]! - s[i - 1]!);
      if (d > m) m = d;
    }
  }
  return m;
}

/** Topology discontinuity: any frame changes lock constants or topologyStable flips false. */
export function detectTopologyDiscontinuity(
  frames: readonly ContinuityFrame[],
): boolean {
  for (const f of frames) {
    if (!f.topology.topologyStable) return true;
    if (f.topology.contourSamples !== TOPOLOGY_LOCK.contourSamples) return true;
    if (f.topology.structuralNodes !== TOPOLOGY_LOCK.structuralNodes) return true;
    if (f.topology.structuralTriangles !== TOPOLOGY_LOCK.structuralTriangles) {
      return true;
    }
  }
  // Also fail if series values diverge across frames
  if (frames.length < 2) return false;
  const first = frames[0]!.topology;
  for (let i = 1; i < frames.length; i++) {
    const t = frames[i]!.topology;
    if (
      t.contourSamples !== first.contourSamples ||
      t.structuralNodes !== first.structuralNodes ||
      t.structuralTriangles !== first.structuralTriangles
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Score discontinuities from a built series + raw frames.
 */
export function detectDiscontinuities(
  series: FrameSequenceSeries,
  frames: readonly ContinuityFrame[],
  thresholds: ContinuityThresholds = DEFAULT_CONTINUITY_THRESHOLDS,
): DiscontinuityFlags & {
  maxImmediateDelta: number;
  eyeMaxDelta: number;
  mouthMaxDelta: number;
  contourMaxDelta: number;
} {
  const eyeMaxDelta = maxPairwiseAbsDelta(series.eyes, EYE_CHANNELS);
  const mouthMaxDelta = maxPairwiseAbsDelta(series.mouth, MOUTH_CHANNELS);
  const contourMaxDelta = maxPairwiseAbsDelta(series.contour, CONTOUR_CHANNELS);

  // Immediate delta: prefer interrupt edges; fall back to global max step.
  let maxImmediateDelta = maxDeltaAtInterruptEdges(
    series.position,
    Object.keys(series.position),
    series.interruptEdges,
  );
  for (const k of EYE_CHANNELS) {
    maxImmediateDelta = Math.max(
      maxImmediateDelta,
      maxDeltaAtInterruptEdges(series.eyes, [k], series.interruptEdges),
    );
  }
  for (const k of MOUTH_CHANNELS) {
    maxImmediateDelta = Math.max(
      maxImmediateDelta,
      maxDeltaAtInterruptEdges(series.mouth, [k], series.interruptEdges),
    );
  }
  if (maxImmediateDelta === 0 && series.frameCount > 1) {
    // No interrupt edges: use global max step as teleport probe
    maxImmediateDelta = Math.max(
      eyeMaxDelta,
      mouthMaxDelta,
      contourMaxDelta,
      maxPairwiseAbsDelta(series.position, Object.keys(series.position)),
    );
  }

  const topology = detectTopologyDiscontinuity(frames);

  let ownershipFlicker = false;
  for (const owners of Object.values(series.ownership)) {
    if (countOwnershipOscillations(owners) > thresholds.maxOwnershipFlipsPerChannel) {
      ownershipFlicker = true;
      break;
    }
  }

  // Transition discontinuity: large step mid-transition without interrupt ownership
  let transition = false;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i]!;
    if (f.transition?.phase === "transition" && !f.interruptEdge) {
      for (const k of Object.keys(f.channels)) {
        const prev = frames[i - 1]!.channels[k];
        const cur = f.channels[k];
        if (prev === undefined || cur === undefined) continue;
        if (Math.abs(cur - prev) > thresholds.maxImmediateDelta) {
          transition = true;
          break;
        }
      }
    }
    if (transition) break;
  }

  const eye = eyeMaxDelta > thresholds.maxEyeDelta;
  const mouth = mouthMaxDelta > thresholds.maxMouthDelta;
  const contour = contourMaxDelta > thresholds.maxContourDelta;
  const snapTeleport = maxImmediateDelta > thresholds.maxImmediateDelta;

  return {
    eye,
    mouth,
    contour,
    topology,
    transition: transition || snapTeleport,
    ownershipFlicker,
    snapTeleport,
    maxImmediateDelta,
    eyeMaxDelta,
    mouthMaxDelta,
    contourMaxDelta,
  };
}

/** True when no discontinuity flags are raised. */
export function isContinuityClean(flags: DiscontinuityFlags): boolean {
  return (
    !flags.eye &&
    !flags.mouth &&
    !flags.contour &&
    !flags.topology &&
    !flags.transition &&
    !flags.ownershipFlicker &&
    !flags.snapTeleport
  );
}

/** Max absolute velocity magnitude across series.velocity. */
export function seriesMaxVelocity(series: FrameSequenceSeries): number {
  let m = 0;
  for (const s of Object.values(series.velocity)) {
    m = Math.max(m, maxAbs(s));
  }
  return m;
}
