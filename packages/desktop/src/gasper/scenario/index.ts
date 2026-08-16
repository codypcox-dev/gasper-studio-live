/**
 * Desktop gasper/scenario — R2 freeze surface for R3/R4.
 * Re-exports pure shared compiler contracts; no living runtime / GSAP ownership.
 */

export {
  // channels
  GASPER_CHANNEL_DOMAINS,
  CHANNEL_SUPER_GROUPS,
  isChannelDomain,
  emptyChannelTargets,
  flattenChannelVector,
  differingDomains,
  // types
  SCENARIO_COMPILER_ID,
  SCENARIO_COMPILER_VERSION,
  SCENARIO_SCHEMA_FAMILY,
  EIGHT_SCENARIO_IDS,
  EMBODIMENT_IDS,
  COGNITIVE_MODES,
  // eight states
  EIGHT_STATE_DEFINITIONS,
  getEightStateDefinition,
  listEightScenarioIds,
  isEightScenarioId,
  buildChannelTargets,
  // compiler
  validateScenarioIntent,
  compileScenario,
  compileEightShowcase,
  evaluateEndpointFrame,
  getCanonicalIntent,
  // distinctness
  computePairwiseDistance,
  computeDistinctnessBudget,
  buildPerceptualReviewManifest,
  // loop
  buildLoopTransitions,
  buildLoopManifest,
  assertLoopClosed,
  LOOP_ORDER,
  // historical
  HISTORICAL_18_FIXTURES,
  NATIVE_FIXTURE_BRIDGES,
  ABLATION_CANDIDATES,
  buildHistoricalMappingDocument,
  // emit
  emitStateSystemArtifacts,
  // hash
  contentHash,
  stableStringify,
  q6,
  shortHash,
} from "../../../../shared/src/gasper-scenario";

export type {
  GasperChannelDomainId,
  GasperChannelTargetV1,
  ChannelScalarMap,
  ChannelSuperGroupId,
  EightScenarioId,
  EmbodimentId,
  CognitiveMode,
  ValidationStatus,
  AffectPointV1,
  AppraisalV1,
  ActionTendencyV1,
  SocialStanceV1,
  IdentityConstraintsV1,
  GasperScenarioIntentV1,
  GasperScenarioStateV1,
  GasperStateIRV1,
  ValidationIssueV1,
  GasperTransitionPlanV1,
  GasperLoopManifestV1,
  GasperEvaluatedFrameV1,
  PairwiseDistanceV1,
  GasperDistinctnessBudgetV1,
  GasperPerceptualReviewManifestV1,
  CompileInputV1,
  CompileResultV1,
  HistoricalFixtureRecord,
  AblationCandidate,
} from "../../../../shared/src/gasper-scenario";

/** Mapping from eight scenario ids → native expression fixture anchors (R2). */
export const SCENARIO_TO_EXPRESSION_FIXTURE: Record<string, string> = {
  "presence-neutral-settled": "neutral-settled",
  "presence-listening-receive": "listening-orient",
  "presence-thinking-knit": "thinking-knit",
  "presence-recognition-spark": "neutral-social",
  "comet-executing-drive": "neutral-social",
  "presence-blocked-strain": "blocked-strain",
  "presence-pleased-resolve": "pleased-soft",
  "dormant-orbit-maintain": "neutral-settled",
};
