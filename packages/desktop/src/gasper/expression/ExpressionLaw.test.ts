/**
 * S5 · E-LAW proofs (expression-attention-phd-memo). Every constant pins
 * from the fences + φ EXPRESSION, never a copied number (C4 idiom).
 */
import { describe, expect, it } from "vitest";
import { GAIT_LAW } from "../physics/GaitLaw";
import { PHI } from "../physics/PhiLaw";
import {
  EXPRESSION_LAW,
  expressionRockPx,
  expressionStretchFor,
} from "./ExpressionLaw";

describe("S5 E-LAW — affect amplitude derives from the fences + φ", () => {
  it("E-LAW 1 — the stretch is the golden cut of the R3 contact-squash fence", () => {
    expect(EXPRESSION_LAW.stretchMaxFrac).toBeCloseTo(0.05 / PHI, 12);
    // Affect earns LESS than impact: strictly inside the 5 % fence.
    expect(EXPRESSION_LAW.stretchMaxFrac).toBeGreaterThan(0.03);
    expect(EXPRESSION_LAW.stretchMaxFrac * PHI).toBeCloseTo(0.05, 12);
    expect(EXPRESSION_LAW.stretchMaxFrac).toBeLessThan(0.05);
  });

  it("E-LAW 1 — the rock is the golden cut of the 8 px no-pinch fence", () => {
    expect(EXPRESSION_LAW.leanMaxPx).toBeCloseTo(8 / (PHI * PHI), 12);
    expect(EXPRESSION_LAW.leanMaxPx * PHI * PHI).toBeCloseTo(8, 12);
    expect(EXPRESSION_LAW.leanMaxPx).toBeLessThan(8);
  });

  it("E-LAW 2 — the body follows the face at the bank idiom τ = τ_c·φ", () => {
    expect(EXPRESSION_LAW.bodyTauSec).toBeCloseTo(GAIT_LAW.bankSmoothTauSec, 12);
    expect(EXPRESSION_LAW.bodyTauSec).toBeCloseTo(0.06 * PHI, 12);
  });
});

describe("S5 E-LAW — the silhouette projection holds the volume law", () => {
  it("volume conjugate: Sx·Sy = 1 EXACTLY across the carrier range", () => {
    for (const fe of [0, 0.25, 0.5, 0.75, 1]) {
      const s = expressionStretchFor(fe);
      expect(Object.isFrozen(s)).toBe(true);
      expect(s.scaleX * s.scaleY).toBeCloseTo(1, 12);
      expect(s.scaleY).toBeGreaterThanOrEqual(1);
    }
  });

  it("peak stretch stays inside the fence; rise is base-anchored on the form arm", () => {
    const peak = expressionStretchFor(1);
    expect(peak.scaleY - 1).toBeCloseTo(EXPRESSION_LAW.stretchMaxFrac, 12);
    expect(peak.scaleY - 1).toBeLessThan(0.05); // R3 fence
    expect(peak.risePx).toBeCloseTo(EXPRESSION_LAW.stretchMaxFrac * 84, 12);
    // Crown rise = 2·ε·arm (scale about center + anchored base) — ≤ 10 % of h_form.
    expect(2 * peak.risePx).toBeLessThanOrEqual(0.1 * 2 * EXPRESSION_LAW.baseArmPx);
  });

  it("fails closed: corrupt input reads as rest = identity (byte-stable)", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -3]) {
      const s = expressionStretchFor(bad);
      expect(s.scaleX).toBe(1);
      expect(s.scaleY).toBe(1);
      expect(s.risePx).toBe(0);
    }
    expect(expressionStretchFor(2).scaleY).toBeCloseTo(expressionStretchFor(1).scaleY, 12);
  });

  it("the rock signs AWAY from the addressed direction (+1 default frontal)", () => {
    expect(expressionRockPx(1, 0)).toBeCloseTo(EXPRESSION_LAW.leanMaxPx, 12);
    expect(expressionRockPx(1, 20)).toBeCloseTo(-EXPRESSION_LAW.leanMaxPx, 12);
    expect(expressionRockPx(1, -20)).toBeCloseTo(EXPRESSION_LAW.leanMaxPx, 12);
    // Odd-ish fence behavior at the dead-zone edge.
    expect(expressionRockPx(1, 0.5)).toBeCloseTo(EXPRESSION_LAW.leanMaxPx, 12);
    expect(expressionRockPx(1, 0.51)).toBeCloseTo(-EXPRESSION_LAW.leanMaxPx, 12);
    // Carrier scales the amplitude; zero carrier = zero rock.
    expect(expressionRockPx(0.5, 20)).toBeCloseTo(-EXPRESSION_LAW.leanMaxPx / 2, 12);
    expect(expressionRockPx(0, 20)).toBe(0);
  });
});
