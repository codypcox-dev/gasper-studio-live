/**
 * GASPER-006 WS1 — Performance Grammar contract authority.
 * Schemas, registries, types, validation helpers, determinism hash inputs.
 * Does NOT implement the behavioral compiler body.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AFFECT_DIMENSIONS_REQUIRED,
  EMBODIMENT_IDS,
  INTENT_TAGS,
  INTERRUPT_CLASSES,
  PERFORMANCE_SCHEMA_IDS,
  type AffectDimensionRegistry,
  type AffectPoint,
  type ChannelRegistry,
  type DeterminismHashBasis,
  type EmbodimentRouteGraph,
  type PerformanceIR,
  type PerformanceIntent,
  type ValidationIssue,
} from "./types.js";
import {
  canonicalizeForHash,
  hashJsonArtifact,
  sha256OfCanonical,
} from "./hashing.js";

export * from "./types.js";
export * from "./hashing.js";
export * from "./reference/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const ARTIFACT_FILES = {
  intentSchema: "intent.schema.json",
  irSchema: "ir.schema.json",
  affectDimensions: "affect-dimensions.json",
  channelRegistry: "channel-registry.v1.json",
  embodimentRoutes: "embodiment-routes.v1.json",
} as const;

function resolveArtifact(name: string): string {
  // Prefer colocated (src or dist after copy), then fallback to src path from dist.
  const candidates = [
    join(HERE, name),
    join(HERE, "..", "gasper-performance", name),
    join(HERE, "..", "..", "src", "gasper-performance", name),
  ];
  for (const p of candidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return join(HERE, name);
}

export function loadPerformanceJsonArtifact(name: keyof typeof ARTIFACT_FILES | string): unknown {
  const file =
    name in ARTIFACT_FILES
      ? ARTIFACT_FILES[name as keyof typeof ARTIFACT_FILES]
      : String(name);
  const path = resolveArtifact(file);
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadIntentSchema(): Record<string, unknown> {
  return loadPerformanceJsonArtifact("intentSchema") as Record<string, unknown>;
}

export function loadIrSchema(): Record<string, unknown> {
  return loadPerformanceJsonArtifact("irSchema") as Record<string, unknown>;
}

export function loadAffectDimensions(): AffectDimensionRegistry {
  return loadPerformanceJsonArtifact("affectDimensions") as AffectDimensionRegistry;
}

export function loadChannelRegistry(): ChannelRegistry {
  return loadPerformanceJsonArtifact("channelRegistry") as ChannelRegistry;
}

export function loadEmbodimentRoutes(): EmbodimentRouteGraph {
  return loadPerformanceJsonArtifact("embodimentRoutes") as EmbodimentRouteGraph;
}

export function listPerformanceArtifactPaths(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, file] of Object.entries(ARTIFACT_FILES)) {
    out[key] = resolveArtifact(file);
  }
  return out;
}

/**
 * Build the canonical determinism hash basis for future compilation.
 * Excludes wall-clock fields such as compiled_at.
 */
export function buildDeterminismHashBasis(input: {
  intent: PerformanceIntent | unknown;
  seed: number;
  compiler_version: string;
  channel_registry?: ChannelRegistry | unknown;
  route_graph?: EmbodimentRouteGraph | unknown;
  affect_dimensions?: AffectDimensionRegistry | unknown;
}): DeterminismHashBasis {
  const channel_registry = input.channel_registry ?? loadChannelRegistry();
  const route_graph = input.route_graph ?? loadEmbodimentRoutes();
  const affect_dimensions = input.affect_dimensions ?? loadAffectDimensions();

  // Intent content excludes nothing volatile at Intent layer (seed is separate).
  const intentObj = input.intent as Record<string, unknown>;
  const { seed: _seed, ...intentWithoutSeed } = intentObj ?? {};
  void _seed;

  return {
    intent_content: canonicalizeForHash(intentWithoutSeed),
    seed: input.seed,
    compiler_version: input.compiler_version,
    registry_hash: hashJsonArtifact(channel_registry),
    route_graph_hash: hashJsonArtifact(route_graph),
    affect_dimension_registry_hash: hashJsonArtifact(affect_dimensions),
  };
}

export function hashDeterminismBasis(basis: DeterminismHashBasis): string {
  return `sha256:${sha256OfCanonical(basis)}`;
}

// ─── Validation (schema-aligned, no external AJV dependency) ────────────────

export type ValidateResult =
  | { ok: true; value: unknown }
  | { ok: false; issues: ValidationIssue[] };

