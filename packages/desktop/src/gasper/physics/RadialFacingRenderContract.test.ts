import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const renderer = readFileSync(new URL("../assets/all-script-3.js", import.meta.url), "utf8");
const rig = readFileSync(new URL("../assets/gasper-rig-v655.svg", import.meta.url), "utf8");

describe("S8 radial facing render contract", () => {
  it("publishes one smooth face-turn visibility and applies it to the internal face field", () => {
    expect(renderer).toContain("faceTurnVisibility=1-_fade");
    expect(renderer).not.toContain("_floor=.72");
    expect(renderer).toContain("--face-turn-visibility");
    expect(renderer).toContain("facingFaceVisibility");
    expect(renderer).not.toContain("faceFieldNode.setAttribute");
    expect(renderer).not.toContain("violetFieldNode.setAttribute");
    expect(rig).not.toContain('id="faceFieldNode"');
    expect(rig).not.toContain('id="faceZone"');
    expect(rig).not.toContain('id="violetFieldNode"');
    expect(rig).not.toContain('id="eyeLRecessOuter"');
    expect(rig).toContain('id="pearlCoreGrad" gradientUnits="objectBoundingBox"');
    expect(rig).toContain('id="innerVolumeGrad" gradientUnits="objectBoundingBox"');
    expect(rig).toContain('id="violetCoreGrad" gradientUnits="objectBoundingBox"');
    expect(rig).toContain('id="opticalDepthGrad" gradientUnits="objectBoundingBox" cx="50%" cy="50%" r="80%"');
    expect(rig).toContain('id="bodyBase" gradientUnits="userSpaceOnUse" cx="120" cy="118" r="101"');
    expect(rig).toContain('id="cloudVioletGrad" cx="50%" cy="50%" r="50%"');
    expect(rig).not.toContain('id="pearlCoreGrad" gradientUnits="userSpaceOnUse"');
    expect(rig).not.toContain('id="opticalDepthGrad" gradientUnits="objectBoundingBox" cx="50%" cy="62%" r="92%"');
    expect(rig).not.toContain('id="bodyBase" gradientUnits="objectBoundingBox"');
  });

  it("optical legibility floors cannot resurrect a rear face", () => {
    expect(rig).toContain("opacity: calc(0.78 * var(--face-turn-visibility, 1)) !important");
    expect(rig).toContain("opacity: calc(0.52 * var(--face-turn-visibility, 1)) !important");
    expect(renderer).toContain("fully absent on the dorsal hemisphere");
    expect(renderer).toContain("faceSemanticVisibility");
  });

  it("ratified 3-part almonds stay seated in the membrane — no hollow outline sockets", () => {
    expect(rig).toContain('id="faceFill" x1="0" y1="0" x2="0" y2="1"');
    expect(rig).toContain('stop offset="0" stop-color="#ffffff"');
    expect(rig).toContain('id="eyeL" opacity=".92"');
    expect(rig).not.toContain('id="faceFill" cx="50%" cy="46%" r="68%"');
    expect(renderer).toContain("apertures belong to the volume");
  });

  it("uses finite-thickness yaw without reciprocal vertical growth", () => {
    expect(renderer).toContain("_sideThickness=0.90");
    expect(renderer).toContain("_orthoWidth=Math.sqrt");
    expect(renderer).toContain("facingCompress=_orthoWidth");
    expect(renderer).toContain("facingVerticalScale='1.0000'");
    expect(renderer).not.toContain("_vK=1/_hK");
    expect(renderer).not.toContain("p.y=_tcy+_ry*_vK");
    expect(renderer).not.toContain("_frontT=Math.max(0,Math.min(1,absDeg/45))");
    expect(renderer).not.toContain("_shoulderGate=");
    expect(renderer).not.toContain("hemisphere>0.001");
  });

  it("turns the face with the volume instead of sliding a 2D sticker", () => {
    expect(renderer).toContain("rawFaceShift=faceCenter.x-frame.cx,faceShift=");
    expect(renderer).not.toContain("sgn*5*authoredTurnEase()");
    expect(renderer).toContain("faceCompression:facingCompress");
    expect(renderer).toContain("apertures belong to the volume");
    expect(renderer).not.toContain("frame.rx*Math.sin(_lead");
  });

  it("turntable paint is continuous — no 45 gate, lobes follow sin(yaw), face rides fade", () => {
    expect(renderer).toContain("nearLobeScale:1+0.05*_absLobe");
    expect(renderer).toContain("farLobeScale:1-0.06*_absLobe");
    expect(renderer).toContain("_leftIsNear?metrics.nearLobeScale:metrics.farLobeScale");
    expect(renderer).toContain("rawFaceShift*(1-faceTurnFade)");
    expect(renderer).toContain("projection:'finite-thickness-turntable-s1'");
    expect(renderer).toContain("if(_herr>180)_herr-=360");
    expect(renderer).toContain("Math.abs(_hK-1)>1e-12");
    expect(renderer).not.toContain("facingProjectionYawDeg");
    expect(renderer).not.toContain("facingCompress=(1-.08*_frontGate)");
  });

  it("worldRig rotate stays physics lean/bank — no heading card-spin", () => {
    expect(renderer).not.toMatch(/rotate\(-?heading/);
    expect(renderer).not.toMatch(/rotate\(headingYaw/);
    expect(renderer).toContain("facingVerticalScale='1.0000'");
  });

  it("rig controller paints facingPaintYawDeg, not the cone fold", () => {
    const ctl = readFileSync(new URL("../GasperRigController.ts", import.meta.url), "utf8");
    expect(ctl).toContain("facingPaintYawDeg(out.facingBearingDeg)");
    expect(ctl).toContain("facingPaintOrbitYawDeg");
    expect(ctl).not.toMatch(/facingProjectionYawDeg\s*\(\s*facingSliceCenterDeg/);
  });

  it("N187 strut files wander cruise after standing wander/life down", () => {
    const ctl = readFileSync(new URL("../GasperRigController.ts", import.meta.url), "utf8");
    expect(ctl).toContain("fileStrutLocomotion");
    expect(ctl).toContain("this.setWanderEnabled(false)");
    expect(ctl).toContain("this.setLifeEnabled(false)");
    expect(ctl).toContain("this.writeLifeSubstrate(true)");
    expect(ctl).toContain('driver.setLocomotion("wander", { x, z, cruise })');
  });

  it("N193 live 20s is filed on the controller, not the app travel writer", () => {
    const ctl = readFileSync(new URL("../GasperRigController.ts", import.meta.url), "utf8");
    const take = readFileSync(new URL("../takes/NorthstarTwentyTake.ts", import.meta.url), "utf8");
    const playStart = ctl.indexOf("playAuthoredTake");
    const playEnd = ctl.indexOf("N187 — file a grounded strut", playStart);
    const play = ctl.slice(playStart, playEnd);
    expect(ctl).toContain("playNorthstarTwenty");
    expect(ctl).toContain("this.playAuthoredTake(NORTHSTAR_TWENTY_TAKE)");
    expect(play).toContain('this.snapEmbodiment(take.setup.embodiment)');
    expect(play).not.toContain('this.setEmbodiment("wispwalker")');
    expect(ctl).toContain("rig?.cancelBehavior?.()");
    expect(take).toContain("eightStateLoop: false");
    expect(play).toContain("rig?.cancelBehavior?.()");
    expect(play).toContain("Do not ease yaw on take start");
    expect(play).not.toContain("rig?.setYaw?.(take.setup.yaw)");
    expect(play).toContain("setEightStateEnabled?.(false)");
    expect(play).toContain('this.setExpression(action.id)');
    expect(take).toContain('id: "listening-orient"');
    expect(take).toContain('id: "neutral-settled"');
    expect(take).toContain('id: "notice-release"');
    expect(play).not.toContain("setMotion?.(0.82)");
    expect(play).not.toContain('triggerMicrostate?.("orient"');
    expect(take).toContain('preset: "none"');
    expect(take).toContain("cruise: 380");
    expect(play).toContain("this.enableBoo(action.on)");
    expect(play).toContain("driver.launchComet({");
    expect(play).toContain('driver.standDownLocomotion("wander")');
    expect(take).toContain("READABLE_THREE_QUARTER_DEG");
    expect(take).toContain("headingPinDeg: 0");
    expect(take).toContain('id: "strut-go"');
    expect(take).toContain("at: 2.618");
    expect(play).not.toContain("this.headingPinDeg = -22 * u * u * (3 - 2 * u)");
    expect(play).not.toContain('setEmbodiment("presence")');
    expect(play).toContain("this.setLiveFormCoeff(\"walkEnable\", take.setup.walkEnable)");
    expect(take).toContain("cadenceHz: 2.6");
    expect(take).toContain("driveGain: 0.85");
    expect(take).not.toContain("dx: 980");
    expect(take).not.toContain("dz: 48");
    expect(play).not.toContain("gsap.");
    expect(play).not.toContain("TweenMax");
    expect(play).not.toMatch(/setWorldPose\s*\(/);
  });

  it("N204 notice/zip membrane: recess sockets follow the live aperture, not a fixed horseshoe plate", () => {
    expect(renderer).not.toContain("setRecess(eyeLRecess,faceAnchors.eyeL,24,11)");
    expect(renderer).not.toContain("setRecess(mouthRecess,faceAnchors.mouth,30,10)");
    expect(renderer).not.toContain("renderedEyeWidthL*0.52");
    expect(renderer).toContain("renderedEyeWidthL*(0.12+0.40*_oL)");
    expect(renderer).toContain("bloomScale:1+0.38*_oL");
    expect(renderer).toContain("setRecess(mouthRecess,activeFaceAnchors.mouth");
    expect(renderer).not.toContain("Math.max(8,_mW*0.38)");
  });

  it("N204 notice/zip membrane: Presence eight-state is not forced when the 20s loop is off", () => {
    const ctl = readFileSync(new URL("../GasperRigController.ts", import.meta.url), "utf8");
    expect(ctl).not.toContain('livingStatus.eightState ?? "presence-neutral-settled"');
    expect(ctl).toContain("eightStateForwardId(");
    expect(renderer).toContain("if(!raw){avatar.dataset.eightState=eightStateId;return;}");
    expect(renderer).not.toContain("const next=EIGHT_STATE_BODY.recipe[raw]?raw:'presence-neutral-settled'");
    const take = readFileSync(new URL("../takes/NorthstarTwentyTake.ts", import.meta.url), "utf8");
    const playStart = ctl.indexOf("playAuthoredTake");
    const playEnd = ctl.indexOf("N187 — file a grounded strut", playStart);
    const play = ctl.slice(playStart, playEnd);
    expect(take.indexOf('id: "notice"')).toBeGreaterThan(-1);
    expect(take.indexOf('id: "notice-release"')).toBeGreaterThan(take.indexOf('id: "notice"'));
    expect(take.indexOf('id: "notice-release"')).toBeLessThan(take.indexOf('id: "gather"'));
    expect(take.indexOf('id: "gather"')).toBeLessThan(take.indexOf('id: "zip1"'));
    expect(play).toContain("this.setExpression(action.id)");
  });

  it("N210/N213 seq18 membrane baseline: no second face disc, relief plate stays cleared", () => {
    expect(rig).not.toContain('id="faceFieldNode"');
    expect(rig).not.toContain('id="violetFieldNode"');
    expect(renderer).not.toContain("faceFieldNode.setAttribute");
    expect(rig).toContain('id="innerVolumeGrad" gradientUnits="objectBoundingBox"');
    expect(rig).toContain('id="pearlCoreGrad" gradientUnits="objectBoundingBox"');
    expect(rig).toContain('id="violetCoreGrad" gradientUnits="objectBoundingBox"');
    expect(rig).toContain('id="opticalDepthGrad" gradientUnits="objectBoundingBox"');
    expect(rig).not.toContain('id="eyeLRecessOuter"');
    expect(rig).not.toContain('id="mouthRecessOuter"');
    expect(renderer).not.toContain("data-pupil");
    expect(renderer).not.toContain("pupilDX");
    expect(renderer).toContain("D-0110: pupil/iris anatomy RETRACTED");
    const ctl = readFileSync(new URL("../GasperRigController.ts", import.meta.url), "utf8");
    const take = readFileSync(new URL("../takes/NorthstarTwentyTake.ts", import.meta.url), "utf8");
    const playStart = ctl.indexOf("playAuthoredTake");
    const playEnd = ctl.indexOf("N187 — file a grounded strut", playStart);
    const play = ctl.slice(playStart, playEnd);
    expect(take).toContain('preset: "none"');
    expect(play).not.toContain("setMotion?.(0.82)");
    expect(play).not.toContain('triggerMicrostate?.("orient"');
    expect(take).toContain('id: "listening-orient"');
    expect(take).toContain('preset: "none"');
    expect(take.indexOf('id: "listening-orient"')).toBeLessThan(take.indexOf('preset: "none"'));
    expect(take).toContain('id: "neutral-settled"');
    expect(take.indexOf('id: "notice-release"')).toBeGreaterThan(take.indexOf('id: "notice"'));
    expect(take.indexOf('id: "notice-release"')).toBeLessThan(take.indexOf('id: "gather"'));
  });

  it("N204 MOTION_LIGHT brightens hull volume, not face recess/bloom", () => {
    expect(renderer).toContain("_mlFactor");
    expect(renderer).toContain("cyanFieldNode.setAttribute('opacity'");
    expect(renderer).toContain("crownVolumePath.setAttribute('opacity'");
    expect(renderer).toContain("faceRecessLayer.style.opacity=faceVisibility.toFixed(3)");
    expect(renderer).not.toMatch(/faceRecessLayer\.style\.opacity=.*\*_mlFactor/);
    expect(renderer).not.toMatch(/faceBloomOuter[\s\S]{0,80}\*_mlFactor/);
  });

  it("N204 mixer cannot face-center hull volume when FormMaster owns the SVG", () => {
    const mixer = readFileSync(new URL("../GasperRenderMixer.ts", import.meta.url), "utf8");
    const fw = mixer.indexOf("if (this.legacyAuthorityDomWriteFirewall)");
    const energy = mixer.indexOf("translate(120px, 118px) scale(${energyScale})");
    expect(fw).toBeGreaterThan(-1);
    expect(energy).toBeGreaterThan(fw);
    expect(mixer.slice(fw, energy)).toContain("return");
  });
});

describe("gait 3/4 paint contract", () => {
  const renderer = readFileSync(
    new URL("../assets/all-script-3.js", import.meta.url),
    "utf8",
  );
  it("far eye shrinks, far arm occludes, feet overlap on the path", () => {
    expect(renderer).toContain("_farFeat=1-0.10*Math.abs(Math.sin(_yaw3*Math.PI/180))");
    expect(renderer).not.toContain("eyeOpenL*=_farIsL?_farFeat");
    expect(renderer).not.toContain("faceScaleX*metrics.faceCompression");
    expect(renderer).toContain("_overlap=Math.abs(Math.sin(_yawF*Math.PI/180))");
    expect(renderer).toContain("_half=0.30*(1-0.55*_overlap)");
    expect(renderer).toContain("gaussAngle(th,0.70,0.19)+gaussAngle(th,2.44,0.19)");
    expect(renderer).toContain("_pR=plantR*(1+(_rightPlant?0.90*_pC:-0.72*_iC))");
    expect(renderer).not.toContain("_pR=plantR*(1-(_rightPlant?0.55*_pC");
    expect(renderer).toContain("p.x=_tcx+_rx*_hK;");
    expect(renderer).not.toContain("_hK*(_rx<0?_lK:_rK)");
    expect(renderer).toContain("radius+=(_wc.lobeAmp??_wcc.lobeAmp)*(gaussAngle(th,_wcc.leftLobeTheta,_wcc.lobeSigma)+gaussAngle(th,_wcc.rightLobeTheta,_wcc.lobeSigma))");
    expect(renderer).toContain("S.left.x*wL+S.right.x*wR+S.crotch.x*wC");
    expect(renderer).not.toContain("posed.y-=_liftPx*_swingArtW");
  });
  it("does not cartoon-fatten the hull or idleRig", () => {
    expect(renderer).toContain("volumeX=st.postureScaleX||1,volumeY=");
    expect(renderer).toContain("__GASPER_STANCE__");
    expect(renderer).not.toContain("volumeY<0.94");
    expect(renderer).toContain("idleScaleX=(1+(idle.scaleX-1)*stateMotion*breathGainE),idleScaleY=(1+(idle.scaleY-1)*stateMotion*breathGainE)");
  });
});
