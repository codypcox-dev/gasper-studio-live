/**
 * Named intermediate morphology routes for bidirectional embodiment transitions.
 * Every forward route has an inverse-consistent return (reversed intermediate order
 * with mirrored progress windows).
 */

import type {
  EmbodimentId,
  IntermediateMorphologyState,
  MorphologyProfileCompatibilityMode,
  MorphologyProfileId,
  MorphologyProfileRoute,
  MorphologyRoute,
} from "./types";

const ALL_EMBODIMENTS: readonly EmbodimentId[] = [
  "presence",
  "singularity",
  "comet",
  "dormant-maintain",
  "wake",
] as const;

/** Canonical authored profiles covered by the eight-embodiment matrix. */
export const MORPHOLOGY_PROFILE_IDS: readonly MorphologyProfileId[] = [
  "presence",
  "singularity",
  "dormant-orbit",
  "low-orbit",
  "comet",
  "wispwalker",
  "halo",
  "lantern",
] as const;

/** Explicit compatibility policy for profile → morphology-law projection. */
export const MORPHOLOGY_PROFILE_COMPATIBILITY: Readonly<
  Record<MorphologyProfileId, MorphologyProfileCompatibilityMode>
> = Object.freeze({
  presence: "native",
  singularity: "dormant-adapted",
  "dormant-orbit": "dormant-adapted",
  "low-orbit": "ground-adapted",
  comet: "native",
  wispwalker: "native",
  halo: "native",
  lantern: "native",
});

/**
 * The authored profile remains the visible silhouette; this map selects the
 * existing continuity law that owns its shared topology and specialty layers.
 */
const PROFILE_TO_MORPHOLOGY: Readonly<Record<MorphologyProfileId, EmbodimentId>> =
  Object.freeze({
    presence: "presence",
    singularity: "singularity",
    "dormant-orbit": "dormant-maintain",
    "low-orbit": "presence",
    comet: "comet",
    wispwalker: "presence",
    halo: "presence",
    lantern: "presence",
  });

/** Presence ↔ Singularity: shell compress → face dissolve → energy inward → horizon form. */
const PRESENCE_SINGULARITY: MorphologyRoute = {
  from: "presence",
  to: "singularity",
  intermediates: [
    { state: "presence_hold", start: 0, end: 0.08 },
    { state: "shell_compress", start: 0.08, end: 0.28 },
    { state: "face_dissolve", start: 0.28, end: 0.48 },
    { state: "energy_inward", start: 0.48, end: 0.7 },
    { state: "horizon_form", start: 0.7, end: 0.92 },
    { state: "singularity_hold", start: 0.92, end: 1.01 },
  ],
};

/** Presence ↔ Comet: mass forward → face migrate → wake attach (no horizontal shear drag). */
const PRESENCE_COMET: MorphologyRoute = {
  from: "presence",
  to: "comet",
  intermediates: [
    { state: "presence_hold", start: 0, end: 0.08 },
    { state: "mass_forward", start: 0.08, end: 0.32 },
    { state: "face_migrate", start: 0.32, end: 0.58 },
    { state: "wake_attach", start: 0.58, end: 0.88 },
    { state: "comet_hold", start: 0.88, end: 1.01 },
  ],
};

/** Presence ↔ Dormant Maintain: energy settle → face reduce → orbit form. */
const PRESENCE_DORMANT: MorphologyRoute = {
  from: "presence",
  to: "dormant-maintain",
  intermediates: [
    { state: "presence_hold", start: 0, end: 0.1 },
    { state: "energy_settle", start: 0.1, end: 0.35 },
    { state: "face_reduce", start: 0.35, end: 0.65 },
    { state: "orbit_form", start: 0.65, end: 0.9 },
    { state: "dormant_hold", start: 0.9, end: 1.01 },
  ],
};

