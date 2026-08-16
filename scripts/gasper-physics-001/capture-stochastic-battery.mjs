// GASPER Northstar stochastic / perturbation witness.
//
// Observer-only: it drives the existing public surface with the deterministic
// organism clock, records wander decisions without screenshots, repeats the
// same seeded run, and checks that the decision sequence is deterministic but
// not periodic. A live field perturbation is injected through the public
// environment API and its next observed epoch is measured.
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decisionTimingCensus } from "./proof-metrics.mjs";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://127.0.0.1:5176/";
const OUT = resolve(process.env.GASPER_STOCHASTIC_OUT || "research/proofs/gasper-physics-001/northstar-r9-stochastic-battery-120fps-r1");
const FPS = 120;
const STEP_MS = 1000 / FPS;
const TOTAL_SECONDS = Number(process.env.GASPER_STOCHASTIC_SECONDS || 120);
const TOTAL_FRAMES = TOTAL_SECONDS * FPS;
const PERTURB_SECONDS = String(process.env.GASPER_STOCHASTIC_PERTURB_SECONDS || "45,90")
  .split(",")
  .map(Number)
  .filter((seconds) => Number.isFinite(seconds) && seconds >= 0 && seconds < TOTAL_SECONDS);
const PERTURB_FRAMES = PERTURB_SECONDS.map((seconds) => Math.min(TOTAL_FRAMES - 1, seconds * FPS));
const MIN_DECISION_EVENTS = 3;

if (existsSync(join(OUT, "receipt.json"))) throw new Error(`Refusing to overwrite an existing battery: ${OUT}`);
mkdirSync(OUT, { recursive: true });

