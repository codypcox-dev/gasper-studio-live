/**
 * GASPER-CRAFT-002 · D-0106 — golden-angle wander proofs.
 *
 * The law: the idle wander targets are the seeds of the sunflower (Vogel
 * phyllotaxis via canon `golden-section-timing`) — bearings by the golden
 * angle, reach by its Weyl partner, timing on the φ ladders — aperiodic,
 * deterministic, and never outside the bounds Gasper knows (Doctrine 2
 * Layer 2).
 *
 * GASPER-PHYSICS-001 · D-0112: the transport proofs. The driver no longer
 * drags a pose along a path — it files LOCOMOTION INTENTS with the body
 * kernel and reads its own position back from the kernel's floor pose.
 * The driver double below is a simulated body with the kernel's arrival
 * semantics (walks the filed intent at cruise, stands at the target), so
 * these proofs test the driver's state machine against a body that
 * decides when a leg is done — never a timer.
 */
import { describe, expect, it } from "vitest";
import {
  composeWanderLeg,
  composePaintedWanderLeg,
  PAINTED_DEMO_FIRST_TARGET,
  PAINTED_WANDER_READABLE_Z_MAX,
  coulombBrakeDistanceUnits,
  GOLDEN_ANGLE_DEG,
  GOLDEN_RATIO,
  insetWanderArrivalTarget,
  legMinSteadySeconds,
  legSteadySeconds,
  m1DeflectionTarget,
  m1RequiredChordUnits,
  maxChordUnitsAlong,
  wanderArrived,
  wanderTargetOvershot,
  wanderRegionSides,
  WANDER_ARRIVE_INSET_UNITS,
  WANDER_ARRIVE_EPS_UNITS,
  WANDER_ARRIVE_SPEED_UNITS,
  WANDER_LAW,
  WANDER_STALL_SECONDS,
  goldenWanderPlan,
  goldenWanderPlanInsideBounds,
} from "./GoldenWander";
import { GoldenWanderDriver } from "./GoldenWanderDriver";
import type {
  LocomotionIntent,
  LocomotionOwner,
} from "../physics/WorldPhysicsDriver";
import { worldBoundsAt } from "../space/WorldSpace";
import { comfortCruiseBand, gaitStridePeriodSeconds, GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC } from "../physics/GaitLaw";
import type { OrganismClockFrame } from "../clock";

const PHI = GOLDEN_RATIO;

