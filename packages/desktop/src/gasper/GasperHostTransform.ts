/**
 * Single authoritative host transform (scale + vertical lift) from live bindings.
 * Used by GasperRenderMixer, measureContentGeometry, and bounds estimates so Fit
 * never underestimates the live host envelope relative to the mixer.
 */

export type HostTransformBindings = {
  overall_width?: number;
  overall_height?: number;
  crown_height?: number;
  lower_body_fullness?: number;
  ground_flattening?: number;
  singularity_outer_radius?: number;
  singularity_vertical_compression?: number;
  shell_thickness?: number;
  orbital_plane_scale?: number;
  center_of_mass_y?: number;
  horizon_vertical_position?: number;
  /** dynamics.residual when available */
  residual?: number;
};

export type HostTransform = {
  /** CSS scale X applied to .gasper-svg-host */
  sx: number;
  /** CSS scale Y applied to .gasper-svg-host */
  sy: number;
  /** Vertical translate component in px (content space offset) */
  crownLift: number;
};

/**
 * Exact same math as GasperRenderMixer host style.transform scale/translate.
 */
export function computeHostTransform(
  b: HostTransformBindings,
): HostTransform {
  const outerR = b.singularity_outer_radius ?? 1;
  const orbit = b.orbital_plane_scale ?? 1;
  const vComp = b.singularity_vertical_compression ?? 0;
  const shell = b.shell_thickness ?? 0.4;
  const residual = b.residual ?? 0;
  const sx =
    (b.overall_width ?? 1) * outerR * (0.92 + orbit * 0.08);
  const sy =
    (b.overall_height ?? 1) *
    (1 - (b.ground_flattening ?? 0) * 0.12) *
    (0.92 + (b.lower_body_fullness ?? 1) * 0.08) *
    (1 + residual * 0.08) *
    (1 - vComp * 0.55) *
    (1 + shell * 0.04);
  const crownLift =
    -(b.crown_height ?? 0) * 12 +
    (b.center_of_mass_y ?? 0) * 10 +
    (b.horizon_vertical_position ?? 0) * 6;
  return { sx, sy, crownLift };
}

/**
 * Expand an unscaled content-space bbox by host sx/sy around center, then
 * shift by crownLift (matches post-transform visual mass).
 */
export function applyHostTransformToRect(
  raw: { x: number; y: number; width: number; height: number },
  host: HostTransform,
): { x: number; y: number; width: number; height: number } {
  const cx = raw.x + raw.width / 2;
  const cy = raw.y + raw.height / 2 + host.crownLift;
  const hw = (raw.width / 2) * Math.max(0.2, host.sx);
  const hh = (raw.height / 2) * Math.max(0.2, host.sy);
  return {
    x: cx - hw,
    y: cy - hh,
    width: hw * 2,
    height: hh * 2,
  };
}
