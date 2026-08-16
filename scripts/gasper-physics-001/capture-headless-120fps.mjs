// Headless GASPER-PHYSICS-001 capture at the authoritative deterministic cadence.
//
// This harness advances the live Gasper organism clock by exactly 1000/120 ms
// and captures one distinct browser surface after every step. It does not pad,
// duplicate, interpolate, or feed captured pixels back into the application.
// It writes evidence only; it never writes a phase-gate marker.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://127.0.0.1:5176/";
const OUT = resolve(process.env.GASPER_PHYSICS_120_OUT || "research/proofs/gasper-physics-001/fresh-headless-physics-120fps-20260808");
const FFMPEG = process.env.GASPER_FFMPEG || "ffmpeg";
const FFPROBE = process.env.GASPER_FFPROBE || "ffprobe";
const FPS = 120;
const STEP_MS = 1000 / FPS;
const VIEWPORT = { width: 1280, height: 900 };

if (existsSync(join(OUT, "receipt.json"))) {
  throw new Error(`Refusing to overwrite an existing capture: ${OUT}`);
}
mkdirSync(join(OUT, "frames"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const events = [];
page.on("pageerror", (error) => events.push({ type: "pageerror", message: error.message }));
page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    events.push({ type: `console-${message.type()}`, message: message.text() });
  }
});

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(
  () => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && globalThis.__GASPER_ORGANISM_CLOCK__ && document.querySelector("#avatar"),
  { timeout: 30000 },
);

const surface = await page.evaluate((stepMs) => {
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
  d.living?.applyModePolicy?.({ autoSequence: false, restrainedIdle: false, freezeSequence: true });
  d.living?.eightLoop?.setAutoLoop?.(false);
  d.setEmbodiment?.("presence");
  d.living?.goEightState?.("presence-neutral-settled", { duration: 0.2 });
  d.setWorldPhysicsParams?.({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });

  // The application clock is the only time authority for the live organism.
  // Stop wall-clock dispatch before resetting and entering fixed-step mode.
  clock.stop();
  clock.reset({ seed: 20260808, timeMs: 0 });
  clock.setFixedStepMs(stepMs);
  clock.setMode("deterministic");
  clock.clearFault?.();

  return {
    dais: !!d,
    bounceApi: typeof d.launchWorldBounce === "function",
    cometApi: typeof d.launchWorldComet === "function",
    paramsApi: typeof d.setWorldPhysicsParams === "function",
    environmentApi: typeof d.reportEnvironmentSize === "function" && typeof d.getEnvironmentFieldEpoch === "function",
    bodyStateApi: typeof d.getWorldBodyState === "function",
    poseApi: typeof d.getWorldPoseApplied === "function" && typeof rig.getWorldPose === "function",
    wakeIntake: typeof rig.setPhysicsWake === "function",
    lightIntake: typeof rig.setPhysicsLight === "function",
    worldRigGroup: !!document.getElementById("worldRig"),
    clock: clock.inspect(),
  };
}, STEP_MS);

const requiredSurface = [
  "dais",
  "bounceApi",
  "cometApi",
  "paramsApi",
  "environmentApi",
  "bodyStateApi",
  "poseApi",
  "wakeIntake",
  "lightIntake",
  "worldRigGroup",
];
if (requiredSurface.some((key) => !surface[key]) || surface.clock?.mode !== "deterministic") {
  throw new Error(`PHYSICS_HEADLESS_120_SURFACE_FAILED ${JSON.stringify(surface)}`);
}

function readTelemetry(label, captureIndex, clockFrame) {
  return page.evaluate(({ label: sampleLabel, captureIndex: index, clockFrame: frame }) => {
    const d = globalThis.__GASPER_DAIS__;
    const rig = globalThis.SidekickFormMasterRig;
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    const avatar = document.querySelector("#avatar");
    const worldRig = document.getElementById("worldRig");
    const pose = rig.getWorldPose?.() || null;
    const bodyState = d.getWorldBodyState?.() || null;
    const body = bodyState?.body || null;
    const envelope = bodyState?.envelope || null;
    const ds = avatar?.dataset || {};
    return {
      label: sampleLabel,
      captureIndex: index,
      clockFrame: frame,
      t: clock.nowMs(),
      body: bodyState
        ? {
            mode: bodyState.mode,
            body,
            envelope,
            params: bodyState.params,
            fieldEpoch: bodyState.fieldEpoch,
            locomotionOwners: bodyState.locomotionOwners,
            gait: bodyState.gait,
            authority: bodyState.authority ?? null,
          }
        : null,
      target: pose?.target || null,
      applied: pose?.applied || null,
      worldRigTransform: worldRig?.getAttribute("transform") ?? null,
      dataset: {
        provenance: ds.worldPoseProvenance ?? null,
        physicsWake: Number(ds.physicsWake ?? 0),
        physicsLight: Number(ds.physicsLight ?? 0),
        wakeStretch: Number(ds.wakeStretch ?? 0),
        motionLightFactor: Number(ds.motionLightFactor ?? 1),
        motionLightSpeed: Number(ds.motionLightSpeed ?? 0),
        worldDepthScale: Number(ds.worldDepthScale ?? 1),
      },
    };
  }, { label, captureIndex, clockFrame });
}

