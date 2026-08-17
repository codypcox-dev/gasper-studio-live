import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve(
  process.env.GASPER_OPEN10_OUT ||
    "docs/triforce/canon/runs/2026-08-16T16-38-00-000Z-review-opening-10s",
);
mkdirSync(OUT, { recursive: true });

const STILLS = [0, 1, 2.6, 3.2, 4, 5.15, 6.6, 8, 10];

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

const boot = await page.evaluate(() => {
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
  return {
    hasPlay: typeof d.playNorthstarTwenty === "function",
    profile: document.querySelector("#avatar")?.dataset?.formProfile ?? null,
  };
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
    const ds = document.querySelector("#avatar")?.dataset || {};
    const g = d.getGaitProofSample?.() || {};
    const body = document.querySelector("#body");
    const box = body?.getBBox?.();
    return {
      mark: markAt,
      form: ds.formProfile ?? null,
      supportSide: Number(ds.gaitSupportSide ?? g.supportSide ?? 0),
      swingLift: Number(ds.swingLift ?? g.swingLift ?? 0),
      swingAdvance: Number(ds.swingAdvance ?? g.swingForward ?? 0),
      plantX: Number(ds.gaitPlantX ?? g.plantedScreenXUnits ?? 0),
      bodyX: g.bodyX ?? null,
      bbox: box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null,
    };
  }, mark);
  notes.push(probe);
  const dais = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="gasper-dais"]') || document.querySelector("#avatar");
    const r = el?.getBoundingClientRect?.();
    if (!r) return null;
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (dais && dais.width > 8) {
    await page.screenshot({
      path: resolve(OUT, `still-${String(mark).replace(".", "p")}s.png`),
      clip: dais,
    });
  }
}

writeFileSync(resolve(OUT, "opening-stills.json"), JSON.stringify({ boot, notes }, null, 2));
console.log(JSON.stringify({ boot, notes }, null, 2));
await browser.close();
