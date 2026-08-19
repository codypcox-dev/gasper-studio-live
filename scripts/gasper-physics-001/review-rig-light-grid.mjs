import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(
  process.argv[2] || "docs/triforce/canon/runs/2026-08-19T03-40-00-000Z-rig-light-grid",
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

async function packet() {
  return page.evaluate(() => {
    const avatar = document.querySelector("#avatar");
    const body = document.querySelector("#body");
    const skel = document.querySelector("#skeletonOverlay");
    const grid = document.querySelector("#scaffoldGridLayer");
    const coat = document.querySelector("#isoCoat");
    const bloom = document.querySelector("#crownBloomGrad stop");
    let box = null;
    try {
      const b = body?.getBBox?.();
      if (b) box = { x: b.x, y: b.y, w: b.width, h: b.height };
    } catch (_) {}
    return {
      bind: avatar?.dataset.envelopeBind,
      occupied: avatar?.dataset.occupied,
      bonesOn: globalThis.__GASPER_SHOW_SKELETON__,
      gridOn: globalThis.__GASPER_SHOW_GRID__,
      skelKids: skel?.childElementCount || 0,
      skelOp: skel?.getAttribute("opacity"),
      gridKids: grid?.childElementCount || 0,
      coatLen: (coat?.getAttribute("d") || "").length,
      bloomOp: bloom?.getAttribute("stop-opacity"),
      specX: avatar?.dataset.cageSpecX,
      specY: avatar?.dataset.cageSpecY,
      box,
      lookPuff: document.querySelector("[data-testid=look-puff]") ? 1 : 0,
      lookBones: document.querySelector("[data-testid=look-bones]") ? 1 : 0,
    };
  });
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
  globalThis.__GASPER_SHOW_SKELETON__ = true;
  globalThis.__GASPER_SHOW_GRID__ = false;
  r.requestOneFrame();
});
await page.waitForTimeout(400);
const restBones = await packet();
await shot("01-rest-bones.png");

await page.evaluate(() => {
  globalThis.__GASPER_SHOW_GRID__ = true;
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(350);
const both = await packet();
await shot("02-bones-and-grid.png");

await page.evaluate(() => {
  globalThis.__GASPER_SHOW_SKELETON__ = false;
  globalThis.__GASPER_SHOW_GRID__ = false;
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(350);
const light = await packet();
await shot("03-light-only.png");

const film = {
  errors,
  restBones,
  both,
  light,
  gates: {
    restIsCanon: restBones.bind === "canon-rest",
    bonesVisible: (restBones.skelKids || 0) >= 5 && restBones.skelOp !== "0",
    lookHasRig: restBones.lookPuff === 1 && restBones.lookBones === 1,
    gridCovers: (both.gridKids || 0) > 80,
    bloomBack: Number(light.bloomOp || 0) >= 0.3,
    height: Math.abs((restBones.box?.h || 0) - 173.5) <= 4,
    noPageError: errors.length === 0,
  },
};
writeFileSync(resolve(OUT, "film.json"), JSON.stringify(film, null, 2));
await browser.close();
console.log(JSON.stringify(film.gates, null, 2));
if (errors.length) process.exit(1);
