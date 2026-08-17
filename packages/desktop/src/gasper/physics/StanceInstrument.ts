/**
 * Stance instrument — three sockets the lower half obeys.
 * Left plant, right plant, crotch. One socket is glued; the other
 * leaves, travels, and lands. The W is the sockets, not a chewed gaussian.
 */
import { gaitSwingTravel01 } from "./GaitLaw";

export const STANCE_SCHEMA = "gasper.stance.v1" as const;

export type StanceSocket = Readonly<{
  x: number;
  y: number;
  planted: number;
  tau: number;
  theta: number;
}>;

export type StanceFrame = Readonly<{
  schema: typeof STANCE_SCHEMA;
  left: StanceSocket;
  right: StanceSocket;
  crotch: StanceSocket;
  phase: number;
  hz: number;
  live: number;
  side: number;
}>;

/** Rest W in FormMaster content px (viewBox 240×220). */
export const STANCE_REST = Object.freeze({
  left: Object.freeze({ x: 100, y: 188, planted: 1, tau: 0.42, theta: 1.83 }),
  right: Object.freeze({ x: 140, y: 188, planted: 1, tau: 0.42, theta: 1.31 }),
  crotch: Object.freeze({ x: 120, y: 172, planted: 1, tau: 0.42, theta: Math.PI / 2 }),
});

const LIFT_PX = 10;
const ADV_PX = 14;
const DROP_PX = 2.0;
const TAU_PLANT = 0.02;
const TAU_SWING = 0.07;
const THETA_TRAVEL = 0.22;

export type StanceTickInput = Readonly<{
  phase?: number;
  hz?: number;
  supportSide?: number;
  plantedCompress?: number;
  incomingCompress?: number;
  swingLift?: number;
  swingAdvance?: number;
  live?: number;
}>;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n <= 0 ? 0 : n >= 1 ? 1 : n;
}

export function restStance(): StanceFrame {
  return Object.freeze({
    schema: STANCE_SCHEMA,
    left: STANCE_REST.left,
    right: STANCE_REST.right,
    crotch: STANCE_REST.crotch,
    phase: 0,
    hz: 0,
    live: 0,
    side: 0,
  });
}

/**
 * Leave/travel/land envelope. 0 at both contacts, 1 at mid-swing.
 * Phase-driven when the kernel published a phase. Mid-pose (1) when tests
 * omit phase so existing mid-swing assertions still hold.
 */
export function stanceLeave(phase: number | undefined): number {
  if (!Number.isFinite(Number(phase))) return 1;
  const travel = gaitSwingTravel01(Number(phase));
  return Math.sin(travel * Math.PI);
}

export function tickStance(input: StanceTickInput = {}): StanceFrame {
  const live = clamp01(Number(input.live) || 0);
  const side = Math.max(-1, Math.min(1, Number(input.supportSide) || 0));
  if (live < 0.004 || side === 0) return restStance();
  const plantR = side > 0;
  const leave = stanceLeave(input.phase) * live;
  const hasLift = input.swingLift !== undefined && Number.isFinite(Number(input.swingLift));
  const liftAmp = hasLift ? clamp01(Number(input.swingLift)) : 0.7;
  const lift = LIFT_PX * liftAmp * leave;
  const drop = DROP_PX * clamp01(Number(input.plantedCompress) || 0.6) * live * (1 - leave * 0.35);
  const advSign = plantR ? -1 : 1;
  const hasAdv = input.swingAdvance !== undefined && Number.isFinite(Number(input.swingAdvance));
  const advAmp =
    hasAdv && Math.abs(Number(input.swingAdvance)) > 1e-6
      ? Math.min(1, Math.abs(Number(input.swingAdvance)))
      : 1;
  const adv = ADV_PX * advSign * advAmp * leave;
  const left: StanceSocket = plantR
    ? {
        x: STANCE_REST.left.x + adv,
        y: STANCE_REST.left.y - lift,
        planted: leave < 0.12 ? 1 : 0,
        tau: leave < 0.12 ? TAU_PLANT : TAU_SWING,
        theta: STANCE_REST.left.theta + THETA_TRAVEL * leave,
      }
    : {
        x: STANCE_REST.left.x,
        y: STANCE_REST.left.y + drop,
        planted: 1,
        tau: TAU_PLANT,
        theta: STANCE_REST.left.theta,
      };
  const right: StanceSocket = plantR
    ? {
        x: STANCE_REST.right.x,
        y: STANCE_REST.right.y + drop,
        planted: 1,
        tau: TAU_PLANT,
        theta: STANCE_REST.right.theta,
      }
    : {
        x: STANCE_REST.right.x + adv,
        y: STANCE_REST.right.y - lift,
        planted: leave < 0.12 ? 1 : 0,
        tau: leave < 0.12 ? TAU_PLANT : TAU_SWING,
        theta: STANCE_REST.right.theta - THETA_TRAVEL * leave,
      };
  const crotch: StanceSocket = {
    x: STANCE_REST.crotch.x + (plantR ? 3 : -3) * leave,
    y: STANCE_REST.crotch.y,
    planted: 1,
    tau: 0.08,
    theta: STANCE_REST.crotch.theta,
  };
  return Object.freeze({
    schema: STANCE_SCHEMA,
    left,
    right,
    crotch,
    phase: Number(input.phase) || 0,
    hz: Math.max(0, Number(input.hz) || 0),
    live,
    side,
  });
}

export function publishStance(frame: StanceFrame): StanceFrame {
  (globalThis as { __GASPER_STANCE__?: StanceFrame }).__GASPER_STANCE__ = frame;
  return frame;
}

export function readStance(): StanceFrame {
  const frame = (globalThis as { __GASPER_STANCE__?: StanceFrame }).__GASPER_STANCE__;
  return frame?.schema === STANCE_SCHEMA ? frame : restStance();
}

export function stanceFromGait(gait: {
  phase?: number;
  stepHz?: number;
  supportSide?: number;
  plantedCompress?: number;
  incomingCompress?: number;
  swingLiftUnits?: number;
  swingAdvanceUnits?: number;
  leftoverSway?: number;
  seated?: boolean;
}): StanceFrame {
  const side = Number(gait.supportSide) || 0;
  // Kernel "seated" is Atlas plant-lock, not the 5.2s sit. A live support
  // side is a step. leftoverSway only eases the W after support collapses.
  const live = Math.abs(side) > 0
    ? 1
    : gait.seated
      ? clamp01(Number(gait.leftoverSway) || 0)
      : 0;
  const liftNorm = Math.max(0, Math.min(1, Math.abs(Number(gait.swingLiftUnits) || 0) / 544));
  const advRaw = Number(gait.swingAdvanceUnits);
  const advNorm = Number.isFinite(advRaw) ? Math.max(-1, Math.min(1, advRaw / 352)) : undefined;
  return tickStance({
    phase: gait.phase,
    hz: gait.stepHz,
    supportSide: gait.supportSide,
    plantedCompress: gait.plantedCompress,
    incomingCompress: gait.incomingCompress,
    swingLift: 1,
    swingAdvance: advNorm,
    live,
  });
}
