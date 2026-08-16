// Fresh observer-only GASPER-PHYSICS-001 capture.
// Drives the existing physics-authority performances, records telemetry, and
// captures a chronological CDP screencast. It never feeds captured pixels back
// into Gasper state and never writes a phase-gate marker.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://127.0.0.1:5176/";
const OUT = resolve(process.env.GASPER_PHYSICS_REVIEW_OUT || "research/proofs/gasper-physics-001/fresh-physics-20260808");
const FFMPEG = process.env.GASPER_FFMPEG || "ffmpeg";
mkdirSync(join(OUT, "frames"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-frame-rate-limit", "--disable-gpu-vsync"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const events = [];
page.on("pageerror", (error) => events.push({ type: "pageerror", message: error.message }));
page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") events.push({ type: `console-${message.type()}`, message: message.text() });
});

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(() => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && document.querySelector("#avatar"), null, { timeout: 30000 });

const surface = await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
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
  };
});
if (!surface.dais || !surface.bounceApi || !surface.cometApi || !surface.paramsApi || !surface.environmentApi || !surface.bodyStateApi || !surface.poseApi || !surface.wakeIntake || !surface.lightIntake || !surface.worldRigGroup) {
  throw new Error(`PHYSICS_CAPTURE_SURFACE_FAILED ${JSON.stringify(surface)}`);
}

const telemetry = () => page.evaluate((label) => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const avatar = document.querySelector("#avatar");
  const worldRig = document.getElementById("worldRig");
  const pose = rig.getWorldPose?.() || null;
  const bodyState = d.getWorldBodyState?.() || null;
  const body = bodyState?.body || null;
  const envelope = bodyState?.envelope || null;
  const ds = avatar?.dataset || {};
  return {
    label,
    t: performance.now(),
      body: bodyState ? { mode: bodyState.mode, body, envelope, params: bodyState.params, fieldEpoch: bodyState.fieldEpoch, locomotionOwners: bodyState.locomotionOwners, gait: bodyState.gait, authority: bodyState.authority ?? null } : null,
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
}, "");

const samples = [];
async function sample(label) {
  const value = await page.evaluate((l) => {
    const d = globalThis.__GASPER_DAIS__;
    const rig = globalThis.SidekickFormMasterRig;
    const avatar = document.querySelector("#avatar");
    const worldRig = document.getElementById("worldRig");
    const pose = rig.getWorldPose?.() || null;
    const bodyState = d.getWorldBodyState?.() || null;
    const ds = avatar?.dataset || {};
    return {
      label: l,
      t: performance.now(),
      body: bodyState ? { mode: bodyState.mode, body: bodyState.body, envelope: bodyState.envelope, params: bodyState.params, fieldEpoch: bodyState.fieldEpoch, locomotionOwners: bodyState.locomotionOwners, gait: bodyState.gait, authority: bodyState.authority ?? null } : null,
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
  }, label);
  samples.push(value);
  return value;
}

async function capture(ms, label, intervalMs = 100) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await sample(label);
    await page.waitForTimeout(intervalMs);
  }
}

await page.waitForTimeout(1400);
await sample("baseline");

const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", (event) => {
  frames.push({ ts: event.metadata.timestamp, data: event.data });
  cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: 1280, maxHeight: 900, everyNthFrame: 1 });

await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.35 }));
await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldBounce({}));
await capture(7500, "bounce");
await capture(4500, "bounce-settle");

await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.2 }));
await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 1.4 }));
await capture(3000, "comet");
const fieldSwap = await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const before = d.getEnvironmentFieldEpoch?.() ?? -1;
  const startedAt = performance.now();
  const after = d.reportEnvironmentSize?.({
    viewportWidthPx: 1440,
    viewportHeightPx: 900,
    homeHeightPx: 153,
  }) ?? -1;
  return { before, after, startedAt };
});
await capture(2500, "field-swap");
await capture(4000, "comet-post-swap");
await capture(5000, "comet-settle");

await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPose({ x: 600, y: 300, z: 0, tilt: 0, provenance: "bogus-provenance" }));
const fence = await sample("provenance-fence");

