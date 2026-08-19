import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(
  process.argv[2] || "docs/triforce/canon/runs/2026-08-19T03-28-00-000Z-canon-rest",
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
await page.waitForTimeout(2000);

async function packet() {
  return page.evaluate(() => {
    const avatar = document.querySelector("#avatar");
    const body = document.querySelector("#body");
    let box = null;
    try {
      const b = body?.getBBox?.();
      if (b) box = { x: b.x, y: b.y, w: b.width, h: b.height };
    } catch (_) {}
    const coat = document.querySelector("#isoCoat");
    const b0 = document.querySelector("#isoBody0");
    const face = document.querySelector("#faceRecessLayer");
    const d = body?.getAttribute("d") || "";
    return {
      bind: avatar?.dataset.envelopeBind,
      occupied: avatar?.dataset.occupied,
      rScale: avatar?.dataset.envelopeRScale,
      mixId: avatar?.dataset.envelopeMixId,
      facing: avatar?.dataset.facingCompress,
      specX: avatar?.dataset.cageSpecX,
      specY: avatar?.dataset.cageSpecY,
      iso: avatar?.dataset.isoPainter,
      coatLen: (coat?.getAttribute("d") || "").length,
      body0Len: (b0?.getAttribute("d") || "").length,
      dHead: d.slice(0, 80),
      dLen: d.length,
      box,
      faceTf: face?.getAttribute("transform") || "",
      profile: avatar?.dataset.formProfile,
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
  globalThis.__GASPER_SHOW_GRID__ = false;
  globalThis.__GASPER_SHOW_SKELETON__ = false;
  r.requestOneFrame();
});
await page.waitForTimeout(500);
const restOff = await packet();
await shot("01-rest-off.png");

await page.evaluate(() => {
  globalThis.__GASPER_SHOW_GRID__ = true;
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(350);
const restGrid = await packet();
await shot("02-rest-grid.png");

await page.evaluate(() => {
  globalThis.__GASPER_SHOW_GRID__ = false;
  globalThis.SidekickFormMasterRig.setEnvelopeBlend("rest", "blowfish", 0.5, false);
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(350);
const mid = await packet();
await shot("03-blow-mid.png");

await page.evaluate(() => {
  globalThis.SidekickFormMasterRig.setEnvelopeMorph("rest");
  globalThis.SidekickFormMasterRig.requestOneFrame();
});
await page.waitForTimeout(350);
const back = await packet();
await shot("04-back-rest.png");

const film = {
  errors,
  restOff,
  restGrid,
  mid,
  back,
  gates: {
    restIsCanon: restOff.bind === "canon-rest" && restOff.occupied === "0",
    restProfile: restOff.profile === "wispwalker",
    restHeight: Math.abs((restOff.box?.h || 0) - 173.5) <= 4,
    restWidth: (restOff.box?.w || 0) > 150,
    faceHeld: (restOff.faceTf || "").includes("120"),
    fillAlive: (restOff.body0Len || 0) > 1000,
    midUsesUnion: mid.occupied === "1",
    backIsCanon: back.bind === "canon-rest" && back.occupied === "0",
    noPageError: errors.length === 0,
  },
};
writeFileSync(resolve(OUT, "film.json"), JSON.stringify(film, null, 2));
await browser.close();
console.log(JSON.stringify(film.gates, null, 2));
console.log("rest box", restOff.box, "bind", restOff.bind, "dLen", restOff.dLen);
if (errors.length) {
  console.error(errors);
  process.exit(1);
}
