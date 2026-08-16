// GASPER-CRAFT-001 · C5 live capture drive: the shipped craft performances.
// Phase B idiom (bundle-freshness gate, freeze autonomy, telemetry-synced
// shots, probes, restore) applied to the CRAFT packs — curve-authority
// performances staged by the ShotDirector:
//   s2-bounce — the bouncing ball restaged: three-beat sheet (coil / flight /
//               settle), authored apex 950 world units, two honest bounces,
//               AU-named face beats, home-to-home.
//   s4-comet  — the comet restaged: drift to the edge, coil, one full-world
//               crack (−960 → +960) into the wall, consequence settle.
//
// D-0097 + D-0098 capture-side floor formulation:
//   · the amplitude floors gate the AUTHORED pack at compile time (machine
//     proof: 153px live contour anchor, authored extreme-close framing);
//   · the capture re-asserts live as DIRECT ON-SCREEN READS — what the owner
//     sees, independent of any body anchor:
//       s2 apex — max over samples of (applied altitude px · zoom) / stageH
//                 must read ≥ 40% of frame height;
//       s4 sweep — the COMMANDED sweep (renderer target telemetry) must span
//                 the full world, the applied pose must reach the wall region
//                 on both sides, and the on-screen traverse reading
//                 (applied range px · zoom) / stageW reported against 80%
//                 (0.14s display smoothing costs ~2% of a 2400 u/s sweep);
//   · D-0098 silhouette source: the body contour (#bodyClip path, rewritten
//     every frame from the projected silhouette) — NOT #idleRig, whose bbox
//     is polluted by decorative layers clipped to the body (subsurface bands
//     790×541 in getBBox, invisible outside the clip). The staging gate
//     predicts the extreme-close zoom from the live contour and asserts the
//     camera obeys within 5%.
//   · collapse: lifeScale 0 mid-pack ⇒ applied pose eases home (tau 0.4s),
//     warp gate closes, motion-light returns to identity — while the pack
//     driver keeps ticking (the target lives on);
//   · fence: unknown craft pack ids fail closed; unprovenanced world pose
//     fails closed (D-0089).
// Captures are observer-only: pixels never feed organism state.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-craft-001/visual");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command, timeoutS = 25) {
  const f = join(TMP, `wb-craft5-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m ${timeoutS} -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;
function servedContains(pathPart, needle) {
  try {
    const body = execSync(`curl.exe -s -m 10 "http://localhost:5174/${pathPart}"`, { encoding: "utf-8" });
    return body.includes(needle);
  } catch { return false; }
}

// Craft telemetry: pack playhead (organism clock), beat + shot scale under the
// playhead, face carrier, shot dial, world-pose target (the admitted command —
// the driver's curve value) + applied (the smoothed value actually drawn),
// renderer feeds, camera state, live SILHOUETTE (bodyClip contour) + stage
// geometry.
const TEL = `(() => { try {
  const d = window.__GASPER_DAIS__;
  const rig = window.SidekickFormMasterRig;
  const wp = rig?.getWorldPose?.() ?? null;
  const wr = document.getElementById('worldRig');
  const avatar = document.getElementById('avatar');
  const vp = d?.getViewport?.() ?? null;
  const vs = vp?.getState?.() ?? null;
  const ps = d?.getPerformancePackState?.() ?? null;
  const clip = document.querySelector('#bodyClip path');
  const box = clip ? clip.getBBox() : null;
  const stage = vp?.getStageSize?.() ?? null;
  return JSON.stringify({
    pack: ps ? { running: ps.running, t: ps.t, packId: ps.packId } : null,
    beatId: d?.getPerformancePackBeatId?.() ?? null,
    shotScale: d?.getPerformancePackShotScale?.() ?? null,
    bias: d?.getCraftShotBias?.() ?? null,
    face: d?.getPerformancePackFace?.() ?? 0,
    target: wp?.target ?? null,
    applied: wp?.applied ?? null,
    worldRigTransform: wr ? (wr.getAttribute('transform') ?? null) : 'NO_RIG',
    dataset: avatar ? { provenance: avatar.dataset.worldPoseProvenance, physWake: avatar.dataset.physicsWake, physLight: avatar.dataset.physicsLight, wakeStretch: avatar.dataset.wakeStretch, mlFactor: avatar.dataset.motionLightFactor } : null,
    camera: vs ? { zoom: vs.zoom, shotDirectionActive: vs.shotDirectionActive } : null,
    contourH: box ? box.height : null,
    stage: stage ? { w: stage.width, h: stage.height } : null
  });
} catch (e) { return 'ERR ' + String(e); } })()`;

const readTel = () => { try { return JSON.parse(evaluate(TEL)); } catch { return null; } };
const goState = (id) => evaluate(`window.__GASPER_DAIS__.living.goEightState('${id}', { duration: 0.55 }), '${id}'`);
const setAuthoredEmbodiment = (id) => evaluate(`window.__GASPER_DAIS__.setEmbodiment('${id}'), '${id}'`);
const r2 = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);
const r3 = (v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v);

const sidecar = [];
let acc = {};
function resetAcc() {
  acc = {
    maxAppliedY: 0, minAppliedX: 0, maxAppliedX: 0, minTargetX: 0, maxTargetX: 0,
    maxApexScreen: 0, maxSweepScreen: 0, maxZoomInPack: 0,
    maxFace: 0, maxWake: 0, maxLight: 0, maxMlFactor: 1, maxWarp: 0, maxTilt: 0,
    sawCurveProvenance: false, shotDirectionSeen: false, samples: 0,
  };
}
function feedAcc(t) {
  if (!t) return;
  acc.samples += 1;
  const ay = t?.applied?.y ?? 0;
  const zoom = t?.camera?.zoom ?? 0;
  const stageH = t?.stage?.h ?? 0;
  const stageW = t?.stage?.w ?? 0;
  acc.maxAppliedY = Math.max(acc.maxAppliedY, ay);
  acc.minAppliedX = Math.min(acc.minAppliedX, t?.applied?.x ?? 0);
  acc.maxAppliedX = Math.max(acc.maxAppliedX, t?.applied?.x ?? 0);
  acc.minTargetX = Math.min(acc.minTargetX, t?.target?.x ?? 0);
  acc.maxTargetX = Math.max(acc.maxTargetX, t?.target?.x ?? 0);
  if (t?.pack?.running && stageH > 0 && stageW > 0) {
    acc.maxZoomInPack = Math.max(acc.maxZoomInPack, zoom);
    // direct on-screen reads (D-0098): what the frame actually shows
    acc.maxApexScreen = Math.max(acc.maxApexScreen, ((ay / 8) * zoom) / stageH);
    acc.maxSweepScreen = Math.max(
      acc.maxSweepScreen,
      (((acc.maxAppliedX - acc.minAppliedX) / 8) * zoom) / stageW,
    );
  }
  acc.maxFace = Math.max(acc.maxFace, Number(t?.face ?? 0));
  acc.maxWake = Math.max(acc.maxWake, Number(t?.dataset?.physWake ?? 0));
  acc.maxLight = Math.max(acc.maxLight, Number(t?.dataset?.physLight ?? 0));
  acc.maxMlFactor = Math.max(acc.maxMlFactor, Number(t?.dataset?.mlFactor ?? 1));
  acc.maxWarp = Math.max(acc.maxWarp, Number(t?.dataset?.wakeStretch ?? 0));
  acc.maxTilt = Math.max(acc.maxTilt, Math.abs(t?.applied?.tilt ?? 0));
  if (t?.dataset?.provenance === "curve-authority") acc.sawCurveProvenance = true;
  if (t?.camera?.shotDirectionActive) acc.shotDirectionSeen = true;
}
resetAcc();

function shot(file, note, atTrigger) {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  const at = readTel();
  feedAcc(at);
  sidecar.push({ file, note, ok: !!r?.ok, sizeBytes: r?.data?.sizeBytes ?? null, packT: r3(atTrigger?.pack?.t ?? at?.pack?.t ?? null), beat: at?.beatId, shotScale: at?.shotScale, zoom: r3(at?.camera?.zoom ?? null), face: r3(at?.face ?? null) });
  const a = at?.applied ?? {};
  const ds = at?.dataset ?? {};
  console.log(`   ${file} ${r?.ok ? r.data.sizeBytes + "b" : "FAIL"} t=${r2(atTrigger?.pack?.t ?? at?.pack?.t)} beat=${at?.beatId} scale=${at?.shotScale} zoom=${r3(at?.camera?.zoom)} applied=(${r2(a.x)},${r2(a.y)}) face=${r2(at?.face)} wake=${ds.physWake} light=${ds.physLight}`);
  return at;
}

/** Run a craft pack, taking telemetry-synced shots at the planned pack times
 *  and accumulating machine-proof observables on every poll. */
function performWithShots(packId, plan, tailMs = 1500) {
  resetAcc();
  const started = evaluate(`window.__GASPER_DAIS__.runCraftPack('${packId}')`);
  if (started !== true) return { started: false };
  let i = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const t = readTel();
    feedAcc(t);
    const pt = t?.pack?.t ?? -1;
    while (i < plan.length && pt >= plan[i].t) {
      shot(plan[i].file, plan[i].note, t);
      i += 1;
    }
    if (t?.pack && t.pack.running === false && pt > 0.1) break;
    sleep(40);
  }
  sleep(tailMs); // release ease (auto-disarm + home ease) before the settled shot
  return { started: true };
}

function waitHomeSettled(timeoutMs, stepMs = 300) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const t = readTel();
    feedAcc(t);
    if (t?.target?.provenance === "none" && Math.abs(t?.applied?.x ?? 1) === 0 && Math.abs(t?.applied?.y ?? 1) === 0 && !t?.worldRigTransform) return t;
    sleep(stepMs);
  }
  return readTel();
}

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);

// ── Bundle-freshness gate (D-0098): the served modules must carry the
// amendment markers — shot-direction zoom ceiling in the viewport controller,
// contour measurement source in the dais stage — and the page must expose the
// C5 surface with the D-0097 bias default ("authored"; a stale bundle reads
// "wide" and is refused). ──
const d0098Viewport = servedContains("packages/desktop/src/gasper/GasperViewportController.ts", "SHOT_DIRECTION_ZOOM_MAX");
const d0098Stage = servedContains("packages/desktop/src/gasper/GasperDaisStage.tsx", "bodyClip path");
console.log("served D-0098 markers:", JSON.stringify({ d0098Viewport, d0098Stage }));
console.log("reload:", wb({ action: "cdp", args: { method: "Page.reload", params: {} }, session: "gasper-visual-review" }, 120)?.ok);
sleep(6500);
const gate = evaluate(`(() => {
  const d = window.__GASPER_DAIS__;
  const rig = window.SidekickFormMasterRig;
  return JSON.stringify({
    dais: !!d,
    runCraftPack: typeof d?.runCraftPack === 'function',
    stopCraftPack: typeof d?.stopCraftPack === 'function',
    packState: typeof d?.getPerformancePackState === 'function',
    bias: d?.getCraftShotBias?.() ?? null,
    faceIntake: typeof rig?.setFaceEnergy === 'function',
    worldRigGroup: !!document.getElementById('worldRig'),
    clipPath: !!document.querySelector('#bodyClip path'),
  });
})()`);
console.log("freshness:", gate);
const g = JSON.parse(gate ?? "{}");
if (!d0098Viewport || !d0098Stage || !g.dais || !g.runCraftPack || !g.stopCraftPack || !g.packState || !g.faceIntake || !g.worldRigGroup || !g.clipPath || g.bias !== "authored") {
  console.error("ABORT: GASPER-CRAFT-001 C5 bundle (D-0097 + D-0098) not live on 5174 — no capture taken on stale code.");
  process.exit(1);
}

console.log("unpause:", evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'"));
console.log("freeze:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true }); if (typeof l.eightLoop.setAutoLoop === 'function') l.eightLoop.setAutoLoop(false); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));

// ── Baseline: presence settled at home; measure the live silhouette anchor ──
console.log("baseline: key presence:", setAuthoredEmbodiment("presence"));
goState("presence-neutral-settled");
sleep(2200);
const home = readTel();
const contourH = home?.contourH ?? 0;
const stageH = home?.stage?.h ?? 0;
const stageW = home?.stage?.w ?? 0;
// D-0098 staging prediction: extreme-close frames the contour at f = 0.9 of
// stage height; the camera must obey within 5% (clamp 5.5).
const predictedZoom = contourH > 0 ? Math.min(5.5, (stageH * 0.9) / contourH) : 0;
console.log(`home anchor: contourH=${r2(contourH)}px stage=${r2(stageW)}x${r2(stageH)} predicted extreme-close zoom=${r3(predictedZoom)} resting zoom=${r3(home?.camera?.zoom)}`);
shot("craft-00-home-baseline.png", "home pose, packs idle, shot direction off");
if (!(contourH > 100)) {
  console.error("ABORT: silhouette anchor unmeasurable — no framing law without it.");
  process.exit(1);
}
sidecar.push({ file: null, note: "D-0098 home anchor", contourH: r2(contourH), compileAnchor: 153, stage: { w: r2(stageW), h: r2(stageH) }, predictedExtremeCloseZoom: r3(predictedZoom) });

// ════════════════════ s2-bounce — the bouncing ball ════════════════════
console.log("s2-bounce: performing");
performWithShots("s2-bounce", [
  { t: 0.95, file: "craft-01-s2-gather-coil.png", note: "gather beat — anticipation crouch, tilt lean, face quiet (extreme-close framing)" },
  { t: 1.95, file: "craft-02-s2-launch.png", note: "launch — flight stretch onset, launch-excitement face rising" },
  { t: 2.42, file: "craft-03-s2-first-apex.png", note: "first apex — authored 950 world units, apex float + shadow attenuation" },
  { t: 3.28, file: "craft-04-s2-first-impact.png", note: "first impact — squash spike 0.42, impact-focus AU4" },
  { t: 3.82, file: "craft-05-s2-second-arc.png", note: "second arc — restitution decay, still traveling space" },
  { t: 4.42, file: "craft-06-s2-second-touch.png", note: "second touchdown — squash 0.24, second-touch focus" },
  { t: 5.4, file: "craft-07-s2-settle-smile.png", note: "settle beat — genuine smile (AU6+AU12), drift home" },
]);
const s2Final = waitHomeSettled(6000);
shot("craft-08-s2-release-home.png", "s2 auto-release — pack ended, eased home, transform removed");

// D-0098 apex floor, live, as a DIRECT ON-SCREEN READ: the max sampled
// (applied altitude px · zoom) / stageH must clear 40% of frame height.
const s2ApexOk = acc.maxApexScreen >= 0.4;
const s2StagingOk = acc.shotDirectionSeen && acc.maxZoomInPack >= predictedZoom * 0.95;
const s2FaceOk = acc.maxFace >= 0.4;
const s2ReleaseOk = s2Final?.target?.provenance === "none" && !s2Final?.worldRigTransform && Math.abs(s2Final?.applied?.x ?? 1) === 0;
console.log("s2 proof:", JSON.stringify({ s2ApexOk, apexScreenRead: r3(acc.maxApexScreen), maxAppliedY: r2(acc.maxAppliedY), s2StagingOk, maxZoomInPack: r3(acc.maxZoomInPack), predictedZoom: r3(predictedZoom), s2FaceOk, maxFace: r3(acc.maxFace), sawCurveProvenance: acc.sawCurveProvenance, s2ReleaseOk }));
sidecar.push({ file: null, note: "s2 machine proof (D-0098 on-screen apex)", s2ApexOk, apexScreenRead: r3(acc.maxApexScreen), maxAppliedY: r2(acc.maxAppliedY), authoredApex: 950, s2StagingOk, maxZoomInPack: r3(acc.maxZoomInPack), s2FaceOk, maxFace: r3(acc.maxFace), sawCurveProvenance: acc.sawCurveProvenance, s2ReleaseOk });

// ════════════════════ s4-comet — the comet shot ════════════════════
console.log("s4-comet: performing");
performWithShots("s4-comet", [
  { t: 1.2, file: "craft-09-s4-gather-drift.png", note: "gather beat — drifting to the far edge, charge-focus AU4 macro onset" },
  { t: 2.15, file: "craft-10-s4-coil-hold.png", note: "coil hold at the world edge — crouch stretch −0.22, tilt −14" },
  { t: 2.7, file: "craft-11-s4-whip-crack.png", note: "the whip — full-world crack, flight stretch + whip tilt, wake + light live" },
  { t: 3.28, file: "craft-12-s4-wall-impact.png", note: "wall impact — squash 0.48 spike, wall-impact-focus AU4 0.95" },
  { t: 4.0, file: "craft-13-s4-recoil.png", note: "recoil hold — the wall answers, wobble begins" },
  { t: 5.5, file: "craft-14-s4-settle-smile.png", note: "consequence beat — genuine smile, drifting home" },
]);
const s4Final = waitHomeSettled(6000);
shot("craft-15-s4-release-home.png", "s4 auto-release — consequence settled, eased home");

// D-0098 sweep floor, live: the COMMANDED sweep (target telemetry) spans the
// full world; the applied pose reaches the wall region both sides (0.14s
// display smoothing costs ~2% of a 2400 u/s sweep); the on-screen traverse
// reading is reported against the 80% floor.
const s4CommandedOk = acc.minTargetX <= -959 && acc.maxTargetX >= 959;
const s4ReachOk = acc.minAppliedX <= -880 && acc.maxAppliedX >= 880;
const s4FeedsOk = acc.maxWake > 0.5 && acc.maxLight > 1 && acc.maxMlFactor > 1.01;
const s4StagingOk = acc.shotDirectionSeen && acc.maxZoomInPack >= predictedZoom * 0.95;
const s4ReleaseOk = s4Final?.target?.provenance === "none" && !s4Final?.worldRigTransform && Math.abs(s4Final?.applied?.x ?? 1) === 0;
console.log("s4 proof:", JSON.stringify({ s4CommandedOk, targetX: [r2(acc.minTargetX), r2(acc.maxTargetX)], s4ReachOk, appliedX: [r2(acc.minAppliedX), r2(acc.maxAppliedX)], sweepScreenRead: r3(acc.maxSweepScreen), sweepFloor: 0.8, s4FeedsOk, maxWake: r2(acc.maxWake), maxLight: r2(acc.maxLight), s4StagingOk, s4ReleaseOk }));
sidecar.push({ file: null, note: "s4 machine proof (D-0098 on-screen sweep)", s4CommandedOk, targetX: [r2(acc.minTargetX), r2(acc.maxTargetX)], s4ReachOk, appliedX: [r2(acc.minAppliedX), r2(acc.maxAppliedX)], sweepScreenRead: r3(acc.maxSweepScreen), sweepFloor: 0.8, authoredSweep: 1920, s4FeedsOk, maxWake: r2(acc.maxWake), maxLight: r2(acc.maxLight), maxTilt: r2(acc.maxTilt), s4StagingOk, s4ReleaseOk, smoothingNote: "WORLD_SPACE.tau 0.14s first-order lag on a 2400 u/s ramp" });

// ── Provenance fence re-proof (craft intake + the D-0089 space fence) ──
const bogusRejected = evaluate("window.__GASPER_DAIS__.runCraftPack('bogus-pack')") === false;
evaluate("window.__GASPER_DAIS__.setWorldPose({ x: 600, y: 300, z: 0, tilt: 0, provenance: 'bogus-provenance' })");
sleep(700);
const fenceAfter = readTel();
const fenceOk =
  bogusRejected &&
  fenceAfter?.target?.provenance === "none" &&
  Math.abs(fenceAfter?.target?.x ?? 1) < 1e-6 &&
  Math.abs(fenceAfter?.applied?.x ?? 1) < 2;
console.log("fence: bogus pack rejected + unprovenanced command ->", fenceOk ? "FAIL CLOSED OK" : "VIOLATION");
sidecar.push({ file: null, note: "provenance fence proof (no shot)", bogusRejected, fenceOk, target: fenceAfter?.target, applied: fenceAfter?.applied });

// ── Reduced-motion collapse probe: lifeScale 0 mid-flight => motionStrength 0
// => applied pose eases home (tau 0.4s), warp gate closes, motion-light
// identity — while the pack driver keeps ticking (the target lives on). The
// face carrier is expression, not motion: it persists (reported). ──
evaluate("window.__GASPER_DAIS__.runCraftPack('s2-bounce')");
{
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const t = readTel();
    if ((t?.pack?.t ?? 0) >= 2.0) break;
    sleep(40);
  }
}
evaluate("window.SidekickFormMasterRig.setLifeScale(0), 'ok'");
sleep(2400);
const collapsed = readTel();
const collapseOk =
  (collapsed?.pack?.running ?? false) === true && // pack still performing…
  Math.abs(collapsed?.applied?.x ?? 99) < 8 && Math.abs(collapsed?.applied?.y ?? 99) < 8 && // …but drawn home
  Number(collapsed?.dataset?.wakeStretch ?? 1) < 0.02 && // warp gate closed
  Number(collapsed?.dataset?.mlFactor ?? 2) < 1.01; // light identity
console.log("collapse probe: lifeScale=0 mid-flight ->", collapseOk ? "COLLAPSE OK" : "NOT COLLAPSED", JSON.stringify({ running: collapsed?.pack?.running, applied: collapsed?.applied, warp: collapsed?.dataset?.wakeStretch, mlF: collapsed?.dataset?.mlFactor, facePersist: r2(collapsed?.face ?? 0) }));
shot("craft-16-collapse-home.png", "reduced-motion collapse mid-pack — drawn home, driver target lives on, face persists");
sidecar.push({ file: null, note: "reduced-motion collapse probe", collapseOk, running: collapsed?.pack?.running, applied: collapsed?.applied, facePersist: r2(collapsed?.face ?? 0) });
evaluate("window.SidekickFormMasterRig.setLifeScale(1), 'ok'");
evaluate("window.__GASPER_DAIS__.stopCraftPack(), 'ok'");
sleep(1200);
waitHomeSettled(5000);

// ── Restore: autonomy + presence baseline + home pose ──
console.log("restore policy:", evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false }); return JSON.stringify({ autoSeq: l.autoSequence, autoLoop: l.eightLoop.autoLoop }); })()`));
console.log("restore presence:", setAuthoredEmbodiment("presence"));
console.log("restore state:", goState("presence-neutral-settled"));
sleep(1200);
shot("craft-17-restore-home.png", "restored — autonomy back, presence settled at home");

