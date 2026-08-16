/**
 * Policies that keep React off the continuous GSAP animation hot path.
 * Pure helpers — unit-tested without mounting React.
 */

import type { BoundsSnapshot, Rect } from "./GasperVisualBounds";
import type { StageMode } from "./GasperSelectionModel";

/** HUD / life chip sample interval (ms) — not every GSAP frame. */
export const HUD_SAMPLE_MS = 200;

/**
 * Cheap live-input signature — computed WITHOUT getBBox / full bounds stack.
 * Blink, gaze, energy pulse phase, minor relief RMS must not flip this when
 * macro/embodiment/form scales are stable.
 */
export function liveBoundsInputSignature(input: {
  embodimentId: string;
  formWidth?: number;
  formHeight?: number;
  outerRadius?: number;
  verticalCompression?: number;
  shellThickness?: number;
  spectralEnergy?: number;
  energyLevel?: number;
  orbitalPlaneScale?: number;
  faceIsolation?: boolean;
  tool?: string;
  residual?: number;
  crownHeight?: number;
  /** Stage pixel size — required so ResizeObserver Fit is not skipped. */
  stageW?: number;
  stageH?: number;
}): string {
  const q = (n: number | undefined, d = 2) => (n ?? 0).toFixed(d);
  // Coarse stage buckets (~4px) — ignore sub-pixel noise; panel resize still flips
  const sw = Math.round((input.stageW ?? 0) / 4);
  const sh = Math.round((input.stageH ?? 0) / 4);
  return [
    input.embodimentId,
    input.tool ?? "",
    input.faceIsolation ? "1" : "0",
    q(input.formWidth),
    q(input.formHeight),
    q(input.outerRadius),
    q(input.verticalCompression),
    q(input.shellThickness),
    // Coarse energy/spectral (ignore pulse-phase jitter)
    q(input.energyLevel, 1),
    q(input.spectralEnergy, 1),
    q(input.orbitalPlaneScale, 1),
    q(input.crownHeight, 1),
    q(input.residual, 1),
    String(sw),
    String(sh),
  ].join("|");
}

/** Geometry signature from full snapshot (post-recompute). */
export function boundsGeometrySignature(snap: BoundsSnapshot | null): string {
  if (!snap) return "";
  const r = (x: Rect) =>
    `${x.x.toFixed(1)},${x.y.toFixed(1)},${x.width.toFixed(1)},${x.height.toFixed(1)}`;
  // Coarse visual buckets (~4px) so blink/energy pulse does not thrash Fit/React
  const vw = Math.round(snap.visual.width / 4);
  const vh = Math.round(snap.visual.height / 4);
  return [
    snap.embodimentId,
    r(snap.geometry),
    r(snap.safeFit),
    String(vw),
    String(vh),
  ].join("|");
}

/**
 * True when bounds recompute should run (geometry / embodiment / safe envelope changed).
 * Blink, gaze, minor relief RMS alone should NOT flip this if geometry signature stable.
 */
export function boundsSignatureChanged(
  prev: string,
  next: string,
): boolean {
  return prev !== next;
}

export type LivingModePolicy = {
  /** Restrained idle: breath/blink/gaze/subtle energy only. */
  restrainedIdle: boolean;
  /** Auto-run demo microstate sequence (fallback clip). */
  autoSequence: boolean;
  /** Allow Book 004 AnimationPlan drive. */
  allowAnimationPlan: boolean;
  /** Stop sequence when entering this mode. */
  freezeSequence: boolean;
  /**
   * GASPER-007-G: enable eight-state showcase loop transport.
   * PREVIEW may enable; AUTHORING stays restrained without loop.
   */
  eightStateLoop: boolean;
};

/** Mode-correct living behavior (Architect Review + 007-G eight-state). */
export function livingPolicyForStageMode(mode: StageMode): LivingModePolicy {
  switch (mode) {
    case "AUTHORING":
      return {
        restrainedIdle: true,
        autoSequence: false,
        allowAnimationPlan: false,
        freezeSequence: true,
        eightStateLoop: false,
      };
    case "PREVIEW":
      return {
        restrainedIdle: false,
        autoSequence: true,
        allowAnimationPlan: true,
        freezeSequence: false,
        eightStateLoop: true,
      };
    case "RUNTIME":
      return {
        restrainedIdle: false,
        autoSequence: false,
        allowAnimationPlan: true,
        freezeSequence: true,
        eightStateLoop: false,
      };
    case "COMPARE":
      return {
        restrainedIdle: true,
        autoSequence: false,
        allowAnimationPlan: false,
        freezeSequence: true,
        eightStateLoop: false,
      };
    default:
      return {
        restrainedIdle: true,
        autoSequence: false,
        allowAnimationPlan: false,
        freezeSequence: true,
        eightStateLoop: false,
      };
  }
}

/** Throttle helper: returns true if enough time elapsed since last sample. */
export function shouldSampleHud(
  nowMs: number,
  lastSampleMs: number,
  intervalMs = HUD_SAMPLE_MS,
): boolean {
  // First sample (never sampled) always allowed
  if (lastSampleMs <= 0) return true;
  return nowMs - lastSampleMs >= intervalMs;
}
