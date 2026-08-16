import { describe, expect, it } from "vitest";

import type { MotionMechanicsSummary } from "../../../shared/src/gasper-performance/reference/mechanics.js";
import type { SemanticMotionProposal } from "./SemanticMotionInterpreter.js";
import { compileSemanticMotionScore } from "./SemanticMotionCompiler.js";

const mechanics: MotionMechanicsSummary = {
  schema: "gasper.motion-mechanics.v1",
  sourceTrackId: "pose-track-1",
  sourceObservationHash: `sha256:${"a".repeat(64)}`,
  durationMs: 1_000,
  sourceFrameCount: 61,
  calibration: {
    subjectId: "subject-1",
    floorY: 0.9,
    tolerance: 0.03,
    maxFootSpeedPerSecond: 0.2,
    minVisibility: 0.8,
    evidence: [{ kind: "calibrated", ref: "floor:manual", confidence: 1 }],
  },
  rootMotion: null,
  supportEvents: [
    {
      id: "support-1",
      sourceFrameIndex: 0,
      tMs: 0,
      support: "source_left",
      confidence: 0.9,
      footHeightError: 0.01,
      footSpeedPerSecond: 0.02,
      rootSpeedPerSecond: 0.1,
      evidence: [{ kind: "derived", ref: "pose-frame:0:left", confidence: 0.9 }],
    },
    {
      id: "support-2",
      sourceFrameIndex: 30,
      tMs: 500,
      support: "source_right",
      confidence: 0.88,
      footHeightError: 0.01,
      footSpeedPerSecond: 0.03,
      rootSpeedPerSecond: 0.12,
      evidence: [{ kind: "derived", ref: "pose-frame:500:right", confidence: 0.88 }],
    },
  ],
  diagnostics: [],
  unavailable: ["absolute_force", "absolute_mass", "surface_friction", "absolute_scale"],
};

function proposal(overrides: Partial<SemanticMotionProposal> = {}): SemanticMotionProposal {
  return {
    schema: "gasper.semantic-motion-proposal.v1",
    resolution: "proposed",
    movementName: "lateral footwork",
    plainLanguage: "Plant left, then exchange onto the right support with a sharp accent.",
    beats: [
      {
        id: "semantic-plant",
        t0Ms: 0,
        t1Ms: 500,
        primitive: "plant",
        purpose: "establish the base before the exchange",
        roles: ["anticipation", "commitment"],
        recognitionCritical: ["left support establishes the base"],
        rhythm: { phase: "sustained", accentTimesMs: [0] },
        motionQuality: { restraint: 0.7, playfulness: 0.2, urgency: 0.35 },
        poseIntent: {
          extremes: ["low left load"],
          silhouette: "compact over the planted side",
          lineOfAction: "down and left",
        },
        evidenceRefs: ["pose-frame:0:left"],
        confidence: 0.84,
        rationale: "The first calibrated contact establishes the left base.",
      },
      {
        id: "semantic-exchange",
        t0Ms: 500,
        t1Ms: 1_000,
        primitive: "support_exchange",
        purpose: "snap the weight onto the right support",
        roles: ["release", "commitment"],
        recognitionCritical: ["left-to-right order", "sharp arrival"],
        rhythm: { phase: "syncopated", accentTimesMs: [500] },
        motionQuality: { restraint: 0.25, playfulness: 0.65, urgency: 0.8 },
        poseIntent: {
          extremes: ["right-weighted arrival"],
          silhouette: "wide lateral exchange",
          lineOfAction: "left to right",
        },
        evidenceRefs: ["pose-frame:500:right"],
        confidence: 0.86,
        rationale: "The measured contact changes at 500ms.",
      },
    ],
    uncertainties: [
      {
        id: "depth-unknown",
        description: "The monocular source does not establish depth travel.",
        confidence: 1,
        evidenceRefs: ["frame:contact-sheet:0"],
      },
    ],
    unsupportedAssumptions: ["absolute force is unavailable"],
    externalDefinitionRefs: [],
    provider: { id: "fake", model: "fixture", responseId: "response-1" },
    ...overrides,
  };
}

describe("semantic Motion Score compiler", () => {
  it("enriches unknown semantics while preserving every measured support boundary", () => {
    const score = compileSemanticMotionScore(mechanics, proposal(), "score-1");

    expect(score.beats.map((beat) => [beat.t0Ms, beat.t1Ms])).toEqual([
      [0, 500],
      [500, 1_000],
    ]);
    expect(score.beats[0]?.contact).toEqual({
      requiredSupports: ["source_left"],
      order: ["source_left"],
    });
    expect(score.beats[1]?.contact).toEqual({
      requiredSupports: ["source_left", "source_right"],
      order: ["source_left", "source_right"],
    });
    expect(score.beats[1]?.purpose).toMatch(/snap the weight/i);
    expect(score.beats[1]?.rhythm.phase).toBe("syncopated");
    expect(score.beats[1]?.motionQuality).toMatchObject({
      playfulness: 0.65,
      urgency: 0.8,
    });
    expect(score.beats[1]?.poseIntent.lineOfAction).toBe("left to right");
    expect(score.beats[1]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived", ref: "pose-frame:500:right" }),
        expect.objectContaining({ kind: "inferred", ref: "pose-frame:500:right" }),
      ]),
    );
    expect(score.provenance).toMatchObject({ compiler: "gasper-semantic-motion-compiler" });
  });

  it("keeps the measured first plant when a semantic proposal asks for an impossible exchange", () => {
    const conflicting = proposal({
      beats: [
        {
          ...proposal().beats[0]!,
          primitive: "support_exchange",
          recognitionCritical: ["exchange despite only one measured support"],
        },
        proposal().beats[1]!,
      ],
    });

    const score = compileSemanticMotionScore(mechanics, conflicting, "score-conflict");

    expect(score.beats[0]?.primitive).toBe("plant");
    expect(score.beats[0]?.ambiguities).toContainEqual(
      expect.objectContaining({ description: expect.stringMatching(/semantic.*support_exchange.*measured.*plant/i) }),
    );
  });

  it("refuses to compile an unresolved named movement", () => {
    expect(() => compileSemanticMotionScore(
      mechanics,
      proposal({ resolution: "unknown_movement", beats: [] }),
      "score-unknown",
    )).toThrow(/unknown movement/i);
  });
});
