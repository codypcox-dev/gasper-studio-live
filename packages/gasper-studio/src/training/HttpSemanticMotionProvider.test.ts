import { describe, expect, it, vi } from "vitest";

import {
  HttpSemanticMotionProvider,
  type SemanticProviderHttpResponse,
} from "./HttpSemanticMotionProvider.js";
import type { SemanticPromptPacket } from "./SemanticMotionInterpreter.js";

const packet: SemanticPromptPacket = {
  schemaName: "gasper.semantic-motion-proposal.v1",
  system: "Return closed JSON.",
  user: "Analyze measured mechanics.",
};

describe("HTTP semantic motion provider", () => {
  it("forwards only the prompt packet and returns the server-validated structured output", async () => {
    const body: SemanticProviderHttpResponse = {
      ok: true,
      responseId: "grok-response-1",
      output: { schema: "gasper.semantic-motion-proposal.v1" },
    };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const provider = new HttpSemanticMotionProvider({ fetchImpl: fetchImpl as typeof fetch });

    expect(provider.model).toBe("grok-4.6");

    await expect(provider.generateStructured(packet, new AbortController().signal)).resolves.toEqual({
      responseId: "grok-response-1",
      output: body.output,
    });
    expect(fetchImpl).toHaveBeenCalledWith("/__gasper/training/semantic", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ packet }),
    }));
  });

  it("fails closed on unavailable or malformed provider responses", async () => {
    const unavailable = new HttpSemanticMotionProvider({
      fetchImpl: (async () => new Response(JSON.stringify({ ok: false, error: "offline" }), { status: 503 })) as typeof fetch,
    });
    await expect(unavailable.generateStructured(packet, new AbortController().signal)).rejects.toThrow(/offline|unavailable/i);

    const malformed = new HttpSemanticMotionProvider({
      fetchImpl: (async () => new Response(JSON.stringify({ ok: true, output: {} }), { status: 200 })) as typeof fetch,
    });
    await expect(malformed.generateStructured(packet, new AbortController().signal)).rejects.toThrow(/invalid/i);
  });
});
