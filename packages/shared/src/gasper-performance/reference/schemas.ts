import { z } from "zod";

import { EVIDENCE_CLASSES, MOTION_PRIMITIVE_IDS } from "./types.js";

const nonEmpty = z.string().trim().min(1);
const finite = z.number().finite();
const unitInterval = finite.min(0).max(1);
const positiveFinite = finite.positive();
const nonNegativeFinite = finite.nonnegative();
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/, "canonical sha256 hash required");

export const evidenceRefSchema = z
  .object({
    kind: z.enum(EVIDENCE_CLASSES),
    ref: nonEmpty,
    confidence: unitInterval.optional(),
  })
  .strict();

export const videoSourceReceiptSchema = z
  .object({
    schema: z.literal("gasper.video-source-receipt.v1"),
    id: nonEmpty,
    sourceKind: z.enum(["local", "direct_url", "provider"]),
    sourceRef: nonEmpty,
    contentHash: sha256,
    byteLength: z.number().int().positive(),
    media: z
      .object({
        durationMs: positiveFinite,
        widthPx: z.number().int().positive(),
        heightPx: z.number().int().positive(),
        frameRateHz: positiveFinite,
        container: nonEmpty,
        videoCodec: nonEmpty,
      })
      .strict(),
    resolver: z.object({ id: nonEmpty, version: nonEmpty }).strict(),
  })
  .strict();

export const videoAnalysisSelectionSchema = z
  .object({
    schema: z.literal("gasper.video-analysis-selection.v1"),
    id: nonEmpty,
    sourceContentHash: sha256,
    startMs: nonNegativeFinite,
    endMs: positiveFinite,
    crop: z
      .object({
        x: unitInterval,
        y: unitInterval,
        width: positiveFinite.max(1),
        height: positiveFinite.max(1),
      })
      .strict(),
    subjectId: nonEmpty,
  })
  .strict()
  .superRefine((selection, ctx) => {
    if (selection.endMs <= selection.startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endMs"],
        message: "selection end must follow start",
      });
    }
    if (selection.crop.x + selection.crop.width > 1 || selection.crop.y + selection.crop.height > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["crop"],
        message: "selection crop must remain inside normalized image bounds",
      });
    }
  });

export const landmarkObservationSchema = z
  .object({
    index: z.number().int().nonnegative(),
    x: finite,
    y: finite,
    z: finite,
    visibility: unitInterval.optional(),
    presence: unitInterval.optional(),
  })
  .strict();

const poseDetectionSchema = z
  .object({
    subjectId: nonEmpty,
    confidence: unitInterval,
    imageLandmarks: z.array(landmarkObservationSchema),
    worldLandmarks: z.array(landmarkObservationSchema).optional(),
  })
  .strict();

export const poseObservationTrackSchema = z
  .object({
    schema: z.literal("gasper.pose-observation-track.v1"),
    id: nonEmpty,
    sourceContentHash: sha256,
    durationMs: positiveFinite,
    sampleRateHz: positiveFinite,
    landmarkModel: z
      .object({
        id: nonEmpty,
        version: nonEmpty,
        landmarkCount: z.number().int().positive(),
        semanticIndices: z
          .object({
            leftFoot: z.number().int().nonnegative(),
            rightFoot: z.number().int().nonnegative(),
            leftHip: z.number().int().nonnegative(),
            rightHip: z.number().int().nonnegative(),
          })
          .strict(),
      })
      .strict(),
    frames: z
      .array(
        z
          .object({
            tMs: nonNegativeFinite,
            poses: z.array(poseDetectionSchema),
          })
          .strict(),
      )
      .min(1),
    provenance: z
      .object({ analyzer: nonEmpty, analyzerVersion: nonEmpty })
      .strict(),
  })
  .strict()
  .superRefine((track, ctx) => {
    const semanticEntries = Object.entries(track.landmarkModel.semanticIndices);
    for (const [name, landmarkIndex] of semanticEntries) {
      if (landmarkIndex >= track.landmarkModel.landmarkCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["landmarkModel", "semanticIndices", name],
          message: "semantic landmark index exceeds the declared landmark count",
        });
      }
    }
    if (new Set(semanticEntries.map(([, landmarkIndex]) => landmarkIndex)).size !== semanticEntries.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["landmarkModel", "semanticIndices"],
        message: "semantic landmark indices must be unique",
      });
    }

    let previous = -1;
    for (let index = 0; index < track.frames.length; index += 1) {
      const frame = track.frames[index]!;
      if (frame.tMs <= previous) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frames", index, "tMs"],
          message: "frame times must be strictly monotonic",
        });
      }
      if (frame.tMs > track.durationMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frames", index, "tMs"],
          message: "frame time exceeds source duration",
        });
      }
      const subjectIds = frame.poses.map((pose) => pose.subjectId);
      if (new Set(subjectIds).size !== subjectIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frames", index, "poses"],
          message: "subject ids must be unique within a frame",
        });
      }
      for (let poseIndex = 0; poseIndex < frame.poses.length; poseIndex += 1) {
        const pose = frame.poses[poseIndex]!;
        for (const [space, landmarks] of [
          ["imageLandmarks", pose.imageLandmarks],
          ["worldLandmarks", pose.worldLandmarks],
        ] as const) {
          if (!landmarks) continue;
          if (landmarks.length !== track.landmarkModel.landmarkCount) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["frames", index, "poses", poseIndex, space],
              message: "landmark count does not match the declared model",
            });
          }
          for (let landmarkIndex = 0; landmarkIndex < landmarks.length; landmarkIndex += 1) {
            if (landmarks[landmarkIndex]!.index !== landmarkIndex) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["frames", index, "poses", poseIndex, space, landmarkIndex, "index"],
                message: "landmark index must match its canonical array position",
              });
            }
          }
        }
      }
      previous = frame.tMs;
    }
  });

