import { describe, expect, it } from "vitest";
import { deriveGait, GAIT_LAW } from "./GaitLaw";
import { createPhysicsField } from "./PhysicsField";
import {
  SUPPORT_REST,
  stepSupportExchange,
  projectPlantedScreenX,
  supportHold,
  supportVaultImpactSpeed,
  type SupportExchangeState,
} from "./SupportExchange";

const G = 74210;
const DT = 1 / 120;

function walkTick(
  prev: SupportExchangeState,
  phase: number,
  bodyX: number,
  bodyZ: number,
  vx: number,
  vz: number,
) {
  const speed = Math.hypot(vx, vz);
  const gait = deriveGait({
    speed,
    accelTangent: 0,
    gravity: G,
    phase,
    dt: DT,
  });
  const next = stepSupportExchange(prev, {
    walking: true,
    phase: gait.phase,
    stepHz: gait.stepHz,
    bobUnits: gait.bobUnits,
    swayUnits: gait.swayUnits,
    bodyX,
    bodyZ,
    vx,
    vz,
    dt: DT,
  });
  return { gait, next };
}

describe("SupportExchange — support-driven walk", () => {
  it("fails closed at rest: no plant, no impact, no cog, no angle", () => {
    const out = stepSupportExchange(SUPPORT_REST, {
      walking: false,
      phase: Math.PI,
      stepHz: 0,
      bobUnits: 40,
      swayUnits: 20,
      bodyX: 0,
      bodyZ: 0,
      vx: 0,
      vz: 0,
      dt: DT,
    });
    expect(out.planted).toBe(false);
    expect(out.impactSpeed).toBe(0);
    expect(out.cogX).toBe(0);
    expect(out.cogZ).toBe(0);
    expect(out.angle).toBe(0);
    expect(out.gatherTarget).toBe(0);
  });

  it("charges a non-zero vault impact at the first plant (Y=0 is not a reason to stay flat)", () => {
    const speed = 3200;
    let phase = 0;
    let support = SUPPORT_REST;
    let firstImpact = 0;
    for (let i = 0; i < 240; i++) {
      const z = speed * (i * DT);
      const tick = walkTick(support, phase, 0, z, 0, speed);
      phase = tick.gait.phase;
      support = tick.next;
      if (support.impactSpeed > firstImpact) firstImpact = support.impactSpeed;
    }
    expect(firstImpact).toBeGreaterThan(800);
    expect(supportVaultImpactSpeed(40, 3)).toBeGreaterThan(300);
  });

  it("projects plantedWorld - body onto screen x without tracking body.x one-for-one", () => {
    expect(projectPlantedScreenX(100, 400, 20, 50)).toBe(80);
    const bodyXs = [0, 40, 80, 120];
    const plantedWorldX = 200;
    const plants = bodyXs.map((x) => x + projectPlantedScreenX(plantedWorldX, 0, x, 0));
    expect(new Set(plants).size).toBe(1);
    expect(plants[0]).toBe(plantedWorldX);
  });

  it("world-locks the planted foot during support while the body travels (no skate)", () => {
    const speed = 3200;
    let phase = 0;
    let support = SUPPORT_REST;
    let holdDrift = 0;
    let holdFrames = 0;
    let bodyTravel = 0;
    let prevZ = 0;
    let prevPlantZ = 0;
    let sawHold = false;
    for (let i = 0; i < 360; i++) {
      const z = speed * (i * DT);
      const tick = walkTick(support, phase, 0, z, 0, speed);
      phase = tick.gait.phase;
      const hold = Math.abs(supportHold(tick.gait.phase));
      if (support.planted && tick.next.planted && support.side === tick.next.side && hold >= 0.9) {
        const plantDrift = Math.hypot(
          tick.next.plantedWorldX - support.plantedWorldX,
          tick.next.plantedWorldZ - support.plantedWorldZ,
        );
        holdDrift = Math.max(holdDrift, plantDrift);
        bodyTravel += Math.abs(z - prevZ);
        holdFrames += 1;
        sawHold = true;
      }
      prevZ = z;
      prevPlantZ = tick.next.plantedWorldZ;
      support = tick.next;
    }
    expect(sawHold).toBe(true);
    expect(holdFrames).toBeGreaterThan(30);
    expect(holdDrift).toBeLessThan(1e-6);
    expect(bodyTravel).toBeGreaterThan(200);
    expect(Math.abs(prevPlantZ)).toBeGreaterThan(0);
  });

  it("shifts CoG onto the planted support (lateral weight transfer is non-zero)", () => {
    const speed = 3200;
    let phase = 0;
    let support = SUPPORT_REST;
    let maxAbsCog = 0;
    let minCog = 0;
    let maxCog = 0;
    for (let i = 0; i < 360; i++) {
      const z = speed * (i * DT);
      const tick = walkTick(support, phase, 0, z, 0, speed);
      phase = tick.gait.phase;
      support = tick.next;
      maxAbsCog = Math.max(maxAbsCog, Math.abs(support.cogX), Math.abs(support.cogZ));
      minCog = Math.min(minCog, support.cogX);
      maxCog = Math.max(maxCog, support.cogX);
    }
    expect(maxAbsCog).toBeGreaterThan(8);
    expect(maxCog).toBeGreaterThan(8);
    expect(minCog).toBeLessThan(-8);
  });

  it("writes a bounded support angle (no spine, no zero-forever bank)", () => {
    const speed = 3200;
    let phase = 0;
    let support = SUPPORT_REST;
    let maxAbs = 0;
    for (let i = 0; i < 360; i++) {
      const z = speed * (i * DT);
      const tick = walkTick(support, phase, 0, z, 0, speed);
      phase = tick.gait.phase;
      support = tick.next;
      maxAbs = Math.max(maxAbs, Math.abs(support.angle));
    }
    expect(maxAbs).toBeGreaterThan(1);
    expect(maxAbs).toBeLessThanOrEqual(GAIT_LAW.maxGroundedLeanDeg + 1e-9);
  });

  it("keeps exchanging for a long walk, including a lateral (X) leg", () => {
    let phase = 0;
    let support = SUPPORT_REST;
    const speed = 3200;
    for (let i = 0; i < 240; i++) {
      const z = speed * (i * DT);
      const tick = walkTick(support, phase, 0, z, 0, speed);
      phase = tick.gait.phase;
      support = tick.next;
    }
    const afterDepth = support.exchangeCount;
    expect(afterDepth).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < 240; i++) {
      const x = speed * (i * DT);
      const tick = walkTick(support, phase, x, 800, speed, 0);
      phase = tick.gait.phase;
      support = tick.next;
    }
    expect(support.exchangeCount).toBeGreaterThan(afterDepth + 3);
  });

  it("compresses the plant and expands the incoming support — no whole-body gather", () => {
    const speed = 200;
    let phase = 0;
    let support = SUPPORT_REST;
    const plantC: number[] = [];
    const incomingC: number[] = [];
    const gathers: number[] = [];
    for (let i = 0; i < 720; i++) {
      const x = speed * (i * DT);
      const tick = walkTick(support, phase, x, 48, speed, 0);
      phase = tick.gait.phase;
      support = tick.next;
      const h = Math.abs(supportHold(tick.gait.phase));
      gathers.push(support.gatherTarget);
      if (support.planted && h >= 0.9) plantC.push(support.plantedCompress);
      if (h < 0.9) incomingC.push(support.incomingCompress);
    }
    expect(plantC.length).toBeGreaterThan(20);
    expect(Math.max(...plantC)).toBeGreaterThan(0.2);
    expect(Math.max(...incomingC)).toBeGreaterThan(0.1);
    expect(Math.max(...gathers)).toBeGreaterThan(0.05);
    expect(Math.max(...gathers)).toBeLessThanOrEqual(0.20);
  });

  it("N232 load peaks at mid-stance; swing stays up through single support", () => {
    const speed = 200;
    let phase = 0;
    let support = SUPPORT_REST;
    let midPlant = 0;
    let midSwing = 0;
    for (let i = 0; i < 720; i++) {
      const x = speed * (i * DT);
      const tick = walkTick(support, phase, x, 48, speed, 0);
      phase = tick.gait.phase;
      support = tick.next;
      const mid = Math.abs(Math.cos(tick.gait.phase / 2));
      if (support.planted && mid > 0.92) {
        midPlant = Math.max(midPlant, support.plantedCompress);
        midSwing = Math.max(midSwing, support.incomingCompress);
      }
    }
    expect(midPlant).toBeGreaterThan(0.55);
    expect(midSwing).toBeGreaterThan(0.55);
  });
  it("push-off along heading is the plant-to-plant travel, not an independent root slide", () => {
    const speed = 3200;
    let phase = 0;
    let support = SUPPORT_REST;
    let pushSum = 0;
    let pushes = 0;
    for (let i = 0; i < 360; i++) {
      const z = speed * (i * DT);
      const tick = walkTick(support, phase, 0, z, 0, speed);
      phase = tick.gait.phase;
      if (tick.next.pushOffAlong !== 0) {
        pushSum += Math.abs(tick.next.pushOffAlong);
        pushes += 1;
      }
      support = tick.next;
    }
    expect(pushes).toBeGreaterThanOrEqual(3);
    expect(pushSum).toBeGreaterThan(200);
  });

  it("stroll cruise: held plant is a readable stance, not a 32u COM tracker", () => {
    const speed = 200;
    let phase = 0;
    let support = SUPPORT_REST;
    let bestSpan = 0;
    let bestDrift = 0;
    let holdX: number | null = null;
    let holdStartBody = 0;
    let bodyX = 0;
    for (let i = 0; i < 720; i++) {
      bodyX = speed * (i * DT);
      const tick = walkTick(support, phase, bodyX, 48, speed, 0);
      phase = tick.gait.phase;
      const same =
        support.planted &&
        tick.next.planted &&
        support.plantedWorldX === tick.next.plantedWorldX &&
        support.plantedWorldZ === tick.next.plantedWorldZ;
      if (same) {
        if (holdX === null) {
          holdX = support.plantedWorldX;
          holdStartBody = bodyX - speed * DT;
        }
        const drift = Math.hypot(
          tick.next.plantedWorldX - holdX,
          tick.next.plantedWorldZ - support.plantedWorldZ,
        );
        bestDrift = Math.max(bestDrift, drift);
        bestSpan = Math.max(bestSpan, bodyX - holdStartBody);
      } else {
        holdX = null;
      }
      support = tick.next;
    }
    expect(bestDrift).toBeLessThan(1e-6);
    expect(bestSpan).toBeGreaterThanOrEqual(80);
  });

});


