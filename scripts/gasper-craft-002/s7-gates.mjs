#!/usr/bin/env node
// GASPER-CRAFT-002 · S7 — the capture drive v3 gate computer.
//
// Reads the phase artifacts deposited by scripts/gasper-craft-002/
// capture-s7-drive.mjs (run live against the owner's :5174 stage) and the
// authored pack JSONs, then computes the Monitor Doctrine machine gates:
//
//   G1 camera fixity    — zoom/pan delta ≡ 0 across each performance
//                         (mirror of ShotDirector.validateCameraFixity)
//   G2 depth read       — renderer witness exact (worldDepthScale ≡ D0/(D0+z))
//                         + pixel witness at neutral-silhouette windows
//   G3 bounds read      — every curve-authority sample inside the frustum
//                         at its own depth (Doctrine 2 Layer 1)
//   G4 physics read     — no physics authority in flight during craft packs;
//                         world body never armed
//   G5 wander read      — the golden-angle law visible in the live organ
//                         (bearing = step × golden angle; φ ladders)
//   G6 meaning manifest — Doctrine 5 read-back deposited beside the capture
//   G7 provenance fence — fail-closed re-proof + wander-authority accepted
//
// Output: research/proofs/gasper-craft-002/s7/s7-capture-sidecar.json
// Classification: machine-proven (observer-only capture).

import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIR = ROOT + "research/proofs/gasper-craft-002/s7";
const PACKS = ROOT + "packages/desktop/src/gasper/curves/packs";

const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const probe = load(DIR + "/phase-probe.json");
const home = load(DIR + "/phase-home.json");
const s2 = load(DIR + "/phase-pack-s2.json");
const s4 = load(DIR + "/phase-pack-s4.json");
const wander = load(DIR + "/phase-wander.json");

// WorldSpace constants (packages/desktop/src/gasper/space/WorldSpace.ts)
const D0 = 1920, X_HALF = 960, Y_MAX = 1080, Z_NEAR = -1120, Z_FAR = 3566;
const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_ANGLE = 360 / (PHI * PHI);
const scaleAt = (z) => D0 / (D0 + z);

// ------------------------------------------------------------------ G1
// Camera fixity: the performance window is the samples with packRunning;
// the law mirror asserts zoom delta ≡ 0 and pan delta ≡ 0 inside it, and
// the runtime camera lock engaged for the whole window.
function cameraFixity(phase) {
  const win = phase.samples.filter((s) => s.packRunning);
  let maxZoomDelta = 0, maxPanDeltaPx = 0, prev = null;
  let unlockedBoundary = 0, unlockedMid = 0;
  const firstMs = win.length ? win[0].ms : 0;
  for (const s of win) {
    // The stage engages the performance-camera lock on the first rendered
    // frame after runCraftPack returns; the start-boundary read (the same
    // tick as the call) may precede it. Mid-performance unlocks are the
    // doctrine violation.
    if (!s.locked) (s.ms - firstMs < 25 ? unlockedBoundary++ : unlockedMid++);
    if (prev) {
      maxZoomDelta = Math.max(maxZoomDelta, Math.abs(s.zoom - prev.zoom));
      maxPanDeltaPx = Math.max(
        maxPanDeltaPx,
        Math.abs(s.panX - prev.panX),
        Math.abs(s.panY - prev.panY),
      );
    }
    prev = s;
  }
  // Informational: the full captured window (lock engage → release tail).
  let fullZoom = 0, fprev = null;
  for (const s of phase.samples) {
    if (fprev) fullZoom = Math.max(fullZoom, Math.abs(s.zoom - fprev.zoom));
    fprev = s;
  }
  return {
    packId: phase.packId,
    samples: phase.samples.length,
    performanceSamples: win.length,
    maxZoomDelta,
    maxPanDeltaPx,
    unlockedBoundarySamples: unlockedBoundary,
    unlockedMidPerformanceSamples: unlockedMid,
    fullWindowMaxZoomDelta: fullZoom,
    ok:
      win.length >= 2 &&
      unlockedMid === 0 &&
      maxZoomDelta <= 1e-9 &&
      maxPanDeltaPx <= 1e-6,
  };
}
const g1 = {
  name: "camera fixity (Doctrine 1) — zoom delta ≡ 0 across each performance",
  perPack: { "s2-bounce": cameraFixity(s2), "s4-comet": cameraFixity(s4) },
};
g1.ok = g1.perPack["s2-bounce"].ok && g1.perPack["s4-comet"].ok;

