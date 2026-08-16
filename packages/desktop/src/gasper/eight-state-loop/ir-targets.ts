/**
 * GASPER-007-H — single-source channel targets from R2 scenario definitions.
 *
 * Browser-safe: does NOT import node:crypto or the full compiler at module load.
 * Production binding coefficients come from EIGHT_STATE_DEFINITIONS.binding_targets
 * (same source the R2 compiler lowers into IR). Compile-time hashing for receipts
 * remains in Node/tests via packages/shared gasper-scenario/compiler.
 */

import { EIGHT_STATE_DEFINITIONS } from "../../../../shared/src/gasper-scenario/eight-states";
import {
  EIGHT_SCENARIO_IDS,
  type EightScenarioId,
} from "../../../../shared/src/gasper-scenario/types";
import type { DomainScalarMap } from "../GasperDomainState";
import type { EightStateHoldId, EightStateId } from "./types";

/** Short semantic aliases → canonical machine IDs. */
export const SHORT_TO_CANONICAL: Record<string, EightScenarioId> = {
  "neutral-settled": "presence-neutral-settled",
  "listening-receive": "presence-listening-receive",
  "thinking-knit": "presence-thinking-knit",
  "recognition-spark": "presence-recognition-spark",
  "executing-drive": "comet-executing-drive",
  "blocked-strain": "presence-blocked-strain",
  "pleased-resolve": "presence-pleased-resolve",
  "dormant-maintain": "dormant-orbit-maintain",
};

export const CANONICAL_TO_SHORT: Record<EightScenarioId, string> = {
  "presence-neutral-settled": "neutral-settled",
  "presence-listening-receive": "listening-receive",
  "presence-thinking-knit": "thinking-knit",
  "presence-recognition-spark": "recognition-spark",
  "comet-executing-drive": "executing-drive",
  "presence-blocked-strain": "blocked-strain",
  "presence-pleased-resolve": "pleased-resolve",
  "dormant-orbit-maintain": "dormant-maintain",
};

export function resolveCanonicalScenarioId(id: string): EightScenarioId | null {
  if ((EIGHT_SCENARIO_IDS as readonly string[]).includes(id)) {
    return id as EightScenarioId;
  }
  return SHORT_TO_CANONICAL[id] ?? null;
}

/**
 * Neutral base aligned to FormMaster `neutral-settled` product face
 * (all-script-3 EMOTION_FIXTURES): restrained mouth, awake eyes — not IR lab grin.
 * Prior mouth_openness 0.32 opened a smile every eight-state living tick on hybrid.
 */
const NEUTRAL_BASE: DomainScalarMap = {
  energy_level: 0.62,
  energy_pulse: 0.22,
  energy_lag: 0.38,
  // FormMaster neutral-settled eyeOpenL≈0.55; 0.4 read as closed-arc lids.
  eye_openness: 0.58,
  eye_spacing: 0,
  mouth_openness: 0.08,
  mouth_width: 0.92,
  face_scale: 1,
  gaze: 0.04,
  // VIEW_RIG 2.5D — mild off-axis so parallax/near-far lobes engage on living.
  yaw: 8,
  corner_pull_l: 0.01,
  corner_pull_r: 0.01,
  relief_amplitude: 0.55,
  relief_motion_coupling: 0.58,
  skin_tension: 0.36,
  internal_glow: 0.55,
  face_emissive: 0.4,
  inertia: 0.32,
  secondary_lag: 0.42,
  settling: 0.55,
  rebound: 0.32,
  overall_height: 1,
  overall_width: 1,
  crown_height: 0.06,
  ground_flattening: 0,
  lower_body_fullness: 0.58,
  motion: 0.58,
};

export type CompiledScenarioCache = {
  id: EightScenarioId;
  shortId: string;
  /** Content fingerprint of binding_targets (browser-safe, not full IR hash). */
  bindingFingerprint: string;
  bindingTargets: DomainScalarMap;
  provenance: "r2-definition-binding-targets";
};

function fingerprintBindings(m: DomainScalarMap): string {
  const keys = Object.keys(m).sort();
  let s = "";
  for (const k of keys) s += `${k}=${Number(m[k]).toFixed(6)};`;
  // FNV-1a 32-bit — browser-safe stable-ish id (full IR hash computed in Node tests)
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const cache = new Map<EightScenarioId, CompiledScenarioCache>();

/** Project R2 definition binding_targets into DomainScalarMap (same source as IR lower). */
export function loadCompiledScenario(id: EightScenarioId): CompiledScenarioCache {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = EIGHT_STATE_DEFINITIONS[id];
  if (!def) throw new Error(`UNKNOWN_SCENARIO:${id}`);
  const map: DomainScalarMap = { ...NEUTRAL_BASE };
  for (const [k, v] of Object.entries(def.binding_targets || {})) {
    if (typeof v === "number" && Number.isFinite(v)) map[k] = v;
  }
  const eyes = def.channels.eyes?.params;
  if (eyes) {
    if (typeof eyes.openness === "number") map.eye_openness = eyes.openness;
    if (typeof eyes.spacing === "number") map.eye_spacing = eyes.spacing;
  }
  const entry: CompiledScenarioCache = {
    id,
    shortId: CANONICAL_TO_SHORT[id],
    bindingFingerprint: fingerprintBindings(map),
    bindingTargets: map,
    provenance: "r2-definition-binding-targets",
  };
  cache.set(id, entry);
  return entry;
}

export function buildEightStateTargetsFromIr(): Record<
  EightStateHoldId,
  DomainScalarMap
> {
  const out = {} as Record<EightStateHoldId, DomainScalarMap>;
  for (const id of EIGHT_SCENARIO_IDS) {
    out[id as EightStateHoldId] = { ...loadCompiledScenario(id).bindingTargets };
  }
  return out;
}

export function compiledScenarioHashes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of EIGHT_SCENARIO_IDS) {
    out[id] = loadCompiledScenario(id).bindingFingerprint;
  }
  return out;
}

export function clearCompiledScenarioCache(): void {
  cache.clear();
}

export function scenarioDisplayName(id: EightStateId): string {
  if (id === "wake") return "Wake → Neutral";
  const c = resolveCanonicalScenarioId(id);
  if (!c) return id;
  return EIGHT_STATE_DEFINITIONS[c].intent.title;
}
