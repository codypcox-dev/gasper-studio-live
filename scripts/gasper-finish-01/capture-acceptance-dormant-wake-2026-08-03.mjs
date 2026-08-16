// Canonical dormant-orbit embodiment + state, then wake — final pair.
import { writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
const outDir = resolve("research/proofs/gasper-finish-01/visual/acceptance-2026-08-03");
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command) {
  const f = join(TMP, `wb-acc5-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m 25 -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;
const shot = (file) => {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  console.log(file, r?.ok ? `${r.data.sizeBytes}b` : `FAIL`);
};
console.log("cycler off:", evaluate("window.SidekickFormMasterRig.setEightStateEnabled(false), 'ok'"));
console.log("dormant emb:", evaluate("document.querySelector('[data-testid=\"dais-rail-embodiment-dormant-orbit\"]')?.click(), 'ok'"));
console.log("dormant state:", evaluate("(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'Dormant'); b?.click(); return 'ok'; })()"));
sleep(3400);
console.log("  verify:", evaluate("document.querySelector('svg#avatar')?.dataset.morphTo"));
shot("08-dormant-orbit-maintain.png");
console.log("wake:", evaluate("(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'Wake'); b?.click(); return 'ok'; })()"));
sleep(650);
shot("10-wake-mid.png");
sleep(2400);
shot("11-wake-settled.png");
console.log("  verify:", evaluate("document.querySelector('svg#avatar')?.dataset.morphTo"));
console.log("restore:", evaluate("document.querySelector('[data-testid=\"dais-rail-embodiment-presence\"]')?.click(), window.SidekickFormMasterRig.setEightStateEnabled(true), 'ok'"));
