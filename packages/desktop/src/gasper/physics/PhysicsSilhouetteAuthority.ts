/**
 * GASPER-SPACE-001 PHASE B — physics silhouette authority.
 *
 * Impact squash, flight stretch and launch gather as bounded absolute deltas
 * on the SAME three fenced channels the D-0088 scene admission owns
 * (overall_width / overall_height / ground_flattening), composed through the
 * existing chain (filterLivingFlushValues → admitSceneSilhouetteValues).
 *
 * The physics fence is deliberately WIDER than the scene fence (a bouncing
 * ball must visibly squash; a scene beat must not) — recorded in D-0090.
 * While armed, physics wins over scene on the shared channels (sequential
 * admit: scene first, physics second).
 *
 * Pure + frozen + deterministic: envelopes step on caller-supplied organism
 * dt; no timers, no randomness. Intensity 0 (rail) collapses every delta to
 * the identity — the authority ships with its own reduced-drama knob and the
 * renderer's motionStrength-0 collapse (D-0089) covers reduced motion.
 */
import { PHI } from "./PhiLaw";

/** The fenced channels this authority may drive (D-0088 vocabulary). */
export const PHYSICS_SILHOUETTE_CHANNELS = [
  "overall_width",
  "overall_height",
  "ground_flattening",
] as const;

/**
 * FormMaster host-scale identity (BINDING_MATRIX: overall_width/height
 * default 1, range 0.35..1.65). Physics deltas ADD onto this. A 0,0,0
 * fallback treats identity as zero size and collapses the painted body
 * to a speck the moment locomotion admits gather/impact.
 */
export const PHYSICS_SILHOUETTE_IDENTITY_BASE = Object.freeze({
  overall_width: 1,
  overall_height: 1,
  ground_flattening: 0,
});

export type PhysicsSilhouetteChannel =
  (typeof PHYSICS_SILHOUETTE_CHANNELS)[number];

/**
 * Per-channel asymmetric bounds (deltas, not absolutes). Wider than
 * SUITE_CHANNEL_BOUNDS by design — physics IS the squash & stretch authority.
 */
export const PHYSICS_CHANNEL_BOUNDS: Readonly<
  Record<PhysicsSilhouetteChannel, Readonly<{ min: number; max: number }>>
> = Object.freeze({
  overall_height: Object.freeze({ min: -0.35, max: 0.18 }),
  overall_width: Object.freeze({ min: -0.16, max: 0.3 }),
  ground_flattening: Object.freeze({ min: 0, max: 0.6 }),
});

/**
 * Largest height compression whose exact area-conserving width compensation
 * remains inside the physics width fence: (1-c) * (1+wMax) = 1.
 */
export const MAX_AREA_CONSERVING_VERTICAL_COMPRESSION =
  1 - 1 / (1 + PHYSICS_CHANNEL_BOUNDS.overall_width.max);

/** Envelope state — the authority's short-term memory. */
export type PhysicsSilhouetteEnvelope = Readonly<{
  /**
   * Impact squash charge (±1), set by floor events. D-0112 (CanonOps R3):
   * the release is an UNDERDAMPED settle at ζ = 1/φ, not a plain exponential —
   * the squash pops back through round into a ~9% follow-through stretch
   * before resting (the documented φ exception to the settle band).
   * Optional velocity term so pre-D-0112 literals still compile.
   */
  impact: number;
  impactV?: number;
  /** Flight stretch (0..1), eases toward airborne speed, zero on contact. */
  stretch: number;
  /** Launch anticipation gather (0..1) — the crouch before the shot. */
  gather: number;
  take?: number;
  /** Arrived-hold height idle, signed -1..1. Height only; not a scale-up. */
  idle?: number;
  verticalGather?: boolean;
}>;

export const ZERO_PHYSICS_ENVELOPE: PhysicsSilhouetteEnvelope = Object.freeze({
  impact: 0,
  impactV: 0,
  stretch: 0,
  gather: 0,
  take: 0,
  idle: 0,
  verticalGather: false,
});

