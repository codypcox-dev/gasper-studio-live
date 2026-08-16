/**
 * Character state apply — pure project+merge + injectable session for revision/stamp.
 * No module-global mutable state. Controllers own their CharacterApplySession.
 */

import {
  getCharacterStateProfile,
  type CharacterChannelMap,
} from "../../../../shared/src/gasper/character";
import {
  enforceCharacterBodyAuthority,
  mergeCharacterWithEndpoint,
} from "./characterBodyAuthority";
import { hashChannels, projectStateVisual } from "./eightStateVisualLanguage";
import type { CharacterPoseProjection, StateVisualApplyReport } from "./types";

export type ApplyCharacterStateOpts = {
  /** Existing endpoint bindings to merge under character authority. */
  endpointChannels?: CharacterChannelMap;
  /** Force non-idempotent revision bump even if same state. */
  force?: boolean;
  /**
   * Preserve reduced-motion damping: damped endpoint keys win and
   * reduceMotionChannels caps are re-applied after character merge.
   */
  reducedMotion?: boolean;
};

/**
 * Injectable apply session — revision / last-report owned by caller (controller).
 * Pure project+merge has no globals; session only tracks apply history.
 */
export type CharacterApplySession = {
  revision: number;
  lastHash: string | null;
  lastStateId: string | null;
  lastReport: StateVisualApplyReport | null;
};

export function createCharacterApplySession(): CharacterApplySession {
  return {
    revision: 0,
    lastHash: null,
    lastStateId: null,
    lastReport: null,
  };
}

/**
 * Pure project + authority + optional endpoint merge (no session side effects).
 */
export function projectAndMergeCharacterState(
  stateId: string,
  opts?: ApplyCharacterStateOpts,
): {
  ok: boolean;
  projection: CharacterPoseProjection | null;
  mergedChannels: CharacterChannelMap;
  strippedKeys: string[];
  identityOk: boolean;
  attachmentOk: boolean;
  error?: string;
} {
  const projection = projectStateVisual(stateId);
  if (!projection) {
    return {
      ok: false,
      projection: null,
      mergedChannels: {},
      strippedKeys: [],
      identityOk: false,
      attachmentOk: false,
      error: `unknown character state: ${stateId}`,
    };
  }

  const profile = getCharacterStateProfile(stateId)!;
  const auth = enforceCharacterBodyAuthority(profile);
  const endpoint = opts?.endpointChannels ?? {};
  const mergedChannels = mergeCharacterWithEndpoint(auth.channels, endpoint, {
    reducedMotion: opts?.reducedMotion,
  });
  const channelHash = hashChannels(mergedChannels);

  const finalProjection: CharacterPoseProjection = {
    ...projection,
    channels: { ...mergedChannels },
    channelHash,
  };

  return {
    ok: auth.identityOk && auth.attachmentOk,
    projection: finalProjection,
    mergedChannels: { ...mergedChannels },
    strippedKeys: [...auth.strippedKeys],
    identityOk: auth.identityOk,
    attachmentOk: auth.attachmentOk,
  };
}

/**
 * Apply character state visual with optional injectable session.
 * When session is provided, tracks revision/idempotency/last-report.
 * When omitted, returns a one-shot report with revision 0 (pure-ish; no global).
 *
 * Prefer character-merged channels whenever non-empty even if ok:false
 * (identity/attachment stamp failure only — not a channel discard).
 */
export function applyCharacterStateVisual(
  stateId: string,
  opts?: ApplyCharacterStateOpts,
  session?: CharacterApplySession,
): StateVisualApplyReport {
  const merged = projectAndMergeCharacterState(stateId, opts);

  if (!merged.projection) {
    const report: StateVisualApplyReport = {
      ok: false,
      stateId,
      projection: null,
      mergedChannels: {},
      strippedKeys: [],
      identityOk: false,
      idempotent: false,
      error: merged.error ?? `unknown character state: ${stateId}`,
      revision: session?.revision ?? 0,
    };
    if (session) session.lastReport = report;
    return report;
  }

  const channelHash = merged.projection.channelHash;
  let idempotent = false;
  let revision = session?.revision ?? 0;

  if (session) {
    const sameAsLast =
      session.lastStateId === stateId &&
      session.lastHash === channelHash &&
      opts?.force !== true;

    if (!sameAsLast) {
      session.revision += 1;
      session.lastHash = channelHash;
      session.lastStateId = stateId;
    }
    idempotent = sameAsLast;
    revision = session.revision;
  }

  const report: StateVisualApplyReport = {
    ok: merged.ok,
    stateId,
    projection: merged.projection,
    // Always keep merged channels when non-empty (soft-fail does not discard).
    mergedChannels: { ...merged.mergedChannels },
    strippedKeys: [...merged.strippedKeys],
    identityOk: merged.identityOk,
    idempotent,
    revision,
    error: merged.ok ? undefined : "identity or attachment stamp failed",
  };

  if (session) session.lastReport = report;
  return report;
}

/** Read last report from a session (controller probes). */
export function getLastCharacterApplyReport(
  session?: CharacterApplySession | null,
): StateVisualApplyReport | null {
  const r = session?.lastReport ?? null;
  if (!r) return null;
  return {
    ...r,
    mergedChannels: { ...r.mergedChannels },
    strippedKeys: [...r.strippedKeys],
    projection: r.projection
      ? {
          ...r.projection,
          channels: { ...r.projection.channels },
        }
      : null,
  };
}

/** Reset an apply session (tests / controller re-init). */
export function resetCharacterApplySession(
  session: CharacterApplySession,
): void {
  session.revision = 0;
  session.lastHash = null;
  session.lastStateId = null;
  session.lastReport = null;
}

/**
 * Project only (no session side effects) — alias of projectStateVisual.
 */
export function projectCharacterStateVisual(
  stateId: string,
): CharacterPoseProjection | null {
  return projectStateVisual(stateId);
}

/**
 * Validate active character identity from a session stamp.
 */
export function validateActiveCharacterIdentity(
  session?: CharacterApplySession | null,
): {
  ok: boolean;
  stateId: string | null;
  identityOk: boolean;
  message: string;
} {
  const last = session?.lastReport;
  if (!last || !last.projection) {
    return {
      ok: false,
      stateId: null,
      identityOk: false,
      message: "no character state applied",
    };
  }
  return {
    ok: last.ok && last.identityOk,
    stateId: last.stateId,
    identityOk: last.identityOk,
    message: last.ok
      ? "identity stamp held"
      : (last.error ?? "identity check failed"),
  };
}
