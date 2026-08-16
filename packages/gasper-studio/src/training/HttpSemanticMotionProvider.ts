import { z } from "zod";

import type {
  SemanticMotionProvider,
  SemanticPromptPacket,
} from "./SemanticMotionInterpreter.js";

type FetchLike = typeof fetch;

export type SemanticProviderHttpResponse = Readonly<{
  ok: true;
  responseId: string;
  output: unknown;
}>;

const successSchema = z
  .object({
    ok: z.literal(true),
    responseId: z.string().trim().min(1),
    output: z.unknown(),
  })
  .strict();

export class HttpSemanticMotionProvider implements SemanticMotionProvider {
  readonly id = "grok-local-structured";
  readonly model = "grok-4.6";
  private readonly fetchImpl: FetchLike;
  private readonly endpoint: string;

  constructor(options: Readonly<{ fetchImpl?: FetchLike; endpoint?: string }> = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? "/__gasper/training/semantic";
  }

  async generateStructured(
    packet: SemanticPromptPacket,
    signal: AbortSignal,
  ): Promise<Readonly<{ responseId: string; output: unknown }>> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packet }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw new DOMException("semantic provider request aborted", "AbortError");
      throw new Error(`semantic provider unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`semantic provider returned invalid JSON (${response.status})`);
    }
    if (!response.ok) {
      const message = (body as { error?: unknown } | null)?.error;
      throw new Error(typeof message === "string" ? message : `semantic provider unavailable (${response.status})`);
    }
    try {
      const parsed = successSchema.parse(body);
      return { responseId: parsed.responseId, output: parsed.output };
    } catch (error) {
      throw new Error(`semantic provider returned an invalid response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
