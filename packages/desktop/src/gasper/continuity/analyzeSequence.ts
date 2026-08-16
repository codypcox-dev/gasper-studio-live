/**
 * Multi-frame frame-sequence analysis: position, velocity, acceleration, jerk,
 * contour, topology, eyes, mouth + discontinuity scoring.
 */

import {
  CONTOUR_CHANNELS,
  CONTESTED_OWNERSHIP_CHANNELS,
  EYE_CHANNELS,
  MOUTH_CHANNELS,
  POSITION_CHANNELS,
} from "./channels";
import {
  derivativesBounded,
  finiteDifferences,
  maxDerivativeMagnitudes,
  quantize,
} from "./derivatives";
import { detectDiscontinuities, isContinuityClean } from "./discontinuity";
import { ownershipAntiFlickerStable } from "./ownership";
import type {
  ContinuityFrame,
  ContinuityOwner,
  ContinuityThresholds,
  FrameSequenceAnalysis,
  FrameSequenceSeries,
  SeriesEqualityResult,
} from "./types";
import { DEFAULT_CONTINUITY_THRESHOLDS } from "./types";

function extractSeries(
  frames: readonly ContinuityFrame[],
  keys: readonly string[],
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const k of keys) {
    out[k] = frames.map((f) => quantize(f.channels[k] ?? f.contour[k as keyof typeof f.contour] ?? 0));
  }
  return out;
}

function buildDerivatives(
  position: Record<string, number[]>,
  dt: number,
): {
  velocity: Record<string, number[]>;
  acceleration: Record<string, number[]>;
  jerk: Record<string, number[]>;
} {
  const velocity: Record<string, number[]> = {};
  const acceleration: Record<string, number[]> = {};
  const jerk: Record<string, number[]> = {};
  for (const [k, pos] of Object.entries(position)) {
    const d = finiteDifferences(pos, dt);
    velocity[k] = d.velocity;
    acceleration[k] = d.acceleration;
    jerk[k] = d.jerk;
  }
  return { velocity, acceleration, jerk };
}

/**
 * Build multi-channel series from ordered continuity frames.
 */
export function buildFrameSequenceSeries(
  frames: readonly ContinuityFrame[],
  opts: { seed: number; dt: number },
): FrameSequenceSeries {
  const dt = opts.dt > 0 ? opts.dt : 1 / 60;
  const positionKeys = [
    ...new Set([
      ...POSITION_CHANNELS,
      ...EYE_CHANNELS,
      ...MOUTH_CHANNELS,
      ...CONTOUR_CHANNELS,
    ]),
  ];
  const position = extractSeries(frames, positionKeys);
  const { velocity, acceleration, jerk } = buildDerivatives(position, dt);
  const eyes = extractSeries(frames, EYE_CHANNELS);
  const mouth = extractSeries(frames, MOUTH_CHANNELS);
  const contour = extractSeries(frames, CONTOUR_CHANNELS);

  const ownership: Record<string, ContinuityOwner[]> = {};
  for (const ch of CONTESTED_OWNERSHIP_CHANNELS) {
    ownership[ch] = frames.map((f) => f.ownership[ch] ?? "none");
  }

  return {
    seed: opts.seed >>> 0,
    dt,
    frameCount: frames.length,
    times: frames.map((f) => f.t),
    position,
    velocity,
    acceleration,
    jerk,
    eyes,
    mouth,
    contour,
    topology: {
      contourSamples: frames.map((f) => f.topology.contourSamples),
      structuralNodes: frames.map((f) => f.topology.structuralNodes),
      structuralTriangles: frames.map((f) => f.topology.structuralTriangles),
      topologyStable: frames.map((f) => f.topology.topologyStable),
    },
    ownership,
    interruptEdges: frames.map((f) => f.interruptEdge === true),
  };
}

/**
 * Full analysis of a captured frame sequence.
 */
