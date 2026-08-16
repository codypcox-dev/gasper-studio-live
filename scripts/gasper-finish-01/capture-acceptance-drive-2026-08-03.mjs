// Acceptance drive v2 (clock live, tab frontmost): 8 states + singularity + wake.
// Proof script — GASPER-FINISH-01 row 16 (human visual acceptance evidence).
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-finish-01/visual/acceptance-2026-08-03");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;

function wb(command, timeoutSec = 25) {
  const f = join(TMP, `wb-acc3-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    const res = execSync(
      `curl.exe -s -m ${timeoutSec} -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`,
      { encoding: "utf-8" }
    );
    return JSON.parse(res);
  } finally {
    rmSync(f, { force: true });
  }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;
function shot(file) {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  console.log(file, r?.ok ? `${r.data.sizeBytes}b` : `FAIL ${JSON.stringify(r)}`);
}
const drive = (expr) => console.log(expr.slice(0, 60), "→", evaluate(`(() => { try { const v = (${expr}); void v; return 'ok'; } catch(e) { return 'err:' + e.message; } })()`));

// Ensure frontmost + unpaused + auto-cycler frozen for the drive.
console.log("front:", JSON.stringify(wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok));
drive("window.SidekickFormMasterRig.setPaused(false)");
drive("window.SidekickFormMasterRig.setEightStateEnabled(false)");

const states = [
  ["presence-neutral-settled", "01-neutral-settled.png"],
  ["presence-listening-receive", "02-listening-receive.png"],
  ["presence-thinking-knit", "03-thinking-knit.png"],
  ["presence-recognition-spark", "04-recognition-spark.png"],
  ["comet-executing-drive", "05-comet-executing-drive.png"],
  ["presence-blocked-strain", "06-blocked-strain.png"],
  ["presence-pleased-resolve", "07-pleased-resolve.png"],
  ["dormant-orbit-maintain", "08-dormant-orbit-maintain.png"],
];

for (const [id, file] of states) {
  drive(`window.SidekickFormMasterRig.setEightState(${JSON.stringify(id)})`);
  sleep(2600); // gather + peak + settle land with live clock
  const st = evaluate("JSON.stringify({m:document.querySelector('svg#avatar')?.dataset.morphTo, b:window.SidekickFormMasterRig.getBehaviorState?.()?.morphStatus})");
  console.log("  state:", st);
  shot(file);
}

drive("window.SidekickFormMasterRig.morphToBehavioral('singularity')");
sleep(2800);
shot("09-singularity.png");

drive("window.SidekickFormMasterRig.wake ? window.SidekickFormMasterRig.wake() : window.SidekickFormMasterRig.morphToBehavioral('presence')");
sleep(750);
shot("10-wake-mid.png");
sleep(2300);
shot("11-wake-settled.png");

// Restore living autonomy.
drive("window.SidekickFormMasterRig.setEightStateEnabled(true)");
drive("window.SidekickFormMasterRig.setPaused(false)");
console.log(JSON.stringify({ ok: true, outDir }));
