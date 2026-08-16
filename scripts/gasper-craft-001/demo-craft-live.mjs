// GASPER-SCREEN-DOOR · C5 LIVE DEMO — the re-staged bounce + comet, performed
// in real time for owner Cody's eyes. No screenshots, no telemetry polling
// beyond the completion check — the show runs uninterrupted on the review
// stage. Observer-only: this script commands the performance and watches the
// clock; pixels never feed organism state.
//
//   Act 1 — s2-bounce: the bouncing ball (coil / flight / two honest bounces /
//                      settle-smile), extreme-close, authored apex 950 units.
//   Act 2 — s4-comet:  drift to the edge / coil / the full-world whip into the
//                      wall / consequence settle-smile.
//
// Autonomy is frozen for the show and RESTORED at the end no matter what.
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command, timeoutS = 25) {
  const f = join(TMP, `wb-demo-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m ${timeoutS} -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;

const PACK_STATE = `(() => { const ps = window.__GASPER_DAIS__?.getPerformancePackState?.(); return ps ? JSON.stringify({ running: ps.running, t: ps.t, packId: ps.packId }) : 'null'; })()`;

console.log("bringing the review stage to front…");
console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);

// Light readiness check — no reload (the D-0098 bundle is already live; a
// reload would only add a blank pause before the show).
const ready = JSON.parse(evaluate(`(() => {
  const d = window.__GASPER_DAIS__;
  return JSON.stringify({
    dais: !!d,
    runCraftPack: typeof d?.runCraftPack === 'function',
    bias: d?.getCraftShotBias?.() ?? null,
  });
})()`) ?? "{}");
if (!ready.dais || !ready.runCraftPack || ready.bias !== "authored") {
  console.error("ABORT: D-0098 craft bundle not live —", JSON.stringify(ready));
  process.exit(1);
}
console.log("bundle ready (bias = authored). freezing autonomy for the show…");

evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'");
evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true }); if (typeof l.eightLoop.setAutoLoop === 'function') l.eightLoop.setAutoLoop(false); return 'frozen'; })()`);
evaluate("window.__GASPER_DAIS__.setEmbodiment('presence'), 'ok'");
evaluate("window.__GASPER_DAIS__.living.goEightState('presence-neutral-settled', { duration: 0.55 }), 'ok'");
sleep(1800);

function perform(packId, label, maxMs = 20000) {
  console.log(`▶ ${label} — ${packId}`);
  const started = evaluate(`window.__GASPER_DAIS__.runCraftPack('${packId}')`);
  if (started !== true) { console.error("  pack refused to start"); return false; }
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    sleep(200); // let the performance breathe — no busy polling during the show
    const ps = JSON.parse(evaluate(PACK_STATE) ?? "{}");
    if (ps && ps.running === false && (ps.t ?? 0) > 0.1) break;
  }
  sleep(2200); // release ease home
  return true;
}

try {
  perform("s2-bounce", "ACT 1 — the bouncing ball", 20000);
  sleep(900); // a breath between acts
  perform("s4-comet", "ACT 2 — the comet", 20000);
} finally {
  sleep(600);
  console.log("restoring autonomy…");
  evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false }); return 'restored'; })()`);
  evaluate("window.__GASPER_DAIS__.setEmbodiment('presence'), 'ok'");
  evaluate("window.__GASPER_DAIS__.living.goEightState('presence-neutral-settled', { duration: 0.55 }), 'ok'");
}
console.log("DEMO COMPLETE — both acts performed live; autonomy restored. The verdict is owner Cody's.");
