/**
 * R4 slice — Book 004 causal affect → physics goals.
 *
 * DAG: appraisal → core affect → action tendency → SemanticExpressionIntent
 * (9 signed axes) → capability gate → filed physics goals.
 *
 * Outputs are goals, never emotion names, never Tuning Lab anatomy knobs,
 * never a second travel writer. WorldPhysicsDriver remains the sole writer
 * of body.x/z; this module only FILES LocomotionIntent / gather / bank.
 *
 * No pupils. No emotion wheel. No LLM. No Math.random.
 */
import { embodimentLocomotionClass } from "../behavior/EmbodimentLocomotion";
import { GAIT_LAW } from "../physics/GaitLaw";
import { PHI, PHI_LAW } from "../physics/PhiLaw";
import type { LocomotionIntent } from "../physics/WorldPhysicsDriver";

export type SignedUnit = number;
export type Scalar01 = number;

export type AppraisalStateV2 = Readonly<{
  novelty: Scalar01;
  goal_relevance: Scalar01;
  goal_congruence: SignedUnit;
  certainty: Scalar01;
  urgency: Scalar01;
  temporal_stability: Scalar01;
  basis_id: "appraisal.rules.v0_1";
}>;

export type CoreAffectV2 = Readonly<{
  valence: SignedUnit;
  arousal: Scalar01;
  expression_gain: Scalar01;
  source: "phrase-compile" | "inherited";
}>;

export type ActionTendencyV2 = Readonly<{
  orient: Scalar01;
  explore: Scalar01;
  approach: Scalar01;
  affiliate: Scalar01;
  persist: Scalar01;
  reject: Scalar01;
  withdraw: Scalar01;
  inhibit: Scalar01;
  freeze: Scalar01;
  assert: Scalar01;
  yield_to: Scalar01;
  repair: Scalar01;
  release: Scalar01;
  basis_id: "action-tendency.rules.v0_1";
}>;

/** Book 004 §9.2 — directional chirality, not a fixture id. */
export type SemanticExpressionIntent = Readonly<{
  approach_withdraw: SignedUnit;
  expand_contract: SignedUnit;
  orient_disengage: SignedUnit;
  assert_yield: SignedUnit;
  affiliate_guard: SignedUnit;
  stabilize_destabilize: SignedUnit;
  reveal_conceal: SignedUnit;
  accelerate_decelerate: SignedUnit;
  persist_release: SignedUnit;
  confidence: readonly [
    Scalar01,
    Scalar01,
    Scalar01,
    Scalar01,
    Scalar01,
    Scalar01,
    Scalar01,
    Scalar01,
    Scalar01,
  ];
  policy_id: "chirality.rules.v0_1";
}>;

export type CausalMotionScore = Readonly<{
  schema: "gasper.causal-motion-score.v1";
  primitive: "travel" | "settle" | "orient" | "hold" | "compress";
  qualities: Readonly<{
    weight: Scalar01;
    energy: Scalar01;
    directness: Scalar01;
    flow: Scalar01;
  }>;
  axes: SemanticExpressionIntent;
  source: "causal-affect";
}>;

export type CausalPhysicsGoals = Readonly<{
  locomotion: LocomotionIntent;
  gather: Scalar01;
  bank: number;
  attentionStrength: Scalar01;
  expressionGain: Scalar01;
}>;

export type CapabilityGateResult = Readonly<{
  ok: boolean;
  admitted: readonly string[];
  rejected: readonly string[];
  embodimentClass: "walker" | "presence" | "rest" | "unspecified";
}>;

export type CausalAffectState = Readonly<{
  appraisal: AppraisalStateV2;
  coreAffect: CoreAffectV2;
  actionTendency: ActionTendencyV2;
  semanticIntent: SemanticExpressionIntent;
  expandContractHint: SignedUnit;
}>;

export type SteppedScalar = Readonly<{ value: number; vel: number }>;

export const CAUSAL_AFFECT_COMPILER_ID = "gasper.causal-affect.v0_1";
export const CAUSAL_CONSTRAINTS = Object.freeze([
  "physics-authoritative",
  "world-physics-driver-sole-travel-writer",
  "goals-not-writes",
  "no-emotion-label",
  "no-tuning-lab-anatomy",
  "no-llm-in-loop",
]);

