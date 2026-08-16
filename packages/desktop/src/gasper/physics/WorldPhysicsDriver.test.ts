/**
 * GASPER-SPACE-001 PHASE B — WorldPhysicsDriver tests.
 *
 * Fake organism clock: the driver must integrate ONLY on subscriber frames —
 * no wall-clock, no timers — and every launch must be deterministic.
 */
import { describe, expect, it } from "vitest";
import type {
  GasperOrganismClockPort,
  OrganismClockFrame,
  OrganismClockSubscriber,
} from "../clock";

type OrganismClockSubscription = () => void;
import { admitPhysicsSilhouetteDeltas } from "./PhysicsSilhouetteAuthority";
import { supportHold } from "./SupportExchange";
import { createPhysicsField, fieldAfterResize } from "./PhysicsField";
import { booBobUnits } from "./BooFlightLaw";
import {
  comfortCruiseBand,
  GAIT_ANTICIPATION_DURATION_SECONDS,
  GAIT_LAW,
  GAIT_LEG_UNITS,
  GAIT_LOBE,
} from "./GaitLaw";
import { FLIGHT_LAW } from "./FlightLaw";
import { REST_DRIFT_UNITS_PER_SEC } from "../behavior/EmbodimentLocomotion";
import { PHI, PHI_LAW } from "./PhiLaw";
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
  /** Advance by deltaMs and deliver one frame to every subscriber. */
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

const runFor = (clock: FakeClock, seconds: number, stepMs = 16) => {
  const n = Math.round((seconds * 1000) / stepMs);
  for (let i = 0; i < n; i++) clock.frame(stepMs);
};

describe("WorldPhysicsDriver", () => {
  it("exposes a construction-lock snapshot for the sole physics pose writer", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce({ x0: -600, vx: 520, vy: 1500 });
    clock.frame(16);

    const snapshot = (
      d as unknown as {
        inspectPhysicsAuthority?: () => {
          packet: string;
          writer: string;
          emissionCount: number;
          bodyPoseMatchesOutput: boolean;
          provenance: string | null;
          outputPose: { x: number; y: number; z: number } | null;
        };
      }
    ).inspectPhysicsAuthority?.();

    expect(snapshot?.packet).toBe("GASPER-PHYSICS-AUTHORITY-001");
    expect(snapshot?.writer).toBe("world-physics-driver");
    expect(snapshot?.emissionCount).toBeGreaterThan(0);
    expect(snapshot?.bodyPoseMatchesOutput).toBe(true);
    expect(snapshot?.provenance).toBe("physics-authority");
    expect(snapshot?.outputPose?.x).toBeCloseTo(d.getState().body.x, 9);
    expect(snapshot?.outputPose?.y).toBeCloseTo(d.getState().body.y, 9);
    expect(snapshot?.outputPose?.z).toBeCloseTo(d.getState().body.z, 9);
    d.destroy();
  });

  it("keeps physics output inside the production envelope it is given", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setRenderableWorldBoundsAt(() => ({
      xMin: -10,
      xMax: 10,
      yMax: 5,
      zMin: -320,
      zMax: 3566,
    }));
    d.launchBounce({ x0: 0, vx: 520, vy: 1500 });

    clock.frame(1000 / 60);

    const out = outs.at(-1)!;
    expect(out.pose.x).toBeGreaterThanOrEqual(-10);
    expect(out.pose.x).toBeLessThanOrEqual(10);
    expect(out.pose.y).toBeGreaterThanOrEqual(0);
    expect(out.pose.y).toBeLessThanOrEqual(5);
    expect(out.pose.x).toBe(d.getState().body.x);
    expect(out.pose.y).toBe(d.getState().body.y);
    d.destroy();
  });

  it("forwards nothing while idle", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    runFor(clock, 1);
    expect(outs).toHaveLength(0);
    d.destroy();
  });

  it("ramps Wispwalker gait into the floor instead of inserting full expression on entry", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 }));
    d.setLocomotion("wander", { x: 40000, z: 0, cruise: 3200 });

    clock.frame(1000 / 120);

    const first = outs.at(-1)!;
    expect(d.getState().body.contact).toBe(true);
    expect(first.gaitScreen.bobLiftUnits).toBeLessThan(0.5);
    expect(Math.abs(first.pose.tilt)).toBeLessThan(2);
    d.destroy();
  });

  it("holds a target-direction anticipation beat before traction launch", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 }));
    d.setLocomotion("wander", { x: 40000, z: 0, cruise: 3200 });

    clock.frame(1000 / 120);
    const first = outs.at(-1)!;
    // Anticipation is a short, bounded opposite-sign weight shift. It must be
    // visible in the physics-authority pose before the body spends traction.
    expect(Math.abs(first.pose.x)).toBeLessThan(1e-9);
    expect(first.pose.tilt).toBeLessThan(0);
    expect(Math.abs(first.gaitScreen.stepBaseXUnits)).toBeGreaterThan(0);

    for (let i = 0; i < 30; i += 1) clock.frame(1000 / 120);
    expect(d.getState().body.x).toBeGreaterThan(0);
    expect(outs.at(-1)!.pose.tilt).toBeGreaterThan(first.pose.tilt);
    d.destroy();
  });

  it("does not retire an internal leg while its held target is away from home", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 }));
    d.setLocomotion("internal", { x: 40000, z: 0, cruise: 3200 });

    clock.frame(1000 / 120);
    expect(d.getState().mode).toBe("locomotion");
    expect(Math.abs(d.getState().body.x)).toBeLessThan(1e-9);
    expect(outs.at(-1)!.pose.tilt).toBeLessThan(0);
    d.destroy();
  });

  it("does not snap grounded lean off when traction reaches cruise", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 }));
    d.setLocomotion("wander", { x: 40000, z: 0, cruise: 3200 });

    runFor(clock, 0.5, 1000 / 120);

    expect(outs.length).toBeGreaterThan(10);
    let maxAdjacentTiltDelta = 0;
    for (let i = 1; i < outs.length; i += 1) {
      maxAdjacentTiltDelta = Math.max(
        maxAdjacentTiltDelta,
        Math.abs(outs[i].pose.tilt - outs[i - 1].pose.tilt),
      );
    }
    expect(maxAdjacentTiltDelta).toBeLessThan(3);
    d.destroy();
  });

  it("carries grounded lean through the final floor settle instead of cutting at the speed epsilon", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 }));
    d.setLocomotion("wander", { x: 280, z: 0, cruise: 3200 });

    runFor(clock, 2, 1000 / 120);

    let maxAdjacentTiltDelta = 0;
    for (let i = 1; i < outs.length; i += 1) {
      maxAdjacentTiltDelta = Math.max(
        maxAdjacentTiltDelta,
        Math.abs(outs[i].pose.tilt - outs[i - 1].pose.tilt),
      );
    }
    expect(maxAdjacentTiltDelta).toBeLessThan(3);
    d.destroy();
  });

  it("holds an authored floor target inside the arrival band without micro-reversing", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 }));
    d.setLocomotion("wander", { x: 280, z: 0, cruise: 3200 });

    const velocities: number[] = [];
    for (let i = 0; i < 240; i += 1) {
      clock.frame(1000 / 120);
      velocities.push(d.getState().body.vx);
    }

    const tail = velocities.slice(-24);
    expect(outs.length).toBe(240);
    expect(tail.length).toBe(24);
    expect(Math.max(...tail.map((vx) => Math.abs(vx)))).toBeLessThan(1e-9);
    expect(Math.abs(d.getState().body.x - 280)).toBeLessThan(6);
    d.destroy();
  });

  it("subscribes as world-physics at priority 25", () => {
    const seen: { id: string; priority: number }[] = [];
    const spy: ClockPick = {
      subscribe: (sub: OrganismClockSubscriber) => {
        seen.push({ id: sub.id, priority: sub.priority });
        return () => {};
      },
    };
    const d = new WorldPhysicsDriver(spy, () => {});
    d.destroy();
    expect(seen).toEqual([{ id: "world-physics", priority: 25 }]);
  });

  it("launchBounce flies up, travels, and forwards physics-authority poses", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce({ x0: -600, vx: 520, vy: 1500 });
    runFor(clock, 0.4);
    expect(outs.length).toBeGreaterThan(10);
    for (const o of outs) expect(o.pose.provenance).toBe("physics-authority");
    const mid = outs[Math.floor(outs.length / 2)];
    expect(mid.pose.y).toBeGreaterThan(200); // airborne altitude
    expect(mid.pose.x).toBeGreaterThan(-600); // travelling +x
    expect(mid.lightSpeed).toBeGreaterThan(0);
    // In flight the wake feed mirrors velocity in living units (+y down flip).
    expect(mid.wakeVY).toBeLessThan(0);
    d.destroy();
  });

  it("keeps a bounce's lateral drift from authoring a travel-facing turn", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");
    d.launchBounce({ x0: -600, vx: 520, vy: 1500 });
    runFor(clock, 0.8);
    expect(outs.length).toBeGreaterThan(10);
    for (const out of outs) expect(out.facingBearingDeg).toBeNull();
    d.destroy();
  });

  it("field-backed default bounce derives a readable apex from the organism scale", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const field = createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 900,
      homeHeightPx: 153,
    });
    expect(field).not.toBeNull();
    d.setField(field!);

    // The public default launch must remain visible when the environment has
    // replaced the authored fallback gravity with the φ-scale field gravity.
    d.launchBounce({ x0: -600 });
    runFor(clock, 0.45, 1000 / 120);

    const peak = Math.max(...outs.map((out) => out.pose.y));
    const readableApex = PHI_LAW.apexLadder[1] * field!.homeHeightUnits;
    expect(peak).toBeGreaterThan(readableApex * 0.7);
    expect(outs.some((out) => out.pose.y > field!.homeHeightUnits * 0.25)).toBe(true);
    d.destroy();
  });

  it("field-backed default comet crosses a readable span before it settles", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");
    const field = createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 900,
      homeHeightPx: 153,
    });
    expect(field).not.toBeNull();
    d.setField(field!);
    d.setParams({ launchPower: 1.2 });

    d.launchComet({ x0: -700, gatherSeconds: 0.4 });
    // The φ-loaded release is deliberately observable before the span gate;
    // include the full load rhythm plus the authored flight window.
    runFor(clock, 1.2, 1000 / 120);

    const flight = outs.filter((out) => out.pose.provenance === "physics-authority");
    const travel = Math.max(...flight.map((out) => out.pose.x)) - Math.min(...flight.map((out) => out.pose.x));
    const peak = Math.max(...flight.map((out) => out.pose.y));
    expect(travel).toBeGreaterThan(field!.homeHeightUnits * 0.5);
    expect(peak).toBeGreaterThan(field!.homeHeightUnits * 0.2);
    d.destroy();
  });

  it("impact charges the squash envelope into bounded silhouette deltas", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce({ x0: 0, vx: 100, vy: 1400 });
    runFor(clock, 1.6); // first bounce completes well inside this window
    const squashed = outs.find(
      (o) => (o.silhouetteDeltas.overall_height ?? 0) < -0.05,
    );
    expect(squashed).toBeDefined();
    expect(squashed!.silhouetteDeltas.overall_width ?? 0).toBeGreaterThan(0.05);
    expect(squashed!.silhouetteDeltas.ground_flattening ?? 0).toBeGreaterThan(0.05);
    // Fence: no delta may exceed PHYSICS_CHANNEL_BOUNDS.
    for (const o of outs) {
      expect(o.silhouetteDeltas.overall_height ?? 0).toBeGreaterThanOrEqual(-0.35);
      expect(o.silhouetteDeltas.overall_height ?? 0).toBeLessThanOrEqual(0.18);
      expect(o.silhouetteDeltas.overall_width ?? 0).toBeGreaterThanOrEqual(-0.16);
      expect(o.silhouetteDeltas.overall_width ?? 0).toBeLessThanOrEqual(0.3);
      expect(o.silhouetteDeltas.ground_flattening ?? 0).toBeGreaterThanOrEqual(0);
      expect(o.silhouetteDeltas.ground_flattening ?? 0).toBeLessThanOrEqual(0.6);
    }
    d.destroy();
  });

  it("settles, holds 1s, then releases with provenance none and zeroed feeds", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce({ x0: 0, vx: 260, vy: 900 });
    runFor(clock, 8);
    const last = outs[outs.length - 1];
    expect(last.pose.provenance).toBe("none");
    expect(last.pose).toMatchObject({ x: 0, y: 0, z: 0, tilt: 0 });
    expect(last.wakeVX).toBe(0);
    expect(last.wakeVY).toBe(0);
    expect(last.lightSpeed).toBe(0);
    expect(last.silhouetteDeltas).toEqual({});
    // After release the driver is idle: no further forwards.
    const count = outs.length;
    runFor(clock, 0.5);
    expect(outs.length).toBe(count);
    expect(d.getState().mode).toBe("idle");
    d.destroy();
  });

  it("launchComet gathers at the start spot, then fires with travel tilt", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchComet({ x0: -700, vx: 2100, vy: 950, gatherSeconds: 0.5 });
    runFor(clock, 0.3); // inside the gather hold
    const gathering = outs[outs.length - 1];
    expect(gathering.pose.x).toBeCloseTo(-700, 1);
    expect(gathering.pose.y).toBe(0);
    expect((gathering.take ?? 0) > 0.2 || (gathering.silhouetteDeltas.overall_height ?? 0) < 0)
      .toBe(true); // TAKE expand overlaps PREP crouch
    expect(gathering.take ?? 0).toBeGreaterThan(0.2);
    expect(gathering.lightSpeed).toBeGreaterThan(0.4);
    runFor(clock, 1.2); // gather ends, the shot flies
    const flying = outs[outs.length - 1];
    expect(flying.pose.provenance).toBe("physics-authority");
    expect(flying.pose.x).toBeGreaterThan(-700);
    expect(flying.lightSpeed).toBeGreaterThan(2);
    d.destroy();
  });

  it("inherits the active body position when comet gather begins without x0", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");

    d.setLocomotion("wander", { x: 180, z: 0, cruise: 180 });
    runFor(clock, 0.5, 1000 / 120);
    const before = d.getState().body.x;
    expect(before).toBeGreaterThan(0);

    d.launchComet({ gatherSeconds: 0.5 });

    expect(d.getState().mode).toBe("comet-gather");
    expect(d.getState().body.x).toBeCloseTo(before, 6);
    d.destroy();
  });

  it("ignores authored x0 when a live body is already planted", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");

    d.setLocomotion("life", { x: 240, z: 40, cruise: 220 });
    runFor(clock, 0.6, 1000 / 120);
    const before = d.getState().body;
    expect(before.x).toBeGreaterThan(0);

    d.launchComet({ x0: 0, z0: 0, gatherSeconds: 0.5, vx: 400 });

    const after = d.getState().body;
    expect(d.getState().mode).toBe("comet-gather");
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.z).toBeCloseTo(before.z, 6);
    d.destroy();
  });

  it("inherits the last visible body position after locomotion disarms", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");

    d.setLocomotion("wander", { x: 180, z: 0, cruise: 180 });
    runFor(clock, 0.5, 1000 / 120);
    const before = d.getState().body.x;
    expect(before).toBeGreaterThan(0);

    d.disarm();
    d.launchComet({ gatherSeconds: 0.5 });

    expect(d.getState().mode).toBe("comet-gather");
    expect(d.getState().body.x).toBeCloseTo(before, 6);
    d.destroy();
  });

  it("setLocomotion after disarm resumes the planted body, not origin", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");

    d.setLocomotion("life", { x: 220, z: 40, cruise: 400 });
    runFor(clock, 0.6, 1000 / 120);
    const planted = d.getState().body.x;
    expect(planted).toBeGreaterThan(20);

    d.disarm();
    expect(d.getState().body.x).toBe(0);

    d.setLocomotion("life", { x: planted, z: 40, cruise: 1 });
    expect(d.getState().body.x).toBeCloseTo(planted, 6);
    d.destroy();
  });

  it("ramps the Boo bob carrier into an active performance", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");

    d.launchComet({ gatherSeconds: 0.5 });
    d.setBooMode(true);
    clock.frame(1000 / 120);

    const first = outs.at(-1)!;
    const carrier = booBobUnits(1 / 120);
    expect(Math.abs(first.booBobUnits)).toBeLessThan(Math.abs(carrier));
    d.destroy();
  });

  it("loads comet release through the flight thrust envelope", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");

    d.launchComet({ x0: 0, gatherSeconds: 0.5 });
    const states: Array<{ mode: string; x: number; y: number }> = [];
    for (let i = 0; i < 120; i += 1) {
      clock.frame(1000 / 120);
      const state = d.getState();
      states.push({ mode: state.mode, x: state.body.x, y: state.body.y });
    }

    const releaseIndex = states.findIndex((state) => state.mode === "comet-fly");
    expect(releaseIndex).toBeGreaterThan(0);
    const before = states[releaseIndex - 1];
    const after = states[releaseIndex];
    const dt = 1 / 120;
    const maxThrustTravel = FLIGHT_LAW.thrustMaxUnitsPerS2 * dt * dt * 2;
    expect(Math.abs(after.x - before.x)).toBeLessThan(maxThrustTravel);
    d.destroy();
  });

  it("keeps the loaded comet release acceleration-continuous before the production wall", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");
    const dt = 1 / 120;
    const xMax = 474.8025758601332;
    d.setParams({ launchPower: 1.2 });
    d.setRenderableWorldBoundsAt(() => ({
      xMin: -1000,
      xMax,
      yMax: 10000,
      zMin: -1120,
      zMax: 3566,
    }));
    d.launchComet({ x0: -600, vx: 3200, vy: 0, gatherSeconds: 0.1 });

    let previousVx: number | null = null;
    let maxDeltaV = 0;
    let positiveToNegativeReversals = 0;
    for (let i = 0; i < 64; i += 1) {
      clock.frame(1000 / 120);
      const state = d.getState();
      if (state.mode !== "comet-fly") continue;
      const vx = state.body.vx;
      if (previousVx !== null) {
        maxDeltaV = Math.max(maxDeltaV, Math.abs(vx - previousVx));
        if (previousVx > 0 && vx < 0) positiveToNegativeReversals += 1;
      }
      previousVx = vx;
    }

    expect(maxDeltaV).toBeLessThan(FLIGHT_LAW.thrustMaxUnitsPerS2 * dt * 1.1);
    expect(positiveToNegativeReversals).toBe(0);
    d.destroy();
  });

  it("routes footless comet flight through the hover law instead of gravity fallback", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");

    // Zero authored launch velocity isolates the flight organ: a footless
    // body must still rise toward hover rather than remain a grounded bounce.
    d.launchComet({ x0: 0, vx: 0, vy: 0, gatherSeconds: 0.1 });
    const flight: Array<{ y: number; contact: boolean }> = [];
    for (let i = 0; i < 120; i += 1) {
      clock.frame(1000 / 120);
      const state = d.getState();
      if (state.mode === "comet-fly") {
        flight.push({ y: state.body.y, contact: state.body.contact });
      }
    }

    expect(flight.length).toBeGreaterThan(30);
    const later = flight[Math.min(50, flight.length - 1)];
    expect(later.contact).toBe(false);
    expect(later.y).toBeGreaterThan(FLIGHT_LAW.hoverAltitudeUnits * 0.25);
    d.destroy();
  });

  it("retires a footless flight through neutral instead of resetting from hover", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");

    d.launchComet({ x0: 0, vx: 800, vy: 0, gatherSeconds: 0.1 });
    let sawRetiring = false;
    for (let i = 0; i < 8 * 120; i += 1) {
      clock.frame(1000 / 120);
      sawRetiring ||= d.getState().mode === "retiring";
      if (d.getState().mode === "idle") break;
    }

    expect(sawRetiring).toBe(true);
    expect(d.getState().mode).toBe("idle");
    const neutralIndex = outs.findIndex((out) => out.pose.provenance === "none");
    expect(neutralIndex).toBeGreaterThan(0);
    const beforeNeutral = outs[neutralIndex - 1];
    expect(Math.abs(beforeNeutral.pose.x)).toBeLessThan(20);
    expect(Math.abs(beforeNeutral.pose.y)).toBeLessThan(20);
    expect(Math.abs(beforeNeutral.wakeVY)).toBeLessThan(20);
    d.destroy();
  });

  it("travel tilt leans into velocity and stays bounded", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce({ x0: -800, vx: 900, vy: 600 });
    runFor(clock, 1);
    const tilts = outs.map((o) => o.pose.tilt);
    const maxTilt = Math.max(...tilts.map(Math.abs));
    expect(maxTilt).toBeGreaterThan(1);
    expect(maxTilt).toBeLessThanOrEqual(20);
    const rightward = outs.find((o) => o.pose.x > -800 && o.wakeVX > 0);
    expect(rightward).toBeDefined();
    expect(rightward!.pose.tilt).toBeGreaterThan(0);
    d.destroy();
  });

  it("setParams launchPower scales the impulse", () => {
    const run = (launchPower: number) => {
      const clock = new FakeClock();
      const { outs, push } = collect();
      const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
      d.setParams({ launchPower });
      d.launchBounce({ x0: 0, vx: 0, vy: 1200 });
      runFor(clock, 1.4);
      d.destroy();
      return Math.max(...outs.map((o) => o.pose.y));
    };
    const low = run(0.5);
    const high = run(2);
    expect(high).toBeGreaterThan(low * 3);
  });

  it("disarm releases immediately from any mode", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce({ x0: 100, vx: 400, vy: 1200 });
    runFor(clock, 0.2);
    d.disarm();
    const last = outs[outs.length - 1];
    expect(last.pose.provenance).toBe("none");
    runFor(clock, 0.3);
    expect(outs[outs.length - 1]).toBe(last); // idle — nothing more forwarded
    d.destroy();
  });

  it("clears the retired physics witness when disarm releases the body", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");
    d.launchBounce({ x0: 100, vx: 400, vy: 1200 });
    runFor(clock, 0.2);

    const live = d.inspectPhysicsAuthority();
    expect(live.provenance).toBe("physics-authority");
    expect(live.outputPose).not.toBeNull();

    d.disarm();

    const released = d.inspectPhysicsAuthority();
    expect(released.provenance).toBeNull();
    expect(released.outputPose).toBeNull();
    expect(released.bodyPoseMatchesOutput).toBe(false);
    d.destroy();
  });

  it("is deterministic for identical frame sequences", () => {
    const run = () => {
      const clock = new FakeClock();
      const { outs, push } = collect();
      const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
      d.launchComet({ gatherSeconds: 0.4 });
      runFor(clock, 4);
      d.destroy();
      return outs.map((o) =>
        [
          o.pose.x.toFixed(4),
          o.pose.y.toFixed(4),
          o.pose.tilt.toFixed(4),
          o.wakeVX.toFixed(4),
          o.wakeVY.toFixed(4),
          o.lightSpeed.toFixed(4),
          JSON.stringify(o.silhouetteDeltas),
        ].join("|"),
      );
    };
    expect(run()).toEqual(run());
  });

  it("survives oversized / degenerate frames without non-finite state", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce();
    clock.frame(5000); // tab-suspend spike — clamped to maxDt
    clock.frame(Number.NaN); // the guard passes deltaMs through; driver must not corrupt
    clock.frame(-50);
    runFor(clock, 2);
    const st = d.getState();
    expect(Number.isFinite(st.body.x)).toBe(true);
    expect(Number.isFinite(st.body.y)).toBe(true);
    expect(Number.isFinite(st.body.vx)).toBe(true);
    expect(Number.isFinite(st.body.vy)).toBe(true);
    for (const o of outs) {
      expect(Number.isFinite(o.pose.x)).toBe(true);
      expect(Number.isFinite(o.pose.y)).toBe(true);
    }
    d.destroy();
  });

  it("destroy unsubscribes from the clock", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.launchBounce();
    d.destroy();
    runFor(clock, 0.5);
    expect(outs).toHaveLength(0);
  });
});

