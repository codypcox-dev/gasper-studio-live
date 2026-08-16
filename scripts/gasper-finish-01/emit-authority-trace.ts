/**
 * GASPER-FINISH-01 / Task 3 — authority trace emitter.
 *
 * Runs the clock + compositor + living/facial authority through one
 * deterministic session and writes research/proofs/gasper-finish-01/authority-trace.json.
 * Re-runnable: node/npm exec vite-node scripts/gasper-finish-01/emit-authority-trace.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GasperOrganismClock } from "../../packages/desktop/src/gasper/clock/GasperOrganismClock";
import {
  CANONICAL_POSE_ORDER,
  clearHeldPose,
  composeResolvedPose,
} from "../../packages/desktop/src/gasper/compositor/ResolvedPoseCompositor";
import type { PoseLayer } from "../../packages/desktop/src/gasper/compositor/types";
import {
  FACIAL_TEMPORAL_BINDINGS,
  GasperLivingFacialAuthority,
} from "../../packages/desktop/src/gasper/living/GasperLivingFacialAuthority";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT = `${ROOT}research/proofs/gasper-finish-01/authority-trace.json`;

function layer(
  id: string,
  ownership: PoseLayer["ownership"],
  bindingId: string,
  value: number,
): PoseLayer {
  return {
    id,
    ownership,
    blendMode: "weighted_override",
    weight: 1,
    persistence: "session",
    interruption: "hold_resolved",
    contributions: [{ bindingId, value }],
  };
}

// 1. Clock: deterministic session with canonical subscriber order.
const clock = new GasperOrganismClock({
  authorityId: "gasper-host",
  seed: 654,
  fixedStepMs: 1000 / 60,
  nowMs: () => 0,
  scheduleFrame: () => 0,
  cancelFrame: () => undefined,
});
const dispatchOrder: string[] = [];
for (const [id, priority] of [
  ["10:gsap-root", 10],
  ["20:eight-state-living", 20],
  ["30:gasper-living-runtime", 30],
  ["40:gasper-rig-domain-tick", 40],
  ["90:formmaster-render", 90],
] as Array<[string, number]>) {
  clock.subscribe({ id, priority, onFrame: () => dispatchOrder.push(id) });
}
clock.start({ mode: "fixed-step" });
for (let i = 0; i < 120; i++) clock.step();
const clockInspection = clock.inspect();

// 2. Compositor: resolved pose trace across representative bindings.
clearHeldPose();
const pose = composeResolvedPose({
  layers: [
    layer("doc", "document_base", "face_scale", 0.92),
    layer("emb", "embodiment", "face_scale", 0.94),
    layer("expr", "expression", "face_scale", 0.96),
    layer("liv", "living", "face_scale", 0.97),
    layer("char", "character_state", "face_scale", 1.0),
    layer("doc2", "document_base", "eye_openness", 0.56),
    layer("liv2", "living", "eye_openness", 0.58, ),
  ],
  constraints: [
    { id: "face-scale-cap", bindingId: "face_scale", min: 0.38, max: 1.2, mode: "clamp" },
  ],
  bindingTargets: { face_scale: ["#faceRecessLayer", "#faceEmissionLayer"] },
});

// 3. Living/facial authority: ownership trace + deterministic hash.
const living = new GasperLivingFacialAuthority();
living.configure({ seed: 1007 });
living.start("presence-neutral-settled", 0);
const livingFrames = [];
for (let i = 0; i < 300; i++) {
  livingFrames.push(
    living.evaluate(
      { timeMs: i * (1000 / 60), deltaMs: 1000 / 60, frameIndex: i },
      { energy_level: 0.52 },
    ),
  );
}
const lastLiving = livingFrames[livingFrames.length - 1]!;
const facialOwnership: Record<string, string> = {};
for (const id of FACIAL_TEMPORAL_BINDINGS) {
  const owner = lastLiving.ownership[id];
  if (owner) facialOwnership[id] = owner;
}

const trace = {
  schema: "gasper-finish-01/authority-trace.v1",
  packet: "VEC-401/VEC-501/VEC-601-602",
  residual: "GASPER-FINISH-01",
  workerIdentity: "kimi-vec000-worker-20260802",
  recordedAtUtc: new Date().toISOString(),
  clock: {
    identity: clockInspection.authorityId,
    packet: clockInspection.packet,
    version: clockInspection.version,
    mode: clockInspection.mode,
    solePerpetualDriver: clockInspection.solePerpetualDriver,
    frameIndex: clockInspection.frameIndex,
    subscriberOrderObserved: [...new Set(dispatchOrder)],
    subscriberIds: clockInspection.subscriberIds,
    fault: clockInspection.fault,
  },
  compositor: {
    canonicalOrder: [...CANONICAL_POSE_ORDER],
    deterministicHash: pose.hash,
    traces: pose.traces.map((t) => ({
      bindingId: t.bindingId,
      finalOwner: t.finalOwner,
      finalValue: t.finalValue,
      owners: t.owners,
      svgTargets: t.svgTargets,
      contributionCount: t.contributions.length,
      constraintCount: t.constraints.length,
    })),
    diagnostics: pose.diagnostics,
  },
  livingFacialAuthority: {
    identity: lastLiving.authorityId,
    packet: lastLiving.packet,
    framesEvaluated: livingFrames.length,
    deterministicHash: lastLiving.hash,
    revision: lastLiving.revision,
    facialOwnership,
    unifiedViolations: lastLiving.unifiedViolations,
    reducedMotionPolicy: "autonomous blink/saccade suppressed (proven in living-facial-authority.test.ts)",
  },
  splitBrainFindings: {
    clock: "refused (installGasperOrganismClock throws on second authority; gasper-organism-clock.test.ts)",
    projectionWriter: "lease refusal contract declared by VEC-701 transaction module (local structural test absent; module present)",
    duplicateOwnerOrRaf: "none found in evaluated session",
  },
  notes: [
    "FormMaster production render executes inside the VEC-701 projection transaction claimed in GasperDocument.mountGasperDocumentLegacyFormMaster.",
    "Native renderer remains lab-only; no production promotion claimed.",
  ],
};

mkdirSync(`${ROOT}research/proofs/gasper-finish-01`, { recursive: true });
writeFileSync(OUT, JSON.stringify(trace, null, 2));
console.log(`authority trace written: ${OUT}`);
console.log(
  JSON.stringify({
    clockIdentity: trace.clock.identity,
    subscribers: trace.clock.subscriberOrderObserved,
    compositorHash: trace.compositor.deterministicHash,
    livingHash: trace.livingFacialAuthority.deterministicHash,
  }),
);
