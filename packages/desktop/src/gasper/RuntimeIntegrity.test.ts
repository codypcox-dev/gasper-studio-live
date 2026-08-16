import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const renderer = readFileSync(new URL("./assets/all-script-3.js", import.meta.url), "utf8");

describe("GASPER-COMPOSITION-001 Wave 3 runtime integrity", () => {
  it("standalone clock contains subscriber faults instead of stopping organism time", () => {
    expect(renderer).not.toContain("running=false;clockPaused=true;stopDriver();console.error('[FormMaster standalone clock] subscriber fault'");
    expect(renderer).not.toContain("if(raf!=null||fault||!running||clockPaused");
    expect(renderer).not.toContain("dispatch();if(!fault&&running&&!clockPaused");
    expect(renderer).toContain("console.error('[FormMaster standalone clock] subscriber fault',error)");
  });

  it("imperative FormMaster renders do not advance the authoritative organism clock", () => {
    expect(renderer).toContain("const globalClock=globalThis.__GASPER_ORGANISM_CLOCK__");
    expect(renderer).toContain("const activeClock=globalClock&&typeof globalClock.inspect==='function'?globalClock:organismClock");
    expect(renderer).toContain("render(activeClock.nowMs?.()??organismNow(),0)");
    expect(renderer).not.toContain("return organismClock.step(0);");
  });

  it("retired velocity-wake contour deformation has no executable writer state", () => {
    expect(renderer).not.toContain("if(false)");
    expect(renderer).not.toContain("physWakeVX");
    expect(renderer).not.toContain("physWakeVY");
    expect(renderer).not.toContain("wakeEnabled:");
    expect(renderer).not.toContain("wakeK:");
    expect(renderer).not.toContain("wakePinch:");
    expect(renderer).not.toContain("wakeMax:");
    expect(renderer).toContain("setPhysicsWake(_vx,_vy){/* N36 / Wave 3: velocity-wake deformation RETIRED; compatibility no-op. */},");
    expect(renderer).toContain("avatar.dataset.wakeStretch='0.000'");
    expect(renderer).toContain("avatar.dataset.physicsWake='0.000'");
    expect(renderer).toContain("let physLight=0");
  });

  it("draws in-flight world poses exactly; only provenance none eases home", () => {
    const poseStart = renderer.indexOf("const gaitGate=motionStrength>0.001?1:0;");
    const telemetryStart = renderer.indexOf("avatar.dataset.worldPoseX", poseStart);
    expect(poseStart).toBeGreaterThanOrEqual(0);
    expect(telemetryStart).toBeGreaterThan(poseStart);
    const poseBlock = renderer.slice(poseStart, telemetryStart);
    expect(poseBlock).toContain("if(worldPoseTarget.provenance==='none')");
    expect(poseBlock).not.toContain("motionStrength<=0.001&&worldPoseTarget.provenance");
    expect(poseBlock).not.toContain("if(worldPoseTarget.provenance==='none'||motionStrength<=0.001)");
    expect(poseBlock).toContain("else{worldPoseCurrent.x=worldPoseTarget.x;worldPoseCurrent.y=worldPoseTarget.y;worldPoseCurrent.z=worldPoseTarget.z;worldPoseCurrent.tilt=worldPoseTarget.tilt;}");
    expect(poseBlock).toContain("const tau=motionStrength>0.001?WORLD_SPACE.releaseTau:0.4");
    expect(poseBlock).toContain("worldPoseCurrent.x+=(0-worldPoseCurrent.x)*home");
  });

  it("keeps view projection off persistent viscoelastic body memory", () => {
    const smooth = renderer.indexOf("smoothPts=_lp(smoothPts,pts)");
    const clone = renderer.indexOf("pts=pts.map(p=>({...p}))", smooth);
    const facing = renderer.indexOf("const _hK=_vmT.facingCompress", clone);
    expect(smooth).toBeGreaterThanOrEqual(0);
    expect(clone).toBeGreaterThan(smooth);
    expect(facing).toBeGreaterThan(clone);
    expect(renderer.slice(smooth, clone)).toContain("pts=smoothPts");
  });

  it("uses one post-facing geometry frame for shell, normals, light, and material", () => {
    const smooth = renderer.indexOf("smoothPts=_lp(smoothPts,pts)");
    const contourClone = renderer.indexOf("pts=pts.map(p=>({...p}))", smooth);
    const meshClone = renderer.indexOf("const renderMesh=(mesh||[]).map(p=>({...p}))", contourClone);
    const facing = renderer.indexOf("const _hK=_vmT.facingCompress", meshClone);
    const meshFacing = renderer.indexOf("for(const p of renderMesh)", facing);
    const normals = renderer.indexOf("normals=computeNormals(pts)", meshFacing);
    const light = renderer.indexOf("mesh:renderMesh,pts,normals", normals);
    const material = renderer.indexOf("renderMaterialRig(pts,normals,renderMesh,activeFaceAnchors,organismFrame,faceTurnVisibility,materialFacingYawDeg)", light);
    expect(contourClone).toBeGreaterThan(smooth);
    expect(meshClone).toBeGreaterThan(contourClone);
    expect(facing).toBeGreaterThan(meshClone);
    expect(meshFacing).toBeGreaterThan(facing);
    expect(normals).toBeGreaterThan(meshFacing);
    expect(light).toBeGreaterThan(normals);
    expect(material).toBeGreaterThan(light);
    expect(renderer.slice(smooth, contourClone)).not.toContain("computeNormals(pts)");
    expect(renderer).toContain("avatar.dataset.materialCoordinateFrame='post-facing'");
  });

  it("routes one effective radial yaw through geometry, vector material, fallback light, and LightRig", () => {
    expect(renderer).toContain("const materialFacingYawDeg=facingYawDeg");
    expect(renderer).toContain("yaw:materialFacingYawDeg");
    expect(renderer).toContain("renderMaterialRig(pts,normals,renderMesh,activeFaceAnchors,organismFrame,faceTurnVisibility,materialFacingYawDeg)");
    expect(renderer).toContain("Math.sin((Number(yaw)||0)*Math.PI/180)*0.08");
    expect(renderer).not.toContain("lastLightRigInput={yaw:viewYawDegrees");
    expect(renderer).not.toContain("(viewYawDegrees||0)/45");
  });

});