const frames = [];
const samples = [];
const hashes = [];

async function captureFrame(label) {
  const clockFrame = await page.evaluate((stepMs) => {
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    if (!clock || clock.getMode() !== "deterministic") throw new Error("GASPER_CLOCK_NOT_DETERMINISTIC");
    const frame = clock.step(stepMs);
    return {
      frameIndex: frame.frameIndex,
      timeMs: frame.timeMs,
      deltaMs: frame.deltaMs,
      mode: frame.mode,
    };
  }, STEP_MS);
  if (clockFrame.mode !== "deterministic" || Math.abs(clockFrame.deltaMs - STEP_MS) > 1e-9) {
    throw new Error(`GASPER_CLOCK_STEP_FAILED ${JSON.stringify(clockFrame)}`);
  }

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 85,
    fromSurface: true,
  });
  const buffer = Buffer.from(screenshot.data, "base64");
  const captureIndex = frames.length;
  const fileName = `frame-${String(captureIndex).padStart(6, "0")}.jpg`;
  writeFileSync(join(OUT, "frames", fileName), buffer);
  frames.push({ fileName, frameIndex: clockFrame.frameIndex, timeMs: clockFrame.timeMs });
  hashes.push(createHash("sha256").update(buffer).digest("hex"));
  const sample = await readTelemetry(label, captureIndex, clockFrame.frameIndex);
  samples.push(sample);

  if (captureIndex > 0 && captureIndex % 240 === 0) {
    console.log(JSON.stringify({ progress: `${captureIndex}/${"~4000"}`, label, timeMs: clockFrame.timeMs }));
  }
  return sample;
}

async function advanceFrames(count, label) {
  let last = null;
  for (let i = 0; i < count; i += 1) last = await captureFrame(label);
  return last;
}

const seconds = (value) => Math.round(value * FPS);

// A short authored baseline makes the first transition reviewable.
await advanceFrames(seconds(1), "baseline");

await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.35 }));
await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldBounce({}));
await advanceFrames(seconds(7.5), "bounce");
await advanceFrames(seconds(4.5), "bounce-settle");

await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.2 }));
await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 1.4 }));
await advanceFrames(seconds(3), "comet");

const fieldSwap = await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  const before = d.getEnvironmentFieldEpoch?.() ?? -1;
  const startedAt = clock.nowMs();
  const after = d.reportEnvironmentSize?.({
    viewportWidthPx: 1440,
    viewportHeightPx: 900,
    homeHeightPx: 153,
  }) ?? -1;
  return { before, after, startedAt };
});
await advanceFrames(seconds(2.5), "field-swap");
await advanceFrames(seconds(4), "comet-post-swap");
await advanceFrames(seconds(5), "comet-settle");

await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPose({ x: 600, y: 300, z: 0, tilt: 0, provenance: "bogus-provenance" }));
const fence = await captureFrame("provenance-fence");

await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 1.4 }));
await advanceFrames(seconds(0.6), "second-comet");
await page.evaluate(() => globalThis.SidekickFormMasterRig.setLifeScale(0));

const collapseIsValid = (value) => Boolean(
  value?.body?.mode &&
  value.body.mode !== "idle" &&
  value.target?.provenance === "physics-authority" &&
  Math.abs(value.applied?.x ?? 99) < 8 &&
  Math.abs(value.applied?.y ?? 99) < 8 &&
  (value.dataset?.wakeStretch ?? 99) < 0.02 &&
  (value.dataset?.motionLightFactor ?? 99) < 1.01,
);
let collapse = null;
let collapseFrames = 0;
for (; collapseFrames < seconds(3); collapseFrames += 1) {
  collapse = await captureFrame("reduced-motion-collapse");
  if (collapseIsValid(collapse)) break;
}
const collapseWaitMs = (collapseFrames + 1) * STEP_MS;
await advanceFrames(seconds(0.9), "reduced-motion");
await page.evaluate(() => {
  globalThis.SidekickFormMasterRig.setLifeScale(1);
  globalThis.__GASPER_DAIS__.disarmWorldBody?.();
  globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });
});
await advanceFrames(seconds(1.2), "restored");