describe("D-0112 — locomotion intents: the kernel is the sole writer of free movement", () => {
  it("a filed intent walks the body to the target and dwells there (no drift)", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setLocomotion("wander", { x: 600, z: 300, cruise: 800 });
    expect(d.getState().mode).toBe("locomotion");
    runFor(clock, 6);
    const st = d.getState();
    expect(Math.hypot(st.body.x - 600, st.body.z - 300)).toBeLessThan(8);
    expect(st.locomotionOwners.wander).toBe(true);
    // Every forwarded pose is physics-authority — wander never wrote one.
    expect(outs.length).toBeGreaterThan(10);
    for (const o of outs) expect(o.pose.provenance).toBe("physics-authority");
    // Dwell: another second leaves him at the target.
    runFor(clock, 1);
    const st2 = d.getState();
    expect(Math.hypot(st2.body.x - 600, st2.body.z - 300)).toBeLessThan(8);
    d.destroy();
  });

  it("acceleration is capped at the traction budget μ·g (no servo snap)", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setLocomotion("wander", { x: 4000, z: 0, cruise: 4000 });
    // Northstar acting law: the first exchange-critical beat is a grounded
    // weight shift, not free traction. Once it is spent, the launch remains
    // the same capped constant-force stroke.
    runFor(clock, GAIT_ANTICIPATION_DURATION_SECONDS + 0.016);
    const v = d.floorPose().speed;
    // No field: μ falls back to 0.5 over authored g 2600 → cap 1300 units/s².
    // The 80 ms rounded observation includes four capped fixed substeps after
    // the 60 ms beat expires.
    expect(v).toBeCloseTo(1300 * (4 / 240), 3);
    d.destroy();
  });

  it("cutting the intent mid-leg friction-brakes — the stop is Coulomb, not an ease", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setLocomotion("wander", { x: 3000, z: 0, cruise: 1200 });
    runFor(clock, 0.8); // near cruise
    const at = d.floorPose();
    expect(at.speed).toBeGreaterThan(600);
    d.clearLocomotion("wander"); // ownership kept; the steer is gone
    runFor(clock, 3);
    const st = d.getState();
    // Stopped within the proven band of the cut speed (μ=0.5, g=2600).
    const mu = 0.5;
    const g = 2600;
    const expected = (at.speed * at.speed) / (2 * mu * g);
    const travelled = Math.abs(st.body.x - at.x);
    expect(travelled).toBeGreaterThan(expected * 0.5);
    expect(travelled).toBeLessThan(expected * 1.5 + 20);
    expect(Math.hypot(st.body.vx, st.body.vz)).toBeLessThan(30);
    d.destroy();
  });

  it("standing down mid-room brakes in place and stays armed so idle can breathe", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setLocomotion("wander", { x: 500, z: 200, cruise: 900 });
    runFor(clock, 0.25);
    expect(d.floorPose().speed).toBeGreaterThan(100);
    const at = d.floorPose();
    d.standDownLocomotion("wander");
    runFor(clock, 2);
    const last = outs[outs.length - 1];
    const after = d.getState();
    expect(after.mode).toBe("idle");
    expect(last.pose.provenance).toBe("physics-authority");
    expect(Math.hypot(after.body.x, after.body.z)).toBeGreaterThan(20);
    expect(Math.hypot(after.body.x - at.x, after.body.z - at.z)).toBeLessThan(80);
    expect(Math.hypot(after.body.x, after.body.z)).toBeGreaterThan(Math.hypot(at.x, at.z) * 0.4);
    d.destroy();
  });

  it("a spatial authority resumes from a halted rest without a walk-home", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setLocomotion("wander", { x: 500, z: 200, cruise: 900 });
    runFor(clock, 0.25);
    expect(d.floorPose().speed).toBeGreaterThan(100);
    d.standDownLocomotion("wander");
    runFor(clock, 0.5);
    expect(d.getState().locomotionOwners.wander).toBe(false);
    d.setLocomotion("wander", { x: -300, z: -100, cruise: 600 });
    const st = d.getState();
    expect(st.locomotionOwners.wander).toBe(true);
    expect(st.locomotionOwners.internal).toBe(false);
    runFor(clock, 6);
    const body = d.getState().body;
    expect(Math.hypot(body.x - -300, body.z - -100)).toBeLessThan(10);
    d.destroy();
  });

  it("the environment field owns the constants; the epoch is observable", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    expect(d.getFieldEpoch()).toBe(-1);
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    expect(f).not.toBeNull();
    d.setField(f!);
    expect(d.getFieldEpoch()).toBe(0);
    expect(d.getState().params.gravity).toBeCloseTo(f!.gravityUnitsPerS2, 6);
    expect(d.getState().params.frictionMu).toBeCloseTo(f!.frictionMu, 9);
    const f2 = fieldAfterResize(f!, { viewportWidthPx: 2560, viewportHeightPx: 1440, homeHeightPx: 153 });
    d.setField(f2);
    expect(d.getFieldEpoch()).toBe(1);
    // Size-invariant body: same gravity in a bigger room.
    expect(d.getState().params.gravity).toBeCloseTo(f!.gravityUnitsPerS2, 6);
    d.destroy();
  });

  it("integrates at exact 1/240 substeps: 60Hz and 30Hz frame rates agree", () => {
    const run = (stepMs: number) => {
      const clock = new FakeClock();
      const { push } = collect();
      const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
      d.launchBounce({ x0: -600, vx: 520, vy: 1500 });
      runFor(clock, 4, stepMs);
      const st = d.getState();
      d.destroy();
      return st.body;
    };
    const a = run(16);
    const b = run(33);
    // Without the accumulator these would diverge wildly across bounces.
    expect(Math.abs(a.x - b.x)).toBeLessThan(4);
    expect(Math.abs(a.y - b.y)).toBeLessThan(4);
  });
});

