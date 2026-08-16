/**
 * Stage handles → GasperRigBinding preview/commit (shared with inspector).
 * Handle sets are embodiment-specific; positions from live bounds UV.
 */

import type { GasperRigController } from "./GasperRigController";
import type { StageTool } from "./GasperSelectionModel";
import {
  handlesForEmbodiment,
  type SemanticHandleDef,
} from "./GasperEmbodimentHandles";
import type { Rect } from "./GasperVisualBounds";

export type HandleDef = SemanticHandleDef & {
  /** Absolute content-space position (filled when placing). */
  contentX?: number;
  contentY?: number;
  x?: number;
  y?: number;
  axis: "x" | "y" | "both";
};

/** @deprecated use handlesForEmbodiment — kept for structural tests */
export const STAGE_HANDLES: HandleDef[] = handlesForEmbodiment("presence", "form").map(
  (h) => ({ ...h, x: h.u, y: h.v }),
);

export type ActiveGesture = {
  handleId: string;
  bindingId: string;
  startValue: number;
  startX: number;
  startY: number;
  coarse: boolean;
  fine: boolean;
  symmetry: boolean;
};

export class GasperDirectManipulation {
  active: ActiveGesture | null = null;
  hoverId: string | null = null;

  constructor(private controller: GasperRigController) {}

  handlesForTool(
    tool: StageTool,
    embodimentId?: string,
    opts?: { faceIsolation?: boolean; showSourceFormHandles?: boolean },
  ): HandleDef[] {
    const emb =
      embodimentId ?? this.controller.selection.getState().embodiment;
    return handlesForEmbodiment(emb, tool, {
      faceIsolation: opts?.faceIsolation,
      showSourceFormHandles: opts?.showSourceFormHandles,
    }).map((h) => ({ ...h, x: h.u, y: h.v }));
  }

  /**
   * Map handle UV within manipulation bounds → content-space point.
   */
  placeHandles(
    handles: HandleDef[],
    manipBounds: Rect,
  ): Array<HandleDef & { contentX: number; contentY: number }> {
    return handles.map((h) => ({
      ...h,
      contentX: manipBounds.x + h.u * manipBounds.width,
      contentY: manipBounds.y + h.v * manipBounds.height,
      x: h.u,
      y: h.v,
    }));
  }

  begin(
    handle: HandleDef,
    clientX: number,
    clientY: number,
    mods: { shift?: boolean; ctrl?: boolean; alt?: boolean },
  ) {
    const b = this.controller.registry.get(handle.bindingId);
    if (!b) return;
    this.active = {
      handleId: handle.id,
      bindingId: handle.bindingId,
      startValue: b.read(),
      startX: clientX,
      startY: clientY,
      coarse: !!mods.shift,
      fine: !!mods.ctrl,
      symmetry: !!mods.alt,
    };
    this.controller.selection.setSelectedRegion(handle.bindingId);
  }

  move(clientX: number, clientY: number) {
    if (!this.active) return;
    const b = this.controller.registry.get(this.active.bindingId);
    if (!b) return;
    const dx = clientX - this.active.startX;
    const dy = clientY - this.active.startY;
    const scale = this.active.fine ? 0.0015 : this.active.coarse ? 0.012 : 0.004;
    const delta =
      (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * scale * (b.max - b.min);
    let next = this.active.startValue + delta;
    next = Math.min(b.max, Math.max(b.min, next));
    b.preview(next);
    if (this.active.symmetry) {
      const pair =
        this.active.bindingId === "corner_pull_l"
          ? "corner_pull_r"
          : this.active.bindingId === "corner_pull_r"
            ? "corner_pull_l"
            : null;
      if (pair) this.controller.registry.get(pair)?.preview(next);
    }
  }

  commit() {
    if (!this.active) return;
    const b = this.controller.registry.get(this.active.bindingId);
    if (!b) {
      this.active = null;
      return;
    }
    const live = this.controller.readLive();
    const value = live[this.active.bindingId] ?? b.read();
    b.commit(value);
    if (this.active.symmetry) {
      const pair =
        this.active.bindingId === "corner_pull_l"
          ? "corner_pull_r"
          : this.active.bindingId === "corner_pull_r"
            ? "corner_pull_l"
            : null;
      if (pair) this.controller.registry.get(pair)?.commit(value);
    }
    this.active = null;
  }

  cancel() {
    if (!this.active) return;
    const b = this.controller.registry.get(this.active.bindingId);
    b?.cancel();
    if (this.active.symmetry) {
      const pair =
        this.active.bindingId === "corner_pull_l"
          ? "corner_pull_r"
          : this.active.bindingId === "corner_pull_r"
            ? "corner_pull_l"
            : null;
      if (pair) this.controller.registry.get(pair)?.cancel();
    }
    this.active = null;
  }
}
