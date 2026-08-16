import { z } from "zod";

import type { MotionMechanicsSummary } from "../../../shared/src/gasper-performance/reference/mechanics.js";
import {
  MOTION_PRIMITIVE_IDS,
  type MotionPrimitiveId,
} from "../../../shared/src/gasper-performance/reference/types.js";

export type SemanticEvidenceFrameRef = Readonly<{
  ref: string;
  tMs: number;
}>;

export type SemanticExternalDefinition = Readonly<{
  ref: string;
  summary: string;
}>;

export type SemanticBeatRole =
  | "anticipation"
  | "commitment"
  | "release"
  | "follow_through"
  | "settle";

export type SemanticRhythmPhase = "even" | "syncopated" | "sustained" | "unknown";

export type SemanticMotionQuality = Readonly<{
  restraint: number | null;
  playfulness: number | null;
  urgency: number | null;
}>;

export type SemanticPoseIntent = Readonly<{
  extremes: readonly string[];
  silhouette: string;
  lineOfAction: string;
}>;

export type SemanticMotionProposal = Readonly<{
  schema: "gasper.semantic-motion-proposal.v1";
  resolution: "proposed" | "unknown_movement";
  movementName: string;
  plainLanguage: string;
  beats: readonly Readonly<{
    id: string;
    t0Ms: number;
    t1Ms: number;
    primitive: MotionPrimitiveId;
    purpose: string;
    roles: readonly SemanticBeatRole[];
    recognitionCritical: readonly string[];
    rhythm: Readonly<{
      phase: SemanticRhythmPhase;
      accentTimesMs: readonly number[];
    }>;
    motionQuality: SemanticMotionQuality;
    poseIntent: SemanticPoseIntent;
    evidenceRefs: readonly string[];
    confidence: number;
    rationale: string;
  }>[];
  uncertainties: readonly Readonly<{
    id: string;
    description: string;
    confidence: number;
    evidenceRefs: readonly string[];
  }>[];
  unsupportedAssumptions: readonly string[];
  externalDefinitionRefs: readonly string[];
  provider: Readonly<{
    id: string;
    model: string;
    responseId: string;
  }>;
}>;

export type SemanticMotionInput = Readonly<{
  userIntent: string;
  mechanics: MotionMechanicsSummary;
  evidenceFrames: readonly SemanticEvidenceFrameRef[];
  externalDefinitions: readonly SemanticExternalDefinition[];
  allowedPrimitives: readonly MotionPrimitiveId[];
}>;

export type SemanticPromptPacket = Readonly<{
  schemaName: "gasper.semantic-motion-proposal.v1";
  system: string;
  user: string;
}>;

export interface SemanticMotionProvider {
  readonly id: string;
  readonly model: string;
  generateStructured(
    packet: SemanticPromptPacket,
    signal: AbortSignal,
  ): Promise<Readonly<{ responseId: string; output: unknown }>>;
}

const nonEmpty = z.string().trim().min(1);
const unitInterval = z.number().finite().min(0).max(1);
const beatRoleSchema = z.enum([
  "anticipation",
  "commitment",
  "release",
  "follow_through",
  "settle",
]);
const rhythmPhaseSchema = z.enum(["even", "syncopated", "sustained", "unknown"]);
const semanticBeatSchema = z
  .object({
    id: nonEmpty,
    t0Ms: z.number().finite().nonnegative(),
    t1Ms: z.number().finite().positive(),
    primitive: z.enum(MOTION_PRIMITIVE_IDS),
    purpose: nonEmpty,
    roles: z.array(beatRoleSchema).min(1).max(5),
    recognitionCritical: z.array(nonEmpty).min(1).max(4),
    rhythm: z
      .object({
        phase: rhythmPhaseSchema,
        accentTimesMs: z.array(z.number().finite().nonnegative()).max(4),
      })
      .strict(),
    motionQuality: z
      .object({
        restraint: unitInterval.nullable(),
        playfulness: unitInterval.nullable(),
        urgency: unitInterval.nullable(),
      })
      .strict(),
    poseIntent: z
      .object({
        extremes: z.array(nonEmpty).max(4),
        silhouette: nonEmpty,
        lineOfAction: nonEmpty,
      })
      .strict(),
    evidenceRefs: z.array(nonEmpty).min(1).max(8),
    confidence: unitInterval,
    rationale: nonEmpty,
  })
  .strict()
  .superRefine((beat, ctx) => {
    if (beat.t1Ms <= beat.t0Ms) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["t1Ms"], message: "semantic beat end must follow start" });
    }
    if (new Set(beat.roles).size !== beat.roles.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roles"], message: "semantic beat roles must be unique" });
    }
    for (let index = 0; index < beat.rhythm.accentTimesMs.length; index += 1) {
      const accent = beat.rhythm.accentTimesMs[index]!;
      if (accent < beat.t0Ms || accent > beat.t1Ms) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rhythm", "accentTimesMs", index],
          message: "semantic rhythm accent must lie inside the beat",
        });
      }
    }
  });
