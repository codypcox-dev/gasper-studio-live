import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const APP_URL = process.env.GASPER_AUDIT_URL || "http://127.0.0.1:5176/";
const OUT = resolve(
  process.env.GASPER_AUDIT_OUT ||
    "research/proofs/gasper-physics-001/northstar-motion-phase5-final-r4/live-browser-audit.json",
);
const WAIT_MS = Number(process.env.GASPER_AUDIT_WAIT_MS || 5000);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const events = [];

page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    events.push({ kind: `console:${message.type()}`, text: message.text() });
  }
});
page.on("requestfailed", (request) => {
  events.push({
    kind: "requestfailed",
    url: request.url(),
    failure: request.failure()?.errorText ?? null,
  });
});
page.on("response", (response) => {
  if (response.status() >= 400) {
    events.push({ kind: `http:${response.status()}`, url: response.url() });
  }
});

const startedAt = new Date().toISOString();
await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(WAIT_MS);

const receipt = {
  generatedAt: new Date().toISOString(),
  startedAt,
  harness: "audit-standalone-proof-surface.mjs",
  appUrl: APP_URL,
  waitMs: WAIT_MS,
  title: await page.title(),
  packaged: await page.evaluate(() => document.body?.dataset.packaged ?? null),
  events,
  bridgeEvents: events.filter((event) => /19528|19529/.test(String(event.url ?? ""))),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify(receipt, null, 2));
await browser.close();

if (events.length > 0) process.exitCode = 1;
