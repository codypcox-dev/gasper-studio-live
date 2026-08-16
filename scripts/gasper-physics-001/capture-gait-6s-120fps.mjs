// N258–N260 — focused 6s exact-120fps gait proof.
// Organism clock is stepped. Never a 20s recapture.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { gaitSupportLiveMetric } from "./proof-metrics.mjs";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://127.0.0.1:5179/?seq20=gait2-6s";
const OUT = resolve(process.env.GASPER_GAIT6_OUT || "research/proofs/grok-successor-002/take-6s-gait2-proof");
const FFMPEG = process.env.GASPER_FFMPEG || "ffmpeg";
const FPS = 120;
const STEP_MS = 1000 / 120;
const ACTIVE_SEC = Number(process.env.GASPER_CAPTURE_SEC || 6);
if (!(ACTIVE_SEC > 0) || ACTIVE_SEC > 16) {
  throw new Error(`Focused review only. Refusing GASPER_CAPTURE_SEC=${ACTIVE_SEC}`);
}
const STILL_T = Array.from({ length: Math.floor(ACTIVE_SEC / 0.25) + 1 }, (_, i) => i * 0.25);
const VIEWPORT = { width: 1280, height: 900 };

mkdirSync(join(OUT, "frames"), { recursive: true });
mkdirSync(join(OUT, "stills"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
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
    if (/127\\.0\\.0\\.1:5179|localhost:5179/.test(href)) {
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
  window.WebSocket.CONNECTING = 0; window.WebSocket.OPEN = 1; window.WebSocket.CLOSING = 2; window.WebSocket.CLOSED = 3;
  window.WebSocket.prototype = NativeWS.prototype;
});

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(
  () => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && globalThis.__GASPER_ORGANISM_CLOCK__ && document.querySelector("#avatar"),
  { timeout: 30000 },
);
await page.waitForFunction(() => {
  const note = document.querySelector('[data-testid="showcase-note"]')?.textContent ?? "";
  return /Showcase loaded|Showcase pack not served|Live physics surface/.test(note);
}, { timeout: 30000 });
await page.waitForTimeout(800);

const surface = await page.evaluate(async () => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  const workflow = globalThis.__GASPER_FILE_WORKFLOW__;
  const liveDocument = await workflow.newLiveDocument({
    id: "gasper-live-6s-gait2",
    embodiment: "wispwalker",
  });
  d.stopLiving?.();
  document.querySelector('[data-testid="dais-rail-embodiment-wispwalker"]')?.click();
  d.startLiving?.({ seed: 20260808, autoSequence: false, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  d.disarmWorldBody?.();
  rig.setPaused?.(false);
  d.living?.applyModePolicy?.({ autoSequence: false, restrainedIdle: false, freezeSequence: true });
  d.living?.eightLoop?.setAutoLoop?.(false);
  d.setEmbodiment("wispwalker");
  rig.setProfile("wispwalker");
  d.setWorldPhysicsParams?.({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });
  clock.stop();
  clock.reset({ seed: 20260808, timeMs: 0 });
  clock.setFixedStepMs(1000 / 120);
  clock.setMode("deterministic");
  clock.clearFault?.();
  return {
    liveDocument,
    embodiment: rig.getSnapshot?.().profile ?? null,
    hasPlayTwenty: typeof d.playNorthstarTwenty === "function",
    hasGaitProof: typeof d.getGaitProofSample === "function",
  };
});

await page.evaluate(async () => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  d.stopLiving?.();
  d.startLiving?.({ seed: 20260808, autoSequence: false, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  d.disarmWorldBody?.();
  rig.setPaused?.(false);
  d.setEmbodiment?.("wispwalker");
  rig.setProfile?.("wispwalker");
  clock.stop();
  clock.reset({ seed: 20260808, timeMs: 0 });
  clock.setFixedStepMs(1000 / 120);
  clock.setMode("deterministic");
  clock.clearFault?.();
});

for (let i = 0; i < 240; i += 1) {
  const ok = await page.evaluate(() => {
    const snap = globalThis.SidekickFormMasterRig?.getSnapshot?.();
    const form = document.querySelector("#avatar")?.dataset?.formProfile;
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    return snap?.profile === "wispwalker" && form === "wispwalker" && !(snap?.morph && snap.morph.from !== snap.morph.to)
      && clock.getMode() === "deterministic";
  });
  if (ok) break;
  await page.evaluate((stepMs) => globalThis.__GASPER_ORGANISM_CLOCK__.step(stepMs), STEP_MS);
}

const HOLD_ZOOM = Number(process.env.GASPER_HOLD_ZOOM || 2);
const HOLD_PAN_Y = Number(process.env.GASPER_HOLD_PAN_Y || -40);
const camera = await page.evaluate(({ holdZoom, holdPanY }) => {
  const d = globalThis.__GASPER_DAIS__;
  const vp = d.getViewport?.();
  vp.releaseUserWorldFrame?.();
  vp.setAutoFit?.(false);
  d.setCompositionWorldEnvelope?.(null);
  if (!document.getElementById("worldRig") || !document.querySelector('[data-testid="gasper-dais"]')) {
    throw new Error("LIVE_WORLDRIG_OR_DAIS_MISSING");
  }
  vp.holdUserWorldFrame({ zoom: holdZoom, panX: 0, panY: holdPanY });
  const held = vp.getState?.() ?? {};
  if (held.zoom !== holdZoom || held.panY !== holdPanY || held.autoFit !== false || held.userWorldFrameHeld !== true) {
    throw new Error("HOLD_FENCE_FAILED " + JSON.stringify(held));
  }
  return held;
}, { holdZoom: HOLD_ZOOM, holdPanY: HOLD_PAN_Y });

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
  const el = document.querySelector('[data-testid="gasper-dais"]');
  const r = el?.getBoundingClientRect?.();
  if (!r || r.width < 32) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
});
if (!stageClip) throw new Error("DAIS_CLIP_MISSING");

function readProbe() {
  return page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    const rig = globalThis.SidekickFormMasterRig;
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    const bodyEl = document.querySelector("#body");
    const bodyState = d.getWorldBodyState?.() || null;
    const bodyRect = bodyEl?.getBoundingClientRect?.();
    const ds = document.querySelector("#avatar")?.dataset || {};
    const ins = clock.inspect();
    const gaitProof = d.getGaitProofSample?.() || null;
    const path = bodyEl;
    let lowerContour = { sampleCount: 0 };
    if (path && typeof path.getTotalLength === "function") {
      const length = path.getTotalLength();
      const box = path.getBBox?.();
      if (length > 0 && box && box.height > 0) {
        const bottoms = [];
        for (let i = 0; i < 21; i += 1) {
          const pt = path.getPointAtLength((length * i) / 20);
          bottoms.push(pt.y);
        }
        const finite = bottoms.filter(Number.isFinite);
        lowerContour = {
          sampleCount: bottoms.length,
          leftBottom: bottoms[5] ?? null,
          midBottom: bottoms[10] ?? null,
          rightBottom: bottoms[15] ?? null,
          maxY: finite.length ? Math.max(...finite) : null,
          minY: finite.length ? Math.min(...finite) : null,
          spanY: finite.length ? Math.max(...finite) - Math.min(...finite) : null,
        };
      }
    }
    return {
      t: clock.nowMs(),
      frameIndex: ins.frameIndex ?? null,
      clockMode: ins.mode,
      bodyX: bodyState?.body?.x ?? null,
      bodyY: bodyState?.body?.y ?? null,
      bodyZ: bodyState?.body?.z ?? null,
      bodySpeed: bodyState?.body ? Math.hypot(bodyState.body.vx || 0, bodyState.body.vz || 0) : null,
      mode: bodyState?.mode ?? null,
      filedCruise: bodyState?.filedCruise ?? null,
      planted: bodyState?.support?.planted ?? null,
      supportSide: bodyState?.support?.side ?? null,
      plantedWorldX: bodyState?.support?.plantedWorldX ?? null,
      plantedWorldZ: bodyState?.support?.plantedWorldZ ?? null,
      embodiment: rig.getSnapshot?.()?.profile ?? null,
      gaitProof: gaitProof ? { ...gaitProof, lowerContour } : { source: "missing", lowerContour },
      dataset: {
        formProfile: ds.formProfile ?? null,
        worldPoseX: ds.worldPoseX ?? null,
        headingYaw: ds.headingYaw ?? null,
        facingDeg: ds.facingDeg ?? null,
        gaitPlantX: ds.gaitPlantX ?? null,
        gaitPlantWorld: ds.gaitPlantWorld ?? null,
        gaitSupportSide: ds.gaitSupportSide ?? null,
        gaitShadowDx: ds.gaitShadowDx ?? null,
        gaitStepSkew: ds.gaitStepSkew ?? null,
        gaitPhase: ds.gaitPhase ?? null,
        plantedCompress: ds.plantedCompress ?? null,
        incomingCompress: ds.incomingCompress ?? null,
        gaitFlattenW: ds.gaitFlattenW ?? null,
        gaitBob: ds.gaitBob ?? null,
        gaitSwayX: ds.gaitSwayX ?? null,
      },
      bodyRect: bodyRect ? { x: bodyRect.x, y: bodyRect.y, w: bodyRect.width, h: bodyRect.height } : null,
    };
  });
}