const motionQualitySchema = z
  .object({
    weight: unitInterval,
    flow: unitInterval,
    energy: unitInterval,
    directness: unitInterval,
    restraint: unitInterval.nullable(),
    playfulness: unitInterval.nullable(),
    urgency: unitInterval.nullable(),
  })
  .strict();

const rootPathPointSchema = z
  .object({
    tMs: nonNegativeFinite,
    x: finite,
    y: finite,
    confidence: unitInterval,
  })
  .strict();

const motionAmbiguitySchema = z
  .object({
    id: nonEmpty,
    description: nonEmpty,
    confidence: unitInterval,
    evidence: z.array(evidenceRefSchema).min(1),
  })
  .strict();

const motionCorrectionSchema = z
  .object({
    id: nonEmpty,
    description: nonEmpty,
    evidence: z.array(evidenceRefSchema).min(1),
  })
  .strict();

export const motionScoreBeatSchema = z
  .object({
    id: nonEmpty,
    t0Ms: nonNegativeFinite,
    t1Ms: positiveFinite,
    sourceFrameRange: z
      .object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() })
      .strict(),
    primitive: z.enum(MOTION_PRIMITIVE_IDS),
    purpose: nonEmpty,
    travel: z
      .object({
        direction: z.enum(["stationary", "left", "right", "forward", "backward", "mixed", "unknown"]),
        normalizedDisplacement: z.object({ x: finite, y: finite }).strict(),
        facing: z
          .object({
            startDegrees: finite.min(-180).max(180).nullable(),
            endDegrees: finite.min(-180).max(180).nullable(),
          })
          .strict(),
        rootPath: z.array(rootPathPointSchema),
      })
      .strict(),
    rhythm: z
      .object({
        cadenceHz: positiveFinite.nullable(),
        phase: z.enum(["even", "syncopated", "sustained", "unknown"]),
        accentTimesMs: z.array(nonNegativeFinite),
      })
      .strict(),
    contact: z
      .object({
        requiredSupports: z.array(nonEmpty),
        order: z.array(nonEmpty),
      })
      .strict(),
    motionQuality: motionQualitySchema,
    poseIntent: z
      .object({
        extremes: z.array(nonEmpty),
        silhouette: nonEmpty,
        lineOfAction: nonEmpty,
      })
      .strict(),
    roles: z.array(z.enum(["anticipation", "commitment", "release", "follow_through", "settle"])).min(1),
    recognitionCritical: z.array(nonEmpty).min(1),
    confidence: unitInterval,
    evidence: z.array(evidenceRefSchema).min(1),
    ambiguities: z.array(motionAmbiguitySchema),
    corrections: z.array(motionCorrectionSchema),
  })
  .strict()
  .superRefine((beat, ctx) => {
    if (beat.t1Ms <= beat.t0Ms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["t1Ms"],
        message: "beat end must follow beat start",
      });
    }
    if (beat.sourceFrameRange.end < beat.sourceFrameRange.start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceFrameRange"],
        message: "source frame range end must be >= start",
      });
    }
    let previousPathTime = -1;
    for (let index = 0; index < beat.travel.rootPath.length; index += 1) {
      const point = beat.travel.rootPath[index]!;
      if (point.tMs < beat.t0Ms || point.tMs > beat.t1Ms || point.tMs <= previousPathTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["travel", "rootPath", index, "tMs"],
          message: "root path times must be monotonic and inside the beat",
        });
      }
      previousPathTime = point.tMs;
    }
    for (let index = 0; index < beat.rhythm.accentTimesMs.length; index += 1) {
      const accent = beat.rhythm.accentTimesMs[index]!;
      if (accent < beat.t0Ms || accent > beat.t1Ms) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rhythm", "accentTimesMs", index],
          message: "rhythm accent must lie inside the beat",
        });
      }
    }
    if (new Set(beat.roles).size !== beat.roles.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roles"],
        message: "motion beat roles must be unique",
      });
    }
    if (new Set(beat.contact.requiredSupports).size !== beat.contact.requiredSupports.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contact", "requiredSupports"],
        message: "required supports must be unique",
      });
    }
  });

