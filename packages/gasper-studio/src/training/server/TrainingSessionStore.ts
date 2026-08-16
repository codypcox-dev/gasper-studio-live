import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z, type ZodTypeAny } from "zod";

import { sha256OfCanonical } from "../../../../shared/src/gasper-performance/hashing.js";
import {
  formCapabilityProfileSchema,
  motionScoreSchema,
  physicsIntentPlanSchema,
  poseObservationTrackSchema,
  referenceBehaviorArtifactSchema,
  videoAnalysisSelectionSchema,
  videoSourceReceiptSchema,
} from "../../../../shared/src/gasper-performance/reference/schemas.js";
import { semanticMotionProposalSchema } from "../SemanticMotionInterpreter.js";
import { motionMechanicsSummarySchema } from "../../../../shared/src/gasper-performance/reference/mechanics.js";

export const TRAINING_SESSION_STATES = [
  "experiment",
  "machine_valid",
  "architect_reviewed",
  "owner_accepted",
  "rejected",
] as const;

export type TrainingSessionState = (typeof TRAINING_SESSION_STATES)[number];
export type TrainingStage = "source" | "selection" | "pose" | "mechanics" | "semantic" | "score" | "form" | "physics_plan" | "behavior";

export type TrainingStageReceipt = Readonly<{
  stage: TrainingStage;
  schema: string;
  artifactHash: string;
  file: string;
  writtenAt: string;
}>;

export type TrainingStateEvent = Readonly<{
  state: TrainingSessionState;
  at: string;
  note: string;
}>;

export type TrainingSessionManifest = Readonly<{
  schema: "gasper.training-session.v1";
  sessionId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  state: TrainingSessionState;
  stages: Readonly<Partial<Record<TrainingStage, TrainingStageReceipt>>>;
  events: readonly TrainingStateEvent[];
}>;

export type CanonicalPromotionReceipt = Readonly<{
  schema: "gasper.training-promotion.v1";
  sessionId: string;
  state: "owner_accepted";
  promotedAt: string;
  manifestHash: string;
}>;

const hashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const stageSchema = z.enum(["source", "selection", "pose", "mechanics", "semantic", "score", "form", "physics_plan", "behavior"]);
const stageReceiptSchema = z
  .object({
    stage: stageSchema,
    schema: z.string().trim().min(1),
    artifactHash: hashSchema,
    file: z.string().regex(/^[a-z0-9_-]+-[a-f0-9]{64}\.json$/),
    writtenAt: z.string().datetime(),
  })
  .strict();
