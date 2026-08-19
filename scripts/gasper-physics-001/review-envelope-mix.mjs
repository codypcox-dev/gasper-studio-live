import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(
  process.argv[2] || "docs/triforce/canon/runs/2026-08-19T03-20-00-000Z-audit-mix",
);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-gpu", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(() => document.querySelector("#avatar") && globalThis.SidekickFormMasterRig, {
  timeout: 45000,
});
await page.waitForTimeout(1800);

async function packet(extra = {}) {
  return page.evaluate((more) => {
    const avatar = document.querySelector("#avatar");
    const body = document.querySelector("#body");
    let box = null;
    try {
      const b = body?.getBBox?.();
      if (b) box = { x: b.x, y: b.y, w: b.width, h: b.height };
    } catch (_) {}
    const face = document.querySelector("#faceRecessLayer");
    const d = body?.getAttribute("d") || "";
    return {
      bind: avatar?.dataset.envelopeBind,
      occupied: avatar?.dataset.occupied,
      rScale: avatar?.dataset.envelopeRScale,
      collapse: avatar?.dataset.envelopeCollapse,
      hook: avatar?.dataset.envelopeHook,
      mixId: avatar?.dataset.envelopeMixId,
      mix: avatar?.dataset.envelopeMix,
      crownR: avatar?.dataset.envelopeCrownR,
      torsoR: avatar?.dataset.envelopeTorsoR,
      facing: avatar?.dataset.facingCompress,
      plantYaw: avatar?.dataset.plantYaw,
      crownX: avatar?.dataset.crownX,
      posedLY: avatar?.dataset.posedLY,
      yMin: avatar?.dataset.envelopeYMin,
      yMax: avatar?.dataset.envelopeYMax,
      specX: avatar?.dataset.cageSpecX,
      specY: avatar?.dataset.cageSpecY,
      iso: avatar?.dataset.isoPainter,
      dHead: d.slice(0, 72),
      dLen: d.length,
      box,
      faceTf: face?.getAttribute("transform") || "",
      mode: globalThis.SidekickFormMasterRig?.getEnvelopeMode?.() || null,
      radii: globalThis.SidekickFormMasterRig?.getEnvelopeRadii?.() || null,
      ...more,
    };
  }, extra);
}

async function shot(name) {
  const stage = page.locator("[data-testid=integrated-gasper-stage]");
  const handle = (await stage.count()) ? stage : page.locator("#avatar");
  await handle.screenshot({ path: resolve(OUT, name) });
}

await page.evaluate(() => {
  const r = globalThis.SidekickFormMasterRig;
  r.setPaused(true);
  r.setHeadingYaw(0);
  r.setYaw(0);
  r.setEnvelopeMorph("rest");
  globalThis.__GASPER_SHOW_GRID__ = true;
  globalThis.__GASPER_SHOW_SKELETON__ = true;
  r.requestOneFrame();
});
await page.waitForTimeout(400);
const rest = await packet();
await shot("01-rest.png");

await page.evaluate(() => {
  globalThis.SidekickFormMasterRig.setEnvelopeBlend("rest", "blowfish", 0.5, false);
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(400);
const mid = await packet();
await shot("02-blow-mid.png");

await page.evaluate(() => {
  globalThis.SidekickFormMasterRig.setEnvelopeMorph("blowfish");
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(400);
const blow = await packet();
await shot("03-blow-full.png");

await page.evaluate(() => {
  globalThis.SidekickFormMasterRig.setEnvelopeBlend("rest", "paddle", 0.55, false);
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(400);
const paddle = await packet();
await shot("04-paddle-mid.png");

await page.evaluate(() => {
  globalThis.SidekickFormMasterRig.setEnvelopeMorph("rest");
  globalThis.__GASPER_SHOW_GRID__ = false;
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(400);
const off = await packet();
await shot("05-rest-grid-off.png");

const film = {
  errors,
  rest,
  mid,
  blow,
  paddle,
  off,
  gates: {
    restHeight: Math.abs((rest.box?.h || 0) - 173.5) <= 2,
    restIsRest: rest.rScale === "1.0000" && rest.mixId === "rest",
    midIsLerp: Number(mid.rScale) > 1.01 && Number(mid.rScale) < 1.06,
    blowClamped: Number(blow.torsoR) < 56 * 1.07 - 0.2,
    paddleMoved: Number(paddle.collapse) > 0.4,
    faceHeld: (rest.faceTf || "").includes("120") && (blow.faceTf || "").includes("120"),
    occupied: rest.occupied === "1" && blow.occupied === "1",
    noPageError: errors.length === 0,
  },
};
writeFileSync(resolve(OUT, "film.json"), JSON.stringify(film, null, 2));
await browser.close();
console.log(JSON.stringify(film.gates, null, 2));
if (errors.length) {
  console.error(errors);
  process.exit(1);
}
