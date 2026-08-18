import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(
  process.argv[2] || "docs/triforce/canon/runs/2026-08-18T22-00-00-000Z-master-003-audit",
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
await page.waitForFunction(
  () => document.querySelector("[data-testid=studio-transport]") && document.querySelector("#avatar"),
  { timeout: 45000 },
);
await page.waitForTimeout(2400);

async function snap(name) {
  return page.evaluate(() => {
    const el = (s) => document.querySelector(s);
    const stage = el("[data-testid=integrated-gasper-stage]");
    const r = stage?.getBoundingClientRect();
    const body = el("#body");
    const shade = (id) => {
      const n = el("#" + id);
      return n
        ? {
            op: n.getAttribute("opacity"),
            fill: n.getAttribute("fill"),
            dLen: (n.getAttribute("d") || "").length,
          }
        : null;
    };
    const bloom = el("#crownBloomGrad");
    const hot = el("#crownHotGrad");
    const host = globalThis;
    return {
      stageMode: el("[data-testid=desk-mode-stage]")?.getAttribute("data-active"),
      graphMode: el("[data-testid=desk-chapter-nodes]")?.getAttribute("data-active"),
      factory: !!el("[data-testid=revision-factory]"),
      transport: !!el("[data-testid=studio-transport]"),
      inspector: !!el("[data-testid=stage-look-inspector]"),
      compilerCols: document.querySelectorAll(".compiler-col").length,
      cards: document.querySelectorAll(".node-card").length,
      stageW: r?.width ?? 0,
      stageH: r?.height ?? 0,
      dLen: body?.getAttribute("d")?.length ?? 0,
      showGrid: host.__GASPER_SHOW_GRID__ !== false,
      yaw: host.__GASPER_ORBIT_YAW__ ?? host.__GASPER_FACING_YAW__ ?? null,
      tau: host.__GASPER_VISCO_TAU__ ?? null,
      tauField: host.__GASPER_TAU_FIELD__ ?? null,
      cageSpecX: el("#avatar")?.dataset.cageSpecX ?? null,
      cageSpecY: el("#avatar")?.dataset.cageSpecY ?? null,
      lightRigX: el("#avatar")?.dataset.lightRigGlintX ?? null,
      leftShade: shade("leftLobeShade"),
      rightShade: shade("rightLobeShade"),
      contained: shade("containedLobeMaterial"),
      reliefShadow: shade("reliefShadow"),
      tssGlint: shade("tssGlintNode"),
      bloomCx: bloom?.getAttribute("cx") ?? null,
      bloomColor: bloom?.querySelector("stop")?.getAttribute("stop-color") ?? null,
      hotColor: hot?.querySelector("stop")?.getAttribute("stop-color") ?? null,
      eval: host.__GASPER_GEONODES_EVAL__
        ? {
            mute: host.__GASPER_GEONODES_EVAL__.mute,
            couple: host.__GASPER_GEONODES_EVAL__.couple,
            order: host.__GASPER_GEONODES_EVAL__.order,
          }
        : null,
      bodyH: body?.getBBox?.()?.height ?? null,
    };
  });
}

const cold = await snap("cold");
await page.screenshot({ path: resolve(OUT, "01-cold-stage.png"), fullPage: true });

await page.locator("[data-testid=desk-chapter-nodes]").click();
await page.waitForTimeout(500);
const graph = await snap("graph");
await page.screenshot({ path: resolve(OUT, "02-graph.png"), fullPage: true });

const identity = page.locator(".node-card[data-id=identity], [data-node-id=identity]").first();
if (await identity.count()) await identity.click();
await page.waitForTimeout(300);
const card = await snap("card");
await page.screenshot({ path: resolve(OUT, "03-card-select.png"), fullPage: true });

await page.locator("[data-testid=desk-mode-stage]").click();
await page.waitForTimeout(400);
await page.locator("[data-testid=lumen-play-twenty]").click();
await page.waitForTimeout(1800);
const twenty = await snap("twenty");
await page.screenshot({ path: resolve(OUT, "04-twenty.png"), fullPage: true });

await page.locator("[data-testid=desk-home]").click();
await page.waitForTimeout(400);
const gridBtn = page.locator("[data-testid=lumen-grid-toggle]");
const gridBefore = await page.evaluate(() => globalThis.__GASPER_SHOW_GRID__ !== false);
await gridBtn.click();
await page.waitForTimeout(300);
const gridAfterOff = await page.evaluate(() => globalThis.__GASPER_SHOW_GRID__ !== false);
await gridBtn.click();
await page.waitForTimeout(300);
const gridAfterOn = await page.evaluate(() => globalThis.__GASPER_SHOW_GRID__ !== false);
const grid = { gridBefore, gridAfterOff, gridAfterOn, ...(await snap("grid")) };
await page.screenshot({ path: resolve(OUT, "05-grid.png"), fullPage: true });

const factory = page.locator("[data-testid=revision-factory]");
if (await factory.count()) await factory.click();
await page.waitForTimeout(400);
const factorySnap = await snap("factory");
await page.screenshot({ path: resolve(OUT, "06-factory.png"), fullPage: true });

const yaw = page.locator("[data-testid=look-orbit-yaw]");
let yawTravel = null;
if (await yaw.count()) {
  const before = await page.evaluate(() => ({
    spec: document.querySelector("#avatar")?.dataset.cageSpecX ?? null,
    yaw: globalThis.__GASPER_ORBIT_YAW__ ?? null,
  }));
  await yaw.fill("42");
  await yaw.dispatchEvent("input");
  await yaw.dispatchEvent("change");
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    spec: document.querySelector("#avatar")?.dataset.cageSpecX ?? null,
    yaw: globalThis.__GASPER_ORBIT_YAW__ ?? null,
    leftOp: document.querySelector("#leftLobeShade")?.getAttribute("opacity"),
    hot: document.querySelector("#crownHotGrad stop")?.getAttribute("stop-color"),
  }));
  yawTravel = { before, after };
  await page.screenshot({ path: resolve(OUT, "07-yaw-light.png"), fullPage: true });
}

const proof = {
  errors,
  cold,
  graph,
  card,
  twenty,
  grid,
  factory: factorySnap,
  yawTravel,
  pass: {
    stageDefault: cold.stageMode === "1" && cold.compilerCols === 0,
    graphFive: graph.compilerCols >= 5,
    gridToggle: gridBefore === true && gridAfterOff === false && gridAfterOn === true,
    cratersGone: Number(cold.leftShade?.op || 1) === 0 && Number(cold.rightShade?.op || 1) === 0,
    noWhiteHot: cold.hotColor !== "#fffaff",
    cageSpec: cold.cageSpecX != null,
    inspector: cold.inspector === true,
    height: cold.bodyH == null || (cold.bodyH > 160 && cold.bodyH < 180),
    noPageError: errors.length === 0,
  },
};
writeFileSync(resolve(OUT, "clickthrough.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ out: OUT, pass: proof.pass, errors, yawTravel }, null, 2));
await browser.close();
process.exit(0);
