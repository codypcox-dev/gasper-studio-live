/**
 * GASPER-CRAFT-002 · S3 (D-0099 Doctrine 1) — ShotDirector: the camera law,
 * compile-time.
 *
 * Canon: `staging`, `shot-scales`, `layout-first-composition`,
 * `virtual-production-led-volume-2019`, `multiplane-parallax-camera`
 * (research/canon/anim-physics; enum taxonomy/enums/shot-scales.json).
 *
 * THE CAMERA IS THE MONITOR. The viewport never moves during a performance
 * (GASPER-CRAFT-001 C2's live zoom framing and the Phase A world-follow are
 * retired). Every shot scale is now authored as Gasper's DEPTH — the S2
 * projection law `scale(z) = D0/(D0+z)` IS the new shot scale (D-0100).
 * What remains of the ShotDirector is the staging grammar as compile-time
 * gates:
 *
 *  1. The legibility bands — each shot scale names a band of on-screen size
 *     (the depth scale relative to home). Every beat's authored depth must
 *     land the body inside the beat's band (`validateDepthLegibility`,
 *     fail-closed). Successor of the retired C4 amplitude floors: they
 *     measured frame fractions at a live framing zoom; the camera is fixed,
 *     so legibility is a property of authored depth.
 *  2. The performance-scale law — `extreme-wide` is the scale of
 *     environment/isolation, never of a performance beat (canon taxonomy).
 *  3. The camera-fixity gate — the capture-side observable: zoom delta ≡ 0
 *     across any performance (`validateCameraFixity`).
 */
import { depthScaleAt } from "../space/WorldSpace";
import { evaluateCurveTrack } from "./CurveTrack";
import {
  type PackBeat,
  type PackShotScale,
  type PerformancePack,
} from "./PerformancePack";

export type ShotScaleDepthBand = Readonly<{
  /** Depth scale (projection scale relative to home): [lo, hi]. */
  scale: readonly [number, number];
  /** False for scales forbidden during performance beats. */
  performance: boolean;
}>;

const band = (
  scale: readonly [number, number],
  performance: boolean,
): ShotScaleDepthBand => Object.freeze({ scale, performance });

/**
 * Closed legibility table — the canon shot-scales taxonomy expressed in the
 * S2 depth law. Anchors: 1.2 = depthScaleAt(zNear) EXACTLY (the monitor
 * glass — N35 owner cap: he may approach only until +20% size), 1 = home,
 * ≈0.35 = depthScaleAt(zFar) (the far fade — smallest legible Gasper).
 * Bands are contiguous; a boundary scale reads truthfully under either
 * neighboring label.
 */
export const SHOT_SCALE_DEPTH_BANDS: Readonly<
  Record<PackShotScale, ShotScaleDepthBand>
> = Object.freeze({
  "extreme-close": band([1.12, 1.2], true),
  close: band([1.06, 1.12], true),
  medium: band([0.8, 1.06], true),
  wide: band([0.5, 0.8], true),
  "extreme-wide": band([0.35, 0.5], false),
});

/** The default performance scales (craft doctrine: act at medium/wide). */
export const DEFAULT_PERFORMANCE_SCALES: readonly PackShotScale[] = Object.freeze([
  "medium",
  "wide",
]);

export function shotScaleDepthBand(
  scale: PackShotScale,
): ShotScaleDepthBand | null {
  return SHOT_SCALE_DEPTH_BANDS[scale] ?? null;
}

/**
 * A beat's authored depth: the world_z channel sampled at the beat midpoint
 * (home depth when the pack authors no world_z). Transit inside a beat is
 * authorial freedom; the midpoint is the beat's representative depth.
 */
export function beatAuthoredDepth(pack: PerformancePack, beat: PackBeat): number {
  const track = pack.channels.world_z;
  if (!track) return 0;
  const mid = (beat.t0 + beat.t1) / 2;
  return Number.isFinite(mid) ? evaluateCurveTrack(track, mid) : 0;
}

export type DepthLegibilityReport = Readonly<{
  ok: boolean;
  violations: readonly string[];
}>;

/**
 * Doctrine 1 legibility gate (fail-closed): every beat's authored depth
 * lands the body inside the beat's shot-scale band. The camera never moves —
 * a "close" beat means Gasper AUTHORS coming closer (D-0099: shot scale =
 * Gasper moving through depth, not a lens move).
 */