export function analyzeFrameSequence(
  frames: readonly ContinuityFrame[],
  opts: {
    seed: number;
    dt: number;
    thresholds?: ContinuityThresholds;
    deterministicScheduling?: boolean;
  },
): FrameSequenceAnalysis {
  const thresholds = opts.thresholds ?? DEFAULT_CONTINUITY_THRESHOLDS;
  const series = buildFrameSequenceSeries(frames, {
    seed: opts.seed,
    dt: opts.dt,
  });
  const disc = detectDiscontinuities(series, frames, thresholds);
  const mags = maxDerivativeMagnitudes({
    velocity: series.velocity,
    acceleration: series.acceleration,
    jerk: series.jerk,
  });
  const bounded = derivativesBounded(mags, thresholds);
  const antiFlicker = ownershipAntiFlickerStable(
    series.ownership,
    series.interruptEdges,
    thresholds.maxOwnershipFlipsPerChannel,
  );
  const clean = isContinuityClean(disc);
  const notes: string[] = [];
  if (!clean) {
    if (disc.eye) notes.push("eye discontinuity above threshold");
    if (disc.mouth) notes.push("mouth discontinuity above threshold");
    if (disc.contour) notes.push("contour discontinuity above threshold");
    if (disc.topology) notes.push("topology lock violated");
    if (disc.transition) notes.push("transition discontinuity");
    if (disc.ownershipFlicker) notes.push("ownership flicker");
    if (disc.snapTeleport) notes.push("snap/teleport detected");
  } else {
    notes.push("no residual discontinuities under slice thresholds");
  }
  if (!bounded) notes.push("derivative bounds exceeded");
  if (!antiFlicker) notes.push("anti-flicker ownership unstable");

  return {
    schema: "gasper.temporal.frame-sequence-analysis.v1",
    seed: opts.seed >>> 0,
    dt: series.dt,
    frameCount: series.frameCount,
    series,
    discontinuities: {
      eye: disc.eye,
      mouth: disc.mouth,
      contour: disc.contour,
      topology: disc.topology,
      transition: disc.transition,
      ownershipFlicker: disc.ownershipFlicker,
      snapTeleport: disc.snapTeleport,
    },
    maxImmediateDelta: disc.maxImmediateDelta,
    maxVelocity: mags.maxVelocity,
    maxAcceleration: mags.maxAcceleration,
    maxJerk: mags.maxJerk,
    boundedDerivatives: bounded,
    interruptSafe: clean && !disc.snapTeleport,
    antiFlickerOwnershipStable: antiFlicker,
    deterministicScheduling: opts.deterministicScheduling !== false,
    mcpFrameDriving: false,
    gsapFrameAuthority: true,
    thresholds,
    notes,
  };
}

/**
 * Compare two analyses for deterministic equality within eps.
 */
export function seriesEqualWithin(
  a: FrameSequenceAnalysis,
  b: FrameSequenceAnalysis,
  eps: number = DEFAULT_CONTINUITY_THRESHOLDS.seriesEqualityEps,
): SeriesEqualityResult {
  if (a.seed !== b.seed) {
    return { equal: false, maxAbsDiff: Infinity, firstMismatch: "seed" };
  }
  if (a.frameCount !== b.frameCount) {
    return { equal: false, maxAbsDiff: Infinity, firstMismatch: "frameCount" };
  }
  if (Math.abs(a.dt - b.dt) > eps) {
    return { equal: false, maxAbsDiff: Math.abs(a.dt - b.dt), firstMismatch: "dt" };
  }

  let maxAbsDiff = 0;
  const groups: Array<[string, Record<string, number[]>, Record<string, number[]>]> = [
    ["position", a.series.position, b.series.position],
    ["velocity", a.series.velocity, b.series.velocity],
    ["acceleration", a.series.acceleration, b.series.acceleration],
    ["jerk", a.series.jerk, b.series.jerk],
    ["eyes", a.series.eyes, b.series.eyes],
    ["mouth", a.series.mouth, b.series.mouth],
    ["contour", a.series.contour, b.series.contour],
  ];

  for (const [group, left, right] of groups) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const k of keys) {
      const ls = left[k] ?? [];
      const rs = right[k] ?? [];
      if (ls.length !== rs.length) {
        return {
          equal: false,
          maxAbsDiff: Infinity,
          firstMismatch: `${group}.${k}.length`,
        };
      }
      for (let i = 0; i < ls.length; i++) {
        const d = Math.abs(ls[i]! - rs[i]!);
        if (d > maxAbsDiff) maxAbsDiff = d;
        if (d > eps) {
          return {
            equal: false,
            maxAbsDiff: d,
            firstMismatch: `${group}.${k}[${i}]`,
          };
        }
      }
    }
  }

  // Topology integers must match exactly
  for (const key of ["contourSamples", "structuralNodes", "structuralTriangles"] as const) {
    const ls = a.series.topology[key];
    const rs = b.series.topology[key];
    for (let i = 0; i < ls.length; i++) {
      if (ls[i] !== rs[i]) {
        return {
          equal: false,
          maxAbsDiff: Math.abs(ls[i]! - rs[i]!),
          firstMismatch: `topology.${key}[${i}]`,
        };
      }
    }
  }

  return { equal: true, maxAbsDiff, firstMismatch: null };
}