describe("admitPhysicsSilhouetteDeltas", () => {
  const base = { overall_height: 1, overall_width: 1, ground_flattening: 0.2 };

  it("adds bounded deltas onto the living base per fenced channel", () => {
    const out = admitPhysicsSilhouetteDeltas(base, {
      overall_height: -0.3,
      overall_width: 0.2,
      ground_flattening: 0.4,
    });
    expect(out.overall_height).toBeCloseTo(0.7);
    expect(out.overall_width).toBeCloseTo(1.2);
    expect(out.ground_flattening).toBeCloseTo(0.6);
  });

  it("skips channels missing from base and ignores unfenced keys", () => {
    const out = admitPhysicsSilhouetteDeltas(
      { overall_height: 1 },
      { overall_height: -0.1, overall_width: 0.2, posture_x: 9 },
    );
    expect(Object.keys(out)).toEqual(["overall_height"]);
  });

  it("skips non-finite deltas", () => {
    const out = admitPhysicsSilhouetteDeltas(base, {
      overall_height: Number.NaN,
      overall_width: Number.POSITIVE_INFINITY,
    });
    expect(out).toEqual({});
  });
});

/**
 * Pressure-Cooker Cycle 4 — the frontal channels (walk-weight-transfer-phd-memo).
 * R1: sway phase cos(phase/2) — extremum over the support foot at mid-stance
 * (phase 0), centerline crossing at double support (phase π). R2: vault roll
 * atan(swayX/l_eff) in tilt-channel handedness, one sign flip per step.
 * R3: contact squash passes through from the gait organ, zero at rest/flight.
 */
describe("Cycle 4 — frontal gait channels (walk-weight-transfer-phd-memo)", () => {
  const TWO_PI = 2 * Math.PI;

  const walkInDepth = () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!); // the D-0112 field: g = 74210, μ = 1/φ²
    // The far bound of the room clamps the target (z ≈ 3566 u): cruise from
    // home lasts ≈ 1 s. The target is beyond the bound; the capture window
    // sits INSIDE the cruise corridor — ramp ≈ 0.12 s, brake begins ≈ 1.1 s.
    d.setLocomotion("wander", { x: 0, z: 40000, cruise: 3200 });
    runFor(clock, 0.2); // the traction ramp finishes ≈ 0.12 s in
    const pairs: { out: WorldPhysicsDriverOutput; vz: number; speed: number }[] = [];
    // Cycle 8 X1: the stride cadence is ≈ 3.0 Hz at cruise (was 5.83) — the
    // capture window spans ≈ 2.7 strides of the cruise corridor.
    for (let i = 0; i < 70; i++) {
      clock.frame(16);
      const st = d.getState();
      pairs.push({ out: outs[outs.length - 1], vz: st.body.vz, speed: Math.hypot(st.body.vx, st.body.vz) });
    }
    return { d, pairs: pairs.filter((p) => p.speed > 3000) };
  };

  it("R1 — sway rides cos(phase/2): extremum at mid-stance, centerline at double support", () => {
    const { d, pairs } = walkInDepth();
    expect(pairs.length).toBeGreaterThan(30);
    for (const { out, vz, speed } of pairs) {
      const axis = -vz / speed;
      const live = out.gait.swayUnits * Math.cos(out.gait.phase / 2) * axis;
      const locked = out.gait.swayUnits * (out.gaitScreen.supportSide || 0) * axis;
      const seatLock = out.gaitScreen.seated
        ? 1 - (out.gaitScreen.leftoverSway ?? 1)
        : 0;
      const screenShift = (out.gaitScreen.supportSide || 0) * GAIT_LOBE.comShiftMinUnits;
      expect(out.gaitScreen.swayXUnits).toBeCloseTo(
        live * (1 - seatLock) + locked * seatLock + screenShift,
        6,
      );
    }
    // The phase law itself (what the silhouette sees): near phase 0 the load
    // is at extremum over the support foot; near phase π it crosses center.
    const amp = pairs[0].out.gait.swayUnits;
    const mod = (p: WorldPhysicsDriverOutput) => p.gait.phase % TWO_PI;
    // Windows ±0.55 rad: the phase steps 0.304 rad/frame at the Cycle-8 X1
    // cruise cadence, so a window is ≈ 3.6 frame-slots per stride — ≥1 hit
    // per stride guaranteed.
    const nearMid = pairs.filter(
      (p) => mod(p.out) < 0.55 || mod(p.out) > TWO_PI - 0.55,
    );
    const nearDouble = pairs.filter((p) => Math.abs(mod(p.out) - Math.PI) < 0.55);
    expect(nearMid.length).toBeGreaterThan(3);
    expect(nearDouble.length).toBeGreaterThan(3);
    const meanAbs = (xs: number[]) => xs.reduce((a, b) => a + Math.abs(b), 0) / xs.length;
    const vaultSway = (o: WorldPhysicsDriverOutput) =>
      o.gaitScreen.swayXUnits - (o.gaitScreen.supportSide || 0) * GAIT_LOBE.comShiftMinUnits;
    expect(meanAbs(nearMid.map((p) => vaultSway(p.out)))).toBeGreaterThan(0.75 * amp);
    expect(meanAbs(nearDouble.map((p) => vaultSway(p.out)))).toBeLessThan(0.3 * amp);
    d.destroy();
  });

  it("R2/N310 — vault roll plus support lean tilts onto the loaded side and flips each step", () => {
    const { d, pairs } = walkInDepth();
    const planted = pairs.filter((p) => (p.out.gaitScreen.supportSide || 0) !== 0);
    expect(planted.length).toBeGreaterThan(8);
    for (const { out } of planted) {
      const side = out.gaitScreen.supportSide || 0;
      const vault = out.gaitScreen.swayXUnits === 0
        ? 0
        : (-Math.atan(out.gaitScreen.swayXUnits / GAIT_LEG_UNITS) * 180) / Math.PI;
      const expected = vault - side * GAIT_LOBE.torsoLeanDeg;
      expect(out.gaitScreen.rollDeg).toBeCloseTo(expected, 5);
      expect(Math.abs(out.gaitScreen.rollDeg)).toBeGreaterThan(4);
      expect(Math.abs(out.gaitScreen.rollDeg)).toBeLessThan(32);
    }
    const rolls = pairs.map((p) => p.out.gaitScreen.rollDeg);
    expect(Math.max(...rolls)).toBeGreaterThan(4);
    expect(Math.min(...rolls)).toBeLessThan(-4);
    d.destroy();
  });

  it("N310 — a pure-lateral strut still publishes screen COM shift and torso lean", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!);
    d.setLocomotion("wander", { x: 8000, z: 0, cruise: 200 });
    runFor(clock, 1.2);
    const cruise = outs.filter((o) => (o.gaitScreen.supportSide || 0) !== 0);
    expect(cruise.length).toBeGreaterThan(8);
    const shifts = cruise.map((o) => Math.abs(o.gaitScreen.swayXUnits));
    const leans = cruise.map((o) => Math.abs(o.gaitScreen.rollDeg));
    expect(Math.max(...shifts)).toBeGreaterThan(160);
    expect(Math.max(...leans)).toBeGreaterThan(5);
    d.destroy();
  });

  it("R3 — contact squash passes through from the gait organ and collapses at rest and in flight", () => {
    const { d, pairs } = walkInDepth();
    for (const { out } of pairs) {
      expect(out.gaitScreen.contactSquash).toBe(out.gait.contactSquash);
    }
    const peak = Math.max(...pairs.map((p) => p.out.gaitScreen.contactSquash));
    expect(peak).toBeGreaterThan(0.005); // the T3 family at cruise
    expect(peak).toBeLessThan(0.05); // never binds the renderer fence
    d.destroy();

    // Flight is ballistic — no step expression (E1 regression).
    const clock2 = new FakeClock();
    const bounce = collect();
    const b = new WorldPhysicsDriver(clock2, bounce.push, () => "wispwalker");
    b.launchBounce({ x0: 0, vx: 200, vy: 1400 });
    runFor(clock2, 0.4);
    const mid = bounce.outs[Math.floor(bounce.outs.length / 2)];
    expect(mid.gaitScreen.bobLiftUnits).toBe(0);
    expect(mid.gaitScreen.swayXUnits).toBe(0);
    expect(mid.gaitScreen.rollDeg).toBe(0);
    expect(mid.gaitScreen.contactSquash).toBe(0);
    b.destroy();
  });

  it("stand-down collapses every frontal channel to rest (reversible, D-0088 idiom)", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!);
    d.setLocomotion("wander", { x: 0, z: 1200, cruise: 3200 });
    runFor(clock, 0.2);
    expect(d.floorPose().speed).toBeGreaterThan(100);
    d.standDownLocomotion("wander");
    runFor(clock, 2.6); // halt in place + rest
    const last = outs[outs.length - 1];
    expect(last.pose.provenance).toBe("physics-authority");
    expect(Math.abs(last.gaitScreen.bobLiftUnits)).toBeLessThan(1);
    expect(Math.abs(last.gaitScreen.swayXUnits)).toBeLessThan(1);
    expect(Math.abs(last.gaitScreen.rollDeg)).toBeLessThan(0.1);
    expect(last.gaitScreen.contactSquash).toBeCloseTo(0);
    expect(last.gaitScreen.stepBaseXUnits).toBeCloseTo(0, 1);
    d.destroy();
  });

  it("stand-down while settled away from home rests in place (idle breathes, no walk-home)", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!);
    d.setLocomotion("wander", { x: 180, z: 0, cruise: 3200 });
    runFor(clock, 2.5);
    const before = d.getState();
    expect(Math.abs(before.body.x)).toBeGreaterThan(20);
    d.standDownLocomotion("wander");
    const heldX = d.getState().body.x;
    const heldZ = d.getState().body.z;
    runFor(clock, 1.0);
    const after = d.getState();
    expect(after.mode).toBe("idle");
    expect(after.body.x).toBeCloseTo(heldX, 3);
    expect(after.body.z).toBeCloseTo(heldZ, 3);
    const last = outs[outs.length - 1];
    expect(last.pose.provenance).toBe("physics-authority");
    expect(Math.abs(last.pose.x - heldX)).toBeLessThan(1);
    expect(last.gaitScreen.bobLiftUnits).toBeCloseTo(0);
    expect(last.gaitScreen.stepBaseXUnits).toBeCloseTo(0, 1);
    d.destroy();
  });

  it("a target past the composition wall still travels, then reports boundPinned", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!);
    d.setRenderableWorldBoundsAt(() => ({
      xMin: -200,
      xMax: 200,
      yMax: 800,
      zMin: -200,
      zMax: 200,
    }));
    d.setLocomotion("wander", { x: 800, z: 0, cruise: 3200 });
    let pinned = false;
    let maxX = 0;
    for (let i = 0; i < 150; i++) {
      clock.frame(16);
      const pose = d.floorPose();
      maxX = Math.max(maxX, pose.x);
      if (pose.boundPinned) pinned = true;
    }
    expect(maxX).toBeLessThanOrEqual(200);
    expect(maxX).toBeGreaterThan(80);
    expect(pinned).toBe(true);
    d.destroy();
  });

  it("reports boundPinned when a live intent sits past a wall the body already hit", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!);
    d.setLocomotion("wander", { x: 800, z: 0, cruise: 3200 });
    d.setRenderableWorldBoundsAt(() => ({
      xMin: -120,
      xMax: 120,
      yMax: 800,
      zMin: -200,
      zMax: 200,
    }));
    let pinned = false;
    let maxX = 0;
    for (let i = 0; i < 150; i++) {
      clock.frame(16);
      const pose = d.floorPose();
      maxX = Math.max(maxX, pose.x);
      if (pose.boundPinned) pinned = true;
    }
    expect(maxX).toBeLessThanOrEqual(120);
    expect(maxX).toBeGreaterThan(40);
    expect(pinned).toBe(true);
    d.destroy();
  });
});


