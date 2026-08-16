import { describe, expect, it } from "vitest";

import { WISPWALKER_CAPABILITY_PROFILE } from "../../../../desktop/src/gasper/performance/WispwalkerCapabilityProfile.js";
import type { MotionPrimitiveId, MotionScore } from "./types.js";
import {
  hashPhysicsIntentPlan,
  retargetMotionScore,
  type EnvironmentPhysicsProfile,
} from "./retarget.js";

const environment: EnvironmentPhysicsProfile = {
  schema: "gasper.environment-physics.v1",
  id: "black-room-fixture",
  version: "1",
  gravityUnitsPerS2: 2_600,
  frictionMu: 0.381966,
  restitution: 0.618034,
  bounds: { xMin: -960, xMax: 960, yMin: 0, yMax: 1_080, zMin: -480, zMax: 480 },
  provenance: ["fixture:environment"],
};

function score(...primitives: MotionPrimitiveId[]): MotionScore {
  return {
    schema: "gasper.motion-score.v1",
    id: `score-${primitives.join("-")}`,
    sourceObservationHash: `sha256:${"c".repeat(64)}`,
    durationMs: primitives.length * 500,
    beats: primitives.map((primitive, index) => {
      const supportCount = primitive === "support_exchange" || primitive === "launch" ? 2 : primitive === "plant" ? 1 : 0;
      const supports = ["source_left", "source_right"].slice(0, supportCount);
      const t0Ms = index * 500;
      const t1Ms = (index + 1) * 500;
      const isTravel = primitive === "travel";
      return {
        id: `beat-${index + 1}`,
        t0Ms,
        t1Ms,
        sourceFrameRange: { start: index * 15, end: (index + 1) * 15 - 1 },
        primitive,
        purpose: `fixture ${primitive}`,
        travel: {
          direction: isTravel ? "right" as const : "stationary" as const,
          normalizedDisplacement: { x: isTravel ? 0.2 : 0, y: 0 },
          facing: { startDegrees: null, endDegrees: null },
          rootPath: [
            { tMs: t0Ms, x: 0, y: 0, confidence: 0.9 },
            { tMs: t1Ms, x: isTravel ? 0.2 : 0, y: 0, confidence: 0.9 },
          ],
        },
        rhythm: { cadenceHz: 2, phase: "even" as const, accentTimesMs: [t0Ms] },
        contact: { requiredSupports: supports, order: supports },
        motionQuality: {
          weight: 0.7,
          flow: 0.6,
          energy: 0.5,
          directness: 0.8,
          restraint: 0.4,
          playfulness: 0.3,
          urgency: 0.2,
        },
        poseIntent: {
          extremes: [`fixture ${primitive} extreme`],
          silhouette: `fixture ${primitive} silhouette`,
          lineOfAction: `fixture ${primitive} line`,
        },
        roles: ["commitment" as const],
        recognitionCritical: [`preserve ${primitive}`],
        confidence: 0.9,
        evidence: [{ kind: "derived" as const, ref: `fixture:${primitive}`, confidence: 0.9 }],
        ambiguities: [],
        corrections: [],
      };
    }),
    provenance: { compiler: "fixture", compilerVersion: "1", sourceRefs: [] },
  };
}

