import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(process.argv[2] || "/workspace/screenshots/body-grid-005");
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
  () => document.querySelector("#avatar") && document.querySelector("#scaffoldGridLayer"),
  { timeout: 45000 },
);
await page.waitForTimeout(2400);

// Force grid on for the proof.
await page.evaluate(() => {
  const host = globalThis;
  host.__GASPER_SHOW_GRID__ = true;
  const g = host.__GASPER_GEONODES_EVAL__;
  if (g?.params?.cage) g.params.cage.grid = 1;
});
await page.waitForTimeout(400);

const measure = await page.evaluate(() => {
  const grid = document.querySelector("#scaffoldGridLayer");
  const circles = [...(grid?.querySelectorAll("circle") ?? [])];
  const paths = [...(grid?.querySelectorAll("path") ?? [])];
  const cyan = document.querySelector("#cyanFieldNode");
  const res = document.querySelector("#cyanReservoirPath");
  const body = document.querySelector("#body");
  const bb = body?.getBBox?.();
  const dots = circles.map((c) => ({
    x: Number(c.getAttribute("cx")),
    y: Number(c.getAttribute("cy")),
  }));
  const ys = dots.map((d) => d.y);
  const xs = dots.map((d) => d.x);
  const wBand = dots.filter((d) => d.y > 140);
  const crown = dots.filter((d) => d.y < 90);
  return {
    gridOp: grid?.getAttribute("opacity"),
    circleN: circles.length,
    pathN: paths.length,
    yMin: ys.length ? Math.min(...ys) : null,
    yMax: ys.length ? Math.max(...ys) : null,
    xMin: xs.length ? Math.min(...xs) : null,
    xMax: xs.length ? Math.max(...xs) : null,
    wDots: wBand.length,
    crownDots: crown.length,
    cyanOp: cyan?.getAttribute("opacity"),
    resOp: res?.getAttribute("opacity"),
    resD: (res?.getAttribute("d") || "").length,
    bodyH: bb?.height ?? null,
    bodyY: bb?.y ?? null,
  };
});

await page.screenshot({ path: resolve(OUT, "01-full-grid.png"), fullPage: true });

const pass = {
  noPageError: errors.length === 0,
  gridOn: Number(measure.gridOp) > 0.5,
  fullCage: (measure.circleN ?? 0) > 400,
  coversW: (measure.wDots ?? 0) > 40,
  coversCrown: (measure.crownDots ?? 0) > 20,
  yReach: (measure.yMax ?? 0) > 155,
  cyanDead: Number(measure.cyanOp) <= 0.08 && (measure.resD ?? 1) === 0,
};

writeFileSync(resolve(OUT, "packet.json"), JSON.stringify({ errors, measure, pass }, null, 2));
await browser.close();
console.log(JSON.stringify({ out: OUT, pass, measure }, null, 2));
