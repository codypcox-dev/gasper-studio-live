/**
 * R4 expression visibility floors — reject black/inert facial channel collapses.
 *
 * Pure channel math: no DOM/GSAP/HQ. Document geometry and continuum projectors
 * call these floors so Presence holds stay legible even when intentionally dim
 * (Dormant) and never render as outer-orb-only darkness.
 */

import type { FacialChannelMap } from "./types";

export type ExpressionVisibilityMode = "presence" | "dormant" | "interrupt" | "wake";

/**
 * Minimum channel floors that keep a face legible as the same character.
 * Dormant may be intentionally dimmer but must remain above black/inert collapse.
 */
export const EXPRESSION_VISIBILITY_FLOORS: Record<
  ExpressionVisibilityMode,
  {
    energy_level: number;
    energy_pulse: number;
    internal_glow: number;
    face_emissive: number;
    eye_openness: number;
    upper_lid_aperture: number;
    lower_lid_aperture: number;
    mouth_openness: number;
    mouth_aperture: number;
    face_scale: number;
    overall_width: number;
    overall_height: number;
    relief_amplitude: number;
  }
> = Object.freeze({
  presence: Object.freeze({
    energy_level: 0.28,
    energy_pulse: 0.08,
    internal_glow: 0.22,
    face_emissive: 0.14,
    eye_openness: 0.22,
    upper_lid_aperture: 0.22,
    lower_lid_aperture: 0.18,
    mouth_openness: 0.1,
    mouth_aperture: 0.1,
    face_scale: 0.92,
    overall_width: 0.92,
    overall_height: 0.92,
    relief_amplitude: 0.22,
  }),
  dormant: Object.freeze({
    // Dim but legible — same character, not blackout.
    energy_level: 0.18,
    energy_pulse: 0.04,
    internal_glow: 0.14,
    face_emissive: 0.1,
    eye_openness: 0.16,
    upper_lid_aperture: 0.16,
    lower_lid_aperture: 0.14,
    mouth_openness: 0.08,
    mouth_aperture: 0.08,
    face_scale: 0.9,
    overall_width: 0.9,
    overall_height: 0.9,
    relief_amplitude: 0.16,
  }),
  interrupt: Object.freeze({
    energy_level: 0.24,
    energy_pulse: 0.06,
    internal_glow: 0.18,
    face_emissive: 0.12,
    eye_openness: 0.2,
    upper_lid_aperture: 0.2,
    lower_lid_aperture: 0.16,
    mouth_openness: 0.1,
    mouth_aperture: 0.1,
    face_scale: 0.91,
    overall_width: 0.91,
    overall_height: 0.91,
    relief_amplitude: 0.18,
  }),
  wake: Object.freeze({
    energy_level: 0.3,
    energy_pulse: 0.1,
    internal_glow: 0.26,
    face_emissive: 0.16,
    eye_openness: 0.24,
    upper_lid_aperture: 0.24,
    lower_lid_aperture: 0.2,
    mouth_openness: 0.12,
    mouth_aperture: 0.12,
    face_scale: 0.93,
    overall_width: 0.93,
    overall_height: 0.93,
    relief_amplitude: 0.24,
  }),
}) as Record<
  ExpressionVisibilityMode,
  {
    energy_level: number;
    energy_pulse: number;
    internal_glow: number;
    face_emissive: number;
    eye_openness: number;
    upper_lid_aperture: number;
    lower_lid_aperture: number;
    mouth_openness: number;
    mouth_aperture: number;
    face_scale: number;
    overall_width: number;
    overall_height: number;
    relief_amplitude: number;
  }
>;