// ------------------------------------------------------------------ G2
// Depth read. (a) renderer witness: the dataset depth scale the renderer
// paints every frame must equal the projection law at the applied depth.
// (b) pixel witness: at neutral-silhouette windows (stretch ≈ squash ≈ 0)
// the measured contour height must read h0·scale(z) — the same body at two
// depths reads exactly as the projection law says. Breath + rig micro-motion
// budget: ±7% on the median, spread reported.
function trackValueAt(keys, t) {
  if (!keys || keys.length === 0) return 0;
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      if (a.out === "stepped") return a.v;
      const u = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * u;
    }
  }
  return keys[keys.length - 1].v;
}
function neutralWindows(packRaw) {
  const st = packRaw.channels.stretch ?? [];
  const sq = packRaw.channels.squash ?? [];
  const wins = [];
  let open = null;
  for (let t = 0; t <= packRaw.durationSeconds + 1e-9; t += 0.02) {
    const neutral =
      Math.abs(trackValueAt(st, t)) < 0.005 && Math.abs(trackValueAt(sq, t)) < 0.005;
    if (neutral && open === null) open = t;
    if (!neutral && open !== null) {
      if (t - open >= 0.3) wins.push([open, t]);
      open = null;
    }
  }
  if (open !== null && packRaw.durationSeconds - open >= 0.3)
    wins.push([open, packRaw.durationSeconds]);
  return wins;
}
function depthRead(phase, packRaw) {
  // (a) renderer witness — every sample with a pose in flight.
  let rendererSamples = 0, rendererWorst = 0;
  for (const s of phase.samples) {
    if (s.dsScale == null || !Number.isFinite(s.z)) continue;
    rendererSamples++;
    rendererWorst = Math.max(rendererWorst, Math.abs(s.dsScale - scaleAt(s.z)));
  }
  // (b) pixel witness — samples inside neutral windows with stable depth.
  const h0 = home.anchor.hPx;
  const windows = neutralWindows(packRaw).map(([a, b]) => {
    const inside = phase.samples.filter(
      (s) => s.packRunning && s.ms / 1000 >= a && s.ms / 1000 <= b && s.hPx != null,
    );
    const ratios = inside.map((s) => s.hPx / (h0 * scaleAt(s.z)));
    ratios.sort((x, y) => x - y);
    const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : null;
    const zSet = [...new Set(inside.map((s) => Math.round(s.z)))];
    return {
      windowSeconds: [a, b],
      depthZ: zSet,
      samples: inside.length,
      medianRatio: median,
      minRatio: ratios.length ? ratios[0] : null,
      maxRatio: ratios.length ? ratios[ratios.length - 1] : null,
    };
  });
  const pixelOk =
    windows.length > 0 &&
    windows.every(
      (w) => w.samples >= 3 && Math.abs(w.medianRatio - 1) <= 0.07,
    );
  return {
    packId: phase.packId,
    rendererWitness: {
      samples: rendererSamples,
      worstAbsDeltaVsLaw: rendererWorst,
      ok: rendererSamples >= 100 && rendererWorst <= 1e-3,
    },
    pixelWitness: { homeContourPx: h0, windows },
    pixelOk,
  };
}
const g2 = {
  name: "depth read (Doctrines 1+2) — on-screen size obeys scale(z) = D0/(D0+z)",
  perPack: {
    "s2-bounce": depthRead(s2, load(PACKS + "/s2-bounce.json")),
    "s4-comet": depthRead(s4, load(PACKS + "/s4-comet.json")),
  },
};
g2.ok = g2.perPack["s2-bounce"].rendererWitness.ok &&
  g2.perPack["s4-comet"].rendererWitness.ok &&
  g2.perPack["s2-bounce"].pixelOk &&
  g2.perPack["s4-comet"].pixelOk;

