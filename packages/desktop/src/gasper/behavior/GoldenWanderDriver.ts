/**
 * GASPER-PHYSICS-001 · D-0112 — the golden-angle wander authority.
 *
 * The idle-life transport: subscribes to the organism clock (sole time
 * source) and, while autonomy is open, walks Gasper through the golden
 * seeds of `goldenWanderPlan` — a dwell ladder of holds, strolls timed by
 * the φ speed ladder, bearings turning by the golden angle.
 *
 * D-0112 transport law: wander no longer drags a pose along a smoothstep
 * path. It files LOCOMOTION INTENTS (target + cruise) with the body kernel —
 * the sole writer of free movement — and reads its own position back from
 * the kernel's floor pose. The ease-out of every arrival is Coulomb
 * friction inside the kernel, not an authored curve; a leg completes when
 * the BODY arrives, never when a timer says so.
 *
 * Yielding (the hierarchy of authorities): the driver asks its gate every
 * tick — autonomy open, no pack in flight, no authored physics performance,
 * no reduced motion. When the gate closes mid-walk he does not teleport: he
 * RECALLS — one brisk intent home, then stands down and the kernel walks
 * the last step / releases. When the gate reopens he waits φ² (gradual
 * resume — alive-015) before the first step.
 *
 * Reduced motion: the gate includes `!reducedMotion` — the authority
 * collapses by constitution 7.1 (the renderer's motionStrength-0 collapse
 * covers the drawn pose, D-0089).
 */
import type { GasperOrganismClockPort, OrganismClockFrame } from "../clock";
import type { LocomotionPort } from "../physics/WorldPhysicsDriver";
import { facingBearingDeg } from "../physics/RadialFacingLaw"; // N41 telegraph: the travel bearing in the clock frame
import {
  composePaintedWanderLeg,
  coulombBrakeDistanceUnits,
  goldenWanderPlan,
  insetWanderArrivalTarget,
  wanderArrived,
  wanderTargetOvershot,
  WANDER_LAW,
  WANDER_STALL_SECONDS,
  type GoldenWanderPlan,
  type WanderLegComposition,
} from "./GoldenWander";
import {
  embodimentWanderOpen,
  REST_DRIFT_UNITS_PER_SEC,
} from "./EmbodimentLocomotion";
import { GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC } from "../physics/GaitLaw";

export type GoldenWanderPhase =
  | "dormant"
  | "cooldown"
  | "intent"
  | "travel"
  | "dwell"
  | "recall";

/**
 * Cycle 3 M2 — the leg's phrasing, DERIVED live from the body each tick:
 * approach while the body is under the band floor, steady at the composed
 * cruise, arrive once the distance falls inside the kernel's Coulomb braking
 * envelope. The kernel executes all three (its traction law); the organ only
 * files intents. Null outside travel.
 */
export type WanderLegPhase = "approach" | "steady" | "arrive";

export type GoldenWanderState = Readonly<{
  enabled: boolean;
  phase: GoldenWanderPhase;
  /** The seed index of the NEXT leg (the wanderer's place in the flower). */
  nextStep: number;
  /** The plan under the feet (travel/dwell), or the recall target. */
  plan: GoldenWanderPlan | null;
  /** The kernel's floor pose (the wanderer's truth, read back). */
  pose: Readonly<{ x: number; z: number }>;
  /** Seconds left in the current dwell / cooldown (0 otherwise). */
  holdSecondsLeft: number;
  /** Cycle 3 M2 — the leg phrasing under the feet (travel only). */
  legPhase: WanderLegPhase | null;
  /** Cycle 3 M1 — how the current leg was composed (travel/dwell only). */
  legMode: WanderLegComposition["mode"] | null;
  /** Cycle 3 M1 — the steady window the current leg grants (composed). */
  legSteadySeconds: number;
}>;

type Vec2 = Readonly<{ x: number; z: number }>;

