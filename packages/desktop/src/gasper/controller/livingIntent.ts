/**
 * VEC-801 — Living-intent control: eight-state transport projection, main-form
 * ownership, and continuous live-SVG embodiment morphs. No second life scheduler;
 * FormMaster/native consume resolved living values through the controller flush.
 */

import type { LoopTransitionFrame } from "../eight-state-loop";
import type { EightStateId as LivingEightStateId } from "../eight-state-loop";
import { restoreLiveSvgStyle } from "../continuity/liveSvgVisibilityInvariant";
import { getVisualStateEndpoint } from "../GasperExpressionProjector";
import { composeSilhouetteAdmissions } from "../physics/PhysicsSilhouetteAuthority";
import {
  FORM_MASTER_FIXTURE_BY_LIVING_STATE,
  admitSceneSilhouetteValues,
  filterFormMasterSafeLivingValues,
  filterLegacyEndpointValues,
  resolveFormMasterEmotionFixtureId,
} from "./legacyFormMasterPolicy";

export type LivingIntentRig = {
  setMorphPreview?: (from: string, to: string, mix: number) => void;
  setExpressionPreview?: (from: string, to: string, mix: number) => void;
  clearMorphPreview?: () => void;
  setProfile?: (id: string) => void;
  morphToBehavioral?: (name: string, options?: { durationMs?: number }) => Promise<unknown>;
  getSnapshot?: () => { profile?: string };
  setFixtureImmediate?: (id: string) => void;
  setFixture?: (id: string) => void;
  setMotion?: (v: number) => void;
};

export type LivingIntentSelection = {
  patch: (partial: { embodiment?: string; expression?: string }) => void;
};

export type LivingIntentHost = {
  getSvgRoot: () => { style?: CSSStyleDeclaration } | null | undefined;
  getRig: () => LivingIntentRig | null | undefined;
  selection: LivingIntentSelection;
  isLegacyFormMaster: () => boolean;
  getReducedMotion: () => boolean;
  setMixerForm: (channels: Record<string, number>) => void;
  ensureTrackProxy: (id: string, value: number) => void;
  applyPoseToLegacyAuthority: (pose: Record<string, number>) => void;
};

/**
 * Pure main-form override for generic presence-family states.
 *
 * A living endpoint may describe the shared Presence family while the user has
 * authored another embodiment (Comet, Halo, Lantern, etc.). Those endpoints
 * must keep the authored profile; only an endpoint with its own explicit
 * embodiment (for example Comet executing or Dormant Orbit) may override it.
 */
export function mainFormOverride(
  authoredMainForm: string,
  stateEmbodiment: string,
): string {
  if (stateEmbodiment === "presence" && authoredMainForm) {
    return authoredMainForm;
  }
  return stateEmbodiment;
}

/**
 * N204 — eight-state id forwarded to FormMaster.
 * When the loop is off, a bounded performance owns the rig: do not restore
 * Presence-neutral as a continuous fallback. Unknown/empty ids stay null.
 */
export function eightStateForwardId(
  eightStateLoop: boolean,
  eightState: string | null | undefined,
): string | null {
  if (!eightStateLoop) return null;
  return typeof eightState === "string" && eightState.length > 0
    ? eightState
    : null;
}

/** Eight-state living flush motion gain (FormMaster idle breath path). */
export function eightStateLivingMotionGain(
  eightState: string | null | undefined,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  if (
    eightState === "comet-executing-drive" ||
    eightState === "dormant-orbit-maintain" ||
    eightState === "wake"
  ) {
    return 0.3;
  }
  return 0.6;
}

/**
 * Filter living flush values for legacy vs native mounts.
 * Pure policy portion of the living flush path.
 */