// ------------------------------------------------------------------ G3
// Bounds read — every curve-authority sample inside the frustum at its own
// depth: z ∈ [zNear, zFar], |x| ≤ xHalf(z), 0 ≤ y ≤ yMax(z).
function boundsRead(phase) {
  let checked = 0, worst = { xMargin: Infinity, yMargin: Infinity, zOk: true };
  const violations = [];
  for (const s of phase.samples) {
    if (s.prov !== "curve-authority") continue;
    checked++;
    const sc = scaleAt(s.z);
    const xHalf = X_HALF / sc, yMax = Y_MAX / sc;
    const xm = xHalf - Math.abs(s.x), ym = yMax - s.y;
    worst.xMargin = Math.min(worst.xMargin, xm);
    worst.yMargin = Math.min(worst.yMargin, s.y >= 0 ? ym : s.y);
    if (s.z < Z_NEAR || s.z > Z_FAR) worst.zOk = false;
    if (xm < -0.5 || s.y > yMax + 0.5 || s.y < -0.5 || s.z < Z_NEAR || s.z > Z_FAR) {
      violations.push({ ms: s.ms, x: s.x, y: s.y, z: s.z });
    }
  }
  return {
    packId: phase.packId,
    checked,
    violations: violations.slice(0, 5),
    minMarginX: worst.xMargin === Infinity ? null : worst.xMargin,
    minMarginY: worst.yMargin === Infinity ? null : worst.yMargin,
    ok: checked >= 100 && violations.length === 0,
  };
}
const g3 = {
  name: "bounds read (Doctrine 2, Layer 1) — never outside the frustum at its own depth",
  perPack: { "s2-bounce": boundsRead(s2), "s4-comet": boundsRead(s4) },
};
g3.ok = g3.perPack["s2-bounce"].ok && g3.perPack["s4-comet"].ok;

// ------------------------------------------------------------------ G4
// Physics read — craft packs are curve-authority self-contained: no
// physics-authority sample may appear, the world body stays un-armed, and
// the wake/light feeds are the pack's authored feeds (recorded, not gated).
function physicsRead(phase) {
  const census = {};
  let maxWake = 0, maxLight = 0;
  for (const s of phase.samples) {
    census[s.prov] = (census[s.prov] ?? 0) + 1;
    if (Number.isFinite(s.wake)) maxWake = Math.max(maxWake, Math.abs(s.wake));
    if (Number.isFinite(s.light)) maxLight = Math.max(maxLight, s.light);
  }
  return {
    packId: phase.packId,
    provenanceCensus: census,
    physicsAuthoritySamples: census["physics-authority"] ?? 0,
    maxAuthoredWake: maxWake,
    maxAuthoredLight: maxLight,
  };
}
const g4 = {
  name: "physics read — craft packs stay curve-authority; the world body is never armed",
  perPack: { "s2-bounce": physicsRead(s2), "s4-comet": physicsRead(s4) },
  worldBodyStateAtProbe: probe.physics.worldBodyState,
  worldPhysicsParams: probe.physics.worldPhysicsParams,
};
g4.ok =
  g4.perPack["s2-bounce"].physicsAuthoritySamples === 0 &&
  g4.perPack["s4-comet"].physicsAuthoritySamples === 0 &&
  g4.worldBodyStateAtProbe === null;

// ------------------------------------------------------------------ G5
// Wander read — the live organ's plans obey the golden-angle law.
function wanderRead() {
  const ladderSpeeds = [260 / PHI, 260, 260 * PHI];
  const ladderDwells = [1 / PHI, 1, PHI, 2 * PHI];
  const near = (v, list, tol) => list.some((x) => Math.abs(v - x) <= tol);
  let plans = 0, bearingBad = 0, speedBad = 0, dwellBad = 0, worstBearingErr = 0;
  const stepsSeen = new Set();
  const phasesSeen = new Set();
  const provCensus = {};
  for (const s of wander.samples) {
    provCensus[s.prov] = (provCensus[s.prov] ?? 0) + 1;
    if (s.wander) phasesSeen.add(s.wander.phase);
    const plan = s.wander?.plan;
    if (!plan) continue;
    plans++;
    stepsSeen.add(plan.step);
    const expected = (plan.step * GOLDEN_ANGLE) % 360;
    let err = Math.abs(plan.bearingDeg - expected);
    err = Math.min(err, 360 - err);
    worstBearingErr = Math.max(worstBearingErr, err);
    if (err > 1e-2) bearingBad++;
    if (!near(plan.speedUnitsPerSec, ladderSpeeds, 0.5)) speedBad++;
    if (!near(plan.dwellSeconds, ladderDwells, 1e-3)) dwellBad++;
  }
  return {
    samples: wander.samples.length,
    planSamples: plans,
    stepsSeen: [...stepsSeen].sort((a, b) => a - b),
    phasesSeen: [...phasesSeen],
    provenanceCensus: provCensus,
    goldenAngleDeg: GOLDEN_ANGLE,
    worstBearingErrorDeg: worstBearingErr,
    bearingViolations: bearingBad,
    speedViolations: speedBad,
    dwellViolations: dwellBad,
  };
}
const g5 = {
  name: "wander read (D-0106) — bearing = step × golden angle; φ ladders; provenance honored",
  ...wanderRead(),
};
g5.ok =
  g5.planSamples >= 4 &&
  g5.bearingViolations === 0 &&
  g5.speedViolations === 0 &&
  g5.dwellViolations === 0 &&
  (g5.provenanceCensus["wander-authority"] ?? 0) > 0;

