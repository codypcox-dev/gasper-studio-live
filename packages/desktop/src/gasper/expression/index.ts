/**
 * Production expression grammar for packaged Gasper Studio.
 */

export {
  EXPRESSION_ANCHOR_BINDINGS,
  BINDING_ALIASES,
  getAnchorBindings,
  listAnchorBindingIds,
  resolveBindingId,
} from "./anchorBindings";
export type { ExpressionBindingSpec } from "./anchorBindings";

export {
  expressionKernelStatus,
  projectExpression,
  blendExpressionChannels,
  sampleExpressionContinuum,
  listProductionExpressionIds,
  PHYSICAL_BASELINE,
} from "./grammar";
export type {
  ExpressionGrammarState,
  ProjectExpressionInput,
  ProjectExpressionResult,
} from "./grammar";

export {
  ExpressionStudioSession,
  getExpressionStudioSession,
  resetExpressionStudioSessionForTests,
} from "./session";
export type {
  ExpressionSessionSnapshot,
  ExpressionSessionListener,
} from "./session";

// Re-export document-geometry bind helpers for expression consumers.
export {
  applyChannelsToDocumentGeometry,
  measureDocumentGeometry,
  SIX_EXPRESSION_TARGETS,
} from "../facial/DocumentFacialGeometry";

export {
  KERNEL_TO_FORM_MASTER,
  FORM_MASTER_TO_KERNEL,
  LEGACY_POST_FIXTURE_SAFE_KEYS,
  toFormMasterFixtureId,
  toKernelFixtureId,
  buildLegacySafePose,
  buildNativePose,
  isLegacyAuthorityDais,
} from "./formMasterBridge";

// S5 · E-LAW: whole-body affect coupling (expression-attention-phd-memo).
export {
  EXPRESSION_LAW,
  expressionStretchFor,
  expressionRockPx,
} from "./ExpressionLaw";
export type { ExpressionStretch } from "./ExpressionLaw";

// R4 — Book 004 causal affect files physics goals (never emotion names).
export {
  CAUSAL_AFFECT_COMPILER_ID,
  CAUSAL_CONSTRAINTS,
  compileCausalPhrase,
  compileIntent,
  compile_intent,
  emptyTendency,
  gatePhysicsGoals,
  goalsFromState,
  physicsGoalsFromSemanticIntent,
  semanticIntentFromTendency,
  stepScalar,
} from "./CausalAffectStack";
export type {
  ActionTendencyV2,
  AppraisalStateV2,
  CapabilityGateResult,
  CausalAffectState,
  CausalMotionScore,
  CausalPhysicsGoals,
  CoreAffectV2,
  PhraseCompileResult,
  SemanticExpressionIntent,
} from "./CausalAffectStack";
