/**
 * Desktop re-export of the shared animation command layer.
 * Sets Tauri/Node persist host when the Dais controller binds.
 */
export {
  GasperAnimationCommandSession,
  getAnimationCommandSession,
  resetAnimationCommandSessionForTests,
  createEmptyDocument,
  buildThinkingKnitClip,
  computeContentHash,
  defaultTracksForClip,
  ANIMATION_EASINGS,
  evaluateClipAt,
} from "../../../shared/src/gasper-animation";
export type {
  AnimationChangeResult,
  AnimationCommandHost,
  AnimationClip,
  GasperCanonicalDocument,
} from "../../../shared/src/gasper-animation";

import {
  getAnimationCommandSession as getSharedSession,
  type AnimationCommandHost,
} from "../../../shared/src/gasper-animation";

/** Bind desktop persist (Tauri when available) onto the shared session host. */
export function bindDesktopAnimationPersist(): void {
  const session = getSharedSession();
  const prev = (session as unknown as { host?: AnimationCommandHost }).host;
  // setHost is public on the session
  const existing = {
    applyPose: undefined as AnimationCommandHost["applyPose"],
    playClip: undefined as AnimationCommandHost["playClip"],
    pause: undefined as AnimationCommandHost["pause"],
    resume: undefined as AnimationCommandHost["resume"],
    interrupt: undefined as AnimationCommandHost["interrupt"],
    getLivePose: undefined as AnimationCommandHost["getLivePose"],
  };
  // Merge with whatever RigController already set by reading private via setHost pattern
  session.setHost({
    ...existing,
    persistDocument: async (doc, path) => {
      const { gasperSaveCanonicalDocument } = await import("./GasperDocumentBridge");
      return gasperSaveCanonicalDocument(doc, path);
    },
  });
}

/**
 * Merge host fields without wiping prior applyPose/playClip bindings.
 * Used by GasperRigController.
 */
export function mergeAnimationHost(partial: AnimationCommandHost): void {
  const session = getSharedSession() as unknown as {
    setHost: (h: AnimationCommandHost) => void;
    // private host is not accessible — keep last partials on module
  };
  const prev = lastHost;
  lastHost = {
    ...prev,
    ...partial,
    persistDocument:
      partial.persistDocument ??
      prev.persistDocument ??
      (async (doc, path) => {
        const { gasperSaveCanonicalDocument } = await import("./GasperDocumentBridge");
        return gasperSaveCanonicalDocument(doc, path);
      }),
  };
  session.setHost(lastHost);
}

let lastHost: AnimationCommandHost = {};
