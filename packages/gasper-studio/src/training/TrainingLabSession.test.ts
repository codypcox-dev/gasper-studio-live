import { describe, expect, it, vi } from "vitest";

import { WISPWALKER_CAPABILITY_PROFILE } from "../../../desktop/src/gasper/performance/WispwalkerCapabilityProfile.js";
import type { MotionMechanicsSummary } from "../../../shared/src/gasper-performance/reference/mechanics.js";
import type {
  PhysicsIntentPlan,
  PoseObservationTrack,
  VideoAnalysisSelection,
  VideoSourceReceipt,
} from "../../../shared/src/gasper-performance/reference/types.js";
import type { SemanticMotionProposal } from "./SemanticMotionInterpreter.js";
import {
  ReferenceTrainingSession,
  type ReferenceTrainingStage,
} from "./ReferenceTrainingSession.js";

const HASH = `sha256:${"c".repeat(64)}`;

function source(): VideoSourceReceipt {
  return {
    schema: "gasper.video-source-receipt.v1",
    id: `source-${"c".repeat(64)}`,
    sourceKind: "direct_url",
    sourceRef: "https://video.example/footwork.mp4",
    contentHash: HASH,
    byteLength: 8_192,
    media: {
      durationMs: 1_000,
      widthPx: 1_280,
      heightPx: 720,
      frameRateHz: 60,
      container: "mp4",
      videoCodec: "h264",
    },
    resolver: { id: "fixture", version: "1" },
  };
}

const selection: VideoAnalysisSelection = {
  schema: "gasper.video-analysis-selection.v1",
  id: "selection-1",
  sourceContentHash: HASH,
  startMs: 0,
  endMs: 1_000,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  subjectId: "subject-1",
};

const poseTrack: PoseObservationTrack = {
  schema: "gasper.pose-observation-track.v1",
  id: "pose-track-1",
  sourceContentHash: HASH,
  durationMs: 1_000,
  sampleRateHz: 60,
  landmarkModel: {
    id: "fixture",
    version: "1",
    landmarkCount: 4,
    semanticIndices: { leftFoot: 0, rightFoot: 1, leftHip: 2, rightHip: 3 },
  },
  frames: [{ tMs: 0, poses: [] }],
  provenance: { analyzer: "fixture", analyzerVersion: "1" },
};

const mechanics: MotionMechanicsSummary = {
  schema: "gasper.motion-mechanics.v1",
  sourceTrackId: poseTrack.id,
  sourceObservationHash: HASH,
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

const semantic: SemanticMotionProposal = {
  schema: "gasper.semantic-motion-proposal.v1",
  resolution: "proposed",
  movementName: "lateral support exchange",
  plainLanguage: "Plant left, then snap onto the right support.",
  beats: [
    {
      id: "semantic-plant",
      t0Ms: 0,
      t1Ms: 500,
      primitive: "plant",
      purpose: "establish the left support",
      roles: ["anticipation", "commitment"],
      recognitionCritical: ["left support first"],
      rhythm: { phase: "sustained", accentTimesMs: [0] },
      motionQuality: { restraint: 0.7, playfulness: 0.2, urgency: 0.3 },
      poseIntent: { extremes: ["left load"], silhouette: "compact", lineOfAction: "down-left" },
      evidenceRefs: ["pose-frame:0:left"],
      confidence: 0.84,
      rationale: "Measured first contact.",
    },
    {
      id: "semantic-exchange",
      t0Ms: 500,
      t1Ms: 1_000,
      primitive: "support_exchange",
      purpose: "exchange onto the right support",
      roles: ["release", "commitment"],
      recognitionCritical: ["left-to-right order"],
      rhythm: { phase: "syncopated", accentTimesMs: [500] },
      motionQuality: { restraint: 0.25, playfulness: 0.65, urgency: 0.8 },
      poseIntent: { extremes: ["right arrival"], silhouette: "wide", lineOfAction: "left-right" },
      evidenceRefs: ["pose-frame:500:right"],
      confidence: 0.86,
      rationale: "Measured support exchange.",
    },
  ],
  uncertainties: [],
  unsupportedAssumptions: ["absolute force unavailable"],
  externalDefinitionRefs: [],
  provider: { id: "fake-semantic", model: "fixture", responseId: "semantic-1" },
};

describe("complete Training Lab session transaction", () => {
  it("owns source, mechanics, semantics, retargeting, persistence, and preview as one revisioned flow", async () => {
    const persisted: ReferenceTrainingStage[] = [];
    let allowedPrimitives: readonly string[] = [];
    const startPreview = vi.fn((_plan: PhysicsIntentPlan) => undefined);
    const stopPreview = vi.fn(() => undefined);
    const session = new ReferenceTrainingSession(
      {
        resolveLinkedSource: async () => ({
          sessionId: "training-complete-1",
          receipt: source(),
          mediaUrl: `/__gasper/training/media/${"c".repeat(64)}`,
        }),
      },
      {},
      {
        analyzer: {
          id: "fixture-analyzer",
          version: "1",
          analyze: async (_input, _signal, onProgress) => {
            onProgress({ completed: 61, total: 61, tMs: 1_000 });
            return { selection, poseTrack, mechanics, evidenceFrames: [] };
          },
        },
        semanticInterpreter: {
          interpret: async (input) => {
            allowedPrimitives = input.allowedPrimitives;
            return semantic;
          },
        },
        formProfile: WISPWALKER_CAPABILITY_PROFILE,
        environment: {
          schema: "gasper.environment-physics.v1",
          id: "studio-black-room",
          version: "1",
          gravityUnitsPerS2: 980,
          frictionMu: 0.42,
          restitution: 0.18,
          bounds: { xMin: -1_000, xMax: 1_000, yMin: 0, yMax: 1_000, zMin: -1_000, zMax: 1_000 },
          provenance: ["fixture-environment"],
        },
        seed: 42,
        persister: {
          writeStage: async (_sessionId, stage) => {
            persisted.push(stage);
            return { artifactHash: `sha256:${"d".repeat(64)}` };
          },
        },
        preview: { start: startPreview, stop: stopPreview },
      },
    );

    await session.linkVideo("https://video.example/footwork.mp4");
    const result = await session.analyze("make the support exchange read as crisp footwork");
    const compiled = session.snapshot();

    expect(result.ok).toBe(true);
    expect(compiled.status).toBe("compiled");
    expect(compiled.userIntent).toMatch(/crisp footwork/);
    expect(allowedPrimitives).not.toContain("launch");
    expect(allowedPrimitives).toContain("compress");
    expect(compiled.motionScore?.beats.map((beat) => beat.primitive)).toEqual([
      "plant",
      "support_exchange",
    ]);
    expect(compiled.physicsPlan?.beats).toHaveLength(2);
    expect(compiled.dispositions.map((entry) => entry.disposition)).toEqual(["exact", "exact"]);
    expect(persisted).toEqual([
      "selection",
      "pose",
      "mechanics",
      "semantic",
      "score",
      "form",
      "physics_plan",
    ]);

    expect(session.preview().ok).toBe(true);
    expect(session.snapshot().status).toBe("previewing");
    expect(startPreview).toHaveBeenCalledWith(compiled.physicsPlan);
    session.stopPreview();
    expect(stopPreview).toHaveBeenCalledOnce();
    expect(session.snapshot().status).toBe("compiled");
  });
});
