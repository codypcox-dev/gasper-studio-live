// Recovery stills vs seq18: t=0, 2, 8, 11.4. Not a 20s take.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://127.0.0.1:5179/?seq20=recover-pearl";
const OUT = resolve("research/proofs/grok-successor-002/take-recover-20260815-pearl");
const STEP_MS = 1000 / 120;
const STILLS = [0, 2, 8, 11.4];
const VIEWPORT = { width: 1280, height: 900 };

mkdirSync(join(OUT, "stills"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(
  () => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && globalThis.__GASPER_ORGANISM_CLOCK__ && document.querySelector("#avatar"),
  { timeout: 30000 },
);
await page.waitForTimeout(600);

await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  d.stopLiving?.();
  d.startLiving?.({ seed: 20260808, autoSequence: false, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  d.disarmWorldBody?.();
  rig.setPaused?.(false);
  d.setEmbodiment?.("wispwalker");
  rig.setProfile?.("wispwalker");
  clock.stop();
  clock.reset({ seed: 20260808, timeMs: 0 });
  clock.setFixedStepMs(1000 / 120);
  clock.setMode("deterministic");
  const vp = d.getViewport?.();
  vp.releaseUserWorldFrame?.();
  vp.setAutoFit?.(false);
  d.setCompositionWorldEnvelope?.(null);
  vp.holdUserWorldFrame({ zoom: 2, panX: 0, panY: 0 });
  d.playNorthstarTwenty();
});

await page.addStyleTag({
  content: `.gwc-app-bar,.gwc-ctx-bar,.gwc-stage-chrome,.gwc-status,.dais-transport-bar,.gasper-hud,.dais-control-rail,.viewport-chrome{visibility:hidden!important}`,
});

const stageClip = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="gasper-dais"]');
  const r = el?.getBoundingClientRect?.();
  return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
});

const notes = [];
let step = 0;
const last = Math.round((11.4 * 1000) / STEP_MS);
for (; step <= last; step += 1) {
  if (step > 0) {
    await page.evaluate((ms) => {
      globalThis.__GASPER_ORGANISM_CLOCK__.step(ms);
      globalThis.SidekickFormMasterRig?.requestOneFrame?.();
    }, STEP_MS);
  }
  const tSec = step * STEP_MS / 1000;
  const hit = STILLS.find((s) => Math.abs(tSec - s) < STEP_MS / 2000);
  if (hit == null) continue;
  const cap = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 90,
    fromSurface: true,
    clip: stageClip,
  });
  const name = hit === 0 ? "t0.jpg" : `t-${String(hit).replace(".", "p")}.jpg`;
  writeFileSync(join(OUT, "stills", name), Buffer.from(cap.data, "base64"));
  const probe = await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    const st = d.getWorldBodyState?.();
    const ds = document.querySelector("#avatar")?.dataset || {};
    return {
      bodyX: st?.body?.x ?? null,
      bodyY: st?.body?.y ?? null,
      boo: d.isBooEnabled?.() ?? null,
      poseX: ds.worldPoseX ?? null,
      heading: ds.headingYaw ?? null,
    };
  });
  notes.push({ t: hit, file: name, ...probe });
}

await browser.close();
writeFileSync(join(OUT, "stills.json"), JSON.stringify({ baseline: "seq18", notes }, null, 2));
console.log(JSON.stringify({ out: OUT, notes }, null, 2));