export function filterLivingFlushValues(
  values: Record<string, number>,
  opts: {
    legacy: boolean;
    eightStateLoop: boolean;
    reducedMotion: boolean;
    /**
     * D-0088: scene-scoped silhouette admission — provenance-tagged absolute
     * values (base + bound-clamped scene delta) from the active scene suite.
     * Undefined/empty keeps the fence fully closed.
     */
    sceneSilhouette?: Readonly<Record<string, number>>;
    /**
     * GASPER-CRAFT-001 · C1: curve-scoped silhouette admission (base +
     * bounded pack deltas — stretch/squash channels of a PerformancePack).
     * Composed between scene and physics: curve wins over scene, physics
     * wins over curve while armed. Empty = layers below untouched.
     */
    curveSilhouette?: Readonly<Record<string, number>>;
    /**
     * D-0090: physics-scoped silhouette admission (base + bounded physics
     * delta). Composed AFTER the scene admission — while armed, physics wins
     * per channel (composeSilhouetteAdmissions). Empty = scene untouched.
     */
    physicsSilhouette?: Readonly<Record<string, number>>;
  },
): Record<string, number> {
  const silhouette = composeSilhouetteAdmissions(
    composeSilhouetteAdmissions(opts.sceneSilhouette, opts.curveSilhouette),
    opts.physicsSilhouette,
  );
  if (opts.legacy) {
    const filtered = opts.eightStateLoop
      ? filterLegacyEndpointValues(
          values,
          opts.reducedMotion
            ? undefined
            : { blinkFloor: 0.05, eyeCeiling: 0.9 },
        )
      : filterFormMasterSafeLivingValues(values);
    return admitSceneSilhouetteValues(filtered, silhouette);
  }
  const livingOnly: Record<string, number> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== "number") continue;
    if (k === "overall_width" || k === "overall_height") continue;
    livingOnly[k] = v;
  }
  return admitSceneSilhouetteValues(livingOnly, silhouette);
}

/** Keep the single live SVG root optically present during transitions. */
export function ensureLiveSvgRootVisible(
  svg: { style?: CSSStyleDeclaration } | null | undefined,
): void {
  const style = svg?.style;
  if (!style) return;
  restoreLiveSvgStyle(style, { opacity: "1", filter: "none" });
}

/**
 * Continuous live-SVG vector embodiment transition (VEC-101).
 * Unsupported routes fail closed and preserve last valid vector state.
 */
export function applyLivingEmbodimentVectorTransition(
  host: Pick<LivingIntentHost, "getRig" | "getSvgRoot">,
  frame: LoopTransitionFrame,
  fromEmbodiment: string,
  toEmbodiment: string,
  fromFixture: string,
  toFixture: string,
): { ok: boolean; transitionKey: string } {
  const rig = host.getRig();
  const svg = host.getSvgRoot();
  const key = `${frame.fromState}:${fromEmbodiment}->${frame.toState}:${toEmbodiment}`;
  if (!rig || !svg) return { ok: false, transitionKey: key };

  ensureLiveSvgRootVisible(svg);

  const progress = Math.max(0, Math.min(1, frame.progress));
  const morphFn =
    typeof rig.setMorphPreview === "function"
      ? rig.setMorphPreview.bind(rig)
      : null;

  if (!morphFn) {
    console.warn(
      "[GasperLivingIntent] embodiment vector morph unavailable; preserving live SVG state",
      { fromEmbodiment, toEmbodiment, progress },
    );
    return { ok: false, transitionKey: key };
  }

  try {
    morphFn(fromEmbodiment, toEmbodiment, progress);
    if (typeof rig.setExpressionPreview === "function") {
      rig.setExpressionPreview(fromFixture, toFixture, progress);
    }
    ensureLiveSvgRootVisible(svg);
    return { ok: true, transitionKey: key };
  } catch (error) {
    console.warn(
      "[GasperLivingIntent] eight-state embodiment vector morph",
      error,
    );
    ensureLiveSvgRootVisible(svg);
    return { ok: false, transitionKey: key };
  }
}

export type LivingEightStateTransitionResult = {
  eightStateFaceMorphActive: boolean;
  livingEmbodimentTransitionKey: string | null;
};

/**
 * Project an eight-state transport frame onto the production renderer.
 * Channel interpolation stays in EightStateLoopController; this owns smooth
 * FormMaster embodiment/expression projection without React frames.
 */