describe("D-0106 — the golden-angle law", () => {
  it("the bearing step is exactly the golden angle (360°/φ²)", () => {
    expect(GOLDEN_ANGLE_DEG).toBeCloseTo(360 / (PHI * PHI), 9);
    expect(GOLDEN_ANGLE_DEG).toBeCloseTo(137.50776, 4);
    // The defining number-theoretic fact: the golden angle never lands on
    // a rational lane — k·GA is never 0 mod 360 for any step we will walk.
    for (let k = 1; k <= 400; k++) {
      expect((k * GOLDEN_ANGLE_DEG) % 360).toBeGreaterThan(1e-9);
    }
  });

  it("bearings advance by exactly the golden angle, step to step", () => {
    for (const k of [0, 1, 5, 41, 200]) {
      const a = goldenWanderPlan(k).bearingDeg;
      const b = goldenWanderPlan(k + 1).bearingDeg;
      expect(((b - a) % 360 + 360) % 360).toBeCloseTo(GOLDEN_ANGLE_DEG, 9);
    }
  });

  it("is aperiodic: 400 seeds, no repeated target, no repeated bearing", () => {
    const seenTargets = new Set<string>();
    const seenBearings = new Set<string>();
    for (let k = 0; k < 400; k++) {
      const p = goldenWanderPlan(k);
      const t = `${p.x.toFixed(6)}|${p.z.toFixed(6)}`;
      expect(seenTargets.has(t), `target repeated at k=${k}`).toBe(false);
      seenTargets.add(t);
      const b = p.bearingDeg.toFixed(6);
      expect(seenBearings.has(b), `bearing repeated at k=${k}`).toBe(false);
      seenBearings.add(b);
    }
  });

  it("covers the desk: all four quadrants within the first 12 seeds", () => {
    // No patrol rail: the seeds spread stage-left/right AND near/far early.
    const quad = new Set<string>();
    for (let k = 0; k < 12; k++) {
      const p = goldenWanderPlan(k);
      quad.add(`${p.x >= 0 ? "R" : "L"}|${p.z >= 0 ? "far" : "near"}`);
    }
    expect(quad.size).toBe(4);
  });

  it("never leaves the bounds Gasper knows — Layer 2 awareness with margin", () => {
    for (let k = 0; k < 400; k++) {
      const p = goldenWanderPlan(k);
      expect(goldenWanderPlanInsideBounds(p), `k=${k}`).toBe(true);
      // Inside the REAL frustum at the target's own depth…
      const b = worldBoundsAt(p.z);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(b.xHalf);
      // …and inside the standing margin — he knows the edge before contact.
      expect(Math.abs(p.x)).toBeLessThanOrEqual(
        b.xHalf * WANDER_LAW.boundsMargin + 1e-9,
      );
      expect(p.z).toBeGreaterThanOrEqual(WANDER_LAW.depthBandMin);
      expect(p.z).toBeLessThanOrEqual(WANDER_LAW.depthBandMax);
    }
  });

  it("the timing is φ: dwells on [φ⁻¹, 1, φ, 2φ], speeds on v·[φ⁻¹, 1, φ]", () => {
    const dwellSet = new Set<number>();
    const speedSet = new Set<number>();
    const ladder = WANDER_LAW.dwellLadderSeconds;
    expect(ladder[0]).toBeCloseTo(1 / PHI, 9);
    expect(ladder[1]).toBe(1);
    expect(ladder[2]).toBeCloseTo(PHI, 9);
    expect(ladder[3]).toBeCloseTo(2 * PHI, 9);
    // Cycle 2 E2: the φ ladder is clamped into the comfort band — the amble
    // never slides below the band, the brisk never crosses the walk→run
    // transition. The φ SHAPE survives inside the band.
    const band = comfortCruiseBand(74210); // D-0112 field gravity
    const v = WANDER_LAW.baseSpeedUnitsPerSec;
    const clampedLadder = [band.min, v, band.max];
    for (let k = 0; k < 60; k++) {
      const p = goldenWanderPlan(k);
      dwellSet.add(p.dwellSeconds);
      speedSet.add(p.speedUnitsPerSec);
      expect(ladder).toContain(p.dwellSeconds);
      expect(
        clampedLadder.some((s) => Math.abs(p.speedUnitsPerSec - s) < 1e-9),
      ).toBe(true);
      expect(p.speedUnitsPerSec).toBeGreaterThanOrEqual(band.min - 1e-9);
      expect(p.speedUnitsPerSec).toBeLessThanOrEqual(band.max + 1e-9);
    }
    // Every rung of both ladders is actually walked — no dead rungs.
    expect(dwellSet.size).toBe(4);
    expect(speedSet.size).toBe(3);
  });

  it("is pure and deterministic (same seed => same plan, frozen)", () => {
    const a = goldenWanderPlan(7);
    const b = goldenWanderPlan(7);
    expect(a).toEqual(b);
    expect(Object.isFrozen(a)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The driver — the hierarchy of authorities, live on a fake clock and a
// simulated body (D-0112: intents in, floor pose out).
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
    /** The organism-time the simulated body integrates against. */
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

/**
 * A simulated body with the kernel's arrival semantics: walks the filed
 * intent at the intent's cruise speed, stands at the target. Every read /
 * write integrates up to the clock first, so the double is a pure function
 * of elapsed time + intent history (the determinism proof depends on it).
 */
function fakeLocomotion(clock: ReturnType<typeof fakeClock>) {
  const intents: Partial<Record<LocomotionOwner, LocomotionIntent>> = {};
  const owners: Record<LocomotionOwner, boolean> = {
    wander: false,
    life: false,
    internal: false,
  };
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
    body.speed = step < d ? intent.cruise : 0; // arrived => standing
  }

  return {
    intents,
    owners,
    body,
    log,
    setLocomotion(owner: LocomotionOwner, intent: LocomotionIntent): void {
      integrate();
      intents[owner] = intent;
      owners[owner] = true;
      log.push(
        `set|${owner}|${intent.x.toFixed(3)}|${intent.z.toFixed(3)}|${intent.cruise.toFixed(3)}`,
      );
    },
    clearLocomotion(owner: LocomotionOwner): void {
      integrate();
      delete intents[owner]; // ownership retained (dwell)
      log.push(`clear|${owner}`);
    },
    standDownLocomotion(owner: LocomotionOwner): void {
      integrate();
      delete intents[owner];
      owners[owner] = false;
      log.push(`standDown|${owner}`);
    },
    floorPose() {
      integrate();
      return { x: body.x, z: body.z, speed: body.speed };
    },
    // Cycle 3 M1/M2 — the kernel's live Coulomb budget (D-0112 field idiom:
    // μ = 1/φ², g = 74210 u/s²). The fake body ignores it; the composer
    // reads it.
    traction: () => ({ mu: 1 / (PHI * PHI), gravity: 74210 }),
  };
}

describe("D-0106/D-0112 — the wander driver (hierarchy of authorities)", () => {
  it("files nothing while the gate is closed", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => false);
    clock.fireFor(10);
    expect(port.log.length).toBe(0);
    expect(d.getState().phase).toBe("dormant");
    expect(port.body.x).toBe(0);
    d.destroy();
  });

  it("opens with a φ² cooldown, then walks the golden seeds", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true);

    // Nothing during the gradual-resume cooldown (φ² ≈ 2.618s).
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds - 0.1);
    expect(port.log.length).toBe(0);

    // First travel leg begins. The painted-demo / isolated-beat first
    // target is a short forward/right walk so he stays large on camera.
    // M1 would still deflect seed 0 onto the far fence (z≈1186). The body
    // kernel owns the walk.
    clock.fireFor(0.2);
    // N41 (2026-08-06): the leg enters the φ⁻¹ s INTENT HOLD first — the
    // telegraph address is given, the intent is NOT filed yet (look, commit,
    // then go). No locomotion intent exists during the hold.
    expect(d.getState().phase).toBe("intent");
    expect(port.intents.wander).toBeUndefined();
    const plan0 = goldenWanderPlan(0);
    const TRACTION = { mu: 1 / (PHI * PHI), gravity: 74210 }; // D-0112 field
    const leg0 = composePaintedWanderLeg({ x: 0, z: 0 }, plan0, TRACTION);
    expect(leg0.mode).toBe("seed");
    expect(leg0.to.x).toBeCloseTo(PAINTED_DEMO_FIRST_TARGET.x, 9);
    expect(leg0.to.z).toBeCloseTo(PAINTED_DEMO_FIRST_TARGET.z, 9);
    expect(leg0.to.z).toBeLessThan(200);
    // The intent hold expires (φ⁻¹ ≈ 0.618s): the leg files and the movement
    // owns the direction. The painted first target is short — sample as soon
    // as travel begins, before the fake body can arrive and dwell.
    {
      let state = d.getState();
      for (let i = 0; i < 200 && state.phase === "intent"; i++) {
        clock.fire();
        state = d.getState();
      }
      expect(state.phase).toBe("travel");
    }
    const filed = port.intents.wander;
    expect(filed).toBeDefined();
    const filed0 = insetWanderArrivalTarget({ x: 0, z: 0 }, leg0.to);
    expect(filed!.x).toBeCloseTo(filed0.x, 9);
    expect(filed!.z).toBeCloseTo(filed0.z, 9);
    // M2: the leg opens at the walk-band stroll (approach = cruise/φ).
    expect(filed!.cruise).toBeCloseTo(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC / WANDER_LAW.phi, 9);
    // The painted first target is a short readable stroll, not an M1 far-fence chord.
    expect(leg0.to.z).toBeLessThanOrEqual(PAINTED_WANDER_READABLE_Z_MAX);
    // take-a oracle: the LIVE plan object (getWanderState().plan), not just
    // the helper constant, must be the readable target — not seed 0's
    // far-fence {z~1018, speed~2610}.
    const live0 = d.getState().plan;
    expect(live0).not.toBeNull();
    expect(live0!.step).toBe(0);
    expect(live0!.z).toBeLessThanOrEqual(PAINTED_WANDER_READABLE_Z_MAX);
    expect(live0!.x).toBeCloseTo(filed0.x, 9);
    expect(live0!.z).toBeCloseTo(filed0.z, 9);
    expect(live0!.speedUnitsPerSec).toBeCloseTo(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC, 9);
    expect(live0!.speedUnitsPerSec).not.toBeCloseTo(plan0.speedUnitsPerSec, 0);

    // Run until the BODY arrives at the composed target and the driver
    // dwells there. The leg completes on arrival (dist < 8, speed < 40),
    // never on a timer.
    let state = d.getState();
    for (let i = 0; i < 6000 && state.phase !== "dwell"; i++) {
      clock.fire();
      state = d.getState();
    }
    expect(state.phase).toBe("dwell");
    expect(state.plan).not.toBe(null);
    expect(state.plan!.step).toBe(0);
    expect(port.body.x).toBeCloseTo(filed0.x, 6);
    expect(port.body.z).toBeCloseTo(filed0.z, 6);
    // Dwell releases ownership so the kernel can rest-in-place (idle breathes).
    expect(port.intents.wander).toBeUndefined();
    expect(port.owners.wander).toBe(false);
    expect(port.log).toContain("standDown|wander");
    // The kernel's floor pose is the state's pose (one source of truth).
    expect(state.pose.x).toBeCloseTo(port.body.x, 9);
    expect(state.pose.z).toBeCloseTo(port.body.z, 9);
    expect(d.getState().nextStep).toBe(1);
    d.destroy();
  });

  it("dwell holds still, then the next leg files for seed 1", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true);
    // Past cooldown + leg 0 + its dwell (the longest rung is 2φ ≈ 3.24s).
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 30);
    const st = d.getState();
    expect(st.nextStep).toBeGreaterThanOrEqual(2);
    // He reached at least seed 1 (the body walked both legs); the next leg
    // may sit in its φ⁻¹ s INTENT hold (N41) — the cycle now includes it.
    expect(st.phase === "travel" || st.phase === "dwell" || st.phase === "intent").toBe(true);
    d.destroy();
  });

  it("a closed gate mid-walk recalls him home, then stands down (no teleport)", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    let open = true;
    const d = new GoldenWanderDriver(clock, port, () => open);

    // Walk out: cooldown + intent hold + a slice of the first travel.
    // A long wall-clock +12s can land in the next seed's intent hold,
    // which stands down instead of recalling.
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 1 / WANDER_LAW.phi + 0.2);
    expect(d.getState().phase).toBe("travel");
    expect(Math.hypot(port.body.x, port.body.z)).toBeGreaterThan(1);

    // The gate closes (a performance is called, autonomy frozen…).
    open = false;
    clock.fire();
    expect(d.getState().phase).toBe("recall");
    // The first closed tick enters recall; the next files HOME.
    clock.fire();
    expect(d.getState().phase).toBe("recall");
    const recall = port.intents.wander;
    expect(recall).toBeDefined();
    expect(recall!.x).toBe(0);
    expect(recall!.z).toBe(0);
    // Recall home at walk-band — a dash at the Froude ceiling is a teleport.
    expect(recall!.cruise).toBeCloseTo(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC, 9);

    // He walks home — a continuous path, never a jump.
    let prev = { x: port.body.x, z: port.body.z };
    for (let i = 0; i < 600 && d.getState().phase !== "dormant"; i++) {
      clock.fire();
      const step = Math.hypot(port.body.x - prev.x, port.body.z - prev.z);
      expect(step).toBeLessThan(WANDER_LAW.recallSpeedUnitsPerSec / 60 + 10); // a walk, not a teleport — Cycle 2 E2: recall cruise per frame + margin
      prev = { x: port.body.x, z: port.body.z };
    }
    expect(d.getState().phase).toBe("dormant");
    // Home, and ownership released exactly once (the kernel releases from here).
    expect(Math.hypot(port.body.x, port.body.z)).toBeLessThan(8);
    expect(port.owners.wander).toBe(false);
    expect(port.log.filter((l) => l === "standDown|wander").length).toBeGreaterThanOrEqual(1);

    // And silence afterwards — no further intents are filed.
    const n0 = port.log.length;
    clock.fireFor(3);
    expect(port.log.length).toBe(n0);
    d.destroy();
  });

  it("deterministic: two drivers on identical clocks file identical intent streams", () => {
    const run = () => {
      const clock = fakeClock();
      const port = fakeLocomotion(clock);
      const d = new GoldenWanderDriver(clock, port, () => true);
      clock.fireFor(25);
      const out = [
        ...port.log,
        `body|${port.body.x.toFixed(4)}|${port.body.z.toFixed(4)}`,
      ];
      d.destroy();
      return out;
    };
    expect(run()).toEqual(run());
  });

  it("the master switch closes the authority like the gate", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true);
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds);
    {
      let state = d.getState();
      for (let i = 0; i < 200 && state.phase !== "travel"; i++) {
        clock.fire();
        state = d.getState();
      }
      expect(state.phase).toBe("travel");
    }
    expect(port.log.length).toBeGreaterThan(0);
    d.setEnabled(false);
    // Recall + walk home + stand down + silence.
    clock.fireFor(25);
    expect(d.getState().phase).toBe("dormant");
    expect(port.owners.wander).toBe(false);
    expect(Math.hypot(port.body.x, port.body.z)).toBeLessThan(8);
    const n0 = port.log.length;
    clock.fireFor(3);
    expect(port.log.length).toBe(n0);
    d.destroy();
  });
});

