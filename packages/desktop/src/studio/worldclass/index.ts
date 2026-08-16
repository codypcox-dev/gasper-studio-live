/**
 * Gasper World-Class Studio Shell — public drop-in surface for Grok 1.
 *
 * Integration:
 *   import { WorldClassStudioShell } from ".../studio/worldclass";
 *   <WorldClassStudioShell adapter={productionAdapter} stageSlot={<GasperDais />} />
 */

export { WorldClassStudioShell } from "./shell/WorldClassStudioShell";
export { WorldClassStudioShell as WorldClassStudioShellRoot } from "./WorldClassStudioShell";

export type {
  WorldClassStudioAdapter,
  WorldClassStudioShellProps,
  WorldClassStudioSnapshot,
  WorldClassStudioCommands,
  WorkspaceId,
  JobWorkspaceId,
  LegacyWorkspaceId,
  JobAvailability,
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
  JOB_WORKSPACE_ORDER,
  JOB_WORKSPACE_LABELS,
  normalizeWorkspaceId,
  workspaceIs,
  defaultJobAvailability,
} from "./adapter/types";

export {
  presentConnection,
  presentDocument,
  presentPlayback,
  formatTimecode,
  clampPlayhead,
  layoutModeFromWidth,
  WORLDCLASS_ADAPTER_COMMAND_GROUPS,
} from "./WorldClassStudioAdapter";

export type {
  ConnectionPresentation,
  DocumentPresentation,
  PlaybackPresentation,
  WorldClassAdapterCommandGroup,
} from "./WorldClassStudioAdapter";

export {
  timeToFraction,
  fractionToTime,
  timeToPx,
  pxToTime,
  clampTime,
  snapTime,
  buildRulerTicks,
  hitTestKeyframes,
  rangeDuration,
} from "./animate/timelineMath";

export {
  resolveShellKeyCommand,
  dispatchShellKeyCommand,
} from "./keyboard/shellKeyboard";

export type { ShellKeyCommand, KeyLike, KeyboardActionHandlers } from "./keyboard/shellKeyboard";
