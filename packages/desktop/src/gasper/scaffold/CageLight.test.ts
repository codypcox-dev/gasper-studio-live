import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CAGE_LIGHTS,
  CAGE_LIGHT_LAW,
  cageNormalAt,
  fieldHasEnergy,
  lightCageVertex,
  rotateLightXY,
} from "./CageLight";

const painter = readFileSync(new URL("../assets/all-script-3.js", import.meta.url), "utf8");

describe("cage light on the 1000", () => {
  it("is n·L on every vertex, not glued ellipses", () => {
    expect(CAGE_LIGHT_LAW).toBe("n-dot-L-on-1000");
    expect(CAGE_LIGHTS).toHaveLength(3);
    const px = new Float64Array(1000);
    const py = new Float64Array(1000);
    const h = new Float64Array(1000);
    for (let r = 0; r < 25; r++) {
      for (let s = 0; s < 40; s++) {
        const i = r * 40 + s;
        px[i] = s;
        py[i] = r * 2;
        h[i] = r === 12 && s === 10 ? 1 : 0;
      }
    }
    const bump = lightCageVertex(cageNormalAt(px, py, h, 12, 10, 6), CAGE_LIGHTS);
    const flat = lightCageVertex(cageNormalAt(px, py, h, 4, 4, 6), CAGE_LIGHTS);
    expect(Math.hypot(bump.nx, bump.ny, bump.nz)).toBeCloseTo(1, 6);
    expect(bump.lam + bump.spec).toBeGreaterThan(0);
    expect(Math.abs(bump.nx) + Math.abs(bump.ny)).toBeGreaterThan(Math.abs(flat.nx) + Math.abs(flat.ny));
    const spun = rotateLightXY(CAGE_LIGHTS[0]!, 25);
    expect(Math.hypot(spun.x, spun.y)).toBeCloseTo(Math.hypot(CAGE_LIGHTS[0]!.x, CAGE_LIGHTS[0]!.y), 6);
    expect(fieldHasEnergy(h)).toBe(true);
    expect(fieldHasEnergy(new Float32Array(1000))).toBe(false);
  });

  it("painter shades the 1000 with view-fixed lights and paints captured protrude", () => {
    expect(painter).toContain("shadeCagePoints");
    expect(painter).toContain("viewFixedLights");
    expect(painter).toContain("_lastLightTiltDeg");
    expect(painter).toContain("avatar.dataset.cageSpecX");
    expect(painter).toContain("function paintCageFill");
    expect(painter).toContain("overlay-ellipse = cage-surface");
    expect(painter).not.toContain("stop-color','#fffaff'");
    expect(painter).not.toContain("(gel)?goosePapulePaths");
    expect(painter).not.toMatch(/function goosePapulePaths[\s\S]{0,400}collectGoosePapulesLive/);
  });
});
