/**
 * GASPER-PHYSICS-001 · S8 — the radial facing law of the moving body
 * (radial-facing-phd-memo; NORTHSTAR N38/N39).
 *
 * The 2.5D system is CORE (N38): whenever he moves, his direction lives in a
 * FULL radial field over the ground plane — 12 directional slices (30° each,
 * a clock: 12 o'clock = AWAY from the user, 6 o'clock = toward the user,
 * 3 o'clock = stage right). The slice of travel controls the direction he
 * faces (N39); at 12 o'clock he faces away, and the whole clock is animated.
 *
 * A-LAW-style split (the S5 idiom): this module is the PURE LAW — it maps a
 * kernel bearing to a CONTINUOUS paint yaw on S¹ plus slice TELEMETRY.
 * Painted width is a C∞ function of that yaw (finite-thickness ellipse).
 * Slice ids (30° clock) are telemetry only — they must never quantize the
 * painted profile. The renderer pursues the paint yaw with the thrust
 * idiom τ_c·φ² (shortest-arc) and composes it additively: effective yaw =
 * dial + heading + attention, fenced ±180. viewAmount still saturates at
 * ±1 so the authored cone contour is not exploded; painted WIDTH, lobes,
 * face fade, and back presence are continuous on the full circle. Frontal
 * home θ=0 is byte-identical (facingCompress = 1).
 *
 * Fail-closed: a bearing below the rest speed is NULL — facing HOLDS its
 * last slice (a body that stops facing the way it came reads as deliberate;
 * a body that never moved reads frontal: byte-stable home, D-0088).
 * Corrupt input → frontal setpoint. Reduced motion → the kernel is disarmed,
 * nothing feeds, the carrier holds 0 from load.
 */
import { GAIT_LAW } from "./GaitLaw";
import { PHI } from "./PhiLaw";

const PHI2 = PHI * PHI;

/** S8 — 30° slice of the 12-slice clock (the owner's pie). */
export const RADIAL_FACING_LAW = Object.freeze({
  /** The 12-slice clock over the ground plane. */
  sliceCount: 12,
  /** Slice angular width, degrees. */
  sliceDeg: 30,
  /**
   * The front cone — the authored 2.5D turntable range. Inside it the
   * existing deformation law runs UNCHANGED (byte-identical); the
   * full-circle extension gates on |θ| > 45.
   */
  frontConeDeg: 45,
  /**
   * Facing pursuit constant — the THRUST idiom τ·φ² ≈ 0.254 s
   * (FlightLaw.thrustTauSec, the body's direction constant): the body
   * commits to the new slice with the same mass that jets its flight and
   * turns its attention (timing-for-animation-1981 lead-and-follow: the
   * attitude changes with the translation, never after it).
   */
  pursuitTauSec: GAIT_LAW.bankSmoothTauSec * PHI2,
  /**
   * Rest-speed gate (world units/s) — below it the kernel's velocity is
   * noise, not travel; the bearing is NULL and facing holds its slice.
   */
  restSpeedUnitsPerSec: 40,
});

/**
 * Bearing of travel on the ground plane, degrees in the clock frame:
 * 0 = toward the user (6 o'clock), +90 = stage right (3 o'clock),
 * ±180 = away (12 o'clock), −90 = stage left (9 o'clock).
 * NULL below the rest-speed gate or on corrupt input — facing holds.
 */
export function facingBearingDeg(
  vx: number,
  vz: number,
): number | null {
  if (!Number.isFinite(vx) || !Number.isFinite(vz)) return null;
  const speed = Math.hypot(vx, vz);
  if (speed < RADIAL_FACING_LAW.restSpeedUnitsPerSec) return null;
  return (Math.atan2(vx, -vz) * 180) / Math.PI;
}

/**
 * Quantize a bearing to the nearest slice center (±180, inclusive frame).
 * The SLICE OF TRAVEL literally controls the facing (the owner's pie).
 */
export function facingSliceCenterDeg(bearingDeg: number): number {
  if (!Number.isFinite(bearingDeg)) return 0;
  const stepped = Math.round(bearingDeg / RADIAL_FACING_LAW.sliceDeg) *
    RADIAL_FACING_LAW.sliceDeg;
  let deg = ((stepped + 180) % 360) - 180; // wrap to [-180, 180)
  if (deg === -180) deg = 180; // the away pole is EXACTLY 180 (12 o'clock)
  return deg;
}

/**
 * LEGACY fold — telemetry / tests only. Do NOT use for painted width.
 * Folding |θ| > 45 into the ±45° cone is the card snap Cody named:
 * 90° and 180° become the same sticker. Paint uses facingPaintYawDeg.
 */
