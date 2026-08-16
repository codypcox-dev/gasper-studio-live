/**
 * Deterministic Singularity + accretion geometry (Lane R2).
 * Modules only — does not patch shared renderer roots.
 */

import type {
  AccretionPlaneGeometry,
  SingularityGenerationInput,
  SingularityGeometryState,
} from "./types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / Math.max(1e-9, e1 - e0));
  return t * t * (3 - 2 * t);
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number, rot: number): string {
  // Approximate rotated ellipse as SVG path in body-local coords (scale later)
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const pts: string[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const lx = Math.cos(a) * rx;
    const ly = Math.sin(a) * ry;
    const x = cx + lx * c - ly * s;
    const y = cy + lx * s + ly * c;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(4)} ${y.toFixed(4)}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

function fnv(parts: number[]): string {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const q = Math.round(p * 1e6);
    h = Math.imul(h ^ (q & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 8) & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 16) & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 24) & 0xff), 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function plane(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  opacity: number,
  attached: boolean,
): AccretionPlaneGeometry {
  return {
    cx,
    cy,
    rx,
    ry,
    rotationRad: rot,
    opacity,
    pathD: opacity > 0.01 ? ellipsePath(cx, cy, rx, ry, rot) : "",
    attached,
  };
}

/**
 * Evaluate singularity geometry for a given mix / energy / motion.
 * Presence (mix=0) yields near-zero void and empty accretion (identity-safe).
 */
export function evaluateSingularityGeometry(
  input: SingularityGenerationInput,
): SingularityGeometryState {
  const mix = clamp01(input.mix);
  const t = input.timeSeconds;
  const energy = clamp01(input.energy);
  const motion = clamp01(input.motion);
  const seed = input.seed | 0;

  // Soft entry so reverse/interrupt don't flash layers
  const enter = smoothstep(0.05, 0.55, mix);
  const deep = smoothstep(0.4, 1, mix);

  const pulse =
    enter *
    (0.5 +
      0.5 *
        Math.sin(t * (1.2 + motion * 0.8) + seed * 0.01) *
        (0.35 + energy * 0.4));

  const centerVoid = enter * (0.22 + deep * 0.55 + energy * 0.12);
  const horizonRadius = enter * (0.38 + deep * 0.28 + pulse * 0.04);
  const horizonPulse = pulse;
  const gravityWellDepth = enter * (0.3 + deep * 0.55 + energy * 0.15);
  const shellCompression = enter * (0.12 + deep * 0.38);
  const verticalCompression = enter * (0.08 + deep * 0.32 + motion * 0.05);
  const spectralEnergy = enter * (0.35 + energy * 0.5 + deep * 0.15);
  const lensingIntensity = enter * (0.2 + deep * 0.55 + energy * 0.15);
  const orbitalPlaneOrientation =
    enter * (0.15 + Math.sin(t * 0.35 + seed * 0.02) * 0.08 * motion);

  // Back plane larger / dimmer; front plane tighter / brighter — always attached when enter>0
  const attached = enter > 0.02;
  const back = plane(
    0,
    0.02 * verticalCompression,
    0.72 * (0.85 + deep * 0.2),
    0.22 * (1 - verticalCompression * 0.35),
    orbitalPlaneOrientation * 0.6,
    enter * (0.35 + spectralEnergy * 0.35),
    attached,
  );
  const front = plane(
    0,
    -0.01,
    0.55 * (0.9 + deep * 0.15),
    0.16 * (1 - verticalCompression * 0.25),
    -orbitalPlaneOrientation * 0.4,
    enter * (0.45 + spectralEnergy * 0.4),
    attached,
  );

  const eventHorizonPath =
    enter > 0.02
      ? ellipsePath(0, 0, horizonRadius, horizonRadius * (1 - verticalCompression * 0.2), 0)
      : "";

  const faceSuppressed = enter > 0.72;

  const hash = fnv([
    centerVoid,
    horizonRadius,
    horizonPulse,
    gravityWellDepth,
    shellCompression,
    verticalCompression,
    spectralEnergy,
    lensingIntensity,
    orbitalPlaneOrientation,
    back.rx,
    front.rx,
    back.opacity,
    front.opacity,
    mix,
  ]);

  return {
    centerVoid,
    eventHorizon: {
      radius: horizonRadius,
      pulse: horizonPulse,
      opacity: enter * (0.5 + pulse * 0.3),
      pathD: eventHorizonPath,
    },
    backAccretion: back,
    frontAccretion: front,
    accretionGlow: enter * (0.25 + spectralEnergy * 0.5),
    gravityWellDepth,
    shellCompression,
    verticalCompression,
    spectralEnergy,
    horizonRadius,
    horizonPulse,
    orbitalPlaneOrientation,
    lensingIntensity,
    faceSuppressed,
    layerFlashRisk: false,
    hash,
    mix,
  };
}

/** Transition helper: linear mix with optional reverse. */
export function singularityTransitionMix(
  from: SingularityGenerationInput["from"],
  to: SingularityGenerationInput["to"],
  progress01: number,
  reverse = false,
): number {
  const p = reverse ? 1 - clamp01(progress01) : clamp01(progress01);
  const fromSing = from === "singularity" ? 1 : 0;
  const toSing = to === "singularity" ? 1 : fromSing;
  // Presence → Singularity: 0→1; Singularity → Presence: 1→0; Singularity hold: 1
  if (from === "singularity" && to === "singularity") return 1;
  if (from === "presence" && to === "singularity") return p;
  if (from === "singularity" && to === "presence") return 1 - p;
  if (from === "singularity" && to === "dormant-orbit") return 1 - p * 0.85;
  if (from === "dormant-orbit" && to === "singularity") return p * 0.9;
  return fromSing * (1 - p) + toSing * p;
}
