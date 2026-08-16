/**
 * Dynamic state/route energy grammar + temporal envelopes.
 *
 * Pure policy — no DOM/MCP/GSAP tick ownership. GSAP/native remains frame authority;
 * this module resolves deterministic energy targets, attack/sustain/release envelopes,
 * and anti-collapse floors so ordinary expression never uses whole-head squeeze,
 * zero-scale disappearance, or hard topology swaps as motion vehicles.
 *
 * Closes R3-ENERGY-FLAT (span=0 / fixed 0.52) and R3-TRANSITION-SEMANTICS
 * (collapse-as-expression) on the permitted living/continuity/mixer path.
 */

import type { ContinuityChannelMap } from "./types";
import { quantize } from "./derivatives";
import { smootherstep } from "./scheduler";

/** Canonical energy route ids (eight-state holds + transition specials + expression families). */
export type EnergyRouteId =
  | "presence-neutral-settled"
  | "presence-listening-receive"
  | "presence-thinking-knit"
  | "presence-recognition-spark"
  | "comet-executing-drive"
  | "presence-blocked-strain"
  | "presence-pleased-resolve"
  | "dormant-orbit-maintain"
  | "wake"
  | "interruption"
  | "reset"
  | "expression-soft"
  | "expression-bright"
  | "expression-strain"
  | "expression-resolve";

export type EnergyEnvelopePhase =
  | "attack"
  | "sustain"
  | "release"
  | "hold"
  | "interrupt"
  | "reset";

/** Attack / sustain / release / hold timing (seconds at timingScale=1). */
export type TemporalEnvelope = {
  attack: number;
  sustain: number;
  release: number;
  hold: number;
  /** Preferred GSAP ease token (informational; GSAP owns the real curve). */
  ease: string;
};

/** Deterministic energy target for one route/state. */
export type EnergyTarget = {
  routeId: EnergyRouteId;
  /** Steady-state energy_level target ∈ (0,1]. */
  level: number;
  /** Pulse amplitude contribution. */
  pulse: number;
  /** Lag coefficient (higher = slower lag chase). */
  lag: number;
  /** Internal glow coupling target. */
  glow: number;
  envelope: TemporalEnvelope;
  /** Ordinary expression may not collapse silhouette; dormant may compress gently. */
  mode: "ordinary" | "dormant" | "wake" | "interrupt" | "reset" | "expression";
};

/**
 * Anti-collapse floors for ordinary expression / continuity.
 * Dormant may go lower but never to zero-scale disappearance.
 */
export const ANTI_COLLAPSE_FLOORS = {
  ordinary: {
    face_scale: 0.88,
    overall_height: 0.9,
    overall_width: 0.9,
    lower_body_fullness: 0.55,
    energy_level: 0.18,
    eye_openness: 0.12,
    mouth_openness: 0.04,
    // R4 no-blackout: face communication channels never wipe to dark.
    face_emissive: 0.18,
    internal_glow: 0.22,
  },
  dormant: {
    // Gentle compress only — still above ordinary inspection floor so matrix
    // transitions out of dormant cannot reverse-overshoot into collapse-as-expression.
    // Dim-but-legible: never empty outer-orb (face_emissive/eyes stay communicative).
    face_scale: 0.88,
    overall_height: 0.9,
    overall_width: 0.9,
    lower_body_fullness: 0.55,
    energy_level: 0.12,
    eye_openness: 0.1,
    mouth_openness: 0.03,
    face_emissive: 0.12,
    internal_glow: 0.14,
  },
  wake: {
    face_scale: 0.9,
    overall_height: 0.92,
    overall_width: 0.92,
    lower_body_fullness: 0.55,
    energy_level: 0.2,
    eye_openness: 0.14,
    mouth_openness: 0.05,
    face_emissive: 0.14,
    internal_glow: 0.18,
  },
  interrupt: {
    face_scale: 0.88,
    overall_height: 0.9,
    overall_width: 0.9,
    lower_body_fullness: 0.55,
    energy_level: 0.2,
    eye_openness: 0.12,
    mouth_openness: 0.05,
    face_emissive: 0.16,
    internal_glow: 0.2,
  },
  reset: {
    face_scale: 0.92,
    overall_height: 0.94,
    overall_width: 0.94,
    lower_body_fullness: 0.55,
    energy_level: 0.3,
    eye_openness: 0.2,
    mouth_openness: 0.08,
    face_emissive: 0.2,
    internal_glow: 0.28,
  },
  expression: {
    face_scale: 0.9,
    overall_height: 0.92,
    overall_width: 0.92,
    lower_body_fullness: 0.55,
    energy_level: 0.22,
    eye_openness: 0.1,
    mouth_openness: 0.04,
    face_emissive: 0.16,
    internal_glow: 0.24,
  },
} as const;