export const PHYSICS_SILHOUETTE_CONSTANTS = Object.freeze({
  /** Floor closing speed that saturates the squash. */
  refImpactSpeed: 1400,
  /** Airborne speed that saturates the stretch. */
  refStretchSpeed: 1200,
  /**
   * Squash settle decay rate law (σ = 1/tau): the underdamped release
   * (D-0112) decays its envelope at e^(−σt) — the pre-D-0112 pop-back tau,
   * now the decay rate of a ζ = 1/φ spring (ω_n = σ/ζ).
   */
  impactDecayTau: 0.16,
  stretchTau: 0.12,
  gatherTau: 0.18,
  // Release is a hold, not a beat. Snapping gather 0.60->0 rebuilt overall_height in one frame (the wall pop).
  gatherReleaseTau: 1 / PHI,
  takeTau: 0.22,
  // TAKE is a slight volume expand (φ⁻³). Height stays small so PREP can
  // scrunch without the two beats cancelling.
  // TAKE is an eye/light beat. Width share is φ⁻³ so launch is not a +38% chest.
  takeExpand: 1 / (PHI * PHI * PHI),
  takeHeightShare: 1 / (PHI * PHI),
  // Arrived-hold body idle: +/-idleHeight of the held gathered height.
  // Applied AFTER the gather fence so both sides paint. At intensity 0.7
  // a +/-sin is ~12-18% of the gathered picture (zoom-2 H~200 -> 24-36px p2p).
  // Period is authored on the driver (1.4s). Not TAKE (eyes only).
  // Not idleRig*(1+physTake/phi^2).
  idleHeight: 0.13,
  idleTau: 0.12,
  /**
   * Walk / PREP height charge. φ⁻⁴ at unit ≈ 14.6%. Width is NOT a
   * cartoon fatten — hop compress lives on the planted support, not
   * overall_width.
   */
  gatherCompression: 1 / (PHI * PHI * PHI * PHI),
  /**
   * N311 — launch PREP scrunch. Walk gather stays on gatherCompression.
   * Comet-gather at unit charge must read as mass-to-center-and-down
   * at zoom-2 (~32% height), inside the −0.35 height fence.
   */
  launchScrunchCompression: 0.32,
  launchScrunchFrom: 0.75,
});

const K = PHYSICS_SILHOUETTE_CONSTANTS;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type PhysicsSilhouetteSample = Readonly<{
  /** Closing speed of a floor impact this tick (0 = none). */
  impactSpeed: number;
  /** Current body speed while airborne. */
  airSpeed: number;
  contact: boolean;
  /** Authored anticipation target (1 during a gather hold). */
  gatherTarget: number;
  takeTarget?: number;
  idleTarget?: number;
  gatherAxis?: "vertical" | "volume";
  /** D-0112: settle damping ratio (absent => the φ law, ζ = 1/φ). */
  settleZeta?: number;
}>;

/** Advance the envelope one organism-clock tick. */
export function stepPhysicsSilhouetteEnvelope(
  env: PhysicsSilhouetteEnvelope,
  sample: PhysicsSilhouetteSample,
  dt: number,
): PhysicsSilhouetteEnvelope {
  if (!Number.isFinite(dt) || dt <= 0) return env;
  let impact = env.impact;
  let impactV = env.impactV ?? 0;
  if (sample.impactSpeed > 0) {
    impact = Math.max(impact, clamp01(sample.impactSpeed / K.refImpactSpeed));
    impactV = 0; // recharged: the settle starts from rest at the new charge
  }
  if (impact !== 0 || impactV !== 0) {
    // D-0112 (CanonOps R3): underdamped settle at ζ = 1/φ — semi-implicit
    // spring, decay rate σ = 1/impactDecayTau, ω_n = σ/ζ. The squash pops
    // back through round into a brief follow-through stretch (~8% of the
    // charge) instead of dying monotonically.
    const zeta =
      typeof sample.settleZeta === "number" &&
      Number.isFinite(sample.settleZeta) &&
      sample.settleZeta > 0.05 &&
      sample.settleZeta < 1
        ? sample.settleZeta
        : 1 / PHI;
    const sigma = 1 / K.impactDecayTau;
    const wn = sigma / zeta;
    impactV += (-wn * wn * impact - 2 * sigma * impactV) * dt;
    impact += impactV * dt;
    if (Math.abs(impact) < 0.001 && Math.abs(impactV) < 0.001) {
      impact = 0;
      impactV = 0;
    }
  }
  const stretchTarget = sample.contact
    ? 0
    : clamp01(sample.airSpeed / K.refStretchSpeed);
  let stretch =
    env.stretch + (stretchTarget - env.stretch) * (1 - Math.exp(-dt / K.stretchTau));
  // The collision seam is authoritative even when restitution has already
  // reported contact=false. Airborne stretch is spent on impact; carrying it
  // into the same tick would cancel the readable contact squash downstream.
  if (sample.impactSpeed > 0) stretch = 0;
  const gatherTau =
    clamp01(sample.gatherTarget) + 1e-6 < env.gather ? K.gatherReleaseTau : K.gatherTau;
  const gather =
    env.gather +
    (clamp01(sample.gatherTarget) - env.gather) * (1 - Math.exp(-dt / gatherTau));
  const takeTarget = clamp01(sample.takeTarget ?? 0);
  const take =
    (env.take ?? 0) +
    (takeTarget - (env.take ?? 0)) * (1 - Math.exp(-dt / K.takeTau));
  const idleTarget = Math.max(-1, Math.min(1, sample.idleTarget ?? 0));
  const idle =
    (env.idle ?? 0) +
    (idleTarget - (env.idle ?? 0)) * (1 - Math.exp(-dt / K.idleTau));
  const verticalGather =
    sample.gatherAxis !== "volume" && (sample.gatherAxis === "vertical" || gather >= 0.001 || env.verticalGather === true);
  return Object.freeze({
    impact,
    impactV,
    stretch: stretch < 0.001 ? 0 : stretch,
    gather: gather < 0.001 ? 0 : gather,
    take: take < 0.001 ? 0 : take,
    idle: Math.abs(idle) < 0.001 ? 0 : idle,
    verticalGather,
  });
}

