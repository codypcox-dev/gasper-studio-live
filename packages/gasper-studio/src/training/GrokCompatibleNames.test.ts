import { describe, expect, it } from "vitest";

import {
  GROK_INCOMPATIBLE_GASPER_TOOL_NAMES,
  GROK_LEGAL_GASPER_ALIASES,
  isLegalGrokToolName,
  legalAliasForIncompatible,
  resolveGrokGasperAlias,
} from "./GrokCompatibleNames.js";

describe("Grok compatible Gasper names", () => {
  it("rejects AgentBridge double-underscore names and accepts single-underscore aliases", () => {
    for (const name of GROK_INCOMPATIBLE_GASPER_TOOL_NAMES) {
      expect(isLegalGrokToolName(name)).toBe(false);
      const alias = legalAliasForIncompatible(name);
      expect(alias).toBeDefined();
      expect(isLegalGrokToolName(alias!.legal)).toBe(true);
      expect(alias!.legal.includes("__")).toBe(false);
    }
    expect(GROK_LEGAL_GASPER_ALIASES).toHaveLength(8);
  });

  it("resolves only legal names and fails closed on unknown or qualified leftovers", () => {
    expect(resolveGrokGasperAlias("gasper_inspect_tuning")?.operation).toBe("inspect_tuning");
    expect(resolveGrokGasperAlias("gasper__inspect_tuning")).toBeUndefined();
    expect(resolveGrokGasperAlias("mcp__agentbridge-local__gasper_manifest")).toBeUndefined();
    expect(isLegalGrokToolName("gasper_reload_continuity")).toBe(true);
    expect(isLegalGrokToolName("")).toBe(false);
  });
});