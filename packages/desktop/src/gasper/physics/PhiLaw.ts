/**
 * GASPER-PHYSICS-001 · D-0112 — the φ-law: every physics constant derived
 * from the golden ratio (owner order 2026-08-04: "USE THE GOLDEN RATIO",
 * applied through synthesis of physics and system design).
 *
 * The single source for the physical constants of Gasper's body. Nothing in
 * the codebase may author a competing value — the environment FIELD may
 * override (PhysicsField.ts, owner law N5: the environment controls
 * environmental physics), but φ is the default law everywhere.
 *
 * SCALE LAW: Gasper's canonical height h_G = 10φ cm = 16.180 cm — a
 * desk-companion body. px-per-meter is DERIVED per environment from his
 * rendered home height; his physical size is invariant (a bigger screen is a
 * bigger room, not a bigger Gasper — the desktop-roaming semantics).
 *
 * TOY-SCALE SNAPPINESS: under real gravity a 16 cm being has fast dynamics
 * BY LAW (own-height fall ≈ 0.18 s). The pre-φ authored gravity made the
 * same fall take ~0.97 s — that was the float (owner complaint, diagnosed).
 *
 * LIFTOFF LAW (owner N3): an impulse against the ground MECHANICALLY
 * REQUIRES the loading stroke — mass collects center-and-down because no
 * other solution exists; anticipation is a consequence of law, not style.
 */

export const PHI = (1 + Math.sqrt(5)) / 2;

export const PHI_LAW = Object.freeze({
  phi: PHI,
  /** Canonical height: 10φ cm — the desk-companion body (meters). */
  canonicalHeightM: (10 * PHI) / 100,
  /** Real gravity (m/s²) — the environment's constant, expressed per field. */
  earthGravityMs2: 9.81,
  /** Restitution e = 1/φ — bounce heights fall in the golden series h·φ⁻²ⁿ. */
  restitution: 1 / PHI,
  /** Coulomb friction μ = 1/φ². */
  frictionMu: 1 / (PHI * PHI),
  /** Settle damping ratio ζ = 1/φ — underdamped, deliberate, alive. */
  settleZeta: 1 / PHI,
  /** Leg peak force in bodyweights (φ³ ≈ 4.236) — the strength ceiling. */
  peakForceBodyweights: PHI * PHI * PHI,
  /**
   * Hop apex ladder, fractions of own height: {φ⁻³, φ⁻², φ⁻¹} —
   * {0.236, 0.382, 0.618}. Small / medium / big.
   */
  apexLadder: Object.freeze([1 / (PHI * PHI * PHI), 1 / (PHI * PHI), 1 / PHI]),
  /** Canonical loading-stroke rhythm (s) = φ⁻² ≈ 0.382. */
  loadRhythmSeconds: 1 / (PHI * PHI),
  /** Deliberation base (s) = φ⁻² — decision rhythm on the φ-ladder. */
  deliberationBaseSeconds: 1 / (PHI * PHI),
  /** Sub-bounce visibility floor: bounces below φ⁻⁶·h_G read as contact. */
  restBounceFraction: 1 / Math.pow(PHI, 6),
  /** Integrator fixed step (s) — 240 Hz, organism clock supplies multiples. */
  kernelStepSeconds: 1 / 240,
});

/**
 * Environment scale mapping: his rendered home height (px) → px per meter.
 * The body is invariant; the environment decides the mapping.
 */
export function pxPerMeter(homeHeightPx: number): number {
  if (!Number.isFinite(homeHeightPx) || homeHeightPx <= 0) return 0;
  return homeHeightPx / PHI_LAW.canonicalHeightM;
}

/** Gravity in px/s² for an environment where he renders homeHeightPx tall. */
export function gravityPxPerS2(homeHeightPx: number): number {
  return PHI_LAW.earthGravityMs2 * pxPerMeter(homeHeightPx);
}

/**
 * Launch speed for a target apex (v₀ = √(2·g·h)) — the only lawful way to
 * choose how high he goes. Same units in, same units out.
 */
export function launchSpeedForApex(gravity: number, apexHeight: number): number {
  if (!Number.isFinite(gravity) || gravity <= 0) return 0;
  if (!Number.isFinite(apexHeight) || apexHeight <= 0) return 0;
  return Math.sqrt(2 * gravity * apexHeight);
}

/** Apex reached by a launch speed under gravity (the round-trip law). */
export function apexForLaunchSpeed(gravity: number, v0: number): number {
  if (!Number.isFinite(gravity) || gravity <= 0) return 0;
  if (!Number.isFinite(v0)) return 0;
  return (v0 * v0) / (2 * gravity);
}

/**
 * The loading stroke (owner N3). To leave the ground at v₀ within the leg's
 * peak force φ³·mg, the center of mass MUST first dip and collect:
 *
 *   δ = v₀² / (2·(φ³−1)·g)        (work-energy at peak force)
 *   t_min = v₀ / ((φ³−1)·g)       (impulse-momentum at peak force)
 *
 * The performer may take LONGER than t_min (load rhythm φ⁻² s) at reduced
 * average force; δ then follows the stroke kinematics (½·v₀·t). Both forms
 * are exposed — the sequencer picks, the law bounds.
 */
export function minLoadingStroke(gravity: number, v0: number): Readonly<{ depth: number; seconds: number }> {
  if (!Number.isFinite(gravity) || gravity <= 0 || !Number.isFinite(v0) || v0 <= 0) {
    return Object.freeze({ depth: 0, seconds: 0 });
  }
  const netAccel = (PHI_LAW.peakForceBodyweights - 1) * gravity;
  return Object.freeze({
    depth: (v0 * v0) / (2 * netAccel),
    seconds: v0 / netAccel,
  });
}

/**
 * Feasibility gate: a launch performed over `loadSeconds` needs average leg
 * force (v₀/t + g)/g bodyweights. Possible iff that stays under the φ³
 * ceiling. The law self-limits: no intent can ask for a motion the body
 * cannot physically produce.
 */
export function launchFeasible(gravity: number, v0: number, loadSeconds: number): boolean {
  if (!Number.isFinite(gravity) || gravity <= 0) return false;
  if (!Number.isFinite(v0) || v0 < 0) return false;
  if (!Number.isFinite(loadSeconds) || loadSeconds <= 0) return v0 === 0;
  const avgBodyweights = (v0 / loadSeconds + gravity) / gravity;
  return avgBodyweights <= PHI_LAW.peakForceBodyweights;
}

/**
 * The golden bounce series: drop height h₀ lands bounce n at h₀·(e²)ⁿ =
 * h₀·φ⁻²ⁿ. Bounces below the φ⁻⁶ visibility floor read as contact.
 */
export function bounceHeight(gravity: number, dropHeight: number, bounceIndex: number): number {
  if (!Number.isFinite(dropHeight) || dropHeight <= 0) return 0;
  const e2 = PHI_LAW.restitution * PHI_LAW.restitution;
  return dropHeight * Math.pow(e2, bounceIndex);
}

/** Count of visible bounces before the φ⁻⁶ floor swallows them. */
export function visibleBounceCount(dropHeight: number, homeHeight: number): number {
  if (!Number.isFinite(dropHeight) || dropHeight <= 0) return 0;
  if (!Number.isFinite(homeHeight) || homeHeight <= 0) return 0;
  const floor = PHI_LAW.restBounceFraction * homeHeight;
  let n = 0;
  const e2 = PHI_LAW.restitution * PHI_LAW.restitution;
  let h = dropHeight * e2;
  while (h >= floor && n < 64) {
    n += 1;
    h *= e2;
  }
  return n;
}
