import { z } from "zod";

/** Owner click law: Explore / Summarize / Investigate always earn a CanonOps PHD. */
export const CANONOPS_MODES = ["explore", "summarize", "investigate"] as const;
export type CanonOpsMode = (typeof CANONOPS_MODES)[number];

export const CANONOPS_API_PATH = "/__gasper/training/canonops" as const;
export const CANONOPS_SCHEMA = "gasper.canonops.phd-packet.v1" as const;
export const CANONOPS_REQUEST_SCHEMA = "gasper.canonops.run-request.v1" as const;

export const DEFAULT_CANONOPS_RESIDUAL = Object.freeze({
  id: "walk-plant-off-frame",
  domain: "anim-physics",
  wall:
    "Walk is live but the operate/proof crop is a face plate, so the loaded Wispwalker lobe and the swing clearance sit below the frame. The plant cannot be reviewed.",
});

const nonEmpty = z.string().trim().min(1);

export const canonOpsModeSchema = z.enum(CANONOPS_MODES);

export const canonOpsResidualSchema = z
  .object({
    id: nonEmpty.max(96).regex(/^[a-z0-9][a-z0-9-]*$/),
    domain: nonEmpty.max(64),
    wall: nonEmpty.max(1_000),
  })
  .strict();

export const canonOpsRunRequestSchema = z
  .object({
    schema: z.literal(CANONOPS_REQUEST_SCHEMA),
    mode: canonOpsModeSchema,
    residual: canonOpsResidualSchema,
    triforceRequired: z.literal(true),
  })
  .strict();

export const canonOpsCitationSchema = z
  .object({
    id: nonEmpty.max(128),
    tier: z.enum(["canon", "reference", "derived", "axiom"]),
    source: nonEmpty.max(500),
    rule: nonEmpty.max(800),
  })
  .strict();

export const canonOpsPhdPacketSchema = z
  .object({
    schema: z.literal(CANONOPS_SCHEMA),
    mode: canonOpsModeSchema,
    residual: canonOpsResidualSchema,
    question: nonEmpty.max(500),
    coordinateSpaces: nonEmpty.max(500),
    physicalLaw: z.array(nonEmpty.max(500)).min(1).max(12),
    artisticLaw: z.array(nonEmpty.max(500)).max(12),
    invariants: z.array(nonEmpty.max(400)).min(1).max(12),
    failureModes: z.array(nonEmpty.max(400)).min(1).max(12),
    uncertainty: z.array(nonEmpty.max(400)).max(12),
    tests: z.array(nonEmpty.max(400)).min(1).max(12),
    visualConsequences: z.array(nonEmpty.max(400)).min(1).max(12),
    implementation: z.array(nonEmpty.max(500)).min(1).max(12),
    citations: z.array(canonOpsCitationSchema).min(1).max(24),
    triforce: z
      .object({
        engineVersion: nonEmpty.max(32),
        depositPath: nonEmpty.max(240),
        returned: z.boolean(),
      })
      .strict(),
    earnedAt: nonEmpty.max(40),
  })
  .strict();

export type CanonOpsResidual = z.infer<typeof canonOpsResidualSchema>;
export type CanonOpsRunRequest = z.infer<typeof canonOpsRunRequestSchema>;
export type CanonOpsPhdPacket = z.infer<typeof canonOpsPhdPacketSchema>;

export function modeVerb(mode: CanonOpsMode): string {
  if (mode === "explore") return "Explore the wall — corpus + external grounding";
  if (mode === "summarize") return "Summarize earned canon against the wall";
  return "Investigate the wall — Pressure Cooker PHD";
}

export function buildCanonOpsRequest(
  mode: CanonOpsMode,
  residual: CanonOpsResidual = DEFAULT_CANONOPS_RESIDUAL,
): CanonOpsRunRequest {
  return {
    schema: CANONOPS_REQUEST_SCHEMA,
    mode,
    residual,
    triforceRequired: true,
  };
}
