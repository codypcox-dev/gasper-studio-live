/**
 * Authoritative live visual-bounds service.
 * Fit uses these bounds ΓÇö never a fixed SVG viewBox or Presence-only box alone.
 */

import {
  applyHostTransformToRect,
  computeHostTransform,
} from "./GasperHostTransform";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BoundsSnapshot = {
  geometry: Rect;
  visual: Rect;
  manipulation: Rect;
  /** Handle/debug overlays — excluded from Auto Fit. */
  overlay?: Rect | null;
  safeFit: Rect;
  /** Internal-energy / optical volume envelope (subset of visual). */
  energyEnvelope: Rect;
  /** Tail / orbit / spectral field envelope (Comet, Singularity disc, etc.). */
  tailOrbitEnvelope: Rect;
  /** Fraction of larger visual axis used as margin (0.12–0.16). */
  marginFraction: number;
  embodimentId: string;
};

/** Content-space reference: SVG viewBox 0 0 240 220 is the untransformed canvas. */
export const CONTENT_VIEWBOX = Object.freeze({
  x: 0,
  y: 0,
  width: 240,
  height: 220,
});

export const SAFE_MARGIN_MIN = 0.12;
export const SAFE_MARGIN_MAX = 0.16;
export const SAFE_MARGIN_DEFAULT = 0.14;