/**
 * Pressure-Cooker Cycle 5 — the step cycle (step-cycle-phd-memo, D-0118
 * step-vocabulary bindings). S0: the planted base is a sample-and-hold of
 * the vault sway — baseX = swayUnits·tanh(k·cos(phase/2))·⊥(heading): it
 * HOLDS the extremum during stance and exchanges at double support (phase
 * π), one sign flip per step. S1: k = 2φ² puts the double-support switch
 * window at ≈18.1 % of the step period (clinical band 10–20 %). S2 law
 * level: δ = baseX − swayX peaks at ≈ 0.6187·A (the renderer expresses it
 * as a bottom-weighted skew). Amplitude reuses L7 swayUnits — no new
 * constant. Zero at rest, flight, and for pure-lateral travel.
 */
describe("Cycle 5 — the planted-base step channel (step-cycle-phd-memo)", () => {
  const TWO_PI = 2 * Math.PI;

  const walkInDepth = () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!); // the D-0112 field: g = 74210, μ = 1/φ²
    d.setLocomotion("wander", { x: 0, z: 40000, cruise: 3200 });
    runFor(clock, 0.2); // the traction ramp finishes ≈ 0.12 s in
    const pairs: { out: WorldPhysicsDriverOutput; vz: number; speed: number }[] = [];
    // Cycle 8 X1: ≈ 3.0 Hz cruise cadence — the window spans ≈ 2.7 strides.
    for (let i = 0; i < 70; i++) {
      clock.frame(16);
      const st = d.getState();
      pairs.push({ out: outs[outs.length - 1], vz: st.body.vz, speed: Math.hypot(st.body.vx, st.body.vz) });
    }
    return { d, pairs: pairs.filter((p) => p.speed > 3000) };
  };

  it("S0 — planted base identity: swayUnits·tanh(k·cos(phase/2))·⊥(heading)", () => {
    const { d, pairs } = walkInDepth();
    expect(pairs.length).toBeGreaterThan(30);
    for (const { out, vz, speed } of pairs) {
      const expected =
        out.gait.swayUnits *
        Math.tanh(GAIT_LAW.stepPlacementSharpness * Math.cos(out.gait.phase / 2)) *
        (-vz / speed);
      expect(out.gaitScreen.stepBaseXUnits).toBeCloseTo(expected, 6);
    }
    d.destroy();
  });

  it("S0 — both sides plant: the base reaches each extremum and flips once per step", () => {
    const { d, pairs } = walkInDepth();
    const amp = pairs[0].out.gait.swayUnits;
    const bases = pairs.map((p) => p.out.gaitScreen.stepBaseXUnits);
    expect(Math.max(...bases)).toBeGreaterThan(0.75 * amp);
    expect(Math.min(...bases)).toBeLessThan(-0.75 * amp);
    // Sign flips across the run (one exchange per double support), counted
    // with hysteresis: remember the last CONFIDENT plant (|base| > 0.2·amp)
    // and count a flip when the next confident plant is the opposite side.
    // Samples inside the switch window (S1: ±0.37 rad of phase π ≈ 2.5
    // frames at 60fps) are mid-exchange — neither side planted — so a frame
    // that lands in the window must not mask the exchange. At the X1
    // cadence (0.30 rad/frame) a crossing CAN be straddled by a single
    // in-window sample; the naive adjacent-pair count misses it (Cycle-8
    // trace: t≈0.53 flip counted, t≈0.88 flip straddled by one −0.09·A
    // sample and dropped). The law is unchanged; the counter was dishonest.
    let flips = 0;
    let lastSign = 0;
    for (const b of bases) {
      if (Math.abs(b) <= 0.2 * amp) continue;
      const s = Math.sign(b);
      if (lastSign !== 0 && s !== lastSign) flips++;
      lastSign = s;
    }
    expect(flips).toBeGreaterThanOrEqual(2);
    d.destroy();
  });

  it("S1 — k = 2φ² (φ-rung provenance) and the switch window sits in the clinical double-support band", () => {
    const phi = (1 + Math.sqrt(5)) / 2;
    expect(GAIT_LAW.stepPlacementSharpness).toBeCloseTo(2 * phi * phi, 12);
    // Dense sweep of the law itself (no frame aliasing): the exchange window
    // is the phase span where |base/A| < 0.9. k = 2φ² ⇒ ≈ 18.1 % of the step
    // period — inside the 10–20 % clinical double-support band (memo T1).
    const k = GAIT_LAW.stepPlacementSharpness;
    const N = 20000;
    let inSwitch = 0;
    for (let i = 0; i < N; i++) {
      const phase = (i / N) * TWO_PI;
      if (Math.abs(Math.tanh(k * Math.cos(phase / 2))) < 0.9) inSwitch++;
    }
    const frac = inSwitch / N;
    expect(frac).toBeGreaterThan(0.1);
    expect(frac).toBeLessThan(0.2);
    expect(Math.abs(frac - 0.181)).toBeLessThan(0.005);
  });

  it("S2 law level — δ = baseX − swayX peaks at ≈ 0.6187·A (0.12 % off 1/φ, reported)", () => {
    const k = GAIT_LAW.stepPlacementSharpness;
    const N = 20000;
    let maxDelta = 0;
    for (let i = 0; i < N; i++) {
      const u = Math.cos(((i / N) * TWO_PI) / 2);
      maxDelta = Math.max(maxDelta, Math.abs(Math.tanh(k * u) - u));
    }
    expect(maxDelta).toBeGreaterThan(0.6);
    expect(maxDelta).toBeLessThan(0.64);
    // The driver emits both channels; δ on live pairs stays inside the law,
    // frame by frame (the amplitude rides the live speed ratio, so the bound
    // is per-frame: δ ≤ 0.6187·A_frame — 0.62 leaves only the rounding air).
    const { d, pairs } = walkInDepth();
    for (const { out } of pairs) {
      const vaultSway =
        out.gaitScreen.swayXUnits -
        (out.gaitScreen.supportSide || 0) * GAIT_LOBE.comShiftMinUnits;
      const delta = Math.abs(out.gaitScreen.stepBaseXUnits - vaultSway);
      expect(delta).toBeLessThanOrEqual(0.62 * out.gait.swayUnits + 1e-9);
    }
    d.destroy();
  });

  it("S0 honest null — a pure-lateral walk projects no screen step", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f!);
    d.setLocomotion("wander", { x: 8000, z: 0, cruise: 3200 });
    runFor(clock, 0.35); // the same cruise-corridor window as walkInDepth
    const cruise: WorldPhysicsDriverOutput[] = [];
    for (let i = 0; i < 40; i++) {
      clock.frame(16);
      cruise.push(outs[outs.length - 1]);
    }
    for (const o of cruise) {
      expect(Math.abs(o.gaitScreen.stepBaseXUnits)).toBeLessThan(0.5);
    }
    d.destroy();
  });

  it("flight carries no step — the planted base collapses in the air (E1 regression)", () => {
    const clock = new FakeClock();
    const bounce = collect();
    const b = new WorldPhysicsDriver(clock, bounce.push, () => "wispwalker");
    b.launchBounce({ x0: 0, vx: 200, vy: 1400 });
    runFor(clock, 0.4);
    const mid = bounce.outs[Math.floor(bounce.outs.length / 2)];
    expect(mid.gaitScreen.stepBaseXUnits).toBe(0);
    b.destroy();
  });
});

describe("Cycle 6 — cruise attainment (cruise-attainment-phd-memo A0/A1)", () => {
  const studioField = () =>
    createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    })!;

  it("A0 — the launch is a constant-force stroke: speed rides v = μg·t (linear, never asymptotic)", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = studioField();
    d.setField(f);
    const cap = f.frictionMu * f.gravityUnitsPerS2;
    const cruise = comfortCruiseBand(f.gravityUnitsPerS2).min; // band-floor leg (the Cycle-6 wall case)
    d.setLocomotion("wander", { x: 6000, z: 0, cruise });
    // Δ₁ — one kernel tick of saturated impulse (A1 capture band).
    const tick = cap * PHI_LAW.kernelStepSeconds;
    const tLaunch = cruise / cap; // derived launch budget (A0)
    // While saturated (t < 0.8·t_launch) every sample must sit on the ramp
    // within one tick of impulse (accumulator carry). The old exponential
    // seek read ≈250 u/s where the ramp reads ≈1800 u/s at the last sample —
    // that shortfall WAS the wall.
    // The fake clock delivers 16 ms frames, so the exchange beat is observed
    // as a rounded 80 ms launch hold (five external frames).
    const launchDelaySeconds = Math.ceil(GAIT_ANTICIPATION_DURATION_SECONDS / 0.016) * 0.016;
    runFor(clock, launchDelaySeconds);
    const speedAtLaunch = d.floorPose().speed;
    for (let k = 1; k * 0.016 < 0.8 * tLaunch; k++) {
      clock.frame(16);
      const t = k * 0.016;
      expect(Math.abs((d.floorPose().speed - speedAtLaunch) - cap * t)).toBeLessThanOrEqual(
        tick * 1.01,
      );
    }
    d.destroy();
  });

  it("A0/A2 — cruise is attained inside the composer's charged overhead (v²/μg), the wall's measure", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = studioField();
    d.setField(f);
    const cap = f.frictionMu * f.gravityUnitsPerS2;
    const cruise = comfortCruiseBand(f.gravityUnitsPerS2).min;
    d.setLocomotion("wander", { x: 6000, z: 0, cruise });
    const tLaunch = cruise / cap; // ≈92 ms at the band floor
    const launchDelaySeconds = Math.ceil(GAIT_ANTICIPATION_DURATION_SECONDS / 0.016) * 0.016;
    // Frame-by-frame: at the FIRST moment speed reaches 99 % of cruise, the
    // distance spent must sit inside the composer's charged ramp term
    // (A2) — and the moment itself inside a φ-margin of the derived budget.
    // The old controller attained at ≈775 u against the same 240 u charge.
    let attained = false;
    for (let k = 1; k <= 30; k++) {
      clock.frame(16);
      const at = d.floorPose();
      if (at.speed >= 0.99 * cruise) {
        expect(k * 0.016 - launchDelaySeconds).toBeLessThanOrEqual(PHI * tLaunch);
        expect(at.x).toBeLessThanOrEqual((cruise * cruise) / cap);
        attained = true;
        break;
      }
    }
    expect(attained).toBe(true);
    d.destroy();
  });

  it("A1 fold-back — cruise is HELD exact: no skid bleed at zero commanded force (take-6 limit cycle)", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = studioField();
    d.setField(f);
    const cap = f.frictionMu * f.gravityUnitsPerS2;
    const cruise = comfortCruiseBand(f.gravityUnitsPerS2).min;
    d.setLocomotion("wander", { x: 6000, z: 0, cruise });
    const tick = cap * PHI_LAW.kernelStepSeconds; // Δ₁ — the take-6 bleed quantum
    const tLaunch = cruise / cap;
    // Launch + capture inside the A0/A2 budget, then HOLD for a full second.
    // Pre-fold-back the kernel sat at cruise − Δ₁ (2492 vs 2610): every silent
    // tick read the walking body as spent and skid-bled it one capture band.
    // A walking body at constant speed bleeds NOTHING.
    for (let k = 1; k <= 75; k++) {
      clock.frame(16); // ≈1.2 s total
      if (k * 0.016 > PHI * tLaunch) {
        const v = d.floorPose().speed;
        expect(Math.abs(v - cruise)).toBeLessThan(tick * 0.05);
      }
    }
    d.destroy();
  });

  it("A1 — deadbeat capture: no overshoot past cruise, no force step (|a| ≤ μg every tick)", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = studioField();
    d.setField(f);
    const cap = f.frictionMu * f.gravityUnitsPerS2;
    const cruise = comfortCruiseBand(f.gravityUnitsPerS2).min;
    d.setLocomotion("wander", { x: 6000, z: 0, cruise });
    const tick = cap * PHI_LAW.kernelStepSeconds;
    let prevSpeed = 0;
    for (let k = 0; k < 60; k++) {
      // 60 × 16 ms ≈ 1 s: launch, capture, then steady cruise.
      clock.frame(16);
      const v = d.floorPose().speed;
      // Capture band: speed never exceeds cruise by more than Δ₁.
      expect(v).toBeLessThanOrEqual(cruise + tick * 1.01);
      // Traction bound per frame: no servo snap, at any point of the stroke.
      expect(Math.abs(v - prevSpeed)).toBeLessThanOrEqual(cap * 0.016 + tick);
      prevSpeed = v;
    }
    d.destroy();
  });
});

/**
 * Cycle 10 Y1 (bank-phd-memo) — the centripetal bank. A grounded body in
 * curved travel banks toward the turn center (tan β = v·ω/g); the screen-x
 * expression is the x-component of the centripetal acceleration, a_c,x =
 * −ω·vz. Straight cruise carries none (Y2 honest null); flight and rest
 * collapse; the φ·8° cap sits inside the friction cone (Y3).
 */
