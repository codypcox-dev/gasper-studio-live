import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TUNING_LAB_BRIDGE_PATH,
  TuningLabBridgeQueue,
  parseTuningLabBridgeRequest,
  parseTuningLabBridgeResponse,
} from "./packages/studio-protocol/src/tuningLabBridge";
import { TrainingSourceService } from "./packages/gasper-studio/src/training/server/TrainingSourceService";
import { createTrainingSourceMiddleware } from "./packages/gasper-studio/src/training/server/trainingSourceMiddleware";
import { GrokSemanticMotionProvider } from "./packages/gasper-studio/src/training/server/GrokSemanticMotionProvider";
import { GrokStudioPilotProvider } from "./packages/gasper-studio/src/training/server/GrokStudioPilotProvider";
import { GrokSuccessorService } from "./packages/gasper-studio/src/training/server/GrokSuccessorService";
import { dispatchGrokGasperLane } from "./packages/gasper-studio/src/training/server/GrokGasperLane";
import { buildStudioPilotPrompt } from "./packages/gasper-studio/src/training/StudioPilotProtocol";
import { GrokCanonOpsService } from "./packages/gasper-studio/src/canonops/GrokCanonOpsService";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

/**
 * GASPER-FINISH-01 / Task 2 (VEC-101): serve the authored showcase pack from
 * the canonical studio root. Single source of truth stays at
 * packages/gasper-studio/public/demo/gasper-hero-pack-v1; this plugin serves
 * it in dev + preview and copies it into dist on build, so the app never has
 * to fall back to seeded thinking-knit because the pack was unreachable.
 * The existing root public/ tree (vendor/gsap) is untouched.
 */
const SHOWCASE_ROUTE = "/demo/gasper-hero-pack-v1";
const SHOWCASE_SOURCE = resolve(
  ROOT,
  "packages/gasper-studio/public/demo/gasper-hero-pack-v1",
);
const SHOWCASE_DIST = resolve(ROOT, "dist/demo/gasper-hero-pack-v1");

const SHOWCASE_MIME: Record<string, string> = {
  ".gasper": "application/json",
  ".json": "application/json",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".md": "text/markdown",
  ".txt": "text/plain",
};

const showcaseMiddleware: Connect.NextHandleFunction = (req, res, next) => {
  if (!req.url || (req.method !== "GET" && req.method !== "HEAD")) {
    next();
    return;
  }
  const pathname = new URL(req.url, "http://gasper.local").pathname;
  if (pathname !== SHOWCASE_ROUTE && !pathname.startsWith(`${SHOWCASE_ROUTE}/`)) {
    next();
    return;
  }
  const rel = decodeURIComponent(pathname.slice(SHOWCASE_ROUTE.length)).replace(
    /^\/+/,
    "",
  );
  const filePath = normalize(join(SHOWCASE_SOURCE, rel));
  // Fail closed on traversal outside the pack root.
  if (filePath !== SHOWCASE_SOURCE && !filePath.startsWith(SHOWCASE_SOURCE + sep)) {
    res.statusCode = 403;
    res.end("forbidden");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end("showcase asset not found");
    return;
  }
  res.setHeader(
    "Content-Type",
    SHOWCASE_MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
  );
  res.setHeader("Cache-Control", "no-cache");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
};

function gasperShowcaseServing(): Plugin {
  return {
    name: "gasper-showcase-serving",
    configureServer(server) {
      server.middlewares.use(showcaseMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(showcaseMiddleware);
    },
    closeBundle() {
      // Production build: place the authored pack inside dist so preview and
      // any static host serve the identical bytes without a second source.
      if (existsSync(SHOWCASE_SOURCE)) {
        cpSync(SHOWCASE_SOURCE, SHOWCASE_DIST, { recursive: true });
      }
    },
  };
}

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer | string) => {
      raw += chunk.toString();
      if (raw.length > 256_000) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : null);
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Local-only MCP ↔ browser adapter. The page remains the sole live authority;
 * this middleware only queues typed requests and returns their receipts.
 */
