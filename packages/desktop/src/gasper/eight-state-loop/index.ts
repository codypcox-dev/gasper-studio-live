/**
 * GASPER-007-G R4 eight-state loop module.
 * Local R2 adapter types + motion loop contracts. Root reconciles with R2 scenario/**.
 */

export * from "./types";
export * from "./motion-grammar";
export * from "./beat-sequence";
export * from "./microvariation";
export * from "./moving-hold";
export * from "./wake";
export * from "./interruption";
export * from "./long-rest";
export * from "./state-targets";
export * from "./embodiment-state-matrix";
export * from "./embodiment-life";
export * from "./ir-targets";
export * from "./loop-manifest";
export * from "./scene-suites";
export * from "./layer-authority";
export * from "./schedulers";
export { EightStateLoopController } from "./EightStateLoopController";
export type {
  LoopAttachApi,
  LoopControllerOptions,
  LoopTransitionFrame,
} from "./EightStateLoopController";