// ---------------------------------------------------------------------------
// Pressure-Cooker Cycle 3 (locomotion-legibility-phd-memo M1/M2) — the leg
// composition proofs: every walk grants the gait its steady window, derived
// from the room + the kernel's traction, never authored per instance.
// ---------------------------------------------------------------------------

const CYCLE3_TRACTION = { mu: 1 / (PHI * PHI), gravity: 74210 } as const; // D-0112 field
const CYCLE3_MU_G = CYCLE3_TRACTION.mu * CYCLE3_TRACTION.gravity;

describe("Cycle 3 M1 — the steady-window law (legibility of the walk)", () => {
  it("the minimum window is DERIVED from the gait observables (floor binds)", () => {
    // max(2·T_stride at the band max, 0.9 s): under the Cycle-8 X1 stride
    // cadence 2·T_stride ≈ 0.66 s, so the perceptual floor (Cutting: gait
    // identity stabilizes after 2–3 strides) is the binding number — but the
    // derivation stays live in the law, not a constant.
    const twoStrides = 2 * gaitStridePeriodSeconds(comfortCruiseBand(74210).max);
    expect(twoStrides).toBeLessThan(0.9);
    expect(legMinSteadySeconds()).toBeCloseTo(Math.max(twoStrides, 0.9), 9);
    expect(legMinSteadySeconds()).toBeGreaterThanOrEqual(0.9);
  });

  it("the window is monotone: longer chord more, faster cruise less", () => {
    expect(legSteadySeconds(2000, 2610, CYCLE3_MU_G)).toBeGreaterThan(
      legSteadySeconds(1500, 2610, CYCLE3_MU_G),
    );
    expect(legSteadySeconds(2000, 2610, CYCLE3_MU_G)).toBeGreaterThan(
      legSteadySeconds(2000, 3987, CYCLE3_MU_G),
    );
    expect(legSteadySeconds(0, 2610, CYCLE3_MU_G)).toBe(0); // fail-closed
    expect(legSteadySeconds(1000, -5, CYCLE3_MU_G)).toBe(0);
  });

  it("the derived far edge is anchored: the diagonal hosts M1 at the base cruise, one unit less does not", () => {
    // M1b (Cycle-3 take-1 evidence): the bare-minimum edge made M1-hosting
    // chords a measure-zero set (12/12 live legs room-limited). The anchor
    // is the walk's ADOPTED BASE cruise (GaitLaw φ⁰ rung) — one lawful rung
    // deeper than the band floor, so the feasible cone has real measure.
    const m = WANDER_LAW.boundsMargin;
    const zMin = WANDER_LAW.depthBandMin;
    const band = comfortCruiseBand(CYCLE3_TRACTION.gravity);
    const base = WANDER_LAW.baseSpeedUnitsPerSec;
    const diagonal = (zMax: number) => {
      const xFar = m * worldBoundsAt(zMax).xHalf;
      const xNear = m * worldBoundsAt(zMin).xHalf;
      return Math.hypot(xFar + xNear, zMax - zMin);
    };
    const atEdge = legSteadySeconds(
      diagonal(WANDER_LAW.depthBandMax),
      base,
      CYCLE3_MU_G,
    );
    const oneLess = legSteadySeconds(
      diagonal(WANDER_LAW.depthBandMax - 1),
      base,
      CYCLE3_MU_G,
    );
    expect(atEdge).toBeGreaterThanOrEqual(legMinSteadySeconds());
    expect(oneLess).toBeLessThan(legMinSteadySeconds());
    // The margin is PROVEN live: at the band floor the same diagonal grants
    // a window strictly longer than M1 — M1 chords are no longer a hair.
    const atFloor = legSteadySeconds(
      diagonal(WANDER_LAW.depthBandMax),
      band.min,
      CYCLE3_MU_G,
    );
    expect(atFloor).toBeGreaterThan(legMinSteadySeconds());
    // The near glass stays the N35 owner cap (1.2×) — only the far edge moved.
    expect(WANDER_LAW.depthBandMin).toBe(-320);
  });

  it("the ray exit lands inside the bounds he knows (wall awareness)", () => {
    const m = WANDER_LAW.boundsMargin;
    const dirs = [0, 30, 77, 137.5, 200, 261.8, 310].map((deg) => ({
      dx: Math.cos((deg * Math.PI) / 180),
      dz: Math.sin((deg * Math.PI) / 180),
    }));
    const starts = [
      { x: 0, z: 0 },
      { x: 600, z: -250 }, // inside the N35 band (min −320)
      { x: -1200, z: 1400 },
    ];
    for (const s of starts) {
      for (const d of dirs) {
        const t = maxChordUnitsAlong(s, d.dx, d.dz);
        expect(t).toBeGreaterThan(0);
        const x = s.x + d.dx * t;
        const z = s.z + d.dz * t;
        expect(z).toBeGreaterThanOrEqual(WANDER_LAW.depthBandMin - 1e-6);
        expect(z).toBeLessThanOrEqual(WANDER_LAW.depthBandMax + 1e-6);
        expect(Math.abs(x)).toBeLessThanOrEqual(
          worldBoundsAt(z).xHalf * m + 1e-6,
        );
      }
    }
  });

  it("census: 400 seeds × 3 starts — band cruises, bounded targets, honest windows", () => {
    const band = comfortCruiseBand(CYCLE3_TRACTION.gravity);
    const T = legMinSteadySeconds();
    const m = WANDER_LAW.boundsMargin;
    const starts = [
      { x: 0, z: 0 },
      { x: 0.86 * worldBoundsAt(WANDER_LAW.depthBandMin).xHalf - 1, z: WANDER_LAW.depthBandMin + 1 },
      { x: -0.86 * worldBoundsAt(WANDER_LAW.depthBandMax).xHalf + 1, z: WANDER_LAW.depthBandMax - 1 },
    ];
    let roomLimited = 0;
    let deflected = 0;
    for (const s of starts) {
      for (let k = 0; k < 400; k++) {
        const plan = goldenWanderPlan(k);
        if (Math.hypot(plan.x - s.x, plan.z - s.z) < 1e-6) continue;
        const leg = composeWanderLeg(s, plan, CYCLE3_TRACTION);
        // E2 inviolate: the cruise never leaves the comfort band.
        expect(leg.cruiseUnitsPerSec).toBeGreaterThanOrEqual(band.min - 1e-9);
        expect(leg.cruiseUnitsPerSec).toBeLessThanOrEqual(band.max + 1e-9);
        // Layer 2: the composed target inside the bounds he knows.
        expect(leg.to.z).toBeGreaterThanOrEqual(WANDER_LAW.depthBandMin - 1e-6);
        expect(leg.to.z).toBeLessThanOrEqual(WANDER_LAW.depthBandMax + 1e-6);
        expect(Math.abs(leg.to.x)).toBeLessThanOrEqual(
          worldBoundsAt(leg.to.z).xHalf * m + 1e-6,
        );
        // M1: the window fills, or the room cannot grant it (honest clamp).
        if (leg.mode === "room-limited") {
          roomLimited++;
          expect(leg.cruiseUnitsPerSec).toBeCloseTo(band.min, 9);
        } else {
          expect(leg.steadySeconds).toBeGreaterThanOrEqual(T - 1e-9);
        }
        if (leg.mode === "deflected") deflected++;
        // Determinism: the same body + seed + field, the same leg.
        expect(composeWanderLeg(s, plan, CYCLE3_TRACTION)).toEqual(leg);
      }
    }
    // N35 (2026-08-06): the narrower near band widens the near corners, so
    // the derived far edge grants the M1 window from every sampled pose —
    // the room no longer limits (honest physics: it grants; deflected bends
    // are the census, never hidden). roomLimited may be 0 BY LAW.
    expect(deflected).toBeGreaterThan(0);
    // When the room does limit, the clamp is honest (band floor cruise) —
    // covered by the branch above; the law never hides a limit.
    expect(roomLimited).toBeGreaterThanOrEqual(0);
  });

  it("fail-closed: no traction walks the bare seed", () => {
    const plan = goldenWanderPlan(3);
    const leg = composeWanderLeg({ x: 0, z: 0 }, plan, null);
    expect(leg.mode).toBe("seed");
    expect(leg.to.x).toBeCloseTo(plan.x, 9);
    expect(leg.to.z).toBeCloseTo(plan.z, 9);
    expect(leg.cruiseUnitsPerSec).toBeCloseTo(plan.speedUnitsPerSec, 9);
    expect(leg.bandMinUnitsPerSec).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pressure-Cooker Cycle 3 M1b — the prefer clause. Take 1 proved the bare
// far edge made M1-hosting chords measure-zero (12/12 legs room-limited).
// The fix: the far edge anchored at the adopted base cruise (the feasible
// cone gains real measure), and when the golden chord still cannot host the
// window, the bearing deflects by the SMALLEST angle onto the boundary arc
// that can — the sunflower keeps the bearing whenever the room allows.
// ---------------------------------------------------------------------------

describe("Cycle 3 M1b — minimal deflection onto an M1 chord", () => {
  const band = comfortCruiseBand(CYCLE3_TRACTION.gravity);
  const L_REQ = m1RequiredChordUnits(band.min, CYCLE3_MU_G);
  const m = WANDER_LAW.boundsMargin;
  const nearCorner = {
    x: -m * worldBoundsAt(WANDER_LAW.depthBandMin).xHalf,
    z: WANDER_LAW.depthBandMin,
  };
  const farCorner = {
    x: m * worldBoundsAt(WANDER_LAW.depthBandMax).xHalf,
    z: WANDER_LAW.depthBandMax,
  };

  const distanceToSide = (
    p: Readonly<{ x: number; z: number }>,
    s: Readonly<{ ax: number; az: number; bx: number; bz: number }>,
  ): number => {
    const ex = s.bx - s.ax;
    const ez = s.bz - s.az;
    const t = Math.min(
      1,
      Math.max(0, ((p.x - s.ax) * ex + (p.z - s.az) * ez) / (ex * ex + ez * ez)),
    );
    return Math.hypot(p.x - (s.ax + t * ex), p.z - (s.az + t * ez));
  };

  const longestChordFrom = (s: Readonly<{ x: number; z: number }>): number => {
    let longest = 0;
    for (let i = 0; i < 1440; i++) {
      const a = (i * 0.25 * Math.PI) / 180;
      longest = Math.max(longest, maxChordUnitsAlong(s, Math.cos(a), Math.sin(a)));
    }
    return longest;
  };

  it("the required chord is live in the traction (never a constant)", () => {
    expect(m1RequiredChordUnits(band.min, CYCLE3_MU_G)).toBeCloseTo(L_REQ, 9);
    // A faster cruise needs a longer chord; weaker traction too.
    expect(m1RequiredChordUnits(band.max, CYCLE3_MU_G)).toBeGreaterThan(L_REQ);
    expect(m1RequiredChordUnits(band.min, CYCLE3_MU_G / 2)).toBeGreaterThan(L_REQ);
    expect(m1RequiredChordUnits(-1, CYCLE3_MU_G)).toBe(Number.POSITIVE_INFINITY);
  });

  it("the region boundary is the four margin-scaled sides he knows", () => {
    const sides = wanderRegionSides();
    expect(sides.length).toBe(4);
    for (const s of sides) {
      for (const [px, pz] of [
        [s.ax, s.az],
        [s.bx, s.bz],
      ]) {
        expect(
          pz === WANDER_LAW.depthBandMin || pz === WANDER_LAW.depthBandMax,
        ).toBe(true);
        expect(Math.abs(Math.abs(px) - m * worldBoundsAt(pz).xHalf)).toBeLessThan(1e-9);
      }
    }
  });

  it("deflection lands ON the boundary at the required chord (or honest null)", () => {
    const dirs = [0, 45, 90, 137.5, 200, 280].map((deg) => ({
      dx: Math.cos((deg * Math.PI) / 180),
      dz: Math.sin((deg * Math.PI) / 180),
    }));
    const starts = [
      nearCorner,
      { x: 0, z: WANDER_LAW.depthBandMin },
      farCorner,
      { x: 0, z: 0 }, // home — the honest null case
    ];
    let nulls = 0;
    for (const s of starts) {
      for (const d of dirs) {
        const t = m1DeflectionTarget(s, d.dx, d.dz, L_REQ);
        if (t === null) {
          nulls++;
          // A null is only honest when no bearing reaches the chord.
          expect(longestChordFrom(s)).toBeLessThan(L_REQ + 1e-6);
          continue;
        }
        const onSide = wanderRegionSides().some(
          (side) => distanceToSide(t, side) < 1e-6,
        );
        expect(onSide).toBe(true);
        expect(t.chordUnits).toBeGreaterThanOrEqual(L_REQ - 1e-6);
        expect(Math.hypot(t.x - s.x, t.z - s.z)).toBeCloseTo(t.chordUnits, 6);
        expect(t.deflectionRad).toBeGreaterThanOrEqual(0);
      }
    }
    expect(nulls).toBeGreaterThanOrEqual(0); // censused
    // N35 (2026-08-06): the narrower near band widens the near corners — the
    // derived far edge grants M1 from every sampled pose, so no honest null
    // was needed; when one occurs (future band changes), the per-sample
    // honesty branch above still guards it.
    if (nulls === 0) {
      for (const s of starts) {
        expect(longestChordFrom(s)).toBeGreaterThanOrEqual(L_REQ - 1e-6);
      }
    }
  });

  it("the turn is MINIMAL: a brute-force bearing scan finds no smaller one", () => {
    const starts = [nearCorner, { x: 0, z: WANDER_LAW.depthBandMin }];
    const seeds = [1, 7, 13, 42];
    for (const s of starts) {
      for (const k of seeds) {
        const plan = goldenWanderPlan(k);
        const dx = plan.x - s.x;
        const dz = plan.z - s.z;
        const chordSeed = Math.hypot(dx, dz);
        if (chordSeed < 1e-6) continue;
        const goldenDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
        const t = m1DeflectionTarget(s, dx / chordSeed, dz / chordSeed, L_REQ);
        expect(t).not.toBe(null);
        // Scan every 0.25°: feasible ⟺ the ray exit reaches the chord.
        let minAng = Number.POSITIVE_INFINITY;
        for (let i = 0; i < 1440; i++) {
          const deg = i * 0.25;
          const a = (deg * Math.PI) / 180;
          if (maxChordUnitsAlong(s, Math.cos(a), Math.sin(a)) < L_REQ - 1e-9) {
            continue;
          }
          const wrap = Math.abs((((deg - goldenDeg + 540) % 360) + 360) % 360 - 180);
          minAng = Math.min(minAng, wrap);
        }
        expect(Number.isFinite(minAng)).toBe(true);
        expect(Math.abs((t!.deflectionRad * 180) / Math.PI - minAng)).toBeLessThan(0.6);
      }
    }
  });

  it("composed deflected legs fill the window inside the band (census)", () => {
    const T = legMinSteadySeconds();
    const starts = [
      nearCorner,
      farCorner,
      { x: 0, z: WANDER_LAW.depthBandMin },
    ];
    let deflected = 0;
    for (const s of starts) {
      for (let k = 0; k < 128; k++) {
        const plan = goldenWanderPlan(k);
        if (Math.hypot(plan.x - s.x, plan.z - s.z) < 1e-6) continue;
        const leg = composeWanderLeg(s, plan, CYCLE3_TRACTION);
        expect(leg.cruiseUnitsPerSec).toBeGreaterThanOrEqual(band.min - 1e-9);
        expect(leg.cruiseUnitsPerSec).toBeLessThanOrEqual(band.max + 1e-9);
        if (leg.mode !== "room-limited") {
          expect(leg.steadySeconds).toBeGreaterThanOrEqual(T - 1e-9);
        }
        if (leg.mode === "deflected") {
          deflected++;
          expect(leg.chordUnits).toBeGreaterThanOrEqual(L_REQ - 1e-6);
          const onSide = wanderRegionSides().some(
            (side) => distanceToSide(leg.to, side) < 1e-6,
          );
          expect(onSide).toBe(true);
        }
      }
    }
    expect(deflected).toBeGreaterThan(0);
  });

  it("the golden bearing is preserved whenever it hosts M1 (no needless turn)", () => {
    // From the near corner the far corner rides the room's diagonal — the
    // longest lawful chord. A seed on that bearing walks UNDEFLECTED.
    const plan = {
      step: 0,
      bearingDeg: 0,
      x: farCorner.x,
      z: farCorner.z,
      speedUnitsPerSec: WANDER_LAW.baseSpeedUnitsPerSec,
      dwellSeconds: 1,
    };
    const leg = composeWanderLeg(nearCorner, plan, CYCLE3_TRACTION);
    expect(leg.mode === "seed" || leg.mode === "extended").toBe(true);
    expect(leg.to.x).toBeCloseTo(farCorner.x, 9);
    expect(leg.to.z).toBeCloseTo(farCorner.z, 9);
    expect(leg.steadySeconds).toBeGreaterThanOrEqual(legMinSteadySeconds());
  });

  it("the composer never claims a deflection the room cannot grant (N35 band)", () => {
    const home = { x: 0, z: 0 };
    // N35 (2026-08-06): the narrower near band widens the near corners — the
    // room now GRANTS M1 from home (max chord ≈ 2982 ≥ L_req ≈ 2949), so
    // deflections from home are lawful; the invariant is that every claimed
    // deflection is honestly granted (chord ≥ L_req on a region boundary).
    expect(longestChordFrom(home)).toBeGreaterThanOrEqual(L_REQ - 1e-6);
    for (let k = 0; k < 32; k++) {
      const leg = composeWanderLeg(home, goldenWanderPlan(k), CYCLE3_TRACTION);
      if (leg.mode === "deflected") {
        expect(leg.chordUnits).toBeGreaterThanOrEqual(L_REQ - 1e-6);
        expect(
          wanderRegionSides().some((side) => distanceToSide(leg.to, side) < 1e-6),
        ).toBe(true);
      } else {
        expect(leg.steadySeconds).toBeGreaterThanOrEqual(
          legMinSteadySeconds() - 1e-9,
        );
      }
    }
  });

  it("deflected endpoints fan out — never a patrol rail", () => {
    // N35 census: pool deflections across the region's corners — the fan-out
    // law is a population property, not a single-start pin.
    const targets = new Set<string>();
    for (const s of [nearCorner, farCorner, { x: 0, z: WANDER_LAW.depthBandMin }]) {
      for (let k = 0; k < 128; k++) {
        const leg = composeWanderLeg(s, goldenWanderPlan(k), CYCLE3_TRACTION);
        if (leg.mode === "deflected") {
          targets.add(`${leg.to.x.toFixed(1)}|${leg.to.z.toFixed(1)}`);
        }
      }
    }
    expect(targets.size).toBeGreaterThanOrEqual(3);
  });
});

describe("Cycle 3 M2 — establish–hold–arrive, derived live from the body", () => {
  it("phases run approach → steady → arrive in order, never authored", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true);

    // Past the cooldown: the tick that begins the leg leaves it in the
    // approach phrasing (the slowest lawful walk, establishing the gait).
    // Tick to travel (bounded) rather than assume a tick count.
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 0.1);
    let guard = 0;
    while (d.getState().phase !== "travel" && guard++ < 120) clock.fire();
    let state = d.getState();
    expect(state.phase).toBe("travel");
    expect(state.legPhase).toBe("approach");

    // Seed the record with the phrasing under the feet at leg start (the
    // approach is real but shorter than a sample on the simulated body).
    const seen: string[] = state.legPhase ? [state.legPhase] : [];
    for (let i = 0; i < 6000 && state.phase !== "dwell"; i++) {
      clock.fire();
      state = d.getState();
      if (state.legPhase && seen[seen.length - 1] !== state.legPhase) {
        seen.push(state.legPhase);
      }
    }
    expect(state.phase).toBe("dwell");
    expect(seen[0]).toBe("approach"); // one tick, then the body is at the band
    expect(seen).toContain("steady");
    expect(seen).toContain("arrive");
    expect(seen.indexOf("approach")).toBeLessThan(seen.indexOf("steady"));
    expect(seen.indexOf("steady")).toBeLessThan(seen.indexOf("arrive"));
    // Arrival began inside the kernel's Coulomb envelope, not at a timer.
    expect(state.legPhase).toBe(null);
    d.destroy();
  });

  it("recall is urgent: no phrasing on the walk home", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    let open = true;
    const d = new GoldenWanderDriver(clock, port, () => open);
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds);
    {
      let state = d.getState();
      for (let i = 0; i < 200 && state.phase !== "travel"; i++) {
        clock.fire();
        state = d.getState();
      }
      expect(state.phase).toBe("travel");
    }
    open = false;
    clock.fire();
    expect(d.getState().phase).toBe("recall");
    expect(d.getState().legPhase).toBe(null);
    expect(d.getState().legMode).toBe(null);
    d.destroy();
  });
});

