import {
  CANONOPS_API_PATH,
  canonOpsPhdPacketSchema,
  type CanonOpsPhdPacket,
  type CanonOpsRunRequest,
} from "./CanonOpsProtocol.js";

export class HttpCanonOpsApi {
  constructor(private readonly basePath = CANONOPS_API_PATH) {}

  async run(request: CanonOpsRunRequest, signal?: AbortSignal): Promise<CanonOpsPhdPacket> {
    const response = await fetch(this.basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
      signal,
    });
    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; packet?: unknown; error?: string }
      | null;
    if (!response.ok || !body?.ok) {
      throw new Error(body?.error ?? `CanonOps run failed (${response.status})`);
    }
    return canonOpsPhdPacketSchema.parse(body.packet);
  }
}