function num(v: number | undefined, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

/**
 * Raise collapsed channels to visibility floors without rewriting intentional
 * multi-domain morphology above the floor.
 *
 * Coupling rule: never inject a floor into mouth_aperture/upper_lid when the
 * synonym channel (mouth_openness / eye_openness) already carries a higher
 * authored value — that freeze-to-floor class made animate samples inert.
 */
export function enforceExpressionVisibilityFloors(
  channels: FacialChannelMap,
  mode: ExpressionVisibilityMode = "presence",
): FacialChannelMap {
  const floors = EXPRESSION_VISIBILITY_FLOORS[mode] ?? EXPRESSION_VISIBILITY_FLOORS.presence;
  const out: FacialChannelMap = { ...channels };

  // Pre-couple synonyms so floor injection cannot clobber a present companion.
  if (
    (typeof out.mouth_aperture !== "number" || !Number.isFinite(out.mouth_aperture)) &&
    typeof out.mouth_openness === "number" &&
    Number.isFinite(out.mouth_openness)
  ) {
    out.mouth_aperture = out.mouth_openness;
  }
  if (
    (typeof out.mouth_openness !== "number" || !Number.isFinite(out.mouth_openness)) &&
    typeof out.mouth_aperture === "number" &&
    Number.isFinite(out.mouth_aperture)
  ) {
    out.mouth_openness = out.mouth_aperture;
  }
  if (
    (typeof out.upper_lid_aperture !== "number" || !Number.isFinite(out.upper_lid_aperture)) &&
    typeof out.eye_openness === "number" &&
    Number.isFinite(out.eye_openness)
  ) {
    out.upper_lid_aperture = out.eye_openness;
    if (typeof out.lower_lid_aperture !== "number" || !Number.isFinite(out.lower_lid_aperture)) {
      out.lower_lid_aperture = Math.max(floors.lower_lid_aperture, out.eye_openness * 0.7);
    }
  }

  for (const [key, floor] of Object.entries(floors)) {
    const v = out[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < floor) {
      out[key] = floor;
    }
  }
  // Dual-lid coupling: keep eye_openness coherent with lid apertures when present.
  const upper = num(out.upper_lid_aperture, floors.upper_lid_aperture);
  const lower = num(out.lower_lid_aperture, floors.lower_lid_aperture);
  const lidComposite = Math.max(
    floors.eye_openness,
    Math.min(0.95, upper * 0.72 + lower * 0.28),
  );
  if (num(out.eye_openness, 0) < lidComposite * 0.85) {
    out.eye_openness = Math.max(floors.eye_openness, lidComposite);
  }
  // Mouth aperture / openness stay paired — take the max of both (never freeze to floor
  // when either channel carries a higher authored value).
  const mouthAp = Math.max(
    floors.mouth_aperture,
    num(out.mouth_aperture, floors.mouth_aperture),
    num(out.mouth_openness, floors.mouth_openness),
  );
  out.mouth_aperture = mouthAp;
  out.mouth_openness = Math.max(floors.mouth_openness, mouthAp, num(out.mouth_openness, mouthAp));
  return out;
}

/**
 * Channel-map black/inert predicate: true when face energy + aperture + glow
 * are all near zero / missing — the contact-sheet blackout class.
 */
export function isChannelMapBlackOrInert(
  channels: FacialChannelMap,
  mode: ExpressionVisibilityMode = "presence",
): boolean {
  const floors = EXPRESSION_VISIBILITY_FLOORS[mode];
  const energy = num(channels.energy_level, 0);
  const glow = num(channels.internal_glow, 0);
  const emissive = num(channels.face_emissive, 0);
  const eye = num(
    channels.eye_openness,
    num(channels.upper_lid_aperture, 0) * 0.72 +
      num(channels.lower_lid_aperture, 0) * 0.28,
  );
  const mouth = num(channels.mouth_aperture, num(channels.mouth_openness, 0));
  const faceScale = num(channels.face_scale, 0);
  // Black/inert if any structural facial domain is below half the visibility floor.
  if (energy < floors.energy_level * 0.5) return true;
  if (glow < floors.internal_glow * 0.45 && emissive < floors.face_emissive * 0.45)
    return true;
  if (eye < floors.eye_openness * 0.5) return true;
  if (mouth < floors.mouth_aperture * 0.45) return true;
  if (faceScale < floors.face_scale * 0.85) return true;
  return false;
}

/**
 * Dim-but-legible Dormant projection: lower energy/glow from a presence base
 * without erasing facial communication (same character identity).
 */
export function projectDormantLegibleChannels(
  base: FacialChannelMap,
): FacialChannelMap {
  const dimmed: FacialChannelMap = {
    ...base,
    energy_level: Math.min(num(base.energy_level, 0.52), 0.28),
    energy_pulse: Math.min(num(base.energy_pulse, 0.16), 0.1),
    internal_glow: Math.min(num(base.internal_glow, 0.48), 0.22),
    face_emissive: Math.min(num(base.face_emissive, 0.32), 0.16),
    // Slightly softer lids, still open enough to read as eyes.
    upper_lid_aperture: Math.min(num(base.upper_lid_aperture, 0.56), 0.48),
    lower_lid_aperture: Math.max(num(base.lower_lid_aperture, 0.48), 0.4),
    eye_openness: Math.min(num(base.eye_openness, 0.56), 0.44),
    mouth_aperture: Math.min(num(base.mouth_aperture, 0.32), 0.26),
    mouth_openness: Math.min(num(base.mouth_openness, 0.32), 0.26),
    face_scale: Math.min(num(base.face_scale, 1), 0.98),
  };
  return enforceExpressionVisibilityFloors(dimmed, "dormant");
}

/** Synthesize a black/inert adversarial map (for negative tests only). */
export function blackInertChannelVariant(
  base: FacialChannelMap,
): FacialChannelMap {
  return {
    ...base,
    energy_level: 0.01,
    energy_pulse: 0,
    internal_glow: 0.01,
    face_emissive: 0,
    eye_openness: 0.02,
    upper_lid_aperture: 0.02,
    lower_lid_aperture: 0.02,
    mouth_openness: 0.01,
    mouth_aperture: 0.01,
    face_scale: 0.5,
    overall_width: 0.5,
    overall_height: 0.5,
    relief_amplitude: 0.01,
  };
}
