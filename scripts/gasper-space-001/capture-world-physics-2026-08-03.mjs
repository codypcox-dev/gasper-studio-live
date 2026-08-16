// GASPER-SPACE-001 PHASE B live capture drive: world-physics authority.
// SCENE-003 pattern (bundle-freshness gate, freeze cycler, telemetry-synced
// shots, restore) applied to the physics performances:
//   S2 — the bouncing ball: impulse launch into gravity + restitution, squash
//        on impact, stretch in flight, travel across the desktop, settle +
//        auto-release home.
//   S4 — the comet shot: anticipation gather hold (crouch silhouette), hard
//        impulse across the screen, wake-warp + motion-light from physics
//        speed, wall consequence, settle + auto-release home.
// Machine proofs: apex altitude, physics wake/light feeds, wake-warp opening
// on physics speed, provenance readback, auto-release to home (transform
// removed), provenance fence (fail closed), reduced-motion collapse
// (lifeScale 0 => applied pose eases home while the physics target lives on).
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-space-001/visual");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command, timeoutS = 25) {
  const f = join(TMP, `wb-spaceb-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m ${timeoutS} -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;

// World + physics telemetry: applied pose, worldRig transform, physics feeds
// (wake/light), wake-warp + motion-light readbacks, and the driver's own body
// + envelope state (the machine observable for squash/stretch charge).
const TEL = `(() => { try {
  const d = window.__GASPER_DAIS__;
  const rig = window.SidekickFormMasterRig;
  const wp = rig?.getWorldPose?.() ?? null;
  const wr = document.getElementById('worldRig');
  const ground = document.getElementById('ground');
  const avatar = document.getElementById('avatar');
  const vp = d?.getViewport?.()?.getState?.() ?? null;
  const bs = d?.getWorldBodyState?.() ?? null;
  return JSON.stringify({
    target: wp?.target ?? null,
    applied: wp?.applied ?? null,
    worldRigTransform: wr ? (wr.getAttribute('transform') ?? null) : 'NO_RIG',
    groundRx: ground?.getAttribute('rx') ?? null,
    dataset: avatar ? { x: avatar.dataset.worldPoseX, y: avatar.dataset.worldPoseY, tilt: avatar.dataset.worldPoseTilt, provenance: avatar.dataset.worldPoseProvenance, physWake: avatar.dataset.physicsWake, physLight: avatar.dataset.physicsLight, wakeStretch: avatar.dataset.wakeStretch, mlFactor: avatar.dataset.motionLightFactor, mlSpeed: avatar.dataset.motionLightSpeed } : null,
    body: bs ? { mode: bs.mode, x: bs.body.x, y: bs.body.y, vx: bs.body.vx, vy: bs.body.vy, contact: bs.body.contact, impact: bs.envelope.impact, stretch: bs.envelope.stretch, gather: bs.envelope.gather } : null,
    viewport: vp ? { panX: vp.panX, panY: vp.panY, zoom: vp.zoom, worldFollowActive: vp.worldFollowActive } : null
  });
} catch (e) { return 'ERR ' + String(e); } })()`;

const readTel = () => { try { return JSON.parse(evaluate(TEL)); } catch { return null; } };
const goState = (id) => evaluate(`window.__GASPER_DAIS__.living.goEightState('${id}', { duration: 0.55 }), '${id}'`);
const setAuthoredEmbodiment = (id) => evaluate(`window.__GASPER_DAIS__.setEmbodiment('${id}'), '${id}'`);
const r2 = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);

const sidecar = [];
// Per-performance machine-proof accumulators, fed by EVERY telemetry sample
// (shots + poll loops) so a fast settle cannot slip past a narrow window.
let acc = {};
function resetAcc() {
  acc = { maxY: 0, maxWake: 0, maxMlFactor: 1, maxWarp: 0, maxTilt: 0, sawPhysicsProvenance: false };
}
function feedAcc(t) {
  if (!t) return;
  acc.maxY = Math.max(acc.maxY, t?.applied?.y ?? 0);
  acc.maxWake = Math.max(acc.maxWake, Number(t?.dataset?.physWake ?? 0));
  acc.maxMlFactor = Math.max(acc.maxMlFactor, Number(t?.dataset?.mlFactor ?? 1));
  acc.maxWarp = Math.max(acc.maxWarp, Number(t?.dataset?.wakeStretch ?? 0));
  acc.maxTilt = Math.max(acc.maxTilt, Math.abs(t?.applied?.tilt ?? 0));
  if (t?.dataset?.provenance === "physics-authority") acc.sawPhysicsProvenance = true;
}
resetAcc();

function shot(file, note) {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  const at = readTel();
  feedAcc(at);
  sidecar.push({ file, note, ok: !!r?.ok, sizeBytes: r?.data?.sizeBytes ?? null, telemetry: at });
  const a = at?.applied ?? {};
  const ds = at?.dataset ?? {};
  const b = at?.body ?? {};
  console.log(`   ${file} ${r?.ok ? r.data.sizeBytes + "b" : "FAIL"} applied=(${r2(a.x)},${r2(a.y)}) tilt=${r2(a.tilt)} prov=${ds.provenance} wake=${ds.physWake} light=${ds.physLight} warp=${ds.wakeStretch} mlF=${ds.mlFactor} env=(${r2(b.impact)},${r2(b.stretch)},${r2(b.gather)}) transform=${at?.worldRigTransform ? "on" : "off"}`);
  return at;
}

/** Poll until the driver returns to idle (auto-release) or timeout. */
function waitSettled(timeoutMs, stepMs = 400) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const t = readTel();
    feedAcc(t);
    if (t?.body?.mode === "idle" && (t?.dataset?.provenance === "none" || t?.target?.provenance === "none")) return t;
    sleep(stepMs);
  }
  return readTel();
}

/**
 * Poll until the renderer's home ease completes: provenance none AND the
 * worldRig transform removed (byte-stable home). This is the true release
 * observable — the driver disarms ~1s before the 0.14s-tau ease lands.
 */
function waitHomeSettled(timeoutMs, stepMs = 300) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const t = readTel();
    if (t?.dataset?.provenance === "none" && !t?.worldRigTransform) return t;
    sleep(stepMs);
  }
  return readTel();
}

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);

// ── Bundle-freshness gate: hard reload, then require the PHASE B surface ──
console.log("reload:", wb({ action: "cdp", args: { method: "Page.reload", params: {} }, session: "gasper-visual-review" }, 120)?.ok);
sleep(6000);
const gate = evaluate(`(() => {
  const d = window.__GASPER_DAIS__;
  const rig = window.SidekickFormMasterRig;
  return JSON.stringify({
    dais: !!d,
    bounceApi: typeof d?.launchWorldBounce === 'function',
    cometApi: typeof d?.launchWorldComet === 'function',
    paramsApi: typeof d?.setWorldPhysicsParams === 'function',
    bodyStateApi: typeof d?.getWorldBodyState === 'function',
    wakeIntake: typeof rig?.setPhysicsWake === 'function',
    lightIntake: typeof rig?.setPhysicsLight === 'function',
    worldRigGroup: !!document.getElementById('worldRig'),
  });
})()`);
console.log("freshness:", gate);
const g = JSON.parse(gate ?? "{}");
if (!g.dais || !g.bounceApi || !g.cometApi || !g.paramsApi || !g.bodyStateApi || !g.wakeIntake || !g.lightIntake || !g.worldRigGroup) {
  console.error("ABORT: GASPER-SPACE-001 PHASE B bundle not live on 5174 — no capture taken on stale code.");
  process.exit(1);
}

console.log("unpause:", evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'"));
console.log("freeze:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true }); if (typeof l.eightLoop.setAutoLoop === 'function') l.eightLoop.setAutoLoop(false); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));

// ── Baseline: presence settled at home, physics never armed ──
console.log("baseline: key presence:", setAuthoredEmbodiment("presence"));
goState("presence-neutral-settled");
sleep(1600);
shot("phys-00-home-baseline.png", "home pose, physics idle, feeds zero");

// ════════════════════ S2 — the bouncing ball ════════════════════
// Authored for the shot: launchPower 1.35 lifts the first apex into the upper
// frame and carries the bounce chain across most of the desktop.
evaluate("window.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.35 }), 'ok'");
resetAcc();
console.log("S2 launch bounce:", evaluate("window.__GASPER_DAIS__.launchWorldBounce({}), 'ok'"));
sleep(280);
shot("phys-01-bounce-ascent-stretch.png", "first ascent — flight stretch charge, wake feed live");
sleep(300);
shot("phys-02-bounce-apex.png", "near first apex — altitude + shadow attenuation");
sleep(620);
shot("phys-03-bounce-first-impact.png", "first floor impact — squash charge (envelope.impact peak)");
sleep(900);
shot("phys-04-bounce-second-arc.png", "bounce chain — restitution decay, still travelling space");
{
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    const t = readTel();
    feedAcc(t);
    if (t?.body?.mode === "idle") break;
    sleep(200);
  }
}
waitSettled(8000);
const s2Final = waitHomeSettled(4000);
shot("phys-05-bounce-settled-home.png", "S2 auto-release — settle hold elapsed, eased home, transform removed");
const bounceApexOk = acc.maxY > 200;
const bounceFeedOk = acc.maxWake > 0.5 && acc.maxMlFactor > 1.01;
const bounceReleaseOk = s2Final?.dataset?.provenance === "none" && !s2Final?.worldRigTransform;
console.log("S2 proof:", JSON.stringify({ bounceApexOk, maxY: r2(acc.maxY), bounceFeedOk, maxWake: r2(acc.maxWake), maxMlFactor: r2(acc.maxMlFactor), sawPhysicsProvenance: acc.sawPhysicsProvenance, bounceReleaseOk }));
sidecar.push({ file: null, note: "S2 machine proof", bounceApexOk, maxY: r2(acc.maxY), bounceFeedOk, maxWake: r2(acc.maxWake), maxMlFactor: r2(acc.maxMlFactor), sawPhysicsProvenance: acc.sawPhysicsProvenance, bounceReleaseOk });

// ════════════════════ S4 — the comet shot ════════════════════
// Authored for the shot: a longer gather hold (readable anticipation) and a
// 1.2x impulse so the flight hangs in frame before the wall consequence.
evaluate("window.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.2 }), 'ok'");
resetAcc();
console.log("S4 launch comet:", evaluate("window.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 1.4 }), 'ok'"));
sleep(900);
const s4Gather = shot("phys-06-comet-gather-crouch.png", "anticipation gather hold — crouch silhouette, body coiled near stage-left");
sleep(950);
shot("phys-07-comet-flight-wake.png", "the shot — physics-authority flight, wake-warp + motion-light from speed, travel tilt");
sleep(450);
shot("phys-08-comet-wall-consequence.png", "wall consequence — restitution at the world edge");
{
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    const t = readTel();
    feedAcc(t);
    if (t?.body?.mode === "idle") break;
    sleep(200);
  }
}
waitSettled(8000);
const s4Final = waitHomeSettled(4000);
shot("phys-09-comet-settled-home.png", "S4 auto-release — consequence settled, eased home");
const cometGatherOk = (s4Gather?.body?.gather ?? 0) > 0.5;
const cometWakeOk = acc.maxWake > 2 && acc.maxWarp > 0.1 && acc.maxMlFactor > 1.01 && acc.maxTilt > 1;
const cometReleaseOk = s4Final?.dataset?.provenance === "none" && !s4Final?.worldRigTransform;
console.log("S4 proof:", JSON.stringify({ cometGatherOk, gather: r2(s4Gather?.body?.gather ?? 0), cometWakeOk, maxWake: r2(acc.maxWake), maxWarp: r2(acc.maxWarp), maxMlFactor: r2(acc.maxMlFactor), maxTilt: r2(acc.maxTilt), cometReleaseOk }));
sidecar.push({ file: null, note: "S4 machine proof", cometGatherOk, gather: r2(s4Gather?.body?.gather ?? 0), cometWakeOk, maxWake: r2(acc.maxWake), maxWarp: r2(acc.maxWarp), maxMlFactor: r2(acc.maxMlFactor), maxTilt: r2(acc.maxTilt), cometReleaseOk });
// Restore authored physics params (rail fallbacks).
evaluate("window.__GASPER_DAIS__.setWorldPhysicsParams({ gravityScale: 1, restitution: 0.62, launchPower: 1, intensity: 0.7 }), 'ok'");

// ── Provenance fence re-proof (D-0089 fence, unchanged) ──
evaluate("window.__GASPER_DAIS__.setWorldPose({ x: 600, y: 300, z: 0, tilt: 0, provenance: 'bogus-provenance' })");
sleep(700);
const fenceAfter = readTel();
const fenceOk =
  fenceAfter?.target?.provenance === "none" &&
  Math.abs(fenceAfter?.target?.x ?? 1) < 1e-6 &&
  Math.abs(fenceAfter?.applied?.x ?? 1) < 2;
console.log("fence: unprovenanced command ->", fenceOk ? "FAIL CLOSED OK" : "VIOLATION");
sidecar.push({ file: null, note: "provenance fence proof (no shot)", fenceOk, target: fenceAfter?.target, applied: fenceAfter?.applied });

// ── Reduced-motion collapse probe: lifeScale 0 while a physics performance
// lives => motionStrength 0 => applied pose eases home, wake-warp gate closes,
// motion-light returns to identity. The driver keeps integrating (its target
// lives on), so the collapse is the renderer's constitutional ease, not a
// physics stop. Restore life, then explicitly release. ──
evaluate("window.__GASPER_DAIS__.launchWorldBounce({})");
sleep(500);
evaluate("window.SidekickFormMasterRig.setLifeScale(0), 'ok'");
sleep(2200);
const collapsed = readTel();
const collapseOk =
  (collapsed?.body?.mode ?? "idle") !== "idle" && // physics still running…
  Math.abs(collapsed?.applied?.x ?? 99) < 8 && Math.abs(collapsed?.applied?.y ?? 99) < 8 && // …but drawn home
  Number(collapsed?.dataset?.wakeStretch ?? 1) < 0.02 && // warp gate closed
  Number(collapsed?.dataset?.mlFactor ?? 2) < 1.01; // light identity
console.log("collapse probe: lifeScale=0 during flight ->", collapseOk ? "COLLAPSE OK" : "NOT COLLAPSED", JSON.stringify({ mode: collapsed?.body?.mode, applied: collapsed?.applied, warp: collapsed?.dataset?.wakeStretch, mlF: collapsed?.dataset?.mlFactor }));
sidecar.push({ file: null, note: "reduced-motion collapse probe (lifeScale 0 mid-flight)", collapseOk, mode: collapsed?.body?.mode, applied: collapsed?.applied });
evaluate("window.SidekickFormMasterRig.setLifeScale(1), 'ok'");
evaluate("window.__GASPER_DAIS__.disarmWorldBody(), 'ok'");
sleep(1200);

// ── Restore: autonomy + presence baseline + home pose ──
console.log("restore policy:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false }); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));
console.log("restore presence:", setAuthoredEmbodiment("presence"));
console.log("restore state:", goState("presence-neutral-settled"));

writeFileSync(join(outDir, "capture-physics-sidecar.json"), JSON.stringify({ generatedAt: new Date().toISOString(), method: "world physics performances + telemetry-synced (GASPER-SPACE-001 PHASE B)", shots: sidecar }, null, 2) + "\n");
const proofs = { bounceApexOk, bounceFeedOk, bounceReleaseOk, cometGatherOk, cometWakeOk, cometReleaseOk, fenceOk, collapseOk };
const failures = sidecar.filter((s) => s.ok === false).concat(Object.entries(proofs).filter(([, v]) => !v).map(([k]) => ({ failed: k })));
console.log(JSON.stringify({ ok: failures.length === 0, outDir, shots: sidecar.length, proofs, failures }));