await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 1.4 }));
await page.waitForTimeout(600);
await page.evaluate(() => globalThis.SidekickFormMasterRig.setLifeScale(0));
const collapseStartedAt = Date.now();
const collapseDeadline = collapseStartedAt + 3000;
let collapse = null;
const collapseIsValid = (value) => Boolean(
  value?.body?.mode &&
  value.body.mode !== "idle" &&
  value.target?.provenance === "physics-authority" &&
  Math.abs(value.applied?.x ?? 99) < 8 &&
  Math.abs(value.applied?.y ?? 99) < 8 &&
  (value.dataset?.wakeStretch ?? 99) < 0.02 &&
  (value.dataset?.motionLightFactor ?? 99) < 1.01,
);
do {
  await page.waitForTimeout(100);
  collapse = await sample("reduced-motion-collapse");
  if (collapseIsValid(collapse)) break;
} while (Date.now() < collapseDeadline);
const collapseWaitMs = Date.now() - collapseStartedAt;
await capture(900, "reduced-motion");
await page.evaluate(() => {
  globalThis.SidekickFormMasterRig.setLifeScale(1);
  globalThis.__GASPER_DAIS__.disarmWorldBody?.();
  globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });
});
await page.waitForTimeout(1200);
await sample("restored");

await cdp.send("Page.stopScreencast");
await page.waitForTimeout(250);
await browser.close();

const validFrames = frames.filter((frame) => Number.isFinite(frame.ts));
for (let i = 0; i < validFrames.length; i++) {
  writeFileSync(join(OUT, "frames", `frame-${String(i).padStart(6, "0")}.jpg`), Buffer.from(validFrames[i].data, "base64"));
}
const spanSec = validFrames.length > 1 ? validFrames.at(-1).ts - validFrames[0].ts : 0;
const measuredFps = spanSec > 0 ? (validFrames.length - 1) / spanSec : 0;
let concat = "ffconcat version 1.0\n";
for (let i = 0; i < validFrames.length; i++) {
  concat += `file 'frames/frame-${String(i).padStart(6, "0")}.jpg'\n`;
  if (i < validFrames.length - 1) concat += `duration ${Math.max(0.001, validFrames[i + 1].ts - validFrames[i].ts).toFixed(9)}\n`;
}
if (validFrames.length) concat += `file 'frames/frame-${String(validFrames.length - 1).padStart(6, "0")}.jpg'\n`;
writeFileSync(join(OUT, "frames.ffconcat"), concat);
const webm = join(OUT, "physics-high-refresh-60fps.webm");
execFileSync(FFMPEG, ["-nostdin", "-y", "-f", "concat", "-safe", "0", "-i", "frames.ffconcat", "-vf", "fps=60", "-c:v", "libvpx-vp9", "-b:v", "4000k", webm], { cwd: OUT, stdio: ["ignore", "ignore", "inherit"] });

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
const fieldSwapResponse = {
  beforeEpoch: fieldSwap.before,
  afterEpoch: fieldSwap.after,
  epochGrew: fieldSwap.after > fieldSwap.before,
  observedEpoch: firstFieldSwapObservation?.body?.fieldEpoch ?? -1,
  observedWithinOneSecond: fieldSwapLatencyMs <= 1000,
  latencyMs: Number.isFinite(fieldSwapLatencyMs) ? Math.round(fieldSwapLatencyMs * 100) / 100 : null,
};
const constructionSamples = physicsSamples.filter((s) => s.target?.provenance === "physics-authority");
const constructionLock = constructionSamples.length > 20 && constructionSamples.every((s) =>
  s.body?.authority?.packet === "GASPER-PHYSICS-AUTHORITY-001" &&
  s.body.authority.writer === "world-physics-driver" &&
  s.body.authority.emissionCount > 0 &&
  s.body.authority.bodyPoseMatchesOutput &&
  s.body.authority.provenance === "physics-authority"
);
const observationSamples = constructionSamples.filter((s) =>
  s.label !== "reduced-motion-collapse" && s.label !== "reduced-motion"
);
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
  surface,
  capture: { frameCount: validFrames.length, spanSec, measuredFps, format: "CDP Page.screencastFrame JPEG", quality: 85, viewport: { width: 1280, height: 900 }, reducedMotionProbe: "mid-comet gather/flight with live physics-authority target", collapseWaitMs },
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
    fieldSwapResponse,
    bounceRelease,
    cometRelease,
    fenceOk,
    collapseOk,
    cadenceAtLeast30: measuredFps >= 30,
  },
  events,
  webm,
  visualAcceptance: "PENDING_ARCHITECT_REVIEW",
  ownerAcceptance: "PENDING",
};
writeFileSync(join(OUT, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
writeFileSync(join(OUT, "surface.json"), JSON.stringify(surface, null, 2) + "\n");
console.log(JSON.stringify({ out: OUT, webm, frames: validFrames.length, measuredFps, proofs: receipt.proofs }, null, 2));
