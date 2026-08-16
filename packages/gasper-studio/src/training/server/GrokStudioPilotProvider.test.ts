import { describe, expect, it, vi } from "vitest";

import {
  STUDIO_PILOT_OUTPUT_JSON_SCHEMA,
  buildStudioPilotPrompt,
  type StudioPilotTurnRequest,
} from "../StudioPilotProtocol.js";
import { GrokStudioPilotProvider } from "./GrokStudioPilotProvider.js";

const request: StudioPilotTurnRequest = {
  schema: "gasper.studio-pilot.turn-request.v1",
  sessionId: "pilot-test",
  turn: 1,
  maxTurns: 4,
  model: "grok-4.6",
  userGoal: "Make Wispwalker feel heavier without changing the rig.",
  capabilities: [{
    kind: "tuning.set",
    available: true,
    description: "Set one bounded tuning parameter.",
    bounds: { gaitBobGain: { min: 0, max: 1.5 } },
  }],
  observation: {
    schema: "gasper.studio-pilot.observation.v1",
    capturedAtMs: 1,
    studio: {},
    tuning: {},
    physics: {},
    autonomy: {},
    reference: {},
  },
  history: [],
};

describe("Grok Studio pilot provider", () => {
  it("runs a tool-free Grok 4.6 turn against the closed action schema", async () => {
    const batch = {
      schema: "gasper.studio-pilot.action-batch.v1",
      disposition: "act",
      summary: "Lower the gait bob.",
      message: "Applying one bounded tuning change.",
      continueOnError: false,
      actions: [{
        id: "lower-bob",
        kind: "tuning.set",
        reason: "More weight with less vertical travel.",
        parameter: "gaitBobGain",
        value: 0.65,
      }],
    } as const;
    const runner = vi.fn(async () => ({
      stdout: JSON.stringify({
        requestId: "pilot-response-1",
        sessionId: "pilot-session-1",
        modelUsage: { "grok-4.6-build": { modelCalls: 1 } },
        structuredOutput: batch,
      }),
      stderr: "",
    }));
    const provider = new GrokStudioPilotProvider({ runner });

    const result = await provider.generateTurn(buildStudioPilotPrompt(request), new AbortController().signal);

    expect(result).toEqual({
      responseId: "pilot-response-1",
      model: "grok-4.6",
      identity: {
        verification: "response",
        canonicalModel: "grok-4.6",
        backendModel: "grok-4.6-build",
        requestId: "pilot-response-1",
        sessionId: "pilot-session-1",
        modelCalls: 1,
      },
      batch,
    });
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({
      schema: STUDIO_PILOT_OUTPUT_JSON_SCHEMA,
      disableTools: true,
    }));
  });

  it("rejects the wrong schema, invalid actions, provider failures, and aborted work", async () => {
    const provider = new GrokStudioPilotProvider({
      runner: async () => ({
        stdout: JSON.stringify({
          requestId: "bad",
          structuredOutput: {
            schema: "gasper.studio-pilot.action-batch.v1",
            disposition: "act",
            summary: "Escape",
            message: "No.",
            continueOnError: false,
            actions: [{ id: "x", kind: "system.shell", reason: "escape", command: "dir" }],
          },
        }),
        stderr: "",
      }),
    });
    await expect(provider.generateTurn({
      schemaName: "wrong",
      system: "system",
      user: "user",
    }, new AbortController().signal)).rejects.toThrow(/schema/i);
    await expect(provider.generateTurn(buildStudioPilotPrompt(request), new AbortController().signal)).rejects.toThrow(/schema|invalid|union/i);

    await expect(new GrokStudioPilotProvider({
      runner: async () => ({ stdout: "", stderr: "FINAL PILOT CAUSE", exitCode: 1 }),
    }).generateTurn(buildStudioPilotPrompt(request), new AbortController().signal)).rejects.toThrow(/FINAL PILOT CAUSE/);

    const controller = new AbortController();
    controller.abort();
    await expect(provider.generateTurn(buildStudioPilotPrompt(request), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
