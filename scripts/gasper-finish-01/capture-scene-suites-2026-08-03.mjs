// GASPER-SCENE-001 live proof drive: capture suite movements at deterministic times.
// Scene anchor resets on embodiment change, so each drive is T=0 for its suite.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-scene-001/visual");
mkdirSync(outDir, { recursive: true });
const TMP = process.env.TEMP || "C:/Users/funny/AppData/Local/Temp";
let seq = 0;
function wb(command) {
  const f = join(TMP, `wb-scn-${Date.now()}-${seq++}.json`);
  writeFileSync(f, JSON.stringify(command), "utf-8");
  try {
    return JSON.parse(execSync(`curl.exe -s -m 25 -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${f}"`, { encoding: "utf-8" }));
  } finally { rmSync(f, { force: true }); }
}
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const evaluate = (code) => wb({ action: "evaluate", args: { code }, session: "gasper-visual-review" })?.data?.value;
const shot = (file) => {
  const r = wb({ action: "screenshot", args: { format: "png", path: join(outDir, file) }, session: "gasper-visual-review" });
  console.log(" ", file, r?.ok ? `${r.data.sizeBytes}b` : `FAIL`);
};
const clickEmb = (id) => evaluate(`document.querySelector('[data-testid="dais-rail-embodiment-${id}"]')?.click(), '${id}'`);

console.log("front:", wb({ action: "cdp", args: { method: "Page.bringToFront", params: {} }, session: "gasper-visual-review" })?.ok);
console.log("cycler off:", evaluate("window.SidekickFormMasterRig.setEightStateEnabled(false), 'ok'"));
console.log("unpause:", evaluate("window.SidekickFormMasterRig.setPaused(false), 'ok'"));

// ── Singularity: Collapse & Orbit (24s) — T0 = fall, +8 orbit-a, +13 flare ──
console.log("singularity:", clickEmb("singularity"));
sleep(4500); // morph settle + fall landing
shot("singularity-01-fall.png");
sleep(4500); // T≈9 orbit cycle a
shot("singularity-02-orbit.png");
sleep(3500); // T≈12.5 lensing flare crest
shot("singularity-03-lensing-flare.png");

// ── Presence: Awareness (20s) — T0 arrive, +5.5 orient sweep, +11 regard ──
console.log("presence:", clickEmb("presence"));
sleep(5300); // morph settle + orient gaze sweep left
shot("presence-01-orient.png");
sleep(5800); // T≈11 regard: breath swell, glow rise
shot("presence-02-regard.png");

// ── Comet: Pursuit (16s) — +5.5 mid-drive thrust ──
console.log("comet:", clickEmb("comet"));
sleep(5500);
shot("comet-01-drive.png");

// ── Low-orbit: Compression Physics (18s) — +6.5 pressure-hold ──
console.log("low-orbit:", clickEmb("low-orbit"));
sleep(6500);
shot("low-orbit-01-pressure-hold.png");

// Restore: presence + autonomy.
console.log("restore presence:", clickEmb("presence"));
console.log("cycler on:", evaluate("window.SidekickFormMasterRig.setEightStateEnabled(true), 'ok'"));
console.log(JSON.stringify({ ok: true, outDir }));
