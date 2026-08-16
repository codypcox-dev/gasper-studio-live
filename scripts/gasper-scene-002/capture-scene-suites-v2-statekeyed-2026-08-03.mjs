// GASPER-SCENE-002 live capture drive (REVISED, state-keyed + telemetry-synced).
//
// Root-cause fix over the first drive: embodiment is STATE-DRIVEN. On every
// settled state transition the rig re-keys the loop embodiment via
// mainFormOverride(authoredMainForm, endpoint.embodimentId):
//   presence-family state -> authoredMainForm (user's durable choice)
//   comet-executing-drive -> "comet" (forced)
//   dormant-orbit-maintain -> "singularity" (forced)
// So clicking an EMBODIMENT rail button does NOT reliably select a suite. The
// reliable key is the STATE: drive goEightState and the embodiment (and hence
// the scene suite, which is anchored to embodiment arrival) follows.
//
// The living-loop cycler (autoSequence, stepSeconds=2.4) would otherwise advance
// the state mid-performance and re-key the suite. We freeze it with
// applyModePolicy({autoSequence:false,freezeSequence:true}) + setAutoLoop(false);
// the scene suite, breath and blink keep animating (sampled every frame from the
// organism clock regardless of autoLoop).
//
// Captures self-synchronize: we poll loop.lastSceneSample until the target
// movement is reached at the target movementT, then shoot — no wall-clock drift.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-scene-002/visual-after");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command, timeoutS = 25) {
  const f = join(TMP, `wb-s002k-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m ${timeoutS} -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;

const TEL = `(() => { try {
  const d = window.__GASPER_DAIS__;
  const loop = d?.living?.eightLoop;
  const s = loop?.lastSceneSample;
  const flushed = d?.living?.lastFlushed ?? {};
  const snapVals = loop?.lastLivingSnapshot?.values ?? {};
  const v = Object.keys(flushed).length ? flushed : snapVals;
  return JSON.stringify({
    suite: s?.suiteId ?? null, movement: s?.movementId ?? null, intent: s?.intent ?? null,
    loopT: s?.loopT ?? null, movementT: s?.movementT ?? null,
    state: loop?.stateId ?? null,
    embodiment: (loop?.getEmbodiment ? loop.getEmbodiment() : null),
    authoredMainForm: d?.authoredMainForm ?? null,
    eye_openness: v.eye_openness, posture_x: v.posture_x, posture_y: v.posture_y,
    crown_height: v.crown_height, asym: v.asym, body_lean: v.body_lean,
    wide: v.wide, low: v.low, energy_level: v.energy_level,
    internal_glow: v.internal_glow, face_emissive: v.face_emissive,
    deltas: s?.deltas
  });
} catch (e) { return 'ERR ' + String(e); } })()`;

const readTel = () => { try { return JSON.parse(evaluate(TEL)); } catch { return null; } };
const goState = (id) => evaluate(`window.__GASPER_DAIS__.living.goEightState('${id}', { duration: 0.55 }), '${id}'`);
const setAuthoredEmbodiment = (id) => evaluate(`window.__GASPER_DAIS__.setEmbodiment('${id}'), '${id}'`);

// Poll until predicate(tel) true or timeout; returns last telemetry.
function waitFor(pred, { timeoutMs = 14000, pollMs = 120, label = "" } = {}) {
  const t0 = Date.now();
  let tel = readTel();
  while (Date.now() - t0 < timeoutMs) {
    if (tel && pred(tel)) return tel;
    sleep(pollMs);
    tel = readTel();
  }
  console.log(`   [waitFor:${label}] timed out; last=${JSON.stringify({ suite: tel?.suite, movement: tel?.movement, movementT: tel?.movementT })}`);
  return tel;
}

const sidecar = [];
function shot(file, tel) {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  // Re-read telemetry at the instant of capture for an honest sidecar.
  const at = readTel();
  sidecar.push({ file, ok: !!r?.ok, sizeBytes: r?.data?.sizeBytes ?? null, telemetry: at ?? tel });
  console.log(`   ${file} ${r?.ok ? r.data.sizeBytes + "b" : "FAIL"} @ ${at?.movement} T=${at?.movementT?.toFixed?.(2)} eye=${typeof at?.eye_openness === "number" ? at.eye_openness.toFixed(3) : at?.eye_openness}`);
}

// Capture one movement of the CURRENT suite at a target movementT window.
function captureMovement(suiteId, movementId, tTarget, file, { timeoutMs = 16000 } = {}) {
  const tel = waitFor(
    (t) => t.suite === suiteId && t.movement === movementId && typeof t.movementT === "number" && t.movementT >= tTarget,
    { timeoutMs, label: `${movementId}@${tTarget}` },
  );
  shot(file, tel);
}

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);
console.log("unpause:", evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'"));

// ── Freeze the state cycler (suites/breath/blink keep animating) ──
console.log("freeze:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true }); if (typeof l.eightLoop.setAutoLoop === 'function') l.eightLoop.setAutoLoop(false); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));

// ── SCENE 1: SINGULARITY rest — Collapse & Orbit v2 (owner priority) ──
// Re-anchor to T=0 deterministically: leave dormant for presence, then re-enter
// dormant. The embodiment flips singularity->presence->singularity, and each
// setEmbodiment re-anchors the scene suite to T=0.
console.log("sing: key presence (exit dormant):", goState("presence-neutral-settled"));
sleep(900); // settle + embodiment re-key
console.log("sing: key dormant (T=0):", goState("dormant-orbit-maintain"));
waitFor((t) => t.suite === "suite-singularity-collapse-v2", { timeoutMs: 6000, label: "sing-suite" });

captureMovement("suite-singularity-collapse-v2", "fall", 0.5, "singularity-01-fall.png");
captureMovement("suite-singularity-collapse-v2", "orbit-cycle-a", 0.5, "singularity-02-orbit-a.png");
captureMovement("suite-singularity-collapse-v2", "lensing-flare", 0.45, "singularity-03-lensing-flare.png");
captureMovement("suite-singularity-collapse-v2", "orbit-cycle-b", 0.5, "singularity-04-orbit-b.png");
captureMovement("suite-singularity-collapse-v2", "soften", 0.5, "singularity-05-soften.png");

// ── SCENE 2: PRESENCE — Awareness v2 ──
// Pin authored main form to presence, then settle into a presence state. The
// embodiment flip singularity->presence re-anchors the presence suite to T=0.
console.log("presence: setAuthored:", setAuthoredEmbodiment("presence"));
console.log("presence: key state:", goState("presence-neutral-settled"));
waitFor((t) => t.suite === "suite-presence-awareness-v2", { timeoutMs: 6000, label: "presence-suite" });

captureMovement("suite-presence-awareness-v2", "orient", 0.5, "presence-01-orient.png");
captureMovement("suite-presence-awareness-v2", "regard", 0.5, "presence-02-regard.png");
captureMovement("suite-presence-awareness-v2", "spark-echo", 0.4, "presence-03-spark-echo.png");
captureMovement("suite-presence-awareness-v2", "home", 0.5, "presence-04-home.png");

// ── SCENE 3: COMET — Pursuit v2 ──
// comet-executing-drive forces embodiment "comet" -> suite re-anchors at settle.
console.log("comet: key state:", goState("comet-executing-drive"));
waitFor((t) => t.suite === "suite-comet-pursuit-v2", { timeoutMs: 6000, label: "comet-suite" });

captureMovement("suite-comet-pursuit-v2", "drive", 0.5, "comet-01-drive.png");
captureMovement("suite-comet-pursuit-v2", "consequence", 0.5, "comet-02-consequence.png");

// ── Restore: autonomy + presence baseline ──
console.log("restore policy:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false }); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));
console.log("restore presence:", setAuthoredEmbodiment("presence"));
console.log("restore state:", goState("presence-neutral-settled"));

writeFileSync(join(outDir, "capture-sidecar.json"), JSON.stringify({ generatedAt: new Date().toISOString(), method: "state-keyed + telemetry-synced (SCENE-002 rev2)", shots: sidecar }, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, outDir, shots: sidecar.length }));
