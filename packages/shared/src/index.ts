/**
 * Gasper-only shared entry point.
 *
 * This intentionally exposes only contracts consumed by the standalone
 * application. AgentBridge's administrative/shared surface is not part of
 * this repository.
 */
export * from "./gasper-performance/index.js";
export type {
  PerformanceIntent as CompilerPerformanceIntent,
} from "./gasper-performance/types.js";
