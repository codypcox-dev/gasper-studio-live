/**
 * Portable locomotion take — a score, not a pose dump.
 * Physics remains the only free-motion writer. Space is relative
 * to the live body at bind time. Embodiment class can refuse.
 */
import type { EmbodimentLocomotionClass } from "../behavior/EmbodimentLocomotion";
import type { CurveTrack } from "../curves/CurveTrack";

export const GASPER_TAKE_SCHEMA = "gasper.take.v1" as const;

export type TakeNeed = "walker" | "presence" | "any";
export type TakePolicy = "snap" | "refuse";
export type TakeHeadingMode = "world" | "live";
export type TakeSpace = "origin" | "live";

export type TakeAction =
  | { type: "heading"; deg: number }
  | {
      type: "strut";
      dx: number;
      dz: number;
      cruise: number;
      space?: "origin";
      sustainUntil?: number;
    }
  | {
      type: "runInPlace";
      cadenceHz: number;
      driveGain: number;
      compression?: number;
      sustainUntil?: number;
    }
  | { type: "stay"; cruise: number }
  | { type: "expression"; id: string }
  | { type: "relief"; preset: string }
  | { type: "motion"; value: number }
  | { type: "boo"; on: boolean }
  | { type: "walkEnable"; on: boolean }
  | { type: "physics"; launchPower?: number; intensity?: number }
  | { type: "launchComet"; gatherSeconds: number; vx: number; vy: number }
  | { type: "standDownWander" }
  | { type: "lifeGoto"; dx: number; dz: number; cruise: number; space: TakeSpace }
  | { type: "land" }
  | { type: "loop" };

export type TakeBeat = Readonly<{
  id: string;
  at: number;
  actions: readonly TakeAction[];
}>;

export type TakeHeadingWindow = Readonly<{
  until: number;
  deg: number;
}>;

export type TakeSetup = Readonly<{
  embodiment?: "wispwalker" | "presence";
  eightStateLoop?: boolean;
  boo?: boolean;
  walkEnable?: number;
  headingPinDeg?: number;
  yaw?: number;
  shot?: Readonly<{ zoom: number; panX?: number; panY?: number }>;
  life?: boolean;
  wander?: boolean;
}>;

export type GasperTake = Readonly<{
  schema: typeof GASPER_TAKE_SCHEMA;
  id: string;
  name: string;
  durationSec: number;
  needs: TakeNeed;
  policy: TakePolicy;
  heading: TakeHeadingMode;
  setup: TakeSetup;
  headingWindows?: readonly TakeHeadingWindow[];
  beats: readonly TakeBeat[];
  /** Score CurveTracks (parameters, not pose / not 512). */
  tracks?: Readonly<Record<string, CurveTrack>>;
}>;

export type TakeBind = Readonly<{
  originX: number;
  originZ: number;
  headingRad: number;
  class: EmbodimentLocomotionClass;
  admitted: boolean;
  rejected: readonly string[];
}>;

export function rotateTakeOffset(
  dx: number,
  dz: number,
  headingRad: number,
): { x: number; z: number } {
  const c = Math.cos(headingRad);
  const s = Math.sin(headingRad);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

export function worldFromTake(
  bind: TakeBind,
  space: TakeSpace,
  dx: number,
  dz: number,
  liveX: number,
  liveZ: number,
): { x: number; z: number } {
  const off = rotateTakeOffset(dx, dz, bind.headingRad);
  if (space === "live") return { x: liveX + off.x, z: liveZ + off.z };
  return { x: bind.originX + off.x, z: bind.originZ + off.z };
}
