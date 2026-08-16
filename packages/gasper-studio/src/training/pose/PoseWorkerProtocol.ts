import type { PoseDetection } from "../../../../shared/src/gasper-performance/reference/types.js";

export type PoseWorkerRequest =
  | Readonly<{ kind: "initialize"; requestId: number }>
  | Readonly<{ kind: "observe"; requestId: number; frame: ImageBitmap; tMs: number }>
  | Readonly<{ kind: "close"; requestId: number }>;

export type PoseWorkerResponse =
  | Readonly<{ kind: "ready"; requestId: number }>
  | Readonly<{ kind: "observation"; requestId: number; detections: readonly PoseDetection[] }>
  | Readonly<{ kind: "closed"; requestId: number }>
  | Readonly<{ kind: "error"; requestId: number; name: string; message: string }>;
