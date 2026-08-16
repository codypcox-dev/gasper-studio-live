import { z } from "zod";

import {
  GROK_SUCCESSOR_CONTINUITY_PATH,
  GROK_SUCCESSOR_STATUS_PATH,
  grokContinuityPacketSchema,
  grokSuccessorStatusSchema,
  type GrokContinuityPacket,
  type GrokSuccessorStatus,
} from "./GrokSuccessorProtocol.js";

type FetchLike = typeof fetch;

const statusResponseSchema = z.object({
  ok: z.literal(true),
  status: grokSuccessorStatusSchema,
}).strict();

const continuityResponseSchema = z.object({
  ok: z.literal(true),
  continuity: grokContinuityPacketSchema.nullable(),
}).strict();

export interface GrokSuccessorApi {
  getStatus(signal?: AbortSignal): Promise<GrokSuccessorStatus>;
  getContinuity(signal?: AbortSignal): Promise<GrokContinuityPacket | null>;
  writeContinuity(packet: GrokContinuityPacket, signal?: AbortSignal): Promise<GrokContinuityPacket>;
}

async function jsonBody(response: Response, label: string): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON (${response.status})`);
  }
  if (!response.ok) {
    const message = (body as { error?: unknown } | null)?.error;
    throw new Error(typeof message === "string" ? message : `${label} failed (${response.status})`);
  }
  return body;
}

export class HttpGrokSuccessorApi implements GrokSuccessorApi {
  private readonly fetchImpl: FetchLike;

  constructor(options: Readonly<{ fetchImpl?: FetchLike }> = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getStatus(signal?: AbortSignal): Promise<GrokSuccessorStatus> {
    const response = await this.fetchImpl(GROK_SUCCESSOR_STATUS_PATH, { signal });
    const parsed = statusResponseSchema.safeParse(await jsonBody(response, "Grok successor status"));
    if (!parsed.success) throw new Error(`Grok successor status is invalid: ${parsed.error.message}`);
    return parsed.data.status;
  }

  async getContinuity(signal?: AbortSignal): Promise<GrokContinuityPacket | null> {
    const response = await this.fetchImpl(GROK_SUCCESSOR_CONTINUITY_PATH, { signal });
    const parsed = continuityResponseSchema.safeParse(await jsonBody(response, "Grok successor continuity"));
    if (!parsed.success) throw new Error(`Grok successor continuity is invalid: ${parsed.error.message}`);
    return parsed.data.continuity;
  }

  async writeContinuity(
    packet: GrokContinuityPacket,
    signal?: AbortSignal,
  ): Promise<GrokContinuityPacket> {
    const continuity = grokContinuityPacketSchema.parse(packet);
    const response = await this.fetchImpl(GROK_SUCCESSOR_CONTINUITY_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ continuity }),
      signal,
    });
    const parsed = continuityResponseSchema.safeParse(await jsonBody(response, "Grok successor continuity write"));
    if (!parsed.success || !parsed.data.continuity) {
      throw new Error(`Grok successor continuity write is invalid${parsed.success ? "" : `: ${parsed.error.message}`}`);
    }
    return parsed.data.continuity;
  }
}
