import { z } from "zod";

import { TUNING_PARAMETER_SPECS } from "../tuning/tuningRegistry.js";

export const STUDIO_PILOT_MODEL = "grok-4.6" as const;
export const STUDIO_PILOT_MAX_TURNS = 6;
export const STUDIO_PILOT_MAX_ACTIONS = 12;

export const STUDIO_PILOT_EMBODIMENTS = [
  "presence",
  "singularity",
  "comet",
  "dormant-orbit",
  "wispwalker",
  "halo",
  "lantern",
  "low-orbit",
] as const;

export const STUDIO_PILOT_EIGHT_STATES = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
  "wake",
] as const;

export const STUDIO_PILOT_CRAFT_PACKS = [
  "s2-bounce",
  "s2-bounce/blocking",
  "s4-comet",
  "s4-comet/blocking",
] as const;

export const STUDIO_PILOT_ACTION_KINDS = [
  "tuning.set",
  "tuning.reset",
  "tuning.pin_baseline",
  "tuning.compare_baseline",
  "tuning.capture_proof",
  "studio.set_embodiment",
  "studio.set_expression",
  "studio.set_eight_state",
  "studio.set_expression_gain",
  "studio.transport",
  "physics.set_params",
  "physics.launch_bounce",
  "physics.launch_comet",
  "physics.disarm",
  "craft.set_params",
  "craft.run_pack",
  "craft.stop_pack",
  "autonomy.set",
  "reference.link_video",
  "reference.analyze",
  "reference.preview",
  "reference.stop",
] as const;

const nonEmpty = z.string().trim().min(1);
const actionId = nonEmpty.max(64).regex(/^[a-z0-9][a-z0-9_-]*$/i);
const reason = nonEmpty.max(500);
const tuningParameterIds = TUNING_PARAMETER_SPECS.map((spec) => spec.id) as [
  (typeof TUNING_PARAMETER_SPECS)[number]["id"],
  ...(typeof TUNING_PARAMETER_SPECS)[number]["id"][],
];

const actionBase = z.object({ id: actionId, reason });
const action = <Kind extends (typeof STUDIO_PILOT_ACTION_KINDS)[number], Shape extends z.ZodRawShape>(kind: Kind, shape: Shape) =>
  actionBase.extend({ kind: z.literal(kind), ...shape }).strict();

const tuningSetSchema = action("tuning.set", {
  parameter: z.enum(tuningParameterIds),
  value: z.number().finite(),
}).superRefine((value, ctx) => {
  const spec = TUNING_PARAMETER_SPECS.find((entry) => entry.id === value.parameter)!;
  if (value.value < spec.min || value.value > spec.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: `${value.parameter} must be between ${spec.min} and ${spec.max}`,
    });
  }
});

const worldPhysicsParamsSchema = z
  .object({
    gravityScale: z.number().finite().min(0.25).max(2).optional(),
    restitution: z.number().finite().min(0).max(0.9).optional(),
    launchPower: z.number().finite().min(0.25).max(2).optional(),
    intensity: z.number().finite().min(0).max(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "at least one physics parameter is required");

const craftParamsSchema = z
  .object({
    exaggeration: z.number().finite().min(0.5).max(2).optional(),
    tempo: z.number().finite().min(0.75).max(1.25).optional(),
    shotBias: z.enum(["authored", "medium", "wide"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "at least one craft parameter is required");

const transportActionSchema = action("studio.transport", {
  command: z.enum(["play", "pause", "interrupt", "home", "end", "step_forward", "step_back", "scrub"]),
  positionMs: z.number().finite().nonnegative().max(3_600_000).optional(),
}).superRefine((value, ctx) => {
  if (value.command === "scrub" && value.positionMs === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positionMs"], message: "scrub requires positionMs" });
  }
  if (value.command !== "scrub" && value.positionMs !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positionMs"], message: "positionMs is only valid for scrub" });
  }
});

export const studioPilotActionSchema = z.union([
  tuningSetSchema,
  action("tuning.reset", {}),
  action("tuning.pin_baseline", {}),
  action("tuning.compare_baseline", {}),
  action("tuning.capture_proof", {}),
  action("studio.set_embodiment", { embodiment: z.enum(STUDIO_PILOT_EMBODIMENTS) }),
  action("studio.set_expression", { expression: nonEmpty.max(96) }),
  action("studio.set_eight_state", { state: z.enum(STUDIO_PILOT_EIGHT_STATES) }),
  action("studio.set_expression_gain", { gain: z.number().finite().min(0.5).max(1.5) }),
  transportActionSchema,
  action("physics.set_params", { params: worldPhysicsParamsSchema }),
  action("physics.launch_bounce", {}),
  action("physics.launch_comet", {}),
  action("physics.disarm", {}),
  action("craft.set_params", { params: craftParamsSchema }),
  action("craft.run_pack", { packId: z.enum(STUDIO_PILOT_CRAFT_PACKS) }),
  action("craft.stop_pack", {}),
  action("autonomy.set", {
    authority: z.enum(["living", "wander", "life", "boo"]),
    enabled: z.boolean(),
  }),
  action("reference.link_video", { url: z.string().trim().url().max(2_048) }),
  action("reference.analyze", { intent: z.string().trim().max(2_000).optional() }),
  action("reference.preview", {}),
  action("reference.stop", {}),
]);

export const studioPilotActionBatchSchema = z
  .object({
    schema: z.literal("gasper.studio-pilot.action-batch.v1"),
    disposition: z.enum(["act", "complete", "needs_user"]),
    summary: nonEmpty.max(1_000),
    message: nonEmpty.max(1_000),
    continueOnError: z.boolean(),
    actions: z.array(studioPilotActionSchema).max(STUDIO_PILOT_MAX_ACTIONS),
  })
  .strict()
  .superRefine((batch, ctx) => {
    if (batch.disposition === "act" && batch.actions.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["actions"], message: "act requires at least one action" });
    }
    if (batch.disposition !== "act" && batch.actions.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["actions"], message: `${batch.disposition} may not contain actions` });
    }
    const ids = batch.actions.map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["actions"], message: "action ids must be unique" });
    }
  });