const HOME: Vec2 = Object.freeze({ x: 0, z: 0 });
/** Frame-delta fence — the same law as the physics transport. */
const MAX_DT_SECONDS = 0.05;
/** A leg is complete when the BODY is inside this radius, this slow. */
const ARRIVE_EPS_UNITS = 8;
const ARRIVE_SPEED_UNITS = 40;
/** XZ progress below this in a tick counts as a stall sample. */
const STALL_MOVE_UNITS = 0.5;

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export class GoldenWanderDriver {
  private enabled = true;
  private phase: GoldenWanderPhase = "dormant";
  private nextStep = 0;
  private plan: GoldenWanderPlan | null = null;
  private to: Vec2 = HOME;
  private cruise: number = WANDER_LAW.baseSpeedUnitsPerSec;
  private holdSeconds = 0;
  /** Cycle 3 M1/M2 — the composed leg under the feet (null on recall). */
  private leg: WanderLegComposition | null = null;
  private legPhase: WanderLegPhase | null = null;
  /** The kernel's live Coulomb budget at leg start (0 = traction unknown). */
  private legMuG = 0;
  /** Floor pose when the current travel/recall leg was filed. */
  private travelOrigin: Vec2 = HOME;
  /** Seconds of near-zero XZ progress while traveling. */
  private stallSeconds = 0;
  private lastTravelPose: Vec2 = HOME;
  private readonly unsub: () => void;

  constructor(
    clock: Pick<GasperOrganismClockPort, "subscribe">,
    /** The body kernel — wander files intents and reads the floor pose. */
    private readonly locomotion: LocomotionPort,
    /** True while the wanderer may walk (autonomy open, no higher authority). */
    private readonly gate: () => boolean,
    /**
     * Cycle 2 E1 — proprioception, read live every tick (the hold-settle
     * patches mutate the selection behind the controller's back, so this is
     * a sense, not an event). Default: the canonical body.
     */
    private readonly embodiment: () => string | null = () => "presence",
    /**
     * N41 (2026-08-06) — the INTENTION TELEGRAPH port: fired with the travel
     * bearing (degrees, the radial-facing clock frame — 0 = toward the user)
     * when a leg's φ⁻¹ s intent hold begins, and with NULL when the hold ends
     * and the leg is filed (the movement owns the direction then — the S8
     * heading carrier takes over). The controller turns this into the S5
     * gaze + attention address (look, commit, then go — timing-for-animation
     * staging). Optional: organs without a telegraph just walk.
     */
    private readonly telegraph?: (bearingDeg: number | null) => void,
  ) {
    this.unsub = clock.subscribe({
      id: "golden-wander",
      priority: 20,
      onFrame: (frame: OrganismClockFrame) => this.tick(frame),
    });
  }

  destroy(): void {
    this.unsub();
  }

  /** Master switch (owner / rail). Dismissing sends him home, not still. */
  setEnabled(v: boolean): void {
    this.enabled = !!v;
  }


  getState(): GoldenWanderState {
    const p = this.locomotion.floorPose();
    return Object.freeze({
      enabled: this.enabled,
      phase: this.phase,
      nextStep: this.nextStep,
      plan: this.plan,
      pose: Object.freeze({ x: p.x, z: p.z }),
      holdSecondsLeft:
        this.phase === "dwell" || this.phase === "cooldown"
          ? Math.max(0, this.holdSeconds)
          : 0,
      legPhase: this.phase === "travel" ? this.legPhase : null,
      legMode: this.leg?.mode ?? null,
      legSteadySeconds: this.leg?.steadySeconds ?? 0,
    });
  }

  private tick(frame: OrganismClockFrame): void {
    const dt = Math.max(0, Math.min(MAX_DT_SECONDS, frame.deltaMs / 1000));
    if (dt <= 0) return;

    // Cycle 2 E1: a rest-class body closes the wander authority from its own
    // proprioception — the gate and the master switch unchanged.
    const walkingBody = embodimentWanderOpen(this.embodiment());
    const open = this.enabled && this.safeGate() && walkingBody;
    if (!open) {
      // Suppressed: finish whatever leg is underfoot as a walk home. Cycle 2
      // E2/E3: walking bodies recall at the comfort band's top; rest-class
      // bodies drift home (a resting seed glides, never dashes).
      if (this.phase === "travel" || this.phase === "dwell") {
        this.phase = "recall";
        this.plan = null;
        this.to = HOME;
        this.cruise = walkingBody
          ? GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC
          : REST_DRIFT_UNITS_PER_SEC;
        // Cycle 3 M2: recall is urgent — no establish/arrive phrasing.
        this.leg = null;
        this.legPhase = null;
        this.legMuG = 0;
      } else if (this.phase === "recall") {
        this.advanceTravel(dt);
      } else if (this.phase === "cooldown") {
        this.phase = "dormant";
      } else if (this.phase === "intent") {
        // Suppressed mid-telegraph: release the address, stand down.
        try { this.telegraph?.(null); } catch { /* never stops the clock */ }
        this.phase = "dormant";
      }
      return;
    }

    switch (this.phase) {
      case "dormant":
        this.phase = "cooldown";
        this.holdSeconds = WANDER_LAW.resumeCooldownSeconds;
        return;
      case "cooldown":
        this.holdSeconds -= dt;
        if (this.holdSeconds <= 0) this.beginNextLeg();
        return;
      case "intent":
        // N41 — the φ⁻¹ s intent hold: the address was given at the hold
        // start; when it expires the leg is filed and the MOVEMENT owns the
        // direction (the S8 heading carrier takes over from the address).
        this.holdSeconds -= dt;
        if (this.holdSeconds <= 0) {
          this.phase = "travel";
          this.fileIntent();
          try { this.telegraph?.(null); } catch { /* never stops the clock */ }
        }
        return;
      case "recall":
        // Recalled home but the gate reopened mid-walk: finish the walk
        // home first, then resume from stillness (gradual, never a snap).
        this.advanceTravel(dt);
        return;
      case "travel":
        this.advanceTravel(dt);
        return;
      case "dwell":
        this.holdSeconds -= dt;
        if (this.holdSeconds <= 0) this.beginNextLeg();
        return;
    }
  }

  private safeGate(): boolean {
    try {
      return this.gate();
    } catch {
      return false; // a broken gate closes the authority, never opens it
    }
  }

  private beginNextLeg(): void {
    // Cycle 2 E5 — a leg shorter than the Coulomb reach of the comfort band
    // can never express the walk: turn the golden angle onward (deterministic
    // seed advance, bounded tries, fail-closed accepts the last).
    let plan = goldenWanderPlan(this.nextStep);
    for (
      let tries = 0;
      tries < 8 && dist(this.locomotion.floorPose(), plan) < WANDER_LAW.minLegUnits;
      tries++
    ) {
      this.nextStep += 1;
      plan = goldenWanderPlan(this.nextStep);
    }
    this.nextStep += 1;
    // N41 (2026-08-06): the leg enters the φ⁻¹ s INTENT HOLD before filing —
    // the telegraph port fires with the travel bearing toward the composed
    // target (the controller turns it into the S5 gaze + attention address:
    // look, commit, then go); the intent is filed when the hold expires
    // (case "intent" above). Suppression during the hold releases cleanly.

    // Cycle 3 M1/M2 — compose the leg from the field + body (memo #3): the
    // sunflower owns the bearing; the room's edge and the kernel's traction
    // budget set the leg's length and cruise so the gait gets its steady
    // window. Fail-closed: a broken/absent traction sense walks the bare seed.
    let traction: ReturnType<LocomotionPort["traction"]> | null = null;
    try {
      traction = this.locomotion.traction();
    } catch {
      traction = null;
    }
    const from = this.locomotion.floorPose();
    const leg = composePaintedWanderLeg(from, plan, traction);
    this.leg = leg;
    // File an inset target: the composer may name the fence, but the body
    // must be able to enter the arrival band (120fps wall-pin evidence).
    this.to = insetWanderArrivalTarget(from, leg.to);
    this.travelOrigin = Object.freeze({ x: from.x, z: from.z });
    this.stallSeconds = 0;
    this.lastTravelPose = this.travelOrigin;
    this.cruise = GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC;
    // Capture / 5179 census reads this.plan (take-a oracle: wander.plan.step0
    // was the raw far-fence seed {z~1018, speed~2610} while the kernel
    // already walked the composed target). The live plan object is the
    // composed-then-inset intent WorldPhysicsDriver will walk.
    this.plan = Object.freeze({
      ...plan,
      x: this.to.x,
      z: this.to.z,
      speedUnitsPerSec: this.cruise,
    });
    this.legMuG =
      traction && Number.isFinite(traction.mu * traction.gravity)
        ? traction.mu * traction.gravity
        : 0;
    // M2 — the leg opens at the slowest lawful walk (the gait establishes
    // itself before it extends); the body decides when that is done.
    this.legPhase = leg.bandMinUnitsPerSec > 0 ? "approach" : "steady";
    // N41 — the intent hold: φ⁻¹ s of committed address (the telegraph),
    // then the leg files (case "intent" above).
    this.phase = "intent";
    this.holdSeconds = 1 / WANDER_LAW.phi;
    try {
      const p = this.locomotion.floorPose();
      this.telegraph?.(facingBearingDeg(leg.to.x - p.x, leg.to.z - p.z));
    } catch {
      this.telegraph?.(null);
    }
  }

  /**
   * File the leg's intent with the kernel and watch the BODY, not a timer:
   * the leg completes when the floor pose arrives inside the arrival band.
   *
   * Cycle 3 M2 — establish–hold–arrive, derived live from the body each
   * tick: the approach holds until the body reaches the band floor (the gait
   * establishes itself); arrival begins once the distance falls inside the
   * kernel's Coulomb braking envelope and is sticky (the kernel's steering
   * law owns the brake from there — nothing authored in the renderer).
   */
  private advanceTravel(dt: number): void {
    const p = this.locomotion.floorPose();
    if (this.phase === "travel") {
      const moved = dist(p, this.lastTravelPose);
      this.stallSeconds = moved < STALL_MOVE_UNITS ? this.stallSeconds + dt : 0;
      this.lastTravelPose = Object.freeze({ x: p.x, z: p.z });
    }
    if (this.phase === "travel" && this.legPhase) {
      if (
        this.legPhase !== "arrive" &&
        this.legMuG > 0 &&
        dist(p, this.to) <= coulombBrakeDistanceUnits(p.speed, this.legMuG)
      ) {
        this.legPhase = "arrive";
      } else if (
        this.legPhase === "approach" &&
        p.speed >= 0.9 * (GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC / WANDER_LAW.phi)
      ) {
        this.legPhase = "steady";
      }
    }
    const leftOrigin = dist(p, this.travelOrigin) > ARRIVE_EPS_UNITS;
    const stalled =
      this.phase === "travel" &&
      leftOrigin &&
      this.stallSeconds >= WANDER_STALL_SECONDS;
    const overshot =
      this.phase === "travel" &&
      wanderTargetOvershot(this.travelOrigin, this.to, p);
    const boundPinned = p.boundPinned === true;
    const arrived =
      wanderArrived(p, this.to, p.speed) ||
      overshot ||
      stalled ||
      boundPinned ||
      (this.phase === "recall" &&
        dist(p, this.to) < ARRIVE_EPS_UNITS &&
        p.speed < ARRIVE_SPEED_UNITS);
    if (!arrived) {
      this.fileIntent();
      return;
    }
    // The composition stays readable through the dwell (the census reads
    // how the leg under the feet was built); the phrasing is over.
    this.legPhase = null;
    this.legMuG = 0;
    if (this.phase === "recall") {
      // Home: stand down — the kernel owns the release from here.
      this.phase = "dormant";
      this.locomotion.standDownLocomotion("wander");
      return;
    }
    this.phase = "dwell";
    // Always release ownership at the end of a travel leg. Keeping it
    // (clearLocomotion) left the kernel in locomotion with no intent — a
    // hard wall-pin that killed idle breathing. standDown lets the kernel
    // rest-in-place so the organism clock keeps breathing, then the next
    // golden-angle leg re-arms.
    this.locomotion.standDownLocomotion("wander");
    this.holdSeconds = this.plan?.dwellSeconds ?? WANDER_LAW.dwellLadderSeconds[0];
  }

  private fileIntent(): void {
    // M2: the approach phase files the band floor (the slowest lawful walk);
    // steady and arrive file the composed cruise — the kernel's traction law
    // ramps it up and brakes it down (no authored ease).
    const walkCruise = GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC;
    const cruise =
      this.legPhase === "approach" ? walkCruise / WANDER_LAW.phi : walkCruise;
    this.locomotion.setLocomotion("wander", {
      x: this.to.x,
      z: this.to.z,
      cruise: Math.max(1, cruise),
    });
  }
}
