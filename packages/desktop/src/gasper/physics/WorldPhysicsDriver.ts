/**
 * GASPER-PHYSICS-001 · D-0112 — the unified body transport.
 *
 * The kernel is the SOLE writer of free movement. Wander and the life
 * director no longer drag a pose along a path: they file locomotion INTENTS
 * (a floor-plane target + a cruise speed) and this driver converts them into
 * traction-limited steering through the 1/240 kernel — acceleration capped at
 * μ·g (the friction budget), braking on the Coulomb law v = √(2μg·d), so the
 * ease-out of every arrival EMERGES from friction instead of a smoothstep.
 *
 * N30/N31 (S3 flight organ, flight-physics-phd-memo F-LAWs 1/3/4): walking
 * belongs to feet — the FEETED body (wispwalker) spends the friction cone
 * above; every FOOTLESS body floats, and its translation is flight bounded
 * by real physics: buoyant steering under the thrust envelope T_max (the
 * brake curve v = √(2·T_max·d) carried), the air's toll c1·v + c2·v² paid on
 * every horizontal motion, altitude held at the hover equilibrium h_G/φ⁴ by
 * a ζ = 1/φ servo — one ≈8.4 % overshoot, then held.
 *
 * N31 (S4 wind-resistance surface, flight-physics-phd-memo F-LAW 2): a body
 * moving through air is not rigid — the kernel forwards the lagged dynamic
 * pressure (v/v_c)² and the screen-x travel direction, and the renderer
 * answers with trail-stretch / lead-compress on the contour (slight —
 * ε_max = φ⁻²/4 of the half-extent at v_c). The bank organ doubles as the
 * flight-lean organ: a footless body in powered flight leans into its
 * horizontal acceleration through the same Y1-clamped channel the walker
 * banks through.
 *
 * Transport law (CanonOps external pass): the kernel integrates at exactly
 * 1/240 s substeps under a frame-time accumulator (Box2D substep doctrine);
 * the renderer receives one pose per organism tick, keys are truth.
 *
 * Environment law: `setField` makes the environment field the owner of every
 * physical constant through `worldPhysicsParamsFromField` — the only lawful
 * bridge. Absent, the authored Phase-B constants stay the law (byte-stable
 * fallback). A field epoch bump is observable for the awareness beat.
 *
 * Release law: nothing snaps. A spent performance settles (≥ 3 emitted
 * frames + the hold), then WALKS HOME under the same traction law, then the
 * authority disarms. Wander/life standing down mid-room triggers the same
 * internal walk home.
 *
 * Reduced motion: the driver keeps integrating; the renderer's motionStrength-0
 * collapse (D-0089) eases the pose home — the authority collapses by
 * construction.
 */
import type { GasperOrganismClockPort, OrganismClockFrame } from "../clock";
import {
  worldBoundsAt,
  WORLD_SPACE_CONSTANTS,
  type WorldProvenance,
} from "../space/WorldSpace";
import {
  applyImpulse,
  bodyIsSettled,
  bodySpeed,
  clampWorldPhysicsParams,
  createWorldBody,
  DEFAULT_WORLD_PHYSICS_PARAMS,
  stepWorldBody,
  travelTilt,
  WORLD_PHYSICS_CONSTANTS,
  type WorldBodyState,
  type WorldPhysicsInput,
  type WorldPhysicsParams,
  type WorldWallBounds,
} from "./WorldPhysics";
import {
  fieldBoundsAt,
  worldPhysicsParamsFromField,
  type PhysicsField,
} from "./PhysicsField";
import {
  comfortCruiseBand,
  deriveGait,
  GAIT_ANTICIPATION_DURATION_SECONDS,
  GAIT_ANTICIPATION_FRACTION,
  GAIT_EXPRESSION_RAMP_SECONDS,
  GAIT_LAW,
  GAIT_LEG_UNITS,
  GAIT_LOBE,
  GAIT_REST,
  GAIT_STEP_HZ_MAX,
  walkCadenceHz,
  walkFlightFrac,
  walkGaitMix,
  gaitLobePose,
  type GaitObservables,
} from "./GaitLaw";
import {
  embodimentGaitGain,
  embodimentLocomotionClass,
  embodimentWanderOpen,
  REST_DRIFT_UNITS_PER_SEC,
} from "../behavior/EmbodimentLocomotion";
import {
  FLIGHT_LAW,
  flightBrakeSpeedUnitsPerSec,
  flightDragUnitsPerS2,
  windPressureForSpeed,
} from "./FlightLaw";
import { PHI_LAW } from "./PhiLaw";
import { facingBearingDeg } from "./RadialFacingLaw";
import { BOO_FLIGHT_LAW, booBobUnits } from "./BooFlightLaw";
import {
  MAX_AREA_CONSERVING_VERTICAL_COMPRESSION,
  physicsSilhouetteDeltas,
  stepPhysicsSilhouetteEnvelope,
  withPerformanceVerticalCompression,
  ZERO_PHYSICS_ENVELOPE,
  type PhysicsSilhouetteEnvelope,
} from "./PhysicsSilhouetteAuthority";
import {
  SUPPORT_REST,
  projectPlantedScreenX,
  stepSupportExchange,
  type SupportExchangeState,
} from "./SupportExchange";

export type WorldPhysicsDriverOutput = Readonly<{
  pose: Readonly<{
    x: number;
    y: number;
    z: number;
    tilt: number;
    provenance: WorldProvenance;
  }>;
  /** Wake-warp feed in living-speed units (content-space; +y down). */
  wakeVX: number;
  wakeVY: number;
  /** MOTION_LIGHT feed in living-speed units. */
  lightSpeed: number;
  /** Bounded silhouette deltas for the D-0088 chain (empty at rest). */
  silhouetteDeltas: Readonly<Record<string, number>>;
  /** TAKE expand 0..1 -- notice volume / light / eyes. Overlaps gather. */
  take: number;
  /** Arrived-hold height idle, signed -1..1. Painter paints it. */
  idle: number;
  /**
   * Pressure-Cooker Cycle 1 (gait-expression-phd-memo): the derived gait
   * observables — travel-locked phase, vault bob, grounded lean, lateral
   * sway. The renderer EXPRESSES them; it never authors them.
   */
  gait: GaitObservables;
  /**
   * The same gait projected for the screen plane (world units): bobLift is
   * the COM rise over the vault arc (high at mid-stance, phase 0), swayX the
   * lateral COM shift onto the support leg projected onto screen x (the
   * perpendicular of the heading). Cycle 4 adds rollDeg (the vault roll in
   * tilt-channel handedness — leans the silhouette toward the loaded side)
   * and contactSquash (the volume-law compression, 0..~0.02). Cycle 5 adds
   * stepBaseXUnits — the PLANTED support point (sample-and-hold of the sway
   * extremum, exchanging at double support; step-cycle-phd-memo S0). Cycle
   * 11 adds the contact flatten (step-shape-phd-memo Z1): stepFlattenUnits —
   * the SUPPORT read, signed in screen x toward the planted side (the S0
   * ⊥(heading) projection idiom), lagged + gated per Z3 — and
   * stepFlattenWidthUnits (the patch half-width, unsigned). Zero at rest
   * and in flight. plantedScreenXUnits is the camera-lateral projection of
   * (plantedWorld − body): the world-locked plant the renderer must use for
   * the foot/shadow. stepBaseXUnits remains the load carrier (S0 tanh hold).
   */
  gaitScreen: Readonly<{ bobLiftUnits: number; swayXUnits: number; rollDeg: number; contactSquash: number; stepBaseXUnits: number; bankDeg: number; stepFlattenUnits: number; stepFlattenWidthUnits: number; plantedScreenXUnits: number; plantedCompress: number; incomingCompress: number; hopMix: number; flight: number; seated: boolean; leftoverSway: number; supportSide: number; swingLiftUnits: number; swingAdvanceUnits: number; loadedDropUnits: number; swingClearance: number }>;
  /**
   * S4 F-LAW 2 (flight-physics-phd-memo, owner N31) — the wind-resistance
   * surface read: `pressure` is the dynamic pressure (v/v_c)² low-passed at
   * τ_c·φ (the bank idiom), `dirX` the screen-x component of the travel unit
   * vector, lagged by the same law (pure depth travel reads honestly
   * invisible in screen x — the S0 projection idiom). At rest both are 0 ⇒
   * the renderer's contour is byte-identical (D-0088 idiom). The kernel
   * DERIVES the airflow read; the renderer EXPRESSES trail-stretch /
   * lead-compress from it. Jet-lean rides the bank channel (gaitScreen
   * bankDeg + the pose tilt), never a parallel path.
   */
  wind: Readonly<{ pressure: number; dirX: number }>;
  /**
   * S8 (radial-facing-phd-memo, owner N39) — the travel bearing on the
   * ground-plane clock: degrees in the facing frame (0 = toward the user,
   * +90 = stage right, ±180 = away = 12 o'clock), NULL below the rest-speed
   * gate or on corrupt velocity — the facing HOLDS its slice (a body that
   * stops facing the way it came reads as deliberate; a body that never
   * moved reads frontal: byte-stable home). The kernel DERIVES the bearing;
   * the RadialFacingLaw quantizes it to the 12-slice pie; the renderer
   * expresses the facing.
   */
  facingBearingDeg: number | null;
  /**
   * S10 (owner N42) — the Boo perpetual-bob carrier (world units, signed
   * lift): the ghost NEVER stands — a soft aperiodic bob rides every hold.
   * 0 when boo mode is off (byte-identical elsewhere); the renderer gates
   * it ONLY on reduced motion (rest keeps breathing — that IS the read).
   */
  booBobUnits: number;
}>;

const PHYSICS_AUTHORITY_PACKET = "GASPER-PHYSICS-AUTHORITY-001" as const;

export type BounceLaunchConfig = Readonly<{
  x0?: number;
  /** Authored flight depth (world units from the home plane; 0 = home). */
  z0?: number;
  vx?: number;
  vy?: number;
}>;

export type CometLaunchConfig = Readonly<{
  x0?: number;
  /** Authored flight depth (world units from the home plane; 0 = home). */
  z0?: number;
  vx?: number;
  vy?: number;
  gatherSeconds?: number;
}>;

/** A floor-plane target + cruise speed filed by a spatial authority. */
export type LocomotionIntent = Readonly<{
  x: number;
  z: number;
  /** Cruise speed for the leg (world units/s); braking is kernel-owned. */
  cruise: number;
}>;

/**
 * Reference-performance gait input. It never contains a pose or transform;
 * the kernel derives its in-place support carrier from these bounded values.
 */
export type PerformanceGaitIntent = Readonly<{
  cadenceHz: number;
  driveGain: number;
  lateralAxis: number;
  /** Relative height loss, bounded by the area-conserving silhouette fence. */
  compressionRatio: number;
}>;

export type LocomotionOwner = "performance" | "wander" | "life" | "internal";

/**
 * The intent seam: spatial authorities (wander, life) request movement; the
 * kernel is the only writer of pose. `standDownLocomotion` releases ownership
 * (dwell keeps ownership with a cleared intent).
 */
export type LocomotionPort = Readonly<{
  setLocomotion: (owner: LocomotionOwner, intent: LocomotionIntent) => void;
  clearLocomotion: (owner: LocomotionOwner) => void;
  standDownLocomotion: (owner: LocomotionOwner) => void;
  /** The body's floor-plane truth (arrival/dwell decisions read this). */
  floorPose: () => Readonly<{ x: number; z: number; speed: number; boundPinned?: boolean }>;
  /**
   * Pressure-Cooker Cycle 3 (locomotion-legibility-phd-memo M1/M2): the
   * traction context in force — the kernel's live Coulomb budget (μ, g).
   * The wander organ DERIVES its leg composition from this (ramp/brake
   * distances, comfort band), never from authored per-instance numbers.
   */
  traction: () => Readonly<{ mu: number; gravity: number }>;
}>;

type DriverMode =
  | "idle"
  | "locomotion"
  | "bounce"
  | "comet-gather"
  | "comet-fly"
  | "retiring";

/** Production-frame bounds supplied by the measured composition envelope. */
export type RenderableWorldBoundsAt = Readonly<{
  xMin: number;
  xMax: number;
  yMax: number;
  zMin: number;
  zMax: number;
}>;

