import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve("docs/triforce/canon/runs/2026-08-18T20-10-00-000Z-live-input-fix");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-gpu", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(
  () => document.querySelector("#avatar") && document.querySelector("[data-testid=node-card-orbit]"),
  { timeout: 45000 },
);
await page.waitForTimeout(2000);

const stage = await page.evaluate(() => {
  const el = document.querySelector("[data-testid=integrated-gasper-stage]") || document.querySelector("#avatar");
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

const gridBtn = page.locator("[data-testid=monitor-grid-toggle]");
if ((await gridBtn.getAttribute("data-active")) !== "1") await gridBtn.click();
await page.waitForTimeout(200);

const beforeSculpt = await page.evaluate(() => {
  const sc = globalThis.__GASPER_GRID_SCULPT__;
  let energy = 0;
  if (sc) for (let i = 0; i < sc.length; i++) energy += Math.abs(sc[i] || 0);
  const box = document.querySelector("#body")?.getBBox?.();
  const hit = document.elementFromPoint(1250, 180);
  return {
    energy,
    w: box?.width ?? null,
    h: box?.height ?? null,
    hit: hit ? { tag: hit.tagName, id: hit.id, testid: hit.getAttribute("data-testid") } : null,
    pe: getComputedStyle(document.querySelector("#avatar")).pointerEvents,
  };
});

await page.screenshot({ path: resolve(OUT, "before-sculpt.png"), fullPage: true });

const sx = stage.x + stage.w * 0.52;
const sy = stage.y + stage.h * 0.36;
await page.mouse.move(sx, sy);
await page.mouse.down();
await page.mouse.move(sx + 55, sy - 30, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(200);

const afterSculpt = await page.evaluate(() => {
  const sc = globalThis.__GASPER_GRID_SCULPT__;
  let energy = 0;
  if (sc) for (let i = 0; i < sc.length; i++) energy += Math.abs(sc[i] || 0);
  const box = document.querySelector("#body")?.getBBox?.();
  return { energy, w: box?.width ?? null, h: box?.height ?? null, selected: globalThis.__GASPER_GRID_XYZ__ ? 1 : 0 };
});
await page.screenshot({ path: resolve(OUT, "after-sculpt.png"), fullPage: true });

const orbitSlider = page.locator("[data-testid=node-card-orbit] input[type=range]").first();
const beforeYaw = await page.evaluate(() => globalThis.__GASPER_ORBIT_YAW__);
if (await orbitSlider.count()) await orbitSlider.fill("-0.8");
await page.waitForTimeout(250);
const afterYaw = await page.evaluate(() => ({
  yaw: globalThis.__GASPER_ORBIT_YAW__,
  eval: globalThis.__GASPER_GEONODES_EVAL__?.params?.orbit?.yaw,
}));
await page.screenshot({ path: resolve(OUT, "after-yaw.png"), fullPage: true });

const identSlider = page.locator("[data-testid=node-card-identity] input[type=range]").first();
const beforeFoot = await page.evaluate(() => ({
  foot: globalThis.__GASPER_LIVE_COEFFS__?.wispwalker?.footAmp,
  h: document.querySelector("#body")?.getBBox?.()?.height ?? null,
}));
if (await identSlider.count()) await identSlider.fill("1");
await page.waitForTimeout(250);
const afterFoot = await page.evaluate(() => ({
  foot: globalThis.__GASPER_LIVE_COEFFS__?.wispwalker?.footAmp,
  h: document.querySelector("#body")?.getBBox?.()?.height ?? null,
  eval: globalThis.__GASPER_GEONODES_EVAL__?.params?.identity?.footAmp,
}));
await page.screenshot({ path: resolve(OUT, "after-foot.png"), fullPage: true });

const proof = {
  beforeSculpt,
  afterSculpt,
  sculptDelta: (afterSculpt.energy || 0) - (beforeSculpt.energy || 0),
  beforeYaw,
  afterYaw,
  beforeFoot,
  afterFoot,
  pass:
    (afterSculpt.energy || 0) > (beforeSculpt.energy || 0) + 1 &&
    Number(afterYaw.yaw) !== Number(beforeYaw),
};
writeFileSync(resolve(OUT, "proof.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
await browser.close();
process.exit(proof.pass ? 0 : 1);