function issue(code: string, message: string, path = ""): ValidationIssue {
  return { code, message, path, severity: "error" };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const REDUCED_MOTION_POLICIES = ["scale_durations", "skip_secondary", "hold_static"] as const;
const PROVENANCE_AUTHORS = ["human", "mcp", "hybrid"] as const;
const CHANNEL_VELOCITIES = ["low", "medium", "high"] as const;
const VALIDATION_STATUSES = ["compiled", "warnings", "failed"] as const;
const COMBINATORS = ["replace", "max", "weighted_sum", "override_by_priority"] as const;

/** Canonical SHA-256: bare 64 hex or `sha256:` + 64 hex. */
export function isCanonicalSha256(value: string): boolean {
  return /^(sha256:)?[a-f0-9]{64}$/.test(value);
}

function rejectUnknownKeys(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[],
  code = "UNKNOWN_FIELD",
): void {
  const allow = new Set(allowed);
  for (const k of Object.keys(obj)) {
    if (!allow.has(k)) {
      issues.push(issue(code, `unknown field: ${k}`, path ? `${path}.${k}` : k));
    }
  }
}

function validateAffectPoint(p: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(p)) {
    issues.push(issue("AFFECT_NOT_OBJECT", "affect point must be object", path));
    return;
  }
  rejectUnknownKeys(
    p,
    [
      "valence",
      "arousal",
      "expression_gain",
      "attention",
      "certainty",
      "social_openness",
      "urgency",
    ],
    path,
    issues,
    "AFFECT_UNKNOWN_DIM",
  );
  for (const dim of AFFECT_DIMENSIONS_REQUIRED) {
    if (typeof p[dim] !== "number") {
      issues.push(issue("AFFECT_MISSING", `required affect dimension ${dim}`, `${path}.${dim}`));
    }
  }
  for (const [k, v] of Object.entries(p)) {
    if (typeof v !== "number") {
      if (
        (AFFECT_DIMENSIONS_REQUIRED as readonly string[]).includes(k) ||
        k === "social_openness" ||
        k === "urgency"
      ) {
        issues.push(issue("AFFECT_TYPE", `${k} must be number`, `${path}.${k}`));
      }
      continue;
    }
    if (k === "valence") {
      if (v < -1 || v > 1) {
        issues.push(issue("AFFECT_RANGE", "valence must be in [-1,1]", `${path}.${k}`));
      }
    } else if (v < 0 || v > 1) {
      issues.push(issue("AFFECT_RANGE", `${k} must be in [0,1]`, `${path}.${k}`));
    }
  }
}

