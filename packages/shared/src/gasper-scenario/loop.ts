/**
 * Closed eight-state loop route + transition plans.
 * dormant-orbit-maintain → wake → presence-neutral-settled
 */

import { contentHash } from "./hash";
import type {
  EightScenarioId,
  GasperLoopManifestV1,
  GasperTransitionPlanV1,
} from "./types";
import { EIGHT_SCENARIO_IDS } from "./types";
import { compileEightShowcase } from "./compiler";

const LOOP_ORDER: EightScenarioId[] = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
];

function transition(
  partial: Omit<GasperTransitionPlanV1, "schema" | "transition_content_hash">,
): GasperTransitionPlanV1 {
  const t: GasperTransitionPlanV1 = {
    schema: "gasper.transition-plan.v1",
    ...partial,
  };
  t.transition_content_hash = contentHash({
    schema: t.schema,
    id: t.id,
    from: t.from,
    to: t.to,
    kind: t.kind,
    duration_hint_ms: t.duration_hint_ms,
    interrupt_class: t.interrupt_class,
    easing: t.easing,
    preserve_channels: t.preserve_channels,
  });
  return t;
}

export function buildLoopTransitions(): GasperTransitionPlanV1[] {
  const edges: Array<{
    from: EightScenarioId;
    to: EightScenarioId;
    kind: GasperTransitionPlanV1["kind"];
    ms: number;
    interrupt: GasperTransitionPlanV1["interrupt_class"];
    notes?: string;
  }> = [
    {
      from: "presence-neutral-settled",
      to: "presence-listening-receive",
      kind: "intra_embodiment",
      ms: 480,
      interrupt: "soft",
      notes: "Orient to incoming signal.",
    },
    {
      from: "presence-listening-receive",
      to: "presence-thinking-knit",
      kind: "intra_embodiment",
      ms: 620,
      interrupt: "soft",
      notes: "Internalize for integration.",
    },
    {
      from: "presence-thinking-knit",
      to: "presence-recognition-spark",
      kind: "intra_embodiment",
      ms: 420,
      interrupt: "soft",
      notes: "Pattern match / recognition.",
    },
    {
      from: "presence-recognition-spark",
      to: "comet-executing-drive",
      kind: "embodiment_morph",
      ms: 780,
      interrupt: "morph_safe",
      notes: "Presence → Comet for directed execution.",
    },
    {
      from: "comet-executing-drive",
      to: "presence-blocked-strain",
      kind: "embodiment_morph",
      ms: 700,
      interrupt: "hard",
      notes: "Obstacle; retarget to Presence under strain.",
    },
    {
      from: "presence-blocked-strain",
      to: "presence-pleased-resolve",
      kind: "intra_embodiment",
      ms: 650,
      interrupt: "soft",
      notes: "Resolution / competence settle.",
    },
    {
      from: "presence-pleased-resolve",
      to: "dormant-orbit-maintain",
      kind: "embodiment_morph",
      ms: 900,
      interrupt: "morph_safe",
      notes: "Low-energy self-maintenance.",
    },
    {
      from: "dormant-orbit-maintain",
      to: "presence-neutral-settled",
      kind: "wake",
      ms: 1100,
      interrupt: "morph_safe",
      notes: "True wake route closes the loop.",
    },
  ];

  return edges.map((e) =>
    transition({
      id: `tx_${e.from}__${e.to}`,
      from: e.from,
      to: e.to,
      kind: e.kind,
      duration_hint_ms: {
        min: Math.round(e.ms * 0.7),
        target: e.ms,
        max: Math.round(e.ms * 1.4),
      },
      interrupt_class: e.interrupt,
      easing: e.kind === "wake" ? "power2.out" : "power2.inOut",
      preserve_channels:
        e.kind === "intra_embodiment"
          ? ["material", "world_lighting_optics"]
          : ["material"],
      notes: e.notes,
    }),
  );
}

export function buildLoopManifest(seed = 7007): GasperLoopManifestV1 {
  const compiled = compileEightShowcase();
  const byId = new Map(compiled.results.map((r) => [r.id, r.ir] as const));
  const transitions = buildLoopTransitions();
  const wake = transitions.find((t) => t.kind === "wake")!;

  const states = LOOP_ORDER.map((id) => {
    const ir = byId.get(id)!;
    return {
      id,
      state_content_hash: ir.state.state_content_hash,
      embodiment: ir.state.embodiment,
    };
  });

  const manifest: GasperLoopManifestV1 = {
    schema: "gasper.loop-manifest.v1",
    id: "gasper-eight-state-living-loop",
    version: "1.0.0",
    loop_content_hash: "",
    closed: true,
    order: [...LOOP_ORDER],
    states,
    transitions,
    wake_route: {
      from: "dormant-orbit-maintain",
      to: "presence-neutral-settled",
      transition_id: wake.id,
    },
    seed,
  };

  manifest.loop_content_hash = contentHash({
    schema: manifest.schema,
    id: manifest.id,
    version: manifest.version,
    closed: manifest.closed,
    order: manifest.order,
    states: manifest.states,
    transitions: manifest.transitions.map((t) => t.transition_content_hash),
    wake_route: manifest.wake_route,
    seed: manifest.seed,
  });

  return manifest;
}

export function assertLoopClosed(manifest: GasperLoopManifestV1): boolean {
  if (!manifest.closed) return false;
  if (manifest.order.length !== EIGHT_SCENARIO_IDS.length) return false;
  if (manifest.transitions.length !== EIGHT_SCENARIO_IDS.length) return false;
  if (manifest.wake_route.from !== "dormant-orbit-maintain") return false;
  if (manifest.wake_route.to !== "presence-neutral-settled") return false;
  // Every consecutive pair + wrap
  for (let i = 0; i < manifest.order.length; i++) {
    const from = manifest.order[i]!;
    const to = manifest.order[(i + 1) % manifest.order.length]!;
    const tx = manifest.transitions.find((t) => t.from === from && t.to === to);
    if (!tx) return false;
  }
  return true;
}

export { LOOP_ORDER };