export function applyLivingEightStateTransition(
  host: LivingIntentHost,
  frame: LoopTransitionFrame,
  authoredMainForm: string,
  livingEmbodimentTransitionKey: string | null,
): LivingEightStateTransitionResult {
  const endpointFor = (id: LivingEightStateId) =>
    getVisualStateEndpoint(id === "wake" ? "presence-neutral-settled" : id);
  const from = endpointFor(frame.fromState);
  const to = endpointFor(frame.toState);
  const rig = host.getRig();
  if (!from || !to || !rig) {
    return {
      eightStateFaceMorphActive: false,
      livingEmbodimentTransitionKey,
    };
  }

  const fromEmbodiment = mainFormOverride(authoredMainForm, from.embodimentId);
  const toEmbodiment = mainFormOverride(authoredMainForm, to.embodimentId);
  const progress = Math.max(0, Math.min(1, frame.progress));
  let faceMorphActive =
    host.isLegacyFormMaster() &&
    frame.phase === "transition" &&
    progress < 0.999;
  let transitionKey = livingEmbodimentTransitionKey;

  const fromFixture = FORM_MASTER_FIXTURE_BY_LIVING_STATE[frame.fromState];
  const toFixture = FORM_MASTER_FIXTURE_BY_LIVING_STATE[frame.toState];
  const svg = host.getSvgRoot();

  if (fromEmbodiment !== toEmbodiment) {
    const result = applyLivingEmbodimentVectorTransition(
      host,
      frame,
      fromEmbodiment,
      toEmbodiment,
      fromFixture,
      toFixture,
    );
    transitionKey = result.transitionKey;
  } else if (transitionKey) {
    ensureLiveSvgRootVisible(svg);
    transitionKey = null;
  }

  if (
    fromEmbodiment === toEmbodiment &&
    fromFixture !== toFixture &&
    typeof rig.setExpressionPreview === "function"
  ) {
    try {
      ensureLiveSvgRootVisible(svg);
      rig.setExpressionPreview(fromFixture, toFixture, progress);
    } catch (e) {
      console.warn("[GasperLivingIntent] eight-state expression preview", e);
    }
  }

  if (progress >= 0.999 || frame.phase === "hold") {
    faceMorphActive = false;
    ensureLiveSvgRootVisible(svg);
    transitionKey = null;
    try {
      const reduced = host.getReducedMotion();
      rig.setMotion?.(
        reduced
          ? 0
          : toEmbodiment === "dormant-orbit" || toEmbodiment === "comet"
            ? 0.3
            : 0.6,
      );
      const liveProfile = rig.getSnapshot?.()?.profile;
      if (liveProfile && liveProfile !== toEmbodiment && typeof rig.morphToBehavioral === "function") {
        void rig.morphToBehavioral(toEmbodiment, { durationMs: 1618 });
      } else if (liveProfile !== toEmbodiment) {
        rig.clearMorphPreview?.();
        rig.setProfile?.(toEmbodiment);
      }
      ensureLiveSvgRootVisible(svg);
    } catch (e) {
      console.warn("[GasperLivingIntent] eight-state embodiment hold", e);
      ensureLiveSvgRootVisible(svg);
    }
    try {
      rig.setFixtureImmediate?.(toFixture);
    } catch {
      try {
        rig.setFixture?.(toFixture);
      } catch (e) {
        console.warn("[GasperLivingIntent] eight-state expression hold", e);
      }
    }
    host.selection.patch({
      embodiment: toEmbodiment,
      expression: toFixture,
    });
  }

  return {
    eightStateFaceMorphActive: faceMorphActive,
    livingEmbodimentTransitionKey: transitionKey,
  };
}

/** Establish one canonical first frame when the eight-state loop (re)starts. */
export function prepareEightStateRestingBaseline(
  host: LivingIntentHost,
  authoredMainForm: string,
): void {
  ensureLiveSvgRootVisible(host.getSvgRoot());
  const neutral = getVisualStateEndpoint("presence-neutral-settled");
  const rig = host.getRig();
  if (!neutral || !rig) return;
  const fixtureId = host.isLegacyFormMaster()
    ? resolveFormMasterEmotionFixtureId(
        FORM_MASTER_FIXTURE_BY_LIVING_STATE["presence-neutral-settled"],
      )
    : neutral.expressionAffinity;

  try {
    const baseline = mainFormOverride(authoredMainForm, neutral.embodimentId);
    const liveProfile = rig.getSnapshot?.()?.profile;
    rig.setMotion?.(0.45);
    if (liveProfile && liveProfile !== baseline && typeof rig.morphToBehavioral === "function") {
      void rig.morphToBehavioral(baseline, { durationMs: 1618 });
    } else if (liveProfile !== baseline) {
      rig.clearMorphPreview?.();
      rig.setProfile?.(baseline);
    }
    rig.setFixtureImmediate?.(fixtureId);
  } catch (e) {
    console.warn("[GasperLivingIntent] resting baseline renderer", e);
  }
  host.selection.patch({
    embodiment: mainFormOverride(authoredMainForm, neutral.embodimentId),
    expression: fixtureId,
  });
  host.setMixerForm(neutral.channels);
  for (const [id, value] of Object.entries(neutral.channels)) {
    if (typeof value !== "number") continue;
    host.ensureTrackProxy(id, value);
  }
  if (host.isLegacyFormMaster()) {
    host.applyPoseToLegacyAuthority(
      filterLegacyEndpointValues(neutral.channels),
    );
  }
}