const ZERO_TENDENCY: ActionTendencyV2 = Object.freeze({
  orient: 0,
  explore: 0,
  approach: 0,
  affiliate: 0,
  persist: 0,
  reject: 0,
  withdraw: 0,
  inhibit: 0,
  freeze: 0,
  assert: 0,
  yield_to: 0,
  repair: 0,
  release: 0,
  basis_id: "action-tendency.rules.v0_1",
});

const EMOTION_RE =
  /\b(happy|sad|angry|afraid|scared|fear|joy|joyful|disgust|surprise|surprised|pleased|proud|ashamed|love|hate|emotion|smile|frown|grin|smirk|cry|tears|furious|depressed|cheerful|ecstatic|miserable|fixture)\b/;

type TendencyPatch = Partial<Omit<ActionTendencyV2, "basis_id">> & {
  expandContractHint?: SignedUnit;
};

const TENDENCY_RULES: readonly Readonly<{ re: RegExp; patch: TendencyPatch }>[] = [
  { re: /\b(wants to go|want to go)\b/, patch: { approach: 1, persist: 1 / PHI } },
  { re: /\b(rather not|hold back)\b/, patch: { withdraw: 1, inhibit: 1 / PHI } },
  { re: /\b(approach|come closer|come toward|walk toward|go toward|head toward|walk to)\b/, patch: { approach: 1 } },
  { re: /\b(withdraw|back away|retreat|recede|pull back|step back)\b/, patch: { withdraw: 1, inhibit: 1 / PHI } },
  { re: /\b(settle|come to rest|be still|stand still)\b/, patch: { release: 1, inhibit: 1 / PHI } },
  { re: /\b(persist|keep going|keep walking|continue)\b/, patch: { persist: 1, approach: 1 / PHI } },
  { re: /\b(release|let go)\b/, patch: { release: 1 } },
  { re: /\b(expand|open up|open out)\b/, patch: { affiliate: 1 / PHI, expandContractHint: 1 } },
  { re: /\b(contract|close in|gather)\b/, patch: { inhibit: 1, expandContractHint: -1 } },
  { re: /\b(orient|face|attend|look toward|look at)\b/, patch: { orient: 1, affiliate: 1 / PHI } },
  { re: /\bhold\b/, patch: { persist: 1, inhibit: 1 / PHI } },
  { re: /\bwalk\b/, patch: { approach: 1, persist: 1 / PHI } },
];

