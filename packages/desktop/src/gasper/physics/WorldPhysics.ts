/**
 * GASPER-SPACE-001 PHASE B — the physics core of the 2.5D world stage.
 *
 * A rigid world-body integrator in world units (see space/WorldSpace.ts):
 * x lateral (±960), y altitude (floor y=0, up positive). Semi-implicit Euler
 * with external accelerations (gravity + authored thrust), floor collision
 * with restitution and impact events, wall bounce at the desktop edges, and
 * contact friction so a spent body rolls to rest.
 *
 * Doctrine (GASPER-SPACE-001): pure + frozen + deterministic — no RAF, no
 * timers, no randomness; the caller supplies dt from the organism clock.
 * Reduced-motion collapse lives at the renderer (motionStrength 0 eases the
 * world pose home, D-0089) — the integrator itself is a plain math authority
 * whose output is only ever forwarded under `physics-authority` provenance.
 */

/** Rigid body state in world units. y = altitude above the floor (≥ 0). */
export type WorldBodyState = Readonly<{
  x: number;
  y: number;
  /**
   * D-0112: depth is a physical citizen (2.5D mastery) — z integrates under
   * the same law as x, bounded by the frustum fence the field reports.
   * Pre-D-0112 bodies carry z = 0, vz = 0 (home plane; behavior unchanged).
   */
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Body tumble, degrees; decays toward level flight. */
  angle: number;
  angVel: number;
  /** Resting on the floor (vy = 0, y = 0). */
  contact: boolean;
}>;

/** Collision report — the silhouette authority keys impact squash off these. */
export type ImpactEvent = Readonly<{
  kind: "floor" | "wall" | "ceiling";
  x: number;
  y: number;
  /** Closing speed at contact (world units/s, always ≥ 0). */
  speed: number;
}>;

/** Rail-tunable parameters (the "World & Physics" group), all clamped. */
export type WorldPhysicsParams = Readonly<{
  /** Gravity multiplier (1 = authored desktop gravity). */
  gravityScale: number;
  /** Floor bounce energy retention (0 = dead drop, 0.9 = superball). */
  restitution: number;
  /** Launch impulse multiplier. */
  launchPower: number;
  /** Silhouette drama gain (squash/stretch/gather amplitude). */
  intensity: number;
  /**
   * D-0112 field-driven overrides (the environment owns these — PhiLaw /
   * PhysicsField). Absent => the authored Phase-B constants stay the law,
   * byte-identical to pre-D-0112 behavior.
   */
  /** Absolute gravity (units/s²); supersedes gravity × gravityScale. */
  gravity?: number;
  /** Speed cap (units/s). Absent => the authored maxSpeed. */
  maxSpeed?: number;
  /** Sub-bounce settle speed (units/s). Absent => the authored restSpeed. */
  restSpeed?: number;
  /** Horizontal retention per floor bounce. Absent => authored 0.94. */
  bounceFriction?: number;
  /** Coulomb μ for contact sliding. Absent => legacy exponential roll-out. */
  frictionMu?: number;
}>;

/**
 * External accelerations applied this step (world units/s²).
 *
 * D-0112 traction law: `ax`/`az` are FLOOR-PLANE STEERING — traction. They
 * apply only while in contact (you cannot push off a floor you are not
 * touching); airborne they are silently zero. `ay` stays a free authored
 * thrust (launches, vertical forces) and applies in any state.
 */
