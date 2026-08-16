/**
 * Pure deterministic scenario compiler.
 * Fail closed · stable hashes · no mutation on fail · current-value start separate.
 */

import { GASPER_CHANNEL_DOMAINS } from "./channels";
import {
  EIGHT_STATE_DEFINITIONS,
  isEightScenarioId,
} from "./eight-states";
import { contentHash, q6 } from "./hash";
import type {
  CompileInputV1,
  CompileResultV1,
  EightScenarioId,
  GasperEvaluatedFrameV1,
  GasperScenarioIntentV1,
  GasperScenarioStateV1,
  GasperStateIRV1,
  ValidationIssueV1,
} from "./types";
import {
  EIGHT_SCENARIO_IDS,
  SCENARIO_COMPILER_ID,
  SCENARIO_COMPILER_VERSION,
} from "./types";

function issue(
  code: string,
  message: string,
  path?: string,
  severity: ValidationIssueV1["severity"] = "error",
): ValidationIssueV1 {
  return { code, message, path, severity };
}

/** Validate intent without mutating input. */
export function validateScenarioIntent(
  intent: GasperScenarioIntentV1,
): ValidationIssueV1[] {
  const issues: ValidationIssueV1[] = [];
  if (intent.schema !== "gasper.scenario.intent.v1") {
    issues.push(issue("intent_invalid_schema", "schema must be gasper.scenario.intent.v1"));
  }
  if (!intent.id || typeof intent.id !== "string") {
    issues.push(issue("intent_missing_id", "id required", "id"));
  }
  if (typeof intent.seed !== "number" || !Number.isFinite(intent.seed)) {
    issues.push(issue("seed_required", "finite seed required", "seed"));
  }
  if (!intent.embodiment) {
    issues.push(issue("embodiment_required", "embodiment required", "embodiment"));
  }
  if (!intent.identity?.identity_lock) {
    issues.push(
      issue("identity_lock_required", "identity.identity_lock must be true", "identity"),
    );
  }
  if (!intent.identity?.topology_lock) {
    issues.push(
      issue("topology_lock_required", "identity.topology_lock must be true", "identity"),
    );
  }
  if (intent.identity && intent.identity.no_color_only_distinction !== true) {
    issues.push(
      issue(
        "color_only_forbidden",
        "no_color_only_distinction must be true",
        "identity",
      ),
    );
  }
  if (intent.identity && intent.identity.no_mouth_only_distinction !== true) {
    issues.push(
      issue(
        "mouth_only_forbidden",
        "no_mouth_only_distinction must be true",
        "identity",
      ),
    );
  }
  // Reject unknown top-level fields (fail closed on unsupported unknowns).
  const allowed = new Set([
    "schema",
    "id",
    "title",
    "seed",
    "event",
    "appraisal",
    "affect",
    "action_tendencies",
    "cognition",
    "social",
    "embodiment",
    "visual_semantic",
    "historical_fixture_affinities",
    "identity",
    "reduced_motion_policy",
    "validation_status",
    "provenance",
  ]);
  for (const k of Object.keys(intent as object)) {
    if (!allowed.has(k)) {
      issues.push(
        issue("unsupported_field", `unsupported unknown field: ${k}`, k),
      );
    }
  }
  const affect = intent.affect;
  if (affect) {
    for (const key of ["valence", "arousal", "expression_gain", "attention", "certainty"] as const) {
      const v = affect[key];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        issues.push(issue("affect_invalid", `affect.${key} must be finite number`, `affect.${key}`));
      }
    }
  } else {
    issues.push(issue("affect_required", "affect required", "affect"));
  }
  return issues;
}

function quantizeRecord(r: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(r).sort()) {
    out[k] = q6(r[k]!);
  }
  return out;
}

function intentHashBasis(intent: GasperScenarioIntentV1): unknown {
  // Exclude volatile provenance notes variance only if needed — full intent is canonical.
  return {
    schema: intent.schema,
    id: intent.id,
    title: intent.title,
    seed: intent.seed,
    event: intent.event,
    appraisal: intent.appraisal,
    affect: intent.affect,
    action_tendencies: intent.action_tendencies,
    cognition: intent.cognition,
    social: intent.social,
    embodiment: intent.embodiment,
    visual_semantic: intent.visual_semantic,
    historical_fixture_affinities: intent.historical_fixture_affinities || [],
    identity: intent.identity,
    reduced_motion_policy: intent.reduced_motion_policy,
    validation_status: intent.validation_status,
  };
}

/**
 * Compile a single scenario intent to State IR.
 * Does not mutate `input.intent` or `current_value_start`.
 */