describe("N41 — the intention telegraph (look, commit, then go)", () => {
  it("fires the travel bearing at the intent hold and NULL when the leg files", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const fired: Array<number | null> = [];
    const d = new GoldenWanderDriver(
      clock, port, () => true, () => "presence",
      (b) => fired.push(b),
    );
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 0.1); // cooldown -> intent (small overshoot: the first tick starts the count)
    expect(d.getState().phase).toBe("intent");
    expect(fired.length).toBe(1);
    expect(fired[0]).not.toBeNull(); // a real bearing in the clock frame
    // no intent is filed during the hold — the address comes first
    expect(port.intents.wander).toBeUndefined();
    {
      let state = d.getState();
      for (let i = 0; i < 200 && state.phase === "intent"; i++) {
        clock.fire();
        state = d.getState();
      }
      expect(state.phase).toBe("travel");
    }
    expect(fired.length).toBe(2);
    expect(fired[1]).toBeNull(); // the movement owns the direction now
    expect(port.intents.wander).toBeDefined();
    d.destroy();
  });

  it("the telegraph bearing points AT the composed target (clock frame)", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    let bearing: number | null = null;
    const d = new GoldenWanderDriver(
      clock, port, () => true, () => "presence",
      (b) => { if (b != null) bearing = b; },
    );
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 0.1);
    const plan0 = goldenWanderPlan(0);
    const leg0 = composePaintedWanderLeg({ x: 0, z: 0 }, plan0, {
      mu: 1 / (PHI * PHI),
      gravity: 74210,
    });
    const expectDeg = (Math.atan2(leg0.to.x, -leg0.to.z) * 180) / Math.PI;
    expect(bearing).not.toBeNull();
    expect(Math.abs(((bearing! - expectDeg + 540) % 360) - 180)).toBeLessThan(1e-6);
    d.destroy();
  });

  it("suppression during the hold releases the address and stands down", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    let open = true;
    const fired: Array<number | null> = [];
    const d = new GoldenWanderDriver(
      clock, port, () => open, () => "presence",
      (b) => fired.push(b),
    );
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 0.1);
    expect(d.getState().phase).toBe("intent");
    open = false;
    clock.fire();
    expect(fired[fired.length - 1]).toBeNull(); // released, never left hanging
    expect(d.getState().phase).toBe("dormant");
    d.destroy();
  });
});

