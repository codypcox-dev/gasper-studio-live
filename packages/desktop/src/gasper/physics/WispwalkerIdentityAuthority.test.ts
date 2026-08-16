import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  baseRadiusV63,
  formRadiusAtFor,
  WISPWALKER_CANONICAL_CONTOUR,
} from "../GasperContourSolver";
import { WISPWALKER_AUTHORING_DEFAULTS } from "../../../../gasper-studio/src/dais-first/wispwalkerAuthoringDefaults";

const here = dirname(fileURLToPath(import.meta.url));
const formMaster = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

describe("Wispwalker identity authority", () => {
  it("keeps the canonical mid-side pearl sculpt instead of the smooth egg fallback", () => {
    expect(baseRadiusV63(0)).toBeGreaterThan(baseRadiusV63(0.31) + 8);
    expect(baseRadiusV63(Math.PI)).toBeGreaterThan(baseRadiusV63(Math.PI - 0.31) + 8);

    expect(formMaster).toContain(
      "baseRadius+=6.5*(gaussAngle(th,mu-0.09,0.15)+gaussAngle(th,mu+0.09,0.15));",
    );
    expect(formMaster).toContain("baseRadius-=3.8*gaussAngle(th,mu-0.31,0.11);");
    expect(formMaster).toContain("baseRadius-=3.8*gaussAngle(th,mu+0.31,0.11);");
    expect(formMaster).not.toContain("baseRadius+=0.4*gaussAngle(th,mu,0.16)");
  });

  it("keeps two load-bearing lower roots and a real center cleft at rest", () => {
    const center = formRadiusAtFor("wispwalker", Math.PI / 2);
    const rightRoot = formRadiusAtFor("wispwalker", 1.31);
    const leftRoot = formRadiusAtFor("wispwalker", 1.83);

    expect(rightRoot).toBeGreaterThan(center + 3.5);
    expect(leftRoot).toBeGreaterThan(center + 3.5);
    expect(Math.abs(rightRoot - leftRoot)).toBeLessThan(0.25);
  });

  it("pins Cody's exact user-authored contour coefficients", () => {
    expect(WISPWALKER_AUTHORING_DEFAULTS.form).toEqual({
      crownAmp: -5,
      chinAmp: -5,
      lobeAmp: 3.2,
      cleftDepth: 3.2,
      footAmp: 4,
      armAmp: 0,
    });
    expect(WISPWALKER_AUTHORING_DEFAULTS.pose.wide).toBe(-1);
    expect(WISPWALKER_AUTHORING_DEFAULTS.expressionGain).toBe(0.85);
    expect(WISPWALKER_CANONICAL_CONTOUR).toMatchObject({
      crownAmp: -5,
      chinAmp: -5,
      lobeAmp: 3.2,
      cleftDepth: 3.2,
    });
    expect(formMaster).toContain("crownAmp:-5,");
    expect(formMaster).toContain("chinAmp:-5,");
    expect(formMaster).toContain("lobeAmp:3.2,");
    expect(formMaster).toContain("cleftDepth:3.2,");
    expect(formMaster).toContain("(_wc.footAmp??4)");
    expect(formMaster).toContain("(_wc.armAmp??0)");
    expect(formMaster).toContain("query.get('yaw')==null?8:query.get('yaw')");
    expect(formMaster).toContain("silhouetteProfile='wispwalker';setYaw(8);");
    expect(formMaster).toContain("current={...EMOTION_FIXTURES[state],wide:-1}");
    expect(WISPWALKER_AUTHORING_DEFAULTS.rig.yawDegrees).toBe(8);
  });

  it("keeps gait deformation out of the Wispwalker identity hull", () => {
    expect(formMaster).toContain("if(silhouetteProfile==='wispwalker')return 0;");
    expect(formMaster).not.toContain("radius-=_lift*gaussAngle(th,1.83,_sig);");
    expect(formMaster).not.toContain("radius-=_lift*gaussAngle(th,1.31,_sig);");
  });
});
