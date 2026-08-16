// Cheap 360 yaw sweep on the live 5179 surface.
// Heading only. No stroll, no morph, no flight.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync, execSync } from "node:child_process";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://127.0.0.1:5179/";
const OUT = resolve(process.env.GASPER_ISOLATED_OUT || "research/proofs/grok-successor-002/take-yaw-360-20260814");
const FFMPEG = process.env.GASPER_FFMPEG || "ffmpeg";
const FFPROBE = process.env.GASPER_FFPROBE || "ffprobe";
const FPS = 30;
const STEP_MS = 1000 / FPS;
const SETTLE_SEC = 0.5;
const HOLD_SEC = 0.75;
const SWEEP_SEC = 6;
const VIEWPORT = { width: 1280, height: 900 };
const HEAD_START = -180;
const HEAD_END = 180;

mkdirSync(join(OUT, "frames"), { recursive: true });
mkdirSync(join(OUT, "stills"), { recursive: true });

const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const shaShort = execSync("git rev-parse --short=9 HEAD", { encoding: "utf8" }).trim();

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await page.addInitScript(() => {
  try { Object.defineProperty(Location.prototype, "reload", { configurable: true, writable: true, value() {} }); } catch {}
  try { Location.prototype.assign = function assign() {}; Location.prototype.replace = function replace() {}; } catch {}
  const NativeWS = window.WebSocket;
  window.WebSocket = function WebSocket(url, protocols) {
    const href = String(url);
    if (/127\.0\.0\.1:5179|localhost:5179/.test(href)) {
      return {
        CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3,
        readyState: 3, url: href, protocol: "", extensions: "",
        bufferedAmount: 0, binaryType: "blob",
        onopen: null, onclose: null, onerror: null, onmessage: null,
        send() {}, close() {}, addEventListener() {}, removeEventListener() {},
        dispatchEvent() { return false; },
      };
    }
    return protocols === undefined ? new NativeWS(url) : new NativeWS(url, protocols);
  };
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
  window.WebSocket.prototype = NativeWS.prototype;
});

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(
  () => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && globalThis.__GASPER_ORGANISM_CLOCK__ && document.querySelector("#avatar"),
  { timeout: 30000 },
);
await page.waitForFunction(() => {
  const note = document.querySelector("[data-testid='showcase-note']")?.textContent ?? "";
  return /Showcase loaded|Showcase pack not served|Live physics surface/.test(note);
}, { timeout: 30000 });
await page.waitForTimeout(1250);

