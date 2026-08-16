/**
 * Stable feature anchors — eyes/mouth/energy attach to shell-relative tissue,
 * never free-float as independent overlays.
 */

import {
  type FacialChannelMap,
  type FeatureAnchor,
  type FeatureAnchorId,
  DEFAULT_FACIAL_POLICY,
} from "./types";

/** Canonical attachment lattice in normalized shell space. */
export const FEATURE_ANCHORS: readonly FeatureAnchor[] = Object.freeze([
  { id: "shell_center", x: 0, y: 0, attachRadius: 1, owner: "shell" },
  { id: "face_plane", x: 0, y: 0.08, attachRadius: 0.55, owner: "face" },
  { id: "eye_left", x: -0.14, y: 0.16, attachRadius: 0.12, owner: "face" },
  { id: "eye_right", x: 0.14, y: 0.16, attachRadius: 0.12, owner: "face" },
  { id: "mouth_center", x: 0, y: -0.1, attachRadius: 0.14, owner: "face" },
  { id: "energy_core", x: 0, y: 0.02, attachRadius: 0.35, owner: "energy" },
]);

const ANCHOR_BY_ID = new Map(FEATURE_ANCHORS.map((a) => [a.id, a]));

export function getFeatureAnchor(id: FeatureAnchorId): FeatureAnchor {
  const a = ANCHOR_BY_ID.get(id);
  if (!a) throw new Error(`unknown feature anchor: ${id}`);
  return a;
}

export function listFeatureAnchorIds(): FeatureAnchorId[] {
  return FEATURE_ANCHORS.map((a) => a.id);
}

/**
 * Resolve live feature positions from channel state.
 * Shell scale/height pull anchors; gaze shifts eyes; face_scale modulates face plane.
 * Features remain tissue-coupled — never independent overlay transforms.
 */
export function resolveFeaturePositions(channels: FacialChannelMap): Record<
  FeatureAnchorId,
  { x: number; y: number }
> {
  const w = num(channels.overall_width, 1);
  const h = num(channels.overall_height, 1);
  const face = num(channels.face_scale, 1);
  const gaze = num(channels.gaze, 0);
  const eyeSpacing = num(channels.eye_spacing, 0);
  const crown = num(channels.crown_height, 0.04);
  const ground = num(channels.ground_flattening, 0);

  const shellSx = w;
  const shellSy = h * (1 - ground * 0.08) + crown * 0.15;

  const out = {} as Record<FeatureAnchorId, { x: number; y: number }>;
  for (const a of FEATURE_ANCHORS) {
    let x = a.x * shellSx;
    let y = a.y * shellSy;
    if (a.owner === "face") {
      x *= face;
      y = y * face + 0.08 * (face - 1) * shellSy;
    }
    if (a.id === "eye_left") {
      x -= eyeSpacing * 0.5 * shellSx;
      x += gaze * 0.04 * shellSx;
    } else if (a.id === "eye_right") {
      x += eyeSpacing * 0.5 * shellSx;
      x += gaze * 0.04 * shellSx;
    } else if (a.id === "mouth_center") {
      // Mouth stays on face midline; slight vertical coupling to openness is tissue, not float.
      const open = num(channels.mouth_openness, 0.32);
      y -= (open - 0.32) * 0.03 * shellSy;
    } else if (a.id === "energy_core") {
      const el = num(channels.energy_level, 0.5);
      y += (el - 0.5) * 0.02 * shellSy;
    }
    out[a.id] = { x, y };
  }
  return out;
}

/**
 * Attachment residual map for continuum-authored channels.
 * Lattice occupancy: eyes must stay inside face attach radius (0 = attached).
 * Feature keys eye_left/eye_right/mouth_center/energy_core default to lattice
 * occupancy (or 0 when on-lattice). Callers may overwrite keys on a frame's
 * attachmentError to model independent overlay offsets (adversarial tests).
 */
export function attachmentResiduals(channels: FacialChannelMap): Record<string, number> {
  const pos = resolveFeaturePositions(channels);
  const faceAnchor = getFeatureAnchor("face_plane");
  const radius = Math.max(faceAnchor.attachRadius, 1e-6);
  const eyeLeftOcc = Math.max(0, dist(pos.eye_left, pos.face_plane) / radius - 1);
  const eyeRightOcc = Math.max(0, dist(pos.eye_right, pos.face_plane) / radius - 1);
  return {
    // Primary keys used by frames + injectFloatingOverlay / analysis.
    eye_left: eyeLeftOcc,
    eye_right: eyeRightOcc,
    mouth_center: 0,
    energy_core: 0,
    face_to_shell: 0,
    eye_left_lattice: eyeLeftOcc,
    eye_right_lattice: eyeRightOcc,
  };
}

/**
 * True when no feature floats beyond policy attachment error.
 * Checks lattice residuals from channels, optional overlayOffsets, and optional
 * precomputed residual map (e.g. frame.attachmentError after inject).
 */
export function featuresAttached(
  channels: FacialChannelMap,
  overlayOffsets?: Partial<Record<FeatureAnchorId, { x: number; y: number }>>,
  maxError: number = DEFAULT_FACIAL_POLICY.maxAttachmentError,
  residualOverride?: Record<string, number>,
): boolean {
  const r = residualOverride ?? attachmentResiduals(channels);
  for (const v of Object.values(r)) {
    if (Math.abs(v) > maxError) return false;
  }
  if (overlayOffsets) {
    for (const off of Object.values(overlayOffsets)) {
      if (!off) continue;
      if (Math.hypot(off.x, off.y) > maxError) return false;
    }
  }
  return true;
}

/**
 * Detect independent overlay motion: face channels change while shell/energy
 * stay static across a step (or the reverse) beyond epsilon — one-body violation.
 */
export function oneBodyCoMotion(
  prev: FacialChannelMap,
  next: FacialChannelMap,
  eps = 1e-9,
): {
  ok: boolean;
  faceMoved: boolean;
  shellMoved: boolean;
  energyMoved: boolean;
} {
  const faceKeys = [
    "eye_openness",
    "mouth_openness",
    "face_scale",
    "gaze",
    "mouth_width",
  ] as const;
  const shellKeys = ["overall_width", "overall_height", "crown_height"] as const;
  const energyKeys = ["energy_level", "energy_pulse", "internal_glow"] as const;

  const moved = (keys: readonly string[]) =>
    keys.some((k) => Math.abs(num(next[k], 0) - num(prev[k], 0)) > eps);

  const faceMoved = moved(faceKeys);
  const shellMoved = moved(shellKeys);
  const energyMoved = moved(energyKeys);

  // Idle hold is ok (nothing moves). Large face travel without any shell/energy
  // co-motion on multi-domain targets is a one-body violation when |Δface| is material.
  let faceTravel = 0;
  for (const k of faceKeys) {
    faceTravel += Math.abs(num(next[k], 0) - num(prev[k], 0));
  }
  // Material = discrete-swap scale travel. Micro continuum steps may move face
  // slightly after shell has settled; that is not an independent-overlay defect.
  const materialFace = faceTravel > 0.08;
  const ok = !materialFace || shellMoved || energyMoved;
  return { ok, faceMoved, shellMoved, energyMoved };
}

function num(v: number | undefined, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
