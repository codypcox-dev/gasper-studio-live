/**
 * Pure product-truth mappers — unit-testable without React.
 * One visual authority each for connection, document dirty, and playback.
 */

import type {
  ConnectionSnapshot,
  ConnectionState,
  DocumentLifecycle,
  DocumentSnapshot,
  PlaybackState,
} from "./types";

export type ConnectionPresentation = {
  state: ConnectionState;
  label: string;
  tone: "neutral" | "ok" | "warn" | "danger" | "live";
  /** Must never claim connected when not. */
  isConnected: boolean;
};

export type DocumentPresentation = {
  lifecycle: DocumentLifecycle;
  dirty: boolean;
  title: string;
  dirtyMark: string;
  /** Must never claim clean when dirty. */
  showsDirty: boolean;
  empty: boolean;
  invalid: boolean;
  loading: boolean;
};

export type PlaybackPresentation = {
  state: PlaybackState;
  canPlay: boolean;
  canPause: boolean;
  canInterrupt: boolean;
  label: string;
  isLive: boolean;
};

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  standalone: "Standalone",
  connecting: "Connecting…",
  connected: "Connected",
  degraded: "Degraded",
  disconnected: "Disconnected",
  error: "Connection error",
};

const CONNECTION_TONES: Record<ConnectionState, ConnectionPresentation["tone"]> = {
  standalone: "neutral",
  connecting: "warn",
  connected: "ok",
  degraded: "warn",
  disconnected: "danger",
  error: "danger",
};

export function presentConnection(snap: ConnectionSnapshot): ConnectionPresentation {
  const state = snap.state;
  const isConnected = state === "connected" || state === "degraded";
  // Never allow a misleading label: if state is disconnected/error, label cannot say Connected.
  let label = snap.label?.trim() || CONNECTION_LABELS[state];
  if (!isConnected && /connected/i.test(label) && !/dis/i.test(label)) {
    label = CONNECTION_LABELS[state];
  }
  if (isConnected && state === "connected" && /disconn/i.test(label)) {
    label = CONNECTION_LABELS.connected;
  }
  return {
    state,
    label,
    tone: CONNECTION_TONES[state],
    isConnected,
  };
}

export function presentDocument(doc: DocumentSnapshot): DocumentPresentation {
  const dirty = Boolean(doc.dirty) || doc.lifecycle === "dirty";
  const empty = doc.lifecycle === "none";
  const invalid = doc.lifecycle === "invalid";
  const loading = doc.lifecycle === "loading" || doc.lifecycle === "saving";
  const baseName = doc.name?.trim() || (empty ? "No document" : "Untitled");
  return {
    lifecycle: doc.lifecycle,
    dirty,
    title: baseName,
    dirtyMark: dirty ? "●" : "",
    showsDirty: dirty,
    empty,
    invalid,
    loading,
  };
}

export function presentPlayback(
  state: PlaybackState,
  hasDocument: boolean,
): PlaybackPresentation {
  const canPlay = hasDocument && (state === "stopped" || state === "paused" || state === "interrupted");
  const canPause = hasDocument && state === "playing";
  const canInterrupt = hasDocument && (state === "playing" || state === "scrubbing");
  const labels: Record<PlaybackState, string> = {
    stopped: "Stopped",
    playing: "Playing",
    paused: "Paused",
    interrupted: "Interrupted",
    scrubbing: "Scrubbing",
  };
  return {
    state,
    canPlay,
    canPause,
    canInterrupt,
    label: labels[state],
    isLive: state === "playing" || state === "scrubbing",
  };
}

/** Format ms as m:ss.ff (frames at 30fps display). */
export function formatTimecode(ms: number, fps = 30): string {
  const clamped = Math.max(0, Math.round(ms));
  const totalSec = Math.floor(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const frame = Math.floor((clamped % 1000) / (1000 / fps));
  return `${m}:${String(s).padStart(2, "0")}.${String(frame).padStart(2, "0")}`;
}

export function clampPlayhead(timeMs: number, durationMs: number): number {
  if (!Number.isFinite(timeMs)) return 0;
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(durationMs, timeMs));
}

export function layoutModeFromWidth(width: number): "full" | "compact" | "ultrawide" {
  if (width >= 3000) return "ultrawide";
  if (width < 1360) return "compact";
  return "full";
}