const recordSchema = z.record(z.string(), z.unknown());

export const studioPilotObservationSchema = z
  .object({
    schema: z.literal("gasper.studio-pilot.observation.v1"),
    capturedAtMs: z.number().finite().nonnegative(),
    studio: recordSchema,
    tuning: recordSchema,
    physics: recordSchema,
    autonomy: recordSchema,
    reference: recordSchema,
  })
  .strict();

export const studioPilotCapabilitySchema = z
  .object({
    kind: z.enum(STUDIO_PILOT_ACTION_KINDS),
    available: z.boolean(),
    description: nonEmpty.max(500),
    bounds: recordSchema,
  })
  .strict();

export const studioPilotActionReceiptSchema = z
  .object({
    schema: z.literal("gasper.studio-pilot.action-receipt.v1"),
    actionId,
    kind: z.enum(STUDIO_PILOT_ACTION_KINDS),
    status: z.enum(["applied", "failed", "skipped", "cancelled"]),
    message: nonEmpty.max(1_000),
    reversible: z.boolean(),
    beforeRevision: z.number().int().nonnegative().optional(),
    afterRevision: z.number().int().nonnegative().optional(),
    detail: recordSchema.optional(),
  })
  .strict();

const historyEntrySchema = z
  .object({
    batch: studioPilotActionBatchSchema,
    receipts: z.array(studioPilotActionReceiptSchema).max(STUDIO_PILOT_MAX_ACTIONS),
  })
  .strict();

export const studioPilotTurnRequestSchema = z
  .object({
    schema: z.literal("gasper.studio-pilot.turn-request.v1"),
    sessionId: nonEmpty.max(64).regex(/^[a-z0-9][a-z0-9-]*$/),
    turn: z.number().int().min(1).max(STUDIO_PILOT_MAX_TURNS),
    maxTurns: z.number().int().min(1).max(STUDIO_PILOT_MAX_TURNS),
    model: z.literal(STUDIO_PILOT_MODEL),
    userGoal: nonEmpty.max(4_096),
    capabilities: z.array(studioPilotCapabilitySchema).min(1).max(STUDIO_PILOT_ACTION_KINDS.length),
    observation: studioPilotObservationSchema,
    history: z.array(historyEntrySchema).max(STUDIO_PILOT_MAX_TURNS - 1),
  })
  .strict()
  .refine((request) => request.turn <= request.maxTurns, {
    path: ["turn"],
    message: "turn may not exceed maxTurns",
  });

export type StudioPilotAction = z.infer<typeof studioPilotActionSchema>;
export type StudioPilotActionBatch = z.infer<typeof studioPilotActionBatchSchema>;
export type StudioPilotObservation = z.infer<typeof studioPilotObservationSchema>;
export type StudioPilotCapability = z.infer<typeof studioPilotCapabilitySchema>;
export type StudioPilotActionReceipt = z.infer<typeof studioPilotActionReceiptSchema>;
export type StudioPilotTurnRequest = z.infer<typeof studioPilotTurnRequestSchema>;

export type StudioPilotPromptPacket = Readonly<{
  schemaName: "gasper.studio-pilot.action-batch.v1";
  system: string;
  user: string;
}>;

type JsonSchema = Readonly<Record<string, unknown>>;

const closedActionJson = (
  kind: StudioPilotAction["kind"],
  properties: Readonly<Record<string, unknown>> = {},
  required: readonly string[] = [],
): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  required: ["id", "kind", "reason", ...required],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" },
    kind: { const: kind },
    reason: { type: "string", minLength: 1, maxLength: 500 },
    ...properties,
  },
});

// Keep the provider schema beneath Windows' process command-line ceiling. The
// capability catalog supplies each knob's exact range to Grok, while the Zod
// action parser above remains the final per-parameter bounds authority.
const tuningActionJson = closedActionJson(
  "tuning.set",
  {
    parameter: { enum: TUNING_PARAMETER_SPECS.map((spec) => spec.id) },
    value: { type: "number", minimum: 0, maximum: 10 },
  },
  ["parameter", "value"],
);

