/**
 * GASPER-CRAFT-001 · C4 — Craft rail: the operator's craft dials (pure module).
 *
 * Canon: `twelve-principles-1981` (exaggeration, timing, secondary action),
 * `squash-stretch-volume-guard` (the exaggeration factor multiplies both axes
 * reciprocally — exaggeration preserves the volume law), `shot-scales`.
 *
 * The Craft rail is the studio slider group that tunes a live pack
 * performance without re-authoring it:
 *
 *   exaggeration — 0.5..2, default 1.25. Multiplies the authored amplitudes
 *                  (world travel, squash/stretch, wake, tilt). The driver
 *                  derives width from the volume law AFTER scaling, so
 *                  Sx·Sy = 1 holds at every rail value.
 *   shotBias     — RETIRED as a live dial (D-0107): its actuator was the
 *                  moving camera, and Doctrine 1 (D-0099) retired the camera
 *                  — a dial with no actuator is a silent lie. The bias LAW
 *                  survives here as authoring-time staging grammar: shot
 *                  scale is now Gasper's authored depth, and `applyShotBias`
 *                  walks the scale axis one step toward a bias without
 *                  crossing it. Should a live framing dial ever return, its
 *                  Doctrine-1 actuator is a DEPTH offset (Gasper moves, the
 *                  monitor never does).
 *   tempo        — 0.75..1.25. Pack time scale.
 *
 * The rail itself is thin studio wiring (DaisControlRail → daisFirstControls
 * → GasperRigController); THIS module owns the bounds + the bias law so the
 * fence is machine-checkable. Exaggeration/tempo clamp on top of the driver's
 * PERFORMANCE_PACK_PARAM_BOUNDS (identical fences — one source of truth).
 */
import type { PackShotScale } from "./PerformancePack";

export type CraftShotBias = "medium" | "wide";

/** The walk-target biases (the scales a beat can be pulled toward). */
export const CRAFT_SHOT_BIAS_SET: ReadonlySet<CraftShotBias> = new Set([
  "medium",
  "wide",
]);

/**
 * The shot-dial positions: "authored" (no walk — perform the pack at its
 * authored scales) or a walk-target bias. Amendment (D-0097); the live dial
 * was retired with the camera (D-0107) — the positions remain as grammar.
 */
export type CraftShotBiasPosition = "authored" | CraftShotBias;

export const CRAFT_SHOT_BIAS_POSITIONS: readonly CraftShotBiasPosition[] =
  Object.freeze(["authored", "medium", "wide"]);

export type CraftRailParams = Readonly<{
  exaggeration: number;
  shotBias: CraftShotBiasPosition;
  tempo: number;
}>;

export const CRAFT_RAIL_BOUNDS = Object.freeze({
  exaggeration: Object.freeze({ min: 0.5, max: 2 }),
  tempo: Object.freeze({ min: 0.75, max: 1.25 }),
});

/**
 * Default craft: exaggerate slightly (1.25), perform at AUTHORED framing,
 * true tempo. Amendment (D-0097): the old "wide" default walked every beat
 * one step looser — at the live body anchor that drops the shipped packs
 * below the readability floors, so the default performs the pack as
 * authored. shotBias survives as grammar only (the live dial retired with
 * the camera, D-0107).
 */
export const DEFAULT_CRAFT_RAIL_PARAMS: CraftRailParams = Object.freeze({
  exaggeration: 1.25,
  shotBias: "authored",
  tempo: 1,
});

/**
 * The performance-scale axis, tight → loose. extreme-wide is absent by law
 * (environment scale — never a performance scale; the compiler rejects it on
 * beats). Shot bias walks this axis only.
 */
export const PERFORMANCE_SCALE_AXIS: readonly PackShotScale[] = Object.freeze([
  "extreme-close",
  "close",
  "medium",
  "wide",
]);

/** Merge a rail patch into a base, fail-closed inside the bounds. */
export function clampCraftRailPatch(
  patch: Partial<CraftRailParams> | undefined,
  base: CraftRailParams = DEFAULT_CRAFT_RAIL_PARAMS,
): CraftRailParams {
  const B = CRAFT_RAIL_BOUNDS;
  const pick = (
    v: number | undefined,
    fb: number,
    min: number,
    max: number,
  ): number =>
    Math.max(min, Math.min(max, typeof v === "number" && Number.isFinite(v) ? v : fb));
  const bias = patch?.shotBias;
  return Object.freeze({
    exaggeration: pick(
      patch?.exaggeration,
      base.exaggeration,
      B.exaggeration.min,
      B.exaggeration.max,
    ),
    shotBias:
      typeof bias === "string" &&
      (CRAFT_SHOT_BIAS_POSITIONS as readonly string[]).includes(bias)
        ? (bias as CraftShotBiasPosition)
        : base.shotBias,
    tempo: pick(patch?.tempo, base.tempo, B.tempo.min, B.tempo.max),
  });
}

/**
 * The shot-bias law: move the beat's shot scale ONE STEP toward the bias
 * scale along the performance axis — never crossing the bias, never leaving
 * the axis. "authored" performs the scale unchanged (the framing the pack's
 * floors were authored against). Fail-closed: scales outside the axis enter
 * at the nearest legal scale (extreme-wide/unknown → wide, the loosest
 * performance scale).
 */
export function applyShotBias(
  scale: PackShotScale,
  bias: CraftShotBiasPosition,
): PackShotScale {
  if (bias === "authored") return scale;
  const axis = PERFORMANCE_SCALE_AXIS;
  let idx = axis.indexOf(scale);
  if (idx < 0) idx = axis.length - 1;
  const biasIdx = axis.indexOf(bias);
  if (idx < biasIdx) return axis[idx + 1];
  if (idx > biasIdx) return axis[idx - 1];
  return axis[idx];
}