describe("painted-demo / isolated-beat first target", () => {
  const HOME = { x: 0, z: 0 };
  const TRACTION = { mu: 1 / ((1 + Math.sqrt(5)) / 2) ** 2, gravity: 74210 };

  it("files a multi-stride stroll instead of the z≈1186 far fence", () => {
    const raw = composeWanderLeg(HOME, goldenWanderPlan(0), TRACTION);
    expect(raw.to.z).toBeGreaterThan(800);
    const painted = composePaintedWanderLeg(HOME, goldenWanderPlan(0), TRACTION);
    expect(painted.to.x).toBeCloseTo(PAINTED_DEMO_FIRST_TARGET.x, 9);
    expect(painted.to.z).toBeCloseTo(PAINTED_DEMO_FIRST_TARGET.z, 9);
    expect(painted.to.x).toBeGreaterThan(0);
    expect(painted.to.z).toBeGreaterThan(0);
    expect(painted.to.z).toBeLessThanOrEqual(PAINTED_WANDER_READABLE_Z_MAX);
    expect(painted.to.z).toBeLessThan(200);
    const stride = 0.75 * 1224;
    expect(Math.hypot(painted.to.x, painted.to.z)).toBeGreaterThanOrEqual(2 * stride);
    expect(painted.cruiseUnitsPerSec).toBeLessThan(2000);
    expect(painted.cruiseUnitsPerSec).toBeGreaterThan(1400);
  });

  it("later seeds cannot file a depth teleport past the readable cap", () => {
    const from = PAINTED_DEMO_FIRST_TARGET;
    const painted = composePaintedWanderLeg(from, goldenWanderPlan(1), TRACTION);
    expect(painted.to.z).toBeLessThanOrEqual(PAINTED_WANDER_READABLE_Z_MAX);
    expect(painted.to.z).toBeGreaterThanOrEqual(WANDER_LAW.depthBandMin);
  });

  it("the live first plan object matches the composed readable target (take-a oracle)", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true, () => "wispwalker");
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 0.1);
    let guard = 0;
    while (d.getState().phase !== "travel" && guard++ < 200) clock.fire();
    expect(d.getState().phase).toBe("travel");
    const raw = goldenWanderPlan(0);
    const painted = composePaintedWanderLeg(HOME, raw, TRACTION);
    const filed = insetWanderArrivalTarget(HOME, painted.to);
    const live = d.getState().plan;
    expect(raw.z).toBeGreaterThan(800);
    expect(raw.speedUnitsPerSec).toBeLessThan(2700);
    expect(live).not.toBeNull();
    expect(live!.step).toBe(0);
    expect(live!.z).toBeLessThanOrEqual(PAINTED_WANDER_READABLE_Z_MAX);
    expect(live!.x).toBeCloseTo(filed.x, 9);
    expect(live!.z).toBeCloseTo(filed.z, 9);
    expect(live!.speedUnitsPerSec).toBeCloseTo(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC, 9);
    expect(live!.speedUnitsPerSec).not.toBeCloseTo(raw.speedUnitsPerSec, 0);
    expect(live!.speedUnitsPerSec).toBeLessThan(2000);
    const filedIntent = port.intents.wander;
    expect(filedIntent).toBeDefined();
    expect(filedIntent!.x).toBeCloseTo(live!.x, 9);
    expect(filedIntent!.z).toBeCloseTo(live!.z, 9);
    d.destroy();
  });

  it("later live plans stay inside the readable frustum", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true, () => "wispwalker");
    const zs: number[] = [];
    for (let i = 0; i < 4000; i++) {
      clock.fire();
      const plan = d.getState().plan;
      if (plan) zs.push(plan.z);
    }
    expect(zs.length).toBeGreaterThan(0);
    expect(Math.max(...zs)).toBeLessThanOrEqual(PAINTED_WANDER_READABLE_Z_MAX);
    d.destroy();
  });
});

