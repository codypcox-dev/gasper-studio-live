import { MediaPipePoseBackend } from "./MediaPipePoseBackend.js";
import type { PoseWorkerRequest, PoseWorkerResponse } from "./PoseWorkerProtocol.js";

const backend = new MediaPipePoseBackend<ImageBitmap>();
const lifetime = new AbortController();

const scope = self as unknown as Readonly<{
  postMessage(message: PoseWorkerResponse): void;
}> & {
  onmessage: ((event: MessageEvent<PoseWorkerRequest>) => void) | null;
};

function post(message: PoseWorkerResponse): void {
  scope.postMessage(message);
}

scope.onmessage = (event) => {
  const request = event.data;
  void (async () => {
    try {
      if (request.kind === "initialize") {
        await backend.initialize(lifetime.signal);
        post({ kind: "ready", requestId: request.requestId });
        return;
      }
      if (request.kind === "observe") {
        try {
          const detections = await backend.observe(request.frame, request.tMs, lifetime.signal);
          post({ kind: "observation", requestId: request.requestId, detections });
        } finally {
          request.frame.close();
        }
        return;
      }
      await backend.close();
      post({ kind: "closed", requestId: request.requestId });
    } catch (error) {
      post({
        kind: "error",
        requestId: request.requestId,
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
};
