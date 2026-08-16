import {
  parsePhysicsIntentPlan,
} from "../../../../shared/src/gasper-performance/reference/retarget.js";
import type {
  PhysicsGoal,
  PhysicsIntentBeat,
  PhysicsIntentPlan,
} from "../../../../shared/src/gasper-performance/reference/types.js";
import type {
  GasperOrganismClockPort,
  OrganismClockFrame,
} from "../clock/GasperOrganismClock.js";
import { comfortCruiseBand } from "../physics/GaitLaw.js";
import type {
  LocomotionPort,
  PerformanceGaitIntent,
} from "../physics/WorldPhysicsDriver.js";

export const PERFORMANCE_PRIMITIVE_CLOCK_SUBSCRIBER_ID =
  "gasper-performance-primitive-driver" as const;
export const PERFORMANCE_PRIMITIVE_CLOCK_PRIORITY = 24;

/**
 * The only host surface reference performance may touch. It files intent into
 * the existing body kernel and asks that same kernel to derive gait. No pose,
 * DOM, renderer, RAF, or transform method is present by construction.
 */
export type PerformancePrimitivePort = Pick<
  LocomotionPort,
  "setLocomotion" | "clearLocomotion" | "standDownLocomotion" | "floorPose" | "traction"
> &
  Readonly<{
    setPerformanceGait(intent: PerformanceGaitIntent | null): void;
  }>;

export type PerformancePrimitiveDisposition =
  | "idle"
  | "running"
  | "collapsed"
  | "completed"
  | "stopped"
  | "destroyed";

export type PerformancePrimitiveInspection = Readonly<{
  active: boolean;
  planId: string | null;
  beatId: string | null;
  generation: number;
  reducedMotion: boolean;
  disposition: PerformancePrimitiveDisposition;
  clockSubscriberId: typeof PERFORMANCE_PRIMITIVE_CLOCK_SUBSCRIBER_ID;
  contactTiming: "form_native";
  limitations: readonly string[];
}>;