const manifestSchema = z
  .object({
    schema: z.literal("gasper.training-session.v1"),
    sessionId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    revision: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    state: z.enum(TRAINING_SESSION_STATES),
    stages: z.record(stageReceiptSchema),
    events: z
      .array(
        z
          .object({
            state: z.enum(TRAINING_SESSION_STATES),
            at: z.string().datetime(),
            note: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const STAGE_SCHEMAS: Readonly<Record<TrainingStage, ZodTypeAny>> = Object.freeze({
  source: videoSourceReceiptSchema,
  selection: videoAnalysisSelectionSchema,
  pose: poseObservationTrackSchema,
  mechanics: motionMechanicsSummarySchema,
  semantic: semanticMotionProposalSchema.refine((proposal) => proposal.provider !== undefined, {
    message: "persisted semantic proposal requires trusted provider identity",
  }),
  score: motionScoreSchema,
  form: formCapabilityProfileSchema,
  physics_plan: physicsIntentPlanSchema,
  behavior: referenceBehaviorArtifactSchema,
});

const NEXT_STATES: Readonly<Record<TrainingSessionState, readonly TrainingSessionState[]>> = Object.freeze({
  experiment: ["machine_valid", "rejected"],
  machine_valid: ["architect_reviewed", "rejected"],
  architect_reviewed: ["owner_accepted", "rejected"],
  owner_accepted: [],
  rejected: [],
});

function assertSessionId(sessionId: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(sessionId)) {
    throw new Error("invalid training session id");
  }
  return sessionId;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export class TrainingSessionStore {
  private readonly root: string;
  private readonly now: () => string;

  constructor(
    root: string,
    options: Readonly<{ now?: () => string }> = {},
  ) {
    this.root = resolve(root);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async read(sessionId: string): Promise<TrainingSessionManifest> {
    const id = assertSessionId(sessionId);
    const path = join(this.root, "sessions", id, "manifest.json");
    try {
      return manifestSchema.parse(JSON.parse(await readFile(path, "utf8"))) as TrainingSessionManifest;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") throw new Error(`training session not found: ${id}`);
      throw new Error(
        `training session manifest rejected: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async writeStage(
    sessionId: string,
    stage: TrainingStage,
    artifact: unknown,
  ): Promise<TrainingStageReceipt> {
    const id = assertSessionId(sessionId);
    let validated: unknown;
    try {
      validated = STAGE_SCHEMAS[stage].parse(artifact);
    } catch (error) {
      throw new Error(`invalid ${stage} artifact: ${error instanceof Error ? error.message : String(error)}`);
    }
    const sessionDir = join(this.root, "sessions", id);
    await mkdir(sessionDir, { recursive: true });
    const now = this.now();
    const artifactHash = `sha256:${sha256OfCanonical(validated)}`;
    const filename = `${stage}-${artifactHash.slice("sha256:".length)}.json`;
    const finalArtifactPath = join(sessionDir, filename);
    const artifactTemp = join(sessionDir, `.artifact-${randomUUID()}.tmp`);
    await writeFile(artifactTemp, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    if (await pathExists(finalArtifactPath)) await unlink(artifactTemp);
    else await rename(artifactTemp, finalArtifactPath);

    let current: TrainingSessionManifest;
    try {
      current = await this.read(id);
    } catch (error) {
      if (!/not found/i.test(error instanceof Error ? error.message : String(error))) throw error;
      current = {
        schema: "gasper.training-session.v1",
        sessionId: id,
        revision: 0,
        createdAt: now,
        updatedAt: now,
        state: "experiment",
        stages: {},
        events: [{ state: "experiment", at: now, note: "training session created" }],
      };
    }
    const receipt: TrainingStageReceipt = {
      stage,
      schema: (validated as { schema: string }).schema,
      artifactHash,
      file: filename,
      writtenAt: now,
    };
    const next: TrainingSessionManifest = {
      ...current,
      revision: current.revision + 1,
      updatedAt: now,
      stages: { ...current.stages, [stage]: receipt },
    };
    await this.writeManifest(next);
    return receipt;
  }

  async transition(
    sessionId: string,
    state: TrainingSessionState,
    note: string,
  ): Promise<TrainingSessionManifest> {
    const current = await this.read(sessionId);
    if (!note.trim()) throw new Error("training state transition requires a note");
    if (!NEXT_STATES[current.state].includes(state)) {
      const terminal = NEXT_STATES[current.state].length === 0 ? " terminal" : "";
      throw new Error(`invalid${terminal} training state transition: ${current.state} -> ${state}`);
    }
    const now = this.now();
    const next: TrainingSessionManifest = {
      ...current,
      revision: current.revision + 1,
      updatedAt: now,
      state,
      events: [...current.events, { state, at: now, note: note.trim() }],
    };
    await this.writeManifest(next);
    return next;
  }

  async promoteCanonical(sessionId: string): Promise<CanonicalPromotionReceipt> {
    const manifest = await this.read(sessionId);
    if (manifest.state !== "owner_accepted") {
      throw new Error("canonical promotion requires owner_accepted session state");
    }
    const receipt: CanonicalPromotionReceipt = {
      schema: "gasper.training-promotion.v1",
      sessionId: manifest.sessionId,
      state: "owner_accepted",
      promotedAt: this.now(),
      manifestHash: `sha256:${sha256OfCanonical(manifest)}`,
    };
    const sessionDir = join(this.root, "sessions", manifest.sessionId);
    await this.writeAtomicJson(join(sessionDir, "canonical-promotion.json"), receipt);
    return receipt;
  }

  private async writeManifest(manifest: TrainingSessionManifest): Promise<void> {
    const validated = manifestSchema.parse(manifest);
    const sessionDir = join(this.root, "sessions", manifest.sessionId);
    await mkdir(sessionDir, { recursive: true });
    await this.writeAtomicJson(join(sessionDir, "manifest.json"), validated);
  }

  private async writeAtomicJson(path: string, value: unknown): Promise<void> {
    const tempPath = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await rename(tempPath, path);
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }
  }
}
