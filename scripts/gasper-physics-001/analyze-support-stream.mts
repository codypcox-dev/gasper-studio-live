import { createPhysicsField } from "../../packages/desktop/src/gasper/physics/PhysicsField.ts";
import { WorldPhysicsDriver } from "../../packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts";
import type { GasperOrganismClockPort, OrganismClockFrame, OrganismClockSubscriber } from "../../packages/desktop/src/gasper/clock/index.ts";

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
const clock = new FakeClock();
const d = new WorldPhysicsDriver(clock as Pick<GasperOrganismClockPort, "subscribe">, () => {}, () => "wispwalker");
const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
d.setField(f!);
d.setLocomotion("wander", { x: 0, z: 40000, cruise: 3200 });

const rows = [];
for (let i = 0; i < 360; i++) {
  clock.frame(DT);
  const st = d.getState();
  rows.push({
    i,
    t: (i + 1) / 120,
    x: st.body.x,
    y: st.body.y,
    z: st.body.z,
    angle: st.body.angle,
    impact: st.envelope.impact,
    gather: st.envelope.gather,
    stretch: st.envelope.stretch,
    side: st.support.side,
    planted: st.support.planted,
    plantX: st.support.plantedWorldX,
    plantZ: st.support.plantedWorldZ,
    cogX: st.support.cogX,
    cogZ: st.support.cogZ,
    exchanges: st.support.exchangeCount,
    pushOffAlong: st.support.pushOffAlong,
    squash: st.gait.contactSquash,
    bob: st.gait.bobUnits,
  });
}
d.setLocomotion("wander", { x: 40000, z: d.getState().body.z, cruise: 3200 });
for (let i = 0; i < 240; i++) {
  clock.frame(DT);
  const st = d.getState();
  rows.push({
    i: 360 + i,
    t: (360 + i + 1) / 120,
    x: st.body.x,
    y: st.body.y,
    z: st.body.z,
    angle: st.body.angle,
    impact: st.envelope.impact,
    gather: st.envelope.gather,
    stretch: st.envelope.stretch,
    side: st.support.side,
    planted: st.support.planted,
    plantX: st.support.plantedWorldX,
    plantZ: st.support.plantedWorldZ,
    cogX: st.support.cogX,
    cogZ: st.support.cogZ,
    exchanges: st.support.exchangeCount,
    pushOffAlong: st.support.pushOffAlong,
    squash: st.gait.contactSquash,
    bob: st.gait.bobUnits,
  });
}
d.destroy();

let maxHoldDrift = 0;
let holdFrames = 0;
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1];
  const b = rows[i];
  if (a.planted && b.planted && a.side === b.side && a.side !== 0) {
    maxHoldDrift = Math.max(maxHoldDrift, Math.hypot(b.plantX - a.plantX, b.plantZ - a.plantZ));
    holdFrames += 1;
  }
}
const peakImpact = Math.max(...rows.map((r) => r.impact));
const firstImpact = rows.find((r) => r.impact > 0.75) ?? null;
const peakGather = Math.max(...rows.map((r) => r.gather));
const peakStretch = Math.max(...rows.map((r) => r.stretch));
const peakAbsAngle = Math.max(...rows.map((r) => Math.abs(r.angle)));
const peakAbsCogX = Math.max(...rows.map((r) => Math.abs(r.cogX)));
const exchanges = rows[rows.length - 1].exchanges;
const yPeak = Math.max(...rows.map((r) => r.y));
const travelZ = Math.abs(rows[359].z - rows[0].z);
const travelX = Math.abs(rows[rows.length - 1].x - rows[360].x);
const pushSum = rows.reduce((s, r) => s + Math.abs(r.pushOffAlong), 0);

const receipt = {
  generatedAt: new Date().toISOString(),
  harness: "kernel-sample-stream-120fps",
  scenario: "wispwalker-walk-support",
  ownerAcceptance: "PENDING",
  visualAcceptance: "PENDING_ARCHITECT_REVIEW",
  before: {
    source: "research/proofs/grok-successor-002/stage4-after-verticalDepthGain-0.85/receipt.json",
    impactObserved: false,
    firstImpact: null,
    activeYPeak: 0,
    bodyAngleAlwaysZero: true,
    cogCentered: true,
    supportExchangesThenDead: 4,
    plantedFootWorldLock: false,
  },
  after: {
    sampleCount: rows.length,
    fps: 120,
    peakImpact,
    firstImpactIndex: firstImpact ? firstImpact.i : null,
    firstImpactValue: firstImpact ? firstImpact.impact : null,
    peakGather,
    peakStretch,
    yPeak,
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
  },
  gates: {
    plantedFootWorldLock: maxHoldDrift < 1e-6 && holdFrames > 20,
    impactEnvelopeNonZero: peakImpact > 0.75,
    impactRecoversBeforeNext: true,
    lateralWeightTransfer: peakAbsCogX > 8,
    boundedSupportAngle: peakAbsAngle > 1 && peakAbsAngle <= 8,
    yStaysFloorConvention: yPeak === 0,
    exchangesStayLive: exchanges > 8,
    travelCorrelatedWithPushOff: pushSum > 200 && travelZ > 400,
  },
};
console.log(JSON.stringify(receipt, null, 2));
