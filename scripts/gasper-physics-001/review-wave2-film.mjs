import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve("docs/triforce/canon/runs/2026-08-18T19-20-00-000Z-wave2-easing");
mkdirSync(OUT, { recursive: true });

const STILLS = [0, 2.6, 3.2, 5.2, 7.1, 9.2];
const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-gpu", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForFunction(
  () => globalThis.__GASPER_DAIS__ && document.querySelector("#avatar"),
  { timeout: 45000 },
);

await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  d.stopWalkBooTwenty?.();
  d.stopLiving?.();
  clock?.stop?.();
  clock?.reset?.({ seed: 20260814, timeMs: 0 });
  clock?.setFixedStepMs?.(1000 / 120);
  clock?.setMode?.("deterministic");
  d.playNorthstarTwenty?.();
  clock?.start?.({ mode: "deterministic" });
});

const STEP = 1000 / 120;
let t = 0;
const notes = [];
for (const mark of STILLS) {
  while (t + 1e-6 < mark) {
    await page.evaluate((ms) => globalThis.__GASPER_ORGANISM_CLOCK__?.step?.(ms), STEP);
    t += STEP / 1000;
  }
  const probe = await page.evaluate((markAt) => {
    const d = globalThis.__GASPER_DAIS__;
    const g = d.getGaitProofSample?.() || {};
    const ds = document.querySelector("#avatar")?.dataset || {};
    const box = document.querySelector("#body")?.getBBox?.();
    return {
      mark: markAt,
      form: ds.formProfile ?? null,
      supportSide: Number(ds.gaitSupportSide ?? g.supportSide ?? 0),
      height: box?.height ?? null,
      y: box?.y ?? null,
      x: box?.x ?? null,
    };
  }, mark);
  notes.push(probe);
  const clip = await page.evaluate(() => {
    const el =
      document.querySelector("[data-testid=gasper-monitor]") ||
      document.querySelector("#avatar");
    const r = el?.getBoundingClientRect?.();
    return r && r.width > 8 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  if (clip) {
    await page.screenshot({
      path: resolve(OUT, `w2-${String(mark).replace(".", "p")}s.png`),
      clip,
    });
  }
}

writeFileSync(resolve(OUT, "wave2-film.json"), JSON.stringify({ notes }, null, 2));
console.log(JSON.stringify({ notes }, null, 2));
await browser.close();
