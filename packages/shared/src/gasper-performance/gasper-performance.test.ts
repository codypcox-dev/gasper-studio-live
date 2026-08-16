import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import * as perf from "./index.js";
import * as pkg from "../index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..", "..");
const HERO_BINDINGS = join(
  REPO_ROOT,
  "packages/gasper-demo-content/content/gasper-hero-pack-v1/bindings-used.json",
);

const ARTIFACTS = [
  "intent.schema.json",
  "ir.schema.json",
  "affect-dimensions.json",
  "channel-registry.v1.json",
  "embodiment-routes.v1.json",
] as const;

describe("GASPER-006 D001 performance contract authority", () => {
  it("every JSON artifact parses", () => {
    for (const file of ARTIFACTS) {
      const raw = readFileSync(join(HERE, file), "utf8");
      expect(() => JSON.parse(raw)).not.toThrow();
      const parsed = JSON.parse(raw);
      expect(parsed).toBeTypeOf("object");
    }
  });

  it("loaders return non-empty contracts", () => {
    expect(perf.loadIntentSchema().$id).toContain("intent");
    expect(perf.loadIrSchema().$id).toContain("ir");
    expect(perf.loadAffectDimensions().dimensions.length).toBeGreaterThanOrEqual(7);
    expect(perf.loadChannelRegistry().channels.length).toBeGreaterThan(30);
    expect(perf.loadEmbodimentRoutes().routes.length).toBeGreaterThanOrEqual(7);
  });

  it("intent schema accepts a valid minimal intent", () => {
    const intent = perf.minimalValidIntent();
    const r = perf.validatePerformanceIntent(intent);
    expect(r.ok).toBe(true);
  });

  it("intent schema rejects unknown closed-enum values", () => {
    const badTag = perf.minimalValidIntent();
    badTag.phases[0]!.intent_tags = ["notice", "not_a_real_tag" as perf.IntentTag];
    const r1 = perf.validatePerformanceIntent(badTag);
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.issues.some((i) => i.code === "UNKNOWN_INTENT_TAG")).toBe(true);
    }

    const badInterrupt = perf.minimalValidIntent();
    badInterrupt.phases[0]!.interrupt_class = "teleport" as perf.InterruptClass;
    const r2 = perf.validatePerformanceIntent(badInterrupt);
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.issues.some((i) => i.code === "UNKNOWN_INTERRUPT_CLASS")).toBe(true);
    }
  });

  it("IR schema accepts a valid minimal IR", () => {
    const ir = perf.minimalValidIR();
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(true);
  });

  it("IR rejects unknown channel identifiers", () => {
    const ir = perf.minimalValidIR({
      channel_trajectories: {
        totally_unknown_channel: {
          channel_id: "totally_unknown_channel",
          keys: [{ t_ms: 0, value: 0 }],
        },
      },
    });
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === "UNKNOWN_CHANNEL_ID")).toBe(true);
    }
  });

  it("channel IDs are unique", () => {
    const integrity = perf.assertChannelRegistryIntegrity();
    expect(integrity.duplicates).toEqual([]);
    expect(new Set(integrity.ids).size).toBe(integrity.ids.length);
  });

  it("route IDs are unique", () => {
    const integrity = perf.assertRouteGraphIntegrity();
    expect(integrity.duplicateRouteIds).toEqual([]);
  });

  it("every route references recognized embodiments", () => {
    const integrity = perf.assertRouteGraphIntegrity();
    expect(integrity.unknownEmbodiments).toEqual([]);
    expect(integrity.ok).toBe(true);
  });

  it("every registry range has min <= default <= max", () => {
    const integrity = perf.assertChannelRegistryIntegrity();
    expect(integrity.rangeViolations).toEqual([]);
  });

  it("every hero-pack binding is represented", () => {
    const hero = JSON.parse(readFileSync(HERO_BINDINGS, "utf8")) as {
      all: string[];
      required: string[];
      optional: string[];
    };
    const registryIds = new Set(perf.loadChannelRegistry().channels.map((c) => c.id));
    const missing = hero.all.filter((id) => !registryIds.has(id));
    expect(missing).toEqual([]);
    for (const id of hero.required) {
      expect(registryIds.has(id)).toBe(true);
    }
    for (const id of hero.optional) {
      expect(registryIds.has(id)).toBe(true);
    }
  });

  it("hash-input canonicalization is stable for reordered object keys", () => {
    const a = {
      seed: 7,
      z: 1.23456789,
      nested: { b: 2, a: 1 },
      list: [3, 1, 2],
    };
    const b = {
      list: [3, 1, 2],
      nested: { a: 1, b: 2 },
      z: 1.23456789,
      seed: 7,
    };
    expect(perf.stableStringify(a)).toBe(perf.stableStringify(b));
    expect(perf.sha256OfCanonical(a)).toBe(perf.sha256OfCanonical(b));

    const intent = perf.minimalValidIntent();
    const basis1 = perf.buildDeterminismHashBasis({
      intent,
      seed: intent.seed,
      compiler_version: "0.1.0",
    });
    // Reordered intent keys via re-parse
    const reordered = JSON.parse(
      JSON.stringify({
        provenance: intent.provenance,
        phases: intent.phases,
        global_constraints: intent.global_constraints,
        identity_lock: intent.identity_lock,
        character: intent.character,
        seed: intent.seed,
        title: intent.title,
        id: intent.id,
        schema: intent.schema,
      }),
    );
    const basis2 = perf.buildDeterminismHashBasis({
      intent: reordered,
      seed: intent.seed,
      compiler_version: "0.1.0",
    });
    expect(perf.hashDeterminismBasis(basis1)).toBe(perf.hashDeterminismBasis(basis2));

    // compiled_at must not be in basis keys
    expect(Object.keys(basis1).sort()).toEqual(
      [
        "affect_dimension_registry_hash",
        "compiler_version",
        "intent_content",
        "registry_hash",
        "route_graph_hash",
        "seed",
      ].sort(),
    );
  });

  it("TypeScript exports compile (package re-export surface)", () => {
    expect(typeof perf.validatePerformanceIntent).toBe("function");
    expect(typeof perf.validatePerformanceIR).toBe("function");
    expect(typeof perf.buildDeterminismHashBasis).toBe("function");
    expect(perf.INTENT_TAGS).toContain("notice");
    expect(perf.INTERRUPT_CLASSES).toEqual(["soft", "hard", "barrier", "morph_safe"]);
    expect(perf.AFFECT_DIMENSIONS_REQUIRED).toEqual([
      "valence",
      "arousal",
      "expression_gain",
      "attention",
      "certainty",
    ]);
    expect(perf.AFFECT_DIMENSIONS_PROVISIONAL).toEqual(["social_openness", "urgency"]);
    expect(pkg.PERFORMANCE_SCHEMA_IDS.intent).toBe("gasper.performance.intent.v1");
    expect(typeof pkg.validatePerformanceIntent).toBe("function");
    expect(typeof pkg.loadChannelRegistry).toBe("function");
  });

  it("affect registry matches D01 freeze + provisional", () => {
    const a = perf.assertAffectRegistryIntegrity();
    expect(a.ok).toBe(true);
    expect(a.missingRequired).toEqual([]);
    const reg = perf.loadAffectDimensions();
    const byId = Object.fromEntries(reg.dimensions.map((d) => [d.id, d]));
    expect(byId.valence?.status).toBe("freeze");
    expect(byId.social_openness?.status).toBe("provisional");
    expect(byId.urgency?.status).toBe("provisional");
  });

  it("O02 singularity→comet remains gated (not a silent accepted route)", () => {
    const graph = perf.loadEmbodimentRoutes();
    const acceptedDirect = graph.routes.filter(
      (r) => r.from === "singularity" && (r.to === "comet" || r.to.startsWith("comet")),
    );
    expect(acceptedDirect).toEqual([]);
    const gated = graph.gated_routes.filter((g) => g.open_decision === "O02");
    expect(gated.length).toBeGreaterThanOrEqual(1);
    expect(gated.every((g) => g.status.includes("unsupported") || g.status.includes("pending"))).toBe(
      true,
    );
  });

  it("accepted routes include the initial graph edges", () => {
    const graph = perf.loadEmbodimentRoutes();
    const edges = new Set(graph.routes.map((r) => `${r.from}->${r.to}`));
    expect(edges.has("presence->singularity")).toBe(true);
    expect(edges.has("singularity->presence")).toBe(true);
    expect(edges.has("presence->comet-left")).toBe(true);
    expect(edges.has("presence->comet-right")).toBe(true);
    expect(edges.has("comet->presence")).toBe(true);
    expect(edges.has("presence->dormant-orbit")).toBe(true);
    expect(edges.has("dormant-orbit->presence")).toBe(true);
  });
});