writeFileSync(join(outDir, "capture-craft-sidecar.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  method: "craft pack performances + telemetry-synced shots (GASPER-CRAFT-001 C5, D-0097 + D-0098 amendments)",
  doctrine: {
    floorsCompile: "authored framing (extreme-close, f=0.9), contour anchor 153px, stage aspect live — machine-proven in CraftPacks gate suite",
    floorsCapture: "direct on-screen reads: apex (applied altitude px · zoom)/stageH ≥ 0.4 gated; sweep (applied range px · zoom)/stageW reported against 0.8; commanded sweep + wall reach gated",
    silhouetteSource: "#bodyClip path (projected contour) — D-0098; #idleRig bbox polluted by clipped decorative layers (subsurface bands)",
    capturesObserverOnly: true,
  },
  shots: sidecar,
}, null, 2) + "\n");

const proofs = { s2ApexOk, s2StagingOk, s2FaceOk, s2ReleaseOk, s4CommandedOk, s4ReachOk, s4FeedsOk, s4StagingOk, s4ReleaseOk, fenceOk, collapseOk };
const failures = sidecar.filter((s) => s.ok === false).concat(Object.entries(proofs).filter(([, v]) => !v).map(([k]) => ({ failed: k })));
console.log(JSON.stringify({ ok: failures.length === 0, outDir, shots: sidecar.filter((s) => s.file).length, proofs, failures }));
