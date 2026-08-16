/**
 * Browser-safe Studio Affect compiler (Lane E).
 * Mirrors packages/shared gasper-performance/compiler spine without node:fs.
 * Contract pin embedded from frozen GASPER-006 provisional contracts.
 */

export const STUDIO_COMPILER_ID = "gasper-behavioral-compiler";
export const STUDIO_COMPILER_VERSION = "0.1.0-synthetic-provisional";

/** Frozen pin — keep in sync with packages/shared/.../compiler/contract-pin.json */
export const STUDIO_CONTRACT_PIN = {
  compiler_id: STUDIO_COMPILER_ID,
  compiler_version: STUDIO_COMPILER_VERSION,
  affect_anchors_version: "1.0.0-synthetic-provisional",
  affect_anchors_hash:
    "9f14ba71f5903d5b84f33b96dd58c4f272f91de5efcf4e11c2a4e5893aec4226",
  projection_grammar_version: "1.0.0-synthetic-provisional",
  projection_grammar_hash:
    "959a9b443e301364ddbb030a9718f05755f9550e0566b47fab32edf1c2e815b5",
  channel_registry_hash:
    "0c33e59613424141abf720f9902bc1a47d18589d030aa219d4982a28e901c0d7",
  routes_hash: "f9a99c31392fa5e7d80634224f94875b5ace440de6800cc0840a106507cc39e1",
  interrupt_grammar_hash:
    "813cba68ef3b94e114a55011c5f7c98520d486205a87d99e86f15791d99262dd",
  freeze_status: "GASPER-006_PROVISIONAL_CONTRACTS_FROZEN",
} as const;

const CLOSED_TAGS = new Set([
  "notice",
  "orient",
  "narrow_attention",
  "think",
  "knit",
  "realize",
  "excite",
  "compress",
  "launch",
  "travel",
  "settle",
  "return",
  "hold",
  "listen",
  "spark",
]);

export type StudioAffectPoint = {
  valence: number;
  arousal: number;
  expression_gain: number;
  attention: number;
  certainty: number;
  social_openness?: number;
  urgency?: number;
};

export type StudioAffectPhase = {
  id: string;
  label?: string;
  intent_tags: string[];
  duration_hint_ms?: { min: number; target: number; max: number };
  affect_target: StudioAffectPoint;
  embodiment_preference?: string;
  expression_anchor?: string;
  interrupt_class?: "soft" | "hard" | "barrier" | "morph_safe";
};

export type StudioPerformanceIntent = {
  schema: "gasper.performance.intent.v1";
  id: string;
  title?: string;
  seed: number;
  character?: string;
  identity_lock?: boolean;
  phases: StudioAffectPhase[];
  global_constraints?: Record<string, unknown>;
};

export type StudioCompileResult =
  | {
      ok: true;
      ir_hash: string;
      intent_hash: string;
      phase_ids: string[];
      contract_pin: typeof STUDIO_CONTRACT_PIN;
      ir: Record<string, unknown>;
    }
  | {
      ok: false;
      issues: string[];
      contract_pin: typeof STUDIO_CONTRACT_PIN;
    };

function q6(n: number): number {
  return Number(n.toFixed(6));
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
}

/** Pure FNV-1a 32-bit cascade → 64 hex chars (deterministic, browser-safe). */
export function contentHashHex(value: unknown): string {
  const s = stableStringify(value);
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x01000193) >>> 0;
  }
  // Expand to 64 hex for IR-hash shape stability (not crypto SHA-256).
  const parts: string[] = [];
  let a = h1;
  let b = h2;
  for (let i = 0; i < 8; i++) {
    a = Math.imul(a ^ (b + i), 0x85ebca6b) >>> 0;
    b = Math.imul(b ^ (a + i * 17), 0xc2b2ae35) >>> 0;
    parts.push(a.toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 64);
}

export function legalRoute(
  from: string,
  to: string,
): { route_id: string; hops: string[] } {
  if (from === to) return { route_id: `expr_only_${from}`, hops: [from] };
  if (from === "singularity" && (to === "comet" || to.startsWith("comet"))) {
    return {
      route_id: "singularity_via_presence_to_comet",
      hops: ["singularity", "presence", to === "comet" ? "comet-right" : to],
    };
  }
  return { route_id: `${from}_to_${to}`, hops: [from, to] };
}

