import type { PoseDetection } from "../../../../shared/src/gasper-performance/reference/types.js";
import type { PoseBackend } from "./PoseBackend.js";
import type { PoseWorkerRequest, PoseWorkerResponse } from "./PoseWorkerProtocol.js";

export interface PoseAnalysisWorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(type: "message" | "error", listener: EventListener): void;
  removeEventListener(type: "message" | "error", listener: EventListener): void;
}

export type WorkerPoseBackendOptions = Readonly<{
  createWorker?: () => PoseAnalysisWorkerLike;
}>;

type PendingRequest = Readonly<{
  resolve: (response: PoseWorkerResponse) => void;
  reject: (error: Error) => void;
  cleanup: () => void;
}>;

type PoseWorkerRequestInput =
  | Readonly<{ kind: "initialize" }>
  | Readonly<{ kind: "observe"; frame: ImageBitmap; tMs: number }>
  | Readonly<{ kind: "close" }>;

function aborted(): DOMException {
  return new DOMException("pose worker analysis aborted", "AbortError");
}

function defaultWorker(): PoseAnalysisWorkerLike {
  return new Worker(new URL("./pose.worker.ts", import.meta.url), {
    type: "module",
    name: "gasper-pose-analysis",
  }) as unknown as PoseAnalysisWorkerLike;
}

export function browserPoseWorkerSupported(): boolean {
  return typeof Worker === "function" && typeof createImageBitmap === "function";
}

/** Main-thread proxy. The only data returned from the Worker is structured pose evidence. */
export class WorkerPoseBackend implements PoseBackend<ImageBitmap> {
  readonly id = "mediapipe-pose-worker";
  readonly version = "1.0.0";
  readonly landmarkModel = Object.freeze({
    id: "mediapipe-pose-landmarker",
    version: "full-float16-v1",
    landmarkCount: 33,
    semanticIndices: Object.freeze({ leftFoot: 31, rightFoot: 32, leftHip: 23, rightHip: 24 }),
  });

  private readonly createWorker: () => PoseAnalysisWorkerLike;
  private worker: PoseAnalysisWorkerLike | null = null;
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private initialized = false;

  private readonly onMessage = ((event: MessageEvent<PoseWorkerResponse>) => {
    const response = event.data;
    if (!response || typeof response.requestId !== "number") return;
    const pending = this.pending.get(response.requestId);
    if (!pending) return;
    this.pending.delete(response.requestId);
    pending.cleanup();
    if (response.kind === "error") {
      const error = response.name === "AbortError"
        ? aborted()
        : Object.assign(new Error(response.message), { name: response.name || "Error" });
      pending.reject(error);
      return;
    }
    pending.resolve(response);
  }) as EventListener;

  private readonly onError = ((event: ErrorEvent) => {
    this.failAll(new Error(event.message || "pose analysis worker failed"));
    this.terminate();
  }) as EventListener;

  constructor(options: WorkerPoseBackendOptions = {}) {
    this.createWorker = options.createWorker ?? defaultWorker;
  }

  async initialize(signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw aborted();
    if (this.initialized) return;
    if (!this.worker) {
      this.worker = this.createWorker();
      this.worker.addEventListener("message", this.onMessage);
      this.worker.addEventListener("error", this.onError);
    }
    const response = await this.request({ kind: "initialize" }, [], signal);
    if (response.kind !== "ready") throw new Error("pose worker returned an invalid initialize response");
    this.initialized = true;
  }

  async observe(frame: ImageBitmap, tMs: number, signal: AbortSignal): Promise<readonly PoseDetection[]> {
    if (signal.aborted) {
      this.terminateWith(aborted());
      throw aborted();
    }
    if (!this.initialized) throw new Error("pose worker backend is not initialized");
    const response = await this.request({ kind: "observe", frame, tMs }, [frame], signal);
    if (response.kind !== "observation") throw new Error("pose worker returned an invalid observation response");
    return response.detections;
  }

  async close(): Promise<void> {
    if (!this.worker) return;
    try {
      if (this.initialized) {
        const response = await this.request(
          { kind: "close" },
          [],
          new AbortController().signal,
        );
        if (response.kind !== "closed") throw new Error("pose worker returned an invalid close response");
      }
    } finally {
      this.terminate();
    }
  }

  private request(
    request: PoseWorkerRequestInput,
    transfer: Transferable[],
    signal: AbortSignal,
  ): Promise<PoseWorkerResponse> {
    if (signal.aborted) {
      this.terminateWith(aborted());
      return Promise.reject(aborted());
    }
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error("pose worker is unavailable"));
    const requestId = this.nextRequestId++;
    const message = { ...request, requestId } as PoseWorkerRequest;
    return new Promise<PoseWorkerResponse>((resolve, reject) => {
      const abort = () => {
        const entry = this.pending.get(requestId);
        if (!entry) return;
        this.pending.delete(requestId);
        entry.cleanup();
        const error = aborted();
        reject(error);
        this.terminateWith(error);
      };
      const cleanup = () => signal.removeEventListener("abort", abort);
      this.pending.set(requestId, { resolve, reject, cleanup });
      signal.addEventListener("abort", abort, { once: true });
      try {
        worker.postMessage(message, transfer);
      } catch (error) {
        this.pending.delete(requestId);
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private failAll(error: Error): void {
    for (const [requestId, pending] of this.pending) {
      this.pending.delete(requestId);
      pending.cleanup();
      pending.reject(error);
    }
  }

  private terminateWith(error: Error): void {
    this.failAll(error);
    this.terminate();
  }

  private terminate(): void {
    const worker = this.worker;
    this.worker = null;
    this.initialized = false;
    if (!worker) return;
    worker.removeEventListener("message", this.onMessage);
    worker.removeEventListener("error", this.onError);
    worker.terminate();
  }
}
