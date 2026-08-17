import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname } from "node:path";

import { REFERENCE_TRAINING_API_PATH } from "../HttpReferenceTrainingApi.js";
import {
  GROK_SUCCESSOR_CONTINUITY_PATH,
  GROK_SUCCESSOR_GROK_LANE_PATH,
  GROK_SUCCESSOR_STATUS_PATH,
  grokContinuityPacketSchema,
  type GrokContinuityPacket,
  type GrokResponseIdentityPayload,
  type GrokSuccessorStatus,
} from "../GrokSuccessorProtocol.js";
import type {
  ReferenceTrainingStage,
  ResolvedReferenceSource,
} from "../ReferenceTrainingSession.js";
import type { SemanticPromptPacket } from "../SemanticMotionInterpreter.js";
import {
  studioPilotTurnRequestSchema,
  type StudioPilotActionBatch,
  type StudioPilotTurnRequest,
} from "../StudioPilotProtocol.js";
import { VideoSourceError } from "./VideoSourceResolver.js";
import {
  CANONOPS_API_PATH,
  canonOpsRunRequestSchema,
  type CanonOpsPhdPacket,
  type CanonOpsRunRequest,
} from "../../canonops/CanonOpsProtocol.js";

export type TrainingSourceMiddlewareService = Readonly<{
  resolveLinked(url: string, signal?: AbortSignal): Promise<ResolvedReferenceSource>;
  findMediaPath(hash: string): Promise<string>;
  writeStage?(sessionId: string, stage: ReferenceTrainingStage, artifact: unknown): Promise<{ artifactHash: string }>;
  interpretSemantic?(packet: SemanticPromptPacket, signal?: AbortSignal): Promise<{ responseId: string; output: unknown }>;
  pilotTurn?(request: StudioPilotTurnRequest, signal?: AbortSignal): Promise<{
    responseId: string;
    model: "grok-4.6";
    identity: GrokResponseIdentityPayload;
    batch: StudioPilotActionBatch;
  }>;
  successorStatus?(): Promise<GrokSuccessorStatus>;
  readSuccessorContinuity?(): Promise<GrokContinuityPacket | null>;
  writeSuccessorContinuity?(packet: GrokContinuityPacket): Promise<GrokContinuityPacket>;
  dispatchGrokLane?(request: { name: string; args?: Record<string, unknown> }): Promise<{
    ok: boolean;
    name: string;
    operation?: string;
    result?: unknown;
    error?: string;
    code?: string;
  }>;
  runCanonOps?(request: CanonOpsRunRequest): Promise<CanonOpsPhdPacket>;
}>;

export type TrainingSourceNext = (error?: unknown) => void;
export type TrainingSourceMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: TrainingSourceNext,
) => void;

const MEDIA_MIME: Readonly<Record<string, string>> = Object.freeze({
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".m4v": "video/x-m4v",
});

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

class TrainingBodyTooLargeError extends Error {}

function readJsonBody(req: IncomingMessage, maxBytes = 16_384): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    let raw = "";
    let bytes = 0;
    let rejected = false;
    req.on("data", (chunk: Buffer | string) => {
      if (rejected) return;
      bytes += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.byteLength;
      if (bytes > maxBytes) {
        rejected = true;
        reject(new TrainingBodyTooLargeError("training request body too large"));
        return;
      }
      raw += chunk.toString();
    });
    req.on("end", () => {
      if (rejected) return;
      try {
        resolveBody(raw ? JSON.parse(raw) : null);
      } catch {
        reject(new Error("invalid training source JSON"));
      }
    });
    req.on("error", reject);
  });
}

function loopbackAddress(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().split("%", 1)[0];
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "::ffff:127.0.0.1";
}

function sameOriginOrNonBrowser(req: IncomingMessage): boolean {
  if (!loopbackAddress(req.socket.remoteAddress)) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host === req.headers.host &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "[::1]");
  } catch {
    return false;
  }
}

function sourceFailure(error: unknown): Readonly<{ status: number; code: string; message: string }> {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof VideoSourceError) {
    const status = error.code === "TIMEOUT" ? 504 : error.code === "ABORTED" ? 499 : 422;
    return { status, code: error.code, message };
  }
  return { status: 422, code: "SOURCE_REJECTED", message };
}

