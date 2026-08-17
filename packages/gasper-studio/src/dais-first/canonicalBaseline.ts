/**
 * Canonical form — the named, saveable, morphable Wispwalker home.
 * Factory is Cody's 5179 profile. User save is a snapshot of the live rail.
 * Morph is embodiment. Restore returns to this baseline, not a blank.
 */
import { getAnimationCommandSession } from "../../../desktop/src/gasper/GasperAnimationCommands";
import { WISPWALKER_AUTHORING_DEFAULTS } from "./wispwalkerAuthoringDefaults";

export const CANONICAL_BASELINE_SCHEMA = "gasper.canonical-baseline.v1" as const;
export const FACTORY_BASELINE_ID = "baseline-wispwalker-factory";
export const USER_BASELINE_ID = "baseline-wispwalker-user";

export type CanonicalBaselineSource = "factory" | "user";

export type CanonicalBaseline = Readonly<{
  schema: typeof CANONICAL_BASELINE_SCHEMA;
  id: string;
  name: string;
  source: CanonicalBaselineSource;
  capturedAt: string;
  embodiment: "wispwalker";
  expressionGain: number;
  rig: typeof WISPWALKER_AUTHORING_DEFAULTS.rig;
  pose: typeof WISPWALKER_AUTHORING_DEFAULTS.pose;
  form: typeof WISPWALKER_AUTHORING_DEFAULTS.form;
  behavior: typeof WISPWALKER_AUTHORING_DEFAULTS.behavior;
  physics: typeof WISPWALKER_AUTHORING_DEFAULTS.physics;
  craft: typeof WISPWALKER_AUTHORING_DEFAULTS.craft;
}>;

export function factoryCanonicalBaseline(): CanonicalBaseline {
  return Object.freeze({
    schema: CANONICAL_BASELINE_SCHEMA,
    id: FACTORY_BASELINE_ID,
    name: "Wispwalker home",
    source: "factory",
    capturedAt: "factory",
    embodiment: "wispwalker",
    ...structuredClone(WISPWALKER_AUTHORING_DEFAULTS),
  });
}

export function captureCanonicalBaseline(live: {
  expressionGain: number;
  rig: CanonicalBaseline["rig"];
  pose: CanonicalBaseline["pose"];
  form: CanonicalBaseline["form"];
  behavior: CanonicalBaseline["behavior"];
  physics: CanonicalBaseline["physics"];
  craft: CanonicalBaseline["craft"];
}): CanonicalBaseline {
  return Object.freeze({
    schema: CANONICAL_BASELINE_SCHEMA,
    id: USER_BASELINE_ID,
    name: "My Wispwalker",
    source: "user",
    capturedAt: new Date().toISOString(),
    embodiment: "wispwalker",
    expressionGain: live.expressionGain,
    rig: Object.freeze({ ...live.rig }),
    pose: Object.freeze({ ...live.pose }),
    form: Object.freeze({ ...live.form }),
    behavior: Object.freeze({ ...live.behavior }),
    physics: Object.freeze({ ...live.physics }),
    craft: Object.freeze({ ...live.craft }),
  });
}

export function isCanonicalBaseline(value: unknown): value is CanonicalBaseline {
  if (!value || typeof value !== "object") return false;
  const v = value as { schema?: unknown; embodiment?: unknown };
  return v.schema === CANONICAL_BASELINE_SCHEMA && v.embodiment === "wispwalker";
}

export function persistCanonicalBaseline(baseline: CanonicalBaseline): void {
  try {
    getAnimationCommandSession().patchContentMetaSync?.({
      canonicalBaseline: baseline,
    });
  } catch {
    /* document shelf optional */
  }
}

export function readPersistedCanonicalBaseline(): CanonicalBaseline | null {
  try {
    const meta = getAnimationCommandSession().getDocument?.().content_meta;
    const raw = meta && typeof meta === "object" ? (meta as { canonicalBaseline?: unknown }).canonicalBaseline : null;
    return isCanonicalBaseline(raw) ? raw : null;
  } catch {
    return null;
  }
}
