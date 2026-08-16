/**
 * Production native document open/save/save-as for Gasper Studio.
 *
 * Order of authority:
 * 1) Tauri rfd dialogs + text file commands (full paths)
 * 2) Chromium File System Access API (native OS dialogs in WebView2)
 * 3) Explicit path / JSON inject for automated proof (same session load/save path)
 *
 * No hardcoded developer save destinations.
 */

import {
  createEmptyDocument,
  getAnimationCommandSession,
  type GasperCanonicalDocument,
} from "../../desktop/src/gasper/GasperAnimationCommands";
import {
  lastRecentDirectory,
  rememberRecentDocument,
} from "./recentDocuments";

type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

/** File System Access handles keyed by normalized path/name for Save. */
const handles = new Map<string, FileSystemFileHandle>();

function getInvoke(): InvokeFn | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as unknown as {
    __TAURI__?: { core?: { invoke?: InvokeFn } };
    __TAURI_INTERNALS__?: { invoke?: InvokeFn };
  };
  return g.__TAURI__?.core?.invoke ?? g.__TAURI_INTERNALS__?.invoke ?? null;
}

export function nativeFileDialogsAvailable(): boolean {
  return (
    typeof getInvoke() === "function" ||
    typeof (globalThis as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker ===
      "function"
  );
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function basename(path: string): string {
  const n = normalizePath(path);
  const i = Math.max(n.lastIndexOf("/"), n.lastIndexOf("\\"));
  return i >= 0 ? n.slice(i + 1) : n;
}

async function defaultDocumentsDir(): Promise<string | null> {
  const invoke = getInvoke();
  if (!invoke) return null;
  try {
    return await invoke<string>("gasper_default_documents_dir_cmd");
  } catch {
    return null;
  }
}

async function startDir(): Promise<string | undefined> {
  return lastRecentDirectory() ?? (await defaultDocumentsDir()) ?? undefined;
}

export type FileWorkflowResult =
  | { ok: true; path: string; cancelled?: false }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; error: string };

function markEditorClean() {
  try {
    const dais = (
      globalThis as unknown as {
        __GASPER_DAIS__?: {
          syncEditorProjectionFromAnimationSession?: () => void;
          editorSession?: { dispatch: (c: { type: string }) => void };
        };
      }
    ).__GASPER_DAIS__;
    dais?.syncEditorProjectionFromAnimationSession?.();
    dais?.editorSession?.dispatch({ type: "mark_saved" });
  } catch {
    /* */
  }
}

/** Write full canonical JSON — Tauri first, then File System Access handle. */
export async function writeGasperDocumentFile(
  path: string,
  doc: GasperCanonicalDocument,
): Promise<{ path: string; ok: boolean }> {
  const contents = JSON.stringify(doc, null, 2);
  const invoke = getInvoke();
  if (invoke) {
    try {
      const written = await invoke<string>("gasper_write_text_file_cmd", {
        path,
        contents,
      });
      try {
        if (doc.animation) {
          await invoke("gasper_set_animation_cmd", { animation: doc.animation });
          await invoke("gasper_save_cmd", { path: written });
        }
      } catch {
        /* text write is durable projection */
      }
      return { path: written, ok: true };
    } catch {
      /* fall through to FSA */
    }
  }

  const key = normalizePath(path);
  const handle = handles.get(key) ?? handles.get(basename(path));
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
    return { path: key, ok: true };
  }

  // Last resort: trigger Save As picker (native)
  const w = globalThis as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle>;
  };
  if (typeof w.showSaveFilePicker === "function") {
    const h = await w.showSaveFilePicker({
      suggestedName: basename(path).endsWith(".gasper")
        ? basename(path)
        : `${basename(path)}.gasper`,
      types: [
        {
          description: "Gasper Document",
          accept: { "application/json": [".gasper"] },
        },
      ],
    });
    const writable = await h.createWritable();
    await writable.write(contents);
    await writable.close();
    const name = h.name.endsWith(".gasper") ? h.name : `${h.name}.gasper`;
    handles.set(normalizePath(name), h);
    return { path: name, ok: true };
  }

  throw new Error("No native write path available (Tauri/FSA)");
}