export function clamp01(x: number): Scalar01 {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function clampSigned(x: number): SignedUnit {
  if (!Number.isFinite(x)) return 0;
  return Math.max(-1, Math.min(1, x));
}

export function emptyTendency(): ActionTendencyV2 {
  return ZERO_TENDENCY;
}

export function mergeTendency(base: ActionTendencyV2, patch: TendencyPatch): ActionTendencyV2 {
  const next: { -readonly [K in keyof ActionTendencyV2]: ActionTendencyV2[K] } = { ...base };
  for (const key of Object.keys(patch) as (keyof TendencyPatch)[]) {
    if (key === "expandContractHint") continue;
    const value = patch[key];
    if (typeof value === "number") next[key] = clamp01(Math.max(next[key], value));
  }
  return next;
}

export function semanticIntentFromTendency(
  tendency: ActionTendencyV2,
  affect: CoreAffectV2,
  expandContractHint = 0,
): SemanticExpressionIntent {
  const approachWithdraw = clampSigned(tendency.approach - tendency.withdraw);
  const expandContract = clampSigned(
    expandContractHint + tendency.affiliate * (1 / PHI) - tendency.inhibit - tendency.freeze,
  );
  const orientDisengage = clampSigned(tendency.orient - tendency.freeze);
  const assertYield = clampSigned(tendency.assert - tendency.yield_to);
  const affiliateGuard = clampSigned(tendency.affiliate - tendency.withdraw - tendency.inhibit * (1 / PHI));
  const stabilizeDestabilize = clampSigned(tendency.persist + tendency.release - tendency.freeze);
  const revealConceal = clampSigned(expandContract * (1 / PHI) + tendency.affiliate - tendency.inhibit);
  const accelerateDecelerate = clampSigned(
    tendency.approach + tendency.persist + affect.arousal * (1 / PHI) - tendency.withdraw - tendency.release - tendency.inhibit,
  );
  const persistRelease = clampSigned(tendency.persist - tendency.release);
  const conf = clamp01(0.5 + affect.expression_gain * (1 / PHI));
  return {
    approach_withdraw: approachWithdraw,
    expand_contract: expandContract,
    orient_disengage: orientDisengage,
    assert_yield: assertYield,
    affiliate_guard: affiliateGuard,
    stabilize_destabilize: stabilizeDestabilize,
    reveal_conceal: revealConceal,
    accelerate_decelerate: accelerateDecelerate,
    persist_release: persistRelease,
    confidence: [conf, conf, conf, conf, conf, conf, conf, conf, conf],
    policy_id: "chirality.rules.v0_1",
  };
}

export function motionScoreFromIntent(
  intent: SemanticExpressionIntent,
  affect: CoreAffectV2,
): CausalMotionScore {
  const travel = intent.approach_withdraw > 0;
  const settling = intent.persist_release < 0 && intent.approach_withdraw <= 0;
  const orienting = intent.orient_disengage > 1 / PHI && !travel && !settling;
  const holding = intent.persist_release > 0 && !travel;
  const primitive = settling
    ? "settle"
    : orienting
      ? "orient"
      : holding
        ? "hold"
        : intent.expand_contract < -1 / PHI
          ? "compress"
          : "travel";
  return {
    schema: "gasper.causal-motion-score.v1",
    primitive,
    qualities: {
      weight: clamp01(affect.expression_gain * (1 / PHI) + (intent.expand_contract < 0 ? -intent.expand_contract : 0)),
      energy: clamp01(affect.arousal),
      directness: clamp01(0.5 + intent.approach_withdraw * (1 / PHI)),
      flow: clamp01(0.5 + intent.persist_release * (1 / PHI)),
    },
    axes: intent,
    source: "causal-affect",
  };
}

export function physicsGoalsFromSemanticIntent(
  intent: SemanticExpressionIntent,
  affect: CoreAffectV2,
): CausalPhysicsGoals {
  const cruiseBase = GAIT_LAW.cruiseBaseUnitsPerSec;
  const approach = Math.max(0, intent.approach_withdraw);
  const withdraw = Math.max(0, -intent.approach_withdraw);
  const settle = intent.persist_release < 0 && approach <= 0 ? 1 : 0;
  const orientOnly = intent.orient_disengage > 1 / PHI && approach <= 0 && withdraw <= 0 && settle === 0;

  let cruise = 0;
  if (approach > 0) cruise = cruiseBase * (1 / PHI + approach * (1 - 1 / PHI) * (1 / PHI + affect.arousal * (1 / PHI)));
  else if (withdraw > 0) cruise = (cruiseBase / PHI) * (1 - withdraw * (1 / PHI));
  if (orientOnly || settle) cruise = 0;
  if (intent.persist_release > 0 && cruise > 0) cruise = Math.min(cruiseBase, cruise * (1 + intent.persist_release / PHI));

  const ahead = GAIT_LAW.bodyHeightUnits;
  const locomotion: LocomotionIntent = {
    x: approach > 0 ? ahead : withdraw > 0 ? -ahead : 0,
    z: 0,
    cruise,
  };

  const gather = clamp01(
    withdraw * (1 / PHI) +
      settle * (1 / PHI) +
      Math.max(0, -intent.expand_contract) * (1 / PHI) +
      (approach > 0 ? 1 / (PHI * PHI) : 0),
  );

  const bankFence = GAIT_LAW.bankMaxDeg / PHI;
  const bank =
    approach > 0
      ? bankFence * approach * affect.arousal / PHI
      : withdraw > 0
        ? -bankFence * withdraw
        : 0;

  const attentionStrength = clamp01(
    Math.max(0, intent.orient_disengage) * (1 / PHI + affect.arousal / PHI) +
      Math.max(0, intent.affiliate_guard) / (PHI * PHI),
  );

  return {
    locomotion,
    gather,
    bank,
    attentionStrength,
    expressionGain: clamp01(affect.expression_gain + Math.max(0, intent.assert_yield) / PHI),
  };
}

export function gatePhysicsGoals(
  goals: CausalPhysicsGoals,
  score: CausalMotionScore,
  embodiment?: string,
): CapabilityGateResult {
  const rejected: string[] = [];
  const admitted: string[] = [];
  const id = (embodiment ?? "").trim().toLowerCase();
  const embodimentClass = !id
    ? "unspecified"
    : embodimentLocomotionClass(id) === "walker"
      ? "walker"
      : embodimentLocomotionClass(id) === "presence"
        ? "presence"
        : "rest";

  const serialized = JSON.stringify({ goals, score });
  if (EMOTION_RE.test(serialized)) rejected.push("emotion-label-in-goals");
  if (!Number.isFinite(goals.locomotion.cruise) || goals.locomotion.cruise < 0) rejected.push("cruise-unbounded");
  if (goals.locomotion.cruise > GAIT_LAW.cruiseBaseUnitsPerSec * PHI) rejected.push("cruise-above-base-phi");
  if (!Number.isFinite(goals.gather) || goals.gather < 0 || goals.gather > 1) rejected.push("gather-unbounded");
  if (!Number.isFinite(goals.bank) || Math.abs(goals.bank) > GAIT_LAW.bankMaxDeg) rejected.push("bank-above-fence");
  if (embodimentClass === "rest" && goals.locomotion.cruise > 0) rejected.push("rest-embodiment-cannot-travel");
  if (score.source !== "causal-affect") rejected.push("score-source-not-causal");

  if (rejected.length === 0) {
    admitted.push("locomotion-intent", "gather", "bank", "attention-strength");
  }
  return { ok: rejected.length === 0, admitted, rejected, embodimentClass };
}

export function buildCausalState(
  tendency: ActionTendencyV2,
  affect: CoreAffectV2,
  appraisal: AppraisalStateV2,
  expandContractHint = 0,
): CausalAffectState {
  return {
    appraisal,
    coreAffect: affect,
    actionTendency: tendency,
    semanticIntent: semanticIntentFromTendency(tendency, affect, expandContractHint),
    expandContractHint: clampSigned(expandContractHint),
  };
}

export function goalsFromState(state: CausalAffectState): CausalPhysicsGoals {
  return physicsGoalsFromSemanticIntent(state.semanticIntent, state.coreAffect);
}

/** First-order lag; velocity is the observed Δ/dt. No reset-through-neutral. */
export function stepScalar(prev: SteppedScalar, target: number, dt: number, tau: number): SteppedScalar {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(tau) || tau <= 0) return prev;
  if (!Number.isFinite(prev.value) || !Number.isFinite(prev.vel) || !Number.isFinite(target)) return prev;
  const alpha = 1 - Math.exp(-dt / tau);
  const value = prev.value + (target - prev.value) * alpha;
  return { value, vel: (value - prev.value) / dt };
}