describe("Cycle 10 Y1 — the centripetal bank (bank-phd-memo)", () => {
  const field = () =>
    createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    })!;

  // Depth cruise, then re-target lateral: the steer law carves a grounded
  // ≈90° turn — the Y1 demand. The first 20 frames after the ramp are the
  // straight-cruise control window.
  const steerTurn = (lateralX: number) => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(field());
    d.setLocomotion("wander", { x: 0, z: 40000, cruise: 3200 });
    runFor(clock, 0.5);
    const straight: WorldPhysicsDriverOutput[] = [];
    for (let i = 0; i < 20; i++) {
      clock.frame(16);
      straight.push(outs[outs.length - 1]);
    }
    d.setLocomotion("wander", { x: lateralX, z: 0, cruise: 3200 });
    const seq: { out: WorldPhysicsDriverOutput; vx: number; vz: number }[] = [];
    for (let i = 0; i < 90; i++) {
      clock.frame(16);
      const st = d.getState();
      seq.push({ out: outs[outs.length - 1], vx: st.body.vx, vz: st.body.vz });
    }
    return { d, straight, seq };
  };

  const heading = (vx: number, vz: number) => Math.atan2(vz, vx);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  // The centripetal x-acceleration from live kinematics: a_c,x = −ω·vz.
  const demandAt = (
    s: { vx: number; vz: number }[],
    i: number,
  ) => {
    const w =
      wrap(heading(s[i].vx, s[i].vz) - heading(s[i - 1].vx, s[i - 1].vz)) / 0.016;
    return -w * s[i].vz;
  };

  it("Y2 honest null — straight cruise carries no bank", () => {
    const { d, straight } = steerTurn(8000);
    expect(straight.length).toBeGreaterThan(10);
    for (const o of straight) {
      expect(Math.abs(o.gaitScreen.bankDeg)).toBeLessThan(0.5);
    }
    d.destroy();
  });

  it("Y1 — a grounded turn banks toward the turn center, supra-threshold", () => {
    const check = (lateralX: number, sign: 1 | -1) => {
      const { d, seq } = steerTurn(lateralX);
      let peak = 0;
      // The steer sweeps the heading ≈100° in a short transient (ω up to
      // −12 rad/s, demand up to the μg clamp), then settles into straight
      // cruise. The screen-x bank is the X-PROJECTION of the bank vector
      // (∝ |ω|·v·sin θ), so it legitimately flips sign as the heading
      // crosses the camera axis mid-sweep — the body banks right-of-heading
      // the whole time (Y1 projection honesty). Judge the lag the physical
      // way: sign at peak demand (lag negligible at the magnitude peak),
      // supra-threshold energy, and decay to zero in straight cruise.
      let energy = 0;
      let peakDemand = 0;
      let bankAtPeakDemand = 0;
      for (let i = 2; i < seq.length; i++) {
        const b = seq[i].out.gaitScreen.bankDeg;
        energy += Math.abs(b);
        peak = Math.max(peak, Math.abs(b));
        const a = demandAt(seq, i);
        if (Math.abs(a) > Math.abs(peakDemand)) {
          peakDemand = a;
          bankAtPeakDemand = b;
        }
      }
      expect(Math.abs(peakDemand)).toBeGreaterThan(4000); // the turn really happened
      expect(Math.sign(bankAtPeakDemand)).toBe(sign); // bank tracks the center
      expect(peak).toBeGreaterThan(3); // a carve, not a whisper (Y4)
      expect(energy).toBeGreaterThan(15); // sustained, not a flick
      // Straight cruise after the turn: the bank decays out (no fake lean).
      for (let i = seq.length - 10; i < seq.length; i++) {
        expect(Math.abs(seq[i].out.gaitScreen.bankDeg)).toBeLessThan(0.5);
      }
      d.destroy();
    };
    check(8000, 1); // turning toward +x: ω < 0, vz > 0 ⇒ a_c,x > 0 ⇒ bank > 0
    check(-8000, -1);
  });

  it("Y3 — bank inside the φ·8° cap; the tilt channel inside the L6+bank sum", () => {
    const { d, seq } = steerTurn(8000);
    for (const { out } of seq) {
      expect(Math.abs(out.gaitScreen.bankDeg)).toBeLessThanOrEqual(
        GAIT_LAW.bankMaxDeg + 1e-9,
      );
      expect(Math.abs(out.pose.tilt)).toBeLessThanOrEqual(
        GAIT_LAW.maxGroundedLeanDeg + GAIT_LAW.bankMaxDeg + 1e-9,
      );
    }
    d.destroy();
  });

  it("Y2 — flight carries no bank; the walk-home banks like any grounded turn", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(field());
    d.launchBounce({ x0: 0, vx: 900, vy: 1400 });
    runFor(clock, 4); // flight + landing + walk home + rest
    expect(outs.length).toBeGreaterThan(10);
    for (const o of outs) {
      if (o.pose.y > 1) expect(o.gaitScreen.bankDeg).toBe(0); // airborne: ballistic, no bank
      else expect(Math.abs(o.gaitScreen.bankDeg)).toBeLessThanOrEqual(GAIT_LAW.bankMaxDeg + 1e-9);
    }
    expect(outs[outs.length - 1].gaitScreen.bankDeg).toBe(0); // rest collapses
    // No derivative-reset jolt at gait transitions: the bank is a first-order
    // lag (τ_c·φ ≈ 97 ms ⇒ ≤ ~2°/frame at 60 fps), so a single-frame jump
    // beyond 3° means a discontinuity, not physics (the Cycle-10 probe
    // caught a 10.27° one-frame flick from a prevVX reset on a contact blip).
    for (let i = 1; i < outs.length; i++) {
      expect(Math.abs(outs[i].gaitScreen.bankDeg - outs[i - 1].gaitScreen.bankDeg)).toBeLessThan(3);
    }
    d.destroy();
  });
});

/**
 * Cycle 11 Z1 (step-shape-phd-memo) — the contact flatten. The SUPPORT read
 * of the floor dialogue: the planted side's base flattens over a contact
 * patch that grows with the S0 support share (Hertz monotonic form). Max at
 * mid-stance on the planted side, alternating each half-stride; the ⊥(heading)
 * projection idiom (a pure lateral walk plants in depth — invisible in
 * screen x); Z3 first-order lag + smoothed gate (no pop at gait entry, no
 * step at transitions); Z2 fences; flight and rest collapse.
 */
describe("Cycle 11 Z1 — the contact flatten (step-shape-phd-memo)", () => {
  const field = () =>
    createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    })!;

  const walkDepth = () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(field());
    // Ping-pong depth legs: the frustum fence clamps the z target at
    // zFar = 3566 u, so a single leg arrives in ≈ 1.1 s and dwells; re-filing
    // keeps the body walking through the whole window (≈ 3 strides per leg).
    for (let leg = 0; leg < 4; leg++) {
      d.setLocomotion("wander", { x: 0, z: leg % 2 === 0 ? 40000 : 0, cruise: 3200 });
      runFor(clock, 1);
    }
    return { d, outs };
  };

  it("honest null — rest carries no flatten; the disarm output is exactly zero", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(field());
    runFor(clock, 1);
    d.disarm();
    expect(outs.length).toBeGreaterThan(0);
    const last = outs[outs.length - 1];
    expect(last.gaitScreen.stepFlattenUnits).toBe(0);
    expect(last.gaitScreen.stepFlattenWidthUnits).toBe(0);
    d.destroy();
  });

  it("walks toward the camera: flatten peaks inside the Z2 fences, supra-threshold", () => {
    const { d, outs } = walkDepth();
    let peakD = 0;
    let peakW = 0;
    for (const o of outs) {
      peakD = Math.max(peakD, Math.abs(o.gaitScreen.stepFlattenUnits));
      peakW = Math.max(peakW, o.gaitScreen.stepFlattenWidthUnits);
      // Z2 fences hold every frame (fail-closed at the intake too):
      expect(Math.abs(o.gaitScreen.stepFlattenUnits)).toBeLessThanOrEqual(
        GAIT_LAW.flattenMaxUnits + 1e-9,
      );
      expect(o.gaitScreen.stepFlattenWidthUnits).toBeGreaterThanOrEqual(0);
      expect(o.gaitScreen.stepFlattenWidthUnits).toBeLessThanOrEqual(
        GAIT_LAW.flattenPatchMaxUnits + 1e-9,
      );
    }
    // The law amplitude at cruise is φ·d_phys ≈ 59 u (GaitLaw Z2); the τ_c·φ
    // lag attenuates the periodic peak, so the bar sits well under the law
    // but far above the 2 % JND floor (≈ 3.7 px on the home contour).
    expect(peakD).toBeGreaterThan(20); // a glance cue, not a whisper
    expect(peakD).toBeLessThan(GAIT_LAW.flattenMaxUnits);
    expect(peakW).toBeGreaterThan(20);
    d.destroy();
  });

  it("alternates sides each half-stride — the exchange is a shape event", () => {
    const { d, outs } = walkDepth();
    // Loud-sign hysteresis: count sign flips of the flatten above 15 u. At
    // the X1 cadence (≈ 3.0 steps/s at cruise) four 1 s legs hold ~12
    // strides (~24 half-stride holds, minus the turn-around losses); the
    // lag smooths the hand-off but cannot suppress it.
    let lastSign = 0;
    let flips = 0;
    for (const o of outs) {
      const f = o.gaitScreen.stepFlattenUnits;
      if (Math.abs(f) > 15) {
        const s = Math.sign(f);
        if (lastSign !== 0 && s !== lastSign) flips += 1;
        lastSign = s;
      }
    }
    expect(flips).toBeGreaterThanOrEqual(8);
    d.destroy();
  });

  it("keeps the visible support sign with the planted step through exchange", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(field());
    const targets = [
      { x: 280, z: 72 },
      { x: -260, z: 112 },
      { x: 260, z: -96 },
      { x: -280, z: -72 },
      { x: 0, z: 0 },
    ];
    for (const target of targets) {
      d.setLocomotion("wander", { ...target, cruise: 3200 });
      runFor(clock, 1, 1000 / 120);
    }

    const paired = outs
      .map((out) => ({
        step: out.gaitScreen.stepBaseXUnits,
        flatten: out.gaitScreen.stepFlattenUnits,
      }))
      .filter(({ step, flatten }) => Math.abs(step) >= 0.5 && Math.abs(flatten) >= 0.01);
    const agreement = paired.filter(
      ({ step, flatten }) => Math.sign(step) === Math.sign(flatten),
    ).length / Math.max(1, paired.length);
    expect(paired.length).toBeGreaterThan(12);
    expect(agreement).toBeGreaterThanOrEqual(0.8);
    for (let i = 1; i < outs.length; i += 1) {
      expect(
        Math.abs(
          outs[i].gaitScreen.stepFlattenUnits - outs[i - 1].gaitScreen.stepFlattenUnits,
        ),
      ).toBeLessThan(12);
    }
    d.destroy();
  });

  it("S0 projection honesty — a pure lateral walk plants in depth: no screen-x flatten", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(field());
    d.setLocomotion("wander", { x: 8000, z: 0, cruise: 3200 });
    runFor(clock, 3);
    // Straight lateral cruise (last second): vz ≈ 0 ⇒ the ⊥(heading)
    // projection collapses the flatten exactly like the step base.
    for (const o of outs.slice(-60)) {
      expect(Math.abs(o.gaitScreen.stepFlattenUnits)).toBeLessThan(2);
      expect(o.gaitScreen.stepFlattenWidthUnits).toBeLessThan(2);
    }
    d.destroy();
  });

  it("flight carries no flatten; the walk-home fades in with no pop (Z3)", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(field());
    d.launchBounce({ x0: 0, vx: 900, vy: 1400 });
    runFor(clock, 4); // flight + landing + walk home + rest
    expect(outs.length).toBeGreaterThan(10);
    for (const o of outs) {
      if (o.pose.y > 1) {
        expect(o.gaitScreen.stepFlattenUnits).toBe(0); // ballistic: no support, no patch
        expect(o.gaitScreen.stepFlattenWidthUnits).toBe(0);
      }
      expect(Math.abs(o.gaitScreen.stepFlattenUnits)).toBeLessThanOrEqual(
        GAIT_LAW.flattenMaxUnits + 1e-9,
      );
    }
    expect(outs[outs.length - 1].gaitScreen.stepFlattenUnits).toBe(0); // rest collapses
    expect(outs[outs.length - 1].gaitScreen.stepFlattenWidthUnits).toBe(0);
    // Z3 no-pop: the lag (τ_c·φ ≈ 97 ms) bounds the per-frame change at
    // 61.2·(1−e^(−16/97)) ≈ 9.3 u; a 12 u jump means a discontinuity, not physics.
    for (let i = 1; i < outs.length; i++) {
      expect(
        Math.abs(outs[i].gaitScreen.stepFlattenUnits - outs[i - 1].gaitScreen.stepFlattenUnits),
      ).toBeLessThan(12);
      expect(
        Math.abs(
          outs[i].gaitScreen.stepFlattenWidthUnits - outs[i - 1].gaitScreen.stepFlattenWidthUnits,
        ),
      ).toBeLessThan(25);
    }
    d.destroy();
  });
});

// ---------------------------------------------------------------------------
// GASPER-PHYSICS-001 · S3 — the flight organ (flight-physics-phd-memo
// F-LAWs 1/3/4; N30/N31). The footless body floats: buoyant steering under
// the thrust envelope, the air's toll on every horizontal motion, and the
// hover equilibrium as the vertical channel's home. One steering idiom, two
// budgets: the feeted body spends the friction cone, the footless body
// spends T_max.
// ---------------------------------------------------------------------------