const actionJsonSchemas: readonly JsonSchema[] = [
  tuningActionJson,
  closedActionJson("tuning.reset"),
  closedActionJson("tuning.pin_baseline"),
  closedActionJson("tuning.compare_baseline"),
  closedActionJson("tuning.capture_proof"),
  closedActionJson("studio.set_embodiment", { embodiment: { enum: [...STUDIO_PILOT_EMBODIMENTS] } }, ["embodiment"]),
  closedActionJson("studio.set_expression", { expression: { type: "string", minLength: 1, maxLength: 96 } }, ["expression"]),
  closedActionJson("studio.set_eight_state", { state: { enum: [...STUDIO_PILOT_EIGHT_STATES] } }, ["state"]),
  closedActionJson("studio.set_expression_gain", { gain: { type: "number", minimum: 0.5, maximum: 1.5 } }, ["gain"]),
  closedActionJson(
    "studio.transport",
    {
      command: { enum: ["play", "pause", "interrupt", "home", "end", "step_forward", "step_back", "scrub"] },
      positionMs: { type: "number", minimum: 0, maximum: 3_600_000 },
    },
    ["command"],
  ),
  closedActionJson(
    "physics.set_params",
    {
      params: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          gravityScale: { type: "number", minimum: 0.25, maximum: 2 },
          restitution: { type: "number", minimum: 0, maximum: 0.9 },
          launchPower: { type: "number", minimum: 0.25, maximum: 2 },
          intensity: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    ["params"],
  ),
  closedActionJson("physics.launch_bounce"),
  closedActionJson("physics.launch_comet"),
  closedActionJson("physics.disarm"),
  closedActionJson(
    "craft.set_params",
    {
      params: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          exaggeration: { type: "number", minimum: 0.5, maximum: 2 },
          tempo: { type: "number", minimum: 0.75, maximum: 1.25 },
          shotBias: { enum: ["authored", "medium", "wide"] },
        },
      },
    },
    ["params"],
  ),
  closedActionJson("craft.run_pack", { packId: { enum: [...STUDIO_PILOT_CRAFT_PACKS] } }, ["packId"]),
  closedActionJson("craft.stop_pack"),
  closedActionJson(
    "autonomy.set",
    { authority: { enum: ["living", "wander", "life", "boo"] }, enabled: { type: "boolean" } },
    ["authority", "enabled"],
  ),
  closedActionJson("reference.link_video", { url: { type: "string", format: "uri", maxLength: 2_048 } }, ["url"]),
  closedActionJson("reference.analyze", { intent: { type: "string", maxLength: 2_000 } }),
  closedActionJson("reference.preview"),
  closedActionJson("reference.stop"),
];

export const STUDIO_PILOT_OUTPUT_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["schema", "disposition", "summary", "message", "continueOnError", "actions"],
  properties: {
    schema: { const: "gasper.studio-pilot.action-batch.v1" },
    disposition: { enum: ["act", "complete", "needs_user"] },
    summary: { type: "string", minLength: 1, maxLength: 1_000 },
    message: { type: "string", minLength: 1, maxLength: 1_000 },
    continueOnError: { type: "boolean" },
    actions: {
      type: "array",
      minItems: 0,
      maxItems: STUDIO_PILOT_MAX_ACTIONS,
      items: { oneOf: actionJsonSchemas },
    },
  },
} as const);

export function buildStudioPilotPrompt(request: StudioPilotTurnRequest): StudioPilotPromptPacket {
  const validated = studioPilotTurnRequestSchema.parse(request);
  const system = [
    "You are Grok 4.6, the bounded Gasper Studio pilot.",
    "Return exactly one JSON object matching gasper.studio-pilot.action-batch.v1; never prose or markdown.",
    "Use only action kinds marked available in the supplied capability catalog and respect every supplied bound.",
    "Never emit shell, filesystem, Git, network-fetch, credential, eval, arbitrary DOM, direct transform, renderer, topology, or unlisted method actions.",
    "Existing Studio, Dais, Tuning Lab, reference-performance, organism-clock, and physics authorities are the only writers.",
    "Inspect the supplied observation and all prior receipts before acting. If a prior action failed, revise through an available action or explain the blocker.",
    "Choose disposition act only when actions are required, complete only when the requested observable state is satisfied, and needs_user only for a consequential missing choice or unavailable authority.",
    "Keep batches minimal, sequential, reviewable, and reversible where possible. Never claim visual or owner acceptance.",
  ].join(" ");
  const user = JSON.stringify({
    sessionId: validated.sessionId,
    turn: validated.turn,
    maxTurns: validated.maxTurns,
    model: validated.model,
    userGoal: validated.userGoal,
    capabilities: validated.capabilities,
    observation: validated.observation,
    history: validated.history,
  });
  return {
    schemaName: "gasper.studio-pilot.action-batch.v1",
    system,
    user,
  };
}
