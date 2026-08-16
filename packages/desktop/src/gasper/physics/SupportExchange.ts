/**
 * Support-driven locomotion organ.
 *
 * The planted foot is a world-space sample-and-hold. Mass shifts onto that
 * support. Contact charges an impact/gather envelope. Push-off advances the
 * next plant — travel is the support carrier, not an independent root slide.
 *
 * No authored clip. No invented knees. Y=0 stays the floor convention; the
 * vault impulse still fires the contact envelope so the walk is not a flat
 * sliding puck.
 */
import { GAIT_LAW, GAIT_LEG_UNITS } from "./GaitLaw";
import { PHI } from "./PhiLaw";

export type SupportExchangeInput = Readonly<{
  walking: boolean;
  phase: number;
  stepHz: number;
  bobUnits: number;
  swayUnits: number;
  bodyX: number;
  bodyZ: number;
  vx: number;
  vz: number;
  dt: number;
  /** 0 = strut, 1 = hop. Continuous. */
  hopMix?: number;
  /** Flight fraction of the step at this mix. */
  flightFrac?: number;
}>;

export type SupportExchangeState = Readonly<{
  /** Planted side: +1 / -1, or 0 when no support is live. */
  side: number;
  planted: boolean;
  plantedWorldX: number;
  plantedWorldZ: number;
  exchangeCount: number;
  /** Closing-speed equivalent charged this tick (0 when no contact). */
  impactSpeed: number;
  gatherTarget: number;
  /** Grounded push-off Δv this tick (world units/s). */
  pushOffX: number;
  pushOffZ: number;
  /** Plant-to-plant travel along heading (world units). */
  pushOffAlong: number;
  /** CoG offset onto the planted support (world units). */
  cogX: number;
  cogZ: number;
  /** Bounded support bank/lean (degrees). */
  angle: number;
  /** World drift of a held plant this tick — must stay ~0 during support. */
  skateUnits: number;
  /** Seconds since this support committed — clocks the gather hold. */
  plantAgeSec: number;
  /** Planted support compress 0..1 — high at mid-stance (weight on plant). */
  plantedCompress: number;
  /** Swing / incoming 0..1 — high while the opposite foot is unloaded. */
  incomingCompress: number;
  /** 0..1 airborne share this tick (hop flight; 0 on the strut plant). */
  flight: number;
  hopMix: number;
  /** True once the support solve has converged over the planted root. */
  seated: boolean;
  /** Residual support sway while the seat converges, 0..1. */
  leftoverSway: number;
}>;

export const SUPPORT_REST: SupportExchangeState = Object.freeze({
  side: 0,
  planted: false,
  plantedWorldX: 0,
  plantedWorldZ: 0,
  exchangeCount: 0,
  impactSpeed: 0,
  gatherTarget: 0,
  pushOffX: 0,
  pushOffZ: 0,
  pushOffAlong: 0,
  cogX: 0,
  cogZ: 0,
  angle: 0,
  skateUnits: 0,
  plantAgeSec: 0,
  plantedCompress: 0,
  incomingCompress: 0,
  flight: 0,
  hopMix: 0,
  seated: false,
  leftoverSway: 0,
});

/** |hold| above this is a committed single-support plant. */
const PLANT_HOLD = 0.9;
/** |hold| below this is the double-support exchange window. */
const EXCHANGE_HOLD = 0.35;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Vault vertical speed at contact — the walk's floor-dialogue impulse.
 * Same identity GaitLaw uses for contactSquash: v_v = (bob/2)·2π·f.
 */
export function supportVaultImpactSpeed(bobUnits: number, stepHz: number): number {
  if (!(bobUnits > 0) || !(stepHz > 0)) return 0;
  return (bobUnits / 2) * 2 * Math.PI * stepHz;
}

/** Screen-x of a world plant relative to the body COM.
 *  World X is the camera-lateral axis; world Z is depth (scale), not screen x.
 *  During a hold, plantedWorld is constant, so this value changes only because
 *  the COM walks past the plant — that is the anti-skate.
 */