describe("S3 F-LAW — the footless flight organ", () => {
  // The D-0112 field (test double — no environment): the same g/μ the walk
  // organ proves against; restSpeed scales with g so contact can hold for
  // the contrast body. Samples the live body per organism frame.
  function sample(emb: string, target: number, cruise: number, seconds: number) {
    const stepMs = 16;
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => emb);
    d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });
    d.setLocomotion("wander", { x: target, z: 0, cruise });
    const samples: { t: number; x: number; y: number; v: number }[] = [];
    const n = Math.round((seconds * 1000) / stepMs);
    for (let i = 0; i < n; i++) {
      clock.frame(stepMs);
      const b = d.getState().body;
      samples.push({
        t: ((i + 1) * stepMs) / 1000,
        x: b.x,
        y: b.y,
        v: Math.hypot(b.vx, b.vz),
      });
    }
    return { outs, d, samples };
  }

  it("F-LAW 3 — liftoff: the footless body rises to the hover equilibrium and never touches the floor", () => {
    const { d, samples } = sample("presence", 800, 3200, 1.2);
    for (const s of samples) {
      expect(s.y).toBeGreaterThan(0); // airborne for the whole leg
    }
    const last = samples[samples.length - 1];
    expect(last.y).toBeGreaterThan(FLIGHT_LAW.hoverAltitudeUnits * 0.9);
    expect(last.y).toBeLessThan(FLIGHT_LAW.hoverAltitudeUnits * 1.1);
    expect(d.getState().body.contact).toBe(false);
    d.destroy();
  });

  it("F-LAW 4 — the hover arrival is ONE ζ = 1/φ overshoot (≈8.4 %), then held", () => {
    const { d, samples } = sample("presence", 800, 3200, 1.2);
    const peak = Math.max(...samples.map((s) => s.y));
    const over = peak / FLIGHT_LAW.hoverAltitudeUnits - 1;
    expect(over).toBeGreaterThan(0.05);
    expect(over).toBeLessThan(0.12);
    // …and it settles back inside the band (no second overshoot, no drift).
    const last = samples[samples.length - 1];
    expect(Math.abs(last.y / FLIGHT_LAW.hoverAltitudeUnits - 1)).toBeLessThan(0.1);
    d.destroy();
  });

  it("F-LAW 1 — snappy intent: the jet opens at ≈T_max; drag caps the body at terminal", () => {
    const { d, samples } = sample("presence", 950, 3200, 2.5);
    // Inside τ_a (0.254 s): v(96 ms) ≈ T_max·t minus the growing toll.
    const early = samples.filter((s) => s.t <= 0.1);
    const v100ms = early[early.length - 1].v;
    expect(v100ms).toBeGreaterThan(1000);
    expect(v100ms).toBeLessThan(1350);
    // The envelope + the toll: speed never runs past the terminal velocity
    // at T_max (v_c) by more than the deadbeat capture band.
    const peakV = Math.max(...samples.map((s) => s.v));
    expect(peakV).toBeLessThan(3200 * 1.05);
    d.destroy();
  });

  it("F-LAW 1 — the arrival is deadbeat: monotone approach, no horizontal overshoot", () => {
    const { d, samples } = sample("presence", 800, 3200, 2.5);
    for (const s of samples) {
      expect(s.x).toBeLessThan(800 + 10); // never crosses the target
    }
    const last = samples[samples.length - 1];
    expect(Math.abs(last.x - 800)).toBeLessThan(6);
    expect(last.v).toBeLessThan(30);
    d.destroy();
  });

  it("E3 carried — a rest-class body drifts airborne, at the rest drift", () => {
    const { d, samples } = sample(
      "singularity",
      600,
      REST_DRIFT_UNITS_PER_SEC,
      2.5,
    );
    const last = samples[samples.length - 1];
    expect(last.y).toBeGreaterThan(FLIGHT_LAW.hoverAltitudeUnits * 0.9);
    // The drift is a thrust setpoint too: the body ATTAINS the drift (never
    // past it — the setpoint is the ceiling) and arrives deadbeat. The leg
    // is short by design (a resting seed glides, never dashes).
    const peakV = Math.max(...samples.map((s) => s.v));
    expect(peakV).toBeGreaterThan(REST_DRIFT_UNITS_PER_SEC * 0.75);
    expect(peakV).toBeLessThan(REST_DRIFT_UNITS_PER_SEC * 1.06);
    expect(Math.abs(last.x - 600)).toBeLessThan(6);
    d.destroy();
  });

  it("N30 contrast — the feeted body keeps the floor: zero altitude, contact walk", () => {
    const { d, samples } = sample("wispwalker", 800, 3200, 1.0);
    for (const s of samples) {
      expect(s.y).toBe(0); // walking belongs to feet — the floor is home
    }
    expect(d.getState().body.contact).toBe(true);
    d.destroy();
  });
});


describe("S4 F-LAW 2 — the wind-resistance surface", () => {
  // The kernel's airflow read, sampled from the FORWARDED outputs (the wind
  // channel + the pose tilt the renderer will express). Same D-0112 field as
  // the flight organ proofs. Room fact (measured): the frustum bound at the
  // home plane is ±960 u, and the v_c brake distance is ≈406 u, so a leg
  // from home never holds a long cruise — the tests pin the HONESTY of the
  // read (p tracks the body's own (v/v_c)² through the lag), not a regime
  // the room cannot give.
  function take(emb: string, target: number, cruise: number, seconds: number) {
    const stepMs = 16;
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => emb);
    d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });
    d.setLocomotion("wander", { x: target, z: 0, cruise });
    const frames: { t: number; out: WorldPhysicsDriverOutput; v: number }[] = [];
    const n = Math.round((seconds * 1000) / stepMs);
    for (let i = 0; i < n; i++) {
      clock.frame(stepMs);
      const b = d.getState().body;
      const out = outs[outs.length - 1];
      frames.push({ t: ((i + 1) * stepMs) / 1000, out, v: Math.hypot(b.vx, b.vz) });
    }
    return { d, frames, outs, clock, stepMs };
  }

  it("the wind read is honest to the body's own speed — p tracks (v/v_c)² through the lag", () => {
    const { d, frames } = take("presence", 900, 3200, 1.6);
    const peakSpeed = Math.max(...frames.map((f) => f.v));
    // The leg reaches the jet regime inside the room (≈85 % of v_c).
    expect(peakSpeed).toBeGreaterThan(3200 * 0.8);
    const peak = frames.reduce((a, f) =>
      f.out.wind.pressure > a.out.wind.pressure ? f : a,
    );
    // The lag keeps the read AT OR BELOW the instantaneous (v/v_c)² (the
    // surface answers the airflow, it never anticipates it)…
    expect(peak.out.wind.pressure).toBeLessThanOrEqual(
      Math.pow(peakSpeed / 3200, 2) + 1e-9,
    );
    // …and stays close to it at the peak (first-order lag, τ_c·φ).
    expect(peak.out.wind.pressure).toBeGreaterThan(
      0.8 * Math.pow(peakSpeed / 3200, 2),
    );
    expect(peak.out.wind.dirX).toBeGreaterThan(0.8); // aimed along the travel
    // The law's fences hold on EVERY frame (never shouts past the whole).
    for (const f of frames) {
      expect(f.out.wind.pressure).toBeGreaterThanOrEqual(0);
      expect(f.out.wind.pressure).toBeLessThanOrEqual(1);
      expect(Math.abs(f.out.wind.dirX)).toBeLessThanOrEqual(1);
    }
    d.destroy();
  });

  it("at rest the read collapses to zero — the still-air identity", () => {
    const { d, frames } = take("presence", 800, 3200, 2.5);
    // Arrived + hover-holding: the last frames read still air (the lag tail
    // is τ_c·φ ≈ 97 ms; the direction floor kills the capture-band jitter).
    for (const f of frames.slice(-10)) {
      expect(f.out.wind.pressure).toBeLessThan(0.02);
      expect(Math.abs(f.out.wind.dirX)).toBeLessThan(0.05);
    }
    d.destroy();
  });

  it("disarm forwards wind EXACTLY zero", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");
    d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });
    d.setLocomotion("wander", { x: 800, z: 0, cruise: 3200 });
    runFor(clock, 0.5);
    d.disarm();
    const last = outs[outs.length - 1];
    expect(last.wind.pressure).toBe(0);
    expect(last.wind.dirX).toBe(0);
    d.destroy();
  });

  it("a reversal swings the direction sign through the same lag", () => {
    const { d, frames, outs, clock, stepMs } = take("presence", -800, 3200, 0.8);
    // Leg 1 travels −x: the mid-jet read aims −x (t ≈ 0.3 s).
    const mid1 = frames[Math.round((0.3 * 1000) / stepMs) - 1];
    expect(mid1.out.wind.dirX).toBeLessThan(-0.5);
    expect(mid1.out.wind.pressure).toBeGreaterThan(0.2);
    // Leg 2 re-files +x from the dwell at −800: the read swings through zero
    // and re-aims +x (the lag makes the swing continuous, never a pop).
    d.setLocomotion("wander", { x: 800, z: 0, cruise: 3200 });
    const leg1Count = outs.length;
    for (let i = 0; i < Math.round((1.0 * 1000) / stepMs); i++) clock.frame(stepMs);
    const mid2 = outs[leg1Count + Math.round((0.45 * 1000) / stepMs)];
    expect(mid2.wind.dirX).toBeGreaterThan(0.5);
    expect(mid2.wind.pressure).toBeGreaterThan(0.3);
    d.destroy();
  });

  it("the walker pays the air its toll too — one wind law, every embodiment", () => {
    const { d, frames } = take("wispwalker", 900, 3200, 1.6);
    const peak = frames.reduce((a, f) =>
      f.out.wind.pressure > a.out.wind.pressure ? f : a,
    );
    // Walking cruise inside the room reaches the same jet-regime read.
    expect(peak.out.wind.pressure).toBeGreaterThan(0.4);
    expect(peak.out.wind.dirX).toBeGreaterThan(0.5);
    d.destroy();
  });

  it("jet-lean: the tilt spikes into the jet, bounded by 8φ, and settles as the air spends the motion", () => {
    const stepMs = 16;
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");
    d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });
    d.setLocomotion("wander", { x: 900, z: 0, cruise: 3200 });
    const frames: { t: number; out: WorldPhysicsDriverOutput }[] = [];
    for (let i = 0; i < Math.round((2.0 * 1000) / stepMs); i++) {
      clock.frame(stepMs);
      if ((i + 1) * stepMs === 192) d.clearLocomotion("wander"); // cut the jet mid-stroke (192 ms = frame 12)
      frames.push({ t: ((i + 1) * stepMs) / 1000, out: outs[outs.length - 1] });
    }
    // The jet window: lean INTO the +x acceleration (atan(a/g) through the lag).
    const jetWin = frames.filter((f) => f.t >= 0.08 && f.t <= 0.2);
    const peakTilt = Math.max(...jetWin.map((f) => f.out.pose.tilt));
    expect(peakTilt).toBeGreaterThan(3.5);
    // The tail: with the thrust cut, drag spends the motion and the lean
    // settles home — the transient read never becomes a parked pose tilt.
    for (const f of frames.filter((f) => f.t >= 1.5)) {
      expect(Math.abs(f.out.pose.tilt)).toBeLessThan(0.75);
      expect(f.out.wind.pressure).toBeLessThan(0.05);
    }
    // And the clamp NEVER opens past 8φ on any frame of the whole take.
    for (const f of frames) {
      expect(Math.abs(f.out.pose.tilt)).toBeLessThan(GAIT_LAW.bankMaxDeg + 0.01);
    }
    d.destroy();
  });
});

