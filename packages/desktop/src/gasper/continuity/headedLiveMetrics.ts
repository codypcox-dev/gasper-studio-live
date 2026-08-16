/**
 * Headed multi-frame live-sample analysis.
 *
 * Quantifies eye, mouth, contour, topology, velocity, acceleration, jerk,
 * and ownership flicker from ordered live samples captured from GasperStudio
 * (CDP / attached runtime). Reuses shipped finite-difference + ownership
 * helpers — does not reimplement derivative math.
 *
 * Does not claim Cody visual acceptance. Does not drive MCP frames.
 */

import {
  CONTOUR_CHANNELS,
  CONTESTED_OWNERSHIP_CHANNELS,
  EYE_CHANNELS,
  MOUTH_CHANNELS,
  POSITION_CHANNELS,
} from "./channels";
import {
  finiteDifferences,
  maxAbs,
  maxDerivativeMagnitudes,
  quantize,
} from "./derivatives";
import {
  countOwnershipFlips,
  countOwnershipOscillations,
  ownershipAntiFlickerStable,
} from "./ownership";
import type { ContinuityOwner, ContinuityThresholds } from "./types";
import { DEFAULT_CONTINUITY_THRESHOLDS } from "./types";

/** Geometry proxy measured from live DOM (bbox / path). */
export type HeadedGeometrySample = {
  eyeL?: { x: number; y: number; w: number; h: number } | null;
  eyeR?: { x: number; y: number; w: number; h: number } | null;
  mouth?: { x: number; y: number; w: number; h: number } | null;
  body?: { x: number; y: number; w: number; h: number } | null;
  facePresent?: boolean;
};

/** Topology observables from FormMaster / topology lock. */
export type HeadedTopologySample = {
  contourSamples: number;
  structuralNodes: number;
  structuralTriangles: number;
  topologyStable: boolean;
};

/** One ordered live sample from headed GasperStudio. */
export type HeadedLiveSample = {
  /** Monotonic sample index (0-based). */
  index: number;
  /** Wall or synthetic time seconds. */
  t: number;
  /** Scenario / phase label at capture. */
  phase: string;
  /** Domain scalars from readLive / continuity channels. */
  channels: Record<string, number>;
  /** Per-channel ownership if reported by livingStatus. */
  ownership?: Record<string, ContinuityOwner | string>;
  /** Live SVG geometry proxies. */
  geometry?: HeadedGeometrySample;
  /** Topology snapshot. */
  topology?: HeadedTopologySample;
  /**
   * Provenance for topology: "form-master-snapshot" when measured from
   * SidekickFormMasterRig (in-app FormMaster API, not browser Sidekick),
   * or "fallback-constants" when inventing lock defaults.
   */
  topologySource?: "form-master-snapshot" | "fallback-constants" | string;
  /** True when sample is immediately after interrupt edge. */
  interruptEdge?: boolean;
};

export type HeadedChannelSeries = {
  position: number[];
  velocity: number[];
  acceleration: number[];
  jerk: number[];
  maxVelocity: number;
  maxAcceleration: number;
  maxJerk: number;
};

export type HeadedLiveAnalysis = {
  schema: "gasper.temporal.headed-live-analysis.v1";
  sampleCount: number;
  dt: number;
  phases: string[];
  /** Channel → derivative series. */
  series: Record<string, HeadedChannelSeries>;
  eyes: Record<string, HeadedChannelSeries>;
  mouth: Record<string, HeadedChannelSeries>;
  contour: Record<string, HeadedChannelSeries>;
  topology: {
    contourSamples: number[];
    structuralNodes: number[];
    structuralTriangles: number[];
    topologyStable: boolean[];
    rewriteDetected: boolean;
  };
  geometry: {
    eyeOpenProxy: number[];
    mouthOpenProxy: number[];
    eyeCentroidX: number[];
    mouthCentroidY: number[];
  };
  ownership: {
    series: Record<string, ContinuityOwner[]>;
    flips: Record<string, number>;
    oscillations: Record<string, number>;
    antiFlickerStable: boolean;
  };
  magnitudes: {
    maxVelocity: number;
    maxAcceleration: number;
    maxJerk: number;
  };
  boundedDerivatives: boolean;
  thresholds: ContinuityThresholds;
  notes: string[];
  mcpFrameDriving: false;
  codyVisualAcceptanceClaimed: false;
};

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asOwner(v: unknown): ContinuityOwner {
  const s = String(v ?? "none");
  const allowed: ContinuityOwner[] = [
    "base_form",
    "state_target",
    "blink",
    "saccade",
    "breath",
    "wobble",
    "interrupt_blend",
    "hold_last_good",
    "none",
  ];
  return (allowed.includes(s as ContinuityOwner) ? s : "none") as ContinuityOwner;
}