/** Validate a Performance Intent instance against the closed contract. */
export function validatePerformanceIntent(raw: unknown): ValidateResult {
  const issues: ValidationIssue[] = [];
  if (!isObject(raw)) {
    return { ok: false, issues: [issue("INTENT_NOT_OBJECT", "intent must be object")] };
  }

  rejectUnknownKeys(
    raw,
    [
      "schema",
      "id",
      "title",
      "seed",
      "character",
      "identity_lock",
      "phases",
      "global_constraints",
      "provenance",
    ],
    "",
    issues,
    "INTENT_UNKNOWN_KEY",
  );

  if (raw.schema !== PERFORMANCE_SCHEMA_IDS.intent) {
    issues.push(
      issue("INTENT_SCHEMA", `schema must be ${PERFORMANCE_SCHEMA_IDS.intent}`, "schema"),
    );
  }
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    issues.push(issue("INTENT_ID", "id required string", "id"));
  }
  if (typeof raw.seed !== "number" || !Number.isInteger(raw.seed)) {
    issues.push(issue("INTENT_SEED", "seed required integer", "seed"));
  }
  if (raw.character !== "gasper") {
    issues.push(issue("INTENT_CHARACTER", "character must be gasper", "character"));
  }
  if (typeof raw.identity_lock !== "boolean") {
    issues.push(issue("INTENT_IDENTITY", "identity_lock required boolean", "identity_lock"));
  }

  if (!isObject(raw.global_constraints)) {
    issues.push(issue("INTENT_CONSTRAINTS", "global_constraints required", "global_constraints"));
  } else {
    const gc = raw.global_constraints;
    rejectUnknownKeys(
      gc,
      [
        "topology_lock",
        "legacy_authority_required",
        "no_arbitrary_gsap",
        "reduced_motion_policy",
      ],
      "global_constraints",
      issues,
      "INTENT_UNKNOWN_KEY",
    );
    for (const k of [
      "topology_lock",
      "legacy_authority_required",
      "no_arbitrary_gsap",
    ] as const) {
      if (typeof gc[k] !== "boolean") {
        issues.push(
          issue("INTENT_CONSTRAINTS", `${k} required boolean`, `global_constraints.${k}`),
        );
      }
    }
    if (gc.reduced_motion_policy !== undefined) {
      if (!(REDUCED_MOTION_POLICIES as readonly string[]).includes(String(gc.reduced_motion_policy))) {
        issues.push(
          issue(
            "UNKNOWN_REDUCED_MOTION_POLICY",
            `reduced_motion_policy not in closed set: ${String(gc.reduced_motion_policy)}`,
            "global_constraints.reduced_motion_policy",
          ),
        );
      }
    }
  }

  if (raw.provenance !== undefined) {
    if (!isObject(raw.provenance)) {
      issues.push(issue("PROVENANCE_TYPE", "provenance must be object", "provenance"));
    } else {
      rejectUnknownKeys(
        raw.provenance,
        ["authored_by", "source_refs"],
        "provenance",
        issues,
        "INTENT_UNKNOWN_KEY",
      );
      if (raw.provenance.authored_by !== undefined) {
        if (!(PROVENANCE_AUTHORS as readonly string[]).includes(String(raw.provenance.authored_by))) {
          issues.push(
            issue(
              "UNKNOWN_PROVENANCE_AUTHOR",
              `authored_by not in closed set: ${String(raw.provenance.authored_by)}`,
              "provenance.authored_by",
            ),
          );
        }
      }
      if (raw.provenance.source_refs !== undefined) {
        if (
          !Array.isArray(raw.provenance.source_refs) ||
          !raw.provenance.source_refs.every((x) => typeof x === "string")
        ) {
          issues.push(
            issue("PROVENANCE_SOURCE_REFS", "source_refs must be string[]", "provenance.source_refs"),
          );
        }
      }
    }
  }

  if (!Array.isArray(raw.phases) || raw.phases.length === 0) {
    issues.push(issue("INTENT_PHASES", "phases must be non-empty array", "phases"));
  } else {
    const phaseIds = new Set<string>();
    raw.phases.forEach((phase, i) => {
      const pp = `phases[${i}]`;
      if (!isObject(phase)) {
        issues.push(issue("PHASE_NOT_OBJECT", "phase must be object", pp));
        return;
      }
      rejectUnknownKeys(
        phase,
        [
          "id",
          "label",
          "intent_tags",
          "duration_hint_ms",
          "affect_target",
          "embodiment_preference",
          "expression_anchor",
          "interrupt_class",
          "constraints",
        ],
        pp,
        issues,
        "INTENT_UNKNOWN_KEY",
      );
      if (typeof phase.id !== "string" || !phase.id) {
        issues.push(issue("PHASE_ID", "phase.id required", `${pp}.id`));
      } else if (phaseIds.has(phase.id)) {
        issues.push(
          issue("DUPLICATE_PHASE_ID", `duplicate phase id: ${phase.id}`, `${pp}.id`),
        );
      } else {
        phaseIds.add(phase.id);
      }

      if (!Array.isArray(phase.intent_tags) || phase.intent_tags.length === 0) {
        issues.push(issue("PHASE_TAGS", "intent_tags required non-empty", `${pp}.intent_tags`));
      } else {
        const tagSeen = new Set<string>();
        for (const tag of phase.intent_tags) {
          const t = String(tag);
          if (!(INTENT_TAGS as readonly string[]).includes(t)) {
            issues.push(
              issue(
                "UNKNOWN_INTENT_TAG",
                `unknown intent tag (closed vocabulary): ${t}`,
                `${pp}.intent_tags`,
              ),
            );
          }
          if (tagSeen.has(t)) {
            issues.push(
              issue("DUPLICATE_INTENT_TAG", `duplicate intent tag: ${t}`, `${pp}.intent_tags`),
            );
          }
          tagSeen.add(t);
        }
      }

      if (phase.duration_hint_ms !== undefined) {
        if (!isObject(phase.duration_hint_ms)) {
          issues.push(
            issue("DURATION_HINT_TYPE", "duration_hint_ms must be object", `${pp}.duration_hint_ms`),
          );
        } else {
          const d = phase.duration_hint_ms;
          rejectUnknownKeys(
            d,
            ["min", "target", "max"],
            `${pp}.duration_hint_ms`,
            issues,
            "INTENT_UNKNOWN_KEY",
          );
          const min = d.min;
          const target = d.target;
          const max = d.max;
          if (typeof min !== "number" || typeof target !== "number" || typeof max !== "number") {
            issues.push(
              issue(
                "DURATION_HINT_TYPE",
                "duration_hint_ms.min/target/max must be numbers",
                `${pp}.duration_hint_ms`,
              ),
            );
          } else if (!(0 <= min && min <= target && target <= max)) {
            issues.push(
              issue(
                "DURATION_HINT_ORDER",
                "duration_hint_ms must satisfy 0 <= min <= target <= max",
                `${pp}.duration_hint_ms`,
              ),
            );
          }
        }
      }

      if (!(INTERRUPT_CLASSES as readonly string[]).includes(String(phase.interrupt_class))) {
        issues.push(
          issue(
            "UNKNOWN_INTERRUPT_CLASS",
            `unknown interrupt_class: ${String(phase.interrupt_class)}`,
            `${pp}.interrupt_class`,
          ),
        );
      }
      if (phase.embodiment_preference !== undefined) {
        if (!(EMBODIMENT_IDS as readonly string[]).includes(String(phase.embodiment_preference))) {
          issues.push(
            issue(
              "UNKNOWN_EMBODIMENT",
              `unknown embodiment_preference: ${String(phase.embodiment_preference)}`,
              `${pp}.embodiment_preference`,
            ),
          );
        }
      }
      if (phase.constraints !== undefined) {
        if (!isObject(phase.constraints)) {
          issues.push(issue("PHASE_CONSTRAINTS_TYPE", "constraints must be object", `${pp}.constraints`));
        } else {
          rejectUnknownKeys(
            phase.constraints,
            ["preserve_identity", "max_channel_velocity"],
            `${pp}.constraints`,
            issues,
            "INTENT_UNKNOWN_KEY",
          );
          if (
            phase.constraints.max_channel_velocity !== undefined &&
            !(CHANNEL_VELOCITIES as readonly string[]).includes(
              String(phase.constraints.max_channel_velocity),
            )
          ) {
            issues.push(
              issue(
                "UNKNOWN_CHANNEL_VELOCITY",
                `max_channel_velocity not in closed set`,
                `${pp}.constraints.max_channel_velocity`,
              ),
            );
          }
        }
      }
      validateAffectPoint(phase.affect_target, `${pp}.affect_target`, issues);
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: raw as PerformanceIntent };
}

/** Validate a Performance IR instance against the closed envelope. */
export function validatePerformanceIR(raw: unknown): ValidateResult {
  const issues: ValidationIssue[] = [];
  if (!isObject(raw)) {
    return { ok: false, issues: [issue("IR_NOT_OBJECT", "IR must be object")] };
  }

  rejectUnknownKeys(
    raw,
    [
      "schema",
      "ir_version",
      "compiler_id",
      "compiler_version",
      "intent_id",
      "intent_content_hash",
      "seed",
      "compiled_at",
      "content_hash",
      "registry_hash",
      "route_graph_hash",
      "affect_dimension_registry_hash",
      "affect_trajectory",
      "channel_trajectories",
      "routes",
      "interrupt_plan",
      "lowered",
      "causal_index",
      "validation",
    ],
    "",
    issues,
    "IR_UNKNOWN_KEY",
  );

  if (raw.schema !== PERFORMANCE_SCHEMA_IDS.ir) {
    issues.push(issue("IR_SCHEMA", `schema must be ${PERFORMANCE_SCHEMA_IDS.ir}`, "schema"));
  }
  for (const k of [
    "ir_version",
    "compiler_id",
    "compiler_version",
    "intent_id",
    "intent_content_hash",
    "content_hash",
  ] as const) {
    if (typeof raw[k] !== "string" || !(raw[k] as string).length) {
      issues.push(issue("IR_FIELD", `${k} required string`, k));
    }
  }
  if (typeof raw.seed !== "number" || !Number.isInteger(raw.seed)) {
    issues.push(issue("IR_SEED", "seed required integer", "seed"));
  }

  for (const hk of [
    "intent_content_hash",
    "content_hash",
    "registry_hash",
    "route_graph_hash",
    "affect_dimension_registry_hash",
  ] as const) {
    const v = raw[hk];
    if (v === undefined) continue;
    if (typeof v !== "string" || !isCanonicalSha256(v)) {
      issues.push(
        issue(
          "HASH_FORMAT",
          `${hk} must be canonical SHA-256 (64 hex or sha256:<64hex>)`,
          hk,
        ),
      );
    }
  }

  const registry = loadChannelRegistry();
  const channelById = new Map(registry.channels.map((c) => [c.id, c]));
  const graph = loadEmbodimentRoutes();
  const acceptedRoutes = new Map(graph.routes.map((r) => [r.route_id, r]));
  const gatedRoutes = new Map((graph.gated_routes ?? []).map((r) => [r.route_id, r]));

  // Affect trajectory
  if (!isObject(raw.affect_trajectory) || !Array.isArray(raw.affect_trajectory.spans)) {
    issues.push(issue("IR_AFFECT", "affect_trajectory.spans required", "affect_trajectory"));
  } else {
    const at = raw.affect_trajectory;
    const spans = at.spans as unknown[];
    rejectUnknownKeys(
      at,
      ["sample_rate_hz_hint", "spans", "holds"],
      "affect_trajectory",
      issues,
      "IR_UNKNOWN_KEY",
    );
    spans.forEach((span, i) => {
      const sp = `affect_trajectory.spans[${i}]`;
      if (!isObject(span)) {
        issues.push(issue("AFFECT_SPAN_TYPE", "span must be object", sp));
        return;
      }
      rejectUnknownKeys(
        span,
        ["t0_ms", "t1_ms", "from", "to", "easing"],
        sp,
        issues,
        "IR_UNKNOWN_KEY",
      );
      const t0 = span.t0_ms;
      const t1 = span.t1_ms;
      if (typeof t0 !== "number" || typeof t1 !== "number") {
        issues.push(issue("AFFECT_SPAN_TIME", "t0_ms and t1_ms required numbers", sp));
      } else if (!(0 <= t0 && t0 <= t1)) {
        issues.push(
          issue("AFFECT_SPAN_ORDER", "affect span must satisfy 0 <= t0_ms <= t1_ms", sp),
        );
      }
      validateAffectPoint(span.from, `${sp}.from`, issues);
      validateAffectPoint(span.to, `${sp}.to`, issues);
      if (typeof span.easing !== "string") {
        issues.push(issue("AFFECT_SPAN_EASING", "easing required string", `${sp}.easing`));
      }
    });
    if (at.holds !== undefined) {
      if (!Array.isArray(at.holds)) {
        issues.push(issue("AFFECT_HOLDS_TYPE", "holds must be array", "affect_trajectory.holds"));
      } else {
        (at.holds as unknown[]).forEach((hold, i) => {
          const hp = `affect_trajectory.holds[${i}]`;
          if (!isObject(hold)) {
            issues.push(issue("AFFECT_HOLD_TYPE", "hold must be object", hp));
            return;
          }
          rejectUnknownKeys(
            hold,
            ["t_ms", "point", "duration_ms"],
            hp,
            issues,
            "IR_UNKNOWN_KEY",
          );
          if (typeof hold.t_ms !== "number" || hold.t_ms < 0) {
            issues.push(issue("AFFECT_HOLD_TIME", "t_ms must be >= 0", `${hp}.t_ms`));
          }
          if (typeof hold.duration_ms !== "number" || hold.duration_ms < 0) {
            issues.push(
              issue("AFFECT_HOLD_DURATION", "duration_ms must be >= 0", `${hp}.duration_ms`),
            );
          }
          validateAffectPoint(hold.point, `${hp}.point`, issues);
        });
      }
    }
  }

  // Channel trajectories
  if (!isObject(raw.channel_trajectories)) {
    issues.push(issue("IR_CHANNELS", "channel_trajectories required object", "channel_trajectories"));
  } else {
    for (const [mapKey, traj] of Object.entries(raw.channel_trajectories)) {
      const cp = `channel_trajectories.${mapKey}`;
      if (!channelById.has(mapKey)) {
        issues.push(
          issue("UNKNOWN_CHANNEL_ID", `unknown channel id (not in registry): ${mapKey}`, cp),
        );
      }
      if (!isObject(traj)) {
        issues.push(issue("CHANNEL_TRAJ_TYPE", "trajectory must be object", cp));
        continue;
      }
      rejectUnknownKeys(
        traj,
        ["channel_id", "keys", "priority", "combinator"],
        cp,
        issues,
        "IR_UNKNOWN_KEY",
      );
      if (traj.channel_id !== mapKey) {
        issues.push(
          issue(
            "CHANNEL_KEY_MISMATCH",
            `map key "${mapKey}" must equal channel_id "${String(traj.channel_id)}"`,
            `${cp}.channel_id`,
          ),
        );
      }
      if (traj.combinator !== undefined) {
        if (!(COMBINATORS as readonly string[]).includes(String(traj.combinator))) {
          issues.push(
            issue("UNKNOWN_COMBINATOR", `unknown combinator: ${String(traj.combinator)}`, `${cp}.combinator`),
          );
        }
      }
      const entry = channelById.get(mapKey);
      if (!Array.isArray(traj.keys) || traj.keys.length === 0) {
        issues.push(issue("CHANNEL_KEYS", "keys required non-empty array", `${cp}.keys`));
      } else {
        let prevT = -Infinity;
        traj.keys.forEach((key, ki) => {
          const kp = `${cp}.keys[${ki}]`;
          if (!isObject(key)) {
            issues.push(issue("CHANNEL_KEY_TYPE", "key must be object", kp));
            return;
          }
          rejectUnknownKeys(key, ["t_ms", "value", "easing"], kp, issues, "IR_UNKNOWN_KEY");
          if (typeof key.t_ms !== "number" || key.t_ms < 0) {
            issues.push(issue("CHANNEL_KEY_TIME", "t_ms must be >= 0", `${kp}.t_ms`));
          } else if (key.t_ms < prevT) {
            issues.push(
              issue(
                "CHANNEL_KEY_ORDER",
                "channel key times must be monotonically non-decreasing",
                `${kp}.t_ms`,
              ),
            );
          } else {
            prevT = key.t_ms;
          }
          if (typeof key.value !== "number") {
            issues.push(issue("CHANNEL_KEY_VALUE", "value must be number", `${kp}.value`));
          } else if (entry) {
            if (key.value < entry.range.min || key.value > entry.range.max) {
              issues.push(
                issue(
                  "CHANNEL_VALUE_RANGE",
                  `value ${key.value} outside registry range [${entry.range.min}, ${entry.range.max}]`,
                  `${kp}.value`,
                ),
              );
            }
          }
        });
      }
    }
  }

  // Routes
  if (!isObject(raw.routes) || !Array.isArray(raw.routes.steps)) {
    issues.push(issue("IR_ROUTES", "routes.steps required", "routes"));
  } else {
    rejectUnknownKeys(
      raw.routes,
      ["steps", "expression_only"],
      "routes",
      issues,
      "IR_UNKNOWN_KEY",
    );
    const seenRouteSteps = new Set<string>();
    raw.routes.steps.forEach((step, i) => {
      const rp = `routes.steps[${i}]`;
      if (!isObject(step)) {
        issues.push(issue("ROUTE_STEP_TYPE", "route step must be object", rp));
        return;
      }
      rejectUnknownKeys(
        step,
        [
          "route_id",
          "from",
          "to",
          "t0_ms",
          "duration_ms",
          "clip_template_ref",
          "interrupt_class",
        ],
        rp,
        issues,
        "IR_UNKNOWN_KEY",
      );
      const rid = String(step.route_id ?? "");
      if (!rid) {
        issues.push(issue("ROUTE_ID_MISSING", "route_id required", `${rp}.route_id`));
        return;
      }
      const accepted = acceptedRoutes.get(rid);
      const gated = gatedRoutes.get(rid);
      if (!accepted && !gated) {
        issues.push(
          issue(
            "UNKNOWN_ROUTE_ID",
            `route_id not in accepted or gated registry: ${rid}`,
            `${rp}.route_id`,
          ),
        );
      } else if (gated && !accepted) {
        issues.push(
          issue(
            "GATED_ROUTE_USED",
            `route_id ${rid} is gated (${gated.status}); not accepted for compile`,
            `${rp}.route_id`,
          ),
        );
      }
      if (accepted) {
        if (step.from !== accepted.from || step.to !== accepted.to) {
          issues.push(
            issue(
              "ROUTE_ENDPOINT_MISMATCH",
              `route ${rid} endpoints must be ${accepted.from}→${accepted.to}, got ${String(step.from)}→${String(step.to)}`,
              rp,
            ),
          );
        }
      }
      if (step.interrupt_class !== undefined) {
        if (!(INTERRUPT_CLASSES as readonly string[]).includes(String(step.interrupt_class))) {
          issues.push(
            issue(
              "UNKNOWN_INTERRUPT_CLASS",
              `unknown interrupt_class: ${String(step.interrupt_class)}`,
              `${rp}.interrupt_class`,
            ),
          );
        }
      }
      const stepKey = `${rid}|${String(step.from)}|${String(step.to)}|${String(step.t0_ms ?? "")}`;
      if (seenRouteSteps.has(stepKey)) {
        issues.push(
          issue("DUPLICATE_ROUTE_STEP", `duplicate or contradictory route step: ${stepKey}`, rp),
        );
      }
      seenRouteSteps.add(stepKey);
    });
  }

  // Interrupt plan
  if (!isObject(raw.interrupt_plan)) {
    issues.push(issue("IR_INTERRUPT", "interrupt_plan required", "interrupt_plan"));
  } else {
    rejectUnknownKeys(
      raw.interrupt_plan,
      ["default_class", "boundaries"],
      "interrupt_plan",
      issues,
      "IR_UNKNOWN_KEY",
    );
    if (!(INTERRUPT_CLASSES as readonly string[]).includes(String(raw.interrupt_plan.default_class))) {
      issues.push(
        issue(
          "UNKNOWN_INTERRUPT_CLASS",
          `unknown default_class: ${String(raw.interrupt_plan.default_class)}`,
          "interrupt_plan.default_class",
        ),
      );
    }
    if (!Array.isArray(raw.interrupt_plan.boundaries)) {
      issues.push(
        issue("INTERRUPT_BOUNDARIES", "boundaries must be array", "interrupt_plan.boundaries"),
      );
    } else {
      raw.interrupt_plan.boundaries.forEach((b, i) => {
        const bp = `interrupt_plan.boundaries[${i}]`;
        if (!isObject(b)) {
          issues.push(issue("INTERRUPT_BOUNDARY_TYPE", "boundary must be object", bp));
          return;
        }
        rejectUnknownKeys(
          b,
          ["phase_id", "t_ms", "interrupt_class", "notes"],
          bp,
          issues,
          "IR_UNKNOWN_KEY",
        );
        if (!(INTERRUPT_CLASSES as readonly string[]).includes(String(b.interrupt_class))) {
          issues.push(
            issue(
              "UNKNOWN_INTERRUPT_CLASS",
              `unknown interrupt_class: ${String(b.interrupt_class)}`,
              `${bp}.interrupt_class`,
            ),
          );
        }
      });
    }
  }

  // Validation report
  if (!isObject(raw.validation)) {
    issues.push(issue("IR_VALIDATION", "validation required object", "validation"));
  } else {
    rejectUnknownKeys(raw.validation, ["status", "issues"], "validation", issues, "IR_UNKNOWN_KEY");
    if (!(VALIDATION_STATUSES as readonly string[]).includes(String(raw.validation.status))) {
      issues.push(
        issue(
          "UNKNOWN_VALIDATION_STATUS",
          `validation.status not in closed set: ${String(raw.validation.status)}`,
          "validation.status",
        ),
      );
    }
    if (!Array.isArray(raw.validation.issues)) {
      issues.push(issue("VALIDATION_ISSUES", "validation.issues must be array", "validation.issues"));
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: raw as PerformanceIR };
}

// ─── Registry integrity helpers ─────────────────────────────────────────────

export function assertChannelRegistryIntegrity(registry: ChannelRegistry = loadChannelRegistry()): {
  ok: boolean;
  ids: string[];
  duplicates: string[];
  rangeViolations: string[];
} {
  const ids = registry.channels.map((c) => c.id);
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  const rangeViolations: string[] = [];
  for (const c of registry.channels) {
    if (!(c.range.min <= c.default && c.default <= c.range.max)) {
      rangeViolations.push(c.id);
    }
  }
  return {
    ok: duplicates.length === 0 && rangeViolations.length === 0,
    ids,
    duplicates,
    rangeViolations,
  };
}

export function assertRouteGraphIntegrity(graph: EmbodimentRouteGraph = loadEmbodimentRoutes()): {
  ok: boolean;
  routeIds: string[];
  duplicateRouteIds: string[];
  unknownEmbodiments: string[];
  gatedOpenDecisions: string[];
} {
  const known = new Set(graph.embodiments);
  const routeIds = graph.routes.map((r) => r.route_id);
  const seen = new Set<string>();
  const duplicateRouteIds: string[] = [];
  for (const id of routeIds) {
    if (seen.has(id)) duplicateRouteIds.push(id);
    seen.add(id);
  }
  const unknownEmbodiments: string[] = [];
  for (const r of graph.routes) {
    if (!known.has(r.from)) unknownEmbodiments.push(`${r.route_id}:from:${r.from}`);
    if (!known.has(r.to)) unknownEmbodiments.push(`${r.route_id}:to:${r.to}`);
  }
  for (const g of graph.gated_routes ?? []) {
    if (!known.has(g.from)) unknownEmbodiments.push(`${g.route_id}:from:${g.from}`);
    if (!known.has(g.to)) unknownEmbodiments.push(`${g.route_id}:to:${g.to}`);
  }
  const gatedOpenDecisions = (graph.gated_routes ?? []).map((g) => g.open_decision);
  return {
    ok: duplicateRouteIds.length === 0 && unknownEmbodiments.length === 0,
    routeIds,
    duplicateRouteIds,
    unknownEmbodiments,
    gatedOpenDecisions,
  };
}

export function assertAffectRegistryIntegrity(
  reg: AffectDimensionRegistry = loadAffectDimensions(),
): { ok: boolean; missingRequired: string[]; ids: string[] } {
  const ids = reg.dimensions.map((d) => d.id);
  const idSet = new Set(ids);
  const missingRequired = AFFECT_DIMENSIONS_REQUIRED.filter((d) => !idSet.has(d));
  return { ok: missingRequired.length === 0, missingRequired, ids };
}

/** Minimal valid intent fixture for tests / docs. */
export function minimalValidIntent(overrides: Partial<PerformanceIntent> = {}): PerformanceIntent {
  return {
    schema: "gasper.performance.intent.v1",
    id: "intent-minimal",
    title: "Minimal valid intent",
    seed: 42,
    character: "gasper",
    identity_lock: true,
    phases: [
      {
        id: "phase-notice",
        label: "notices significant message",
        intent_tags: ["notice", "orient"],
        duration_hint_ms: { min: 400, target: 700, max: 1200 },
        affect_target: {
          valence: 0.15,
          arousal: 0.35,
          expression_gain: 0.4,
          attention: 0.55,
          certainty: 0.3,
        },
        embodiment_preference: "presence",
        expression_anchor: "listening-orient",
        interrupt_class: "soft",
        constraints: {
          preserve_identity: true,
          max_channel_velocity: "medium",
        },
      },
    ],
    global_constraints: {
      topology_lock: true,
      legacy_authority_required: true,
      no_arbitrary_gsap: true,
      reduced_motion_policy: "scale_durations",
    },
    provenance: {
      authored_by: "human",
      source_refs: [],
    },
    ...overrides,
  };
}

/** Minimal valid IR fixture (compiled envelope only; not from real compiler). */
export function minimalValidIR(overrides: Partial<PerformanceIR> = {}): PerformanceIR {
  const affect: AffectPoint = {
    valence: 0.1,
    arousal: 0.3,
    expression_gain: 0.4,
    attention: 0.5,
    certainty: 0.3,
  };
  return {
    schema: "gasper.performance.ir.v1",
    ir_version: "1.0.0",
    compiler_id: "gasper-behavioral-compiler",
    compiler_version: "0.1.0",
    intent_id: "intent-minimal",
    intent_content_hash: "sha256:" + "a".repeat(64),
    seed: 42,
    compiled_at: "2026-07-17T00:00:00.000Z",
    content_hash: "sha256:" + "b".repeat(64),
    affect_trajectory: {
      sample_rate_hz_hint: 30,
      spans: [
        {
          t0_ms: 0,
          t1_ms: 700,
          from: affect,
          to: { ...affect, attention: 0.6 },
          easing: "power2.inOut",
        },
      ],
      holds: [],
    },
    channel_trajectories: {
      eye_openness: {
        channel_id: "eye_openness",
        keys: [
          { t_ms: 0, value: 0.56, easing: "linear" },
          { t_ms: 700, value: 0.64, easing: "power1.out" },
        ],
        priority: 58,
        combinator: "replace",
      },
    },
    routes: {
      steps: [],
      expression_only: true,
    },
    interrupt_plan: {
      default_class: "soft",
      boundaries: [{ phase_id: "phase-notice", t_ms: 0, interrupt_class: "soft" }],
    },
    causal_index: [
      {
        t_ms: 0,
        phase_id: "phase-notice",
        contributions: [
          { source: "affect.arousal", channels: ["energy_level", "eye_openness"], weight: 0.6 },
        ],
      },
    ],
    validation: {
      status: "compiled",
      issues: [],
    },
    ...overrides,
  };
}

// D006 provisional compiler spine (synthetic-provisional contracts)
export {
  compilePerformance,
  dualCompileIdentical,
  contractPin,
  legalRoute,
  COMPILER_VERSION,
  COMPILER_ID,
  contentHash,
} from "./compiler/index.js";
export type {
  PerformanceIntent as CompilerPerformanceIntent,
  PerformanceIntentPhase as CompilerPerformanceIntentPhase,
  AffectPoint as CompilerAffectPoint,
} from "./compiler/index.js";
