/**
 * Execution pillars — the only taxonomy the user needs.
 * bone / view / null are implementation tags. These are the seats.
 */
export const PILLAR_IDS = ["machine", "kernel", "cook", "painter", "score", "phase"] as const;
export type PillarId = (typeof PILLAR_IDS)[number];

export type PillarDef = {
  id: PillarId;
  label: string;
  law: string;
  allow: string;
  refuse: string;
  tint: string;
};

export const PILLARS: readonly PillarDef[] = [
  { id: "machine", label: "Machine", law: "May I?", allow: "Rest, Walk, Presence.", refuse: "Never move mass. Never draw.", tint: "#c4a574" },
  { id: "kernel", label: "Kernel", law: "Mass", allow: "COM, plants, tempo.", refuse: "Never decide Rest/Walk.", tint: "#c17a5a" },
  { id: "cook", label: "Cook", law: "Silhouette", allow: "Shape, τ, cage.", refuse: "Never a second hull.", tint: "#7d9a6f" },
  { id: "painter", label: "Painter", law: "Draw", allow: "Hull, pearl, orbit.", refuse: "Never a second d.", tint: "#6d8aa8" },
  { id: "score", label: "Score", law: "Replay", allow: "Takes.", refuse: "Never Delay.", tint: "#8b7394" },
  { id: "phase", label: "Phase", law: "Where are we in the step?", allow: "Read φ. Plant predicates.", refuse: "Not a mode you click.", tint: "#8a8680" },
];

export type PillarSeat = { pillar: PillarId; border?: PillarId };

/** organId or node idPrefix → seat. Border = lives on the gutter between two pillars. */
export const ORGAN_PILLAR: Record<string, PillarSeat> = {
  machine: { pillar: "machine" },
  "eight-state": { pillar: "machine" },
  gsap: { pillar: "machine" },
  compositor: { pillar: "machine" },
  instrument: { pillar: "machine" },
  lumen: { pillar: "machine" },
  worldclass: { pillar: "machine" },

  "world-driver": { pillar: "kernel" },
  "gait-law": { pillar: "kernel", border: "phase" },
  gait: { pillar: "kernel", border: "phase" },
  support: { pillar: "kernel", border: "phase" },
  "walk-scaffold": { pillar: "kernel" },

  "contour-512": { pillar: "cook" },
  identity: { pillar: "cook" },
  envelope: { pillar: "cook" },
  "lattice-360": { pillar: "cook" },
  "relief-1000": { pillar: "cook" },
  cage: { pillar: "cook" },
  "topology-lock": { pillar: "cook" },
  "scaffold-z": { pillar: "cook" },
  "paint-grid": { pillar: "cook" },
  "hex-cube": { pillar: "cook" },
  "contour-solver": { pillar: "cook" },
  "adaptive-shell": { pillar: "cook" },
  stance: { pillar: "cook", border: "kernel" },
  handles: { pillar: "cook", border: "kernel" },
  voigt: { pillar: "cook", border: "kernel" },
  "fabric-solver": { pillar: "cook", border: "kernel" },
  arap: { pillar: "cook", border: "kernel" },
  kappa: { pillar: "cook" },
  couple: { pillar: "cook" },
  goose: { pillar: "cook" },
  paddle: { pillar: "cook" },
  "field-api": { pillar: "cook" },
  formmaster: { pillar: "cook", border: "painter" },

  "closed-spline": { pillar: "painter" },
  hull: { pillar: "painter" },
  pearl: { pillar: "painter" },
  "surface-shader": { pillar: "painter" },
  "cage-light": { pillar: "painter" },
  "hard-highlights": { pillar: "painter" },
  ribbons: { pillar: "painter" },
  orbit: { pillar: "painter" },
  "radial-facing": { pillar: "painter" },

  "path-take": { pillar: "score" },
  "northstar-20": { pillar: "score" },
  "curve-track": { pillar: "score" },
  "rig-controller": { pillar: "score" },
};

export function seatOf(id: string, organId?: string): PillarSeat {
  return ORGAN_PILLAR[id] ?? (organId ? ORGAN_PILLAR[organId] : undefined) ?? { pillar: "cook" };
}

export function belongsToPillar(seat: PillarSeat, pillar: PillarId): boolean {
  return seat.pillar === pillar || seat.border === pillar;
}
