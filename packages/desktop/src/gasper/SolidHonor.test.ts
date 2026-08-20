import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const renderer = readFileSync(new URL("./assets/all-script-3.js", import.meta.url), "utf8");

describe("GASPER-SOLID-001 — two-mass = one-pearl", () => {
  it("names the residual, C0 restore, and C4 meridian hull", () => {
    expect(renderer).toContain("two-mass = one-pearl");
    expect(renderer).toContain("C0 — V1 wrapFoot/scanline reverted");
    expect(renderer).toContain("function sausageHull");
    expect(renderer).toContain("function meridianHull");
    expect(renderer).toContain("function pearlContour");
    expect(renderer).toContain("card = closed-pearl");
    expect(renderer).toContain("formSolid='inflate-contour'");
    expect(renderer).toContain("const sil=pearlContour");
  });

  it("does not let scanline or wrapFoot write #body", () => {
    const identity = renderer.indexOf("if(!fabricLive){");
    const wrapUse = renderer.indexOf("zFoot=zAmp*Math.sin(hoopTh[s])", identity);
    expect(wrapUse).toBe(-1);
    const orbit = renderer.indexOf("C4 — occluding contour");
    expect(orbit).toBeGreaterThan(0);
    expect(renderer.indexOf("const sil=cageSilhouette", orbit)).toBe(-1);
  });

  it("C1 fill does not drop z<0 while orbiting", () => {
    expect(renderer).toContain("function superlevelCell");
    expect(renderer).toContain("if(z<0&&!orbitingNow()) return null");
    expect(renderer).toContain("z<0-drop = occlusion");
    expect(renderer).toContain("function hullFrontPath");
  });

  it("rest loft stays offset isolines of the live 512", () => {
    expect(renderer).toContain("Identity rest: offset isolines of the live 512");
    expect(renderer).toContain("Ring 24 glued to the live 512");
    expect(renderer).not.toContain("pts = occupiedOutline");
  });
});
