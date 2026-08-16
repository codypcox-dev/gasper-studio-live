// GASPER-SPACE-001 PHASE A live capture drive: 2.5D world traverse.
// SCENE-003 pattern (bundle-freshness gate, freeze cycler, telemetry-synced
// shots, restore) applied to the world stage:
//   1. BUNDLE-FRESHNESS GATE — hard reload, then require the PHASE A API
//      surface (rig intake setWorldPose + renderer getWorldPose + #worldRig
//      group + viewport getViewport); abort rather than capture stale.
//   2. PROVENANCE FENCE PROOF — an unprovenanced command must fail closed to
//      home (D-0088 idiom applied to space).
//   3. REDUCED-MOTION COLLAPSE PROBE — motion 0 => applied pose eases home
//      even with a live capture-drive target (constitution 7.1).
// Shots: home baseline, floor traverse stage-left, mid-traverse lift (shadow
// attenuated), apex + far depth lane, descend stage-right with tilt, release
// easing home, home restored (worldRig transform removed, follow released).
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-space-001/visual");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command, timeoutS = 25) {
  const f = join(TMP, `wb-space1-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m ${timeoutS} -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;

// World telemetry: target/applied pose, worldRig transform, floor shadow,
// avatar dataset read-back, and the viewport camera state (follow proof).
const TEL = `(() => { try {
  const d = window.__GASPER_DAIS__;
  const rig = window.SidekickFormMasterRig;
  const wp = rig?.getWorldPose?.() ?? null;
  const wr = document.getElementById('worldRig');
  const ground = document.getElementById('ground');
  const avatar = document.getElementById('avatar');
  const vp = d?.getViewport?.()?.getState?.() ?? null;
  return JSON.stringify({
    target: wp?.target ?? null,
    applied: wp?.applied ?? null,
    worldRigTransform: wr ? (wr.getAttribute('transform') ?? null) : 'NO_RIG',
    groundRx: ground?.getAttribute('rx') ?? null,
    groundOpacity: ground?.getAttribute('opacity') ?? null,
    dataset: avatar ? { x: avatar.dataset.worldPoseX, y: avatar.dataset.worldPoseY, z: avatar.dataset.worldPoseZ, tilt: avatar.dataset.worldPoseTilt, provenance: avatar.dataset.worldPoseProvenance } : null,
    viewport: vp ? { panX: vp.panX, panY: vp.panY, zoom: vp.zoom, autoFit: vp.autoFit, worldFollowActive: vp.worldFollowActive } : null
  });
} catch (e) { return 'ERR ' + String(e); } })()`;

const readTel = () => { try { return JSON.parse(evaluate(TEL)); } catch { return null; } };
const drive = (pose) => evaluate(`window.__GASPER_DAIS__.setWorldPose(${JSON.stringify(pose)}), 'ok'`);
const goState = (id) => evaluate(`window.__GASPER_DAIS__.living.goEightState('${id}', { duration: 0.55 }), '${id}'`);
const setAuthoredEmbodiment = (id) => evaluate(`window.__GASPER_DAIS__.setEmbodiment('${id}'), '${id}'`);
const r2 = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);

const sidecar = [];
function shot(file, note) {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  const at = readTel();
  sidecar.push({ file, note, ok: !!r?.ok, sizeBytes: r?.data?.sizeBytes ?? null, telemetry: at });
  const a = at?.applied ?? {};
  const vp = at?.viewport ?? {};
  console.log(`   ${file} ${r?.ok ? r.data.sizeBytes + "b" : "FAIL"} applied=(${r2(a.x)},${r2(a.y)},${r2(a.z)},${r2(a.tilt)}) follow=${vp.worldFollowActive} pan=(${r2(vp.panX)},${r2(vp.panY)}) transform=${at?.worldRigTransform ? "on" : "off"} groundRx=${at?.groundRx}`);
}

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);

// ── Bundle-freshness gate: hard reload, then require the PHASE A surface ──
console.log("reload:", wb({ action: "cdp", args: { method: "Page.reload", params: {} }, session: "gasper-visual-review" }, 120)?.ok);
sleep(6000);
const gate = evaluate(`(() => {
  const d = window.__GASPER_DAIS__;
  const rig = window.SidekickFormMasterRig;
  return JSON.stringify({
    dais: !!d,
    rigIntake: typeof d?.setWorldPose === 'function',
    rendererReadback: typeof rig?.getWorldPose === 'function',
    worldRigGroup: !!document.getElementById('worldRig'),
    viewportApi: typeof d?.getViewport === 'function',
  });
})()`);
console.log("freshness:", gate);
const g = JSON.parse(gate ?? "{}");
if (!g.dais || !g.rigIntake || !g.rendererReadback || !g.worldRigGroup || !g.viewportApi) {
  console.error("ABORT: GASPER-SPACE-001 PHASE A bundle not live on 5174 — no capture taken on stale code.");
  process.exit(1);
}

console.log("unpause:", evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'"));
console.log("freeze:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true }); if (typeof l.eightLoop.setAutoLoop === 'function') l.eightLoop.setAutoLoop(false); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));

// ── Baseline: presence settled at home, no world authority ──
console.log("baseline: key presence:", setAuthoredEmbodiment("presence"));
goState("presence-neutral-settled");
sleep(1600);
shot("space-00-home-baseline.png", "home pose, provenance none, no worldRig transform");

// ── Traverse: capture-drive provenance through the rig intake ──
console.log("drive: stage-left floor:", drive({ x: -880, y: 0, z: 0, tilt: 0, provenance: "capture-drive" }));
sleep(1600);
shot("space-01-traverse-left-floor.png", "x=-880 floor run stage-left; camera follow active");

console.log("drive: mid-traverse lift:", drive({ x: -260, y: 560, z: 0, tilt: 0, provenance: "capture-drive" }));
sleep(1600);
shot("space-02-mid-lift-shadow-attenuated.png", "altitude 560 — floor shadow shrinks/fades, body lifts");

console.log("drive: apex + far depth lane:", drive({ x: 420, y: 820, z: 1, tilt: 0, provenance: "capture-drive" }));
sleep(1600);
shot("space-03-apex-depth-lane.png", "x=420 y=820 z=1 — depth-lane scale + horizon shift");

console.log("drive: descend stage-right with tilt:", drive({ x: 900, y: 220, z: 0.35, tilt: 28, provenance: "capture-drive" }));
sleep(1600);
shot("space-04-descend-right-tilt.png", "x=900 tilt 28 — travel tilt about floor anchor");

// ── Release: provenance none -> ease home; follow returns camera, then releases ──
console.log("release (provenance none):", drive({ x: 0, y: 0, z: 0, tilt: 0, provenance: "none" }));
sleep(400);
shot("space-05-release-easing-home.png", "mid ease-home: transform decaying, follow still active");
sleep(6500);
shot("space-06-home-restored.png", "home restored: transform removed, follow released");

// ── Provenance fence proof: unprovenanced command fails closed to home ──
const fenceBefore = readTel();
drive({ x: 600, y: 300, z: 0, tilt: 0, provenance: "bogus-provenance" });
sleep(700);
const fenceAfter = readTel();
const fenceOk =
  fenceAfter?.target?.provenance === "none" &&
  Math.abs(fenceAfter?.target?.x ?? 1) < 1e-6 &&
  Math.abs(fenceAfter?.applied?.x ?? 1) < 2;
console.log("fence: unprovenanced command ->", fenceOk ? "FAIL CLOSED OK" : "VIOLATION", JSON.stringify({ before: fenceBefore?.applied, afterTarget: fenceAfter?.target, afterApplied: fenceAfter?.applied }));
sidecar.push({ file: null, note: "provenance fence proof (no shot)", fenceOk, target: fenceAfter?.target, applied: fenceAfter?.applied });

// ── Reduced-motion collapse probe: lifeScale 0 (motionStrength = motion x lifeScale = 0)
// -> applied pose eases home even with a live capture-drive target; the target is
// retained so the authority's pose resumes jump-free when life returns. (setMotion(0)
// cannot probe this live: the eight-state flush re-asserts the motion channel every
// frame; lifeScale is the stable constitution-7.1 knob and nothing re-asserts it.) ──
evaluate("window.SidekickFormMasterRig.setLifeScale(0), 'ok'");
drive({ x: 700, y: 200, z: 0, tilt: 0, provenance: "capture-drive" });
sleep(2000);
const collapsed = readTel();
const collapseOk = (collapsed?.target?.x ?? 0) > 600 && Math.abs(collapsed?.applied?.x ?? 700) < 5;
console.log("collapse probe: lifeScale=0 ->", collapseOk ? "COLLAPSE OK" : "NOT COLLAPSED", JSON.stringify({ target: collapsed?.target, applied: collapsed?.applied }));
sidecar.push({ file: null, note: "reduced-motion collapse probe (lifeScale 0 => motionStrength 0)", collapseOk, target: collapsed?.target, applied: collapsed?.applied });
drive({ x: 0, y: 0, z: 0, tilt: 0, provenance: "none" });
evaluate("window.SidekickFormMasterRig.setLifeScale(1), 'ok'");
sleep(900);

// ── Restore: autonomy + presence baseline + home pose ──
console.log("restore policy:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false }); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));
console.log("restore presence:", setAuthoredEmbodiment("presence"));
console.log("restore state:", goState("presence-neutral-settled"));

writeFileSync(join(outDir, "capture-sidecar.json"), JSON.stringify({ generatedAt: new Date().toISOString(), method: "world traverse + telemetry-synced (GASPER-SPACE-001 PHASE A)", shots: sidecar }, null, 2) + "\n");
const failures = sidecar.filter((s) => s.ok === false || s.fenceOk === false || s.collapseOk === false);
console.log(JSON.stringify({ ok: failures.length === 0, outDir, shots: sidecar.length, fenceOk, collapseOk, failures }));
