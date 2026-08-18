import type { CurveHandle, CurveInterp, CurveTrack } from "../curves/CurveTrack";
import { normalizeCurveTrack } from "../curves/CurveTrack";
import { compileEasingPreset } from "../curves/easingPresets";
import { READABLE_THREE_QUARTER_DEG } from "../physics/RadialFacingLaw";
import type { GasperTake } from "./GasperTake";

/**
 * Compiled Northstar 20s — relative intents, needs feet.
 * Same beats as the scored law. Targets are offsets from bind origin.
 */
export const NORTHSTAR_TWENTY_TAKE_ID = "take-northstar-20s";

function scoreTrack(
  points: ReadonlyArray<{ t: number; v: number; ease?: string }>,
  opts?: { unit?: boolean },
): CurveTrack {
  const raw: unknown[] = [];
  let pendingIn: CurveHandle | undefined;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const n = points[i + 1];
    const compiled = n
      ? compileEasingPreset(p.ease ?? "hold", n.v - p.v, n.t - p.t)
      : ({ interp: "hold" } as { interp: CurveInterp; out?: CurveHandle; in?: CurveHandle });
    const out =
      compiled.out ??
      (compiled.interp === "hold" ? "stepped" : compiled.interp === "linear" ? "linear" : "spline-auto");
    raw.push({
      t: p.t,
      v: p.v,
      interp: compiled.interp,
      out,
      ...(pendingIn ? { in: pendingIn } : {}),
      weight: 1,
    });
    pendingIn = compiled.in;
  }
  return normalizeCurveTrack(raw, opts);
}

/**
 * First legal Score tracks (parameters, not pose, not 512).
 * yaw holds 0 until the seat — do not ease yaw at T0.
 * launchComet.vx stays an impulse.
 */
export const NORTHSTAR_TWENTY_TRACKS: Readonly<Record<string, CurveTrack>> = Object.freeze({
  yaw: scoreTrack([
    { t: 0, v: 0, ease: "hold" },
    { t: 5.2, v: -READABLE_THREE_QUARTER_DEG },
  ]),
  face: scoreTrack(
    [
      { t: 0, v: 0, ease: "hold" },
      { t: 6.6, v: 0, ease: "ease-in-out" },
      { t: 7.1, v: 1, ease: "ease-in-out" },
      { t: 8.8, v: 0.55 },
    ],
    { unit: true },
  ),
  cadenceHz: scoreTrack([
    { t: 0, v: 0, ease: "hold" },
    { t: 2.618, v: 2.6, ease: "hold" },
    { t: 5.15, v: 0 },
  ]),
  driveGain: scoreTrack([
    { t: 0, v: 0, ease: "hold" },
    { t: 2.618, v: 0.85, ease: "hold" },
    { t: 5.15, v: 0 },
  ]),
  stretch: scoreTrack([
    { t: 0, v: 0, ease: "hold" },
    { t: 20, v: 0 },
  ]),
});

export const NORTHSTAR_TWENTY_TAKE: GasperTake = Object.freeze({
  schema: "gasper.take.v1",
  id: NORTHSTAR_TWENTY_TAKE_ID,
  name: "Northstar 20s",
  durationSec: 20,
  needs: "walker",
  policy: "snap",
  heading: "world",
  setup: Object.freeze({
    embodiment: "wispwalker",
    eightStateLoop: false,
    boo: false,
    walkEnable: 0,
    headingPinDeg: 0,
    yaw: 8,
    shot: Object.freeze({
      zoom: 1,
      panX: 0,
      panY: 0,
    }),
    life: false,
    wander: false,
  }),
  headingWindows: Object.freeze([
    Object.freeze({ until: 2.618, deg: 0 }),
    Object.freeze({ until: 5.2, deg: 0 }),
    Object.freeze({ until: 20, deg: 0 }),
  ]),
  tracks: NORTHSTAR_TWENTY_TRACKS,
  beats: Object.freeze([
    Object.freeze({
      id: "strut-go",
      at: 2.618,
      actions: Object.freeze([
        Object.freeze({
          type: "runInPlace" as const,
          cadenceHz: 2.6,
          driveGain: 0.85,
          compression: 0,
          sustainUntil: 5.15,
        }),
        Object.freeze({ type: "walkEnable" as const, on: true }),
      ]),
    }),
    Object.freeze({
      id: "seat",
      at: 5.2,
      actions: Object.freeze([
        Object.freeze({ type: "heading" as const, deg: -READABLE_THREE_QUARTER_DEG }),
        Object.freeze({ type: "walkEnable" as const, on: false }),
        Object.freeze({ type: "stay" as const, cruise: 1 }),
      ]),
    }),
    Object.freeze({
      id: "notice",
      at: 6.6,
      actions: Object.freeze([
        Object.freeze({ type: "expression" as const, id: "listening-orient" }),
        Object.freeze({ type: "relief" as const, preset: "none" }),
      ]),
    }),
    Object.freeze({
      id: "notice-release",
      at: 8.8,
      actions: Object.freeze([
        Object.freeze({ type: "expression" as const, id: "neutral-settled" }),
        Object.freeze({ type: "motion" as const, value: 0.55 }),
      ]),
    }),
    Object.freeze({
      id: "gather",
      at: 9.2,
      actions: Object.freeze([
        Object.freeze({ type: "boo" as const, on: true }),
        Object.freeze({ type: "walkEnable" as const, on: false }),
        Object.freeze({ type: "physics" as const, launchPower: 1, intensity: 0.7 }),
        Object.freeze({
          type: "launchComet" as const,
          gatherSeconds: 0.75,
          vx: -560,
          vy: 1180,
        }),
      ]),
    }),
    Object.freeze({
      id: "zip1",
      at: 10.0,
      actions: Object.freeze([
        Object.freeze({ type: "boo" as const, on: true }),
        Object.freeze({ type: "heading" as const, deg: -28 }),
        Object.freeze({ type: "standDownWander" as const }),
        Object.freeze({
          type: "lifeGoto" as const,
          dx: 180,
          dz: 120,
          cruise: 380,
          space: "origin" as const,
        }),
      ]),
    }),
    Object.freeze({
      id: "zip2",
      at: 13.2,
      actions: Object.freeze([
        Object.freeze({ type: "boo" as const, on: true }),
        Object.freeze({
          type: "lifeGoto" as const,
          dx: 400,
          dz: -40,
          cruise: 220,
          space: "origin" as const,
        }),
      ]),
    }),
    Object.freeze({
      id: "land",
      at: 15.6,
      actions: Object.freeze([
        Object.freeze({ type: "boo" as const, on: true }),
        Object.freeze({ type: "walkEnable" as const, on: false }),
        Object.freeze({ type: "land" as const }),
        Object.freeze({ type: "stay" as const, cruise: 60 }),
      ]),
    }),
    Object.freeze({
      id: "hold",
      at: 16.5,
      actions: Object.freeze([
        Object.freeze({ type: "boo" as const, on: true }),
        Object.freeze({ type: "walkEnable" as const, on: false }),
        Object.freeze({ type: "land" as const }),
        Object.freeze({ type: "stay" as const, cruise: 1 }),
      ]),
    }),
    Object.freeze({
      id: "loop",
      at: 20,
      actions: Object.freeze([Object.freeze({ type: "loop" as const })]),
    }),
  ]),
});
