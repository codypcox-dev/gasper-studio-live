/**
 * State-of-t take evaluation. Pure. No clock, no physics, no fire-once Set.
 *
 *   heading / walkEnable / boo / expressionId  = last beat with at ≤ t
 *   strut / runInPlace                         = active on [at, sustainUntil]
 *   launchComet / land / lifeGoto / …          = every impulse with at ≤ t, in order
 */
import type { GasperTake, TakeAction } from "./GasperTake";

export const TAKE_IMPULSE_TYPES = [
  "launchComet",
  "land",
  "lifeGoto",
  "standDownWander",
  "stay",
  "loop",
] as const;

export type TakeImpulseType = (typeof TAKE_IMPULSE_TYPES)[number];

export type TakeImpulseAction = Extract<TakeAction, { type: TakeImpulseType }>;

export type TakeImpulse = Readonly<{
  at: number;
  beatId: string;
  action: TakeImpulseAction;
}>;

export type ActiveTakeLocomotion<T extends TakeAction> = Readonly<{
  at: number;
  sustainUntil: number;
  action: T;
}>;

export type ActiveStrut = ActiveTakeLocomotion<Extract<TakeAction, { type: "strut" }>>;
export type ActiveRunInPlace = ActiveTakeLocomotion<Extract<TakeAction, { type: "runInPlace" }>>;

export type EvaluatedTake = Readonly<{
  headingDeg: number;
  walkEnable: number;
  boo: boolean;
  expressionId: string | null;
  strut: ActiveStrut | null;
  runInPlace: ActiveRunInPlace | null;
  impulses: readonly TakeImpulse[];
  reliefPreset: string | null;
  motion: number | null;
  physics: Readonly<{ launchPower?: number; intensity?: number }> | null;
}>;

const IMPULSE_TYPE_SET: ReadonlySet<string> = new Set(TAKE_IMPULSE_TYPES);

function isImpulseAction(action: TakeAction): action is TakeImpulseAction {
  return IMPULSE_TYPE_SET.has(action.type);
}

function windowUntil(at: number, sustainUntil: number | undefined): number {
  const until = Number(sustainUntil);
  return Number.isFinite(until) && until >= at ? until : Number.POSITIVE_INFINITY;
}

function inSustainWindow(at: number, t: number, sustainUntil: number | undefined): boolean {
  return at <= t && t <= windowUntil(at, sustainUntil);
}

/**
 * Evaluate a take at playhead t (seconds from T0). Deterministic.
 * headingWindows pin until a heading beat with at ≤ t overrides them.
 */
export function evaluateTake(take: GasperTake, t: number): EvaluatedTake {
  let headingDeg = typeof take.setup.headingPinDeg === "number" ? take.setup.headingPinDeg : 0;
  if (take.headingWindows) {
    for (const window of take.headingWindows) {
      if (t < window.until) {
        headingDeg = window.deg;
        break;
      }
    }
  }
  let walkEnable = typeof take.setup.walkEnable === "number" ? take.setup.walkEnable : 0;
  let boo = take.setup.boo === true;
  let expressionId: string | null = null;
  let reliefPreset: string | null = null;
  let motion: number | null = null;
  let physics: EvaluatedTake["physics"] = null;
  let strut: ActiveStrut | null = null;
  let runInPlace: ActiveRunInPlace | null = null;
  const impulses: TakeImpulse[] = [];

  for (const beat of take.beats) {
    if (beat.at > t) continue;
    for (const action of beat.actions) {
      if (action.type === "heading") {
        headingDeg = action.deg;
        continue;
      }
      if (action.type === "walkEnable") {
        walkEnable = action.on ? 1 : 0;
        continue;
      }
      if (action.type === "boo") {
        boo = action.on;
        continue;
      }
      if (action.type === "expression") {
        expressionId = action.id;
        continue;
      }
      if (action.type === "relief") {
        reliefPreset = action.preset;
        continue;
      }
      if (action.type === "motion") {
        motion = action.value;
        continue;
      }
      if (action.type === "physics") {
        physics = { launchPower: action.launchPower, intensity: action.intensity };
        continue;
      }
      if (action.type === "strut") {
        if (inSustainWindow(beat.at, t, action.sustainUntil)) {
          strut = {
            at: beat.at,
            sustainUntil: windowUntil(beat.at, action.sustainUntil),
            action,
          };
        }
        continue;
      }
      if (action.type === "runInPlace") {
        if (inSustainWindow(beat.at, t, action.sustainUntil)) {
          runInPlace = {
            at: beat.at,
            sustainUntil: windowUntil(beat.at, action.sustainUntil),
            action,
          };
        }
        continue;
      }
      if (isImpulseAction(action)) {
        impulses.push({ at: beat.at, beatId: beat.id, action });
      }
    }
  }

  return {
    headingDeg,
    walkEnable,
    boo,
    expressionId,
    strut,
    runInPlace,
    impulses,
    reliefPreset,
    motion,
    physics,
  };
}