await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  d.setCompositionWorldEnvelope?.(null);
  clock.reset({ seed: 20260808, timeMs: 0 });
  clock.setFixedStepMs(1000 / 120);
  clock.setMode("deterministic");
  if (typeof d.playNorthstarTwenty !== "function") throw new Error("PLAY_NORTHSTAR_TWENTY_MISSING");
  d.playNorthstarTwenty();
});

const totalSteps = Math.round((ACTIVE_SEC * 1000) / STEP_MS);
const samples = [];
const stills = {};

for (let step = 0; step <= totalSteps; step += 1) {
  if (step > 0) {
    await page.evaluate((stepMs) => {
      const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
      if (clock.getMode() !== "deterministic") throw new Error("CLOCK_NOT_DET");
      clock.step(stepMs);
      globalThis.SidekickFormMasterRig?.requestOneFrame?.();
    }, STEP_MS);
  }

  const tSec = step * STEP_MS / 1000;
  const wantStill = STILL_T.some((s) => Math.abs(tSec - s) < STEP_MS / 2000);
  const cap = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 90,
    fromSurface: true,
    clip: stageClip,
  });
  const idx = String(step).padStart(4, "0");
  const fileName = `frame-${idx}.jpg`;
  writeFileSync(join(OUT, "frames", fileName), Buffer.from(cap.data, "base64"));
  if (wantStill) {
    const stillName = tSec === 0 ? "t0.jpg" : `t-${String(tSec).replace(".", "p")}.jpg`;
    writeFileSync(join(OUT, "stills", stillName), Buffer.from(cap.data, "base64"));
    stills[tSec] = stillName;
  }
  // N260: per-frame support telemetry. No sparse empty rows.
  const probe = await readProbe();
  samples.push({ ...probe, fileName, tSec });
}

