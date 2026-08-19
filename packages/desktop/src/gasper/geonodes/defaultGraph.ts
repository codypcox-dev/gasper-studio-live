import { COOK_ORGANS } from "./catalog";
import { NODE_BLUEPRINTS } from "./library";
import { ACTIVE_LINE, LAYOUT_VERSION, arrangeGraph } from "./layout";
import { ensureCoupleLinks } from "./coupling";
import type { GeoGraph, GraphNode } from "./types";
import { GEONODES_SCHEMA } from "./types";

const COOK_IDS = new Set(COOK_ORGANS.map((o) => o.id));

export function isCookBlueprint(organId: string, idPrefix: string): boolean {
  return COOK_IDS.has(organId) || COOK_IDS.has(idPrefix);
}

export function nodeFromBlueprint(
  id: string,
  x: number,
  y: number,
  bp = NODE_BLUEPRINTS.find((b) => b.idPrefix === id || b.organId === id),
): GraphNode | null {
  if (!bp) return null;
  const onLine = (ACTIVE_LINE as readonly string[]).includes(id);
  return {
    id,
    typeId: bp.typeId,
    class: bp.class,
    label: bp.label,
    organId: bp.organId,
    muted: !onLine,
    x,
    y,
    params: bp.params.map((p) => ({ ...p })),
    element: bp.element,
    event: bp.event,
    inType: bp.inType,
    outType: bp.outType,
    status: bp.status,
  };
}

export function defaultGeoGraph(): GeoGraph {
  const nodes: GraphNode[] = [];
  const seen = new Set<string>();
  for (const bp of NODE_BLUEPRINTS) {
    if (!isCookBlueprint(bp.organId, bp.idPrefix)) continue;
    if (seen.has(bp.idPrefix)) continue;
    seen.add(bp.idPrefix);
    const node = nodeFromBlueprint(bp.idPrefix, 0, 0, bp);
    if (node) nodes.push(node);
  }
  const links = [
    { from: "identity", to: "envelope" },
    { from: "envelope", to: "cage" },
    { from: "cage", to: "handles" },
    { from: "handles", to: "support" },
    { from: "support", to: "gait" },
    { from: "gait", to: "world-driver" },
    { from: "world-driver", to: "voigt" },
    { from: "voigt", to: "kappa" },
    { from: "kappa", to: "orbit" },
    { from: "orbit", to: "pearl" },
    { from: "pearl", to: "hull" },
  ].filter((l) => nodes.some((n) => n.id === l.from) && nodes.some((n) => n.id === l.to));

  return ensureCoupleLinks(
    arrangeGraph({
      schema: GEONODES_SCHEMA,
      nodes,
      links,
      output: "hull",
      selected: "handles",
      layoutVersion: LAYOUT_VERSION,
    }),
  );
}