export type AntiCollapseMode = keyof typeof ANTI_COLLAPSE_FLOORS;

/** Minimum rendered energy volume scale (never disappear). */
export const ENERGY_RENDER_SCALE_FLOOR = 0.72;
/** Minimum face cluster scale under ordinary expression. */
export const FACE_RENDER_SCALE_FLOOR = 0.88;
/** Material energy span floor across full matrix (rejects R3 flat 0.52). */
export const MATERIAL_ENERGY_SPAN_FLOOR = 0.12;

const env = (
  attack: number,
  sustain: number,
  release: number,
  hold: number,
  ease = "power2.out",
): TemporalEnvelope => ({ attack, sustain, release, hold, ease });

/**
 * Canonical energy grammar table — every required state/route.
 * Levels intentionally span well above MATERIAL_ENERGY_SPAN_FLOOR (dormant 0.22 → comet 0.86).
 */
export const ENERGY_GRAMMAR: Record<EnergyRouteId, EnergyTarget> = {
  "presence-neutral-settled": {
    routeId: "presence-neutral-settled",
    level: 0.52,
    pulse: 0.16,
    lag: 0.35,
    glow: 0.48,
    envelope: env(0.18, 0.55, 0.28, 0.9, "sine.out"),
    mode: "ordinary",
  },
  "presence-listening-receive": {
    routeId: "presence-listening-receive",
    level: 0.64,
    pulse: 0.22,
    lag: 0.28,
    glow: 0.55,
    envelope: env(0.22, 0.6, 0.3, 0.95, "power2.out"),
    mode: "ordinary",
  },
  "presence-thinking-knit": {
    routeId: "presence-thinking-knit",
    level: 0.58,
    pulse: 0.35,
    lag: 0.55,
    glow: 0.5,
    envelope: env(0.28, 0.7, 0.32, 1.0, "sine.inOut"),
    mode: "ordinary",
  },
  "presence-recognition-spark": {
    routeId: "presence-recognition-spark",
    level: 0.78,
    pulse: 0.48,
    lag: 0.22,
    glow: 0.72,
    envelope: env(0.12, 0.4, 0.35, 0.75, "power3.out"),
    mode: "ordinary",
  },
  "comet-executing-drive": {
    routeId: "comet-executing-drive",
    level: 0.86,
    pulse: 0.55,
    lag: 0.18,
    glow: 0.8,
    envelope: env(0.15, 0.65, 0.4, 0.85, "power2.inOut"),
    mode: "ordinary",
  },
  "presence-blocked-strain": {
    routeId: "presence-blocked-strain",
    level: 0.38,
    pulse: 0.42,
    lag: 0.48,
    glow: 0.36,
    envelope: env(0.2, 0.55, 0.3, 0.9, "power2.inOut"),
    mode: "ordinary",
  },
  "presence-pleased-resolve": {
    routeId: "presence-pleased-resolve",
    level: 0.68,
    pulse: 0.28,
    lag: 0.3,
    glow: 0.62,
    envelope: env(0.2, 0.5, 0.35, 0.9, "sine.out"),
    mode: "ordinary",
  },
  "dormant-orbit-maintain": {
    routeId: "dormant-orbit-maintain",
    level: 0.22,
    pulse: 0.08,
    lag: 0.7,
    glow: 0.2,
    envelope: env(0.35, 1.1, 0.45, 1.4, "sine.inOut"),
    mode: "dormant",
  },
  wake: {
    routeId: "wake",
    level: 0.42,
    pulse: 0.3,
    lag: 0.4,
    glow: 0.4,
    envelope: env(0.25, 0.45, 0.3, 0.6, "power2.out"),
    mode: "wake",
  },
  interruption: {
    routeId: "interruption",
    level: 0.55,
    pulse: 0.5,
    lag: 0.25,
    glow: 0.45,
    envelope: env(0.08, 0.22, 0.35, 0.4, "power3.out"),
    mode: "interrupt",
  },
  reset: {
    routeId: "reset",
    level: 0.52,
    pulse: 0.16,
    lag: 0.35,
    glow: 0.48,
    envelope: env(0.15, 0.3, 0.4, 0.7, "power2.inOut"),
    mode: "reset",
  },
  "expression-soft": {
    routeId: "expression-soft",
    level: 0.56,
    pulse: 0.2,
    lag: 0.32,
    glow: 0.5,
    envelope: env(0.2, 0.45, 0.28, 0.7, "sine.out"),
    mode: "expression",
  },
  "expression-bright": {
    routeId: "expression-bright",
    level: 0.74,
    pulse: 0.4,
    lag: 0.24,
    glow: 0.7,
    envelope: env(0.14, 0.4, 0.3, 0.65, "power2.out"),
    mode: "expression",
  },
  "expression-strain": {
    routeId: "expression-strain",
    level: 0.4,
    pulse: 0.38,
    lag: 0.45,
    glow: 0.34,
    envelope: env(0.18, 0.5, 0.3, 0.75, "power2.inOut"),
    mode: "expression",
  },
  "expression-resolve": {
    routeId: "expression-resolve",
    level: 0.66,
    pulse: 0.26,
    lag: 0.3,
    glow: 0.6,
    envelope: env(0.18, 0.45, 0.32, 0.7, "sine.out"),
    mode: "expression",
  },
};

