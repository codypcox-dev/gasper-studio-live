import { describe, expect, it, vi } from "vitest";

import type { StudioPilotTurnRequest } from "./StudioPilotProtocol.js";
import { HttpStudioPilotProvider } from "./HttpStudioPilotProvider.js";

const request: StudioPilotTurnRequest = {
  schema: "gasper.studio-pilot.turn-request.v1",
  sessionId: "http-pilot",
  turn: 1,
  maxTurns: 4,
  model: "grok-4.6",
  userGoal: "Select Wispwalker.",
  capabilities: [{ kind: "studio.set_embodiment", available: true, description: "Select form.", bounds: {} }],
  observation: {
    schema: "gasper.studio-pilot.observation.v1",
    capturedAtMs: 1,
    studio: {}, tuning: {}, physics: {}, autonomy: {}, reference: {},
  },
  history: [],
};

describe("HTTP Studio pilot provider", () => {
  it("posts typed turn state and accepts only a stamped Grok 4.6 response", async () => {
    const batch = {
      schema: "gasper.studio-pilot.action-batch.v1",
      disposition: "complete",
      summary: "Already selected.",
      message: "Wispwalker is active.",
      continueOnError: false,
      actions: [],
    } as const;
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      responseId: "response-1",
      model: "grok-4.6",
      identity: {
        verification: "response",
        canonicalModel: "grok-4.6",
        backendModel: "grok-4.6-build",
        requestId: "response-1",
        sessionId: "session-1",
        modelCalls: 1,
      },
      batch,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const provider = new HttpStudioPilotProvider({ fetchImpl: fetchImpl as typeof fetch });

    await expect(provider.generateTurn(request, new AbortController().signal)).resolves.toEqual({
      responseId: "response-1",
      model: "grok-4.6",
      identity: {
        verification: "response",
        canonicalModel: "grok-4.6",
        backendModel: "grok-4.6-build",
        requestId: "response-1",
        sessionId: "session-1",
        modelCalls: 1,
      },
      batch,
    });
    expect(fetchImpl).toHaveBeenCalledWith("/__gasper/training/pilot", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ request }),
    }));
  });

  it("fails closed on malformed responses and provider errors", async () => {
    const malformed = new HttpStudioPilotProvider({
      fetchImpl: (async () => new Response(JSON.stringify({ ok: true, model: "other", batch: {} }), { status: 200 })) as typeof fetch,
    });
    await expect(malformed.generateTurn(request, new AbortController().signal)).rejects.toThrow(/invalid/i);

    const failed = new HttpStudioPilotProvider({
      fetchImpl: (async () => new Response(JSON.stringify({ ok: false, error: "Grok unavailable" }), { status: 502 })) as typeof fetch,
    });
    await expect(failed.generateTurn(request, new AbortController().signal)).rejects.toThrow(/Grok unavailable/);
  });
});
