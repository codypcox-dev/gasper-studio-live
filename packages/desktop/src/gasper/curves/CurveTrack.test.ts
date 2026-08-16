/**
 * GASPER-CRAFT-001 · C1 — CurveTrack tests.
 *
 * The graph editor as code: tangent-type semantics (stepped / linear /
 * spline-auto / flat-clamped / overshoot), the clamped-auto monotonicity
 * limiter, Hermite endpoint exactness, C1 continuity, determinism, and
 * derivative = velocity (spacing).
 */
import { describe, expect, it } from "vitest";
import {
  CURVE_TANGENT_SET,
  curveAutoTangents,
  curveTrackDuration,
  evaluateCurveTrack,
  evaluateCurveTrackDerivative,
  normalizeCurveTrack,
  validateTangentType,
  type CurveTrack,
} from "./CurveTrack";

const key = (t: number, v: number, out?: unknown, weight?: number) => ({
  t,
  v,
  ...(out !== undefined ? { out } : {}),
  ...(weight !== undefined ? { weight } : {}),
});

const track = (...keys: unknown[]): CurveTrack => normalizeCurveTrack(keys);

const sample = (
  tr: CurveTrack,
  t0: number,
  t1: number,
  n = 48,
): number[] => {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(evaluateCurveTrack(tr, t0 + ((t1 - t0) * i) / n));
  return out;
};

describe("normalizeCurveTrack", () => {
  it("drops non-finite entries and sorts by time", () => {
    const tr = track(key(1, 10), key(0, 0), key(Number.NaN, 5), key(0.5, Number.POSITIVE_INFINITY), key(0.5, 5));
    expect(tr.keys.map((k) => k.t)).toEqual([0, 0.5, 1]);
    expect(tr.keys.map((k) => k.v)).toEqual([0, 5, 10]);
  });

  it("collapses duplicate times — last wins", () => {
    const tr = track(key(0, 1), key(0, 2), key(0, 3));
    expect(tr.keys).toHaveLength(1);
    expect(tr.keys[0].v).toBe(3);
  });

  it("defaults tangent to spline-auto and clamps weight to [0, 4]", () => {
    const tr = track({ t: 0, v: 0, out: "bogus", weight: 99 }, { t: 1, v: 1, weight: -7 });
    expect(tr.keys[0].out).toBe("spline-auto");
    expect(tr.keys[0].weight).toBe(4);
    expect(tr.keys[1].weight).toBe(0);
  });

  it("is fail-closed: garbage becomes an empty frozen track", () => {
    expect(normalizeCurveTrack("nope").keys).toHaveLength(0);
    expect(normalizeCurveTrack(null).keys).toHaveLength(0);
    expect(normalizeCurveTrack([42, "x", {}]).keys).toHaveLength(0);
    expect(Object.isFrozen(normalizeCurveTrack([]))).toBe(true);
  });

  it("accepts the full closed tangent vocabulary", () => {
    expect(CURVE_TANGENT_SET.size).toBe(5);
    for (const t of CURVE_TANGENT_SET) expect(validateTangentType(t)).toBe(t);
    expect(validateTangentType(undefined)).toBe("spline-auto");
  });
});

describe("tangent semantics", () => {
  it("stepped holds the left key's value exactly, zero derivative", () => {
    const tr = track(key(0, 5, "stepped"), key(1, 9));
    expect(evaluateCurveTrack(tr, 0.25)).toBe(5);
    expect(evaluateCurveTrack(tr, 0.999)).toBe(5);
    expect(evaluateCurveTrackDerivative(tr, 0.5)).toBe(0);
    expect(evaluateCurveTrack(tr, 1)).toBe(9); // lands exactly at the next key
  });

  it("linear moves at constant slope (mechanical)", () => {
    const tr = track(key(0, 0, "linear"), key(2, 4));
    expect(evaluateCurveTrack(tr, 1)).toBeCloseTo(2);
    for (const t of [0.1, 0.7, 1.3, 1.9]) {
      expect(evaluateCurveTrackDerivative(tr, t)).toBeCloseTo(2);
    }
  });

  it("flat-clamped lands with zero slope at the key", () => {
    const tr = track(key(0, 0), key(1, 1, "flat-clamped"), key(2, 0));
    expect(evaluateCurveTrack(tr, 1)).toBeCloseTo(1);
    expect(evaluateCurveTrackDerivative(tr, 1)).toBeCloseTo(0, 6);
    expect(evaluateCurveTrackDerivative(tr, 1 - 1e-4)).toBeCloseTo(0, 2);
  });

  it("spline-auto is C1 continuous across interior keys", () => {
    const tr = track(key(0, 0), key(1, 1), key(2, 0.5), key(3, 1.5));
    const eps = 1e-6;
    for (const tk of [1, 2]) {
      expect(evaluateCurveTrack(tr, tk - eps)).toBeCloseTo(evaluateCurveTrack(tr, tk + eps), 4);
      expect(evaluateCurveTrackDerivative(tr, tk - eps)).toBeCloseTo(
        evaluateCurveTrackDerivative(tr, tk + eps),
        3,
      );
    }
  });

  it("interpolates key values exactly (endpoints of every segment)", () => {
    const tr = track(key(0, 0), key(0.7, 1.2), key(1.9, -0.4));
    expect(evaluateCurveTrack(tr, 0)).toBe(0);
    expect(evaluateCurveTrack(tr, 0.7)).toBeCloseTo(1.2);
    expect(evaluateCurveTrack(tr, 1.9)).toBeCloseTo(-0.4);
  });

  it("overshoot keys push past the target value (W3C cubic-bezier law)", () => {
    const clamped = track(key(0, 0), key(1, 1, "spline-auto"), key(2, 0.5));
    const overshooting = track(key(0, 0), key(1, 1, "overshoot", 2), key(2, 0.5));
    const maxClamped = Math.max(...sample(clamped, 1, 2));
    const maxOvershoot = Math.max(...sample(overshooting, 1, 2));
    expect(maxClamped).toBeLessThanOrEqual(1 + 1e-9);
    expect(maxOvershoot).toBeGreaterThan(1.01);
  });
});

