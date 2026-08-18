/**
 * GASPER-CRAFT-001 · C1 / WAVE 2 — the graph editor as code (pure module).
 *
 * Canon: `bezier-tangent-model` (research/canon/anim-physics). A channel is
 * keys (t, v) + independent in/out handles; evaluation is cubic Hermite
 *   p(s) = h00·p0 + h10·dt·m0 + h01·p1 + h11·dt·m1,  s = (t−t0)/dt
 * where the tangent slope IS velocity (spacing = derivative).
 *
 * Interp (segment leaving the key):
 *   hold       — holds the left key's value exactly until the next key
 *   linear     — constant slope; mechanical moves only
 *   auto       — cardinal + Fritsch–Carlson clamp (never overshoots monotone)
 *   bezier     — stored handles; m = dv / max(dt, ε). Broken (m_in ≠ m_out)
 *                is legal: value exact at the key, v̇ may jump
 *   overshoot  — unclamped auto-tangent × weight
 *
 * Old `{ t, v, out, weight }` still evaluates. Mapping:
 *   stepped      → hold
 *   linear       → linear
 *   spline-auto  → auto
 *   flat-clamped → auto with m = 0
 *   overshoot    → overshoot
 *
 * Pure + deterministic: evaluation is a function of (track, t) only. No
 * clock, DOM, timer, or random source. Named easing strings are compilers
 * (easingPresets.ts), not this runtime.
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

export type CurveInterp = "hold" | "linear" | "auto" | "bezier" | "overshoot";

export const CURVE_INTERP_SET: ReadonlySet<CurveInterp> = new Set([
  "hold",
  "linear",
  "auto",
  "bezier",
  "overshoot",
]);

/** Independent handle. Slope m = dv / max(dt, ε). */
export type CurveHandle = Readonly<{
  dt: number;
  dv: number;
}>;

export type CurveKey = Readonly<{
  /** Time, seconds (pack / take time base). */
  t: number;
  /** Value (authoring alias: `value`). */
  v: number;
  /**
   * Leaving handle, or the old tangent-type synonym.
   * Old keys keep `out: CurveTangentType` so `{ t, v, out, weight }` still
   * evaluates. New bezier keys store `{ dt, dv }` here.
   */
  out: CurveTangentType | CurveHandle;
  /** Character of the segment LEAVING this key. */
  interp?: CurveInterp;
  /** Arriving handle (ignored on the first key). Independent of `out`. */
  in?: CurveHandle;
  /**
   * Tangent weight: scales the auto tangent. 1 = canonical; >1 exaggerates
   * the overshoot on `overshoot` keys. Clamped to [0, 4].
   */
  weight: number;
}>;

export type CurveTrack = Readonly<{
  /** Sorted ascending by t; non-finite keys are rejected at normalization. */
  keys: readonly CurveKey[];
  /**
   * Unit-channel fail-closed: evaluation clamps to [0, 1]. Overshoot may
   * author past the fence; the sample never leaves it.
   */
  unit?: boolean;
}>;

export type ChannelSample = Readonly<{
  value: number;
  derivative: number;
}>;

const EPS = 1e-9;
const TANGENT_EPS = 1e-6;

const TANGENT_TO_INTERP: Readonly<Record<CurveTangentType, CurveInterp>> = {
  stepped: "hold",
  linear: "linear",
  "spline-auto": "auto",
  "flat-clamped": "auto",
  overshoot: "overshoot",
};

const INTERP_TO_TANGENT: Readonly<Record<CurveInterp, CurveTangentType>> = {
  hold: "stepped",
  linear: "linear",
  auto: "spline-auto",
  bezier: "spline-auto",
  overshoot: "overshoot",
};

export function isCurveHandle(value: unknown): value is CurveHandle {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return typeof r.dt === "number" && Number.isFinite(r.dt) && typeof r.dv === "number" && Number.isFinite(r.dv);
}

export function handleSlope(h: CurveHandle | undefined): number {
  if (!h) return 0;
  return h.dv / Math.max(h.dt, EPS);
}

export function validateTangentType(value: unknown): CurveTangentType {
  return typeof value === "string" && CURVE_TANGENT_SET.has(value as CurveTangentType)
    ? (value as CurveTangentType)
    : "spline-auto";
}

export function validateInterp(value: unknown): CurveInterp {
  return typeof value === "string" && CURVE_INTERP_SET.has(value as CurveInterp)
    ? (value as CurveInterp)
    : "auto";
}

/** Resolve the leaving interp of a key. Old string `out` wins (CraftPacks override). */
export function keyInterp(k: CurveKey): CurveInterp {
  if (typeof k.out === "string" && CURVE_TANGENT_SET.has(k.out)) {
    return TANGENT_TO_INTERP[k.out];
  }
  if (k.interp && CURVE_INTERP_SET.has(k.interp)) return k.interp;
  if (isCurveHandle(k.out)) return "bezier";
  return "auto";
}