/** Dormant Maintain ↔ Wake: energy restore → face reconstitute → wake rise. */
const DORMANT_WAKE: MorphologyRoute = {
  from: "dormant-maintain",
  to: "wake",
  intermediates: [
    { state: "dormant_hold", start: 0, end: 0.1 },
    { state: "energy_restore", start: 0.1, end: 0.4 },
    { state: "face_reconstitute", start: 0.4, end: 0.72 },
    { state: "wake_rise", start: 0.72, end: 0.92 },
    { state: "wake_hold", start: 0.92, end: 1.01 },
  ],
};

/** Wake → Presence: close the loop into settled presence. */
const WAKE_PRESENCE: MorphologyRoute = {
  from: "wake",
  to: "presence",
  intermediates: [
    { state: "wake_hold", start: 0, end: 0.12 },
    { state: "energy_settle", start: 0.12, end: 0.45 },
    { state: "face_reconstitute", start: 0.45, end: 0.78 },
    { state: "presence_hold", start: 0.78, end: 1.01 },
  ],
};

/** Cross-specialty bridges via presence-like shell (volume-preserving, no dual silhouette). */
const SINGULARITY_COMET: MorphologyRoute = {
  from: "singularity",
  to: "comet",
  intermediates: [
    { state: "singularity_hold", start: 0, end: 0.1 },
    { state: "energy_inward", start: 0.1, end: 0.35 },
    { state: "face_migrate", start: 0.35, end: 0.55 },
    { state: "wake_attach", start: 0.55, end: 0.85 },
    { state: "comet_hold", start: 0.85, end: 1.01 },
  ],
};

const SINGULARITY_DORMANT: MorphologyRoute = {
  from: "singularity",
  to: "dormant-maintain",
  intermediates: [
    { state: "singularity_hold", start: 0, end: 0.1 },
    { state: "energy_settle", start: 0.1, end: 0.4 },
    { state: "orbit_form", start: 0.4, end: 0.8 },
    { state: "dormant_hold", start: 0.8, end: 1.01 },
  ],
};

const COMET_DORMANT: MorphologyRoute = {
  from: "comet",
  to: "dormant-maintain",
  intermediates: [
    { state: "comet_hold", start: 0, end: 0.1 },
    { state: "energy_settle", start: 0.1, end: 0.4 },
    { state: "face_reduce", start: 0.4, end: 0.65 },
    { state: "orbit_form", start: 0.65, end: 0.9 },
    { state: "dormant_hold", start: 0.9, end: 1.01 },
  ],
};

const COMET_WAKE: MorphologyRoute = {
  from: "comet",
  to: "wake",
  intermediates: [
    { state: "comet_hold", start: 0, end: 0.12 },
    { state: "energy_restore", start: 0.12, end: 0.45 },
    { state: "face_reconstitute", start: 0.45, end: 0.75 },
    { state: "wake_rise", start: 0.75, end: 1.01 },
  ],
};

const SINGULARITY_WAKE: MorphologyRoute = {
  from: "singularity",
  to: "wake",
  intermediates: [
    { state: "singularity_hold", start: 0, end: 0.12 },
    { state: "energy_restore", start: 0.12, end: 0.45 },
    { state: "face_reconstitute", start: 0.45, end: 0.78 },
    { state: "wake_rise", start: 0.78, end: 1.01 },
  ],
};

const WAKE_DORMANT: MorphologyRoute = {
  from: "wake",
  to: "dormant-maintain",
  intermediates: [
    { state: "wake_hold", start: 0, end: 0.1 },
    { state: "energy_settle", start: 0.1, end: 0.4 },
    { state: "face_reduce", start: 0.4, end: 0.7 },
    { state: "orbit_form", start: 0.7, end: 0.92 },
    { state: "dormant_hold", start: 0.92, end: 1.01 },
  ],
};

/** Forward route table (canonical direction). Inverse built by invertRoute. */
const FORWARD_ROUTES: MorphologyRoute[] = [
  PRESENCE_SINGULARITY,
  PRESENCE_COMET,
  PRESENCE_DORMANT,
  DORMANT_WAKE,
  WAKE_PRESENCE,
  SINGULARITY_COMET,
  SINGULARITY_DORMANT,
  COMET_DORMANT,
  COMET_WAKE,
  SINGULARITY_WAKE,
  WAKE_DORMANT,
];

