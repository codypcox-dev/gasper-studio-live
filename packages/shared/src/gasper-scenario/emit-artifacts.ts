/**
 * Emit STATE_SYSTEM artifacts as plain objects (tests / scripts write to disk).
 */

import { GASPER_CHANNEL_DOMAINS } from "./channels";
import { compileEightShowcase, evaluateEndpointFrame } from "./compiler";
import { buildPerceptualReviewManifest, computeDistinctnessBudget } from "./distinctness";
import { EIGHT_STATE_DEFINITIONS, listEightScenarioIds } from "./eight-states";
import { contentHash } from "./hash";
import {
  ABLATION_CANDIDATES,
  buildHistoricalMappingDocument,
} from "./historical-mapping";
import { assertLoopClosed, buildLoopManifest, LOOP_ORDER } from "./loop";
import type { EightScenarioId } from "./types";

export type StateSystemArtifacts = {
  EIGHT_STATE_SCENARIOS: Record<string, unknown>;
  EIGHT_STATE_CHANNEL_MATRIX_JSON: Record<string, unknown>;
  EIGHT_STATE_CHANNEL_MATRIX_CSV: string;
  DISTINCTNESS_BUDGET: Record<string, unknown>;
  LOOP_ROUTE: Record<string, unknown>;
  DETERMINISM_RESULTS: Record<string, unknown>;
  HISTORICAL_18_TO_8_MAPPING: Record<string, unknown>;
  ABLATION_CANDIDATES: Record<string, unknown>;
  PERCEPTUAL_REVIEW_MANIFEST: Record<string, unknown>;
  SCHEMA_DECISIONS_MD: string;
  COMPILER_TRACE_MD: string;
  HISTORICAL_18_TO_8_MAPPING_MD: string;
};

function channelMatrix(): {
  json: Record<string, unknown>;
  csv: string;
} {
  const rows: Array<Record<string, string | number>> = [];
  const header = ["scenario_id", "domain", "param", "value", "policy"];
  const lines = [header.join(",")];

  for (const id of listEightScenarioIds()) {
    const ch = EIGHT_STATE_DEFINITIONS[id].channels;
    for (const domain of GASPER_CHANNEL_DOMAINS) {
      const t = ch[domain];
      const policy = t.policy ?? "";
      for (const [param, value] of Object.entries(t.params)) {
        rows.push({
          scenario_id: id,
          domain,
          param,
          value,
          policy,
        });
        lines.push(
          [id, domain, param, String(value), JSON.stringify(policy)].join(","),
        );
      }
      if (Object.keys(t.params).length === 0) {
        rows.push({
          scenario_id: id,
          domain,
          param: "_policy",
          value: 0,
          policy,
        });
        lines.push([id, domain, "_policy", "0", JSON.stringify(policy)].join(","));
      }
    }
  }

  return {
    json: {
      schema: "gasper.eight-state-channel-matrix.v1",
      version: "1.0.0",
      domains: [...GASPER_CHANNEL_DOMAINS],
      scenario_ids: listEightScenarioIds(),
      rows,
      matrix_content_hash: contentHash(rows),
    },
    csv: lines.join("\n") + "\n",
  };
}