describe("SupportExchange field gravity sanity", () => {
  it("uses the live field gravity only through gait, never a second clock", () => {
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    expect(f).not.toBeNull();
    const gait = deriveGait({
      speed: 3200,
      accelTangent: 0,
      gravity: f!.gravityUnitsPerS2,
      phase: 0,
      dt: DT,
    });
    expect(gait.bobUnits).toBeGreaterThan(0);
    expect(gait.contactSquash).toBeGreaterThanOrEqual(0);
  });
});

describe("per-support compress / expand (not a hull duck)", () => {
  it("rest stays zero compress and zero flight", () => {
    const out = stepSupportExchange(SUPPORT_REST, {
      walking: false,
      phase: 0,
      stepHz: 0,
      bobUnits: 0,
      swayUnits: 0,
      bodyX: 0,
      bodyZ: 0,
      vx: 0,
      vz: 0,
      dt: DT,
    });
    expect(out.plantedCompress).toBe(0);
    expect(out.incomingCompress).toBe(0);
    expect(out.flight).toBe(0);
    expect(out.gatherTarget).toBe(0);
  });

  it("walk gather stays a step in 0.05–0.20, never 0.594", () => {
    let phase = 0;
    let support = SUPPORT_REST;
    let maxGather = 0;
    const speed = 200;
    for (let i = 0; i < 480; i++) {
      const x = speed * (i * DT);
      const tick = walkTick(support, phase, x, 48, speed, 10);
      phase = tick.gait.phase;
      support = stepSupportExchange(support, {
        walking: true,
        phase: tick.gait.phase,
        stepHz: tick.gait.stepHz,
        bobUnits: tick.gait.bobUnits,
        swayUnits: tick.gait.swayUnits,
        bodyX: x,
        bodyZ: 48,
        vx: speed,
        vz: 10,
        dt: DT,
        hopMix: 0.7,
        flightFrac: 0.3,
      });
      if (support.gatherTarget > maxGather) maxGather = support.gatherTarget;
    }
    expect(maxGather).toBeGreaterThan(0.05);
    expect(maxGather).toBeLessThanOrEqual(0.20);
  });
});

