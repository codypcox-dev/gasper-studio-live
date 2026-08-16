/**
 * Node-only document persistence. Not imported by browser/WebView bundles.
 * Used by tests and headless CLI via host.persistDocument registration.
 */
import type { GasperCanonicalDocument } from "./types.js";

export async function nodePersistDocument(
  doc: GasperCanonicalDocument,
  path: string,
): Promise<{ path: string; ok: boolean }> {
  const fs = await import("node:fs/promises");
  const pathMod = await import("node:path");
  await fs.mkdir(pathMod.dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(doc, null, 2), "utf8");
  return { path, ok: true };
}

export async function nodeOpenDocument(path: string): Promise<unknown> {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw);
}
