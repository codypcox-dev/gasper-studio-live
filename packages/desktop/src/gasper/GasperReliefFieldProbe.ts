/**
 * Spatial relief-field probe for honest 25×40 motion proof.
 * Does not pass on relief_amplitude alone — samples field coordinates over time.
 */

import type { GasperMultiDomainState } from "./GasperDomainState";

export type ReliefSamplePoint = { x: number; y: number; index: number };

/** ≥12 spatially separated sample coordinates on the 25×40 grid. */
export function defaultReliefProbePoints(
  width = 25,
  height = 40,
): ReliefSamplePoint[] {
  const coords: Array<[number, number]> = [
    [2, 2],
    [12, 2],
    [22, 2],
    [2, 12],
    [12, 12],
    [22, 12],
    [2, 20],
    [12, 20],
    [22, 20],
    [2, 32],
    [12, 32],
    [22, 32],
    [6, 8],
    [18, 28],
  ];
  return coords.map(([x, y]) => ({
    x,
    y,
    index: Math.min(width * height - 1, y * width + x),
  }));
}

export type ReliefFieldSnapshot = {
  tMs: number;
  rms: number;
  samples: Array<{ x: number; y: number; value: number }>;
  energyLevel: number;
  motionCoupling: number;
  residual: number;
};

export function snapshotReliefField(
  state: GasperMultiDomainState,
  points: ReliefSamplePoint[],
  tMs: number,
): ReliefFieldSnapshot {
  const { samples, width, height } = state.relief;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return {
    tMs,
    rms,
    samples: points.map((p) => {
      const i =
        p.index >= 0 && p.index < samples.length
          ? p.index
          : Math.min(samples.length - 1, p.y * width + p.x);
      return { x: p.x, y: p.y, value: samples[i] ?? 0 };
    }),
    energyLevel: state.energy.level,
    motionCoupling: state.relief.motionCoupling,
    residual: state.dynamics.residual,
  };
}

/** True if at least one probe point changes and RMS is not constant. */
export function reliefFieldActuallyMoved(
  series: ReliefFieldSnapshot[],
  eps = 1e-5,
): {
  moved: boolean;
  rmsRange: number;
  pointsWithIndependentChange: number;
} {
  if (series.length < 2) {
    return { moved: false, rmsRange: 0, pointsWithIndependentChange: 0 };
  }
  const rmsVals = series.map((s) => s.rms);
  const rmsRange = Math.max(...rmsVals) - Math.min(...rmsVals);
  const nPoints = series[0]!.samples.length;
  let pointsWithIndependentChange = 0;
  for (let pi = 0; pi < nPoints; pi++) {
    const vals = series.map((s) => s.samples[pi]?.value ?? 0);
    const span = Math.max(...vals) - Math.min(...vals);
    if (span > eps) pointsWithIndependentChange += 1;
  }
  return {
    moved: rmsRange > eps && pointsWithIndependentChange >= 3,
    rmsRange,
    pointsWithIndependentChange,
  };
}
