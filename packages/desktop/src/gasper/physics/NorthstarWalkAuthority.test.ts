/**
 * N332 — Sol architect correction of N329 walk.
 * Source pins only. Pixels remain Cody's (S3).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  GAIT_LOBE,
  GAIT_SUPPORT_PAY,
  gaitChinKeepWeight,
  gaitLiveGate,
  gaitSwingArticulateWeight,
} from "./GaitLaw";
import { READABLE_THREE_QUARTER_DEG } from "./RadialFacingLaw";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");
const controller = readFileSync(join(here, "..", "GasperRigController.ts"), "utf8");
const driver = readFileSync(join(here, "..", "physics", "WorldPhysicsDriver.ts"), "utf8");

describe("N332 walk — plant, lobe lift, advance, support payment", () => {
  it("(a) cyan/contact consumes plantedScreenXUnits without whole-body plantHoldX", () => {
    expect(script).not.toContain("const _cyanPlant=0;");
    expect(script).toContain("const _cyanPlant=");
    expect(script).toContain("physGait.plantedScreenXUnits");
    expect(script).toContain("cyanFieldNode.setAttribute('transform'");
    expect(script).toContain("_cyanPlant");
    expect(script).not.toContain("_plantHoldX");
    expect(script).not.toContain("_contactHoldX");
    expect(script).toContain("wDx=(worldPoseCurrent.x/WORLD_SPACE.unitsPerContentPx)*wScale");
  });

  it("(b) swingAdvanceUnits has a real renderer consumer on the swing lobe", () => {
    expect(script).toContain("physGait.swingAdvanceUnits");
    expect(script).toContain("posed.x+=_advPx*_swingArtW");
    expect(driver).toContain("swingAdvanceUnits: gaitExpressionGate * lobe.swingAdvanceUnits");
  });

  it("(c) rejected overnight posed.y / tuck / plant-hold path stays absent", () => {
    expect(script).not.toContain("posed.y+=_dropPx*_lobeLoadW-_liftPx*_lobeSwingW");
    expect(script).not.toContain("_tuckPx*_lobeSwingW");
    expect(script).not.toContain("const _cleftKeep=");
    expect(script).not.toContain("_plantHoldX");
    expect(script).not.toContain("_contactHoldX");
    expect(script).not.toContain("posed.x+=_plantPx*_baseW*_lobeW");
  });

  it("(d) support COM + counter-lean are bounded, not the 224u root sway", () => {
    expect(GAIT_SUPPORT_PAY.lateralPx).toBeGreaterThanOrEqual(6);
    expect(GAIT_SUPPORT_PAY.lateralPx).toBeLessThanOrEqual(10);
    expect(GAIT_LOBE.comShiftMinUnits / 8).toBeGreaterThanOrEqual(22);
    expect(script).toContain("const _payXPx=");
    expect(script).toContain("_payXPx");
    expect(script).toContain("idleLeanDeg");
    expect(script).not.toContain(
      "wDx=((worldPoseCurrent.x+physGait.swayXUnits*gaitGate)/WORLD_SPACE.unitsPerContentPx)*wScale",
    );
    expect(script).toContain("wDx=(worldPoseCurrent.x/WORLD_SPACE.unitsPerContentPx)*wScale");
    expect(script).toContain("wTilt=worldPoseCurrent.tilt;");
  });

  it("(e) rest/seat collapses lift/advance/payment continuously", () => {
    expect(gaitLiveGate(0, false, 1)).toBe(0);
    expect(gaitLiveGate(1, false, 1)).toBe(1);
    expect(gaitLiveGate(0.13, false, 1)).toBe(1);
    expect(gaitLiveGate(1, true, 0)).toBe(0);
    expect(gaitLiveGate(1, true, 0.4)).toBeCloseTo(0.4, 8);
    expect(script).toContain("const _gaitLive=");
    expect(script).toContain("physGait.seated");
    expect(script).toContain("physGait.leftoverSway");
    expect(script).not.toContain(
      "const _stepping=physGait.speedRatio>0.01&&_side!==0;",
    );
    expect(script).toContain("42*Math.max(0,Math.min(1,(Number(physGait.swingLiftUnits)||0)/(68*8)))");
  });

  it("(f) seq18 form/face identity carve is untouched", () => {
    expect(script).toContain("const _wcc=WISPWALKER_CANONICAL_CONTOUR;");
    expect(script).toContain(
      "radius+=(_wc.crownAmp??_wcc.crownAmp)*gaussAngle(th,_wcc.crownTheta,_wcc.crownSigma);",
    );
    expect(script).toContain(
      "radius-=_wcc.lowerBowlTrimAmp*gaussAngle(th,_wcc.lowerBowlTrimTheta,_wcc.lowerBowlTrimSigma);",
    );
    expect(script).toContain(
      "radius+=(_wc.chinAmp??_wcc.chinAmp)*gaussAngle(th,_wcc.chinTheta,_wcc.chinSigma);",
    );
    expect(script).toContain(
      "radius+=(_wc.lobeAmp??_wcc.lobeAmp)*(gaussAngle(th,_wcc.leftLobeTheta,_wcc.lobeSigma)+gaussAngle(th,_wcc.rightLobeTheta,_wcc.lobeSigma));",
    );
    expect(script).toContain(
      "radius+=(_wc.rootAmp??_wcc.rootAmp)*(gaussAngle(th,_wcc.leftRootTheta,_wcc.rootSigma)+gaussAngle(th,_wcc.rightRootTheta,_wcc.rootSigma));",
    );
    expect(script).toContain(
      "radius-=(_wc.cleftDepth??_wcc.cleftDepth)*gaussAngle(th,_wcc.cleftTheta,_wcc.cleftSigma);",
    );
    expect(script).not.toContain("setRecess(eyeLRecess,faceAnchors.eyeL,24,11)");
  });

  it("(g) one WorldPhysicsDriver writer; travel stays on body.x", () => {
    const playStart = controller.indexOf("playNorthstarTwenty");
    const playEnd = controller.indexOf("N187 — file a grounded strut", playStart);
    const play = controller.slice(playStart, playEnd);
    expect(script).toContain("wDx=(worldPoseCurrent.x/WORLD_SPACE.unitsPerContentPx)*wScale");
    expect(play).toContain("this.fileStrutLocomotion({ x: 980, z: 0, cruise: 200 })");
    expect(play).not.toContain("gsap.");
    expect(play).not.toMatch(/setWorldPose\s*\(/);
  });

  it("swing lift does not notch the chin — chin keep zeros the bite", () => {
    const chin = Math.PI / 2;
    expect(gaitChinKeepWeight(chin)).toBeGreaterThan(0.95);
    expect(gaitSwingArticulateWeight(chin, 1)).toBeLessThan(0.08);
    expect(gaitSwingArticulateWeight(1.83, 1)).toBeGreaterThan(0.55);
    expect(gaitSwingArticulateWeight(1.31, 1)).toBeLessThan(0.2);
    expect(script).not.toContain("radius-=_lift*gaussAngle(th,1.83,_sig);");
    expect(script).not.toContain("radius-=_lift*gaussAngle(th,1.31,_sig);");
    expect(script).toContain("posed.y-=_liftPx*_swingArtW");
    expect(script).toContain("_chinKeep");
  });

  it("walk proof uses readable 3/4, not heading 0", () => {
    expect(READABLE_THREE_QUARTER_DEG).toBe(22);
    const playStart = controller.indexOf("playNorthstarTwenty");
    const playEnd = controller.indexOf("N187 — file a grounded strut", playStart);
    const play = controller.slice(playStart, playEnd);
    expect(play).toContain("READABLE_THREE_QUARTER_DEG");
    expect(play).toContain("-READABLE_THREE_QUARTER_DEG");
    expect(play).toContain("this.headingPinDeg = 0");
    expect(play).toContain('rig?.setYaw?.(8)');
    expect(play).toContain('fire("strut-go", 2.618, t');
    expect(play).toContain("if (t < 2.618) this.headingPinDeg = 0");
  });
});