await browser.close();

const frameNames = samples.filter((s) => s.fileName).map((s) => s.fileName);
const concat = "ffconcat version 1.0\n" + frameNames.map((name) => "file 'frames/" + name + "'\nduration " + (1 / FPS)).join("\n") + "\nfile 'frames/" + frameNames[frameNames.length - 1] + "'\n";
writeFileSync(join(OUT, "frames.ffconcat"), concat);
const mp4 = join(OUT, "gait-6s-120fps.mp4");
execFileSync(FFMPEG, [
  "-y", "-f", "concat", "-safe", "0", "-i", join(OUT, "frames.ffconcat"),
  "-fps_mode", "cfr", "-r", String(FPS), "-frames:v", String(frameNames.length),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", mp4,
], { stdio: "inherit" });

const contactSheet = join(OUT, "contact-4fps.jpg");
const stillFiles = STILL_T.map((t) => stills[t]).filter(Boolean).map((name) => join(OUT, "stills", name)).filter(existsSync);
if (stillFiles.length) {
  const cols = 5;
  const rows = Math.ceil(stillFiles.length / cols);
  execFileSync(FFMPEG, [
    "-y", "-hide_banner", "-loglevel", "error",
    ...stillFiles.flatMap((file) => ["-i", file]),
    "-filter_complex", `tile=${cols}x${rows}:padding=4:margin=4`,
    contactSheet,
  ], { stdio: "inherit" });
}

for (const name of readdirSync(join(OUT, "frames"))) {
  rmSync(join(OUT, "frames", name));
}
try { rmSync(join(OUT, "frames"), { recursive: true }); } catch {}

const live = gaitSupportLiveMetric(samples);
if (live.datasetStaleVsKernel) {
  throw new Error("N246/N257: dataset froze while kernel traveled. Proof is invalid.");
}

writeFileSync(join(OUT, "samples.json"), JSON.stringify({
  surface,
  camera,
  stageClip,
  contract: { fps: FPS, seconds: ACTIVE_SEC, stillStepSec: 0.25, perFrameTelemetry: true },
  gaitSupportLive: live,
  samples,
  stills,
}, null, 2));

console.log("PROBE_DONE", JSON.stringify({
  n: samples.length,
  frames: frameNames.length,
  stills: Object.keys(stills).length,
  hasGaitProof: surface.hasGaitProof,
  gaitSupportLive: live,
  mp4,
  contactSheet,
  out: OUT,
}));
