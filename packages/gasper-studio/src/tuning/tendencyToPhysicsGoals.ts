/**
 * R4 — action-tendency axes → physics goals.
 *
 * Pure numbers. No emotion strings, no fixture ids, no travel writes.
 * WorldPhysicsDriver remains the sole body.x/z writer; this module only
 * FILES cruise / gather / bank / locomotion scale.
 *
 * Axes are Book 004 directional tendencies. φ is the design generator.
 */
import { GAIT_LAW } from "../../../desktop/src/gasper/physics/GaitLaw";
import { PHI } from "../../../desktop/src/gasper/physics/PhiLaw";

export const TENDENCY_PHYSICS_COMPILER_ID = "gasper.tendency-physics.v0_1";

export type Unit01 = number;

/** Action-tendency axes. Each is a 0..1 magnitude. No labels. */
export type TendencyAxes = {
  approach: Unit01;
  withdraw: Unit01;
  expand: Unit01;
  contract: Unit01;
  hold: Unit01;
  release: Unit01;
  persist: Unit01;
  orient: Unit01;
};

export type TendencyAffect = {
  arousal: Unit01;
  expression_gain: Unit01;
};

/** Filed physics goals. locomotion.x/z are signed scales in [-1, 1]. */
export type TendencyPhysicsGoals = {
  cruise: number;
  gather: Unit01;
  bankDeg: number;
  locomotion: { x: number; z: number };
};

export const ZERO_TENDENCY_AXES: TendencyAxes = Object.freeze({
  approach: 0,
  withdraw: 0,
  expand: 0,
  contract: 0,
  hold: 0,
  release: 0,
  persist: 0,
  orient: 0,
});

export function clamp01(x: number): Unit01 {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function clampSigned(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(-1, Math.min(1, x));
}

export function clampTendencyAxes(axes: TendencyAxes): TendencyAxes {
  return {
    approach: clamp01(axes.approach),
    withdraw: clamp01(axes.withdraw),
    expand: clamp01(axes.expand),
    contract: clamp01(axes.contract),
    hold: clamp01(axes.hold),
    release: clamp01(axes.release),
    persist: clamp01(axes.persist),
    orient: clamp01(axes.orient),
  };
}

export function clampTendencyAffect(affect: TendencyAffect): TendencyAffect {
  return {
    arousal: clamp01(affect.arousal),
    expression_gain: clamp01(affect.expression_gain),
  };
}

/** Derive arousal / expression_gain from axes when a phrase does not supply them. */
export function affectFromTendencyAxes(axes: TendencyAxes): TendencyAffect {
  const a = clampTendencyAxes(axes);
  const arousal = clamp01(
    a.approach / PHI +
      a.persist / (PHI * PHI) +
      a.orient / (PHI * PHI) +
      a.expand / (PHI * PHI),
  );
  return {
    arousal,
    expression_gain: clamp01(1 / PHI + arousal / PHI),
  };
}

/**
 * Map tendency axes + arousal + expression_gain → physics-goal numbers.
 * Same inputs always yield the same bytes. No emotion fields exist.
 */
export function tendencyToPhysicsGoals(
  axes: TendencyAxes,
  affect: TendencyAffect,
): TendencyPhysicsGoals {
  const a = clampTendencyAxes(axes);
  const { arousal, expression_gain } = clampTendencyAffect(affect);

  const netTravel = clampSigned(a.approach - a.withdraw);
  const settle = a.release > 0 && a.approach <= 0;
  const holding = a.hold > 0 && netTravel <= 0;
  const orientOnly = a.orient > 0 && a.approach <= 0 && a.withdraw <= 0 && !settle;

  // Grounded travel files the walk-band (stride × φ Hz). The 2610/3200
  // Froude rung is a screen-scale teleport — FlightLaw owns that envelope.
  const cruiseBase = GAIT_LAW.walkBandCruiseUnitsPerSec;
  let cruise = 0;
  if (a.approach > 0) {
    cruise = cruiseBase * (1 / PHI + a.approach * (1 - 1 / PHI) * (1 / PHI + arousal / PHI));
    if (a.persist > 0) cruise = cruise * (1 + a.persist / PHI);
  } else if (a.withdraw > 0) {
    cruise = (cruiseBase / PHI) * (1 - a.withdraw / PHI);
  }
  if (orientOnly || settle || holding) cruise = 0;
  cruise = Math.max(0, Math.min(cruiseBase, cruise));

  const gather = clamp01(
    a.withdraw / PHI +
      a.contract / PHI +
      a.hold / PHI +
      (settle ? 1 / PHI : 0) +
      (a.approach > 0 ? 1 / (PHI * PHI) : 0),
  );

  const bankFence = GAIT_LAW.bankMaxDeg / PHI;
  const bankDeg =
    a.approach > 0
      ? (bankFence * a.approach * arousal) / PHI
      : a.withdraw > 0
        ? -bankFence * a.withdraw
        : 0;

  const travelScale = clampSigned(netTravel * (1 / PHI + expression_gain / PHI));
  const depthScale = clampSigned((a.expand - a.contract) / PHI);
  const locomotion = {
    x: orientOnly || settle || holding ? 0 : travelScale,
    z: depthScale,
  };

  return { cruise, gather, bankDeg, locomotion };
}

type AxisPatch = Partial<TendencyAxes>;

const TENDENCY_PHRASE_RULES: readonly Readonly<{ re: RegExp; patch: AxisPatch }>[] = [
  { re: /\b(approach|come closer|come toward|walk toward|go toward|head toward|walk to)\b/, patch: { approach: 1 } },
  { re: /\b(withdraw|back away|retreat|recede|pull back|step back)\b/, patch: { withdraw: 1 } },
  { re: /\b(expand|open up|open out)\b/, patch: { expand: 1 } },
  { re: /\b(contract|close in|gather)\b/, patch: { contract: 1 } },
  { re: /\b(settle|come to rest|be still|stand still|let go)\b/, patch: { release: 1 } },
  { re: /\brelease\b/, patch: { release: 1 } },
  { re: /\b(persist|keep going|keep walking|continue)\b/, patch: { persist: 1, approach: 1 / PHI } },
  { re: /\bhold\b/, patch: { hold: 1 } },
  { re: /\b(orient|face|attend|look toward|look at)\b/, patch: { orient: 1 } },
  { re: /\bwalk\b/, patch: { approach: 1, persist: 1 / PHI } },
];

export function mergeTendencyAxes(base: TendencyAxes, patch: AxisPatch): TendencyAxes {
  const next = { ...base };
  for (const key of Object.keys(patch) as (keyof TendencyAxes)[]) {
    const value = patch[key];
    if (typeof value === "number") next[key] = clamp01(Math.max(next[key], value));
  }
  return next;
}

/**
 * Phrase → tendency axes. Returns null when no axis fires.
 * "crip walk" is left to the N120 legacy bucket.
 */
export function tendencyAxesFromPhrase(input: string): TendencyAxes | null {
  const text = String(input ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return null;
  if (/\bcrip\s+walk\b/.test(text)) return null;
  let axes = { ...ZERO_TENDENCY_AXES };
  let hits = 0;
  for (const rule of TENDENCY_PHRASE_RULES) {
    if (!rule.re.test(text)) continue;
    hits += 1;
    axes = mergeTendencyAxes(axes, rule.patch);
  }
  return hits > 0 ? axes : null;
}

export function compileTendencyPhysics(input: string): TendencyPhysicsGoals | null {
  const axes = tendencyAxesFromPhrase(input);
  if (!axes) return null;
  return tendencyToPhysicsGoals(axes, affectFromTendencyAxes(axes));
}
