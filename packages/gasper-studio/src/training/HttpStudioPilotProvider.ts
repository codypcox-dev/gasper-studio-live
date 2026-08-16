import { z } from "zod";

import {
  STUDIO_PILOT_MODEL,
  studioPilotActionBatchSchema,
  studioPilotTurnRequestSchema,
  type StudioPilotTurnRequest,
} from "./StudioPilotProtocol.js";
import { grokResponseIdentitySchema } from "./GrokSuccessorProtocol.js";
import type { StudioPilotTurnResult } from "./server/GrokStudioPilotProvider.js";

type FetchLike = typeof fetch;

const successSchema = z
  .object({
    ok: z.literal(true),
    responseId: z.string().trim().min(1),
    model: z.literal(STUDIO_PILOT_MODEL),
    identity: grokResponseIdentitySchema,
    batch: studioPilotActionBatchSchema,
  })
  .strict();

export class HttpStudioPilotProvider {
  readonly id = "grok-local-studio-pilot";
  readonly model = STUDIO_PILOT_MODEL;
  private readonly fetchImpl: FetchLike;
  private readonly endpoint: string;

  constructor(options: Readonly<{ fetchImpl?: FetchLike; endpoint?: string }> = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? "/__gasper/training/pilot";
  }

  async generateTurn(request: StudioPilotTurnRequest, signal: AbortSignal): Promise<StudioPilotTurnResult> {
    const validated = studioPilotTurnRequestSchema.parse(request);
    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: validated }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw new DOMException("Studio pilot request aborted", "AbortError");
      throw new Error(`Studio pilot provider unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`Studio pilot provider returned invalid JSON (${response.status})`);
    }
    if (!response.ok) {
      const message = (body as { error?: unknown } | null)?.error;
      throw new Error(typeof message === "string" ? message : `Studio pilot provider unavailable (${response.status})`);
    }
    try {
      const parsed = successSchema.parse(body);
      return {
        responseId: parsed.responseId,
        model: parsed.model,
        identity: parsed.identity,
        batch: parsed.batch,
      };
    } catch (error) {
      throw new Error(`Studio pilot provider returned an invalid response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
