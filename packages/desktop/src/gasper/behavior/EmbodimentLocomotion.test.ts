/**
 * GASPER-PHYSICS-001 · Pressure-Cooker Cycle 2 — the proprioceptive
 * embodiment class proofs (embodied-locomotion-phd-memo E1–E3).
 *
 * The wall: disembodied locomotion — the resting singularity torus filed the
 * same wander legs as the walking body. These proofs pin the law that the
 * locomotion stack reads its own body: rest-class bodies close the wander
 * authority, recall at the rest drift, and carry no step expression.
 *
 * N30 / F-LAW 5 (2026-08-04, ghost-flight-reference-brief): walking belongs
 * to feet. The step vocabulary re-homes to the feeted form (wispwalker)
 * alone; the footless bodies float — their wander authority stays open (the
 * translation is flight, bounded by the S3 flight organ) but the step
 * expression collapses to zero.
 */
import { describe, expect, it } from "vitest";
import { GasperSelectionModel } from "../GasperSelectionModel";
import {
  embodimentGaitGain,
  embodimentLocomotionClass,
  embodimentWanderOpen,
  REST_DRIFT_UNITS_PER_SEC,
} from "./EmbodimentLocomotion";
import { GOLDEN_RATIO, WANDER_LAW } from "./GoldenWander";
import { GoldenWanderDriver } from "./GoldenWanderDriver";
import { WorldPhysicsDriver } from "../physics/WorldPhysicsDriver";
import type {
  LocomotionIntent,
  LocomotionOwner,
} from "../physics/WorldPhysicsDriver";
import type { OrganismClockFrame } from "../clock";

const PHI = GOLDEN_RATIO;

describe("Cycle 2 E1 — the embodiment class table", () => {
  it("classifies every canonical embodiment", () => {
    const expected: Record<string, "rest" | "walker" | "presence"> = {
      presence: "presence",
      comet: "presence",
      halo: "presence",
      lantern: "presence",
      "low-orbit": "presence",
      wispwalker: "walker",
      singularity: "rest",
      "dormant-orbit": "rest",
    };
    // The table covers the whole canonical list — nothing unclassified.
    expect([...GasperSelectionModel.EMBODIMENTS].sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const id of GasperSelectionModel.EMBODIMENTS) {
      expect(embodimentLocomotionClass(id), id).toBe(expected[id]);
      // N30/N31 — the footless bodies still travel (their translation is
      // flight); only rest closes the wander authority.
      expect(embodimentWanderOpen(id), id).toBe(expected[id] !== "rest");
      // N30 / F-LAW 5 — walking belongs to feet: gain 1 for the feeted form
      // (wispwalker) ONLY; footless and rest bodies collapse the steps.
      expect(embodimentGaitGain(id), id).toBe(expected[id] === "walker" ? 1 : 0);
    }
  });

  it("fails closed: an unidentified body is at rest", () => {
    expect(embodimentLocomotionClass("nope")).toBe("rest");
    expect(embodimentLocomotionClass(null)).toBe("rest");
    expect(embodimentLocomotionClass(undefined)).toBe("rest");
    expect(embodimentWanderOpen("nope")).toBe(false);
    expect(embodimentGaitGain(null)).toBe(0);
  });

  it("E3 — the rest drift is base·φ⁻² (≈1 body-length/s)", () => {
    expect(REST_DRIFT_UNITS_PER_SEC).toBeCloseTo(3200 / (PHI * PHI), 6);
    expect(REST_DRIFT_UNITS_PER_SEC).toBeGreaterThan(1100);
    expect(REST_DRIFT_UNITS_PER_SEC).toBeLessThan(1350);
  });
});

// ---------------------------------------------------------------------------
// The wander driver on a live proprioception sense.
// ---------------------------------------------------------------------------

function fakeClock() {
  let sub: { onFrame: (frame: OrganismClockFrame) => void } | null = null;
  let t = 0;
  return {
    subscribe(s: { onFrame: (frame: OrganismClockFrame) => void }) {
      sub = s;
      return () => {
        sub = null;
      };
    },
    now(): number {
      return t;
    },
    fire(deltaMs = 1000 / 60) {
      t += deltaMs / 1000;
      sub?.onFrame({ deltaMs } as unknown as OrganismClockFrame);
    },
    fireFor(seconds: number, stepMs = 1000 / 60) {
      const n = Math.round((seconds * 1000) / stepMs);
      for (let i = 0; i < n; i++) this.fire(stepMs);
    },
  };
}

