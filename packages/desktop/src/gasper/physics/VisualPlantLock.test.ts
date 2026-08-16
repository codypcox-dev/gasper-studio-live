/**
 * R1 — world-locked plant projection.
 *
 * SupportExchange already sample-and-holds plantedWorld. The renderer used
 * to consume body-relative stepBaseXUnits, so the 2D foot rode the root.
 * gaitScreen.plantedScreenXUnits is the camera-lateral projection of
 * (plantedWorld - body). Reconstructing the plant as body.x + plantedScreenX
 * must not drift while support is held.
 */
import { describe, expect, it } from "vitest";
import type {
  GasperOrganismClockPort,
  OrganismClockFrame,
  OrganismClockSubscriber,
} from "../clock";

type OrganismClockSubscription = () => void;
import { createPhysicsField } from "./PhysicsField";
import { projectPlantedScreenX } from "./SupportExchange";
import {
  WorldPhysicsDriver,
  type WorldPhysicsDriverOutput,
} from "./WorldPhysicsDriver";

type Sub = {
  id: string;
  priority: number;
  onFrame: (frame: OrganismClockFrame) => void;
};

type ClockPick = Pick<GasperOrganismClockPort, "subscribe">;

class FakeClock implements ClockPick {
  private subs: Sub[] = [];
  private timeMs = 0;
  private frameIndex = 0;
  subscribe(sub: OrganismClockSubscriber): OrganismClockSubscription {
    const s: Sub = { id: sub.id, priority: sub.priority, onFrame: sub.onFrame };
    this.subs.push(s);
    return () => {
      this.subs = this.subs.filter((x) => x !== s);
    };
  }
  frame(deltaMs: number): void {
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
    for (const s of [...this.subs].sort((a, b) => a.priority - b.priority)) {
      s.onFrame(frame);
    }
  }
}

const collect = () => {
  const outs: WorldPhysicsDriverOutput[] = [];
  return { outs, push: (o: WorldPhysicsDriverOutput) => outs.push(o) };
};

