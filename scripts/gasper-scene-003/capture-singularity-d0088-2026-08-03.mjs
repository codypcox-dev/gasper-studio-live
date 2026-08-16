// GASPER-SCENE-003 live capture drive: singularity rev4 after D-0088
// (owner-approved scene-scoped silhouette admission). State-keyed +
// telemetry-synced like the SCENE-002 rev2 drive, with two additions:
//   1. BUNDLE-FRESHNESS GATE — hard reload, then verify the loop controller
//      exposes getSceneSilhouetteAdmission; abort rather than capture stale.
//   2. SILHOUETTE TELEMETRY — overall_width / overall_height /
//      ground_flattening from the flushed pose + the admission record itself,
//      so the sidecar proves the fenced channels reached pixels scene-scoped.
// Beats captured: pre-fall rest baseline, anticipation lift, landing squash,
// orbit squat-drift, lensing-flare stretch crest, echo, soften release.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-scene-003/visual");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command, timeoutS = 25) {
  const f = join(TMP, `wb-s003-${Date.now()}-${seq++}.json`);
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
    overall_width: v.overall_width, overall_height: v.overall_height,
    ground_flattening: v.ground_flattening,
    admission: (typeof loop?.getSceneSilhouetteAdmission === 'function') ? loop.getSceneSilhouetteAdmission() : null,
    posture_x: v.posture_x, posture_y: v.posture_y,
    crown_height: v.crown_height, asym: v.asym, body_lean: v.body_lean,
    energy_level: v.energy_level, internal_glow: v.internal_glow,
    face_emissive: v.face_emissive,
    deltas: s?.deltas
  });
} catch (e) { return 'ERR ' + String(e); } })()`;

const readTel = () => { try { return JSON.parse(evaluate(TEL)); } catch { return null; } };
const goState = (id) => evaluate(`window.__GASPER_DAIS__.living.goEightState('${id}', { duration: 0.55 }), '${id}'`);
const setAuthoredEmbodiment = (id) => evaluate(`window.__GASPER_DAIS__.setEmbodiment('${id}'), '${id}'`);

function waitFor(pred, { timeoutMs = 16000, pollMs = 120, label = "" } = {}) {
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
  const at = readTel();
  sidecar.push({ file, ok: !!r?.ok, sizeBytes: r?.data?.sizeBytes ?? null, telemetry: at ?? tel });
  const t = at ?? tel;
  console.log(`   ${file} ${r?.ok ? r.data.sizeBytes + "b" : "FAIL"} @ ${t?.movement} T=${t?.movementT?.toFixed?.(2)} h=${typeof t?.overall_height === "number" ? t.overall_height.toFixed(3) : t?.overall_height} w=${typeof t?.overall_width === "number" ? t.overall_width.toFixed(3) : t?.overall_width} fl=${typeof t?.ground_flattening === "number" ? t.ground_flattening.toFixed(3) : t?.ground_flattening}`);
}

function captureMovement(suiteId, movementId, tTarget, file, { timeoutMs = 18000 } = {}) {
  const tel = waitFor(
    (t) => t.suite === suiteId && t.movement === movementId && typeof t.movementT === "number" && t.movementT >= tTarget,
    { timeoutMs, label: `${movementId}@${tTarget}` },
  );
  shot(file, tel);
}

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);

// ── Bundle-freshness gate: hard reload, then require the D-0088 API ──
console.log("reload:", wb({ action: "cdp", args: { method: "Page.reload", params: {} }, session: "gasper-visual-review" }, 120)?.ok);
sleep(6000);
const gate = evaluate(`(() => {
  const loop = window.__GASPER_DAIS__?.living?.eightLoop;
  return JSON.stringify({
    dais: !!window.__GASPER_DAIS__,
    admissionApi: typeof loop?.getSceneSilhouetteAdmission === 'function',
    state: loop?.stateId ?? null, suite: loop?.lastSceneSample?.suiteId ?? null,
  });
})()`);
console.log("freshness:", gate);
const g = JSON.parse(gate ?? "{}");
if (!g.dais || !g.admissionApi) {
  console.error("ABORT: D-0088 bundle not live on 5174 — no capture taken on stale code.");
  process.exit(1);
}

console.log("unpause:", evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'"));
console.log("freeze:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true }); if (typeof l.eightLoop.setAutoLoop === 'function') l.eightLoop.setAutoLoop(false); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));

// ── Baseline: presence settled, no silhouette admission ──
console.log("baseline: key presence:", setAuthoredEmbodiment("presence"));
goState("presence-neutral-settled");
sleep(1600);
shot("singularity-00-rest-baseline.png", null);

// ── SINGULARITY rev4 — Collapse & Orbit with squash & stretch ──
console.log("sing: key presence state (exit any dormant):", goState("presence-neutral-settled"));
sleep(900);
console.log("sing: key dormant (T=0):", goState("dormant-orbit-maintain"));
waitFor((t) => t.suite === "suite-singularity-collapse-v2", { timeoutMs: 8000, label: "sing-suite" });

captureMovement("suite-singularity-collapse-v2", "fall", 0.16, "singularity-01-fall-anticipation.png");
captureMovement("suite-singularity-collapse-v2", "fall", 0.8, "singularity-02-fall-landing-squash.png");
captureMovement("suite-singularity-collapse-v2", "orbit-cycle-a", 0.5, "singularity-03-orbit-a-squat.png");
captureMovement("suite-singularity-collapse-v2", "lensing-flare", 0.45, "singularity-04-flare-stretch.png");
captureMovement("suite-singularity-collapse-v2", "orbit-cycle-b", 0.5, "singularity-05-orbit-b-echo.png");
captureMovement("suite-singularity-collapse-v2", "soften", 0.5, "singularity-06-soften-release.png");

// ── Restore: autonomy + presence baseline ──
console.log("restore policy:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false }); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));
console.log("restore presence:", setAuthoredEmbodiment("presence"));
console.log("restore state:", goState("presence-neutral-settled"));

writeFileSync(join(outDir, "capture-sidecar.json"), JSON.stringify({ generatedAt: new Date().toISOString(), method: "state-keyed + telemetry-synced (SCENE-003 / D-0088)", shots: sidecar }, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, outDir, shots: sidecar.length }));
