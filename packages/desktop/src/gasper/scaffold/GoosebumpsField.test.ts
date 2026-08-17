import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hexSiteDistance } from "./HexCube";
import {
  GOOSE_AMPLITUDE,
  GOOSE_COARSE,
  GOOSE_FINE,
  GOOSE_LAW,
  GOOSE_METRIC,
  GOOSE_SHADE,
  collectGoosePapules,
  dermisMask,
  evaluateGooseField,
  gooseFieldEnergy,
  hexPapule,
} from "./GoosebumpsField";

const painter = readFileSync(
  new URL("../assets/all-script-3.js", import.meta.url),
  "utf8",
);

describe("goose follicle lattice", () => {
  it("raises a cube-metric lattice on the 1000, not freckles", () => {
    const field = evaluateGooseField(GOOSE_AMPLITUDE);
    expect(field.length).toBe(1000);
    const { live, peak, rms } = gooseFieldEnergy(field);
    expect(live).toBeGreaterThan(200);
    expect(peak).toBeGreaterThan(0.6);
    expect(rms).toBeGreaterThan(0.06);
    expect(dermisMask(0.05)).toBe(0);
    expect(dermisMask(0.55)).toBe(1);
    expect(hexPapule(0.2, 0.5, 10, 4)).toBeGreaterThan(0.9);
    expect(GOOSE_LAW).toBe("follicle-lattice-on-1000");
    expect(GOOSE_SHADE).toBe("rounded-mound-at-hex-site");
    expect(GOOSE_METRIC).toBe("cube-hex");
    expect(GOOSE_COARSE.fu).toBe(10);
    expect(GOOSE_COARSE.fv).toBe(4);
    expect(GOOSE_FINE.kind).toBe("dual");
    expect(40 % GOOSE_COARSE.fu).toBe(0);
    expect(20 % GOOSE_COARSE.fu).toBe(0);
  });

  it("lands every coarse site on a cage vertex", () => {
    const field = evaluateGooseField(GOOSE_AMPLITUDE);
    const sites = collectGoosePapules(field);
    expect(sites.length).toBeGreaterThan(16);
    expect(sites.length).toBeLessThan(40);
    expect(sites.every((p) => p.octave === "coarse")).toBe(true);
    expect(sites.every((p) => dermisMask(p.v) > 0)).toBe(true);
    for (const p of sites) {
      expect(Math.abs(p.u * 40 - p.sector) < 1e-6 || p.sector === 0).toBe(true);
      expect(hexSiteDistance(p.u, p.v, 10, 4)).toBeLessThan(1e-9);
    }
  });

  it("C6 turn moves the lattice and six turns restore it", () => {
    const a = evaluateGooseField(GOOSE_AMPLITUDE, 0);
    const b = evaluateGooseField(GOOSE_AMPLITUDE, 1);
    let moved = 0;
    for (let i = 0; i < a.length; i++) if (Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > 0.04) moved += 1;
    expect(moved).toBeGreaterThan(80);
    const back = evaluateGooseField(GOOSE_AMPLITUDE, 6);
    let err = 0;
    for (let i = 0; i < a.length; i++) err += Math.abs((a[i] ?? 0) - (back[i] ?? 0));
    expect(err).toBeLessThan(1e-9);
  });

  it("paints rounded mounds at hex sites and keeps the rim — cube kernel, no xAlt", () => {
    expect(painter).toContain("stampGooseField");
    expect(painter).toContain("hexPapule");
    expect(painter).toContain("cubeRotate60");
    expect(painter).toContain("cubeRotate60About");
    expect(painter).toContain("auth.turns");
    expect(painter).toContain("uvToCube");
    expect(painter).toContain("hexSiteDistance");
    expect(painter).toContain("hexDualDistance");
    expect(painter).toContain("collectGoosePapulesLive");
    expect(painter).toContain("goosePapulePaths");
    expect(painter).toContain("displaceVertexScreen");
    expect(painter).toContain("scaffoldRimFromRelief");
    expect(painter).toMatch(/goose\?stampGooseField\(\)/);
    expect(painter).toContain("mergeFabric");
    expect(painter).toContain("scaffoldRimFromFabric");
    expect(painter).not.toContain("(gel)?goosePapulePaths");
    expect(painter).not.toContain("xAlt");
    expect(painter).not.toContain("GOOSE_STAMPS");
    expect(painter).not.toContain("goosebumpsVectorPaths");
    expect(painter).not.toContain("gooseMeshStipple");
    expect(painter).not.toContain("function goosebumpsSurfacePaths");
    expect(painter).not.toMatch(/function stampGooseField[\s\S]{0,900}Math\.sin\(t\*/);
    expect(painter).not.toMatch(/if\s*\(\s*goose\s*\)\s*publishScaffoldRimZero/);
  });
});
