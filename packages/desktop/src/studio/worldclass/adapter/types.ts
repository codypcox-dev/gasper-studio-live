/**
 * WorldClassStudioAdapter — single application-truth contract for the shell.
 *
 * Boundary rules:
 * - Typed data + commands only
 * - No DOM nodes, renderer instances, Tauri, Express, gateway, or Rust handles
 * - Production adapter maps existing runtime/session → this shape (Grok 1)
 */

import type { ReactNode } from "react";
import type { JobAvailability, WorkspaceId as JobOntologyWorkspaceId } from "./jobOntology";

export type { JobWorkspaceId, LegacyWorkspaceId, JobAvailability } from "./jobOntology";
export {
  JOB_WORKSPACE_ORDER,
  JOB_WORKSPACE_LABELS,
  normalizeWorkspaceId,
  workspaceIs,
  defaultJobAvailability,
} from "./jobOntology";

/** Product workspace id: job ontology + legacy Design/Animate/Behavior aliases. */
export type WorkspaceId = JobOntologyWorkspaceId;

/** Single visual authority for connection. */
export type ConnectionState =
  | "standalone"
  | "connecting"
  | "connected"
  | "degraded"
  | "disconnected"
  | "error";

/** Single visual authority for document readiness / dirty. */
export type DocumentLifecycle =
  | "none"
  | "loading"
  | "ready"
  | "dirty"
  | "invalid"
  | "saving";

/** Single visual authority for playback. */
export type PlaybackState =
  | "stopped"
  | "playing"
  | "paused"
  | "interrupted"
  | "scrubbing";

export type NavigatorItem = {
  id: string;
  label: string;
  kind: "character" | "clip" | "layer" | "folder" | "binding";
  parentId?: string | null;
  depth?: number;
  muted?: boolean;
  locked?: boolean;
  solo?: boolean;
};

export type InspectorGroup = {
  id: string;
  label: string;
  open: boolean;
  rows: InspectorRow[];
};

export type InspectorRow = {
  id: string;
  label: string;
  value: string | number | boolean;
  unit?: string;
  readOnly?: boolean;
  /** Explicit unavailable presentation (distinct from readOnly). */
  unavailable?: boolean;
  unavailableReason?: string;
  control?: "text" | "number" | "toggle" | "select" | "slider";
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  /** Group id used when committing inspector edits. */
  groupId?: string;
};

/** Dais stage visual mode — product language for authored vs preview vs live. */
export type StageMode = "author" | "preview" | "runtime";

export type DesignDomainId =
  | "form"
  | "face"
  | "material"
  | "light"
  | "energy"
  | "morph";

export type DesignDomain = {
  id: DesignDomainId;
  label: string;
  summary: string;
  parameters: Array<{
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    unit?: string;
  }>;
};

export type TimelineKeyframe = {
  id: string;
  trackId: string;
  timeMs: number;
  selected: boolean;
  easing?: string;
};

export type TimelineTrack = {
  id: string;
  label: string;
  bindingIds: string[];
  muted: boolean;
  locked: boolean;
  solo: boolean;
  keyframes: TimelineKeyframe[];
};

export type TimelineClip = {
  id: string;
  name: string;
  durationMs: number;
  /** Authored semantic beats; optional for older lab snapshots. */
  markers?: TimelineMarker[];
};

export type TimelineMarker = {
  id: string;
  timeMs: number;
  label: string;
};

export type AnimationSnapshot = {
  clips: TimelineClip[];
  activeClipId: string | null;
  tracks: TimelineTrack[];
  playheadMs: number;
  visibleRangeMs: { start: number; end: number };
  zoom: number;
  loop: boolean;
  playback: PlaybackState;
  canUndo: boolean;
  canRedo: boolean;
  snap: boolean;
  selectedKeyframeIds: string[];
  selectedTrackIds: string[];
  dragPreview?: { keyframeId: string; timeMs: number } | null;
};

export type CharacterSnapshot = {
  id: string | null;
  name: string;
  embodiment: string | null;
  expression: string | null;
  selectionLabel: string | null;
  availableEmbodiments: string[];
  availableExpressions: string[];
  /** Authored vs runtime layer note for product language. */
  layerSummary?: string | null;
};

export type DocumentSnapshot = {
  lifecycle: DocumentLifecycle;
  name: string;
  path: string | null;
  revision: number;
  dirty: boolean;
  /** Settled content hash (same tick as revision after PHASE1-HASH-LAG fix). */
  contentHash?: string | null;
  invalidReason?: string | null;
};

export type ConnectionSnapshot = {
  state: ConnectionState;
  label: string;
  detail?: string | null;
  endpointLabel?: string | null;
};

export type DiagnosticsSnapshot = {
  messages: string[];
  reducedMotion: boolean;
  layoutMode: "full" | "compact" | "ultrawide";
  health?: "ok" | "warn" | "error";
  buildIdentity?: string | null;
  authorityRenderer?: string | null;
  errors?: string[];
  warnings?: string[];
};

export type ActiveToolId =
  | "select"
  | "manipulate"
  | "semantic"
  | "capture"
  | "scrub";

export type BehaviorOverview = {
  expressionFixture: string | null;
  behavioralState: string | null;
  transitionSummary: string | null;
  livingMotionAuthority: string | null;
  authoredVsRuntime: string | null;
};

