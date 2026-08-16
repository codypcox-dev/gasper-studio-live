/**
 * Keyboard command mapping for the world-class shell.
 * Pure: maps KeyboardEvent-like input → command names.
 */

export type ShellKeyCommand =
  | "play_toggle"
  | "interrupt"
  | "undo"
  | "redo"
  | "save"
  | "workspace_operate"
  | "workspace_affect"
  | "workspace_form"
  | "workspace_motion"
  | "workspace_proof"
  /** @deprecated legacy aliases → form/motion/affect */
  | "workspace_design"
  | "workspace_animate"
  | "workspace_behavior"
  | "delete_selection"
  | "escape"
  | "focus_next"
  | "focus_prev"
  | "playhead_step_forward"
  | "playhead_step_back"
  | "playhead_step_forward_large"
  | "playhead_step_back_large"
  | "playhead_home"
  | "playhead_end";

export type KeyLike = {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  targetTag?: string;
};

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Default playhead step sizes (ms). */
export const PLAYHEAD_STEP_MS = 1 / 30 * 1000; // one frame @ 30fps ≈ 33.333
export const PLAYHEAD_STEP_LARGE_MS = 200;

export function resolveShellKeyCommand(e: KeyLike): ShellKeyCommand | null {
  if (e.targetTag && EDITABLE.has(e.targetTag.toUpperCase())) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z" && e.shiftKey) return "redo";
    if (mod && e.key.toLowerCase() === "z") return "undo";
    if (mod && e.key.toLowerCase() === "y") return "redo";
    if (mod && e.key.toLowerCase() === "s") return "save";
    return null;
  }

  const mod = Boolean(e.ctrlKey || e.metaKey);
  const key = e.key;

  if (key === " " || key === "Spacebar") return "play_toggle";
  if (key === "Escape") return "escape";
  if (key === "Delete" || key === "Backspace") return "delete_selection";
  if (key === "Tab" && e.shiftKey) return "focus_prev";
  if (key === "Tab") return "focus_next";

  if (mod && key.toLowerCase() === "z" && e.shiftKey) return "redo";
  if (mod && key.toLowerCase() === "z") return "undo";
  if (mod && key.toLowerCase() === "y") return "redo";
  if (mod && key.toLowerCase() === "s") return "save";

  // Timeline navigation
  if (!mod && !e.altKey) {
    if (key === "ArrowRight" && e.shiftKey) return "playhead_step_forward_large";
    if (key === "ArrowLeft" && e.shiftKey) return "playhead_step_back_large";
    if (key === "ArrowRight") return "playhead_step_forward";
    if (key === "ArrowLeft") return "playhead_step_back";
    if (key === "Home") return "playhead_home";
    if (key === "End") return "playhead_end";
  }

  if (!mod && !e.altKey) {
    // Job ontology: 1 Operate · 2 Affect · 3 Form · 4 Motion · 5 Proof
    if (key === "1") return "workspace_operate";
    if (key === "2") return "workspace_affect";
    if (key === "3") return "workspace_form";
    if (key === "4") return "workspace_motion";
    if (key === "5") return "workspace_proof";
    if (key.toLowerCase() === "i") return "interrupt";
  }

  return null;
}

export type KeyboardActionHandlers = {
  playToggle: () => void;
  interrupt: () => void;
  undo: () => void;
  redo: () => void;
  save?: () => void;
  setWorkspace: (
    id:
      | "operate"
      | "affect"
      | "form"
      | "motion"
      | "proof"
      | "design"
      | "animate"
      | "behavior",
  ) => void;
  clearSelection?: () => void;
  cancelDrag?: () => void;
  deleteSelection?: () => void;
  stepPlayhead?: (deltaMs: number) => void;
  jumpPlayheadHome?: () => void;
  jumpPlayheadEnd?: () => void;
};

export function dispatchShellKeyCommand(
  cmd: ShellKeyCommand,
  handlers: KeyboardActionHandlers,
): boolean {
  switch (cmd) {
    case "play_toggle":
      handlers.playToggle();
      return true;
    case "interrupt":
      handlers.interrupt();
      return true;
    case "undo":
      handlers.undo();
      return true;
    case "redo":
      handlers.redo();
      return true;
    case "save":
      handlers.save?.();
      return Boolean(handlers.save);
    case "workspace_operate":
      handlers.setWorkspace("operate");
      return true;
    case "workspace_affect":
    case "workspace_behavior":
      handlers.setWorkspace("affect");
      return true;
    case "workspace_form":
    case "workspace_design":
      handlers.setWorkspace("form");
      return true;
    case "workspace_motion":
    case "workspace_animate":
      handlers.setWorkspace("motion");
      return true;
    case "workspace_proof":
      handlers.setWorkspace("proof");
      return true;
    case "delete_selection":
      handlers.deleteSelection?.();
      handlers.clearSelection?.();
      return true;
    case "escape":
      handlers.cancelDrag?.();
      handlers.clearSelection?.();
      return true;
    case "playhead_step_forward":
      handlers.stepPlayhead?.(Math.round(PLAYHEAD_STEP_MS));
      return Boolean(handlers.stepPlayhead);
    case "playhead_step_back":
      handlers.stepPlayhead?.(-Math.round(PLAYHEAD_STEP_MS));
      return Boolean(handlers.stepPlayhead);
    case "playhead_step_forward_large":
      handlers.stepPlayhead?.(PLAYHEAD_STEP_LARGE_MS);
      return Boolean(handlers.stepPlayhead);
    case "playhead_step_back_large":
      handlers.stepPlayhead?.(-PLAYHEAD_STEP_LARGE_MS);
      return Boolean(handlers.stepPlayhead);
    case "playhead_home":
      handlers.jumpPlayheadHome?.();
      return Boolean(handlers.jumpPlayheadHome);
    case "playhead_end":
      handlers.jumpPlayheadEnd?.();
      return Boolean(handlers.jumpPlayheadEnd);
    case "focus_next":
    case "focus_prev":
      return false;
    default:
      return false;
  }
}