export function projectPlantedScreenX(
  plantedWorldX: number,
  _plantedWorldZ: number,
  bodyX: number,
  _bodyZ: number,
): number {
  return plantedWorldX - bodyX;
}

/** S0 hold: tanh(k·cos(φ/2)) — saturated through single support. */
export function supportHold(phase: number): number {
  return Math.tanh(GAIT_LAW.stepPlacementSharpness * Math.cos(phase / 2));
}

export function stepSupportExchange(
  prev: SupportExchangeState,
  input: SupportExchangeInput,
): SupportExchangeState {
  if (
    !input.walking ||
    !Number.isFinite(input.phase) ||
    !Number.isFinite(input.dt) ||
    input.dt <= 0 ||
    input.stepHz <= 0
  ) {
    return {
      ...SUPPORT_REST,
      plantedWorldX: prev.plantedWorldX,
      plantedWorldZ: prev.plantedWorldZ,
      exchangeCount: prev.exchangeCount,
    };
  }

  const hold = supportHold(input.phase);
  const absHold = Math.abs(hold);
  const committed = absHold >= PLANT_HOLD;
  const side = committed
    ? Math.sign(hold)
    : absHold >= EXCHANGE_HOLD && prev.side !== 0
      ? prev.side
      : committed
        ? Math.sign(hold)
        : prev.side;

  const speed = Math.hypot(input.vx, input.vz);
  const hx = speed > 1 ? input.vx / speed : 0;
  const hz = speed > 1 ? input.vz / speed : 0;
  const px = -hz;
  const pz = hx;

  const liveSide = side !== 0 ? side : Math.sign(hold) || prev.side;
  const lateral = liveSide * input.swayUnits;
  const stride = input.stepHz > 0 ? speed / input.stepHz : 0;
  const ahead = stride / 2;

  const nextPlantX = input.bodyX + lateral * px + ahead * hx;
  const nextPlantZ = input.bodyZ + lateral * pz + ahead * hz;

  const exchanged =
    committed &&
    liveSide !== 0 &&
    prev.side !== 0 &&
    liveSide !== prev.side;
  const firstPlant = committed && !prev.planted && liveSide !== 0;
  const holding = prev.planted && !exchanged && !firstPlant && absHold >= EXCHANGE_HOLD;

  let plantedWorldX = prev.plantedWorldX;
  let plantedWorldZ = prev.plantedWorldZ;
  let planted = prev.planted;
  let exchangeCount = prev.exchangeCount;
  let impactSpeed = 0;
  let pushOffX = 0;
  let pushOffZ = 0;
  let pushOffAlong = 0;
  let skateUnits = 0;

  if (exchanged || firstPlant) {
    if (prev.planted) {
      pushOffAlong = (nextPlantX - prev.plantedWorldX) * hx + (nextPlantZ - prev.plantedWorldZ) * hz;
      const boost = clamp(Math.abs(pushOffAlong) * input.stepHz * (1 / (PHI * PHI * PHI)), 0, speed * 0.08);
      const sign = pushOffAlong >= 0 ? 1 : -1;
      pushOffX = hx * boost * sign;
      pushOffZ = hz * boost * sign;
    }
    plantedWorldX = nextPlantX;
    plantedWorldZ = nextPlantZ;
    planted = true;
    exchangeCount = prev.exchangeCount + 1;
    impactSpeed = supportVaultImpactSpeed(input.bobUnits, input.stepHz);
  } else if (holding && prev.planted) {
    plantedWorldX = prev.plantedWorldX;
    plantedWorldZ = prev.plantedWorldZ;
    planted = true;
    skateUnits = 0; // world-lock: held plant does not move
  } else if (!committed && absHold < EXCHANGE_HOLD) {
    planted = prev.planted;
  }

  const cogX = liveSide * input.swayUnits * px;
  const cogZ = liveSide * input.swayUnits * pz;
  const lean =
    liveSide === 0 || input.swayUnits <= 0
      ? 0
      : clamp(
          -liveSide * ((Math.atan(input.swayUnits / GAIT_LEG_UNITS) * 180) / Math.PI),
          -GAIT_LAW.maxGroundedLeanDeg,
          GAIT_LAW.maxGroundedLeanDeg,
        );
  const plantAgeSec =
    exchanged || firstPlant
      ? 0
      : holding && prev.planted
        ? (Number(prev.plantAgeSec) || 0) + input.dt
        : 0;
  // Cody: vertical gather ON the plant, then a hold, then recover on push-off.
  // A stance-long gather never leaves the envelope (tau 180ms vs 820ms hold),
  // so the stroll stayed a crouched skate. Hold the gather for phi^-2 of a
  // second, capped at half a step, then drop the target so height returns.
  const hopMix = clamp(Number.isFinite(input.hopMix) ? (input.hopMix as number) : 0, 0, 1);
  const flightFrac = clamp(
    Number.isFinite(input.flightFrac) ? (input.flightFrac as number) : 0.10,
    0,
    0.5,
  );
  const inExchange = absHold < EXCHANGE_HOLD;
  const flight = input.walking && inExchange ? flightFrac * (1 - absHold / EXCHANGE_HOLD) : 0;
  const midStance = Math.abs(Math.cos(input.phase / 2));
  // Atlas Seat: plant finds the floor FIRST (plantedWorld lock above).
  // Mass solves over the plant (compress). Then lock. Hop seats faster —
  // the clean more-than-human solve, not a flourish.
  const seatTau = (1 / (PHI * PHI * PHI)) * (1 - 0.45 * hopMix);
  const seated =
    planted && committed && plantAgeSec >= seatTau * 0.35 && absHold >= PLANT_HOLD;
  const leftoverSway = seated
    ? clamp(Math.exp(-Math.max(0, plantAgeSec - seatTau * 0.35) / Math.max(1e-4, seatTau * 0.65)), 0, 1)
    : planted && committed
      ? 0.55
      : input.walking
        ? 1
        : 0;
  // Solve (pre-seat) rides the vault. Seat recovers and HOLDS — no leftover
  // hunt with phase. Dead freeze is not a seat: a small planted hold remains.
  // N207/N232: load peaks at mid-stance (COM over the plant). The old
  // (1−midStance) peak was an exchange impulse — both feet stayed down
  // at the hold. Swing channel stays up through single support so the
  // existing contour consumer can lift/unload the free lobe.
  const plantedCompress =
    planted && committed
      ? seated
        ? clamp(0.16 * Math.exp(-Math.max(0, plantAgeSec - seatTau) * input.stepHz * 2.2) + 0.07, 0, 1)
        : clamp(midStance * 0.78 + Math.exp(-plantAgeSec * input.stepHz * 3.2) * 0.16, 0, 1)
      : 0;
  const incomingCompress = input.walking && !seated
    ? clamp(midStance * (0.72 + 0.18 * hopMix) + (inExchange ? 0.28 : 0), 0, 1)
    : 0;
  const gatherHoldSec = Math.min(1 / (PHI * PHI), 0.5 / input.stepHz);
  const gatherTarget =
    input.walking && planted && absHold >= PLANT_HOLD && plantAgeSec <= gatherHoldSec
      ? 0.12 + 0.06 * hopMix
      : 0;

  return {
    side: liveSide,
    planted,
    plantedWorldX,
    plantedWorldZ,
    exchangeCount,
    impactSpeed,
    gatherTarget,
    pushOffX,
    pushOffZ,
    pushOffAlong,
    cogX,
    cogZ,
    angle: lean,
    skateUnits,
    plantAgeSec,
    plantedCompress,
    incomingCompress,
    flight,
    hopMix,
    seated,
    leftoverSway,
  };
}