function seriesFor(
  positions: number[],
  dt: number,
): HeadedChannelSeries {
  const d = finiteDifferences(positions, dt);
  return {
    position: positions.map((p) => quantize(p)),
    velocity: d.velocity,
    acceleration: d.acceleration,
    jerk: d.jerk,
    maxVelocity: maxAbs(d.velocity),
    maxAcceleration: maxAbs(d.acceleration),
    maxJerk: maxAbs(d.jerk),
  };
}

function pickChannelKeys(samples: readonly HeadedLiveSample[]): string[] {
  const keys = new Set<string>();
  for (const k of [
    ...POSITION_CHANNELS,
    ...EYE_CHANNELS,
    ...MOUTH_CHANNELS,
    ...CONTOUR_CHANNELS,
  ]) {
    keys.add(k);
  }
  for (const s of samples) {
    for (const k of Object.keys(s.channels ?? {})) keys.add(k);
  }
  return [...keys];
}

/**
 * Infer fixed dt from sample times; falls back to 1/60 when irregular.
 */
export function inferSampleDt(samples: readonly HeadedLiveSample[]): number {
  if (samples.length < 2) return 1 / 60;
  const deltas: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i]!.t - samples[i - 1]!.t;
    if (d > 1e-6) deltas.push(d);
  }
  if (!deltas.length) return 1 / 60;
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  // Prefer fixed-dt analysis; if highly irregular, still use mean.
  return mean > 0 ? mean : 1 / 60;
}

/**
 * Analyze ordered headed live samples for eye/mouth/contour/topology
 * derivatives and ownership flicker.
 */