/** Kernel substep — exactly the φ-law kernel rate (Box2D substep doctrine). */
const KERNEL_H = PHI_LAW.kernelStepSeconds;
/** Accumulator ceiling (tab-suspend spikes cannot queue a backlog). */
const MAX_ACC_SECONDS = 0.1;
/**
 * The behavior organs' MODEL constant for the kernel's seek tail (1/s).
 * Cycle 6 (cruise-attainment-phd-memo A2): the kernel itself no longer seeks
 * at this rate — the traction controller IS the Coulomb bound (A0/A1) — but
 * the composer's charged overhead keeps the φ·v/K tail term as deliberate
 * margin, so the granted steady window is a guaranteed lower bound. Exported
 * for the organs that compose legs over this kernel (Cycle 3 M1 — the
 * wanderer derives its leg lengths from the body it files with, never from
 * authored per-instance numbers).
 */
export const KERNEL_STEER_GAIN_PER_SECOND = 12;
/** Traction budget when no field reports μ (authored fallback). */
const FALLBACK_MU = 0.5;
/** Arrival: inside this radius with the floor speed below… the leg is done. */
const ARRIVE_EPS_UNITS = 6;
const ARRIVE_SPEED_UNITS = 30;
/**
 * N123 — short-leg arrival exchange. The showcase's authored beats are
 * compact, so soften only their Coulomb sign crossing; long arrivals retain
 * the original deadbeat law and its monotone stop contract.
 */
const ARRIVAL_BLEND_DISTANCE_UNITS = 220;
const ARRIVAL_BLEND_SECONDS = 0.02;
const ARRIVAL_BLEND_LEG_DISTANCE_UNITS = 500;
/**
 * N128 — keep the visible support patch with the current planted side during
 * the phase exchange. The ordinary Z3 lag remains the law in steady support;
 * only a sign crossing gets a faster, still capped response so the old side
 * cannot remain visibly planted after the S0 carrier has exchanged.
 */
const FLATTEN_SIGN_CROSSING_ALPHA_MULTIPLIER = 4;
const FLATTEN_MAX_FRAME_DELTA_UNITS = 11.5;
/**
 * GASPER-NORTHSTAR-001 (N60 continuity): the arrival-band commanded-speed
 * floor — below this the brake curve's sqrt tail would creep forever just
 * short of the target, so the command snaps to exactly 0 (the deadbeat
 * bleeds the residual in one time constant, ≈ 120 u/s² ≪ μg — imperceptible,
 * deliberate braking with bounded jerk and no micro-reverse).
 */
const ARRIVE_EPS_VELOCITY_UNITS_PER_SEC = 0.5;
/**
 * The organism-clock subscriber priority: the physics driver forwards the
 * body pose one beat BEFORE the performance pack (26) — the pack's compose
 * reads the LIVE body of the same tick (GASPER-NORTHSTAR-001 N60 ordering).
 */
export const WORLD_PHYSICS_CLOCK_PRIORITY = 25;
/** Residual plant CoG peel after arrival. PathX stays constant. >=2s, never one beat. */
const ARRIVAL_RELEASE_SECONDS = 2;
/** A spent performance holds settled this long before the walk home. */
const SETTLE_HOLD_SECONDS = 1.0;
/** …and the settle must have been emitted for at least this many frames. */
const SETTLE_FRAMES_MIN = 3;
/** A comet gets one authored φ²-second flight beat before walking home. */
const COMET_FLIGHT_HOLD_SECONDS = PHI_LAW.loadRhythmSeconds * PHI_LAW.phi * PHI_LAW.phi;
// Cycle 2 (embodied-locomotion-phd-memo E2/E3): the internal home cruise is
// embodiment-aware — walking bodies walk home at the comfort band's floor;
// rest-class bodies drift home at base·φ⁻² (a resting seed glides). Was a
// flat 1978 (below the band — a slide home).

/** Clamp an authored depth into the frustum fence (non-finite fails to home). */
function clampDepth(z: number): number {
  if (!Number.isFinite(z)) return 0;
  return Math.max(WORLD_SPACE_CONSTANTS.zNear, Math.min(WORLD_SPACE_CONSTANTS.zFar, z));
}

export class WorldPhysicsDriver implements LocomotionPort {
  private body: WorldBodyState = createWorldBody();
  /** Last visible body retained only as the next active-performance handoff. */
  private lastHandoffBody: WorldBodyState | null = null;
  private lastPhysicsPose: WorldPhysicsDriverOutput["pose"] | null = null;
  private physicsEmissionCount = 0;
  private env: PhysicsSilhouetteEnvelope = ZERO_PHYSICS_ENVELOPE;
  private field: PhysicsField | null = null;
  private rail: Partial<WorldPhysicsParams> | undefined;
  private params: WorldPhysicsParams = DEFAULT_WORLD_PHYSICS_PARAMS;
  private mode: DriverMode = "idle";
  private gatherLeft = 0;
  private gatherTotal = 0;
  private comet: { vx: number; vy: number } | null = null;
  /** S4 — release velocity is loaded through the φ rhythm, not inserted in one tick. */
  private cometLaunchDeltaV: { vx: number; vy: number } | null = null;
  private cometLaunchLeft = 0;
  private cometFlightFor = 0;
  private retirementLeft = 0;
  private acc = 0;
  /** S10 (N42) — the Boo ghost-flight mode: a golden-split parameter swap of
   *  the flight organ (dreamy jets, heavy drag, same hover equilibrium) +
   *  the perpetual bob carrier (the ghost never stands). Owner-invoked for
   *  the demo's second half; 0-mode behavior is byte-identical to FlightLaw. */
  private booMode = false;
  /** N311 — hover target collapses to the floor so Boo lands with weight. */
  private booLanding = false;
  /** S10 — clock-driven Boo expression gate; never inserts the carrier at once. */
  private booGate = 0;
  /** S10 — the organism clock's time for the perpetual-bob rotor (last tick). */
  private lastFrameMs = 0;
  /** Cycle 1 L8 — the step phase is travel-integrated state, never a clock. */
  private gaitPhase = 0;
  /** N120 — bounded cadence experiment; speed and support remain kernel-owned. */
  private gaitTempoMultiplier = 1;
  /** Reference-owned in-place gait request, evaluated by this sole kernel. */
  private performanceGait: PerformanceGaitIntent | null = null;
  /** Smoothed physics-authority realization of measured root compression. */
  private performanceCompression = 0;
  /** Cycle 12 W1 — visible gait arrives/departs over a perceptual window. */
  private gaitGate = 0;
  /** Cycle 12 W2 — grounded lean carries its acceleration target through settle. */
  private groundedLeanDeg = 0;
  /** Northstar acting beat — weight shifts before a new traction stroke. */
  private anticipationLeft = 0;
  private anticipationAge = 0;
  private anticipationAxisX = 0;
  /** N119 — reversal traction is blended across the same exchange beat. */
  private reversalRampLeft = 0;
  private steeringAx = 0;
  private steeringAz = 0;
  /** N123 — authored short-leg span used by the close-arrival exchange. */
  private legStartDistance = Number.POSITIVE_INFINITY;
  private prevSpeed = 0;
  private prevVX = 0;
  private prevSpeedCont = 0;
  private bankAx = 0; // Cycle 10 Y1 (bank-phd-memo) — low-passed centripetal x-acceleration
  private bankGate = 0; // Cycle 10 Y2 — the bank expression gate, a first-order lag like the dynamics
  private flattenSigned = 0; // Cycle 11 Z3 (step-shape-phd-memo) — low-passed screen-x flatten depth (signed)
  private flattenWidth = 0; // Cycle 11 Z3 — low-passed contact-patch half-width
  private flattenGate = 0; // Cycle 11 Z3 — the flatten expression gate, a first-order lag like the dynamics (bankGate idiom)
  private windP = 0; // S4 F-LAW 2 — low-passed dynamic pressure (v/v_c)², τ_c·φ (the bank idiom)
  private windDirX = 0; // S4 F-LAW 2 — low-passed screen-x travel direction (vx / speed)
  private gait: GaitObservables = GAIT_REST;
  private support: SupportExchangeState = SUPPORT_REST;
  private supportCogX = 0;
  private supportCogZ = 0;
  private supportGatherTarget = 0;
  private arrivalGatherHeld = false;
  /** Last painted walk gather while SupportExchange was NOT in plant crouch. */
  private walkPaintedGather = 0;
  private arrivedIdleTarget = 0;
  private arrivedTakeTarget = 0;
  private arrivedIdlePhase = 0;
  private arrivedIdleAge = 0;
  private settledFor = 0;
  private settledTicks = 0;
  private intents: Partial<Record<LocomotionOwner, LocomotionIntent>> = {};
  private renderableWorldBoundsAt: ((z: number) => RenderableWorldBoundsAt) | null = null;
  private owners: Readonly<Record<LocomotionOwner, boolean>> = {
    performance: false,
    wander: false,
    life: false,
    internal: false,
  };
  /** True only while braking to a standDown halt — not an authored internal waypoint. */
  private haltRest = false;
  private readonly unsub: () => void;

  constructor(
    clock: Pick<GasperOrganismClockPort, "subscribe">,
    private readonly forward: (out: WorldPhysicsDriverOutput) => void,
    /**
     * Cycle 2 E1 — proprioception, read live (a sense, not an event — the
     * hold-settle patches mutate the selection behind the controller's
     * back). Default: the canonical body.
     */
    private readonly embodimentOf: () => string | null = () => "presence",
  ) {
    this.unsub = clock.subscribe({
      id: "world-physics",
      priority: WORLD_PHYSICS_CLOCK_PRIORITY,
      onFrame: (frame: OrganismClockFrame) => this.tick(frame),
    });
  }

  destroy(): void {
    this.unsub();
  }

  /** Rail tunables layer over the field (the field owns every physical constant). */
  setParams(p: Partial<WorldPhysicsParams> | undefined): void {
    this.rail = p;
    this.recomputeParams();
  }

  /** The environment reports its field — epoch bumps, the kernel re-locates. */
  setField(f: PhysicsField | null): void {
    this.field = f;
    this.recomputeParams();
  }

  /** Apply a bounded Tuning Lab cadence multiplier to the gait law. */
  setGaitTempoMultiplier(value: number | undefined): void {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    this.gaitTempoMultiplier = Math.max(0.75, Math.min(1.25, value));
  }

  getGaitTempoMultiplier(): number {
    return this.gaitTempoMultiplier;
  }

  /**
   * File or clear a reference gait request. Cadence and amplitude are clamped
   * here so no caller can turn a semantic score into an unbounded renderer
   * command. Translation remains owned by setLocomotion/the body kernel.
   */
  setPerformanceGait(intent: PerformanceGaitIntent | null): void {
    if (intent === null) {
      this.performanceGait = null;
      return;
    }
    if (
      !Number.isFinite(intent.cadenceHz) ||
      !Number.isFinite(intent.driveGain) ||
      !Number.isFinite(intent.lateralAxis) ||
      !Number.isFinite(intent.compressionRatio)
    ) {
      return;
    }
    const firstStroke = this.performanceGait === null;
    this.performanceGait = Object.freeze({
      cadenceHz: Math.max(GAIT_LAW.stepHzFloor, Math.min(GAIT_STEP_HZ_MAX, intent.cadenceHz)),
      driveGain: Math.max(0, Math.min(1, intent.driveGain)),
      lateralAxis: Math.max(-1, Math.min(1, intent.lateralAxis)),
      compressionRatio: Math.max(
        0,
        Math.min(MAX_AREA_CONSERVING_VERTICAL_COMPRESSION, intent.compressionRatio),
      ),
    });
    // First stroke only. Sustain re-files must not reset φ — that is a 2π
    // wrap and a 14px side-swap spike.
    if (firstStroke) {
      this.gaitGate = 1;
      this.gaitPhase = 0;
    }
  }

  getPerformanceGait(): PerformanceGaitIntent | null {
    return this.performanceGait ? { ...this.performanceGait } : null;
  }

  /**
   * S10 (owner N42) — the Boo ghost-flight mode: a golden-split parameter
   * swap of the flight organ + the perpetual-bob carrier. Owner-invoked
   * (the demo's second half); off = byte-identical FlightLaw behavior.
   */
  setBooMode(v: boolean): void {
    this.booMode = Boolean(v);
    if (!this.booMode) this.booLanding = false;
  }

  isBooMode(): boolean {
    return this.booMode;
  }

  /** N311 — descend from hover and plant with weight. Boo stays on. */
  requestBooLanding(): void {
    this.booLanding = true;
    if (this.body.y > 80) {
      this.body = applyImpulse(this.body, 0, -Math.max(480, this.body.y * 0.85));
    }
  }

  isBooLanding(): boolean {
    return this.booLanding;
  }

  getFieldEpoch(): number {
    return this.field ? this.field.epoch : -1;
  }

