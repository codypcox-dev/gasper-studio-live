import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(
  process.argv[2] || "docs/triforce/canon/runs/2026-08-18T23-00-00-000Z-unify-004",
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
await page.waitForTimeout(2600);

async function snap() {
  return page.evaluate(() => {
    const el = (s) => document.querySelector(s);
    const stage = el("[data-testid=integrated-gasper-stage]");
    const r = stage?.getBoundingClientRect();
    const body = el("#body");
    const shade = (id) => {
      const n = el("#" + id);
      return n
        ? {
            op: n.getAttribute("opacity") ?? n.style.opacity,
            fill: n.getAttribute("fill"),
            dLen: (n.getAttribute("d") || "").length,
          }
        : null;
    };
    const bloom = el("#crownBloomGrad");
    const hot = el("#crownHotGrad");
    const host = globalThis;
    const avatar = el("#avatar");
    return {
      stageMode: el("[data-testid=desk-mode-stage]")?.getAttribute("data-active"),
      inspector: !!el("[data-testid=stage-look-inspector]"),
      inspectorDials: document.querySelectorAll(".stage-look__dials input").length,
      compilerCols: document.querySelectorAll(".compiler-col").length,
      cards: document.querySelectorAll(".node-card").length,
      stageW: r?.width ?? 0,
      stageH: r?.height ?? 0,
      dLen: body?.getAttribute("d")?.length ?? 0,
      showGrid: host.__GASPER_SHOW_GRID__ !== false,
      orbitYaw: host.__GASPER_ORBIT_YAW__ ?? null,
      facingYaw: avatar?.dataset.facingDeg ?? null,
      headingYaw: avatar?.dataset.headingYaw ?? null,
      dialYaw: avatar?.dataset.yaw ?? null,
      tau: host.__GASPER_VISCO_TAU__ ?? null,
      tauField: host.__GASPER_TAU_FIELD__ ?? null,
      stretch: host.__GASPER_HANDLE_STRETCH__ ?? null,
      cageSpecX: avatar?.dataset.cageSpecX ?? null,
      cageSpecY: avatar?.dataset.cageSpecY ?? null,
      lightTilt: avatar?.dataset.lightTilt ?? null,
      leftShade: shade("leftLobeShade"),
      rightShade: shade("rightLobeShade"),
      contained: shade("containedLobeMaterial"),
      reliefShadow: shade("reliefShadow"),
      tssGlint: shade("tssGlintNode"),
      bloomCx: bloom?.getAttribute("cx") ?? null,
      bloomColor: bloom?.querySelector("stop")?.getAttribute("stop-color") ?? null,
      hotColor: hot?.querySelector("stop")?.getAttribute("stop-color") ?? null,
      bodyH: body?.getBBox?.()?.height ?? null,
      bodyW: body?.getBBox?.()?.width ?? null,
    };
  });
}

const cold = await snap();
await page.screenshot({ path: resolve(OUT, "01-cold-stage.png"), fullPage: true });
const stageShot = await page.locator("[data-testid=integrated-gasper-stage]").screenshot({
  path: resolve(OUT, "01b-stage-only.png"),
});

await page.locator("[data-testid=look-orbit-yaw]").fill("42");
await page.waitForTimeout(400);
const yaw42 = await snap();
await page.locator("[data-testid=integrated-gasper-stage]").screenshot({
  path: resolve(OUT, "02-yaw42.png"),
});

await page.locator("[data-testid=look-key-az]").fill("48");
await page.waitForTimeout(400);
const key48 = await snap();
await page.locator("[data-testid=integrated-gasper-stage]").screenshot({
  path: resolve(OUT, "03-key48.png"),
});

await page.locator("[data-testid=look-orbit-yaw]").fill("8");
await page.locator("[data-testid=look-key-az]").fill("0");
await page.waitForTimeout(300);

const gridBtn = page.locator("[data-testid=lumen-grid-toggle]");
const gridBefore = await page.evaluate(() => globalThis.__GASPER_SHOW_GRID__ !== false);
if (await gridBtn.count()) {
  await gridBtn.click({ force: true });
  await page.waitForTimeout(300);
}
const gridAfterOff = await page.evaluate(() => globalThis.__GASPER_SHOW_GRID__ !== false);
if (await gridBtn.count()) {
  await gridBtn.click({ force: true });
  await page.waitForTimeout(300);
}
const gridAfterOn = await page.evaluate(() => globalThis.__GASPER_SHOW_GRID__ !== false);
const grid = { gridBefore, gridAfterOff, gridAfterOn };
await page.screenshot({ path: resolve(OUT, "04-grid.png"), fullPage: true });

await page.locator("[data-testid=desk-chapter-nodes]").click();
await page.waitForTimeout(500);
const graph = await snap();
await page.screenshot({ path: resolve(OUT, "05-graph.png"), fullPage: true });

await page.locator("[data-testid=desk-mode-stage]").click();
await page.waitForTimeout(400);

const play = page.locator("[data-testid=lumen-play-twenty]");
if (await play.count()) {
  await play.click({ force: true });
  await page.waitForTimeout(4200);
}
const walk = await snap();
await page.locator("[data-testid=integrated-gasper-stage]").screenshot({
  path: resolve(OUT, "06-walk-4s.png"),
});
await page.waitForTimeout(1400);
const seat = await snap();
await page.locator("[data-testid=integrated-gasper-stage]").screenshot({
  path: resolve(OUT, "07-seat-5s.png"),
});

const specTravel = Math.abs(Number(yaw42.cageSpecX) - Number(cold.cageSpecX));
const keyTravel = Math.abs(Number(key48.cageSpecX) - Number(cold.cageSpecX));
const paintedSeat = Number(seat.facingYaw);
const headingSeat = Number(seat.headingYaw);
const dialSeat = Number(seat.dialYaw);
const doubleWrite = Math.abs(paintedSeat) > 40;

const packet = {
  errors,
  cold,
  yaw42,
  key48,
  grid,
  graph,
  walk,
  seat,
  specTravel,
  keyTravel,
  paintedSeat,
  headingSeat,
  dialSeat,
  doubleWrite,
  pass: {
    noPageError: errors.length === 0,
    inspector: cold.inspector === true,
    inspectorDials: (cold.inspectorDials ?? 0) >= 12,
    cratersGone: (cold.reliefShadow?.dLen ?? 1) === 0 || cold.reliefShadow?.fill !== "#03010b",
    shadeMuted: cold.leftShade?.op === "0" || Number(cold.leftShade?.op) === 0,
    noWhiteHot: cold.hotColor !== "#fffaff",
    gridToggle: grid.gridAfterOff === false && grid.gridAfterOn === true,
    specMoves: specTravel >= 8 || keyTravel >= 8,
    noDoubleYaw: doubleWrite === false,
    stageDefault: (cold.compilerCols ?? 1) === 0,
  },
};

writeFileSync(resolve(OUT, "packet.json"), JSON.stringify(packet, null, 2));
await browser.close();
console.log(JSON.stringify({ out: OUT, pass: packet.pass, specTravel, keyTravel, paintedSeat, headingSeat, dialSeat }, null, 2));