const uncertaintySchema = z
  .object({
    id: nonEmpty,
    description: nonEmpty,
    confidence: unitInterval,
    evidenceRefs: z.array(nonEmpty).min(1).max(8),
  })
  .strict();
const providerSchema = z
  .object({ id: nonEmpty, model: nonEmpty, responseId: nonEmpty })
  .strict();
export const semanticMotionProposalSchema = z
  .object({
    schema: z.literal("gasper.semantic-motion-proposal.v1"),
    resolution: z.enum(["proposed", "unknown_movement"]),
    movementName: nonEmpty,
    plainLanguage: nonEmpty,
    beats: z.array(semanticBeatSchema).max(4),
    uncertainties: z.array(uncertaintySchema).max(4),
    unsupportedAssumptions: z.array(nonEmpty).max(8),
    externalDefinitionRefs: z.array(nonEmpty).max(8),
    provider: providerSchema.optional(),
  })
  .strict()
  .superRefine((proposal, ctx) => {
    if (proposal.resolution === "proposed" && proposal.beats.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["beats"], message: "proposed movement requires beats" });
    }
    if (proposal.resolution === "unknown_movement" && proposal.beats.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["beats"], message: "unknown movement may not invent beats" });
    }
    if (proposal.resolution === "unknown_movement" && proposal.uncertainties.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["uncertainties"], message: "unknown movement requires uncertainty" });
    }
  });

/**
 * Closed schema handed to a structured-output provider. Provider identity is
 * deliberately absent: the trusted adapter stamps it after validation.
 */
export const SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "schema",
    "resolution",
    "movementName",
    "plainLanguage",
    "beats",
    "uncertainties",
    "unsupportedAssumptions",
    "externalDefinitionRefs",
  ],
  properties: {
    schema: { const: "gasper.semantic-motion-proposal.v1" },
    resolution: { enum: ["proposed", "unknown_movement"] },
    movementName: { type: "string", minLength: 1 },
    plainLanguage: { type: "string", minLength: 1 },
    beats: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "t0Ms",
          "t1Ms",
          "primitive",
          "purpose",
          "roles",
          "recognitionCritical",
          "rhythm",
          "motionQuality",
          "poseIntent",
          "evidenceRefs",
          "confidence",
          "rationale",
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          t0Ms: { type: "number", minimum: 0 },
          t1Ms: { type: "number", exclusiveMinimum: 0 },
          primitive: { enum: [...MOTION_PRIMITIVE_IDS] },
          purpose: { type: "string", minLength: 1 },
          roles: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            uniqueItems: true,
            items: { enum: ["anticipation", "commitment", "release", "follow_through", "settle"] },
          },
          recognitionCritical: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 1 } },
          rhythm: {
            type: "object",
            additionalProperties: false,
            required: ["phase", "accentTimesMs"],
            properties: {
              phase: { enum: ["even", "syncopated", "sustained", "unknown"] },
              accentTimesMs: { type: "array", maxItems: 4, items: { type: "number", minimum: 0 } },
            },
          },
          motionQuality: {
            type: "object",
            additionalProperties: false,
            required: ["restraint", "playfulness", "urgency"],
            properties: {
              restraint: { type: ["number", "null"], minimum: 0, maximum: 1 },
              playfulness: { type: ["number", "null"], minimum: 0, maximum: 1 },
              urgency: { type: ["number", "null"], minimum: 0, maximum: 1 },
            },
          },
          poseIntent: {
            type: "object",
            additionalProperties: false,
            required: ["extremes", "silhouette", "lineOfAction"],
            properties: {
              extremes: { type: "array", maxItems: 4, items: { type: "string", minLength: 1 } },
              silhouette: { type: "string", minLength: 1 },
              lineOfAction: { type: "string", minLength: 1 },
            },
          },
          evidenceRefs: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", minLength: 1 } },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          rationale: { type: "string", minLength: 1 },
        },
      },
    },
    uncertainties: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "description", "confidence", "evidenceRefs"],
        properties: {
          id: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          evidenceRefs: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", minLength: 1 } },
        },
      },
    },
    unsupportedAssumptions: { type: "array", maxItems: 8, items: { type: "string", minLength: 1 } },
    externalDefinitionRefs: { type: "array", maxItems: 8, items: { type: "string", minLength: 1 } },
  },
} as const);

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("semantic motion interpretation aborted", "AbortError");
}