  /**
   * Give the kernel the same measured production envelope the visible rig
   * uses. The resolver is read-only and evaluated at the body's current z so
   * depth projection remains one law for physics and composition.
   */
  setRenderableWorldBoundsAt(
    boundsAt: ((z: number) => RenderableWorldBoundsAt) | null,
  ): void {
    this.renderableWorldBoundsAt = boundsAt;
  }

  /** E2/E3 — the embodiment-aware home cruise at the live gravity. */
  private homeCruise(): number {
    const g =
      this.params.gravity ?? WORLD_PHYSICS_CONSTANTS.gravity * this.params.gravityScale;
    return embodimentWanderOpen(this.embodimentOf())
      ? comfortCruiseBand(g).min
      : REST_DRIFT_UNITS_PER_SEC;
  }

  private recomputeParams(): void {
    this.params = this.field
      ? clampWorldPhysicsParams(
          worldPhysicsParamsFromField(this.field, clampWorldPhysicsParams(this.rail)),
        )
      : clampWorldPhysicsParams(this.rail);
  }

  // ── LocomotionPort ────────────────────────────────────────────────────

  setLocomotion(owner: LocomotionOwner, intent: LocomotionIntent): void {
    if (
      !Number.isFinite(intent.x) ||
      !Number.isFinite(intent.z) ||
      !Number.isFinite(intent.cruise)
    ) {
      return; // a corrupt intent files nothing, never faults
    }
    const previous = this.intents[owner];
    const targetChanged =
      !previous || Math.hypot(intent.x - previous.x, intent.z - previous.z) > 1;
    if (targetChanged) {
      const dx = intent.x - this.pathX();
      const dz = intent.z - this.pathZ();
      const distance = Math.hypot(dx, dz);
      this.legStartDistance = distance;
      this.arrivalGatherHeld = false;
      const desiredAxisX = distance > 1e-9 ? dx / distance : 0;
      const speed = bodySpeed(this.body);
      const currentAxisX = speed > ARRIVE_SPEED_UNITS ? this.body.vx / speed : 0;
      const desiredAxisZ = distance > 1e-9 ? dz / distance : 0;
      const currentAxisZ = speed > ARRIVE_SPEED_UNITS ? this.body.vz / speed : 0;
      const directionDot = desiredAxisX * currentAxisX + desiredAxisZ * currentAxisZ;
      const reversal = speed > ARRIVE_SPEED_UNITS && directionDot < -0.2;
      if (speed <= ARRIVE_SPEED_UNITS || reversal) {
        this.anticipationAxisX = desiredAxisX;
        this.anticipationLeft = GAIT_ANTICIPATION_DURATION_SECONDS;
        this.anticipationAge = 0;
        if (reversal) {
          // The anticipation beat brakes the old stroke first; a second beat
          // blends into the filed direction so a reversal cannot flip the
          // traction vector by a full cap in one kernel decision.
          this.reversalRampLeft = Math.max(
            this.reversalRampLeft,
            GAIT_ANTICIPATION_DURATION_SECONDS * 2,
          );
        }
      }
    }
    let intents: Partial<Record<LocomotionOwner, LocomotionIntent>> = {
      ...this.intents,
      [owner]: intent,
    };
    let owners = { ...this.owners, [owner]: true };
    // Hierarchy law: a spatial authority taking the wheel outranks the
    // kernel's housekeeping walk-home — the internal intent yields so an
    // owner never lingers after an authority resumes from the body.
    if (owner !== "internal" && intents.internal) {
      const next = { ...intents };
      delete next.internal;
      intents = next;
      owners = { ...owners, internal: false };
    }
    this.intents = intents;
    this.owners = owners;
    this.haltRest = false;
    // A fresh spatial intent may arrive during the housekeeping release. The
    // authority taking the wheel reopens locomotion immediately; otherwise a
    // held anticipation beat can be mistaken for a completed home retirement.
    if (this.mode === "idle" || this.mode === "retiring") {
      // Re-arm from the planted body. disarm() parks the live COM on
      // lastHandoffBody and zeros this.body; take/prep must not walk a
      // discarded origin statue.
      if (this.mode === "idle" && this.lastHandoffBody) {
        this.body = { ...this.lastHandoffBody };
        this.lastHandoffBody = null;
      }
      this.mode = "locomotion";
      this.acc = 0;
      this.settledFor = 0;
      this.settledTicks = 0;
    }
  }

  clearLocomotion(owner: LocomotionOwner): void {
    const next = { ...this.intents };
    delete next[owner];
    this.intents = next; // ownership retained (dwell)
    if (!Object.keys(next).length) {
      this.anticipationLeft = 0;
      this.anticipationAge = 0;
      this.anticipationAxisX = 0;
      this.reversalRampLeft = 0;
      this.legStartDistance = Number.POSITIVE_INFINITY;
    }
  }

  standDownLocomotion(owner: LocomotionOwner): void {
    const next = { ...this.intents };
    delete next[owner];
    this.intents = next;
    this.owners = { ...this.owners, [owner]: false };
    if (owner === "performance") this.performanceGait = null;
    if (!Object.keys(next).length) {
      this.anticipationLeft = 0;
      this.anticipationAge = 0;
      this.anticipationAxisX = 0;
      this.reversalRampLeft = 0;
      this.legStartDistance = Number.POSITIVE_INFINITY;
    }
  }

  private pathX(): number {
    return this.body.x - this.supportCogX;
  }

  private pathZ(): number {
    return this.body.z - this.supportCogZ;
  }

  private stripSupportCog(): void {
    if (this.supportCogX === 0 && this.supportCogZ === 0) return;
    this.body = Object.freeze({
      ...this.body,
      x: this.body.x - this.supportCogX,
      z: this.body.z - this.supportCogZ,
    });
    this.supportCogX = 0;
    this.supportCogZ = 0;
  }

  floorPose(): Readonly<{ x: number; z: number; speed: number; boundPinned?: boolean }> {
    return {
      x: this.pathX(),
      z: this.pathZ(),
      speed: Math.hypot(this.body.vx, this.body.vz),
      boundPinned: this.isBoundPinned(),
    };
  }

  /**
   * Cycle 3 M1/M2 — the traction context the steering law is using RIGHT NOW
   * (identical reads to `steeringInput`/`flightInput`): the field's μ and g
   * when the environment reports them, the authored fallbacks otherwise. The
   * wander organ derives its leg composition from this, so its conclusions
   * follow the environment's field (owner N5) instead of a frozen assumption.
   * F-LAW 1 proprioception: a footless body reports ITS steering budget —
   * the thrust envelope T_max expressed as the μ that would buy it (μg =
   * T_max), so the composer's brake math follows the body that files.
   */
  traction(): Readonly<{ mu: number; gravity: number }> {
    const gravity =
      this.params.gravity ??
      WORLD_PHYSICS_CONSTANTS.gravity * this.params.gravityScale;
    return {
      mu: this.footless()
        ? FLIGHT_LAW.thrustMaxUnitsPerS2 / gravity
        : this.params.frictionMu ?? FALLBACK_MU,
      gravity,
    };
  }

  /**
   * Default authored hops are specified by the organism's φ-scale apex, not
   * by a fallback velocity in an unrelated unit system.  The environment
   * field owns gravity, so a fixed 1500 units/s launch becomes a 2–3 px
   * twitch when the live field is applied (D-0112).  Explicit caller
   * velocities remain literal; this helper only supplies the public default.
   */
  private defaultBounceVelocity(): number {
    const gravity =
      this.params.gravity ??
      WORLD_PHYSICS_CONSTANTS.gravity * this.params.gravityScale;
    const homeHeight = this.field?.homeHeightUnits;
    if (typeof homeHeight !== "number" || !Number.isFinite(homeHeight) || homeHeight <= 0 || gravity <= 0) {
      return 1500;
    }
    const requestedApex = PHI_LAW.apexLadder[1] * homeHeight;
    const ceiling = this.bounds().yMax;
    const power = Math.max(1, this.params.launchPower);
    const apex = typeof ceiling === "number" && Number.isFinite(ceiling) && ceiling > 0
      ? Math.min(requestedApex, (ceiling * 0.85) / (power * power))
      : requestedApex;
    return Math.sqrt(2 * gravity * Math.max(0, apex));
  }

  // ── authored performances (the Phase B bar) ──────────────────────────

  /** S2 — the bouncing ball: impulse launch into gravity + restitution. */
  launchBounce(cfg: BounceLaunchConfig = {}): void {
    this.lastHandoffBody = null;
    this.cometLaunchDeltaV = null;
    this.cometLaunchLeft = 0;
    this.cometFlightFor = 0;
    this.retirementLeft = 0;
    const L = this.params.launchPower;
    const n = (v: number | undefined, fb: number) =>
      typeof v === "number" && Number.isFinite(v) ? v : fb;
    const z0 = clampDepth(n(cfg.z0, 0));
    const vy = n(cfg.vy, this.defaultBounceVelocity());
    this.body = applyImpulse(
      { ...createWorldBody(n(cfg.x0, -600)), z: z0, contact: false },
      n(cfg.vx, 520) * L,
      vy * L,
    );
    this.env = ZERO_PHYSICS_ENVELOPE;
    this.mode = "bounce";
    this.acc = 0;
    this.settledFor = 0;
    this.settledTicks = 0;
    this.intents = {};
    this.performanceGait = null;
    this.performanceCompression = 0;
    this.anticipationLeft = 0;
    this.anticipationAge = 0;
    this.anticipationAxisX = 0;
    this.reversalRampLeft = 0;
    this.legStartDistance = Number.POSITIVE_INFINITY;
    this.steeringAx = 0;
    this.steeringAz = 0;
    this.support = SUPPORT_REST;
    this.supportCogX = 0;
    this.supportCogZ = 0;
    this.supportGatherTarget = 0;
    this.arrivalGatherHeld = false;
    this.walkPaintedGather = 0;
    this.arrivedIdlePhase = 0;
    this.arrivedIdleAge = 0;
    this.arrivedIdleTarget = 0;
    this.arrivedTakeTarget = 0;
  }

  /** S4 — the comet shot: gather hold (anticipation) then a φ-loaded release. */
  launchComet(cfg: CometLaunchConfig = {}): void {
    const n = (v: number | undefined, fb: number) =>
      typeof v === "number" && Number.isFinite(v) ? v : fb;
    const defaultVx = this.field ? GAIT_LAW.cruiseBaseUnitsPerSec : 2100;
    this.comet = {
      vx: n(cfg.vx, defaultVx),
      vy: n(cfg.vy, this.defaultBounceVelocity()),
    };
    // ONE mass: inherit the LIVE visual body (path + planted COM).
    // disarm() parks that COM on lastHandoffBody; restInPlace keeps this.body.
    // Never x0-rewrite a body that is already in the picture.
    const planted = this.mode !== "idle" ? this.body : (this.lastHandoffBody ?? this.body);
    const hasPlanted = this.mode !== "idle" || this.lastHandoffBody != null
      || Math.hypot(this.body.x, this.body.z) > 1e-6;
    this.lastHandoffBody = null;
    const z0 = clampDepth(n(cfg.z0, planted.z));
    this.body = hasPlanted
      ? { ...planted }
      : { ...createWorldBody(n(cfg.x0, -700)), z: z0 };
    this.cometLaunchDeltaV = null;
    this.cometLaunchLeft = 0;
    this.cometFlightFor = 0;
    this.retirementLeft = 0;
    // Live body keeps the planted envelope so TAKE does not pop to zero.
    this.gatherTotal = Math.max(0.1, n(cfg.gatherSeconds, 0.8));
    this.gatherLeft = this.gatherTotal;
    this.mode = "comet-gather";
    this.acc = 0;
    this.settledFor = 0;
    this.settledTicks = 0;
    // Keep life/wander hold so gather->fly cannot home-yank to origin.
    this.intents = {
      ...(this.intents.life ? { life: this.intents.life } : {}),
      ...(this.intents.wander ? { wander: this.intents.wander } : {}),
    };
    this.performanceGait = null;
    this.performanceCompression = 0;
    this.anticipationLeft = 0;
    this.anticipationAge = 0;
    this.anticipationAxisX = 0;
    this.reversalRampLeft = 0;
    this.legStartDistance = Number.POSITIVE_INFINITY;
    this.steeringAx = 0;
    this.steeringAz = 0;
    this.support = SUPPORT_REST;
    this.supportCogX = 0;
    this.supportCogZ = 0;
    this.supportGatherTarget = 0;
    this.arrivalGatherHeld = false;
    this.walkPaintedGather = 0;
    this.arrivedIdlePhase = 0;
    this.arrivedIdleAge = 0;
    this.arrivedIdleTarget = 0;
    this.arrivedTakeTarget = 0;
  }

