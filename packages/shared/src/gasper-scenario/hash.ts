/**
 * Stable canonical hashing for Gasper scenario contracts.
 * Pure: no wall-clock, no random, key-sorted stringify.
 */

import { createHash } from "node:crypto";

/** Quantize floats for stable cross-platform hashes. */
export function q6(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(6));
}

export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") {
    if (typeof v === "number") return JSON.stringify(q6(v));
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return `[${v.map(stableStringify).join(",")}]`;
  }
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
}

export function contentHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function shortHash(value: unknown, len = 16): string {
  return contentHash(value).slice(0, len);
}
