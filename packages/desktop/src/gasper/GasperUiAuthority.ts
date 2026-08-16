/**
 * Wave R7 — UI authority collapse (product law, not decorative restyle).
 *
 * Single-source rules for Studio + Gasper Dais. Prevents dual navigation
 * (editMode segment AND Dais tool AND inspector tab) from all claiming "the mode".
 *
 * Target grammar (Book 005 R7):
 *   Document: Gasper-v6.5.5.gasper • Modified
 *   Workspace: Design | Animate | Behavior | Compare | Validate
 *   Mode: Authoring | Preview | Runtime | Compare
 *   Tool: Select | Form | Face | … (Dais tool rail)
 *   Selection: Presence › …
 *   View: Authoring Neutral | …
 */

import type { StageMode, StageTool } from "./GasperSelectionModel";

/** Who owns continuous living / animation when stage is mounted. */
export type LivingAuthority = "gasper-living" | "none";

/** Who owns form bindings when Dais is focused. */
export type BindingAuthority = "gasper-registry" | "mcp-params";

/** Product workspaces — one active authority (Book 005 R7). */
export type StudioWorkspace =
  | "design"
  | "animate"
  | "behavior"
  | "compare"
  | "validate";

export const STUDIO_WORKSPACES: Array<{ id: StudioWorkspace; label: string }> = [
  { id: "design", label: "Design" },
  { id: "animate", label: "Animate" },
  { id: "behavior", label: "Behavior" },
  { id: "compare", label: "Compare" },
  { id: "validate", label: "Validate" },
];

/** Inspector focus family derived from the active Dais tool. */
export type InspectorFamily =
  | "form"
  | "face"
  | "motion"
  | "material"
  | "light"
  | "select"
  | "runtime";

/**
 * Legacy edit-mode segment ids still used by cold-path Studio chrome
 * when the Dais is not ready. Not a second tool authority when Dais owns tools.
 */
export type LegacyEditSegment =
  | "semantic"
  | "deformers"
  | "material"
  | "morph"
  | "face"
  | "mesh";

export type UiAuthoritySnapshot = {
  stageMode: StageMode;
  stageTool: StageTool;
  workspace: StudioWorkspace;
  living: LivingAuthority;
  bindings: BindingAuthority;
  /** Inspector should follow Dais tool, not a parallel editMode chrome. */
  inspectorFollowsDaisTool: boolean;
  /** Workspace bar must not open a second tool surface for the same job. */
  suppressDuplicateEditSegments: boolean;
  /** Hide competing inspector tab strip; show tool-derived family only. */
  suppressInspectorTabStrip: boolean;
  /** Prefer product workspace rail over Form/Face/Motion edit segments. */
  useWorkspaceRail: boolean;
};

export type AuthorityGrammar = {
  documentLabel: string;
  modified: boolean;
  workspace: StudioWorkspace;
  workspaceLabel: string;
  mode: StageMode;
  modeLabel: string;
  tool: StageTool;
  toolLabel: string;
  selectionPath: string;
  viewLabel: string;
};

const MODE_LABELS: Record<StageMode, string> = {
  AUTHORING: "Authoring",
  PREVIEW: "Preview",
  RUNTIME: "Runtime",
  COMPARE: "Compare",
};

const TOOL_LABELS: Record<StageTool, string> = {
  select: "Select",
  form: "Form",
  face: "Face",
  motion: "Motion",
  material: "Material",
  light: "Light",
  morph: "Morph",
};

/**
 * Authority when Gasper Dais is the active authoring surface.
 * MCP param groups remain for non-Gasper / gateway tools only.
 */
export function uiAuthorityForDais(input: {
  stageMode: StageMode;
  stageTool: StageTool;
  daisReady: boolean;
  /** Explicit workspace when user selected one; otherwise derived from mode. */
  workspace?: StudioWorkspace;
}): UiAuthoritySnapshot {
  const workspace =
    input.workspace ?? defaultWorkspaceForMode(input.stageMode);
  if (!input.daisReady) {
    return {
      stageMode: input.stageMode,
      stageTool: input.stageTool,
      workspace,
      living: "none",
      bindings: "mcp-params",
      inspectorFollowsDaisTool: false,
      suppressDuplicateEditSegments: false,
      suppressInspectorTabStrip: false,
      useWorkspaceRail: false,
    };
  }
  return {
    stageMode: input.stageMode,
    stageTool: input.stageTool,
    workspace,
    living: "gasper-living",
    bindings: "gasper-registry",
    inspectorFollowsDaisTool: true,
    // Collapse: Form/Face/Motion workspace segments must not fight Dais tool rail
    suppressDuplicateEditSegments: true,
    suppressInspectorTabStrip: true,
    useWorkspaceRail: true,
  };
}