  /** Release the authority NOW — provenance none, renderer eases home. */
  disarm(): void {
    if (this.mode !== "idle") this.lastHandoffBody = this.body;
    this.mode = "idle";
    this.env = ZERO_PHYSICS_ENVELOPE;
    this.comet = null;
    this.cometLaunchDeltaV = null;
    this.cometLaunchLeft = 0;
    this.cometFlightFor = 0;
    this.retirementLeft = 0;
    this.body = createWorldBody();
    this.acc = 0;
    this.gaitPhase = 0;
    this.anticipationLeft = 0;
    this.anticipationAge = 0;
    this.anticipationAxisX = 0;
    this.reversalRampLeft = 0;
    this.legStartDistance = Number.POSITIVE_INFINITY;
    this.steeringAx = 0;
    this.steeringAz = 0;
    this.gaitGate = 0;
    this.groundedLeanDeg = 0;
    this.prevSpeed = 0;
    this.prevVX = 0;
    this.prevSpeedCont = 0;
    this.bankAx = 0;
    this.bankGate = 0;
    this.flattenSigned = 0;
    this.flattenWidth = 0;
    this.flattenGate = 0;
    this.windP = 0;
    this.windDirX = 0;
    this.gait = GAIT_REST;
    this.support = SUPPORT_REST;
    this.supportCogX = 0;
    this.supportCogZ = 0;
    this.supportGatherTarget = 0;
    this.arrivalGatherHeld = false;
    this.walkPaintedGather = 0;
    this.arrivedIdlePhase = 0;
    this.arrivedIdleAge = 0;
    this.arrivedIdleTarget = 0;
    this.arrivedTakeTarget = 0;
    this.booGate = 0;
    // The physics authority is retired with the body. Do not let inspection
    // report the last airborne pose after the zero/provenance-none release.
    this.lastPhysicsPose = null;
    this.intents = {};
    this.performanceGait = null;
    this.performanceCompression = 0;
    this.owners = { performance: false, wander: false, life: false, internal: false };
    this.forward({
      pose: { x: 0, y: 0, z: 0, tilt: 0, provenance: "none" },
      wakeVX: 0,
      wakeVY: 0,
      lightSpeed: 0,
      silhouetteDeltas: {},
      idle: 0,
      take: 0,
      gait: GAIT_REST,
      gaitScreen: { bobLiftUnits: 0, swayXUnits: 0, rollDeg: 0, contactSquash: 0, stepBaseXUnits: 0, bankDeg: 0, stepFlattenUnits: 0, stepFlattenWidthUnits: 0, plantedScreenXUnits: 0, plantedCompress: 0, incomingCompress: 0, hopMix: 0, flight: 0, seated: false, leftoverSway: 0, supportSide: 0, swingLiftUnits: 0, swingAdvanceUnits: 0, loadedDropUnits: 0, swingClearance: 0 },
      wind: { pressure: 0, dirX: 0 },
      facingBearingDeg: null,
      booBobUnits: 0,
    });
  }

  getState(): Readonly<{
    mode: DriverMode;
    body: WorldBodyState;
    envelope: PhysicsSilhouetteEnvelope;
    params: WorldPhysicsParams;
    fieldEpoch: number;
    locomotionOwners: Readonly<Record<LocomotionOwner, boolean>>;
    filedCruise: number;
    gait: GaitObservables;
    support: SupportExchangeState;
    authority: ReturnType<WorldPhysicsDriver["inspectPhysicsAuthority"]>;
  }> {
    const intent =
      this.intents.performance ??
      this.intents.life ??
      this.intents.wander ??
      this.intents.internal;
    return {
      mode: this.mode,
      body: this.body,
      envelope: this.env,
      params: this.params,
      fieldEpoch: this.getFieldEpoch(),
      locomotionOwners: this.owners,
      filedCruise: Number(intent?.cruise) || 0,
      gait: this.gait,
      support: this.support,
      authority: this.inspectPhysicsAuthority(),
    };
  }

  /**
   * Read-only construction-lock witness. The body kernel is the only place
   * that can emit a `physics-authority` pose; this snapshot lets tests and
   * observer captures prove that the emitted pose still matches body truth.
   */
  inspectPhysicsAuthority(): Readonly<{
    packet: typeof PHYSICS_AUTHORITY_PACKET;
    writer: "world-physics-driver";
    emissionCount: number;
    bodyPoseMatchesOutput: boolean;
    provenance: WorldPhysicsDriverOutput["pose"]["provenance"] | null;
    outputPose: Readonly<{ x: number; y: number; z: number }> | null;
  }> {
    const pose = this.lastPhysicsPose;
    const bodyPoseMatchesOutput = pose
      ? Math.abs(pose.x - this.body.x) <= 1e-9 &&
        Math.abs(pose.y - this.body.y) <= 1e-9 &&
        Math.abs(pose.z - this.body.z) <= 1e-9
      : false;
    return Object.freeze({
      packet: PHYSICS_AUTHORITY_PACKET,
      writer: "world-physics-driver",
      emissionCount: this.physicsEmissionCount,
      bodyPoseMatchesOutput,
      provenance: pose?.provenance ?? null,
      outputPose: pose
        ? Object.freeze({ x: pose.x, y: pose.y, z: pose.z })
        : null,
    });
  }

  // ── the tick ──────────────────────────────────────────────────────────

  private tick(frame: OrganismClockFrame): void {
    if (this.mode === "idle") return;
    if (!Number.isFinite(frame.deltaMs)) return;
    this.lastFrameMs = frame.timeMs; // S10: the Boo perpetual-bob rotor's time source (the organism clock)
    const dt = Math.max(0, Math.min(WORLD_PHYSICS_CONSTANTS.maxDt, frame.deltaMs / 1000));
    if (dt <= 0) return;

    this.acc = Math.min(this.acc + dt, MAX_ACC_SECONDS);
    while (this.acc >= KERNEL_H) {
      this.substep(KERNEL_H);
      this.acc -= KERNEL_H;
    }
    if (!this.armed()) return; // disarmed inside the substeps
    this.postTick(dt);
    if (this.armed()) this.forwardCurrent(dt);
  }

  /**
   * The authority is live — a fresh read, because substep/postTick may
   * disarm mid-frame (TS keeps the tick's entry narrowing across calls).
   */
  private armed(): boolean {
    return this.mode !== "idle";
  }

  private substep(h: number): void {
    this.stripSupportCog();
    if (this.mode === "comet-gather") {
      // Three-beat: TAKE (expand/light) overlaps PREP (vertical scrunch + hold).
      // Never a snap-resize. Horizontal squash is the wrong axis for a jump.
      this.gatherLeft -= h;
      const elapsed = Math.max(0, this.gatherTotal - this.gatherLeft);
      const takeWindow = this.gatherTotal / PHI_LAW.phi;
      const prepDelay = takeWindow / PHI_LAW.phi;
      const takeTarget = elapsed < takeWindow ? 1 : 0;
      const gatherTarget = elapsed < prepDelay ? 0 : 1;
      this.env = stepPhysicsSilhouetteEnvelope(
        this.env,
        {
          impactSpeed: 0,
          airSpeed: 0,
          contact: true,
          gatherTarget,
          takeTarget,
          gatherAxis: "vertical",
          settleZeta: this.zeta(),
        },
        h,
      );
      if (this.gatherLeft <= 0 && this.comet) {
        const L = this.params.launchPower;
        this.cometLaunchDeltaV = { vx: this.comet.vx * L, vy: this.comet.vy * L };
        this.cometLaunchLeft = PHI_LAW.loadRhythmSeconds;
        this.mode = "comet-fly";
      }
      return;
    }

    // N30/N31 — one steering idiom, two budgets: the feeted body spends the
    // friction cone (traction), every footless body spends the thrust
    // envelope (flight — F-LAW 1/3).
    const rawInput =
      this.mode === "locomotion"
        ? this.footless()
          ? this.flightInput()
          : this.steeringInput()
        : this.mode === "comet-fly" && this.footless()
          ? this.flightInput()
        : this.mode === "retiring" && this.footless()
            ? this.retirementFlightInput()
            : this.mode === "retiring"
              ? this.steeringInput()
        : {};
    const input = this.conditionGroundedReversal(rawInput, h);
    if (this.cometLaunchDeltaV && this.cometLaunchLeft > 0) {
      // Consume a fixed fraction of the authored release over the original
      // φ loading window. Dividing by the *shrinking* remainder compounds the
      // same release impulse on every substep and creates an artificial speed
      // spike at the final tick (which can then hit the production wall in a
      // single sample). The last kernel may be shorter than h, so consume only
      // the remaining interval and spend exactly one release budget.
      const loadStep = Math.min(h, this.cometLaunchLeft);
      const share = loadStep / PHI_LAW.loadRhythmSeconds;
      this.body = applyImpulse(
        this.body,
        this.cometLaunchDeltaV.vx * share,
        this.cometLaunchDeltaV.vy * share,
      );
      this.cometLaunchLeft -= loadStep;
      if (this.cometLaunchLeft <= 1e-9) {
        this.cometLaunchDeltaV = null;
        this.cometLaunchLeft = 0;
      }
    }
    const { state, events } = stepWorldBody(this.body, input, this.params, h, this.bounds());
    this.body = state;
    const floorHit = events.find((e) => e.kind === "floor");
    this.env = stepPhysicsSilhouetteEnvelope(
      this.env,
      {
        impactSpeed: floorHit?.speed ?? 0,
        airSpeed: bodySpeed(state),
        contact: state.contact,
        gatherTarget: this.mode === "locomotion" ? this.supportGatherTarget : 0,
        takeTarget: this.arrivedTakeTarget,
        idleTarget: this.arrivedIdleTarget,
        settleZeta: this.zeta(),
      },
      h,
    );
  }

  private zeta(): number {
    return this.field ? this.field.settleZeta : PHI_LAW.settleZeta;
  }

  private bounds(): WorldWallBounds {
    const renderable = this.renderableWorldBoundsAt?.(this.body.z);
    if (
      renderable &&
      Number.isFinite(renderable.xMin) &&
      Number.isFinite(renderable.xMax) &&
      renderable.xMin < renderable.xMax &&
      Number.isFinite(renderable.yMax) &&
      renderable.yMax > 0 &&
      Number.isFinite(renderable.zMin) &&
      Number.isFinite(renderable.zMax) &&
      renderable.zMin < renderable.zMax
    ) {
      return renderable;
    }
    if (this.field) {
      const b = fieldBoundsAt(this.field, this.body.z, WORLD_SPACE_CONSTANTS.homeViewDistance);
      return { xHalf: b.xHalfUnits, zMin: this.field.zNearUnits, zMax: this.field.zFarUnits };
    }
    return { xHalf: worldBoundsAt(this.body.z).xHalf };
  }