export function analyzeHeadedLiveSamples(
  samples: readonly HeadedLiveSample[],
  opts?: {
    dt?: number;
    thresholds?: ContinuityThresholds;
  },
): HeadedLiveAnalysis {
  const thresholds = opts?.thresholds ?? DEFAULT_CONTINUITY_THRESHOLDS;
  const dt = opts?.dt ?? inferSampleDt(samples);
  const notes: string[] = [];
  if (samples.length < 2) {
    notes.push("fewer than 2 samples — derivatives degenerate");
  }

  const keys = pickChannelKeys(samples);
  const series: Record<string, HeadedChannelSeries> = {};
  for (const k of keys) {
    const pos = samples.map((s) => num(s.channels?.[k], 0));
    series[k] = seriesFor(pos, dt);
  }

  const eyes: Record<string, HeadedChannelSeries> = {};
  for (const k of EYE_CHANNELS) {
    eyes[k] = series[k] ?? seriesFor(samples.map(() => 0), dt);
  }
  const mouth: Record<string, HeadedChannelSeries> = {};
  for (const k of MOUTH_CHANNELS) {
    mouth[k] = series[k] ?? seriesFor(samples.map(() => 0), dt);
  }
  const contour: Record<string, HeadedChannelSeries> = {};
  for (const k of CONTOUR_CHANNELS) {
    contour[k] = series[k] ?? seriesFor(samples.map(() => 0), dt);
  }

  const topologySeries = {
    contourSamples: samples.map((s) => num(s.topology?.contourSamples, 0)),
    structuralNodes: samples.map((s) => num(s.topology?.structuralNodes, 0)),
    structuralTriangles: samples.map((s) =>
      num(s.topology?.structuralTriangles, 0),
    ),
    topologyStable: samples.map((s) => s.topology?.topologyStable !== false),
  };
  let rewriteDetected = false;
  for (let i = 1; i < samples.length; i++) {
    if (
      topologySeries.contourSamples[i] !== topologySeries.contourSamples[0] ||
      topologySeries.structuralNodes[i] !== topologySeries.structuralNodes[0] ||
      topologySeries.structuralTriangles[i] !==
        topologySeries.structuralTriangles[0]
    ) {
      rewriteDetected = true;
      break;
    }
  }

  const eyeOpenProxy = samples.map((s) => {
    const g = s.geometry;
    if (g?.eyeL && g.eyeL.h > 0) return quantize(g.eyeL.h);
    return quantize(num(s.channels?.eye_openness, 0));
  });
  const mouthOpenProxy = samples.map((s) => {
    const g = s.geometry;
    if (g?.mouth && g.mouth.h > 0) return quantize(g.mouth.h);
    return quantize(num(s.channels?.mouth_openness, 0));
  });
  const eyeCentroidX = samples.map((s) => {
    const g = s.geometry?.eyeL;
    if (!g) return 0;
    return quantize(g.x + g.w / 2);
  });
  const mouthCentroidY = samples.map((s) => {
    const g = s.geometry?.mouth;
    if (!g) return 0;
    return quantize(g.y + g.h / 2);
  });

  const ownershipSeries: Record<string, ContinuityOwner[]> = {};
  for (const ch of CONTESTED_OWNERSHIP_CHANNELS) {
    ownershipSeries[ch] = samples.map((s) =>
      asOwner(s.ownership?.[ch] ?? "state_target"),
    );
  }
  const interruptEdges = samples.map((s) => s.interruptEdge === true);
  const flips: Record<string, number> = {};
  const oscillations: Record<string, number> = {};
  for (const [ch, own] of Object.entries(ownershipSeries)) {
    flips[ch] = countOwnershipFlips(own, interruptEdges);
    oscillations[ch] = countOwnershipOscillations(own);
  }
  const antiFlickerStable = ownershipAntiFlickerStable(
    ownershipSeries,
    interruptEdges,
    thresholds.maxOwnershipFlipsPerChannel,
  );

  const allPos: Record<string, number[]> = {};
  const allVel: Record<string, number[]> = {};
  const allAcc: Record<string, number[]> = {};
  const allJerk: Record<string, number[]> = {};
  for (const [k, s] of Object.entries(series)) {
    allPos[k] = s.position;
    allVel[k] = s.velocity;
    allAcc[k] = s.acceleration;
    allJerk[k] = s.jerk;
  }
  const magnitudes = maxDerivativeMagnitudes({
    velocity: allVel,
    acceleration: allAcc,
    jerk: allJerk,
  });
  // Headed live sampling is wall-clock and may exceed proof-mode boundStep clamps;
  // report honest magnitudes and a soft bound flag for instrumentation.
  const softMaxV = thresholds.maxVelocity * 4;
  const softMaxA = thresholds.maxAcceleration * 4;
  const softMaxJ = thresholds.maxJerk * 4;
  const boundedDerivatives =
    magnitudes.maxVelocity <= softMaxV &&
    magnitudes.maxAcceleration <= softMaxA &&
    magnitudes.maxJerk <= softMaxJ;

  const phases = [...new Set(samples.map((s) => s.phase))];

  return {
    schema: "gasper.temporal.headed-live-analysis.v1",
    sampleCount: samples.length,
    dt,
    phases,
    series,
    eyes,
    mouth,
    contour,
    topology: {
      ...topologySeries,
      rewriteDetected,
    },
    geometry: {
      eyeOpenProxy,
      mouthOpenProxy,
      eyeCentroidX,
      mouthCentroidY,
    },
    ownership: {
      series: ownershipSeries,
      flips,
      oscillations,
      antiFlickerStable,
    },
    magnitudes,
    boundedDerivatives,
    thresholds,
    notes,
    mcpFrameDriving: false,
    codyVisualAcceptanceClaimed: false,
  };
}

/**
 * Scenario phase ids the headed harness must exercise.
 * Canonical labels used by CAPTURE_MANIFEST / DONE.json.
 */
export const HEADED_EXERCISE_PHASES = [
  "neutral",
  "listening",
  "thinking",
  "comet",
  "dormant-orbit",
  "wake",
  "expression-anchors",
  "gain",
  "chirality",
  "interruption",
  "reset",
  "recovery",
] as const;

export type HeadedExercisePhase = (typeof HEADED_EXERCISE_PHASES)[number];

/**
 * Structural check: all required exercise phases appear in a phase list.
 */
export function missingExercisePhases(
  phases: readonly string[],
): HeadedExercisePhase[] {
  const set = new Set(phases);
  return HEADED_EXERCISE_PHASES.filter((p) => !set.has(p));
}
