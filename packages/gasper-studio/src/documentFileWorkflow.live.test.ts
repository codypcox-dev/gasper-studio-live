import { describe, expect, it } from "vitest";
import {
  createEmptyDocument,
  getAnimationCommandSession,
  resetAnimationCommandSessionForTests,
} from "../../desktop/src/gasper/GasperAnimationCommands";
import { newLiveDocument } from "./documentFileWorkflow";

describe("newLiveDocument", () => {
  it("replaces a showcase idle clip with an empty live wispwalker document", async () => {
    resetAnimationCommandSessionForTests();
    const session = getAnimationCommandSession();
    const showcase = createEmptyDocument("doc-showcase-project");
    showcase.animation = {
      active_clip_id: "clip-presence-living-idle",
      clips: [
        {
          id: "clip-presence-living-idle",
          name: "Presence — Living Idle",
          duration_ms: 4000,
          loop_mode: "loop",
          tracks: [],
          markers: [],
          revision: 1,
          created_at: showcase.created_at,
          modified_at: showcase.modified_at,
        },
      ],
    };
    session.loadFromObject(showcase, null);
    expect(session.getDocument().animation.active_clip_id).toBe("clip-presence-living-idle");

    const result = await newLiveDocument({
      id: "gasper-live-wispwalker-walk",
      embodiment: "wispwalker",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.activeClipId).toBeNull();
    expect(result.documentId).toBe("gasper-live-wispwalker-walk");
    expect(result.embodiment).toBe("wispwalker");
    const loaded = session.getDocument();
    expect(loaded.animation.active_clip_id).toBeNull();
    expect(loaded.animation.clips).toEqual([]);
    expect(loaded.embodiment_id).toBe("wispwalker");
  });
});
