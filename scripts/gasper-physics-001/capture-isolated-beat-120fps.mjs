// Focused GASPER physics proof loop.
//
// This is intentionally shorter than the North Star end-to-end capture: one
// authored beat, one fixed-step recording, one visual question. It writes a
// fresh receipt and never writes a phase-gate marker.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  directionReversalCount,
  sustainedDirectionReversalCount,
  northstarHandoffMetric,
  projectionResidual,
  screenProjectionResidual,
  windResistanceMetric,
  wispwalkerGaitMotionMetric,
  wispwalkerFootReadabilityMetric,
  wispwalkerSupportCarrierMetric,
  completeContourBottomY,
  contourCompletenessMetric,
  gaitSupportLiveMetric,
  summarizeLowerContour,
} from "./proof-metrics.mjs";

const SCENARIO = process.env.GASPER_ISOLATED_BEAT || process.argv[2] || "bounce-impact";
const RECIPES = Object.freeze({
  "bounce-impact": Object.freeze({
    activeLabel: "bounce-impact",
    preRollSeconds: 0.75,
    activeSeconds: 2.5,
  }),
  "comet-flight": Object.freeze({
    activeLabel: "comet-flight",
    preRollSeconds: 0.75,
    activeSeconds: 2.5,
  }),
  "boo-flight": Object.freeze({
    activeLabel: "boo-flight",
    preRollSeconds: 0.75,
    activeSeconds: 2.5,
  }),
  "boo-flight-exit": Object.freeze({
    activeLabel: "boo-flight-exit",
    // Keep the same launch/hold beat, but leave enough deterministic tail to
    // observe retiring complete instead of stopping on the first retirement
    // frames. This is a proof recipe only; it does not alter the physics law.
    preRollSeconds: 0.75,
    activeSeconds: 4.5,
  }),
  "northstar-demo": Object.freeze({
    activeLabel: "northstar-demo",
    visualSettleSeconds: 1.0,
    preRollSeconds: 0.25,
    // N42: equal halves Ã¢â‚¬â€ authored Wispwalker first, then the Boo ghost-flight.
    activeSeconds: 10,
  }),
  "cinematic-arc": Object.freeze({
    activeLabel: "cinematic-arc",
    captureView: "surface",
    livePhysicsSurface: true,
    cinematicCamera: true,
    visualSettleSeconds: 1.0,
    preRollSeconds: 0.25,
    activeSeconds: 20,
  }),
  "wispwalker-walk": Object.freeze({
    activeLabel: "wispwalker-walk",
    // Walk proofs must keep a static camera. subject-close recenters a 640
    // crop on #body every frame and erases world x travel from the picture.
    captureView: "surface",
    livePhysicsSurface: true,
    cinematicCamera: true,
    // Golden wander owns a Ãâ€ Ã‚Â² resume hold plus a Ãâ€ Ã¢ÂÂ»Ã‚Â¹ intent telegraph. Keep
    // the clip short, but long enough to show establish Ã¢â€ â€™ steady Ã¢â€ â€™ arrive.
    // The contour is viscoelastic: give the newly selected Wispwalker one full
    // second of fixed-step convergence before any active sample can count.
    visualSettleSeconds: 1.0,
    preRollSeconds: 0.25,
    activeSeconds: 7.5,
  }),
  "presence-float": Object.freeze({
    activeLabel: "presence-float",
    preRollSeconds: 0.25,
    activeSeconds: 7.5,
  }),
  "wispwalker-stride": Object.freeze({
    activeLabel: "wispwalker-stride",
    visualSettleSeconds: 1.0,
    preRollSeconds: 0.25,
    activeSeconds: 4.5,
  }),
  "wispwalker-reversal": Object.freeze({
    activeLabel: "wispwalker-reversal",
    // A deliberately mid-stride direction change exercises the N119
    // grounded traction blend; it is a physics witness, not a product path.
    visualSettleSeconds: 1.0,
    preRollSeconds: 0.25,
    activeSeconds: 3.0,
  }),
  "wispwalker-showcase": Object.freeze({
    activeLabel: "wispwalker-showcase",
    // Five short, bounded legs keep the walker large enough to inspect while
    // proving travel, braking, reversal, and the authored foot-root gait.
    visualSettleSeconds: 1.0,
    preRollSeconds: 0.25,
    activeSeconds: 5,
  }),
  "presence-wind-reversal": Object.freeze({
    activeLabel: "presence-wind-reversal",
    // R5: +x cruise then -x cruise so both pressure-delta signs exist.
    // JSON-only (GASPER_CAPTURE_JSON_ONLY=1) — no 120fps frame dumps.
    preRollSeconds: 0.25,
    activeSeconds: 3.2,
  }),
  "presence-showcase": Object.freeze({
    activeLabel: "presence-showcase",
    // The same bounded path proves that Presence floats through the field and
    // never falls back to the grounded gait vocabulary.
    preRollSeconds: 0.25,
    activeSeconds: 5,
  }),
  "manual-yaw-face": Object.freeze({
    activeLabel: "manual-yaw-face",
    preRollSeconds: 0.25,
    activeSeconds: 1.5,
  }),
  "three-quarter-face": Object.freeze({
    activeLabel: "three-quarter-face",
    // Product-facing proof: the authored 2.5D cone, not the full-turn stress
    // test. Keep the subject near and hold the heading long enough to inspect
    // the face/shell relationship without mixing in travel or morph motion.
    preRollSeconds: 0.25,
    activeSeconds: 1.75,
  }),
  "field-swap": Object.freeze({
    activeLabel: "field-swap",
    preRollSeconds: 0.5,
    activeSeconds: 2.5,
  }),
});
const recipeBase = RECIPES[SCENARIO];
if (!recipeBase) throw new Error(`Unknown isolated beat: ${SCENARIO}`);
const ACTIVE_SECONDS = Number(process.env.GASPER_ACTIVE_SECONDS);
const recipe = Number.isFinite(ACTIVE_SECONDS) && ACTIVE_SECONDS > 0
  ? { ...recipeBase, activeSeconds: ACTIVE_SECONDS }
  : recipeBase;

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
// The canonical local product surface is the 5179 Gasper Studio preview.
// Keep the URL override for isolated fixtures, but never silently fall back
// to the retired 5176 lane when a fresh proof is requested.
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://127.0.0.1:5179/";
const OUT = resolve(process.env.GASPER_ISOLATED_OUT || `research/proofs/gasper-physics-001/isolated-${SCENARIO}-120fps`);
const JSON_ONLY = process.env.GASPER_CAPTURE_JSON_ONLY === "1" || SCENARIO === "presence-wind-reversal";
const FFMPEG = process.env.GASPER_FFMPEG || "ffmpeg";
const FFPROBE = process.env.GASPER_FFPROBE || "ffprobe";
const PHI = 1.618033988749895;
const WALK_BAND_CRUISE = 0.75 * 1224 * PHI;
const FPS = Math.max(60, Math.min(120, Number(process.env.GASPER_FPS) || 120));

const STEP_MS = 1000 / FPS;
// Presence's authored radial contour is centered on the fixed 120px local
// frame. Do not derive this from the live bbox: wind deliberately moves the
// left/right extrema in opposite directions, so a bbox midpoint erases the
// signal we are trying to prove.
const CONTOUR_CENTER_X = 120;
const VIEWPORT = { width: 1280, height: 900 };
const CAPTURE_VIEW = recipeBase.captureView || process.env.GASPER_CAPTURE_VIEW || "surface";
// Optional N120 intent lease. When supplied, the capture applies the request
// through the live browser-owned Tuning Lab before taking any deterministic
// frames, so the video receipt and tuning receipt answer the same question.
const TUNING_INTENT = process.env.GASPER_TUNING_INTENT?.trim() || null;
// Optional N120 direct patch. This keeps deterministic captures reviewable
// when a candidate needs a few knob edits after a plain-language intent.
// Shape: JSON object keyed by typed Tuning Lab parameter ids.
const TUNING_PATCH = process.env.GASPER_TUNING_PATCH?.trim() || null;
const SUBJECT_CLOSE_SIZE = Math.max(320, Math.min(760, Number(process.env.GASPER_SUBJECT_CLOSE_SIZE) || 640));
const SUBJECT_CLOSE_TOP_SAFE_PX = Math.max(0, Math.min(180, Number(process.env.GASPER_SUBJECT_CLOSE_TOP_SAFE_PX) || 72));
// The standalone preview intentionally runs without AgentBridge. Intercepting
// optional bridge token probes is available only as an explicit legacy/fixture
// mode; live proof captures must leave it disabled so runtime regressions stay
// visible.
const OFFLINE_BRIDGE_STUB = process.env.GASPER_CAPTURE_OFFLINE_BRIDGE === "1";
if (!['surface', 'subject-close'].includes(CAPTURE_VIEW)) {
  throw new Error(`ISOLATED_120_UNKNOWN_CAPTURE_VIEW ${CAPTURE_VIEW}`);
}

if (existsSync(join(OUT, "receipt.json"))) {
  throw new Error(`Refusing to overwrite an existing capture: ${OUT}`);
}
if (JSON_ONLY) mkdirSync(OUT, { recursive: true });
else mkdirSync(join(OUT, "frames"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: EXEC,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
if (OFFLINE_BRIDGE_STUB) {
  const offlineBridgeResponse = (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, offline: true }),
  });
  await page.route("http://127.0.0.1:19528/v1/studio-bridge/**", offlineBridgeResponse);
  await page.route("http://127.0.0.1:19529/v1/studio-bridge/**", offlineBridgeResponse);
  await page.route("**/favicon.ico", (route) => route.fulfill({ status: 204, body: "" }));
}
const events = [];
page.on("pageerror", (error) => events.push({ type: "pageerror", message: error.message }));
page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    events.push({ type: `console-${message.type()}`, message: message.text() });
  }
});

