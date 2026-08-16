/**
 * VEC-801 — Canonical state resolution / command routing helper.
 * One compositor invocation path for clip, living, preview, and character-state.
 */

import {
  clearHeldPose,
  composeResolvedPose,
  makeLayer,
  type PoseConstraint,
  type ResolvedPose,
} from "../compositor";

export type StateResolverHost = {
  committed: Record<string, number>;
  visibleControlIds(): string[];
  registryTargets(): Record<string, string[]>;
  onResolved(pose: ResolvedPose): void;
};

export type ResolveComposedPoseInput = {
  base?: Record<string, number>;
  embodiment?: Record<string, number>;
  expression?: Record<string, number>;
  clip?: Record<string, number>;
  runtime?: Record<string, number>;
  living?: Record<string, number>;
  preview?: Record<string, number>;
  manualPreview?: Record<string, number>;
  constraints?: PoseConstraint[];
  characterState?: Record<string, number>;
  scrubMode?: boolean;
  interrupted?: boolean;
};

/**
 * Compose authored clip + living + preview into a resolved pose with traces.
 * Scrub mode suppresses living; interrupt holds visible pose.
 */
export function resolveComposedPoseForController(
  host: StateResolverHost,
  lastResolvedPose: ResolvedPose | null,
  opts: ResolveComposedPoseInput,
): ResolvedPose {
  if (!opts.interrupted && lastResolvedPose?.held) {
    clearHeldPose();
  }
  const contributionEntries = (values: Record<string, number> = {}) =>
    Object.entries(values)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .map(([bindingId, value]) => ({ bindingId, value }));
  const layers = [
    makeLayer("document_base", contributionEntries(opts.base ?? host.committed), {
      id: "controller:document-base",
    }),
    makeLayer("embodiment", contributionEntries(opts.embodiment), {
      id: "controller:embodiment",
    }),
    makeLayer("expression", contributionEntries(opts.expression), {
      id: "controller:expression",
    }),
    makeLayer("clip", contributionEntries(opts.clip), {
      id: "controller:clip",
    }),
    makeLayer("runtime", contributionEntries(opts.runtime), {
      id: "controller:runtime",
    }),
    makeLayer("living", contributionEntries(opts.living), {
      id: "controller:living",
      blendMode: "absolute",
      suppressOnScrub: true,
    }),
    makeLayer(
      "manual_preview",
      contributionEntries(opts.manualPreview ?? opts.preview),
      { id: "controller:manual-preview" },
    ),
    makeLayer("character_state", contributionEntries(opts.characterState), {
      id: "controller:character-state-final",
      blendMode: "absolute",
    }),
  ];
  const resolved = composeResolvedPose({
    layers,
    constraints: opts.constraints,
    scrubMode: opts.scrubMode,
    interrupted: opts.interrupted,
    requiredBindings: host.visibleControlIds(),
    bindingTargets: host.registryTargets(),
  });
  host.onResolved(resolved);
  return resolved;
}
