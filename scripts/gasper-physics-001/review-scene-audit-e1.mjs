import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(process.argv[2] || "/workspace/screenshots/scene-e1");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-gpu", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("pageerror", (err) => consoleErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(
  () => document.querySelector("#avatar") && document.querySelector("#body"),
  { timeout: 45000 },
);
await page.waitForTimeout(2200);

const measure = () =>
  page.evaluate(() => {
    const body = document.querySelector("#body");
    const box = body?.getBBox?.();
    const fill = document.querySelector("#cageFillLayer");
    const grid = document.querySelector("#scaffoldGridLayer");
    const skel = document.querySelector("#skeletonOverlay");
    const av = document.querySelector("#avatar");
    const medial = globalThis.__GASPER_MEDIAL__ || null;
    const sk = globalThis.__GASPER_SKELETON__ || null;
    const xyz = globalThis.__GASPER_GRID_XYZ__;
    const fillKids = fill ? [...fill.children].map((n) => n.id) : [];
    const fillLens = fill
      ? [...fill.children].map((n) => String(n.getAttribute("d") || "").length)
      : [];
    let yMin = 1e9,
      yMax = -1e9,
      wDots = 0;
    if (xyz && xyz.length === 3000) {
      const cx = Number(globalThis.__GASPER_GRID_CX__) || 120;
      const cy = Number(globalThis.__GASPER_GRID_CY__) || 112;
      for (let i = 0; i < 1000; i++) {
        const y = cy + xyz[i * 3 + 1];
        const z = xyz[i * 3 + 2] || 0;
        if (z < 0) continue;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
        if (y > 180) wDots++;
      }
    }
    return {
      bodyD: String(body?.getAttribute("d") || "").slice(0, 80),
      bodyH: box ? box.height : null,
      bodyBox: box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null,
      fillKids,
      fillLens,
      fillOp: fill?.getAttribute("opacity") ?? null,
      gridKids: grid ? grid.childElementCount : 0,
      gridOp: grid?.getAttribute("opacity") ?? null,
      skelKids: skel ? skel.childElementCount : 0,
      iso: av?.dataset?.isoPainter ?? null,
      cageFill: av?.dataset?.cageFill ?? null,
      specX: av?.dataset?.cageSpecX ?? null,
      specY: av?.dataset?.cageSpecY ?? null,
      yaw: av?.dataset?.lightTilt ?? null,
      liveN: xyz ? xyz.length / 3 : 0,
      shadeUV: !!globalThis.__GASPER_SHADE_UV__,
      wDots,
      yMin: yMin === 1e9 ? null : yMin,
      yMax: yMax === -1e9 ? null : yMax,
      medial: medial && {
        L: medial.plantL,
        R: medial.plantR,
        C: medial.crotch,
      },
      skeleton: sk && sk.nodes,
      envelope: (globalThis.__GASPER_ENVELOPE_BOX__ || null) && {
        ...globalThis.__GASPER_ENVELOPE_BOX__,
        n: globalThis.__GASPER_ENVELOPE_XYZ__
          ? globalThis.__GASPER_ENVELOPE_XYZ__.length / 3
          : 0,
        r: globalThis.__GASPER_ENVELOPE_R__ || null,
      },
      envH: av?.dataset?.envelopeH ?? null,
      bind: av?.dataset?.envelopeBind ?? null,
      footZ: av?.dataset?.footZCanal ?? null,
      face: (() => {
        const f = document.querySelector("#faceRecessLayer, #faceEmissionLayer");
        return f ? f.getBoundingClientRect() : null;
      })(),
    };
  });

const rest = await measure();
await page.screenshot({ path: resolve(OUT, "01-full.png"), fullPage: true });
const mon = await page.evaluate(() => {
  const el =
    document.querySelector("[data-testid=gasper-monitor]") ||
    document.querySelector(".gasper-monitor") ||
    document.querySelector("#avatar");
  const r = el?.getBoundingClientRect?.();
  return r && r.width > 8 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
});
if (mon) await page.screenshot({ path: resolve(OUT, "02-avatar.png"), clip: mon });

await page.evaluate(() => {
  globalThis.__GASPER_SHOW_GRID__ = true;
});
await page.waitForTimeout(400);
const gridOn = await measure();
if (mon) await page.screenshot({ path: resolve(OUT, "03-grid.png"), clip: mon });

await page.evaluate(() => {
  globalThis.__GASPER_SHOW_SKELETON__ = true;
  globalThis.__GASPER_SHOW_GRID__ = true;
});
await page.waitForTimeout(400);
const skel = await measure();
if (mon) await page.screenshot({ path: resolve(OUT, "04-skeleton.png"), clip: mon });

await page.evaluate(() => {
  globalThis.__GASPER_SHOW_GRID__ = false;
});
await page.waitForTimeout(300);
if (mon) await page.screenshot({ path: resolve(OUT, "05-grid-off.png"), clip: mon });

const playBtn = page.locator(
  "[data-testid=studio-play], [data-testid=monitor-play], button[aria-label*='Play' i]",
);
if (await playBtn.count()) {
  try {
    await playBtn.first().click({ timeout: 2500, force: true });
    await page.waitForTimeout(2800);
  } catch {
    await page.evaluate(() => {
      globalThis.SidekickFormMasterRig?.playNorthstarTwenty?.();
    });
    await page.waitForTimeout(2800);
  }
} else {
  await page.evaluate(() => {
    globalThis.SidekickFormMasterRig?.playNorthstarTwenty?.();
  });
  await page.waitForTimeout(2800);
}
const walk = await measure();
if (mon) await page.screenshot({ path: resolve(OUT, "06-strut.png"), clip: mon });

const packet = {
  errors: consoleErrors.slice(0, 16),
  rest,
  gridOn,
  skel,
  walk,
};
writeFileSync(resolve(OUT, "packet.json"), JSON.stringify(packet, null, 2));
console.log(JSON.stringify(packet, null, 2));
await browser.close();