async function setup(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(
    () => globalThis.__GASPER_DAIS__ && globalThis.SidekickFormMasterRig && globalThis.__GASPER_ORGANISM_CLOCK__ && document.querySelector("#avatar"),
    { timeout: 30000 },
  );
  const surface = await page.evaluate(({ stepMs }) => {
    const d = globalThis.__GASPER_DAIS__;
    const rig = globalThis.SidekickFormMasterRig;
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    d.stopLiving?.();
    d.startLiving?.({ seed: 20260808, autoSequence: true, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
    d.setWanderEnabled?.(false);
    d.setLifeEnabled?.(false);
    d.ensurePhysicsDriver?.();
    d.disarmWorldBody?.();
    rig.setPaused?.(false);
    d.living?.applyModePolicy?.({ autoSequence: true, restrainedIdle: false, freezeSequence: true });
    d.living?.eightLoop?.setAutoLoop?.(false);
    d.setEmbodiment?.("wispwalker");
    d.setWanderEnabled?.(true);
    d.setWorldPhysicsParams?.({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });
    clock.stop();
    clock.reset({ seed: 20260808, timeMs: 0 });
    clock.setFixedStepMs(stepMs);
    clock.setMode("deterministic");
    clock.clearFault?.();
    return {
      clock: clock.inspect(),
      profile: rig.getSnapshot?.().profile ?? null,
      wander: d.getWanderState?.() ?? null,
      epoch: d.getEnvironmentFieldEpoch?.() ?? -1,
    };
  }, { stepMs: STEP_MS });
  await page.waitForTimeout(500);
  // The mounted studio performs one asynchronous living bootstrap after the
  // initial surface is available. Reassert the proof runtime AFTER that
  // bootstrap, otherwise the default eight-state loop can reopen and change
  // the embodiment under a long observer run (the short visual clips finish
  // before this contamination becomes visible).
  await page.evaluate(({ stepMs }) => {
    const d = globalThis.__GASPER_DAIS__;
    const rig = globalThis.SidekickFormMasterRig;
    const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
    d.stopLiving?.();
    d.startLiving?.({ seed: 20260808, autoSequence: true, restrainedIdle: false, eightStateLoop: false, proofMode: true, timingScale: 1 });
    d.setWanderEnabled?.(false);
    d.setLifeEnabled?.(false);
    d.ensurePhysicsDriver?.();
    d.disarmWorldBody?.();
    rig.setPaused?.(false);
    d.living?.applyModePolicy?.({ autoSequence: true, restrainedIdle: false, freezeSequence: true });
    d.living?.eightLoop?.setAutoLoop?.(false);
    d.setEmbodiment?.("wispwalker");
    d.setWanderEnabled?.(true);
    d.setWorldPhysicsParams?.({ gravityScale: 1, restitution: 0.6180339887498948, launchPower: 1, intensity: 0.7 });
    clock.stop();
    clock.reset({ seed: 20260808, timeMs: 0 });
    clock.setFixedStepMs(stepMs);
    clock.setMode("deterministic");
    clock.clearFault?.();
    // Canonicalize any pre-bootstrap wander phase before the measured run.
    // The public driver has no reset verb; disabling it for a few fixed steps
    // lets recall finish against the already-disarmed body, then the measured
    // clock is reset once more from the dormant origin.
    d.setWanderEnabled?.(false);
    for (let i = 0; i < 12; i += 1) clock.step(stepMs);
    d.disarmWorldBody?.();
    d.setEmbodiment?.("wispwalker");
    clock.stop();
    clock.reset({ seed: 20260808, timeMs: 0 });
    clock.setFixedStepMs(stepMs);
    clock.setMode("deterministic");
    clock.clearFault?.();
    d.setWanderEnabled?.(true);
  }, { stepMs: STEP_MS });
  await page.evaluate(() => {
    globalThis.__GASPER_DAIS__.setEmbodiment?.("wispwalker");
    globalThis.SidekickFormMasterRig?.setProfile?.("wispwalker");
    globalThis.__GASPER_DAIS__.setWanderEnabled?.(true);
  });
  return surface;
}

async function runTwin(runId) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: EXEC,
    args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const events = [];
  page.on("pageerror", (error) => events.push({ type: "pageerror", message: error.message }));
  const surface = await setup(page);
  // Keep the observer loop in one page task. The mounted studio may have a
  // delayed bootstrap effect; yielding between chunks lets that effect
  // reopen the default lifecycle during a supposedly frozen proof run. A
  // single deterministic task makes the configured runtime the only actor
  // for the whole 120-second sample, while retaining the same 120Hz clock
  // steps and controlled perturbation.
  const observed = await page.evaluate(({ stepMs, totalFrames, perturbFrames }) => {
      const d = globalThis.__GASPER_DAIS__;
      const clock = globalThis.__GASPER_ORGANISM_CLOCK__;
      const out = [];
      const perturbations = [];
      for (let i = 0; i < totalFrames; i += 1) {
        const perturbationIndex = perturbFrames.indexOf(i);
        if (perturbationIndex >= 0) {
          const before = d.getEnvironmentFieldEpoch?.() ?? -1;
          const startedAt = clock.nowMs();
          const after = d.reportEnvironmentSize?.({
            viewportWidthPx: perturbationIndex === 0 ? 1440 : 1180,
            viewportHeightPx: perturbationIndex === 0 ? 900 : 760,
            homeHeightPx: 153,
          }) ?? -1;
          perturbations.push({
            index: perturbationIndex,
            viewportWidthPx: perturbationIndex === 0 ? 1440 : 1180,
            viewportHeightPx: perturbationIndex === 0 ? 900 : 760,
            before,
            after,
            startedAt,
          });
        }
        const frame = clock.step(stepMs);
        const wander = d.getWanderState?.() ?? null;
        const body = d.getWorldBodyState?.() ?? null;
        const pose = globalThis.SidekickFormMasterRig?.getWorldPose?.() ?? null;
        out.push({
          index: i,
          frame: frame.frameIndex,
          t: clock.nowMs(),
          phase: wander?.phase ?? null,
          nextStep: wander?.nextStep ?? null,
          planStep: wander?.plan?.step ?? null,
          bearingDeg: wander?.plan?.bearingDeg ?? null,
          holdSecondsLeft: wander?.holdSecondsLeft ?? 0,
          legPhase: wander?.legPhase ?? null,
          legMode: wander?.legMode ?? null,
          fieldEpoch: body?.fieldEpoch ?? d.getEnvironmentFieldEpoch?.() ?? -1,
          mode: body?.mode ?? null,
          contact: body?.body?.contact ?? null,
          gaitHz: body?.gait?.stepHz ?? 0,
          gaitSway: body?.gait?.swayUnits ?? 0,
          pose: pose?.applied ? { x: pose.applied.x, y: pose.applied.y, z: pose.applied.z } : null,
        });
      }
      return {
        samples: out,
        perturbations,
        finalLiving: d.livingStatus?.() ?? null,
        finalWander: d.getWanderState?.() ?? null,
        finalBody: d.getWorldBodyState?.() ?? null,
      };
    }, { stepMs: STEP_MS, totalFrames: TOTAL_FRAMES, perturbFrames: PERTURB_FRAMES });
  const samples = observed.samples;
  const perturbations = observed.perturbations;

  const finalClock = await page.evaluate(() => globalThis.__GASPER_ORGANISM_CLOCK__.inspect());
  await browser.close();

  const decisions = [];
  const phaseTransitions = [];
  let previousPhase = null;
  let previousNextStep = null;
  for (const sample of samples) {
    if (previousPhase !== null && sample.phase !== previousPhase) {
      phaseTransitions.push({
        t: sample.t,
        from: previousPhase,
        to: sample.phase,
        nextStep: sample.nextStep,
        legPhase: sample.legPhase,
        legMode: sample.legMode,
      });
    }
    if (sample.phase === "intent" && previousPhase !== "intent") {
      decisions.push({ t: sample.t, nextStep: sample.nextStep, planStep: sample.planStep, bearingDeg: sample.bearingDeg });
    }
    if (previousNextStep !== null && sample.nextStep !== previousNextStep) {
      events.push({ type: "next-step", t: sample.t, nextStep: sample.nextStep, planStep: sample.planStep });
    }
    previousPhase = sample.phase;
    previousNextStep = sample.nextStep;
  }
  const decisionTimes = decisions.map((decision) => decision.t);
  const census = decisionTimingCensus(decisionTimes, 16);
  const perturbationResults = perturbations.map((perturbation) => {
    const observedField = samples.find((sample) => sample.fieldEpoch >= perturbation.after);
    return {
      index: perturbation.index,
      viewportWidthPx: perturbation.viewportWidthPx,
      viewportHeightPx: perturbation.viewportHeightPx,
      beforeEpoch: perturbation.before,
      afterEpoch: perturbation.after,
      epochGrew: perturbation.after > perturbation.before,
      observedEpoch: observedField?.fieldEpoch ?? -1,
      observedWithinOneSecond: Boolean(observedField) && observedField.t - perturbation.startedAt <= 1000,
      latencyMs: observedField ? Math.round((observedField.t - perturbation.startedAt) * 100) / 100 : null,
    };
  });

  return {
    runId,
    surface,
    frames: samples.length,
    firstFrame: samples[0]?.frame ?? null,
    lastFrame: samples.at(-1)?.frame ?? null,
    finalClock,
    decisions,
    decisionTimes,
    phaseTransitions,
    timingCensus: census,
    perturbations: perturbationResults,
    finalLiving: observed.finalLiving,
    finalWander: observed.finalWander,
    finalBody: observed.finalBody,
    events,
    pageErrors: events.filter((event) => event.type === "pageerror"),
  };
}

const runs = [await runTwin("twin-a"), await runTwin("twin-b")];
const signature = (run) => JSON.stringify({
  frames: run.frames,
  decisions: run.decisions,
  phaseTransitions: run.phaseTransitions,
  perturbations: run.perturbations,
  fieldEpochs: run.decisions.map((decision) => decision.nextStep),
});
const deterministicTwin = signature(runs[0]) === signature(runs[1]);
const a = runs[0];
const gates = {
  exactDeterministic120: runs.every((run) => run.frames === TOTAL_FRAMES && run.firstFrame === 1 && run.lastFrame === TOTAL_FRAMES && run.finalClock.mode === "deterministic" && Math.abs(run.finalClock.fixedStepMs - STEP_MS) < 1e-9),
  enoughDecisions: runs.every((run) => run.decisions.length >= MIN_DECISION_EVENTS),
  aperiodicDecisionTiming: runs.every((run) => run.timingCensus.aperiodic),
  decisionTimingHasMultipleGaps: runs.every((run) => run.timingCensus.uniqueGaps.length >= 2),
  deterministicTwin,
  perturbationResponse: runs.every((run) => run.perturbations.length === PERTURB_FRAMES.length && run.perturbations.every((perturbation) => perturbation.epochGrew && perturbation.observedWithinOneSecond)),
  noPageErrors: runs.every((run) => run.pageErrors.length === 0),
};
gates.focusedMachineGate = Object.values(gates).every(Boolean);

const receipt = {
  generatedAt: new Date().toISOString(),
  harness: "capture-stochastic-battery.mjs",
  cadence: {
    sourceCadenceFps: FPS,
    fixedStepMs: STEP_MS,
    totalSeconds: TOTAL_SECONDS,
    perturbationSeconds: PERTURB_SECONDS,
    minimumDecisionEvents: MIN_DECISION_EVENTS,
    cadenceRule: "observer-only deterministic organism-clock steps; no wall-clock pacing or screenshot interpolation",
  },
  gates,
  runs,
  visualAcceptance: "NOT_APPLICABLE_TO_OBSERVER_ONLY_BATTERY",
  ownerAcceptance: "PENDING",
};
writeFileSync(join(OUT, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ out: OUT, gates, decisions: a.decisions.length, timingCensus: a.timingCensus, perturbations: a.perturbations }, null, 2));