function boundedSamples<T>(samples: readonly T[], maximum: number): readonly T[] {
  if (samples.length <= maximum) return samples;
  return Array.from({ length: maximum }, (_, index) => {
    const sourceIndex = Math.round((index * (samples.length - 1)) / (maximum - 1));
    return samples[sourceIndex]!;
  });
}

export function projectMechanicsForSemanticPrompt(
  mechanics: MotionMechanicsSummary,
): unknown {
  return {
    schema: mechanics.schema,
    sourceTrackId: mechanics.sourceTrackId,
    sourceObservationHash: mechanics.sourceObservationHash,
    durationMs: mechanics.durationMs,
    sourceFrameCount: mechanics.sourceFrameCount,
    calibration: mechanics.calibration,
    rootMotion: mechanics.rootMotion
      ? {
          normalization: mechanics.rootMotion.normalization,
          subjectId: mechanics.rootMotion.subjectId,
          scaleImageHeight: mechanics.rootMotion.scaleImageHeight,
          // The deterministic compiler keeps the full artifact. The model
          // sees only the timeline features needed to name and phrase motion.
          samples: boundedSamples(mechanics.rootMotion.samples, 24).map((sample) => ({
            tMs: sample.tMs,
            imageY: sample.imageY,
            normalizedX: sample.normalizedX,
            normalizedVelocityXPerSecond: sample.normalizedVelocityXPerSecond,
            confidence: sample.confidence,
          })),
          netNormalizedDisplacement: mechanics.rootMotion.netNormalizedDisplacement,
          direction: mechanics.rootMotion.direction,
          confidence: mechanics.rootMotion.confidence,
        }
      : null,
    supportEvents: mechanics.supportEvents.map((event) => ({
      tMs: event.tMs,
      support: event.support,
      confidence: event.confidence,
      evidenceRefs: event.evidence.map((entry) => entry.ref),
    })),
    diagnostics: mechanics.diagnostics,
    unavailable: mechanics.unavailable,
  };
}

function mechanicsEvidenceRefs(mechanics: MotionMechanicsSummary): readonly string[] {
  return [
    ...(mechanics.calibration?.evidence.map((entry) => entry.ref) ?? []),
    ...mechanics.supportEvents.flatMap((event) => event.evidence.map((entry) => entry.ref)),
    ...(mechanics.rootMotion?.samples.flatMap((sample) => sample.evidence.map((entry) => entry.ref)) ?? []),
  ];
}

