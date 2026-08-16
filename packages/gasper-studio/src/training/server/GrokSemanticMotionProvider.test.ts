import { describe, expect, it, vi } from "vitest";

import { SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA } from "../SemanticMotionInterpreter.js";
import {
  DEFAULT_SEMANTIC_TIMEOUT_MS,
  GrokSemanticMotionProvider,
  buildGrokArgs,
} from "./GrokSemanticMotionProvider.js";

describe("Grok structured semantic provider", () => {
  it("allows a bounded contention window for concurrent local Grok work", () => {
    expect(DEFAULT_SEMANTIC_TIMEOUT_MS).toBe(180_000);
  });

  it("uses a fast isolated tool-free invocation for the semantic transaction", () => {
    const args = buildGrokArgs({
      promptPath: "C:/temp/prompt.txt",
      leaderSocketPath: "C:/temp/gasper-semantic.sock",
      system: "closed json only",
      schema: SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA,
      model: "grok-4.6",
      reasoningEffort: "low",
    });

    expect(args).toEqual(expect.arrayContaining([
      "--model", "grok-4.6",
      "--reasoning-effort", "low",
      "--leader-socket", "C:/temp/gasper-semantic.sock",
      "--tools", "",
      "--max-turns", "1",
    ]));
  });

  it("constrains one tool-free turn to the closed semantic schema", async () => {
    const runner = vi.fn(async () => ({
      stdout: JSON.stringify({
        requestId: "request-1",
        structuredOutput: {
          schema: "gasper.semantic-motion-proposal.v1",
          resolution: "unknown_movement",
          movementName: "unknown",
          plainLanguage: "Evidence is insufficient.",
          beats: [],
          uncertainties: [{
            id: "u1",
            description: "definition missing",
            confidence: 1,
            evidenceRefs: ["frame:1"],
          }],
          unsupportedAssumptions: [],
          externalDefinitionRefs: [],
        },
      }),
      stderr: "",
    }));
    const provider = new GrokSemanticMotionProvider({ runner });

    const result = await provider.generateStructured({
      schemaName: "gasper.semantic-motion-proposal.v1",
      system: "closed json only",
      user: "mechanics packet",
    }, new AbortController().signal);

    expect(result.responseId).toBe("request-1");
    expect(result.output).toMatchObject({ resolution: "unknown_movement" });
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({
      system: "closed json only",
      prompt: "mechanics packet",
      schema: SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA,
      disableTools: true,
    }));
  });

  it("rejects nonzero, unstructured, and oversized provider output", async () => {
    const startupNoise = `\u001b[31mstartup warning\u001b[0m\n${"x".repeat(1_200)}`;
    await expect(new GrokSemanticMotionProvider({
      runner: async () => ({
        stdout: "",
        stderr: `${startupNoise}\nFINAL PROVIDER CAUSE`,
        exitCode: 1,
      }),
    }).generateStructured({
      schemaName: "gasper.semantic-motion-proposal.v1",
      system: "system",
      user: "user",
    }, new AbortController().signal)).rejects.toThrow(/FINAL PROVIDER CAUSE/);

    await expect(new GrokSemanticMotionProvider({
      runner: async () => ({ stdout: "not json", stderr: "bad" }),
    }).generateStructured({
      schemaName: "gasper.semantic-motion-proposal.v1",
      system: "system",
      user: "user",
    }, new AbortController().signal)).rejects.toThrow(/json|structured/i);

    await expect(new GrokSemanticMotionProvider({
      runner: async () => ({ stdout: "x".repeat(1_100_000), stderr: "" }),
    }).generateStructured({
      schemaName: "gasper.semantic-motion-proposal.v1",
      system: "system",
      user: "user",
    }, new AbortController().signal)).rejects.toThrow(/large/i);
  });
});
