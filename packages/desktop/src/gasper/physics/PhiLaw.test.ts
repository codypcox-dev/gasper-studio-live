import { describe, expect, it } from "vitest";
import {
  PHI,
  PHI_LAW,
  apexForLaunchSpeed,
  bounceHeight,
  gravityPxPerS2,
  launchFeasible,
  launchSpeedForApex,
  minLoadingStroke,
  pxPerMeter,
  visibleBounceCount,
} from "./PhiLaw";

/** The D-0098 home silhouette anchor at 8 units per content px. */
const HOME_HEIGHT_PX = 153;
const UNITS_PER_PX = 8;
const HOME_HEIGHT_UNITS = HOME_HEIGHT_PX * UNITS_PER_PX; // 1224
const G_UNITS = gravityPxPerS2(HOME_HEIGHT_PX) * UNITS_PER_PX;

describe("GASPER-PHYSICS-001 · D-0112 — the φ-law", () => {
  it("the golden identities hold (the constants are one law, not five)", () => {
    expect(PHI_LAW.restitution * PHI).toBeCloseTo(1, 12);
    expect(PHI_LAW.frictionMu).toBeCloseTo(PHI_LAW.restitution * PHI_LAW.restitution, 12);
    expect(PHI_LAW.settleZeta).toBeCloseTo(PHI_LAW.restitution, 12);
    expect(PHI_LAW.peakForceBodyweights).toBeCloseTo(PHI * PHI * PHI, 12);
    // The apex ladder is geometric with ratio 1/φ.
    expect(PHI_LAW.apexLadder[1] / PHI_LAW.apexLadder[0]).toBeCloseTo(PHI, 12);
    expect(PHI_LAW.apexLadder[2] / PHI_LAW.apexLadder[1]).toBeCloseTo(PHI, 12);
  });

  it("the scale law: 10φ cm body, environment-derived mapping", () => {
    expect(PHI_LAW.canonicalHeightM).toBeCloseTo(0.1618034, 5);
    expect(pxPerMeter(HOME_HEIGHT_PX)).toBeCloseTo(945.6, 0);
    // Fail-closed: no environment, no mapping.
    expect(pxPerMeter(Number.NaN)).toBe(0);
    expect(pxPerMeter(-1)).toBe(0);
  });

  it("gravity is real, at toy scale — the snappiness law", () => {
    const gPx = gravityPxPerS2(HOME_HEIGHT_PX);
    expect(gPx).toBeCloseTo(9276, -1); // 9.81 m/s² × 945.6 px/m
    // Own-height fall ≈ 0.18 s — a desk companion, not a balloon.
    const t = Math.sqrt((2 * HOME_HEIGHT_UNITS) / G_UNITS);
    expect(t).toBeGreaterThan(0.15);
    expect(t).toBeLessThan(0.22);
  });

  it("launch speed and apex are exact round-trips (v₀ = √2gh)", () => {
    for (const apex of [100, HOME_HEIGHT_UNITS, 4000]) {
      const v0 = launchSpeedForApex(G_UNITS, apex);
      expect(apexForLaunchSpeed(G_UNITS, v0)).toBeCloseTo(apex, 6);
    }
    expect(launchSpeedForApex(0, 100)).toBe(0);
    expect(launchSpeedForApex(G_UNITS, -5)).toBe(0);
    expect(apexForLaunchSpeed(Number.NaN, 10)).toBe(0);
  });

  it("the loading stroke is the work-energy minimum at peak force", () => {
    const v0 = launchSpeedForApex(G_UNITS, PHI_LAW.apexLadder[1] * HOME_HEIGHT_UNITS);
    const s = minLoadingStroke(G_UNITS, v0);
    const netAccel = (PHI_LAW.peakForceBodyweights - 1) * G_UNITS;
    expect(s.depth).toBeCloseTo((v0 * v0) / (2 * netAccel), 6);
    expect(s.seconds).toBeCloseTo(v0 / netAccel, 9);
    // Peak-force strokes dip in the athletic band (7–19 % of body height).
    for (const rung of PHI_LAW.apexLadder) {
      const v = launchSpeedForApex(G_UNITS, rung * HOME_HEIGHT_UNITS);
      const dip = minLoadingStroke(G_UNITS, v).depth / HOME_HEIGHT_UNITS;
      expect(dip).toBeGreaterThan(0.05);
      expect(dip).toBeLessThan(0.25);
    }
    expect(minLoadingStroke(G_UNITS, -1).seconds).toBe(0);
  });

  it("the strength ceiling self-limits intent (feasibility gate)", () => {
    const g = G_UNITS;
    const apex = PHI_LAW.apexLadder[2] * HOME_HEIGHT_UNITS;
    const v0 = launchSpeedForApex(g, apex);
    const tMin = minLoadingStroke(g, v0).seconds;
    // A stroke at (or gentler than) peak force is feasible by construction.
    expect(launchFeasible(g, v0, tMin * 2)).toBe(true);
    // A stroke rushed to HALF the peak-force time asks for 2·(φ³−1)+1 ≈ 7.5
    // bodyweights — past the φ³ ceiling. The law refuses; it never clips.
    expect(launchFeasible(g, v0, tMin / 2)).toBe(false);
    expect(launchFeasible(0, 10, 0.1)).toBe(false);
  });

  it("the golden bounce series: h·φ⁻²ⁿ, swallowed at the φ⁻⁶ floor", () => {
    const h0 = HOME_HEIGHT_UNITS;
    for (let n = 0; n < 4; n++) {
      expect(bounceHeight(G_UNITS, h0, n)).toBeCloseTo(
        h0 * Math.pow(PHI_LAW.restitution * PHI_LAW.restitution, n),
        6,
      );
    }
    // Own-height drop: bounces 1..3 land at φ⁻², φ⁻⁴, φ⁻⁶ (visible), then
    // the φ⁻⁶ floor reads the rest as contact — exactly 3 visible bounces.
    expect(visibleBounceCount(h0, HOME_HEIGHT_UNITS)).toBe(3);
    expect(visibleBounceCount(0, HOME_HEIGHT_UNITS)).toBe(0);
  });

  it("the law is frozen (no runtime mutation of the constants)", () => {
    expect(Object.isFrozen(PHI_LAW)).toBe(true);
    expect(Object.isFrozen(PHI_LAW.apexLadder)).toBe(true);
  });
});
