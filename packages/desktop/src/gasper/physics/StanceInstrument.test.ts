import { describe, expect, it } from "vitest";
import {
  restStance,
  stanceFromGait,
  tickStance,
  STANCE_REST,
} from "./StanceInstrument";

describe("StanceInstrument", () => {
  it("rest is a planted W — both feet down, crotch above", () => {
    const s = restStance();
    expect(s.left.y).toBe(STANCE_REST.left.y);
    expect(s.right.y).toBe(STANCE_REST.right.y);
    expect(s.crotch.y).toBeLessThan(s.left.y);
    expect(s.left.planted).toBe(1);
    expect(s.right.planted).toBe(1);
    expect(s.live).toBe(0);
  });

  it("planted right lifts the left and holds the W valley", () => {
    const s = tickStance({ supportSide: 1, live: 1, swingLift: 1, plantedCompress: 1 });
    expect(s.right.planted).toBe(1);
    expect(s.left.planted).toBe(0);
    expect(s.left.y).toBeLessThan(s.right.y);
    expect(s.crotch.y).toBeLessThan(s.right.y);
    expect(s.right.tau).toBe(0.02);
    expect(s.left.tau).toBeGreaterThan(s.right.tau);
  });

  it("zero side or live returns rest", () => {
    expect(tickStance({ supportSide: 1, live: 0 }).live).toBe(0);
    expect(tickStance({ supportSide: 0, live: 1 }).side).toBe(0);
  });

  it("gait pack with supportSide maps to a live stance", () => {
    const s = stanceFromGait({
      supportSide: -1,
      stepHz: 2.6,
      swingLiftUnits: 400,
      seated: false,
    });
    expect(s.live).toBe(1);
    expect(s.left.planted).toBe(1);
    expect(s.right.y).toBeLessThan(s.left.y);
  });

  it("kernel plant-lock seated still walks while a support side is live", () => {
    const s = stanceFromGait({
      supportSide: 1,
      stepHz: 2.6,
      swingLiftUnits: 400,
      seated: true,
      leftoverSway: 0.2,
    });
    expect(s.live).toBe(1);
    expect(s.right.planted).toBe(1);
    expect(s.left.y).toBeLessThan(s.right.y);
  });
});
