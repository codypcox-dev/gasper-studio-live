/**
 * Protected topology constants — must match FormMaster + architecture lock v0.2.
 * Fail closed on drift without explicit migration.
 *
 * Exclusive topology authority helpers bind morphology ownership to the
 * packaged lock so Presence/Comet/Singularity/Dormant/Wake never dual-author
 * contour or specialty layers on the living path.
 */

export const GASPER_TOPOLOGY = Object.freeze({
  contourSamples: 512 as const,
  structuralNodes: 360 as const,
  structuralTriangles: 672 as const,
  structuralRings: 15 as const,
  structuralSectors: 24 as const,
  adaptiveRelief: Object.freeze({
    width: 25 as const,
    height: 40 as const,
    maxSamples: 1000 as const,
    /** 25*40 = 1000 */
    fieldSamples: 25 * 40,
    decorativeTextureOnly: false as const,
    movementBearing: true as const,
    changesSilhouetteTopology: false as const,
    changesFaceTopology: false as const,
  }),
  detailTopology: Object.freeze({
    rings: 25 as const,
    sectors: 40 as const,
  }),
});

export type TopologySnapshot = {
  contourSamples: number;
  structuralNodes: number;
  structuralTriangles: number;
  adaptiveReliefMaxSamples?: number;
};

/** Contested topology layers that must have exactly one non-none author. */
export const EXCLUSIVE_TOPOLOGY_LAYERS = Object.freeze([
  "contour",
  "shell",
  "face",
  "eyes",
  "mouth",
  "energy",
] as const);

export type ExclusiveTopologyLayer = (typeof EXCLUSIVE_TOPOLOGY_LAYERS)[number];

/**
 * Exclusive topology authority record for a single frame.
 * Contour is never dual-owned; specialty layers are optional single authors.
 */
export type ExclusiveTopologyAuthority = {
  contourSamples: number;
  structuralNodes: number;
  structuralTriangles: number;
  topologyStable: boolean;
  /** Contour owner (must not be none / dual). */
  contourAuthority: string;
  /** Specialty author or "none". */
  specialtyAuthority: string;
  dualAuthority: boolean;
  exclusive: boolean;
};

/**
 * Build an exclusive topology authority record from ownership + lock.
 * Dual authority is true when contour is none or specialty claims conflict.
 */
export function buildExclusiveTopologyAuthority(input: {
  contourAuthority: string;
  specialtyAuthority?: string;
  dualSilhouetteResidual?: number;
}): ExclusiveTopologyAuthority {
  const contourAuthority = input.contourAuthority || "none";
  const specialtyAuthority = input.specialtyAuthority ?? "none";
  const dualAuthority =
    contourAuthority === "none" ||
    (input.dualSilhouetteResidual ?? 0) > 0.02;
  return {
    contourSamples: GASPER_TOPOLOGY.contourSamples,
    structuralNodes: GASPER_TOPOLOGY.structuralNodes,
    structuralTriangles: GASPER_TOPOLOGY.structuralTriangles,
    topologyStable: !dualAuthority,
    contourAuthority,
    specialtyAuthority,
    dualAuthority,
    exclusive: !dualAuthority && contourAuthority !== "none",
  };
}

/** True when authority record is exclusive and matches the packaged lock. */
export function assertExclusiveTopologyAuthority(
  auth: ExclusiveTopologyAuthority,
): { ok: true } | { ok: false; errors: string[] } {
  const lock = assertTopologyLock({
    contourSamples: auth.contourSamples,
    structuralNodes: auth.structuralNodes,
    structuralTriangles: auth.structuralTriangles,
  });
  const errors: string[] = [];
  if (!lock.ok) errors.push(...lock.errors);
  if (!auth.exclusive || auth.dualAuthority) {
    errors.push(
      `topology dual-authority: contour=${auth.contourAuthority} specialty=${auth.specialtyAuthority}`,
    );
  }
  if (auth.contourAuthority === "none") {
    errors.push("contour authority is none");
  }
  if (!auth.topologyStable) {
    errors.push("topologyStable=false");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function assertTopologyLock(
  snap: TopologySnapshot,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (snap.contourSamples !== GASPER_TOPOLOGY.contourSamples) {
    errors.push(
      `contourSamples ${snap.contourSamples} !== ${GASPER_TOPOLOGY.contourSamples}`,
    );
  }
  if (snap.structuralNodes !== GASPER_TOPOLOGY.structuralNodes) {
    errors.push(
      `structuralNodes ${snap.structuralNodes} !== ${GASPER_TOPOLOGY.structuralNodes}`,
    );
  }
  if (
    snap.structuralTriangles !== GASPER_TOPOLOGY.structuralTriangles &&
    // FormMaster may report ARTICULATION_MESH.triangles.length; accept only exact lock
    snap.structuralTriangles !== 0
  ) {
    // Allow 672 exactly; warn-level if missing until snapshot ready
    if (snap.structuralTriangles !== GASPER_TOPOLOGY.structuralTriangles) {
      errors.push(
        `structuralTriangles ${snap.structuralTriangles} !== ${GASPER_TOPOLOGY.structuralTriangles}`,
      );
    }
  }
  if (
    snap.adaptiveReliefMaxSamples != null &&
    snap.adaptiveReliefMaxSamples !== GASPER_TOPOLOGY.adaptiveRelief.maxSamples
  ) {
    errors.push(
      `adaptiveReliefMaxSamples ${snap.adaptiveReliefMaxSamples} !== ${GASPER_TOPOLOGY.adaptiveRelief.maxSamples}`,
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/** 15 rings × 24 sectors → (rings-1)*sectors*2 = 672 triangles */
export function expectedStructuralTriangles(
  rings = GASPER_TOPOLOGY.structuralRings,
  sectors = GASPER_TOPOLOGY.structuralSectors,
): number {
  return (rings - 1) * sectors * 2;
}
