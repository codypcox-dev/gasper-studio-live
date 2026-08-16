import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const renderer = readFileSync(new URL("../assets/all-script-3.js", import.meta.url), "utf8");

describe("world pose paint — body.x moves painted screen pixels", () => {
  it("applies in-flight physics pose even when motionStrength is zero", () => {
    const poseStart = renderer.indexOf("const gaitGate=motionStrength>0.001?1:0;");
    const telemetryStart = renderer.indexOf("avatar.dataset.worldPoseX", poseStart);
    const poseBlock = renderer.slice(poseStart, telemetryStart);
    expect(poseBlock).toContain("if(worldPoseTarget.provenance==='none')");
    expect(poseBlock).not.toContain("||motionStrength<=0.001");
    expect(poseBlock).toContain(
      "else{worldPoseCurrent.x=worldPoseTarget.x;worldPoseCurrent.y=worldPoseTarget.y;worldPoseCurrent.z=worldPoseTarget.z;worldPoseCurrent.tilt=worldPoseTarget.tilt;}",
    );
    expect(poseBlock).toContain(
      "wDx=(worldPoseCurrent.x/WORLD_SPACE.unitsPerContentPx)*wScale",
    );
    expect(poseBlock).toContain("wTilt=worldPoseCurrent.tilt;");
    expect(poseBlock).not.toContain("wTilt=worldPoseCurrent.tilt+physGait.rollDeg");
  });

  it("a body.x change of 400 world units moves worldRig by 50 content px at home depth", () => {
    const unitsPerContentPx = 8;
    const homeViewDistance = 1920;
    const z = 0;
    const wScale = homeViewDistance / (homeViewDistance + z);
    const wDx = (bodyX: number) => (bodyX / unitsPerContentPx) * wScale;
    expect(wDx(0)).toBe(0);
    expect(wDx(400)).toBe(50);
    expect(wDx(400) - wDx(0)).toBe(50);
    expect(Math.abs(wDx(400) - wDx(0)) > 1).toBe(true);
  });
});