export function emitStateSystemArtifacts(): StateSystemArtifacts {
  const pass1 = compileEightShowcase();
  const pass2 = compileEightShowcase();
  const budget = computeDistinctnessBudget();
  const loop = buildLoopManifest();
  const historical = buildHistoricalMappingDocument();
  const perceptual = buildPerceptualReviewManifest();
  const matrix = channelMatrix();

  const scenarios = {
    schema: "gasper.eight-state-scenarios.v1",
    version: "1.0.0",
    compiler_id: pass1.results[0]?.ir.compiler_id,
    compiler_version: pass1.results[0]?.ir.compiler_version,
    order: LOOP_ORDER,
    scenarios: pass1.results.map(({ id, ir }) => ({
      id,
      title: ir.state.title,
      embodiment: ir.state.embodiment,
      cognitive_mode: ir.state.cognitive_mode,
      intent_content_hash: ir.intent_content_hash,
      state_content_hash: ir.state.state_content_hash,
      ir_content_hash: ir.content_hash,
      affect: ir.state.affect,
      appraisal: ir.state.appraisal,
      action_tendencies: ir.state.action_tendencies,
      social: ir.state.social,
      visual_semantic: ir.state.visual_semantic,
      historical_fixture_affinities: ir.state.historical_fixture_affinities,
      reduced_motion_policy: ir.state.reduced_motion_policy,
      binding_targets: ir.lowered.binding_targets,
      channel_domains: GASPER_CHANNEL_DOMAINS.map((d) => ({
        domain: d,
        params: ir.state.channel_targets[d].params,
        policy: ir.state.channel_targets[d].policy ?? null,
        binding_hints: ir.state.channel_targets[d].binding_hints ?? null,
      })),
      endpoint_frame: evaluateEndpointFrame(ir, 0),
    })),
    scenarios_content_hash: contentHash(pass1.hashes),
  };

  const determinism = {
    schema: "gasper.determinism-results.v1",
    version: "1.0.0",
    passes: 2,
    pass1_hashes: pass1.hashes,
    pass2_hashes: pass2.hashes,
    hashes_equal: Object.keys(pass1.hashes).every(
      (k) => pass1.hashes[k] === pass2.hashes[k],
    ),
    loop_content_hash: loop.loop_content_hash,
    loop_closed: assertLoopClosed(loop),
    distinctness_all_pairs_pass: budget.all_pairs_pass,
    distinctness_budget_hash: budget.budget_content_hash,
    results_content_hash: "",
  };
  determinism.results_content_hash = contentHash({
    pass1_hashes: determinism.pass1_hashes,
    pass2_hashes: determinism.pass2_hashes,
    hashes_equal: determinism.hashes_equal,
    loop_content_hash: determinism.loop_content_hash,
    distinctness_budget_hash: determinism.distinctness_budget_hash,
  });

  const SCHEMA_DECISIONS_MD = `# SCHEMA_DECISIONS — GASPER-007-G R2 State System

## Status
Accepted for implementation (R2 freeze surface for R3/R4 consumers).

## Contract family
| Type | Schema id |
|------|-----------|
| GasperScenarioIntentV1 | \`gasper.scenario.intent.v1\` |
| GasperScenarioStateV1 | \`gasper.scenario.state.v1\` |
| GasperStateIRV1 | \`gasper.scenario.ir.v1\` |
| GasperChannelTargetV1 | \`gasper.channel-target.v1\` |
| GasperTransitionPlanV1 | \`gasper.transition-plan.v1\` |
| GasperLoopManifestV1 | \`gasper.loop-manifest.v1\` |
| GasperEvaluatedFrameV1 | \`gasper.evaluated-frame.v1\` |
| GasperDistinctnessBudgetV1 | \`gasper.distinctness-budget.v1\` |
| GasperPerceptualReviewManifestV1 | \`gasper.perceptual-review-manifest.v1\` |

## Naming
Project uses \`gasper.scenario.*.v1\` schema strings (not bare class names) for fail-closed compile. TypeScript export names match MegaBook \`Gasper*V1\` list.

## Decisions
1. **Eight showcase IDs frozen** exactly as MegaBook §8 (no rename).
2. **Current-value start** is a compile input field separate from intent; never merged into intent; hashed as \`start_snapshot_hash\`.
3. **Fail closed**: invalid schema, unknown fields, missing identity locks, unknown scenario ids → \`ok:false\`, \`ir:null\`, no partial IR.
4. **Determinism**: content hashes use key-sorted stringify + float quantize q6; \`compiled_at\` optional and excluded from hash basis.
5. **Channels**: all 17 domains required on every state; binding_hints project to legacy domain scalars for R3.
6. **Distinctness**: provisional engineering gate (≥4 domains + form/motion/attention_face/energy_material); not human acceptance.
7. **Historical 18**: preserved as anchors; not deleted; mapped in HISTORICAL_18_TO_8_MAPPING.
8. **Comet executing** has no exclusive historical fixture family; affinities from mischievous-spark energy + embodiment routes.
9. **Wake route** is explicit transition kind \`wake\` from dormant-orbit-maintain → presence-neutral-settled.
10. **Package location**: pure compiler lives in \`packages/shared/src/gasper-scenario\` for tests; desktop re-exports under \`packages/desktop/src/gasper/scenario\`.

## Non-goals (R2)
- No GSAP timeline ownership (R4).
- No rig mesh authoring (R3).
- No packaged video proof (R5).
- No human visual acceptance (Cody only).
`;

  const COMPILER_TRACE_MD = `# COMPILER_TRACE — eight showcase compile

## Compiler
- id: \`${pass1.results[0]?.ir.compiler_id}\`
- version: \`${pass1.results[0]?.ir.compiler_version}\`

## Pass summary
| scenario_id | embodiment | ir_content_hash |
|-------------|------------|-----------------|
${pass1.results
  .map(
    (r) =>
      `| ${r.id} | ${r.ir.state.embodiment} | \`${r.ir.content_hash}\` |`,
  )
  .join("\n")}

