import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const OUT = resolve(
  process.env.GASPER_N333_OUT ||
    "research/proofs/grok-successor-002/live-5179-n333-capture",
);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const LIVE_URL =
  process.env.GASPER_LIVE_URL ||
  "http://127.0.0.1:5179/?livecapture=" + Date.now();
await page.goto(LIVE_URL, {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
await page.waitForFunction(
  () =>
    globalThis.__GASPER_DAIS__ &&
    globalThis.SidekickFormMasterRig &&
    document.querySelector("#avatar"),
  { timeout: 30000 },
);
await page.waitForTimeout(1200);

const state = await page.evaluate(() => {
  const rig = globalThis.SidekickFormMasterRig;
  const d = globalThis.__GASPER_DAIS__;
  const snap = rig.getSnapshot?.() || {};
  const tel = d.getTuningLabTelemetry?.() || {};
  const vp = d.getViewport?.()?.getState?.() || {};
  const ds = document.querySelector("#avatar")?.dataset || {};
  const body = document.querySelector("#body");
  let bbox = null;
  try {
    const b = body?.getBBox?.();
    if (b) bbox = { x: b.x, y: b.y, w: b.width, h: b.height };
  } catch {
    /* */
  }
  return {
    profile: snap.profile ?? null,
    morph: snap.morph ?? null,
    formAttr: ds.formProfile ?? null,
    authored: tel.authoredMainForm ?? null,
    yaw: snap.viewYawDegrees ?? ds.yaw ?? null,
    heading: ds.headingYaw ?? null,
    motion: snap.motion ?? null,
    relief: snap.reliefPreset ?? null,
    coeffs: globalThis.__GASPER_LIVE_COEFFS__ || {},
    viewport: vp,
    pose: d.getWorldBodyState?.() || null,
    bbox,
    href: location.href,
    note:
      document.querySelector('[data-testid="showcase-note"]')?.textContent ??
      null,
  };
});
writeFileSync(resolve(OUT, "live-state.json"), JSON.stringify(state, null, 2));
await page.screenshot({ path: resolve(OUT, "live-full.png") });
const clip = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="gasper-dais"]');
  const r = el?.getBoundingClientRect?.();
  if (!r) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
if (clip) await page.screenshot({ path: resolve(OUT, "live-stage.png"), clip });
console.log(JSON.stringify(state, null, 2));
await browser.close();
