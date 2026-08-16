/**
 * Grok-legal Gasper compatibility names.
 *
 * Hypothesis confirmed against AgentBridge third-party registry:
 * AgentBridge namespaces child MCP tools as `${namespace}__${tool}`
 * (gateway third-party/registry.js nsName). Grok qualified tool names
 * also use `__` as the server/tool delimiter. A tool already named
 * `gasper__manifest` therefore becomes `agentbridge-local__gasper__manifest`
 * and fails Grok's two-part parse.
 *
 * Global AgentBridge/Grok MCP configuration is out of scope. This module
 * exposes single-underscore legal aliases Grok can invoke through the
 * in-repo Grok lane without inventing a second MCP server.
 */
export const GROK_INCOMPATIBLE_GASPER_TOOL_NAMES = Object.freeze([
  "gasper__manifest",
  "gasper__tuning_lab_manifest",
  "gasper__inspect_tuning",
  "gasper__set_tuning",
  "gasper__compile_intent",
  "gasper__dispatch_command",
  "gasper__animation_clips",
  "gasper__animation_keyframes",
] as const);

export type GrokIncompatibleGasperToolName =
  (typeof GROK_INCOMPATIBLE_GASPER_TOOL_NAMES)[number];

export const GROK_LEGAL_CONTINUITY_NAME = "gasper_reload_continuity" as const;

export const GROK_LEGAL_GASPER_ALIASES = Object.freeze([
  { incompatible: "gasper__manifest", legal: "gasper_manifest", operation: "manifest" },
  { incompatible: "gasper__tuning_lab_manifest", legal: "gasper_tuning_lab_manifest", operation: "tuning_lab_manifest" },
  { incompatible: "gasper__inspect_tuning", legal: "gasper_inspect_tuning", operation: "inspect_tuning" },
  { incompatible: "gasper__set_tuning", legal: "gasper_set_tuning", operation: "set_tuning" },
  { incompatible: "gasper__compile_intent", legal: "gasper_compile_intent", operation: "compile_intent" },
  { incompatible: "gasper__dispatch_command", legal: "gasper_dispatch_command", operation: "dispatch_command" },
  { incompatible: "gasper__animation_clips", legal: "gasper_animation_clips", operation: "animation_clips" },
  { incompatible: "gasper__animation_keyframes", legal: "gasper_animation_keyframes", operation: "animation_keyframes" },
] as const);

export type GrokLegalGasperAlias = (typeof GROK_LEGAL_GASPER_ALIASES)[number];
export type GrokLegalGasperToolName =
  GrokLegalGasperAlias["legal"] | typeof GROK_LEGAL_CONTINUITY_NAME;

/** Single-underscore names only. Consecutive underscores collide with Grok's qualifier. */
export const GROK_LEGAL_TOOL_NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export function isLegalGrokToolName(name: string): boolean {
  return typeof name === "string" && GROK_LEGAL_TOOL_NAME_PATTERN.test(name) && !name.includes("__");
}

export function resolveGrokGasperAlias(name: string): GrokLegalGasperAlias | undefined {
  return GROK_LEGAL_GASPER_ALIASES.find((alias) => alias.legal === name);
}

export function legalAliasForIncompatible(name: string): GrokLegalGasperAlias | undefined {
  return GROK_LEGAL_GASPER_ALIASES.find((alias) => alias.incompatible === name);
}
