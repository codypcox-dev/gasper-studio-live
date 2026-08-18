import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXEC =
  process.env.GASPER_CHROMIUM_EXEC ||
  "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = process.env.GASPER_REVIEW_URL || "http://127.0.0.1:8080/";
const OUT = resolve("docs/triforce/canon/runs/2026-08-18T19-10-00-000Z-wave1-state-of-t");
mkdirSync(OUT, { recursive: true });

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

const probe = () =>
  page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    const ds = document.querySelector("#avatar")?.dataset || {};
    const g = d.getGaitProofSample?.() || {};
    const body = document.querySelector("#body");
    const box = body?.getBBox?.();
    const h = globalThis;
    const t0 = Number(h.__GASPER_TAKE_T0__);
    const now = h.__GASPER_ORGANISM_CLOCK__?.nowMs?.() ?? 0;
    return {
      t: Number.isFinite(t0) ? (now - t0) / 1000 : null,
      form: ds.formProfile ?? null,
      walkEnable: Number(ds.walkEnable ?? g.walkEnable ?? NaN),
      supportSide: Number(ds.gaitSupportSide ?? g.supportSide ?? 0),
      boo: ds.boo ?? g.boo ?? null,
      height: box?.height ?? null,
      y: box?.y ?? null,
      bbox: box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null,
    };
  });

const shot = async (name) => {
  const clip = await page.evaluate(() => {
    const el =
      document.querySelector("[data-testid=gasper-monitor]") ||
      document.querySelector("#avatar");
    const r = el?.getBoundingClientRect?.();
    return r && r.width > 8 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  if (clip) await page.screenshot({ path: resolve(OUT, name), clip });
};

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
const advanceTo = async (mark) => {
  while (t + 1e-6 < mark) {
    await page.evaluate((ms) => globalThis.__GASPER_ORGANISM_CLOCK__?.step?.(ms), STEP);
    t += STEP / 1000;
  }
};

await advanceTo(12);
const at12 = await probe();
await shot("w1-12s.png");

await page.evaluate(() => {
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  const now = clock.nowMs();
  globalThis.__GASPER_TAKE_T0__ = now - 4000;
  globalThis.__GASPER_SCRUB_MS__ = 4000;
  globalThis.__GASPER_SCRUB_HOLD__ = 1;
  clock.step?.(0);
});
const at4once = await probe();
await shot("w1-scrub-4s.png");

// a few held frames so bind reset can settle visually
for (let i = 0; i < 12; i++) {
  await page.evaluate((ms) => globalThis.__GASPER_ORGANISM_CLOCK__?.step?.(ms), STEP);
}
const at4settle = await probe();
await shot("w1-scrub-4s-settle.png");

const proof = {
  at12,
  at4once,
  at4settle,
  pass:
    at12.t > 11 &&
    at4once.t !== null &&
    Math.abs(at4once.t - 4) < 0.05 &&
    at4settle.y > at12.y - 5,
};

writeFileSync(resolve(OUT, "wave1-scrub.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
await browser.close();
process.exit(proof.pass ? 0 : 1);