function gasperTuningLabBridge(): Plugin {
  const queue = new TuningLabBridgeQueue();
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const pathname = req.url ? new URL(req.url, "http://gasper.local").pathname : "";
    if (!pathname.startsWith(TUNING_LAB_BRIDGE_PATH)) {
      next();
      return;
    }
    const sendJson = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && pathname === `${TUNING_LAB_BRIDGE_PATH}/poll`) {
      const request = queue.dequeue();
      if (!request) {
        res.statusCode = 204;
        res.end();
        return;
      }
      sendJson(200, request);
      return;
    }
    if (req.method === "POST" && pathname === `${TUNING_LAB_BRIDGE_PATH}/command`) {
      void readJsonBody(req)
        .then((body) => {
          const request = parseTuningLabBridgeRequest(body);
          if (!request) {
            sendJson(400, { ok: false, error: "invalid_tuning_lab_request" });
            return;
          }
          if (!queue.enqueue(request)) {
            sendJson(409, { ok: false, error: "duplicate_request_id" });
            return;
          }
          sendJson(202, { ok: true, requestId: request.requestId });
        })
        .catch((error) => sendJson(400, { ok: false, error: String(error) }));
      return;
    }
    if (req.method === "POST" && pathname === `${TUNING_LAB_BRIDGE_PATH}/result`) {
      void readJsonBody(req)
        .then((body) => {
          const result = parseTuningLabBridgeResponse(body);
          if (!result) {
            sendJson(400, { ok: false, error: "invalid_tuning_lab_result" });
            return;
          }
          queue.resolve(result);
          sendJson(202, { ok: true, requestId: result.requestId });
        })
        .catch((error) => sendJson(400, { ok: false, error: String(error) }));
      return;
    }
    if (req.method === "GET" && pathname.startsWith(`${TUNING_LAB_BRIDGE_PATH}/result/`)) {
      const requestId = decodeURIComponent(pathname.slice(`${TUNING_LAB_BRIDGE_PATH}/result/`.length));
      const result = queue.takeResult(requestId);
      if (!result) {
        sendJson(202, { ok: false, pending: true, requestId });
        return;
      }
      sendJson(200, result);
      return;
    }
    if (req.method === "GET" && pathname === `${TUNING_LAB_BRIDGE_PATH}/status`) {
      sendJson(200, { ok: true, pending: queue.pendingCount() });
      return;
    }
    next();
  };
  return {
    name: "gasper-tuning-lab-bridge",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

/**
 * Measured reference-video intake for the browser-owned Training Lab session.
 * The service writes only to the ignored .gasper/training store and exposes
 * content-addressed media through a same-origin, loopback-only route.
 */
function gasperReferenceTrainingSource(): Plugin {
  const service = new TrainingSourceService(resolve(ROOT, ".gasper/training"));
  const semanticProvider = new GrokSemanticMotionProvider({ cwd: ROOT });
  const studioPilotProvider = new GrokStudioPilotProvider({ cwd: ROOT });
  const successorService = new GrokSuccessorService({ root: ROOT });
  const canonOpsService = new GrokCanonOpsService({ root: ROOT });
  const middleware = createTrainingSourceMiddleware({
    resolveLinked: (url, signal) => service.resolveLinked(url, signal),
    findMediaPath: (hash) => service.findMediaPath(hash),
    writeStage: (sessionId, stage, artifact) => service.writeStage(sessionId, stage, artifact),
    interpretSemantic: (packet, signal) => semanticProvider.generateStructured(
      packet,
      signal ?? new AbortController().signal,
    ),
    pilotTurn: async (request, signal) => {
      const result = await studioPilotProvider.generateTurn(
        buildStudioPilotPrompt(request),
        signal ?? new AbortController().signal,
      );
      successorService.recordResponseIdentity(result.identity);
      return result;
    },
    successorStatus: () => successorService.status(),
    readSuccessorContinuity: () => successorService.readContinuity(),
    writeSuccessorContinuity: (packet) => successorService.writeContinuity(packet),
    dispatchGrokLane: (request) => dispatchGrokGasperLane(request, {
      readContinuity: async () => successorService.readContinuity(),
    }),
    runCanonOps: (request) => canonOpsService.run(request),
  });
  return {
    name: "gasper-reference-training-source",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  preview: { host: "0.0.0.0", port: 8080, strictPort: true },
  plugins: [
    react(),
    gasperShowcaseServing(),
    gasperTuningLabBridge(),
    gasperReferenceTrainingSource(),
  ],
});