export async function readGasperDocumentFile(
  path: string,
): Promise<GasperCanonicalDocument> {
  const invoke = getInvoke();
  if (invoke) {
    try {
      const text = await invoke<string>("gasper_read_text_file_cmd", { path });
      return JSON.parse(text) as GasperCanonicalDocument;
    } catch {
      /* fall through */
    }
  }
  const handle = handles.get(normalizePath(path)) ?? handles.get(basename(path));
  if (handle) {
    const file = await handle.getFile();
    return JSON.parse(await file.text()) as GasperCanonicalDocument;
  }
  throw new Error(`Cannot read ${path} — no Tauri/FSA handle`);
}

/**
 * Load a document object into the production session (no second system).
 * Used by open dialogs and by automated proof after host-side disk write.
 */
export async function loadGasperDocumentObject(
  doc: GasperCanonicalDocument,
  path: string | null,
): Promise<FileWorkflowResult> {
  try {
    const session = getAnimationCommandSession();
    await session.loadDocument(doc, path);
    markEditorClean();
    if (path) rememberRecentDocument(path);
    return { ok: true, path: path || doc.id || "untitled" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type LiveDocumentResult =
  | {
      ok: true;
      path: string;
      documentId: string;
      activeClipId: string | null;
      embodiment: string;
    }
  | { ok: false; error: string };

/**
 * Proof/live surface: replace the working document with an empty native
 * document (no clips). Used by isolated walk capture so the filmed
 * performance is live physics, not clip-presence-living-idle.
 */
export async function newLiveDocument(input?: {
  id?: string;
  embodiment?: string;
}): Promise<LiveDocumentResult> {
  try {
    const session = getAnimationCommandSession();
    const doc = createEmptyDocument(input?.id ?? "gasper-untitled");
    if (input?.embodiment) doc.embodiment_id = input.embodiment;
    session.loadFromObject(doc, null);
    const dais = (
      globalThis as unknown as {
        __GASPER_DAIS__?: {
          syncEditorProjectionFromAnimationSession?: () => void;
          snapEmbodiment?: (id: string) => void;
          setEmbodiment?: (id: string) => void;
        };
      }
    ).__GASPER_DAIS__;
    dais?.syncEditorProjectionFromAnimationSession?.();
    if (input?.embodiment) {
      try {
        session.setEmbodimentSync(input.embodiment);
      } catch {
        /* already matching or invalid */
      }
      if (typeof dais?.snapEmbodiment === "function") {
        dais.snapEmbodiment(input.embodiment);
      } else {
        dais?.setEmbodiment?.(input.embodiment);
      }
    }
    const loaded = session.getDocument();
    return {
      ok: true,
      path: loaded.id,
      documentId: loaded.id,
      activeClipId: loaded.animation.active_clip_id,
      embodiment: loaded.embodiment_id,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Open via native dialog (or absolute path / pre-parsed doc for automated proof). */
export async function openGasperDocument(
  explicitPath?: string | null,
  explicitDoc?: GasperCanonicalDocument | null,
): Promise<FileWorkflowResult> {
  try {
    if (explicitDoc) {
      return loadGasperDocumentObject(explicitDoc, explicitPath ?? null);
    }

    let path = explicitPath?.trim() || null;
    if (path) {
      try {
        const doc = await readGasperDocumentFile(path);
        return loadGasperDocumentObject(doc, path);
      } catch {
        // Host may inject via loadGasperDocumentObject after reading disk outside WebView
        return {
          ok: false,
          error: `Cannot open ${path} from WebView — use dialog or inject document`,
        };
      }
    }

    // Tauri native dialog
    const invoke = getInvoke();
    if (invoke) {
      try {
        const picked = await invoke<string | null>("gasper_pick_open_path_cmd", {
          startDir: await startDir(),
        });
        if (!picked) return { ok: false, cancelled: true };
        const doc = await readGasperDocumentFile(picked);
        return loadGasperDocumentObject(doc, picked);
      } catch {
        /* try FSA */
      }
    }

    // File System Access API — native OS open dialog
    const w = globalThis as unknown as {
      showOpenFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle[]>;
    };
    if (typeof w.showOpenFilePicker !== "function") {
      return { ok: false, error: "Open requires native desktop dialogs" };
    }
    let handlesPicked: FileSystemFileHandle[];
    try {
      handlesPicked = await w.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Gasper Document",
            accept: { "application/json": [".gasper"] },
          },
        ],
      });
    } catch {
      return { ok: false, cancelled: true };
    }
    const h = handlesPicked[0];
    if (!h) return { ok: false, cancelled: true };
    const file = await h.getFile();
    let doc: GasperCanonicalDocument;
    try {
      doc = JSON.parse(await file.text()) as GasperCanonicalDocument;
    } catch {
      return { ok: false, error: "File is not valid Gasper JSON" };
    }
    const name = file.name.endsWith(".gasper") ? file.name : `${file.name}.gasper`;
    handles.set(normalizePath(name), h);
    return loadGasperDocumentObject(doc, name);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Save to active path, or Save As dialog if none. */
export async function saveGasperDocument(): Promise<FileWorkflowResult> {
  const session = getAnimationCommandSession();
  const existing = session.getPath();
  if (existing) {
    // Prefer direct write of projection (host.persistDocument → Tauri/FSA)
    const r = await session.dispatch("save_gasper_document", { path: existing });
    if (!r.ok) {
      // Retry with explicit write helper
      try {
        const written = await writeGasperDocumentFile(existing, session.getDocument());
        session.markPersisted(written.path);
        markEditorClean();
        rememberRecentDocument(written.path);
        return { ok: true, path: written.path };
      } catch (e) {
        return {
          ok: false,
          error: r.error || (e instanceof Error ? e.message : String(e)),
        };
      }
    }
    markEditorClean();
    rememberRecentDocument(existing);
    return { ok: true, path: existing };
  }
  return saveGasperDocumentAs();
}

/** Always show native save dialog (or accept explicit path for proof). */
export async function saveGasperDocumentAs(
  suggestedName?: string,
  explicitPath?: string | null,
): Promise<FileWorkflowResult> {
  const session = getAnimationCommandSession();
  try {
    if (explicitPath) {
      const r = await session.dispatch("save_gasper_document", { path: explicitPath });
      if (!r.ok) {
        const written = await writeGasperDocumentFile(explicitPath, session.getDocument());
        session.markPersisted(written.path);
        markEditorClean();
        rememberRecentDocument(written.path);
        return { ok: true, path: written.path };
      }
      markEditorClean();
      rememberRecentDocument(explicitPath);
      return { ok: true, path: explicitPath };
    }

    const doc = session.getDocument();
    const name =
      suggestedName ||
      (session.getPath()?.split(/[/\\]/).pop() ?? `${doc.id || "Untitled"}.gasper`);

    const invoke = getInvoke();
    if (invoke) {
      try {
        const picked = await invoke<string | null>("gasper_pick_save_path_cmd", {
          suggestedName: name.endsWith(".gasper") ? name : `${name}.gasper`,
          startDir: await startDir(),
        });
        if (!picked) return { ok: false, cancelled: true };
        const r = await session.dispatch("save_gasper_document", { path: picked });
        if (!r.ok) {
          const written = await writeGasperDocumentFile(picked, session.getDocument());
          session.markPersisted(written.path);
          markEditorClean();
          rememberRecentDocument(written.path);
          return { ok: true, path: written.path };
        }
        markEditorClean();
        rememberRecentDocument(picked);
        return { ok: true, path: picked };
      } catch {
        /* FSA */
      }
    }

    const w = globalThis as unknown as {
      showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle>;
    };
    if (typeof w.showSaveFilePicker !== "function") {
      return { ok: false, error: "Save As requires native desktop dialogs" };
    }
    let h: FileSystemFileHandle;
    try {
      h = await w.showSaveFilePicker({
        suggestedName: name.endsWith(".gasper") ? name : `${name}.gasper`,
        types: [
          {
            description: "Gasper Document",
            accept: { "application/json": [".gasper"] },
          },
        ],
      });
    } catch {
      return { ok: false, cancelled: true };
    }
    const outName = h.name.endsWith(".gasper") ? h.name : `${h.name}.gasper`;
    handles.set(normalizePath(outName), h);
    const written = await writeGasperDocumentFile(outName, session.getDocument());
    session.markPersisted(written.path);
    markEditorClean();
    rememberRecentDocument(written.path);
    return { ok: true, path: written.path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