export const motionScoreSchema = z
  .object({
    schema: z.literal("gasper.motion-score.v1"),
    id: nonEmpty,
    sourceObservationHash: sha256,
    durationMs: positiveFinite,
    beats: z.array(motionScoreBeatSchema).min(1),
    provenance: z
      .object({
        compiler: nonEmpty,
        compilerVersion: nonEmpty,
        sourceRefs: z.array(nonEmpty),
      })
      .strict(),
  })
  .strict()
  .superRefine((score, ctx) => {
    let previousEnd = 0;
    for (let index = 0; index < score.beats.length; index += 1) {
      const beat = score.beats[index]!;
      if (index > 0 && beat.t0Ms < previousEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["beats", index, "t0Ms"],
          message: "motion score beats may not overlap",
        });
      }
      if (beat.t1Ms > score.durationMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["beats", index, "t1Ms"],
          message: "motion score beat exceeds clip duration",
        });
      }
      previousEnd = beat.t1Ms;
    }
  });

export const physicalQuantitySchema = z
  .object({
    label: nonEmpty,
    meaning: nonEmpty,
    affectedObservables: z.array(nonEmpty).min(1),
    application: z.enum([
      "environment_input",
      "form_constant",
      "performance_bound",
      "safety_bound",
      "calibration_gate",
    ]),
    tunable: z.boolean(),
    status: z.enum(["resolved", "requires_calibration"]),
    value: finite.optional(),
    unit: nonEmpty,
    safeMin: finite.optional(),
    safeMax: finite.optional(),
    authority: z.enum(["environment", "form", "performance"]),
    provenance: z.array(nonEmpty).min(1),
  })
  .strict()
  .superRefine((quantity, ctx) => {
    if ((quantity.safeMin === undefined) !== (quantity.safeMax === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "safeMin and safeMax must be supplied together" });
    }
    if (
      quantity.safeMin !== undefined &&
      quantity.safeMax !== undefined &&
      quantity.safeMax < quantity.safeMin
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "safeMax must be >= safeMin" });
    }
    if (
      quantity.status === "resolved" &&
      (quantity.value === undefined || quantity.safeMin === undefined || quantity.safeMax === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "resolved quantity requires value and safe bounds",
      });
    }
    if (
      quantity.value !== undefined &&
      quantity.safeMin !== undefined &&
      quantity.safeMax !== undefined &&
      (quantity.value < quantity.safeMin || quantity.value > quantity.safeMax)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "value outside safe range" });
    }
    if (quantity.status === "requires_calibration" && quantity.value !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "uncalibrated quantity may not claim a value",
      });
    }
  });

const supportCapabilitySchema = z
  .object({
    id: nonEmpty,
    kind: z.enum(["structural_root", "surface"]),
    modes: z.array(z.enum(["plant", "load", "release", "slide", "pivot"])).min(1),
    maxLoadShare: unitInterval,
    provenance: z.array(nonEmpty).min(1),
  })
  .strict();

