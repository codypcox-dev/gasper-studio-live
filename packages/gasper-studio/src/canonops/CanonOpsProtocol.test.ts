import { describe, expect, it } from "vitest";
import {
  buildCanonOpsRequest,
  canonOpsPhdPacketSchema,
  canonOpsRunRequestSchema,
  DEFAULT_CANONOPS_RESIDUAL,
} from "./CanonOpsProtocol.js";

describe("CanonOpsProtocol", () => {
  it("builds a strict Explore / Summarize / Investigate request", () => {
    const request = buildCanonOpsRequest("investigate");
    expect(canonOpsRunRequestSchema.parse(request).mode).toBe("investigate");
    expect(request.residual.id).toBe(DEFAULT_CANONOPS_RESIDUAL.id);
    expect(request.triforceRequired).toBe(true);
  });

  it("rejects a packet that skips the charter fields", () => {
    expect(() =>
      canonOpsPhdPacketSchema.parse({
        schema: "gasper.canonops.phd-packet.v1",
        mode: "explore",
      }),
    ).toThrow();
  });
});
