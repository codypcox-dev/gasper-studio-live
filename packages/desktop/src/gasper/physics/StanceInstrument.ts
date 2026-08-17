/**
 * Stance instrument — two rim handles + a crotch.
 *
 * Adobe / ARAP / KV law: gait is two soft handles on the lower rim, not a
 * boolean plant-swap after the polar hypot. Each foot has its own leave
 * from the kernel hold (tanh(k·cos(φ/2))), 4π periodic, C∞. Side is
 * telemetry. A square-wave side flip is the spikey shear.
 */
import { supportHold } from "./SupportExchange";

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
 * Leave 0..1 from the kernel hold. hold=+1 → right planted, left swinging.
 * 4π periodic. Never wrap φ into 2π before this (that is a side-swap spike).
 */
export function dualFootLeave(phase: number): { left: number; right: number } {
  if (!Number.isFinite(phase)) return { left: 1, right: 0 };
  const hold = supportHold(phase);
  return {
    left: 0.5 * (1 + hold),
    right: 0.5 * (1 - hold),
  };
}

export function stanceLeave(phase: number | undefined): number {
  if (!Number.isFinite(Number(phase))) return 1;
  return dualFootLeave(Number(phase)).left;
}

function socketFromLeave(
  rest: { x: number; y: number; theta: number },
  leave: number,
  splay: number,
  liftAmp: number,
  advAmp: number,
  drop: number,
): StanceSocket {
  const planted = leave < 0.12 ? 1 : 0;
  return {
    x: rest.x + ADV_PX * splay * advAmp * leave,
    y: rest.y - LIFT_PX * liftAmp * leave + drop * (1 - leave * 0.35),
    planted,
    tau: planted ? TAU_PLANT : TAU_SWING,
    theta: rest.theta - THETA_TRAVEL * splay * leave,
  };
}

export function tickStance(input: StanceTickInput = {}): StanceFrame {
  const live = clamp01(Number(input.live) || 0);
  const sideIn = Math.max(-1, Math.min(1, Number(input.supportSide) || 0));
  const hasPhase = Number.isFinite(Number(input.phase));
  if (live < 0.004) return restStance();
  if (!hasPhase && sideIn === 0) return restStance();

  const liftAmp =
    input.swingLift !== undefined && Number.isFinite(Number(input.swingLift))
      ? clamp01(Number(input.swingLift))
      : 0.7;
  const hasAdv = input.swingAdvance !== undefined && Number.isFinite(Number(input.swingAdvance));
  const advAmp =
    hasAdv && Math.abs(Number(input.swingAdvance)) > 1e-6
      ? Math.min(1, Math.abs(Number(input.swingAdvance)))
      : 1;
  const drop = DROP_PX * clamp01(Number(input.plantedCompress) || 0.6) * live;

  let leaveL: number;
  let leaveR: number;
  if (hasPhase) {
    const dual = dualFootLeave(Number(input.phase));
    leaveL = dual.left * live;
    leaveR = dual.right * live;
  } else {
    leaveL = (sideIn > 0 ? 1 : 0) * live;
    leaveR = (sideIn < 0 ? 1 : 0) * live;
  }

  const left = socketFromLeave(STANCE_REST.left, leaveL, -1, liftAmp, advAmp, drop);
  const right = socketFromLeave(STANCE_REST.right, leaveR, 1, liftAmp, advAmp, drop);
  const crotch: StanceSocket = {
    x: STANCE_REST.crotch.x + (leaveL - leaveR) * 3,
    y: STANCE_REST.crotch.y,
    planted: 1,
    tau: 0.08,
    theta: STANCE_REST.crotch.theta,
  };
  const side = leaveL > leaveR + 0.04 ? 1 : leaveR > leaveL + 0.04 ? -1 : sideIn;
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
  const live = Math.abs(side) > 0
    ? 1
    : gait.seated
      ? clamp01(Number(gait.leftoverSway) || 0)
      : 0;
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
