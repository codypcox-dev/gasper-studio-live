import { describe, expect, it } from "vitest";

import type { PoseDetection } from "../../../../shared/src/gasper-performance/reference/types.js";
import {
  WorkerPoseBackend,
  type PoseAnalysisWorkerLike,
} from "./WorkerPoseBackend.js";

class FakeWorker implements PoseAnalysisWorkerLike {
  readonly posted: Array<Readonly<{ message: unknown; transfer: readonly Transferable[] }>> = [];
  terminated = 0;
  private readonly messageListeners = new Set<(event: MessageEvent) => void>();
  private readonly errorListeners = new Set<(event: ErrorEvent) => void>();

  postMessage(message: unknown, transfer: Transferable[] = []): void {
    this.posted.push({ message, transfer });
    const request = message as { kind: string; requestId: number };
    queueMicrotask(() => {
      const response = request.kind === "initialize"
        ? { kind: "ready", requestId: request.requestId }
        : request.kind === "observe"
          ? { kind: "observation", requestId: request.requestId, detections: [] satisfies PoseDetection[] }
          : { kind: "closed", requestId: request.requestId };
      for (const listener of this.messageListeners) {
        listener({ data: response } as MessageEvent);
      }
    });
  }

  terminate(): void {
    this.terminated += 1;
  }

  addEventListener(type: "message" | "error", listener: EventListener): void {
    if (type === "message") this.messageListeners.add(listener as (event: MessageEvent) => void);
    else this.errorListeners.add(listener as (event: ErrorEvent) => void);
  }

  removeEventListener(type: "message" | "error", listener: EventListener): void {
    if (type === "message") this.messageListeners.delete(listener as (event: MessageEvent) => void);
    else this.errorListeners.delete(listener as (event: ErrorEvent) => void);
  }
}

describe("WorkerPoseBackend", () => {
  it("constructs a worker, transfers frames, and returns only cloned observations", async () => {
    const worker = new FakeWorker();
    let constructions = 0;
    const backend = new WorkerPoseBackend({
      createWorker: () => {
        constructions += 1;
        return worker;
      },
    });
    const signal = new AbortController().signal;
    const frame = { close: () => undefined } as unknown as ImageBitmap;

    await backend.initialize(signal);
    await expect(backend.observe(frame, 10, signal)).resolves.toEqual([]);
    await backend.close();

    expect(constructions).toBe(1);
    expect(worker.posted.map((entry) => (entry.message as { kind: string }).kind)).toEqual([
      "initialize",
      "observe",
      "close",
    ]);
    expect(worker.posted[1]?.transfer).toEqual([frame]);
    expect(worker.terminated).toBe(1);
  });

  it("terminates the worker when analysis is cancelled", async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const backend = new WorkerPoseBackend({ createWorker: () => worker });
    await backend.initialize(controller.signal);
    controller.abort();

    await expect(
      backend.observe({} as ImageBitmap, 20, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(worker.terminated).toBe(1);
  });
});