// ------------------------------------------------------------------ G6
// Meaning manifest — Doctrine 5 read-back from the authored JSONs (the same
// content the fail-closed compiler gates), deposited beside the capture.
function meaningManifest(packRaw) {
  return {
    packId: packRaw.id,
    sceneValueTurn: packRaw.valueTurn,
    beats: packRaw.beats.map((b) => ({
      id: b.id,
      t0: b.t0,
      t1: b.t1,
      shotScale: b.shotScale,
      objective: b.objective,
      primaryIdea: b.primaryIdea,
      valueTurn: b.valueTurn,
    })),
    holds: packRaw.holds ?? [],
  };
}
function meaningCheck(packRaw) {
  const errs = [];
  const vt = packRaw.valueTurn;
  if (!vt?.from?.trim() || !vt?.to?.trim() || vt.from === vt.to)
    errs.push("scene valueTurn missing or unturned");
  for (const b of packRaw.beats) {
    if (!b.objective?.trim()) errs.push(`beat ${b.id}: no objective`);
    if (!b.primaryIdea?.trim()) errs.push(`beat ${b.id}: no primaryIdea`);
    if (!b.valueTurn?.trim()) errs.push(`beat ${b.id}: no valueTurn`);
  }
  return errs;
}
const s2Raw = load(PACKS + "/s2-bounce.json");
const s4Raw = load(PACKS + "/s4-comet.json");
const g6 = {
  name: "meaning manifest (Doctrine 5) — objective per beat, value turn per scene, holds as events",
  manifests: [meaningManifest(s2Raw), meaningManifest(s4Raw)],
  checkErrors: { "s2-bounce": meaningCheck(s2Raw), "s4-comet": meaningCheck(s4Raw) },
};
g6.ok =
  g6.checkErrors["s2-bounce"].length === 0 &&
  g6.checkErrors["s4-comet"].length === 0;

// ------------------------------------------------------------------ G7
const g7 = {
  name: "provenance fence — bogus fail-closed to home; wander-authority recognized",
  bogusFailedClosed: probe.fence.bogusFailedClosed,
  bogusTarget: probe.fence.bogusTarget,
  wanderAccepted: probe.fence.wanderAccepted,
  wanderTarget: probe.fence.wanderTarget,
  releaseHome: probe.fence.releasedHome,
};
g7.ok = g7.bogusFailedClosed && g7.wanderAccepted;

// ------------------------------------------------------------------ out
const gates = { g1, g2, g3, g4, g5, g6, g7 };
const allOk = Object.values(gates).every((g) => g.ok);
const sidecar = {
  generatedAt: new Date().toISOString(),
  worker: "qwen-vec007",
  drive: "scripts/gasper-craft-002/capture-s7-drive.mjs",
  stage: "http://localhost:5174 (owner dev server — untouched)",
  classification: "machine-proven (observer-only live capture)",
  homeAnchor: home.anchor,
  livingStatusInitial: probe.livingStatusInitial,
  gates,
  allMachineGatesPass: allOk,
  residuals: [
    "owner verdict PENDING — the phase gate is human acceptance (Cody's alone)",
    "pixel depth-read budget ±7% absorbs breath + rig micro-motion (median used; spread in evidence)",
    "G2 pixel witness windows are the pack's own neutral-silhouette holds — silhouette-active flight rides the exact renderer witness",
  ],
};
writeFileSync(DIR + "/s7-capture-sidecar.json", JSON.stringify(sidecar, null, 2), "utf8");
const line = (k) =>
  `${k} ${gates[k].ok ? "PASS" : "FAIL"} — ${gates[k].name}`;
console.log(Object.keys(gates).map(line).join("\n"));
console.log("---");
console.log("ALL MACHINE GATES:", allOk ? "PASS" : "FAIL");