export function validateStudioIntent(
  intent: StudioPerformanceIntent,
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (intent.schema !== "gasper.performance.intent.v1") issues.push("intent_invalid:schema");
  if (typeof intent.seed !== "number" || !Number.isFinite(intent.seed)) {
    issues.push("seed_required");
  }
  if (!Array.isArray(intent.phases) || intent.phases.length === 0) {
    issues.push("intent_invalid:phases");
  }
  for (const p of intent.phases || []) {
    for (const t of p.intent_tags || []) {
      if (!CLOSED_TAGS.has(t)) issues.push(`unknown_intent_tag:${t}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Compile PerformanceIntent → IR summary for Studio Affect job.
 * Deterministic pure function of intent (no DOM, no Node FS).
 */
export function compileStudioAffectIntent(
  intent: StudioPerformanceIntent,
): StudioCompileResult {
  const v = validateStudioIntent(intent);
  if (!v.ok) {
    return { ok: false, issues: v.issues, contract_pin: STUDIO_CONTRACT_PIN };
  }

  let t = 0;
  const affectSpans: Array<Record<string, unknown>> = [];
  const routes: Array<Record<string, unknown>> = [];
  const interruptPlan: Array<Record<string, unknown>> = [];
  const causalIndex: Array<Record<string, unknown>> = [];
  let emb = "presence";

  for (const phase of intent.phases) {
    const dur = phase.duration_hint_ms?.target ?? 700;
    const affect = Object.fromEntries(
      Object.entries(phase.affect_target).map(([k, val]) => [k, q6(Number(val))]),
    );
    affectSpans.push({
      t0_ms: t,
      t1_ms: t + dur,
      from: affect,
      to: affect,
      easing: "easeInOut",
      phase_id: phase.id,
    });
    const want = phase.embodiment_preference || "presence";
    const r = legalRoute(emb, want);
    routes.push({ phase_id: phase.id, ...r, from: emb, to: want });
    interruptPlan.push({
      phase_id: phase.id,
      interrupt_class: phase.interrupt_class || "soft",
    });
    causalIndex.push({
      t_ms: t,
      phase_id: phase.id,
      contributions: [
        {
          source: "affect.arousal",
          channels: ["energy_level", "eye_openness"],
          weight: 0.6,
        },
      ],
    });
    emb = want === "comet" ? "comet-right" : want;
    t += dur;
  }

  const intentHash = contentHashHex({
    schema: intent.schema,
    id: intent.id,
    seed: intent.seed,
    phases: intent.phases,
    global_constraints: intent.global_constraints || {},
  });

  const irBody = {
    schema: "gasper.performance.ir.v1" as const,
    ir_version: "1.0.0",
    compiler_id: STUDIO_COMPILER_ID,
    compiler_version: STUDIO_COMPILER_VERSION,
    intent_id: intent.id,
    intent_content_hash: intentHash,
    seed: intent.seed,
    contract_pin: STUDIO_CONTRACT_PIN,
    affect_trajectory: {
      sample_rate_hz_hint: 30,
      spans: affectSpans,
      holds: [] as unknown[],
    },
    channel_trajectories: {
      note: "piecewise_from_projection_at_phase_targets",
      phases: intent.phases.map((p) => p.id),
    },
    routes,
    interrupt_plan: interruptPlan,
    lowered: {
      schema_target: "gasper.document/1.2.0-or-compat",
      animation_plan_ref: null,
      clip_library_delta: null,
    },
    causal_index: causalIndex,
    validation: { status: "compiled" as const, issues: [] as string[] },
  };

  const ir_hash = contentHashHex(irBody);
  return {
    ok: true,
    ir_hash,
    intent_hash: intentHash,
    phase_ids: intent.phases.map((p) => p.id),
    contract_pin: STUDIO_CONTRACT_PIN,
    ir: { ...irBody, content_hash: ir_hash },
  };
}

export type AffectPresetId = "hold" | "notice-hold" | "thinking-knit";

export function buildPresetIntent(
  preset: AffectPresetId,
  seed: number,
): StudioPerformanceIntent {
  if (preset === "thinking-knit") {
    return {
      schema: "gasper.performance.intent.v1",
      id: "studio-thinking-knit",
      title: "Thinking knit",
      seed,
      character: "gasper",
      identity_lock: true,
      phases: [
        {
          id: "think",
          intent_tags: ["think", "knit"],
          duration_hint_ms: { min: 800, target: 1400, max: 2200 },
          affect_target: {
            valence: -0.05,
            arousal: 0.55,
            expression_gain: 0.5,
            attention: 0.8,
            certainty: 0.35,
          },
          embodiment_preference: "presence",
          expression_anchor: "thinking-knit",
        },
        {
          id: "settle",
          intent_tags: ["settle", "hold"],
          duration_hint_ms: { min: 400, target: 700, max: 1200 },
          affect_target: {
            valence: 0.2,
            arousal: 0.3,
            expression_gain: 0.35,
            attention: 0.4,
            certainty: 0.55,
          },
          embodiment_preference: "presence",
        },
      ],
    };
  }
  if (preset === "notice-hold") {
    return {
      schema: "gasper.performance.intent.v1",
      id: "studio-notice-hold",
      title: "Notice then hold",
      seed,
      character: "gasper",
      phases: [
        {
          id: "notice",
          intent_tags: ["notice", "orient"],
          duration_hint_ms: { min: 400, target: 700, max: 1200 },
          affect_target: {
            valence: 0.15,
            arousal: 0.35,
            expression_gain: 0.4,
            attention: 0.55,
            certainty: 0.3,
          },
          embodiment_preference: "presence",
          interrupt_class: "soft",
        },
        {
          id: "hold",
          intent_tags: ["hold"],
          duration_hint_ms: { min: 500, target: 900, max: 1400 },
          affect_target: {
            valence: 0.25,
            arousal: 0.28,
            expression_gain: 0.35,
            attention: 0.4,
            certainty: 0.5,
          },
          embodiment_preference: "presence",
        },
      ],
    };
  }
  // hold
  return {
    schema: "gasper.performance.intent.v1",
    id: "studio-hold",
    title: "Presence hold",
    seed,
    character: "gasper",
    phases: [
      {
        id: "hold",
        intent_tags: ["hold"],
        duration_hint_ms: { min: 500, target: 1000, max: 1600 },
        affect_target: {
          valence: 0.3,
          arousal: 0.3,
          expression_gain: 0.35,
          attention: 0.35,
          certainty: 0.5,
        },
        embodiment_preference: "presence",
      },
    ],
  };
}
