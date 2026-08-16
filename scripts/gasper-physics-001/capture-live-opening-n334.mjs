import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const OUT = resolve(
  process.env.GASPER_N334_OUT ||
    "research/proofs/grok-successor-002/live-5179-n334-opening",
);
mkdirSync(OUT, { recursive: true });

const TIMES = [0, 80, 160, 250, 400, 600, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000];

const browser = await chromium.launch({ headless: true, executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5179/?n334open=" + Date.now(), {
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

const started = Date.now();
const rows = [];
for (const at of TIMES) {
  const wait = at - (Date.now() - started);
  if (wait > 0) await page.waitForTimeout(wait);
  const state = await page.evaluate((mark) => {
    const rig = globalThis.SidekickFormMasterRig;
    const d = globalThis.__GASPER_DAIS__;
    const snap = rig.getSnapshot?.() || {};
    const vp = d.getViewport?.()?.getState?.() || {};
    const ds = document.querySelector("#avatar")?.dataset || {};
    const body = document.querySelector("#body");
    const bodyRect = body?.getBoundingClientRect?.();
    const dais = document.querySelector('[data-testid="gasper-dais"]')?.getBoundingClientRect?.();
    const pose = d.getWorldBodyState?.() || null;
    return {
      mark,
      href: location.href,
      profile: snap.profile ?? null,
      yaw: snap.viewYawDegrees ?? ds.yaw ?? null,
      heading: ds.headingYaw ?? null,
      facing: ds.facingDeg ?? null,
      formAttr: ds.formProfile ?? null,
      zoom: vp.zoom,
      panX: vp.panX,
      panY: vp.panY,
      autoFit: vp.autoFit,
      held: vp.userWorldFrameHeld,
      mode: pose?.mode ?? null,
      bodyX: pose?.body?.x ?? null,
      bodyZ: pose?.body?.z ?? null,
      vx: pose?.body?.vx ?? null,
      cruise: pose?.filedCruise ?? null,
      bodyRect: bodyRect
        ? { x: bodyRect.x, y: bodyRect.y, w: bodyRect.width, h: bodyRect.height }
        : null,
      dais: dais ? { x: dais.x, y: dais.y, w: dais.width, h: dais.height } : null,
    };
  }, at);
  rows.push({ ...state, wallMs: Date.now() - started });
  const clip = state.dais
    ? { x: state.dais.x, y: state.dais.y, width: state.dais.w, height: state.dais.h }
    : null;
  if (clip) {
    await page.screenshot({
      path: resolve(OUT, `t-${String(at).padStart(4, "0")}.png`),
      clip,
    });
  }
}

writeFileSync(resolve(OUT, "opening-timeline.json"), JSON.stringify(rows, null, 2));
await page.screenshot({ path: resolve(OUT, "full-end.png") });
console.log(JSON.stringify(rows, null, 2));
await browser.close();