/** Full matrix routes exercised for energy span + transition continuity proofs. */
export const FULL_ENERGY_MATRIX_ROUTES: readonly EnergyRouteId[] = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
  "wake",
  "interruption",
  "reset",
  "expression-soft",
  "expression-bright",
  "expression-strain",
  "expression-resolve",
] as const;

/** Eight-state holds only (presence face matrix). */
export const EIGHT_STATE_ENERGY_ROUTES: readonly EnergyRouteId[] = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
  "wake",
] as const;

const ALIASES: Record<string, EnergyRouteId> = {
  neutral: "presence-neutral-settled",
  "neutral-settled": "presence-neutral-settled",
  listening: "presence-listening-receive",
  "listening-receive": "presence-listening-receive",
  thinking: "presence-thinking-knit",
  "thinking-knit": "presence-thinking-knit",
  recognition: "presence-recognition-spark",
  "recognition-spark": "presence-recognition-spark",
  executing: "comet-executing-drive",
  comet: "comet-executing-drive",
  "executing-drive": "comet-executing-drive",
  blocked: "presence-blocked-strain",
  "blocked-strain": "presence-blocked-strain",
  pleased: "presence-pleased-resolve",
  "pleased-resolve": "presence-pleased-resolve",
  "pleased-soft": "presence-pleased-resolve",
  dormant: "dormant-orbit-maintain",
  "dormant-maintain": "dormant-orbit-maintain",
  "dormant-orbit-maintain": "dormant-orbit-maintain",
  recovering: "interruption",
  interrupt: "interruption",
  interruption: "interruption",
  reset: "reset",
  wake: "wake",
};

/** Resolve any state/microstate/route string to a canonical EnergyRouteId. */
export function resolveEnergyRouteId(id: string | null | undefined): EnergyRouteId {
  if (!id) return "presence-neutral-settled";
  if (id in ENERGY_GRAMMAR) return id as EnergyRouteId;
  const alias = ALIASES[id] ?? ALIASES[id.toLowerCase()];
  if (alias) return alias;
  return "presence-neutral-settled";
}