type ActivePlan = {
  plan: PhysicsIntentPlan;
  startedAtMs: number;
  reducedMotion: boolean;
  beatId: string | null;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function goalById(goals: readonly PhysicsGoal[], id: string): PhysicsGoal | undefined {
  return goals.find((candidate) => candidate.id === id);
}

function goalTarget(
  beat: PhysicsIntentBeat,
  id: string,
  fallback: number,
): number {
  const value = goalById([...beat.supportGoals, ...beat.bodyGoals, ...beat.expressiveGoals], id)?.target;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function needsGait(
  beat: PhysicsIntentBeat,
  travelMagnitude: number,
  compressionRatio: number,
): boolean {
  return (
    travelMagnitude > 1e-9 ||
    compressionRatio > 1e-9 ||
    beat.primitive === "support_exchange" ||
    beat.primitive === "slide" ||
    beat.primitive === "pivot"
  );
}

/**
 * Organism-clock scheduler for validated reference-performance plans.
 *
 * It is deliberately small: the driver selects the active beat and files
 * bounded physical goals. WorldPhysicsDriver remains the sole body/gait
 * writer, and source contact timing stays explicitly form-native until the
 * kernel has a separately proven phase-lock law.
 */
export class PerformancePrimitiveDriver {
  private active: ActivePlan | null = null;
  private generation = 0;
  private disposition: PerformancePrimitiveDisposition = "idle";
  private destroyed = false;
  private readonly bodyHeightUnits: number;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly clock: Pick<GasperOrganismClockPort, "subscribe" | "nowMs">,
    private readonly port: PerformancePrimitivePort,
    options: Readonly<{ bodyHeightUnits: number }>,
  ) {
    if (!Number.isFinite(options.bodyHeightUnits) || options.bodyHeightUnits <= 0) {
      throw new Error("performance driver requires a positive body height");
    }
    this.bodyHeightUnits = options.bodyHeightUnits;
    this.unsubscribe = clock.subscribe({
      id: PERFORMANCE_PRIMITIVE_CLOCK_SUBSCRIBER_ID,
      priority: PERFORMANCE_PRIMITIVE_CLOCK_PRIORITY,
      onFrame: (frame) => this.onFrame(frame),
    });
  }

  start(
    planInput: PhysicsIntentPlan | unknown,
    options: Readonly<{ reducedMotion?: boolean }> = {},
  ): PerformancePrimitiveInspection {
    this.assertAlive();
    return this.begin(planInput, options, false);
  }

  interrupt(
    planInput: PhysicsIntentPlan | unknown,
    options: Readonly<{ reducedMotion?: boolean }> = {},
  ): PerformancePrimitiveInspection {
    this.assertAlive();
    return this.begin(planInput, options, true);
  }

  stop(): PerformancePrimitiveInspection {
    this.assertAlive();
    if (this.active) this.release("stopped");
    else this.disposition = "stopped";
    return this.inspect();
  }

  inspect(): PerformancePrimitiveInspection {
    return Object.freeze({
      active: this.active !== null,
      planId: this.active?.plan.id ?? null,
      beatId: this.active?.beatId ?? null,
      generation: this.generation,
      reducedMotion: this.active?.reducedMotion ?? false,
      disposition: this.disposition,
      clockSubscriberId: PERFORMANCE_PRIMITIVE_CLOCK_SUBSCRIBER_ID,
      contactTiming: "form_native" as const,
      limitations: Object.freeze([
        "source contact events are preserved in the plan but realized on the form-native gait phase",
        "facing remains derived from physical travel velocity",
        "expressive goals remain review data until an explicit bounded projection map is accepted",
      ]),
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    if (this.active) this.release("stopped");
    this.unsubscribe();
    this.destroyed = true;
    this.disposition = "destroyed";
  }

  private begin(
    planInput: PhysicsIntentPlan | unknown,
    options: Readonly<{ reducedMotion?: boolean }>,
    interruption: boolean,
  ): PerformancePrimitiveInspection {
    const plan = parsePhysicsIntentPlan(planInput);
    this.generation += 1;
    this.active = {
      plan,
      startedAtMs: this.clock.nowMs(),
      reducedMotion: options.reducedMotion === true,
      beatId: null,
    };
    this.disposition = options.reducedMotion ? "collapsed" : "running";
    // Interruption intentionally does not clear/stand down: the live body and
    // its velocity stay inside WorldPhysicsDriver until the next beat files.
    if (!interruption) this.port.setPerformanceGait(null);
    return this.inspect();
  }

  private onFrame(frame: OrganismClockFrame): void {
    const active = this.active;
    if (!active || frame.direction < 0) return;
    const elapsedMs = Math.max(0, frame.timeMs - active.startedAtMs);
    if (elapsedMs >= active.plan.durationMs) {
      this.release("completed");
      return;
    }
    const beat = active.plan.beats.find(
      (candidate) => elapsedMs >= candidate.t0Ms && elapsedMs < candidate.t1Ms,
    );
    if (!beat) {
      if (active.beatId !== null) {
        active.beatId = null;
        this.holdCurrentPosition();
        this.port.setPerformanceGait(null);
      }
      return;
    }
    if (beat.id === active.beatId) return;
    active.beatId = beat.id;
    this.enterBeat(beat, active.reducedMotion);
  }

  private enterBeat(beat: PhysicsIntentBeat, reducedMotion: boolean): void {
    const floor = this.port.floorPose();
    if (reducedMotion) {
      this.port.setLocomotion("performance", { x: floor.x, z: floor.z, cruise: 0 });
      this.port.setPerformanceGait(null);
      return;
    }

    const dx = goalTarget(beat, "normalized_travel_x", 0);
    const dz = goalTarget(beat, "normalized_travel_y", 0);
    const travelMagnitude = Math.hypot(dx, dz);
    const speedRatio = clamp01(
      goalTarget(beat, "normalized_travel_speed", goalTarget(beat, "motion_energy", 0.5)),
    );
    const traction = this.port.traction();
    const cruiseBand = comfortCruiseBand(traction.gravity);
    const cruise = travelMagnitude > 1e-9
      ? cruiseBand.min + (cruiseBand.max - cruiseBand.min) * speedRatio
      : 0;
    this.port.setLocomotion("performance", {
      x: floor.x + dx * this.bodyHeightUnits,
      z: floor.z + dz * this.bodyHeightUnits,
      cruise,
    });

    const compressionRatio = clamp01(
      goalTarget(beat, "normalized_vertical_compression", 0),
    );
    if (!needsGait(beat, travelMagnitude, compressionRatio)) {
      this.port.setPerformanceGait(null);
      return;
    }
    const fallbackCadenceHz = Math.max(0.001, 1_000 / Math.max(1, beat.t1Ms - beat.t0Ms));
    const cadenceHz = goalTarget(beat, "cadence", fallbackCadenceHz);
    const driveGain = clamp01(goalTarget(beat, "motion_energy", 0.5));
    const lateralAxis = Math.abs(dx) > 1e-9 ? Math.sign(dx) : 1;
    this.port.setPerformanceGait({ cadenceHz, driveGain, lateralAxis, compressionRatio });
  }

  private holdCurrentPosition(): void {
    const floor = this.port.floorPose();
    this.port.setLocomotion("performance", { x: floor.x, z: floor.z, cruise: 0 });
  }

  private release(disposition: "completed" | "stopped"): void {
    this.port.setPerformanceGait(null);
    this.port.standDownLocomotion("performance");
    this.active = null;
    this.disposition = disposition;
  }

  private assertAlive(): void {
    if (this.destroyed) throw new Error("performance driver is destroyed");
  }
}