  /**
   * Traction-limited steering (Cycle 6 — cruise-attainment-phd-memo A0/A1):
   * the desired speed aims at the target on the Coulomb braking curve
   * (v = √(2μg·d)), so the body can always stop in the distance remaining.
   * The controller IS the friction bound, not a servo chasing it: outside a
   * one-kernel-tick capture band (μg·KERNEL_H — one φ-tick of saturated
   * impulse) the FULL Coulomb cap drives along the velocity error, so a
   * launch is a constant-force stroke v(t) = μg·t (distance v²/2μg), never an
   * asymptote; inside the band the force bleeds linearly to zero — deadbeat
   * capture, acceleration-continuous everywhere, monotone, no overshoot.
   * The ease-out of arrival is friction, not a curve.
   */
  private steeringInput(): WorldPhysicsInput {
    const intent =
      this.intents.performance ??
      this.intents.life ??
      this.intents.wander ??
      this.intents.internal;
    if (!intent || !this.body.contact) return {};
    if (this.isBoundPinned()) return { ax: 0, az: 0, steered: true };
    const mu = this.params.frictionMu ?? FALLBACK_MU;
    const g =
      this.params.gravity ?? WORLD_PHYSICS_CONSTANTS.gravity * this.params.gravityScale;
    const dx = intent.x - this.pathX();
    const dz = intent.z - this.pathZ();
    const dist = Math.hypot(dx, dz);
    if (dist <= 1e-9) return {};
    const cap = mu * g;
    if (this.anticipationLeft > 0) {
      const speed = bodySpeed(this.body);
      // At rest the body holds the ground while the visible counter-lean
      // telegraphs intent. During a reversal, spend the same beat braking the
      // old stroke so the body shifts weight instead of coasting through it.
      if (speed > ARRIVE_SPEED_UNITS) {
        return {
          ax: -(this.body.vx / speed) * cap,
          az: -(this.body.vz / speed) * cap,
          steered: true,
        };
      }
      return { ax: 0, az: 0, steered: true };
    }
    // A1 lookahead: aim at the distance remaining AFTER this kernel tick's
    // move, so Coulomb-curve tracking converges stop-short of the target
    // (exact deadbeat against a predicted vDes can never cross the origin).
    const vAlong = (this.body.vx * dx + this.body.vz * dz) / dist;
    const dPred = Math.max(0, dist - vAlong * KERNEL_H);
    const brake = Math.sqrt(2 * mu * g * dPred);
    // GASPER-NORTHSTAR-001 (N60 continuity): the arrival band no longer SNAPS
    // the commanded speed from the Coulomb brake value to zero at the band
    // EDGE (that step flipped the controller into a full-μg reverse — a jerk
    // spike at every leg end). The brake curve already carries vDes → 0 as
    // d → 0; inside the band a LINEAR ramp eases the commanded speed down
    // continuously. The brake's sqrt tail would otherwise creep forever just
    // short of the target (the lookahead re-seeds a tiny vDes at rest), so
    // below a 0.5 u/s arrival floor the command snaps to exactly 0 — the
    // deadbeat bleeds the last residual in one time constant, an imperceptible
    // deceleration (≈ 120 u/s² ≪ μg) — deliberate braking, bounded jerk,
    // exact stop, and no micro-reverse.
    const vDesRamp =
      Math.min(intent.cruise, brake) * Math.min(1, dist / ARRIVE_EPS_UNITS);
    const vDes = vDesRamp < ARRIVE_EPS_VELOCITY_UNITS_PER_SEC ? 0 : vDesRamp;
    const ex = (dx / dist) * vDes - this.body.vx;
    const ez = (dz / dist) * vDes - this.body.vz;
    const eMag = Math.hypot(ex, ez);
    // FIX (walking-flag fold-back): an active intent IS walking — even at
    // exact cruise where the deadbeat force is zero. The steered mark keeps
    // the kernel's static-friction drive engaged; without it the integrator
    // read the zero-force tick as a spent body and skid-bled one capture
    // band (Δ₁ = μg·KERNEL_H) per silent substep — the take-6 limit cycle
    // {cruise, cruise−Δ₁} that read steady at cruise−Δ₁ (2492 vs 2610).
    if (eMag <= 1e-9) return { ax: 0, az: 0, steered: true };
    // A0/A1: a = μg·e / max(|e|, μg·KERNEL_H) — saturated launch, one-tick
    // bleed. C0-continuous everywhere; |a| ≤ μg by construction.
    const gainFloor =
      dist <= ARRIVAL_BLEND_DISTANCE_UNITS &&
      this.legStartDistance <= ARRIVAL_BLEND_LEG_DISTANCE_UNITS
      ? cap * ARRIVAL_BLEND_SECONDS
      : cap * KERNEL_H;
    const gain = cap / Math.max(eMag, gainFloor);
    return { ax: ex * gain, az: ez * gain, steered: true };
  }

  /**
   * N119 — condition only a grounded Wispwalker reversal. The Coulomb cap is
   * still the hard envelope; this stateful blend limits the change in the
   * traction vector to one exchange beat, so a reversal carries weight before
   * the new stroke commits instead of producing an instantaneous two-cap
   * acceleration jump. Flight and ordinary arrival remain byte-identical.
   */
  private conditionGroundedReversal(input: WorldPhysicsInput, h: number): WorldPhysicsInput {
    const activeGrounded =
      (this.mode === "locomotion" || this.mode === "retiring") &&
      this.body.contact &&
      !this.footless();
    if (!activeGrounded) {
      this.steeringAx = 0;
      this.steeringAz = 0;
      this.reversalRampLeft = 0;
      return input;
    }

    const desiredAx = Number.isFinite(input.ax) ? input.ax ?? 0 : 0;
    const desiredAz = Number.isFinite(input.az) ? input.az ?? 0 : 0;
    if (this.reversalRampLeft <= 0) {
      this.steeringAx = desiredAx;
      this.steeringAz = desiredAz;
      return input;
    }

    const gravity =
      this.params.gravity ?? WORLD_PHYSICS_CONSTANTS.gravity * this.params.gravityScale;
    const cap = (this.params.frictionMu ?? FALLBACK_MU) * gravity;
    const maxDelta = cap * Math.min(1, h / Math.max(1e-9, GAIT_ANTICIPATION_DURATION_SECONDS * 2));
    const deltaAx = desiredAx - this.steeringAx;
    const deltaAz = desiredAz - this.steeringAz;
    const deltaMag = Math.hypot(deltaAx, deltaAz);
    const scale = deltaMag > maxDelta && deltaMag > 0 ? maxDelta / deltaMag : 1;
    this.steeringAx += deltaAx * scale;
    this.steeringAz += deltaAz * scale;
    this.reversalRampLeft = Math.max(0, this.reversalRampLeft - h);
    return { ...input, ax: this.steeringAx, az: this.steeringAz };
  }

  /**
   * N30 / N304 — walking belongs to feet. Boo is ghost-flight even while
   * the drawing stays Wispwalker (N200: no Presence sphere). A Boo-on
   * walker must use the flight organ or zip stays a floor taxi.
   */
  private footless(): boolean {
    if (this.booMode) return true;
    return embodimentLocomotionClass(this.embodimentOf()) !== "walker";
  }

