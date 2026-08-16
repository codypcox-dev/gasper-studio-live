import { writeFileSync, mkdirSync } from "node:fs";
import { GoldenWanderDriver } from "../../packages/desktop/src/gasper/behavior/GoldenWanderDriver.ts";
import {
  WANDER_LAW,
  composeWanderLeg,
  goldenWanderPlan,
  insetWanderArrivalTarget,
} from "../../packages/desktop/src/gasper/behavior/GoldenWander.ts";

const PHI = (1 + Math.sqrt(5)) / 2;

function fakeClock() {
  let sub: { onFrame: (frame: { deltaMs: number }) => void } | null = null;
  let t = 0;
  return {
    subscribe(s: { onFrame: (frame: { deltaMs: number }) => void }) {
      sub = s;
      return () => { sub = null; };
    },
    now() { return t; },
    fire(deltaMs = 1000 / 120) {
      t += deltaMs / 1000;
      sub?.onFrame({ deltaMs });
    },
    fireFor(seconds: number, stepMs = 1000 / 120) {
      const n = Math.round((seconds * 1000) / stepMs);
      for (let i = 0; i < n; i++) this.fire(stepMs);
    },
  };
}

function fakeLocomotion(clock: ReturnType<typeof fakeClock>, pinFarFence = false) {
  const intents: Record<string, { x: number; z: number; cruise: number } | undefined> = {};
  const owners = { wander: false, life: false, internal: false };
  const body = { x: 0, z: 0, speed: 0 };
  const log: string[] = [];
  let lastT = 0;
  const wallZ = WANDER_LAW.depthBandMax - 14;
  function integrate() {
    const dt = Math.max(0, clock.now() - lastT);
    lastT = clock.now();
    if (dt <= 0) return;
    const intent = intents.life ?? intents.wander ?? intents.internal;
    if (!intent) { body.speed = 0; return; }
    const dx = intent.x - body.x;
    const dz = intent.z - body.z;
    const d = Math.hypot(dx, dz);
    if (d <= 1e-9) { body.speed = 0; return; }
    const step = Math.min(d, intent.cruise * dt);
    body.x += (dx / d) * step;
    body.z += (dz / d) * step;
    body.speed = step < d ? intent.cruise : 0;
    if (pinFarFence && body.z > wallZ) {
      body.z = wallZ;
      body.speed = 39.4;
    }
  }
  return {
    body, log, owners, intents,
    setLocomotion(owner: "wander", intent: { x: number; z: number; cruise: number }) {
      integrate();
      intents[owner] = intent;
      owners[owner] = true;
      log.push(`set|${owner}`);
    },
    clearLocomotion(owner: "wander") {
      integrate();
      delete intents[owner];
      log.push(`clear|${owner}`);
    },
    standDownLocomotion(owner: "wander") {
      integrate();
      delete intents[owner];
      owners[owner] = false;
      log.push(`standDown|${owner}`);
    },
    floorPose() {
      integrate();
      return { x: body.x, z: body.z, speed: body.speed };
    },
    traction: () => ({ mu: 1 / (PHI * PHI), gravity: 74210 }),
  };
}

