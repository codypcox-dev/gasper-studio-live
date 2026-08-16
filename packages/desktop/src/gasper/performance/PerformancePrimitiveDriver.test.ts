import { describe, expect, it } from "vitest";

import type {
  PhysicsGoal,
  PhysicsIntentBeat,
  PhysicsIntentPlan,
} from "../../../../shared/src/gasper-performance/reference/types.js";
import { GasperOrganismClock } from "../clock/GasperOrganismClock.js";
import {
  WorldPhysicsDriver,
  type LocomotionIntent,
  type PerformanceGaitIntent,
} from "../physics/WorldPhysicsDriver.js";
import {
  PerformancePrimitiveDriver,
  type PerformancePrimitivePort,
} from "./PerformancePrimitiveDriver.js";

const HASH = `sha256:${"d".repeat(64)}`;
const evidence = [{ kind: "derived" as const, ref: "fixture:reference", confidence: 0.9 }];

function goal(
  id: string,
  target: number,
  unit: string,
  safeMin: number,
  safeMax: number,
): PhysicsGoal {
  return { id, target, unit, safeMin, safeMax, authority: "performance", evidence };
}

function beat(input: Partial<PhysicsIntentBeat> & Pick<PhysicsIntentBeat, "id" | "primitive">): PhysicsIntentBeat {
  return {
    id: input.id,
    t0Ms: input.t0Ms ?? 0,
    t1Ms: input.t1Ms ?? 500,
    primitive: input.primitive,
    supportGoals: input.supportGoals ?? [],
    bodyGoals: input.bodyGoals ?? [],
    expressiveGoals: input.expressiveGoals ?? [],
    constraints: input.constraints ?? [
      "physics-authority",
      "organism-clock",
      "no-direct-transform",
      "reduced-motion-collapse",
    ],
    sourceEvidence: input.sourceEvidence ?? evidence,
  };
}

function plan(id: string, beats: readonly PhysicsIntentBeat[]): PhysicsIntentPlan {
  return {
    schema: "gasper.physics-intent-plan.v1",
    id,
    sourceMotionScoreHash: HASH,
    formProfileHash: HASH,
    environmentProfileHash: HASH,
    seed: 42,
    durationMs: Math.max(...beats.map((entry) => entry.t1Ms)),
    beats,
    compiler: { id: "fixture", version: "1" },
  };
}

function supportExchange(id = "exchange"): PhysicsIntentBeat {
  return beat({
    id,
    primitive: "support_exchange",
    supportGoals: [
      goal("support_count", 2, "count", 0, 2),
      goal("initial_support_index", 0, "support-index", 0, 1),
      goal("terminal_support_index", 1, "support-index", 0, 1),
    ],
    bodyGoals: [
      goal("motion_energy", 0.6, "ratio", 0, 1),
      goal("motion_weight", 0.7, "ratio", 0, 1),
      goal("cadence", 2, "hertz", 1, 3.1),
    ],
  });
}

function travel(id: string, dx: number): PhysicsIntentBeat {
  return beat({
    id,
    primitive: "travel",
    bodyGoals: [
      goal("motion_energy", 0.5, "ratio", 0, 1),
      goal("motion_weight", 0.5, "ratio", 0, 1),
      goal("normalized_travel_speed", 0.5, "ratio", 0, 1),
      goal("normalized_travel_x", dx, "body-length", -2, 2),
      goal("normalized_travel_y", 0, "body-length", -2, 2),
      goal("cadence", 2, "hertz", 1, 3.1),
    ],
  });
}

function compress(id = "compress", ratio = 0.2): PhysicsIntentBeat {
  return beat({
    id,
    primitive: "compress",
    t1Ms: 1_000,
    bodyGoals: [
      goal("motion_energy", 0.45, "ratio", 0, 1),
      goal("motion_weight", 0.8, "ratio", 0, 1),
      goal("normalized_vertical_compression", ratio, "body-height-ratio", 0, 0.230769),
    ],
  });
}

function fakePort(): PerformancePrimitivePort & {
  locomotion: { owner: string; intent: LocomotionIntent }[];
  gait: (PerformanceGaitIntent | null)[];
  stoodDown: string[];
  body: { x: number; z: number; speed: number };
} {
  const locomotion: { owner: string; intent: LocomotionIntent }[] = [];
  const gait: (PerformanceGaitIntent | null)[] = [];
  const stoodDown: string[] = [];
  const body = { x: 10, z: -20, speed: 160 };
  return {
    locomotion,
    gait,
    stoodDown,
    body,
    setLocomotion: (owner, intent) => locomotion.push({ owner, intent }),
    clearLocomotion: () => undefined,
    standDownLocomotion: (owner) => stoodDown.push(owner),
    floorPose: () => ({ ...body }),
    traction: () => ({ mu: 0.381966, gravity: 6_000 }),
    setPerformanceGait: (intent) => gait.push(intent),
  };
}

