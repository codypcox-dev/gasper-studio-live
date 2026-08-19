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
});
