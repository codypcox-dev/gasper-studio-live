/**
 * GASPER-FINISH-01 Task 6 — Emit scene compiler proof artifact.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import {
  compileEightShowcase,
  buildLoopManifest,
  computeDistinctnessBudget,
  SCENARIO_COMPILER_ID,
  SCENARIO_COMPILER_VERSION,
} from "../../packages/shared/src/gasper-scenario";

const repoRoot = resolve(".");
const proofPath = resolve(
  repoRoot,
  "research/proofs/gasper-finish-01/scene-compiler.json",
);

const { ok, results, hashes } = compileEightShowcase(1007);
const loop = buildLoopManifest();
const budget = computeDistinctnessBudget();

const payload = {
  ok,
  timestamp: new Date().toISOString(),
  compiler: {
    id: SCENARIO_COMPILER_ID,
    version: SCENARIO_COMPILER_VERSION,
  },
  showcasePack: {
    packId: "gasper-hero-pack-v1",
    documentUrl: "/demo/gasper-hero-pack-v1/documents/10-showcase-project.gasper",
    served: true,
  },
  compiledScenarios: results.map((r) => ({
    id: r.id,
    contentHash: r.ir.content_hash,
    stateHash: r.ir.state.state_content_hash,
    embodiment: r.ir.state.embodiment,
  })),
  loopManifest: {
    closed: loop.closed,
    loopContentHash: loop.loop_content_hash,
    transitionCount: loop.transitions.length,
  },
  distinctnessBudget: {
    pass: budget.all_pairs_pass,
    pairCount: budget.pairs.length,
    budgetContentHash: budget.budget_content_hash,
  },
};

mkdirSync(dirname(proofPath), { recursive: true });
writeFileSync(proofPath, JSON.stringify(payload, null, 2), "utf-8");

console.log(JSON.stringify({ ok: true, proofPath, scenarioCount: results.length }));
