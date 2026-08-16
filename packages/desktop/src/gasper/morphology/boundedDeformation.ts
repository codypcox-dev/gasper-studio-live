/**
 * Physically coherent bounded deformation for the production Dais.
 * Multi-domain morph only — contour-only / host-scale-only rejected.
 */

import {
  applyVolumeConservation,
  assessMorphologyCompleteness,
  clampChannel,
  clampChannelMap,
  getChannelBound,
  CHANNEL_BOUNDS,
  type MorphologyCompleteness,
} from "../../../../shared/src/gasper/index";
import type { DomainScalarMap } from "../GasperDomainState";
import { MORPHOLOGY_DOMAINS, domainForBinding } from "../GasperMorphologyDomains";

export type BoundedDeformResult = {
  ok: boolean;
  channels: DomainScalarMap;
  completeness: MorphologyCompleteness;
  clampedKeys: string[];
  error?: string;
};

/**
 * Apply a deformation map with hard physical bounds + volume conservation.
 * Rejects incomplete morphs (contour-only / host-scale-only) when strict.
 */
export function applyBoundedDeformation(
  channels: DomainScalarMap,
  options?: { strictCompleteness?: boolean; mode?: "hard" | "soft" },
): BoundedDeformResult {
  const mode = options?.mode ?? "hard";
  const clampedKeys: string[] = [];
  const pre: DomainScalarMap = {};
  for (const [id, value] of Object.entries(channels)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const next = clampChannel(id, value);
    if (next !== value) clampedKeys.push(id);
    pre[id] = next;
  }
  const conserved = applyVolumeConservation(clampChannelMap(pre, mode));
  const completeness = assessMorphologyCompleteness(conserved);
  if (options?.strictCompleteness && !completeness.ok) {
    return {
      ok: false,
      channels: conserved,
      completeness,
      clampedKeys,
      error: completeness.hostScaleOnly
        ? "host-scale-only morph is invalid as complete morphology"
        : completeness.contourOnly
          ? "contour-only morph is invalid as complete morphology"
          : `incomplete morph; missing domains: ${completeness.missingRequired.join(",")}`,
    };
  }
  return {
    ok: true,
    channels: conserved,
    completeness,
    clampedKeys,
  };
}

/** Interpolate two multi-domain poses with bounds enforcement. */
export function interpolateBounded(
  from: DomainScalarMap,
  to: DomainScalarMap,
  t: number,
  options?: { strictCompleteness?: boolean },
): BoundedDeformResult {
  const mix = Math.max(0, Math.min(1, t));
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  const blended: DomainScalarMap = {};
  for (const k of keys) {
    const a = from[k];
    const b = to[k];
    if (typeof a === "number" && typeof b === "number") {
      blended[k] = a + (b - a) * mix;
    } else if (typeof b === "number") {
      blended[k] = b;
    } else if (typeof a === "number") {
      blended[k] = a;
    }
  }
  return applyBoundedDeformation(blended, options);
}

export function morphologyDomainCoverage(channels: DomainScalarMap): {
  domains: string[];
  bindingDomainHits: Record<string, number>;
  requiredGsapTracks: string[];
} {
  const bindingDomainHits: Record<string, number> = {};
  for (const id of Object.keys(channels)) {
    const d = domainForBinding(id);
    if (d) bindingDomainHits[d] = (bindingDomainHits[d] ?? 0) + 1;
  }
  return {
    domains: Object.keys(bindingDomainHits).sort(),
    bindingDomainHits,
    requiredGsapTracks: MORPHOLOGY_DOMAINS.map((d) => d.gsapTrack),
  };
}

export function listMorphologyChannelBounds() {
  return CHANNEL_BOUNDS.map((b) => ({ ...b }));
}

export function describeBound(id: string) {
  return getChannelBound(id);
}
