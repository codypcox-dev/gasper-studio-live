/** Pure Gasper animation command layer — UI + MCP share this module. */
export * from "./types.js";
export * from "./evaluate.js";
export * from "./commands.js";
export * as animationV2 from "./v2/index.js";
// node-persist is NOT re-exported here — browser bundles must not pull node:fs.
// Import `@agentbridge/shared/gasper-animation/node-persist` from Node tests only.
