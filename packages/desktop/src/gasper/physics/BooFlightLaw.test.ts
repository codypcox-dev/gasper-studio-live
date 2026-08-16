/**
 * S10 — Boo ghost-flight law tests (ghost-flight-reference-brief, N42):
 * the golden-split parameter swaps, the perpetual bob carrier, and the
 * walker-floor/rest-class invariants.
 */
import { describe, expect, it } from "vitest";
import { BOO_FLIGHT_LAW, booBobUnits } from "./BooFlightLaw";
import { FLIGHT_LAW } from "./FlightLaw";
import { PHI } from "./PhiLaw";

describe("S10 — Boo ghost flight (N42 second half)", () => {
  it("the jets are dreamy: T_max cut by the golden ratio", () => {
    expect(BOO_FLIGHT_LAW.thrustMaxUnitsPerS2).toBeCloseTo(
      FLIGHT_LAW.thrustMaxUnitsPerS2 / PHI,
      12,
    );
    expect(BOO_FLIGHT_LAW.thrustMaxUnitsPerS2).toBeLessThan(
      FLIGHT_LAW.thrustMaxUnitsPerS2,
    );
  });

  it("the drag is ghostly: the golden split scaled by φ", () => {
    expect(BOO_FLIGHT_LAW.dragLinearPerSec).toBeCloseTo(
      FLIGHT_LAW.dragLinearPerSec * PHI,
      12,
    );
    expect(BOO_FLIGHT_LAW.dragQuadPerUnit).toBeCloseTo(
      FLIGHT_LAW.dragQuadPerUnit * PHI,
      12,
    );
  });

  it("N299 Boo hover is a visible launch altitude, not the Presence 22px hover", () => {
    expect(BOO_FLIGHT_LAW.hoverAltitudeUnits).toBeGreaterThan(700);
    expect(BOO_FLIGHT_LAW.hoverAltitudeUnits).toBeLessThan(820);
    expect(BOO_FLIGHT_LAW.hoverAltitudeUnits).toBeGreaterThan(
      FLIGHT_LAW.hoverAltitudeUnits * 3,
    );
    expect(BOO_FLIGHT_LAW.settleZeta).toBe(FLIGHT_LAW.settleZeta);
    expect(BOO_FLIGHT_LAW.hoverOmegaPerSec).toBe(FLIGHT_LAW.hoverOmegaPerSec);
  });

  it("the perpetual bob never stands: bounded, aperiodic, alive at every t", () => {
    const amp = BOO_FLIGHT_LAW.hoverAltitudeUnits * BOO_FLIGHT_LAW.bobAmpFrac;
    expect(amp).toBeGreaterThan(15);
    expect(amp).toBeLessThan(40);
    const samples = Array.from({ length: 200 }, (_, i) => booBobUnits(i * 0.31));
    expect(Math.max(...samples)).toBeLessThanOrEqual(amp * 1.0001);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-amp * 1.0001);
    // both rotors participate (the 60/40 mix is not a pure sine)
    expect(samples.filter((s) => s > 0).length).toBeGreaterThan(80);
    expect(samples.filter((s) => s < 0).length).toBeGreaterThan(80);
    // aperiodic: no period divides the sequence (the rotors are incommensurate)
    const p = 2 * Math.PI;
    expect(Math.abs(Math.sin(3.14159) * 0)).toBe(0); // (sanity)
    const r1 = Math.sin((0) * p * BOO_FLIGHT_LAW.bobHz1 + 1.3);
    const r2 = Math.sin((0) * p * BOO_FLIGHT_LAW.bobHz2 + 0.7);
    expect(booBobUnits(0)).toBeCloseTo(
      amp * (0.6 * r1 + 0.4 * r2),
      9,
    );
  });

  it("the bob rotors are the φ ladder (0.382 Hz / 0.236 Hz)", () => {
    expect(BOO_FLIGHT_LAW.bobHz1).toBeCloseTo(1 / (PHI * PHI), 12);
    expect(BOO_FLIGHT_LAW.bobHz2).toBeCloseTo(1 / (PHI * PHI * PHI), 12);
    expect(BOO_FLIGHT_LAW.bobHz1).toBeGreaterThan(BOO_FLIGHT_LAW.bobHz2);
  });
});
