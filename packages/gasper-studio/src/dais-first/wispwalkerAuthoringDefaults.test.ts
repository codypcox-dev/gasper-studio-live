import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WISPWALKER_AUTHORING_DEFAULTS as d } from "./wispwalkerAuthoringDefaults";

const railSource = readFileSync(new URL("./DaisControlRail.tsx", import.meta.url), "utf8");

describe("Cody-authored Wispwalker home profile", () => {
  it("pins the exact live 5179 settings as immutable defaults", () => {
    expect(d).toEqual({
      expressionGain: 0.85,
      rig: {
        reliefAmplitude: 1,
        eyeOpenness: 0.55,
        energyLevel: 0.52,
        yawDegrees: 8,
      },
      pose: {
        asym: 0,
        bodyLean: 0,
        postureX: 0,
        postureY: 0,
        wide: -1,
      },
      form: {
        crownAmp: -5,
        chinAmp: -5,
        lobeAmp: 3.2,
        cleftDepth: 3.2,
        footAmp: 4,
        armAmp: 0,
      },
      behavior: {
        walkAmp: 0.5,
        walkPeriodSeconds: 1.25,
        walkAccent: 0.6,
        stepDepth: 4,
        walkEnabled: 1,
        viscoTau: 0.25,
      },
      physics: {
        gravityScale: 1,
        restitution: 0.62,
        launchPower: 1,
        intensity: 0.7,
      },
      craft: {
        exaggeration: 1.25,
        tempo: 1,
        shotBias: "authored",
      },
    });
    expect(Object.isFrozen(d)).toBe(true);
    expect(Object.isFrozen(d.form)).toBe(true);
  });

  it("wires the canonical profile into fresh load, selection, and reset", () => {
    expect(railSource).toContain("applyWispwalkerHomeProfile");
    expect(railSource).toContain("WISPWALKER_AUTHORING_DEFAULTS.form.crownAmp");
    expect(railSource).toContain("WISPWALKER_AUTHORING_DEFAULTS.form.footAmp");
    expect(railSource).toContain("selectEmbodiment(adapter, \"wispwalker\")");
    expect(railSource).toContain("canonical Wispwalker home");
  });
});
