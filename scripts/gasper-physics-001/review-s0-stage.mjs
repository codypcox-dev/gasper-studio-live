import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve("docs/triforce/canon/runs/2026-08-18T21-40-00-000Z-s0-l1");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-gpu", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(() => document.querySelector("#avatar"), { timeout: 45000 });
await page.waitForTimeout(2200);

const cold = await page.evaluate(() => {
  const stage = document.querySelector("[data-testid=integrated-gasper-stage]");
  const r = stage?.getBoundingClientRect();
  return {
    graphPage: document.querySelector("[data-graph-page='1']") ? 1 : 0,
    compilerCols: document.querySelectorAll(".compiler-col").length,
    stageMode: document.querySelector("[data-testid=desk-mode-stage]")?.getAttribute("data-active"),
    factory: !!document.querySelector("[data-testid=revision-factory]"),
    transport: !!document.querySelector("[data-testid=studio-transport]"),
    w: r?.width ?? 0,
    h: r?.height ?? 0,
    playing: Number((globalThis).__GASPER_TAKE_T0__ ?? 0) > 0,
  };
});

await page.screenshot({ path: resolve(OUT, "cold-stage.png"), fullPage: true });

await page.locator("[data-testid=desk-chapter-nodes]").click();
await page.waitForTimeout(400);
const graph = await page.evaluate(() => ({
  graphPage: document.querySelector("[data-graph-page='1']") ? 1 : 0,
  compilerCols: document.querySelectorAll(".compiler-col").length,
}));
await page.screenshot({ path: resolve(OUT, "graph-mode.png"), fullPage: true });

await page.locator("[data-testid=desk-mode-stage]").click();
await page.waitForTimeout(400);
const back = await page.evaluate(() => ({
  graphPage: document.querySelector("[data-graph-page='1']") ? 1 : 0,
  compilerCols: document.querySelectorAll(".compiler-col").length,
  factory: !!document.querySelector("[data-testid=revision-factory]"),
}));

const proof = {
  cold,
  graph,
  back,
  pass:
    cold.stageMode === "1" &&
    cold.compilerCols === 0 &&
    cold.graphPage === 0 &&
    cold.factory &&
    cold.w > 400 &&
    !cold.playing &&
    graph.compilerCols >= 5 &&
    back.compilerCols === 0 &&
    back.factory,
};
writeFileSync(resolve(OUT, "proof.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
await browser.close();
process.exit(proof.pass ? 0 : 1);
