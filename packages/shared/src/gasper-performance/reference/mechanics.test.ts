import { describe, expect, it } from "vitest";

import type {
  LandmarkObservation,
  PoseObservationTrack,
} from "./types.js";
import {
  compileMechanicsDraftScore,
  deriveMotionMechanics,
  type FloorCalibration,
} from "./mechanics.js";

const SOURCE_HASH = `sha256:${"b".repeat(64)}`;

function landmark(index: number): LandmarkObservation {
  return { index, x: 0.5, y: 0.5, z: 0, visibility: 1, presence: 1 };
}

function syntheticAlternatingStepTrack(fps: 30 | 60, netTravelX = 0): PoseObservationTrack {
  const phaseDurationMs = 500;
  const supports = ["source_left", "source_right", "source_left", "source_right"] as const;
  const durationMs = supports.length * phaseDurationMs;
  const frameCount = Math.floor((durationMs / 1_000) * fps) + 1;
  const frames = Array.from({ length: frameCount }, (_, frameIndex) => {
    const tMs = Math.min(durationMs, (frameIndex * 1_000) / fps);
    const phase = Math.min(supports.length - 1, Math.floor(tMs / phaseDurationMs));
    const active = supports[phase]!;
    const travelX = netTravelX * (tMs / durationMs);
    const landmarks = Array.from({ length: 33 }, (_, index) => ({ ...landmark(index), x: 0.5 + travelX }));
    landmarks[23] = { ...landmarks[23]!, x: 0.46 + travelX, y: 0.54 };
    landmarks[24] = { ...landmarks[24]!, x: 0.54 + travelX, y: 0.54 };
    landmarks[31] = {
      ...landmarks[31]!,
      x: 0.42 + travelX,
      y: active === "source_left" ? 0.9 : 0.74,
    };
    landmarks[32] = {
      ...landmarks[32]!,
      x: 0.58 + travelX,
      y: active === "source_right" ? 0.9 : 0.74,
    };
    return {
      tMs,
      poses: [
        {
          subjectId: "subject-1",
          confidence: 0.98,
          imageLandmarks: landmarks,
        },
      ],
    };
  });

  return {
    schema: "gasper.pose-observation-track.v1",
    id: `alternating-${fps}`,
    sourceContentHash: SOURCE_HASH,
    durationMs,
    sampleRateHz: fps,
    landmarkModel: {
      id: "mediapipe-pose-landmarker",
      version: "fixture",
      landmarkCount: 33,
      semanticIndices: { leftFoot: 31, rightFoot: 32, leftHip: 23, rightHip: 24 },
    },
    frames,
    provenance: { analyzer: "fixture", analyzerVersion: "1" },
  };
}

function syntheticSquatTrack(): PoseObservationTrack {
  const source = syntheticAlternatingStepTrack(60);
  return {
    ...source,
    id: "squat-60",
    frames: source.frames.map((frame) => {
      const descent = frame.tMs <= 500
        ? 0.12 * (frame.tMs / 500)
        : 0.12 * Math.max(0, 1 - (frame.tMs - 500) / 500);
      return {
        ...frame,
        poses: frame.poses.map((pose) => ({
          ...pose,
          imageLandmarks: pose.imageLandmarks.map((point) =>
            point.index === 23 || point.index === 24
              ? { ...point, y: point.y + descent }
              : point,
          ),
        })),
      };
    }),
  };
}

const floor: FloorCalibration = {
  subjectId: "subject-1",
  floorY: 0.9,
  tolerance: 0.03,
  maxFootSpeedPerSecond: 0.2,
  minVisibility: 0.8,
  evidence: [{ kind: "calibrated", ref: "fixture-floor", confidence: 1 }],
};

