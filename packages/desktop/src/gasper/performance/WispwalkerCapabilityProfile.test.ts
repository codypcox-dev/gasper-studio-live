import { describe, expect, it } from "vitest";

import { GAIT_LAW, GAIT_STEP_HZ_MAX } from "../physics/GaitLaw.js";
import { PHI_LAW } from "../physics/PhiLaw.js";
import {
  getFormCapabilityProfile,
  validatePrimitiveAgainstForm,
} from "./WispwalkerCapabilityProfile.js";

describe("Wispwalker capability profile", () => {
  it("declares exactly two structural supports and refuses humanoid-only actions", () => {
    // Break caught: a human-video retargeter could hallucinate knees or add a
    // third contact instead of translating mechanics into Gasper's real form.
    const profile = getFormCapabilityProfile("wispwalker");

    expect(profile.supports.map((support) => support.id)).toEqual(["root_left", "root_right"]);
    expect(profile.supports.every((support) => support.kind === "structural_root")).toBe(true);
    expect(profile.locomotion).toContain("grounded");
    expect(
      validatePrimitiveAgainstForm({ id: "support_exchange", supportCount: 2 }, profile),
    ).toMatchObject({ ok: true });
    expect(validatePrimitiveAgainstForm({ id: "knee_kick", supportCount: 1 }, profile)).toMatchObject({
      ok: false,
      code: "UNSUPPORTED_ANATOMY",
    });
  });

  it("pins derived gait quantities to their existing physical authorities", () => {
    // Break caught: the profile could become a second source of gait timing,
    // friction, or scale and silently drift from the live physics kernel.
    const profile = getFormCapabilityProfile("wispwalker");

    expect(profile.physics.body_height_units?.value).toBe(GAIT_LAW.bodyHeightUnits);
    expect(profile.physics.cadence_max_hz?.value).toBeCloseTo(GAIT_STEP_HZ_MAX, 12);
    expect(profile.physics.support_exchange_min_seconds?.value).toBe(
      GAIT_LAW.exchangeCriticalDurationSec,
    );
    expect(profile.physics.friction_mu?.value).toBeCloseTo(PHI_LAW.frictionMu, 12);
    expect(profile.physics.friction_mu?.authority).toBe("environment");
    expect(profile.physics.friction_mu).toMatchObject({
      label: "Surface friction",
      application: "environment_input",
      tunable: true,
    });
    expect(
      Object.values(profile.physics).every(
        (quantity) => quantity.meaning.length > 0 && quantity.affectedObservables.length > 0,
      ),
    ).toBe(true);
  });

  it("leaves absolute mass and inertia unresolved and blocks primitives that require them", () => {
    // Break caught: monocular video or a guessed constant could fabricate
    // absolute force truth and allow a launch that the body cannot prove safe.
    const profile = getFormCapabilityProfile("wispwalker");

    expect(profile.physics.mass_kg).toMatchObject({
      status: "requires_calibration",
      authority: "form",
    });
    expect(profile.physics.mass_kg?.value).toBeUndefined();
    expect(profile.physics.mass_kg?.safeMin).toBeUndefined();
    expect(profile.physics.mass_kg?.safeMax).toBeUndefined();
    expect(validatePrimitiveAgainstForm({ id: "launch", supportCount: 2 }, profile)).toMatchObject({
      ok: false,
      code: "CALIBRATION_REQUIRED",
      missingCalibration: ["mass_kg", "inertia_kg_m2"],
    });
  });

  it("rejects unsupported primitives and impossible support counts", () => {
    // Break caught: unknown semantic output or a malformed score could bypass
    // the form gate and reach a runtime driver as if it were executable.
    const profile = getFormCapabilityProfile("wispwalker");

    expect(validatePrimitiveAgainstForm({ id: "teleport", supportCount: 0 }, profile)).toMatchObject({
      ok: false,
      code: "UNSUPPORTED_PRIMITIVE",
    });
    expect(validatePrimitiveAgainstForm({ id: "support_exchange", supportCount: 3 }, profile)).toMatchObject({
      ok: false,
      code: "SUPPORT_COUNT_MISMATCH",
    });
  });
});