export function resolveEnergyTarget(id: string | null | undefined): EnergyTarget {
  return ENERGY_GRAMMAR[resolveEnergyRouteId(id)];
}

export function resolveTemporalEnvelope(id: string | null | undefined): TemporalEnvelope {
  return resolveEnergyTarget(id).envelope;
}

/**
 * Normalized envelope weight in [0,1] for a phase progress.
 * progress ∈ [0,1] across attack→sustain→release of a single transition.
 */
export function envelopeWeight(
  progress: number,
  envelope: TemporalEnvelope,
  phase: EnergyEnvelopePhase = "sustain",
): number {
  const p = Math.min(1, Math.max(0, progress));
  if (phase === "hold") return 1;
  if (phase === "interrupt") {
    // Fast attack, soft release after mid-point
    if (p < 0.35) return smootherstep(p / 0.35);
    return 1 - smootherstep((p - 0.35) / 0.65) * 0.15;
  }
  if (phase === "reset") {
    // Release toward neutral then hold
    return 1 - smootherstep(p) * 0.35;
  }
  const total = Math.max(
    1e-6,
    envelope.attack + envelope.sustain + envelope.release,
  );
  const a = envelope.attack / total;
  const s = envelope.sustain / total;
  if (p <= a) {
    return smootherstep(a > 0 ? p / a : 1);
  }
  if (p <= a + s) {
    return 1;
  }
  const rProg = (p - a - s) / Math.max(1e-6, 1 - a - s);
  // Soft release: decay to 0.85 of peak (hold residual), not to zero energy.
  return 1 - smootherstep(rProg) * 0.15;
}

/**
 * Sample energy channels for a route at transition progress.
 * fromLevel → target.level with envelope weighting; never hard-snaps.
 */
