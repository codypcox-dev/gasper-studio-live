/**
 * GASPER-PHYSICS-001 · S3 — the flight-law proofs (flight-physics-phd-memo
 * F-LAWs 1/3/4). Every constant pins from its field + φ EXPRESSION, never a
 * copied number (C4 idiom).
 */
import { describe, expect, it } from "vitest";
import { GAIT_LAW } from "./GaitLaw";
import { PHI, PHI_LAW } from "./PhiLaw";
import {
  FLIGHT_LAW,
  flightBrakeSpeedUnitsPerSec,
  flightDragUnitsPerS2,
  settleFirstOvershoot,
  windPressureForSpeed,
  windStretchAmplitudePx,
  windContourAsymmetryPx,
  WIND_BASE_HALF_EXTENT_PX,
} from "./FlightLaw";

const V_C = GAIT_LAW.cruiseBaseUnitsPerSec;

describe("S3 F-LAW — the flight constants derive from the field + φ", () => {
  it("F-LAW 3 — the hover equilibrium altitude is h_G/φ⁴ (≈22.3 px)", () => {
    expect(FLIGHT_LAW.hoverAltitudeUnits).toBeCloseTo(
      GAIT_LAW.bodyHeightUnits / Math.pow(PHI, 4),
      9,
    );
    expect(FLIGHT_LAW.hoverAltitudeUnits).toBeGreaterThan(170);
    expect(FLIGHT_LAW.hoverAltitudeUnits).toBeLessThan(190);
    // A legible hover: 8 u per content px ⇒ the floor answers at wFade ≈ 0.755.
    expect(FLIGHT_LAW.hoverAltitudeUnits / 8).toBeCloseTo(22.3, 1);
  });

  it("F-LAW 3 — the breath bob couples ±φ⁻³ of the hover altitude", () => {
    expect(FLIGHT_LAW.hoverBreathBobFrac).toBeCloseTo(1 / Math.pow(PHI, 3), 9);
  });

  it("F-LAW 1 — τ_a = τ·φ² ≈ 0.254 s on the φ ladder", () => {
    expect(FLIGHT_LAW.thrustTauSec).toBeCloseTo(
      GAIT_LAW.bankSmoothTauSec * PHI * PHI,
      9,
    );
    expect(FLIGHT_LAW.thrustTauSec).toBeGreaterThan(0.24);
    expect(FLIGHT_LAW.thrustTauSec).toBeLessThan(0.27);
  });

  it("F-LAW 1 — T_max = v_c/τ_a ≈ 12598 u/s² ≈ 0.17·g (snappy, never teleporty)", () => {
    expect(FLIGHT_LAW.thrustMaxUnitsPerS2).toBeCloseTo(
      V_C / FLIGHT_LAW.thrustTauSec,
      6,
    );
    expect(FLIGHT_LAW.thrustMaxUnitsPerS2).toBeGreaterThan(12000);
    expect(FLIGHT_LAW.thrustMaxUnitsPerS2).toBeLessThan(13200);
    // ≈0.17 of the D-0112 field g: a buoyant body jets at a FRACTION of g.
    expect(FLIGHT_LAW.thrustMaxUnitsPerS2 / 74210).toBeCloseTo(0.17, 1);
  });

  it("F-LAW 1 — the golden drag split sums to the whole: drag at v_c equals T_max EXACTLY", () => {
    const T = FLIGHT_LAW.thrustMaxUnitsPerS2;
    const linear = FLIGHT_LAW.dragLinearPerSec * V_C;
    const quad = FLIGHT_LAW.dragQuadPerUnit * V_C * V_C;
    // The split itself: quadratic carries φ⁻¹ (the jet regime), linear φ⁻².
    expect(quad / T).toBeCloseTo(1 / PHI, 9);
    expect(linear / T).toBeCloseTo(1 / (PHI * PHI), 9);
    // φ identity φ⁻¹ + φ⁻² = 1 ⇒ cruise IS terminal velocity at max thrust.
    expect(flightDragUnitsPerS2(V_C)).toBeCloseTo(T, 6);
  });

  it("F-LAW 1 — the brake curve is the Coulomb idiom under the thrust envelope", () => {
    for (const d of [0, 6, 100, 800]) {
      expect(flightBrakeSpeedUnitsPerSec(d)).toBeCloseTo(
        Math.sqrt(2 * FLIGHT_LAW.thrustMaxUnitsPerS2 * d),
        9,
      );
    }
    expect(flightBrakeSpeedUnitsPerSec(-5)).toBe(0); // fails closed
    expect(flightBrakeSpeedUnitsPerSec(Number.NaN)).toBe(0);
  });

  it("F-LAW 4 — ζ = 1/φ settle: ONE overshoot ≈ 8.4 % of the approach", () => {
    expect(FLIGHT_LAW.settleZeta).toBe(PHI_LAW.settleZeta);
    const over = settleFirstOvershoot(FLIGHT_LAW.settleZeta);
    expect(over).toBeGreaterThan(0.07);
    expect(over).toBeLessThan(0.1);
    // Fails closed at the edges (no overdamped/corrupt overshoot claims).
    expect(settleFirstOvershoot(0)).toBe(0);
    expect(settleFirstOvershoot(1)).toBe(0);
    expect(settleFirstOvershoot(Number.NaN)).toBe(0);
  });

  it("drag is even in speed, zero at rest, fail-closed on garbage", () => {
    expect(flightDragUnitsPerS2(-V_C)).toBeCloseTo(flightDragUnitsPerS2(V_C), 9);
    expect(flightDragUnitsPerS2(0)).toBe(0);
    expect(flightDragUnitsPerS2(Number.NaN)).toBe(0);
  });
});