export function rectUnion(a: Rect, b: Rect): Rect {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function expandRect(r: Rect, fraction: number): Rect {
  const mx = r.width * fraction;
  const my = r.height * fraction;
  // Use larger-axis-based margin when axes differ strongly
  const m = Math.max(mx, my);
  return {
    x: r.x - m,
    y: r.y - m,
    width: r.width + 2 * m,
    height: r.height + 2 * m,
  };
}

export function containsRect(outer: Rect, inner: Rect, eps = 0.5): boolean {
  return (
    inner.x >= outer.x - eps &&
    inner.y >= outer.y - eps &&
    inner.x + inner.width <= outer.x + outer.width + eps &&
    inner.y + inner.height <= outer.y + outer.height + eps
  );
}

/**
 * Embodiment-aware content-space geometry estimates.
 * Derived from FormMaster profile traits (sx/sy/cx/cy/disc/horizon) ΓÇö not arbitrary CSS per-embodiment scale.
 */
export type EmbodimentBoundsHint = {
  /** Multipliers on viewBox for geometry (mass silhouette). */
  geoScaleX: number;
  geoScaleY: number;
  geoOffsetX: number;
  geoOffsetY: number;
  /** Extra visual pad for glow/energy/tail (fraction of geo size). */
  visualPad: number;
  /** Extra manipulation pad for handles outside mass. */
  manipPad: number;
};

const EMBODIMENT_HINTS: Record<string, EmbodimentBoundsHint> = {
  presence: {
    geoScaleX: 1.0,
    geoScaleY: 1.02,
    geoOffsetX: 0,
    geoOffsetY: 0,
    visualPad: 0.08,
    // GASPER-007-G: tighter manip pad so form UV handles land nearer shell mass
    manipPad: 0.08,
  },
  singularity: {
    // Compressed seed + disc/horizon envelope ΓÇö taller optical field
    geoScaleX: 0.72,
    geoScaleY: 0.68,
    geoOffsetX: 0,
    geoOffsetY: 8,
    visualPad: 0.28,
    manipPad: 0.32,
  },
  "dormant-orbit": {
    geoScaleX: 0.95,
    geoScaleY: 0.9,
    geoOffsetX: 0,
    geoOffsetY: 4,
    visualPad: 0.22,
    manipPad: 0.26,
  },
  "low-orbit": {
    geoScaleX: 1.08,
    geoScaleY: 0.95,
    geoOffsetX: 0,
    geoOffsetY: 6,
    visualPad: 0.14,
    manipPad: 0.18,
  },
  comet: {
    // Tail extends content-right / lower
    geoScaleX: 1.15,
    geoScaleY: 1.0,
    geoOffsetX: 18,
    geoOffsetY: 6,
    visualPad: 0.26,
    manipPad: 0.3,
  },
  wispwalker: {
    geoScaleX: 0.95,
    geoScaleY: 1.12,
    geoOffsetX: 0,
    geoOffsetY: -4,
    visualPad: 0.12,
    manipPad: 0.16,
  },
  halo: {
    geoScaleX: 1.05,
    geoScaleY: 1.05,
    geoOffsetX: 0,
    geoOffsetY: 0,
    visualPad: 0.2,
    manipPad: 0.24,
  },
  lantern: {
    geoScaleX: 0.98,
    geoScaleY: 1.08,
    geoOffsetX: 0,
    geoOffsetY: -6,
    visualPad: 0.14,
    manipPad: 0.18,
  },
};

export function embodimentHint(id: string): EmbodimentBoundsHint {
  return EMBODIMENT_HINTS[id] ?? EMBODIMENT_HINTS.presence;
}

export type BoundsInput = {
  embodimentId: string;
  /** Manual macro scales (from domain state). */
  formWidth?: number;
  formHeight?: number;
  crownHeight?: number;
  lowerBodyFullness?: number;
  groundFlattening?: number;
  residual?: number;
  energyLevel?: number;
  reliefAmplitude?: number;
  /** Singularity / envelope live values (affect visual + safe fit). */
  outerRadius?: number;
  verticalCompression?: number;
  spectralEnergy?: number;
  orbitalPlaneScale?: number;
  horizonRadius?: number;
  shellThickness?: number;
  centerOfMassY?: number;
  horizonVerticalPosition?: number;
  /**
   * Optional raw layer getBBox (unscaled). When set, host transform from the
   * same computeHostTransform math as the mixer is applied ΓÇö shell/fullness/etc.
   * still grow Fit. Pass `measuredAlreadyHostScaled: true` if the rect already
   * includes host scale (measureContentGeometry output).
   */
  measuredGeometry?: Rect | null;
  measuredAlreadyHostScaled?: boolean;
  /** Active handle points in content space (for manipulation bounds). */
  handlePoints?: Array<{ x: number; y: number }>;
  faceIsolation?: boolean;
  marginFraction?: number;
};

/**
 * Compute full bounds stack in **content / world space** (viewBox units).
 */
export function computeBoundsSnapshot(input: BoundsInput): BoundsSnapshot {
  const hint = embodimentHint(input.embodimentId);
  const fw = input.formWidth ?? 1;
  const fh = input.formHeight ?? 1;
  const crown = input.crownHeight ?? 0;
  const energy = input.energyLevel ?? 0.5;
  const relief = input.reliefAmplitude ?? 0.4;
  const margin = Math.min(
    SAFE_MARGIN_MAX,
    Math.max(SAFE_MARGIN_MIN, input.marginFraction ?? SAFE_MARGIN_DEFAULT),
  );

  const outerR = input.outerRadius ?? 1;
  const vComp = input.verticalCompression ?? 0;
  const spectral = input.spectralEnergy ?? 0.5;
  const orbitScale = input.orbitalPlaneScale ?? 1;
  const horizonR = input.horizonRadius ?? 0.5;
  const shell = input.shellThickness ?? 0.4;
  const comY = input.centerOfMassY ?? 0;
  const host = computeHostTransform({
    overall_width: fw,
    overall_height: fh,
    crown_height: crown,
    lower_body_fullness: input.lowerBodyFullness ?? 1,
    ground_flattening: input.groundFlattening ?? 0,
    singularity_outer_radius: outerR,
    singularity_vertical_compression: vComp,
    shell_thickness: shell,
    orbital_plane_scale: orbitScale,
    center_of_mass_y: comY,
    horizon_vertical_position: input.horizonVerticalPosition ?? 0,
    residual: input.residual ?? 0,
  });

  let geometry: Rect;
  if (input.measuredGeometry && input.measuredGeometry.width > 1) {
    if (input.measuredAlreadyHostScaled) {
      // measureContentGeometry already applied full host transform
      geometry = { ...input.measuredGeometry };
    } else {
      // Raw getBBox ΓÇö apply same host sx/sy/crownLift as mixer
      geometry = applyHostTransformToRect(input.measuredGeometry, host);
    }
  } else {
    const base = CONTENT_VIEWBOX;
    const cx = base.x + base.width / 2 + hint.geoOffsetX;
    const cy =
      base.y +
      base.height / 2 +
      hint.geoOffsetY +
      host.crownLift;
    const w = base.width * hint.geoScaleX * host.sx;
    const h = base.height * hint.geoScaleY * host.sy;
    geometry = {
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
    };
  }

  // Named envelopes (Book 005 ┬º15.3) ΓÇö feed visual / safe-fit stack
  const energyEnvelope = expandRect(
    geometry,
    0.06 + energy * 0.12 + spectral * 0.05,
  );
  // Comet tail / Singularity orbital field extend beyond mass (hint offsets)
  let tailOrbitEnvelope = expandRect(
    geometry,
    0.08 + spectral * 0.14 + horizonR * 0.08 + orbitScale * 0.04,
  );
  if (input.embodimentId === "comet") {
    // Tail extends content-right / lower (matches embodiment hint offset)
    tailOrbitEnvelope = rectUnion(tailOrbitEnvelope, {
      x: geometry.x + geometry.width * 0.35,
      y: geometry.y + geometry.height * 0.25,
      width: geometry.width * 0.85,
      height: geometry.height * 0.7,
    });
  } else if (input.embodimentId === "singularity") {
    tailOrbitEnvelope = expandRect(
      geometry,
      0.14 + spectral * 0.12 + horizonR * 0.1 + orbitScale * 0.06,
    );
  } else if (
    input.embodimentId === "dormant-orbit" ||
    input.embodimentId === "halo"
  ) {
    tailOrbitEnvelope = expandRect(geometry, 0.12 + spectral * 0.08);
  }

  // Visual: geometry + energy + tail/orbit + relief + shell pad
  // shell thickness also contributes optical pad even when geometry is measured
  const visualPad =
    hint.visualPad +
    energy * 0.08 +
    relief * 0.05 +
    spectral * 0.1 +
    horizonR * 0.06 +
    shell * 0.03 +
    (input.faceIsolation ? 0.06 : 0);
  let visual = expandRect(geometry, visualPad);
  visual = rectUnion(visual, energyEnvelope);
  visual = rectUnion(visual, tailOrbitEnvelope);

  // Manipulation: visual + handle pads (authoring only — never Auto Fit source)
  let manipulation = expandRect(visual, hint.manipPad);
  let overlay: Rect | null = null;
  if (input.handlePoints?.length) {
    for (const p of input.handlePoints) {
      const pad = 12;
      const handleRect = {
        x: p.x - pad,
        y: p.y - pad,
        width: pad * 2,
        height: pad * 2,
      };
      manipulation = rectUnion(manipulation, handleRect);
      overlay = overlay ? rectUnion(overlay, handleRect) : handleRect;
    }
  }

  // GASPER-007-H / G: Auto Fit uses optical visual + margin only (handles excluded).
  const safeFit = expandRect(visual, margin);

  return {
    geometry,
    visual,
    manipulation,
    overlay,
    safeFit,
    energyEnvelope,
    tailOrbitEnvelope,
    marginFraction: margin,
    embodimentId: input.embodimentId,
  };
}

/**
 * Camera parameters so `safeFit` is fully inside the stage viewport.
 * Content layer uses: translate(panX,panY) scale(zoom) with origin at stage center.
 * Content point (cx,cy) maps to stage: (cx - viewBoxW/2)*zoom + panX + stageW/2, etc.
 */
/**
 * Wave R5 ΓÇö which envelope drives Fit.
 * Character Fit uses mass geometry (target ~45ΓÇô65% of Dais height for Presence).
 * Effects Fit uses full optical / safe envelope.
 */
export type FitIntent =
  | "character"
  | "character-handles"
  | "effects"
  | "selection";

export function rectForFitIntent(
  snap: BoundsSnapshot,
  intent: FitIntent,
): Rect {
  switch (intent) {
    case "character":
      // Mass only + small breathing room ΓÇö not full tail/orbit/manipulation pad
      return expandRect(snap.geometry, 0.1);
    case "character-handles":
      return expandRect(snap.manipulation, 0.04);
    case "selection":
      return expandRect(snap.manipulation, 0.06);
    case "effects":
    default:
      return snap.safeFit;
  }
}

/** Geometry height as fraction of stage after a candidate zoom (for gate tests). */
export function characterHeightFraction(
  stageH: number,
  geometry: Rect,
  zoom: number,
): number {
  return (geometry.height * zoom) / Math.max(1, stageH);
}

/**
 * Presence Character Fit targets ~55ΓÇô70% of usable stage height (Book 005 / product gate).
 * Effects Fit fills the stage with the safe envelope (no targetHeightFraction).
 */
/**
 * Target mass height as fraction of stage.
 * Host form scale (~1.15ΓÇô1.3) multiplies on-screen size, so the pre-host target
 * is set near 0.50 to land Presence in the product 55ΓÇô70% band after host scale.
 */
export const CHARACTER_FIT_HEIGHT_FRACTION = 0.5;
/** Never let the fitted envelope exceed this fraction of stage (prevents stage clip). */
export const FIT_MAX_OCCUPY_FRACTION = 0.88;

export function fitCameraFromSafeBounds(
  stageW: number,
  stageH: number,
  safe: Rect,
  opts?: {
    minZoom?: number;
    maxZoom?: number;
    /**
     * When set (Character Fit), scale so massHeight (or safe.height) * zoom
     * Γëê stageH * fraction. Then clamp so the safe envelope still fits inside
     * the stage (no overflow clip of crown/body/tail).
     */
    targetHeightFraction?: number;
    /**
     * Mass silhouette height in content units (geometry.height). When provided
     * with targetHeightFraction, zoom is derived from mass ΓÇö not padded envelope.
     */
    massHeight?: number;
    /** Cap rendered safe size as fraction of stage (default FIT_MAX_OCCUPY_FRACTION). */
    maxOccupyFraction?: number;
  },
): {
  zoom: number;
  panX: number;
  panY: number;
  fitPercent: number;
  /** True when stage/content geometry is unusable ΓÇö caller must not mark Fit ready. */
  invalid?: boolean;
  /** On-screen height of `safe` as fraction of stage after zoom (for gates). */
  heightFraction?: number;
} {
  const minZ = opts?.minZoom ?? 0.25;
  const maxZ = opts?.maxZoom ?? 4;
  // Refuse authoritative Fit against zero / transient stage (prevents 25% conceal)
  if (
    !Number.isFinite(stageW) ||
    !Number.isFinite(stageH) ||
    stageW < 80 ||
    stageH < 80 ||
    !safe ||
    !Number.isFinite(safe.width) ||
    !Number.isFinite(safe.height) ||
    safe.width < 1 ||
    safe.height < 1
  ) {
    return {
      zoom: 1,
      panX: 0,
      panY: 0,
      fitPercent: 100,
      invalid: true,
    };
  }

  // Safe rect is in content space; center of content system is (120, 110) for 240├ù220
  const contentOriginX = CONTENT_VIEWBOX.width / 2;
  const contentOriginY = CONTENT_VIEWBOX.height / 2;

  const relW = safe.width;
  const relH = safe.height;

  // Max zoom that keeps the envelope fully inside the stage
  const fitZoomX = stageW / Math.max(1, relW);
  const fitZoomY = stageH / Math.max(1, relH);
  const maxFitZoom = Math.min(fitZoomX, fitZoomY);
  const maxOccupy = opts?.maxOccupyFraction ?? FIT_MAX_OCCUPY_FRACTION;
  const occupyCapZoom = (stageH * maxOccupy) / Math.max(1, relH);

  let zoom: number;
  let rawZoom: number;
  if (
    typeof opts?.targetHeightFraction === "number" &&
    opts.targetHeightFraction > 0
  ) {
    // Character Fit: land mass near product 55ΓÇô70% band after host CSS scale.
    // Caller may pass 0.48ΓÇô0.62; we clamp to a sane authoring range.
    const target = Math.min(0.7, Math.max(0.45, opts.targetHeightFraction));
    const massH =
      typeof opts.massHeight === "number" && opts.massHeight > 1
        ? opts.massHeight
        : relH;
    rawZoom = (stageH * target) / Math.max(1, massH);
    // Never overflow stage or exceed occupy cap on the safe envelope
    zoom = Math.min(rawZoom, maxFitZoom, occupyCapZoom);
  } else {
    // Effects / legacy: fill stage with safe rect
    rawZoom = maxFitZoom;
    zoom = maxFitZoom;
  }
  zoom = Math.min(maxZ, Math.max(minZ, zoom));

  // Center of safe rect in content space
  const safeCx = safe.x + safe.width / 2;
  const safeCy = safe.y + safe.height / 2;
  // After scale about content origin, offset so safe center lands at stage center
  const panX = -(safeCx - contentOriginX) * zoom;
  const panY = -(safeCy - contentOriginY) * zoom;

  // Report mass height fraction when massHeight provided; else safe height fraction
  const reportH =
    typeof opts?.massHeight === "number" && opts.massHeight > 1
      ? opts.massHeight
      : relH;
  const heightFraction = (reportH * zoom) / Math.max(1, stageH);

  // Min-zoom clamp from nonsensical raw ratio is still invalid
  const invalid =
    !Number.isFinite(rawZoom) ||
    rawZoom <= 0 ||
    (rawZoom < minZ * 0.25 && zoom === minZ);

  return {
    zoom,
    panX,
    panY,
    fitPercent: Math.round(zoom * 100),
    invalid: invalid || undefined,
    heightFraction,
  };
}

/**
 * Whether visual bounds (in content space) are fully visible under camera.
 * Stage mapping: screen = stageCenter + pan + (content - contentOrigin) * zoom
 */
export function visualFullyVisible(
  stageW: number,
  stageH: number,
  visual: Rect,
  zoom: number,
  panX: number,
  panY: number,
  eps = 1,
): boolean {
  const ox = CONTENT_VIEWBOX.width / 2;
  const oy = CONTENT_VIEWBOX.height / 2;
  const corners = [
    { x: visual.x, y: visual.y },
    { x: visual.x + visual.width, y: visual.y },
    { x: visual.x, y: visual.y + visual.height },
    { x: visual.x + visual.width, y: visual.y + visual.height },
  ];
  for (const c of corners) {
    const sx = stageW / 2 + panX + (c.x - ox) * zoom;
    const sy = stageH / 2 + panY + (c.y - oy) * zoom;
    if (sx < -eps || sy < -eps || sx > stageW + eps || sy > stageH + eps) {
      return false;
    }
  }
  return true;
}

export class GasperVisualBoundsService {
  private last: BoundsSnapshot | null = null;
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  recompute(input: BoundsInput): BoundsSnapshot {
    this.last = computeBoundsSnapshot(input);
    this.emit();
    return this.last;
  }

  getGeometryBounds(): Rect | null {
    return this.last ? { ...this.last.geometry } : null;
  }

  getVisualBounds(): Rect | null {
    return this.last ? { ...this.last.visual } : null;
  }

  getManipulationBounds(): Rect | null {
    return this.last ? { ...this.last.manipulation } : null;
  }

  getSafeFitBounds(): Rect | null {
    return this.last ? { ...this.last.safeFit } : null;
  }

  getEnergyEnvelope(): Rect | null {
    return this.last ? { ...this.last.energyEnvelope } : null;
  }

  getTailOrbitEnvelope(): Rect | null {
    return this.last ? { ...this.last.tailOrbitEnvelope } : null;
  }

  getSnapshot(): BoundsSnapshot | null {
    return this.last
      ? {
          ...this.last,
          geometry: { ...this.last.geometry },
          visual: { ...this.last.visual },
          manipulation: { ...this.last.manipulation },
          safeFit: { ...this.last.safeFit },
          energyEnvelope: { ...this.last.energyEnvelope },
          tailOrbitEnvelope: { ...this.last.tailOrbitEnvelope },
        }
      : null;
  }
}