const lastClock = await page.evaluate(() => globalThis.__GASPER_ORGANISM_CLOCK__.inspect());
await browser.close();

const adjacentDistinctCount = hashes.slice(1).reduce((count, hash, index) => count + (hash !== hashes[index] ? 1 : 0), 0);
const adjacentDistinctRatio = hashes.length > 1 ? adjacentDistinctCount / (hashes.length - 1) : 0;
const contiguousClockFrames = frames.every((frame, index) => index === 0 || frame.frameIndex === frames[index - 1].frameIndex + 1);
const spanSec = frames.length / FPS;

let concat = "ffconcat version 1.0\n";
for (const frame of frames) {
  concat += `file 'frames/${frame.fileName}'\n`;
}
writeFileSync(join(OUT, "frames.ffconcat"), concat);

const mp4 = join(OUT, "headless-physics-120fps.mp4");
const webm = join(OUT, "headless-physics-120fps.webm");
execFileSync(FFMPEG, [
  "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
  "-framerate", String(FPS), "-i", "frames/frame-%06d.jpg",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
  "-r", String(FPS), "-fps_mode", "cfr", "-movflags", "+faststart", mp4,
], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });
execFileSync(FFMPEG, [
  "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
  "-framerate", String(FPS), "-i", "frames/frame-%06d.jpg",
  "-c:v", "libvpx-vp9", "-crf", "18", "-b:v", "0", "-r", String(FPS), "-fps_mode", "cfr", webm,
], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });

function probe(path) {
  return JSON.parse(execFileSync(FFPROBE, [
    "-v", "error", "-select_streams", "v:0", "-count_frames",
    "-show_entries", "stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,duration",
    "-of", "json", path,
  ], { encoding: "utf8" })).streams?.[0] ?? null;
}

const mp4Probe = probe(mp4);
const webmProbe = probe(webm);
const finite = (values) => values.filter((value) => Number.isFinite(value));
const maxOf = (values) => Math.max(0, ...finite(values));
const physicsSamples = samples.filter((s) => s.body?.mode && s.body.mode !== "idle");
const bounceSamples = samples.filter((s) => s.label === "bounce" || s.label === "bounce-settle");
const cometSamples = samples.filter((s) => s.label === "comet" || s.label === "comet-settle");
const fieldSwapSamples = samples.filter((s) => s.label === "field-swap");
const firstFieldSwapObservation = fieldSwapSamples.find((s) => (s.body?.fieldEpoch ?? -1) >= fieldSwap.after);
const fieldSwapLatencyMs = firstFieldSwapObservation
  ? Math.max(0, firstFieldSwapObservation.t - fieldSwap.startedAt)
  : Number.POSITIVE_INFINITY;
const constructionSamples = physicsSamples.filter((s) => s.target?.provenance === "physics-authority");
const constructionLock = constructionSamples.length > 20 && constructionSamples.every((s) =>
  s.body?.authority?.packet === "GASPER-PHYSICS-AUTHORITY-001" &&
  s.body.authority.writer === "world-physics-driver" &&
  s.body.authority.emissionCount > 0 &&
  s.body.authority.bodyPoseMatchesOutput &&
  s.body.authority.provenance === "physics-authority",
);
const observationSamples = constructionSamples.filter((s) => s.label !== "reduced-motion-collapse" && s.label !== "reduced-motion");
const poseResiduals = observationSamples.flatMap((s) => {
  const body = s.body?.body;
  const output = s.body?.authority?.outputPose;
  if (!body || !output) return [];
  return [
    Math.abs((output.x ?? 0) - (body.x ?? 0)),
    Math.abs((output.y ?? 0) - (body.y ?? 0)),
    Math.abs((output.z ?? 0) - (body.z ?? 0)),
  ];
});
const maxObservedPoseResidual = maxOf(poseResiduals);
const observationLock = observationSamples.length > 20 && maxObservedPoseResidual <= 1e-6;
const bouncePeakY = maxOf(bounceSamples.map((s) => s.applied?.y));
const cometPeakY = maxOf(cometSamples.map((s) => s.applied?.y));
const maxWake = maxOf(physicsSamples.map((s) => s.dataset?.physicsWake));
const maxLight = maxOf(physicsSamples.map((s) => s.dataset?.motionLightFactor));
const maxWarp = maxOf(physicsSamples.map((s) => s.dataset?.wakeStretch));
const maxTilt = maxOf(physicsSamples.map((s) => Math.abs(s.applied?.tilt ?? 0)));
const maxGather = maxOf(cometSamples.map((s) => s.body?.envelope?.gather));
const sawPhysicsProvenance = physicsSamples.some((s) => s.dataset?.provenance === "physics-authority");
const velocityWakeRetired = maxWake === 0 && maxWarp === 0;
const bounceRelease = samples.some((s) => s.label === "bounce-settle" && s.body?.mode === "idle" && s.dataset?.provenance === "none" && !s.worldRigTransform);
const cometRelease = samples.some((s) => s.label === "comet-settle" && s.body?.mode === "idle" && s.dataset?.provenance === "none" && !s.worldRigTransform);
const fenceOk = fence.target?.provenance === "none" && Math.abs(fence.target?.x ?? 1) < 1e-6 && Math.abs(fence.applied?.x ?? 1) < 2;
const collapseOk = collapseIsValid(collapse);