const surface = await page.evaluate(async ({ stepMs }) => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  const workflow = globalThis.__GASPER_FILE_WORKFLOW__;
  if (typeof workflow?.newLiveDocument !== "function") throw new Error("YAW360_LIVE_DOCUMENT_API_MISSING");
  const liveDocument = await workflow.newLiveDocument({ id: "gasper-live-yaw-360", embodiment: "presence" });
  if (!liveDocument?.ok) throw new Error("YAW360_LIVE_DOCUMENT_FAILED " + JSON.stringify(liveDocument));
  if (liveDocument.activeClipId) throw new Error("YAW360_CLIP_STILL_LOADED " + liveDocument.activeClipId);
  const note = document.querySelector("[data-testid='showcase-note']");
  if (note) note.textContent = "Live physics surface · no clip · yaw sweep";
  d.stopLiving?.();
  document.querySelector("[data-testid='dais-rail-embodiment-presence']")?.click();
  d.startLiving?.({ seed: 20260814, autoSequence: false, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  d.disarmWorldBody?.();
  rig.setPaused?.(false);
  d.living?.applyModePolicy?.({ autoSequence: false, restrainedIdle: false, freezeSequence: true });
  d.living?.eightLoop?.setAutoLoop?.(false);
  d.setEmbodiment?.("presence");
  rig.setProfile?.("presence");
  clock.stop();
  clock.reset({ seed: 20260814, timeMs: 0 });
  clock.setFixedStepMs(stepMs);
  clock.setMode("deterministic");
  clock.clearFault?.();
  return { liveDocument, embodiment: rig.getSnapshot?.().profile ?? null };
}, { stepMs: STEP_MS });

await page.evaluate(async ({ stepMs }) => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  const workflow = globalThis.__GASPER_FILE_WORKFLOW__;
  const liveDocument = await workflow?.newLiveDocument?.({ id: "gasper-live-yaw-360", embodiment: "presence" });
  if (!liveDocument?.ok || liveDocument.activeClipId) throw new Error("YAW360_LIVE_DOCUMENT_REASSERT_FAILED " + JSON.stringify(liveDocument));
  d.stopLiving?.();
  document.querySelector("[data-testid='dais-rail-embodiment-presence']")?.click();
  d.startLiving?.({ seed: 20260814, autoSequence: false, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  d.disarmWorldBody?.();
  rig.setPaused?.(false);
  d.living?.applyModePolicy?.({ autoSequence: false, restrainedIdle: false, freezeSequence: true });
  d.living?.eightLoop?.setAutoLoop?.(false);
  d.setEmbodiment?.("presence");
  rig.setProfile?.("presence");
  clock.stop();
  clock.reset({ seed: 20260814, timeMs: 0 });
  clock.setFixedStepMs(stepMs);
  clock.setMode("deterministic");
  clock.clearFault?.();
}, { stepMs: STEP_MS });

for (let attempt = 0; attempt < 240; attempt += 1) {
  const fence = await page.evaluate(() => {
    const avatar = document.querySelector("#avatar");
    const snapshot = globalThis.SidekickFormMasterRig?.getSnapshot?.() ?? null;
    return snapshot?.profile === "presence" && avatar?.dataset?.formProfile === "presence";
  });
  if (fence) break;
  await page.evaluate((stepMs) => globalThis.__GASPER_ORGANISM_CLOCK__.step(stepMs), STEP_MS);
}

const camera = await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const vp = d.getViewport?.();
  if (!vp || typeof vp.holdUserWorldFrame !== "function") throw new Error("YAW360_VIEWPORT_API_MISSING");
  vp.releaseUserWorldFrame?.();
  vp.setAutoFit?.(false);
  d.setCompositionWorldEnvelope?.(null);
  vp.applyFitCamera?.(1, 0, 0, 100);
  const composed = vp.getState?.() ?? {};
  vp.holdUserWorldFrame({ zoom: 1, panX: composed.panX ?? 0, panY: composed.panY ?? 0 });
  const st = vp.getState?.() ?? {};
  const clipSelect = document.querySelector("[data-testid='gwc-clip-select']");
  return {
    autoFit: st.autoFit ?? null,
    zoom: st.zoom ?? null,
    zoomPercent: st.zoom == null ? null : Math.round(st.zoom * 100),
    panX: st.panX ?? null,
    panY: st.panY ?? null,
    userWorldFrameHeld: st.userWorldFrameHeld ?? null,
    userCameraOwned: st.userCameraOwned ?? null,
    clipSelectValue: clipSelect?.value ?? null,
    autoFitActive: document.querySelector("[data-testid='dais-auto-fit']")?.classList.contains("active") ?? null,
  };
});
if (camera.autoFit !== false || Math.abs((camera.zoom ?? 0) - 1) > 0.05 || camera.userWorldFrameHeld !== true) {
  throw new Error("YAW360_CAMERA_NOT_LOCKED_100 " + JSON.stringify(camera));
}
if (camera.clipSelectValue === "clip-presence-living-idle") {
  throw new Error("YAW360_CLIP_STILL_VISIBLE " + JSON.stringify(camera));
}

await page.addStyleTag({
  content: `
    .gwc-app-bar, .gwc-ctx-bar, .gwc-stage-chrome, .gwc-status,
    .dais-transport-bar, .gasper-hud, .gasper-view-controls,
    .dais-control-rail, .viewport-chrome, .viewport-chrome-overlay,
    .compare-result-overlay {
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `,
});

const stageClip = await page.evaluate(() => {
  const el = document.querySelector("[data-testid='gasper-dais']");
  const r = el?.getBoundingClientRect?.();
  if (!r || !Number.isFinite(r.width) || r.width < 32) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
});
if (!stageClip) throw new Error("YAW360_DAIS_CLIP_MISSING");

const frames = [];
const samples = [];
const hashes = [];

