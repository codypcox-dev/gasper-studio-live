import {
  TUNING_LAB_BRIDGE_PATH,
  parseTuningLabBridgeResponse,
  type TuningLabBridgeOp,
  type TuningLabBridgeResponse,
} from "../../studio-protocol/src/tuningLabBridge.js";

type FetchLike = typeof fetch;

export class TuningLabHttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly pollMs: number;
  private sequence = 0;

  constructor(options: {
    baseUrl?: string;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
    pollMs?: number;
  } = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.GASPER_TUNING_LAB_URL ?? "http://127.0.0.1:5179").replace(
      /\/$/,
      "",
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.pollMs = options.pollMs ?? 120;
  }

  async dispatch(
    op: TuningLabBridgeOp,
    input: Record<string, unknown> = {},
  ): Promise<TuningLabBridgeResponse> {
    const requestId = `mcp-${Date.now()}-${++this.sequence}`;
    const base = `${this.baseUrl}${TUNING_LAB_BRIDGE_PATH}`;
    try {
      const accepted = await this.fetchImpl(`${base}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, op, input, createdAt: new Date().toISOString() }),
      });
      if (!accepted.ok) throw new Error(`bridge status ${accepted.status}`);
      const deadline = Date.now() + this.timeoutMs;
      while (Date.now() < deadline) {
        const result = await this.fetchImpl(`${base}/result/${encodeURIComponent(requestId)}`, {
          cache: "no-store",
        });
        if (result.status === 202) {
          await new Promise((resolve) => setTimeout(resolve, this.pollMs));
          continue;
        }
        if (!result.ok) throw new Error(`result status ${result.status}`);
        const parsed = parseTuningLabBridgeResponse(await result.json());
        if (!parsed) throw new Error("invalid_tuning_lab_result");
        return parsed;
      }
      throw new Error("bridge timeout");
    } catch (error) {
      throw new Error(
        `TUNING_LAB_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
