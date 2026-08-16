import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const renderer = readFileSync(new URL("../assets/all-script-3.js", import.meta.url), "utf8");

describe("wave identity render leftovers", () => {
  it("keeps both foot roots present so the walk reads as posture, not a pop-in limb", () => {
    expect(renderer).toContain("const _loaded=Math.max(0.28,Math.min(1,_supportShare))");
    expect(renderer).toContain("const _free=Math.max(0.22,1-_loaded)");
    expect(renderer).not.toContain("plantR=_supportSigned>0?_supportShare:0;plantL=_supportSigned<0?_supportShare:0;");
  });

  it("darkens, scales, and shears the drop shadow from published contact/support", () => {
    expect(renderer).toContain("const _supportLoad=Math.max(_contactLoad,_flattenLoad)*gaitGate");
    expect(renderer).toContain("avatar.dataset.contactSupport=_supportLoad.toFixed(3)");
    expect(renderer).toContain("wShrink*(1+0.08*_supportLoad)");
    expect(renderer).toContain("Math.min(0.92,lerp(.78,.64,lowOrbitWeight)*wFade*(1+0.16*_supportLoad))");
    expect(renderer).toContain("skewX(${_shear.toFixed(3)})");
  });

  it("already expresses wind on the contour; physics must supply both travel directions", () => {
    expect(renderer).toContain("function windStretchRadiusDelta(th)");
    expect(renderer).toContain("const _wrd=windStretchRadiusDelta(th);if(_wrd!==0)radius+=_wrd;");
  });
});