/**
 * Bounded additive deltas for this envelope. Intensity scales the whole
 * authority; each channel is clamped to PHYSICS_CHANNEL_BOUNDS; sub-visible
 * deltas are omitted so the fence stays closed at rest.
 */
export function physicsSilhouetteDeltas(
  env: PhysicsSilhouetteEnvelope,
  intensity: number,
): Readonly<Record<string, number>> {
  const I = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0;
  if (I <= 0) return {};
  // Impact = impulse squash (height/width pairing already authored). Flatten
  // is the support patch — do not fold gather into flattening (no double-count).
  // Gather = base-anchored volume crouch: exact Sx·Sy=1 about the floor.
  // Vertical plant is a support fact. Intensity is the drama knob for
  // impact/stretch; it must not shrink a committed plant below stranger-
  // visible. Volume gather (jumps without verticalGather) keeps the
  // area-conserving clamp and the intensity scale.
  const gatherCharge = Math.max(0, env.gather);
  const gatherScale = env.verticalGather === true ? 1 : I;
  const gatherCap = MAX_AREA_CONSERVING_VERTICAL_COMPRESSION;
  const launchScrunch =
    env.verticalGather === true && gatherCharge >= K.launchScrunchFrom;
  const gatherC = launchScrunch
    ? Math.max(
        0,
        Math.min(
          -PHYSICS_CHANNEL_BOUNDS.overall_height.min,
          K.launchScrunchCompression * gatherCharge,
        ),
      )
    : Math.max(
        0,
        Math.min(gatherCap, K.gatherCompression * gatherCharge * gatherScale),
      );
  const takeE = K.takeExpand * Math.max(0, env.take ?? 0) * I;
  // TAKE volume is mostly width. During vertical PREP, height is the spring
  // (gather wins); take only keeps a φ⁻² share so the beats overlap without
  // cancelling into a net-zero pop.
  const takeH = takeE * (env.verticalGather === true ? K.takeHeightShare : 1);
  // Height-only idle is painter-owned (setPhysicsIdle * idleHeight).
  // Adding it here AND in the painter is the 2x pop. Envelope.idle still steps.
  // No whole-body fatten. Hop compress is per-support, not overall_width.
  let h = -0.32 * env.impact * I + 0.16 * env.stretch * I - gatherC + takeH;
  let w =
    0.26 * env.impact * I -
    0.12 * env.stretch * I +
    takeE -
    (launchScrunch ? 0.06 * gatherCharge : 0);
  let f = 0.55 * env.impact * I;
  const bound = (v: number, ch: PhysicsSilhouetteChannel) => {
    const b = PHYSICS_CHANNEL_BOUNDS[ch];
    const c = Math.max(b.min, Math.min(b.max, v));
    return Math.abs(c) < 1e-4 ? 0 : c;
  };
  h = bound(h, "overall_height");
  w = bound(w, "overall_width");
  f = bound(f, "ground_flattening");
  // Hold breath is setPhysicsIdle on the painter, not this delta.
  const out: Record<string, number> = {};
  if (h !== 0) out.overall_height = h;
  if (w !== 0) out.overall_width = w;
  if (f !== 0) out.ground_flattening = f;
  return out;
}

