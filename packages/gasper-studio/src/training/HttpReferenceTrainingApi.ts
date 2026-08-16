import { z } from "zod";

import { videoSourceReceiptSchema } from "../../../shared/src/gasper-performance/reference/schemas.js";
import {
  ReferenceTrainingApiError,
  type ReferenceTrainingApi,
  type ReferenceTrainingErrorCode,
  type ReferenceTrainingPersister,
  type ReferenceTrainingStage,
  type ResolvedReferenceSource,
} from "./ReferenceTrainingSession.js";

export const REFERENCE_TRAINING_API_PATH = "/__gasper/training" as const;

type FetchLike = typeof fetch;

const successSchema = z
  .object({
    ok: z.literal(true),
    sessionId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    receipt: videoSourceReceiptSchema,
    mediaUrl: z.string().regex(/^\/__gasper\/training\/media\/[a-f0-9]{64}$/),
  })
  .strict();

const stageSuccessSchema = z
  .object({
    ok: z.literal(true),
    artifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .passthrough();

const capabilitySchema = z
  .object({
    ok: z.literal(true),
    capabilities: z
      .object({
        source: z.boolean(),
        persistence: z.boolean(),
        semantic: z.boolean(),
        pilot: z.boolean().optional(),
      })
      .strict(),
  })
  .passthrough();

const KNOWN_ERROR_CODES: readonly ReferenceTrainingErrorCode[] = [
  "ABORTED",
  "DURATION_LIMIT",
  "INVALID_SOURCE",
  "POSE_BACKEND_ABSENT",
  "PROVIDER_REQUIRED",
  "SEMANTIC_PROVIDER_ABSENT",
  "SOURCE_API_UNAVAILABLE",
  "SOURCE_REJECTED",
  "SOURCE_REQUIRED",
  "TIMEOUT",
];

function knownErrorCode(value: unknown): ReferenceTrainingErrorCode {
  return typeof value === "string" && KNOWN_ERROR_CODES.includes(value as ReferenceTrainingErrorCode)
    ? (value as ReferenceTrainingErrorCode)
    : "SOURCE_API_UNAVAILABLE";
}

export class HttpReferenceTrainingApi implements ReferenceTrainingApi, ReferenceTrainingPersister {
  private readonly fetchImpl: FetchLike;
  private readonly basePath: string;

  constructor(options: Readonly<{ fetchImpl?: FetchLike; basePath?: string }> = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.basePath = (options.basePath ?? REFERENCE_TRAINING_API_PATH).replace(/\/$/, "");
  }

  async resolveLinkedSource(url: string, signal: AbortSignal): Promise<ResolvedReferenceSource> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.basePath}/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) {
        throw new ReferenceTrainingApiError("ABORTED", "video source request was aborted");
      }
      throw new ReferenceTrainingApiError(
        "SOURCE_API_UNAVAILABLE",
        error instanceof Error ? error.message : String(error),
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ReferenceTrainingApiError(
        "SOURCE_API_UNAVAILABLE",
        `training source API returned invalid JSON (${response.status})`,
      );
    }
    if (!response.ok) {
      const failure = body as { code?: unknown; error?: unknown };
      throw new ReferenceTrainingApiError(
        knownErrorCode(failure?.code),
        typeof failure?.error === "string"
          ? failure.error
          : `training source API rejected request (${response.status})`,
      );
    }
    try {
      const parsed = successSchema.parse(body);
      return {
        sessionId: parsed.sessionId,
        receipt: parsed.receipt,
        mediaUrl: parsed.mediaUrl,
      };
    } catch (error) {
      throw new ReferenceTrainingApiError(
        "SOURCE_API_UNAVAILABLE",
        `training source API returned an invalid receipt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async writeStage(
    sessionId: string,
    stage: ReferenceTrainingStage,
    artifact: unknown,
    signal: AbortSignal,
  ): Promise<Readonly<{ artifactHash: string }>> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.basePath}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, stage, artifact }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw new DOMException("training stage write aborted", "AbortError");
      throw new Error(`training stage persistence unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`training stage persistence returned invalid JSON (${response.status})`);
    }
    if (!response.ok) {
      const message = (body as { error?: unknown } | null)?.error;
      throw new Error(typeof message === "string" ? message : `training stage persistence failed (${response.status})`);
    }
    try {
      const parsed = stageSuccessSchema.parse(body);
      return { artifactHash: parsed.artifactHash };
    } catch (error) {
      throw new Error(`training stage persistence returned an invalid receipt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCapabilities(signal?: AbortSignal): Promise<Readonly<{
    source: boolean;
    persistence: boolean;
    semantic: boolean;
  }>> {
    try {
      const response = await this.fetchImpl(`${this.basePath}/status`, { signal });
      if (!response.ok) return { source: false, persistence: false, semantic: false };
      const parsed = capabilitySchema.safeParse(await response.json());
      return parsed.success
        ? parsed.data.capabilities
        : { source: false, persistence: false, semantic: false };
    } catch {
      return { source: false, persistence: false, semantic: false };
    }
  }
}
