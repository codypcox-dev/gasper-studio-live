import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve("docs/triforce/canon/runs/2026-08-18T19-30-00-000Z-wave4-instrument");
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
await page.waitForTimeout(1600);

const audit = await page.evaluate(() => {
  const q = (s) => document.querySelectorAll(s).length;
  const box = document.querySelector("#body")?.getBBox?.();
  return {
    rail: q("[data-testid=dais-control-rail]"),
    bar: q("[data-testid=dais-transport-bar]"),
    monitorTl: q("[data-testid=monitor-timeline]"),
    transport: q("[data-testid=studio-transport]"),
    scrub: q("[data-testid=studio-scrub]"),
    dope: q("[data-testid=score-dopesheet]"),
    graphToggle: q("[data-testid=score-graph-toggle]"),
    valueGraph: q("[data-testid=score-value-graph]"),
    height: box?.height ?? null,
  };
});

await page.screenshot({ path: resolve(OUT, "w4-dopesheet.png"), fullPage: true });

const toggle = page.locator("[data-testid=score-graph-toggle]");
if (await toggle.count()) await toggle.click();
await page.waitForTimeout(200);
const after = await page.evaluate(() => document.querySelectorAll("[data-testid=score-value-graph]").length);
await page.screenshot({ path: resolve(OUT, "w4-valuegraph.png"), fullPage: true });

const proof = {
  audit,
  valueGraphAfterToggle: after,
  errors: errors.slice(0, 12),
  pass:
    audit.rail === 0 &&
    audit.monitorTl === 0 &&
    audit.transport === 1 &&
    audit.scrub === 1 &&
    audit.dope === 1 &&
    after === 1 &&
    errors.length === 0,
};
writeFileSync(resolve(OUT, "wave4-ui.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
await browser.close();
process.exit(proof.pass ? 0 : 1);