function invertIntermediates(
  intermediates: MorphologyRoute["intermediates"],
): MorphologyRoute["intermediates"] {
  // Reverse order and mirror progress windows: start' = 1-end, end' = 1-start
  const mirrored = intermediates.map((step) => ({
    state: step.state,
    start: Math.max(0, 1 - step.end + (step.end > 1 ? 0.01 : 0)),
    end: Math.min(1.01, 1 - step.start + (step.start === 0 ? 0.01 : 0)),
  }));
  // Sort by start so intermediate lookup remains progressive
  return [...mirrored].sort((a, b) => a.start - b.start);
}

/**
 * Build inverse route: to→from with mirrored intermediate windows.
 * Inverse-consistent: evaluate(from,to,p) channels ≈ evaluate(to,from,1-p) within tolerance.
 */
export function invertRoute(route: MorphologyRoute): MorphologyRoute {
  return {
    from: route.to,
    to: route.from,
    intermediates: invertIntermediates(route.intermediates),
  };
}

function routeKey(from: EmbodimentId, to: EmbodimentId): string {
  return `${from}->${to}`;
}

const ROUTE_INDEX: Map<string, MorphologyRoute> = (() => {
  const m = new Map<string, MorphologyRoute>();
  for (const r of FORWARD_ROUTES) {
    m.set(routeKey(r.from, r.to), r);
    const inv = invertRoute(r);
    // Prefer explicit reverse if also listed as forward
    if (!m.has(routeKey(inv.from, inv.to))) {
      m.set(routeKey(inv.from, inv.to), inv);
    }
  }
  // Identity holds
  for (const id of ALL_EMBODIMENTS) {
    const hold: IntermediateMorphologyState =
      id === "presence"
        ? "presence_hold"
        : id === "singularity"
          ? "singularity_hold"
          : id === "comet"
            ? "comet_hold"
            : id === "dormant-maintain"
              ? "dormant_hold"
              : "wake_hold";
    m.set(routeKey(id, id), {
      from: id,
      to: id,
      intermediates: [{ state: hold, start: 0, end: 1.01 }],
    });
  }
  return m;
})();

const ROUTE_GRAPH: ReadonlyMap<EmbodimentId, readonly MorphologyRoute[]> = (() => {
  const adjacency = new Map<EmbodimentId, MorphologyRoute[]>();
  for (const id of ALL_EMBODIMENTS) adjacency.set(id, []);

  for (const route of ROUTE_INDEX.values()) {
    if (route.from === route.to) continue;
    adjacency.get(route.from)?.push(route);
  }

  return adjacency;
})();

function findRoutePath(
  from: EmbodimentId,
  to: EmbodimentId,
): MorphologyRoute[] | null {
  const queue: Array<{
    node: EmbodimentId;
    path: MorphologyRoute[];
  }> = [{ node: from, path: [] }];
  const visited = new Set<EmbodimentId>([from]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const route of ROUTE_GRAPH.get(current.node) ?? []) {
      if (visited.has(route.to)) continue;

      const path = [...current.path, route];
      if (route.to === to) return path;

      visited.add(route.to);
      queue.push({ node: route.to, path });
    }
  }

  return null;
}

function composeRoute(path: readonly MorphologyRoute[]): MorphologyRoute {
  const segmentWidth = 1 / path.length;
  const intermediates = path.flatMap((route, index) => {
    const segmentStart = index * segmentWidth;
    const mapProgress = (progress: number) =>
      segmentStart + Math.min(1, Math.max(0, progress)) * segmentWidth;

    return route.intermediates.map((step) => ({
      state: step.state,
      start: mapProgress(step.start),
      end: mapProgress(step.end),
    }));
  });

  return {
    from: path[0]!.from,
    to: path[path.length - 1]!.to,
    intermediates,
  };
}

