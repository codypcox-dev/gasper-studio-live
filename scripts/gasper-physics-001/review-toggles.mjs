import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(
  process.argv[2] || "docs/triforce/canon/runs/2026-08-19T04-05-00-000Z-toggles",
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
await page.waitForTimeout(1600);

async function snap() {
  return page.evaluate(() => {
    const skel = document.querySelector("#skeletonOverlay");
    const grid = document.querySelector("#scaffoldGridLayer");
    return {
      bonesFlag: globalThis.__GASPER_SHOW_SKELETON__,
      gridFlag: globalThis.__GASPER_SHOW_GRID__,
      skelKids: skel?.childElementCount || 0,
      skelOp: skel?.getAttribute("opacity"),
      gridKids: grid?.childElementCount || 0,
      gridOp: grid?.getAttribute("opacity"),
      lookBones: document.querySelector("[data-testid=look-bones]")?.getAttribute("data-active"),
      lookGrid: document.querySelector("[data-testid=look-grid]")?.getAttribute("data-active"),
      railBones: document.querySelector("[data-testid=lumen-bones-toggle]")?.getAttribute("data-active"),
      railGrid: document.querySelector("[data-testid=lumen-grid-toggle]")?.getAttribute("data-active"),
    };
  });
}

const stage = page.locator("[data-testid=integrated-gasper-stage]");
const shot = async (name) => {
  const el = (await stage.count()) ? stage : page.locator("#avatar");
  await el.screenshot({ path: resolve(OUT, name) });
};

async function clickUntil(sel, want, flag, flagWant) {
  for (let i = 0; i < 3; i++) {
    const s = await snap();
    const active = s[sel];
    const flagNow = s[flag];
    if (active === want && flagNow === flagWant) return s;
    await page.locator(`[data-testid=${sel === "lookBones" ? "look-bones" : "look-grid"}]`).first().click();
    await page.waitForTimeout(160);
    await page.evaluate(() => globalThis.SidekickFormMasterRig.requestOneFrame());
    await page.waitForTimeout(160);
  }
  return snap();
}

await page.evaluate(() => {
  const r = globalThis.SidekickFormMasterRig;
  r.setPaused(true);
  r.setHeadingYaw(0);
  r.setYaw(0);
  r.setEnvelopeMorph("rest");
  r.requestOneFrame();
});
await page.waitForTimeout(300);

const bonesOff = await clickUntil("lookBones", "0", "bonesFlag", false);
await shot("01-bones-off.png");
const bonesOn = await clickUntil("lookBones", "1", "bonesFlag", true);
const bothOn = await clickUntil("lookGrid", "1", "gridFlag", true);
await shot("02-both-on.png");
const gridOff = await clickUntil("lookGrid", "0", "gridFlag", false);
await shot("03-grid-off.png");
void bonesOn;

const film = {
  errors,
  bonesOff,
  bothOn,
  gridOff,
  gates: {
    bonesHide: (bonesOff.skelKids || 0) === 0 || bonesOff.skelOp === "0",
    bonesShow: (bothOn.skelKids || 0) >= 5 && bothOn.skelOp !== "0",
    gridShow: (bothOn.gridKids || 0) > 40 && bothOn.gridOp !== "0",
    gridHide: (gridOff.gridKids || 0) === 0 || gridOff.gridOp === "0",
    pillsExist: !!bonesOff.lookBones || !!bonesOff.railBones,
    noPageError: errors.length === 0,
  },
};
writeFileSync(resolve(OUT, "film.json"), JSON.stringify(film, null, 2));
await browser.close();
console.log(JSON.stringify(film.gates, null, 2));
if (!film.gates.bonesHide || !film.gates.gridHide) process.exit(1);
