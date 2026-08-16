import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  decisionTimingCensus,
  parseWorldRigTransform,
  projectionResidual,
  expectedWorldRigProjection,
  expectedWorldRigScreenMatrix,
  directionReversalCount,
  sustainedDirectionReversalCount,
  screenProjectionResidual,
  windResistanceMetric,
  expectedWindAsymmetryPx,
  kernelWindResistanceMetric,
  wispwalkerFootReadabilityMetric,
  wispwalkerGaitMotionMetric,
  wispwalkerSupportCarrierMetric,
  northstarHandoffMetric,
  completeContourBottomY,
  contourCompletenessMetric,
  gaitSupportLiveMetric,
  GAIT_DENSE_PROOF_KEYS,
  summarizeLowerContour,
} from "./proof-metrics.mjs";

describe("Gasper Northstar proof metrics", () => {
  it("keeps the coupled Boo release inside the authored production corridor", () => {
    const captureSource = readFileSync(
      resolve(process.cwd(), "scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs"),
      "utf8",
    );
    // The coupled handoff starts near x=-280 and runs inside the measured
    // composition wall. The default 3200 u/s comet shot reaches that wall and
    // restitutes in one fixed step, masquerading as an authored reversal.
    // Keep the proof beat explicit and bounded; the physics law still owns the
    // release, drag, hover, and any genuinely authored collision elsewhere.
    expect(captureSource).toMatch(
      /launchWorldComet\?\.\(\{ gatherSeconds: 0\.85, vx: 1200 \}\)/,
    );
  });

  it("pins isolated wispwalker-walk to a static surface camera, not subject-close follow-cam", () => {
    const captureSource = readFileSync(
      resolve(process.cwd(), "scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs"),
      "utf8",
    );
    // subject-close recenters a 640 crop on #body every frame. Walk must keep
    // a recipe-owned surface pin so world x travel stays in the picture even
    // when GASPER_CAPTURE_VIEW=subject-close is exported.
    expect(captureSource).toMatch(
      /"wispwalker-walk": Object\.freeze\(\{[\s\S]*?captureView:\s*"surface"/,
    );
    expect(captureSource).toMatch(
      /const CAPTURE_VIEW = recipeBase\.captureView \|\| process\.env\.GASPER_CAPTURE_VIEW/,
    );
    expect(captureSource).toMatch(/fixedCameraObserved/);
    expect(captureSource).toMatch(
      /SCENARIO !== "wispwalker-walk" \|\| proofs\.fixedCameraObserved/,
    );
  });

  it("boots first-run and isolated proof on a live cinematic surface", () => {
    const captureSource = readFileSync(
      resolve(process.cwd(), "scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs"),
      "utf8",
    );
    const appSource = readFileSync(
      resolve(process.cwd(), "packages/gasper-studio/src/GasperStudioApp.tsx"),
      "utf8",
    );
    const workflowSource = readFileSync(
      resolve(process.cwd(), "packages/gasper-studio/src/documentFileWorkflow.ts"),
      "utf8",
    );
    expect(appSource).toMatch(/newLiveDocument/);
    expect(appSource).toMatch(/gasper-live-isolated-proof/);
    expect(appSource).toMatch(/holdUserWorldFrame/);
    expect(appSource).toMatch(/data-cinematic-set/);
    expect(appSource).toMatch(/playNorthstarTwenty/);
    expect(appSource).toMatch(/pinOpeningRest/);
    expect(appSource).not.toMatch(/if \(!captureTag\) dais.playNorthstarTwenty/);
    const twenty = readFileSync(
      resolve(process.cwd(), "packages/desktop/src/gasper/GasperRigController.ts"),
      "utf8",
    );
    const playStart = twenty.indexOf("playNorthstarTwenty");
    const playEnd = twenty.indexOf("N187 — file a grounded strut", playStart);
    const play = twenty.slice(playStart, playEnd);
    expect(play).toContain('driver.setLocomotion("life", { x: 180, z: 120, cruise: 380 })');
    expect(play).not.toContain('setEmbodiment("presence")');
    expect(appSource).toMatch(/CINEMATIC_ZOOM/);
    expect(appSource).toMatch(/CINEMATIC_PAN_Y/);
    expect(appSource).not.toMatch(/10-showcase-project\.gasper/);
    expect(appSource).not.toMatch(/dais\.ensurePhysicsDriver\?\.\(\)\?\.setLocomotion\?\.\("life"/);
    expect(workflowSource).toMatch(/export async function newLiveDocument/);
    expect(workflowSource).toMatch(/createEmptyDocument/);
    expect(workflowSource).toMatch(/dais\.snapEmbodiment\(input\.embodiment\)/);
    expect(captureSource).toMatch(/livePhysicsSurface:\s*true/);
    expect(captureSource).toMatch(/cinematicCamera:\s*true/);
    expect(captureSource).toMatch(/"cinematic-arc"/);
    expect(captureSource).toMatch(/newLiveDocument/);
    expect(captureSource).toMatch(/holdUserWorldFrame/);
    expect(captureSource).toMatch(/applyFitCamera/);
    expect(captureSource).toMatch(/setCompositionWorldEnvelope/);
    expect(captureSource).toMatch(/ISOLATED_120_CAMERA_NOT_LOCKED_100/);
    expect(captureSource).toMatch(/ISOLATED_120_CAMERA_NOT_MEDIUM_SHOT/);
    expect(captureSource).toMatch(/firstTargetX/);
    expect(captureSource).not.toMatch(/relockLivewalk/);
    expect(captureSource).not.toMatch(/lockCinematicCamera/);
    expect(captureSource).toMatch(/WALK_BAND_CRUISE/);
    expect(captureSource).toMatch(/enableBoo\?\.\(true\)/);
    expect(captureSource).toMatch(/launchWorldComet\?\.\(\{ gatherSeconds: 0\.8/);
    expect(captureSource).not.toMatch(/setExternalGaze/);
    expect(captureSource).not.toMatch(/setAttentionYaw/);
    expect(captureSource).not.toMatch(/fileTendency/);
    expect(captureSource).not.toMatch(/applyIntent\("look toward"\)/);
    expect(captureSource).not.toMatch(/ISOLATED_120_CAMERA_NOT_CINEMATIC/);
    expect(captureSource).toMatch(/Location\.prototype, \"reload\"/);
  });

  it("waits for the mounted showcase bootstrap before taking deterministic authority", () => {
    const captureSource = readFileSync(
      resolve(process.cwd(), "scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs"),
      "utf8",
    );

    expect(captureSource).toMatch(
      /waitForFunction\(\(\) => \{[\s\S]*showcase-note[\s\S]*Live physics surface/,
    );
    expect(captureSource).toMatch(
      /loadShowcaseDocument schedules three bounded recovery checks[\s\S]*waitForTimeout\(1250\)/,
    );
  });

  it("captures the planted-contact support observables for G2 review", () => {
    const captureSource = readFileSync(
      resolve(process.cwd(), "scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs"),
      "utf8",
    );

    expect(captureSource).toMatch(/gaitFlatten:\s*Number\(ds\.gaitFlatten \?\? 0\)/);
    expect(captureSource).toMatch(/gaitFlattenW:\s*Number\(ds\.gaitFlattenW \?\? 0\)/);
  });

  it("derives the visible world-rig transform from the applied pose and renderer feeds", () => {
    const expected = expectedWorldRigProjection({
      pose: { applied: { x: 80, y: 64, z: 192, tilt: 12 } },
      dataset: { worldDepthScale: 0.9090909, gaitSwayX: 4, gaitBob: 6, booBob: 0, gaitRoll: -2 },
    });

    expect(expected.translateX).toBeCloseTo(9.090909, 5);
    expect(expected.translateY).toBeCloseTo(-7.090909, 5);
    expect(expected.scale).toBeCloseTo(0.9090909, 7);
    expect(expected.rotate).toBeCloseTo(-12, 7);
  });

  it("accepts only a transform that matches the projection equation", () => {
    const sample = {
      pose: { applied: { x: 80, y: 64, z: 192, tilt: 12 } },
      dataset: { worldDepthScale: 0.9090909, gaitSwayX: 4, gaitBob: 6, booBob: 0, gaitRoll: -2 },
    };
    const expected = expectedWorldRigProjection(sample);
    const transform = `translate(${expected.translateX.toFixed(3)} ${expected.translateY.toFixed(3)}) translate(120 190) scale(${expected.scale.toFixed(5)}) rotate(${expected.rotate.toFixed(2)} 0 -45) translate(-120 -190)`;

    expect(parseWorldRigTransform(transform)).not.toBeNull();
    expect(projectionResidual(sample, transform).pass).toBe(true);
    expect(projectionResidual(sample, transform.replace("translate(9.091", "translate(10.091")).pass).toBe(false);
    expect(projectionResidual(sample, transform.replace("rotate(-12.00", "rotate(-11.9946")).pass).toBe(true);
  });

  it("treats only the renderer's declared numeric rounding as projection error", () => {
    const sample = {
      pose: { applied: { x: 1768.2026020159908, y: 0, z: 2350.7746959353904, tilt: -4.808909875714475 } },
      dataset: { worldDepthScale: 0.44957, gaitSwayX: 4.91, gaitRoll: -0.459 },
    };
    const transform = "translate(99.367 -42.934) translate(120 190) scale(0.44957) rotate(4.81 0 -45) translate(-120 -190)";

    expect(projectionResidual(sample, transform).pass).toBe(true);
    expect(projectionResidual(sample, transform.replace("translate(99.367", "translate(99.567")).pass).toBe(false);
  });

  it("checks the rendered screen-space anchor against the world-rig equation", () => {
    const sample = {
      pose: { applied: { x: 80, y: 64, z: 192, tilt: 12 } },
      dataset: { worldDepthScale: 0.9090909, gaitSwayX: 4, gaitBob: 6, booBob: 0, gaitRoll: -2 },
    };
    const base = { a: 2, b: 0, c: 0, d: 2, e: 100, f: 50 };
    const expected = expectedWorldRigScreenMatrix(sample, base);

    expect(expected.e).toBeCloseTo(89.954717, 5);
    expect(expected.f).toBeCloseTo(121.487276, 5);
    expect(screenProjectionResidual(sample, expected, base).pass).toBe(true);
    expect(screenProjectionResidual(sample, { ...expected, e: expected.e + 1 }, base).pass).toBe(false);
  });

  it("rejects a timing sequence that repeats at a small fixed period", () => {
    const census = decisionTimingCensus([0, 1, 2, 3, 4, 5, 6]);
    expect(census.aperiodic).toBe(false);
    expect(census.periods).toContain(1);
  });

  it("accepts a finite timing sequence when no period has two complete repeats", () => {
    const census = decisionTimingCensus([0, 2483.333333333, 5991.666666666, 11091.666666666]);
    expect(census.aperiodic).toBe(true);
    expect(census.periods).toEqual([]);
  });

  it("counts only meaningful travel reversals for a bounded showcase beat", () => {
    expect(directionReversalCount([0, 120, 640, 20, -480, -640, -30, 510], 50)).toBe(2);
    expect(directionReversalCount([0, 3, -4, 2, -1], 50)).toBe(0);
  });

  it("N260 focused 6s gait proof refuses a 20s capture and records live gaitProof", () => {
    const gait6 = readFileSync(
      resolve(process.cwd(), "scripts/gasper-physics-001/capture-gait-6s-120fps.mjs"),
      "utf8",
    );
    expect(gait6).toContain("focused 6s exact-120fps");
    expect(gait6).toContain("ACTIVE_SEC > 0) || ACTIVE_SEC > 16");
    expect(gait6).toContain("getGaitProofSample");
    expect(gait6).toContain("requestOneFrame");
    expect(gait6).toContain("i * 0.25");
    expect(gait6).toContain("per-frame support telemetry");
    expect(gait6).toContain("GASPER_HOLD_ZOOM || 2");
    expect(gait6).toContain("GASPER_HOLD_PAN_Y || -40");
    expect(gait6).not.toMatch(/GASPER_CAPTURE_SEC \|\| 20/);
  });

  it("N246 exposes kernel support/lobe and flags a frozen dataset against live bodyX", () => {
    const captureSource = readFileSync(
      resolve(process.cwd(), "scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs"),
      "utf8",
    );
    expect(captureSource).toContain("gaitSupportLiveMetric");
    expect(captureSource).toContain("gaitProof");
    expect(captureSource).toContain("requestOneFrame");
    expect(captureSource).toContain("getGaitProofSample");
    expect(captureSource).toContain("lowerContour");
    for (const key of GAIT_DENSE_PROOF_KEYS) {
      expect(captureSource).toContain(key);
    }
    const controller = readFileSync(
      resolve(process.cwd(), "packages/desktop/src/gasper/GasperRigController.ts"),
      "utf8",
    );
    expect(controller).toContain("getGaitProofSample");
    expect(summarizeLowerContour({ bottomY: [10, 12, 20, 12, 10] }).sampleCount).toBe(5);
    expect(summarizeLowerContour({ bottomY: [10, 12, 20, 12, 10] }).midBottom).toBe(20);

    const live = gaitSupportLiveMetric(Array.from({ length: 8 }, (_, index) => ({
      bodyX: index * 20,
      supportSide: index % 2 === 0 ? 1 : -1,
      body: {
        gait: { phase: index * 0.7 },
        support: { side: index % 2 === 0 ? 1 : -1, plantedCompress: 0.2 + 0.1 * (index % 3) },
      },
      dataset: { gaitPhase: String(index * 0.7), worldPoseX: String(index * 20), gaitPlantX: String(index) },
    })));
    expect(live.datasetStaleVsKernel).toBe(false);
    expect(live.kernelSideLive).toBe(true);

    const gait1 = JSON.parse(readFileSync(
      resolve(process.cwd(), "research/proofs/grok-successor-002/take-20s-20260815-gait1/samples.json"),
      "utf8",
    ));
    const frozen = gaitSupportLiveMetric(gait1);
    expect(frozen.travel).toBeGreaterThan(8);
    expect(frozen.kernelSideLive).toBe(true);
    expect(frozen.datasetStaleVsKernel).toBe(true);
  });

  it("requires the planted support carrier to stay phase-coherent with the step and shadow channels", () => {
    const valid = wispwalkerSupportCarrierMetric(Array.from({ length: 24 }, (_, index) => {
      const sign = index < 12 ? 1 : -1;
      return {
        body: { mode: "locomotion", body: { contact: true } },
        dataset: {
          gaitStepX: sign * 8,
          gaitFlatten: sign * 4,
          gaitFlattenW: 8,
          gaitShadowDx: sign * 2,
        },
      };
    }));
    expect(valid.pass).toBe(true);
    expect(valid.flattenSupportFraction).toBe(1);
    expect(valid.flattenStepSignAgreement).toBe(1);

    const incoherent = wispwalkerSupportCarrierMetric(Array.from({ length: 24 }, (_, index) => ({
      body: { mode: "locomotion", body: { contact: true } },
      dataset: {
        gaitStepX: index < 12 ? 8 : -8,
        gaitFlatten: index < 12 ? -4 : 4,
        gaitFlattenW: 8,
        gaitShadowDx: index < 12 ? 2 : -2,
      },
    })));
    expect(incoherent.pass).toBe(false);
    expect(incoherent.flattenStepSignAgreement).toBe(0);
  });

  it("keeps an authored reversal and ignores near-rest sign chatter", () => {
    expect(sustainedDirectionReversalCount(
      [0, 120, 640, 20, -480, -640, -30, 510, 540, 560],
      50,
      2,
    )).toBe(2);
    expect(sustainedDirectionReversalCount(
      [120, 640, -480, -640, -30, 20, -44, -73, 0, -80, 0, -62, -62, 0],
      50,
      2,
    )).toBe(1);
  });

  it("requires the rendered Wispwalker contour to separate two foot roots from its center cleft", () => {
    const postSettleCleanContour = [
      121.57, 125.96, 128.57, 134.41, 147.82, 156.98, 163.52,
      168.20, 172.75, 178.75, 183.25, 187.59, 190.18, 193.05,
      193.66, 193.54, 192.69, 191.32, 189.66, 187.14, 186.00,
      186.44, 188.61, 190.22, 191.60, 192.36, 192.40, 191.65,
      188.71, 186.15, 181.91, 177.54, 173.22, 168.84, 162.70,
      157.84, 148.85, 135.42, 129.34, 125.30, 120.74,
    ];
    const metric = wispwalkerFootReadabilityMetric({ bottomY: postSettleCleanContour, widthPx: 170.97 });
    expect(metric.pass).toBe(true);
  });

  it("requires the rendered Wispwalker roots to exchange load across the walk", () => {
    const alternating = Array.from({ length: 48 }, (_, index) => {
      const delta = index < 24 ? 2.4 : -2.4;
      const bottomY = Array.from({ length: 41 }, () => 100);
      bottomY[13] = 110 + delta;
      bottomY[25] = 110 - delta;
      bottomY[20] = 100;
      return { bodyContour: { bbox: { width: 170 }, bottomY } };
    });
    const metric = wispwalkerGaitMotionMetric(alternating, {
      minImbalancePx: 1,
      minDirectionalRun: 6,
      minReversals: 1,
    });
    expect(metric.pass).toBe(true);
    expect(wispwalkerGaitMotionMetric(alternating.slice(0, 24), {
      minImbalancePx: 1,
      minDirectionalRun: 6,
      minReversals: 1,
    }).pass).toBe(false);
  });

  it("uses the screen-transformed contour when proving rendered support exchange", () => {
    const base = Array.from({ length: 41 }, () => 100);
    base[13] = 112;
    base[25] = 108;
    const alternating = Array.from({ length: 48 }, (_, index) => {
      const delta = index < 24 ? 2.4 : -2.4;
      const rendered = Array.from({ length: 41 }, () => 100);
      rendered[13] = 110 + delta;
      rendered[25] = 110 - delta;
      return {
        bodyContour: { bbox: { width: 170 }, bottomY: base },
        renderedBodyContour: { bbox: { width: 170 }, bottomY: rendered },
      };
    });
    expect(wispwalkerGaitMotionMetric(alternating, {
      minImbalancePx: 1,
      minDirectionalRun: 6,
      minReversals: 1,
    }).pass).toBe(true);
  });

  it("requires captured flight pressure to produce a directional rendered contour response", () => {
    const metric = windResistanceMetric([
      {
        dataset: { windPressure: 0.62, windDirX: 0.86 },
        bodyContour: { horizontalExtent: { asymmetryPx: 4.8 } },
      },
      {
        dataset: { windPressure: 0.74, windDirX: 0.91 },
        bodyContour: { horizontalExtent: { asymmetryPx: 5.6 } },
      },
      {
        dataset: { windPressure: 0.68, windDirX: 0.88 },
        bodyContour: { horizontalExtent: { asymmetryPx: 4.9 } },
      },
      {
        dataset: { windPressure: 0.58, windDirX: -0.88 },
        bodyContour: { horizontalExtent: { asymmetryPx: -4.4 } },
      },
      {
        dataset: { windPressure: 0.66, windDirX: -0.90 },
        bodyContour: { horizontalExtent: { asymmetryPx: -5.0 } },
      },
      {
        dataset: { windPressure: 0.71, windDirX: -0.86 },
        bodyContour: { horizontalExtent: { asymmetryPx: -4.7 } },
      },
    ]);

    expect(metric.pass).toBe(true);
    expect(metric.maxPressure).toBeGreaterThan(0.5);
    expect(metric.directionReversalCount).toBe(1);
    expect(windResistanceMetric([
      { dataset: { windPressure: 0, windDirX: 0 }, bodyContour: { horizontalExtent: { asymmetryPx: 0 } } },
    ]).pass).toBe(false);
  });

  it("recognizes directional pressure deltas when the embodiment has a static contour bias", () => {
    const metric = windResistanceMetric([
      { dataset: { windPressure: 0.08, windDirX: 0.52 }, bodyContour: { horizontalExtent: { asymmetryPx: -15 } } },
      { dataset: { windPressure: 0.12, windDirX: 0.58 }, bodyContour: { horizontalExtent: { asymmetryPx: -14 } } },
      { dataset: { windPressure: 0.16, windDirX: 0.62 }, bodyContour: { horizontalExtent: { asymmetryPx: -13 } } },
      { dataset: { windPressure: 0.66, windDirX: 0.82 }, bodyContour: { horizontalExtent: { asymmetryPx: -7 } } },
      { dataset: { windPressure: 0.62, windDirX: 0.86 }, bodyContour: { horizontalExtent: { asymmetryPx: -6 } } },
      { dataset: { windPressure: 0.58, windDirX: 0.80 }, bodyContour: { horizontalExtent: { asymmetryPx: -8 } } },
      { dataset: { windPressure: 0.08, windDirX: -0.52 }, bodyContour: { horizontalExtent: { asymmetryPx: -12 } } },
      { dataset: { windPressure: 0.12, windDirX: -0.58 }, bodyContour: { horizontalExtent: { asymmetryPx: -13 } } },
      { dataset: { windPressure: 0.16, windDirX: -0.62 }, bodyContour: { horizontalExtent: { asymmetryPx: -14 } } },
      { dataset: { windPressure: 0.66, windDirX: -0.82 }, bodyContour: { horizontalExtent: { asymmetryPx: -19 } } },
      { dataset: { windPressure: 0.62, windDirX: -0.86 }, bodyContour: { horizontalExtent: { asymmetryPx: -20 } } },
      { dataset: { windPressure: 0.58, windDirX: -0.80 }, bodyContour: { horizontalExtent: { asymmetryPx: -18 } } },
    ]);

    expect(metric.pass).toBe(true);
    expect(metric.pressureTrendPass).toBe(true);
    expect(metric.positivePressureDeltaPx).toBeGreaterThan(0.5);
    expect(metric.negativePressureDeltaPx).toBeLessThan(-0.5);
  });


  it("one travel direction leaves negativePressureDeltaPx null (Stage 4 fail)", () => {
    const metric = windResistanceMetric([
      { dataset: { windPressure: 0.12, windDirX: 0.70 }, bodyContour: { horizontalExtent: { asymmetryPx: 1.0 } } },
      { dataset: { windPressure: 0.20, windDirX: 0.80 }, bodyContour: { horizontalExtent: { asymmetryPx: 1.4 } } },
      { dataset: { windPressure: 0.66, windDirX: 0.90 }, bodyContour: { horizontalExtent: { asymmetryPx: 4.2 } } },
      { dataset: { windPressure: 0.62, windDirX: 0.88 }, bodyContour: { horizontalExtent: { asymmetryPx: 3.8 } } },
    ]);
    expect(metric.pass).toBe(false);
    expect(metric.positivePressureDeltaPx).toBeGreaterThan(0.5);
    expect(metric.negativePressureDeltaPx).toBeNull();
  });

  it("kernel helper reconstructs both-sign pressure deltas from dirX + pressure", () => {
    const samples = [];
    for (let i = 0; i < 8; i += 1) {
      const t = i / 7;
      samples.push({ pressure: 0.10 + 0.55 * t, dirX: 0.4 + 0.5 * t });
    }
    for (let i = 0; i < 8; i += 1) {
      const t = i / 7;
      samples.push({ pressure: 0.10 + 0.55 * t, dirX: -(0.4 + 0.5 * t) });
    }
    const metric = kernelWindResistanceMetric(samples);
    expect(metric.pass).toBe(true);
    expect(metric.positivePressureDeltaPx).toBeGreaterThanOrEqual(0.5);
    expect(metric.negativePressureDeltaPx).toBeLessThanOrEqual(-0.5);
    expect(expectedWindAsymmetryPx(1, 1)).toBeGreaterThan(0.5);
    expect(expectedWindAsymmetryPx(1, -1)).toBeLessThan(-0.5);
    expect(expectedWindAsymmetryPx(1, -1)).toBeCloseTo(-expectedWindAsymmetryPx(1, 1), 9);
  });

  it("rejects an idle-origin reset at the Wispwalker-to-Boo handoff", () => {
    const valid = northstarHandoffMetric([
      { embodiment: "wispwalker", body: { mode: "locomotion", body: { x: 280, y: 0, z: 72, contact: true } } },
      { embodiment: "presence", body: { mode: "comet-gather", body: { x: 280, y: 0, z: 72, contact: true } } },
    ]);
    expect(valid.pass).toBe(true);
    expect(valid.positionDelta).toBe(0);
    expect(valid.fromMode).toBe("locomotion");

    const reset = northstarHandoffMetric([
      { embodiment: "wispwalker", body: { mode: "locomotion", body: { x: 280, y: 0, z: 72, contact: true } } },
      { embodiment: "wispwalker", body: { mode: "idle", body: { x: 0, y: 0, z: 0, contact: true } } },
      { embodiment: "presence", body: { mode: "comet-gather", body: { x: 0, y: 0, z: 0, contact: true } } },
    ]);
    expect(reset.pass).toBe(false);
    expect(reset.fromMode).toBe("idle");
    expect(reset.positionDelta).toBe(0);
  });

  it("fills dropped foot bins so renderedBodyContour.bottomY stays complete", () => {
    const raw = Array.from({ length: 41 }, (_, index) => 120 + Math.sin(index / 6) * 8);
    raw[0] = null;
    raw[20] = null;
    raw[40] = null;
    const filled = completeContourBottomY(raw);
    expect(filled).toHaveLength(41);
    expect(filled.every(Number.isFinite)).toBe(true);
    expect(filled[20]).toBeCloseTo((raw[19] + raw[21]) / 2, 8);
    expect(contourCompletenessMetric(raw).pass).toBe(true);
    expect(contourCompletenessMetric(raw).rawNullCount).toBe(3);
    expect(contourCompletenessMetric(raw).remainingNullCount).toBe(0);
  });
});
