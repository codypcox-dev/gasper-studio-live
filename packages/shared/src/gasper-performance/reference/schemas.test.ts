import { describe, expect, it } from "vitest";

import {
  hashMotionScore,
  poseObservationTrackSchema,
  parseMotionScore,
  videoAnalysisSelectionSchema,
  type MotionScore,
} from "./index.js";

function motionScoreFixture(): MotionScore {
  return {
    schema: "gasper.motion-score.v1",
    id: "score-step-exchange",
    sourceObservationHash: `sha256:${"a".repeat(64)}`,
    durationMs: 1_000,
    beats: [
      {
        id: "beat-1",
        t0Ms: 0,
        t1Ms: 1_000,
        sourceFrameRange: { start: 0, end: 59 },
        primitive: "support_exchange",
        purpose: "cross support while preserving lateral rhythm",
        travel: {
          direction: "right",
          normalizedDisplacement: { x: 0.18, y: 0 },
          facing: { startDegrees: 0, endDegrees: 12 },
          rootPath: [
            { tMs: 0, x: 0.45, y: 0.55, confidence: 0.9 },
            { tMs: 1_000, x: 0.63, y: 0.55, confidence: 0.88 },
          ],
        },
        rhythm: {
          cadenceHz: 2,
          phase: "syncopated",
          accentTimesMs: [0, 500],
        },
        contact: {
          requiredSupports: ["source_left", "source_right"],
          order: ["source_left", "source_right"],
        },
        motionQuality: {
          weight: 0.6,
          flow: 0.7,
          energy: 0.5,
          directness: 0.8,
          restraint: 0.4,
          playfulness: 0.7,
          urgency: 0.3,
        },
        poseIntent: {
          extremes: ["crossed support silhouette"],
          silhouette: "narrow crossed base with open upper mass",
          lineOfAction: "counter-diagonal through the support exchange",
        },
        roles: ["anticipation", "commitment", "release"],
        recognitionCritical: ["left-to-right support order"],
        confidence: 0.91,
        evidence: [{ kind: "derived", ref: "contact-track:12-29" }],
        ambiguities: [
          {
            id: "ambiguity-depth",
            description: "camera depth prevents absolute travel recovery",
            confidence: 0.95,
            evidence: [{ kind: "inferred", ref: "camera:monocular" }],
          },
        ],
        corrections: [],
      },
    ],
    provenance: {
      compiler: "fixture",
      compilerVersion: "1",
      sourceRefs: [],
    },
  };
}

describe("motion score contract", () => {
  it("gives byte-equivalent mechanics one canonical content hash", () => {
    // Break caught: hashing object insertion order or sub-six-decimal noise
    // would make the same inferred performance produce different artifacts.
    const score = motionScoreFixture();
    const equivalent = structuredClone(score);
    equivalent.beats[0]!.confidence = 0.9100004;

    expect(hashMotionScore(score)).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(hashMotionScore(equivalent)).toBe(hashMotionScore(score));
  });

  it("rejects unknown data at both the score and nested beat boundaries", () => {
    // Break caught: an unversioned producer could silently smuggle a second
    // motion authority or raw transform instruction into a trusted score.
    const score = motionScoreFixture();

    expect(() => parseMotionScore({ ...score, surprise: true })).toThrow(/unknown/i);
    expect(() =>
      parseMotionScore({
        ...score,
        beats: [{ ...score.beats[0], rawTransform: "translate(50px, 0)" }],
      }),
    ).toThrow(/unknown/i);
  });

  it("rejects overlapping beats and out-of-range confidence", () => {
    // Break caught: an impossible score could claim two conflicting support
    // phases at once or promote an inference with fabricated confidence.
    const score = motionScoreFixture();
    const first = { ...score.beats[0], t1Ms: 600 };
    const overlapping = {
      ...score.beats[0],
      id: "beat-2",
      t0Ms: 500,
      confidence: 1.01,
    };

    expect(() => parseMotionScore({ ...score, beats: [first, overlapping] })).toThrow(
      /confidence|overlap/i,
    );
  });

  it("rejects non-finite mechanics and beats outside the clip duration", () => {
    // Break caught: NaN/Infinity or an off-timeline beat would poison later
    // retargeting and could bypass physical bounds through invalid arithmetic.
    const score = motionScoreFixture();

    expect(() =>
      parseMotionScore({
        ...score,
        beats: [
          {
            ...score.beats[0],
            t1Ms: 1_001,
            motionQuality: { ...score.beats[0]!.motionQuality, energy: Number.POSITIVE_INFINITY },
          },
        ],
      }),
    ).toThrow(/finite|duration|energy/i);
  });

  it("requires the full semantic beat contract and bounds paths to the beat", () => {
    // Break caught: an LLM could emit a thin label-only beat or smuggle a root
    // sample outside the measured interval, leaving retargeting underdefined.
    const score = motionScoreFixture();
    const { travel: _travel, ...thinBeat } = score.beats[0]!;
    expect(() => parseMotionScore({ ...score, beats: [thinBeat] })).toThrow(/travel|required/i);
    expect(() =>
      parseMotionScore({
        ...score,
        beats: [
          {
            ...score.beats[0],
            travel: {
              ...score.beats[0]!.travel,
              rootPath: [
                ...score.beats[0]!.travel.rootPath,
                { tMs: 1_001, x: 0.7, y: 0.5, confidence: 0.8 },
              ],
            },
          },
        ],
      }),
    ).toThrow(/root|path|beat|time/i);
  });

  it("allows accepted evidence only as an explicit evidence class", () => {
    // Break caught: owner acceptance could be flattened into inference or
    // stored outside the evidence contract, making promotion unauditable.
    const score = motionScoreFixture();
    const accepted = {
      ...score,
      beats: [
        {
          ...score.beats[0],
          evidence: [...score.beats[0]!.evidence, { kind: "accepted", ref: "owner-review:take-7" }],
        },
      ],
    };

    expect(() => parseMotionScore(accepted)).not.toThrow();
  });
});

