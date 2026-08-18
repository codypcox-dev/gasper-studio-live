import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve("docs/triforce/canon/runs/2026-08-18T20-55-00-000Z-revision-publish");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-gpu", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(
  () => document.querySelector("#avatar") && document.querySelector("[data-testid=revision-strip]"),
  { timeout: 45000 },
);
await page.waitForTimeout(1800);

const stage = await page.evaluate(() => {
  const el = document.querySelector("[data-testid=integrated-gasper-stage]") || document.querySelector("#avatar");
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

const gridBtn = page.locator("[data-testid=monitor-grid-toggle]");
if ((await gridBtn.getAttribute("data-active")) !== "1") await gridBtn.click();

await page.screenshot({ path: resolve(OUT, "strip.png"), fullPage: true });

const sx = stage.x + stage.w * 0.52;
const sy = stage.y + stage.h * 0.36;
await page.mouse.move(sx, sy);
await page.mouse.down();
await page.mouse.move(sx + 50, sy - 28, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);

const afterSculpt = await page.evaluate(() => {
  const sc = globalThis.__GASPER_GRID_SCULPT__;
  let e = 0;
  if (sc) for (let i = 0; i < sc.length; i++) e += Math.abs(sc[i] || 0);
  return e;
});

await page.locator("[data-testid=revision-save]").click();
await page.waitForTimeout(200);
const looks = await page.locator("[data-testid^=revision-look-]").count();

await page.locator("[data-testid=revision-factory]").click();
await page.waitForTimeout(300);
const afterFactory = await page.evaluate(() => {
  const sc = globalThis.__GASPER_GRID_SCULPT__;
  let e = 0;
  if (sc) for (let i = 0; i < sc.length; i++) e += Math.abs(sc[i] || 0);
  return e;
});

await page.keyboard.press("Control+z");
await page.waitForTimeout(200);
const afterUndo = await page.evaluate(() => {
  const sc = globalThis.__GASPER_GRID_SCULPT__;
  let e = 0;
  if (sc) for (let i = 0; i < sc.length; i++) e += Math.abs(sc[i] || 0);
  return e;
});

await page.screenshot({ path: resolve(OUT, "after-undo.png"), fullPage: true });

const proof = {
  afterSculpt,
  looks,
  afterFactory,
  afterUndo,
  pass: afterSculpt > 10 && looks >= 1 && afterFactory < 1 && afterUndo > 10,
};
writeFileSync(resolve(OUT, "proof.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
await browser.close();
process.exit(proof.pass ? 0 : 1);
