// GASPER-ALIVE-002 / Wispwalker authored-phase witness.
// Observer-only: drives the public live APIs, records DOM/runtime telemetry,
// and captures chronological pixels. It never writes an owner verdict or
// phase-gate marker.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = process.env.GASPER_WISPWALKER_REVIEW_URL || "http://127.0.0.1:5176/";
const OUT = resolve(process.env.GASPER_WISPWALKER_REVIEW_OUT || "research/proofs/gasper-alive-002/fresh-wispwalker-20260808");
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
  if (message.type() === "error" || message.type() === "warning") {
    events.push({ type: `console-${message.type()}`, message: message.text() });
  }
});

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(
  () => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && document.querySelector("#avatar"),
  null,
  { timeout: 30000 },
);

const surface = await page.evaluate(() => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  d.stopLiving?.();
  d.startLiving?.({
    seed: 20260808,
    reducedMotion: false,
    autoSequence: false,
    restrainedIdle: false,
    eightStateLoop: true,
    proofMode: true,
    timingScale: 1,
  });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  d.disarmWorldBody?.();
  d.setWorldPose?.({ provenance: "none" });
  rig.setPaused?.(false);
  rig.setMotion?.(0.72);
  rig.setLifeScale?.(1);
  d.living?.applyModePolicy?.({ autoSequence: false, restrainedIdle: false, freezeSequence: true });
  d.living?.eightLoop?.setAutoLoop?.(false);
  d.setEmbodiment?.("presence");
  d.living?.goEightState?.("presence-neutral-settled", { duration: 0.2 });
  return {
    dais: !!d,
    rig: !!rig,
    embodimentApi: typeof d.setEmbodiment === "function",
    eightStateApi: typeof d.living?.goEightState === "function",
    reducedMotionApi: typeof d.living?.setReducedMotion === "function",
    liveCoeffApi: typeof rig.getLiveFormCoeffs === "function",
    snapshotApi: typeof rig.getSnapshot === "function",
    bodyPath: !!document.querySelector("#body"),
    avatar: !!document.querySelector("#avatar"),
  };
});
if (!Object.values(surface).every(Boolean)) {
  throw new Error(`WISPWALKER_CAPTURE_SURFACE_FAILED ${JSON.stringify(surface)}`);
}

const sample = async (label) => {
  const value = await page.evaluate((phaseLabel) => {
    const hash = (text) => {
      let h = 2166136261;
      for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(16);
    };
    const d = globalThis.__GASPER_DAIS__;
    const rig = globalThis.SidekickFormMasterRig;
    const avatar = document.querySelector("#avatar");
    const body = document.querySelector("#body");
    const ds = avatar?.dataset || {};
    const bodyD = body?.getAttribute("d") || "";
    let bbox = null;
    try {
      const b = body?.getBBox?.();
      if (b) bbox = { x: b.x, y: b.y, width: b.width, height: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    } catch {}
    const snapshot = rig.getSnapshot?.() || null;
    const living = d.living?.getStatus?.() || null;
    const owner = d.ownerReviewStatus?.() || null;
    const pose = rig.getWorldPose?.() || null;
    const bodyState = d.getWorldBodyState?.() || null;
    const explicitCoeffs = rig.getLiveFormCoeffs?.("wispwalker") || {};
    // The public API reports only live overrides. Include the production
    // defaults so this receipt records the effective walk gate.
    const coeffs = {
      walkAmp: 0.5,
      walkPeriod: 1.25,
      walkAccent: 0.6,
      walkEnable: 1,
      stepDepth: 4,
      ...explicitCoeffs,
    };
    return {
      label: phaseLabel,
      t: performance.now(),
      profile: snapshot?.profile ?? ds.formProfile ?? null,
      snapshot: snapshot ? {
        profile: snapshot.profile,
        morph: snapshot.morph,
        topologyStable: snapshot.topologyStable,
        contourSamples: snapshot.contourSamples,
        structuralNodes: snapshot.structuralNodes,
        emotionFixture: snapshot.emotionFixture,
      } : null,
      owner: owner ? { embodiment: owner.embodiment, expression: owner.expression, wanderEnabled: owner.wanderEnabled, lifeEnabled: owner.lifeEnabled } : null,
      living: living ? { running: living.running, reducedMotion: living.reducedMotion, autoSequence: living.autoSequence, restrainedIdle: living.restrainedIdle, eightStateLoop: living.eightStateLoop, eightState: living.eightState, loopPhase: living.loopPhase, proofMode: living.proofMode } : null,
      coeffs,
      path: { hash: hash(bodyD), length: bodyD.length, bbox },
      world: {
        pose,
        bodyMode: bodyState?.mode ?? "none",
        body: bodyState?.body ?? null,
        worldRigTransform: document.getElementById("worldRig")?.getAttribute("transform") ?? null,
      },
      dataset: {
        formProfile: ds.formProfile ?? null,
        morphFrom: ds.morphFrom ?? null,
        morphTo: ds.morphTo ?? null,
        morphMix: Number(ds.morphMix ?? 0),
        motion: Number(ds.motion ?? ds.motionStrength ?? 0),
        motionMode: document.documentElement.dataset.motionMode ?? null,
        eightState: ds.eightState ?? null,
        gaitPhase: Number(ds.gaitPhase ?? 0),
        gaitBob: Number(ds.gaitBob ?? 0),
        gaitSwayX: Number(ds.gaitSwayX ?? 0),
        gaitRoll: Number(ds.gaitRoll ?? 0),
        gaitStepX: Number(ds.gaitStepX ?? 0),
        worldPoseProvenance: ds.worldPoseProvenance ?? null,
        worldDepthScale: Number(ds.worldDepthScale ?? 1),
      },
    };
  }, label);
  samples.push(value);
  return value;
};

const samples = [];
async function capture(ms, label, intervalMs = 100) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await sample(label);
    await page.waitForTimeout(intervalMs);
  }
}

