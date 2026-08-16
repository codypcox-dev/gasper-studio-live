/**
 * GASPER-FINISH-01 — 60fps deterministic capture of the VEC-101 changed route.
 *
 * presence -> singularity -> dormant-orbit -> presence at fixed 60fps steps,
 * resolving the production face-visibility policy and the living/facial
 * authority on every frame. Writes:
 *   research/proofs/gasper-finish-01/visual/face-route-60fps.jsonl (per-frame)
 *   research/proofs/gasper-finish-01/visual/face-route-60fps-analysis.json
 * Re-runnable: npm exec vite-node scripts/gasper-finish-01/capture-face-route-60fps.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  analyzeNoBlackoutSequence,
  PROJECTOR_FACE_VIS_FLOORS,
  resolveProjectorFaceVisibility,
} from "../../packages/desktop/src/gasper/continuity/noBlackoutInvariant";
import type { ContinuityFrame } from "../../packages/desktop/src/gasper/continuity/types";
import { GasperLivingFacialAuthority } from "../../packages/desktop/src/gasper/living/GasperLivingFacialAuthority";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIR = `${ROOT}research/proofs/gasper-finish-01/visual`;
const DT_MS = 1000 / 60;

/** Mirrors FORM_PROFILES face flags in all-script-3.js (wiring-asserted by gasper-face-continuity.test.ts). */
const FACE: Record<string, boolean> = {
  presence: true,
  singularity: false,
  "dormant-orbit": false,
};

const LEGS: Array<{ from: string; to: string; seconds: number }> = [
  { from: "presence", to: "presence", seconds: 1.0 },
  { from: "presence", to: "singularity", seconds: 1.5 },
  { from: "singularity", to: "singularity", seconds: 1.0 },
  { from: "singularity", to: "dormant-orbit", seconds: 1.5 },
  { from: "dormant-orbit", to: "dormant-orbit", seconds: 2.0 }, // long dormant hold
  { from: "dormant-orbit", to: "presence", seconds: 1.5 }, // wake
  { from: "presence", to: "presence", seconds: 1.0 },
];

function hint(from: string, to: string): "wake" | "dormant" | "ordinary" {
  if (!FACE[from] && FACE[to]) return "wake";
  if (!FACE[to]) return "dormant";
  return "ordinary";
}

const living = new GasperLivingFacialAuthority();
living.configure({ seed: 1007 });
living.start("presence-neutral-settled", 0);

const lines: string[] = [];
const frames: ContinuityFrame[] = [];
let frameIndex = 0;
let minFaceVis = 1;
let minEmission = 1;
let belowFloorCount = 0;

for (const leg of LEGS) {
  const legFrames = Math.round(leg.seconds * 60);
  const routeHint = hint(leg.from, leg.to);
  for (let i = 0; i < legFrames; i++) {
    const progress = leg.from === leg.to ? 1 : i / (legFrames - 1);
    const fv = resolveProjectorFaceVisibility({
      progress,
      fromFace: FACE[leg.from]!,
      toFace: FACE[leg.to]!,
      routeHint,
    });
    const floor =
      routeHint === "wake"
        ? PROJECTOR_FACE_VIS_FLOORS.wake
        : routeHint === "dormant"
          ? PROJECTOR_FACE_VIS_FLOORS.dormant
          : PROJECTOR_FACE_VIS_FLOORS.ordinary;
    if (fv.faceVis < floor - 1e-9) belowFloorCount++;
    if (fv.faceVis < minFaceVis) minFaceVis = fv.faceVis;
    if (fv.emissionOp < minEmission) minEmission = fv.emissionOp;

    const timeMs = frameIndex * DT_MS;
    const snap = living.evaluate(
      { timeMs, deltaMs: DT_MS, frameIndex },
      { energy_level: routeHint === "dormant" ? 0.22 : 0.52 },
    );

    const channels: Record<string, number> = {
      face_scale: Math.max(0.92, fv.faceVis),
      overall_height: 1,
      overall_width: 1,
      lower_body_fullness: 0.65,
      energy_level: routeHint === "dormant" ? 0.22 : 0.52,
      energy_pulse: snap.values.unified_energy_pulse ?? 0.1,
      internal_glow: Math.max(0.2, fv.emissionOp),
      face_emissive: fv.emissionOp,
      eye_openness: Math.max(
        routeHint === "dormant" ? 0.18 : 0.56,
        fv.faceVis * 0.4,
      ),
      mouth_openness: snap.values.mouth_openness ?? (routeHint === "dormant" ? 0.06 : 0.32),
    };
    frames.push({
      index: frameIndex,
      t: timeMs / 1000,
      channels,
      ownership: { face_emissive: "state_target", eye_openness: "state_target" },
      transition: {
        from: leg.from,
        to: leg.to,
        progress,
        phase: leg.from === leg.to ? "hold" : "transition",
      },
      topology: {
        contourSamples: 512,
        structuralNodes: 360,
        structuralTriangles: 672,
        topologyStable: true,
      },
      contour: {
        overall_height: 1,
        overall_width: 1,
        crown_height: 1,
        ground_flattening: 0,
        lower_body_fullness: 0.65,
      },
    });

    lines.push(
      JSON.stringify({
        i: frameIndex,
        t: +(timeMs / 1000).toFixed(4),
        seg: `${leg.from}>${leg.to}`,
        mix: +progress.toFixed(4),
        faceVis: +fv.faceVis.toFixed(4),
        recessOp: +fv.recessOp.toFixed(4),
        emissionOp: +fv.emissionOp.toFixed(4),
        floor,
        breath: snap.values.unified_breath,
        eye: channels.eye_openness,
        mouth: channels.mouth_openness,
        hash: snap.hash,
      }),
    );
    frameIndex++;
  }
}

const report = analyzeNoBlackoutSequence(frames, { mode: "mixed" });
const analysis = {
  schema: "gasper-finish-01/face-route-60fps-analysis.v1",
  residual: "GASPER-FINISH-01",
  workerIdentity: "kimi-vec000-worker-20260802",
  recordedAtUtc: new Date().toISOString(),
  capture: {
    route: "presence > singularity > dormant-orbit > presence",
    fps: 60,
    frameCount: frameIndex,
    durationSeconds: +(frameIndex / 60).toFixed(2),
    seed: 1007,
    source: "deterministic policy + living authority evaluation (numeric; live browser capture pending WebBridge extension)",
  },
  results: {
    minFaceVisibility: +minFaceVis.toFixed(4),
    minEmissionOpacity: +minEmission.toFixed(4),
    belowFloorFrames: belowFloorCount,
    blackoutFrames: report.blackoutFrameCount,
    blackoutFrameFraction: report.blackoutFrameFraction,
    facePresenceContinuity: report.facePresenceContinuity,
    readable: report.readable,
    notes: report.notes,
  },
  floors: PROJECTOR_FACE_VIS_FLOORS,
};

mkdirSync(DIR, { recursive: true });
writeFileSync(`${DIR}/face-route-60fps.jsonl`, lines.join("\n") + "\n");
writeFileSync(`${DIR}/face-route-60fps-analysis.json`, JSON.stringify(analysis, null, 2));
console.log(JSON.stringify(analysis.results));
