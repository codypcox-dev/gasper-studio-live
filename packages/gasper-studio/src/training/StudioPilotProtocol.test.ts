import { describe, expect, it } from "vitest";

import {
  STUDIO_PILOT_OUTPUT_JSON_SCHEMA,
  buildStudioPilotPrompt,
  studioPilotActionBatchSchema,
  studioPilotTurnRequestSchema,
} from "./StudioPilotProtocol.js";

const validObservation = {
  schema: "gasper.studio-pilot.observation.v1",
  capturedAtMs: 1_786_000_000_000,
  studio: { embodiment: "presence", expression: "neutral-settled" },
  tuning: { revision: 3, state: { verticalDepthGain: 1 } },
  physics: { mode: "idle" },
  autonomy: { living: true, wander: false, life: true, boo: false },
  reference: { status: "empty", sourceReady: false, planReady: false },
};

const validBatch = {
  schema: "gasper.studio-pilot.action-batch.v1",
  disposition: "act",
  summary: "Shorten Wispwalker and start a bounded bounce.",
  message: "Applying two reviewable Studio actions.",
  continueOnError: false,
  actions: [
    {
      id: "a-height",
      kind: "tuning.set",
      parameter: "verticalDepthGain",
      value: 0.85,
      reason: "Reduce the vertical read by fifteen percent.",
    },
    {
      id: "a-bounce",
      kind: "physics.launch_bounce",
      reason: "Exercise the existing bounce authority.",
    },
  ],
};

describe("StudioPilotProtocol", () => {
  it("keeps the Grok structured-output schema below the Windows command-line safety budget", () => {
    expect(JSON.stringify(STUDIO_PILOT_OUTPUT_JSON_SCHEMA).length).toBeLessThan(24_000);
  });

  it("accepts a closed, bounded action batch", () => {
    const parsed = studioPilotActionBatchSchema.parse(validBatch);

    expect(parsed.disposition).toBe("act");
    expect(parsed.actions.map((action) => action.kind)).toEqual([
      "tuning.set",
      "physics.launch_bounce",
    ]);
  });

  it("rejects action kinds outside the public Studio catalog", () => {
    expect(() =>
      studioPilotActionBatchSchema.parse({
        ...validBatch,
        actions: [
          {
            id: "a-shell",
            kind: "system.shell",
            command: "whoami",
            reason: "This must never be admitted.",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects unknown action keys instead of forwarding them", () => {
    expect(() =>
      studioPilotActionBatchSchema.parse({
        ...validBatch,
        actions: [
          {
            id: "a-height",
            kind: "tuning.set",
            parameter: "verticalDepthGain",
            value: 0.85,
            reason: "Bounded height adjustment.",
            directTransform: "scaleY(.1)",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects values outside the same public bounds as the control rail", () => {
    const invalid = [
      { id: "a-height", kind: "tuning.set", parameter: "verticalDepthGain", value: 0.2, reason: "Too low." },
      { id: "a-gravity", kind: "physics.set_params", params: { gravityScale: 3 }, reason: "Too high." },
      { id: "a-gain", kind: "studio.set_expression_gain", gain: 2, reason: "Too high." },
      { id: "a-craft", kind: "craft.set_params", params: { tempo: 2 }, reason: "Too fast." },
    ];

    for (const action of invalid) {
      expect(() => studioPilotActionBatchSchema.parse({ ...validBatch, actions: [action] })).toThrow();
    }
  });

  it("requires actions only when the provider disposition is act", () => {
    expect(() =>
      studioPilotActionBatchSchema.parse({ ...validBatch, actions: [] }),
    ).toThrow();
    expect(() =>
      studioPilotActionBatchSchema.parse({
        ...validBatch,
        disposition: "complete",
      }),
    ).toThrow();

    expect(
      studioPilotActionBatchSchema.parse({
        ...validBatch,
        disposition: "complete",
        actions: [],
        summary: "The requested state is already present.",
      }).actions,
    ).toEqual([]);
  });

  it("bounds user goals and retained turn history", () => {
    const request = {
      schema: "gasper.studio-pilot.turn-request.v1",
      sessionId: "pilot-123",
      turn: 1,
      maxTurns: 4,
      model: "grok-4.6",
      userGoal: "Make Wispwalker shorter, playful, and bounce once.",
      capabilities: [
        {
          kind: "tuning.set",
          available: true,
          description: "Set one bounded Tuning Lab parameter.",
          bounds: { verticalDepthGain: { min: 0.8, max: 1.1, unit: "x" } },
        },
      ],
      observation: validObservation,
      history: [],
    };

    expect(studioPilotTurnRequestSchema.parse(request).model).toBe("grok-4.6");
    expect(() => studioPilotTurnRequestSchema.parse({ ...request, userGoal: "x".repeat(4_097) })).toThrow();
    expect(() =>
      studioPilotTurnRequestSchema.parse({
        ...request,
        history: Array.from({ length: 6 }, () => ({ batch: validBatch, receipts: [] })),
      }),
    ).toThrow();
  });

  it("builds a closed prompt that names Grok's bounded role and supplies observations", () => {
    const request = studioPilotTurnRequestSchema.parse({
      schema: "gasper.studio-pilot.turn-request.v1",
      sessionId: "pilot-123",
      turn: 1,
      maxTurns: 4,
      model: "grok-4.6",
      userGoal: "Make Wispwalker shorter and bounce once.",
      capabilities: [
        {
          kind: "tuning.set",
          available: true,
          description: "Set one bounded Tuning Lab parameter.",
          bounds: {},
        },
      ],
      observation: validObservation,
      history: [],
    });

    const packet = buildStudioPilotPrompt(request);

    expect(packet.schemaName).toBe("gasper.studio-pilot.action-batch.v1");
    expect(packet.system).toContain("Grok 4.6");
    expect(packet.system).toContain("Never emit shell");
    expect(JSON.parse(packet.user)).toMatchObject({
      userGoal: "Make Wispwalker shorter and bounce once.",
      turn: 1,
      observation: { schema: "gasper.studio-pilot.observation.v1" },
    });
  });
});