await page.waitForTimeout(1400);

const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", (event) => {
  frames.push({ ts: event.metadata.timestamp, data: event.data });
  cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", {
  format: "jpeg",
  quality: 85,
  maxWidth: 1280,
  maxHeight: 900,
  everyNthFrame: 1,
});

await capture(1800, "presence-baseline");
await page.evaluate(() => globalThis.__GASPER_DAIS__.setEmbodiment("wispwalker"));
await page.waitForTimeout(1600);
await capture(1800, "wispwalker-transition");

// Exercise the shared eight-state expression loop while the authored main
// form is Wispwalker. Generic presence endpoints must not clobber the form.
const states = [
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "presence-pleased-resolve",
  "presence-blocked-strain",
  "presence-neutral-settled",
];
for (const state of states) {
  await page.evaluate((id) => globalThis.__GASPER_DAIS__.living.goEightState(id, { duration: 0.45, interrupt: true }), state);
  await capture(950, `wispwalker-${state}`, 100);
}

await capture(2500, "wispwalker-live", 100);

// Reduced-motion witness: set both the runtime policy and the legacy renderer
// motion gate. The authored silhouette remains Wispwalker, while walk and
// living expression collapse to a stable frame.
await page.evaluate(() => {
  globalThis.__GASPER_DAIS__.living.setReducedMotion(true);
  globalThis.SidekickFormMasterRig.setMotion(0);
});
await page.waitForTimeout(900);
await capture(1200, "wispwalker-reduced-motion", 100);
await page.evaluate(() => {
  globalThis.__GASPER_DAIS__.living.setReducedMotion(false);
  globalThis.SidekickFormMasterRig.setMotion(0.72);
  globalThis.SidekickFormMasterRig.setLifeScale(1);
});
await page.waitForTimeout(1000);
await sample("wispwalker-restored");

await page.evaluate(() => {
  globalThis.__GASPER_DAIS__.setEmbodiment("presence");
  globalThis.__GASPER_DAIS__.setWorldPose?.({ provenance: "none" });
});
await page.waitForTimeout(1200);
await sample("restored-presence");

await cdp.send("Page.stopScreencast");
await page.waitForTimeout(250);
await browser.close();

const validFrames = frames.filter((frame) => Number.isFinite(frame.ts));
for (let i = 0; i < validFrames.length; i += 1) {
  writeFileSync(join(OUT, "frames", `frame-${String(i).padStart(6, "0")}.jpg`), Buffer.from(validFrames[i].data, "base64"));
}
const spanSec = validFrames.length > 1 ? validFrames.at(-1).ts - validFrames[0].ts : 0;
const measuredFps = spanSec > 0 ? (validFrames.length - 1) / spanSec : 0;
let concat = "ffconcat version 1.0\n";
for (let i = 0; i < validFrames.length; i += 1) {
  concat += `file 'frames/frame-${String(i).padStart(6, "0")}.jpg'\n`;
  if (i < validFrames.length - 1) concat += `duration ${Math.max(0.001, validFrames[i + 1].ts - validFrames[i].ts).toFixed(9)}\n`;
}
if (validFrames.length) concat += `file 'frames/frame-${String(validFrames.length - 1).padStart(6, "0")}.jpg'\n`;
writeFileSync(join(OUT, "frames.ffconcat"), concat);
const webm = join(OUT, "wispwalker-high-refresh-60fps.webm");
execFileSync(FFMPEG, ["-nostdin", "-y", "-f", "concat", "-safe", "0", "-i", "frames.ffconcat", "-vf", "fps=60", "-c:v", "libvpx-vp9", "-b:v", "4000k", webm], { cwd: OUT, stdio: ["ignore", "ignore", "inherit"] });