describe("GASPER-NORTHSTAR-001 — Wispwalker continuity (bounded jerk + handoff carry-through)", () => {
  const FIELD = () => createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });

  it("keeps the short-leg showcase path inside one traction-cap jerk", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(FIELD());
    const path = [
      { x: 280, z: 72 },
      { x: -260, z: 112 },
      { x: 260, z: -96 },
      { x: -280, z: -72 },
      { x: 0, z: 0 },
    ];
    const velocities: Array<{ x: number; z: number }> = [];
    const positions: Array<{ x: number; z: number }> = [];
    for (const target of path) {
      d.setLocomotion("internal", { ...target, cruise: 3200 });
      for (let i = 0; i < 120; i += 1) {
        clock.frame(1000 / 120);
        const b = d.getState().body;
        velocities.push({ x: b.vx, z: b.vz });
        positions.push({ x: b.x, z: b.z });
      }
    }
    const dt = 1 / 120;
    const acceleration = velocities.slice(1).map((v, i) => ({
      x: (v.x - velocities[i]!.x) / dt,
      z: (v.z - velocities[i]!.z) / dt,
    }));
    const jumps = acceleration.slice(1).map((a, i) => ({
      magnitude: Math.hypot(a.x - acceleration[i]!.x, a.z - acceleration[i]!.z),
      index: i + 1,
    }));
    jumps.sort((a, b) => b.magnitude - a.magnitude);
    const cap = d.traction().mu * d.traction().gravity;
    const maxJerk = Math.max(...jumps.map((jump) => jump.magnitude));
    expect(maxJerk).toBeLessThanOrEqual(cap + 1e-6);
    const endpoints = [59, 179, 299, 419, 539].map((index) => positions[index]!);
    for (let index = 0; index < path.length; index += 1) {
      const target = path[index]!;
      const endpoint = endpoints[index]!;
      expect(Math.hypot(target.x - endpoint.x, target.z - endpoint.z)).toBeLessThan(1);
    }
    d.destroy();
  });

  it("arrival decelerates on the Coulomb curve with bounded jerk — no vDes snap at the band edge", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(FIELD());
    d.setLocomotion("wander", { x: 1200, z: 0, cruise: 3200 });
    const tr = d.traction();
    const cap = tr.mu * tr.gravity;
    const vs: number[] = [];
    const xs: number[] = [];
    for (let i = 0; i < 6000; i += 1) {
      clock.frame(1000 / 120);
      const b = d.getState().body;
      vs.push(b.vx);
      xs.push(b.x);
      if (Math.abs(b.x - 1200) < 6 && Math.hypot(b.vx, b.vz) < 1 && i > 60) break;
    }
    // 1) bounded acceleration: |a| <= μg + epsilon EVERYWHERE (the Coulomb cap).
    const dt = 1 / 120;
    const a = vs.map((v, i) => (i ? (v - vs[i - 1]) / dt : 0));
    const maxAbsA = Math.max(...a.map(Math.abs));
    expect(maxAbsA).toBeLessThanOrEqual(cap + 1e-6);
    // 2) bounded jerk IN THE ARRIVAL WINDOW (the last 240 frames): the per-tick
    //    acceleration step must stay a small fraction of the cap — the old
    //    vDes=0 snap flipped the command to a full-μg reverse at the band edge
    //    (~0.25..1·μg per tick); the ramp + arrival floor keep it tiny.
    // The band-edge window (the last ~6 frames before rest): the OLD vDes=0
    // snap flipped the command to a full-μg reverse here (~0.5+ cap per
    // frame); the ramp + arrival floor make it 0.000 cap — a hard discriminator.
    const arrival = a.slice(-6);
    const arrivalDeltas = arrival.slice(1).map((x, i) => Math.abs(x - arrival[i]));
    const maxArrivalDeltaA = Math.max(0, ...arrivalDeltas);
    // The arrival is jerk-smooth: the band-edge command never steps more
    // than 10% of the cap per frame (the OLD snap read >= 0.5 cap here).
    expect(maxArrivalDeltaA).toBeLessThanOrEqual(cap * 0.1);
    // The arrival decelerates monotonically to rest (no re-acceleration
    // oscillation / micro-reverse in the last frames).
    const arrivalSpeeds = vs.slice(-20);
    let monotone = true;
    for (let i = 1; i < arrivalSpeeds.length; i += 1) {
      if (arrivalSpeeds[i] > arrivalSpeeds[i - 1] + 1e-6) monotone = false;
    }
    expect(monotone).toBe(true);
    // 3) the body actually arrives inside the band (the brake, not a snap, lands it).
    const finalX = xs[xs.length - 1];
    expect(Math.abs(finalX - 1200)).toBeLessThan(6);
    // near-rest at the arrival floor (the exact rest + no-micro-reverse
    // is the arrival-band test's contract); the arrival was monotone above.
    expect(Math.abs(vs[vs.length - 1])).toBeLessThan(1);
    d.destroy();
  });

  it("reverses traction through the exchange beat instead of flipping by two caps", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(FIELD());
    d.setLocomotion("wander", { x: 10000, z: 0, cruise: 10000 });
    for (let i = 0; i < 60; i += 1) clock.frame(1000 / 120);

    const cap = d.traction().mu * d.traction().gravity;
    const before = d.getState().body.vx;
    expect(before).toBeGreaterThan(cap * 0.15);
    clock.frame(1000 / 120);
    const preReverse = d.getState().body.vx;

    d.setLocomotion("wander", { x: -10000, z: 0, cruise: 10000 });
    const velocities = [before, preReverse];
    for (let i = 0; i < 12; i += 1) {
      clock.frame(1000 / 120);
      velocities.push(d.getState().body.vx);
    }
    const accelerations = velocities.slice(1).map((v, i) => (v - velocities[i]) / (1 / 120));
    const accelerationDeltas = accelerations.slice(1).map((a, i) => Math.abs(a - accelerations[i]));
    expect(Math.max(...accelerationDeltas)).toBeLessThanOrEqual(cap * 0.75);
    d.destroy();
  });

  it("a leg-to-leg handoff carries the physical state — no reset, no teleport, phase preserved", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(FIELD());
    // Leg 1: walk to (500, 0).
    d.setLocomotion("wander", { x: 500, z: 0, cruise: 3200 });
    let guard = 0;
    while (guard++ < 6000) {
      clock.frame(1000 / 120);
      const b = d.getState().body;
      if (Math.abs(b.x - 500) < 6 && Math.hypot(b.vx, b.vz) < 1) break; // near-rest (the arrival floor)
    }
    const arrived = d.getState().body;
    const phaseAtArrival = d.getState().gait.phase;
    expect(Math.abs(arrived.x - 500)).toBeLessThan(6);
    expect(Math.abs(arrived.vx)).toBeLessThan(1);
    // Dwell (clear keeps ownership) then Leg 2 to a distant target.
    d.clearLocomotion("wander");
    clock.frame(1000 / 120);
    d.setLocomotion("wander", { x: -400, z: 300, cruise: 3200 });
    // The SECOND leg launches FROM the arrival pose — per-frame step bounded
    // (cruise/120 ≈ 26.7 u; a spawn-at-authored-start jumps hundreds in one frame).
    const launchX: number[] = [];
    const launchPhase: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      clock.frame(1000 / 120);
      const b = d.getState().body;
      launchX.push(b.x);
      launchPhase.push(d.getState().gait.phase);
    }
    for (let i = 1; i < launchX.length; i += 1) {
      expect(Math.abs(launchX[i] - launchX[i - 1])).toBeLessThanOrEqual(30);
    }
    expect(Math.abs(launchX[0] - arrived.x)).toBeLessThan(6);
    // The gait phase is travel-integrated (L8): it resumes from the frozen
    // arrival value plus exactly the natural one-frame advance (≈0.052 at 1 Hz).
    const phaseAdvance = launchPhase[0] - phaseAtArrival;
    expect(phaseAdvance).toBeGreaterThanOrEqual(0);
    expect(phaseAdvance).toBeLessThanOrEqual(0.17);
    // And the handoff finishes at the new target (continuity end-to-end).
    guard = 0;
    while (guard++ < 6000) {
      clock.frame(1000 / 120);
      const b = d.getState().body;
      if (Math.hypot(b.x + 400, b.z - 300) < 8 && Math.hypot(b.vx, b.vz) < 30) break;
    }
    const landed = d.getState().body;
    expect(Math.hypot(landed.x + 400, landed.z - 300)).toBeLessThan(8);
    d.destroy();
  });

  it("re-enters gait through the expression ramp after a locomotion dwell", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(FIELD());
    d.setLocomotion("wander", { x: 280, z: 0, cruise: 3200 });

    // Arrive, but keep the locomotion owner active so the driver remains in
    // locomotion mode. This is the exact seam where the old mode-only gate
    // incorrectly stayed fully open through the dwell.
    for (let i = 0; i < 2400; i += 1) {
      clock.frame(1000 / 120);
      const body = d.getState().body;
      if (Math.abs(body.x - 280) < 6 && Math.abs(body.vx) < 1) break;
    }
    for (let i = 0; i < 40; i += 1) clock.frame(1000 / 120);

    // A new leg must not insert a full vault on its first fixed step. The
    // visible gait expression owns the same 180ms perceptual ramp as mode
    // entry, even though the physics body is already allowed to accelerate.
    d.setLocomotion("wander", { x: -280, z: 0, cruise: 3200 });
    const firstFrames: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      clock.frame(1000 / 120);
      firstFrames.push(Math.abs(outs[outs.length - 1].gaitScreen.bobLiftUnits));
    }
    expect(Math.max(...firstFrames)).toBeLessThan(6);
    d.destroy();
  });
});

describe("reference-performance vertical compression", () => {
  it("clamps, smooths, volume-compensates, and releases the performance target", () => {
    // Break caught: untrusted semantic depth could bypass the silhouette
    // fence, pop discontinuously, or leave the body compressed after release.
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setLocomotion("performance", { x: 0, z: 0, cruise: 0 });
    d.setPerformanceGait({
      cadenceHz: 2,
      driveGain: 0.4,
      lateralAxis: 1,
      compressionRatio: 99,
    });

    expect(d.getPerformanceGait()?.compressionRatio).toBeGreaterThan(0.2);
    expect(d.getPerformanceGait()?.compressionRatio).toBeLessThan(0.24);
    runFor(clock, 0.8, 1_000 / 120);
    const compressed = outs[outs.length - 1]!.silhouetteDeltas;
    expect(compressed.overall_height).toBeLessThan(-0.2);
    expect(compressed.overall_width).toBeGreaterThan(0.2);
    expect((1 + compressed.overall_height!) * (1 + compressed.overall_width!)).toBeCloseTo(1, 3);

    d.setPerformanceGait(null);
    // Arrival/gather release is a hold (1/phi), not a 180ms snap.
    runFor(clock, 2.5, 1_000 / 120);
    expect(outs[outs.length - 1]!.silhouetteDeltas.overall_height).toBeUndefined();
    expect(outs[outs.length - 1]!.silhouetteDeltas.overall_width).toBeUndefined();
    d.destroy();
  });
});