function parseByteRange(value: string | undefined, size: number): Readonly<{ start: number; end: number }> | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) throw new Error("invalid media byte range");
  const [, startText, endText] = match;
  if (!startText && !endText) throw new Error("invalid media byte range");
  if (!startText) {
    const suffix = Number(endText);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new Error("invalid media byte range");
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(startText);
  const end = endText ? Number(endText) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    throw new Error("invalid media byte range");
  }
  return { start, end: Math.min(end, size - 1) };
}

export function createTrainingSourceMiddleware(
  service: TrainingSourceMiddlewareService,
): TrainingSourceMiddleware {
  return (req, res, next) => {
    const pathname = req.url ? new URL(req.url, "http://gasper.local").pathname : "";
    if (!pathname.startsWith(REFERENCE_TRAINING_API_PATH)) {
      next();
      return;
    }
    if (!sameOriginOrNonBrowser(req)) {
      sendJson(res, 403, { ok: false, code: "SOURCE_REJECTED", error: "loopback same-origin request required" });
      return;
    }

    if (req.method === "GET" && pathname === GROK_SUCCESSOR_STATUS_PATH) {
      if (!service.successorStatus) {
        sendJson(res, 503, { ok: false, code: "SUCCESSOR_UNAVAILABLE", error: "Grok successor status unavailable" });
        return;
      }
      void service.successorStatus()
        .then((status) => sendJson(res, 200, { ok: true, status }))
        .catch((error) => sendJson(res, 502, {
          ok: false,
          code: "SUCCESSOR_STATUS_FAILED",
          error: error instanceof Error ? error.message : String(error),
        }));
      return;
    }

    if (req.method === "GET" && pathname === GROK_SUCCESSOR_CONTINUITY_PATH) {
      if (!service.readSuccessorContinuity) {
        sendJson(res, 503, { ok: false, code: "SUCCESSOR_UNAVAILABLE", error: "Grok successor continuity unavailable" });
        return;
      }
      void service.readSuccessorContinuity()
        .then((continuity) => sendJson(res, 200, { ok: true, continuity }))
        .catch((error) => sendJson(res, 502, {
          ok: false,
          code: "SUCCESSOR_CONTINUITY_FAILED",
          error: error instanceof Error ? error.message : String(error),
        }));
      return;
    }

    if (req.method === "POST" && pathname === GROK_SUCCESSOR_GROK_LANE_PATH) {
      if (!service.dispatchGrokLane) {
        sendJson(res, 503, { ok: false, code: "GROK_LANE_UNAVAILABLE", error: "Grok Gasper lane unavailable" });
        return;
      }
      void readJsonBody(req, 16_384)
        .then(async (body) => {
          const name = (body as { name?: unknown } | null)?.name;
          const args = (body as { args?: unknown } | null)?.args;
          if (typeof name !== "string" || !name.trim()) {
            sendJson(res, 422, { ok: false, code: "INVALID_ARGS", error: "legal Grok tool name is required" });
            return;
          }
          const result = await service.dispatchGrokLane!({
            name,
            args: args && typeof args === "object" && !Array.isArray(args)
              ? args as Record<string, unknown>
              : {},
          });
          sendJson(res, result.ok ? 200 : 422, { ok: result.ok, result });
        })
        .catch((error) => sendJson(res, error instanceof TrainingBodyTooLargeError ? 413 : 422, {
          ok: false,
          code: error instanceof TrainingBodyTooLargeError ? "GROK_LANE_TOO_LARGE" : "GROK_LANE_FAILED",
          error: error instanceof Error ? error.message : String(error),
        }));
      return;
    }

    if (req.method === "POST" && pathname === GROK_SUCCESSOR_CONTINUITY_PATH) {
      if (!service.writeSuccessorContinuity) {
        sendJson(res, 503, { ok: false, code: "SUCCESSOR_UNAVAILABLE", error: "Grok successor continuity unavailable" });
        return;
      }
      void readJsonBody(req, 1024 * 1024)
        .then(async (body) => {
          const parsed = grokContinuityPacketSchema.safeParse(
            (body as { continuity?: unknown } | null)?.continuity,
          );
          if (!parsed.success) {
            sendJson(res, 422, {
              ok: false,
              code: "INVALID_SUCCESSOR_CONTINUITY",
              error: parsed.error.message,
            });
            return;
          }
          const continuity = await service.writeSuccessorContinuity!(parsed.data);
          sendJson(res, 200, { ok: true, continuity });
        })
        .catch((error) => sendJson(res, error instanceof TrainingBodyTooLargeError ? 413 : 422, {
          ok: false,
          code: error instanceof TrainingBodyTooLargeError
            ? "SUCCESSOR_CONTINUITY_TOO_LARGE"
            : "SUCCESSOR_CONTINUITY_FAILED",
          error: error instanceof Error ? error.message : String(error),
        }));
      return;
    }

    if (req.method === "POST" && pathname === `${REFERENCE_TRAINING_API_PATH}/source`) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      req.once("aborted", abort);
      void readJsonBody(req)
        .then(async (body) => {
          const url = (body as { url?: unknown } | null)?.url;
          if (typeof url !== "string" || !url.trim()) {
            sendJson(res, 400, { ok: false, code: "INVALID_SOURCE", error: "direct video URL is required" });
            return;
          }
          const result = await service.resolveLinked(url, controller.signal);
          sendJson(res, 200, { ok: true, ...result });
        })
        .catch((error) => {
          const failure = sourceFailure(error);
          sendJson(res, failure.status, { ok: false, code: failure.code, error: failure.message });
        })
        .finally(() => req.off("aborted", abort));
      return;
    }

    if (req.method === "POST" && pathname === `${REFERENCE_TRAINING_API_PATH}/stage`) {
      if (!service.writeStage) {
        sendJson(res, 503, { ok: false, code: "PERSISTENCE_FAILED", error: "training artifact store unavailable" });
        return;
      }
      void readJsonBody(req, 64 * 1024 * 1024)
        .then(async (body) => {
          const request = body as { sessionId?: unknown; stage?: unknown; artifact?: unknown } | null;
          const allowedStages: readonly ReferenceTrainingStage[] = [
            "selection", "pose", "mechanics", "semantic", "score", "form", "physics_plan",
          ];
          if (typeof request?.sessionId !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(request.sessionId)) {
            throw new Error("invalid training session id");
          }
          if (typeof request.stage !== "string" || !allowedStages.includes(request.stage as ReferenceTrainingStage)) {
            throw new Error("invalid training stage");
          }
          if (!("artifact" in request)) throw new Error("training stage artifact required");
          const receipt = await service.writeStage!(
            request.sessionId,
            request.stage as ReferenceTrainingStage,
            request.artifact,
          );
          sendJson(res, 200, { ok: true, ...receipt });
        })
        .catch((error) => {
          sendJson(res, 422, {
            ok: false,
            code: "PERSISTENCE_FAILED",
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return;
    }

    if (req.method === "POST" && pathname === `${REFERENCE_TRAINING_API_PATH}/semantic`) {
      if (!service.interpretSemantic) {
        sendJson(res, 503, { ok: false, code: "SEMANTIC_PROVIDER_ABSENT", error: "semantic provider unavailable" });
        return;
      }
      const controller = new AbortController();
      const abort = () => controller.abort();
      req.once("aborted", abort);
      void readJsonBody(req, 768 * 1024)
        .then(async (body) => {
          const packet = (body as { packet?: unknown } | null)?.packet as Partial<SemanticPromptPacket> | undefined;
          if (
            packet?.schemaName !== "gasper.semantic-motion-proposal.v1" ||
            typeof packet.system !== "string" ||
            typeof packet.user !== "string"
          ) {
            throw new Error("invalid semantic prompt packet");
          }
          const result = await service.interpretSemantic!(packet as SemanticPromptPacket, controller.signal);
          sendJson(res, 200, { ok: true, ...result });
        })
        .catch((error) => {
          sendJson(res, controller.signal.aborted ? 499 : 502, {
            ok: false,
            code: controller.signal.aborted ? "ABORTED" : "SEMANTIC_FAILED",
            error: error instanceof Error ? error.message : String(error),
          });
        })
        .finally(() => req.off("aborted", abort));
      return;
    }

    if (req.method === "POST" && pathname === CANONOPS_API_PATH) {
      if (!service.runCanonOps) {
        sendJson(res, 503, { ok: false, code: "CANONOPS_UNAVAILABLE", error: "CanonOps runner unavailable" });
        return;
      }
      void readJsonBody(req, 32_768)
        .then(async (body) => {
          const parsed = canonOpsRunRequestSchema.safeParse((body as { request?: unknown } | null)?.request);
          if (!parsed.success) {
            sendJson(res, 400, { ok: false, code: "INVALID_CANONOPS_REQUEST", error: "invalid CanonOps run request" });
            return;
          }
          const packet = await service.runCanonOps!(parsed.data);
          sendJson(res, 200, { ok: true, packet });
        })
        .catch((error) => {
          sendJson(res, 502, {
            ok: false,
            code: "CANONOPS_FAILED",
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return;
    }

    if (req.method === "POST" && pathname === `${REFERENCE_TRAINING_API_PATH}/pilot`) {
      if (!service.pilotTurn) {
        sendJson(res, 503, { ok: false, code: "PILOT_PROVIDER_ABSENT", error: "Studio pilot provider unavailable" });
        return;
      }
      const controller = new AbortController();
      const abort = () => controller.abort();
      req.once("aborted", abort);
      void readJsonBody(req, 1024 * 1024)
        .then(async (body) => {
          const parsed = studioPilotTurnRequestSchema.safeParse((body as { request?: unknown } | null)?.request);
          if (!parsed.success) {
            sendJson(res, 400, { ok: false, code: "INVALID_PILOT_TURN", error: "invalid Studio pilot turn request" });
            return;
          }
          const result = await service.pilotTurn!(parsed.data, controller.signal);
          sendJson(res, 200, { ok: true, ...result });
        })
        .catch((error) => {
          sendJson(res, controller.signal.aborted ? 499 : 502, {
            ok: false,
            code: controller.signal.aborted ? "ABORTED" : "PILOT_FAILED",
            error: error instanceof Error ? error.message : String(error),
          });
        })
        .finally(() => req.off("aborted", abort));
      return;
    }

    const mediaPrefix = `${REFERENCE_TRAINING_API_PATH}/media/`;
    if ((req.method === "GET" || req.method === "HEAD") && pathname.startsWith(mediaPrefix)) {
      const hash = decodeURIComponent(pathname.slice(mediaPrefix.length));
      void service.findMediaPath(hash)
        .then(async (path) => {
          const info = await stat(path);
          const range = parseByteRange(
            typeof req.headers.range === "string" ? req.headers.range : undefined,
            info.size,
          );
          const start = range?.start ?? 0;
          const end = range?.end ?? info.size - 1;
          res.statusCode = range ? 206 : 200;
          res.setHeader("Content-Type", MEDIA_MIME[extname(path).toLowerCase()] ?? "application/octet-stream");
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Content-Length", String(end - start + 1));
          res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
          res.setHeader("X-Content-Type-Options", "nosniff");
          if (range) res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          const stream = createReadStream(path, { start, end });
          stream.on("error", (error) => {
            if (!res.headersSent) sendJson(res, 500, { ok: false, code: "SOURCE_API_UNAVAILABLE", error: error.message });
            else res.destroy(error);
          });
          stream.pipe(res);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          const status = /range/i.test(message) ? 416 : 404;
          sendJson(res, status, { ok: false, code: "SOURCE_REJECTED", error: message });
        });
      return;
    }

    if (req.method === "GET" && pathname === `${REFERENCE_TRAINING_API_PATH}/status`) {
      sendJson(res, 200, {
        ok: true,
        service: "reference-training",
        capabilities: {
          source: true,
          persistence: Boolean(service.writeStage),
          semantic: Boolean(service.interpretSemantic),
          pilot: Boolean(service.pilotTurn),
        },
      });
      return;
    }

    next();
  };
}