  /**
   * F-LAW 1/3 (flight-physics-phd-memo) — buoyant steering: the carried
   * Coulomb idiom with the THRUST ENVELOPE in place of the friction cone.
   * The desired speed aims at the target on the flight brake curve
   * v = √(2·T_max·d), so the body can always jet-brake in the distance
   * remaining; the error drive is deadbeat (saturated jets, one-tick bleed,
   * monotone, no horizontal overshoot — the ease-out of arrival is reverse
   * thrust + drag, not a curve). Cruise equilibrium is honest because the
   * drag feed-forward cancels the air's toll AT the desired speed — a
   * zero-error tick still commands the equilibrium thrust, so no silent
   * substep skid-bleeds the cruise (the take-6 fold-back, pre-empted).
   * Altitude belongs to the hover servo (F-LAW 3: h_G/φ⁴, ζ = 1/φ — one
   * ≈8.4 % overshoot, F-LAW 4); every horizontal motion pays drag.
   */
  private flightInput(): WorldPhysicsInput {
    // S10 (N42): the BOO parameter set is a golden-split swap of the flight
    // organ — dreamy jets (T_max·φ⁻¹), heavy drag (φ-scaled), same hover
    // equilibrium + settle. The walker floor and the rest class are
    // untouched; 0-mode behavior is byte-identical to FlightLaw.
    const L = this.booMode ? BOO_FLIGHT_LAW : FLIGHT_LAW;
    const base: WorldPhysicsInput = {
      flight: true,
      hoverY: this.booMode && this.booLanding ? 0 : L.hoverAltitudeUnits,
      hoverZeta: L.settleZeta,
      hoverOmega: L.hoverOmegaPerSec,
      dragC1: L.dragLinearPerSec,
      dragC2: L.dragQuadPerUnit,
      steered: true,
    };
    const intent =
      this.intents.performance ??
      this.intents.life ??
      this.intents.wander ??
      this.intents.internal;
    // Hover-hold: the servo keeps the altitude; drag spends whatever motion
    // is left (thrust-cut decay tail — nothing snaps, nothing parks mid-air).
    if (!intent) return base;
    const dx = intent.x - this.body.x;
    const dz = intent.z - this.body.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 1e-9) return base;
    const tMax = L.thrustMaxUnitsPerS2;
    // A1 lookahead (carried): aim at the distance remaining AFTER this
    // kernel tick's move, so brake-curve tracking converges stop-short.
    const vAlong = (this.body.vx * dx + this.body.vz * dz) / dist;
    const dPred = Math.max(0, dist - Math.max(0, vAlong) * KERNEL_H);
    const brake = flightBrakeSpeedUnitsPerSec(dPred);
    const vCruise = Math.max(1, intent.cruise);
    const vDes = Math.min(vCruise, brake);
    const ex = (dx / dist) * vDes - this.body.vx;
    const ez = (dz / dist) * vDes - this.body.vz;
    const eMag = Math.hypot(ex, ez);
    let tx: number;
    let tz: number;
    if (brake >= vCruise) {
      // FAR — cruise tracking: the drag feed-forward cancels the air's toll
      // AT the desired speed (at cruise it IS the whole thrust — terminal
      // velocity at T_max); the deadbeat error drive spends the residual.
      const ff = flightDragUnitsPerS2(vDes);
      const residual = Math.max(0, tMax - ff);
      const gain = residual / Math.max(eMag, tMax * KERNEL_H);
      tx = (dx / dist) * ff + ex * gain;
      tz = (dz / dist) * ff + ez * gain;
    } else {
      // INSIDE THE BRAKE CURVE — pure error drive: the feed-forward would
      // fight the reverse jets for the one envelope (the curve reserves
      // T_max; the drag assist is the margin), so it is shed the way a
      // walker sheds the drive at the Coulomb curve. Deadbeat against the
      // predicted mark — monotone, never crosses the target (A1 idiom).
      const gain = tMax / Math.max(eMag, tMax * KERNEL_H);
      tx = ex * gain;
      tz = ez * gain;
    }
    const tMag = Math.hypot(tx, tz);
    if (tMag > tMax) {
      const k = tMax / tMag;
      tx *= k;
      tz *= k;
    }
    return { ...base, ax: tx, az: tz };
  }

  /**
   * Retirement is still flight for a footless body, but its hover target is
   * deliberately lowered to the neutral floor. Drag remains live so the body
   * spends its remaining motion before provenance is released.
   */
  private retirementFlightInput(): WorldPhysicsInput {
    const flight = this.flightInput();
    return {
      ...flight,
      hoverY: 0,
    };
  }

  private atHome(): boolean {
    if (
      Math.hypot(this.pathX(), this.pathZ()) >= ARRIVE_EPS_UNITS ||
      Math.hypot(this.body.vx, this.body.vz) >= ARRIVE_SPEED_UNITS
    ) {
      return false;
    }
    if (this.footless()) {
      return (
        Math.abs(this.body.y - FLIGHT_LAW.hoverAltitudeUnits) < ARRIVE_EPS_UNITS &&
        Math.abs(this.body.vy) < ARRIVE_SPEED_UNITS
      );
    }
    return this.body.contact && Math.abs(this.body.y) < ARRIVE_EPS_UNITS;
  }

  /**
   * Hold the current floor pose and retire locomotion so FormMaster idle
   * can breathe. Do not disarm (that zeros the body and eases home) and do
   * not walk home (that is a second travel writer after a finished leg).
   * The next setLocomotion re-arms from idle.
   */
  private haltInPlace(): void {
    // Brake to a stop at the current floor pose. Walking home after a
    // released wander leg is a second travel writer — the painted walk
    // must rest where it arrived so idle can breathe, then the next seed
    // re-arms from that spot.
    this.intents = {
      internal: { x: this.pathX(), z: this.pathZ(), cruise: this.homeCruise() },
    };
    this.owners = { performance: false, wander: false, life: false, internal: true };
    this.haltRest = true;
    this.mode = "locomotion";
  }

  private restInPlace(): void {
    this.intents = {};
    this.owners = { performance: false, wander: false, life: false, internal: false };
    this.haltRest = false;
    this.gaitGate = 0;
    this.anticipationLeft = 0;
    this.anticipationAge = 0;
    this.anticipationAxisX = 0;
    this.reversalRampLeft = 0;
    this.legStartDistance = Number.POSITIVE_INFINITY;
    this.support = {
      ...SUPPORT_REST,
      exchangeCount: this.support.exchangeCount,
      plantedWorldX: this.support.plantedWorldX,
      plantedWorldZ: this.support.plantedWorldZ,
    };
    this.forwardCurrent(KERNEL_H);
    this.mode = "idle";
  }

  private bodySettledAwayFromHome(): boolean {
    return (
      this.body.contact &&
      Math.hypot(this.body.vx, this.body.vz) < ARRIVE_SPEED_UNITS &&
      Math.hypot(this.pathX(), this.pathZ()) >= ARRIVE_EPS_UNITS
    );
  }

  private resolvedWall(): Readonly<{ xMin: number; xMax: number; zMin?: number; zMax?: number }> {
    const b = this.bounds();
    const xHalf =
      typeof b.xHalf === "number" && Number.isFinite(b.xHalf) && b.xHalf > 0
        ? b.xHalf
        : worldBoundsAt(this.body.z).xHalf;
    const xMin = typeof b.xMin === "number" && Number.isFinite(b.xMin) ? b.xMin : -xHalf;
    const xMax = typeof b.xMax === "number" && Number.isFinite(b.xMax) ? b.xMax : xHalf;
    return {
      xMin: xMin < xMax ? xMin : -xHalf,
      xMax: xMin < xMax ? xMax : xHalf,
      zMin: typeof b.zMin === "number" && Number.isFinite(b.zMin) ? b.zMin : undefined,
      zMax: typeof b.zMax === "number" && Number.isFinite(b.zMax) ? b.zMax : undefined,
    };
  }

  private isBoundPinned(): boolean {
    const intent =
      this.intents.performance ??
      this.intents.life ??
      this.intents.wander ??
      this.intents.internal;
    if (!intent) return false;
    const wall = this.resolvedWall();
    const x = this.body.x;
    const z = this.body.z;
    const pin = ARRIVE_EPS_UNITS;
    const pastX =
      (x >= wall.xMax - pin && intent.x > x + 1) ||
      (x <= wall.xMin + pin && intent.x < x - 1);
    const pastZ =
      (wall.zMax != null && z >= wall.zMax - pin && intent.z > z + 1) ||
      (wall.zMin != null && z <= wall.zMin + pin && intent.z < z - 1);
    return pastX || pastZ;
  }

  private startInternalHome(): void {
    this.intents = { ...this.intents, internal: { x: 0, z: 0, cruise: this.homeCruise() } };
    this.owners = { ...this.owners, internal: true };
    this.mode = "locomotion";
  }

  private beginRetirement(): void {
    this.mode = "retiring";
    this.retirementLeft = PHI_LAW.loadRhythmSeconds;
    this.booMode = false;
    this.booLanding = false;
  }

  private postTick(dt: number): void {
    if (this.mode === "bounce" || this.mode === "comet-fly") {
      if (this.mode === "comet-fly") this.cometFlightFor += dt;
      if (bodyIsSettled(this.body)) {
        this.settledFor += dt;
        this.settledTicks += 1;
      } else {
        this.settledFor = 0;
        this.settledTicks = 0;
      }
      const flightBeatSpent =
        this.mode === "comet-fly" &&
        this.cometLaunchDeltaV === null &&
        this.cometFlightFor >= COMET_FLIGHT_HOLD_SECONDS;
      if (
        (this.settledFor >= SETTLE_HOLD_SECONDS && this.settledTicks >= SETTLE_FRAMES_MIN) ||
        flightBeatSpent
      ) {
        // Spent beat complete: walk home under the same traction law (release,
        // never snap). A waiting spatial authority resumes from the body.
        if (this.intents.performance ?? this.intents.life ?? this.intents.wander) {
          this.mode = "locomotion";
        } else {
          this.startInternalHome();
        }
      }
      return;
    }
    if (this.mode === "locomotion") {
      const internalTarget = this.intents.internal;
      const internalLegIsHome =
        !internalTarget || Math.hypot(internalTarget.x, internalTarget.z) < ARRIVE_EPS_UNITS;
      if (this.owners.internal && this.haltRest && internalTarget && !internalLegIsHome) {
        const arrivedHalt =
          Math.hypot(this.pathX() - internalTarget.x, this.pathZ() - internalTarget.z) <
            ARRIVE_EPS_UNITS &&
          Math.hypot(this.body.vx, this.body.vz) < ARRIVE_SPEED_UNITS;
        if (arrivedHalt) this.restInPlace();
        return;
      }
      if (this.owners.internal && internalLegIsHome && this.atHome()) {
        this.beginRetirement();
        return;
      }
      if (
        !this.owners.performance &&
        !this.owners.wander &&
        !this.owners.life &&
        !this.owners.internal
      ) {
        if (this.atHome()) this.beginRetirement();
        else if (this.bodySettledAwayFromHome()) this.restInPlace();
        else this.haltInPlace();
      }
      return;
    }
    if (this.mode === "retiring") {
      this.retirementLeft = Math.max(0, this.retirementLeft - dt);
      const neutral =
        Math.hypot(this.pathX(), this.pathZ()) < ARRIVE_EPS_UNITS &&
        Math.hypot(this.body.vx, this.body.vz) < ARRIVE_SPEED_UNITS &&
        Math.abs(this.body.y) < ARRIVE_EPS_UNITS &&
        Math.abs(this.body.vy) < ARRIVE_SPEED_UNITS &&
        this.body.contact;
      if (this.retirementLeft <= 0 && neutral) this.disarm();
    }
  }

  private forwardCurrent(dt: number): void {
    const booTarget = this.booMode ? 1 : 0;
    const booStep = dt / Math.max(1e-9, BOO_FLIGHT_LAW.expressionRampSeconds);
    this.booGate = booTarget > this.booGate
      ? Math.min(booTarget, this.booGate + booStep)
      : Math.max(booTarget, this.booGate - booStep);
    const speed = bodySpeed(this.body);
    const performanceGait = this.owners.performance ? this.performanceGait : null;
    const inPlaceGait =
      this.mode === "locomotion" &&
      this.body.contact &&
      speed <= GAIT_LAW.speedEpsilonUnitsPerSec &&
      performanceGait !== null &&
      performanceGait.driveGain > 0;
    const performanceStrideUnits =
      GAIT_LAW.strideLenFracOfHeight * GAIT_LAW.bodyHeightUnits * (performanceGait?.driveGain ?? 0);
    const gaitSpeed = inPlaceGait
      ? performanceStrideUnits * (performanceGait?.cadenceHz ?? 0)
      : speed;
    const anticipationDuration = GAIT_ANTICIPATION_DURATION_SECONDS;
    const anticipationActive = this.anticipationAge < anticipationDuration * 2;
    this.anticipationAge = Math.min(anticipationDuration * 2, this.anticipationAge + dt);
    this.anticipationLeft = Math.max(0, this.anticipationLeft - dt);
    const anticipationU = Math.max(
      0,
      Math.min(2, this.anticipationAge / Math.max(1e-9, anticipationDuration)),
    );
    const anticipationShape =
      anticipationU <= 1
        ? anticipationU * anticipationU * (3 - 2 * anticipationU)
        : (() => {
            const v = anticipationU - 1;
            return 1 - v * v * (3 - 2 * v);
          })();
    const anticipationDeg =
      anticipationActive && this.body.contact
        ? -this.anticipationAxisX *
          GAIT_LAW.maxGroundedLeanDeg *
          GAIT_ANTICIPATION_FRACTION *
          anticipationShape
        : 0;
    const k = WORLD_PHYSICS_CONSTANTS.physToLiving;
    const g =
      this.params.gravity ?? WORLD_PHYSICS_CONSTANTS.gravity * this.params.gravityScale;

    // Cycle 1 (gait-expression-phd-memo L3–L8): the gait organ derives its
    // conclusions from the live body — tangential acceleration is the speed
    // derivative, phase integrates travel. Grounded locomotion only; a body
    // in flight is ballistic, not walking.
    // Preserve the standing locomotion/anticipation law: mode + contact owns
    // the grounded carrier even while speed is still zero. In-place reference
    // gait only changes the derived gait speed below; it does not redefine
    // what the kernel considers a grounded locomotion performance.
    const walking = this.mode === "locomotion" && this.body.contact;
    const aT = walking && dt > 0 ? (speed - this.prevSpeed) / dt : 0;
    const headingNow = facingBearingDeg(this.body.vx, this.body.vz);
    const hopMixNow = walking
      ? inPlaceGait
        ? Math.max(
            0,
            Math.min(
              0.35,
              ((performanceGait?.cadenceHz ?? 0) - 1.6) / 1.4,
            ),
          )
        : walkGaitMix(gaitSpeed, headingNow ?? undefined)
      : 0;
    const walkHz = walking ? walkCadenceHz(gaitSpeed, headingNow ?? undefined) : 0;
    // Curve owns the stroll band (strut 200 ↔ hop 520). Above that, the
    // stride-length law stays — the 3200 Froude cruise is not this walk.
    const inWalkBand = gaitSpeed <= 520 * 1.15;
    const hostScrub = Number(
      (globalThis as { __GASPER_SCRUB_PHASE__?: number }).__GASPER_SCRUB_PHASE__,
    );
    if (Number.isFinite(hostScrub)) {
      this.gaitPhase = ((hostScrub % 1) + 1) % 1;
    }
    const hold = Number((globalThis as { __GASPER_SCRUB_HOLD__?: number }).__GASPER_SCRUB_HOLD__);
    const stepDt = hold > 0.5 ? 0 : dt;
    const gait = walking
      ? deriveGait({
          speed: gaitSpeed,
          accelTangent: aT,
          gravity: g,
          phase: this.gaitPhase,
          dt: stepDt,
          tempoMultiplier: (() => {
            const hostTempo = Number(
              (globalThis as { __GASPER_GAIT_TEMPO__?: number }).__GASPER_GAIT_TEMPO__,
            );
            return Number.isFinite(hostTempo)
              ? Math.max(0.75, Math.min(1.25, hostTempo))
              : this.gaitTempoMultiplier;
          })(),
          stepHzOverride: (() => {
            const gnHz = Number((globalThis as { __GASPER_GAIT_HZ__?: number }).__GASPER_GAIT_HZ__);
            if (Number.isFinite(gnHz) && gnHz > 0) return gnHz;
            return performanceGait?.cadenceHz ?? (inWalkBand && walkHz > 0 ? walkHz : undefined);
          })(),
        })
      : { ...GAIT_REST, phase: this.gaitPhase };
    this.gaitPhase = gait.phase;
    // N30 / F-LAW 5 — walking belongs to feet: only the feeted form
    // (wispwalker) expresses the step vocabulary. Every footless body floats
    // (its translation is flight, S3) and every rest-class body rests — the
    // gait observables collapse while the phase stays travel-integrated, so
    // an embodiment change never jumps a stride it no longer expresses (L8).
    const gaitEmbodimentGain = this.booMode ? 0 : embodimentGaitGain(this.embodimentOf());
    const expressed = gaitEmbodimentGain === 1 ? gait : { ...GAIT_REST, phase: gait.phase };
    const compressionTarget =
      walking && gaitEmbodimentGain === 1
        ? performanceGait?.compressionRatio ?? 0
        : 0;
    const compressionAlpha = 1 - Math.exp(
      -dt / Math.max(1e-9, GAIT_EXPRESSION_RAMP_SECONDS),
    );
    this.performanceCompression +=
      (compressionTarget - this.performanceCompression) * compressionAlpha;
    if (Math.abs(this.performanceCompression) < 1e-3) this.performanceCompression = 0;
    // N60 / Refractory gait entry: locomotion mode can remain armed while an
    // owner dwells on a settled target. The visible step expression must
    // still retire during that grounded rest, then re-enter through the same
    // 180ms perceptual ramp on the next leg. Gating on mode alone left the
    // gate fully open and inserted the full vault on the first relaunch.
    const gaitTarget =
      walking &&
      !this.booMode &&
      (gaitSpeed > GAIT_LAW.speedEpsilonUnitsPerSec || anticipationActive) &&
      gaitEmbodimentGain === 1
        ? 1
        : 0;
    const gaitGateStep = dt / Math.max(1e-9, GAIT_EXPRESSION_RAMP_SECONDS);
    this.gaitGate =
      gaitTarget > this.gaitGate
        ? Math.min(gaitTarget, this.gaitGate + gaitGateStep)
        : Math.max(gaitTarget, this.gaitGate - gaitGateStep);
    // Smoothstep gives the visible expression zero slope at both ends of the
    // ramp; the underlying gate remains linear so it reaches exactly 0/1.
    const gaitExpressionGate = this.gaitGate * this.gaitGate * (3 - 2 * this.gaitGate);
    this.prevSpeed = walking ? speed : 0;
    this.gait = expressed;

    const walkingSupport =
      walking &&
      gaitEmbodimentGain === 1 &&
      gaitSpeed > GAIT_LAW.speedEpsilonUnitsPerSec;
    this.support = walkingSupport
      ? stepSupportExchange(this.support, {
          walking: true,
          phase: expressed.phase,
          stepHz: expressed.stepHz,
          bobUnits: expressed.bobUnits,
          swayUnits: expressed.swayUnits,
          bodyX: this.body.x,
          bodyZ: this.body.z,
          vx: this.body.vx,
          vz: this.body.vz,
          dt,
          hopMix: hopMixNow,
          flightFrac: walkFlightFrac(gaitSpeed, headingNow ?? undefined),
        })
      : {
          ...SUPPORT_REST,
          exchangeCount: this.support.exchangeCount,
          plantedWorldX: this.support.plantedWorldX,
          plantedWorldZ: this.support.plantedWorldZ,
        };
    const plantGather = 1 / PHI_LAW.phi;
    const intentNow =
      this.intents.performance ??
      this.intents.life ??
      this.intents.wander ??
      this.intents.internal;
    const distNow = intentNow
      ? Math.hypot(intentNow.x - this.pathX(), intentNow.z - this.pathZ())
      : Number.POSITIVE_INFINITY;
    // Long-leg arrival band: stop writing plant-crouch gather before the
    // last wall plant can lock 1/phi (~0.618 / 0.594). That lock is the puddle.
    // Short legs keep walk volume until walkingSupport falls.
    const inArrivalBand =
      this.isBoundPinned() ||
      (distNow <= ARRIVAL_BLEND_DISTANCE_UNITS &&
        this.legStartDistance > ARRIVAL_BLEND_DISTANCE_UNITS);
    const walkingLive =
      walkingSupport &&
      speed > GAIT_LAW.speedEpsilonUnitsPerSec &&
      !inArrivalBand;
    if (walkingLive) {
      // Record the painted walk gather while it is a step (0.05-0.20), not
      // the plant-crouch pulse (1/phi). Arrival freezes this value.
      if (this.env.gather >= 0.05 && this.env.gather <= 0.20) {
        this.walkPaintedGather = this.env.gather;
      } else if ((this.support.gatherTarget ?? 0) < plantGather * 0.5 && this.env.gather > 1e-3) {
        this.walkPaintedGather = this.env.gather;
      }
      this.supportGatherTarget = this.support.gatherTarget;
      this.arrivalGatherHeld = false;
    } else if (!this.arrivalGatherHeld) {
      // First arrived / arrival-band frame: freeze the painted WALK envelope
      // in 0.05-0.20. Never 0.594 (puddle). Never 0 (home-idle snap / 2x pop).
      const painted = this.env.gather;
      const fromWalk = this.walkPaintedGather;
      const inBand = (g: number) => g >= 0.05 && g <= 0.20;
      const hadWalk = fromWalk > 1e-3 || painted > 1e-3;
      const raw = inBand(painted) ? painted : inBand(fromWalk) ? fromWalk : hadWalk ? 0.12 : 0;
      this.supportGatherTarget = raw === 0 ? 0 : Math.max(0.05, Math.min(0.20, raw));
      this.arrivalGatherHeld = true;
      this.arrivedIdlePhase = 0;
      this.arrivedIdleAge = 0;
    }
    // Arrived: HOLD gather. Freeze the painted walk silhouette.
    // Do not rebuild BASE_CONTOUR. Do not ease toward a deeper crouch.
    // R3 — walk volume: step the silhouette envelope while walkingLive
    // so SupportExchange gatherTarget integrates (and decays) even between thin
    // pulses. Impact still charges on exchange/first-plant. airSpeed=0 and
    // contact=true keep stretch at 0 — grounded walk is floor dialogue, not a hop.
    if (walkingLive) {
      this.arrivedIdleTarget = 0;
      this.arrivedTakeTarget = 0;
      this.arrivedIdlePhase = 0;
      this.arrivedIdleAge = 0;
      this.env = stepPhysicsSilhouetteEnvelope(
        this.env,
        {
          impactSpeed: this.support.impactSpeed,
          airSpeed: 0,
          contact: true,
          gatherTarget: 0,
          gatherAxis: "vertical",
          settleZeta: this.zeta(),
        },
        dt,
      );
    } else if (this.mode === "locomotion" && this.body.contact) {
      const holdIntent = this.intents.life;
      const holding =
        !!holdIntent && holdIntent.cruise > 0 && holdIntent.cruise <= 8 && speed < 40;
      // Arrived / pinned: hold the painted walk gather. Eyes take.
      // Do not write a height idle trough (life11 H 337->280 at t=3 then snap).
      // Do not dump to home idle. TAKE breath keeps the wall alive.
      const arrivedHold =
        !walkingSupport &&
        speed < 40 &&
        (this.owners.wander || this.owners.life || this.owners.internal || holding);
      let rotor = 0;
      if (arrivedHold) {
        this.arrivedIdleAge += dt;
        this.arrivedIdlePhase += dt / 1.4;
        const easeT = Math.min(1, this.arrivedIdleAge / 0.6);
        const ease = easeT * easeT * (3 - 2 * easeT);
        rotor = Math.sin(this.arrivedIdlePhase * 2 * Math.PI) * ease;
      } else {
        this.arrivedIdlePhase = 0;
        this.arrivedIdleAge = 0;
      }
      const breath = arrivedHold ? 0.08 + 0.04 * rotor : 0;
      this.arrivedIdleTarget = 0;
      this.arrivedTakeTarget = arrivedHold ? breath : holding ? 0.08 : 0;
      this.env = stepPhysicsSilhouetteEnvelope(
        this.env,
        {
          impactSpeed: 0,
          airSpeed: 0,
          contact: true,
          gatherTarget: this.supportGatherTarget,
          takeTarget: arrivedHold ? breath : holding ? 0.08 : 0,
          idleTarget: 0,
          gatherAxis: "vertical",
          settleZeta: this.zeta(),
        },
        dt,
      );
    }

    // L6 lean law: a GROUNDED body leans into its acceleration (atan(a/g),
    // screen-projected onto the heading's x-component) and carries no lean at
    // constant speed; an AIRBORNE body keeps the legacy velocity tilt (drag
    // read of a spent flight). The old grounded speed-proportional tilt would
    // peg at the clamp under the similarity-scaled cruise — wrong class.
    // Cycle 10 Y1 (bank-phd-memo) — the centripetal bank: a grounded body in
    // curved travel banks toward the turn center so the resultant of gravity
    // and the horizontal acceleration passes through the support base
    // (tan β = v·ω/g — the Newton-II corollary for uniform circular motion,
    // Baraff–Witkin governed corpus). The screen-x expression is the
    // x-component of the centripetal acceleration: the residual of the total
    // lateral acceleration after the tangential part (L6 keeps the tangential;
    // Y1 completes the resultant). The depth component is honestly invisible
    // to the screen-plane rotate (R1/S0 ⊥-projection idiom). Low-pass at τ_c·φ
    // de-jitters the derivative; clamped at the live Coulomb budget μ·g
    // (friction cone) then at the gait-honest φ·8° cap (Y3).
    const traction = this.traction();
    const muG = traction.mu * traction.gravity;
    // S4: aX is now computed CONTINUOUSLY (walking no longer gates the
    // derivative itself, only its use below) — prevVX stays continuous across
    // flight and contact blips, so the flight-lean read inherits the same
    // spike protection the bank does (the (v−0)/dt entry-spike note below).
    const aX = dt > 0 ? (this.body.vx - this.prevVX) / dt : 0;
    // The tangential part uses a CONTINUOUS speed derivative: the L6 aT
    // inherits the prevSpeed reset idiom, whose entry-tick (speed−0)/dt spike
    // would leak a full-μg lie into the centripetal residual at gait
    // transitions (3.32° one-frame jump, Cycle-10 flight regression). A
    // grounded body's tangential acceleration is Coulomb-bounded anyway.
    const aTCont = dt > 0 ? (speed - this.prevSpeedCont) / dt : 0;
    const aCentX =
      aX -
      Math.max(-muG, Math.min(muG, aTCont)) * (this.body.vx / Math.max(speed, 1));
    const bankAlpha = 1 - Math.exp(-dt / GAIT_LAW.bankSmoothTauSec);
    const bankLive = walking && speed > 1;
    const supportLive = walking && gaitSpeed > 1;
    // S4 F-LAW 2 (flight-physics-phd-memo, owner N31) — JET-LEAN: the bank
    // organ becomes the flight-lean organ. A footless body in flight leans
    // into its horizontal ACCELERATION (the jet), not its velocity — lean is
    // the transient read of thrust; the sustained airflow reads through the
    // wind surface (trail-stretch / lead-compress) below. The lean source is
    // the full screen-x acceleration (no centripetal residual — a buoyant
    // body has no support base to pass a resultant through); the traction
    // budget is the thrust envelope (traction() reports μ = T_max/g for the
    // footless, S3), so atan(T_max/g) ≈ 9.6° sits inside the Y1 clamp 8φ°.
    const flightLean =
      (this.mode === "locomotion" || this.mode === "comet-fly" || this.mode === "retiring") &&
      !walking &&
      this.footless();
    const flightLeanLive = flightLean && speed > 1;
    const leanSource = bankLive
      ? Math.max(-muG, Math.min(muG, aCentX))
      : flightLeanLive
        ? Math.max(-muG, Math.min(muG, aX))
        : 0;
    this.bankAx += (leanSource - this.bankAx) * bankAlpha;
    // The gate is a first-order lag too (same τ): a hard walking-gate would
    // step the expressed bank from 0 to the lag's present value at every
    // flight→walking entry and contact blip (3.32° one-frame jump, Cycle-10
    // flight regression). The expression fades with the dynamics.
    this.bankGate +=
      ((bankLive || flightLeanLive ? 1 : 0) - this.bankGate) * bankAlpha;
    const bankDeg =
      this.bankGate *
      Math.max(
        -GAIT_LAW.bankMaxDeg,
        Math.min(GAIT_LAW.bankMaxDeg, (Math.atan(this.bankAx / g) * 180) / Math.PI),
      );
    // Cycle 12 W2 — the acceleration-derived grounded lean is a visible
    // inertial expression, not a raw derivative switch. Keep the target
    // authored by GaitLaw, but carry it through the existing τ_c·φ window so
    // arrival at cruise and braking do not erase the tilt on one sample.
    const groundedLeanTarget =
      walking && speed > 1 ? expressed.leanDeg * (this.body.vx / speed) : 0;
    this.groundedLeanDeg +=
      (groundedLeanTarget - this.groundedLeanDeg) * bankAlpha;
    // S4 F-LAW 2 — the WIND-RESISTANCE SURFACE read: the airflow answers the
    // body's own speed — dynamic pressure p = (v/v_c)² low-passed at τ_c·φ
    // (the bank idiom — one timing law for the lean and the surface), and the
    // screen-x travel direction lagged by the same law. The total speed IS
    // the airspeed (hover bob and ballistic arcs pay their share honestly).
    // Pure depth travel ⇒ dirX → 0 ⇒ the surface reads honestly invisible in
    // screen x (the S0 ⊥(heading) projection idiom). At rest p = 0 ⇒ the
    // renderer's contour channels collapse ⇒ byte-identical (D-0088 idiom).
    const windPTarget = windPressureForSpeed(speed);
    // Direction is an ORGANIZED-FLOW read: below the arrival speed floor the
    // body is in still air (capture-band jitter would ping-pong the sign
    // ±1 and wander the lag — a direction with no flow is no direction).
    const windDirTarget =
      speed > ARRIVE_SPEED_UNITS ? this.body.vx / speed : 0;
    this.windP += (windPTarget - this.windP) * bankAlpha;
    this.windDirX += (windDirTarget - this.windDirX) * bankAlpha;
    // prevVX / prevSpeedCont are read ABOVE (aX / aTCont) and only updated
    // here: they stay CONTINUOUS across flight and contact blips (unlike
    // prevSpeed) — a (v−0)/dt entry spike would jolt the bank a full cap in
    // one frame (Cycle-10 probe, t≈6.6 s: −10.27° single-sample flick).
    this.prevVX = this.body.vx;
    this.prevSpeedCont = speed;
    // Cycle 11 Z1/Z3 (step-shape-phd-memo) — the contact flatten: the
    // SUPPORT read of the floor dialogue (the squash is the impulse read —
    // no double-count). The screen-x projection follows the S0 idiom: the
    // ⊥(heading) factor (−vz/v) on the signed depth, its magnitude on the
    // patch width — a pure lateral walk plants in depth, so its flatten is
    // honestly invisible in screen x, exactly like the step base. First-order
    // lag at τ_c·φ + smoothed gate (the bank idiom, reusing bankAlpha and
    // bankLive — one liveness law, one timing law): no pop at gait entry, no
    // step at the flight→walking seam; the patch fades with the dynamics.
    const supportProjectionAxis = speed > 1
      ? -this.body.vz / speed
      : performanceGait?.lateralAxis ?? 0;
    const flatTargetSigned = supportLive
      ? expressed.stepFlattenSignedUnits * supportProjectionAxis
      : 0;
    const flatTargetWidth = supportLive
      ? expressed.stepFlattenWidthUnits * Math.abs(supportProjectionAxis)
      : 0;
    const flattenSignCrossing =
      flatTargetSigned !== 0 &&
      this.flattenSigned !== 0 &&
      Math.sign(flatTargetSigned) !== Math.sign(this.flattenSigned);
    const flattenAlpha = flattenSignCrossing
      ? Math.min(1, bankAlpha * FLATTEN_SIGN_CROSSING_ALPHA_MULTIPLIER)
      : bankAlpha;
    const flattenDelta = (flatTargetSigned - this.flattenSigned) * flattenAlpha;
    this.flattenSigned += Math.max(
      -FLATTEN_MAX_FRAME_DELTA_UNITS,
      Math.min(FLATTEN_MAX_FRAME_DELTA_UNITS, flattenDelta),
    );
    this.flattenWidth += (flatTargetWidth - this.flattenWidth) * bankAlpha;
    this.flattenGate += ((supportLive ? 1 : 0) - this.flattenGate) * bankAlpha;
    const stepFlattenUnits =
      this.flattenGate *
      Math.max(
        -GAIT_LAW.flattenMaxUnits,
        Math.min(GAIT_LAW.flattenMaxUnits, this.flattenSigned),
      );
    const stepFlattenWidthUnits =
      this.flattenGate *
      Math.max(0, Math.min(GAIT_LAW.flattenPatchMaxUnits, this.flattenWidth));
    let tilt: number;
    if (walking) {
      // Keep the low-passed lean alive below the gait speed epsilon; the
      // state is already decaying toward neutral, so branching to literal
      // zero here would reintroduce a settle snap.
      tilt = gaitExpressionGate * (this.groundedLeanDeg + bankDeg) + anticipationDeg;
    } else if (flightLean) {
      // S4 F-LAW 2 — flight lean rides the bank channel (the jet read): the
      // silhouette leans into its acceleration, clamped at 8φ°. The sustained
      // cruise airflow is expressed by the wind surface (trail-stretch /
      // lead-compress), never as a lean — so constant velocity fades the lean
      // to zero, and the legacy 20° velocity tilt (an unbounded drag-read
      // heuristic) retires from powered flight to the ballistic modes it was
      // authored for.
      tilt = bankDeg;
    } else {
      tilt = travelTilt(this.body);
    }

    if (walkingSupport) {
      this.body = Object.freeze({
        ...this.body,
        x: this.body.x + this.support.cogX,
        z: this.body.z + this.support.cogZ,
        angle: this.support.angle,
        y: 0,
        vy: 0,
        contact: true,
      });
      this.supportCogX = this.support.cogX;
      this.supportCogZ = this.support.cogZ;
    } else if (this.supportCogX !== 0 || this.supportCogZ !== 0) {
      // Ease residual plant CoG off over the arrival hold. Zeroing
      // supportCogX while body.x still carries last cog makes pathX jump
      // (the wall position pop). Keep pathX constant: peel cog off body.x
      // at the same rate. Do not recut the walking plant path.
      const releaseAlpha = 1 - Math.exp(-dt / ARRIVAL_RELEASE_SECONDS);
      const nextCogX = Math.abs(this.supportCogX) < 0.01 ? 0 : this.supportCogX * (1 - releaseAlpha);
      const nextCogZ = Math.abs(this.supportCogZ) < 0.01 ? 0 : this.supportCogZ * (1 - releaseAlpha);
      this.body = Object.freeze({
        ...this.body,
        x: this.body.x - (this.supportCogX - nextCogX),
        z: this.body.z - (this.supportCogZ - nextCogZ),
      });
      this.supportCogX = nextCogX;
      this.supportCogZ = nextCogZ;
    }

    const physicsPose: WorldPhysicsDriverOutput["pose"] = {
      x: this.body.x,
      y: this.body.y,
      z: this.body.z,
      tilt,
      provenance: "physics-authority",
    };
    this.lastPhysicsPose = physicsPose;
    this.physicsEmissionCount += 1;
    this.forward({
      pose: physicsPose,
      // World +y is up; content space +y is down — flip for the wake warp.
      wakeVX: this.body.vx * k,
      wakeVY: -this.body.vy * k,
      lightSpeed: Math.min(10, speed * k + (this.env.take ?? 0) * 4),
      silhouetteDeltas: withPerformanceVerticalCompression(
        physicsSilhouetteDeltas(this.env, this.params.intensity),
        this.performanceCompression,
      ),
      take: this.env.take ?? 0,
      idle: this.env.idle ?? 0,
      gait: expressed,
      gaitScreen: (() => {
        // Cycle 4 R1 (walk-weight-transfer-phd-memo) — the vault load: the
        // lateral channel is AT EXTREMUM over the support foot at mid-stance
        // (phase 0) and crosses the centerline at double support (phase π) —
        // cos(phase/2). The Cycle-1 sin(phase/2) peaked a quarter stride off,
        // so the sway landed late and the load never reached the silhouette
        // (Inman 1953 machine rules). Amplitude unchanged (L7).
        // Atlas Seat: once the plant locks, leftover sway dies. The COM
        // holds over the plant (the lock) instead of hunting through the
        // cosine. Next hop starts from that lock. Dead freeze is not this —
        // compress still solved; only the hunt is killed.
        const liveSway =
          expressed.swayUnits * Math.cos(expressed.phase / 2) * supportProjectionAxis;
        const lockedSway =
          expressed.swayUnits * (this.support.side || 0) * supportProjectionAxis;
        const seatLock = this.support.seated ? 1 - (this.support.leftoverSway ?? 1) : 0;
        // N310 — screen COM must read at zoom-2 even when −vz/v ≈ 0.
        const screenShift = (this.support.side || 0) * GAIT_LOBE.comShiftMinUnits;
        const swayXUnits = supportLive
          ? liveSway * (1 - seatLock) + lockedSway * seatLock + screenShift
          : 0;
        // Cycle 5 S0 (step-cycle-phd-memo) — the planted base: during single
        // support the support point HOLDS the sway extremum of its half-stride
        // (tanh saturates — a planted foot does not glide); at double support
        // (phase π) it exchanges to the next extremum, one sign flip per step,
        // centered on the contact beat. Same ⊥(heading) projection as R1: a
        // pure lateral walk emits no screen-x step. Sharpness k = 2φ² (S1 —
        // the switch window lands at 18.1 % of the step period, inside the
        // clinical double-support band). Amplitude reuses L7 swayUnits (T2).
        const stepBaseXUnits =
          supportLive
            ? expressed.swayUnits *
              Math.tanh(GAIT_LAW.stepPlacementSharpness * Math.cos(expressed.phase / 2)) *
              supportProjectionAxis
            : 0;
        // Northstar acting law — the first anticipation beat must read as
        // weight transfer, not only as a counter-lean. Before traction has
        // produced a measurable speed, carry a bounded fraction of the
        // effective leg toward the filed screen-x target. This is the
        // perceptual support carrier; the physics body remains exactly at
        // rest, so the kernel never cheats translation to obtain the read.
        // Pure depth intents keep the honest zero because anticipationAxisX is
        // the screen-x component of the target direction.
        const anticipationSupportXUnits =
          walking && gaitEmbodimentGain === 1 && anticipationActive
            ? this.anticipationAxisX *
              GAIT_LEG_UNITS *
              GAIT_ANTICIPATION_FRACTION *
              anticipationShape
            : 0;
        const travelSpeed = Math.hypot(this.body.vx, this.body.vz);
        const travelSign =
          travelSpeed > 1 ? this.body.vx / travelSpeed : Math.sign(this.body.vx);
        const lobe = gaitLobePose({
          phase: expressed.phase,
          planted: this.support.planted === true && walking,
          plantedCompress: this.support.plantedCompress ?? 0,
          travelSign,
        });
        return {
          // L5 — COM rides the vault arc: high at mid-stance (phase 0).
          // Hop flight rides the altitude channel (skip/hop), not body.y and
          // not a Y-scale duck. Vault stays high at mid-stance; flight lifts
          // during exchange. Floor contact of the mass stays y=0.
          // N254: subtract a small planted settle so the whole pearl pays
          // vertically over the loaded lobe.
          bobLiftUnits: gaitExpressionGate * (
            (expressed.bobUnits / 2) * Math.cos(expressed.phase) +
            (this.support.flight ?? 0) * (28 + 34 * hopMixNow) -
            GAIT_LOBE.comBobUnits * (this.support.plantedCompress ?? 0) -
            lobe.comSettleUnits
          ),
          swayXUnits: gaitExpressionGate * swayXUnits,
          // Cycle 4 R2 + N310 — vault roll plus a stranger-visible lean
          // toward the planted support. Negative roll tips onto the load
          // (renderer rotate(−wTilt)). supportSide owns the zoom-2 read;
          // the depth-projected atan term is no longer allowed to vanish.
          rollDeg:
            gaitExpressionGate * (
              (swayXUnits === 0
                ? 0
                : (-Math.atan(swayXUnits / GAIT_LEG_UNITS) * 180) / Math.PI) -
              (this.support.side || 0) * GAIT_LOBE.torsoLeanDeg
            ),
          // Cycle 4 R3 — contact squash passes through from the gait organ
          // (volume-law amplitude derived in GaitLaw); the renderer expresses
          // scaleY 1−c / scaleX 1+c about the floor anchor, fenced ≤ 5 %.
          contactSquash: gaitExpressionGate * expressed.contactSquash,
          // Cycle 5 S0 — the planted support point (world units, screen x).
          stepBaseXUnits:
            gaitExpressionGate * (stepBaseXUnits + anticipationSupportXUnits),
          // Cycle 10 Y1 — the centripetal bank (degrees, signed toward the
          // turn center in screen x). S4 F-LAW 2: the SAME channel carries
          // the footless jet-lean (signed into the horizontal acceleration) —
          // one lean organ, two budgets, like the steering law. Telemetry
          // (dataset.gaitBankDeg); the expression rides the tilt channel above.
          bankDeg: walking ? gaitExpressionGate * bankDeg : bankDeg,
          // Cycle 11 Z1 — the contact flatten (world units): the signed
          // screen-x depth and the patch half-width, lagged + gated per Z3.
          // Telemetry (dataset.gaitFlatten/gaitFlattenW); the expression
          // rides the contour base radius in the renderer (support read).
          stepFlattenUnits: gaitExpressionGate * stepFlattenUnits,
          stepFlattenWidthUnits: gaitExpressionGate * stepFlattenWidthUnits,
          // World-locked plant in screen x. stepBaseXUnits stays the S0 load
          // carrier; this is (plantedWorld − body) so the foot does not ride
          // the root. Zero when no plant is live.
          plantedScreenXUnits: this.support.planted
            ? projectPlantedScreenX(
                this.support.plantedWorldX,
                this.support.plantedWorldZ,
                this.body.x,
                this.body.z,
              )
            : 0,
          plantedCompress: gaitExpressionGate * (this.support.plantedCompress ?? 0),
          incomingCompress: gaitExpressionGate * (this.support.incomingCompress ?? 0),
          hopMix: hopMixNow,
          flight: gaitExpressionGate * (this.support.flight ?? 0),
          seated: this.support.seated === true,
          leftoverSway: this.support.leftoverSway ?? 0,
          supportSide: this.support.planted ? (this.support.side || 0) : 0,
          swingLiftUnits: gaitExpressionGate * lobe.swingLiftUnits,
          swingAdvanceUnits: gaitExpressionGate * lobe.swingAdvanceUnits,
          loadedDropUnits: gaitExpressionGate * lobe.loadedDropUnits,
          swingClearance: gaitExpressionGate * lobe.swingClearance,
        };
      })(),
      // S4 F-LAW 2 — the wind read (see the output type): pressure lagged at
      // τ_c·φ, direction the lagged screen-x travel component. Zero at rest.
      wind: { pressure: this.windP, dirX: this.windDirX },
      // S8 N39 — the travel bearing (see the output type): the radial-facing
      // clock read; null below the rest gate (the facing holds).
      // A ballistic bounce's lateral drift is not a locomotion intent and
      // must not turn the 2.5D face away. Travel-facing belongs to grounded
      // locomotion and powered flight only.
      facingBearingDeg:
        this.mode === "locomotion" || this.mode === "comet-fly"
          ? facingBearingDeg(this.body.vx, this.body.vz)
          : null,
      // S10 (N42) — the Boo perpetual-bob carrier (world units, signed lift);
      // 0 when not in boo mode => byte-identical everywhere else.
      booBobUnits: this.booGate * booBobUnits(this.lastFrameMs / 1000),
    });
  }
}
