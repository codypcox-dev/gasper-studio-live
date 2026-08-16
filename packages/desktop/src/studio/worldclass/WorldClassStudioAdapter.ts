/**
 * WorldClassStudioAdapter — public adapter contract module for Grok 1.
 *
 * Integration surface is typed-only: snapshot + subscribe + commands.
 * No DOM, renderer, Tauri, Express, gateway, or Rust handles.
 *
 * Production: map existing session/runtime → WorldClassStudioAdapter.
 * Lab: packages/gasper-studio-shell-lab synthetic adapter.
 */

export type {
  WorldClassStudioAdapter,
  WorldClassStudioCommands,
  WorldClassStudioSnapshot,
  WorldClassStudioShellProps,
  WorkspaceId,
  ActiveToolId,
  StageMode,
  ConnectionState,
  ConnectionSnapshot,
  DocumentLifecycle,
  DocumentSnapshot,
  PlaybackState,
  AnimationSnapshot,
  CharacterSnapshot,
  DiagnosticsSnapshot,
  BehaviorOverview,
  NavigatorItem,
  InspectorGroup,
  InspectorRow,
  DesignDomain,
  DesignDomainId,
  TimelineTrack,
  TimelineKeyframe,
  TimelineClip,
  TimelineMarker,
} from "./adapter/types";

export {
  presentConnection,
  presentDocument,
  presentPlayback,
  formatTimecode,
  clampPlayhead,
  layoutModeFromWidth,
} from "./adapter/productTruth";

export type {
  ConnectionPresentation,
  DocumentPresentation,
  PlaybackPresentation,
} from "./adapter/productTruth";

/** Guard: adapter command names expected by the shell (documentation + tests). */
export const WORLDCLASS_ADAPTER_COMMAND_GROUPS = [
  "document",
  "workspace",
  "connection",
  "character",
  "animation",
  "diagnostics",
] as const;

export type WorldClassAdapterCommandGroup =
  (typeof WORLDCLASS_ADAPTER_COMMAND_GROUPS)[number];
