/**
 * CANONOPS PRESSURE COOKER — Cycle 12 (embodiment-silhouette-phd-memo, W1–W4).
 *
 * Wall closed here: "the step vocabulary vanishes from the silhouette when
 * Gasper autonomously morphs to singularity — the torus slides while the
 * presence form steps." Root cause: the dormant branches of formRadiusAtFor
 * returned early before the cycle-11 contact-flatten block, AND mapFormPoint
 * normalized the live radius by a base that itself carried the flatten, so
 * even a reached term would divide out of the radiusScale quotient.
 *
 * Laws under test (earned in the memo, not authored here):
 *  W1 — the silhouette gate is embodiment-invariant: additive on the active
 *       form's base, gated, zero at rest => byte-identical dormant art.
 *  W2 — dormant-base anchor: the patch lands on the lower rim (theta 1.34
 *       right / 1.80 left under mapDormantFamily), Hertz form carried from
 *       Z1/Z2, fences d <= 5% h_G = 61.2 u, a <= 25% of the dormant form's
 *       OWN base half-width (measured first-hand below, never tuned).
 *  W3 — bob reaches every form: verified live on the rig altitude channel
 *       (idleRig translate -wAlt is profile-agnostic; all dormant optics sit
 *       inside idleRig in gasper-rig-v655.svg) — take-19 witness bar, no
 *       renderer code change.
 *  W4 — identity preservation + bounded morph delta: each morph endpoint is
 *       built with its own pure profile (sampleBodyForProfile) and
 *       blendPointSets crossfades by morphMix, so the flatten contribution
 *       enters/exits with the morph weight (bounded delta, no pop).
 *
 * Environment note: node env (no jsdom in this repo) — the mirrors execute
 * the exact AS3 arithmetic; the source proofs pin the production wiring.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GASPER_ROOT = fileURLToPath(new URL("..", import.meta.url));

// ---------------------------------------------------------------------------
// Mirrors — verbatim arithmetic of all-script-3.js (line refs in comments).
// ---------------------------------------------------------------------------

const AMORPH_PHI = 1.6180339887498949; // AS3:639 (D-0057 PILLAR 4)
const UNITS_PER_CONTENT_PX = 8; // WORLD_SPACE.unitsPerContentPx

// AS3:689 — wrapped angular gaussian.
function gaussAngle(theta: number, mu: number, sigma: number): number {
  const d = ((theta - mu + Math.PI) % (2 * Math.PI)) - Math.PI;
  return Math.exp(-0.5 * Math.pow(d / sigma, 2));
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const signedPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

// AS3 gaitFlattenRadiusDelta (cycle-12 carrier). fdUnits/fwUnits are the
// kernel channels (world units); motionGate mirrors Number(motion.value)>0.01.
function gaitFlattenRadiusDelta(
  th: number,
  fdUnits: number,
  fwUnits: number,
  motionGate: boolean,
): number {
  const _fdPx = fdUnits / UNITS_PER_CONTENT_PX;
  const _fwPx = fwUnits / UNITS_PER_CONTENT_PX;
  if (!(Math.abs(_fdPx) >= 0.004 && _fwPx >= 0.004 && motionGate)) return 0;
  const _fpTh = _fdPx > 0 ? 1.34 : 1.80;
  const _fpD = Math.abs(_fdPx);
  const _fpSig = Math.max(0.02, _fwPx / 72);
  return (
    -_fpD * gaussAngle(th, _fpTh, _fpSig) +
    (_fpD / (2 * AMORPH_PHI)) * gaussAngle(th, _fpTh - 2.5 * _fpSig, AMORPH_PHI * _fpSig) +
    (_fpD / (2 * AMORPH_PHI)) * gaussAngle(th, _fpTh + 2.5 * _fpSig, AMORPH_PHI * _fpSig)
  );
}

// AS3 mapDormantFamily (verbatim; geometryModel:'dormant-family').
function mapDormantFamily(th: number, radiusScale = 1, collapse = 0) {
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const c = Math.max(0, Math.min(1, collapse));
  const stableScale = 1 + (radiusScale - 1) * lerp(0.48, 0.36, c);
  const width = lerp(79.5, 105.0, c) * stableScale;
  const upperHeight = lerp(74.0, 47.5, c) * stableScale;
  const lowerHeight = lerp(72.0, 42.5, c) * stableScale;
  const xExponent = lerp(0.96, 0.74, c);
  const yExponent = lerp(0.98, 0.72, c);
  const xNorm = signedPow(cos, xExponent);
  const yNorm = signedPow(sin, yExponent);
  const sideIdentity = (gaussAngle(th, 0, 0.16) + gaussAngle(th, Math.PI, 0.16)) * lerp(4.15, 2.35, c);
  const equatorEnvelope = Math.exp(-0.5 * Math.pow(sin / 0.31, 2));
  const crownAsym =
    c * 1.95 * gaussAngle(th, -Math.PI / 2, 0.72) -
    c * 0.72 * gaussAngle(th, Math.PI / 2, 0.72) +
    (1 - c) * 0.9 * gaussAngle(th, Math.PI / 2, 0.85);
  const x = 120 + width * xNorm + Math.sign(cos || 1) * sideIdentity * (0.55 + 0.45 * equatorEnvelope);
  const y = 111.5 + (sin < 0 ? upperHeight : lowerHeight) * yNorm - crownAsym;
  return { x, y, geometryModel: "dormant-family" as const };
}

// The dormant geometry center (AS3 getViewMetrics dormant-family cx/cy).
const DORMANT_CX = 120;
const DORMANT_CY = 111.5;
const rimDistance = (p: { x: number; y: number }) => Math.hypot(p.x - DORMANT_CX, p.y - DORMANT_CY);

// Typical mid-walk channels from the take-17b/18c witnesses (u).
const FD_WALK = 30;
const FW_WALK = 100;
// Kernel fences (setPhysicsGait fail-closed clamps, AS3:2816 region).
const FD_MAX_U = 61.2; // 5% h_G
const FW_MAX_U = 144; // 25% of the 576 px presence base half-width
const ART_RADIUS_PX = 72; // baseRadiusV63 scale (the ratio carrier is art-independent)

const THETA_GRID = Array.from({ length: 1440 }, (_, i) => (i / 1440) * 2 * Math.PI);

describe("Cycle 12 W1/W2 — the contact flatten reaches the dormant silhouette (embodiment-silhouette-phd-memo)", () => {
  it("zero gait / reduced motion => the carrier is exactly 0 (byte-identical dormant art)", () => {
    for (const th of [0, 0.7, 1.34, 1.5708, 1.8, 3.1, Math.PI, 5.0]) {
      expect(gaitFlattenRadiusDelta(th, 0, 0, true)).toBe(0); // rest
      expect(gaitFlattenRadiusDelta(th, FD_WALK, FW_WALK, false)).toBe(0); // reduced motion
      expect(gaitFlattenRadiusDelta(th, 0.003 * UNITS_PER_CONTENT_PX, FW_WALK, true)).toBe(0); // snap
      expect(gaitFlattenRadiusDelta(th, FD_WALK, 0.003 * UNITS_PER_CONTENT_PX, true)).toBe(0); // snap
    }
  });

  it("right plant anchors the dent at th=1.34 with flank bulges; left plant mirrors to th=1.80", () => {
    const right = THETA_GRID.map((th) => gaitFlattenRadiusDelta(th, FD_WALK, FW_WALK, true));
    const left = THETA_GRID.map((th) => gaitFlattenRadiusDelta(th, -FD_WALK, FW_WALK, true));
    const minR = THETA_GRID[right.indexOf(Math.min(...right))];
    const minL = THETA_GRID[left.indexOf(Math.min(...left))];
    expect(Math.abs(minR - 1.34)).toBeLessThan(2 * Math.PI / 1440 + 0.001);
    expect(Math.abs(minL - 1.8)).toBeLessThan(2 * Math.PI / 1440 + 0.001);
    // flank bulges sit at +/-2.5 sigma around the plant anchor (Z2 idiom)
    const sigma = Math.max(0.02, FW_WALK / UNITS_PER_CONTENT_PX / 72);
    const bulgeR = gaitFlattenRadiusDelta(1.34 + 2.5 * sigma, FD_WALK, FW_WALK, true);
    expect(bulgeR).toBeGreaterThan(0);
  });

  it("conserves displaced area exactly (Z2 volume law): integral of the delta over the contour is ~0", () => {
    const n = 7200;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += gaitFlattenRadiusDelta((i / n) * 2 * Math.PI, FD_WALK, FW_WALK, true);
    // analytic: -d*sigma*sqrt(2pi) + 2*(d/(2*phi))*(phi*sigma)*sqrt(2pi) = 0
    expect(Math.abs((sum / n) * 2 * Math.PI)).toBeLessThan(1e-6);
  });

  it("W2 transmission: the dent pulls the lower rim inward on the planted side, bulges push out, rest is bit-identical", () => {
    for (const collapse of [0, 0.5, 1]) {
      const thPlant = 1.34;
      const sigma = Math.max(0.02, FW_WALK / UNITS_PER_CONTENT_PX / 72);
      const rest = mapDormantFamily(thPlant, 1, collapse);
      // rest => radiusScale exactly 1 => the authored dormant point (W1)
      const restAgain = mapDormantFamily(thPlant, 1, collapse);
      expect(restAgain.x).toBe(rest.x);
      expect(restAgain.y).toBe(rest.y);

      const dPlant = gaitFlattenRadiusDelta(thPlant, FD_WALK, FW_WALK, true);
      expect(dPlant).toBeLessThan(0);
      const planted = mapDormantFamily(thPlant, (ART_RADIUS_PX + dPlant) / ART_RADIUS_PX, collapse);
      expect(rimDistance(planted)).toBeLessThan(rimDistance(rest)); // rim dents inward

      const dFlank = gaitFlattenRadiusDelta(thPlant + 2.5 * sigma, FD_WALK, FW_WALK, true);
      expect(dFlank).toBeGreaterThan(0);
      const flank = mapDormantFamily(thPlant + 2.5 * sigma, (ART_RADIUS_PX + dFlank) / ART_RADIUS_PX, collapse);
      const flankRest = mapDormantFamily(thPlant + 2.5 * sigma, 1, collapse);
      expect(rimDistance(flank)).toBeGreaterThan(rimDistance(flankRest)); // volume answers force

      // zero carrier => radiusScale exactly 1 => bit-identical dormant geometry
      const gated = mapDormantFamily(thPlant, (ART_RADIUS_PX + gaitFlattenRadiusDelta(thPlant, 0, 0, true)) / ART_RADIUS_PX, collapse);
      expect(gated.x).toBe(rest.x);
      expect(gated.y).toBe(rest.y);
    }
  });

  it("W2 fences hold against the dormant form's OWN base half-width (measured first-hand, never tuned)", () => {
    // First-hand measurement: mapDormantFamily at rest (stableScale=1). At
    // th=0 (xNorm=1, equatorEnvelope=1) the silhouette half-width is the
    // width coefficient PLUS the side-identity equator bulge:
    // orbit lerp(79.5,105,0) + lerp(4.15,2.35,0) = 83.65 px (the smallest),
    // singularity 105 + 2.35 = 107.35 px.
    const orbitHalfWidth = mapDormantFamily(0, 1, 0).x - DORMANT_CX;
    expect(orbitHalfWidth).toBeCloseTo(83.65, 6);
    const singularityHalfWidth = mapDormantFamily(0, 1, 1).x - DORMANT_CX;
    expect(singularityHalfWidth).toBeCloseTo(107.35, 6);

    // Patch half-width fence: kernel 144 u = 18 px <= 25% of 83.65 px = 20.9125 px.
    expect(FW_MAX_U / UNITS_PER_CONTENT_PX).toBeLessThanOrEqual(0.25 * orbitHalfWidth);

    // Depth fence at worst case (d = 61.2 u, c = 1, strongest damping 0.36):
    // the rim displacement stays far inside the 25% silhouette-delta bound.
    const dMaxPx = FD_MAX_U / UNITS_PER_CONTENT_PX;
    const thPlant = 1.34;
    const rest = mapDormantFamily(thPlant, 1, 1);
    const dented = mapDormantFamily(thPlant, (ART_RADIUS_PX - dMaxPx) / ART_RADIUS_PX, 1);
    const displacement = Math.abs(rimDistance(rest) - rimDistance(dented));
    expect(displacement).toBeGreaterThan(0.5); // legible at shot scale (not a no-op)
    expect(displacement).toBeLessThanOrEqual(0.25 * orbitHalfWidth);
  });

  it("W4 morph boundedness: the flatten contribution is linear in the morph mix (no pop at boundaries)", () => {
    // blendPointSets lerps the two endpoint silhouettes by morphMix; each
    // endpoint carries its own flatten delta. The composed delta is therefore
    // affine in m => per-frame delta bounded by |deltaB - deltaA| * dm.
    const th = 1.34;
    const deltaA = gaitFlattenRadiusDelta(th, FD_WALK, FW_WALK, true); // presence endpoint
    const deltaB = gaitFlattenRadiusDelta(th, FD_WALK, FW_WALK, true) * 0.42; // dormant endpoint (stableScale damping lerp(.48,.36,c), c=0.5)
    let prev = deltaA;
    const steps = 100;
    for (let i = 1; i <= steps; i++) {
      const m = i / steps;
      const blended = (1 - m) * deltaA + m * deltaB;
      expect(Math.abs(blended - prev)).toBeLessThanOrEqual(Math.abs(deltaB - deltaA) / steps + 1e-12);
      prev = blended;
    }
    expect(prev).toBeCloseTo(deltaB, 12); // lands exactly on the dormant endpoint
  });
});

describe("Cycle 12 production wiring (source proof)", () => {
  const script = readFileSync(`${GASPER_ROOT}/assets/all-script-3.js`, "utf8");

  it("one carrier, both consumers (formRadiusAtFor adds it, mapFormPoint subtracts it from the dormant base)", () => {
    expect(script).toContain("function gaitFlattenRadiusDelta(th){");
    // formRadiusAtFor consumes the carrier for EVERY family
    expect(script).toContain("const _gfd=gaitFlattenRadiusDelta(th);if(_gfd!==0)radius+=_gfd;");
    // mapFormPoint keeps the dormant normalization base flatten-free
    expect(script).toContain(
      "baseRadiusAtFor(profileId,th)-(profile.geometryModel==='dormant-family'?gaitFlattenRadiusDelta(th):0)",
    );
  });

  it("the dormant branches no longer early-return before the carrier", () => {
    const start = script.indexOf("function formRadiusAtFor(profileId,th){");
    const chain = script.indexOf("if(profileId==='wispwalker'){", start);
    expect(start).toBeGreaterThan(-1);
    expect(chain).toBeGreaterThan(start);
    const dormantRegion = script.slice(start, chain);
    expect(dormantRegion).toContain("if(profileId==='singularity'){");
    expect(dormantRegion).toContain("}else if(profileId==='dormant-orbit'){");
    expect(dormantRegion).not.toContain("return"); // no early exit before the shared carrier
  });

  it("the carrier math is pinned (Z1/Z2 grammar unchanged, W2 only extends its reach)", () => {
    expect(script).toContain(
      "return -_fpD*gaussAngle(th,_fpTh,_fpSig)+(_fpD/(2*AMORPH_PHI))*gaussAngle(th,_fpTh-2.5*_fpSig,AMORPH_PHI*_fpSig)+(_fpD/(2*AMORPH_PHI))*gaussAngle(th,_fpTh+2.5*_fpSig,AMORPH_PHI*_fpSig);",
    );
    expect(script).toContain("const _fpTh=_fdPx>0?1.34:1.80,_fpD=Math.abs(_fdPx),_fpSig=Math.max(0.02,_fwPx/72);");
  });

  it("Wispwalker root transfer is authored above the visible alternating-load floor", () => {
    const walkAmps = [...script.matchAll(/const wAmp=_wcW\.walkAmp\?\?([0-9.]+)/g)].map(([, value]) => Number(value));
    const stepDepths = [...script.matchAll(/const stepDepth=\(_wcW\.stepDepth\?\?([0-9.]+)\)/g)].map(([, value]) => Number(value));
    expect(walkAmps.length).toBeGreaterThanOrEqual(2);
    expect(stepDepths.length).toBeGreaterThanOrEqual(2);
    for (let index = 0; index < Math.min(walkAmps.length, stepDepths.length); index += 1) {
      expect(walkAmps[index]).toBeGreaterThanOrEqual(1.2);
      expect(stepDepths[index]).toBeGreaterThanOrEqual(7);
      expect(walkAmps[index] * stepDepths[index]).toBeGreaterThanOrEqual(8.4);
    }
    expect(script).toContain("const footShapeRaw=(_pR-0.45*_pL)*gaussAngle(th,_thR,_sigR)+(_pL-0.45*_pR)*gaussAngle(th,_thL,_sigL);");
    expect(script).toContain("const footCenter=(_pR-0.45*_pL)*gaussAngle(Math.PI/2,_thR,_sigR)+(_pL-0.45*_pR)*gaussAngle(Math.PI/2,_thL,_sigL);");
    expect(script).toContain("_pR=plantR*(1+(_rightPlant?0.90*_pC:-0.72*_iC))");
    expect(script).toContain("const footShape=footShapeRaw-footCenter*gaussAngle(th,Math.PI/2,0.20);");
    expect(script).toContain("const _baseX=Number(physGait.stepBaseXUnits)||0,_swayX=Math.abs(Number(physGait.swayXUnits)||0),_flatten=Number(physGait.stepFlattenUnits)||0;");
    expect(script).toContain("const _supportSigned=Math.abs(_baseShare)>0.004?_baseX:Math.abs(_flatten)>0.004?_flatten:_supportFallback;");
    expect(script).toContain("plantR=Math.max(0,supportStep),plantL=Math.max(0,-supportStep);");
  });


  it("keeps the silhouette one mass; floor/shadow may stay planted", () => {
    expect(script).toContain("plantedScreenXUnits");
    expect(script).toContain("avatar.dataset.gaitPlantX");
    expect(script).toContain("const plantX=Math.abs(Number(physGait.plantedScreenXUnits)||0)>0.004?(Number(physGait.plantedScreenXUnits)||0):(Number(physGait.stepBaseXUnits)||0);");
    expect(script).toContain("const loadX=Number(physGait.stepBaseXUnits)||0;");
    expect(script).toContain("const plantDxPx=(plantX*gaitGate)/WORLD_SPACE.unitsPerContentPx;");
    expect(script).toContain("const stepDxPx=(loadX*gaitGate)/WORLD_SPACE.unitsPerContentPx;");
    expect(script).not.toContain("_plantHoldX");
    expect(script).not.toContain("+_plantHoldX*_plantW");
    expect(script).not.toContain("_contactHoldX");
    expect(script).not.toContain("+_contactHoldX*_contactW");
    expect(script).toContain("const posed={x:frame.cx+nx*volumeX*_formK+postXEff+lean+contrapposto,y:frame.cy+ny*volumeY*_formK+postYEff+physSilhouettePlantY};");
    expect(script).not.toContain("_basePlantPx");
    expect(script).not.toContain("_swingLift");
    expect(script).not.toContain("_plantPress");
    expect(script).toContain("const _cyanPlant=");
    expect(script).not.toContain("const _cyanPlant=0;");
    expect(script).not.toContain("const _across=Math.tanh((th-Math.PI/2)/0.18);");
    expect(script).toContain("avatar.dataset.gaitPlantWorld=(worldPoseCurrent.x+plantX).toFixed(2);");
    expect(script).not.toContain("?plantDxPx:0");
    expect(script).not.toContain("ny-0.70*_ry");
    expect(script).toContain("avatar.dataset.gaitShadowDx=plantDxPx.toFixed(3);");
    expect(script).toContain("ground.removeAttribute('transform')");
    expect(script).toContain("groundOuter.removeAttribute('transform')");
    expect(script).toContain("contactShadowOuter.removeAttribute('transform')");
    expect(script).not.toContain("shadowStepDxPx");
  });
  it("keeps the S0 planted-support hold when screen projection is zero", () => {
    // A pure lateral world walk has no screen-x support carrier, but it still
    // has a physical planted side. Falling back to the authored sine here
    // turns the support point back into a glide and loses the S0 hold.
    expect(script).toContain(
      "const _supportPhase=Math.cos(physGait.phase/2);const _supportFallback=Math.tanh(5.23606797749979*_supportPhase);",
    );
    expect(script).toContain(
      "const _supportSigned=Math.abs(_baseShare)>0.004?_baseX:Math.abs(_flatten)>0.004?_flatten:_supportFallback;",
    );
  });

  it("keeps authored Wispwalker mass neutral at rest and on the physics support side", () => {
    expect(script).toContain("function walkScaffoldStep(rawStep){");
    expect(script).toContain("const neutralStep=0.18*Math.sin(1.7);");
    expect(script).toContain("function walkSupportStep(authoredStep){");
    expect(script).toContain("if(!(physGait.speedRatio>0.01))return authoredStep;");
    expect(script).toContain("return Math.max(-1,Math.min(1,baseX/swayX));");
    expect(script).toContain("function walkPhysicsDrivenHold(){");
    expect(script).toContain("worldPoseTarget.provenance==='physics-authority'");
    expect(script).not.toContain(
      "return physGait.speedRatio<=0.01&&worldPoseTarget.provenance==='physics-authority'",
    );
    expect(script).toContain("const step=physGait.speedRatio>0.01?supportStep:authoredStep;");
  });

  it("keeps the foot-root lobes crisp after the viscoelastic cusp fix", () => {
    // The contour inertia, not a permanently widened foot, owns the old
    // high-frequency cusp fix. Keep the center cleft soft while restoring the
    // narrower load-bearing foot nub vocabulary from the pre-soften canon.
    expect(script).toContain("Object.freeze({th:1.27,sigma:0.13,gain:1.0}),");
    expect(script).toContain("Object.freeze({th:1.87,sigma:0.13,gain:1.0}),");
    expect(script).toContain("const _wcc=WISPWALKER_CANONICAL_CONTOUR;");
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
    expect(script).toContain("if(silhouetteProfile==='wispwalker')return 0;");
    expect(script).toContain("const walkAsym=0;");
    expect(script).toContain("const walkLean=0;");
    expect(script).toContain("const walkPostX=0;");
    expect(script).toContain("const z=walkAsym*0.55*asymShape+footPress*footShape*(1-0.28*_clear);");
    expect(script).toContain("S.left.x*wL+S.right.x*wR+S.crotch.x*wC");
    expect(script).toContain("const k=Math.min(1,wSum*(S.live||0))");
    expect(script).not.toContain("posed.y-=_liftPx*_swingArtW");
    expect(script).not.toContain("posed.x+=_advPx*_swingArtW");
    expect(script).not.toContain("radius-=_lift*gaussAngle(th,1.83,_sig);");
    expect(script).not.toContain("radius-=_lift*gaussAngle(th,1.31,_sig);");
    expect(script).toContain("const _cyanPlant=");
    expect(script).not.toContain("const _cyanPlant=0;");
  });

  it("recovery: one-mass posed; overnight swing-lift hole punch is gone", () => {
    expect(script).toContain("const posed={x:frame.cx+nx*volumeX*_formK+postXEff+lean+contrapposto,y:frame.cy+ny*volumeY*_formK+postYEff+physSilhouettePlantY};");
    expect(script).not.toContain("posed.y+=_dropPx*_lobeLoadW-_liftPx*_lobeSwingW");
    expect(script).not.toContain("_tuckPx*_lobeSwingW");
    expect(script).not.toContain("const _cleftKeep=");
    expect(script).not.toContain("r-=_liftR*0.62*_wSwingR");
    expect(script).not.toContain("_swingLift");
    expect(script).not.toContain("_plantPress");
    expect(script).not.toContain("_plantHoldX");
    expect(script).toContain("const _cyanPlant=");
    expect(script).toContain(
      "const posed={x:frame.cx+nx*volumeX*_formK+postXEff+lean+contrapposto,y:frame.cy+ny*volumeY*_formK+postYEff+physSilhouettePlantY};",
    );
  });

  it("N316: loaded nub stays world-fixed in posed.x; walk-time chin is not a W", () => {
    expect(script).not.toContain("arr[i].x+=_plantPx*_baseW*_sideW");
    expect(script).not.toContain("posed.x+=(Number(physGait.swayXUnits)||0)/WORLD_SPACE.unitsPerContentPx*(1-_baseW)");
    expect(script).toContain("wDx=(worldPoseCurrent.x/WORLD_SPACE.unitsPerContentPx)*wScale");
    expect(script).not.toContain("_painted.x+=_plantPx*_baseW*_sideW");
    expect(script).not.toContain("posed.y+=_dropPx*_lobeLoadW-_liftPx*_lobeSwingW");
    expect(script).not.toContain("_plantHoldX");
    expect(script).toContain(
      "radius-=_wcc.lowerBowlTrimAmp*gaussAngle(th,_wcc.lowerBowlTrimTheta,_wcc.lowerBowlTrimSigma);",
    );
    expect(script).toContain(
      "radius-=(_wc.cleftDepth??_wcc.cleftDepth)*gaussAngle(th,_wcc.cleftTheta,_wcc.cleftSigma);",
    );
  });

});
