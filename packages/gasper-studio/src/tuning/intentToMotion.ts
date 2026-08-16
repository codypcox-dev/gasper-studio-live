import {
  CAUSAL_AFFECT_COMPILER_ID,
  CAUSAL_CONSTRAINTS,
  compileCausalPhrase,
  type CapabilityGateResult,
  type CausalMotionScore,
  type CausalPhysicsGoals,
  type SemanticExpressionIntent,
} from "../../../desktop/src/gasper/expression/CausalAffectStack";
import { GAIT_LAW } from "../../../desktop/src/gasper/physics/GaitLaw";
import type { TuningLabState, TuningParameterId } from "./tuningRegistry";
import {
  TENDENCY_PHYSICS_COMPILER_ID,
  affectFromTendencyAxes,
  compileTendencyPhysics,
  tendencyAxesFromPhrase,
} from "./tendencyToPhysicsGoals";

export type MotionIntentPath = "causal-affect" | "n120-legacy";

export type MotionIntentPlan = {
  schema: "gasper.motion.intent-plan.v1" | "gasper.causal-intent-plan.v1";
  label: string;
  source: string;
  path: MotionIntentPath;
  compiler?: string;
  embodiment?: string;
  /** N120 low-level control plane only. Empty on the causal-affect success path. */
  parameters: Partial<TuningLabState>;
  constraints: string[];
  motionScore?: CausalMotionScore;
  capabilityGate?: CapabilityGateResult;
  physicsGoals?: CausalPhysicsGoals;
  semanticIntent?: SemanticExpressionIntent;
};

export type MotionIntentCompileResult =
  | { ok: true; plan: MotionIntentPlan }
  | { ok: false; error: string; suggestions: string[] };

const N120_CONSTRAINTS = [
  "physics-authoritative",
  "support-foot preserved",
  "foot-root preserved",
  "bounded and reversible",
  "n120-legacy",
];

const FAIL_SUGGESTIONS = [
  "approach the mark",
  "withdraw",
  "settle",
  "walk toward",
  "reduce vertical squeeze by 15%",
];

function compileN120Legacy(source: string, text: string): MotionIntentCompileResult | null {
  const heightIntent = Boolean(
    text.match(/(?:vertical|height).{0,24}(?:15|fifteen)\s*%/) ||
      /less (?:vertical|height)|reduce (?:his )?(?:vertical|height)/.test(text),
  );
  const walkIntent = /crip walk|wispwalker.*walk|walk.*wispwalker/.test(text);

  if (heightIntent && walkIntent) {
    return {
      ok: true,
      plan: {
        schema: "gasper.motion.intent-plan.v1",
        label: "Wispwalker footwork rehearsal · reduced vertical squeeze",
        source,
        path: "n120-legacy",
        compiler: "n120-legacy",
        embodiment: "wispwalker",
        parameters: {
          verticalDepthGain: 0.85,
          gaitBobGain: 0.82,
          contactSquashGain: 0.92,
          supportExchangeGain: 1.35,
          footworkPrimitiveGain: 1.2,
          footRootGain: 1.75,
          walkAmp: 1.3,
          walkAccent: 0.68,
          stepDepth: 7.6,
          walkPeriod: 1.15,
          footworkTempo: 1.08,
          actingGain: 1.16,
          viscoTau: 0.34,
          craftExaggeration: 1.12,
        },
        constraints: N120_CONSTRAINTS,
      },
    };
  }

  if (heightIntent) {
    return {
      ok: true,
      plan: {
        schema: "gasper.motion.intent-plan.v1",
        label: "Reduce vertical squeeze",
        source,
        path: "n120-legacy",
        compiler: "n120-legacy",
        parameters: { verticalDepthGain: 0.85 },
        constraints: N120_CONSTRAINTS,
      },
    };
  }

  if (walkIntent) {
    return {
      ok: true,
      plan: {
        schema: "gasper.motion.intent-plan.v1",
        label: "Wispwalker footwork rehearsal",
        source,
        path: "n120-legacy",
        compiler: "n120-legacy",
        embodiment: "wispwalker",
        parameters: {
          gaitBobGain: 0.82,
          contactSquashGain: 0.92,
          supportExchangeGain: 1.35,
          footworkPrimitiveGain: 1.2,
          footRootGain: 1.75,
          walkAmp: 1.3,
          walkAccent: 0.68,
          stepDepth: 7.6,
          walkPeriod: 1.15,
          footworkTempo: 1.08,
          actingGain: 1.16,
          viscoTau: 0.34,
          craftExaggeration: 1.12,
        },
        constraints: N120_CONSTRAINTS,
      },
    };
  }

  if (/ground|heavy|weight/.test(text)) {
    return {
      ok: true,
      plan: {
        schema: "gasper.motion.intent-plan.v1",
        label: "Grounded weight pass",
        source,
        path: "n120-legacy",
        compiler: "n120-legacy",
        parameters: { gaitBobGain: 0.7, contactSquashGain: 1.05, viscoTau: 0.38 },
        constraints: N120_CONSTRAINTS,
      },
    };
  }

  return null;
}


