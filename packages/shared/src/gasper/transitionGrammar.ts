/**
 * Expression / embodiment transition grammar (deterministic).
 * Recovered from gasper-performance/transition-grammar.v1.json and
 * expression-policy/transition-routes.json selection rules.
 */

export const TRANSITION_GRAMMAR_VERSION = "0.1.0-expression-studio" as const;

export type EmbodimentId =
  | "presence"
  | "singularity"
  | "comet"
  | "comet-left"
  | "comet-right"
  | "dormant-orbit";

export type TransitionRoute = {
  route_id: string;
  from: EmbodimentId;
  to: EmbodimentId;
  accepted: boolean;
  hops: EmbodimentId[];
};

export const ACCEPTED_EMBODIMENT_ROUTES: readonly TransitionRoute[] = Object.freeze([
  {
    route_id: "presence_to_singularity",
    from: "presence",
    to: "singularity",
    accepted: true,
    hops: ["presence", "singularity"],
  },
  {
    route_id: "singularity_to_presence",
    from: "singularity",
    to: "presence",
    accepted: true,
    hops: ["singularity", "presence"],
  },
  {
    route_id: "presence_to_comet_left",
    from: "presence",
    to: "comet-left",
    accepted: true,
    hops: ["presence", "comet-left"],
  },
  {
    route_id: "presence_to_comet_right",
    from: "presence",
    to: "comet-right",
    accepted: true,
    hops: ["presence", "comet-right"],
  },
  {
    route_id: "presence_to_comet",
    from: "presence",
    to: "comet",
    accepted: true,
    hops: ["presence", "comet"],
  },
  {
    route_id: "comet_to_presence",
    from: "comet",
    to: "presence",
    accepted: true,
    hops: ["comet", "presence"],
  },
  {
    route_id: "presence_to_dormant_orbit",
    from: "presence",
    to: "dormant-orbit",
    accepted: true,
    hops: ["presence", "dormant-orbit"],
  },
  {
    route_id: "dormant_orbit_to_presence_wake",
    from: "dormant-orbit",
    to: "presence",
    accepted: true,
    hops: ["dormant-orbit", "presence"],
  },
]);

export type ExpressionTransition = {
  from_fixture: string;
  to_fixture: string;
  kind: "expression_only" | "cross_family" | "bridge";
  duration_hint_ms: { min: number; target: number; max: number };
  interrupt_class: "soft" | "hard" | "barrier" | "morph_safe";
};

export type PlannedTransition = {
  same_embodiment: boolean;
  embodiment_route: TransitionRoute | null;
  multi_hop: boolean;
  hops: EmbodimentId[];
  expression: ExpressionTransition | null;
  decision: string;
};

function normalizeEmbodiment(id: string): EmbodimentId | null {
  const known: EmbodimentId[] = [
    "presence",
    "singularity",
    "comet",
    "comet-left",
    "comet-right",
    "dormant-orbit",
  ];
  if ((known as string[]).includes(id)) return id as EmbodimentId;
  if (id === "low-orbit") return "dormant-orbit";
  if (id === "dormant") return "dormant-orbit";
  return null;
}

function findDirectRoute(
  from: EmbodimentId,
  to: EmbodimentId,
): TransitionRoute | null {
  return (
    ACCEPTED_EMBODIMENT_ROUTES.find((r) => r.from === from && r.to === to && r.accepted) ??
    null
  );
}

/**
 * Plan a deterministic transition between embodiment/expression states.
 * Rules (from accepted grammar):
 * 1. If S == T embodiment, expression-only route.
 * 2. If direct accepted edge exists, use it.
 * 3. Else multi-hop via presence.
 * 4. Interrupted re-plan is caller's responsibility (sample actual state).
 */
export function planTransition(input: {
  fromEmbodiment: string;
  toEmbodiment: string;
  fromExpression?: string | null;
  toExpression?: string | null;
}): PlannedTransition {
  const fromE = normalizeEmbodiment(input.fromEmbodiment) ?? "presence";
  const toE = normalizeEmbodiment(input.toEmbodiment) ?? "presence";
  const fromX = input.fromExpression ?? null;
  const toX = input.toExpression ?? null;

  let expression: ExpressionTransition | null = null;
  if (fromX && toX && fromX !== toX) {
    expression = {
      from_fixture: fromX,
      to_fixture: toX,
      kind: fromX.split("-")[0] === toX.split("-")[0] ? "expression_only" : "cross_family",
      duration_hint_ms: { min: 180, target: 420, max: 900 },
      interrupt_class: "soft",
    };
  }

  if (fromE === toE) {
    return {
      same_embodiment: true,
      embodiment_route: null,
      multi_hop: false,
      hops: [fromE],
      expression,
      decision: "expression_only_same_embodiment",
    };
  }

  const direct = findDirectRoute(fromE, toE);
  if (direct) {
    return {
      same_embodiment: false,
      embodiment_route: direct,
      multi_hop: false,
      hops: [...direct.hops],
      expression,
      decision: `direct:${direct.route_id}`,
    };
  }

  // Symmetric reverse of accepted edges when listed only one way
  const reverse = ACCEPTED_EMBODIMENT_ROUTES.find(
    (r) => r.from === toE && r.to === fromE && r.accepted,
  );
  if (reverse) {
    const hops = [...reverse.hops].reverse() as EmbodimentId[];
    return {
      same_embodiment: false,
      embodiment_route: {
        route_id: `reverse_${reverse.route_id}`,
        from: fromE,
        to: toE,
        accepted: true,
        hops,
      },
      multi_hop: hops.length > 2,
      hops,
      expression,
      decision: `reverse:${reverse.route_id}`,
    };
  }

  // Default multi-hop via presence (O02 safe default)
  if (fromE !== "presence" && toE !== "presence") {
    const hops: EmbodimentId[] = [fromE, "presence", toE];
    return {
      same_embodiment: false,
      embodiment_route: {
        route_id: `${fromE}_via_presence_to_${toE}`,
        from: fromE,
        to: toE,
        accepted: true,
        hops,
      },
      multi_hop: true,
      hops,
      expression,
      decision: "O02_default_mediated_via_presence",
    };
  }

  // Fallback hop via presence even if one end is presence-adjacent unknown
  const hops: EmbodimentId[] =
    fromE === "presence" ? [fromE, toE] : toE === "presence" ? [fromE, toE] : [fromE, "presence", toE];
  return {
    same_embodiment: false,
    embodiment_route: {
      route_id: `fallback_${fromE}_to_${toE}`,
      from: fromE,
      to: toE,
      accepted: true,
      hops,
    },
    multi_hop: hops.length > 2,
    hops,
    expression,
    decision: "fallback_presence_bridge",
  };
}

/** Expression family transition adjacency (within-family preferred). */
export function expressionTransitionCost(fromId: string, toId: string): number {
  if (fromId === toId) return 0;
  const fa = fromId.split("-")[0] ?? "";
  const tb = toId.split("-")[0] ?? "";
  if (fa === tb) return 1;
  // recovering / neutral bridges are cheap
  if (fa === "neutral" || tb === "neutral") return 1.5;
  if (fa === "blocked" && tb === "pleased") return 2.5;
  return 2;
}
