// Live 5179 watch — RAF, bare URL, what Cody sees. Not a stepped proof.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = "http://127.0.0.1:5179/?livewatch=" + Date.now();
const OUT = resolve("research/proofs/grok-successor-002/take-live-5179-20260815-n326");
const VIEWPORT = { width: 1280, height: 900 };
const STILLS_SEC = [0, 0.5, 1, 2, 3, 4, 5, 5.5, 6, 8];

mkdirSync(join(OUT, "stills"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ],
});
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: join(OUT, "pw-video"), size: VIEWPORT },
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(
  () =>
    globalThis.__GASPER_DAIS__ &&
    globalThis.SidekickFormMasterRig &&
    globalThis.__GASPER_ORGANISM_CLOCK__ &&
    document.querySelector("#avatar"),
  { timeout: 30000 },
);
await page.waitForTimeout(400);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(
  () =>
    globalThis.__GASPER_DAIS__ &&
    globalThis.SidekickFormMasterRig &&
    document.querySelector("#avatar"),
  { timeout: 30000 },
);
await page.waitForTimeout(500);

const boot = await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const note = document.querySelector('[data-testid="showcase-note"]')?.textContent ?? "";
  return {
    profile: rig.getSnapshot?.()?.profile ?? null,
    form: document.querySelector("#avatar")?.dataset?.formProfile ?? null,
    note,
    hasPlay: typeof d.playNorthstarTwenty === "function",
    href: location.href,
  };
});

const stageClip = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="gasper-dais"]');
  const r = el?.getBoundingClientRect?.();
  if (!r || r.width < 32) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
});

const t0 = Date.now();
const notes = [];
for (const at of STILLS_SEC) {
  const wait = at * 1000 - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const probe = await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    const body = d.getWorldBodyState?.() || null;
    const ds = document.querySelector("#avatar")?.dataset || {};
    return {
      profile: document.querySelector("#avatar")?.dataset?.formProfile ?? null,
      bodyX: body?.body?.x ?? null,
      bodyY: body?.body?.y ?? null,
      mode: body?.mode ?? null,
      planted: body?.support?.planted ?? null,
      supportSide: body?.support?.side ?? null,
      headingYaw: ds.headingYaw ?? null,
      facingDeg: ds.facingDeg ?? null,
      worldPoseX: ds.worldPoseX ?? null,
    };
  });
  const cap = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 90,
    fromSurface: true,
    clip: stageClip || undefined,
  });
  const name = at === 0 ? "t0.jpg" : `t-${String(at).replace(".", "p")}.jpg`;
  writeFileSync(join(OUT, "stills", name), Buffer.from(cap.data, "base64"));
  notes.push({ at, file: name, ...probe });
}

await context.close();
await browser.close();
writeFileSync(join(OUT, "live-watch.json"), JSON.stringify({ boot, notes, url: URL }, null, 2));
console.log("LIVE_WATCH_DONE", JSON.stringify({ out: OUT, n: notes.length, boot }, null, 2));