const semanticControlCapabilitySchema = z
  .object({
    id: nonEmpty,
    unit: nonEmpty,
    safeMin: finite,
    safeMax: finite,
    authority: z.enum(["environment", "form", "performance"]),
    provenance: z.array(nonEmpty).min(1),
  })
  .strict()
  .refine((control) => control.safeMax >= control.safeMin, "safeMax must be >= safeMin");

export const formCapabilityProfileSchema = z
  .object({
    schema: z.literal("gasper.form-capability.v1"),
    formId: nonEmpty,
    version: nonEmpty,
    locomotion: z.array(z.enum(["grounded", "slide", "hop", "float", "flight"])),
    supports: z.array(supportCapabilitySchema),
    controls: z.array(semanticControlCapabilitySchema),
    physics: z.record(physicalQuantitySchema),
    primitives: z.array(z.enum(MOTION_PRIMITIVE_IDS)),
    forbiddenAnatomy: z.array(nonEmpty),
    topologyRef: nonEmpty,
  })
  .strict()
  .superRefine((profile, ctx) => {
    for (const [path, values] of [
      ["supports", profile.supports.map((entry) => entry.id)],
      ["controls", profile.controls.map((entry) => entry.id)],
      ["primitives", profile.primitives],
    ] as const) {
      if (new Set(values).size !== values.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: `${path} must be unique` });
      }
    }
  });

const physicsGoalSchema = z
  .object({
    id: nonEmpty,
    target: finite,
    unit: nonEmpty,
    safeMin: finite,
    safeMax: finite,
    authority: z.enum(["environment", "form", "performance"]),
    evidence: z.array(evidenceRefSchema).min(1),
  })
  .strict()
  .refine(
    (goal) => goal.safeMax >= goal.safeMin && goal.target >= goal.safeMin && goal.target <= goal.safeMax,
    "physics goal target must be inside its safe range",
  );

const physicsIntentBeatSchema = z
  .object({
    id: nonEmpty,
    t0Ms: nonNegativeFinite,
    t1Ms: positiveFinite,
    primitive: z.enum(MOTION_PRIMITIVE_IDS),
    supportGoals: z.array(physicsGoalSchema),
    bodyGoals: z.array(physicsGoalSchema),
    expressiveGoals: z.array(physicsGoalSchema),
    constraints: z.array(nonEmpty),
    sourceEvidence: z.array(evidenceRefSchema).min(1),
  })
  .strict()
  .refine((beat) => beat.t1Ms > beat.t0Ms, "intent beat end must follow its start");

export const physicsIntentPlanSchema = z
  .object({
    schema: z.literal("gasper.physics-intent-plan.v1"),
    id: nonEmpty,
    sourceMotionScoreHash: sha256,
    formProfileHash: sha256,
    environmentProfileHash: sha256,
    seed: z.number().int(),
    durationMs: positiveFinite,
    beats: z.array(physicsIntentBeatSchema).min(1),
    compiler: z.object({ id: nonEmpty, version: nonEmpty }).strict(),
  })
  .strict()
  .superRefine((plan, ctx) => {
    let previousEnd = 0;
    for (let index = 0; index < plan.beats.length; index += 1) {
      const beat = plan.beats[index]!;
      if (index > 0 && beat.t0Ms < previousEnd) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["beats", index], message: "intent beats may not overlap" });
      }
      if (beat.t1Ms > plan.durationMs) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["beats", index], message: "intent beat exceeds duration" });
      }
      previousEnd = beat.t1Ms;
    }
  });

export const referenceBehaviorArtifactSchema = z
  .object({
    schema: z.literal("gasper.reference-behavior.v1"),
    id: nonEmpty,
    sourceReceiptHash: sha256,
    poseObservationHash: sha256,
    motionScoreHash: sha256,
    formProfileHash: sha256,
    physicsIntentPlanHash: sha256,
    status: z.enum(["experiment", "machine_valid", "architect_reviewed", "owner_accepted", "rejected"]),
    acceptance: z.array(z.enum(["machine_proven", "live_observed", "human_accepted", "open"])),
    provenance: z
      .object({
        builder: nonEmpty,
        builderVersion: nonEmpty,
        parentArtifactHashes: z.array(sha256),
      })
      .strict(),
  })
  .strict()
  .superRefine((artifact, ctx) => {
    if (artifact.status === "owner_accepted" && !artifact.acceptance.includes("human_accepted")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptance"],
        message: "owner_accepted artifacts require human_accepted evidence",
      });
    }
  });
