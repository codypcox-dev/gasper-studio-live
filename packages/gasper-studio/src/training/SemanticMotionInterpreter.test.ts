import { describe, expect, it } from "vitest";

import type { MotionMechanicsSummary } from "../../../shared/src/gasper-performance/reference/mechanics.js";
import {
  ProviderSemanticMotionInterpreter,
  SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA,
  buildSemanticMotionPrompt,
  type SemanticMotionProvider,
  type SemanticMotionProposal,
} from "./SemanticMotionInterpreter.js";

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
    movementName: "lateral support exchange",
    plainLanguage: "Weight shifts from the left support to the right support.",
    beats: [
      {
        id: "semantic-beat-1",
        t0Ms: 0,
        t1Ms: 500,
        primitive: "support_exchange",
        purpose: "transfer support while preserving lateral rhythm",
        roles: ["commitment", "release"],
        recognitionCritical: ["left-to-right support order"],
        rhythm: { phase: "syncopated", accentTimesMs: [500] },
        motionQuality: { restraint: 0.3, playfulness: 0.7, urgency: 0.8 },
        poseIntent: {
          extremes: ["right-weighted arrival"],
          silhouette: "wide lateral exchange",
          lineOfAction: "left to right",
        },
        evidenceRefs: ["pose-frame:0:left", "pose-frame:500:right"],
        confidence: 0.86,
        rationale: "The calibrated contact sequence changes support at 500ms.",
      },
    ],
    uncertainties: [
      {
        id: "uncertainty-1",
        description: "Camera depth does not establish absolute travel.",
        confidence: 0.95,
        evidenceRefs: ["frame:contact-sheet:0"],
      },
    ],
    unsupportedAssumptions: ["absolute force is unavailable"],
    externalDefinitionRefs: [],
    provider: { id: "fake", model: "fixture", responseId: "response-1" },
    ...overrides,
  };
}

function provider(output: unknown): SemanticMotionProvider {
  return {
    id: "fake",
    model: "fixture",
    generateStructured: async () => ({ responseId: "response-1", output }),
  };
}

const input = {
  userIntent: "encode this footwork",
  mechanics,
  evidenceFrames: [{ ref: "frame:contact-sheet:0", tMs: 250 }],
  externalDefinitions: [],
  allowedPrimitives: ["plant", "support_exchange", "slide"] as const,
};