const viteSockets = [];
page.on("websocket", (ws) => {
  if (/127\.0\.0\.1:5179|localhost:5179/.test(ws.url())) viteSockets.push(ws);
});
// Patch reload BEFORE Vite's client binds it. Sibling saves on 5179 otherwise
// navigate the proof page and destroy the Playwright execution context.
await page.addInitScript(() => {
  try {
    Object.defineProperty(Location.prototype, "reload", {
      configurable: true,
      writable: true,
      value() {},
    });
  } catch { /* best-effort */ }
  try {
    Location.prototype.assign = function assign() {};
    Location.prototype.replace = function replace() {};
  } catch { /* best-effort */ }
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
// 5179 Vite HMR must not navigate the proof page. Sibling file-saves
// otherwise destroy the execution context mid-take.
await page.evaluate(() => {
  try {
    Object.defineProperty(Location.prototype, "reload", {
      configurable: true,
      writable: true,
      value() {},
    });
  } catch { /* best-effort */ }
});
await page.waitForFunction(
  () => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && globalThis.__GASPER_ORGANISM_CLOCK__ && document.querySelector("#avatar"),
  { timeout: 30000 },
);
// The mounted React/living controller performs an asynchronous first-run
// showcase load after the globals appear. Do not begin the proof setup until
// that bootstrap has declared itself complete; otherwise a direct controller
// write can be truthfully reported by telemetry and still be replaced by the
// mounted Presence selection a few frames later. A fixed sleep is not a valid
// authority fence because the document fetch/layout path is timing-sensitive.
await page.waitForFunction(() => {
  const note = document.querySelector('[data-testid="showcase-note"]')?.textContent ?? "";
  return /Showcase loaded|Showcase pack not served|Live physics surface/.test(note);
}, { timeout: 30000 });
// loadShowcaseDocument schedules three bounded recovery checks at 120, 400,
// and 1000ms after it reports success. Let that product-owned recovery window
// close before taking the proof lease; otherwise the final check can restart
// eight-state living after our deterministic reset.
await page.waitForTimeout(1250);
for (const ws of viteSockets) {
  try { ws.close(); } catch { /* already closed */ }
}

let tuningLabReceipt = null;
if (TUNING_INTENT || TUNING_PATCH) {
  await page.waitForFunction(
    () => Boolean(globalThis.__GASPER_TUNING_LAB__),
    { timeout: 30000 },
  );
  tuningLabReceipt = await page.evaluate(({ intent, patchText }) => {
    const lab = globalThis.__GASPER_TUNING_LAB__;
    if (!lab) throw new Error("ISOLATED_120_TUNING_LAB_UNAVAILABLE");
    let applied = null;
    if (intent) {
      applied = lab.applyIntent(intent);
      if (!applied?.ok) {
        throw new Error(`ISOLATED_120_TUNING_INTENT_REJECTED ${applied?.error || "unknown"}`);
      }
    }
    let patch = null;
    const patchResults = [];
    if (patchText) {
      try {
        patch = JSON.parse(patchText);
      } catch (error) {
        throw new Error(`ISOLATED_120_TUNING_PATCH_INVALID_JSON ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
        throw new Error("ISOLATED_120_TUNING_PATCH_INVALID_SHAPE");
      }
      const known = new Set(Object.keys(lab.snapshot().state));
      for (const [id, value] of Object.entries(patch)) {
        if (!known.has(id)) throw new Error(`ISOLATED_120_TUNING_PATCH_UNKNOWN_PARAMETER ${id}`);
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`ISOLATED_120_TUNING_PATCH_INVALID_VALUE ${id}`);
        }
        const result = lab.set(id, value);
        if (!result?.ok) {
          throw new Error(`ISOLATED_120_TUNING_PATCH_REJECTED ${id} ${result?.error || "unknown"}`);
        }
        patchResults.push({ id, requested: value, applied: result.value ?? null, ok: true });
      }
    }
    const snapshot = lab.snapshot();
    return {
      source: intent ?? null,
      ok: true,
      plan: applied?.plan ?? null,
      patch,
      patchResults,
      snapshot,
    };
  }, { intent: TUNING_INTENT, patchText: TUNING_PATCH });
}

const surface = await page.evaluate(async ({ stepMs, scenario }) => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  const walker = scenario === "wispwalker-walk" || scenario === "wispwalker-stride" || scenario === "wispwalker-reversal" || scenario === "wispwalker-showcase" || scenario === "northstar-demo" || scenario === "cinematic-arc";
  const expectedEmbodiment = walker ? "wispwalker" : "presence";
  const floatWander = scenario === "presence-float";
  const wander = scenario === "wispwalker-walk" || floatWander;
  const liveWalk = scenario === "wispwalker-walk" || scenario === "cinematic-arc";
  let liveDocument = null;
  if (liveWalk) {
    const workflow = globalThis.__GASPER_FILE_WORKFLOW__;
    if (typeof workflow?.newLiveDocument !== "function") {
      throw new Error("ISOLATED_120_LIVE_DOCUMENT_API_MISSING");
    }
    liveDocument = await workflow.newLiveDocument({
      id: "gasper-live-wispwalker-walk",
      embodiment: "wispwalker",
    });
    if (!liveDocument?.ok) {
      throw new Error(`ISOLATED_120_LIVE_DOCUMENT_FAILED ${JSON.stringify(liveDocument)}`);
    }
    if (liveDocument.activeClipId) {
      throw new Error(`ISOLATED_120_CLIP_STILL_LOADED ${liveDocument.activeClipId}`);
    }
    const note = document.querySelector('[data-testid="showcase-note"]');
    if (note) note.textContent = "Live physics surface · no clip · wander armed";
  }
  d.stopLiving?.();
  const embodimentButton = document.querySelector(`[data-testid="dais-rail-embodiment-${expectedEmbodiment}"]`);
  embodimentButton?.click();
  d.startLiving?.({ seed: 20260808, autoSequence: false, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  if (scenario !== "cinematic-arc") d.disarmWorldBody?.();
  rig.setPaused?.(false);
  d.living?.applyModePolicy?.({ autoSequence: false, restrainedIdle: false, freezeSequence: true });
  d.living?.eightLoop?.setAutoLoop?.(false);
  // Do not start a wall-clock GSAP endpoint transition here. Its completion
  // callback can overwrite the authored locomotion embodiment while the proof
  // clock is already deterministic. The capture owns the last profile write.
  if (typeof d.setEmbodiment !== "function" || typeof rig.setProfile !== "function") {
    throw new Error("ISOLATED_120_EMBODIMENT_API_MISSING");
  }
  d.setEmbodiment(expectedEmbodiment);
  rig.setProfile(expectedEmbodiment);
  d.setWanderEnabled?.(wander);
  d.setWorldPhysicsParams?.({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });
  clock.stop();
  clock.reset({ seed: 20260808, timeMs: 0 });
  clock.setFixedStepMs(stepMs);
  clock.setMode("deterministic");
  clock.clearFault?.();
  const result = {
    bounceApi: typeof d.launchWorldBounce === "function",
    cometApi: typeof d.launchWorldComet === "function",
    bodyStateApi: typeof d.getWorldBodyState === "function",
    poseApi: typeof rig.getWorldPose === "function",
    controlledLocomotionApi: typeof d.ensurePhysicsDriver === "function" && typeof d.ensurePhysicsDriver?.()?.setLocomotion === "function",
    fieldApi: typeof d.reportEnvironmentSize === "function" && typeof d.getEnvironmentFieldEpoch === "function",
    embodimentApi: typeof d.setEmbodiment === "function" && typeof rig.setProfile === "function",
    embodimentButton: Boolean(embodimentButton),
    expectedEmbodiment,
    embodiment: rig.getSnapshot?.().profile ?? null,
    renderedFormProfile: document.querySelector("#avatar")?.dataset.formProfile ?? null,
    uiEmbodiment: [...document.querySelectorAll('[data-control-id="embodiment-select"]')]
      .find((element) => element.getAttribute("data-active") === "1")?.textContent?.trim() ?? null,
    wanderState: d.getWanderState?.() ?? null,
    clock: clock.inspect(),
    liveDocument,
    camera: null,
    chrome: null,
  };
  if (liveWalk) {
    const vp = d.getViewport?.();
    if (!vp || typeof vp.holdUserWorldFrame !== "function") {
      throw new Error("ISOLATED_120_VIEWPORT_API_MISSING");
    }
    vp.setAutoFit?.(false);
    d.setCompositionWorldEnvelope?.(null);
    // Hold once AFTER remount/fence. An early hold dies with newLiveDocument.
    const vpState = vp.getState?.() ?? null;
    const clipSelect = document.querySelector('[data-testid="gwc-clip-select"]');
    result.camera = {
      autoFit: vpState?.autoFit ?? null,
      zoom: vpState?.zoom ?? null,
      zoomPercent: vpState?.zoom == null ? null : Math.round(vpState.zoom * 100),
      performanceCameraLocked: vpState?.performanceCameraLocked ?? null,
      worldScale100: typeof vp.isWorldScale100 === "function" ? vp.isWorldScale100() : null,
    };
    result.chrome = {
      clipSelect: clipSelect?.selectedOptions?.[0]?.textContent?.trim() ?? clipSelect?.value ?? null,
      clipSelectValue: clipSelect?.value ?? null,
      showcaseNote: document.querySelector('[data-testid="showcase-note"]')?.textContent ?? null,
      zoomReadout: document.querySelector('[data-testid="zoom-readout"]')?.textContent?.trim() ?? null,
      autoFitActive: document.querySelector('[data-testid="dais-auto-fit"]')?.classList.contains("active") ?? null,
      statusMsg: document.querySelector('[data-testid="gwc-status-msg"]')?.textContent?.trim() ?? null,
    };
  }
  return result;
}, { stepMs: STEP_MS, scenario: SCENARIO });

surface.tuningLab = tuningLabReceipt;

if (!surface.bounceApi || !surface.cometApi || !surface.bodyStateApi || !surface.poseApi || surface.clock?.mode !== "deterministic") {
  throw new Error(`ISOLATED_120_SURFACE_FAILED ${JSON.stringify(surface)}`);
}
if (SCENARIO === "field-swap" && !surface.fieldApi) {
  throw new Error(`ISOLATED_120_FIELD_SURFACE_FAILED ${JSON.stringify(surface)}`);
}

// Reassert the proof runtime after the mount fence. Keep the visible selection
// and both production authorities on the same profile; a direct setter alone is
// not a valid visual witness because it can leave the rail on Presence.
const expectedEmbodiment = surface.expectedEmbodiment;
let cinematicShot = null;
let captureExpectedEmbodiment = expectedEmbodiment;
// Reassert the proof runtime after that reconciliation. Without this second
// fence, a long frame-by-frame capture can inherit the mounted default living
// policy; wander scenarios then depend on an asynchronous lifecycle decision
// instead of the requested fixed-step authority.
await page.evaluate(async ({ stepMs, scenario, expectedEmbodiment: expected }) => {
  const d = globalThis.__GASPER_DAIS__;
  const rig = globalThis.SidekickFormMasterRig;
  const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
  const walker = scenario === "wispwalker-walk" || scenario === "wispwalker-stride" || scenario === "wispwalker-reversal" || scenario === "wispwalker-showcase" || scenario === "northstar-demo" || scenario === "cinematic-arc";
  const wander = scenario === "wispwalker-walk" || scenario === "presence-float";
  const liveWalk = scenario === "wispwalker-walk" || scenario === "cinematic-arc";
  if (liveWalk) {
    const workflow = globalThis.__GASPER_FILE_WORKFLOW__;
    const liveDocument = await workflow?.newLiveDocument?.({
      id: "gasper-live-wispwalker-walk",
      embodiment: "wispwalker",
    });
    if (!liveDocument?.ok || liveDocument.activeClipId) {
      throw new Error(`ISOLATED_120_LIVE_DOCUMENT_REASSERT_FAILED ${JSON.stringify(liveDocument)}`);
    }
    const note = document.querySelector('[data-testid="showcase-note"]');
    if (note) note.textContent = "Live physics surface · no clip · wander armed";
  }
  d.stopLiving?.();
  document.querySelector(`[data-testid="dais-rail-embodiment-${expected}"]`)?.click();
  d.startLiving?.({ seed: 20260808, autoSequence: wander, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
  d.setWanderEnabled?.(false);
  d.setLifeEnabled?.(false);
  d.ensurePhysicsDriver?.();
  if (scenario !== "cinematic-arc") d.disarmWorldBody?.();
  rig.setPaused?.(false);
  d.living?.applyModePolicy?.({ autoSequence: wander, restrainedIdle: false, freezeSequence: true });
  d.living?.eightLoop?.setAutoLoop?.(false);
  d.setEmbodiment?.(expected);
  rig.setProfile?.(expected);
  d.setWanderEnabled?.(wander);
  d.setWorldPhysicsParams?.({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });
  clock.stop();
  clock.reset({ seed: 20260808, timeMs: 0 });
  clock.setFixedStepMs(stepMs);
  clock.setMode("deterministic");
  clock.clearFault?.();
  // Camera already held once at start. No reassert rehold.
}, { stepMs: STEP_MS, scenario: SCENARIO, expectedEmbodiment });
await page.evaluate((expected) => {
  globalThis.__GASPER_DAIS__.setEmbodiment?.(expected);
  globalThis.SidekickFormMasterRig?.setProfile?.(expected);
  globalThis.SidekickFormMasterRig?.requestOneFrame?.();
}, expectedEmbodiment);

async function readEmbodimentFence(expected) {
  return page.evaluate((expectedProfile) => {
    const avatar = document.querySelector("#avatar");
    const snapshot = globalThis.SidekickFormMasterRig?.getSnapshot?.() ?? null;
    const activeUi = [...document.querySelectorAll('[data-control-id="embodiment-select"]')]
      .find((element) => element.getAttribute("data-active") === "1")?.textContent?.trim() ?? null;
    const formProfile = avatar?.dataset?.formProfile ?? null;
    const morphFrom = avatar?.dataset?.morphFrom ?? null;
    const morphTo = avatar?.dataset?.morphTo ?? null;
    const morphing = Boolean(snapshot?.morph && snapshot.morph.from !== snapshot.morph.to);
    const ok = snapshot?.profile === expectedProfile &&
      formProfile === expectedProfile &&
      !morphing &&
      activeUi === expectedProfile;
    return {
      ok,
      expected: expectedProfile,
      controllerProfile: snapshot?.profile ?? null,
      formProfile,
      morphFrom,
      morphTo,
      activeUi,
    };
  }, expected);
}

let embodimentFence = null;
for (let attempt = 0; attempt < 240; attempt += 1) {
  embodimentFence = await readEmbodimentFence(expectedEmbodiment);
  if (embodimentFence.ok) break;
  await page.evaluate((stepMs) => {
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    if (clock?.getMode?.() === "deterministic") clock.step(stepMs);
    else globalThis.SidekickFormMasterRig?.requestOneFrame?.();
  }, STEP_MS);
}
if (!embodimentFence?.ok) {
  throw new Error(`ISOLATED_120_RENDERED_EMBODIMENT_UNSTABLE ${JSON.stringify(embodimentFence)}`);
}

if (SCENARIO === "wispwalker-walk" || SCENARIO === "cinematic-arc") {
  // ONE holdUserWorldFrame at start of the take (after remount). Film the
  // live translating worldRig inside gasper-dais. No later hold / relock.
  const liveWalkChrome = await page.evaluate((scenario) => {
    const d = globalThis.__GASPER_DAIS__;
    const vp = d.getViewport?.();
    if (!vp || typeof vp.applyFitCamera !== "function" || typeof vp.holdUserWorldFrame !== "function") {
      throw new Error("ISOLATED_120_VIEWPORT_API_MISSING");
    }
    vp.releaseUserWorldFrame?.();
    vp.setAutoFit?.(false);
    d.setCompositionWorldEnvelope?.(null);
    const bodyEl = document.querySelector("#body");
    const stage = document.querySelector('[data-testid="gasper-dais"]');
    if (!document.getElementById("worldRig") || !stage) {
      throw new Error("ISOLATED_120_LIVE_WORLDRIG_MISSING");
    }
    vp.applyFitCamera(1, 0, 0, 100);
    if (scenario === "cinematic-arc") {
      const box = bodyEl?.getBoundingClientRect?.();
      const stageBox = stage.getBoundingClientRect();
      const startCX = box ? box.x + box.width / 2 : stageBox.x + stageBox.width / 3;
      const leftAnchor = stageBox.x + stageBox.width / 3;
      vp.panBy(leftAnchor - startCX, 0);
    }
    const composed = vp.getState?.() ?? {};
    vp.holdUserWorldFrame({ zoom: 1, panX: composed.panX ?? 0, panY: composed.panY ?? 0 });
    const st = vp.getState?.() ?? {};
    const clipSelect = document.querySelector('[data-testid="gwc-clip-select"]');
    const box2 = bodyEl?.getBoundingClientRect?.();
    const cx = box2 ? box2.x + box2.width / 2 : 320;
    const floor = d.ensurePhysicsDriver?.().floorPose?.() ?? { x: 0, z: 48 };
    const pxPerWorld = 0.11 * (st.zoom || 1);
    const startX = Number.isFinite(floor.x) ? floor.x : 0;
    const firstTargetX = 820;
    return {
      camera: {
        autoFit: st.autoFit ?? null,
        zoom: st.zoom ?? null,
        zoomPercent: st.zoom == null ? null : Math.round(st.zoom * 100),
        panX: st.panX ?? null,
        panY: st.panY ?? null,
        performanceCameraLocked: st.performanceCameraLocked ?? null,
        cinematicLocked: st.cinematicLocked ?? null,
        userWorldFrameHeld: st.userWorldFrameHeld ?? null,
        userCameraOwned: st.userCameraOwned ?? null,
        worldScale100: typeof vp.isWorldScale100 === "function" ? vp.isWorldScale100() : null,
      },
      chrome: {
        clipSelect: clipSelect?.selectedOptions?.[0]?.textContent?.trim() ?? clipSelect?.value ?? null,
        clipSelectValue: clipSelect?.value ?? null,
        showcaseNote: document.querySelector('[data-testid="showcase-note"]')?.textContent ?? null,
        zoomReadout: document.querySelector('[data-testid="zoom-readout"]')?.textContent?.trim() ?? null,
        autoFitActive: document.querySelector('[data-testid="dais-auto-fit"]')?.classList.contains("active") ?? null,
        statusMsg: document.querySelector('[data-testid="gwc-status-msg"]')?.textContent?.trim() ?? null,
      },
      startCX: cx,
      startWorldX: startX,
      firstTargetX,
      pxPerWorld,
      expectedScreenTravel: (firstTargetX - startX) * pxPerWorld,
    };
  }, SCENARIO);
  surface.camera = liveWalkChrome.camera;
  surface.chrome = liveWalkChrome.chrome;
  if (liveWalkChrome.chrome.clipSelectValue === "clip-presence-living-idle" ||
      /living.?idle|Presence/i.test(liveWalkChrome.chrome.clipSelect ?? "")) {
    throw new Error(`ISOLATED_120_SHOWCASE_CLIP_STILL_VISIBLE ${JSON.stringify(liveWalkChrome.chrome)}`);
  }
  if (Math.abs((liveWalkChrome.camera.zoom ?? 0) - (PHI * PHI)) < 0.05) {
    throw new Error(`ISOLATED_120_CAMERA_NOT_MEDIUM_SHOT ${JSON.stringify(liveWalkChrome.camera)}`);
  }
  if (liveWalkChrome.camera.autoFit !== false || liveWalkChrome.camera.userCameraOwned !== true || liveWalkChrome.camera.userWorldFrameHeld !== true || Math.abs((liveWalkChrome.camera.zoom ?? 0) - 1) > 0.05 || liveWalkChrome.chrome.autoFitActive !== false) {
    throw new Error(`ISOLATED_120_CAMERA_NOT_LOCKED_100 ${JSON.stringify({ camera: liveWalkChrome.camera, chrome: liveWalkChrome.chrome })}`);
  }
  if (SCENARIO === "cinematic-arc") {
    cinematicShot = liveWalkChrome;
    surface.shot = {
      startCX: liveWalkChrome.startCX,
      startWorldX: liveWalkChrome.startWorldX,
      firstTargetX: liveWalkChrome.firstTargetX,
      pxPerWorld: liveWalkChrome.pxPerWorld,
      expectedScreenTravel: liveWalkChrome.expectedScreenTravel,
      zoom: liveWalkChrome.camera.zoom,
      panX: liveWalkChrome.camera.panX,
      panY: liveWalkChrome.camera.panY,
    };
  }
}

// The first `surface` packet is captured before the mounted UI's final
// embodiment-fence reconciliation. Promote the fenced values into the
// receipt so the proof describes the state that actually enters the fixed-step
// capture, while retaining the pre-fence values for audit/debugging.
surface.initialEmbodiment = surface.embodiment;
surface.initialRenderedFormProfile = surface.renderedFormProfile;
surface.initialUiEmbodiment = surface.uiEmbodiment;
surface.embodiment = embodimentFence.controllerProfile;
surface.renderedFormProfile = embodimentFence.formProfile;
surface.uiEmbodiment = embodimentFence.activeUi;
surface.finalEmbodimentFence = embodimentFence;

const frames = [];
const samples = [];
const hashes = [];
let fieldSwap = null;

if (CAPTURE_VIEW === "subject-close" || SCENARIO === "cinematic-arc") {
  // Presentation evidence must contain the render, not the surrounding
  // Studio chrome. Preserve layout so hiding the chrome cannot move the
  // subject or change the camera used by the machine witness.
  await page.addStyleTag({
    content: `
      .gwc-app-bar,
      .gwc-ctx-bar,
      .gwc-stage-chrome,
      .gwc-status,
      .dais-transport-bar,
      .gasper-hud,
      .gasper-view-controls,
      .dais-control-rail,
      .viewport-chrome,
      .viewport-chrome-overlay,
      .compare-result-overlay {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `,
  });
}

let stageClip = null;
if (SCENARIO === "cinematic-arc") {
  // ONE fixed dais crop. Film the live worldRig. Never follow #body.
  stageClip = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="gasper-dais"]');
    const r = el?.getBoundingClientRect?.();
    if (!r || !Number.isFinite(r.width) || r.width < 32) return null;
    return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
  });
  if (!stageClip) throw new Error("ISOLATED_120_DAIS_CLIP_MISSING");
}

async function captureFrame(label) {
  const clockFrame = await page.evaluate((stepMs) => {
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    if (!clock || clock.getMode() !== "deterministic") throw new Error("GASPER_CLOCK_NOT_DETERMINISTIC");
    const stepped = clock.step(stepMs);
    // N246: flush FormMaster after the physics subscriber so dataset/lobe
    // telemetry cannot lag a frozen first-beat paint.
    globalThis.SidekickFormMasterRig?.requestOneFrame?.();
    return stepped;
  }, STEP_MS);
  if (clockFrame.mode !== "deterministic" || Math.abs(clockFrame.deltaMs - STEP_MS) > 1e-9) {
    throw new Error(`GASPER_CLOCK_STEP_FAILED ${JSON.stringify(clockFrame)}`);
  }
  const captureClip = SCENARIO === "cinematic-arc"
    ? stageClip
    : CAPTURE_VIEW === "subject-close"
    ? await page.evaluate(({ size, topSafe }) => {
      const rect = document.querySelector("#body")?.getBoundingClientRect?.();
      if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y)) return null;
      const width = Math.min(size, window.innerWidth);
      const height = Math.min(size, window.innerHeight);
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const x = Math.max(0, Math.min(window.innerWidth - width, centerX - width / 2));
      // Keep the app chrome out of presentation crops. The subject is usually
      // small enough that shifting the clip below the status strip preserves
      // the whole body while making the returned sequence render-only.
      const y = Math.max(topSafe, Math.min(window.innerHeight - height, centerY - height / 2));
      return { x, y, width, height, scale: 1 };
    }, { size: SUBJECT_CLOSE_SIZE, topSafe: SUBJECT_CLOSE_TOP_SAFE_PX })
    : null;
  const captureIndex = frames.length;
  const fileName = `frame-${String(captureIndex).padStart(6, "0")}.jpg`;
  if (!JSON_ONLY) {
    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 85,
      fromSurface: true,
      ...(captureClip ? { clip: captureClip } : {}),
    });
    const buffer = Buffer.from(screenshot.data, "base64");
    mkdirSync(join(OUT, "frames"), { recursive: true });
    writeFileSync(join(OUT, "frames", fileName), buffer);
    hashes.push(createHash("sha256").update(buffer).digest("hex"));
  } else {
    hashes.push("json-only");
  }
  frames.push({ fileName: JSON_ONLY ? null : fileName, frameIndex: clockFrame.frameIndex, timeMs: clockFrame.timeMs, captureClip });
   const captured = await page.evaluate(({ label: sampleLabel, captureIndex: index, clockFrame: frame, expectedEmbodiment: expected, captureClip: clip, contourCenterX }) => {
    const d = globalThis.__GASPER_DAIS__;
    const rig = globalThis.SidekickFormMasterRig;
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    const avatar = document.querySelector("#avatar");
    const worldRig = document.getElementById("worldRig");
    const bodyState = d.getWorldBodyState?.() || null;
    const ds = avatar?.dataset || {};
    const bodyPath = document.querySelector("#body");
    const bodyBox = bodyPath?.getBBox?.() ?? null;
    const bodyLength = bodyPath?.getTotalLength?.() ?? 0;
    const contourBins = Array.from({ length: 41 }, () => []);
    const renderedContourBins = Array.from({ length: 41 }, () => []);
    let contourMinX = null;
    let contourMaxX = null;
    let renderedContourMinX = null;
    let renderedContourMaxX = null;
    let renderedBodyBox = null;
    if (bodyPath && bodyLength > 0 && bodyBox && bodyBox.width > 0) {
      const localPoints = [];
      for (let contourIndex = 0; contourIndex < 160; contourIndex += 1) {
        localPoints.push(bodyPath.getPointAtLength((bodyLength * contourIndex) / 160));
      }
      const localMinX = Math.min(...localPoints.map((point) => point.x));
      const localMaxX = Math.max(...localPoints.map((point) => point.x));
      const localSpan = Math.max(1e-6, localMaxX - localMinX);
      for (const point of localPoints) {
        contourMinX = contourMinX === null ? point.x : Math.min(contourMinX, point.x);
        contourMaxX = contourMaxX === null ? point.x : Math.max(contourMaxX, point.x);
        const bin = Math.max(0, Math.min(contourBins.length - 1,
          Math.round(((point.x - localMinX) / localSpan) * (contourBins.length - 1))));
        contourBins[bin].push(point.y);
      }
      const screenBox = bodyPath.getBoundingClientRect?.();
      const screenMatrix = bodyPath.getScreenCTM?.();
      if (screenBox && screenMatrix && screenBox.width > 0 && screenBox.height > 0) {
        renderedBodyBox = {
          x: screenBox.x,
          y: screenBox.y,
          width: screenBox.width,
          height: screenBox.height,
        };
        const screenPoints = localPoints.map((point) => ({
          x: screenMatrix.a * point.x + screenMatrix.c * point.y + screenMatrix.e,
          y: screenMatrix.b * point.x + screenMatrix.d * point.y + screenMatrix.f,
        }));
        const screenMinX = Math.min(...screenPoints.map((point) => point.x));
        const screenMaxX = Math.max(...screenPoints.map((point) => point.x));
        const screenSpan = Math.max(1e-6, screenMaxX - screenMinX);
        for (const point of screenPoints) {
          renderedContourMinX = renderedContourMinX === null ? point.x : Math.min(renderedContourMinX, point.x);
          renderedContourMaxX = renderedContourMaxX === null ? point.x : Math.max(renderedContourMaxX, point.x);
          const bin = Math.max(0, Math.min(renderedContourBins.length - 1,
            Math.round(((point.x - screenMinX) / screenSpan) * (renderedContourBins.length - 1))));
          renderedContourBins[bin].push(point.y);
        }
      }
    }
    const toMatrix = (element) => {
      const matrix = element?.getScreenCTM?.();
      return matrix
        ? { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f }
        : null;
    };
    const worldRigScreenMatrix = toMatrix(worldRig);
    const baseScreenMatrix = toMatrix(avatar);
    const worldAnchorPx = worldRigScreenMatrix
      ? {
          x: worldRigScreenMatrix.a * 120 + worldRigScreenMatrix.c * 190 + worldRigScreenMatrix.e,
          y: worldRigScreenMatrix.b * 120 + worldRigScreenMatrix.d * 190 + worldRigScreenMatrix.f,
        }
      : null;
    return {
      label: sampleLabel,
      captureIndex: index,
      clockFrame: frame.frameIndex,
      t: clock.nowMs(),
      captureClip: clip,
      body: bodyState,
      pose: rig.getWorldPose?.() || null,
      worldRigTransform: worldRig?.getAttribute("transform") ?? null,
      renderer: { worldRigScreenMatrix, baseScreenMatrix, worldAnchorPx },
      embodiment: rig.getSnapshot?.().profile ?? null,
      renderedProfile: {
        controller: rig.getSnapshot?.().profile ?? null,
        formProfile: ds.formProfile ?? null,
        morphFrom: ds.morphFrom ?? null,
        morphTo: ds.morphTo ?? null,
        uiActive: [...document.querySelectorAll('[data-control-id="embodiment-select"]')]
          .find((element) => element.getAttribute("data-active") === "1")?.textContent?.trim() ?? null,
        expected: expected,
      },
      renderedEmbodimentStable: rig.getSnapshot?.().profile === expected &&
        ds.formProfile === expected && ds.morphFrom === expected && ds.morphTo === expected &&
        [...document.querySelectorAll('[data-control-id="embodiment-select"]')]
          .find((element) => element.getAttribute("data-active") === "1")?.textContent?.trim() === expected,
      bodyContour: bodyBox ? {
        bbox: { x: bodyBox.x, y: bodyBox.y, width: bodyBox.width, height: bodyBox.height },
        bottomY: contourBins.map((values) => values.length ? Math.max(...values) : null),
        horizontalExtent: {
          centerX: contourCenterX,
          leftPx: contourMinX === null ? null : contourCenterX - contourMinX,
          rightPx: contourMaxX === null ? null : contourMaxX - contourCenterX,
          asymmetryPx: contourMinX === null || contourMaxX === null ? null :
            (contourCenterX - contourMinX) -
            (contourMaxX - contourCenterX),
        },
      } : null,
      renderedBodyContour: renderedBodyBox ? {
        bbox: renderedBodyBox,
        bottomY: renderedContourBins.map((values) => values.length ? Math.max(...values) : null),
        horizontalExtent: {
          centerX: renderedBodyBox.x + renderedBodyBox.width / 2,
          leftPx: renderedContourMinX === null ? null : renderedBodyBox.x + renderedBodyBox.width / 2 - renderedContourMinX,
          rightPx: renderedContourMaxX === null ? null : renderedContourMaxX - (renderedBodyBox.x + renderedBodyBox.width / 2),
          asymmetryPx: renderedContourMinX === null || renderedContourMaxX === null ? null :
            (renderedBodyBox.x + renderedBodyBox.width / 2 - renderedContourMinX) -
            (renderedContourMaxX - (renderedBodyBox.x + renderedBodyBox.width / 2)),
        },
      } : null,
      wander: d.getWanderState?.() ?? null,
      camera: (() => {
        const vp = d.getViewport?.();
        const st = vp?.getState?.() ?? null;
        return st ? {
          zoom: st.zoom ?? null,
          zoomPercent: st.zoom == null ? null : Math.round(st.zoom * 100),
          autoFit: st.autoFit ?? null,
          performanceCameraLocked: st.performanceCameraLocked ?? null,
        } : null;
      })(),
      dataset: {
        provenance: ds.worldPoseProvenance ?? null,
        motionLightFactor: Number(ds.motionLightFactor ?? 1),
        wakeStretch: Number(ds.wakeStretch ?? 0),
        headingYawDeg: Number(ds.headingYaw ?? 0),
        facingDeg: Number(ds.facingDeg ?? 0),
        facingSlice: Number(ds.facingSlice ?? 6),
        faceVisibility: Number(ds.facingFaceVisibility ?? 1),
        facingCompress: Number(ds.facingCompress ?? 1),
        worldDepthScale: Number(ds.worldDepthScale ?? 1),
        gaitBob: Number(ds.gaitBob ?? 0),
        gaitSwayX: Number(ds.gaitSwayX ?? 0),
        gaitRoll: Number(ds.gaitRoll ?? 0),
        booBob: Number(ds.booBob ?? 0),
        gaitStepX: Number(ds.gaitStepX ?? 0),
        gaitStepSkew: Number(ds.gaitStepSkew ?? 0),
        gaitSquash: Number(ds.gaitSquash ?? 0),
        gaitBankDeg: Number(ds.gaitBankDeg ?? 0),
        gaitFlatten: Number(ds.gaitFlatten ?? 0),
        gaitFlattenW: Number(ds.gaitFlattenW ?? 0),
        gaitShadowDx: Number(ds.gaitShadowDx ?? 0),
        gaitPhase: Number(ds.gaitPhase ?? 0),
        gaitHz: Number(ds.gaitHz ?? 0),
        gaitPlantX: Number(ds.gaitPlantX ?? 0),
        gaitPlantWorld: Number(ds.gaitPlantWorld ?? 0),
        gaitSupportSide: Number(ds.gaitSupportSide ?? 0),
        plantedCompress: Number(ds.plantedCompress ?? 0),
        incomingCompress: Number(ds.incomingCompress ?? 0),
        windPressure: Number(ds.windPressure ?? 0),
        windDirX: Number(ds.windDirX ?? 0),
      },
      gaitProof: (() => {
        const proof = d.getGaitProofSample?.() || null;
        const support = bodyState?.support || {};
        const gait = bodyState?.gait || {};
        const tel = d.getTuningLabTelemetry?.() || {};
        return {
          source: "kernel",
          phase: Number(proof?.phase ?? gait.phase ?? 0),
          stepHz: Number(proof?.stepHz ?? gait.stepHz ?? 0),
          supportSide: Number(proof?.supportSide ?? support.side ?? 0),
          planted: proof?.planted === true || support.planted === true,
          plantedWorldX: Number(proof?.plantedWorldX ?? support.plantedWorldX ?? 0),
          plantedWorldZ: Number(proof?.plantedWorldZ ?? support.plantedWorldZ ?? 0),
          plantedScreenXUnits: Number(proof?.plantedScreenXUnits ?? tel.plantedScreenXUnits ?? 0),
          loadedCompress: Number(proof?.loadedCompress ?? support.plantedCompress ?? 0),
          loadedWidth: Number(proof?.loadedWidth ?? tel.supportFlattenWidth ?? 0),
          swingLift: Number(proof?.swingLift ?? 0),
          swingForward: Number(proof?.swingForward ?? 0),
          swingUnload: Number(proof?.swingUnload ?? support.incomingCompress ?? 0),
          comLateral: Number(proof?.comLateral ?? support.cogX ?? tel.footworkSway ?? 0),
          comVertical: Number(proof?.comVertical ?? tel.gaitBobUnits ?? 0),
          bodyX: Number(proof?.bodyX ?? bodyState?.body?.x ?? 0),
          bodyY: Number(proof?.bodyY ?? bodyState?.body?.y ?? 0),
          bodyZ: Number(proof?.bodyZ ?? bodyState?.body?.z ?? 0),
        };
      })(),
    };
  }, { label, captureIndex, clockFrame, expectedEmbodiment: captureExpectedEmbodiment, captureClip, contourCenterX: CONTOUR_CENTER_X });
    if (captured?.bodyContour?.bottomY) {
      captured.bodyContour.bottomY = completeContourBottomY(captured.bodyContour.bottomY);
    }
    if (captured?.renderedBodyContour?.bottomY) {
      captured.renderedBodyContour.bottomY = completeContourBottomY(captured.renderedBodyContour.bottomY);
    }
    captured.contourCompleteness = contourCompletenessMetric(captured?.renderedBodyContour?.bottomY ?? captured?.bodyContour?.bottomY);
    if (captured.gaitProof) {
      captured.gaitProof.lowerContour = summarizeLowerContour(
        captured.renderedBodyContour ?? captured.bodyContour,
      );
    }
    samples.push(captured);
}

const seconds = (value) => Math.round(value * FPS);
const advanceFrames = async (count, label) => {
  for (let i = 0; i < count; i += 1) await captureFrame(label);
};

if (recipe.visualSettleSeconds) {
  await advanceFrames(seconds(recipe.visualSettleSeconds), "visual-settle");
}
await advanceFrames(seconds(recipe.preRollSeconds), "pre-roll");
if (SCENARIO === "bounce-impact") {
  await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.35 }));
  await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldBounce({}));
} else if (SCENARIO === "comet-flight" || SCENARIO === "boo-flight" || SCENARIO === "boo-flight-exit") {
  if (SCENARIO === "boo-flight" || SCENARIO === "boo-flight-exit") {
    await page.evaluate(() => globalThis.__GASPER_DAIS__.enableBoo?.(true));
  }
  await page.evaluate(() => globalThis.__GASPER_DAIS__.setWorldPhysicsParams({ launchPower: 1.2 }));
  await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 0.85 }));
} else if (SCENARIO === "manual-yaw-face") {
  await page.evaluate(() => globalThis.SidekickFormMasterRig.setHeadingYaw?.(180));
} else if (SCENARIO === "three-quarter-face") {
  await page.evaluate(() => globalThis.SidekickFormMasterRig.setHeadingYaw?.(45));
} else if (SCENARIO === "field-swap") {
  await page.evaluate(() => globalThis.__GASPER_DAIS__.launchWorldComet({ gatherSeconds: 0.6 }));
}
if (SCENARIO === "field-swap") {
  await advanceFrames(seconds(0.5), recipe.activeLabel);
  fieldSwap = await page.evaluate(() => {
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
  await advanceFrames(seconds(recipe.activeSeconds - 0.5), recipe.activeLabel);
} else if (SCENARIO === "wispwalker-stride") {
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    // Keep both authored targets inside the production x corridor. The old
    // Ã‚Â±900 recipe hit the wall and turned the proof into repeated wall
    // corrections rather than one readable reversal/brake/settle beat.
    d.ensurePhysicsDriver?.().setLocomotion?.("internal", { x: 280, z: 0, cruise: 3200 });
    // The controlled kernel beat must reassert the authored walker after the
    // host's neutral-state settle has run; the clock remains the sole mover.
    d.setEmbodiment?.("wispwalker");
  });
  await advanceFrames(seconds(recipe.activeSeconds / 2), recipe.activeLabel);
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    d.ensurePhysicsDriver?.().setLocomotion?.("internal", { x: -280, z: 0, cruise: 3200 });
    d.setEmbodiment?.("wispwalker");
  });
  await advanceFrames(seconds(recipe.activeSeconds / 2), recipe.activeLabel);
} else if (SCENARIO === "wispwalker-reversal") {
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    // Keep the witness inside the production corridor so wall restitution
    // cannot masquerade as the mid-stride traction transition.
    d.ensurePhysicsDriver?.().setLocomotion?.("internal", { x: 300, z: 0, cruise: 10000 });
    d.setEmbodiment?.("wispwalker");
  });
  // Let the walker reach a live stroke, then reverse before arrival so the
  // capture exercises the acceleration-transition contract.
  await advanceFrames(seconds(0.08), recipe.activeLabel);
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    d.ensurePhysicsDriver?.().setLocomotion?.("internal", { x: -300, z: 0, cruise: 10000 });
    d.setEmbodiment?.("wispwalker");
  });
  await advanceFrames(seconds(recipe.activeSeconds - 0.08), recipe.activeLabel);
} else if (SCENARIO === "northstar-demo") {
  const path = [
    { x: 280, z: 160 },
    { x: -260, z: 260 },
    { x: 260, z: -220 },
    { x: -280, z: -160 },
  ];
  const halfFrames = Math.floor(seconds(recipe.activeSeconds) / 2);
  const legFrames = Math.max(1, Math.round(halfFrames / path.length));
  await page.evaluate(() => globalThis.__GASPER_DAIS__.enableBoo?.(false));
  captureExpectedEmbodiment = "wispwalker";
  for (const target of path.slice(0, -1)) {
    await page.evaluate((nextTarget) => {
      const d = globalThis.__GASPER_DAIS__;
      d.ensurePhysicsDriver?.().setLocomotion?.("internal", { ...nextTarget, cruise: 3200 });
      d.setEmbodiment?.("wispwalker");
    }, target);
    await advanceFrames(legFrames, recipe.activeLabel);
  }
  // Keep the final walking leg alive through the exact midpoint. The old
  // recipe sent the walker to {0,0}, waited for idle, and only then launched
  // Boo; that produced a visually quiet reset even though the aggregate order
  // gate remained green. Short authored advances preserve locomotion and hand
  // the same live body to the footless flight organ.
  // Keep the late walking handoff inside the live composition envelope. The
  // old -440/-520/-600 targets drove the body into the production wall at
  // about x=-426, so the wall restitution became a false gait reversal and
  // made the proof clip judge a boundary collision instead of intentional
  // braking. The physics authority still owns every move; this is only a
  // proof-route correction so the authored handoff stays in-frame.
  const handoffTargets = [
    { x: -280, z: -160 },
    { x: -300, z: -120 },
    { x: -320, z: -80 },
    { x: -300, z: -40 },
    { x: -280, z: 0 },
  ];
  const handoffSegmentFrames = Math.max(1, Math.floor(legFrames / handoffTargets.length));
  for (const target of handoffTargets) {
    await page.evaluate((nextTarget) => {
      const d = globalThis.__GASPER_DAIS__;
      d.ensurePhysicsDriver?.().setLocomotion?.("internal", { ...nextTarget, cruise: 3200 });
      d.setEmbodiment?.("wispwalker");
    }, target);
    await advanceFrames(handoffSegmentFrames, recipe.activeLabel);
  }
  await advanceFrames(Math.max(0, halfFrames - legFrames * (path.length - 1) - handoffSegmentFrames * handoffTargets.length), recipe.activeLabel);
  // At the exact midpoint the body is still the grounded Wispwalker. Do not
  // author x0: launchWorldComet() must inherit the current physics pose.
  captureExpectedEmbodiment = "presence";
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    document.querySelector('[data-testid="dais-rail-embodiment-presence"]')?.click();
    d.setEmbodiment?.("presence");
    d.enableBoo?.(true);
    d.setWorldPhysicsParams?.({ launchPower: 1.2 });
    // Keep the authored Boo release inside the measured composition corridor.
    // The default 3200 u/s shot reaches the right wall from the live handoff
    // pose and restitutes in one fixed step, which reads as a false reversal
    // instead of the intended drag/hover flight. This is proof-route intent;
    // the physics authority still owns release, drag, hover, and collisions.
    d.launchWorldComet?.({ gatherSeconds: 0.85, vx: 1200 });
  });
  await advanceFrames(seconds(recipe.activeSeconds) - halfFrames, recipe.activeLabel);
} else if (SCENARIO === "presence-wind-reversal") {
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    d.ensurePhysicsDriver?.().setLocomotion?.("internal", { x: 800, z: 0, cruise: 3200 });
    d.setEmbodiment?.("presence");
  });
  await advanceFrames(seconds(recipe.activeSeconds / 2), recipe.activeLabel);
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    d.ensurePhysicsDriver?.().setLocomotion?.("internal", { x: -800, z: 0, cruise: 3200 });
    d.setEmbodiment?.("presence");
  });
  await advanceFrames(seconds(recipe.activeSeconds / 2), recipe.activeLabel);
} else if (SCENARIO === "wispwalker-showcase" || SCENARIO === "presence-showcase") {
  const path = SCENARIO === "wispwalker-showcase"
    ? [
        // G2 keeps a shallow depth component so the production projection law
        // exposes the planted support without turning the proof into a
        // camera-scale demo. Lateral travel remains the dominant visual cue.
        { x: 280, z: 72 },
        { x: -260, z: 112 },
        { x: 260, z: -96 },
        { x: -280, z: -72 },
        { x: 0, z: 0 },
      ]
    : [
        { x: 280, z: 160 },
        { x: -260, z: 260 },
        { x: 260, z: -220 },
        { x: -280, z: -160 },
        { x: 0, z: 0 },
      ];
  const legFrames = Math.max(1, Math.round(seconds(recipe.activeSeconds) / path.length));
  for (const target of path) {
    await page.evaluate(({ target: nextTarget, scenario }) => {
      const d = globalThis.__GASPER_DAIS__;
      d.ensurePhysicsDriver?.().setLocomotion?.("internal", { ...nextTarget, cruise: 3200 });
      d.setEmbodiment?.(scenario === "wispwalker-showcase" ? "wispwalker" : "presence");
    }, { target, scenario: SCENARIO });
    await advanceFrames(legFrames, recipe.activeLabel);
  }
} else if (SCENARIO === "cinematic-arc") {
  const fileLife = async (intent) => {
    await page.evaluate((next) => {
      const d = globalThis.__GASPER_DAIS__;
      d.setWanderEnabled?.(false);
      d.setCompositionWorldEnvelope?.(null);
      d.ensurePhysicsDriver?.().setLocomotion?.("life", next);
    }, intent);
  };
  // Life files LocomotionIntent only. Kernel writes travel. One hold at start.
  const strollSeconds = 5 * PHI;
  const takeSeconds = PHI;
  const prepSeconds = PHI * PHI;
  const morphSeconds = PHI * PHI;
  const start = await page.evaluate(() => {
    const floor = globalThis.__GASPER_DAIS__?.ensurePhysicsDriver?.().floorPose?.() ?? { x: 0, z: 48 };
    return { x: Number.isFinite(floor.x) ? floor.x : 0, z: Number.isFinite(floor.z) ? floor.z : 48 };
  });
  const firstTargetX = start.x + 5 * PHI * 180;
  const dist = Math.max(400, Math.abs(firstTargetX - start.x));
  const strollCruise = dist / strollSeconds;
  await fileLife({ x: firstTargetX, z: 88, cruise: strollCruise });
  await advanceFrames(seconds(strollSeconds), recipe.activeLabel);
  await page.evaluate(() => {
    const d = globalThis.__GASPER_DAIS__;
    const floor = d.ensurePhysicsDriver?.().floorPose?.() ?? { x: 0, z: 88 };
    d.setCompositionWorldEnvelope?.(null);
    d.setWorldPhysicsParams?.({ launchPower: 1, intensity: 0.7 });
    d.ensurePhysicsDriver?.().setLocomotion?.("life", { x: floor.x, z: floor.z, cruise: 1 });
  });
  await advanceFrames(seconds(takeSeconds), recipe.activeLabel);
  await page.evaluate((gatherSeconds) => {
    const d = globalThis.__GASPER_DAIS__;
    const floor = d.ensurePhysicsDriver?.().floorPose?.() ?? { x: 0, z: 88 };
    d.setCompositionWorldEnvelope?.(null);
    d.ensurePhysicsDriver?.().setLocomotion?.("life", { x: floor.x, z: floor.z, cruise: 1 });
    d.enableBoo?.(true);
    d.setWorldPhysicsParams?.({ launchPower: 1, intensity: 0.7 });
    d.launchWorldComet?.({ gatherSeconds: 0.8, vx: 0, vy: 320 });
  });
  await advanceFrames(seconds(0.8), recipe.activeLabel);
  captureExpectedEmbodiment = "presence";
  await page.evaluate((durationMs) => {
    const rig = globalThis.SidekickFormMasterRig;
    rig?.morphToBehavioral?.("presence", { durationMs });
  }, Math.round(morphSeconds * 1000));
  const used = strollSeconds + takeSeconds + 0.8;
  await advanceFrames(Math.max(0, seconds(recipe.activeSeconds) - seconds(used)), recipe.activeLabel);
} else {
  await advanceFrames(seconds(recipe.activeSeconds), recipe.activeLabel);
}

const lastClock = await page.evaluate(() => globalThis.__GASPER_ORGANISM_CLOCK__.inspect());
await browser.close();

const adjacentDistinctCount = hashes.slice(1).reduce((count, hash, index) => count + (hash !== hashes[index] ? 1 : 0), 0);
const adjacentDistinctRatio = hashes.length > 1 ? adjacentDistinctCount / (hashes.length - 1) : 0;
const contiguousClockFrames = frames.every((frame, index) => index === 0 || frame.frameIndex === frames[index - 1].frameIndex + 1);
const concat = JSON_ONLY ? "" : `ffconcat version 1.0\n${frames.map((frame) => `file 'frames/${frame.fileName}'`).join("\n")}\n`;
if (!JSON_ONLY) writeFileSync(join(OUT, "frames.ffconcat"), concat);

const mp4 = join(OUT, `isolated-${SCENARIO}-120fps.mp4`);
const webm = join(OUT, `isolated-${SCENARIO}-120fps.webm`);
if (!JSON_ONLY) {
execFileSync(FFMPEG, [
  "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS),
  "-i", "frames/frame-%06d.jpg", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-pix_fmt", "yuv420p", "-r", String(FPS), "-fps_mode", "cfr", "-movflags", "+faststart", mp4,
], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });
execFileSync(FFMPEG, [
  "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS),
  "-i", "frames/frame-%06d.jpg", "-c:v", "libvpx-vp9", "-crf", "18", "-b:v", "0",
  "-r", String(FPS), "-fps_mode", "cfr", webm,
], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });
}

function probe(path) {
  return JSON.parse(execFileSync(FFPROBE, [
    "-v", "error", "-select_streams", "v:0", "-count_frames",
    "-show_entries", "stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,duration",
    "-of", "json", path,
  ], { encoding: "utf8" })).streams?.[0] ?? null;
}

const activeSamples = samples.filter((sample) => sample.label === recipe.activeLabel);
const walkerProofSamples = activeSamples.filter((sample) => sample.embodiment === "wispwalker");
const presenceProofSamples = activeSamples.filter((sample) => sample.embodiment === "presence");
const northstarHalf = Math.floor(activeSamples.length / 2);
const northstarFirstHalf = activeSamples.slice(0, northstarHalf);
const northstarSecondHalf = activeSamples.slice(northstarHalf);
const northstarDemoOrderObserved = SCENARIO === "northstar-demo" &&
  northstarFirstHalf.length > 0 && northstarSecondHalf.length > 0 &&
  northstarFirstHalf.every((sample) => sample.embodiment === "wispwalker") &&
  northstarSecondHalf.every((sample) => sample.embodiment === "presence") &&
  northstarFirstHalf.some((sample) => sample.body?.body?.contact === true) &&
  northstarSecondHalf.some((sample) => sample.body?.mode === "comet-gather" || sample.body?.mode === "comet-fly");
const activeStart = activeSamples[0]?.captureIndex ?? null;
const activeFrameCount = activeSamples.length;
const activeContiguous = activeSamples.every((sample, index) => sample.captureIndex === activeStart + index);
// The proof video returned for human review must not include setup/morph
// frames. Keep the full deterministic capture for audit, but also emit the
// contiguous active window as its own exact-cadence clip and contact sheet.
const activeMp4 = activeStart !== null && activeFrameCount > 0 && activeContiguous
  ? join(OUT, `isolated-${SCENARIO}-active-120fps.mp4`)
  : null;
const activeContactSheet = activeMp4 ? join(OUT, "active-review-contact-sheet.jpg") : null;
if (activeMp4 && !JSON_ONLY) {
  execFileSync(FFMPEG, [
    "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS),
    "-start_number", String(activeStart), "-i", "frames/frame-%06d.jpg", "-frames:v", String(activeFrameCount),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-fps_mode", "cfr", "-movflags", "+faststart", activeMp4,
  ], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });
  execFileSync(FFMPEG, [
    "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS),
    "-start_number", String(activeStart), "-i", "frames/frame-%06d.jpg", "-frames:v", String(activeFrameCount),
    "-vf", "select='not(mod(n,60))',scale=360:-1,tile=3x3:padding=4:margin=4", "-frames:v", "1", activeContactSheet,
  ], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });
}
const contactSheet = join(OUT, `isolated-${SCENARIO}-120fps-contact.jpg`);
if (!JSON_ONLY) {
  const tileMod = Math.max(1, Math.round(frames.length / 9));
  execFileSync(FFMPEG, [
    "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS),
    "-i", "frames/frame-%06d.jpg",
    "-vf", `select='not(mod(n,${tileMod}))',scale=360:-1,tile=3x3:padding=4:margin=4`,
    "-frames:v", "1", contactSheet,
  ], { cwd: OUT, stdio: ["ignore", "inherit", "inherit"] });
  if (SCENARIO === "cinematic-arc" && activeStart !== null && activeFrameCount > 0) {
    const at = (sec) => activeStart + Math.floor(activeFrameCount * (sec / Math.max(recipe.activeSeconds, 1)));
    const pad = (n) => `frame-${String(n).padStart(6, "0")}.jpg`;
    for (const [name, idx] of [
      ["walk.jpg", at(3.5)],
      ["notice.jpg", at(8.2)],
      ["flight.jpg", at(15)],
      ["t00.jpg", at(0)],
      ["t08.jpg", at(8)],
      ["t12.jpg", at(12)],
      ["t18.jpg", at(18)],
    ]) {
      const src = join(OUT, "frames", pad(idx));
      if (existsSync(src)) {
        copyFileSync(src, join(OUT, name));
        mkdirSync(join(OUT, "stills"), { recursive: true });
        copyFileSync(src, join(OUT, "stills", name));
      }
    }
  }
  rmSync(join(OUT, "frames"), { recursive: true, force: true });
}
const impactSample = activeSamples.find((sample) => (sample.body?.envelope?.impact ?? 0) > 0.75) ?? null;
const activeXs = activeSamples.map((sample) => sample.body?.body?.x).filter(Number.isFinite);
const activeVXs = activeSamples.map((sample) => sample.body?.body?.vx).filter(Number.isFinite);
const activeZs = activeSamples.map((sample) => sample.body?.body?.z).filter(Number.isFinite);
const activeVZs = activeSamples.map((sample) => sample.body?.body?.vz).filter(Number.isFinite);
const activeYs = activeSamples.map((sample) => sample.body?.body?.y).filter(Number.isFinite);
const activeTilts = activeSamples.map((sample) => Math.abs(sample.pose?.applied?.tilt ?? 0)).filter(Number.isFinite);
const activeGait = activeSamples.map((sample) => sample.body?.gait ?? null).filter(Boolean);
const activeFacing = activeSamples.map((sample) => sample.dataset ?? null).filter(Boolean);
const windMetric = windResistanceMetric(activeSamples);
const handoffMetric = northstarHandoffMetric(activeSamples);
const projectionChecks = activeSamples.map((sample) => {
  const check = projectionResidual(sample, sample.worldRigTransform);
  const identity = check.expected &&
    Math.abs(check.expected.translateX) <= 1e-9 &&
    Math.abs(check.expected.translateY) <= 1e-9 &&
    Math.abs(check.expected.scale - 1) <= 1e-9 &&
    Math.abs(check.expected.rotate) <= 1e-9;
  return identity && sample.worldRigTransform === null
    ? { ...check, pass: true, maxResidual: 0 }
    : check;
});
const projectionResiduals = projectionChecks.map((check) => check.maxResidual).filter(Number.isFinite);
const pixelProjectionChecks = activeSamples.map((sample) => screenProjectionResidual(
  sample,
  sample.renderer?.worldRigScreenMatrix,
  sample.renderer?.baseScreenMatrix,
));
const pixelProjectionResiduals = pixelProjectionChecks.map((check) => check.maxResidual).filter(Number.isFinite);
const authorityResiduals = activeSamples.flatMap((sample) => {
  const body = sample.body?.body;
  const output = sample.body?.authority?.outputPose;
  if (!body || !output) return [];
  return [
    Math.abs((output.x ?? 0) - (body.x ?? 0)),
    Math.abs((output.y ?? 0) - (body.y ?? 0)),
    Math.abs((output.z ?? 0) - (body.z ?? 0)),
  ];
});
const fieldSwapObservation = fieldSwap
  ? activeSamples.find((sample) => (sample.body?.fieldEpoch ?? -1) >= fieldSwap.after)
  : null;
const fieldSwapLatencyMs = fieldSwapObservation
  ? Math.max(0, fieldSwapObservation.t - fieldSwap.startedAt)
  : null;
const maxOf = (values) => Math.max(0, ...values);
const minOf = (values) => Math.min(0, ...values);
const activeXSpanValue = activeXs.length ? maxOf(activeXs) - minOf(activeXs) : 0;
const activeZSpanValue = activeZs.length ? maxOf(activeZs) - minOf(activeZs) : 0;
const captureClipXs = samples.map((sample) => sample.captureClip?.x).filter(Number.isFinite);
const captureClipXMin = captureClipXs.length ? Math.min(...captureClipXs) : null;
const captureClipXMax = captureClipXs.length ? Math.max(...captureClipXs) : null;
const fixedCameraObserved = captureClipXs.length === 0 || (captureClipXMax - captureClipXMin) <= 1e-6;
const travelAxis = activeZSpanValue > activeXSpanValue ? "z" : "x";
const travelValues = travelAxis === "z" ? activeZs : activeXs;
const travelVelocities = travelAxis === "z" ? activeVZs : activeVXs;
const firstIndex = (predicate) => activeSamples.find((sample) => predicate(sample))?.captureIndex ?? null;
const lastIndex = (predicate) => [...activeSamples].reverse().find((sample) => predicate(sample))?.captureIndex ?? null;
const proofs = {
  scenario: SCENARIO,
  activeSampleCount: activeSamples.length,
  exactDeterministic120: frames.length > 0 && contiguousClockFrames && Math.abs(lastClock.fixedStepMs - STEP_MS) < 1e-9 && (JSON_ONLY || adjacentDistinctRatio === 1),
  activeModeObserved: activeSamples.some((sample) => sample.body?.mode && sample.body.mode !== "idle"),
  physicsProvenanceObserved: activeSamples.some((sample) => sample.dataset.provenance === "physics-authority"),
  impactObserved: Boolean(impactSample),
  impactStretchAtFirstChargedFrame: impactSample?.body?.envelope?.stretch ?? null,
  impactEnvelopeAtFirstChargedFrame: impactSample?.body?.envelope?.impact ?? null,
  activeXSpan: Math.round(activeXSpanValue * 100) / 100,
  activeZSpan: Math.round(activeZSpanValue * 100) / 100,
  captureClipXMin,
  captureClipXMax,
  fixedCameraObserved,
  activeTravelSpan: Math.round(Math.max(activeXSpanValue, activeZSpanValue) * 100) / 100,
  travelAxis,
  activeYPeak: activeYs.length ? Math.round(maxOf(activeYs) * 100) / 100 : 0,
  activeMaxAbsTilt: Math.round(maxOf(activeTilts) * 100) / 100,
  physicsAuthorityPacketObserved: activeSamples.some((sample) => sample.body?.authority?.packet === "GASPER-PHYSICS-AUTHORITY-001"),
  solePhysicsWriterObserved: activeSamples.some((sample) => sample.body?.authority?.writer === "world-physics-driver"),
  gaitSupportLive: gaitSupportLiveMetric(samples),
  bodyOutputResidualMax: authorityResiduals.length ? Math.round(maxOf(authorityResiduals) * 1e9) / 1e9 : null,
  bodyOutputLock: activeSamples.length > 0 && authorityResiduals.length > 0 && maxOf(authorityResiduals) <= 1e-6,
  projectionEquationLock: projectionChecks.length > 0 && projectionChecks.every((check) => check.pass),
  projectionResidualMax: projectionResiduals.length ? Math.round(maxOf(projectionResiduals) * 1e6) / 1e6 : null,
  pixelProjectionLock: pixelProjectionChecks.length > 0 && pixelProjectionChecks.every((check) => check.pass),
  pixelProjectionResidualMax: pixelProjectionResiduals.length ? Math.round(maxOf(pixelProjectionResiduals) * 1e6) / 1e6 : null,
  fieldSwapResponse: fieldSwap ? {
    beforeEpoch: fieldSwap.before,
    afterEpoch: fieldSwap.after,
    epochGrew: fieldSwap.after > fieldSwap.before,
    observedEpoch: fieldSwapObservation?.body?.fieldEpoch ?? -1,
    observedWithinOneSecond: fieldSwapLatencyMs !== null && fieldSwapLatencyMs <= 1000,
    latencyMs: fieldSwapLatencyMs === null ? null : Math.round(fieldSwapLatencyMs * 100) / 100,
  } : null,
  bidirectionalTravelObserved: travelValues.some((value) => value < -100) && travelValues.some((value) => value > 100),
  // Keep the raw sign-change count for diagnosis, but gate the authored
  // reversal on a sustained opposite direction so arrival-band chatter does
  // not masquerade as extra motion quality.
  travelReversalCount: sustainedDirectionReversalCount(travelVelocities, 50, 3),
  travelReversalSignChangeCount: directionReversalCount(travelVelocities, 50),
  travelReversalMinimumRun: 3,
  minFaceVisibility: activeFacing.length ? Math.round(Math.min(...activeFacing.map((sample) => sample.faceVisibility)) * 10000) / 10000 : 1,
  maxAbsDisplayYaw: activeFacing.length ? Math.round(Math.max(...activeFacing.map((sample) => Math.abs(sample.headingYawDeg))) * 100) / 100 : 0,
  threeQuarterWidthCueObserved: activeFacing.some((sample) => sample.facingCompress < 0.999),
  faceFloorExercised: activeFacing.some((sample) => sample.faceVisibility < 0.9), // legacy metric name; any facing recession exercises it
  rearFaceSuppressionExercised: activeFacing.some((sample) => Math.abs(sample.headingYawDeg) >= 105 && sample.faceVisibility <= 0.02),
  walkerEmbodimentObserved: activeSamples.some((sample) => sample.embodiment === "wispwalker"),
  renderedEmbodimentStable: activeSamples.length > 0 && activeSamples.every((sample) => sample.renderedEmbodimentStable === true),
  renderedProfilesObserved: [...new Set(activeSamples.map((sample) => sample.renderedProfile?.formProfile).filter(Boolean))],
  presenceEmbodimentObserved: activeSamples.some((sample) => sample.embodiment === "presence"),
  booModeObserved: activeSamples.some((sample) => Math.abs(sample.dataset.booBob ?? 0) > 1e-6),
  northstarDemoOrderObserved,
  northstarHandoff: handoffMetric,
  groundedLocomotionObserved: activeSamples.some((sample) => sample.body?.mode === "locomotion" && sample.body?.body?.contact === true),
  gaitExpressionObserved: activeGait.some((gait) => (gait.stepHz ?? 0) > 0 && (gait.swayUnits ?? 0) > 0 && (gait.stepFlattenWidthUnits ?? 0) > 0),
  airborneModeObserved: activeSamples.some((sample) => sample.body?.mode === "bounce" || sample.body?.mode === "comet-gather" || sample.body?.mode === "comet-fly"),
  floatAltitudeObserved: activeSamples.some((sample) => sample.body?.mode === "locomotion" && sample.body?.body?.contact === false && (sample.body?.body?.y ?? 0) > 0),
  floatGaitCollapsed: activeSamples.filter((sample) => sample.embodiment === "presence").every((sample) =>
    Math.abs(sample.body?.gait?.stepHz ?? 0) < 1e-9 &&
    Math.abs(sample.body?.gait?.swayUnits ?? 0) < 1e-9 &&
    Math.abs(sample.body?.gait?.stepFlattenWidthUnits ?? 0) < 1e-9),
  windResistance: windMetric,
  windResistanceObserved: windMetric.pass,
};
const activeFootMetrics = SCENARIO === "wispwalker-walk" || SCENARIO === "wispwalker-stride" || SCENARIO === "wispwalker-reversal" || SCENARIO === "wispwalker-showcase" || SCENARIO === "northstar-demo" || SCENARIO === "cinematic-arc"
  ? (SCENARIO === "northstar-demo" || SCENARIO === "cinematic-arc" ? walkerProofSamples : activeSamples).map((sample) => wispwalkerFootReadabilityMetric({
      bottomY: sample.bodyContour?.bottomY,
      widthPx: sample.bodyContour?.bbox?.width,
    }))
  : [];
const footPassCount = activeFootMetrics.filter((metric) => metric.pass).length;
proofs.footRootReadability = activeFootMetrics.length > 0 ? {
  passCount: footPassCount,
  sampleCount: activeFootMetrics.length,
  coverage: footPassCount / activeFootMetrics.length,
  minCleftDepthPx: Math.min(...activeFootMetrics.map((metric) => metric.cleftDepthPx ?? Number.POSITIVE_INFINITY)),
  maxCleftDepthPx: Math.max(...activeFootMetrics.map((metric) => metric.cleftDepthPx ?? Number.NEGATIVE_INFINITY)),
  minFootSpreadPx: Math.min(...activeFootMetrics.map((metric) => metric.footSpreadPx ?? Number.POSITIVE_INFINITY)),
  representative: activeFootMetrics.find((metric) => metric.pass) ?? activeFootMetrics[0],
} : null;
proofs.footRootReadabilityObserved = activeFootMetrics.length > 0 && footPassCount > 0 && (footPassCount / activeFootMetrics.length) >= 0.75;
proofs.wispwalkerGaitMotion = (SCENARIO === "wispwalker-walk" || SCENARIO === "wispwalker-stride" || SCENARIO === "wispwalker-reversal" || SCENARIO === "wispwalker-showcase" || SCENARIO === "northstar-demo" || SCENARIO === "cinematic-arc")
  ? wispwalkerGaitMotionMetric(SCENARIO === "northstar-demo" || SCENARIO === "cinematic-arc" ? walkerProofSamples : activeSamples)
  : null;
proofs.wispwalkerGaitMotionObserved = Boolean(proofs.wispwalkerGaitMotion?.pass);
proofs.wispwalkerSupportCarrier = (SCENARIO === "wispwalker-walk" || SCENARIO === "wispwalker-stride" || SCENARIO === "wispwalker-reversal" || SCENARIO === "wispwalker-showcase" || SCENARIO === "northstar-demo" || SCENARIO === "cinematic-arc")
  ? wispwalkerSupportCarrierMetric(SCENARIO === "northstar-demo" || SCENARIO === "cinematic-arc" ? walkerProofSamples : activeSamples)
  : null;
proofs.wispwalkerSupportCarrierObserved = Boolean(proofs.wispwalkerSupportCarrier?.pass);
proofs.focusedMachineGate = SCENARIO === "bounce-impact"
  ? proofs.exactDeterministic120 && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock && proofs.impactObserved && proofs.impactStretchAtFirstChargedFrame === 0 && proofs.minFaceVisibility >= 0.72
    : SCENARIO === "comet-flight"
    ? proofs.exactDeterministic120 && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock && proofs.minFaceVisibility >= 0.72 && proofs.threeQuarterWidthCueObserved
    : SCENARIO === "boo-flight" || SCENARIO === "boo-flight-exit"
    ? proofs.exactDeterministic120 && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock && proofs.minFaceVisibility >= 0.72 && proofs.threeQuarterWidthCueObserved && proofs.presenceEmbodimentObserved && proofs.floatAltitudeObserved && proofs.floatGaitCollapsed && proofs.booModeObserved
    : SCENARIO === "manual-yaw-face"
      ? proofs.exactDeterministic120 && proofs.minFaceVisibility <= 0.02 && proofs.maxAbsDisplayYaw >= 150 && proofs.rearFaceSuppressionExercised && proofs.projectionEquationLock
    : SCENARIO === "three-quarter-face"
      ? proofs.exactDeterministic120 && proofs.presenceEmbodimentObserved && proofs.minFaceVisibility >= 0.9 && proofs.maxAbsDisplayYaw >= 40 && proofs.maxAbsDisplayYaw <= 46 && proofs.threeQuarterWidthCueObserved && proofs.projectionEquationLock
    : SCENARIO === "wispwalker-walk" || SCENARIO === "wispwalker-stride"
      ? proofs.exactDeterministic120 && proofs.walkerEmbodimentObserved && proofs.renderedEmbodimentStable && proofs.footRootReadabilityObserved && proofs.wispwalkerGaitMotionObserved && proofs.groundedLocomotionObserved && proofs.gaitExpressionObserved && !proofs.airborneModeObserved && proofs.minFaceVisibility >= 0.72 && proofs.threeQuarterWidthCueObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock && (SCENARIO !== "wispwalker-walk" || proofs.fixedCameraObserved)
    : SCENARIO === "wispwalker-reversal"
      ? proofs.exactDeterministic120 && proofs.walkerEmbodimentObserved && proofs.renderedEmbodimentStable && proofs.footRootReadabilityObserved && proofs.wispwalkerGaitMotionObserved && proofs.groundedLocomotionObserved && proofs.gaitExpressionObserved && !proofs.airborneModeObserved && proofs.bidirectionalTravelObserved && proofs.travelReversalCount >= 1 && proofs.activeTravelSpan >= 200 && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock
    : SCENARIO === "wispwalker-showcase"
      ? proofs.exactDeterministic120 && proofs.walkerEmbodimentObserved && proofs.renderedEmbodimentStable && proofs.footRootReadabilityObserved && proofs.wispwalkerGaitMotionObserved && proofs.groundedLocomotionObserved && proofs.gaitExpressionObserved && !proofs.airborneModeObserved && proofs.bidirectionalTravelObserved && proofs.travelReversalCount >= 1 && proofs.activeTravelSpan >= 200 && proofs.minFaceVisibility >= 0.72 && proofs.threeQuarterWidthCueObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock
    : SCENARIO === "presence-wind-reversal"
      ? proofs.exactDeterministic120 && proofs.presenceEmbodimentObserved && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.floatAltitudeObserved && proofs.floatGaitCollapsed && proofs.bidirectionalTravelObserved && proofs.travelReversalCount >= 1 && proofs.windResistanceObserved && (proofs.windResistance?.positivePressureDeltaPx ?? 0) >= 0.5 && (proofs.windResistance?.negativePressureDeltaPx ?? 0) <= -0.5
    : SCENARIO === "presence-showcase"
      ? proofs.exactDeterministic120 && proofs.presenceEmbodimentObserved && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.floatAltitudeObserved && proofs.floatGaitCollapsed && !proofs.groundedLocomotionObserved && proofs.bidirectionalTravelObserved && proofs.travelReversalCount >= 3 && proofs.activeXSpan >= 200 && proofs.minFaceVisibility >= 0.72 && proofs.projectionEquationLock && proofs.windResistanceObserved
    : SCENARIO === "cinematic-arc"
      ? proofs.exactDeterministic120 && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock && proofs.walkerEmbodimentObserved && proofs.presenceEmbodimentObserved && proofs.groundedLocomotionObserved && proofs.gaitExpressionObserved && proofs.airborneModeObserved && proofs.booModeObserved && proofs.floatAltitudeObserved
    : SCENARIO === "northstar-demo"
      ? proofs.exactDeterministic120 && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock && proofs.northstarDemoOrderObserved && proofs.northstarHandoff?.pass && proofs.renderedEmbodimentStable && proofs.walkerEmbodimentObserved && proofs.presenceEmbodimentObserved && proofs.footRootReadabilityObserved && proofs.wispwalkerGaitMotionObserved && proofs.wispwalkerSupportCarrierObserved && proofs.groundedLocomotionObserved && proofs.gaitExpressionObserved && proofs.floatAltitudeObserved && proofs.floatGaitCollapsed && proofs.airborneModeObserved && proofs.booModeObserved && proofs.minFaceVisibility >= 0.72 && proofs.threeQuarterWidthCueObserved
    : SCENARIO === "field-swap"
      ? proofs.exactDeterministic120 && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.physicsAuthorityPacketObserved && proofs.solePhysicsWriterObserved && proofs.bodyOutputLock && proofs.projectionEquationLock && proofs.fieldSwapResponse?.epochGrew && proofs.fieldSwapResponse?.observedWithinOneSecond && proofs.minFaceVisibility >= 0.72
      : proofs.exactDeterministic120 && proofs.presenceEmbodimentObserved && proofs.activeModeObserved && proofs.physicsProvenanceObserved && proofs.floatAltitudeObserved && proofs.floatGaitCollapsed && !proofs.groundedLocomotionObserved && proofs.minFaceVisibility >= 0.72 && proofs.projectionEquationLock;
proofs.focusedMachineGate = Boolean(proofs.focusedMachineGate && proofs.pixelProjectionLock);

const review = {
  scenario: SCENARIO,
  reviewCadenceFps: FPS,
  captureView: { mode: CAPTURE_VIEW, subjectCloseSize: CAPTURE_VIEW === "subject-close" ? SUBJECT_CLOSE_SIZE : null },
  keyframes: {
    firstActive: activeSamples[0]?.captureIndex ?? null,
    firstNonIdle: firstIndex((sample) => sample.body?.mode && sample.body.mode !== "idle"),
    firstGroundedLocomotion: firstIndex((sample) => sample.body?.mode === "locomotion" && sample.body?.body?.contact === true),
    firstGaitExpression: firstIndex((sample) => (sample.body?.gait?.stepHz ?? 0) > 0 && (sample.body?.gait?.swayUnits ?? 0) > 0),
    firstImpact: firstIndex((sample) => (sample.body?.envelope?.impact ?? 0) > 0.75),
    peakY: activeSamples.reduce((best, sample) => (sample.body?.body?.y ?? 0) > (best?.body?.body?.y ?? 0) ? sample : best, activeSamples[0] ?? null)?.captureIndex ?? null,
    lastActive: activeSamples.at(-1)?.captureIndex ?? null,
    lastGroundedLocomotion: lastIndex((sample) => sample.body?.mode === "locomotion" && sample.body?.body?.contact === true),
  },
  frameNaming: "frames/frame-NNNNNN.jpg",
  video: {
    mp4,
    webm,
    activeMp4,
    activeContactSheet,
    sourceCadenceFps: FPS,
  },
};

const receipt = {
  generatedAt: new Date().toISOString(),
  harness: "capture-isolated-beat-120fps.mjs",
  scenario: SCENARIO,
  recipe,
  surface,
  capture: {
    frameCount: frames.length,
    virtualDurationSec: frames.length / FPS,
    sourceCadenceFps: FPS,
    fixedStepMs: STEP_MS,
    cadenceType: "headless deterministic organism-clock fixed-step",
    cadenceRule: "one browser-surface screenshot after each clock.step(1000/120); no duplication, interpolation, or wall-clock pacing",
    view: { mode: CAPTURE_VIEW, subjectCloseSize: CAPTURE_VIEW === "subject-close" ? SUBJECT_CLOSE_SIZE : null },
    offlineBridgeStub: OFFLINE_BRIDGE_STUB,
    adjacentDistinctRatio,
    adjacentDistinctCount,
    contiguousClockFrames,
    firstClockFrame: frames[0]?.frameIndex ?? null,
    lastClockFrame: frames.at(-1)?.frameIndex ?? null,
    finalClock: lastClock,
    viewport: VIEWPORT,
    mp4,
    webm,
    activeMp4,
    activeContactSheet,
    contactSheet,
    jsonOnly: JSON_ONLY,
    mp4Probe: JSON_ONLY ? null : probe(mp4),
    webmProbe: JSON_ONLY ? null : probe(webm),
    activeMp4Probe: JSON_ONLY || !activeMp4 ? null : probe(activeMp4),
  },
  proofs,
  events,
  visualAcceptance: "PENDING_ARCHITECT_REVIEW",
  ownerAcceptance: "PENDING",
};
writeFileSync(join(OUT, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
if (!JSON_ONLY) {
writeFileSync(join(OUT, "surface.json"), JSON.stringify(surface, null, 2) + "\n");
writeFileSync(join(OUT, "samples.json"), JSON.stringify(samples, null, 2) + "\n");
writeFileSync(join(OUT, "review.json"), JSON.stringify(review, null, 2) + "\n");
}
console.log(JSON.stringify({ out: OUT, mp4, webm, frames: frames.length, cadenceFps: FPS, proofs }, null, 2));