export function validateDepthLegibility(
  pack: PerformancePack,
): DepthLegibilityReport {
  const violations: string[] = [];
  for (const beat of pack.beats) {
    const b = shotScaleDepthBand(beat.shotScale);
    if (!b) {
      violations.push(`beat ${beat.id}: unknown shotScale ${beat.shotScale}`);
      continue;
    }
    const z = beatAuthoredDepth(pack, beat);
    const s = depthScaleAt(z);
    if (s < b.scale[0] || s > b.scale[1]) {
      violations.push(
        `beat ${beat.id}: authored depth z=${z.toFixed(1)} reads scale ${s.toFixed(3)} — outside the ${beat.shotScale} band [${b.scale[0]}, ${b.scale[1]}]`,
      );
    }
  }
  return Object.freeze({ ok: violations.length === 0, violations });
}

export type ShotScaleReport = Readonly<{
  ok: boolean;
  violations: readonly string[];
}>;

/**
 * `shot-scales` staging validator: performance beats must use performance
 * scales. `extreme-wide` belongs to environment/isolation reads — never a
 * performance scale (canon). The fail-closed compiler enforces the same law;
 * this report serves review gates + authoring feedback.
 */
export function validatePerformanceShotScales(pack: PerformancePack): ShotScaleReport {
  const violations: string[] = [];
  for (const beat of pack.beats) {
    const b = shotScaleDepthBand(beat.shotScale);
    if (!b) {
      violations.push(`beat ${beat.id}: unknown shotScale ${beat.shotScale}`);
      continue;
    }
    if (!b.performance) {
      violations.push(
        `beat ${beat.id}: ${beat.shotScale} is forbidden during performance beats (environment scale)`,
      );
    }
  }
  return Object.freeze({ ok: violations.length === 0, violations });
}

// ---------------------------------------------------------------------------
// The camera-fixity gate (the capture-side observable)
// ---------------------------------------------------------------------------

export type CameraFixitySample = Readonly<{
  zoom: number;
  panX: number;
  panY: number;
}>;

export type CameraFixityReport = Readonly<{
  ok: boolean;
  samples: number;
  maxZoomDelta: number;
  maxPanDeltaPx: number;
  violations: readonly string[];
}>;

/**
 * Doctrine 1 capture gate: zoom delta ≡ 0 across any performance. The
 * capture drive samples the viewport camera every tick while a pack performs
 * and runs this gate on the series — any machine-driven motion of the
 * monitor fails the capture. Fail-closed: fewer than two samples prove
 * nothing; corrupt samples are violations.
 */
export function validateCameraFixity(
  samples: readonly CameraFixitySample[],
): CameraFixityReport {
  const violations: string[] = [];
  let maxZoomDelta = 0;
  let maxPanDeltaPx = 0;
  const n = Array.isArray(samples) ? samples.length : 0;
  if (n < 2) {
    return Object.freeze({
      ok: false,
      samples: n,
      maxZoomDelta: 0,
      maxPanDeltaPx: 0,
      violations: Object.freeze([
        "camera fixity needs at least 2 samples across the performance",
      ]),
    });
  }
  let prev: CameraFixitySample | null = null;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const clean =
      s &&
      Number.isFinite(s.zoom) &&
      Number.isFinite(s.panX) &&
      Number.isFinite(s.panY);
    if (!clean) {
      violations.push(`sample ${i}: corrupt camera read`);
      prev = null;
      continue;
    }
    if (prev) {
      maxZoomDelta = Math.max(maxZoomDelta, Math.abs(s.zoom - prev.zoom));
      maxPanDeltaPx = Math.max(
        maxPanDeltaPx,
        Math.abs(s.panX - prev.panX),
        Math.abs(s.panY - prev.panY),
      );
    }
    prev = s;
  }
  if (maxZoomDelta > 1e-9) {
    violations.push(
      `zoom moved ${maxZoomDelta} during the performance — the camera is the monitor (delta must be ≡ 0)`,
    );
  }
  if (maxPanDeltaPx > 1e-6) {
    violations.push(
      `pan moved ${maxPanDeltaPx.toFixed(6)}px during the performance — the camera is the monitor (delta must be ≡ 0)`,
    );
  }
  return Object.freeze({
    ok: violations.length === 0,
    samples: n,
    maxZoomDelta,
    maxPanDeltaPx,
    violations: Object.freeze(violations),
  });
}