const receipt = {
  generatedAt: new Date().toISOString(),
  harness: "capture-headless-120fps.mjs",
  surface,
  capture: {
    frameCount: frames.length,
    virtualDurationSec: spanSec,
    sourceCadenceFps: FPS,
    fixedStepMs: STEP_MS,
    cadenceType: "headless deterministic organism-clock fixed-step",
    cadenceRule: "one browser-surface screenshot after each clock.step(1000/120); no frame duplication, interpolation, or wall-clock pacing",
    adjacentDistinctRatio,
    adjacentDistinctCount,
    contiguousClockFrames,
    firstClockFrame: frames[0]?.frameIndex ?? null,
    lastClockFrame: frames.at(-1)?.frameIndex ?? null,
    finalClock: lastClock,
    format: "CDP Page.captureScreenshot JPEG -> H.264 MP4 / VP9 WebM",
    quality: 85,
    viewport: VIEWPORT,
    mp4,
    webm,
    mp4Probe,
    webmProbe,
    reducedMotionProbe: "mid-comet gather/flight with live physics-authority target",
    collapseWaitMs,
  },
  sampleCount: samples.length,
  samples,
  proofs: {
    exercisedPhysicsPath: physicsSamples.length > 0,
    bouncePeakY: Math.round(bouncePeakY * 100) / 100,
    cometPeakY: Math.round(cometPeakY * 100) / 100,
    maxWake: Math.round(maxWake * 1000) / 1000,
    maxMotionLightFactor: Math.round(maxLight * 1000) / 1000,
    maxWakeStretch: Math.round(maxWarp * 1000) / 1000,
    velocityWakeRetired,
    maxAbsTilt: Math.round(maxTilt * 1000) / 1000,
    maxGather: Math.round(maxGather * 1000) / 1000,
    sawPhysicsProvenance,
    constructionLock,
    constructionSampleCount: constructionSamples.length,
    observationLock,
    observationSampleCount: observationSamples.length,
    maxObservedPoseResidual: Math.round(maxObservedPoseResidual * 1e9) / 1e9,
    fieldSwapResponse: {
      beforeEpoch: fieldSwap.before,
      afterEpoch: fieldSwap.after,
      epochGrew: fieldSwap.after > fieldSwap.before,
      observedEpoch: firstFieldSwapObservation?.body?.fieldEpoch ?? -1,
      observedWithinOneSecond: fieldSwapLatencyMs <= 1000,
      latencyMs: Number.isFinite(fieldSwapLatencyMs) ? Math.round(fieldSwapLatencyMs * 100) / 100 : null,
    },
    bounceRelease,
    cometRelease,
    fenceOk,
    collapseOk,
    exactDeterministic120: frames.length > 0 && contiguousClockFrames && Math.abs(lastClock.fixedStepMs - STEP_MS) < 1e-9 && adjacentDistinctRatio === 1,
  },
  events,
  visualAcceptance: "PENDING_ARCHITECT_REVIEW",
  ownerAcceptance: "PENDING",
};
writeFileSync(join(OUT, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
writeFileSync(join(OUT, "surface.json"), JSON.stringify(surface, null, 2) + "\n");
console.log(JSON.stringify({ out: OUT, mp4, webm, frames: frames.length, cadenceFps: FPS, adjacentDistinctRatio, proofs: receipt.proofs }, null, 2));