describe("S4 F-LAW 2 — the wind-resistance surface derives from the field + φ", () => {
  it("the wind read follows the bank idiom's lag τ_c·φ (one timing law)", () => {
    expect(FLIGHT_LAW.windLagTauSec).toBe(GAIT_LAW.bankSmoothTauSec);
    expect(FLIGHT_LAW.windLagTauSec).toBeCloseTo(0.06 * PHI, 9);
  });

  it("trail-stretch ceiling ε_max = φ⁻²/4 of the half-extent — SLIGHT (owner N31)", () => {
    expect(FLIGHT_LAW.windStretchMaxFrac).toBeCloseTo(1 / (PHI * PHI * 4), 9);
    expect(FLIGHT_LAW.windStretchMaxFrac).toBeGreaterThan(0.09);
    expect(FLIGHT_LAW.windStretchMaxFrac).toBeLessThan(0.1);
    // At the 72 px base half-extent the ceiling is ≈ 6.88 px — a squeeze, not a whip.
    expect(FLIGHT_LAW.windStretchMaxFrac * 72).toBeCloseTo(6.88, 1);
  });

  it("lead-compress answers at ε/φ = φ⁻³/4", () => {
    expect(FLIGHT_LAW.windLeadCompressFrac).toBeCloseTo(
      FLIGHT_LAW.windStretchMaxFrac / PHI,
      9,
    );
  });

  it("p(v) = (v/v_c)², bounded at 1: cruise is the reference speed", () => {
    expect(windPressureForSpeed(0)).toBe(0);
    expect(windPressureForSpeed(V_C)).toBe(1);
    expect(windPressureForSpeed(V_C / 2)).toBeCloseTo(0.25, 9);
    // Above cruise the read saturates — never shouts past the whole.
    expect(windPressureForSpeed(2 * V_C)).toBe(1);
    // Even in speed (a reversal reads the same air), fail-closed on garbage.
    expect(windPressureForSpeed(-V_C)).toBe(1);
    expect(windPressureForSpeed(Number.NaN)).toBe(0);
  });

  it("bidirectional contour deltas flip sign with dirX and clear the N152 0.5 px gate", () => {
    const plus = windContourAsymmetryPx(1, 1);
    const minus = windContourAsymmetryPx(1, -1);
    expect(plus).toBeGreaterThan(0.5);
    expect(minus).toBeLessThan(-0.5);
    expect(minus).toBeCloseTo(-plus, 9);
    expect(windContourAsymmetryPx(1, 0)).toBe(0);
    expect(windContourAsymmetryPx(0, 1)).toBe(0);
    expect(windContourAsymmetryPx(Number.NaN, 1)).toBe(0);
    expect(windStretchAmplitudePx(1, 1)).toBeCloseTo(
      FLIGHT_LAW.windStretchMaxFrac * WIND_BASE_HALF_EXTENT_PX,
      9,
    );
    expect(Math.sign(plus)).toBe(1);
    expect(Math.sign(minus)).toBe(-1);
  });

  it("jet-lean inside the Y1 clamp: atan(T_max/g) < 8φ° — the bank channel suffices", () => {
    const leanDeg =
      (Math.atan(FLIGHT_LAW.thrustMaxUnitsPerS2 / 74210) * 180) / Math.PI;
    expect(leanDeg).toBeGreaterThan(8);
    expect(leanDeg).toBeLessThan(GAIT_LAW.bankMaxDeg);
  });
});