/**
 * Add a bounded performance-owned vertical compression to the existing
 * physics packet. The corresponding width delta is derived from exact 2D
 * area conservation; source data never authors scale or contour values.
 */
export function withPerformanceVerticalCompression(
  deltas: Readonly<Record<string, number>>,
  compressionInput: number,
): Readonly<Record<string, number>> {
  const compression = Number.isFinite(compressionInput)
    ? Math.max(0, Math.min(MAX_AREA_CONSERVING_VERTICAL_COMPRESSION, compressionInput))
    : 0;
  if (compression < 1e-4) return deltas;

  const bounded = (
    value: number,
    channel: PhysicsSilhouetteChannel,
  ) => Math.max(
    PHYSICS_CHANNEL_BOUNDS[channel].min,
    Math.min(PHYSICS_CHANNEL_BOUNDS[channel].max, value),
  );
  // R3 — compose under the volume fence. Adding two independently-conserving
  // pairs (walk gather + performance crouch) is not Sx·Sy=1; the composed
  // height is the authority, width is its exact area complement, capped so
  // the pair stays inside PHYSICS_CHANNEL_BOUNDS.
  const composedHeight = bounded((deltas.overall_height ?? 0) - compression, "overall_height");
  const heightForArea = Math.max(composedHeight, -MAX_AREA_CONSERVING_VERTICAL_COMPRESSION);
  const width = bounded(1 / (1 + heightForArea) - 1, "overall_width");
  return {
    ...deltas,
    overall_height: heightForArea,
    overall_width: width,
  };
}

/**
 * Absolute values (living base + bounded physics delta) for the admission
 * fence — mirrors sceneSilhouetteAdmission's shape. Channels without a
 * finite base are skipped (the fence admits nothing for them).
 */
export function physicsSilhouetteAdmission(
  baseValues: Readonly<Record<string, number>>,
  env: PhysicsSilhouetteEnvelope,
  intensity: number,
): Readonly<Record<string, number>> {
  // Base-anchored: living base + bounded physics delta. Gather crouch is
  // height-down / width-up about the floor; the renderer re-plants at y=0.
  const deltas = physicsSilhouetteDeltas(env, intensity);
  const out: Record<string, number> = {};
  for (const ch of PHYSICS_SILHOUETTE_CHANNELS) {
    const d = deltas[ch];
    if (d === undefined) continue;
    const base = baseValues[ch];
    if (typeof base !== "number" || !Number.isFinite(base)) continue;
    out[ch] = base + d;
  }
  return out;
}

/**
 * Delta-based admission for the live rig flush: the physics driver forwards
 * bounded deltas (physicsSilhouetteDeltas) and the rig owns the living base
 * values, so composition happens here at admit time. Same skip rules as
 * physicsSilhouetteAdmission — no base or non-finite delta admits nothing.
 */
export function admitPhysicsSilhouetteDeltas(
  baseValues: Readonly<Record<string, number>>,
  deltas: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const ch of PHYSICS_SILHOUETTE_CHANNELS) {
    const d = deltas[ch];
    if (typeof d !== "number" || !Number.isFinite(d)) continue;
    const base = baseValues[ch];
    if (typeof base !== "number" || !Number.isFinite(base)) continue;
    out[ch] = base + d;
  }
  return out;
}

/**
 * Composition law (D-0090): while armed, physics wins per channel over the
 * scene admission; scene-only channels (none today beyond the shared three)
 * pass through. Empty physics record = scene untouched.
 */
export function composeSilhouetteAdmissions(
  scene: Readonly<Record<string, number>> | undefined,
  physics: Readonly<Record<string, number>> | undefined,
): Readonly<Record<string, number>> | undefined {
  if (!physics || Object.keys(physics).length === 0) return scene;
  return { ...scene, ...physics };
}
