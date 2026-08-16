// GASPER-SPACE-001 PHASE B — live demo drive for the owner.
// Brings the review browser to front and performs the two Phase B bar
// scenes back to back on the organism clock, in real time, so the owner
// can WATCH the browser: S2 the bouncing ball (travel + squash + settle),
// then S4 the comet (gather crouch -> hard shot -> wall consequence ->
// settle). Both performances auto-release home. Restores autonomy after.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-space-001/visual");
mkdirSync(outDir, { recursive: true });
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
const shot = (file) => wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" })?.ok;

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);
evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'");
// Steady the stage on presence so the physics reads clean.
evaluate("window.__GASPER_DAIS__.setEmbodiment('presence'), 'ok'");
evaluate("window.__GASPER_DAIS__.living.goEightState('presence-neutral-settled', { duration: 0.55 }), 'ok'");
evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true }); if (typeof l.eightLoop.setAutoLoop === 'function') l.eightLoop.setAutoLoop(false); return 'ok'; })()`);
sleep(1200);

console.log("S2 — the bouncing ball: launching (watch the browser)…");
evaluate("window.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.35 }), 'ok'");
evaluate("window.__GASPER_DAIS__.launchWorldBounce({}), 'ok'");
sleep(700);
shot("demo-01-bounce-flight.png");
sleep(500);
shot("demo-02-bounce-impact.png");
// let the bounce chain play out, settle, and release home
sleep(7000);

console.log("S4 — the comet: gather… shot… (watch the browser)");
evaluate("window.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.2 }), 'ok'");
evaluate("window.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 1.4 }), 'ok'");
sleep(1000);
shot("demo-03-comet-gather.png");
sleep(1100);
shot("demo-04-comet-flight.png");
sleep(7000);

// Restore authored params + autonomy.
evaluate("window.__GASPER_DAIS__.setWorldPhysicsParams({ gravityScale: 1, restitution: 0.62, launchPower: 1, intensity: 0.7 }), 'ok'");
evaluate(`(() => { const l = window.__GASPER_DAIS__.living; l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false }); return 'ok'; })()`);
console.log("demo complete — both performances released home, autonomy restored.");
