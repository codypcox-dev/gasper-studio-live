import { z } from "zod";

export const GROK_SUCCESSOR_STATUS_PATH = "/__gasper/training/successor/status";
export const GROK_SUCCESSOR_CONTINUITY_PATH = "/__gasper/training/successor/continuity";
export const GROK_SUCCESSOR_GROK_LANE_PATH = "/__gasper/training/successor/grok-lane";

const limitedText = z.string().trim().min(1).max(4_096);
const localPath = limitedText.refine(
  (value) => !/(^|[\\/])grimoire([\\/]|$)/i.test(value),
  "Grimoire is outside the Gasper successor scope",
);

export const grokResponseIdentitySchema = z.object({
  verification: z.literal("response"),
  canonicalModel: z.literal("grok-4.6"),
  backendModel: z.string().regex(/^grok-4\.6(?:-|$)/),
  requestId: limitedText,
  sessionId: limitedText,
  modelCalls: z.number().int().min(1),
}).strict();

export const grokRepoStateSchema = z.object({
  root: localPath,
  branch: limitedText,
  head: z.string().regex(/^[0-9a-f]{40}$/),
  dirty: z.array(z.string().max(4_096)).max(10_000),
}).strict();

export const grokPlanOpsStateSchema = z.object({
  bookId: limitedText,
  turn: limitedText,
  phase: limitedText,
  gate: limitedText,
  workId: limitedText.nullable(),
}).strict();

export const grokContinuityPacketSchema = z.object({
  schema: z.literal("gasper.grok-successor.continuity.v1"),
  writtenAt: z.string().datetime(),
  repo: grokRepoStateSchema,
  planops: grokPlanOpsStateSchema,
  northstarRefs: z.array(localPath).min(1).max(64),
  allowedPaths: z.array(localPath).min(1).max(256),
  completed: z.array(limitedText).max(256),
  openRisks: z.array(limitedText).max(256),
  nextAction: limitedText,
  proofRefs: z.array(localPath).max(256),
  lastResponseIdentity: grokResponseIdentitySchema.optional(),
}).strict();

export const grokSuccessorIdentityStatusSchema = z.object({
  environmentVerified: z.boolean(),
  responseVerified: z.boolean(),
  requestedModel: z.literal("grok-4.6"),
  backendModel: z.string().regex(/^grok-4\.6(?:-|$)/).optional(),
  cliVersion: limitedText.optional(),
  executableSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
}).strict().superRefine((value, context) => {
  if (value.responseVerified && !value.backendModel) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["backendModel"],
      message: "response verification requires a backend model",
    });
  }
});

export const grokLegalAliasSchema = z.object({
  incompatible: limitedText,
  legal: limitedText,
  operation: limitedText,
}).strict();

export const grokSuccessorBridgeStatusSchema = z.object({
  healthy: z.boolean(),
  protocol: limitedText.optional(),
  discoveredTools: z.number().int().min(0),
  incompatibleTools: z.array(limitedText).max(1_024),
  legalAliases: z.array(grokLegalAliasSchema).max(64),
}).strict();

export const grokContinuitySummarySchema = z.object({
  available: z.boolean(),
  writtenAt: z.string().datetime().optional(),
  nextAction: limitedText.optional(),
}).strict().superRefine((value, context) => {
  if (value.available && (!value.writtenAt || !value.nextAction)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "available continuity requires its timestamp and next action",
    });
  }
});

export const grokSuccessorStatusSchema = z.object({
  schema: z.literal("gasper.grok-successor.status.v1"),
  capturedAt: z.string().datetime(),
  identity: grokSuccessorIdentityStatusSchema,
  bridge: grokSuccessorBridgeStatusSchema,
  repo: grokRepoStateSchema,
  planops: grokPlanOpsStateSchema,
  continuity: grokContinuitySummarySchema,
}).strict();

export type GrokResponseIdentityPayload = z.infer<typeof grokResponseIdentitySchema>;
export type GrokRepoState = z.infer<typeof grokRepoStateSchema>;
export type GrokPlanOpsState = z.infer<typeof grokPlanOpsStateSchema>;
export type GrokContinuityPacket = z.infer<typeof grokContinuityPacketSchema>;
export type GrokSuccessorStatus = z.infer<typeof grokSuccessorStatusSchema>;