describe("support-driven Wispwalker walk", () => {
  const walk120 = (seconds, intent) => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f);
    d.setLocomotion("wander", intent);
    const rows = [];
    const n = Math.round(seconds * 120);
    for (let i = 0; i < n; i++) {
      clock.frame(1000 / 120);
      const st = d.getState();
      rows.push({ body: st.body, envelope: st.envelope, support: st.support, gait: st.gait });
    }
    return { d, outs, rows };
  };

  it("fails on skate: planted world position holds while the path travels", () => {
    const { d, rows } = walk120(2.2, { x: 0, z: 40000, cruise: 3200 });
    const moving = rows.filter((r) => r.support.planted && Math.hypot(r.body.vx, r.body.vz) > 800);
    expect(moving.length).toBeGreaterThan(40);
    let maxHoldDrift = 0;
    let holdFrames = 0;
    for (let i = 1; i < moving.length; i++) {
      const a = moving[i - 1];
      const b = moving[i];
      if (a.support.side === b.support.side && a.support.planted && b.support.planted) {
        const drift = Math.hypot(
          b.support.plantedWorldX - a.support.plantedWorldX,
          b.support.plantedWorldZ - a.support.plantedWorldZ,
        );
        maxHoldDrift = Math.max(maxHoldDrift, drift);
        holdFrames += 1;
      }
    }
    expect(holdFrames).toBeGreaterThan(20);
    expect(maxHoldDrift).toBeLessThan(1e-6);
    const pathSpan = Math.abs(moving[moving.length - 1].body.z - moving[0].body.z);
    expect(pathSpan).toBeGreaterThan(400);
    d.destroy();
  });

  it("fails on missing impact: walk contact charges and recovers the envelope", () => {
    const { d, rows } = walk120(2.2, { x: 0, z: 40000, cruise: 3200 });
    const impacts = rows.filter((r) => r.envelope.impact > 0.75);
    const peak = Math.max(...rows.map((r) => r.envelope.impact));
    const gathers = rows.filter((r) => r.envelope.gather > 0.02);
    expect(peak).toBeGreaterThan(0.75);
    expect(impacts.length).toBeGreaterThan(0);
    expect(gathers.length).toBeGreaterThan(0);
    const first = rows.findIndex((r) => r.envelope.impact > 0.75);
    const recovered = rows.slice(first + 8, first + 40).some((r) => r.envelope.impact < peak * 0.5);
    expect(recovered).toBe(true);
    expect(rows.every((r) => r.body.y === 0)).toBe(true);
    d.destroy();
  });

  it("R3 walk volume: gather peaks on committed plant, recovers on push-off, stretch stays 0, y=0", () => {
    const { d, rows, outs } = walk120(2.4, { x: 0, z: 40000, cruise: 3200 });
    const moving = rows.filter((r) => Math.hypot(r.body.vx, r.body.vz) > 200);
    expect(moving.length).toBeGreaterThan(40);
    expect(moving.every((r) => r.body.y === 0)).toBe(true);
    expect(moving.every((r) => r.envelope.stretch === 0)).toBe(true);

    const plantHold = moving.filter((r) => Math.abs(supportHold(r.gait.phase)) >= 0.9 && r.support.planted);
    const exchange = moving.filter((r) => Math.abs(supportHold(r.gait.phase)) < 0.9);
    expect(plantHold.length).toBeGreaterThan(8);
    expect(exchange.length).toBeGreaterThan(8);
    const peakGather = Math.max(...moving.map((r) => r.envelope.gather));
    const peakGatherOnPlant = Math.max(...plantHold.map((r) => r.envelope.gather));
    const meanPlant = plantHold.reduce((s, r) => s + r.envelope.gather, 0) / plantHold.length;
    const meanExchange = exchange.reduce((s, r) => s + r.envelope.gather, 0) / exchange.length;
    expect(peakGather).toBeGreaterThan(0.08);
    expect(peakGatherOnPlant).toBeCloseTo(peakGather, 3);
    expect(meanPlant).toBeGreaterThan(meanExchange);

    const plants = moving.filter((r) => r.support.planted && r.support.impactSpeed > 0);
    expect(plants.length).toBeGreaterThan(0);
    const impactOnPlant = moving.some(
      (r) => r.support.planted && r.envelope.impact > 0,
    );
    expect(impactOnPlant).toBe(true);
    expect(Math.max(...moving.map((r) => r.envelope.impact))).toBeGreaterThan(0.2);

    const gatherOut = outs.find((o) => (o.silhouetteDeltas.overall_height ?? 0) < -0.01);
    expect(gatherOut).toBeTruthy();
    const h = gatherOut.silhouetteDeltas.overall_height ?? 0;
    const w = gatherOut.silhouetteDeltas.overall_width ?? 0;
    // Cartoon squash: height dips, width goes out enough to read. Not a limbo duck.
    expect(h).toBeLessThan(-0.01);
    expect(w).toBeGreaterThan(0);
    // Per-leg compress is the weight read. Whole-body width-out is not the chase.
    const peakCompress = Math.max(...moving.map((r) => r.support.plantedCompress ?? 0));
    expect(peakCompress).toBeGreaterThan(0.08);
    expect(peakGather).toBeLessThan(0.21);
    d.destroy();
  });

  it("arrival freezes the painted walk gather, not the plant crouch", () => {
    const { d, rows } = walk120(8, { x: 980, z: 48, cruise: 200 });
    const plant = 1 / 1.618033988749895;
    const arrivedIdx = rows.findIndex(
      (r) => r.body.x > 900 && Math.hypot(r.body.vx, r.body.vz) < 40,
    );
    expect(arrivedIdx).toBeGreaterThan(40);
    const at4 = rows[Math.round(4 * 120)] ?? rows[0];
    const at5 = rows[Math.round(5 * 120)] ?? rows[arrivedIdx];
    const at8 = rows[rows.length - 1];
    // life6 locked 0.594 at 5.05 — that is the plant crouch / puddle snap.
    expect(at5.envelope.gather ?? 0).toBeLessThan(0.21);
    expect(at8.envelope.gather ?? 0).toBeLessThan(0.21);
    // Dumping gather to 0 rebuilt overall_height (the 2x wall pop).
    expect(at5.envelope.gather ?? 0).toBeGreaterThan(0.04);
    expect(at8.envelope.gather ?? 0).toBeGreaterThan(0.04);
    expect(Math.abs((at8.envelope.gather ?? 0) - (at5.envelope.gather ?? 0))).toBeLessThan(0.15);
    const window = rows.slice(Math.max(0, arrivedIdx - 8), arrivedIdx + 48);
    expect(window.length).toBeGreaterThan(20);
    for (let i = 1; i < window.length; i++) {
      const dg = (window[i].envelope.gather ?? 0) - (window[i - 1].envelope.gather ?? 0);
      expect(Math.abs(dg)).toBeLessThan(0.25);
    }
    void at4;
    d.destroy();
  });

  it("arrived hold keeps a small TAKE breath so the wall is not a dead freeze", () => {
    const { d, outs, rows } = walk120(8, { x: 980, z: 48, cruise: 200 });
    const last = rows.slice(-120);
    expect(last.length).toBeGreaterThan(40);
    expect(last.every((r) => Math.hypot(r.body.vx, r.body.vz) < 40)).toBe(true);
    const takes = last.map((r) => r.envelope.take ?? 0);
    expect(Math.max(...takes)).toBeGreaterThan(0.04);
    expect(Math.max(...takes)).toBeLessThan(0.2);
    expect(Math.max(...takes) - Math.min(...takes)).toBeGreaterThan(0.02);
    const heights = outs.slice(-120).map((o) => o.silhouetteDeltas.overall_height ?? 0);
    // Painter owns the hold height pulse (setPhysicsIdle). Deltas stay gather/take.
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.06);
    const widths = outs.slice(-120).map((o) => o.silhouetteDeltas.overall_width ?? 0);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.04);
    const idles = last.map((r) => r.envelope.idle ?? 0);
    expect(Math.max(...idles.map(Math.abs))).toBeLessThan(0.08);
    const idleOut = outs.slice(-120).map((o) => o.idle ?? 0);
    expect(Math.max(...idleOut.map(Math.abs))).toBeLessThan(0.08);
    d.destroy();
  });

  it("arrived idle starts at 0 and eases in — no trough puddle snap", () => {
    const { d, outs, rows } = walk120(8, { x: 980, z: 48, cruise: 200 });
    const arrivedIdx = rows.findIndex(
      (r) => r.body.x > 900 && Math.hypot(r.body.vx, r.body.vz) < 40,
    );
    expect(arrivedIdx).toBeGreaterThan(40);
    const firstIdle = rows[arrivedIdx].envelope.idle ?? 0;
    expect(Math.abs(firstIdle)).toBeLessThan(0.08);
    const early = rows.slice(arrivedIdx, arrivedIdx + 24);
    for (const r of early) {
      expect(Math.abs(r.envelope.idle ?? 0)).toBeLessThan(0.08);
    }
    const later = rows[Math.min(rows.length - 1, arrivedIdx + 120)];
    expect(Math.abs(later.envelope.idle ?? 0)).toBeLessThan(0.08);
    const hWin = outs.slice(Math.max(0, arrivedIdx - 8), arrivedIdx + 24);
    for (let i = 1; i < hWin.length; i++) {
      const dh =
        (hWin[i].silhouetteDeltas.overall_height ?? 0) -
        (hWin[i - 1].silhouetteDeltas.overall_height ?? 0);
      expect(Math.abs(dh)).toBeLessThan(0.15);
    }
    d.destroy();
  });

  it("R3 flight stretch: env.stretch>0 when airspeed>0 and contact===false", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "presence");
    d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });
    d.setLocomotion("wander", { x: 40000, z: 0, cruise: 3200 });
    let saw = false;
    for (let i = 0; i < 90; i++) {
      clock.frame(16);
      const st = d.getState();
      const air = Math.hypot(st.body.vx, st.body.vy, st.body.vz);
      if (!st.body.contact && air > 0 && st.envelope.stretch > 0) {
        saw = true;
        break;
      }
    }
    expect(saw).toBe(true);
    expect(d.getState().body.contact).toBe(false);
    d.destroy();
  });

  it("fails on no weight transfer: CoG leaves the path centerline onto support", () => {
    const { d, rows } = walk120(2.2, { x: 0, z: 40000, cruise: 3200 });
    const cogs = rows.map((r) => r.support.cogX);
    expect(Math.max(...cogs)).toBeGreaterThan(8);
    expect(Math.min(...cogs)).toBeLessThan(-8);
    const bodyX = rows.map((r) => r.body.x);
    expect(Math.max(...bodyX)).toBeGreaterThan(8);
    expect(Math.min(...bodyX)).toBeLessThan(-8);
    const angles = rows.map((r) => r.body.angle);
    expect(Math.max(...angles.map(Math.abs))).toBeGreaterThan(1);
    d.destroy();
  });

  it("keeps support exchanges live through a long walk, including an X leg", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 });
    d.setField(f);
    d.setLocomotion("wander", { x: 0, z: 40000, cruise: 3200 });
    runFor(clock, 1.6, 1000 / 120);
    const mid = d.getState().support.exchangeCount;
    expect(mid).toBeGreaterThanOrEqual(4);
    d.setLocomotion("wander", { x: 40000, z: d.getState().body.z, cruise: 3200 });
    runFor(clock, 1.6, 1000 / 120);
    expect(d.getState().support.exchangeCount).toBeGreaterThan(mid + 3);
    d.destroy();
  });

  it("N187 strut: filed cruise 200 is the painted speed, not a comfort-band zip", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    });
    d.setField(f);
    d.setLocomotion("wander", { x: 980, z: 48, cruise: 200 });
    expect(d.getState().filedCruise).toBe(200);
    runFor(clock, 0.72, 1000 / 120);
    const speed = d.floorPose().speed;
    const x = d.getState().body.x;
    expect(d.getState().filedCruise).toBe(200);
    expect(speed).toBeGreaterThan(140);
    expect(speed).toBeLessThan(260);
    expect(x).toBeGreaterThan(40);
    expect(x).toBeLessThan(280);
    d.destroy();
  });

  it("N191 zip: presence + filed life target travels; grounded comet-fly does not", () => {
    const clock = new FakeClock();
    const { push } = collect();
    let emb = "wispwalker";
    const d = new WorldPhysicsDriver(clock, push, () => emb);
    const f = createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    });
    d.setField(f);
    d.setLocomotion("wander", { x: 980, z: 48, cruise: 200 });
    runFor(clock, 0.72, 1000 / 120);
    const seated = d.getState().body;
    d.setLocomotion("wander", { x: seated.x, z: seated.z, cruise: 1 });
    runFor(clock, 0.2, 1000 / 120);
    d.setBooMode(true);
    d.launchComet({ gatherSeconds: 0.8, vx: -280, vy: 260 });
    runFor(clock, 0.8, 1000 / 120);
    const endGather = d.getState();
    expect(["comet-gather", "comet-fly"]).toContain(endGather.mode);
    expect(Math.abs(endGather.body.x - seated.x)).toBeLessThan(20);
    emb = "presence";
    d.standDownLocomotion("wander");
    d.setLocomotion("life", { x: -200, z: 160, cruise: 480 });
    const xLaunch = d.getState().body.x;
    runFor(clock, 1.6, 1000 / 120);
    const zipped = d.getState();
    expect(zipped.filedCruise).toBe(480);
    expect(zipped.body.x).toBeLessThan(xLaunch - 150);
    expect(zipped.body.y).toBeGreaterThan(20);
    d.destroy();
  });

  it("N251 publishes live swing lift at mid-stance and collapses it at rest", () => {
    const { d, outs, rows } = walk120(3.0, { x: 980, z: 48, cruise: 200 });
    const moving = outs.filter((_, i) => {
      const r = rows[i];
      return r && r.support.planted && Math.hypot(r.body.vx, r.body.vz) > 40;
    });
    expect(moving.length).toBeGreaterThan(40);
    const lifts = moving.map((o) => o.gaitScreen.swingLiftUnits);
    const drops = moving.map((o) => o.gaitScreen.loadedDropUnits);
    const advances = moving.map((o) => o.gaitScreen.swingAdvanceUnits);
    expect(Math.max(...lifts)).toBeGreaterThan(250);
    expect(Math.max(...drops)).toBeGreaterThan(40);
    expect(Math.max(...advances)).toBeGreaterThan(20);
    expect(Math.min(...advances)).toBeLessThan(-20);
    const mid = moving.filter((o) => Math.abs(Math.cos(o.gait.phase / 2)) > 0.92);
    const held = moving.filter((o) => {
      const hold = Math.abs(supportHold(o.gait.phase));
      return hold > 0.7 && Math.abs(Math.cos(o.gait.phase / 2)) > 0.55;
    });
    const exchange = moving.filter((o) => Math.abs(supportHold(o.gait.phase)) < 0.35);
    expect(mid.length).toBeGreaterThan(4);
    expect(Math.max(...mid.map((o) => o.gaitScreen.swingLiftUnits))).toBeGreaterThan(250);
    expect(held.length).toBeGreaterThan(8);
    expect(Math.max(...held.map((o) => o.gaitScreen.swingLiftUnits))).toBeGreaterThan(200);
    if (exchange.length) {
      expect(Math.max(...exchange.map((o) => o.gaitScreen.swingLiftUnits))).toBeLessThan(8);
    }
    d.destroy();
    const restClock = new FakeClock();
    const { outs: restOuts, push } = collect();
    const rest = new WorldPhysicsDriver(restClock, push, () => "wispwalker");
    rest.setField(
      createPhysicsField({ viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 }),
    );
    rest.setLocomotion("wander", { x: 0, z: 0, cruise: 200 });
    runFor(restClock, 0.35, 1000 / 120);
    expect(restOuts.length).toBeGreaterThan(4);
    const last = restOuts[restOuts.length - 1]!;
    expect(last.gaitScreen.swingLiftUnits).toBe(0);
    expect(last.gaitScreen.swingAdvanceUnits).toBe(0);
    expect(last.gaitScreen.loadedDropUnits).toBe(0);
    rest.destroy();
  });

  it("N304 wispwalker+boo zip leaves the floor and collapses gait lobes", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    const f = createPhysicsField({
      viewportWidthPx: 1280,
      viewportHeightPx: 720,
      homeHeightPx: 153,
    });
    d.setField(f);
    d.setLocomotion("wander", { x: 980, z: 48, cruise: 200 });
    runFor(clock, 0.8, 1000 / 120);
    const seated = d.getState().body;
    expect(seated.y).toBeLessThan(8);
    d.setBooMode(true);
    d.launchComet({ gatherSeconds: 0.4, vx: -480, vy: 980, z0: seated.z });
    runFor(clock, 0.4, 1000 / 120);
    d.standDownLocomotion("wander");
    d.setLocomotion("life", { x: seated.x - 520, z: seated.z + 80, cruise: 380 });
    runFor(clock, 1.4, 1000 / 120);
    const flown = d.getState();
    const last = outs[outs.length - 1]!;
    expect(flown.body.y).toBeGreaterThan(180);
    expect(Math.abs(flown.body.x - seated.x)).toBeGreaterThan(80);
    expect(last.gaitScreen.swingLiftUnits).toBe(0);
    expect(last.gaitScreen.supportSide).toBe(0);
    d.destroy();
  });

  it("N310 strut COM drops on the planted support and the free lobe lifts", () => {
    const { d, outs, rows } = walk120(3.0, { x: 720, z: 480, cruise: 200 });
    const mid = outs.filter((_, i) => {
      const r = rows[i];
      return (
        r &&
        r.support.planted &&
        (r.support.plantedCompress ?? 0) > 0.45 &&
        Math.hypot(r.body.vx, r.body.vz) > 40
      );
    });
    expect(mid.length).toBeGreaterThan(6);
    expect(Math.min(...mid.map((o) => o.gaitScreen.bobLiftUnits))).toBeLessThan(-120);
    expect(Math.max(...mid.map((o) => Math.abs(o.gaitScreen.swayXUnits)))).toBeGreaterThan(160);
    expect(Math.max(...mid.map((o) => Math.abs(o.gaitScreen.rollDeg)))).toBeGreaterThan(5);
    expect(Math.max(...mid.map((o) => o.gaitScreen.swingLiftUnits))).toBeGreaterThan(280);
    d.destroy();
  });

  it("N311 Boo landing drops hover altitude while gait lobes stay collapsed", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");
    d.setField(
      createPhysicsField({
        viewportWidthPx: 1280,
        viewportHeightPx: 720,
        homeHeightPx: 153,
      }),
    );
    d.setBooMode(true);
    d.launchComet({ gatherSeconds: 0.25, vx: -80, vy: 980 });
    runFor(clock, 0.25, 1000 / 120);
    d.setLocomotion("life", { x: 80, z: 40, cruise: 120 });
    runFor(clock, 0.8, 1000 / 120);
    const high = d.getState().body.y;
    expect(high).toBeGreaterThan(180);
    d.requestBooLanding();
    d.setLocomotion("life", { x: d.getState().body.x, z: d.getState().body.z, cruise: 40 });
    runFor(clock, 1.8, 1000 / 120);
    const landed = d.getState();
    const last = outs[outs.length - 1]!;
    expect(landed.body.y).toBeLessThan(high * 0.45);
    expect(last.gaitScreen.swingLiftUnits).toBe(0);
    expect(d.isBooMode()).toBe(true);
    d.destroy();
  });
});