async function captureFrame(label, headingTarget) {
  if (Number.isFinite(headingTarget)) {
    await page.evaluate((deg) => globalThis.SidekickFormMasterRig.setHeadingYaw?.(deg), headingTarget);
  }
  const clockFrame = await page.evaluate((stepMs) => {
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    if (!clock || clock.getMode() !== "deterministic") throw new Error("GASPER_CLOCK_NOT_DETERMINISTIC");
    return clock.step(stepMs);
  }, STEP_MS);
  const captureIndex = frames.length;
  const fileName = "frame-" + String(captureIndex).padStart(6, "0") + ".jpg";
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "jpeg", quality: 85, fromSurface: true, clip: stageClip,
  });
  const buffer = Buffer.from(screenshot.data, "base64");
  writeFileSync(join(OUT, "frames", fileName), buffer);
  hashes.push(createHash("sha256").update(buffer).digest("hex"));
  frames.push({ fileName, frameIndex: clockFrame.frameIndex, timeMs: clockFrame.timeMs, headingTarget });
  const captured = await page.evaluate(({ label: sampleLabel, captureIndex: index, headingTarget: target }) => {
    const avatar = document.querySelector("#avatar");
    const bodyPath = document.querySelector("#body");
    const ds = avatar?.dataset || {};
    const box = bodyPath?.getBBox?.() ?? null;
    const screen = bodyPath?.getBoundingClientRect?.() ?? null;
    return {
      label: sampleLabel,
      captureIndex: index,
      headingTarget: target,
      headingYawDeg: Number(ds.headingYaw ?? 0),
      facingDeg: Number(ds.facingDeg ?? 0),
      facingSlice: Number(ds.facingSlice ?? 6),
      facingCompress: Number(ds.facingCompress ?? 1),
      facingVerticalScale: ds.facingVerticalScale ?? null,
      faceVisibility: Number(ds.facingFaceVisibility ?? 1),
      faceFade: Number(ds.facingFaceFade ?? 0),
      formProfile: ds.formProfile ?? null,
      bboxWidth: box ? box.width : null,
      bboxHeight: box ? box.height : null,
      screenWidth: screen ? screen.width : null,
      screenHeight: screen ? screen.height : null,
    };
  }, { label, captureIndex, headingTarget });
  samples.push(captured);
}

const settleN = Math.round(SETTLE_SEC * FPS);
const holdN = Math.round(HOLD_SEC * FPS);
const sweepN = Math.round(SWEEP_SEC * FPS);
await page.evaluate((deg) => globalThis.SidekickFormMasterRig.setHeadingYaw?.(deg), HEAD_START);
for (let i = 0; i < settleN; i += 1) await captureFrame("settle", HEAD_START);
for (let i = 0; i < holdN; i += 1) await captureFrame("hold-start", HEAD_START);
for (let i = 0; i < sweepN; i += 1) {
  const t = sweepN <= 1 ? 1 : i / (sweepN - 1);
  const deg = HEAD_START + (HEAD_END - HEAD_START) * t;
  await captureFrame("yaw-sweep", deg);
}
for (let i = 0; i < holdN; i += 1) await captureFrame("hold-end", HEAD_END);

await browser.close();

const mp4 = join(OUT, "yaw-360-sweep-30fps.mp4");
execFileSync(FFMPEG, [
  "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS),
  "-i", "frames/frame-%06d.jpg", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-fps_mode", "cfr", "-movflags", "+faststart", mp4,
], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });

const KEYS = [0, 45, 90, 135, 180];
function angDist(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}
const stills = {};
for (const key of KEYS) {
  let best = null;
  for (const s of samples) {
    if (s.label !== "yaw-sweep" && s.label !== "hold-end" && s.label !== "hold-start") continue;
    const err = angDist(s.headingYawDeg, key);
    if (!best || err < best.err) best = { ...s, err };
  }
  if (best) {
    const name = "yaw-" + String(key).padStart(3, "0") + ".jpg";
    const src = join(OUT, "frames", "frame-" + String(best.captureIndex).padStart(6, "0") + ".jpg");
    if (existsSync(src)) {
      copyFileSync(src, join(OUT, name));
      copyFileSync(src, join(OUT, "stills", name));
    }
    stills[key] = best;
  }
}