function physicsGoalsFromTendencyNumbers(
  cruise: number,
  gather: number,
  bankDeg: number,
  scale: { x: number; z: number },
  attentionStrength: number,
  expressionGain: number,
): CausalPhysicsGoals {
  return {
    locomotion: {
      x: scale.x * GAIT_LAW.bodyHeightUnits,
      z: scale.z * GAIT_LAW.bodyHeightUnits,
      cruise,
    },
    gather,
    bank: bankDeg,
    attentionStrength,
    expressionGain,
  };
}

function compileTendencyPhysicsIntent(source: string): MotionIntentCompileResult | null {
  const axes = tendencyAxesFromPhrase(source);
  if (!axes) return null;
  const goals = compileTendencyPhysics(source);
  if (!goals) return null;
  const affect = affectFromTendencyAxes(axes);
  const causal = compileCausalPhrase(source);
  const attentionStrength = causal.ok ? causal.physicsGoals.attentionStrength : axes.orient;
  return {
    ok: true,
    plan: {
      schema: "gasper.causal-intent-plan.v1",
      label: causal.ok ? causal.label : "tendency physics goals",
      source,
      path: "causal-affect",
      compiler: causal.ok ? CAUSAL_AFFECT_COMPILER_ID : TENDENCY_PHYSICS_COMPILER_ID,
      embodiment: causal.ok ? causal.embodiment : undefined,
      parameters: {},
      constraints: [...CAUSAL_CONSTRAINTS],
      motionScore: causal.ok ? causal.motionScore : undefined,
      capabilityGate: causal.ok ? causal.capabilityGate : undefined,
      physicsGoals: physicsGoalsFromTendencyNumbers(
        goals.cruise,
        goals.gather,
        goals.bankDeg,
        goals.locomotion,
        attentionStrength,
        affect.expression_gain,
      ),
      semanticIntent: causal.ok ? causal.state.semanticIntent : undefined,
    },
  };
}
/**
 * Legal compiler: phrase → tendency axes → physics goals.
 * N120 regex buckets remain only as a labeled fallback. They are not the
 * success path for walk / approach / settle.
 */
export function compileMotionIntent(input: string): MotionIntentCompileResult {
  const source = String(input ?? "").trim();
  const text = source.toLowerCase().replace(/\s+/g, " ");
  if (!text) {
    return {
      ok: false,
      error: "empty intent",
      suggestions: [...FAIL_SUGGESTIONS],
    };
  }

  const causal = compileCausalPhrase(source);
  if (!causal.ok && (causal.code === "emotion-label-forbidden" || causal.code === "empty")) {
    return {
      ok: false,
      error: causal.error,
      suggestions: [...causal.suggestions],
    };
  }

  const tendency = compileTendencyPhysicsIntent(source);
  if (tendency) return tendency;

  if (causal.ok) {
    return {
      ok: true,
      plan: {
        schema: "gasper.causal-intent-plan.v1",
        label: causal.label,
        source,
        path: "causal-affect",
        compiler: CAUSAL_AFFECT_COMPILER_ID,
        embodiment: causal.embodiment,
        parameters: {},
        constraints: [...CAUSAL_CONSTRAINTS],
        motionScore: causal.motionScore,
        capabilityGate: causal.capabilityGate,
        physicsGoals: causal.physicsGoals,
        semanticIntent: causal.state.semanticIntent,
      },
    };
  }
  if (causal.code === "emotion-label-forbidden" || causal.code === "empty") {
    return {
      ok: false,
      error: causal.error,
      suggestions: [...causal.suggestions],
    };
  }

  const legacy = compileN120Legacy(source, text);
  if (legacy) return legacy;

  return {
    ok: false,
    error: "intent has no causal tendency and no bounded N120 mapping",
    suggestions: [...FAIL_SUGGESTIONS],
  };
}

export function parameterIdsForPlan(plan: MotionIntentPlan): TuningParameterId[] {
  return Object.keys(plan.parameters) as TuningParameterId[];
}

/** Grok lane / Book 004 compile_intent entry. Same function as compileMotionIntent. */
export const compile_intent = compileMotionIntent;