/** Default workspace from stage mode when user has not pinned another. */
export function defaultWorkspaceForMode(mode: StageMode): StudioWorkspace {
  switch (mode) {
    case "COMPARE":
      return "compare";
    case "RUNTIME":
      return "behavior";
    case "PREVIEW":
      return "animate";
    default:
      return "design";
  }
}

/** Stage mode implied when user selects a product workspace. */
export function stageModeForWorkspace(workspace: StudioWorkspace): StageMode {
  switch (workspace) {
    case "compare":
      return "COMPARE";
    case "behavior":
      return "RUNTIME";
    case "animate":
      return "PREVIEW";
    case "validate":
    case "design":
    default:
      return "AUTHORING";
  }
}

/** Map Dais tool → preferred inspector family (one tool → one inspector focus). */
export function inspectorFamilyForTool(tool: StageTool): InspectorFamily {
  switch (tool) {
    case "form":
      return "form";
    case "face":
      return "face";
    case "motion":
    case "morph":
      return "motion";
    case "material":
      return "material";
    case "light":
      return "light";
    case "select":
      return "select";
    default:
      return "select";
  }
}

/**
 * Map Dais tool → legacy edit-mode segment for residual cold-path loaders.
 * When Dais owns tools this is a follower, not an authority.
 */
export function editSegmentForTool(tool: StageTool): LegacyEditSegment {
  switch (tool) {
    case "face":
      return "face";
    case "motion":
      return "deformers";
    case "morph":
      return "morph";
    case "material":
    case "light":
      return "material";
    case "form":
    case "select":
    default:
      return "semantic";
  }
}

/** True when an MCP/param group id duplicates Gasper multi-domain bindings. */
export function isDuplicateGasperParamGroup(groupId: string): boolean {
  const g = groupId.toLowerCase();
  return (
    g.includes("overall") ||
    g.includes("macro") ||
    g.includes("face_") ||
    g.includes("eye_") ||
    g.includes("mouth_") ||
    g.includes("energy_") ||
    g.includes("relief_") ||
    g.includes("skin_") ||
    g.includes("singularity") ||
    g === "form" ||
    g === "face" ||
    g === "source_form"
  );
}

/** Document identity string for chrome (Book 005 R7 grammar). */
export function documentIdentityLabel(documentId: string): string {
  const base = (documentId || "gasper-v6.5.5").replace(/\.gasper$/i, "");
  return `${base}.gasper`;
}

export function workspaceLabel(ws: StudioWorkspace): string {
  return STUDIO_WORKSPACES.find((w) => w.id === ws)?.label ?? ws;
}

export function modeLabel(mode: StageMode): string {
  return MODE_LABELS[mode] ?? mode;
}

export function toolLabel(tool: StageTool): string {
  return TOOL_LABELS[tool] ?? tool;
}

/**
 * Build the single authoritative location grammar for status/breadcrumb.
 * Does not invent visual success — only structural UI truth.
 */
export function buildAuthorityGrammar(input: {
  documentId: string;
  modified: boolean;
  workspace: StudioWorkspace;
  stageMode: StageMode;
  tool: StageTool;
  embodiment: string;
  expression?: string | null;
  selectedRegion?: string | null;
  viewLabel?: string;
}): AuthorityGrammar {
  const parts = [
    titleCase(input.embodiment || "Presence"),
    toolLabel(input.tool),
  ];
  if (input.selectedRegion) parts.push(input.selectedRegion);
  else if (input.expression && input.expression !== "neutral") {
    parts.push(input.expression);
  }
  return {
    documentLabel: documentIdentityLabel(input.documentId),
    modified: input.modified,
    workspace: input.workspace,
    workspaceLabel: workspaceLabel(input.workspace),
    mode: input.stageMode,
    modeLabel: modeLabel(input.stageMode),
    tool: input.tool,
    toolLabel: toolLabel(input.tool),
    selectionPath: parts.join(" › "),
    viewLabel: input.viewLabel ?? defaultViewLabel(input.stageMode),
  };
}

export function formatAuthorityBreadcrumb(g: AuthorityGrammar): string {
  const mod = g.modified ? " • Modified" : "";
  return `Document: ${g.documentLabel}${mod} · Workspace: ${g.workspaceLabel} · Mode: ${g.modeLabel} · Tool: ${g.toolLabel} · Selection: ${g.selectionPath} · View: ${g.viewLabel}`;
}

function defaultViewLabel(mode: StageMode): string {
  switch (mode) {
    case "AUTHORING":
      return "Authoring Neutral";
    case "PREVIEW":
      return "Preview";
    case "RUNTIME":
      return "Runtime";
    case "COMPARE":
      return "Compare";
    default:
      return "Authoring Neutral";
  }
}

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[-_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
