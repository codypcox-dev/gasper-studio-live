/**
 * Dual-renderer contract — no React, no AgentBridge.
 * Both backends consume the same canonical semantic state.
 */

export type RendererAuthorityClass = "legacy-authority" | "native-candidate";

export type GasperEmbodimentId = string;
export type GasperExpressionId = string;

export type GasperResolvedPose = Record<string, number>;

export type GasperCanonicalState = {
  embodimentId: GasperEmbodimentId;
  expressionId: GasperExpressionId;
  pose: GasperResolvedPose;
  revision?: number;
  documentId?: string;
};

export type DeterministicRendererClock = {
  /** Fixed time in ms for procedural / living systems */
  timeMs: number;
  /** Deterministic seed for any PRNG */
  seed: number;
};

export type RenderContext = {
  clock?: DeterministicRendererClock;
  livingSuspended?: boolean;
};

export type RendererMountOptions = {
  /** Prefer authority vs candidate when composing dual lab */
  role?: RendererAuthorityClass;
  deterministic?: boolean;
};

export type RendererMountResult = {
  ok: boolean;
  host: HTMLElement;
  svgRoot: SVGSVGElement | null;
  error?: string;
};

export type RenderResult = {
  ok: boolean;
  error?: string;
  changed?: string[];
};

export type RendererLayerManifest = {
  rendererId: string;
  rendererVersion: string;
  authorityClass: RendererAuthorityClass;
  elementIds: string[];
  populatedPathCount: number;
  emptyPathCount: number;
  materialLayers: string[];
  filterIds: string[];
  gradientIds: string[];
  faceBounds: { x: number; y: number; width: number; height: number } | null;
  bodyBounds: { x: number; y: number; width: number; height: number } | null;
  visibleBounds: { x: number; y: number; width: number; height: number } | null;
};

export type RendererInspection = {
  rendererId: string;
  rendererVersion: string;
  authorityClass: RendererAuthorityClass;
  mounted: boolean;
  embodimentId: string | null;
  expressionId: string | null;
  livingSuspended: boolean;
  pathStats: { total: number; populated: number; empty: number };
  facePresent: boolean;
  notes: string[];
};

export interface GasperRenderer {
  readonly rendererId: string;
  readonly rendererVersion: string;
  readonly authorityClass: RendererAuthorityClass;

  mount(
    host: HTMLElement,
    options?: RendererMountOptions,
  ): Promise<RendererMountResult>;

  applyCanonicalState(
    state: GasperCanonicalState,
    context?: RenderContext,
  ): RenderResult;

  applyPose(pose: GasperResolvedPose, context?: RenderContext): RenderResult;

  setEmbodiment(
    embodiment: GasperEmbodimentId,
    context?: RenderContext,
  ): RenderResult;

  setExpression(
    expression: GasperExpressionId,
    context?: RenderContext,
  ): RenderResult;

  setDeterministicClock(clock: DeterministicRendererClock): void;

  inspect(): RendererInspection;

  captureLayerManifest(): RendererLayerManifest;

  suspendLivingMotion(): void;
  resumeLivingMotion(): void;

  destroy(): void;
}

/** Shared SVG path population stats for equivalence lab. */
export function measureSvgPathStats(svg: SVGSVGElement | null): {
  total: number;
  populated: number;
  empty: number;
  facePresent: boolean;
} {
  if (!svg) return { total: 0, populated: 0, empty: 0, facePresent: false };
  const paths = [...svg.querySelectorAll("path")];
  let populated = 0;
  let empty = 0;
  for (const p of paths) {
    const d = p.getAttribute("d") || "";
    if (d.trim().length > 8) populated += 1;
    else empty += 1;
  }
  const eyeL = svg.querySelector("#eyeL, #eyeLBloom, path#eyeL");
  const mouth = svg.querySelector("#mouth, #mouthBloom, path#mouth");
  let facePresent = false;
  try {
    if (eyeL && "getBBox" in eyeL) {
      const b = (eyeL as SVGGraphicsElement).getBBox();
      facePresent = b.width > 0.5 && b.height > 0.5;
    }
    if (mouth && "getBBox" in mouth) {
      const b = (mouth as SVGGraphicsElement).getBBox();
      facePresent = facePresent || (b.width > 0.5 && b.height > 0.5);
    }
  } catch {
    facePresent = Boolean(eyeL || mouth);
  }
  return { total: paths.length, populated, empty, facePresent };
}

export function boundsOf(el: Element | null): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (!el || !("getBBox" in el)) return null;
  try {
    const b = (el as SVGGraphicsElement).getBBox();
    if (b.width <= 0 && b.height <= 0) return null;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  } catch {
    return null;
  }
}