function run(pinFarFence: boolean) {
  const clock = fakeClock();
  const port = fakeLocomotion(clock, pinFarFence);
  const d = new GoldenWanderDriver(clock, port as any, () => true, () => "wispwalker");
  const samples: Array<Record<string, unknown>> = [];
  const stepMs = 1000 / 120;
  const frames = 1050;
  let lockStart: number | null = null;
  let longest = { n: 0, start: -1, end: -1 };
  let lockCount = 0;
  let prev = { x: 0, z: 0 };
  const phases: string[] = [];
  for (let i = 0; i < frames; i++) {
    clock.fire(stepMs);
    const st = d.getState();
    const b = port.body;
    const key = `${st.phase}|${st.nextStep}`;
    if (phases[phases.length - 1] !== key) phases.push(key);
    const dx = Math.abs(b.x - prev.x);
    const dz = Math.abs(b.z - prev.z);
    if (i > 0 && dx < 0.05 && dz < 0.05) {
      if (lockStart == null) lockStart = i;
      lockCount++;
    } else {
      if (lockCount > longest.n) longest = { n: lockCount, start: lockStart ?? -1, end: i - 1 };
      lockStart = null;
      lockCount = 0;
    }
    prev = { x: b.x, z: b.z };
    if (i % 60 === 0 || i === frames - 1) {
      samples.push({
        i, phase: st.phase, nextStep: st.nextStep, x: b.x, z: b.z, speed: b.speed,
        wanderOwner: port.owners.wander, planStep: st.plan?.step ?? null,
      });
    }
  }
  if (lockCount > longest.n) longest = { n: lockCount, start: lockStart ?? -1, end: frames - 1 };
  const st = d.getState();
  d.destroy();
  const activeStart = 226;
  const activeLock = longest.start >= activeStart ? longest.n : 0;
  return {
    pinFarFence,
    final: { phase: st.phase, nextStep: st.nextStep, x: port.body.x, z: port.body.z, speed: port.body.speed },
    phases,
    longestLockFrames: longest,
    activeLockFraction: activeLock / (frames - activeStart),
    cleared: port.log.filter((l) => l === "clear|wander").length,
    stoodDown: port.log.filter((l) => l === "standDown|wander").length,
    timeline: samples,
  };
}

const free = run(false);
const pinned = run(true);
const plan0 = goldenWanderPlan(0);
const leg0 = composeWanderLeg({ x: 0, z: 0 }, plan0, { mu: 1 / (PHI * PHI), gravity: 74210 });
const filed0 = insetWanderArrivalTarget({ x: 0, z: 0 }, leg0.to);

const receipt = {
  id: "wave-wander-stop-120fps",
  createdAt: "2026-08-14T03:17:00-04:00",
  commit: "pending-second-commit",
  branch: "feature/wave-wander-stop",
  worktree: "C:/Users/funny/Documents/GasperStudio-worktrees/wave-wander-20260814",
  bookId: "GASPER-GROK-SUCCESSOR-003",
  workId: "W-WAVE-WANDER-001",
  ownerMotionAcceptance: "PENDING",
  live5179: "integration worktree ? not this branch; 5179 was not restarted",
  contactSheetPath: null,
  note: "JSON receipt from a 120fps driver sim that replays the recorded wall-pin (z = depthBandMax-14, residual 39.4). Playwright capture against 5179 would show the unfixed integration tree. Huge mp4/frames were not written.",
  beforeCapture: {
    source: "research/proofs/grok-successor-002/stage4-before-verticalDepthGain-1.00/samples.json",
    nextStepStuckAt: 1,
    plan: { step: 0, x: 442.244, z: 1018.5, mode: "deflected" },
    longestLock: { frames: 681, start: 369, end: 1049, pos: { x: 1321.7, z: 1186.6 }, speed: 39.4 },
    activeLockFraction: 681 / (1050 - 226),
  },
  law: {
    seed0: { x: plan0.x, z: plan0.z },
    composed: { x: leg0.to.x, z: leg0.to.z, mode: leg0.mode },
    filedInset: filed0,
    depthBandMax: WANDER_LAW.depthBandMax,
  },
  sim120fps: { free, pinned },
  tests: {
    command: "npx vitest run packages/desktop/src/gasper/behavior/GoldenWander.test.ts packages/desktop/src/gasper/behavior/LifeDirector.test.ts packages/desktop/src/gasper/behavior/EmbodimentLocomotion.test.ts",
    passed: 80,
    files: 3,
  },
  verdict: {
    planUpdates: pinned.final.nextStep >= 2 && free.final.nextStep >= 2,
    majorityNotPinned: pinned.activeLockFraction < 0.5 && free.activeLockFraction < 0.5,
    realStop: pinned.stoodDown + pinned.cleared > 0 && free.cleared > 0,
    ownerAcceptance: false,
  },
};

mkdirSync("research/proofs/grok-successor-002/wave-wander", { recursive: true });
writeFileSync(
  "research/proofs/grok-successor-002/wave-wander/receipt.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt.verdict, null, 2));
console.log("free nextStep", free.final.nextStep, "phases", free.phases);
console.log("pinned nextStep", pinned.final.nextStep, "stoodDown", pinned.stoodDown, "lock", pinned.longestLockFrames, "frac", pinned.activeLockFraction);