export function facingProjectionYawDeg(facingDeg: number): number {
  if (!Number.isFinite(facingDeg)) return 0;
  const sign = facingDeg < 0 ? -1 : 1;
  return sign * Math.min(Math.abs(facingDeg), RADIAL_FACING_LAW.frontConeDeg);
}

/**
 * The clock id of a facing (1..12): 12 = away (12 o'clock), 6 = toward the
 * user (6 o'clock), 3 = stage right, 9 = stage left. Telemetry (N23).
 */
export function facingSliceId(facingDeg: number): number {
  const deg = Number.isFinite(facingDeg)
    ? ((facingDeg % 360) + 360) % 360
    : 0;
  const stepped = Math.round(deg / RADIAL_FACING_LAW.sliceDeg) %
    RADIAL_FACING_LAW.sliceCount;
  // Clock numbering: 6 o'clock = toward the user (0°), so id = stepped + 6
  // around the circle (12 at the away pole = 180°).
  return ((stepped + 6 - 1) % 12) + 1;
}

/**
 * R2 T1 — shell yaw. Attention may address the eyes at rest; it must not
 * rotate the volume until travel clears the rest-speed gate. Body yaw is
 * heading after motion exists.
 */
export function shellViewYawDeg(
  viewYawDeg: number,
  headingYawDeg: number,
  attentionYawDeg: number,
  travelLive: boolean,
): number {
  const view = Number.isFinite(viewYawDeg) ? viewYawDeg : 0;
  const heading = Number.isFinite(headingYawDeg) ? headingYawDeg : 0;
  const attention =
    travelLive && Number.isFinite(attentionYawDeg) ? attentionYawDeg : 0;
  return Math.max(-180, Math.min(180, view + heading + attention));
}

/**
 * R2 T2 — projection gain on finite-thickness breadth. 1 = authored.
 * Home / frontal (compress=1) stays 1. Never a height crush.
 */
export function facingCompressWithDepthGain(
  facingCompress: number,
  verticalDepthGain: number,
): number {
  const g = Number.isFinite(verticalDepthGain)
    ? Math.max(0.8, Math.min(1.1, verticalDepthGain))
    : 1;
  const c = Number.isFinite(facingCompress) ? facingCompress : 1;
  return 1 - g * (1 - c);
}

/**
 * R2 T2 — projection gain on WorldSpace depth scale. Home plane (scale=1)
 * stays 1. More gain → more readable z-foreshortening, never a shorter card.
 */
export function worldDepthScaleWithGain(
  rawScale: number,
  verticalDepthGain: number,
): number {
  const g = Number.isFinite(verticalDepthGain)
    ? Math.max(0.8, Math.min(1.1, verticalDepthGain))
    : 1;
  const s = Number.isFinite(rawScale) ? rawScale : 1;
  return 1 - g * (1 - s);
}

/**
 * Shortest-arc facing pursuit at the thrust constant. Crossing the away
 * pole must not reset through the camera (no telegraph-at-origin spin).
 */
export function pursueFacingDeg(
  currentDeg: number,
  targetDeg: number,
  dtSec: number,
): number {
  if (!Number.isFinite(currentDeg)) currentDeg = 0;
  if (!Number.isFinite(targetDeg)) return currentDeg;
  if (!Number.isFinite(dtSec) || dtSec <= 0) return currentDeg;
  let err = targetDeg - currentDeg;
  if (err > 180) err -= 360;
  else if (err < -180) err += 360;
  const alpha = 1 - Math.exp(-dtSec / RADIAL_FACING_LAW.pursuitTauSec);
  let next = currentDeg + err * alpha;
  if (next > 180) next -= 360;
  else if (next < -180) next += 360;
  if (Math.abs(next) < 1e-4 && targetDeg === 0) return 0;
  return next;
}

/** Side thickness of the pearl (orthographic ellipse minor/major). */
export const TURNTABLE_SIDE_THICKNESS = 0.90;

/**
 * Painted facing yaw — continuous on S¹. No 30° quantization, no ±45 fold.
 * Slice ids remain telemetry via facingSliceId / facingSliceCenterDeg.
 */
export function facingPaintYawDeg(bearingDeg: number): number {
  if (!Number.isFinite(bearingDeg)) return 0;
  let deg = ((((bearingDeg + 180) % 360) + 360) % 360) - 180;
  if (deg === -180) deg = 180;
  return deg;
}

/**
 * Readable walk 3/4 SHOT (N196). This is a camera pin for authored takes,
 * not a fold. Paint yaw is continuous on S¹. Adobe Rotate: 90 is 90, 180 is the back.
 * Clamping locomotion to ±22 made side and away the same sticker.
 */