export function compileScenario(input: CompileInputV1): CompileResultV1 {
  const intentSnapshot = structuredClone(input.intent);
  const issues = validateScenarioIntent(intentSnapshot);
  if (issues.some((i) => i.severity === "error")) {
    return {
      ok: false,
      error: "intent_invalid",
      issues,
      ir: null,
    };
  }

  const id = intentSnapshot.id;
  if (!isEightScenarioId(id)) {
    // Allow compile of registered eight only for showcase compiler path.
    return {
      ok: false,
      error: "unknown_scenario_id",
      issues: [
        issue(
          "unknown_scenario_id",
          `scenario id not in eight showcase set: ${id}`,
          "id",
        ),
      ],
      ir: null,
    };
  }

  const def = EIGHT_STATE_DEFINITIONS[id];
  // Channel completeness check
  for (const domain of GASPER_CHANNEL_DOMAINS) {
    if (!def.channels[domain]) {
      return {
        ok: false,
        error: "channel_incomplete",
        issues: [
          issue(
            "channel_incomplete",
            `missing channel domain ${domain}`,
            `channels.${domain}`,
          ),
        ],
        ir: null,
      };
    }
  }

  const intent_content_hash = contentHash(intentHashBasis(intentSnapshot));
  const channel_targets = structuredClone(def.channels);
  const binding_targets = quantizeRecord(def.binding_targets);

  const state: GasperScenarioStateV1 = {
    schema: "gasper.scenario.state.v1",
    id,
    title: intentSnapshot.title,
    embodiment: intentSnapshot.embodiment,
    cognitive_mode: intentSnapshot.cognition.mode,
    intent_content_hash,
    state_content_hash: "", // filled below
    channel_targets,
    affect: intentSnapshot.affect,
    appraisal: intentSnapshot.appraisal,
    action_tendencies: intentSnapshot.action_tendencies,
    social: intentSnapshot.social,
    identity: intentSnapshot.identity,
    reduced_motion_policy: intentSnapshot.reduced_motion_policy,
    historical_fixture_affinities:
      intentSnapshot.historical_fixture_affinities || [],
    visual_semantic: intentSnapshot.visual_semantic || [],
    validation_status: intentSnapshot.validation_status,
  };

  const stateHashBasis = {
    schema: state.schema,
    id: state.id,
    title: state.title,
    embodiment: state.embodiment,
    cognitive_mode: state.cognitive_mode,
    intent_content_hash: state.intent_content_hash,
    channel_targets: state.channel_targets,
    affect: state.affect,
    appraisal: state.appraisal,
    action_tendencies: state.action_tendencies,
    social: state.social,
    identity: state.identity,
    reduced_motion_policy: state.reduced_motion_policy,
    historical_fixture_affinities: state.historical_fixture_affinities,
    visual_semantic: state.visual_semantic,
    binding_targets,
  };
  state.state_content_hash = contentHash(stateHashBasis);

  const start =
    input.current_value_start == null
      ? null
      : quantizeRecord({ ...input.current_value_start });
  const start_snapshot_hash = start ? contentHash(start) : null;

  const irBody = {
    schema: "gasper.scenario.ir.v1" as const,
    ir_version: "1.0.0" as const,
    compiler_id: SCENARIO_COMPILER_ID,
    compiler_version: SCENARIO_COMPILER_VERSION,
    scenario_id: id,
    seed: intentSnapshot.seed,
    intent_content_hash,
    state,
    start_snapshot_hash,
    lowered: {
      binding_targets,
      channel_domain_count: GASPER_CHANNEL_DOMAINS.length,
      accepted: true as const,
    },
    validation: {
      status: "compiled" as const,
      issues: [] as ValidationIssueV1[],
    },
  };

  const content_hash = contentHash({
    ...irBody,
    // exclude state object identity noise — use hashes
    state: {
      id: state.id,
      state_content_hash: state.state_content_hash,
      intent_content_hash: state.intent_content_hash,
    },
  });

  const ir: GasperStateIRV1 = {
    ...irBody,
    content_hash,
  };

  if (input.include_compiled_at) {
    ir.compiled_at = new Date().toISOString();
  }

  // Prove no mutation of caller intent object identity fields if same reference.
  // We already cloned; return pure result.
  return { ok: true, ir };
}

/** Compile all eight showcase scenarios deterministically. */
export function compileEightShowcase(seedBase = 0): {
  ok: true;
  results: Array<{ id: EightScenarioId; ir: GasperStateIRV1 }>;
  hashes: Record<string, string>;
} {
  const results: Array<{ id: EightScenarioId; ir: GasperStateIRV1 }> = [];
  const hashes: Record<string, string> = {};
  for (const id of EIGHT_SCENARIO_IDS) {
    const def = EIGHT_STATE_DEFINITIONS[id];
    const intent = structuredClone(def.intent);
    if (seedBase) intent.seed = def.intent.seed + seedBase;
    const r = compileScenario({ intent });
    if (!r.ok) {
      throw new Error(`compile failed for ${id}: ${r.issues.map((i) => i.code).join(",")}`);
    }
    results.push({ id, ir: r.ir });
    hashes[id] = r.ir.content_hash;
  }
  return { ok: true, results, hashes };
}

/** Evaluate a static endpoint frame (t=0 hold) for evidence. */
export function evaluateEndpointFrame(
  ir: GasperStateIRV1,
  t_ms = 0,
): GasperEvaluatedFrameV1 {
  const channel_digest = {} as GasperEvaluatedFrameV1["channel_digest"];
  for (const domain of GASPER_CHANNEL_DOMAINS) {
    channel_digest[domain] = contentHash(ir.state.channel_targets[domain]);
  }
  const binding_targets = quantizeRecord(ir.lowered.binding_targets);
  const frame: GasperEvaluatedFrameV1 = {
    schema: "gasper.evaluated-frame.v1",
    scenario_id: ir.scenario_id,
    t_ms,
    seed: ir.seed,
    embodiment: ir.state.embodiment,
    binding_targets,
    channel_digest,
    frame_content_hash: "",
  };
  frame.frame_content_hash = contentHash({
    schema: frame.schema,
    scenario_id: frame.scenario_id,
    t_ms: frame.t_ms,
    seed: frame.seed,
    embodiment: frame.embodiment,
    binding_targets: frame.binding_targets,
    channel_digest: frame.channel_digest,
  });
  return frame;
}

/** Intent for a registered eight-state id (clone). */
export function getCanonicalIntent(id: EightScenarioId): GasperScenarioIntentV1 {
  return structuredClone(EIGHT_STATE_DEFINITIONS[id].intent);
}
