/**
 * GASPER-CRAFT-001 · C1 — the graph editor as code (pure module).
 *
 * Canon: `bezier-tangent-model` (research/canon/anim-physics). A channel is
 * keys (t, v) + per-key tangent type; evaluation is cubic Hermite
 *   p(s) = h00·p0 + h10·dt·m0 + h01·p1 + h11·dt·m1,  s = (t−t0)/dt
 * where the tangent slope IS velocity (spacing = derivative). Tangent types
 * are the owner's graph-editor vocabulary, closed enum:
 *   stepped      — holds the left key's value exactly until the next key
 *                  (blocking; phi/beta doctrine: actions read from keys alone)
 *   linear       — constant slope; mechanical moves only
 *   spline-auto  — cardinal auto-tangent m_k = (v_{k+1}−v_{k−1})/(t_{k+1}−t_{k−1})
 *                  with the clamped-auto monotonicity limiter: auto tangents
 *                  must NOT overshoot the target value (Fritsch–Carlson)
 *   flat-clamped — zero slope at the key (eases land on extremes)
 *   overshoot    — unclamped auto-tangent × weight; y beyond the target is
 *                  how graphs encode authored overshoot (W3C cubic-bezier law)
 *
 * Pure + deterministic: evaluation is a function of (track, t) only. No
 * clock, DOM, timer, or random source.
 */

export type CurveTangentType =
  | "stepped"
  | "linear"
  | "spline-auto"
  | "flat-clamped"
  | "overshoot";

export const CURVE_TANGENT_SET: ReadonlySet<CurveTangentType> = new Set([
  "stepped",
  "linear",
  "spline-auto",
  "flat-clamped",
  "overshoot",
]);

export type CurveKey = Readonly<{
  /** Time, seconds (pack time base). */
  t: number;
  /** Value. */
  v: number;
  /** Tangent type of the segment LEAVING this key (default spline-auto). */
  out: CurveTangentType;
  /**
   * Tangent weight: scales the auto tangent. 1 = canonical; >1 exaggerates
   * the overshoot on `overshoot` keys. Clamped to [0, 4].
   */
  weight: number;
}>;

export type CurveTrack = Readonly<{
  /** Sorted ascending by t; non-finite keys are rejected at normalization. */
  keys: readonly CurveKey[];
}>;

export function validateTangentType(value: unknown): CurveTangentType {
  return typeof value === "string" &&
    CURVE_TANGENT_SET.has(value as CurveTangentType)
    ? (value as CurveTangentType)
    : "spline-auto";
}

/**
 * Normalize a raw key list into a track: drop non-finite entries, sort by t,
 * collapse duplicate times (last wins). Fail-closed: garbage becomes an
 * empty track, never a corrupt one.
 */
