import type { GeoGraph } from "../geonodes/types";
import type { GasperRevision } from "./GasperRevision";

export type RevisionBridge = {
  capture: (name: string, kind: "autosave" | "publish") => GasperRevision;
  hydrate: (rev: GasperRevision) => void;
  graph: () => GeoGraph;
};

let bridge: RevisionBridge | null = null;
const listeners = new Set<() => void>();

export function registerRevisionBridge(next: RevisionBridge): () => void {
  bridge = next;
  listeners.forEach((fn) => fn());
  return () => {
    if (bridge === next) bridge = null;
  };
}

export function revisionBridge(): RevisionBridge | null {
  return bridge;
}

export function onRevisionBridge(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const SCULPT_COMMIT_EVENT = "gasper:sculpt-commit";
export const REVISION_CHANGED_EVENT = "gasper:revision-changed";

export function emitRevisionChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(REVISION_CHANGED_EVENT));
  } catch {
    /* ssr */
  }
}
