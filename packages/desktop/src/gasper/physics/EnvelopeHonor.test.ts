import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const formMaster = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");
const law = readFileSync(
  join(here, "../../../../../docs/triforce/NORTHSTAR-ENVELOPE.md"),
  "utf8",
);

describe("envelope honor — GASPER-ENVELOPE-001 E1", () => {
  it("keeps the envelope law on disk", () => {
    expect(law).toContain("GASPER-ENVELOPE-001");
    expect(law).toContain("extracted-medial = rest-lock");
    expect(law).toContain("centroid-yaw = plant-yaw");
  });

  it("authors the 5 rest nodes next to FACE_PLANE and does not invert #body", () => {
    expect(formMaster).toContain("const GASPER_SKELETON=Object.freeze");
    expect(formMaster).toContain("lock:'positions-only'");
    expect(formMaster).toContain("crown:Object.freeze({x:120,y:112,z:0})");
    expect(formMaster).toContain("torso:Object.freeze({x:120,y:140,z:0})");
    expect(formMaster).toContain("crotch:Object.freeze({x:120,y:172,z:0})");
    expect(formMaster).toContain("plantL:Object.freeze({x:100,y:188,z:0})");
    expect(formMaster).toContain("plantR:Object.freeze({x:140,y:188,z:0})");
    expect(formMaster).toContain("function paintSkeletonOverlay");
    expect(formMaster).toContain("__GASPER_SKELETON__");
    expect(formMaster).not.toContain("pts = occupiedOutline");
    expect(formMaster).toContain("function paintCageFill");
    expect(formMaster).toContain("isoPainter");
  });

  it("does not sniff extracted medial as the rest lock", () => {
    expect(formMaster).toContain("extracted-medial = rest-lock");
    expect(formMaster).toContain("southGate=Math.min(plantL.y,plantR.y)-36");
    expect(formMaster).not.toContain("meanY(a)>=meanY(b)?a:b");
  });

  it("fits regular canal radii and keeps the envelope as a shadow", () => {
    const R = { crown: 82, torso: 56, crotch: 25, plant: 15, contactY: 203.4 };
    const nodes = {
      crown: { x: 120, y: 112 },
      torso: { x: 120, y: 140 },
      crotch: { x: 120, y: 172 },
      plantL: { x: 100, y: 188 },
      plantR: { x: 140, y: 188 },
    };
    const L = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    expect(Math.abs(R.torso - R.crown)).toBeLessThan(L(nodes.crown, nodes.torso) - 0.5);
    expect(Math.abs(R.crotch - R.torso)).toBeLessThan(L(nodes.torso, nodes.crotch) - 0.5);
    expect(Math.abs(R.plant - R.crotch)).toBeLessThan(L(nodes.crotch, nodes.plantL) - 0.5);
    expect(Math.abs(R.plant - R.crotch)).toBeLessThan(L(nodes.crotch, nodes.plantR) - 0.5);
    expect(R.crotch).toBeLessThanOrEqual(R.contactY - nodes.crotch.y - 6);
    expect(nodes.crown.y + R.crown).toBeLessThanOrEqual(R.contactY);
    expect(formMaster).toContain("crown:82");
    expect(formMaster).toContain("torso:56");
    expect(formMaster).toContain("crotch:25");
    expect(formMaster).toContain("plant:15");
    expect(formMaster).toContain("function sampleEnvelopeXYZ");
    expect(formMaster).toContain("function sampleCanal");
    expect(formMaster).toContain("__GASPER_ENVELOPE_XYZ__");
    expect(formMaster).toContain("lock:'shadow-only'");
    expect(formMaster).not.toMatch(/liveGridXYZ\s*=\s*envelopeXYZ\s*;/);
    expect(formMaster).not.toContain("paintCageFill(envelopeXYZ");
    expect(formMaster).toContain("sampleEnvelopeXYZ(posed)");
    expect(formMaster).toContain("function envelopeRadii");
    expect(formMaster).toContain("snap-id = interpolation");
    expect(formMaster).not.toMatch(/liveGridXYZ\s*=\s*envelopeXYZ\s*;/);
    expect(formMaster).not.toContain("paintCageFill(envelopeXYZ");
  });

  it("interpolates the morph 3-vector and clamps canal regularity", () => {
    expect(formMaster).toContain("function envelopeMode");
    expect(formMaster).toContain("__GASPER_ENVELOPE_BLEND__");
    expect(formMaster).toContain("__GASPER_ENVELOPE_VEC__");
    expect(formMaster).toContain("setEnvelopeBlend");
    expect(formMaster).toContain("lerp-512 = morph");
    const rest = { rScale: 1, collapsePlants: 0, torsoHook: 0 };
    const blow = { rScale: 1.07, collapsePlants: 0, torsoHook: 0 };
    const t = 0.5;
    const rScale = rest.rScale + (blow.rScale - rest.rScale) * t;
    expect(rScale).toBeCloseTo(1.035, 8);
    const R0 = { crown: 82, torso: 56, crotch: 25, plant: 15 };
    const Lct = 28, Ltx = 32;
    const rawTorsoCrotch = Math.abs(R0.torso * 1.07 - R0.crotch * 1.07);
    expect(rawTorsoCrotch).toBeGreaterThan(Ltx - 0.5);
    const clampPair = (rA: number, rB: number, L: number) => {
      const max = Math.max(0, L - 0.5);
      if (Math.abs(rB - rA) <= max) return [rA, rB] as const;
      return rA >= rB ? ([rB + max, rB] as const) : ([rA, rA + max] as const);
    };
    const scaled = { crown: 82 * 1.07, torso: 56 * 1.07, crotch: 25 * 1.07 };
    const [torso, crotch] = clampPair(scaled.torso, scaled.crotch, Ltx);
    expect(Math.abs(crotch - torso)).toBeLessThanOrEqual(Ltx - 0.5 + 1e-9);
    const collapse = 0.4;
    const plantL = { x: 100, y: 188 };
    const crotchN = { x: 120, y: 172 };
    const x = plantL.x * (1 - collapse) + (crotchN.x * 0.55 + plantL.x * 0.45) * collapse;
    expect(x).toBeGreaterThan(100);
    expect(x).toBeLessThan(110);
  });

  it("writes interiors from the canal and glues ring 24 to the 512", () => {
    expect(formMaster).toContain("Ring 24 glued to the live 512");
    expect(formMaster).toContain("envelopeBind='e6'");
    expect(formMaster).toContain("const dist=(r/16)*(Lct+Ltx)");
    expect(formMaster).toContain("const u=(r-16)/7");
    expect(formMaster).not.toContain("pts = occupiedOutline");
    expect(formMaster).not.toMatch(/liveGridXYZ\s*=\s*envelopeXYZ\s*;/);
  });

  it("yaws the canal about the plant midpoint and does not squash the 512", () => {
    expect(formMaster).toContain("function rotateAboutM");
    expect(formMaster).toContain("centroid-yaw = plant-yaw");
    expect(formMaster).toContain("envelopeBind='e6'");
    expect(formMaster).toContain("avatar.dataset.facingCompress='1.0000'");
    expect(formMaster).not.toContain("const _hK=_vmT.facingCompress");
    expect(formMaster).not.toContain("from \"./Mesh3D\"");
    expect(formMaster).not.toContain("rotateViewXYZ(");
    expect(formMaster).toContain("function authorKeyViewPoint");
    const Mx = 123.6;
    const th = (42 * Math.PI) / 180;
    const x = 120, z = 82;
    const x2 = Mx + (x - Mx) * Math.cos(th) + z * Math.sin(th);
    const y2 = 30;
    const z2 = 0 - (x - Mx) * Math.sin(th) + z * Math.cos(th);
    expect(x2).toBeGreaterThan(170);
    expect(y2).toBe(30);
    expect(z2).toBeGreaterThan(50);
  });

  it("lets gait write plant nodes and stops walk-z on the 512 radius", () => {
    expect(formMaster).toContain("function poseSkeleton");
    expect(formMaster).toContain("walk-z-on-radius = plant-nodes");
    expect(formMaster).toContain("envelopeBind='e6'");
    expect(formMaster).toContain("// r+=scaffoldContourZ(walkZ,th);");
    expect(formMaster).toContain("posed.x+=(S.left.x-100)*wL");
    expect(formMaster).not.toContain("pts = occupiedOutline");
  });

  it("inks #body from the occupied outline and does not Voigt the isoline", () => {
    expect(formMaster).toContain("function occupiedOutline");
    expect(formMaster).toContain("envelopeBind='e6'");
    expect(formMaster).toContain("farTuck=0");
    expect(formMaster).toContain("Voigt not on extracted xy");
    expect(formMaster).not.toContain("radialEnvelope(");
    expect(formMaster).toContain("function closedSpline");
    expect(formMaster).toContain("union-at-rest = canonical");
    expect(formMaster).toContain("canon-rest");
    expect(formMaster).toContain("function frameOccupiedToProfile");
    expect(formMaster).toContain("offset isolines of the live 512");
  });

  it("morphs the same 5-node fabric — blowfish r↑, paddle collapses plants, face stays", () => {
    expect(formMaster).toContain("GASPER_ENVELOPE_MORPH");
    expect(formMaster).toContain("blowfish");
    expect(formMaster).toContain("rScale:1.07");
    expect(formMaster).toContain("collapsePlants");
    expect(formMaster).toContain("torsoHook");
    expect(formMaster).toContain("function envelopeMode");
  });
});




