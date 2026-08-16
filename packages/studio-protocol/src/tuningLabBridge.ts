/**
 * Local typed transport for the N120 Tuning Lab.
 *
 * The browser owns the live TuningLabSession. This protocol only carries
 * bounded commands and receipts between that page and an MCP client; it never
 * owns physics or a second tuning state.
 */

export const TUNING_LAB_BRIDGE_PATH = "/__gasper/tuning-lab" as const;

export const TUNING_LAB_BRIDGE_OPS = [
  "inspect_tuning_lab",
  "set_tuning_parameter",
  "pin_tuning_baseline",
  "compare_tuning_baseline",
  "reset_tuning_lab",
  "capture_tuning_proof",
  "read_tuning_telemetry",
  "apply_motion_intent",
] as const;

export type TuningLabBridgeOp = (typeof TUNING_LAB_BRIDGE_OPS)[number];

export type TuningLabBridgeRequest = {
  requestId: string;
  op: TuningLabBridgeOp;
  input: Record<string, unknown>;
  createdAt: string;
};

export type TuningLabBridgeResponse = {
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isBridgeOp(value: unknown): value is TuningLabBridgeOp {
  return typeof value === "string" && (TUNING_LAB_BRIDGE_OPS as readonly string[]).includes(value);
}

export function parseTuningLabBridgeRequest(value: unknown): TuningLabBridgeRequest | undefined {
  if (!isRecord(value) || typeof value.requestId !== "string" || !value.requestId.trim()) {
    return undefined;
  }
  if (!isBridgeOp(value.op)) return undefined;
  return {
    requestId: value.requestId,
    op: value.op,
    input: isRecord(value.input) ? value.input : {},
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

export function parseTuningLabBridgeResponse(value: unknown): TuningLabBridgeResponse | undefined {
  if (!isRecord(value) || typeof value.requestId !== "string" || typeof value.ok !== "boolean") {
    return undefined;
  }
  return {
    requestId: value.requestId,
    ok: value.ok,
    result: value.result,
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

/** Small bounded in-memory queue owned by the local Vite server. */
export class TuningLabBridgeQueue {
  private readonly pending: TuningLabBridgeRequest[] = [];
  private readonly results = new Map<string, TuningLabBridgeResponse>();

  enqueue(request: TuningLabBridgeRequest): boolean {
    if (this.pending.some((item) => item.requestId === request.requestId)) return false;
    this.pending.push(request);
    return true;
  }

  dequeue(): TuningLabBridgeRequest | undefined {
    return this.pending.shift();
  }

  resolve(response: TuningLabBridgeResponse): void {
    this.results.set(response.requestId, response);
  }

  takeResult(requestId: string): TuningLabBridgeResponse | undefined {
    const result = this.results.get(requestId);
    if (result) this.results.delete(requestId);
    return result;
  }

  pendingCount(): number {
    return this.pending.length;
  }
}