const contact = join(OUT, "yaw-360-contact.jpg");
const tileMod = Math.max(1, Math.round(frames.length / 9));
execFileSync(FFMPEG, [
  "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS),
  "-i", "frames/frame-%06d.jpg",
  "-vf", "select='not(mod(n," + tileMod + "))',scale=360:-1,tile=3x3:padding=4:margin=4",
  "-frames:v", "1", contact,
], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });

rmSync(join(OUT, "frames"), { recursive: true, force: true });

const sweep = samples.filter((s) => s.label === "yaw-sweep");
const csv = ["captureIndex,label,headingTarget,headingYawDeg,facingDeg,facingCompress,bboxWidth,bboxHeight,screenWidth,screenHeight,faceVisibility,faceFade,facingSlice"];
for (const s of samples) {
  csv.push([s.captureIndex, s.label, s.headingTarget, s.headingYawDeg, s.facingDeg, s.facingCompress, s.bboxWidth, s.bboxHeight, s.screenWidth, s.screenHeight, s.faceVisibility, s.faceFade, s.facingSlice].join(","));
}
writeFileSync(join(OUT, "width-vs-yaw.csv"), csv.join("\n") + "\n");

function nearest(deg) {
  let best = null;
  for (const s of sweep.concat(samples.filter((s) => s.label === "hold-start" || s.label === "hold-end"))) {
    const err = angDist(s.headingYawDeg, deg);
    if (!best || err < best.err) best = { ...s, err };
  }
  return best;
}
const widthAt = {};
for (const k of KEYS) {
  const s = nearest(k);
  widthAt[k] = s ? { headingYawDeg: s.headingYawDeg, facingCompress: s.facingCompress, bboxWidth: s.bboxWidth, screenWidth: s.screenWidth, err: s.err } : null;
}

const around45 = sweep.filter((s) => Math.abs(Math.abs(s.headingYawDeg) - 45) <= 6).sort((a, b) => a.headingYawDeg - b.headingYawDeg);
const diffs45 = [];
for (let i = 1; i < around45.length; i += 1) {
  const a = around45[i - 1];
  const b = around45[i];
  const dYaw = b.headingYawDeg - a.headingYawDeg;
  if (Math.abs(dYaw) < 1e-6) continue;
  diffs45.push({
    from: a.headingYawDeg,
    to: b.headingYawDeg,
    dBbox: b.bboxWidth - a.bboxWidth,
    dScreen: b.screenWidth - a.screenWidth,
    dCompress: b.facingCompress - a.facingCompress,
    dBboxPerDeg: (b.bboxWidth - a.bboxWidth) / dYaw,
  });
}
const maxJump = diffs45.reduce((m, d) => Math.max(m, Math.abs(d.dBboxPerDeg)), 0);

const probe = JSON.parse(execFileSync(FFPROBE, [
  "-v", "error", "-select_streams", "v:0", "-count_frames",
  "-show_entries", "stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,duration",
  "-of", "json", mp4,
], { encoding: "utf8" })).streams?.[0] ?? null;

const receipt = {
  kind: "yaw-360-sweep",
  sha,
  shaShort,
  url: URL,
  fps: FPS,
  sweepSec: SWEEP_SEC,
  heading: { start: HEAD_START, end: HEAD_END },
  surface,
  camera,
  frameCount: frames.length,
  sweepCount: sweep.length,
  widthAt,
  around45: diffs45,
  maxAbsBboxPerDegNear45: maxJump,
  snapAt45Gone: maxJump < 1.5,
  stills,
  mp4: { path: mp4, probe },
  hashesHead: hashes.slice(0, 3),
  hashesTail: hashes.slice(-3),
};
writeFileSync(join(OUT, "receipt.json"), JSON.stringify(receipt, null, 2));
writeFileSync(join(OUT, "samples.json"), JSON.stringify(samples, null, 2));
console.log(JSON.stringify({
  ok: true,
  sha: shaShort,
  frames: frames.length,
  camera,
  widthAt,
  maxAbsBboxPerDegNear45: maxJump,
  snapAt45Gone: maxJump < 1.5,
  mp4,
}, null, 2));