describe("GASPER-006 D001A contract invariants — Intent", () => {
  it("rejects duplicate phase IDs", () => {
    const intent = perf.minimalValidIntent({
      phases: [
        {
          id: "phase-a",
          intent_tags: ["notice"],
          affect_target: {
            valence: 0,
            arousal: 0.3,
            expression_gain: 0.4,
            attention: 0.5,
            certainty: 0.3,
          },
          interrupt_class: "soft",
        },
        {
          id: "phase-a",
          intent_tags: ["settle"],
          affect_target: {
            valence: 0.1,
            arousal: 0.2,
            expression_gain: 0.3,
            attention: 0.4,
            certainty: 0.5,
          },
          interrupt_class: "soft",
        },
      ],
    });
    const r = perf.validatePerformanceIntent(intent);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "DUPLICATE_PHASE_ID")).toBe(true);
  });

  it("rejects duration_hint_ms when min > target or target > max or min < 0", () => {
    const base = perf.minimalValidIntent();
    base.phases[0]!.duration_hint_ms = { min: 900, target: 400, max: 1200 };
    const r1 = perf.validatePerformanceIntent(base);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.issues.some((i) => i.code === "DURATION_HINT_ORDER")).toBe(true);

    const base2 = perf.minimalValidIntent();
    base2.phases[0]!.duration_hint_ms = { min: -1, target: 0, max: 10 };
    const r2 = perf.validatePerformanceIntent(base2);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.issues.some((i) => i.code === "DURATION_HINT_ORDER")).toBe(true);
  });

  it("rejects duplicate intent tags within a phase", () => {
    const intent = perf.minimalValidIntent();
    intent.phases[0]!.intent_tags = ["notice", "notice"];
    const r = perf.validatePerformanceIntent(intent);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "DUPLICATE_INTENT_TAG")).toBe(true);
  });

  it("rejects nested unknown fields (phase / constraints / duration)", () => {
    const intent = perf.minimalValidIntent() as perf.PerformanceIntent & {
      phases: Array<Record<string, unknown>>;
    };
    intent.phases[0] = { ...intent.phases[0]!, rogue_nested: true };
    const r = perf.validatePerformanceIntent(intent);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "INTENT_UNKNOWN_KEY")).toBe(true);
  });

  it("rejects open reduced_motion_policy values", () => {
    const intent = perf.minimalValidIntent();
    (intent.global_constraints as { reduced_motion_policy?: string }).reduced_motion_policy =
      "delete_everything";
    const r = perf.validatePerformanceIntent(intent);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === "UNKNOWN_REDUCED_MOTION_POLICY")).toBe(true);
    }
  });

  it("rejects open provenance authored_by values", () => {
    const intent = perf.minimalValidIntent({
      provenance: { authored_by: "alien" as "human", source_refs: [] },
    });
    const r = perf.validatePerformanceIntent(intent);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "UNKNOWN_PROVENANCE_AUTHOR")).toBe(true);
  });

  it("bounds optional affect dimensions when supplied", () => {
    const intent = perf.minimalValidIntent();
    intent.phases[0]!.affect_target.social_openness = 1.5;
    intent.phases[0]!.affect_target.urgency = -0.1;
    const r = perf.validatePerformanceIntent(intent);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.filter((i) => i.code === "AFFECT_RANGE").length).toBeGreaterThanOrEqual(2);
    }
  });

  it("accepts valid duration order and optional affect dims in range", () => {
    const intent = perf.minimalValidIntent();
    intent.phases[0]!.duration_hint_ms = { min: 0, target: 100, max: 100 };
    intent.phases[0]!.affect_target.social_openness = 0.5;
    intent.phases[0]!.affect_target.urgency = 0;
    expect(perf.validatePerformanceIntent(intent).ok).toBe(true);
  });
});

