/**
 * Wave R6 + operational animator — TypeScript bridge to Rust-owned `.gasper`
 * commands when Tauri is available.
 *
 * Durable authority:
 * - Inside Gasper Studio (Tauri): create/open/save/undo/set_animation invoke
 *   crates/gasper-document via gasper_*_cmd.
 * - TypeScript `GasperAnimationCommandSession` is the fast working projection
 *   for UI + MCP during a session; save pushes animation into Rust then disk.
 * - Without Tauri (vitest/Vite): projection-only fallback; not a second durable
 *   authority for production documents.
 */

import {
  createGasperDocument,
  defaultDomainStatusReport,
  type GasperDocumentV1,
} from "./GasperDocumentModel";
import { createDefaultDomainState } from "./GasperDomainState";

export type GasperDocSummary = {
  id?: string;
  revision?: number;
  dirty?: boolean;
  embodiment_id?: string;
  expression_fixture_id?: string;
  content_hash?: string;
  empty?: boolean;
  schema_version?: string;
};

type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

function getInvoke(): InvokeFn | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as unknown as {
    window?: {
      __TAURI__?: { core?: { invoke?: InvokeFn } };
      __TAURI_INTERNALS__?: { invoke?: InvokeFn };
    };
    __TAURI__?: { core?: { invoke?: InvokeFn } };
  };
  const w = g.window ?? g;
  return (
    (w as { __TAURI__?: { core?: { invoke?: InvokeFn } } }).__TAURI__?.core
      ?.invoke ??
    (w as { __TAURI_INTERNALS__?: { invoke?: InvokeFn } }).__TAURI_INTERNALS__
      ?.invoke ??
    null
  );
}

/** True when running inside a Tauri webview with invoke. */
export function gasperRustBridgeAvailable(): boolean {
  return typeof getInvoke() === "function";
}

let fallbackDoc: GasperDocumentV1 | null = null;

function ensureFallback(id = "gasper-untitled"): GasperDocumentV1 {
  if (!fallbackDoc) {
    fallbackDoc = createGasperDocument({
      documentId: id,
      domainState: createDefaultDomainState(),
      domainStatus: defaultDomainStatusReport(),
    });
  }
  return fallbackDoc;
}

export async function gasperNew(id = "gasper-untitled"): Promise<unknown> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_new_cmd", { id });
  fallbackDoc = createGasperDocument({
    documentId: id,
    domainState: createDefaultDomainState(),
    domainStatus: defaultDomainStatusReport(),
  });
  return fallbackDoc;
}

export async function gasperOpen(path: string): Promise<unknown> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_open_cmd", { path });
  throw new Error("gasper_open requires Tauri bridge (no filesystem in Vite host)");
}

export async function gasperSave(path?: string): Promise<string> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_save_cmd", { path: path ?? null });
  return path ?? "memory://fallback.gasper";
}

export async function gasperDocumentSummary(): Promise<GasperDocSummary> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_document_summary_cmd");
  const d = ensureFallback();
  return {
    id: (d as { id?: string }).id ?? "gasper-v6.5.5",
    revision: 1,
    dirty: true,
    embodiment_id: "presence",
    empty: false,
  };
}

export async function gasperHashes(): Promise<Record<string, unknown>> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_hashes_cmd");
  return { content_hash: "pending-ts-fallback", revision: 1 };
}

export async function gasperValidate(): Promise<{ ok: boolean; summary?: unknown }> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_validate_cmd");
  return { ok: true, summary: await gasperDocumentSummary() };
}

export async function gasperBeginTransaction(): Promise<void> {
  const invoke = getInvoke();
  if (invoke) await invoke("gasper_begin_transaction_cmd");
}

export async function gasperCommitTransaction(): Promise<void> {
  const invoke = getInvoke();
  if (invoke) await invoke("gasper_commit_transaction_cmd");
}

export async function gasperCancelTransaction(): Promise<void> {
  const invoke = getInvoke();
  if (invoke) await invoke("gasper_cancel_transaction_cmd");
}

export async function gasperUndo(): Promise<void> {
  const invoke = getInvoke();
  if (invoke) await invoke("gasper_undo_cmd");
}

export async function gasperRedo(): Promise<void> {
  const invoke = getInvoke();
  if (invoke) await invoke("gasper_redo_cmd");
}

export async function gasperGetDocument(): Promise<unknown> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_get_document_cmd");
  return ensureFallback();
}

export async function gasperSeedThinkingKnit(): Promise<unknown> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_seed_thinking_knit_cmd");
  const { getAnimationCommandSession } = await import("./GasperAnimationCommands");
  return getAnimationCommandSession().seed_thinking_knit();
}

export async function gasperSetAnimation(animation: unknown): Promise<unknown> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_set_animation_cmd", { animation });
  return animation;
}

/**
 * Save document to disk: Tauri path when available; Node fs for tests; else return JSON.
 */
export async function gasperSaveCanonicalDocument(
  doc: unknown,
  path: string,
): Promise<{ path: string; ok: boolean }> {
  const invoke = getInvoke();
  if (invoke) {
    // Authoritative projection write: full JSON document to disk.
    const contents = JSON.stringify(doc, null, 2);
    const written = await invoke<string>("gasper_write_text_file_cmd", {
      path,
      contents,
    });
    // Best-effort: also mirror animation into Rust session authority.
    try {
      const d = doc as { animation?: unknown };
      if (d?.animation) {
        await invoke("gasper_set_animation_cmd", { animation: d.animation });
        await invoke("gasper_save_cmd", { path: written });
      }
    } catch {
      /* text write is the durable projection path */
    }
    return { path: written, ok: true };
  }
  // Browser/WebView without Tauri: no Node builtins (Vite ban). Use Tauri save.
  throw new Error("gasperSaveCanonicalDocument requires Tauri write in Studio");
}

export async function gasperOpenCanonicalDocument(path: string): Promise<unknown> {
  const invoke = getInvoke();
  if (invoke) return invoke("gasper_open_cmd", { path });
  throw new Error("gasperOpenCanonicalDocument requires Tauri gasper_open_cmd in Studio");
}

/**
 * Push the TS working animation projection into Rust document authority (when available),
 * then save. Used by UI and MCP so both share one durable path.
 */
export async function gasperCommitProjectionAndSave(
  doc: {
    id?: string;
    animation?: unknown;
    embodiment_id?: string;
    expression_fixture_id?: string;
    revision?: number;
  },
  path: string,
): Promise<{ path: string; ok: boolean; via: "rust" | "unavailable" }> {
  const invoke = getInvoke();
  if (!invoke) {
    return { path, ok: false, via: "unavailable" };
  }
  if (doc.animation) {
    await invoke("gasper_set_animation_cmd", { animation: doc.animation });
  }
  const saved = await invoke<string>("gasper_save_cmd", { path });
  return { path: saved, ok: true, via: "rust" };
}

/** True when durable Rust document commands are reachable (not projection-only). */
export function gasperDurableAuthorityAvailable(): boolean {
  return gasperRustBridgeAvailable();
}