describe("R1 visual plant lock", () => {
  const walk = (seconds: number, intent: { x: number; z: number; cruise: number }) => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    });
    d.setField(f);
    d.setLocomotion("wander", intent);
    const rows: Array<{
      body: ReturnType<WorldPhysicsDriver["getState"]>["body"];
      support: ReturnType<WorldPhysicsDriver["getState"]>["support"];
      out: WorldPhysicsDriverOutput;
    }> = [];
    const n = Math.round(seconds * 120);
    for (let i = 0; i < n; i++) {
      clock.frame(1000 / 120);
      const st = d.getState();
      rows.push({
        body: st.body,
        support: st.support,
        out: outs[outs.length - 1]!,
      });
    }
    return { d, rows };
  };

  it("projectPlantedScreenX is plantedWorldX - bodyX (Z is depth, not screen x)", () => {
    expect(projectPlantedScreenX(40, 800, 10, 200)).toBe(30);
    expect(projectPlantedScreenX(-12, 0, -12, 50)).toBe(0);
  });

  it("publishes plantedScreenXUnits as the projection of plantedWorld - body", () => {
    const { d, rows } = walk(2.2, { x: 0, z: 40000, cruise: 3200 });
    const planted = rows.filter((r) => r.support.planted);
    expect(planted.length).toBeGreaterThan(40);
    let checked = 0;
    for (const r of planted) {
      if (r.out.gait.speedRatio < 0.5) continue;
      const expected = projectPlantedScreenX(
        r.support.plantedWorldX,
        r.support.plantedWorldZ,
        r.body.x,
        r.body.z,
      );
      expect(r.out.gaitScreen.plantedScreenXUnits).toBeCloseTo(expected, 6);
      expect(r.out.gaitScreen.stepBaseXUnits).toBeDefined();
      checked += 1;
    }
    expect(checked).toBeGreaterThan(20);
    d.destroy();
  });

  it("reconstructed plant world X does not drift while support is held (anti-skate)", () => {
    const { d, rows } = walk(2.2, { x: 40000, z: 0, cruise: 3200 });
    const moving = rows.filter(
      (r) => r.support.planted && Math.hypot(r.body.vx, r.body.vz) > 800,
    );
    expect(moving.length).toBeGreaterThan(40);
    let maxHoldDrift = 0;
    let maxWorldDrift = 0;
    let holdFrames = 0;
    for (let i = 1; i < moving.length; i++) {
      const a = moving[i - 1]!;
      const b = moving[i]!;
      if (
        a.support.side === b.support.side &&
        a.support.planted &&
        b.support.planted
      ) {
        const worldDrift = Math.hypot(
          b.support.plantedWorldX - a.support.plantedWorldX,
          b.support.plantedWorldZ - a.support.plantedWorldZ,
        );
        const plantA = a.body.x + a.out.gaitScreen.plantedScreenXUnits;
        const plantB = b.body.x + b.out.gaitScreen.plantedScreenXUnits;
        maxWorldDrift = Math.max(maxWorldDrift, worldDrift);
        maxHoldDrift = Math.max(maxHoldDrift, Math.abs(plantB - plantA));
        holdFrames += 1;
      }
    }
    expect(holdFrames).toBeGreaterThan(20);
    expect(maxWorldDrift).toBeLessThan(1e-6);
    expect(maxHoldDrift).toBeLessThan(1e-6);
    const pathSpan = Math.abs(moving[moving.length - 1]!.body.x - moving[0]!.body.x);
    expect(pathSpan).toBeGreaterThan(400);
    d.destroy();
  });

  it("plantedScreenX does not track body.x one-for-one on an X leg (anti-skate velocity)", () => {
    const { d, rows } = walk(2.2, { x: 40000, z: 0, cruise: 3200 });
    const dt = 1 / 120;
    let nearZero = 0;
    let samples = 0;
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1]!;
      const b = rows[i]!;
      if (!a.support.planted || !b.support.planted) continue;
      if (a.support.side !== b.support.side) continue;
      const vScreen = (b.body.x - a.body.x) / dt;
      if (Math.abs(vScreen) < 800) continue;
      const dPlant =
        (b.out.gaitScreen.plantedScreenXUnits - a.out.gaitScreen.plantedScreenXUnits) /
        dt;
      const residual = dPlant + vScreen;
      expect(Math.abs(residual)).toBeLessThan(1e-3);
      if (Math.abs(residual) < 1e-6) nearZero += 1;
      samples += 1;
    }
    expect(samples).toBeGreaterThan(20);
    expect(nearZero).toBeGreaterThan(10);
    d.destroy();
  });

  it("keeps stepBaseXUnits as the S0 load carrier (does not replace it with the plant)", () => {
    const { d, rows } = walk(2.2, { x: 0, z: 40000, cruise: 3200 });
    const moving = rows.filter((r) => Math.abs(r.out.gaitScreen.stepBaseXUnits) > 1);
    expect(moving.length).toBeGreaterThan(10);
    const plants = moving.map((r) => r.out.gaitScreen.plantedScreenXUnits);
    const loads = moving.map((r) => r.out.gaitScreen.stepBaseXUnits);
    const same = plants.every((p, i) => Math.abs(p - loads[i]!) < 1e-9);
    expect(same).toBe(false);
    d.destroy();
  });

  it("strut 200 on X: plantedScreenX changes as COM walks past a held plant", () => {
    const { d, rows } = walk(5.2, { x: 40000, z: 48, cruise: 200 });
    const planted = rows.filter(
      (r) => r.support.planted && Math.hypot(r.body.vx, r.body.vz) > 80,
    );
    expect(planted.length).toBeGreaterThan(80);
    let maxScreenSpan = 0;
    let maxHoldDrift = 0;
    let holdFrames = 0;
    let side = planted[0]!.support.side;
    let screen0 = planted[0]!.out.gaitScreen.plantedScreenXUnits;
    let world0x = planted[0]!.support.plantedWorldX;
    let world0z = planted[0]!.support.plantedWorldZ;
    for (const r of planted) {
      if (r.support.side !== side) {
        side = r.support.side;
        screen0 = r.out.gaitScreen.plantedScreenXUnits;
        world0x = r.support.plantedWorldX;
        world0z = r.support.plantedWorldZ;
        continue;
      }
      holdFrames += 1;
      maxScreenSpan = Math.max(
        maxScreenSpan,
        Math.abs(r.out.gaitScreen.plantedScreenXUnits - screen0),
      );
      maxHoldDrift = Math.max(
        maxHoldDrift,
        Math.hypot(r.support.plantedWorldX - world0x, r.support.plantedWorldZ - world0z),
      );
    }
    expect(holdFrames).toBeGreaterThan(40);
    expect(maxHoldDrift).toBeLessThan(1e-6);
    // A 1 Hz strut stance is ~0.5–0.8s; at 200 u/s that is 100–160 world units
    // of COM travel past the foot. plantedScreenX must move with the COM.
    expect(maxScreenSpan).toBeGreaterThan(40);
    const uniquePlant = new Set(
      planted.map((r) => r.out.gaitScreen.plantedScreenXUnits.toFixed(2)),
    );
    expect(uniquePlant.size).toBeGreaterThan(8);
    d.destroy();
  });

  it("collapses plantedScreenXUnits at rest", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    });
    d.setField(f);
    d.setLocomotion("wander", { x: 0, z: 1200, cruise: 3200 });
    for (let i = 0; i < 180; i++) clock.frame(1000 / 120);
    d.standDownLocomotion("wander");
    for (let i = 0; i < 720; i++) clock.frame(1000 / 120);
    const last = outs[outs.length - 1]!;
    expect(last.gaitScreen.plantedScreenXUnits).toBe(0);
    expect(last.gaitScreen.stepBaseXUnits).toBe(0);
    d.destroy();
  });
});