describe("GASPER-006 D001A contract invariants — IR", () => {
  it("requires map key to equal channel_id", () => {
    const ir = perf.minimalValidIR({
      channel_trajectories: {
        eye_openness: {
          channel_id: "energy_level",
          keys: [{ t_ms: 0, value: 0.5 }],
        },
      },
    });
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "CHANNEL_KEY_MISMATCH")).toBe(true);
  });

  it("rejects channel values outside registry range", () => {
    const ir = perf.minimalValidIR({
      channel_trajectories: {
        eye_openness: {
          channel_id: "eye_openness",
          keys: [{ t_ms: 0, value: 9.9 }],
        },
      },
    });
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "CHANNEL_VALUE_RANGE")).toBe(true);
  });

  it("rejects non-monotonic or negative channel key times", () => {
    const ir = perf.minimalValidIR({
      channel_trajectories: {
        eye_openness: {
          channel_id: "eye_openness",
          keys: [
            { t_ms: 100, value: 0.5 },
            { t_ms: 50, value: 0.6 },
          ],
        },
      },
    });
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "CHANNEL_KEY_ORDER")).toBe(true);

    const ir2 = perf.minimalValidIR({
      channel_trajectories: {
        eye_openness: {
          channel_id: "eye_openness",
          keys: [{ t_ms: -1, value: 0.5 }],
        },
      },
    });
    const r2 = perf.validatePerformanceIR(ir2);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.issues.some((i) => i.code === "CHANNEL_KEY_TIME")).toBe(true);
  });

  it("rejects affect spans that violate 0 <= t0 <= t1", () => {
    const ir = perf.minimalValidIR();
    ir.affect_trajectory.spans[0]!.t0_ms = 800;
    ir.affect_trajectory.spans[0]!.t1_ms = 100;
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "AFFECT_SPAN_ORDER")).toBe(true);
  });

  it("accepts registered route ids and rejects endpoint mismatches", () => {
    const good = perf.minimalValidIR({
      routes: {
        steps: [
          {
            route_id: "presence_to_singularity",
            from: "presence",
            to: "singularity",
            t0_ms: 0,
            duration_ms: 1400,
          },
        ],
      },
    });
    expect(perf.validatePerformanceIR(good).ok).toBe(true);

    const badEnds = perf.minimalValidIR({
      routes: {
        steps: [
          {
            route_id: "presence_to_singularity",
            from: "presence",
            to: "comet",
          },
        ],
      },
    });
    const r = perf.validatePerformanceIR(badEnds);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "ROUTE_ENDPOINT_MISMATCH")).toBe(true);
  });

  it("surfaces gated and unknown routes with stable codes", () => {
    const gated = perf.minimalValidIR({
      routes: {
        steps: [{ route_id: "singularity_to_comet", from: "singularity", to: "comet" }],
      },
    });
    const r1 = perf.validatePerformanceIR(gated);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.issues.some((i) => i.code === "GATED_ROUTE_USED")).toBe(true);

    const unknown = perf.minimalValidIR({
      routes: {
        steps: [{ route_id: "teleport_to_mars", from: "presence", to: "singularity" }],
      },
    });
    const r2 = perf.validatePerformanceIR(unknown);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.issues.some((i) => i.code === "UNKNOWN_ROUTE_ID")).toBe(true);
  });

  it("rejects duplicate route steps", () => {
    const ir = perf.minimalValidIR({
      routes: {
        steps: [
          { route_id: "presence_to_singularity", from: "presence", to: "singularity", t0_ms: 0 },
          { route_id: "presence_to_singularity", from: "presence", to: "singularity", t0_ms: 0 },
        ],
      },
    });
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.code === "DUPLICATE_ROUTE_STEP")).toBe(true);
  });

  it("rejects non-canonical hash fields and open validation status", () => {
    expect(perf.isCanonicalSha256("sha256:" + "ab".repeat(32))).toBe(true);
    expect(perf.isCanonicalSha256("not-a-hash")).toBe(false);

    const ir = perf.minimalValidIR({
      content_hash: "not-a-hash",
      validation: { status: "maybe" as "compiled", issues: [] },
    });
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === "HASH_FORMAT")).toBe(true);
      expect(r.issues.some((i) => i.code === "UNKNOWN_VALIDATION_STATUS")).toBe(true);
    }
  });

  it("rejects nested unknown IR fields and bad interrupt classes on boundaries", () => {
    const ir = perf.minimalValidIR() as perf.PerformanceIR & Record<string, unknown>;
    ir.extra_top = 1;
    ir.interrupt_plan = {
      default_class: "soft",
      boundaries: [{ phase_id: "p", interrupt_class: "warp" as "soft" }],
    };
    const r = perf.validatePerformanceIR(ir);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === "IR_UNKNOWN_KEY")).toBe(true);
      expect(r.issues.some((i) => i.code === "UNKNOWN_INTERRUPT_CLASS")).toBe(true);
    }
  });
});
