import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

describe("N348 plant-gated Kelvin–Voigt τ", () => {
  it("gates _lp with the same plant gauss as pose, floor 0.02, no E/η knobs", () => {
    expect(script).toContain("const VISCO_TAU_PLANT = 0.02");
    expect(script).toContain("const _gatePlant=_gaitLive>0.004&&_side!==0");
    expect(script).toContain("const _thPlant=_side>0?1.31:1.83");
    expect(script).toContain("viscoTau+w*(VISCO_TAU_PLANT-viscoTau)");
    expect(script).toContain("r.th??r.theta");
    expect(script).not.toContain("kelvin_E");
    expect(script).not.toContain("kelvin_eta");
    expect(script).toContain("const VISCO_TAU_REST = 0.42");
    expect(script).toContain("__GASPER_VISCO_SNAP__");
    expect(script).toContain("(1-restHold)");
  });
});
