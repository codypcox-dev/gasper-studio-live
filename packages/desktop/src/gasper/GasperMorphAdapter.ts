/**
 * Wave R3 — native embodiment morph adapter (no FormMaster setMorphPreview).
 * Interpolates profile traits + domain bindings; SVG projection via EmbodimentProjector.
 *
 * Morphology-bound topology path (oath-correction-r2): Presence / Comet /
 * Singularity / Dormant Maintain / Wake evaluate through exclusive geometry
 * snapshots so specialty layers never dual-author contour/topology.
 */

import {
  getEmbodimentProfile,
  type GasperEmbodimentProfile,
} from "./GasperRigDefinition";
import { projectEmbodimentOntoSvg } from "./GasperEmbodimentProjector";
import {
  buildExclusiveTopologyAuthority,
  type ExclusiveTopologyAuthority,
} from "./GasperTopologyLock";
import {
  domainBindingsFromSnapshot,
  evaluateBoundMorphologyGeometry,
  toMorphologyEmbodimentId,
  type VisibleGeometrySnapshot,
} from "./morphology";

export type MorphState = {
  from: string;
  to: string;
  mix: number;
};

export type MorphFrameReport = {
  from: string;
  to: string;
  mix: number;
  layersTouched: string[];
  domains: Record<string, number>;
};

/** Topology-bound morph report with exclusive geometry snapshot. */
export type BoundMorphFrameReport = MorphFrameReport & {
  snapshot: VisibleGeometrySnapshot;
  topologyAuthority: ExclusiveTopologyAuthority;
  exclusive: boolean;
};

/**
 * Apply morph mix on SVG + return domain bindings for mixer.
 * mix=0 → pure from, mix=1 → pure to.
 */
export function applyMorphFrame(
  svg: SVGSVGElement,
  fromId: string,
  toId: string,
  mix: number,
): MorphFrameReport {
  const from = getEmbodimentProfile(fromId);
  const to = getEmbodimentProfile(toId);
  if (!from || !to) {
    throw new Error(`Morph unknown profile: ${fromId} → ${toId}`);
  }
  const m = Math.max(0, Math.min(1, mix));
  const report = projectEmbodimentOntoSvg(svg, toId, m, fromId);
  svg.dataset.gasperMorphFrom = fromId;
  svg.dataset.gasperMorphTo = toId;
  svg.dataset.gasperMorphMix = m.toFixed(4);
  return {
    from: fromId,
    to: toId,
    mix: m,
    layersTouched: report.layersTouched,
    domains: report.domains,
  };
}

/**
 * Bind morphology geometry for the five named embodiments into exclusive
 * topology domain bindings. Does not create a second parallel topology author.
 *
 * When from/to map to morphology EmbodimentIds, evaluates shipped morphology
 * + specialty geometry and returns domains from the bound snapshot.
 * Falls back to profile domain projection only when ids are outside morphology.
 */
export function bindMorphologyTopologyFrame(
  fromId: string,
  toId: string,
  mix: number,
  opts: { seed?: number; reverse?: boolean } = {},
): BoundMorphFrameReport {
  const m = Math.max(0, Math.min(1, mix));
  const fromMorph = toMorphologyEmbodimentId(fromId);
  const toMorph = toMorphologyEmbodimentId(toId);

  if (fromMorph && toMorph) {
    const snapshot = evaluateBoundMorphologyGeometry({
      from: fromMorph,
      to: toMorph,
      progress: m,
      reverse: opts.reverse,
      chiralityBias: 0.25,
    });
    const domains = domainBindingsFromSnapshot(snapshot);
    const topologyAuthority = buildExclusiveTopologyAuthority({
      contourAuthority: snapshot.topologyAuthority,
      specialtyAuthority: snapshot.specialty.activeAuthor,
      dualSilhouetteResidual: snapshot.defects.staleSilhouette,
    });
    return {
      from: fromId,
      to: toId,
      mix: m,
      layersTouched: [
        "contour",
        "shell",
        "face",
        "eyes",
        "mouth",
        "energy",
        snapshot.specialty.activeAuthor !== "none"
          ? `specialty:${snapshot.specialty.activeAuthor}`
          : "specialty:none",
      ],
      domains,
      snapshot,
      topologyAuthority,
      exclusive: topologyAuthority.exclusive && !snapshot.dualTopologyAuthority,
    };
  }

  // Non-morphology profile pair: profile traits only (no specialty dual author)
  const from = getEmbodimentProfile(fromId);
  const to = getEmbodimentProfile(toId);
  if (!from || !to) {
    throw new Error(`Morph unknown profile: ${fromId} → ${toId}`);
  }
  // Synthetic presence-like snapshot shell via bound path is unavailable —
  // return empty specialty exclusive report for profile-only morphs.
  const domains: Record<string, number> = {
    overall_width: from.sx + (to.sx - from.sx) * m,
    overall_height: from.sy + (to.sy - from.sy) * m,
    face_scale: 1,
    energy_level: 0.5,
    singularity_mix: 0,
    comet_mix: 0,
    dormant_mix: 0,
    wake_mix: 0,
    axial_needle: 0,
    ghost_anatomy: 0,
    horizontal_shear: 0,
    dual_silhouette: 0,
  };
  // Bind a presence→presence placeholder snapshot for type completeness
  const snapshot = evaluateBoundMorphologyGeometry({
    from: "presence",
    to: "presence",
    progress: 0,
  });
  const topologyAuthority = buildExclusiveTopologyAuthority({
    contourAuthority: "presence_body",
    specialtyAuthority: "none",
  });
  return {
    from: fromId,
    to: toId,
    mix: m,
    layersTouched: ["shell", "face"],
    domains,
    snapshot,
    topologyAuthority,
    exclusive: true,
  };
}