function parseHandle(raw: unknown): CurveHandle | undefined {
  if (!isCurveHandle(raw)) return undefined;
  return Object.freeze({ dt: Math.max(0, raw.dt), dv: raw.dv });
}

/**
 * Normalize a raw key list into a track: drop non-finite entries, sort by t,
 * collapse duplicate times (last wins). Fail-closed: garbage becomes an
 * empty track, never a corrupt one.
 *
 * Accepts today's `{ t, v, out, weight }` and the Wave 2 shape
 * `{ t, value|v, in?, out?, interp?, weight }` plus `{ keys, unit }`.
 */
export function normalizeCurveTrack(raw: unknown, opts?: { unit?: boolean }): CurveTrack {
  let list: unknown[] = [];
  let unit = opts?.unit === true;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>;
    if (Array.isArray(rec.keys)) {
      list = rec.keys;
      if (rec.unit === true) unit = true;
    }
  }
  const keys: CurveKey[] = [];
  for (const k of list) {
    const r = (k && typeof k === "object" ? k : {}) as Record<string, unknown>;
    const t = typeof r.t === "number" && Number.isFinite(r.t) ? r.t : NaN;
    const vRaw =
      typeof r.v === "number" && Number.isFinite(r.v)
        ? r.v
        : typeof r.value === "number" && Number.isFinite(r.value)
          ? r.value
          : NaN;
    if (!Number.isFinite(t) || !Number.isFinite(vRaw)) continue;
    const weightRaw = typeof r.weight === "number" && Number.isFinite(r.weight) ? r.weight : 1;
    const inHandle = parseHandle(r.in);
    const outHandle = parseHandle(r.out);
    const outTangent =
      typeof r.out === "string" && CURVE_TANGENT_SET.has(r.out as CurveTangentType)
        ? (r.out as CurveTangentType)
        : undefined;
    const interpRaw =
      typeof r.interp === "string" && CURVE_INTERP_SET.has(r.interp as CurveInterp)
        ? (r.interp as CurveInterp)
        : undefined;
    let interp: CurveInterp;
    let out: CurveTangentType | CurveHandle;
    if (outTangent) {
      interp = interpRaw ?? TANGENT_TO_INTERP[outTangent];
      out = outTangent;
    } else if (outHandle) {
      interp = interpRaw ?? "bezier";
      out = outHandle;
    } else {
      interp = interpRaw ?? "auto";
      out = INTERP_TO_TANGENT[interp];
    }
    // flat-clamped → auto with m = 0: write a zero arriving handle so the
    // graph can show it; leaving m = 0 is forced by the stored synonym.
    const flatIn =
      outTangent === "flat-clamped" && !inHandle ? Object.freeze({ dt: 1 / 3, dv: 0 }) : inHandle;
    keys.push({
      t,
      v: vRaw,
      out,
      interp,
      ...(flatIn ? { in: flatIn } : {}),
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
  return Object.freeze({
    keys: Object.freeze(collapsed),
    ...(unit ? { unit: true } : {}),
  });
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
 * spline-auto / auto never overshoots monotone data (Fritsch–Carlson).
 */
export function curveAutoTangents(track: CurveTrack, clamped: boolean): number[] {
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
        ? (ks[1].v - ks[0].v) / Math.max(TANGENT_EPS, ks[1].t - ks[0].t)
        : k === n - 1
          ? (ks[n - 1].v - ks[n - 2].v) / Math.max(TANGENT_EPS, ks[n - 1].t - ks[n - 2].t)
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
  return dpds / Math.max(EPS, dt);
}

type SegmentEval = { value: number; derivative: number };

function leavingSlope(
  k: CurveKey,
  index: number,
  autoClamped: number[],
  autoUnclamped: number[],
): number {
  // flat-clamped → auto with m = 0
  if (k.out === "flat-clamped") return 0;
  if (isCurveHandle(k.out)) return handleSlope(k.out);
  const interp = keyInterp(k);
  if (interp === "overshoot") return autoUnclamped[index];
  return autoClamped[index];
}

function arrivingSlope(
  k: CurveKey,
  index: number,
  autoClamped: number[],
  autoUnclamped: number[],
  segmentInterp: CurveInterp,
): number {
  // Independent in-handle is the Wave 2 arriving tangent.
  if (k.in) return handleSlope(k.in);
  if (k.out === "flat-clamped") return 0;
  // Old keys: arriving uses k's own out character, except hold/linear
  // which borrow the leaving segment's table (today's evaluateSegment).
  const interp = keyInterp(k);
  if (interp === "hold" || interp === "linear") {
    return segmentInterp === "overshoot" ? autoUnclamped[index] : autoClamped[index];
  }
  if (isCurveHandle(k.out)) return handleSlope(k.out);
  if (interp === "overshoot") return autoUnclamped[index];
  return autoClamped[index];
}

function cubicBez(s: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - s;
  return u * u * u * p0 + 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s * p3;
}

function cubicBezDeriv(s: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - s;
  return 3 * u * u * (p1 - p0) + 6 * u * s * (p2 - p1) + 3 * s * s * (p3 - p2);
}

/**
 * 2D cubic through authored handles (AE / CSS graph). t is X, value is Y.
 * Newton-solves X(s)=t. Value exact at keys. v̇ = Y'(s)/X'(s) may jump.
 * Falls back to Hermite if time is non-monotone (crossed handles).
 */
function evaluateBezierSegment(k0: CurveKey, k1: CurveKey, t: number, m0: number, m1: number): SegmentEval {
  const span = k1.t - k0.t;
  const outH = isCurveHandle(k0.out) ? k0.out : { dt: span / 3, dv: m0 * (span / 3) };
  const inH = k1.in ?? (isCurveHandle(k1.out) ? k1.out : { dt: span / 3, dv: m1 * (span / 3) });
  const p0t = k0.t;
  const p0v = k0.v;
  const p3t = k1.t;
  const p3v = k1.v;
  const p1t = p0t + outH.dt;
  const p1v = p0v + outH.dv;
  const p2t = p3t - inH.dt;
  const p2v = p3v - inH.dv;
  // Time must be monotone enough to invert. Crossed handles → Hermite.
  if (p1t < p0t - 1e-9 || p2t > p3t + 1e-9 || p2t + 1e-9 < p1t) {
    const s = clamp((t - k0.t) / span, 0, 1);
    return {
      value: hermite(k0.v, k1.v, m0, m1, span, s),
      derivative: hermiteDerivative(k0.v, k1.v, m0, m1, span, s),
    };
  }
  let s = clamp((t - p0t) / Math.max(span, EPS), 0, 1);
  for (let i = 0; i < 14; i++) {
    const xt = cubicBez(s, p0t, p1t, p2t, p3t);
    const dxt = cubicBezDeriv(s, p0t, p1t, p2t, p3t);
    if (Math.abs(dxt) < EPS) break;
    const next = s - (xt - t) / dxt;
    s = next < 0 ? 0 : next > 1 ? 1 : next;
  }
  const value = cubicBez(s, p0v, p1v, p2v, p3v);
  const dxs = cubicBezDeriv(s, p0t, p1t, p2t, p3t);
  const dys = cubicBezDeriv(s, p0v, p1v, p2v, p3v);
  const derivative = Math.abs(dxs) < EPS ? 0 : dys / dxs;
  return { value, derivative };
}

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
  const interp = keyInterp(k0);
  if (interp === "hold") {
    return { value: k0.v, derivative: 0 };
  }
  if (interp === "linear") {
    return {
      value: k0.v + ((k1.v - k0.v) * (t - k0.t)) / dt,
      derivative: (k1.v - k0.v) / dt,
    };
  }
  const m0 = leavingSlope(k0, i, autoClamped, autoUnclamped);
  const m1 = arrivingSlope(k1, i + 1, autoClamped, autoUnclamped, interp);
  if (interp === "bezier") {
    return evaluateBezierSegment(k0, k1, t, m0, m1);
  }
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

function applyUnitFence(track: CurveTrack, sample: SegmentEval): ChannelSample {
  if (!track.unit) return sample;
  if (sample.value < 0) return { value: 0, derivative: 0 };
  if (sample.value > 1) return { value: 1, derivative: 0 };
  return sample;
}

/**
 * Deterministic channel sample: `{ value, derivative }` at pack/take time t.
 * The Wave 2 evaluator. `evaluateCurveTrack*` stay as scalar wrappers.
 */
export function evalChannel(track: CurveTrack, t: number): ChannelSample {
  if (!Number.isFinite(t)) {
    const value = track.keys.length ? track.keys[0].v : 0;
    return applyUnitFence(track, { value, derivative: 0 });
  }
  return applyUnitFence(track, evaluateCore(track, t));
}

/** Deterministic track evaluation: the channel value at pack time t. */
export function evaluateCurveTrack(track: CurveTrack, t: number): number {
  return evalChannel(track, t).value;
}

/** First derivative (spacing = velocity) at pack time t, units/second. */
export function evaluateCurveTrackDerivative(track: CurveTrack, t: number): number {
  return evalChannel(track, t).derivative;
}