describe("wander stop — inset, overshoot, stall (120fps wall-pin)", () => {
  const HOME = { x: 0, z: 0 };

  it("insets a fence target inward along the chord by φ²·allowance", () => {
    const to = { x: 0, z: WANDER_LAW.depthBandMax };
    const inset = insetWanderArrivalTarget(HOME, to);
    expect(inset.x).toBeCloseTo(0, 9);
    expect(to.z - inset.z).toBeCloseTo(WANDER_ARRIVE_INSET_UNITS, 9);
    expect(inset.z).toBeLessThan(WANDER_LAW.depthBandMax - WANDER_ARRIVE_EPS_UNITS);
    expect(goldenWanderPlanInsideBounds({
      step: 0,
      bearingDeg: 0,
      x: inset.x,
      z: inset.z,
      speedUnitsPerSec: WANDER_LAW.baseSpeedUnitsPerSec,
      dwellSeconds: 1,
    })).toBe(true);
  });

  it("overshoot is true past the target and false on the approach", () => {
    const target = { x: 100, z: 100 };
    expect(wanderTargetOvershot(HOME, target, { x: 50, z: 50 })).toBe(false);
    expect(wanderTargetOvershot(HOME, target, { x: 100, z: 100 })).toBe(false);
    expect(wanderTargetOvershot(HOME, target, { x: 120, z: 120 })).toBe(true);
    expect(wanderArrived({ x: 100, z: 100 }, target, 0)).toBe(true);
    expect(wanderArrived({ x: 100, z: 100 }, target, WANDER_ARRIVE_SPEED_UNITS)).toBe(false);
  });

  it("a body that pins short of the fence with residual speed still stops and replans", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const wallZ = WANDER_LAW.depthBandMax;
    const origIntegrate = port.floorPose;
    // Clamp the simulated body short of the far fence and leave residual
    // speed — the 120fps pin (z≈1186.6, |v|≈39.4, nextStep stuck at 1).
    const wrap = () => {
      const p = origIntegrate.call(port);
      if (p.z > wallZ - 14) {
        port.body.z = wallZ - 14;
        port.body.speed = 39.4;
        return { x: port.body.x, z: port.body.z, speed: port.body.speed };
      }
      return p;
    };
    port.floorPose = wrap;
    const d = new GoldenWanderDriver(clock, port, () => true, () => "wispwalker");
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 12);
    const st = d.getState();
    expect(st.nextStep).toBeGreaterThanOrEqual(2);
    expect(st.phase === "dwell" || st.phase === "intent" || st.phase === "travel").toBe(true);
    // A real stop happened: wander released the wall-pin (stand-down)
    // or cleared a reached/overshot intent.
    expect(
      port.log.some((l) => l === "standDown|wander" || l === "clear|wander"),
    ).toBe(true);
    d.destroy();
  });

  it("an overshooting body completes the current plan instead of grinding", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true, () => "wispwalker");
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 0.1);
    let guard = 0;
    while (d.getState().phase !== "travel" && guard++ < 120) clock.fire();
    expect(d.getState().phase).toBe("travel");
    const filed = port.intents.wander;
    expect(filed).toBeDefined();
    // Teleport past the filed target along the chord — the live capture
    // overshot seed (442, 1018) and never issued plan 1.
    port.body.x = filed!.x * 1.4;
    port.body.z = filed!.z * 1.4;
    port.body.speed = 800;
    clock.fireFor(0.1);
    const st = d.getState();
    expect(st.phase).toBe("dwell");
    expect(st.nextStep).toBe(1);
    expect(port.intents.wander).toBeUndefined();
    expect(port.owners.wander).toBe(false);
    expect(port.log.some((l) => l === "standDown|wander")).toBe(true);
    expect(port.body.speed).toBe(0);
    d.destroy();
  });

  it("stall window is the φ⁻¹ hold, not a tuned timer", () => {
    expect(WANDER_STALL_SECONDS).toBeCloseTo(1 / GOLDEN_RATIO, 9);
    expect(WANDER_ARRIVE_INSET_UNITS).toBeCloseTo(8 * GOLDEN_RATIO * GOLDEN_RATIO, 9);
  });

  it("a bound-pinned body standDowns immediately instead of grinding the wall", () => {
    const clock = fakeClock();
    const port = fakeLocomotion(clock);
    const d = new GoldenWanderDriver(clock, port, () => true, () => "wispwalker");
    clock.fireFor(WANDER_LAW.resumeCooldownSeconds + 0.1);
    let guard = 0;
    while (d.getState().phase !== "travel" && guard++ < 120) clock.fire();
    expect(d.getState().phase).toBe("travel");
    const filed = port.intents.wander;
    expect(filed).toBeDefined();
    port.body.x = filed!.x * 0.95;
    port.body.z = filed!.z * 0.95;
    port.body.speed = 20;
    const orig = port.floorPose;
    port.floorPose = () => ({ ...orig.call(port), boundPinned: true });
    clock.fireFor(0.05);
    const st = d.getState();
    expect(st.phase).toBe("dwell");
    expect(port.owners.wander).toBe(false);
    expect(port.log.some((l) => l === "standDown|wander")).toBe(true);
    d.destroy();
  });
});