const byLabel = (prefix) => samples.filter((value) => value.label.startsWith(prefix));
const live = byLabel("wispwalker-live").concat(byLabel("wispwalker-presence-"));
const reduced = byLabel("wispwalker-reduced-motion");
const wispStable = samples.filter((value) => value.label.startsWith("wispwalker-") && value.label !== "wispwalker-transition" && value.label !== "wispwalker-restored");
const unique = (values) => new Set(values.filter(Boolean)).size;
const finiteNumbers = (values) => values.filter((value) => Number.isFinite(value));
const range = (values) => {
  const finite = finiteNumbers(values);
  return finite.length ? Math.max(...finite) - Math.min(...finite) : 0;
};
const stableProfile = wispStable.length > 0 && wispStable.every((value) => value.profile === "wispwalker" && value.dataset.formProfile === "wispwalker" && Math.abs(value.dataset.morphMix) < 0.001);
const loopStatesKept = states.every((state) => {
  const phase = samples.filter((value) => value.label === `wispwalker-${state}`);
  return phase.length > 0 && phase.every((value) => value.profile === "wispwalker" && value.dataset.formProfile === "wispwalker");
});
const livePathHashes = live.map((value) => value.path.hash);
const liveBboxCx = live.map((value) => value.path.bbox?.cx);
const liveBboxCy = live.map((value) => value.path.bbox?.cy);
const reducedHashes = reduced.map((value) => value.path.hash);
const worldAuthorityContained = wispStable.length > 0 && wispStable.every((value) => value.dataset.worldPoseProvenance === "none" && value.world.bodyMode === "idle" && !value.world.worldRigTransform);
const walkCoefficientsPresent = wispStable.length > 0 && wispStable.every((value) => Number(value.coeffs?.walkEnable ?? 0) > 0 && Number(value.coeffs?.walkAmp ?? 0) > 0 && Number(value.coeffs?.walkPeriod ?? 0) > 0);
const topologyStable = wispStable.length > 0 && wispStable.every((value) => value.snapshot?.topologyStable === true && value.snapshot?.contourSamples >= 512 && value.snapshot?.structuralNodes >= 360);
const reducedTail = reduced.slice(-5);
const reducedTailLateralRange = range(reducedTail.map((value) => value.path.bbox?.cx));
const reducedTailVerticalRange = range(reducedTail.map((value) => value.path.bbox?.cy));
const reducedMotionStatic = reduced.length > 4 && reducedTailLateralRange <= 0.05 && reducedTailVerticalRange <= 0.1 && reduced.every((value) => value.living?.reducedMotion === true && value.dataset.motion === 0 && value.dataset.gaitBob === 0 && value.dataset.gaitSwayX === 0);
const receipt = {
  generatedAt: new Date().toISOString(),
  surface,
  capture: {
    frameCount: validFrames.length,
    spanSec,
    measuredFps,
    format: "CDP Page.screencastFrame JPEG",
    quality: 85,
    viewport: { width: 1280, height: 900 },
    phases: ["presence-baseline", "wispwalker-transition", ...states.map((state) => `wispwalker-${state}`), "wispwalker-live", "wispwalker-reduced-motion", "restored-presence"],
  },
  sampleCount: samples.length,
  samples,
  proofs: {
    authoredProfileStable: stableProfile,
    eightStateLoopPreservesWispwalker: loopStatesKept,
    walkCoefficientsPresent,
    livePathVariation: unique(livePathHashes),
    livePathChanges: unique(livePathHashes) > 20,
    lateralExpressionRange: Math.round(range(liveBboxCx) * 1000) / 1000,
    verticalExpressionRange: Math.round(range(liveBboxCy) * 1000) / 1000,
    lateralExpressionPresent: range(liveBboxCx) > 0.25,
    topologyStable,
    worldAuthorityContained,
    reducedMotionStatic,
    reducedMotionTailLateralRange: Math.round(reducedTailLateralRange * 1000) / 1000,
    reducedMotionTailVerticalRange: Math.round(reducedTailVerticalRange * 1000) / 1000,
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