export type WorldClassStudioSnapshot = {
  workspace: WorkspaceId;
  activeTool: ActiveToolId;
  /** Author / preview / runtime Dais presentation mode. */
  stageMode: StageMode;
  /** Optional safe-bounds overlay on the Dais. */
  showSafeBounds: boolean;
  document: DocumentSnapshot;
  connection: ConnectionSnapshot;
  character: CharacterSnapshot;
  animation: AnimationSnapshot;
  navigator: NavigatorItem[];
  selectedNavigatorId: string | null;
  inspectorGroups: InspectorGroup[];
  designDomains: DesignDomain[];
  activeDesignDomain: DesignDomainId;
  behaviorAvailable: boolean;
  behaviorNote: string;
  behaviorOverview: BehaviorOverview;
  /**
   * Per-job authoring availability (Lane D).
   * When false, primary chrome must not claim a working authoring job.
   */
  jobAvailability?: JobAvailability;
  /** Honest note when Proof job is not product-complete. */
  proofNote?: string;
  /** Lane E — last Affect compile summary (null before first compile). */
  affectCompile?: {
    ok: boolean;
    irHash: string | null;
    intentHash: string | null;
    phaseIds: string[];
    issues: string[];
    presetId: string | null;
    seed: number;
    calibrationNote: string;
  } | null;
  /** Lane E — last proof export / compare summary. */
  proofStatus?: {
    lastBundleHash: string | null;
    lastExportedAt: string | null;
    baselinePinned: boolean;
    baselineKeyCount: number;
    lastCompare: {
      identical: boolean;
      maxAbsDelta: number;
      deltaCount: number;
    } | null;
  } | null;
  diagnostics: DiagnosticsSnapshot;
  statusMessage: string;
};

export type WorldClassStudioCommands = {
  setWorkspace: (id: WorkspaceId) => void;
  setActiveTool?: (tool: ActiveToolId) => void;
  selectNavigatorItem: (id: string | null) => void;
  setDesignDomain: (id: DesignDomainId) => void;
  toggleInspectorGroup: (groupId: string) => void;
  /** Commit inspector row value when control is interactive. */
  setInspectorValue?: (
    groupId: string,
    rowId: string,
    value: string | number | boolean,
  ) => void;
  setStageMode?: (mode: StageMode) => void;
  setShowSafeBounds?: (show: boolean) => void;
  setLayoutMode?: (mode: DiagnosticsSnapshot["layoutMode"]) => void;
  setReducedMotion?: (value: boolean) => void;

  // Document (optional — shell presents enabled only when provided + applicable)
  newDocument?: () => void;
  openDocument?: () => void;
  saveDocument?: () => void;
  saveDocumentAs?: () => void;
  /** Bounded recent documents (max 10). */
  listRecentDocuments?: () => Array<{ path: string; name: string }>;
  openRecentDocument?: (path: string) => void;

  // Connection
  reconnect?: () => void;

  // Character / design
  setEmbodiment?: (id: string) => void;
  setExpression?: (id: string) => void;
  setDesignParameter?: (domainId: DesignDomainId, paramId: string, value: number) => void;
  previewDesignParameter?: (domainId: DesignDomainId, paramId: string, value: number) => void;
  cancelDesignPreview?: () => void;

  // Animation
  scrub: (timeMs: number) => void;
  setPlayhead: (timeMs: number) => void;
  play: () => void;
  pause: () => void;
  interrupt: () => void;
  toggleLoop: () => void;
  setZoom: (zoom: number) => void;
  setVisibleRange: (start: number, end: number) => void;
  selectClip?: (clipId: string) => void;
  createClip?: (name: string, durationMs: number) => void;
  addMarker?: (label: string, timeMs: number) => void;
  deleteMarker?: (markerId: string) => void;
  selectTrack: (trackId: string, multi?: boolean) => void;
  selectKeyframe: (trackId: string, keyframeId: string, multi?: boolean) => void;
  clearKeyframeSelection: () => void;
  deleteKeyframe?: (trackId: string, keyframeId: string) => void;
  beginKeyframeDrag: (trackId: string, keyframeId: string) => void;
  previewKeyframeDrag: (timeMs: number) => void;
  commitKeyframeDrag: () => void;
  cancelKeyframeDrag: () => void;
  capturePose?: () => void;
  setEasing?: (trackId: string, keyframeId: string, easing: string) => void;
  toggleTrackMute?: (trackId: string) => void;
  toggleTrackSolo?: (trackId: string) => void;
  toggleTrackLock?: (trackId: string) => void;
  undo: () => void;
  redo: () => void;

  // Lane E — Affect compiler (optional; shell enables when present)
  /** Compile a preset PerformanceIntent; returns IR hash or null. */
  compileAffectPreset?: (presetId: string, seed: number) => {
    ok: boolean;
    irHash?: string;
    issues?: string[];
  };
  /** Apply embodiment/expression from last successful compile (session then rig). */
  applyAffectCompileHints?: () => void;

  // Lane E — Proof export/compare (optional)
  /** Build proof bundle JSON without mutating the authoring document. */
  exportProofBundle?: () => { ok: boolean; json?: string; bundleHash?: string; error?: string };
  /** Pin current live pose as compare baseline (selection only — not document). */
  pinProofBaseline?: () => { ok: boolean; keyCount: number };
  /** Compare live pose to pinned baseline. */
  compareProofBaseline?: () => {
    ok: boolean;
    identical?: boolean;
    maxAbsDelta?: number;
    deltaCount?: number;
    error?: string;
  };
};

/**
 * Adapter: getSnapshot + subscribe + commands.
 * Implementations must keep connection/document/playback truth coherent.
 */
export type WorldClassStudioAdapter = WorldClassStudioCommands & {
  getSnapshot: () => WorldClassStudioSnapshot;
  /** Subscribe to snapshot changes. Returns unsubscribe. */
  subscribe: (listener: () => void) => () => void;
};

export type WorldClassStudioShellProps = {
  adapter: WorldClassStudioAdapter;
  /** Production: real Gasper Dais. Lab: frozen placeholder marked non-production. */
  stageSlot: ReactNode;
  diagnosticsSlot?: ReactNode;
  className?: string;
};