export function sampleEnergyChannels(opts: {
  routeId: string | null | undefined;
  progress: number;
  phase?: EnergyEnvelopePhase;
  fromLevel?: number;
  fromPulse?: number;
  fromLag?: number;
  fromGlow?: number;
}): ContinuityChannelMap {
  const target = resolveEnergyTarget(opts.routeId);
  const phase = opts.phase ?? "sustain";
  const w = envelopeWeight(opts.progress, target.envelope, phase);
  const fromL = opts.fromLevel ?? target.level;
  const fromP = opts.fromPulse ?? target.pulse;
  const fromLag = opts.fromLag ?? target.lag;
  const fromG = opts.fromGlow ?? target.glow;
  const level = fromL + (target.level - fromL) * w;
  const pulse = fromP + (target.pulse - fromP) * w;
  const lag = fromLag + (target.lag - fromLag) * w;
  const glow = fromG + (target.glow - fromG) * w;
  return {
    energy_level: quantize(clamp01(level), 6),
    energy_pulse: quantize(clamp01(pulse), 6),
    energy_lag: quantize(clamp01(lag), 6),
    internal_glow: quantize(clamp01(glow), 6),
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Embodied volume proxy matching continuity embodimentDefects.volumeOf. */
export function channelVolume(channels: ContinuityChannelMap): number {
  const w = channels.overall_width ?? 1;
  const h = channels.overall_height ?? 1;
  const f = channels.lower_body_fullness ?? 1;
  return w * h * Math.pow(Math.max(0.5, f), 0.35);
}

/** Minimum volume so embodiment defect detectors stay clean on ordinary paths. */
export const VOLUME_FLOOR = 0.78;

/**
 * Enforce anti-collapse floors. Ordinary expression must not squeeze the whole head
 * to near-zero scale or erase face presence.
 */
export function enforceAntiCollapseFloors(
  channels: ContinuityChannelMap,
  mode: AntiCollapseMode = "ordinary",
): ContinuityChannelMap {
  const floors = ANTI_COLLAPSE_FLOORS[mode] ?? ANTI_COLLAPSE_FLOORS.ordinary;
  const out: ContinuityChannelMap = { ...channels };
  for (const [k, floor] of Object.entries(floors)) {
    const v = out[k];
    if (typeof v === "number" && Number.isFinite(v) && v < floor) {
      out[k] = floor;
    } else if (v === undefined || v === null) {
      // Only inject structural floors when the key is contour/face/energy relevant
      if (
        k === "face_scale" ||
        k === "overall_height" ||
        k === "overall_width" ||
        k === "lower_body_fullness"
      ) {
        out[k] = floor;
      }
    }
  }
  // Hard ban zero-scale / disappearance substitutes
  if ((out.face_scale ?? 1) < floors.face_scale) {
    out.face_scale = floors.face_scale;
  }
  if ((out.overall_height ?? 1) < floors.overall_height) {
    out.overall_height = floors.overall_height;
  }
  if ((out.overall_width ?? 1) < floors.overall_width) {
    out.overall_width = floors.overall_width;
  }
  // Never allow energy to flatline to zero as expression
  if ((out.energy_level ?? 0) < floors.energy_level) {
    out.energy_level = floors.energy_level;
  }
  // R4 no-blackout: face emissive / glow never wipe (outer-orb-only failure).
  if (
    typeof floors.face_emissive === "number" &&
    (out.face_emissive ?? 0) < floors.face_emissive
  ) {
    out.face_emissive = floors.face_emissive;
  } else if (
    typeof floors.face_emissive === "number" &&
    (out.face_emissive === undefined || out.face_emissive === null)
  ) {
    out.face_emissive = floors.face_emissive;
  }
  if (
    typeof floors.internal_glow === "number" &&
    (out.internal_glow ?? 0) < floors.internal_glow
  ) {
    out.internal_glow = floors.internal_glow;
  } else if (
    typeof floors.internal_glow === "number" &&
    (out.internal_glow === undefined || out.internal_glow === null)
  ) {
    out.internal_glow = floors.internal_glow;
  }
  // Preserve volume floor: boost fullness (then mild isotropic scale) if collapsed.
  // Ordinary expression must not use volume collapse as the motion vehicle.
  let vol = channelVolume(out);
  if (vol < VOLUME_FLOOR - 1e-6) {
    const h = out.overall_height ?? 1;
    const w = out.overall_width ?? 1;
    // Need f such that w*h*max(0.5,f)^0.35 >= VOLUME_FLOOR
    const needPow = VOLUME_FLOOR / Math.max(1e-6, w * h);
    const needF = Math.pow(Math.max(needPow, 0.5), 1 / 0.35);
    out.lower_body_fullness = Math.max(
      out.lower_body_fullness ?? 0,
      Math.min(1.2, needF + 0.02),
    );
    vol = channelVolume(out);
  }
  if (vol < VOLUME_FLOOR - 1e-6) {
    // Mild isotropic rescue — never zero, keeps topology continuous
    const scale = Math.sqrt(VOLUME_FLOOR / Math.max(1e-6, vol)) * 1.001;
    out.overall_height = (out.overall_height ?? 1) * scale;
    out.overall_width = (out.overall_width ?? 1) * scale;
  }
  return out;
}

/**
 * Apply energy grammar onto a channel map for a known route.
 * Soft-overwrites energy_* (+ glow) from sampled envelope; preserves other semantics.
 * Then enforces anti-collapse floors for the route mode.
 */
export function applyEnergyGrammar(
  channels: ContinuityChannelMap,
  opts: {
    routeId: string | null | undefined;
    progress?: number;
    phase?: EnergyEnvelopePhase;
    /** When true, force energy channels to grammar sample (capture path). */
    forceEnergy?: boolean;
  },
): ContinuityChannelMap {
  const target = resolveEnergyTarget(opts.routeId);
  const progress = opts.progress ?? 1;
  const phase = opts.phase ?? (progress >= 0.98 ? "hold" : "sustain");
  const sampled = sampleEnergyChannels({
    routeId: target.routeId,
    progress,
    phase,
    fromLevel: channels.energy_level,
    fromPulse: channels.energy_pulse,
    fromLag: channels.energy_lag,
    fromGlow: channels.internal_glow,
  });
  const merged: ContinuityChannelMap = { ...channels };
  if (opts.forceEnergy !== false) {
    // When forceEnergy (default), write grammar energy; when false, only fill missing.
    if (opts.forceEnergy === true || channels.energy_level == null) {
      Object.assign(merged, sampled);
    } else {
      // Soft pull: blend 35% toward grammar so live GSAP values remain primary
      // but cannot stick forever at a flat demo constant when state target differs.
      const pull = 0.35;
      for (const k of Object.keys(sampled)) {
        const cur = merged[k];
        const goal = sampled[k]!;
        if (typeof cur !== "number") {
          merged[k] = goal;
        } else {
          merged[k] = quantize(cur + (goal - cur) * pull, 6);
        }
      }
    }
  } else {
    for (const [k, v] of Object.entries(sampled)) {
      if (merged[k] == null) merged[k] = v;
    }
  }
  const anti = enforceAntiCollapseFloors(merged, target.mode);
  // R4: composite facial attachment / face presence rescue (anti-collapse alone
  // leaves facialAttached blackout on raw scalar floors for dormant/wake).
  // Lazy import avoided: local require of enforceNoBlackout would cycle;
  // call via late-bound helper registered below.
  return applyNoBlackoutAfterAntiCollapse(anti, target.mode);
}

/** Late-bound no-blackout hook (set by noBlackoutInvariant / index wiring). */
let _noBlackoutAfterAnti:
  | ((
      channels: ContinuityChannelMap,
      mode: AntiCollapseMode,
    ) => ContinuityChannelMap)
  | null = null;

/** Register no-blackout post-anti-collapse (called from noBlackoutInvariant). */
export function registerNoBlackoutAfterAntiCollapse(
  fn: (
    channels: ContinuityChannelMap,
    mode: AntiCollapseMode,
  ) => ContinuityChannelMap,
): void {
  _noBlackoutAfterAnti = fn;
}

function applyNoBlackoutAfterAntiCollapse(
  channels: ContinuityChannelMap,
  mode: AntiCollapseMode,
): ContinuityChannelMap {
  if (_noBlackoutAfterAnti) return _noBlackoutAfterAnti(channels, mode);
  return channels;
}

/** Identity constraints for layer mixer — structural anti-collapse clamps. */
export function antiCollapseIdentityConstraints(
  mode: AntiCollapseMode = "ordinary",
): Array<{
  id: string;
  bindingId: string;
  min: number;
  max: number;
  mode: "clamp";
}> {
  const floors = ANTI_COLLAPSE_FLOORS[mode];
  return (Object.entries(floors) as Array<[string, number]>).map(
    ([bindingId, min]) => ({
      id: `anti-collapse:${mode}:${bindingId}`,
      bindingId,
      min,
      max: bindingId.startsWith("overall") || bindingId === "face_scale" ? 1.8 : 1,
      mode: "clamp" as const,
    }),
  );
}

/** Per-channel duration scales derived from temporal envelope (GSAP plan compiler). */
export function energyChannelDurationScales(
  routeId: string | null | undefined,
): ContinuityChannelMap {
  const e = resolveTemporalEnvelope(routeId);
  const total = Math.max(0.2, e.attack + e.sustain + e.release);
  // Energy leads slightly (attack-weighted); lag trails; pulse mid.
  return {
    energy_level: quantize(Math.max(0.55, e.attack / total + 0.45), 4),
    energy_pulse: quantize(Math.max(0.5, (e.attack + e.sustain * 0.5) / total), 4),
    energy_lag: quantize(Math.max(0.7, (e.attack + e.sustain + e.release * 0.5) / total), 4),
    internal_glow: quantize(Math.max(0.6, e.sustain / total + 0.35), 4),
  };
}

/** Phase offsets (seconds) — lag/glow trail the attack edge. */
export function energyPhaseOffsets(
  routeId: string | null | undefined,
): ContinuityChannelMap {
  const e = resolveTemporalEnvelope(routeId);
  return {
    energy_level: 0,
    energy_pulse: quantize(e.attack * 0.15, 4),
    energy_lag: quantize(e.attack * 0.35, 4),
    internal_glow: quantize(e.attack * 0.2, 4),
  };
}

export type EnergySpanReport = {
  min: number;
  max: number;
  span: number;
  material: boolean;
  levels: number[];
  routeLevels: Record<string, number>;
};

/** Compute energy span across levels; material when span ≥ MATERIAL_ENERGY_SPAN_FLOOR. */
export function analyzeEnergySpan(levels: readonly number[]): EnergySpanReport {
  if (levels.length === 0) {
    return { min: 0, max: 0, span: 0, material: false, levels: [], routeLevels: {} };
  }
  let min = levels[0]!;
  let max = levels[0]!;
  for (const v of levels) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  return {
    min,
    max,
    span,
    material: span >= MATERIAL_ENERGY_SPAN_FLOOR - 1e-9,
    levels: [...levels],
    routeLevels: {},
  };
}

/** Steady-state levels for every matrix route (deterministic table read). */
export function fullMatrixSteadyLevels(): EnergySpanReport {
  const routeLevels: Record<string, number> = {};
  const levels: number[] = [];
  for (const id of FULL_ENERGY_MATRIX_ROUTES) {
    const lv = ENERGY_GRAMMAR[id].level;
    routeLevels[id] = lv;
    levels.push(lv);
  }
  const report = analyzeEnergySpan(levels);
  report.routeLevels = routeLevels;
  return report;
}

/**
 * Detect collapse-as-expression: global scale/volume used as the expression vehicle.
 * Returns true when channels look like whole-head squeeze / disappearance.
 */
export function isCollapseAsExpression(
  channels: ContinuityChannelMap,
  mode: AntiCollapseMode = "ordinary",
): boolean {
  const floors = ANTI_COLLAPSE_FLOORS[mode];
  const fs = channels.face_scale ?? 1;
  const h = channels.overall_height ?? 1;
  const w = channels.overall_width ?? 1;
  const e = channels.energy_level ?? 0.5;
  if (fs < floors.face_scale - 1e-6) return true;
  if (h < floors.overall_height - 1e-6) return true;
  if (w < floors.overall_width - 1e-6) return true;
  if (e < floors.energy_level - 1e-6) return true;
  // Zero-scale / near-disappearance / non-finite energy
  if (fs < 0.05 || h < 0.05 || w < 0.05) return true;
  if (!Number.isFinite(e) || e < 0) return true;
  // Volume collapse as expression vehicle
  if (channelVolume(channels) < VOLUME_FLOOR - 1e-6) return true;
  return false;
}

/**
 * Soft continuous step toward energy target under velocity bound.
 * Used by living flush policy so energy varies without teleport.
 */
export function stepEnergyTowardTarget(
  current: ContinuityChannelMap,
  routeId: string | null | undefined,
  opts?: {
    progress?: number;
    phase?: EnergyEnvelopePhase;
    /** Blend alpha per step (default 0.22 @ ~60fps → smooth chase). */
    alpha?: number;
  },
): ContinuityChannelMap {
  const alpha = opts?.alpha ?? 0.22;
  const goal = sampleEnergyChannels({
    routeId,
    progress: opts?.progress ?? 1,
    phase: opts?.phase ?? "hold",
    fromLevel: current.energy_level,
    fromPulse: current.energy_pulse,
    fromLag: current.energy_lag,
    fromGlow: current.internal_glow,
  });
  // For hold phase, goal is the steady target; blend current toward it.
  const target = resolveEnergyTarget(routeId);
  const holdGoal: ContinuityChannelMap = {
    energy_level: target.level,
    energy_pulse: target.pulse,
    energy_lag: target.lag,
    internal_glow: target.glow,
  };
  const useGoal = (opts?.phase ?? "hold") === "hold" ? holdGoal : goal;
  const out: ContinuityChannelMap = { ...current };
  for (const [k, g] of Object.entries(useGoal)) {
    const c = out[k];
    if (typeof c !== "number") {
      out[k] = g;
    } else {
      out[k] = quantize(c + (g - c) * alpha, 6);
    }
  }
  const anti = enforceAntiCollapseFloors(out, target.mode);
  return applyNoBlackoutAfterAntiCollapse(anti, target.mode);
}