describe("pose observation contract", () => {
  const base = {
    schema: "gasper.pose-observation-track.v1",
    id: "pose-track",
    sourceContentHash: `sha256:${"d".repeat(64)}`,
    durationMs: 1_000,
    sampleRateHz: 30,
    landmarkModel: {
      id: "mediapipe-pose-landmarker",
      version: "fixture",
      landmarkCount: 33,
      semanticIndices: { leftFoot: 31, rightFoot: 32, leftHip: 23, rightHip: 24 },
    },
    provenance: { analyzer: "fixture", analyzerVersion: "1" },
  } as const;

  it("represents a timestamp with no detected subject without inventing landmarks", () => {
    // Break caught: detection dropout could be filled with zero landmarks and
    // later misread as a physically meaningful pose.
    const result = poseObservationTrackSchema.parse({
      ...base,
      frames: [{ tMs: 0, poses: [] }],
    });

    expect(result.frames[0]?.poses).toEqual([]);
  });

  it("retains normalized image and approximate world landmarks side by side", () => {
    // Break caught: a single coordinate-space flag could erase raw image
    // evidence or overclaim approximate world estimates as measured metric truth.
    const imageLandmarks = Array.from({ length: 33 }, (_, index) => ({
      index,
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.9,
      presence: 0.9,
    }));
    const worldLandmarks = imageLandmarks.map((point) => ({ ...point, x: point.x - 0.5 }));
    const result = poseObservationTrackSchema.parse({
      ...base,
      frames: [
        {
          tMs: 0,
          poses: [
            {
              subjectId: "subject-1",
              confidence: 0.9,
              imageLandmarks,
              worldLandmarks,
            },
          ],
        },
      ],
    });

    expect(result.frames[0]?.poses[0]?.imageLandmarks).toHaveLength(33);
    expect(result.frames[0]?.poses[0]?.worldLandmarks).toHaveLength(33);
  });

  it("rejects an out-of-range semantic landmark map", () => {
    // Break caught: mechanics could read an arbitrary landmark as a foot or hip.
    expect(() =>
      poseObservationTrackSchema.parse({
        ...base,
        landmarkModel: {
          ...base.landmarkModel,
          semanticIndices: { ...base.landmarkModel.semanticIndices, leftFoot: 99 },
        },
        frames: [{ tMs: 0, poses: [] }],
      }),
    ).toThrow(/semantic|index|landmark/i);
  });
});

describe("video analysis selection contract", () => {
  it("records interval, crop, and subject separately from immutable source bytes", () => {
    const selection = videoAnalysisSelectionSchema.parse({
      schema: "gasper.video-analysis-selection.v1",
      id: "selection-1",
      sourceContentHash: `sha256:${"e".repeat(64)}`,
      startMs: 250,
      endMs: 2_250,
      crop: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 },
      subjectId: "subject-1",
    });

    expect(selection.endMs - selection.startMs).toBe(2_000);
    expect(() => videoAnalysisSelectionSchema.parse({ ...selection, endMs: 100 })).toThrow(/end|start/i);
    expect(() =>
      videoAnalysisSelectionSchema.parse({
        ...selection,
        crop: { ...selection.crop, x: 0.4, width: 0.7 },
      }),
    ).toThrow(/crop|bounds/i);
  });
});
