/**
 * Deterministic behavioral compiler spine (D006 — provisional).
 * Pins contract versions/hashes; pure function of intent + seed + registries.
 * Future affect-anchors.v2.json swaps via pin fields only.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const COMPILER_ID = "gasper-behavioral-compiler";
export const COMPILER_VERSION = "0.1.0-synthetic-provisional";

const HERE = dirname(fileURLToPath(import.meta.url));

function loadJson(name: string): unknown {
  const candidates = [
    join(HERE, name),
    join(HERE, "..", name),
    join(HERE, "..", "..", "src", "gasper-performance", name),
    join(HERE, "..", "..", "src", "gasper-performance", "compiler", name),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, "utf8"));
    } catch {
      /* next */
    }
  }
  throw new Error(`compiler registry missing: ${name}`);
}

export type AffectPoint = {
  valence: number;
  arousal: number;
  expression_gain: number;
  attention: number;
  certainty: number;
  social_openness?: number;
  urgency?: number;
};

export type PerformanceIntentPhase = {
  id: string;
  label?: string;
  intent_tags: string[];
  duration_hint_ms?: { min: number; target: number; max: number };
  affect_target: AffectPoint;
  embodiment_preference?: string;
  expression_anchor?: string;
  interrupt_class?: "soft" | "hard" | "barrier" | "morph_safe";
};

export type PerformanceIntent = {
  schema: "gasper.performance.intent.v1";
  id: string;
  title?: string;
  seed: number;
  character?: string;
  identity_lock?: boolean;
  phases: PerformanceIntentPhase[];
  global_constraints?: Record<string, unknown>;
};

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

export function contentHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function contractPin() {
  const pin = loadJson("contract-pin.json") as Record<string, unknown>;
  const anchors = loadJson("../affect-anchors.v1.json") as { version?: string };
  const projection = loadJson("../affect-projection.v1.json") as { version?: string };
  return {
    compiler_id: COMPILER_ID,
    compiler_version: COMPILER_VERSION,
    affect_anchors_version: (pin.affect_anchors_version as string) ?? anchors.version ?? null,
    affect_anchors_hash: (pin.affect_anchors_hash as string) ?? null,
    projection_grammar_version:
      (pin.projection_grammar_version as string) ?? projection.version ?? null,
    projection_grammar_hash: (pin.projection_grammar_hash as string) ?? null,
    channel_registry_hash: (pin.channel_registry_hash as string) ?? null,
    routes_hash: (pin.routes_hash as string) ?? null,
    interrupt_grammar_hash: (pin.interrupt_grammar_hash as string) ?? null,
  };
}

export function validateIntent(intent: PerformanceIntent): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (intent.schema !== "gasper.performance.intent.v1") issues.push("intent_invalid:schema");
  if (typeof intent.seed !== "number" || !Number.isFinite(intent.seed)) issues.push("seed_required");
  if (!Array.isArray(intent.phases) || intent.phases.length === 0) issues.push("intent_invalid:phases");
  for (const p of intent.phases || []) {
    for (const t of p.intent_tags || []) {
      if (!CLOSED_TAGS.has(t)) issues.push(`unknown_intent_tag:${t}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

/** O02: singularity → comet mediated via presence. */
export function legalRoute(from: string, to: string): { route_id: string; hops: string[] } {
  if (from === to) return { route_id: `expr_only_${from}`, hops: [from] };
  if (from === "singularity" && (to === "comet" || to.startsWith("comet"))) {
    return {
      route_id: "singularity_via_presence_to_comet",
      hops: ["singularity", "presence", to === "comet" ? "comet-right" : to],
    };
  }
  return { route_id: `${from}_to_${to}`, hops: [from, to] };
}

export function compilePerformance(intent: PerformanceIntent) {
  const v = validateIntent(intent);
  if (!v.ok) {
    return {
      ok: false as const,
      error: "intent_invalid",
      issues: v.issues,
      contract_pin: contractPin(),
    };
  }

  const pin = contractPin();
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
        { source: "affect.arousal", channels: ["energy_level", "eye_openness"], weight: 0.6 },
      ],
    });
    emb = want === "comet" ? "comet-right" : want;
    t += dur;
  }

  const intentHash = contentHash({
    schema: intent.schema,
    id: intent.id,
    seed: intent.seed,
    phases: intent.phases,
    global_constraints: intent.global_constraints || {},
  });

  const irBody = {
    schema: "gasper.performance.ir.v1" as const,
    ir_version: "1.0.0",
    compiler_id: COMPILER_ID,
    compiler_version: COMPILER_VERSION,
    intent_id: intent.id,
    intent_content_hash: intentHash,
    seed: intent.seed,
    contract_pin: pin,
    affect_trajectory: { sample_rate_hz_hint: 30, spans: affectSpans, holds: [] as unknown[] },
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

  const content_hash = contentHash(irBody);
  return {
    ok: true as const,
    ir: { ...irBody, content_hash },
    intent_hash: intentHash,
    ir_hash: content_hash,
    contract_pin: pin,
  };
}

export function dualCompileIdentical(intent: PerformanceIntent): boolean {
  const a = compilePerformance(intent);
  const b = compilePerformance(intent);
  if (!a.ok || !b.ok) return false;
  return a.ir_hash === b.ir_hash;
}