export const READABLE_THREE_QUARTER_DEG = 22;

/** Continuous on S¹. No min(22, |θ|). Away stays away. */
export function facingReadableLocomotionYawDeg(paintYawDeg: number): number {
  return facingPaintYawDeg(paintYawDeg);
}

/**
 * Clock facing → authored orbit yaw (N168).
 * The turntable treats +θ as right-near (camera orbit). Locomotion +90 is
 * "face stage right": his left cheek stays on the lens, the right eye
 * recedes. Sending +65 made the far eye enlarge. Negate so walk-right
 * paints left-near / right-far. Identity at 0. Away (±180) stays ±180.
 */
export function facingPaintOrbitYawDeg(clockFacingDeg: number): number {
  if (!Number.isFinite(clockFacingDeg)) return 0;
  const wrapped = ((clockFacingDeg + 180) % 360) - 180;
  const yaw = wrapped === -180 ? 180 : wrapped;
  if (yaw === 0 || Math.abs(yaw) < 1e-12) return 0;
  return yaw === 180 || yaw === -180 ? 180 : -yaw;
}

function yawRad(yawDeg: number): number {
  return ((Number.isFinite(yawDeg) ? yawDeg : 0) * Math.PI) / 180;
}

/**
 * Natural aperture foreshorten (N182). Width only. Same |sin θ| family as
 * the hull, at ~¼ the old 0.36 card squash so 3/4 is a hint, not a wink.
 * Always ≤ 1. Never enlarges.
 */
export const FACING_APERTURE_FORE = 0.10;
/** Modest near-lobe grow. Abs |sin θ|. Lights only — never a second hull X. */
export const FACING_NEAR_LOBE_GAIN = 0.05;
/** Far-lobe tuck on interior lights. Abs |sin θ|. Hull width is the ellipse. */
export const FACING_FAR_LOBE_GAIN = 0.06;

/** Far-side feature scale. Always ≤ 1. Diminishes as |yaw| grows. Never enlarges. */
export function facingFarFeatureScale(yawDeg: number): number {
  return 1 - FACING_APERTURE_FORE * Math.abs(Math.sin(yawRad(yawDeg)));
}

/** Near-side feature scale. Held at 1 — near must not grow to fake 3/4. */
export function facingNearFeatureScale(_yawDeg: number): number {
  return 1;
}

/**
 * Atlas Seat (Boston Dynamics Atlas, 2026-08-14). Each beat commits, arrives,
 * seats. Drawing seats in this order — face leads, hull follows:
 *   1. face slides along the hull into yaw
 *   2. far arm reduces (occlusion)
 *   3. legs overlap on the path
 * Continuous. No yaw-threshold snap. Dead freeze / skate / card squash
 * are not a seat.
 */
export const ATLAS_SEAT = Object.freeze({
  faceOnDeg: 8,
  faceSeatedDeg: 52,
  farArmOnDeg: 58,
  farArmSeatedDeg: 125,
  footOnDeg: 42,
  footSeatedDeg: 78,
});

