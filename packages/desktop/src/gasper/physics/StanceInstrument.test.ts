import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  restStance,
  stanceFromGait,
  tickStance,
  dualFootLeave,
  STANCE_REST,
} from "./StanceInstrument";

const painter = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "all-script-3.js"),
  "utf8",
);

describe("StanceInstrument", () => {
  it("rest is a planted W — both feet down, crotch above", () => {
    const s = restStance();
    expect(s.left.y).toBe(STANCE_REST.left.y);
    expect(s.right.y).toBe(STANCE_REST.right.y);
    expect(s.crotch.y).toBeLessThan(s.left.y);
    expect(s.left.planted).toBe(1);
    expect(s.right.planted).toBe(1);
    expect(s.live).toBe(0);
    expect(s.left.tau).toBe(0.42);
    expect(s.right.tau).toBe(0.42);
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

  it("swing travels theta away from the floor and keeps a W valley", () => {
    const s = tickStance({ supportSide: 1, live: 1, swingLift: 1, plantedCompress: 1 });
    expect(s.left.theta).toBeGreaterThan(STANCE_REST.left.theta);
    expect(s.right.theta).toBe(STANCE_REST.right.theta);
    expect(s.left.y).toBeGreaterThan(s.crotch.y + 4);
    expect(s.right.y - s.crotch.y).toBeGreaterThan(14);
    expect(s.left.tau).toBeLessThan(0.12);
  });

  it("phase 0 is mid-swing leave; phase 2π is that foot's plant — 4π hold, no 2π wrap", () => {
    const mid = tickStance({
      supportSide: 1,
      live: 1,
      swingLift: 1,
      plantedCompress: 1,
      phase: 0,
    });
    const contact = tickStance({
      supportSide: 1,
      live: 1,
      swingLift: 1,
      plantedCompress: 1,
      phase: Math.PI * 2,
    });
    expect(mid.left.y).toBeLessThan(contact.left.y);
    expect(Math.abs(contact.left.x - STANCE_REST.left.x)).toBeLessThan(1.5);
    expect(Math.abs(mid.left.x - STANCE_REST.left.x)).toBeGreaterThan(8);
    const a = tickStance({ supportSide: 1, live: 1, swingLift: 1, phase: 0.4 });
    const b = tickStance({ supportSide: 1, live: 1, swingLift: 1, phase: 0.55 });
    expect(Math.abs(a.left.x - b.left.x)).toBeLessThan(4);
  });

  it("dual-foot hold is C∞ — no side-swap spike", () => {
    const a = dualFootLeave(0);
    expect(a.left).toBeGreaterThan(0.95);
    expect(a.right).toBeLessThan(0.05);
    const b = dualFootLeave(Math.PI * 2);
    expect(b.left).toBeLessThan(0.05);
    expect(b.right).toBeGreaterThan(0.95);
    let maxDx = 0;
    let prev = tickStance({ live: 1, swingLift: 1, phase: 0 });
    for (let p = 0.05; p <= Math.PI * 4 + 0.01; p += 0.05) {
      const s = tickStance({ live: 1, swingLift: 1, phase: p });
      maxDx = Math.max(maxDx, Math.abs(s.left.x - prev.left.x), Math.abs(s.right.x - prev.right.x));
      prev = s;
    }
    expect(maxDx).toBeLessThan(1.6);
  });

  it("first live stance snaps viscosity so the first step is not rest-τ taffy", () => {
    expect(painter).toContain("if(!restHold&&!stanceWasLive) globalThis.__GASPER_VISCO_SNAP__=1");
    expect(painter).toContain("let stanceWasLive = false");
    expect(painter).toContain("posed.x+=(S.left.x-100)*wL");
    expect(painter).not.toContain("/wSum");
    const driver = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "WorldPhysicsDriver.ts"),
      "utf8",
    );
    expect(driver).toContain("if (firstStroke)");
    expect(driver).toContain("this.gaitPhase = 0");
  });
});
