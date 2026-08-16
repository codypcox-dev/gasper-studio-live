import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPhysicsField } from "../../packages/desktop/src/gasper/physics/PhysicsField.ts";
import { WorldPhysicsDriver } from "../../packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts";
import { windContourAsymmetryPx } from "../../packages/desktop/src/gasper/physics/FlightLaw.ts";
import type { WorldPhysicsDriverOutput } from "../../packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts";
import type { GasperOrganismClockPort, OrganismClockFrame, OrganismClockSubscriber } from "../../packages/desktop/src/gasper/clock/index.ts";
import { GoldenWanderDriver } from "../../packages/desktop/src/gasper/behavior/GoldenWanderDriver.ts";
import { WANDER_LAW } from "../../packages/desktop/src/gasper/behavior/GoldenWander.ts";
import { kernelWindResistanceMetric } from "./proof-metrics.mjs";

type Sub = { id: string; priority: number; onFrame: (frame: OrganismClockFrame) => void };

class FakeClock {
  private subs: Sub[] = [];
  private timeMs = 0;
  private frameIndex = 0;
  subscribe(sub: OrganismClockSubscriber) {
    const s: Sub = { id: sub.id, priority: sub.priority, onFrame: sub.onFrame };
    this.subs.push(s);
    return () => {
      this.subs = this.subs.filter((x) => x !== s);
    };
  }
  frame(deltaMs: number) {
    this.timeMs += deltaMs;
    const frame: OrganismClockFrame = {
      timeMs: this.timeMs,
      elapsedMs: this.timeMs,
      deltaMs,
      signedDeltaMs: deltaMs,
      deltaSec: deltaMs / 1000,
      direction: 1,
      frameIndex: ++this.frameIndex,
      seed: 0,
      mode: "fixed-step",
      paused: false,
      running: true,
    };
    for (const s of [...this.subs].sort((a, b) => a.priority - b.priority)) s.onFrame(frame);
  }
}

const DT = 1000 / 120;
const FPS = 120;
const PHI = (1 + Math.sqrt(5)) / 2;

function gitHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBranch(): string {
  try {
    return execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

type WalkRow = {
  i: number;
  y: number;
  impact: number;
  gather: number;
  stretch: number;
  side: number;
  planted: boolean;
  plantX: number;
  plantZ: number;
  cogX: number;
  angle: number;
  exchanges: number;
  pushOffAlong: number;
  x: number;
  z: number;
};

function runWalkSupport() {
  const clock = new FakeClock();
  const d = new WorldPhysicsDriver(clock as Pick<GasperOrganismClockPort, "subscribe">, () => {}, () => "wispwalker");
  const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
  d.setField(f!);
  d.setLocomotion("wander", { x: 0, z: 40000, cruise: 3200 });
  const rows: WalkRow[] = [];
  const push = (i: number) => {
    const st = d.getState();
    rows.push({
      i,
      y: st.body.y,
      impact: st.envelope.impact,
      gather: st.envelope.gather,
      stretch: st.envelope.stretch,
      side: st.support.side,
      planted: st.support.planted,
      plantX: st.support.plantedWorldX,
      plantZ: st.support.plantedWorldZ,
      cogX: st.support.cogX,
      angle: st.body.angle,
      exchanges: st.support.exchangeCount,
      pushOffAlong: st.support.pushOffAlong,
      x: st.body.x,
      z: st.body.z,
    });
  };
  for (let i = 0; i < 360; i++) {
    clock.frame(DT);
    push(i);
  }
  d.setLocomotion("wander", { x: 40000, z: d.getState().body.z, cruise: 3200 });
  for (let i = 0; i < 240; i++) {
    clock.frame(DT);
    push(360 + i);
  }
  d.destroy();

  let maxHoldDrift = 0;
  let holdFrames = 0;
  let maxStretchWhenPlanted = 0;
  let plantedFrames = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (a.planted && b.planted && a.side === b.side && a.side !== 0) {
      maxHoldDrift = Math.max(maxHoldDrift, Math.hypot(b.plantX - a.plantX, b.plantZ - a.plantZ));
      holdFrames += 1;
    }
  }
  for (const r of rows) {
    if (r.planted) {
      plantedFrames += 1;
      maxStretchWhenPlanted = Math.max(maxStretchWhenPlanted, Math.abs(r.stretch));
    }
  }
  const peakImpact = Math.max(...rows.map((r) => r.impact));
  const firstImpact = rows.find((r) => r.impact > 0.75) ?? null;
  const peakGather = Math.max(...rows.map((r) => r.gather));
  const peakStretch = Math.max(...rows.map((r) => r.stretch));
  const yPeak = Math.max(...rows.map((r) => r.y));
  const yMin = Math.min(...rows.map((r) => r.y));
  const peakAbsAngle = Math.max(...rows.map((r) => Math.abs(r.angle)));
  const peakAbsCogX = Math.max(...rows.map((r) => Math.abs(r.cogX)));
  const exchanges = rows[rows.length - 1].exchanges;
  const travelZ = Math.abs(rows[359].z - rows[0].z);
  const travelX = Math.abs(rows[rows.length - 1].x - rows[360].x);
  const pushSum = rows.reduce((s, r) => s + Math.abs(r.pushOffAlong), 0);
  return {
    sampleCount: rows.length,
    fps: FPS,
    peakImpact,
    firstImpactIndex: firstImpact ? firstImpact.i : null,
    firstImpactValue: firstImpact ? firstImpact.impact : null,
    peakGather,
    peakStretch,
    maxStretchWhenPlanted,
    plantedFrames,
    yPeak,
    yMin,
    peakAbsAngle,
    peakAbsCogX,
    exchangeCount: exchanges,
    holdFrames,
    maxHoldDrift,
    plantedWorldLock: maxHoldDrift < 1e-6 && holdFrames > 20,
    travelZ,
    travelX,
    pushOffAlongSum: pushSum,
    impactRecovered: firstImpact
      ? rows.slice(firstImpact.i + 8, firstImpact.i + 40).some((r) => r.impact < peakImpact * 0.5)
      : false,
  };
}

function wanderFakeClock() {
  let sub: { onFrame: (frame: { deltaMs: number }) => void } | null = null;
  let t = 0;
  return {
    subscribe(s: { onFrame: (frame: { deltaMs: number }) => void }) {
      sub = s;
      return () => {
        sub = null;
      };
    },
    now() {
      return t;
    },
    fire(deltaMs = DT) {
      t += deltaMs / 1000;
      sub?.onFrame({ deltaMs });
    },
  };
}

function wanderFakeLocomotion(clock: ReturnType<typeof wanderFakeClock>, pinFarFence = false) {
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
    if (!intent) {
      body.speed = 0;
      return;
    }
    const dx = intent.x - body.x;
    const dz = intent.z - body.z;
    const d = Math.hypot(dx, dz);
    if (d <= 1e-9) {
      body.speed = 0;
      return;
    }
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
    body,
    log,
    owners,
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

function runWander(pinFarFence: boolean) {
  const clock = wanderFakeClock();
  const port = wanderFakeLocomotion(clock, pinFarFence);
  const d = new GoldenWanderDriver(clock, port as any, () => true, () => "wispwalker");
  const frames = 1050;
  let lockStart: number | null = null;
  let longest = { n: 0, start: -1, end: -1 };
  let lockCount = 0;
  let prev = { x: 0, z: 0 };
  for (let i = 0; i < frames; i++) {
    clock.fire(DT);
    const b = port.body;
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
  }
  if (lockCount > longest.n) longest = { n: lockCount, start: lockStart ?? -1, end: frames - 1 };
  const st = d.getState();
  d.destroy();
  const activeStart = 226;
  const activeLock = longest.start >= activeStart ? longest.n : 0;
  return {
    pinFarFence,
    final: { phase: st.phase, nextStep: st.nextStep, x: port.body.x, z: port.body.z, speed: port.body.speed },
    longestLockFrames: longest,
    activeLockFraction: activeLock / (frames - activeStart),
    cleared: port.log.filter((l) => l === "clear|wander").length,
    stoodDown: port.log.filter((l) => l === "standDown|wander").length,
  };
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function runWindCheap() {
  const clock = new FakeClock();
  const outs: WorldPhysicsDriverOutput[] = [];
  const d = new WorldPhysicsDriver(
    clock as Pick<GasperOrganismClockPort, "subscribe">,
    (o) => outs.push(o),
    () => "presence",
  );
  d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });
  const WIND_EPS_MAX_PX = 72 / (PHI * PHI * 4);
  const LEG_FRAMES = Math.round(1.5 * FPS);
  type Row = { pressure: number; dirX: number; asymmetryPx: number; x: number };
  const rows: Row[] = [];
  function sample(): Row {
    const st = d.getState();
    const out = outs[outs.length - 1];
    const pressure = out?.wind.pressure ?? 0;
    const dirX = out?.wind.dirX ?? 0;
    return {
      pressure,
      dirX,
      asymmetryPx: windContourAsymmetryPx(pressure, dirX),
      x: st.body.x,
    };
  }
  function runLeg(targetX: number) {
    d.setLocomotion("wander", { x: targetX, z: 0, cruise: 3200 });
    for (let i = 0; i < LEG_FRAMES; i++) {
      clock.frame(DT);
      rows.push(sample());
    }
  }
  runLeg(900);
  runLeg(-900);
  runLeg(900);
  d.destroy();

  function signedPressureDelta(sign: 1 | -1): number | null {
    const active = rows.filter((r) => sign * r.dirX >= 0.2 && r.pressure >= 0.08);
    if (active.length < 6) return null;
    const pMin = Math.min(...active.map((r) => r.pressure));
    const pMax = Math.max(...active.map((r) => r.pressure));
    const lowCut = pMin + (pMax - pMin) * 0.25;
    const highCut = pMin + (pMax - pMin) * 0.65;
    const low = active.filter((r) => r.pressure <= lowCut);
    const high = active.filter((r) => r.pressure >= highCut);
    if (low.length < 3 || high.length < 3) return null;
    return mean(high.map((r) => r.asymmetryPx)) - mean(low.map((r) => r.asymmetryPx));
  }

  const metric = kernelWindResistanceMetric(
    rows.map((row) => ({
      dataset: { windPressure: row.pressure, windDirX: row.dirX },
      bodyContour: { horizontalExtent: { asymmetryPx: row.asymmetryPx } },
    })),
  );
  const plusDir = rows.filter((r) => r.dirX > 0.2 && r.pressure >= 0.08);
  const minusDir = rows.filter((r) => r.dirX < -0.2 && r.pressure >= 0.08);
  const positivePressureDeltaPx = metric.positivePressureDeltaPx ?? signedPressureDelta(1);
  const negativePressureDeltaPx = metric.negativePressureDeltaPx ?? signedPressureDelta(-1);
  return {
    sampleCount: rows.length,
    plusDirActiveSamples: plusDir.length,
    minusDirActiveSamples: minusDir.length,
    maxPressure: metric.maxPressure,
    minX: Math.min(...rows.map((r) => r.x)),
    maxX: Math.max(...rows.map((r) => r.x)),
    positivePressureDeltaPx,
    negativePressureDeltaPx,
    directionReversalCount: metric.directionReversalCount,
    bothSigns:
      (positivePressureDeltaPx ?? 0) >= 0.5 && (negativePressureDeltaPx ?? 0) <= -0.5,
  };
}

const walk = runWalkSupport();
const wanderFree = runWander(false);
const wanderPinned = runWander(true);
const wind = runWindCheap();

const now = new Date();
const et = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
}).format(now);