export function buildSemanticMotionPrompt(input: SemanticMotionInput): SemanticPromptPacket {
  if (!input.userIntent.trim()) throw new Error("semantic motion interpretation requires user intent");
  const mechanics = projectMechanicsForSemanticPrompt(input.mechanics);
  const system = [
    "You are Gasper Studio's semantic motion analyst.",
    "Return one closed JSON object matching gasper.semantic-motion-proposal.v1; no prose or markdown.",
    "Cite only supplied strings found inside evidenceRefs arrays or calibration.evidence[].ref; never cite object ids, hashes, support labels, or timestamps as evidence refs. Preserve measured contact order and timestamp boundaries.",
    "Never write transforms, coordinates for Gasper, forces, or executable runtime instructions.",
    "Infer semantic rhythm, intent, silhouette, and qualitative traits only; measured travel and contact remain mechanics-owned.",
    "Measured, derived, inferred, calibrated, simulated, and accepted evidence are distinct classes.",
    "Use stable semantic knowledge of a named movement when the observed mechanics support it, but treat the naming link as inferred rather than measured.",
    "External definitions strengthen the interpretation but are not required for a broadly known movement that directly matches the observations.",
    "An explicitly named movement in userIntent is user-authored semantic intent, not a classification task; use that name unless it is unfamiliar or contradicted by measurements.",
    "The target is a nonhuman form: matching measured root and contact timing is sufficient for a qualitative semantic proposal; do not require human joint anatomy.",
    "List semantic claims not established by measured mechanics in unsupportedAssumptions.",
    "Use no more than 4 semantic beats, no more than 8 evidence refs per beat or uncertainty, and keep purposes, pose language, and rationales concise.",
    "Quantities listed as unavailable remain unavailable; do not estimate absolute force, mass, scale, or friction from pixels.",
    "If the movement name is unfamiliar, ambiguous, conflicts with the observations, or lacks a recognition-critical match, return resolution unknown_movement with zero beats and at least one uncertainty citing supplied evidence.",
  ].join(" ");
  const user = JSON.stringify({
    userIntent: input.userIntent.trim(),
    durationMs: input.mechanics.durationMs,
    mechanics,
    evidenceFrames: input.evidenceFrames,
    externalDefinitions: input.externalDefinitions,
    allowedPrimitives: input.allowedPrimitives,
    requiredFields: {
      proposal: [
        "schema",
        "resolution",
        "movementName",
        "plainLanguage",
        "beats",
        "uncertainties",
        "unsupportedAssumptions",
        "externalDefinitionRefs",
      ],
      beat: [
        "id",
        "t0Ms",
        "t1Ms",
        "primitive",
        "purpose",
        "roles",
        "recognitionCritical",
        "rhythm",
        "motionQuality",
        "poseIntent",
        "evidenceRefs",
        "confidence",
        "rationale",
      ],
    },
  });
  return { schemaName: "gasper.semantic-motion-proposal.v1", system, user };
}

export class ProviderSemanticMotionInterpreter {
  constructor(private readonly provider: SemanticMotionProvider) {}

  async interpret(input: SemanticMotionInput, signal: AbortSignal): Promise<SemanticMotionProposal> {
    assertNotAborted(signal);
    const allowedPrimitives = new Set(input.allowedPrimitives);
    if (allowedPrimitives.size === 0) throw new Error("semantic motion interpretation requires allowed primitives");
    const packet = buildSemanticMotionPrompt(input);
    const generated = await this.provider.generateStructured(packet, signal);
    assertNotAborted(signal);
    let parsed: z.infer<typeof semanticMotionProposalSchema>;
    try {
      parsed = semanticMotionProposalSchema.parse(generated.output);
    } catch (error) {
      throw new Error(`semantic motion proposal schema rejected output: ${error instanceof Error ? error.message : String(error)}`);
    }

    const suppliedEvidence = new Set([
      ...mechanicsEvidenceRefs(input.mechanics),
      ...input.evidenceFrames.map((entry) => entry.ref),
      ...input.externalDefinitions.map((entry) => entry.ref),
    ]);
    const allowedDefinitions = new Set(input.externalDefinitions.map((entry) => entry.ref));
    let previousEnd = 0;
    for (let index = 0; index < parsed.beats.length; index += 1) {
      const beat = parsed.beats[index]!;
      if (!allowedPrimitives.has(beat.primitive)) {
        throw new Error(`semantic primitive is not allowed by the form packet: ${beat.primitive}`);
      }
      if (beat.t1Ms > input.mechanics.durationMs || (index > 0 && beat.t0Ms < previousEnd)) {
        throw new Error("semantic beat lies outside or overlaps the supplied mechanics timeline");
      }
      for (const ref of beat.evidenceRefs) {
        if (!suppliedEvidence.has(ref)) throw new Error(`semantic evidence ref was not supplied: ${ref}`);
      }
      previousEnd = beat.t1Ms;
    }
    for (const uncertainty of parsed.uncertainties) {
      for (const ref of uncertainty.evidenceRefs) {
        if (!suppliedEvidence.has(ref)) throw new Error(`uncertainty evidence ref was not supplied: ${ref}`);
      }
    }
    for (const ref of parsed.externalDefinitionRefs) {
      if (!allowedDefinitions.has(ref)) throw new Error(`external definition ref was not supplied: ${ref}`);
    }

    return {
      ...parsed,
      provider: {
        id: this.provider.id,
        model: this.provider.model,
        responseId: generated.responseId,
      },
    } as SemanticMotionProposal;
  }
}