describe("reference motion mechanics", () => {
  it("derives alternating support from low foot speed near the calibrated floor", () => {
    // Break caught: contact could be inferred from height alone, swapping or
    // inventing support when a foot merely passes through the floor band.
    const mechanics = deriveMotionMechanics(syntheticAlternatingStepTrack(60), floor);

    expect(mechanics.supportEvents.map((event) => event.support)).toEqual([
      "source_left",
      "source_right",
      "source_left",
      "source_right",
    ]);
    expect(mechanics.supportEvents.every((event) => event.footSpeedPerSecond <= 0.2)).toBe(true);
    expect(mechanics.diagnostics).not.toContainEqual(expect.objectContaining({ severity: "error" }));
  });

  it("preserves support order across 30 and 60 Hz observations", () => {
    // Break caught: frame-index timing would produce a different performance
    // when the same source mechanics are sampled at a different rate.
    const at30 = deriveMotionMechanics(syntheticAlternatingStepTrack(30), floor);
    const at60 = deriveMotionMechanics(syntheticAlternatingStepTrack(60), floor);

    expect(at30.supportEvents.map((event) => event.support)).toEqual(
      at60.supportEvents.map((event) => event.support),
    );
    for (let index = 0; index < at30.supportEvents.length; index += 1) {
      expect(Math.abs(at30.supportEvents[index]!.tMs - at60.supportEvents[index]!.tMs)).toBeLessThanOrEqual(
        1_000 / 30,
      );
    }
  });

  it("measures lateral root travel in body heights and leaves monocular depth unavailable", () => {
    // Break caught: a semantic model could invent a travel destination from
    // prose even though the timestamped pose track already measures lateral
    // displacement and cannot measure ground-plane depth.
    const mechanics = deriveMotionMechanics(syntheticAlternatingStepTrack(60, 0.2), floor);
    const score = compileMechanicsDraftScore(mechanics, "draft-travel");

    expect(mechanics.rootMotion).not.toBeNull();
    expect(mechanics.rootMotion?.netNormalizedDisplacement.x).toBeCloseTo(0.5, 4);
    expect(mechanics.rootMotion?.direction).toBe("right");
    expect(mechanics.unavailable).toContain("depth_travel");
    expect(score.beats.every((beat) => beat.travel.direction === "right")).toBe(true);
    expect(score.beats[0]?.travel.normalizedDisplacement.x).toBeGreaterThan(0.1);
    expect(score.beats[0]?.travel.normalizedDisplacement.y).toBe(0);
  });

  it("preserves measured image-space root descent as beat-local vertical evidence", () => {
    // Break caught: pose inference measured the squat, but the draft score
    // discarded image-space hip descent before form retargeting could use it.
    const mechanics = deriveMotionMechanics(syntheticSquatTrack(), floor);
    const score = compileMechanicsDraftScore(mechanics, "draft-squat");
    const verticalPath = score.beats[0]?.travel.rootPath ?? [];

    expect(verticalPath[0]?.y).toBeCloseTo(0, 6);
    expect(Math.max(...verticalPath.map((point) => point.y))).toBeGreaterThan(0.28);
    expect(verticalPath.at(-1)?.y).toBeGreaterThan(0.28);
    expect(score.beats[0]?.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("labels absolute force, mass, and surface friction unavailable", () => {
    // Break caught: monocular pose observations could be misreported as
    // absolute physical measurements and contaminate the body profile.
    const calibrated = deriveMotionMechanics(syntheticAlternatingStepTrack(30), floor);
    const uncalibrated = deriveMotionMechanics(syntheticAlternatingStepTrack(30), null);

    expect(calibrated.unavailable).toEqual(
      expect.arrayContaining(["absolute_force", "absolute_mass", "surface_friction"]),
    );
    expect(uncalibrated.unavailable).toEqual(
      expect.arrayContaining(["floor_contact", "absolute_force", "absolute_mass", "surface_friction"]),
    );
    expect(uncalibrated.supportEvents).toEqual([]);
  });

  it("uses declared semantic landmark indices instead of model-specific constants", () => {
    // Break caught: changing pose models could silently reinterpret a wrist or
    // toe as a support point because mechanics hard-coded MediaPipe indices.
    const source = syntheticAlternatingStepTrack(30);
    const first = source.frames[0]!;
    const pose = first.poses[0]!;
    const imageLandmarks = pose.imageLandmarks.map((point) => ({ ...point, y: 0.5 }));
    imageLandmarks[7] = { ...imageLandmarks[7]!, y: 0.9 };
    const remapped: PoseObservationTrack = {
      ...source,
      landmarkModel: {
        ...source.landmarkModel,
        semanticIndices: { leftFoot: 7, rightFoot: 8, leftHip: 9, rightHip: 10 },
      },
      frames: [{ tMs: 0, poses: [{ ...pose, imageLandmarks }] }],
    };

    const mechanics = deriveMotionMechanics(remapped, floor);

    expect(mechanics.supportEvents.map((event) => event.support)).toEqual(["source_left"]);
  });

  it("treats detection gaps and missing presence as unknown rather than planted", () => {
    // Break caught: an absent person or omitted presence score could become a
    // fabricated high-confidence contact and poison learned support order.
    const source = syntheticAlternatingStepTrack(30);
    const first = source.frames[0]!;
    const pose = first.poses[0]!;
    const imageLandmarks = pose.imageLandmarks.map((point) => {
      if (point.index !== source.landmarkModel.semanticIndices.leftFoot) return point;
      const { presence: _presence, ...withoutPresence } = point;
      return withoutPresence;
    });
    const track: PoseObservationTrack = {
      ...source,
      frames: [
        { tMs: 0, poses: [{ ...pose, imageLandmarks }] },
        { tMs: 1_000 / 30, poses: [] },
      ],
    };

    const mechanics = deriveMotionMechanics(track, floor);

    expect(mechanics.supportEvents).toEqual([]);
    expect(mechanics.diagnostics).toContainEqual(
      expect.objectContaining({ code: "DETECTION_GAP", tMs: 1_000 / 30 }),
    );
  });

  it("uses visibility when the selected pose model does not emit presence at all", () => {
    // Break caught: MediaPipe Tasks Vision 1.0.1 emits visibility but omits
    // presence in its JS landmark objects. Optional model output must not erase
    // an otherwise complete 33-point observation track.
    const source = syntheticAlternatingStepTrack(30);
    const visibilityOnly: PoseObservationTrack = {
      ...source,
      frames: source.frames.map((frame) => ({
        ...frame,
        poses: frame.poses.map((pose) => ({
          ...pose,
          imageLandmarks: pose.imageLandmarks.map((point) => {
            const { presence: _presence, ...visible } = point;
            return visible;
          }),
        })),
      })),
    };

    const mechanics = deriveMotionMechanics(visibilityOnly, floor);

    expect(mechanics.rootMotion).not.toBeNull();
    expect(mechanics.supportEvents.map((event) => event.support)).toEqual([
      "source_left",
      "source_right",
      "source_left",
      "source_right",
    ]);
  });

  it("compiles measured support transitions into a strict draft Motion Score", () => {
    // Break caught: mechanics could skip provenance or leak raw landmark and
    // transform fields into the executable semantic artifact.
    const mechanics = deriveMotionMechanics(syntheticAlternatingStepTrack(60), floor);
    const score = compileMechanicsDraftScore(mechanics, "draft-alternating");

    expect(score.beats.map((beat) => beat.primitive)).toEqual([
      "plant",
      "support_exchange",
      "support_exchange",
      "support_exchange",
    ]);
    expect(score.beats[1]?.contact.order).toEqual(["source_left", "source_right"]);
    expect(score.provenance.compiler).toBe("gasper-mechanics-draft");
    expect(JSON.stringify(score)).not.toMatch(/landmarks|domTransform|svgPath|translate\(/i);
  });
});
