import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve("docs/triforce/canon/runs/2026-08-18T19-00-00-000Z-wave0-honesty");
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
  () => document.querySelector("[data-testid=studio-transport]") && document.querySelector("#avatar"),
  { timeout: 45000 },
);
await page.waitForTimeout(1800);

const audit = await page.evaluate(() => {
  const q = (s) => document.querySelectorAll(s).length;
  const body = document.querySelector("#body");
  const box = body?.getBBox?.();
  return {
    rail: q("[data-testid=dais-control-rail]"),
    bar: q("[data-testid=dais-transport-bar]"),
    monitorTl: q("[data-testid=monitor-timeline]"),
    monitorPause: q("[data-testid=monitor-pause]"),
    transport: q("[data-testid=studio-transport]"),
    scrub: q("[data-testid=studio-scrub]"),
    grid: q("[data-testid=lumen-grid-toggle], [data-testid=monitor-grid-toggle]"),
    monitor: q("[data-testid=gasper-monitor], .gasper-monitor"),
    height: box ? box.height : null,
    bbox: box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null,
    profile: document.querySelector("#avatar")?.dataset?.formProfile ?? null,
  };
});

await page.screenshot({ path: resolve(OUT, "wave0-full.png"), fullPage: true });
const mon = await page.evaluate(() => {
  const el =
    document.querySelector("[data-testid=gasper-monitor]") ||
    document.querySelector(".gasper-monitor") ||
    document.querySelector("#avatar");
  const r = el?.getBoundingClientRect?.();
  return r && r.width > 8 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
});
if (mon) await page.screenshot({ path: resolve(OUT, "wave0-monitor.png"), clip: mon });

const proof = {
  audit,
  consoleErrors: consoleErrors.slice(0, 20),
  pass:
    audit.rail === 0 &&
    audit.bar === 0 &&
    audit.monitorTl === 0 &&
    audit.transport === 1 &&
    audit.scrub === 1 &&
    audit.height != null &&
    Math.abs(audit.height - 168.3) < 8,
};

writeFileSync(resolve(OUT, "wave0-audit.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
await browser.close();
process.exit(proof.pass ? 0 : 1);