/**
 * Apply morph frame on SVG when available, AND bind morphology topology domains.
 * Prefer this over applyMorphFrame alone for the five named embodiments so
 * specialty geometry ownership stays exclusive with morphology law.
 */
export function applyBoundMorphFrame(
  svg: SVGSVGElement | null,
  fromId: string,
  toId: string,
  mix: number,
  opts: { seed?: number; reverse?: boolean } = {},
): BoundMorphFrameReport {
  const bound = bindMorphologyTopologyFrame(fromId, toId, mix, opts);
  if (svg) {
    const fromMorph = toMorphologyEmbodimentId(fromId);
    const toMorph = toMorphologyEmbodimentId(toId);
    // Profile projection uses registry ids (dormant-orbit for dormant-maintain)
    const profileFrom =
      fromId === "dormant-maintain"
        ? "dormant-orbit"
        : fromId === "wake"
          ? "presence"
          : fromId;
    const profileTo =
      toId === "dormant-maintain"
        ? "dormant-orbit"
        : toId === "wake"
          ? "presence"
          : toId;
    if (getEmbodimentProfile(profileFrom) && getEmbodimentProfile(profileTo)) {
      try {
        const report = projectEmbodimentOntoSvg(
          svg,
          profileTo,
          Math.max(0, Math.min(1, mix)),
          profileFrom,
        );
        bound.layersTouched = [
          ...new Set([...bound.layersTouched, ...report.layersTouched]),
        ];
        // Merge profile domains under morphology exclusivity (morphology wins)
        for (const [k, v] of Object.entries(report.domains)) {
          if (bound.domains[k] === undefined) bound.domains[k] = v;
        }
      } catch {
        // SVG projection optional for headless structural binding
      }
    }
    svg.dataset.gasperMorphFrom = fromId;
    svg.dataset.gasperMorphTo = toId;
    svg.dataset.gasperMorphMix = Math.max(0, Math.min(1, mix)).toFixed(4);
    svg.dataset.gasperTopologyAuthority = bound.topologyAuthority.contourAuthority;
    svg.dataset.gasperSpecialtyAuthority =
      bound.topologyAuthority.specialtyAuthority;
    void fromMorph;
    void toMorph;
  }
  return bound;
}

export function clearMorphFrame(svg: SVGSVGElement, settleId: string) {
  const report = applyBoundMorphFrame(svg, settleId, settleId, 1);
  delete svg.dataset.gasperMorphFrom;
  delete svg.dataset.gasperMorphTo;
  delete svg.dataset.gasperMorphMix;
  return report;
}

export function listMorphRoute(
  fromId: string,
  toId: string,
): GasperEmbodimentProfile[] {
  const from = getEmbodimentProfile(fromId);
  const to = getEmbodimentProfile(toId);
  if (!from || !to) return [];
  if (fromId === toId) return [to];
  // Direct shared-topology morph; dormant family may hop via singularity
  if (
    from.geometryModel === "dormant-family" &&
    to.geometryModel !== "dormant-family" &&
    fromId !== "singularity"
  ) {
    const mid = getEmbodimentProfile("singularity");
    return mid ? [from, mid, to] : [from, to];
  }
  if (
    to.geometryModel === "dormant-family" &&
    from.geometryModel !== "dormant-family" &&
    toId !== "singularity"
  ) {
    const mid = getEmbodimentProfile("singularity");
    return mid ? [from, mid, to] : [from, to];
  }
  return [from, to];
}