function fakeLocomotion(clock: ReturnType<typeof fakeClock>) {
  const intents: Partial<Record<LocomotionOwner, LocomotionIntent>> = {};
  const body = { x: 0, z: 0, speed: 0 };
  const log: string[] = [];
  let lastT = 0;

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
  }

  return {
    intents,
    body,
    log,
    setLocomotion(owner: LocomotionOwner, intent: LocomotionIntent): void {
      integrate();
      intents[owner] = intent;
      log.push(
        `set|${owner}|${intent.x.toFixed(3)}|${intent.z.toFixed(3)}|${intent.cruise.toFixed(3)}`,
      );
    },
    clearLocomotion(owner: LocomotionOwner): void {
      integrate();
      delete intents[owner];
      log.push(`clear|${owner}`);
    },
    standDownLocomotion(owner: LocomotionOwner): void {
      integrate();
      delete intents[owner];
      log.push(`standDown|${owner}`);
    },
    floorPose() {
      integrate();
      return { x: body.x, z: body.z, speed: body.speed };
    },
    // Cycle 3 M1/M2 — the kernel's live Coulomb budget (D-0112 field idiom:
    // μ = 1/φ², g = 74210 u/s²). The simulated body ignores it; the wander
    // composer reads it.
    traction: () => ({ mu: 1 / (PHI * PHI), gravity: 74210 }),
  };
}

describe("Cycle 2 E1/E3 — the wanderer reads its own body", () => {
  it("a rest-class body never strolls (gate open, authority closed)", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    let emb: string | null = "singularity";
    const d = new GoldenWanderDriver(clock, port, () => true, () => emb);
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 2);
    expect(port.log.length).toBe(0); // no leg ever filed
    expect(d.getState().phase).toBe("dormant");

    // The body changes — the same organism now walks (proprioception live).
    emb = "presence";
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 1.0); // cooldown + the N41 intent hold (φ⁻¹) -> travel
    expect(d.getState().phase).toBe("travel");
    expect(port.log.some((l) => l.startsWith("set|wander"))).toBe(true);
    d.destroy();
  });

  it("a leg underfoot when the body becomes rest-class finishes as a drift home", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    let emb: string | null = "presence";
    const d = new GoldenWanderDriver(clock, port, () => true, () => emb);
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 1.0); // cooldown + the N41 intent hold (φ⁻¹) -> travel
    expect(d.getState().phase).toBe("travel");

    // The embodiment switches mid-leg: the wanderer recalls at the drift.
    emb = "singularity";
    clock.fireFor(0.2);
    expect(d.getState().phase).toBe("recall");
    const sets = port.log.filter((l) => l.startsWith("set|wander"));
    const cruise = Number(sets[sets.length - 1].split("|")[4]);
    expect(cruise).toBeCloseTo(REST_DRIFT_UNITS_PER_SEC, 3);
    // Never the walking recall — a resting seed glides, never dashes.
    expect(cruise).toBeLessThan(WANDER_LAW.recallSpeedUnitsPerSec / 2);
    d.destroy();
  });

  it("a walking body recalls at the comfort band's top (E2)", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    let open = true;
    const d = new GoldenWanderDriver(clock, port, () => open, () => "presence");
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 1.0); // cooldown + the N41 intent hold (φ⁻¹) -> travel
    expect(d.getState().phase).toBe("travel");
    // Gate closes (a performance is called): recall at the band top. Short
    // window — the simulated body would otherwise walk home and stand down.
    open = false;
    clock.fireFor(0.05);
    expect(d.getState().phase).toBe("recall");
    const sets = port.log.filter((l) => l.startsWith("set|wander"));
    const cruise = Number(sets[sets.length - 1].split("|")[4]);
    expect(cruise).toBeCloseTo(WANDER_LAW.recallSpeedUnitsPerSec, 3);
    d.destroy();
  });
});

describe("N30 / F-LAW 5 — the step vocabulary belongs to feet alone", () => {
  function run(emb: string | null) {
    const clock = fakeClock();
    const outs: { speedRatio: number; bobUnits: number }[] = [];
    const d = new WorldPhysicsDriver(
      clock,
      (out) => outs.push({ speedRatio: out.gait.speedRatio, bobUnits: out.gait.bobUnits }),
      () => emb,
    );
    // The D-0112 field (environment owns g — N5); the test double has none.
    // restSpeed scales with g exactly as the field derives it (otherwise the
    // per-substep gravity kick exceeds the rest threshold and contact never
    // holds — no traction, no walk).
    d.setParams({ gravity: 74210, frictionMu: 0.382, restSpeed: 600 });
    // Inside the frustum wall (xHalf 960 at z 0) — a lawful leg.
    d.setLocomotion("wander", { x: 800, z: 0, cruise: 3200 });
    clock.fireFor(1.0);
    d.destroy();
    return outs;
  }

  it("wispwalker: the feeted form expresses the walk (full step vocabulary)", () => {
    const outs = run("wispwalker");
    const peakRatio = Math.max(...outs.map((o) => o.speedRatio));
    const peakBob = Math.max(...outs.map((o) => o.bobUnits));
    expect(peakRatio).toBeGreaterThan(0.5);
    expect(peakBob).toBeGreaterThan(10);
  });

  it("presence: the footless body floats — the same locomotion carries zero step expression", () => {
    const outs = run("presence");
    expect(outs.length).toBeGreaterThan(0);
    for (const o of outs) {
      expect(o.speedRatio).toBe(0);
      expect(o.bobUnits).toBe(0);
    }
  });

  it("singularity: the same locomotion carries zero step expression", () => {
    const outs = run("singularity");
    for (const o of outs) {
      expect(o.speedRatio).toBe(0);
      expect(o.bobUnits).toBe(0);
    }
  });
});