function atlasSmooth(absDeg: number, a: number, b: number): number {
  const t = Math.max(0, Math.min(1, (absDeg - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
}

/** 0 at front, 1 when the face has seated along the hull into 3/4. Leads. */
export function facingFaceSlideAmount(yawDeg: number): number {
  return atlasSmooth(Math.abs(Number.isFinite(yawDeg) ? yawDeg : 0), ATLAS_SEAT.faceOnDeg, ATLAS_SEAT.faceSeatedDeg);
}

/**
 * Face offset along the hull surface (ellipse), not a 2D card clamp.
 * +yaw (stage right) slides the rig onto the near-right surface.
 * Identity at yaw 0.
 */
export function facingHullFaceOffset(
  yawDeg: number,
  hullHalfWidth: number,
): { x: number; y: number } {
  const yaw = Number.isFinite(yawDeg) ? yawDeg : 0;
  const rx = Number.isFinite(hullHalfWidth) && hullHalfWidth > 0 ? hullHalfWidth : 0;
  const slide = facingFaceSlideAmount(yaw);
  const r = yawRad(yaw);
  const fade = 1 - faceTurnFadeFromYaw(yaw);
  return {
    x: rx * Math.sin(r) * slide * 0.55 * fade,
    y: -rx * (1 - Math.cos(r * slide)) * 0.06 * fade,
  };
}

/**
 * Far-arm visibility. Seats AFTER the face has started its hull slide.
 * Smoothstep 58°→125° with a paint floor — 3/4 tucks, it does not erase.
 */
export function facingFarArmVisibility(yawDeg: number): number {
  const abs = Math.abs(Number.isFinite(yawDeg) ? yawDeg : 0);
  return 1 - atlasSmooth(abs, ATLAS_SEAT.farArmOnDeg, ATLAS_SEAT.farArmSeatedDeg);
}

/**
 * Foot-track half-width. 1 = front (two wide tracks). Seats LAST: overlap
 * on the travel path after the far arm has started to leave.
 */
export function facingFootTrackScale(yawDeg: number): number {
  const abs = Math.abs(Number.isFinite(yawDeg) ? yawDeg : 0);
  return 1 - atlasSmooth(abs, ATLAS_SEAT.footOnDeg, ATLAS_SEAT.footSeatedDeg);
}

/** 0 = two front tracks, 1 = overlap on the path. */
export function facingFootOverlap(yawDeg: number): number {
  return 1 - facingFootTrackScale(yawDeg);
}

/**
 * Finite-thickness projected breadth. C∞ on the circle.
 * w(θ) = √(cos²θ + t² sin²θ). 1 at 0° and 180°, t at ±90°.
 * No 45° gate, no reciprocal height. θ=0 is exactly 1.
 */
export function facingCompressFromYaw(yawDeg: number): number {
  if (!Number.isFinite(yawDeg)) return 1;
  const t = TURNTABLE_SIDE_THICKNESS;
  const r = (yawDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return Math.sqrt(c * c + t * t * s * s);
}

/** Near/far lobe scales — abs |sin θ|. Roles are assigned by yaw sign. */
export function facingLobeScalesFromYaw(yawDeg: number): { near: number; far: number } {
  const s = Number.isFinite(yawDeg) ? Math.abs(Math.sin((yawDeg * Math.PI) / 180)) : 0;
  return { near: 1 + FACING_NEAR_LOBE_GAIN * s, far: 1 - FACING_FAR_LOBE_GAIN * s };
}

/**
 * Screen-side assignment (N168). +yaw = right-near / left-far (turntable).
 * −yaw = left-near / right-far (orbit / walk-right). Identity at 0.
 */
export function facingLobeAssignFromYaw(yawDeg: number): { left: number; right: number } {
  const { near, far } = facingLobeScalesFromYaw(yawDeg);
  const yaw = Number.isFinite(yawDeg) ? yawDeg : 0;
  return yaw < 0 ? { left: near, right: far } : { left: far, right: near };
}

/** Face recession — C1 smoothstep 110–155°. 3/4 keeps the locked face. */
export function faceTurnFadeFromYaw(yawDeg: number): number {
  const abs = Math.abs(Number.isFinite(yawDeg) ? yawDeg : 0);
  const t = Math.max(0, Math.min(1, (abs - 110) / 45));
  return t * t * (3 - 2 * t);
}

/** Dorsal sheen — C1 smoothstep 100–140°. */
export function backPresenceFromYaw(yawDeg: number): number {
  const abs = Math.abs(Number.isFinite(yawDeg) ? yawDeg : 0);
  const t = Math.max(0, Math.min(1, (abs - 100) / 40));
  return t * t * (3 - 2 * t);
}

/** Map Art analogue: face offset rides the fade; apertures belong to the volume. */
export function faceShiftScaleFromYaw(yawDeg: number): number {
  return 1 - faceTurnFadeFromYaw(yawDeg);
}

/** Alias requested by the turntable last-mile: same C1 scale, 1 at front, 0 at back. */
export function faceShiftFromYaw(yawDeg: number): number {
  return faceShiftScaleFromYaw(yawDeg);
}

export function facingFarEyeScale(yawDeg: number): { left: number; right: number } {
  const s = Number.isFinite(yawDeg) ? Math.sin((yawDeg * Math.PI) / 180) : 0;
  const k = 1 - FACING_APERTURE_FORE * Math.abs(s);
  return { left: s >= 0 ? k : 1, right: s >= 0 ? 1 : k };
}

export function facingArmOcclusion(yawDeg: number): { near: number; far: number } {
  const abs = Math.abs(Number.isFinite(yawDeg) ? yawDeg : 0);
  const u = Math.max(0, Math.min(1, (abs - 58) / 67));
  return { near: 1, far: Math.max(0.32, 1 - u * u * (3 - 2 * u)) };
}


/** Height is never the reciprocal of width. Paint scale Y is identity. */
export const facingVerticalScale = 1;

/** Canonical short names (paint contract / memo). */
export const facingCompress = facingCompressFromYaw;
export const faceTurnFade = faceTurnFadeFromYaw;
export const backPresence = backPresenceFromYaw;
export const faceShift = faceShiftScaleFromYaw;