export function normalizeCurveTrack(raw: unknown): CurveTrack {
  const list = Array.isArray(raw) ? raw : [];
  const keys: CurveKey[] = [];
  for (const k of list) {
    const r = (k && typeof k === "object" ? k : {}) as Record<string, unknown>;
    const t = typeof r.t === "number" && Number.isFinite(r.t) ? r.t : NaN;
    const v = typeof r.v === "number" && Number.isFinite(r.v) ? r.v : NaN;
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
    const weightRaw =
      typeof r.weight === "number" && Number.isFinite(r.weight)
        ? r.weight
        : 1;
    keys.push({
      t,
      v,
      out: validateTangentType(r.out),
      weight: Math.max(0, Math.min(4, weightRaw)),
    });
  }
  keys.sort((a, b) => a.t - b.t);
  const collapsed: CurveKey[] = [];
  for (const k of keys) {
    if (collapsed.length && collapsed[collapsed.length - 1].t === k.t) {
      collapsed[collapsed.length - 1] = k; // last wins on duplicate time
    } else {
      collapsed.push(k);
    }
  }
  return Object.freeze({ keys: Object.freeze(collapsed) });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Track duration (last key time − first key time; 0 for < 2 keys). */
export function curveTrackDuration(track: CurveTrack): number {
  const n = track.keys.length;
  return n >= 2 ? track.keys[n - 1].t - track.keys[0].t : 0;
}

/**
 * Auto tangents at every key (cardinal, time-normalized, c = 0) scaled by
 * each key's weight. `clamped` applies the monotonicity limiter so
 * spline-auto never overshoots monotone data (Fritsch–Carlson).
 */
export function curveAutoTangents(
  track: CurveTrack,
  clamped: boolean,
): number[] {
  const ks = track.keys;
  const n = ks.length;
  const m: number[] = new Array(n).fill(0);
  if (n < 2) return m;
  for (let k = 0; k < n; k++) {
    const prev = ks[Math.max(0, k - 1)];
    const next = ks[Math.min(n - 1, k + 1)];
    const dt = next.t - prev.t;
    const slope =
      k === 0
        ? (ks[1].v - ks[0].v) / Math.max(1e-6, ks[1].t - ks[0].t)
        : k === n - 1
          ? (ks[n - 1].v - ks[n - 2].v) /
            Math.max(1e-6, ks[n - 1].t - ks[n - 2].t)
          : dt > 1e-9
            ? (next.v - prev.v) / dt
            : 0;
    m[k] = slope * ks[k].weight;
  }
  if (!clamped) return m;
  // Clamped-auto: zero tangents at local extrema; bound the rest so no
  // segment overshoots its endpoint values (Fritsch–Carlson).
  for (let k = 0; k < n; k++) {
    if (k > 0 && k < n - 1) {
      const dLeft = ks[k].v - ks[k - 1].v;
      const dRight = ks[k + 1].v - ks[k].v;
      if (dLeft * dRight <= 0) m[k] = 0; // extremum or flat shoulder
    }
  }
  for (let k = 0; k < n - 1; k++) {
    const dt = ks[k + 1].t - ks[k].t;
    if (dt <= 1e-9) continue;
    const d = (ks[k + 1].v - ks[k].v) / dt;
    if (Math.abs(d) < 1e-9) {
      m[k] = 0;
      m[k + 1] = 0;
      continue;
    }
    for (const i of [k, k + 1]) {
      if (m[i] * d < 0) m[i] = 0; // wrong-way tangent → overshoot; kill it
      else if (m[i] / d > 3) m[i] = 3 * d;
    }
  }
  return m;
}

/** Hermite basis evaluation on one segment (s ∈ [0,1]). */
function hermite(p0: number, p1: number, m0: number, m1: number, dt: number, s: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  return h00 * p0 + h10 * dt * m0 + h01 * p1 + h11 * dt * m1;
}

/** Hermite derivative (dp/dt) on one segment. */
function hermiteDerivative(p0: number, p1: number, m0: number, m1: number, dt: number, s: number): number {
  const s2 = s * s;
  const dpds =
    (6 * s2 - 6 * s) * p0 +
    (3 * s2 - 4 * s + 1) * dt * m0 +
    (-6 * s2 + 6 * s) * p1 +
    (3 * s2 - 2 * s) * dt * m1;
  return dpds / Math.max(1e-9, dt);
}

type SegmentEval = { value: number; derivative: number };

function evaluateSegment(
  track: CurveTrack,
  autoClamped: number[],
  autoUnclamped: number[],
  i: number,
  t: number,
): SegmentEval {
  const ks = track.keys;
  const k0 = ks[i];
  const k1 = ks[i + 1];
  const dt = k1.t - k0.t;
  if (dt <= 1e-9) return { value: k1.v, derivative: 0 };
  if (k0.out === "stepped") {
    return { value: k0.v, derivative: 0 };
  }
  if (k0.out === "linear") {
    return { value: k0.v + ((k1.v - k0.v) * (t - k0.t)) / dt, derivative: (k1.v - k0.v) / dt };
  }
  const table = (type: CurveTangentType, clamped: number[], unclamped: number[]) =>
    type === "overshoot" ? unclamped : clamped;
  const m0 =
    k0.out === "flat-clamped" ? 0 : table(k0.out, autoClamped, autoUnclamped)[i];
  // In-tangent at k1: the arriving segment uses k1's own tangent character.
  const m1 =
    k1.out === "flat-clamped"
      ? 0
      : k1.out === "stepped" || k1.out === "linear"
        ? table(k0.out, autoClamped, autoUnclamped)[i + 1]
        : table(k1.out, autoClamped, autoUnclamped)[i + 1];
  const s = clamp((t - k0.t) / dt, 0, 1);
  return {
    value: hermite(k0.v, k1.v, m0, m1, dt, s),
    derivative: hermiteDerivative(k0.v, k1.v, m0, m1, dt, s),
  };
}

function evaluateCore(track: CurveTrack, t: number): SegmentEval {
  const ks = track.keys;
  const n = ks.length;
  if (n === 0) return { value: 0, derivative: 0 };
  if (n === 1 || t <= ks[0].t) return { value: ks[0].v, derivative: 0 };
  if (t >= ks[n - 1].t) return { value: ks[n - 1].v, derivative: 0 };
  const autoClamped = curveAutoTangents(track, true);
  const autoUnclamped = curveAutoTangents(track, false);
  // Tracks are short (authored keys); linear scan keeps the code honest.
  let i = 0;
  while (i < n - 2 && t >= ks[i + 1].t) i++;
  return evaluateSegment(track, autoClamped, autoUnclamped, i, t);
}

/** Deterministic track evaluation: the channel value at pack time t. */
export function evaluateCurveTrack(track: CurveTrack, t: number): number {
  if (!Number.isFinite(t)) return track.keys.length ? track.keys[0].v : 0;
  return evaluateCore(track, t).value;
}

/** First derivative (spacing = velocity) at pack time t, units/second. */
export function evaluateCurveTrackDerivative(track: CurveTrack, t: number): number {
  if (!Number.isFinite(t)) return 0;
  return evaluateCore(track, t).derivative;
}