export type WorldPhysicsInput = Readonly<{
  ax?: number;
  ay?: number;
  /** Depth-axis steering — same traction law as `ax`. */
  az?: number;
  /**
   * Cycle 6 walking mark (cruise-attainment-phd-memo fold-back): the caller
   * asserts an ACTIVE locomotion intent — the body is WALKING even when the
   * commanded force is exactly zero (constant-speed cruise). Static friction
   * is the drive, not a loss; kinetic skid applies only to unsteered (spent)
   * bodies. Absent ⇒ spent — byte-identical Coulomb slide, D-0112.
   */
  steered?: boolean;
  /**
   * F-LAW 1/3 (S3 flight organ, flight-physics-phd-memo): the FLIGHT mark —
   * the body is buoyant this step. `ax`/`az` become THRUST (they apply in
   * any state — a jet pushes on air, not on a floor it is not touching);
   * weight is cancelled by buoyancy and the vertical channel is owned by the
   * hover PD servo (`hoverY`, `hoverZeta`, `hoverOmega`); horizontal motion
   * pays the air's toll (`dragC1` linear, `dragC2` quadratic). Absent ⇒
   * the grounded law, byte-identical.
   */
  flight?: boolean;
  /** F-LAW 3 — hover servo target altitude (world units above the floor). */
  hoverY?: number;
  /** F-LAW 4 — hover servo damping ratio ζ (1/φ: one ≈8.4 % overshoot). */
  hoverZeta?: number;
  /** F-LAW 3 — hover servo natural frequency ω (rad/s). */
  hoverOmega?: number;
  /** F-LAW 1 — linear drag rate c1 (1/s) on horizontal motion. */
  dragC1?: number;
  /** F-LAW 1 — quadratic drag coefficient c2 (1/u) on horizontal motion. */
  dragC2?: number;
}>;

export const WORLD_PHYSICS_CONSTANTS = Object.freeze({
  /** Authored desktop gravity at scale 1 — a 1080-unit fall takes ~0.9s. */
  gravity: 2600,
  gravityScaleMin: 0.25,
  gravityScaleMax: 2,
  restitutionMin: 0,
  restitutionMax: 0.9,
  launchPowerMin: 0.25,
  launchPowerMax: 2,
  intensityMin: 0,
  intensityMax: 1,
  /** Post-bounce vertical speed below this → contact instead of micro-bounce. */
  restSpeed: 40,
  wallRestitution: 0.5,
  /** Horizontal energy kept per floor bounce. */
  bounceFriction: 0.94,
  /** Rolling friction rate (1/s) while in contact. */
  contactFrictionRate: 2.2,
  /** Tumble decay rate (1/s). */
  angVelDecayRate: 1.4,
  maxSpeed: 4200,
  /** World speed → living-speed units (wake warp / MOTION_LIGHT scale). */
  physToLiving: 1 / 160,
  /** Travel tilt: degrees per world unit/s of vx, clamped at maxTravelTilt. */
  tiltPerSpeed: 0.012,
  maxTravelTilt: 20,
  /** Integrator dt clamp (seconds) — organism-clock deltas only. */
  maxDt: 0.05,
});

export const DEFAULT_WORLD_PHYSICS_PARAMS: WorldPhysicsParams = Object.freeze({
  gravityScale: 1,
  restitution: 0.62,
  launchPower: 1,
  intensity: 0.7,
});

const C = WORLD_PHYSICS_CONSTANTS;

