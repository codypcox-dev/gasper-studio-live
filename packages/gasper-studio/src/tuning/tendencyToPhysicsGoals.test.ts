import { describe, expect, it } from "vitest";

import { GAIT_LAW } from "../../../desktop/src/gasper/physics/GaitLaw";
import { PHI } from "../../../desktop/src/gasper/physics/PhiLaw";
import {
  affectFromTendencyAxes,
  compileTendencyPhysics,
  tendencyAxesFromPhrase,
  tendencyToPhysicsGoals,
  ZERO_TENDENCY_AXES,
  type TendencyAffect,
  type TendencyAxes,
} from "./tendencyToPhysicsGoals";

function axes(patch: Partial<TendencyAxes>): TendencyAxes {
  return { ...ZERO_TENDENCY_AXES, ...patch };
}

function keysAreNumeric(value: unknown): boolean {
  if (value === null || typeof value !== "object") return typeof value === "number";
  return Object.values(value).every(keysAreNumeric);
}

describe("tendencyToPhysicsGoals — numbers only, no emotion strings", () => {
  it("high approach + high arousal files cruise, anticipation gather, +bank, +x scale", () => {
    const affect: TendencyAffect = { arousal: 1, expression_gain: 1 };
    const goals = tendencyToPhysicsGoals(axes({ approach: 1 }), affect);
    expect(goals.cruise).toBeGreaterThan(0);
    expect(goals.cruise).toBeLessThanOrEqual(GAIT_LAW.walkBandCruiseUnitsPerSec);
    expect(goals.cruise).toBeLessThan(2000);
    expect(goals.gather).toBeCloseTo(1 / (PHI * PHI), 8);
    expect(goals.bankDeg).toBeGreaterThan(0);
    expect(goals.bankDeg).toBeLessThanOrEqual(GAIT_LAW.bankMaxDeg);
    expect(goals.locomotion.x).toBeGreaterThan(0);
    expect(goals.locomotion.x).toBeLessThanOrEqual(1);
    expect(goals.locomotion.z).toBe(0);
    expect(JSON.stringify(goals)).not.toMatch(/happy|sad|angry|emotion|pleased|fixture/i);
    expect(keysAreNumeric(goals)).toBe(true);
  });

  it("withdraw + low arousal lowers cruise, raises gather, banks away, -x scale", () => {
    const approach = tendencyToPhysicsGoals(axes({ approach: 1 }), { arousal: 1, expression_gain: 1 });
    const withdraw = tendencyToPhysicsGoals(axes({ withdraw: 1 }), { arousal: 0.2, expression_gain: 1 / PHI });
    expect(withdraw.cruise).toBeGreaterThan(0);
    expect(withdraw.cruise).toBeLessThan(approach.cruise);
    expect(withdraw.gather).toBeGreaterThan(approach.gather);
    expect(withdraw.bankDeg).toBeLessThan(0);
    expect(withdraw.locomotion.x).toBeLessThan(0);
    expect(withdraw.locomotion.z).toBe(0);
  });

  it("same axes + affect + gain yield identical goal bytes", () => {
    const a = tendencyToPhysicsGoals(axes({ approach: 1, persist: 1 / PHI }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    const b = tendencyToPhysicsGoals(axes({ approach: 1, persist: 1 / PHI }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("zeroing approach changes cruise; expand/contract write z scale only", () => {
    const withApproach = tendencyToPhysicsGoals(axes({ approach: 1, persist: 1 / PHI }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    const without = tendencyToPhysicsGoals(axes({ approach: 0, persist: 1 / PHI }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    expect(withApproach.cruise).toBeGreaterThan(without.cruise);

    const expand = tendencyToPhysicsGoals(axes({ expand: 1 }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    const contract = tendencyToPhysicsGoals(axes({ contract: 1 }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    expect(expand.locomotion.z).toBeGreaterThan(0);
    expect(contract.locomotion.z).toBeLessThan(0);
    expect(expand.cruise).toBe(0);
    expect(contract.gather).toBeGreaterThan(0);
  });

  it("hold / release / orient file zero cruise; hold and release raise gather", () => {
    const hold = tendencyToPhysicsGoals(axes({ hold: 1 }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    const release = tendencyToPhysicsGoals(axes({ release: 1 }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    const orient = tendencyToPhysicsGoals(axes({ orient: 1 }), { arousal: 1 / PHI, expression_gain: 1 / PHI });
    expect(hold.cruise).toBe(0);
    expect(release.cruise).toBe(0);
    expect(orient.cruise).toBe(0);
    expect(hold.locomotion.x).toBe(0);
    expect(release.locomotion.x).toBe(0);
    expect(orient.locomotion.x).toBe(0);
    expect(hold.gather).toBeGreaterThan(0);
    expect(release.gather).toBeGreaterThan(0);
  });

  it("clamps non-finite and out-of-range inputs; output has no emotion keys", () => {
    const goals = tendencyToPhysicsGoals(
      axes({ approach: 4, withdraw: Number.NaN, persist: -2 }),
      { arousal: 9, expression_gain: Number.POSITIVE_INFINITY },
    );
    expect(goals.cruise).toBeGreaterThan(0);
    expect(goals.cruise).toBeLessThanOrEqual(GAIT_LAW.walkBandCruiseUnitsPerSec);
    expect(Object.keys(goals).sort()).toEqual(["bankDeg", "cruise", "gather", "locomotion"]);
    expect(Object.keys(goals.locomotion).sort()).toEqual(["x", "z"]);
  });
});

describe("phrase → tendency axes (compile helper)", () => {
  it("approach / withdraw phrases compile to opposite travel scales", () => {
    const approach = compileTendencyPhysics("approach the mark");
    const withdraw = compileTendencyPhysics("withdraw");
    expect(approach).not.toBeNull();
    expect(withdraw).not.toBeNull();
    if (!approach || !withdraw) return;
    expect(approach.cruise).toBeGreaterThan(withdraw.cruise);
    expect(approach.locomotion.x).toBeGreaterThan(0);
    expect(withdraw.locomotion.x).toBeLessThan(0);
    expect(withdraw.gather).toBeGreaterThan(approach.gather);
    expect(withdraw.bankDeg).toBeLessThan(0);
  });

  it("look / gather / hold are orient-hold goals: cruise 0, not a slider", () => {
    const look = compileTendencyPhysics("look toward");
    const gather = compileTendencyPhysics("gather");
    const hold = compileTendencyPhysics("hold");
    expect(look).not.toBeNull();
    expect(gather).not.toBeNull();
    expect(hold).not.toBeNull();
    if (!look || !gather || !hold) return;
    expect(look.cruise).toBe(0);
    expect(hold.cruise).toBe(0);
    expect(gather.cruise).toBe(0);
    expect(hold.gather).toBeGreaterThan(0);
    expect(gather.gather).toBeGreaterThan(0);
  });

  it("walk toward stays inside the walk-band, not the 3200 teleport", () => {
    const walk = compileTendencyPhysics("walk toward");
    expect(walk).not.toBeNull();
    if (!walk) return;
    expect(walk.cruise).toBeGreaterThan(0);
    expect(walk.cruise).toBeLessThanOrEqual(GAIT_LAW.walkBandCruiseUnitsPerSec);
    expect(walk.cruise).toBeLessThan(2000);
    expect(walk.locomotion.x).toBeGreaterThan(0);
  });

  it("crip walk is not a tendency compile (N120 fallback owns it)", () => {
    expect(tendencyAxesFromPhrase("make Wispwalker do the crip walk")).toBeNull();
    expect(compileTendencyPhysics("make Wispwalker do the crip walk")).toBeNull();
  });

  it("derived affect stays in 0..1 and has no extra fields", () => {
    const affect = affectFromTendencyAxes(axes({ approach: 1, persist: 1 }));
    expect(affect.arousal).toBeGreaterThan(0);
    expect(affect.arousal).toBeLessThanOrEqual(1);
    expect(affect.expression_gain).toBeGreaterThan(0);
    expect(affect.expression_gain).toBeLessThanOrEqual(1);
    expect(Object.keys(affect).sort()).toEqual(["arousal", "expression_gain"]);
  });
});
