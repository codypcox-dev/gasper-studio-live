import type { ReactNode } from "react";
import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { Timeline } from "../animate/Timeline";
import { StageFrame } from "../shell/StageFrame";

/**
 * Animate is the priority workspace: stage + integrated timeline dock.
 * Graph/curve editor is an intentional future placeholder — not a broken empty panel.
 */
export function AnimateWorkspace({
  snap,
  adapter,
  stageSlot,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
  stageSlot: ReactNode;
}) {
  return (
    <>
      <div
        className="gwc-center"
        data-testid="gwc-workspace-motion"
        data-workspace="motion"
        data-job="motion"
        data-legacy-workspace="animate"
      >
        <StageFrame snap={snap} stageSlot={stageSlot} adapter={adapter} />
        <div className="gwc-graph-placeholder" data-testid="gwc-graph-placeholder" role="note">
          <span className="gwc-graph-placeholder-label">Graph editor</span>
          <span className="gwc-graph-placeholder-body">
            Curve editing is planned. Use the timeline for keyframe timing; graph view is not
            available in this shell.
          </span>
        </div>
      </div>
      <Timeline snap={snap} adapter={adapter} />
    </>
  );
}