describe("clamped-auto monotonicity limiter (Fritsch–Carlson)", () => {
  it("spline-auto never overshoots monotone data", () => {
    const tr = track(key(0, 0), key(1, 1), key(2, 3), key(3, 3.5));
    const values = sample(tr, 0, 3, 96);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(-1e-9);
      expect(v).toBeLessThanOrEqual(3.5 + 1e-9);
    }
    // No local overshoot between consecutive keys either.
    let prev = -Infinity;
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it("zeroes auto tangents at local extrema (no shoulder wiggle)", () => {
    const tr = track(key(0, 0), key(1, 1), key(2, 0));
    const m = curveAutoTangents(tr, true);
    expect(m[1]).toBe(0);
    // The apex reads as a held extreme, not a fly-through.
    const apex = sample(tr, 0.9, 1.1, 16);
    for (const v of apex) expect(v).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("unclamped tangents keep the raw cardinal slope (weight scales)", () => {
    const tr = track(key(0, 0), key(1, 1, "overshoot", 2), key(2, 0.5));
    const m = curveAutoTangents(tr, false);
    expect(m[1]).toBeCloseTo(((0.5 - 0) / 2) * 2); // one-sided-free, weight 2
  });
});

describe("evaluation edges", () => {
  const tr = track(key(1, 4), key(2, 8));

  it("holds the first/last value outside the key range, zero derivative", () => {
    expect(evaluateCurveTrack(tr, -5)).toBe(4);
    expect(evaluateCurveTrack(tr, 99)).toBe(8);
    expect(evaluateCurveTrackDerivative(tr, -5)).toBe(0);
    expect(evaluateCurveTrackDerivative(tr, 99)).toBe(0);
  });

  it("empty track evaluates 0; single key holds its value", () => {
    const empty = normalizeCurveTrack([]);
    expect(evaluateCurveTrack(empty, 3)).toBe(0);
    expect(evaluateCurveTrackDerivative(empty, 3)).toBe(0);
    const one = track(key(2, 7));
    expect(evaluateCurveTrack(one, 0)).toBe(7);
    expect(evaluateCurveTrack(one, 5)).toBe(7);
  });

  it("guards non-finite time", () => {
    expect(evaluateCurveTrack(tr, Number.NaN)).toBe(4); // first key, fail-safe
    expect(evaluateCurveTrackDerivative(tr, Number.NaN)).toBe(0);
    expect(Number.isFinite(evaluateCurveTrack(tr, Number.POSITIVE_INFINITY))).toBe(true);
  });

  it("curveTrackDuration measures first→last key", () => {
    expect(curveTrackDuration(tr)).toBe(1);
    expect(curveTrackDuration(track(key(0, 0)))).toBe(0);
    expect(curveTrackDuration(normalizeCurveTrack([]))).toBe(0);
  });
});

describe("determinism + derivative semantics", () => {
  it("is a pure function of (track, t) — identical across runs", () => {
    const build = () => track(key(0, 0), key(0.4, 1), key(1.1, -0.5), key(2, 0.2));
    const run = (tr: CurveTrack) => {
      const out: string[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = -0.5 + (3 * i) / 60;
        out.push(
          `${evaluateCurveTrack(tr, t).toFixed(6)}|${evaluateCurveTrackDerivative(tr, t).toFixed(6)}`,
        );
      }
      return out;
    };
    expect(run(build())).toEqual(run(build()));
  });

  it("derivative matches finite differences in the interior", () => {
    const tr = track(key(0, 0), key(1, 1), key(2, 0.3));
    for (const t of [0.35, 0.9, 1.6]) {
      const h = 1e-5;
      const fd = (evaluateCurveTrack(tr, t + h) - evaluateCurveTrack(tr, t - h)) / (2 * h);
      expect(evaluateCurveTrackDerivative(tr, t)).toBeCloseTo(fd, 3);
    }
  });
});
