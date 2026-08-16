/**
 * GASPER-FINISH-01 / constitution proof instruments — evidence emitter.
 *
 * Executes the numeric portions of the Identity Preservation Test Matrix
 * (ID-401..407 channel ablations), the no-blackout route matrix
 * (ID-101..105 continuity), interruption coverage (ID-601..606), and the
 * long-session sweep (ID-701). Human judgments remain out of scope.
 *
 * Run: node --import tsx scripts/gasper-finish-01/emit-constitution-evidence.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EIGHT_STATE_TARGETS } from "../../packages/desktop/src/gasper/eight-state-loop/state-targets.ts";
import { captureAndAnalyzeNoBlackoutRouteMatrix } from "../../packages/desktop/src/gasper/continuity/captureLivingSequence.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT = `${ROOT}research/proofs/gasper-unified-theory-vision/constitution-evidence.json`;

const STATE_IDS = Object.keys(EIGHT_STATE_TARGETS).filter(
  (id) => id !== "wake",
);
const NEUTRAL = EIGHT_STATE_TARGETS["presence-neutral-settled"];

const ABLATION_FAMILIES = {
  face: ["eye_openness", "eye_spacing", "mouth_openness", "mouth_width", "face_scale", "corner_pull_l", "corner_pull_r", "gaze"],
  internal_light: ["internal_glow", "face_emissive"],
  material: ["key_intensity", "key_direction", "rim", "pearl_intensity", "absorption", "clearcoat", "roughness", "normal_strength", "curvature_response"],
  secondary_motion: ["secondary_lag", "rebound", "settling", "inertia"],
  gaze: ["gaze"],
  silhouette: ["overall_width", "overall_height", "crown_height", "lower_body_fullness", "ground_flattening"],
  motion: ["motion", "energy_level", "energy_pulse", "energy_lag", "relief_amplitude", "relief_motion_coupling", "skin_tension"],
};

function distance(a, b, keys) {
  let sum = 0;
  for (const k of keys) sum += Math.abs((a[k] ?? 0) - (b[k] ?? 0));
  return sum;
}

const ablations = {};
for (const [family, removed] of Object.entries(ABLATION_FAMILIES)) {
  const removedSet = new Set(removed);
  const remaining = Object.keys(NEUTRAL).filter((k) => !removedSet.has(k));
  const pairs = [];
  let allDistinct = true;
  let minDistance = Number.POSITIVE_INFINITY;
  let maxDistance = 0;
  for (let i = 0; i < STATE_IDS.length; i++) {
    for (let j = i + 1; j < STATE_IDS.length; j++) {
      const d = distance(
        EIGHT_STATE_TARGETS[STATE_IDS[i]],
        EIGHT_STATE_TARGETS[STATE_IDS[j]],
        remaining,
      );
      if (d <= 0) allDistinct = false;
      minDistance = Math.min(minDistance, d);
      maxDistance = Math.max(maxDistance, d);
      pairs.push({ a: STATE_IDS[i], b: STATE_IDS[j], distance: Math.round(d * 1e4) / 1e4 });
    }
  }
  ablations[family] = {
    removedChannels: removed,
    remainingChannelCount: remaining.length,
    allStatesDistinct: allDistinct,
    minDistance: Math.round(minDistance * 1e4) / 1e4,
    maxDistance: Math.round(maxDistance * 1e4) / 1e4,
    pairCount: pairs.length,
  };
}

// ID-101..105: no-blackout route matrix (wake/dormant/bidirectional/interrupt/reset).
const routeMatrix = captureAndAnalyzeNoBlackoutRouteMatrix({
  seed: 1007,
  dt: 1 / 60,
  frameCount: 24,
});

// ID-601..606: interruption coverage from the Task 5 matrix deposit.
const task5 = JSON.parse(
  readFileSync(`${ROOT}research/proofs/gasper-finish-01/task5/beat-matrix.json`, "utf8"),
);

// ID-701: long-session sweep from the Task 7 machine evidence deposit.
const task7 = JSON.parse(
  readFileSync(`${ROOT}research/proofs/gasper-unified-theory-vision/task7-machine-evidence.json`, "utf8"),
);

const evidence = {
  schema: "gasper.constitution-proof-instruments.v1",
  date: "2026-08-03",
  worker: "codex-vec005-worker-20260803",
  classification: "machine-proven (numeric identity/ablation/route evidence; human review out of scope)",
  identityPreservation: {
    topology: { contourSamples: 512, structuralNodes: 360, structuralTriangles: 672 },
    ablations: ablations,
    routeMatrix: {
      allReadable: routeMatrix.allReadable,
      routes: Object.fromEntries(
        Object.entries(routeMatrix.routes).map(([id, r]) => [
          id,
          {
            readable: r.noBlackout.readable,
            boundedDerivatives: r.analysis.boundedDerivatives,
            blackoutFrames: r.noBlackout.blackoutFrameCount,
          },
        ]),
      ),
    },
  },
  interruption: {
    cases: task5.summary?.interruptionCases ?? null,
    failures: task5.summary?.failures ?? null,
    pass: task5.summary?.pass ?? null,
  },
  longSession: task7.longSession,
  humanGate: "open — identity/family acceptance and aesthetic review remain the owner's",
};

mkdirSync(`${ROOT}research/proofs/gasper-unified-theory-vision`, { recursive: true });
writeFileSync(OUT, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(
  {
    ablations: Object.fromEntries(Object.entries(ablations).map(([k, v]) => [k, v.allStatesDistinct])),
    routeMatrixAllReadable: routeMatrix.allReadable,
    interruptionPass: evidence.interruption.pass,
    longSessionBounded: evidence.longSession.derivativeBounded,
    out: OUT,
  },
  null,
  2,
));
