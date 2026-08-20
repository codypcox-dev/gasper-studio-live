import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const renderer = readFileSync(new URL("./assets/all-script-3.js", import.meta.url), "utf8");

describe("GASPER-SOLID-001 C0 restore", () => {
  it("identity Z is F1 polar sine, not wrapFoot", () => {
    expect(renderer).toContain("const th3=(s/S)*Math.PI*2");
    expect(renderer).toContain("zAmp=inset[s]*0.46");
    expect(renderer).toContain("liveGridXYZ[i*3+2]=zAmp*Math.sin(th3)*Math.sqrt(Math.max(0,1-v*v))");
    expect(renderer).toContain("two-mass = one-pearl");
    expect(renderer).toContain("C0 — V1 wrapFoot/scanline reverted");
    expect(renderer).not.toContain("zStem*(1-fw)+zFoot*fw");
  });

  it("orbit #body is the inflate occluding contour, not a scanline of interiors", () => {
    expect(renderer).toContain("function pearlContour");
    expect(renderer).toContain("formSolid='inflate-contour'");
    expect(renderer).toContain("formOutline='hz-loop'");
    expect(renderer).toContain("card = closed-pearl");
    const orbit = renderer.indexOf("C4 — occluding contour");
    expect(orbit).toBeGreaterThan(0);
    expect(renderer.indexOf("cageSilhouette(liveGridXYZ", orbit)).toBe(-1);
  });

  it("wrapFoot / cageSilhouette remain as unused helpers, not writers", () => {
    expect(renderer).toContain("const wrapFoot=(arr)=>{");
    expect(renderer).toContain("function cageSilhouette");
    expect(renderer).toContain("function polarSilhouette");
    expect(renderer).toContain("dataset.formHoop");
    expect(renderer).toContain("dataset.sineShare");
  });

  it("keeps F1 flattening and rest isolines", () => {
    expect(renderer).toContain("Identity rest: offset isolines of the live 512");
    expect(renderer).toContain("Ring 24 glued to the live 512");
    expect(renderer).toContain("zAmp=inset[s]*0.46");
    expect(renderer).toContain("union-at-rest = canonical");
  });
});