describe("form-aware Motion Score retargeting", () => {
  it("maps structural support mechanics exactly and travel through a stylized form-native goal", () => {
    // Break caught: Wispwalker mechanics could be flattened into a generic
    // humanoid pose or source coordinates instead of form-native goals.
    const result = retargetMotionScore(
      score("plant", "support_exchange", "travel"),
      WISPWALKER_CAPABILITY_PROFILE,
      environment,
      42,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dispositions).toEqual([
      { beatId: "beat-1", primitive: "plant", disposition: "exact" },
      { beatId: "beat-2", primitive: "support_exchange", disposition: "exact" },
      { beatId: "beat-3", primitive: "travel", disposition: "stylized" },
    ]);
    expect(result.plan.beats[1]?.supportGoals).toContainEqual(
      expect.objectContaining({ id: "support_count", target: 2, authority: "form" }),
    );
    expect(result.plan.beats[1]?.supportGoals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "initial_support_index", target: 0 }),
        expect.objectContaining({ id: "terminal_support_index", target: 1 }),
      ]),
    );
    expect(result.plan.beats[2]?.bodyGoals).toContainEqual(
      expect.objectContaining({ id: "normalized_travel_speed", authority: "performance" }),
    );
    expect(result.plan.beats[2]?.bodyGoals).toContainEqual(
      expect.objectContaining({ id: "normalized_travel_x", target: 0.2, unit: "body-length" }),
    );
    expect(result.plan.beats[2]?.bodyGoals).toContainEqual(
      expect.objectContaining({ id: "cadence", target: 2, unit: "hertz" }),
    );
  });

  it("maps measured root descent into Wispwalker's bounded vertical compression control", () => {
    // Break caught: the strict retargeter preserved lateral travel but had no
    // typed, form-safe route for a measured squat depth.
    const source = score("compress", "settle");
    const measured: MotionScore = {
      ...source,
      beats: source.beats.map((beat, index) => ({
        ...beat,
        travel: {
          ...beat.travel,
          rootPath: [
            { tMs: beat.t0Ms, x: 0, y: index === 0 ? 0 : 0.35, confidence: 0.94 },
            {
              tMs: (beat.t0Ms + beat.t1Ms) / 2,
              x: 0,
              y: index === 0 ? 0.42 : 0.35,
              confidence: 0.94,
            },
            { tMs: beat.t1Ms, x: 0, y: index === 0 ? 0.35 : 0.08, confidence: 0.94 },
          ],
        },
      })),
    };

    const result = retargetMotionScore(
      measured,
      WISPWALKER_CAPABILITY_PROFILE,
      environment,
      42,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const control = WISPWALKER_CAPABILITY_PROFILE.controls.find(
      (candidate) => candidate.id === "vertical_compression",
    );
    expect(control).toBeDefined();
    expect(result.plan.beats[0]?.bodyGoals).toContainEqual(
      expect.objectContaining({
        id: "normalized_vertical_compression",
        target: control?.safeMax,
        unit: "body-height-ratio",
        authority: "performance",
      }),
    );
    expect(result.plan.beats[1]?.bodyGoals).toContainEqual(
      expect.objectContaining({ id: "normalized_vertical_compression", target: 0.08 }),
    );
  });

  it("refuses launch while absolute mass and inertia remain uncalibrated", () => {
    // Break caught: a reference clip could smuggle an unproven force-sensitive
    // launch into the executor because the primitive name itself was allowed.
    const result = retargetMotionScore(
      score("launch"),
      WISPWALKER_CAPABILITY_PROFILE,
      environment,
      42,
    );

    expect(result).toMatchObject({
      ok: false,
      refusals: [
        {
          beatId: "beat-1",
          code: "CALIBRATION_REQUIRED",
          missingCalibration: ["mass_kg", "inertia_kg_m2"],
        },
      ],
    });
  });

  it("refuses a support mechanic that exceeds the target form", () => {
    // Break caught: source contact count could create a third Wispwalker foot.
    const oneRootForm = {
      ...WISPWALKER_CAPABILITY_PROFILE,
      supports: WISPWALKER_CAPABILITY_PROFILE.supports.slice(0, 1),
    };
    const result = retargetMotionScore(score("support_exchange"), oneRootForm, environment, 42);

    expect(result).toMatchObject({
      ok: false,
      refusals: [{ code: "SUPPORT_COUNT_MISMATCH" }],
    });
  });

  it("refuses unknown support identities instead of guessing their form mapping", () => {
    // Break caught: a semantic provider could rename a source contact and the
    // retargeter might silently attach it to whichever Wispwalker root was convenient.
    const input = score("plant");
    const malformed = {
      ...input,
      beats: input.beats.map((entry) => ({
        ...entry,
        contact: { requiredSupports: ["source_tail"], order: ["source_tail"] },
      })),
    };

    expect(retargetMotionScore(malformed, WISPWALKER_CAPABILITY_PROFILE, environment, 42))
      .toMatchObject({ ok: false, refusals: [{ code: "SUPPORT_ID_UNMAPPED" }] });
  });

  it("dual compiles identically and emits no direct transform surface", () => {
    // Break caught: wall-clock/random data or renderer instructions could make
    // the plan non-reproducible or bypass physics authority.
    const input = score("plant", "support_exchange", "travel");
    const first = retargetMotionScore(input, WISPWALKER_CAPABILITY_PROFILE, environment, 618);
    const second = retargetMotionScore(structuredClone(input), WISPWALKER_CAPABILITY_PROFILE, structuredClone(environment), 618);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(hashPhysicsIntentPlan(first.plan)).toBe(hashPhysicsIntentPlan(second.plan));
    expect(JSON.stringify(first.plan)).not.toMatch(
      /landmarks|svgPath|domTransform|translate\(|worldPosition|setPosition/i,
    );
    expect(first.plan.beats.every((beat) => beat.constraints.includes("physics-authority"))).toBe(true);
  });
});
