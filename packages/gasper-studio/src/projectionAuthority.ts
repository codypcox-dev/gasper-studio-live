/**
 * Projection authority boundary for Gasper Studio.
 *
 * Canonical document state lives ONLY in GasperAnimationCommandSession.
 * AnimationEditorSession is a derived presentation projection.
 * WorldClass adapter snapshots are derived views.
 * HTTP bridge is a transport adapter — never an independent state owner.
 *
 * Authority chain:
 *   Command source → envelope → (HTTP transport) → broker validate →
 *   session mutation → editor projection sync → adapter invalidate →
 *   rendered consequence → receipt
 */

import type { CommandResult } from "../../studio-protocol/src";
import { getAnimationCommandSession } from "../../shared/src/gasper-animation";

/**
 * Document-affecting commands that must resync the editor projection after accept.
 * Continuous playback/scrub intentionally excluded (hot path).
 */
export const PROJECTION_AFFECTING_COMMANDS = new Set([
  "create_animation_clip",
  "select_animation_clip",
  "rename_animation_clip",
  "set_animation_duration",
  "create_animation_track",
  "set_animation_track_state",
  "capture_animation_keyframe",
  "add_animation_keyframe",
  "update_animation_keyframe",
  "move_animation_keyframe",
  "duplicate_animation_keyframe",
  "delete_animation_keyframe",
  "set_keyframe_easing",
  "begin_animation_transaction",
  "commit_animation_transaction",
  "cancel_animation_transaction",
  "undo_animation_edit",
  "redo_animation_edit",
  "save_gasper_document",
  "seed_thinking_knit",
  "create_clip",
  "select_clip",
  "rename_clip",
  "create_track",
  "capture_keyframe",
  "update_keyframe",
  "move_keyframe",
  "delete_keyframe",
  "undo",
  "redo",
  "begin_transaction",
  "commit_transaction",
  "cancel_transaction",
  "save",
]);

export function commandRequiresEditorProjectionSync(
  command: string,
  result: Pick<CommandResult, "success">,
): boolean {
  return result.success && PROJECTION_AFFECTING_COMMANDS.has(command);
}

export type ProjectionSyncReceipt = {
  command: string;
  requestId?: string;
  success: boolean;
  required: boolean;
  projectionSynced: boolean;
  canonicalOwner: "GasperAnimationCommandSession";
  documentId: string | null;
  revision: number | null;
  activeClipId: string | null;
  dirty: boolean | null;
  contentHash: string | null;
  editorPresent: boolean;
  error?: string;
  timestamp: string;
};

type DaisProjection = {
  syncEditorProjectionFromAnimationSession?: () => void;
};

function getDais(): DaisProjection | null {
  return (
    (globalThis as unknown as { __GASPER_DAIS__?: DaisProjection }).__GASPER_DAIS__ ??
    null
  );
}

/** Read canonical document identity fields from the sole state owner. */
export function readCanonicalProjectionIdentity(): {
  documentId: string;
  revision: number;
  dirty: boolean;
  contentHash: string;
  activeClipId: string | null;
  clipIds: string[];
  playheadMs: number;
  canUndo: boolean;
  canRedo: boolean;
} {
  const session = getAnimationCommandSession();
  const doc = session.getDocument();
  const history = session.getHistoryState();
  return {
    documentId: doc.id,
    revision: doc.revision,
    dirty: doc.dirty,
    contentHash: doc.content_hash,
    activeClipId: doc.animation.active_clip_id,
    clipIds: doc.animation.clips.map((c) => c.id),
    playheadMs: session.getPlayheadMs(),
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}

/**
 * Push command-session state into the editor projection and return a receipt.
 * Does not mutate the session — presentation-only sync.
 */
export function syncEditorProjectionFromCanonical(opts?: {
  command?: string;
  requestId?: string;
  success?: boolean;
}): ProjectionSyncReceipt {
  const command = opts?.command ?? "local.sync";
  const success = opts?.success ?? true;
  const required = true;
  const identity = readCanonicalProjectionIdentity();
  const dais = getDais();
  const editorPresent = !!dais?.syncEditorProjectionFromAnimationSession;
  let projectionSynced = false;
  let error: string | undefined;

  if (success && editorPresent) {
    try {
      dais!.syncEditorProjectionFromAnimationSession!();
      projectionSynced = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      projectionSynced = false;
    }
  } else if (success && !editorPresent) {
    // Fail closed for document-affecting paths that require visible shell parity.
    // Pure unit tests without a Dais may still inspect the receipt.
    error = "EDITOR_PROJECTION_UNAVAILABLE";
    projectionSynced = false;
  }

  return {
    command,
    requestId: opts?.requestId,
    success,
    required,
    projectionSynced,
    canonicalOwner: "GasperAnimationCommandSession",
    documentId: identity.documentId,
    revision: identity.revision,
    activeClipId: identity.activeClipId,
    dirty: identity.dirty,
    contentHash: identity.contentHash,
    editorPresent,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Bridge post-command hook: only document-affecting successful commands
 * resynchronize the editor projection. Playback/scrub remain continuous-path.
 */
export function applyBridgeCommandProjectionSync(
  command: string,
  result: Pick<CommandResult, "success" | "requestId">,
): ProjectionSyncReceipt | null {
  if (!commandRequiresEditorProjectionSync(command, result)) {
    return null;
  }
  return syncEditorProjectionFromCanonical({
    command,
    requestId: result.requestId,
    success: result.success,
  });
}

/** In-process ring buffer of recent projection receipts (trace evidence). */
const RECEIPT_CAP = 64;
const receipts: ProjectionSyncReceipt[] = [];

export function recordProjectionReceipt(receipt: ProjectionSyncReceipt): void {
  receipts.push(receipt);
  if (receipts.length > RECEIPT_CAP) receipts.shift();
  // CDP / live-bootstrap observability only — not a second authority.
  publishProjectionAuthorityDebug();
}

export function getRecentProjectionReceipts(): ProjectionSyncReceipt[] {
  return [...receipts];
}

export function clearProjectionReceiptsForTests(): void {
  receipts.length = 0;
  publishProjectionAuthorityDebug();
}

/** Expose read-only projection debug surface for packaged live proof (CDP). */
export function publishProjectionAuthorityDebug(): void {
  if (typeof globalThis === "undefined") return;
  const g = globalThis as unknown as {
    __GASPER_PROJECTION_AUTHORITY__?: Record<string, unknown>;
  };
  g.__GASPER_PROJECTION_AUTHORITY__ = {
    canonicalOwner: "GasperAnimationCommandSession",
    role: "derived_projection_boundary",
    readIdentity: () => readCanonicalProjectionIdentity(),
    recentReceipts: () => getRecentProjectionReceipts(),
    lastReceipt: () => receipts[receipts.length - 1] ?? null,
    commandRequiresEditorProjectionSync,
    syncFromCanonical: syncEditorProjectionFromCanonical,
  };
}

// Publish once on module load so CDP can discover the surface before any command.
publishProjectionAuthorityDebug();