describe("Atlas Seat — plant, solve, lock (not a slide)", () => {
  it("a committed plant seats and leftover sway dies", () => {
    const speed = 200;
    let phase = 0;
    let support = SUPPORT_REST;
    let sawSeat = false;
    let minLeftover = 1;
    let maxGather = 0;
    for (let i = 0; i < 720; i++) {
      const x = speed * (i * DT);
      const tick = walkTick(support, phase, x, 48, speed, 0);
      phase = tick.gait.phase;
      support = tick.next;
      if (support.gatherTarget > maxGather) maxGather = support.gatherTarget;
      if (support.seated) {
        sawSeat = true;
        if (support.leftoverSway < minLeftover) minLeftover = support.leftoverSway;
      }
    }
    expect(sawSeat).toBe(true);
    expect(minLeftover).toBeLessThan(0.25);
    expect(maxGather).toBeGreaterThan(0.05);
    expect(maxGather).toBeLessThanOrEqual(0.20);
    expect(maxGather).toBeLessThan(0.5);
  });

  it("rest is not a seat (dead freeze is not a seat)", () => {
    expect(SUPPORT_REST.seated).toBe(false);
    expect(SUPPORT_REST.leftoverSway).toBe(0);
    expect(SUPPORT_REST.plantedCompress).toBe(0);
  });
});