const num = (v: unknown, fb: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fb;

/** Positive-finite passthrough for field-driven overrides (fail-closed). */
const opt = (v: number | undefined, lo: number, hi: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : undefined;

/** Fail-safe parameter clamp — non-finite fields fall back to authored defaults. */
export function clampWorldPhysicsParams(
  p: Partial<WorldPhysicsParams> | undefined,
): WorldPhysicsParams {
  const q = p ?? {};
  return Object.freeze({
    gravityScale: Math.max(
      C.gravityScaleMin,
      Math.min(C.gravityScaleMax, num(q.gravityScale, DEFAULT_WORLD_PHYSICS_PARAMS.gravityScale)),
    ),
    restitution: Math.max(
      C.restitutionMin,
      Math.min(C.restitutionMax, num(q.restitution, DEFAULT_WORLD_PHYSICS_PARAMS.restitution)),
    ),
    launchPower: Math.max(
      C.launchPowerMin,
      Math.min(C.launchPowerMax, num(q.launchPower, DEFAULT_WORLD_PHYSICS_PARAMS.launchPower)),
    ),
    intensity: Math.max(
      C.intensityMin,
      Math.min(C.intensityMax, num(q.intensity, DEFAULT_WORLD_PHYSICS_PARAMS.intensity)),
    ),
    gravity: opt(q.gravity, 1, 1e7),
    maxSpeed: opt(q.maxSpeed, 1, 1e6),
    restSpeed: opt(q.restSpeed, 0, 1e5),
    bounceFriction: opt(q.bounceFriction, 0, 1),
    frictionMu: opt(q.frictionMu, 0, 2),
  });
}

/** A body at rest on the floor (home x unless authored). */
export function createWorldBody(x = 0): WorldBodyState {
  return Object.freeze({
    x: Math.max(-960, Math.min(960, num(x, 0))),
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    angle: 0,
    angVel: 0,
    contact: true,
  });
}

/** Instantaneous velocity change (world units/s) — launches and shots. */
export function applyImpulse(
  state: WorldBodyState,
  ix: number,
  iy: number,
): WorldBodyState {
  if (!Number.isFinite(ix) || !Number.isFinite(iy)) return state;
  return Object.freeze({
    ...state,
    vx: state.vx + ix,
    vy: state.vy + iy,
    contact: false,
  });
}

/** Grounded push-off — floor-plane Δv that keeps contact and y = 0. Never hops. */
export function applyGroundedImpulse(
  state: WorldBodyState,
  ix: number,
  iz: number,
): WorldBodyState {
  if (!Number.isFinite(ix) || !Number.isFinite(iz)) return state;
  if (!state.contact) return state;
  return Object.freeze({
    ...state,
    vx: state.vx + ix,
    vz: state.vz + iz,
    y: 0,
    vy: 0,
    contact: true,
  });
}

/** D-0112: full 3D speed — depth travel is motion too (wake/light read it). */
export function bodySpeed(state: WorldBodyState): number {
  return Math.hypot(state.vx, state.vy, state.vz);
}

/** Spent: resting on the floor with no meaningful tangential drift. */
export function bodyIsSettled(state: WorldBodyState): boolean {
  return (
    state.contact && state.y === 0 &&
    Math.abs(state.vx) < 2 && Math.abs(state.vz) < 2
  );
}

/** Travel tilt for the world pose — the body leans into its velocity. */
export function travelTilt(state: WorldBodyState): number {
  return Math.max(
    -C.maxTravelTilt,
    Math.min(C.maxTravelTilt, state.vx * C.tiltPerSpeed),
  );
}

export type StepWorldBodyResult = Readonly<{
  state: WorldBodyState;
  events: readonly ImpactEvent[];
}>;

/**
 * Depth-aware wall bounds (D-0099 Doctrine 2 Layer 1): the frustum widens
 * with depth, so the wall the body hits is a function of the depth it flies
 * at. The driver supplies `worldBoundsAt(z).xHalf` from space/WorldSpace —
 * the integrator stays a pure math authority and the bounds law keeps one
 * home. Absent => the home-plane half-width.
 *
 * D-0112: the depth fence (zMin/zMax) bounds z itself — the environment
 * field reports them; absent => z is free (legacy home-plane bodies).
 */
export type WorldWallBounds = Readonly<{
  /** Symmetric fallback for callers that do not need camera-pan asymmetry. */
  xHalf?: number;
  /** Production-frame lateral bounds, when the envelope is asymmetric. */
  xMin?: number;
  xMax?: number;
  /** Production-frame altitude ceiling. */
  yMax?: number;
  zMin?: number;
  zMax?: number;
}>;

/**
 * One semi-implicit Euler step: velocities integrate forces first, positions
 * integrate the new velocities (symplectic — bounce energy behaves honestly).
 * dt is clamped to [0, maxDt]; non-finite dt returns the state untouched.
 */
export function stepWorldBody(
  state: WorldBodyState,
  input: WorldPhysicsInput,
  params: WorldPhysicsParams,
  dt: number,
  bounds: WorldWallBounds = {},
): StepWorldBodyResult {
  if (!Number.isFinite(dt) || dt <= 0) {
    return { state, events: [] };
  }
  const h = Math.min(C.maxDt, dt);
  const p = clampWorldPhysicsParams(params);
  // D-0112: the environment field owns gravity / caps / friction when it
  // reports them; absent => the authored Phase-B constants (unchanged).
  const g = typeof p.gravity === "number" ? p.gravity : C.gravity * p.gravityScale;
  const vMax = typeof p.maxSpeed === "number" ? p.maxSpeed : C.maxSpeed;
  const vRest = typeof p.restSpeed === "number" ? p.restSpeed : C.restSpeed;
  const bounceKeep = typeof p.bounceFriction === "number" ? p.bounceFriction : C.bounceFriction;
  const xWall =
    typeof bounds.xHalf === "number" && Number.isFinite(bounds.xHalf) && bounds.xHalf > 0
      ? bounds.xHalf
      : 960;
  const requestedXMin =
    typeof bounds.xMin === "number" && Number.isFinite(bounds.xMin)
      ? bounds.xMin
      : -xWall;
  const requestedXMax =
    typeof bounds.xMax === "number" && Number.isFinite(bounds.xMax)
      ? bounds.xMax
      : xWall;
  const xMin = requestedXMin < requestedXMax ? requestedXMin : -xWall;
  const xMax = requestedXMin < requestedXMax ? requestedXMax : xWall;
  const yCeiling =
    typeof bounds.yMax === "number" && Number.isFinite(bounds.yMax) && bounds.yMax > 0
      ? bounds.yMax
      : null;
  const hasZFence =
    typeof bounds.zMin === "number" && Number.isFinite(bounds.zMin) &&
    typeof bounds.zMax === "number" && Number.isFinite(bounds.zMax) &&
    bounds.zMax > bounds.zMin;
  const events: ImpactEvent[] = [];

  // 1 — forces → velocities (semi-implicit: v first).
  // D-0112 traction law: floor-plane steering needs contact — unless the
  // body is BUOYANT: F-LAW 1 — a flight body's ax/az is thrust, and a jet
  // pushes on air, so it applies in any state.
  const flight = input.flight === true;
  const axIn = num(input.ax, 0);
  const azIn = num(input.az, 0);
  const traction = flight || state.contact ? 1 : 0;
  let vx = state.vx + axIn * traction * h;
  // F-LAW 3 — buoyancy cancels weight: a flight body's vertical channel is
  // the hover PD servo a_y = ω²(h−y) − 2ζω·v_y (ζ = 1/φ — ONE deliberate
  // overshoot, F-LAW 4); a grounded body keeps the full field gravity.
  let vy: number;
  if (flight) {
    const hw = Math.max(0, num(input.hoverOmega, 0));
    const servo =
      hw * hw * (num(input.hoverY, 0) - state.y) -
      2 * Math.max(0, num(input.hoverZeta, 1)) * hw * state.vy;
    vy = state.vy + (num(input.ay, 0) + servo) * h;
  } else {
    vy = state.vy + (num(input.ay, 0) - g) * h;
  }
  let vz = state.vz + azIn * traction * h;
  // F-LAW 1 — the air's toll: a flight body pays linear + quadratic drag
  // against its horizontal motion (the jet regime). Saturated at the body's
  // own speed — drag can only spend what the motion carries, never reverse it.
  if (flight) {
    const c1 = Math.max(0, num(input.dragC1, 0));
    const c2 = Math.max(0, num(input.dragC2, 0));
    const vTan = Math.hypot(vx, vz);
    if (vTan > 0 && (c1 > 0 || c2 > 0)) {
      const dv = Math.min(vTan, (c1 * vTan + c2 * vTan * vTan) * h);
      const keep = (vTan - dv) / vTan;
      vx *= keep;
      vz *= keep;
    }
  }
  const sp = Math.hypot(vx, vy, vz);
  if (sp > vMax) {
    const k = vMax / sp;
    vx *= k;
    vy *= k;
    vz *= k;
  }

  // 2 — velocities → positions.
  let x = state.x + vx * h;
  let y = state.y + vy * h;
  let z = state.z + vz * h;
  let angle = state.angle + state.angVel * h;
  const angVel = state.angVel * Math.exp(-h * C.angVelDecayRate);
  let contact = false;

  // 3 — floor: collide, report, reflect with restitution, settle.
  if (y <= 0) {
    y = 0;
    if (vy < 0) {
      const speed = -vy;
      if (speed < vRest) {
        // Not an impact — gravity settling onto the floor below the
        // sub-bounce visibility floor. No event, no tangential loss: a
        // resting contact is not a bounce (CanonOps audit 2026-08-04 —
        // pre-fix, every resting step leaked bounceKeep into the slide).
        vy = 0;
        contact = true;
      } else {
        events.push({ kind: "floor", x, y: 0, speed });
        vy = speed * p.restitution;
        vx *= bounceKeep;
        vz *= bounceKeep;
        if (vy < vRest) {
          vy = 0;
          contact = true;
        }
      }
    } else if (state.contact && vy === 0) {
      contact = true;
    }
    if (contact) {
      // D-0112 gait law: a steered body is WALKING — static friction is its
      // drive, so kinetic skid friction applies only to an unsteered (spent)
      // body. Without steering input this is byte-identical to pre-D-0112.
      // Cycle 6 fold-back: walking keys off steering PRESENCE (the steered
      // mark), not nonzero force — a body at exact cruise commands zero
      // tangential force but is still walking; reading it as spent skid-bled
      // the cruise one capture band (Δ₁ = μg·KERNEL_H) per silent tick.
      const walking = traction > 0 && (input.steered === true || axIn !== 0 || azIn !== 0);
      if (!walking) {
        if (typeof p.frictionMu === "number") {
          // D-0112: Coulomb sliding — deceleration μ·g ALONG the tangential
          // velocity direction (stopping distance v²/(2μg) on any heading).
          // CanonOps audit 2026-08-04: per-axis shrink over-decelerated
          // diagonal sliding by up to √2× — the shrink is one vector operation.
          const dv = p.frictionMu * g * h;
          const tangentSpeed = Math.hypot(vx, vz);
          if (tangentSpeed <= dv) {
            vx = 0;
            vz = 0;
          } else if (tangentSpeed > 0) {
            const keep = (tangentSpeed - dv) / tangentSpeed;
            vx *= keep;
            vz *= keep;
          }
        } else {
          vx *= Math.exp(-h * C.contactFrictionRate);
          if (Math.abs(vx) < 2) vx = 0;
        }
      }
    }
  }

  // Production composition can be narrower than the conceptual desktop
  // ceiling. Feed that same ceiling into the integrator so the physics body
  // never advances beyond a bound the visible rig will later rewrite.
  if (yCeiling !== null && y > yCeiling) {
    y = yCeiling;
    if (vy > 0) {
      events.push({ kind: "ceiling", x, y, speed: vy });
      vy = -vy * C.wallRestitution;
    }
  }

  // 4 — frustum edges: walls bounce at half energy (width = the frustum at
  // the body's depth, supplied by the driver from the WorldSpace bounds law).
  if (x < xMin) {
    x = xMin;
    if (vx < 0) {
      events.push({ kind: "wall", x, y, speed: -vx });
      vx = -vx * C.wallRestitution;
    }
  } else if (x > xMax) {
    x = xMax;
    if (vx > 0) {
      events.push({ kind: "wall", x, y, speed: vx });
      vx = -vx * C.wallRestitution;
    }
  }

  // 5 — D-0112: the depth fence — z is bounded by the environment field.
  if (hasZFence) {
    if (z < (bounds.zMin as number)) {
      z = bounds.zMin as number;
      if (vz < 0) vz = -vz * C.wallRestitution;
    } else if (z > (bounds.zMax as number)) {
      z = bounds.zMax as number;
      if (vz > 0) vz = -vz * C.wallRestitution;
    }
  }

  return {
    state: Object.freeze({
      x, y, z, vx, vy, vz,
      angle,
      angVel: Math.abs(angVel) < 0.01 ? 0 : angVel,
      contact,
    }),
    events,
  };
}