describe("reference PerformancePrimitiveDriver", () => {
  it("schedules form-native support and travel through one organism clock and the locomotion port", () => {
    // Break caught: a compiled reference could create a second timer or write
    // world position directly instead of filing bounded physical intent.
    const clock = new GasperOrganismClock({ maxDeltaMs: 1_000 });
    const port = fakePort();
    const driver = new PerformancePrimitiveDriver(clock, port, { bodyHeightUnits: 1_224 });
    const input = plan("reference-1", [
      supportExchange(),
      { ...travel("travel", 0.25), t0Ms: 500, t1Ms: 1_000 },
    ]);

    driver.start(input);
    clock.step(1);
    expect(port.locomotion.at(-1)).toEqual({
      owner: "performance",
      intent: { x: 10, z: -20, cruise: 0 },
    });
    expect(port.gait.at(-1)).toMatchObject({ cadenceHz: 2, driveGain: 0.6 });

    clock.step(500);
    expect(port.locomotion.at(-1)?.owner).toBe("performance");
    expect(port.locomotion.at(-1)?.intent.x).toBeCloseTo(316, 8);
    expect(port.locomotion.at(-1)?.intent.z).toBeCloseTo(-20, 8);
    expect(port.locomotion.at(-1)?.intent.cruise).toBeGreaterThan(0);
    expect(driver.inspect()).toMatchObject({
      active: true,
      beatId: "travel",
      clockSubscriberId: "gasper-performance-primitive-driver",
      contactTiming: "form_native",
    });
  });

  it("drives in-place support exchange inside the existing WorldPhysicsDriver", () => {
    // Break caught: in-place footwork could be faked as CSS/rig transforms or
    // disappear because the old gait organ only activated during translation.
    const clock = new GasperOrganismClock({ fixedStepMs: 1_000 / 120, maxDeltaMs: 50 });
    const outputs: Parameters<ConstructorParameters<typeof WorldPhysicsDriver>[1]>[0][] = [];
    const physics = new WorldPhysicsDriver(clock, (output) => outputs.push(output), () => "wispwalker");
    const driver = new PerformancePrimitiveDriver(clock, physics, { bodyHeightUnits: 1_224 });

    driver.start(plan("in-place", [{ ...supportExchange(), t1Ms: 1_000 }]));
    for (let index = 0; index < 120; index += 1) clock.step();

    expect(physics.floorPose()).toMatchObject({ x: 0, z: 0, speed: 0 });
    expect(outputs.some((output) => output.gait.stepHz > 0)).toBe(true);
    expect(Math.max(...outputs.map((output) => Math.abs(output.gaitScreen.stepBaseXUnits)))).toBeGreaterThan(0);
    expect(physics.inspectPhysicsAuthority()).toMatchObject({ writer: "world-physics-driver" });
    expect(clock.inspect().subscriberIds).toEqual([
      "gasper-performance-primitive-driver",
      "world-physics",
    ]);

    driver.destroy();
    physics.destroy();
  });

  it("projects a measured squat through bounded physics silhouette authority", () => {
    // Break caught: the plan could execute every beat while measured hip
    // descent vanished, leaving only lateral support travel on screen.
    const clock = new GasperOrganismClock({ fixedStepMs: 1_000 / 120, maxDeltaMs: 50 });
    const outputs: Parameters<ConstructorParameters<typeof WorldPhysicsDriver>[1]>[0][] = [];
    const physics = new WorldPhysicsDriver(clock, (output) => outputs.push(output), () => "wispwalker");
    const driver = new PerformancePrimitiveDriver(clock, physics, { bodyHeightUnits: 1_224 });

    driver.start(plan("squat", [compress()]));
    for (let index = 0; index < 90; index += 1) clock.step();

    expect(physics.floorPose()).toMatchObject({ x: 0, z: 0, speed: 0 });
    expect(physics.getPerformanceGait()).toMatchObject({ compressionRatio: 0.2 });
    expect(Math.min(...outputs.map((output) => output.silhouetteDeltas.overall_height ?? 0)))
      .toBeLessThan(-0.15);
    expect(Math.max(...outputs.map((output) => output.silhouetteDeltas.overall_width ?? 0)))
      .toBeGreaterThan(0.15);
    expect(outputs.every((output) => output.pose.provenance === "physics-authority")).toBe(true);

    driver.destroy();
    physics.destroy();
  });

  it("retargets without resetting the live body velocity", () => {
    // Break caught: interrupting one inferred behavior with another could
    // restart the body from a pose target and create a velocity discontinuity.
    const clock = new GasperOrganismClock({ fixedStepMs: 1_000 / 120, maxDeltaMs: 50 });
    const physics = new WorldPhysicsDriver(clock, () => undefined, () => "wispwalker");
    const driver = new PerformancePrimitiveDriver(clock, physics, { bodyHeightUnits: 1_224 });
    driver.start(plan("right", [travel("right", 0.8)]));
    for (let index = 0; index < 40; index += 1) clock.step();
    const before = { ...physics.getState().body };

    driver.interrupt(plan("left", [travel("left", -0.8)]));
    const after = physics.getState().body;

    expect(after.vx).toBe(before.vx);
    expect(after.vz).toBe(before.vz);
    expect(after.x).toBe(before.x);
    expect(after.z).toBe(before.z);
    expect(driver.inspect()).toMatchObject({ active: true, planId: "left", generation: 2 });

    driver.destroy();
    physics.destroy();
  });

  it("collapses motion under reduced motion and releases cleanly at plan end", () => {
    // Break caught: accessibility collapse could leave a hidden locomotion
    // target armed, or a completed plan could retain performance ownership.
    const clock = new GasperOrganismClock({ maxDeltaMs: 1_000 });
    const port = fakePort();
    const driver = new PerformancePrimitiveDriver(clock, port, { bodyHeightUnits: 1_224 });
    driver.start(plan("collapsed", [travel("travel", 0.5)]), { reducedMotion: true });

    clock.step(1);
    expect(port.locomotion.at(-1)).toEqual({
      owner: "performance",
      intent: { x: 10, z: -20, cruise: 0 },
    });
    expect(port.gait.at(-1)).toBeNull();
    expect(driver.inspect()).toMatchObject({ active: true, reducedMotion: true, disposition: "collapsed" });

    clock.step(500);
    expect(port.stoodDown).toEqual(["performance"]);
    expect(driver.inspect()).toMatchObject({ active: false, disposition: "completed" });
  });
});