/** Resolve a morphology route (throws if pair unknown). */
export function getMorphologyRoute(
  from: EmbodimentId,
  to: EmbodimentId,
): MorphologyRoute {
  const hit = ROUTE_INDEX.get(routeKey(from, to));
  if (hit) return hit;

  const known = new Set<string>(ALL_EMBODIMENTS);
  if (!known.has(from) || !known.has(to)) {
    throw new Error(`No morphology route from ${from} to ${to}: unknown embodiment node`);
  }

  const path = findRoutePath(from, to);
  if (!path) {
    throw new Error(`No morphology route from ${from} to ${to}`);
  }

  return composeRoute(path);
}

/** Named intermediate state active at progress p ∈ [0,1]. */
export function intermediateAt(
  route: MorphologyRoute,
  progress: number,
): IntermediateMorphologyState {
  const p = Math.min(1, Math.max(0, progress));
  for (const step of route.intermediates) {
    if (p >= step.start && p < step.end) return step.state;
  }
  const last = route.intermediates[route.intermediates.length - 1];
  if (last) return last.state;
  throw new Error(
    `Morphology route from ${route.from} to ${route.to} has no intermediate states`,
  );
}

/** All intermediate state names in order along a route. */
export function orderedIntermediateStates(
  from: EmbodimentId,
  to: EmbodimentId,
): IntermediateMorphologyState[] {
  return getMorphologyRoute(from, to).intermediates.map((s) => s.state);
}

/** Map an authored profile to the existing topology/continuity law. */
export function profileMorphologyEmbodimentId(
  profileId: string,
): EmbodimentId | null {
  const normalized = profileId.trim().toLowerCase() as MorphologyProfileId;
  return PROFILE_TO_MORPHOLOGY[normalized] ?? null;
}

/** Resolve one explicit profile transition through the morphology projector. */
export function getProfileMorphologyRoute(
  from: MorphologyProfileId,
  to: MorphologyProfileId,
): MorphologyProfileRoute {
  const morphologyFrom = PROFILE_TO_MORPHOLOGY[from];
  const morphologyTo = PROFILE_TO_MORPHOLOGY[to];
  const compatibility =
    MORPHOLOGY_PROFILE_COMPATIBILITY[from] === "ground-adapted" ||
    MORPHOLOGY_PROFILE_COMPATIBILITY[to] === "ground-adapted"
      ? "ground-adapted"
      : MORPHOLOGY_PROFILE_COMPATIBILITY[from] === "dormant-adapted" ||
          MORPHOLOGY_PROFILE_COMPATIBILITY[to] === "dormant-adapted"
        ? "dormant-adapted"
        : "native";
  return {
    profileFrom: from,
    profileTo: to,
    morphologyFrom,
    morphologyTo,
    compatibility,
    route: getMorphologyRoute(morphologyFrom, morphologyTo),
  };
}

/** All authored profile pairs, used by structural coverage and witness code. */
export function listProfileMorphologyRoutes(): readonly MorphologyProfileRoute[] {
  return MORPHOLOGY_PROFILE_IDS.flatMap((from) =>
    MORPHOLOGY_PROFILE_IDS.map((to) => getProfileMorphologyRoute(from, to)),
  );
}

/** Canonical bidirectional pairs that must pass frame-dense tests. */
export const REQUIRED_BIDIRECTIONAL_PAIRS: readonly {
  from: EmbodimentId;
  to: EmbodimentId;
}[] = [
  { from: "presence", to: "singularity" },
  { from: "singularity", to: "presence" },
  { from: "presence", to: "comet" },
  { from: "comet", to: "presence" },
  { from: "presence", to: "dormant-maintain" },
  { from: "dormant-maintain", to: "presence" },
  { from: "dormant-maintain", to: "wake" },
  { from: "wake", to: "dormant-maintain" },
  { from: "wake", to: "presence" },
  { from: "presence", to: "wake" },
] as const;

export const EMBODIMENT_IDS: readonly EmbodimentId[] = ALL_EMBODIMENTS;