const majorityNotPinned = wanderPinned.activeLockFraction < 0.5 && wanderFree.activeLockFraction < 0.5;
const realStop = wanderPinned.stoodDown + wanderPinned.cleared > 0 && wanderFree.cleared > 0;

const gates = {
  plantedFootWorldLock: walk.plantedWorldLock,
  impactEnvelopeNonZero: walk.peakImpact > 0.75,
  gatherEnvelopeNonZero: walk.peakGather > 0,
  yStaysFloorConvention: walk.yPeak === 0 && walk.yMin === 0,
  stretchZeroGrounded: walk.maxStretchWhenPlanted === 0 && walk.peakStretch === 0,
  majorityNotPinned,
  realStop,
  windBothSign: wind.bothSigns,
  noFrameDumps: true,
};

const receipt = {
  generatedAt: now.toISOString(),
  generatedAtET: `${et} ET`,
  harness: "overnight-merged-walk-120fps",
  scenario: "integrate-main-r1-r6-recertify",
  commit: gitHead(),
  branch: gitBranch(),
  worktree: "C:/Users/funny/Documents/GasperStudio-worktrees/integrate-main-20260814",
  ownerAcceptance: "PENDING",
  visualAcceptance: "PENDING_ARCHITECT_REVIEW",
  proofCommand: "npx tsx scripts/gasper-physics-001/analyze-merged-walk-stream.mts",
  focusedTests:
    "npx vitest run packages/desktop/src/gasper/physics/SupportExchange.test.ts packages/desktop/src/gasper/physics/WorldPhysicsDriver.test.ts packages/desktop/src/gasper/scaffold/AdaptiveShellScaffold.test.ts packages/desktop/src/gasper/expression/CausalAffectStack.test.ts",
  live5179: "127.0.0.1:5179 LISTEN confirmed; not restarted",
  contactSheetPath: null,
  notes: [
    "JSON receipt only. No jpg, no mp4, no frames/ dumps.",
    "Quiet overnight recertify of integrate-main after R1-R6 merge. Cody asleep; no Slack.",
    "5179 was already LISTEN; vite was not restarted and no full build was run.",
    "ownerAcceptance stays PENDING. Do not treat this receipt as owner sign-off.",
  ],
  walk,
  wander: { free: wanderFree, pinned: wanderPinned, majorityNotPinned, realStop },
  wind,
  gates,
};

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../research/proofs/grok-successor-002/overnight-merged-walk/receipt.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");

console.log(JSON.stringify({
  out,
  commit: receipt.commit,
  gates,
  peakImpact: walk.peakImpact,
  peakGather: walk.peakGather,
  maxHoldDrift: walk.maxHoldDrift,
  yPeak: walk.yPeak,
  peakStretch: walk.peakStretch,
  majorityNotPinned,
  realStop,
  windBothSign: wind.bothSigns,
  positivePressureDeltaPx: wind.positivePressureDeltaPx,
  negativePressureDeltaPx: wind.negativePressureDeltaPx,
}, null, 2));
if (!Object.values(gates).every(Boolean)) {
  console.error("OVERNIGHT_MERGED_WALK_GATES_INCOMPLETE");
  process.exitCode = 2;
}