export function affectLagTauSeconds(): number {
  return PHI_LAW.deliberationBaseSeconds * PHI;
}

export type PhraseCompileFailure = Readonly<{
  ok: false;
  error: string;
  code: "empty" | "emotion-label-forbidden" | "not-causal";
  suggestions: readonly string[];
}>;

export type PhraseCompileSuccess = Readonly<{
  ok: true;
  state: CausalAffectState;
  motionScore: CausalMotionScore;
  capabilityGate: CapabilityGateResult;
  physicsGoals: CausalPhysicsGoals;
  embodiment?: string;
  label: string;
}>;

export type PhraseCompileResult = PhraseCompileSuccess | PhraseCompileFailure;

const CAUSAL_SUGGESTIONS = Object.freeze([
  "approach the mark",
  "withdraw",
  "settle",
  "walk toward",
  "orient",
]);

function normalizePhrase(input: string): string {
  return String(input ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function appraisalFromTendency(tendency: ActionTendencyV2, affect: CoreAffectV2): AppraisalStateV2 {
  return {
    novelty: clamp01(tendency.orient * (1 / PHI) + affect.arousal / (PHI * PHI)),
    goal_relevance: clamp01(tendency.approach + tendency.withdraw + tendency.persist + tendency.release),
    goal_congruence: clampSigned(tendency.approach + tendency.affiliate - tendency.withdraw - tendency.reject),
    certainty: clamp01(1 / PHI + tendency.persist / PHI - tendency.freeze / PHI),
    urgency: clamp01(affect.arousal),
    temporal_stability: clamp01(tendency.release + tendency.persist * (1 / PHI)),
    basis_id: "appraisal.rules.v0_1",
  };
}

function affectFromTendency(
  tendency: ActionTendencyV2,
  expandContractHint: SignedUnit,
  mods: Readonly<{ arousal?: number; gain?: number }> = {},
): CoreAffectV2 {
  const derivedArousal = clamp01(
    tendency.approach / PHI +
      tendency.persist / (PHI * PHI) +
      tendency.orient / (PHI * PHI) +
      (expandContractHint > 0 ? 1 / (PHI * PHI) : 0),
  );
  const valence = clampSigned(tendency.approach + tendency.affiliate - tendency.withdraw - tendency.inhibit);
  const arousal = mods.arousal !== undefined ? clamp01(mods.arousal) : derivedArousal;
  const derivedGain = clamp01(1 / PHI + arousal / PHI + tendency.assert / PHI);
  const gain = mods.gain !== undefined ? clamp01(mods.gain) : derivedGain;
  return { valence, arousal, expression_gain: gain, source: "phrase-compile" };
}

function dominantLabel(tendency: ActionTendencyV2, expandContractHint: SignedUnit): string {
  const ranked: Array<readonly [string, number]> = [
    ["approach", tendency.approach],
    ["withdraw", tendency.withdraw],
    ["settle", tendency.release],
    ["persist", tendency.persist],
    ["orient", tendency.orient],
    ["hold", tendency.inhibit > 0 && tendency.persist > 0 ? tendency.persist : 0],
    ["expand", Math.max(0, expandContractHint)],
    ["contract", Math.max(0, -expandContractHint)],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : "orient";
}

export function compileCausalPhrase(input: string): PhraseCompileResult {
  const source = String(input ?? "").trim();
  const text = normalizePhrase(source);
  if (!text) {
    return {
      ok: false,
      error: "empty intent",
      code: "empty",
      suggestions: CAUSAL_SUGGESTIONS,
    };
  }
  if (EMOTION_RE.test(text)) {
    return {
      ok: false,
      error: "emotion-label-forbidden: causal compile refuses emotion names",
      code: "emotion-label-forbidden",
      suggestions: CAUSAL_SUGGESTIONS,
    };
  }
  if (/\bcrip\s+walk\b/.test(text)) {
    return {
      ok: false,
      error: "not-causal",
      code: "not-causal",
      suggestions: CAUSAL_SUGGESTIONS,
    };
  }

  let tendency = emptyTendency();
  let expandContractHint = 0;
  let hits = 0;
  for (const rule of TENDENCY_RULES) {
    if (!rule.re.test(text)) continue;
    hits += 1;
    tendency = mergeTendency(tendency, rule.patch);
    if (typeof rule.patch.expandContractHint === "number") {
      expandContractHint = clampSigned(expandContractHint + rule.patch.expandContractHint);
    }
  }
  if (hits === 0) {
    return {
      ok: false,
      error: "not-causal",
      code: "not-causal",
      suggestions: CAUSAL_SUGGESTIONS,
    };
  }

  const embodiment = /\bwispwalker\b/.test(text) ? "wispwalker" : undefined;
  const affectMods: { arousal?: number; gain?: number } = {};
  if (/\bhigh arousal\b|\bsnapp(?:y|ier)\b|\burgent\b/.test(text)) affectMods.arousal = 1;
  if (/\blow arousal\b|\blanguid\b/.test(text)) affectMods.arousal = 1 / (PHI * PHI);
  if (/\bhigh gain\b|\bpressure\b|\bintense\b/.test(text)) affectMods.gain = 1;
  if (/\blow gain\b|\bmuted\b/.test(text)) affectMods.gain = 1 / (PHI * PHI);
  const affect = affectFromTendency(tendency, expandContractHint, affectMods);
  const appraisal = appraisalFromTendency(tendency, affect);
  const state = buildCausalState(tendency, affect, appraisal, expandContractHint);
  const motionScore = motionScoreFromIntent(state.semanticIntent, state.coreAffect);
  const physicsGoals = goalsFromState(state);
  const capabilityGate = gatePhysicsGoals(physicsGoals, motionScore, embodiment);
  if (!capabilityGate.ok) {
    return {
      ok: false,
      error: `capability-gate-rejected: ${capabilityGate.rejected.join(",")}`,
      code: "not-causal",
      suggestions: CAUSAL_SUGGESTIONS,
    };
  }
  return {
    ok: true,
    state,
    motionScore,
    capabilityGate,
    physicsGoals,
    embodiment,
    label: `${dominantLabel(tendency, expandContractHint)} physics goals`,
  };
}

export function serializeGoals(goals: CausalPhysicsGoals): string {
  return JSON.stringify(goals);
}

/** Brief name: compile_intent emits Score -> gate -> physics goals. */
export const compileIntent = compileCausalPhrase;
export const compile_intent = compileCausalPhrase;
