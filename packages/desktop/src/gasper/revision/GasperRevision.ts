/**
 * gasper.revision.v1 — a Publish of the organism, not a git tag.
 * Dual: tag = organism. Source pins stay in git. This document is the look.
 */
import { defaultGeoGraph } from "../geonodes/defaultGraph";
import { cloneGraph } from "../geonodes/history";
import type { GeoGraph } from "../geonodes/types";
import { readLiveSculpt, SCULPT_COUNT, writeLiveSculpt } from "./sculptHost";

export const REVISION_SCHEMA = "gasper.revision.v1" as const;
export const SOURCE_PIN = "checkpoint-live-skin-20260818";
export const FACTORY_REVISION_ID = "revision-factory-wispwalker";
export const AUTOSAVE_KEY = "gasper.revision.autosave";
export const PUBLISH_KEY = "gasper.revision.publishes";
export const MAX_PUBLISHES = 12;

export type RevisionKind = "factory" | "autosave" | "publish";

export type SculptCodec = {
  n: typeof SCULPT_COUNT;
  nz: [number, number][];
};

export type GasperRevision = {
  schema: typeof REVISION_SCHEMA;
  id: string;
  name: string;
  kind: RevisionKind;
  capturedAt: string;
  sourcePin: string;
  graph: GeoGraph;
  sculpt: SculptCodec;
  showGrid: boolean;
  takeId: string | null;
  playheadMs: number;
  paused: boolean;
};

export function encodeSculpt(data: readonly number[]): SculptCodec {
  const nz: [number, number][] = [];
  const n = Math.min(SCULPT_COUNT, data.length);
  for (let i = 0; i < n; i++) {
    const v = data[i] || 0;
    if (v !== 0) nz.push([i, v]);
  }
  return { n: SCULPT_COUNT, nz };
}

export function decodeSculpt(codec: SculptCodec | undefined): number[] {
  const out = new Array(SCULPT_COUNT).fill(0);
  if (!codec || !Array.isArray(codec.nz)) return out;
  for (const pair of codec.nz) {
    const i = pair?.[0];
    const v = pair?.[1];
    if (typeof i === "number" && i >= 0 && i < SCULPT_COUNT) out[i] = Number(v) || 0;
  }
  return out;
}

export function isGasperRevision(value: unknown): value is GasperRevision {
  if (!value || typeof value !== "object") return false;
  const v = value as { schema?: unknown; graph?: unknown; sculpt?: unknown };
  return v.schema === REVISION_SCHEMA && !!v.graph && !!v.sculpt;
}

export function factoryRevision(): GasperRevision {
  return {
    schema: REVISION_SCHEMA,
    id: FACTORY_REVISION_ID,
    name: "Factory",
    kind: "factory",
    capturedAt: "factory",
    sourcePin: SOURCE_PIN,
    graph: defaultGeoGraph(),
    sculpt: { n: SCULPT_COUNT, nz: [] },
    showGrid: true,
    takeId: "northstar-20",
    playheadMs: 0,
    paused: false,
  };
}

export function captureRevision(input: {
  name: string;
  kind: RevisionKind;
  graph: GeoGraph;
  sculpt?: readonly number[];
  showGrid: boolean;
  takeId?: string | null;
  playheadMs?: number;
  paused?: boolean;
}): GasperRevision {
  return {
    schema: REVISION_SCHEMA,
    id: input.kind === "autosave" ? "revision-autosave" : `revision-${Date.now().toString(36)}`,
    name: input.name,
    kind: input.kind,
    capturedAt: new Date().toISOString(),
    sourcePin: SOURCE_PIN,
    graph: cloneGraph(input.graph),
    sculpt: encodeSculpt(input.sculpt ?? readLiveSculpt()),
    showGrid: input.showGrid,
    takeId: input.takeId ?? "northstar-20",
    playheadMs: input.playheadMs ?? 0,
    paused: !!input.paused,
  };
}

export function applyRevisionSculpt(rev: GasperRevision): void {
  writeLiveSculpt(decodeSculpt(rev.sculpt));
}

export function writeAutosave(rev: GasperRevision): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...rev, kind: "autosave", id: "revision-autosave", name: "Autosave" }));
  } catch {
    /* quota */
  }
}

export function readAutosave(): GasperRevision | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isGasperRevision(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function listPublishes(): GasperRevision[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PUBLISH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGasperRevision);
  } catch {
    return [];
  }
}

export function savePublish(rev: GasperRevision): GasperRevision[] {
  const next = [rev, ...listPublishes().filter((p) => p.id !== rev.id)].slice(0, MAX_PUBLISHES);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(PUBLISH_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }
  return next;
}

export function deletePublish(id: string): GasperRevision[] {
  const next = listPublishes().filter((p) => p.id !== id);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(PUBLISH_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }
  return next;
}
