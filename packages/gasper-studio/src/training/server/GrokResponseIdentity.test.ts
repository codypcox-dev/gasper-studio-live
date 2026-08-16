import { describe, expect, it } from "vitest";

import { parseGrokResponseIdentity } from "./GrokResponseIdentity.js";

describe("Grok response identity", () => {
  it("attests a single Grok 4.6 backend from the response envelope", () => {
    expect(parseGrokResponseIdentity({
      requestId: "request-46",
      sessionId: "session-46",
      modelUsage: {
        "grok-4.6-build": { modelCalls: 1 },
      },
    }, "grok-4.6")).toEqual({
      verification: "response",
      canonicalModel: "grok-4.6",
      backendModel: "grok-4.6-build",
      requestId: "request-46",
      sessionId: "session-46",
      modelCalls: 1,
    });
  });

  it("rejects missing, wrong, or ambiguous backend usage", () => {
    const base = { requestId: "request-46", sessionId: "session-46" };

    expect(() => parseGrokResponseIdentity(base, "grok-4.6")).toThrow(/model usage/i);
    expect(() => parseGrokResponseIdentity({
      ...base,
      modelUsage: { "grok-4.5": { modelCalls: 1 } },
    }, "grok-4.6")).toThrow(/grok-4\.6/i);
    expect(() => parseGrokResponseIdentity({
      ...base,
      modelUsage: {
        "grok-4.6-build-a": { modelCalls: 1 },
        "grok-4.6-build-b": { modelCalls: 1 },
      },
    }, "grok-4.6")).toThrow(/ambiguous/i);
    expect(() => parseGrokResponseIdentity({
      ...base,
      modelUsage: { "grok-4.6-build": { modelCalls: 0 } },
    }, "grok-4.6")).toThrow(/model calls/i);
  });

  it("requires response trace identifiers", () => {
    expect(() => parseGrokResponseIdentity({
      requestId: "",
      sessionId: "session-46",
      modelUsage: { "grok-4.6-build": { modelCalls: 1 } },
    }, "grok-4.6")).toThrow(/request id/i);
    expect(() => parseGrokResponseIdentity({
      requestId: "request-46",
      modelUsage: { "grok-4.6-build": { modelCalls: 1 } },
    }, "grok-4.6")).toThrow(/session id/i);
  });
});
