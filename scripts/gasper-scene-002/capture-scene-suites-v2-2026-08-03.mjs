// GASPER-SCENE-002 live capture drive: v2 re-leveraged suites at deterministic
// beats. Scene anchor resets on embodiment click => each drive is T=0 for its
// suite. Cycler off isolates suite performance from state morphs (F5 masking).
// Machine sidecar records suite sample + eye_openness + posture per shot.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-scene-002/visual-after");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command) {
  const f = join(TMP, `wb-s002-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m 25 -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;
const sidecar = [];
const shot = (file) => {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  const telemetry = evaluate(`(() => { try { const l = window.__GASPER_DAIS__?.living?.eightLoop; const v = l?.lastLivingSnapshot?.values ?? {}; const s = l?.lastSceneSample; return JSON.stringify({ suite: s?.suiteId, movement: s?.movementId, intent: s?.intent, movementT: s?.movementT, eye_openness: v.eye_openness, gaze: v.gaze, posture_x: v.posture_x, posture_y: v.posture_y, crown_height: v.crown_height, asym: v.asym, body_lean: v.body_lean, energy_level: v.energy_level, internal_glow: v.internal_glow, deltas: s?.deltas }); } catch (e) { return String(e); } })()`);
  let parsed = null;
  try { parsed = JSON.parse(telemetry); } catch { /* keep raw */ }
  sidecar.push({ file, ok: !!r?.ok, sizeBytes: r?.data?.sizeBytes ?? null, telemetry: parsed ?? telemetry });
  console.log(" ", file, r?.ok ? `${r.data.sizeBytes}b` : "FAIL");
};
const clickEmb = (id) => evaluate(`document.querySelector('[data-testid="dais-rail-embodiment-${id}"]')?.click(), '${id}'`);

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);
console.log("cycler off:", evaluate("window.SidekickFormMasterRig.setEightStateEnabled(false), 'ok'"));
console.log("unpause:", evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'"));

// ── Singularity: Collapse & Orbit v2 (24s) ──
console.log("singularity:", clickEmb("singularity"));
sleep(4500); // fall landing (T≈4.5)
shot("singularity-01-fall.png");
sleep(4500); // T≈9 orbit-cycle-a drift
shot("singularity-02-orbit-a.png");
sleep(4000); // T≈13 lensing-flare crest
shot("singularity-03-lensing-flare.png");
sleep(4000); // T≈17 orbit-cycle-b echo
shot("singularity-04-orbit-b.png");
sleep(4500); // T≈21.5 soften
shot("singularity-05-soften.png");

// ── Presence: Awareness v2 (20s) ──
console.log("presence:", clickEmb("presence"));
sleep(5300); // T≈5.3 orient sweep
shot("presence-01-orient.png");
sleep(5700); // T≈11 regard: lift + eyes open beat
shot("presence-02-regard.png");
sleep(4000); // T≈15 spark-echo: recognition dilation
shot("presence-03-spark-echo.png");
sleep(3500); // T≈18.5 home: changed rest
shot("presence-04-home.png");

// ── Comet: Pursuit v2 (16s) ──
console.log("comet:", clickEmb("comet"));
sleep(5500); // T≈5.5 mid-drive thrust
shot("comet-01-drive.png");
sleep(4500); // T≈10 consequence overshoot
shot("comet-02-consequence.png");

// ── Low-orbit: Compression Physics v2 (18s) ──
console.log("low-orbit:", clickEmb("low-orbit"));
sleep(6500); // T≈6.5 pressure-hold
shot("low-orbit-01-pressure-hold.png");
sleep(5000); // T≈11.5 expand release
shot("low-orbit-02-expand.png");

// Restore: presence + autonomy.
console.log("restore presence:", clickEmb("presence"));
console.log("cycler on:", evaluate("window.SidekickFormMasterRig.setEightStateEnabled(true), 'ok'"));
writeFileSync(join(outDir, "capture-sidecar.json"), JSON.stringify({ generatedAt: new Date().toISOString(), shots: sidecar }, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, outDir }));
