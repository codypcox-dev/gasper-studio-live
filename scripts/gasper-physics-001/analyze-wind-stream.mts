import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WorldPhysicsDriver } from "../../packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts";
import { windContourAsymmetryPx } from "../../packages/desktop/src/gasper/physics/FlightLaw.ts";
import type {
  GasperOrganismClockPort,
  OrganismClockFrame,
  OrganismClockSubscriber,
} from "../../packages/desktop/src/gasper/clock/index.ts";
import type { WorldPhysicsDriverOutput } from "../../packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts";
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
    for (const sub of [...this.subs].sort((a, b) => a.priority - b.priority)) sub.onFrame(frame);
  }
}

const DT = 1000 / 120;
const FPS = 120;
const LEG_FRAMES = Math.round(2.5 * FPS);
const CRUISE = 3200;
const PHI = (1 + Math.sqrt(5)) / 2;
const WIND_EPS_MAX_PX = 72 / (PHI * PHI * 4);

const clock = new FakeClock();
const outs: WorldPhysicsDriverOutput[] = [];
const d = new WorldPhysicsDriver(
  clock as Pick<GasperOrganismClockPort, "subscribe">,
  (o) => outs.push(o),
  () => "presence",
);
d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });

type Row = {
  i: number;
  t: number;
  leg: string;
  x: number;
  vx: number;
  pressure: number;
  dirX: number;
  trailDeltaPx: number;
  leadDeltaPx: number;
  asymmetryPx: number;
};

function sample(i: number, leg: string): Row {
  const st = d.getState();
  const out = outs[outs.length - 1];
  const pressure = out?.wind.pressure ?? 0;
  const dirX = out?.wind.dirX ?? 0;
  const asymmetryPx = windContourAsymmetryPx(pressure, dirX);
  const trailDeltaPx = pressure >= 0.004 && Math.abs(dirX) >= 0.004
    ? WIND_EPS_MAX_PX * pressure * Math.abs(dirX)
    : 0;
  return {
    i,
    t: (i + 1) / FPS,
    leg,
    x: st.body.x,
    vx: st.body.vx,
    pressure,
    dirX,
    trailDeltaPx,
    leadDeltaPx: trailDeltaPx === 0 ? 0 : -trailDeltaPx / PHI,
    asymmetryPx,
  };
}

const rows: Row[] = [];
function runLeg(targetX: number, leg: string) {
  d.setLocomotion("wander", { x: targetX, z: 0, cruise: CRUISE });
  const start = rows.length;
  for (let i = 0; i < LEG_FRAMES; i++) {
    clock.frame(DT);
    rows.push(sample(start + i, leg));
  }
}

runLeg(900, "+x");
runLeg(-900, "-x");
runLeg(900, "+x-return");
d.destroy();

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

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

const receipt = {
  generatedAt: now.toISOString(),
  generatedAtET: `${et} ET`,
  harness: "kernel-wind-stream-120fps",
  scenario: "presence-wind-reversal",
  ownerAcceptance: "PENDING",
  visualAcceptance: "PENDING_ARCHITECT_REVIEW",
  proofCommand: "npx tsx scripts/gasper-physics-001/analyze-wind-stream.mts",
  focusedTests:
    "npx vitest run packages/desktop/src/gasper/physics/FlightLaw.test.ts packages/desktop/src/gasper/physics/WorldPhysicsDriver.test.ts scripts/gasper-physics-001/proof-metrics.test.ts",
  live5179: "integration worktree, not this branch; 5179 was not restarted",
  contactSheetPath: null,
  before: {
    source: "research/proofs/grok-successor-002/wave-identity/wind-skip.json",
    negativePressureDeltaPx: null,
    bidirectionalTravelObserved: false,
    skippedBecause: "Stage 4 walk receipts only sampled one travel direction",
  },
  after: {
    sampleCount: rows.length,
    fps: FPS,
    plusXFrames: rows.filter((r) => r.leg.startsWith("+x")).length,
    minusXFrames: rows.filter((r) => r.leg === "-x").length,
    plusDirActiveSamples: plusDir.length,
    minusDirActiveSamples: minusDir.length,
    maxPressure: metric.maxPressure,
    maxAbsDirection: metric.maxAbsDirection,
    peakPlusAsymmetryPx: plusDir.length ? Math.max(...plusDir.map((r) => r.asymmetryPx)) : null,
    peakMinusAsymmetryPx: minusDir.length ? Math.min(...minusDir.map((r) => r.asymmetryPx)) : null,
    peakPlusTrailDeltaPx: plusDir.length ? Math.max(...plusDir.map((r) => r.trailDeltaPx)) : null,
    peakMinusTrailDeltaPx: minusDir.length ? Math.max(...minusDir.map((r) => r.trailDeltaPx)) : null,
    minX: Math.min(...rows.map((r) => r.x)),
    maxX: Math.max(...rows.map((r) => r.x)),
    positivePressureDeltaPx,
    negativePressureDeltaPx,
    windResistance: {
      ...metric,
      positivePressureDeltaPx,
      negativePressureDeltaPx,
    },
  },
  gates: {
    reverseDirectionSamplesExist: minusDir.length >= 3 && negativePressureDeltaPx != null,
    positivePressureDeltaPx: (positivePressureDeltaPx ?? 0) >= 0.5,
    negativePressureDeltaPx: (negativePressureDeltaPx ?? 0) <= -0.5,
    bothSignsAtLeastHalfPx:
      (positivePressureDeltaPx ?? 0) >= 0.5 && (negativePressureDeltaPx ?? 0) <= -0.5,
    windResistancePass: metric.pass === true,
    directionReversal: metric.directionReversalCount >= 1,
    noFrameDumps: true,
  },
  notes: [
    "JSON receipt only. No 120fps frame jpg/mp4 dumps. 5179 was not restarted.",
    "Kernel already lags wind.dirX both signs; renderer windStretchRadiusDelta already folds dirX<0.",
    "Harness forces +x then -x then +x cruise so negativePressureDeltaPx is published (N152 >= 0.5 px).",
    "No plant/stepRig, intentToMotion, or 2.5D worldRig edits. No windPressureForSpeed retune.",
  ],
};

const here = dirname(fileURLToPath(import.meta.url));
const out =
  process.env.GASPER_WIND_RECEIPT ||
  resolve(here, "../../research/proofs/grok-successor-002/wave-wind/receipt.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");

const pass = Object.values(receipt.gates).every(Boolean);
console.log(JSON.stringify({ out, gates: receipt.gates, positivePressureDeltaPx, negativePressureDeltaPx, maxPressure: metric.maxPressure }, null, 2));
if (!pass) throw new Error("WAVE_R5_WIND_GATES_FAILED");