## Loop
- closed: ${assertLoopClosed(loop)}
- loop_content_hash: \`${loop.loop_content_hash}\`
- wake: \`${loop.wake_route.transition_id}\`

## Distinctness
- all_pairs_pass: ${budget.all_pairs_pass}
- pairs: ${budget.pairs.length}
- confusion_flags: ${budget.confusion_flags.length ? budget.confusion_flags.join(", ") : "(none)"}

## Determinism
- dual-pass hashes equal: ${determinism.hashes_equal}

## Trace notes
1. Each state lowers to quantized binding_targets + full channel_targets.
2. Invalid intents never emit IR (fail closed).
3. Start snapshot is optional provenance only.
`;

  const HISTORICAL_MD = `# HISTORICAL_18_TO_8_MAPPING

Source: \`crates/expression-core\` \`AnchorRegistry::gasper_v655_legacy\` (18 fixtures).

## Rule
Do not erase historical fixtures. Map them to affinities, anchors, transition precedents, visual candidates, or ablation controls.

## Primary anchors by showcase state

${(Object.entries(historical.scenario_primary_sources) as [EightScenarioId, string[]][])
  .map(([id, list]) => `### ${id}\n- ${list.join("\n- ")}`)
  .join("\n\n")}

## Full fixture table

| fixture_id | family | primary_scenario | role |
|------------|--------|------------------|------|
${historical.fixtures
  .map(
    (f) =>
      `| ${f.fixture_id} | ${f.legacy_family} | ${f.primary_scenario ?? "—"} | ${f.role} |`,
  )
  .join("\n")}

## Native bridges
${historical.native_bridges.map((b) => `- **${b.fixture_id}** → ${b.primary_scenario ?? "bridge-only"} — ${b.notes}`).join("\n")}
`;

  return {
    EIGHT_STATE_SCENARIOS: scenarios,
    EIGHT_STATE_CHANNEL_MATRIX_JSON: matrix.json,
    EIGHT_STATE_CHANNEL_MATRIX_CSV: matrix.csv,
    DISTINCTNESS_BUDGET: budget as unknown as Record<string, unknown>,
    LOOP_ROUTE: loop as unknown as Record<string, unknown>,
    DETERMINISM_RESULTS: determinism,
    HISTORICAL_18_TO_8_MAPPING: historical as unknown as Record<string, unknown>,
    ABLATION_CANDIDATES: {
      schema: "gasper.ablation-candidates.v1",
      version: "1.0.0",
      candidates: ABLATION_CANDIDATES,
    },
    PERCEPTUAL_REVIEW_MANIFEST: perceptual as unknown as Record<string, unknown>,
    SCHEMA_DECISIONS_MD,
    COMPILER_TRACE_MD,
    HISTORICAL_18_TO_8_MAPPING_MD: HISTORICAL_MD,
  };
}
