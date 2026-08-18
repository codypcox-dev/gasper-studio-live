import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const formMaster = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");
const chase = readFileSync(
  join(here, "../../../../../docs/triforce/NORTHSTAR-CAGED-HULL.md"),
  "utf8",
);

describe("cage hull honor — chase GASPER-CAGED-HULL-001", () => {
  it("keeps the chase document as law", () => {
    expect(chase).toContain("GASPER-CAGED-HULL-001");
    expect(chase).toContain("light-deaf-to-gait");
    expect(chase).toContain("Hull locked to grid");
    expect(chase).toContain("Spec must travel");
  });

  it("keeps far tuck and near push on the existing view deform", () => {
    expect(formMaster).toContain(
      "const nearExpansion=3.6*turn*Math.pow(Math.max(0,mx),.78)*lobeBand,farTuck=4.8*turn*Math.pow(Math.max(0,-mx),.78)*lobeBand;",
    );
    expect(formMaster).not.toContain("radius+=7.2*(gaussAngle(th,0.02,0.17)");
    expect(formMaster).toContain("g.replaceChildren();");
    expect(formMaster).toContain("g.setAttribute('opacity','0');");
    expect(chase).toContain("Canonical appearance");
    expect(chase).toContain("No extra ear term");
    expect(formMaster).toContain("function muteHardHighlights()");
    expect(formMaster).toContain("const loft=globalThis.__GASPER_SHADE_LOFT__");
    expect(formMaster).toContain("avatar.dataset.cageSpecX");
    expect(formMaster).not.toContain("stop-color','#fffaff'");
    expect(formMaster).toContain("function paintScaffoldGrid(contour,profile)");
    expect(formMaster).not.toContain("farTuck=0.0*turn");
  });

  it("mutes the ribbon lobe writer so the 512 contour is the nub", () => {
    expect(formMaster).toContain(
      "leftLobeShade,rightLobeShade,leftLobeVolume,rightLobeVolume,leftLobeAura,rightLobeAura",
    );
    expect(formMaster).toContain("if(containedLobeMaterial)containedLobeMaterial.setAttribute('opacity','0');");
    expect(formMaster).toContain("_d[1].setAttribute('opacity','0');");
  });

  it("lofts the live contour for the grid and drops back-facing meridians", () => {
    expect(formMaster).toContain("z0=58*Math.sqrt(Math.max(0,1-v*v))");
    expect(formMaster).not.toContain("z*Math.cos((s/S)*Math.PI*2-_cageYaw)");
    expect(formMaster).toContain("ox*syaw+z0*cyaw");
    expect(formMaster).toContain("if(p.z<0)");
    expect(formMaster).toContain("function setOrbit(yaw,pitch)");
    expect(formMaster).toContain("orbitYawDegrees");
    expect(formMaster).toContain("58*Math.sqrt(Math.max(0,1-v*v))");
    expect(chase).toContain("360 cage orbit");
    expect(chase).toContain("Proof ritual");
  });
});