describe("semantic motion interpreter", () => {
  it("bounds dense root evidence before crossing the model boundary", () => {
    const denseMechanics: MotionMechanicsSummary = {
      ...mechanics,
      rootMotion: {
        normalization: "initial_subject_image_height",
        subjectId: "subject-1",
        scaleImageHeight: 0.4,
        samples: Array.from({ length: 240 }, (_, index) => ({
          sourceFrameIndex: index,
          tMs: index * (1_000 / 240),
          imageX: 0.4 + index / 2_400,
          imageY: 0.5,
          normalizedX: index / 960,
          normalizedDepth: 0 as const,
          normalizedVelocityXPerSecond: 0.25,
          confidence: 0.9,
          evidence: [{ kind: "derived" as const, ref: `root:${index}`, confidence: 0.9 }],
        })),
        netNormalizedDisplacement: { x: 0.25, depth: 0 },
        direction: "right",
        confidence: 0.9,
      },
    };

    const packet = buildSemanticMotionPrompt({ ...input, mechanics: denseMechanics });
    const payload = JSON.parse(packet.user) as {
      mechanics: {
        rootMotion: null | {
          samples: Array<Record<string, unknown>>;
        };
        supportEvents: Array<{ evidenceRefs: string[]; id?: string }>;
      };
    };

    expect(payload.mechanics.rootMotion?.samples).toHaveLength(24);
    expect(payload.mechanics.rootMotion?.samples[0]?.tMs).toBe(0);
    expect(payload.mechanics.rootMotion?.samples.at(-1)?.tMs).toBe(denseMechanics.rootMotion.samples.at(-1)?.tMs);
    expect(payload.mechanics.rootMotion?.samples.every((sample) => !("sourceFrameIndex" in sample))).toBe(true);
    expect(payload.mechanics.rootMotion?.samples.every((sample) => !("evidence" in sample))).toBe(true);
    expect(payload.mechanics.supportEvents[0]?.evidenceRefs).toEqual(["pose-frame:0:left"]);
    expect(payload.mechanics.supportEvents.every((event) => !("id" in event))).toBe(true);
    expect(packet.user.length).toBeLessThan(8_000);
  });

  it("accepts only cited, closed semantic proposals and stamps provider identity", async () => {
    let capturedPrompt = "";
    const fake: SemanticMotionProvider = {
      id: "fake",
      model: "fixture",
      generateStructured: async (packet) => {
        capturedPrompt = `${packet.system}\n${packet.user}`;
        return { responseId: "response-1", output: proposal() };
      },
    };
    const interpreter = new ProviderSemanticMotionInterpreter(fake);

    const result = await interpreter.interpret(input, new AbortController().signal);

    expect(result.beats[0]?.primitive).toBe("support_exchange");
    expect(result.provider).toEqual({ id: "fake", model: "fixture", responseId: "response-1" });
    expect(capturedPrompt).toMatch(/never.*transform|closed json|unavailable/i);
    expect(capturedPrompt).toMatch(/cite only.*evidenceRefs.*\.ref/i);
    expect(capturedPrompt).toMatch(/stable semantic knowledge.*inferred/i);
    expect(capturedPrompt).toMatch(/external definitions.*not required/i);
    expect(capturedPrompt).toMatch(/user-authored semantic intent.*not a classification/i);
    expect(capturedPrompt).toMatch(/nonhuman form.*root and contact timing.*sufficient/i);
    expect(capturedPrompt).toMatch(/no more than 4 semantic beats/i);
    expect(capturedPrompt).toMatch(/unknown_movement.*at least one uncertainty/i);
    expect(SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA.properties.beats.maxItems).toBe(4);
    expect(SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA.properties.beats.items.properties.evidenceRefs.maxItems).toBe(8);
    expect(SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA.properties.uncertainties.items.properties.evidenceRefs.maxItems).toBe(8);
    expect(capturedPrompt).not.toMatch(/imageLandmarks|worldLandmarks/);
  });

  it("rejects prose, unknown primitives, and evidence outside the supplied packet", async () => {
    await expect(
      new ProviderSemanticMotionInterpreter(provider("looks like a cool dance"))
        .interpret(input, new AbortController().signal),
    ).rejects.toThrow(/schema|proposal|object/i);

    await expect(
      new ProviderSemanticMotionInterpreter(
        provider(proposal({
          beats: [{ ...proposal().beats[0]!, primitive: "magic_dance" as never }],
        })),
      ).interpret(input, new AbortController().signal),
    ).rejects.toThrow(/primitive|enum/i);

    await expect(
      new ProviderSemanticMotionInterpreter(
        provider(proposal({
          beats: [{ ...proposal().beats[0]!, evidenceRefs: ["invented:observation"] }],
        })),
      ).interpret(input, new AbortController().signal),
    ).rejects.toThrow(/evidence|supplied/i);
  });

  it("represents an unknown named movement explicitly instead of mapping a convenient preset", async () => {
    const unknown = proposal({
      resolution: "unknown_movement",
      movementName: "unresolved named move",
      plainLanguage: "The supplied observations do not establish the named movement.",
      beats: [],
      uncertainties: [
        {
          id: "unknown-1",
          description: "External definition or clearer reference is required.",
          confidence: 1,
          evidenceRefs: ["frame:contact-sheet:0"],
        },
      ],
    });

    const result = await new ProviderSemanticMotionInterpreter(provider(unknown))
      .interpret(input, new AbortController().signal);

    expect(result.resolution).toBe("unknown_movement");
    expect(result.beats).toEqual([]);
  });

  it("rejects model output that exceeds the bounded semantic beat budget", async () => {
    const overBudget = proposal({
      beats: Array.from({ length: 5 }, (_, index) => ({
        ...proposal().beats[0]!,
        id: `semantic-beat-${index}`,
      })),
    });

    await expect(new ProviderSemanticMotionInterpreter(provider(overBudget))
      .interpret(input, new AbortController().signal)).rejects.toThrow(/4|array|proposal|schema/i);
  });
});
