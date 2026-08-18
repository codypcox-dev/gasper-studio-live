/**
 * WAVE 2 — named easing strings are compilers, not the runtime.
 *
 * CSS `cubic-bezier(x1, y1, x2, y2)` lowers onto independent Hermite handles:
 *   m_out = (y1 / max(x1, ε)) · (Δv / Δt)
 *   m_in  = ((1 − y2) / max(1 − x2, ε)) · (Δv / Δt)
 * After compile, the document stores handles. Re-selecting a preset
 * overwrites them. Editing a handle dirties the label to `custom`.
 *
 * Hermite (`evalChannel`) is the only evaluator. These names do not run.
 */

import type { CurveHandle, CurveInterp } from "./CurveTrack";

export type EasingPresetName =
  | "linear"
  | "hold"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "power2.inOut"
  | "back.out";

export const EASING_PRESET_NAMES: readonly EasingPresetName[] = [
  "linear",
  "hold",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "power2.inOut",
  "back.out",
];

/** CSS cubic-bezier control points, or null when the preset is an interp. */
export const EASING_PRESET_BEZIERS: Readonly<
  Record<EasingPresetName, readonly [number, number, number, number] | null>
> = {
  linear: null,
  hold: null,
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  "power2.inOut": [0.42, 0, 0.58, 1], // same as ease-in-out
  "back.out": [0.175, 0.885, 0.32, 1.275],
};

export type CompiledEasing = Readonly<{
  interp: CurveInterp;
  out?: CurveHandle;
  in?: CurveHandle;
}>;

/**
 * Compile a CSS cubic-bezier unit-square into channel-space handles
 * for a segment of Δv over Δt.
 */
export function compileCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dv: number,
  dt: number,
): { out: CurveHandle; in: CurveHandle } {
  const spanT = Number.isFinite(dt) ? dt : 0;
  const spanV = Number.isFinite(dv) ? dv : 0;
  // Store CSS control points as handles. Slope m = dv/max(dt,ε) then equals
  // (y1/max(x1,ε))·(Δv/Δt) and ((1−y2)/max(1−x2,ε))·(Δv/Δt).
  return {
    out: Object.freeze({
      dt: Math.max(0, x1) * Math.abs(spanT),
      dv: y1 * spanV,
    }),
    in: Object.freeze({
      dt: Math.max(0, 1 - x2) * Math.abs(spanT),
      dv: (1 - y2) * spanV,
    }),
  };
}

export function isEasingPresetName(value: unknown): value is EasingPresetName {
  return typeof value === "string" && (EASING_PRESET_NAMES as readonly string[]).includes(value);
}

/**
 * Compile a named preset onto a segment. Hold / linear set interp only.
 * Everything else writes handles and `interp: "bezier"`.
 */
export function compileEasingPreset(name: string, dv: number, dt: number): CompiledEasing {
  const preset: EasingPresetName = isEasingPresetName(name) ? name : "linear";
  if (preset === "hold") return { interp: "hold" };
  if (preset === "linear") return { interp: "linear" };
  const bezier = EASING_PRESET_BEZIERS[preset];
  if (!bezier) return { interp: "linear" };
  const handles = compileCubicBezier(bezier[0], bezier[1], bezier[2], bezier[3], dv, dt);
  return { interp: "bezier", out: handles.out, in: handles.in };
}
