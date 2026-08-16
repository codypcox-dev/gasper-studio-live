/**
 * GasperRigController — public facade / orchestrator (VEC-801 decomposition).
 *
 * Mechanics live in `./controller/*`:
 *   renderer adapter, organism clock integration, state resolver, living-intent,
 *   animation/editor adapter, vector projection coordination, inspection service.
 *
 * Authoring hot path never calls REST/MCP/CDP/iframe/postMessage.
 * Production authority: FormMaster legacy path + typed canonical layers.
 * Native candidate remains lab-only (not packaged production).
 */

import { GasperAnimationEngine } from "./GasperAnimationEngine";
import {
  attachGasperGsapClockBridge,
  getGasperOrganismClock,
  type GasperGsapClockBridgeHandle,
  type GasperOrganismClockPort,
  type OrganismClockInspection,
} from "./clock";
import { restoreLiveSvgStyle } from "./continuity/liveSvgVisibilityInvariant";
import {
  clampWorldPoseCommand,
  WORLD_HOME_POSE,
  WORLD_SPACE_CONSTANTS,
  type WorldPose,
  type WorldPoseCommand,
  type WorldProvenance,
} from "./space/WorldSpace";
import {
  clampWorldPoseToCompositionEnvelope,
  renderableWorldBoundsAt,
  type CompositionClampResult,
  type CompositionWorldEnvelope,
} from "./GasperCompositionWorldEnvelope";
import {
  WorldPhysicsDriver,
  type BounceLaunchConfig,
  type CometLaunchConfig,
  type WorldPhysicsDriverOutput,
} from "./physics/WorldPhysicsDriver";
import {
  PerformancePrimitiveDriver,
  type PerformancePrimitiveInspection,
} from "./performance/PerformancePrimitiveDriver";
import { WISPWALKER_CAPABILITY_PROFILE } from "./performance/WispwalkerCapabilityProfile";
import type { PhysicsIntentPlan } from "../../../shared/src/gasper-performance/reference/types";
import { admitPhysicsSilhouetteDeltas, PHYSICS_SILHOUETTE_IDENTITY_BASE } from "./physics/PhysicsSilhouetteAuthority";
import {
  facingPaintYawDeg,
  facingPaintOrbitYawDeg,
  facingReadableLocomotionYawDeg,
  READABLE_THREE_QUARTER_DEG,
} from "./physics/RadialFacingLaw"; // S8 (N39/N168): clock bearing -> readable 3/4 -> orbit sign so the far eye recedes.
import {
  createPhysicsField,
  fieldAfterResize,
  fieldMatchesExtents,
  type EnvironmentExtents,
  type PhysicsField,
} from "./physics/PhysicsField";
import {
  GoldenWanderDriver,
  type GoldenWanderState,
} from "./behavior/GoldenWanderDriver";
import { attentionYawDegreesFor } from "./behavior/LifeDirector";
import {
  LifeDirectorDriver,
  type LifeDirectorState,
} from "./behavior/LifeDirectorDriver";
import { getLifePack } from "./behavior/LifePacks";
import {
  PerformancePackDriver,
  type PackProvenance,
  type PerformancePackDriverOutput,
} from "./curves/PerformancePackDriver";
import type { PackShotScale, PerformancePack } from "./curves/PerformancePack";
import { composePackWorldPose, resolvePackRelease } from "./curves/packWorldPose"; // N60: authored pack offsets ride on the LIVE physics base; pack-end releases yield to the live authority
import {
  CRAFT_AUTHORING_BODY_HEIGHT_PX,
  getCraftPack,
} from "./curves/CraftPacks";
import {
  DEFAULT_WORLD_PHYSICS_PARAMS,
  type WorldPhysicsParams,
} from "./physics/WorldPhysics";
import type { GasperDocumentMount } from "./GasperDocument";
import {
  DEFAULT_FORM,
  GasperRenderMixer,
  type FormOverrideState,
} from "./GasperRenderMixer";
import {
  GasperParameterRegistry,
  type GasperRigBinding,
} from "./GasperParameterRegistry";
import { GasperSelectionModel } from "./GasperSelectionModel";
import {
  flattenDomainBindings,
  type GasperMultiDomainState,
} from "./GasperDomainState";
import { GasperGsapTrackOrchestrator } from "./GasperGsapTrackOrchestrator";
import { GasperAnimateSession } from "./GasperAnimateTracks";
import {
  GsapPlanCompiler,
  type AnimationPlan,
} from "./GsapPlanCompiler";
import {
  assertTopologyLock,
  expectedStructuralTriangles,
  GASPER_TOPOLOGY,
} from "./GasperTopologyLock";
import type { GasperDocumentV1 } from "./GasperDocumentModel";
import {
  applyHostTransformToRect,
  computeHostTransform,
} from "./GasperHostTransform";
import {
  GasperLivingRuntime,
  type LivingRuntimeOptions,
  type LivingRuntimeStatus,
  type MicrostateId,
} from "./GasperLivingRuntime";
import type { GasperViewportController } from "./GasperViewportController";
import type { BoundsSnapshot } from "./GasperVisualBounds";
import { GasperUnifiedAudioOutput } from "./physics";
import {
  exportAllVisualStateEndpointHashes,
  exportVisualStateEndpointParameters,
  getVisualStateEndpoint,
  isEightStateId,
  projectVisualStateEndpoint,
  resolveNativeAuthorityBindings,
  type EightStateId,
  type VisualStateProjectReport,
} from "./GasperExpressionProjector";
import type {
  EightStateId as LivingEightStateId,
  LoopTransitionFrame,
} from "./eight-state-loop";
import {
  applyCharacterStateVisual,
  createCharacterApplySession,
  getLastCharacterApplyReport,
  projectCharacterStateVisual,
  validateActiveCharacterIdentity,
  type CharacterApplySession,
  type CharacterPoseProjection,
  type StateVisualApplyReport,
} from "./state-visuals";
import {
  getAnimationCommandSession,
  mergeAnimationHost,
} from "./GasperAnimationCommands";
import {
  collectMergedKeyframes,
  evaluateClipAt,
} from "./GasperAnimationEvaluate";
import type { AnimationClip } from "./GasperAnimationTypes";
import {
  createReliefGenerator,
  reliefFieldToAuthorityDrive,
  type GasperReliefFieldGenerator,
  type ReliefAuthorityDrive,
} from "./relief";
import {
  type PoseConstraint,
  type ResolvedPose,
} from "./compositor";
import {
  createAnimationEditorSession,
  type AnimationEditorSession,
} from "./animation-editor";
import {
  FORM_MASTER_FIXTURE_BY_LIVING_STATE,
  resolveFormMasterEmotionFixtureId,
  LEGACY_LIVING_SAFE_KEYS,
  LEGACY_ENDPOINT_SAFE_KEYS,
  LEGACY_FORMMASTER_MOUTH_PLANE_KEYS,
  filterLegacyEndpointValues,
  filterFormMasterSafeLivingValues,
  FORM_KEYS,
  BINDING_LABELS,
  BINDING_GROUPS,
  rangeForBinding,
  resolveComposedPoseForController,
  paintLegacyAuthorityFrame,
  applyPoseToLegacyAuthority as applyPoseToLegacyAuthorityAdapter,
  mainFormOverride as mainFormOverrideFn,
  eightStateForwardId,
  eightStateLivingMotionGain,
  filterLivingFlushValues,
  applyLivingEmbodimentVectorTransition,
  applyLivingEightStateTransition as applyLivingEightStateTransitionFn,
  prepareEightStateRestingBaseline as prepareEightStateRestingBaselineFn,
  startDomainTickOnOrganismClock,
  DOMAIN_TICK_SUBSCRIBER_ID,
  DOMAIN_TICK_PRIORITY,
  installOperationalAnimatorBridge as installOperationalAnimatorBridgeFn,
  syncEditorProjectionFromAnimationSession as syncEditorProjectionFromAnimationSessionFn,
  inspectControllerProjection,
  inspectDaisForController,
  topologyStatusForController,
  validateRuntimeForController,
  exportDocumentForController,
  type DomainTickHandle,
} from "./controller";
import type { CanonicalProductionFieldPacket } from "./projection/CanonicalProductionField";

// Cumulative structural anchors (VEC-101/401/501 scanners read the facade source):
void applyLivingEmbodimentVectorTransition;
void DOMAIN_TICK_SUBSCRIBER_ID;
void DOMAIN_TICK_PRIORITY;

// Public policy surface — re-exported from controller modules (API stability).
export {
  FORM_MASTER_FIXTURE_BY_LIVING_STATE,
  resolveFormMasterEmotionFixtureId,
  LEGACY_LIVING_SAFE_KEYS,
  LEGACY_ENDPOINT_SAFE_KEYS,
  LEGACY_FORMMASTER_MOUTH_PLANE_KEYS,
  filterLegacyEndpointValues,
  filterFormMasterSafeLivingValues,
};

const LABELS = BINDING_LABELS;
const GROUPS = BINDING_GROUPS;
const rangeFor = rangeForBinding;

export type OwnerReviewOptions = Readonly<{
  seed?: number;
  reducedMotion?: boolean;
  embodiment?: string;
  expression?: string;
  boo?: boolean;
}>;

export type OwnerReviewStatus = Readonly<{
  active: boolean;
  generation: number;
  seed: number | null;
  embodiment: string;
  expression: string;
  boo: boolean;
  wanderEnabled: boolean;
  lifeEnabled: boolean;
  living: LivingRuntimeStatus;
}>;

type OwnerReviewSnapshot = Readonly<{
  living: LivingRuntimeStatus;
  wanderEnabled: boolean;
  lifeEnabled: boolean;
  authoredMainForm: string;
  expression: string;
  boo: boolean;
}>;

const OWNER_REVIEW_DEFAULT_SEED = 1005;

/** Bounded post-kernel gains exposed by the Gasper Tuning Lab. */
export type TuningLabParams = {
  gaitBobGain?: number;
  contactSquashGain?: number;
  supportExchangeGain?: number;
  footworkPrimitiveGain?: number;
  footworkTempo?: number;
  actingGain?: number;
};

export class GasperRigController {
  readonly registry = new GasperParameterRegistry();
  readonly selection: GasperSelectionModel;
  readonly animation = new GasperAnimationEngine();
  readonly tracks = new GasperGsapTrackOrchestrator();
  /** Wave R8 — multi-track keyframe authoring session (native, not MCP). */
  readonly animateSession = new GasperAnimateSession();
  /** Dispatch 001 — continuous GSAP living runtime (breath/blink/gaze/sequence). */
  readonly living = new GasperLivingRuntime();
  /** Explicit user-gesture audio sink for the same unified living frame. */
  readonly unifiedAudioOutput = new GasperUnifiedAudioOutput();
  /** Operational animator — UI-independent editor session (Lane A3 wired). */
  readonly editorSession: AnimationEditorSession = createAnimationEditorSession();
  /** Deterministic adaptive relief field (Lane R1). */
  private reliefGen: GasperReliefFieldGenerator = createReliefGenerator();
  private lastReliefDrive: ReliefAuthorityDrive | null = null;
  private lastResolvedPose: ResolvedPose | null = null;
  /** Last authored clip pose from scrub/play (compositor input). */
  private lastClipPose: Record<string, number> = {};
  private scrubModeActive = false;
  private compositorInvocations = 0;
  private operationalClockSec = 0;
  /** VEC-401 — sole organism-time authority (domain/projection + relief). */
  private readonly organismClock: GasperOrganismClockPort = getGasperOrganismClock();
  private gsapClockBridge: GasperGsapClockBridgeHandle | null = null;
  private domainTick: DomainTickHandle | null = null;
  /** Invalidates stale segment callbacks when playback is replaced/interrupted. */
  private canonicalPlaybackGeneration = 0;
  private planCompiler: GsapPlanCompiler;
  private mixer: GasperRenderMixer;
  private mount: GasperDocumentMount | null = null;
  private committed: FormOverrideState = { ...DEFAULT_FORM };
  private listeners = new Set<() => void>();
  private emitRaf: number | null = null;
  private topologyErrors: string[] = [];
  /**
   * Active continuous live-SVG embodiment transition key (from→to). Tracks vector
   * morph ownership only — never bitmap snapshot substitution.
   */
  private livingEmbodimentTransitionKey: string | null = null;
  /** F1_FACE_MORPH_WINDOW: true while a legacy eight-state transition frame is in
   * flight. Gates the per-frame face snap so FormMaster's geometric
   * setExpressionPreview/setMorphPreview blend drives the face instead of a hard snap. */
  private eightStateFaceMorphActive = false;
  // N2 EYE-FLICKER: true only on the live eight-state loop with reduced motion OFF.
  // While true the TS loop is the sole eye-aperture authority (blink AND open), so the
  // face-morph window must NOT withhold eye_openness — otherwise the open eye falls back
  // to FormMaster's internal fixture-lerp/idle and chatters every frame (the N1 residual
  // Cody saw as "flickering like crazy"). False on scrub/reduced-motion -> shipped path.
  private externalBlinkEyeAuthority = false;
  // WISPWALKER FIRST-CLASS: the user's authored embodiment choice (set via setEmbodiment /
  // the rail). The presence-* neutral loop states render this MAIN FORM (presence floating
  // or wispwalker grounded) instead of forcing "presence" every frame. Never overwritten by
  // the loop (unlike selection.embodiment, which the hold-settle patches), so it is the
  // durable source of truth for "which main form is Gasper in."
  private authoredMainForm: string = "wispwalker";
  /** GASPER-SPACE-001 PHASE A: last accepted world-pose command (read-back). */
  private lastWorldPoseCommand: WorldPoseCommand = Object.freeze({
    pose: WORLD_HOME_POSE,
    provenance: "none" as const,
  });
  /** GASPER-COMPOSITION-001 Wave 1.3B — fixed-camera renderable room. */
  private compositionWorldEnvelope: CompositionWorldEnvelope | null = null;
  private lastCompositionClamp: CompositionClampResult | null = null;
  /**
   * GASPER-SPACE-001 PHASE B (D-0090): the world-physics authority. Created
   * lazily on first launch so it only holds an organism-clock subscription
   * while a physics performance exists (detach's subscriber-count stop check
   * stays honest). Forwards physics-authority world poses through setWorldPose
   * and bounded silhouette deltas through the living flush fence.
   */
  private physicsDriver: WorldPhysicsDriver | null = null;
  /**
   * Reference-performance scheduler. It owns no body or timer: every beat is
   * filed into physicsDriver on this controller's organism clock.
   */
  private performancePrimitiveDriver: PerformancePrimitiveDriver | null = null;
  /**
   * Tuning Lab multipliers. These are post-kernel expression gains: the
   * physics driver still derives the gait, while the lab only scales the
   * bounded screen read before the renderer expresses it.
   */
  private tuningLabParams: Required<TuningLabParams> = {
    gaitBobGain: 1,
    contactSquashGain: 1,
    supportExchangeGain: 1,
    footworkPrimitiveGain: 1,
    footworkTempo: 1,
    actingGain: 1,
  };
  /** Last kernel packet retained for the Tuning Lab telemetry read-back. */
  private lastPhysicsOutput: WorldPhysicsDriverOutput | null = null;
  /** Last bounded silhouette deltas forwarded by the physics driver. */
  private physicsSilhouetteDeltas: Readonly<Record<string, number>> =
    Object.freeze({});
  /**
   * GASPER-PHYSICS-001 · D-0112: the environment's physics field as last
   * reported (null = the environment has not reported yet — the kernel runs
   * its authored fallback and the bounds stay the standing WorldSpace law).
   * The field is the environment's ownership of physics: gravity, friction,
   * restitution and bounds all derive from it, never from a per-constant dial.
   */
  private envField: PhysicsField | null = null;
  /**
   * GASPER-CRAFT-001 · C1: the curve-performance authority. Same lazy idiom
   * as the physics driver — holds an organism-clock subscription only while
   * a pack exists (detach's subscriber-count stop check stays honest).
   * Forwards curve-authority world poses through setWorldPose, bounded
   * silhouette deltas through the living flush fence, wake/light feeds, and
   * face/beat/scale intents for the face beats (C4) + the depth-legibility
   * witness.
   */
  private performancePackDriver: PerformancePackDriver | null = null;
  /** Last bounded silhouette deltas forwarded by the pack driver. */
  private curveSilhouetteDeltas: Readonly<Record<string, number>> =
    Object.freeze({});
  /**
   * GASPER-CRAFT-002 · D-0106: the golden-angle idle-wander authority.
   * Created at attach (idle life is the default, not an event): it asks its
   * gate every tick and emits nothing while autonomy is closed, so the
   * subscriber only ever moves Gasper when the hierarchy of authorities
   * allows it. Destroyed at detach before the subscriber-count stop check.
   */
  private goldenWanderDriver: GoldenWanderDriver | null = null;
  /** Master switch for the wander authority (owner / rail). Default on. */
  private wanderEnabled = true;
  /**
   * GASPER-ALIVE-001 · D-0108: the long-horizon life authority. Created at
   * attach (like the wander — life is the default, not an event): it asks its
   * gate every tick and holds nothing while the hierarchy is closed. One
   * authority above the wander (it may pause it for an approach leg), below
   * packs / physics / capture / restraint / reduced motion.
   */
  private lifeDirector: LifeDirectorDriver | null = null;
  /** Master switch for the life authority (owner / rail). Default on. */
  private lifeEnabled = true;
  /** GASPER-COMPOSITION-001 Wave 0.1 — reversible deterministic owner-review lease. */
  private ownerReviewSnapshot: OwnerReviewSnapshot | null = null;
  private ownerReviewGeneration = 0;
  private ownerReviewSeed = OWNER_REVIEW_DEFAULT_SEED;
  private ownerReviewReducedMotion = false;
  /**
   * True while the life director's OWN pack is in flight — the life gate must
   * not close under its own act; foreign packs still preempt it.
   */
  private lifePackInFlight = false;
  /** The wander master switch as it was before an approach leg paused it. */
  private lifePausedWander = true;
  /** Last face-energy scalar forwarded by the pack driver (C4 carrier). */
  private lastPackFace = 0;
  /** Last beat id under the playhead (null in gaps / at rest). */
  private lastPackBeatId: string | null = null;
  /** Last shot scale under the playhead — the depth-legibility witness. */
  private lastPackShotScale: PackShotScale | null = null;
  /**
   * Controller-owned character apply session (revision / last stamp).
   * Not module-global — multi-instance safe.
   */
  private characterSession: CharacterApplySession = createCharacterApplySession();
  /** Last character eight-state apply report (identity-governed stamp). */
  private lastCharacterApply: StateVisualApplyReport | null = null;
  /**
   * D-0083 USER-OWNED BINDING AUTHORITY: binding ids the user explicitly set via
   * previewBinding/commitBinding (the dais control rail). The per-frame living
   * flush excludes these keys so a committed slider value is not stomped by the
   * loop (observed live: Energy slider = no visible effect, Yaw re-asserted by
   * the loop within a frame). eye_openness is deliberately EXCLUDED from this
   * set — the N3 aperture authority owns it to prevent eye flicker.
   * Cleared by clearUserOwnedBindings() (expression-studio reset).
   */
  private readonly userOwnedBindings = new Set<string>();

  constructor(selection?: GasperSelectionModel) {
    this.selection = selection ?? new GasperSelectionModel();
    this.mixer = new GasperRenderMixer(null);
    // Morph/embodiment GSAP tracks → mixer + frame emit (handles/bounds attach)
    // Wave R1: setForm schedules one rAF flush — do not double-flush.
    this.tracks.setFlushHandler((values) => {
      this.mixer.setForm(values);
      this.emitFrame();
    });
    this.planCompiler = new GsapPlanCompiler({
      proxyFor: (id) => this.tracks.ensureProxy(id, this.committed[id] ?? 0),
      flush: (values) => {
        this.mixer.setForm(values);
        this.emitFrame();
      },
      snapshot: () => this.tracks.snapshot(),
    });
    // Living runtime shares track proxies; flush goes through compositor so
    // living additive cannot silently overwrite authored clip values.
    this.living.attach({
      onUnifiedAudioFrame: (frame) => this.unifiedAudioOutput.consume(frame),
      flush: (values) => {
        const livingOnly: Record<string, number> = {};
        const legacy = !!this.mount?.legacyFormMaster;
        const livingStatus = this.living.getStatus();
        const eightStateLoop = livingStatus.eightStateLoop;
        // N2 EYE-FLICKER: evaluate eye-aperture authority EVERY flush (unconditional) so
        // scrub / reduced-motion clear it and the FormMaster flag never latches stale-true
        // after the loop ends. While true the TS eight-state loop is the sole aperture
        // owner (blink + open); the face-morph window must not withhold eye_openness or the
        // open eye free-runs on FormMaster's internal lerp and chatters every frame.
        this.externalBlinkEyeAuthority =
          !livingStatus.reducedMotion && !!eightStateLoop;
        try {
          (globalThis as any).SidekickFormMasterRig?.setExternalBlinkAuthority?.(
            this.externalBlinkEyeAuthority,
          );
        } catch {
          /* global absent (non-legacy mount) */
        }
        Object.assign(
          livingOnly,
          filterLivingFlushValues(values, {
            legacy,
            eightStateLoop: !!eightStateLoop,
            reducedMotion: !!livingStatus.reducedMotion,
            // D-0088: scene-scoped silhouette admission — provenance-tagged
            // absolute values for the fenced channels the active scene suite
            // authors this frame (empty otherwise; the fence stays closed).
            // userOwnedBindings pruning below still wins over this layer.
            sceneSilhouette: eightStateLoop
              ? this.living.eightLoop.getSceneSilhouetteAdmission()
              : undefined,
            // GASPER-CRAFT-001 · C1: curve-scoped silhouette admission —
            // pack stretch/squash channels through the D-0090 fence
            // vocabulary. Wins over scene; physics still wins over both.
            curveSilhouette: this.curveSilhouetteAdmissionRecord(),
            // D-0090: physics-scoped silhouette admission (base + bounded
            // physics delta). While armed it wins per channel over the scene
            // admission (composeSilhouetteAdmissions inside the filter).
            physicsSilhouette: this.physicsSilhouetteAdmissionRecord(),
          }),
        );
        if (eightStateLoop && livingOnly.unified_time_seconds === undefined) {
          // Compatibility fallback for an older living source that has not yet
          // supplied the Unified Theory substrate. The canonical path carries
          // its own motion channel and must not be overwritten by a fixed gain.
          livingOnly.motion = eightStateLivingMotionGain(
            livingStatus.eightState,
            !!livingStatus.reducedMotion,
          );
        }
        // D-0083: drop user-owned keys from BOTH the living layer AND the clip
        // layer so committed rail values win per-frame (base already holds them).
        // Clip must be filtered too: compositor priority is living > clip > base,
        // and lastClipPose latches stale rail previews forever (observed live:
        // relief_amplitude re-asserted at 0.42 every flush after a commit to 0).
        let clipForResolve = this.lastClipPose;
        if (this.userOwnedBindings.size) {
          for (const k of this.userOwnedBindings) delete livingOnly[k];
          if (clipForResolve) {
            clipForResolve = Object.fromEntries(
              Object.entries(clipForResolve).filter(
                ([k]) => !this.userOwnedBindings.has(k),
              ),
            );
          }
        }
        const resolved = this.resolveComposedPose({
          base: this.committed,
          clip: clipForResolve,
          living: livingOnly,
          scrubMode: this.scrubModeActive,
        });
        const pose = resolved.values;
        // N3 EYE-SEIZURE: push the loop's clean eye aperture (family open + real blink) as the
        // single pixel authority, bypassing the per-frame applySemanticPose<->geometric-blend
        // race on current.eyeOpenL. Null when authority is off so the shipped reduced-motion /
        // scrub path reads frameState as before. Mirrors setExternalBlinkAuthority above so the
        // flag and the aperture value never desync.
        try {
          (globalThis as any).SidekickFormMasterRig?.setExternalEyeAperture?.(
            this.externalBlinkEyeAuthority
              ? (pose as Record<string, number>).eye_openness
              : null,
          );
        } catch {
          /* global absent (non-legacy mount) */
        }
        // D-0049 EIGHT-STATE PHYSICAL CHARACTER (M1): forward the live eight-state id to the FormMaster renderer so
        // its in-renderer per-state body recipe (EIGHT_STATE_BODY) expresses a distinct physical stance per state
        // (thinking crown-bulge, blocked brace, pleased bloom, ...). Mirrors the setExternalEyeAperture forward above.
        // No face-geometry impact: the recipe rides the body contour + interior-light intensity only. Absent on
        // non-legacy mounts (global absent => no-op).
        try {
          const eightId = eightStateForwardId(
            !!livingStatus.eightStateLoop,
            livingStatus.eightState,
          );
          if (eightId) {
            (globalThis as any).SidekickFormMasterRig?.setEightState?.(eightId);
          }
        } catch {
          /* global absent (non-legacy mount) */
        }
        if (legacy) {
          // Filter composed pose to safe keys so base/clip mass keys do not
          // thrash FormMaster silhouette every breath tick.
          const safePose: Record<string, number> = {};
          for (const [k, v] of Object.entries(pose)) {
            if (typeof v !== "number") continue;
            // SINGLE-SOURCE EYE APERTURE (Cody 2026-07-24): under live-loop authority the
            // aperture is owned by externalEyeAperture (-> render), so never forward
            // eye_openness through the legacy pose path or it races the geometric blend.
            if (k === "eye_openness" && this.externalBlinkEyeAuthority) continue;
            // Physics tick owns overall_width/height via applySemanticPose(admitted).
            // Living/unified volume (~1.00) was the second pin: it zeroed the
            // arrived-hold hull after scaleY un-pin when gather is low / speed<40.
            if (k === "overall_width" || k === "overall_height") continue;
            if (LEGACY_LIVING_SAFE_KEYS.has(k) || k in livingOnly) safePose[k] = v;
          }
          if (Object.keys(safePose).length) this.applyPoseToLegacyAuthority(safePose);
        } else {
          this.mixer.setForm(pose);
          for (const [k, v] of Object.entries(pose)) {
            if (typeof v !== "number") continue;
            if (k === "overall_width" || k === "overall_height") continue;
            if (k === "eye_openness" || k === "gaze") continue;
            this.tracks.ensureProxy(k, v).value = v;
          }
        }
        this.emitFrame();
      },
      proxyFor: (id, initial = 0) =>
        this.tracks.ensureProxy(id, this.committed[id] ?? initial),
      snapshot: () => {
        const live = this.mixer.getForm();
        // Prefer track proxy values when present (mid-tween)
        const track = this.tracks.snapshot();
        return { ...live, ...track };
      },
      onTransitionFrame: (frame) =>
        this.applyLivingEightStateTransition(frame),
    });
    this.living.subscribe(() => this.emitFrame());
    this.installBindings();
    // Bind shared animation command layer to this Dais instance (UI + model tools).
    mergeAnimationHost({
      applyPose: (pose: Record<string, number>) =>
        this.applyComposedExternalPose(pose, { scrubMode: false }),
      playClip: (clip: AnimationClip, opts?: { onPlayhead?: (t: number) => void }) =>
        this.playCanonicalClip(clip, opts),
      pause: () => this.pauseStudioAnimate(),
      resume: () => this.resumeStudioAnimate(),
      interrupt: () => this.interruptStudioAnimate(),
      getLivePose: () => this.readLive(),
    });
    // Operational animator: inject editor live paths (not a dead empty session).
    this.installOperationalAnimatorBridge();
  }

  /**
   * Wire editorSession → animation command session (durable projection) +
   * playhead evaluation through compositor onto Legacy Authority / mixer.
   * Must run in constructor so AnimateTimelinePanel is never dead.
   * Implementation: controller/animationEditorAdapter.ts
   */
  installOperationalAnimatorBridge(): void {
    installOperationalAnimatorBridgeFn({
      editorSession: this.editorSession,
      readLive: () => this.readLive(),
      playCanonicalClip: (clip, opts) => this.playCanonicalClip(clip, opts),
      pauseStudioAnimate: () => this.pauseStudioAnimate(),
      interruptStudioAnimate: () => this.interruptStudioAnimate(),
      scrubStudioAnimate: (t) => this.scrubStudioAnimate(t),
      emit: () => this.emit(),
      setScrubModeActive: (active) => {
        this.scrubModeActive = active;
      },
    });
  }

  /** Push animation command session document into editor projection (TS working set). */
  syncEditorProjectionFromAnimationSession(): void {
    syncEditorProjectionFromAnimationSessionFn({
      editorSession: this.editorSession,
      emit: () => this.emit(),
    });
  }

  /**
   * Apply a pose through the resolved-pose compositor (clip/authored vs living).
   * This is the single paint entry used by MCP, UI, scrub, and external hosts.
   */
  applyComposedExternalPose(
    pose: Record<string, number>,
    opts: { scrubMode?: boolean; living?: Record<string, number>; treatAsClip?: boolean } = {},
  ): ResolvedPose {
    const scrub = !!opts.scrubMode;
    this.scrubModeActive = scrub;
    if (opts.treatAsClip !== false) {
      this.lastClipPose = { ...this.lastClipPose, ...pose };
    }
    for (const [id, value] of Object.entries(pose)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        this.committed[id] = value;
      }
    }
    const resolved = this.resolveComposedPose({
      base: this.committed,
      clip: opts.treatAsClip === false ? this.lastClipPose : pose,
      living: scrub ? {} : (opts.living ?? {}),
      scrubMode: scrub,
    });
    const out = resolved.values;
    if (typeof out.relief_amplitude === "number") {
      this.applyOperationalRelief(out.relief_amplitude, out);
    }
    if (typeof out.yaw !== "number" && typeof this.committed.yaw === "number") {
      // D-0084: yaw is not a FORM_KEYS registry channel, so resolveComposedPose
      // drops it from `out`; pass it through so applyPoseToLegacyAuthority's
      // setYaw branch can see it (the dais Yaw 2.5D slider was a live no-op).
      out.yaw = this.committed.yaw;
    }
    if (this.mount?.legacyFormMaster) {
      this.applyPoseToLegacyAuthority(out);
    } else {
      this.tracks.applyValues(out);
      this.mixer.setForm(out);
      this.mixer.flush();
    }
    this.emitFrame();
    this.emit();
    return resolved;
  }

  /** True when compositor has been invoked on a live controller path (not only unit tests). */
  isCompositorActiveOnRenderPath(): boolean {
    return this.compositorInvocations > 0;
  }

  getCompositorInvocationCount(): number {
    return this.compositorInvocations;
  }

  private installBindings() {
    for (const id of FORM_KEYS) {
      const def = DEFAULT_FORM[id] ?? 0;
      const { min, max } = rangeFor(id);
      const binding: GasperRigBinding = {
        id,
        label: LABELS[id] || id,
        group: GROUPS[id] || "form",
        min,
        max,
        step: 0.01,
        default: def,
        unit: "",
        affectedNodeIds: [GROUPS[id] || "idleRig"],
        validEmbodiments: [...GasperSelectionModel.EMBODIMENTS],
        read: () => this.committed[id] ?? def,
        preview: (value: number) => {
          try {
            this.animation.preview(id, value);
            this.registry.setDiagnostic(id, true, "ok");
            // Immediate live for handle read + rAF emit for stage attach
            if (this.mount?.legacyFormMaster) {
              this.applyPoseToLegacyAuthority({ [id]: value });
            } else {
              this.mixer.setFormValue(id, value);
            }
            this.emitFrame();
          } catch (e) {
            this.registry.setDiagnostic(id, false, (e as Error).message);
          }
        },
        commit: (value: number) => {
          const from = this.committed[id] ?? def;
          this.committed[id] = value;
          if (this.mount?.legacyFormMaster) {
            this.animation.setImmediate(id, value, (v) => {
              this.applyPoseToLegacyAuthority({ [id]: v });
              this.emitFrame();
            });
            this.applyPoseToLegacyAuthority({ [id]: value });
          } else {
            this.animation.setImmediate(id, value, (v) => {
              this.mixer.setFormValue(id, v);
              this.emitFrame();
            });
            this.mixer.setFormValue(id, value);
            this.mixer.flush();
            this.tracks.ensureProxy(id, value).value = value;
          }
          if (Math.abs(from - value) > 1e-9) {
            this.registry.pushUndo(id, from, value);
          }
          this.emit();
        },
        cancel: () => {
          const v = this.committed[id] ?? def;
          if (this.mount?.legacyFormMaster) {
            this.animation.setImmediate(id, v, (x) => {
              this.applyPoseToLegacyAuthority({ [id]: x });
              this.emitFrame();
            });
            this.applyPoseToLegacyAuthority({ [id]: v });
          } else {
            this.animation.setImmediate(id, v, (x) => {
              this.mixer.setFormValue(id, x);
              this.emitFrame();
            });
            this.mixer.setFormValue(id, v);
            this.mixer.flush();
          }
          this.emit();
        },
        reset: () => {
          binding.commit(def);
        },
      };
      this.registry.register(binding);
      // GSAP quickTo frames → mixer + stage listeners (handles stay attached)
      this.animation.registerProxy(id, def, (v) => {
        if (this.mount?.legacyFormMaster) {
          this.applyPoseToLegacyAuthority({ [id]: v });
        } else {
          this.mixer.setFormValue(id, v);
        }
        this.emitFrame();
      });
      this.tracks.ensureProxy(id, def);
    }
  }

  attach(mount: GasperDocumentMount) {
    this.mount = mount;
    // VEC-401: the controller is the desktop host. It attaches one GSAP bridge
    // and starts the sole real-time driver exactly once for this mounted realm.
    // VEC-401: sole GSAP root bridge for this mounted realm.
    this.gsapClockBridge?.dispose();
    this.gsapClockBridge = attachGasperGsapClockBridge(this.organismClock);
    this.organismClock.start({ mode: "realtime" });
    // Set authority mode before mounting the root so the native mixer never
    // attempts to claim a production FormMaster SVG.
    this.mixer.setLegacyAuthorityDomWriteFirewall(!!mount.legacyFormMaster);
    this.mixer.setSvg(mount.svgRoot);
    const host = mount.svgRoot.parentElement as HTMLElement | null;
    this.mixer.setHost(host);

    const t = mount.topology;
    const check = assertTopologyLock({
      contourSamples: t.contourSamples,
      structuralNodes: t.structuralNodes,
      structuralTriangles:
        t.structuralTriangles || expectedStructuralTriangles(),
      adaptiveReliefMaxSamples: GASPER_TOPOLOGY.adaptiveRelief.maxSamples,
    });
    this.topologyErrors = check.ok ? [] : check.errors;
    if (!check.ok) {
      console.warn("[GasperRigController] topology", check.errors);
    }

    // GASPER-CRAFT-002 · D-0106: idle life is the default — the wander
    // authority exists from attach in BOTH mount realms (the legacy
    // FormMaster stage returns early below, so this lives before the
    // branch). It asks its gate every tick (autonomy open, no pack, no
    // physics beyond the locomotion transport, no reduced motion); until
    // the living runtime starts the gate is closed by construction
    // (autoSequence defaults false, restrainedIdle defaults true), so tests
    // that attach without life see no wander poses.
    // GASPER-PHYSICS-001 · D-0112: wander files LOCOMOTION INTENTS with the
    // body kernel (the sole writer of free movement) — no pose drag.
    this.goldenWanderDriver?.destroy();
    this.goldenWanderDriver = new GoldenWanderDriver(
      this.organismClock,
      this.ensurePhysicsDriver(),
      () => this.wanderGateOpen(),
      // Cycle 2 E1 — proprioception: the wanderer reads its own body live.
      () => this.selection.getState().embodiment,
      // N41 (2026-08-06) — the INTENTION TELEGRAPH: on a leg's φ⁻¹ s intent
      // hold the eyes + attention address the travel direction BEFORE the
      // kernel moves (look, commit, then go — timing-for-animation staging);
      // on the hold's end the address releases and the S8 heading carrier
      // takes over (the movement owns the direction). Fail-closed: a missing
      // mount closes the seam.
      (bearingDeg) => {
        try {
          const g = (globalThis as any).SidekickFormMasterRig;
          if (!g) return;
          if (bearingDeg == null) {
            g.setAttentionYaw?.(0, 0);
            g.setExternalGaze?.(0, 0, 0);
            return;
          }
          const rad = (bearingDeg * Math.PI) / 180;
          const nx = Math.max(-1, Math.min(1, Math.sin(rad) * 0.9));
          const ny = Math.max(-1, Math.min(1, -Math.cos(rad) * 0.35));
          g.setExternalGaze?.(nx, ny, 1);
          g.setAttentionYaw?.(attentionYawDegreesFor(Math.sin(rad)), 1);
        } catch {
          /* a broken telegraph never stops the clock */
        }
      },
    );
    this.goldenWanderDriver.setEnabled(this.wanderEnabled);

    // GASPER-ALIVE-001 · D-0108: long-horizon life — attention holds, self-
    // initiated acts, curiosity approaches, dormant arcs. The ports keep the
    // driver renderer-agnostic; every seam is fail-closed here so a missing
    // mount or unstarted living loop closes the seam, never throws (the
    // clock fault law runs driver-side too).
    this.lifeDirector?.destroy();
    this.lifeDirector = new LifeDirectorDriver(
      this.organismClock,
      {
        // GASPER-PHYSICS-001 · D-0112: approach legs are filed as locomotion
        // intents with the body kernel (the sole writer of free movement).
        // The leg starts where the BODY is — the kernel's floor pose is the
        // only truth; arrival and release are kernel-owned.
        locomotion: this.ensurePhysicsDriver(),
        runPack: (id) => {
          const pack = getLifePack(id);
          if (!pack) return false;
          this.lifePackInFlight = true;
          this.runPerformancePack(pack, { provenance: "curve-authority" });
          return true;
        },
        packRunning: () =>
          this.performancePackDriver?.getState().running ?? false,
        setGaze: (nx, ny, s) => {
          try {
            (globalThis as any).SidekickFormMasterRig?.setExternalGaze?.(
              nx,
              ny,
              s,
            );
            // S5 · A-LAW (expression-attention-phd-memo): attention turns the
            // BODY too, not just the eyes (consonant C7). The same gaze seam
            // carries the yaw setpoint — one seam, so every driver release
            // path (setGaze(0,0,0)) releases the yaw with it. A-LAW 3: the
            // yaw DIAL is the user override — if the user owns the yaw
            // binding (D-0083), forward a release instead of the autonomous
            // setpoint.
            const yawDeg = this.userOwnedBindings.has("yaw")
              ? 0
              : attentionYawDegreesFor(nx);
            const yawS = this.userOwnedBindings.has("yaw") ? 0 : s;
            (globalThis as any).SidekickFormMasterRig?.setAttentionYaw?.(
              yawDeg,
              yawS,
            );
          } catch {
            /* global absent (non-legacy mount) */
          }
        },
        accentState: (id) => {
          try {
            if (isEightStateId(id)) {
              this.living?.eightLoop?.interruptTo(id as EightStateId, {});
            }
          } catch {
            /* loop not running — the accent is decorative, never structural */
          }
        },
        enterLongRest: () => {
          try {
            this.living?.eightLoop?.enterLongRest();
          } catch {
            /* loop not running */
          }
        },
        wakeFromLongRest: () => {
          try {
            this.living?.eightLoop?.wakeFromLongRest();
          } catch {
            /* loop not running */
          }
        },
        setWanderEnabled: (v) => {
          // Pause the lower spatial autonomy for an approach leg; on release
          // restore the OWNER's wander switch, not a forced on.
          if (v) this.setWanderEnabled(this.lifePausedWander);
          else {
            this.lifePausedWander = this.wanderEnabled;
            this.setWanderEnabled(false);
          }
        },
        accent: (mouthGain, formGain) =>
          this.writeLiveCoeffs(mouthGain, formGain),
        substrate: (open) => this.writeLifeSubstrate(open || this.wanderEnabled),
        gate: () => this.lifeGateOpen(),
      },
    );
    this.lifeDirector.setEnabled(this.lifeEnabled);

    // GASPER-PHYSICS-001 · D-0112: the studio ENVIRONMENT reports itself so
    // the body kernel runs on the φ FIELD, not the authored fallback. The
    // report is in CONTENT PX — the px space that maps ×unitsPerContentPx to
    // world units — so the field's walls coincide exactly with the renderer
    // fence (worldBoundsAt): half-width 960 units, ceiling 1080 units, and
    // zNear/zFar inherited from the WorldSpace law. homeHeightPx is the
    // D-0098 silhouette anchor, so gravity derives as exactly 9.81 m/s² at
    // his φ-scale size (the snappiness law). He now knows the room he is in.
    // The editor's ResizeObserver is deliberately NOT this source — panel
    // geometry is not his room; the studio room is the fixed WorldSpace. The
    // same door later takes any desktop's extents (epoch bump → awareness).
    this.reportEnvironmentSize({
      viewportWidthPx:
        WORLD_SPACE_CONSTANTS.extentWidth /
        WORLD_SPACE_CONSTANTS.unitsPerContentPx,
      viewportHeightPx:
        WORLD_SPACE_CONSTANTS.extentHeight /
        WORLD_SPACE_CONSTANTS.unitsPerContentPx,
      homeHeightPx: CRAFT_AUTHORING_BODY_HEIGHT_PX,
    });

    // Legacy Authority (FormMaster scripts): do NOT run native mixer contour/material
    // flush — that overwrites complete character geometry with the partial extraction.
    if (mount.legacyFormMaster) {
      try {
        const rig = mount.rig as {
          setReliefPreset?: (v: string) => void;
          setMotion?: (v: number) => void;
          setPaused?: (v: boolean) => void;
          requestOneFrame?: () => void;
          setProfile?: (n: string, settle?: string) => void;
        };
        const bootForm =
          this.authoredMainForm || this.selection.getState().embodiment || "wispwalker";
        rig.setProfile?.(bootForm, "settle");
        rig.setMotion?.(0.45);
        // FormMaster paints inside the VEC-701 production transaction.
        this.paintLegacyAuthority();
        // Rebuild cache for handle placement only — no forceAll geometry rewrite
        this.mixer.rebuildNodeCache();
      } catch (e) {
        console.warn("[GasperRigController] legacy authority boot", e);
      }
      // VEC-401: FormMaster already consumes the host-owned clock.
      // No native domain tick / contour — FormMaster still owns visual frames.
      return;
    }

    // Native candidate path
    this.mixer.setLegacyAuthorityDomWriteFirewall(false);
    this.mixer.setOpticalMode("authoring-neutral");
    this.mixer.setContourProfile(this.selection.getState().embodiment);
    this.mixer.setForm(this.committed);
    this.mixer.flush({ forceAll: true });

    try {
      const rig = mount.rig as {
        setReliefPreset?: (v: string) => void;
        setMotion?: (v: number) => void;
        setPaused?: (v: boolean) => void;
      };
      rig.setReliefPreset?.("brow_raise");
      rig.setMotion?.(0.45);
      rig.setPaused?.(true);
    } catch {
      /* optional */
    }

    this.startDomainTick();
    // Living runtime is started by GasperDaisStage after mount (not here),
    // so unit tests can attach without continuous life overwriting commits.
  }

  detach() {
    this.stopLiving();
    if (this.emitRaf != null) {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.emitRaf);
      else clearTimeout(this.emitRaf);
      this.emitRaf = null;
    }
    // The reference scheduler subscribes before the kernel; destroy it first
    // so it cannot file another intent while the body authority is retiring.
    this.performancePrimitiveDriver?.destroy();
    this.performancePrimitiveDriver = null;
    // Destroy the physics driver BEFORE the subscriber-count stop check below
    // so a previously-armed performance cannot pin the organism clock open.
    this.physicsDriver?.destroy();
    this.physicsDriver = null;
    this.physicsSilhouetteDeltas = Object.freeze({});
    // GASPER-CRAFT-001 · C1: same rule for the pack driver's subscription.
    this.performancePackDriver?.destroy();
    this.performancePackDriver = null;
    this.curveSilhouetteDeltas = Object.freeze({});
    // GASPER-CRAFT-002 · D-0106: same rule for the wander authority.
    this.goldenWanderDriver?.destroy();
    this.goldenWanderDriver = null;
    // GASPER-ALIVE-001 · D-0108: same rule for the life authority.
    this.lifeDirector?.destroy();
    this.lifeDirector = null;
    this.lifePackInFlight = false;
    this.lastPackFace = 0;
    this.lastPackBeatId = null;
    this.lastPackShotScale = null;
    this.stopDomainTick();
    this.gsapClockBridge?.dispose();
    this.gsapClockBridge = null;
    this.mount?.destroy();
    this.mixer.setSvg(null);
    this.mount = null;
    this.mixer.setLegacyAuthorityDomWriteFirewall(false);
    // Stop the driver only after every mounted consumer has detached.
    if (this.organismClock.inspect().subscriberCount === 0) {
      this.organismClock.stop();
    }
  }

  /**
   * VEC-101: keep the single live SVG root mounted and optically present.
   * Transition code must never hide the live root for bitmap substitution.
   */
  private ensureLiveSvgRootVisible(): void {
    const svg = this.mount?.svgRoot;
    const style = svg?.style;
    if (!style) return;
    restoreLiveSvgStyle(style, { opacity: "1", filter: "none" });
  }

  /**
   * Clear continuous live-SVG embodiment transition bookkeeping and restore
   * the live root. No Canvas/Image/Blob snapshots are created or removed.
   */
  private resetLivingEmbodimentTransition(opts?: {
    showLive?: boolean;
  }): void {
    if (opts?.showLive !== false) this.ensureLiveSvgRootVisible();
    this.livingEmbodimentTransitionKey = null;
  }

  /**
   * WISPWALKER FIRST-CLASS: presence (floating neutral) and wispwalker (grounded walker)
   * are Gasper's two MAIN FORMS — authored appearances the user selects.
   */
  private mainFormOverride(stateEmbodiment: string): string {
    return mainFormOverrideFn(this.authoredMainForm, stateEmbodiment);
  }

  private livingIntentHost() {
    return {
      getSvgRoot: () => this.mount?.svgRoot ?? null,
      getRig: () => this.mount?.rig ?? null,
      selection: this.selection,
      isLegacyFormMaster: () => !!this.mount?.legacyFormMaster,
      getReducedMotion: () => !!this.living.getStatus().reducedMotion,
      setMixerForm: (channels: Record<string, number>) =>
        this.mixer.setForm(channels),
      ensureTrackProxy: (id: string, value: number) => {
        this.tracks.ensureProxy(id, value).value = value;
      },
      applyPoseToLegacyAuthority: (pose: Record<string, number>) =>
        this.applyPoseToLegacyAuthority(pose),
    };
  }

  private applyLivingEightStateTransition(frame: LoopTransitionFrame): void {
    // Fail closed: unsupported morph routes preserve live SVG state (VEC-101).
    // applyLivingEmbodimentVectorTransition lives in controller/livingIntent.ts.
    const result = applyLivingEightStateTransitionFn(
      this.livingIntentHost(),
      frame,
      this.authoredMainForm,
      this.livingEmbodimentTransitionKey,
    );
    this.eightStateFaceMorphActive = result.eightStateFaceMorphActive;
    this.livingEmbodimentTransitionKey = result.livingEmbodimentTransitionKey;
    // GASPER-UNIFIED-LIFE-001: adopt the destination embodiment grammar only
    // after the vector morph settles; the transition itself keeps its source
    // grammar so life timing cannot snap independently of the silhouette.
    if (frame.phase === "hold" || frame.progress >= 0.999) {
      const endpoint = getVisualStateEndpoint(
        frame.toState === "wake" ? "presence-neutral-settled" : frame.toState,
      );
      if (endpoint) {
        this.living.eightLoop.setEmbodiment(this.mainFormOverride(endpoint.embodimentId));
      }
    }
  }

  private prepareEightStateRestingBaseline(): void {
    this.resetLivingEmbodimentTransition({ showLive: true });
    prepareEightStateRestingBaselineFn(
      this.livingIntentHost(),
      this.authoredMainForm,
    );
  }

  /**
   * Book 005 Dispatch 001 — start GSAP living runtime.
   *
   * Production FormMaster path: keep FormMaster topology/face authority, but
   * ALSO run GasperLivingRuntime (restrained idle by default). Living endpoint
   * values are absolute compositor overrides; topology stays FormMaster-owned.
   */
  startLiving(opts?: LivingRuntimeOptions) {
    // Owner-review authority outranks every stage/UI living policy. Callers may
    // keep the render clock alive, but cannot reopen autonomous sequencing.
    const effective: LivingRuntimeOptions = this.ownerReviewSnapshot
      ? {
          ...opts,
          seed: this.ownerReviewSeed,
          reducedMotion: this.ownerReviewReducedMotion,
          autoSequence: false,
          restrainedIdle: true,
          forceInterrupt: false,
          eightStateLoop: false,
          proofMode: true,
          timingScale: 1,
        }
      : (opts ?? {});
    // Deliberate living start clears scrub suppression so additive life can paint.
    this.scrubModeActive = false;
    const legacy = !!this.mount?.legacyFormMaster;
    if (legacy) {
      try {
        this.mount?.rig.setPaused?.(false);
        this.mount?.rig.setMotion?.(0.55);
        this.mount?.rig.requestOneFrame?.();
      } catch {
        /* optional FormMaster ambient motion */
      }
    } else {
      try {
        this.mount?.rig.setPaused?.(true);
      } catch {
        /* optional */
      }
    }
    if (effective.eightStateLoop === true) {
      this.prepareEightStateRestingBaseline();
    }
    try {
      this.living.start({
        seed: effective.seed,
        reducedMotion: effective.reducedMotion,
        stepSeconds: effective.stepSeconds,
        autoSequence: effective.autoSequence === true,
        restrainedIdle: effective.restrainedIdle !== false,
        forceInterrupt: legacy ? false : effective.forceInterrupt === true,
        eightStateLoop: effective.eightStateLoop === true,
        proofMode: effective.proofMode,
        timingScale: effective.timingScale,
      });
    } catch (e) {
      console.warn("[GasperRigController] living runtime start failed", e);
    }
    this.emit();
  }

  stopLiving() {
    // D-0090: the physics authority must not outlive the living transport —
    // release so the renderer eases home and the wake/light feeds zero.
    this.performancePrimitiveDriver?.stop();
    this.disarmWorldBody();
    this.living.stop();
    this.resetLivingEmbodimentTransition({
      showLive: true,
    });
    this.emit();
  }

  /**
   * Bind the unified audio sink from an explicit user gesture. This does not
   * create or resume the AudioContext on its own.
   */
  bindUnifiedAudioOutput(context: AudioContext) {
    this.unifiedAudioOutput.bind(context);
    this.emit();
  }

  unbindUnifiedAudioOutput() {
    this.unifiedAudioOutput.dispose();
    this.emit();
  }

  unifiedAudioOutputStatus() {
    return this.unifiedAudioOutput.status();
  }

  livingStatus(): LivingRuntimeStatus {
    return this.living.getStatus();
  }

  /** GASPER-COMPOSITION-001 Wave 0.1 — current deterministic review authority. */
  ownerReviewStatus(): OwnerReviewStatus {
    const living = this.living.getStatus();
    return Object.freeze({
      active: this.ownerReviewSnapshot != null,
      generation: this.ownerReviewGeneration,
      seed: this.ownerReviewSnapshot ? this.ownerReviewSeed : null,
      embodiment: this.selection.getState().embodiment,
      expression: this.selection.getState().expression,
      boo: this.physicsDriver?.isBooMode() ?? false,
      wanderEnabled: this.wanderEnabled,
      lifeEnabled: this.lifeEnabled,
      living,
    });
  }

  /**
   * Acquire a reversible owner-review lease. Autonomous spatial authorities are
   * shut down while the organism clock/render path stays alive in seeded,
   * restrained proof mode. An authored pack/bounce/comet already in flight
   * blocks acquisition rather than being destroyed for review convenience.
   */
  beginOwnerReview(opts: OwnerReviewOptions = {}): OwnerReviewStatus {
    if (this.ownerReviewSnapshot) return this.ownerReviewStatus();
    const pack = this.getPerformancePackState();
    const physics = this.getWorldBodyState();
    if (pack?.running) {
      throw new Error('owner review blocked: performance pack is running');
    }
    if (physics && ['bounce', 'comet-gather', 'comet-fly'].includes(physics.mode)) {
      throw new Error(`owner review blocked: authored physics mode ${physics.mode} is running`);
    }

    const living = this.living.getStatus();
    this.ownerReviewSnapshot = Object.freeze({
      living,
      wanderEnabled: this.wanderEnabled,
      lifeEnabled: this.lifeEnabled,
      authoredMainForm: this.authoredMainForm,
      expression: this.selection.getState().expression,
      boo: this.physicsDriver?.isBooMode() ?? false,
    });
    this.ownerReviewGeneration += 1;
    this.ownerReviewSeed = Number.isFinite(opts.seed)
      ? Number(opts.seed)
      : OWNER_REVIEW_DEFAULT_SEED;
    this.ownerReviewReducedMotion = opts.reducedMotion === true;

    // Fence every spatial authority before the review pose is admitted. The pack
    // driver can otherwise be armed by a previously-scheduled life intent on the
    // very next organism-clock frame, overwriting capture-drive with curve-authority.
    this.stopPerformancePack();
    this.disarmWorldBody();
    this.setWanderEnabled(false);
    this.setLifeEnabled(false);
    if (opts.embodiment) this.setEmbodiment(opts.embodiment);
    if (opts.expression) this.setExpression(opts.expression);
    this.enableBoo(opts.boo === true);
    this.setWorldPose({ ...WORLD_HOME_POSE, provenance: 'capture-drive' });
    this.startLiving({
      seed: this.ownerReviewSeed,
      reducedMotion: this.ownerReviewReducedMotion,
      autoSequence: false,
      restrainedIdle: true,
      forceInterrupt: false,
      eightStateLoop: false,
      proofMode: true,
      timingScale: 1,
    });
    return this.ownerReviewStatus();
  }

  /** Restore the pre-review autonomy/living policy; dynamic performances are never resumed mid-flight. */
  endOwnerReview(): OwnerReviewStatus {
    const snapshot = this.ownerReviewSnapshot;
    if (!snapshot) return this.ownerReviewStatus();

    this.disarmWorldBody();
    this.setWorldPose({ ...WORLD_HOME_POSE, provenance: 'none' });
    this.ownerReviewSnapshot = null;
    this.enableBoo(snapshot.boo);
    this.setEmbodiment(snapshot.authoredMainForm);
    this.setExpression(snapshot.expression);
    this.setWanderEnabled(snapshot.wanderEnabled);
    this.setLifeEnabled(snapshot.lifeEnabled);
    if (snapshot.living.running) {
      this.startLiving({
        seed: snapshot.living.seed ?? undefined,
        reducedMotion: snapshot.living.reducedMotion,
        autoSequence: snapshot.living.autoSequence,
        restrainedIdle: snapshot.living.restrainedIdle,
        stepSeconds: snapshot.living.stepSeconds,
        forceInterrupt: snapshot.living.forceInterrupt,
        eightStateLoop: snapshot.living.eightStateLoop,
        proofMode: snapshot.living.proofMode,
        timingScale: snapshot.living.timingScale,
      });
    } else {
      this.stopLiving();
    }
    return this.ownerReviewStatus();
  }

  setMicrostate(id: MicrostateId, opts?: { duration?: number }) {
    this.living.goMicrostate(id, opts);
  }

  interruptMicrostate(id: MicrostateId) {
    this.living.interruptTo(id);
  }

  /** Wave R1 — Authoring Neutral vs Runtime Beauty optical tier. */
  setOpticalMode(mode: "authoring-neutral" | "runtime-beauty") {
    this.mixer.setOpticalMode(mode);
    this.emit();
  }

  getOpticalMode(): "authoring-neutral" | "runtime-beauty" {
    return this.mixer.getOpticalMode();
  }

  getRenderProfile() {
    return inspectControllerProjection({
      svgRoot: this.mount?.svgRoot,
      mixerProjectionInspection: () => this.mixer.getProjectionInspection(),
      opticalMode: this.mixer.getOpticalMode(),
      lastFlush: this.mixer.getLastFlushReport(),
      counters: this.mixer.getProfileCounters(),
      nodeCacheReady: this.mixer.getNodeCache().ready,
      legacyFormMaster: !!this.mount?.legacyFormMaster,
    });
  }

  /**
   * VEC-401: domain/projection tick rides the single organism clock.
   * No independent perpetual RAF. Cadence ~30 Hz for relief/energy fields.
   * Implementation: controller/organismClockIntegration.ts
   */
  private startDomainTick() {
    this.stopDomainTick();
    // Sole domain/projection tick (VEC-401 subscriber order):
    // id: "gasper-rig-domain-tick"
    // priority: 40
    this.domainTick = startDomainTickOnOrganismClock(this.organismClock, {
      mixerTick: (timeMs) => this.mixer.tick(timeMs),
      mixerFlushScheduled: () => this.mixer.flushScheduled(),
      setOperationalClockSec: (sec) => {
        this.operationalClockSec = sec;
      },
    });
    void (DOMAIN_TICK_SUBSCRIBER_ID satisfies "gasper-rig-domain-tick");
    void (DOMAIN_TICK_PRIORITY satisfies 40);
  }

  private stopDomainTick() {
    if (this.domainTick) {
      this.domainTick.unsubscribe();
      this.domainTick = null;
    }
  }

  /** VEC-401 inspection surface — sole organism clock. */
  getOrganismClock(): GasperOrganismClockPort {
    return this.organismClock;
  }

  inspectOrganismClock(): OrganismClockInspection {
    return this.organismClock.inspect();
  }

  /**
   * GASPER-SPACE-001 · PHASE A — world-pose intake for the 2.5D world stage.
   * Forwards a provenance-tagged pose to the legacy authority renderer
   * (`SidekickFormMasterRig.setWorldPose`, which owns the fail-closed fence);
   * the last command is retained for read-back. Scene / physics / sequencer
   * authorities call this; an unprovenanced command homes the character.
   */
  /**
   * Update the fixed-camera renderable room. Null disables only the composition
   * fence; the conceptual WorldSpace fence remains active in clampWorldPoseCommand.
   */
  setCompositionWorldEnvelope(envelope: CompositionWorldEnvelope | null): void {
    this.compositionWorldEnvelope = envelope;
    this.syncPhysicsCompositionBounds();
    if (!envelope) this.lastCompositionClamp = null;
  }

  getCompositionWorldEnvelope(): CompositionWorldEnvelope | null {
    return this.compositionWorldEnvelope;
  }

  getCompositionClampState(): CompositionClampResult | null {
    return this.lastCompositionClamp;
  }

  setWorldPose(pose: unknown): void {
    const conceptual = clampWorldPoseCommand(pose);
    let cmd = conceptual;
    if (conceptual.provenance !== 'none' && this.compositionWorldEnvelope) {
      const composition = clampWorldPoseToCompositionEnvelope(
        conceptual.pose,
        this.compositionWorldEnvelope,
      );
      this.lastCompositionClamp = composition;
      cmd = Object.freeze({
        pose: composition.pose,
        provenance: conceptual.provenance,
      });
    } else {
      this.lastCompositionClamp = null;
    }
    this.lastWorldPoseCommand = cmd;
    try {
      (globalThis as any).SidekickFormMasterRig?.setWorldPose?.({
        ...cmd.pose,
        provenance: cmd.provenance,
      });
    } catch {
      /* global absent (non-legacy mount) */
    }
  }

  /** The last world-pose command accepted by this controller. */
  getWorldPoseCommand(): WorldPoseCommand {
    return this.lastWorldPoseCommand;
  }

  /**
   * Read the renderer's applied world pose (the smoothed value actually
   * drawn) — the camera follow ticks against this, so the frame composition
   * and the camera agree on one source of truth. Null off the legacy mount.
   */
  getWorldPoseApplied(): {
    target: WorldPose & { provenance: WorldProvenance };
    applied: WorldPose;
  } | null {
    try {
      const g = (globalThis as any).SidekickFormMasterRig;
      return typeof g?.getWorldPose === "function" ? g.getWorldPose() : null;
    } catch {
      return null;
    }
  }

  /**
   * GASPER-SPACE-001 · PHASE B — world-physics authority intake (D-0090).
   * The driver integrates on the organism clock and forwards each tick here:
   * pose → the provenance fence (setWorldPose), silhouette deltas → the
   * living flush fence (physicsSilhouetteAdmissionRecord), wake/light →
   * the renderer feeds. The authority collapses to home on disarm.
   */
  private applyPhysicsDriverOutput(out: WorldPhysicsDriverOutput): void {
    this.lastPhysicsOutput = out;
    this.setWorldPose(out.pose);
    this.writeLifeSubstrate(
      out.pose.provenance === "physics-authority" ||
        this.wanderEnabled ||
        this.lifeEnabled,
    );
    this.physicsSilhouetteDeltas = out.silhouetteDeltas;
    try {
      const g = (globalThis as any).SidekickFormMasterRig;
      // Paint the hull on the physics tick. Living flush can miss arrived-hold
      // (eightStateLoop off / motion.value 0) and leave a still puddle.
      const admitted = admitPhysicsSilhouetteDeltas(
        PHYSICS_SILHOUETTE_IDENTITY_BASE,
        out.silhouetteDeltas,
      );
      if (Object.keys(admitted).length) g?.applySemanticPose?.(admitted);
      g?.setPhysicsWake?.(out.wakeVX, out.wakeVY);
      g?.setPhysicsLight?.(out.lightSpeed);
      g?.setPhysicsTake?.(out.take ?? 0);
      g?.setPhysicsIdle?.(out.idle ?? 0);
      // Pressure-Cooker Cycle 1 (gait-expression-phd-memo): the derived gait
      // observables ride the same provenance fence as the pose — the renderer
      // expresses them, never authors them.
      // Tuning Lab gains are post-kernel, bounded expression controls. The
      // kernel still owns phase, contact, support, and all safety fences.
      g?.setPhysicsGait?.(out.gait, {
        ...out.gaitScreen,
        bobLiftUnits: out.gaitScreen.bobLiftUnits * this.tuningLabParams.gaitBobGain,
        contactSquash:
          out.gaitScreen.contactSquash * this.tuningLabParams.contactSquashGain,
        swayXUnits: out.gaitScreen.swayXUnits * this.tuningLabParams.footworkPrimitiveGain,
        rollDeg: out.gaitScreen.rollDeg * this.tuningLabParams.footworkPrimitiveGain,
        stepBaseXUnits:
          out.gaitScreen.stepBaseXUnits * this.tuningLabParams.footworkPrimitiveGain,
        plantedScreenXUnits:
          out.gaitScreen.plantedScreenXUnits * this.tuningLabParams.footworkPrimitiveGain,
        stepFlattenUnits:
          out.gaitScreen.stepFlattenUnits * this.tuningLabParams.supportExchangeGain,
        stepFlattenWidthUnits:
          out.gaitScreen.stepFlattenWidthUnits * this.tuningLabParams.supportExchangeGain,
        bankDeg: out.gaitScreen.bankDeg * this.tuningLabParams.actingGain,
      });
      // S4 F-LAW 2 (flight-physics-phd-memo, owner N31): the wind-resistance
      // read — lagged dynamic pressure + screen-x travel direction. The
      // renderer expresses trail-stretch / lead-compress from it; it never
      // authors a deformation. Zero at rest = byte-identical contour.
      g?.setPhysicsWind?.(out.wind.pressure, out.wind.dirX);
      // S8 (N39, illustrator-turntable-2p5d-phd-memo): travel bearing ->
      // CONTINUOUS paint yaw on S1. Slice quantization is telemetry only.
      // NULL below the rest gate — fail-closed to HOLD. The renderer
      // pursues shortest-arc at the thrust constant.
      g?.setHeadingYaw?.(
        this.headingPinDeg != null
          ? this.headingPinDeg
          : out.facingBearingDeg == null
            ? null
            : facingPaintOrbitYawDeg(
                facingReadableLocomotionYawDeg(facingPaintYawDeg(out.facingBearingDeg)),
              ),
      );
      // S10 (owner N42) — the Boo perpetual-bob carrier: the ghost never
      // stands. Forwarded every tick; 0 when boo mode is off (byte-identical
      // elsewhere). The renderer gates it ONLY on reduced motion.
      g?.setBooBob?.(out.booBobUnits);
      // setProfile skip must not starve the paint. Pose/gait/life already
      // wrote; force one FormMaster frame so worldRig pixels move.
      g?.requestOneFrame?.();
    } catch {
      /* global absent (non-legacy mount) */
    }
  }

  /** Ensure the sole world-physics driver exists before a live surface starts. */
  ensurePhysicsDriver(): WorldPhysicsDriver {
    if (!this.physicsDriver) {
      this.physicsDriver = new WorldPhysicsDriver(
        this.organismClock,
        (out) => this.applyPhysicsDriverOutput(out),
        // Cycle 2 E1 — proprioception: the transport reads its own body live.
        () => this.selection.getState().embodiment,
      );
      this.syncPhysicsCompositionBounds();
      // The field in force survives driver rebuilds (detach destroys the
      // driver, never the room): a fresh kernel re-hands the environment's
      // field instead of silently running the authored fallback.
      if (this.envField) this.physicsDriver.setField(this.envField);
      this.physicsDriver.setGaitTempoMultiplier(this.tuningLabParams.footworkTempo);
    }
    return this.physicsDriver;
  }

  private ensurePerformancePrimitiveDriver(): PerformancePrimitiveDriver {
    if (!this.performancePrimitiveDriver) {
      const bodyHeight = WISPWALKER_CAPABILITY_PROFILE.physics.body_height_units?.value;
      if (typeof bodyHeight !== "number" || !Number.isFinite(bodyHeight) || bodyHeight <= 0) {
        throw new Error("Wispwalker reference performance requires resolved body height");
      }
      this.performancePrimitiveDriver = new PerformancePrimitiveDriver(
        this.organismClock,
        this.ensurePhysicsDriver(),
        { bodyHeightUnits: bodyHeight },
      );
    }
    return this.performancePrimitiveDriver;
  }

  private syncPhysicsCompositionBounds(): void {
    if (!this.physicsDriver) return;
    const envelope = this.compositionWorldEnvelope;
    this.physicsDriver.setRenderableWorldBoundsAt(
      envelope ? (z) => renderableWorldBoundsAt(z, envelope) : null,
    );
  }

  /**
   * D-0090: absolute silhouette values for the living flush fence — the
   * loop's PRE-scene living base + the driver's bounded physics deltas.
   * Undefined when the driver is at rest or the loop has no base yet, so
   * the fence stays closed outside an armed physics performance.
   */
  private physicsSilhouetteAdmissionRecord():
    | Readonly<Record<string, number>>
    | undefined {
    const deltas = this.physicsSilhouetteDeltas;
    if (!Object.keys(deltas).length) return undefined;
    // Isolated walk proofs run eightStateLoop=false, so the eight-loop base
    // is never flushed. Fall back to identity so gather/impact still admit
    // into the painted silhouette (kernel JSON is not the witness).
    const base = this.living?.eightLoop.getSilhouetteBaseValues() ?? PHYSICS_SILHOUETTE_IDENTITY_BASE;
    const out = admitPhysicsSilhouetteDeltas(base, deltas);
    return Object.keys(out).length ? out : undefined;
  }

  /** Rail "World & Physics": gravity / bounce / launch power / intensity. */
  setWorldPhysicsParams(params: Partial<WorldPhysicsParams> | undefined): void {
    this.ensurePhysicsDriver().setParams(params);
  }

  /**
   * Apply reversible Tuning Lab gains after the physics kernel derives its
   * bounded gait observables. Values are fail-closed to the lab's 0..1.5
   * envelope and take effect on the next organism tick.
   */
  setTuningLabParams(params: TuningLabParams | undefined): void {
    const finite = (value: number | undefined, fallback: number) =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback;
    this.tuningLabParams = {
      gaitBobGain: Math.max(0, Math.min(1.5, finite(params?.gaitBobGain, this.tuningLabParams.gaitBobGain))),
      contactSquashGain: Math.max(
        0,
        Math.min(1.5, finite(params?.contactSquashGain, this.tuningLabParams.contactSquashGain)),
      ),
      supportExchangeGain: Math.max(
        0,
        Math.min(1.5, finite(params?.supportExchangeGain, this.tuningLabParams.supportExchangeGain)),
      ),
      footworkPrimitiveGain: Math.max(
        0,
        Math.min(1.5, finite(params?.footworkPrimitiveGain, this.tuningLabParams.footworkPrimitiveGain)),
      ),
      footworkTempo: Math.max(
        0.75,
        Math.min(1.25, finite(params?.footworkTempo, this.tuningLabParams.footworkTempo)),
      ),
      actingGain: Math.max(0.5, Math.min(1.5, finite(params?.actingGain, this.tuningLabParams.actingGain))),
    };
    this.physicsDriver?.setGaitTempoMultiplier(this.tuningLabParams.footworkTempo);
    this.emit();
  }

  getTuningLabParams(): Required<TuningLabParams> {
    return { ...this.tuningLabParams };
  }

  /**
   * Identity of the form currently painted. FormMaster profile wins when the
   * walker is on stage so inspect_tuning cannot linger on a stale presence
   * document while the silhouette is already Wispwalker.
   */
  getRenderedEmbodiment(): string {
    const rendered = (globalThis as { SidekickFormMasterRig?: { getSnapshot?: () => { profile?: string } } })
      .SidekickFormMasterRig?.getSnapshot?.()?.profile;
    if (typeof rendered === "string" && rendered.trim()) return rendered.trim();
    return this.authoredMainForm;
  }

  /** Direct, read-only N120 telemetry; kernel conclusions remain authoritative. */
  getTuningLabTelemetry(): Record<string, number | string | null> {
    const out = this.lastPhysicsOutput;
    const body = this.physicsDriver?.getState().body;
    const rendered = this.getRenderedEmbodiment();
    return {
      gaitStepHz: out?.gait.stepHz ?? 0,
      gaitPhase: out?.gait.phase ?? 0,
      gaitBobUnits: out?.gaitScreen.bobLiftUnits ?? 0,
      gaitSquash: out?.gaitScreen.contactSquash ?? 0,
      supportExchange: out?.gaitScreen.stepBaseXUnits ?? 0,
      supportFlatten: out?.gaitScreen.stepFlattenUnits ?? 0,
      supportFlattenWidth: out?.gaitScreen.stepFlattenWidthUnits ?? 0,
      footworkSway: out?.gaitScreen.swayXUnits ?? 0,
      footworkRollDeg: out?.gaitScreen.rollDeg ?? 0,
      actingBankDeg: out?.gaitScreen.bankDeg ?? 0,
      plantedScreenXUnits: out?.gaitScreen.plantedScreenXUnits ?? 0,
      plantedCompress: out?.gaitScreen.plantedCompress ?? 0,
      incomingCompress: out?.gaitScreen.incomingCompress ?? 0,
      supportSide: out?.gaitScreen.supportSide ?? 0,
      bodyX: body?.x ?? 0,
      bodyZ: body?.z ?? 0,
      physicsMode: this.physicsDriver?.getState().mode ?? "idle",
      gaitTempo: this.tuningLabParams.footworkTempo,
      embodiment: rendered,
      authoredMainForm: this.authoredMainForm,
      renderedProfile: rendered,
      contact: body?.contact === true ? 1 : 0,
    };
  }

  /**
   * N257 — one live gait proof sample. Kernel is the authority.
   * Swing lift/forward are the published N251 lobe channels.
   */
  getGaitProofSample(): Readonly<{
    source: "kernel";
    phase: number;
    stepHz: number;
    supportSide: number;
    planted: boolean;
    plantedWorldX: number;
    plantedWorldZ: number;
    plantedScreenXUnits: number;
    loadedCompress: number;
    loadedWidth: number;
    swingLift: number;
    swingForward: number;
    swingUnload: number;
    comLateral: number;
    comVertical: number;
    bodyX: number;
    bodyY: number;
    bodyZ: number;
  }> {
    const out = this.lastPhysicsOutput;
    const state = this.physicsDriver?.getState();
    const body = state?.body;
    const support = state?.support;
    const gait = state?.gait;
    return {
      source: "kernel",
      phase: gait?.phase ?? out?.gait.phase ?? 0,
      stepHz: gait?.stepHz ?? out?.gait.stepHz ?? 0,
      supportSide: support?.side ?? out?.gaitScreen.supportSide ?? 0,
      planted: support?.planted === true,
      plantedWorldX: support?.plantedWorldX ?? 0,
      plantedWorldZ: support?.plantedWorldZ ?? 0,
      plantedScreenXUnits: out?.gaitScreen.plantedScreenXUnits ?? 0,
      loadedCompress: support?.plantedCompress ?? out?.gaitScreen.plantedCompress ?? 0,
      loadedWidth: out?.gaitScreen.stepFlattenWidthUnits ?? 0,
      swingLift: out?.gaitScreen.swingLiftUnits ?? 0,
      swingForward: out?.gaitScreen.swingAdvanceUnits ?? 0,
      swingUnload: support?.incomingCompress ?? out?.gaitScreen.incomingCompress ?? 0,
      comLateral: support?.cogX ?? out?.gaitScreen.swayXUnits ?? 0,
      comVertical: out?.gaitScreen.bobLiftUnits ?? gait?.bobUnits ?? 0,
      bodyX: body?.x ?? 0,
      bodyY: body?.y ?? 0,
      bodyZ: body?.z ?? 0,
    };
  }

  getWorldPhysicsParams(): WorldPhysicsParams {
    return this.physicsDriver?.getState().params ?? DEFAULT_WORLD_PHYSICS_PARAMS;
  }

  /**
   * Start a validated reference behavior through the existing physics body.
   * Wispwalker is the first admitted semantic form; all other embodiments fail
   * closed until they publish their own capability/retarget profile.
   */
  startReferencePerformance(
    plan: PhysicsIntentPlan | unknown,
    options: Readonly<{ reducedMotion?: boolean }> = {},
  ): PerformancePrimitiveInspection {
    if (this.ownerReviewSnapshot) {
      throw new Error("reference performance blocked: owner review lease is active");
    }
    if (this.authoredMainForm !== "wispwalker") {
      throw new Error(`reference performance requires wispwalker; active form is ${this.authoredMainForm}`);
    }
    if (this.performancePackDriver?.getState().running) {
      throw new Error("reference performance blocked: performance pack is running");
    }
    const mode = this.physicsDriver?.getState().mode;
    if (mode && ["bounce", "comet-gather", "comet-fly"].includes(mode)) {
      throw new Error(`reference performance blocked: authored physics mode ${mode} is running`);
    }
    return this.ensurePerformancePrimitiveDriver().start(plan, {
      reducedMotion: options.reducedMotion ?? this.living.getStatus().reducedMotion,
    });
  }

  /** Replace the active plan without resetting the live kernel body. */
  interruptReferencePerformance(
    plan: PhysicsIntentPlan | unknown,
    options: Readonly<{ reducedMotion?: boolean }> = {},
  ): PerformancePrimitiveInspection {
    if (!this.performancePrimitiveDriver?.inspect().active) {
      return this.startReferencePerformance(plan, options);
    }
    return this.performancePrimitiveDriver.interrupt(plan, {
      reducedMotion: options.reducedMotion ?? this.living.getStatus().reducedMotion,
    });
  }

  stopReferencePerformance(): PerformancePrimitiveInspection | null {
    return this.performancePrimitiveDriver?.stop() ?? null;
  }

  inspectReferencePerformance(): PerformancePrimitiveInspection | null {
    return this.performancePrimitiveDriver?.inspect() ?? null;
  }

  /** S2 — the bouncing ball: impulse launch into gravity + restitution. */
  launchWorldBounce(cfg: BounceLaunchConfig = {}): void {
    this.ensurePhysicsDriver().launchBounce(cfg);
  }

  /** S4 — the comet shot: gather hold → hard impulse across the world. */
  launchWorldComet(cfg: CometLaunchConfig = {}): void {
    this.ensurePhysicsDriver().launchComet(cfg);
  }

  /** Release the physics authority — provenance none, renderer eases home. */
  disarmWorldBody(): void {
    this.physicsDriver?.disarm();
  }

  /** Telemetry for proofs / the rail read-back (null = never armed). */
  getWorldBodyState() {
    return this.physicsDriver?.getState() ?? null;
  }

  /**
   * GASPER-PHYSICS-001 · D-0112 — the environment reports its size, and the
   * environment OWNS the physics. Fail-closed: non-finite / non-positive
   * extents produce no field (the kernel keeps its authored fallback), so a
   * body never moves in a world it cannot trust.
   *
   * First report builds the field (epoch 0) and hands it to the kernel —
   * gravity, friction, restitution and bounds all re-derive from the
   * environment's own extents (a bigger screen is a bigger room, not a bigger
   * Gasper: homeHeightPx decides the mapping). A CHANGED report (resize /
   * resolution change) bumps the epoch, re-locates the kernel, and triggers
   * the xyz-awareness beat — he notices the room changed and re-orients.
   * Returns the epoch now in force, or null if the report was rejected.
   */
  reportEnvironmentSize(extents: EnvironmentExtents): number | null {
    const prev = this.envField;
    // A re-statement of the SAME room is not a change: the epoch means "the
    // world changed," so an idempotent report keeps the field in force. The
    // field is still RE-HANDED to the kernel: a detach() destroys the driver
    // (the envField survives it), so a re-attach's fresh driver would else
    // run the authored fallback while the room reports unchanged — the field
    // contract (PhysicsField: the kernel consumes it every step) must hold.
    if (prev && fieldMatchesExtents(prev, extents)) {
      this.ensurePhysicsDriver().setField(prev);
      return prev.epoch;
    }
    const next = prev
      ? fieldAfterResize(prev, extents)
      : createPhysicsField(extents);
    if (!next) return null; // a corrupt report changes nothing, never faults
    const epochGrew = prev !== null && next.epoch > prev.epoch;
    this.envField = next;
    this.ensurePhysicsDriver().setField(next);
    if (epochGrew) {
      // The world changed under his feet: look around and re-locate. This is
      // awareness Layer 3 — he knows the room's size AND his place in it.
      this.lifeDirector?.noticeEnvironment();
    }
    return next.epoch;
  }

  /** The physics-field epoch now in force (−1 = environment never reported). */
  getEnvironmentFieldEpoch(): number {
    return this.envField ? this.envField.epoch : -1;
  }

  /**
   * GASPER-CRAFT-002 · D-0106 — the wander gate. The idle-wander authority
   * walks only while the hierarchy of authorities allows it: autonomy open
   * (autoSequence, unrestrained), no reduced motion, no pack in flight, no
   * physics performance. Anything else closes the gate and the wanderer
   * recalls home (never a teleport).
   */
  private wanderGateOpen(): boolean {
    const s = this.living.getStatus();
    if (!s.autoSequence || s.restrainedIdle || s.reducedMotion) return false;
    if (this.performancePrimitiveDriver?.inspect().active) return false;
    if (this.performancePackDriver?.getState().running) return false;
    const physics = this.physicsDriver?.getState();
    // D-0112: the locomotion transport is the wanderer's OWN mode — the gate
    // stays transparent to it; authored performances (bounce/comet) still
    // close it and recall the wanderer.
    if (physics && physics.mode !== "idle" && physics.mode !== "locomotion")
      return false;
    return true;
  }

  private northstarTwentyUnsub: (() => void) | null = null;
  private headingPinDeg: number | null = null;

  /**
   * N191/N193 — play the 20s on the LIVE organism clock (RAF).
   * Wander/life directors stay down; this files wander strut then life zip.
   * First-15s pearl law (N196/N198): stay wispwalker for the whole 20s.
   * Presence is a sphere; the scored window must not morph into one.
   */
  playNorthstarTwenty(): void {
    this.northstarTwentyUnsub?.();
    // N324: PREVIEW eight-state starts a 1.6s morph to Presence. Kill it
    // before the 20s files, or first paint is Wispwalker and 0.5s is a ball.
    this.startLiving({
      seed: 20260814,
      autoSequence: false,
      restrainedIdle: false,
      eightStateLoop: false,
      proofMode: false,
      timingScale: 1,
    });
    this.setLifeEnabled(false);
    // Opening rest is frontal (yaw 8). 3/4 starts with the strut, not at t0.
    this.headingPinDeg = 0;
    // First-15s pearl law (N196/N198) forbids Presence during the scored window.
    this.snapEmbodiment("wispwalker");
    this.enableBoo(false);
    try {
      const rig = this.mount?.rig as
        | {
            setEightStateEnabled?: (v: boolean) => void;
            cancelBehavior?: () => void;
            setYaw?: (n: number) => void;
          }
        | undefined;
      rig?.setEightStateEnabled?.(false);
      rig?.cancelBehavior?.();
      rig?.setYaw?.(8);
    } catch {
      /* 20s is Wispwalker, not the Presence eight-state recipe */
    }
    try {
      this.setLiveFormCoeff("walkEnable", 1);
    } catch {
      /* walk plant on for the strut */
    }
    const t0 = this.organismClock.nowMs();
    const fired = new Set<string>();
    const fire = (id: string, at: number, t: number, fn: () => void) => {
      if (fired.has(id) || t < at) return;
      fired.add(id);
      fn();
    };
    const unsub = this.organismClock.subscribe({
      id: "northstar-20s",
      priority: 48,
      onFrame: () => {
        const t = (this.organismClock.nowMs() - t0) / 1000;
        // φ² rest: the opening must read as the sealed portrait before any
        // heading or travel. 0.8s was invisible on live RAF.
        if (t < 2.618) this.headingPinDeg = 0;
        else if (t < 5.2) this.headingPinDeg = -READABLE_THREE_QUARTER_DEG;
        fire("strut-go", 2.618, t, () => {
          this.fileStrutLocomotion({ x: 980, z: 0, cruise: 200 });
        });
        if (t <= 5.15 && t >= 2.618) {
          const tick = Math.floor(t * 2);
          fire(`strut-${tick}`, Math.max(2.618, tick * 0.5), t, () => {
            this.fileStrutLocomotion({ x: 980, z: 0, cruise: 200 });
          });
        }
        fire("seat", 5.2, t, () => {
          const b = this.ensurePhysicsDriver().getState().body;
          this.headingPinDeg = -READABLE_THREE_QUARTER_DEG;
          this.fileStrutLocomotion({ x: b.x, z: b.z, cruise: 1 });
        });
        fire("notice", 6.6, t, () => {
          this.setExpression("listening-orient");
          try {
            (
              this.mount?.rig as { setReliefPreset?: (v: string) => void } | undefined
            )?.setReliefPreset?.("none");
          } catch {
            /* N220: fixture already fired; clear brow_raise plate after */
          }
        });
        fire("notice-release", 8.8, t, () => {
          this.setExpression("neutral-settled");
          try {
            (this.mount?.rig as { setMotion?: (n: number) => void } | undefined)?.setMotion?.(0.55);
          } catch {
            /* restore rest motion after the notice beat */
          }
        });
        fire("gather", 9.2, t, () => {
          this.enableBoo(true);
          try {
            this.setLiveFormCoeff("walkEnable", 0);
          } catch {
            /* zip must not limp a walk plant */
          }
          this.setWorldPhysicsParams({ launchPower: 1, intensity: 0.7 });
          const planted = this.ensurePhysicsDriver().getState().body;
          this.ensurePhysicsDriver().launchComet({
            gatherSeconds: 0.75,
            vx: -560,
            vy: 1180,
            z0: planted.z,
          });
        });
        fire("zip1", 10.0, t, () => {
          const driver = this.ensurePhysicsDriver();
          this.enableBoo(true);
          this.headingPinDeg = -28;
          driver.standDownLocomotion("wander");
          driver.setLocomotion("life", { x: 180, z: 120, cruise: 380 });
        });
        fire("zip2", 13.2, t, () => {
          this.enableBoo(true);
          this.ensurePhysicsDriver().setLocomotion("life", { x: 400, z: -40, cruise: 220 });
        });
        fire("land", 15.6, t, () => {
          this.enableBoo(true);
          try {
            this.setLiveFormCoeff("walkEnable", 0);
          } catch {
            /* landing must not re-open walk lobes */
          }
          const driver = this.ensurePhysicsDriver();
          driver.requestBooLanding();
          const b = driver.getState().body;
          driver.setLocomotion("life", { x: b.x, z: b.z, cruise: 60 });
        });
        fire("hold", 16.5, t, () => {
          const b = this.ensurePhysicsDriver().getState().body;
          this.enableBoo(true);
          try {
            this.setLiveFormCoeff("walkEnable", 0);
          } catch {
            /* hold stays gaitless */
          }
          const driver = this.ensurePhysicsDriver();
          driver.requestBooLanding();
          driver.setLocomotion("life", { x: b.x, z: b.z, cruise: 1 });
        });
      },
    });
    this.northstarTwentyUnsub = () => {
      unsub();
      this.northstarTwentyUnsub = null;
    };
  }

  /**
   * N187 — file a grounded strut. Wander and life directors stand down so
   * they cannot lift cruise to the comfort-band teleport. Life substrate
   * stays up so arrival can still breathe.
   */
  fileStrutLocomotion(intent: { x: number; z: number; cruise: number }): void {
    const x = Number(intent?.x);
    const z = Number(intent?.z);
    const cruise = Number(intent?.cruise);
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(cruise) || cruise <= 0) {
      return;
    }
    this.setWanderEnabled(false);
    this.setLifeEnabled(false);
    this.writeLifeSubstrate(true);
    const driver = this.ensurePhysicsDriver();
    driver.clearLocomotion("life");
    driver.clearLocomotion("performance");
    driver.setLocomotion("wander", { x, z, cruise });
  }

  /** Master switch for the golden-angle idle wander (owner / rail). */
  setWanderEnabled(v: boolean): void {
    this.wanderEnabled = this.ownerReviewSnapshot ? false : !!v;
    this.goldenWanderDriver?.setEnabled(this.wanderEnabled);
    // Wander is idle life. Keep the D-0109 rest floor up so settled-hold
    // cannot freeze breath/face after a rest-in-place (organism clock lives).
    this.writeLifeSubstrate(this.wanderEnabled || this.lifeEnabled);
  }

  /** Wander authority telemetry (null off a detached controller). */
  getWanderState(): GoldenWanderState | null {
    return this.goldenWanderDriver?.getState() ?? null;
  }

  /**
   * GASPER-ALIVE-001 · D-0108 — the life gate. The same hierarchy as the
   * wander gate with one authority-level difference: the director's OWN life
   * pack must not close the gate under its own feet (lifePackInFlight), so
   * only FOREIGN packs preempt a self-initiated act. Restraint, reduced
   * motion, physics and capture still sit above it — when any closes, the
   * driver stands everything down (release, not snap).
   */
  private lifeGateOpen(): boolean {
    const s = this.living.getStatus();
    if (!s.autoSequence || s.restrainedIdle || s.reducedMotion) return false;
    if (this.performancePrimitiveDriver?.inspect().active) return false;
    const packRunning =
      this.performancePackDriver?.getState().running ?? false;
    if (!packRunning) this.lifePackInFlight = false;
    if (packRunning && !this.lifePackInFlight) return false;
    const physics = this.physicsDriver?.getState();
    // D-0112: the locomotion transport is the director's OWN approach mode —
    // the gate stays transparent to it; authored performances (bounce/comet)
    // still close it and stand the director down.
    if (physics && physics.mode !== "idle" && physics.mode !== "locomotion")
      return false;
    return true;
  }

  /** Master switch for the long-horizon life authority (owner / rail). */
  setLifeEnabled(v: boolean): void {
    this.lifeEnabled = this.ownerReviewSnapshot ? false : !!v;
    this.lifeDirector?.setEnabled(this.lifeEnabled);
  }

  /** Life authority telemetry (null off a detached controller). */
  getLifeState(): LifeDirectorState | null {
    return this.lifeDirector?.getState() ?? null;
  }

  /**
   * D-0108 event-scoped accent writer: mouth + form-variant gains above
   * identity (1,1). The rest of the coefficient object (wander / singularity
   * / wispwalker ...) is preserved untouched — the renderer reads every key
   * with ??1 defaults, so (1,1) is byte-identity for the accent channels.
   */
  private writeLiveCoeffs(mouthGain: number, formGain: number): void {
    try {
      const g = globalThis as { __GASPER_LIVE_COEFFS__?: Record<string, unknown> };
      const prev = g.__GASPER_LIVE_COEFFS__ ?? {};
      g.__GASPER_LIVE_COEFFS__ = {
        ...prev,
        mouth: {
          ...((prev.mouth as Record<string, unknown> | undefined) ?? {}),
          mouthGain,
        },
        formVariant: {
          ...((prev.formVariant as Record<string, unknown> | undefined) ?? {}),
          formVariantGain: formGain,
        },
      };
    } catch {
      /* accents are decorative, never structural */
    }
  }

  /**
   * D-0109 life substrate writer: the `life` subkey of the live-coeffs wire.
   * Open  => restFloor 0.55 (the D-0018 rest gate floors; breath/blink/micro
   * persist at home), breathGain 2.2 (idle breath/sway in the legible band),
   * restWarmth 0.12 (calm half-smile floor at neutral rest).
   * Closed => 0/1/0 — the renderer's defaults, byte-identical to pre-002.
   * The renderer clamps each value; every other subkey is preserved.
   */
  private writeLifeSubstrate(open: boolean): void {
    try {
      const g = globalThis as { __GASPER_LIVE_COEFFS__?: Record<string, unknown> };
      const prev = g.__GASPER_LIVE_COEFFS__ ?? {};
      g.__GASPER_LIVE_COEFFS__ = {
        ...prev,
        life: {
          ...((prev.life as Record<string, unknown> | undefined) ?? {}),
          restFloor: open ? 0.55 : 0,
          breathGain: open ? 2.2 : 1,
          restWarmth: open ? 0.12 : 0,
        },
      };
    } catch {
      /* substrate is decorative, never structural */
    }
  }

  /**
   * GASPER-CRAFT-001 · C1 — curve-performance authority intake.
   * The pack driver samples the compiled PerformancePack on the organism
   * clock and forwards each tick here: pose → the provenance fence
   * (setWorldPose) as curve-authority — EXCEPT inside physics-mode segments,
   * where D-0090 owns the pose channel and the pack yields it; silhouette
   * deltas → the living flush fence (curveSilhouetteAdmissionRecord);
   * wake/light → the renderer feeds; face/beat/scale → read-backs for the
   * face beats (C4) and the depth-legibility witness.
   */
  private applyPerformancePackDriverOutput(
    out: PerformancePackDriverOutput,
  ): void {
    // Owner-review is the top spatial authority. A stale/scheduled pack output
    // must not be able to overwrite the controlled capture-drive specimen.
    if (this.ownerReviewSnapshot) return;
    if (!out.poseYield) {
      // GASPER-NORTHSTAR-001 (N60): authored world_x/world_z are an ADDITIVE
      // OFFSET over the LIVE physics base each frame (the kernel body's
      // current floor pose — the body keeps its physical motion while the
      // pack owns the pose; a hop happens WHERE the walker is, never a
      // teleport to an authored start). The authored offsets end at 0, so
      // the composed live pose IS the body.
      let base: Readonly<{ x: number; z: number }> | null = null;
      try {
        const b = this.physicsDriver?.getState().body;
        if (b && Number.isFinite(b.x) && Number.isFinite(b.z)) {
          base = { x: b.x, z: b.z };
        }
      } catch {
        base = null;
      }
      if (out.pose.provenance === "none") {
        // The pack-END release law: with a LIVE physics base (the kernel is
        // armed and owns the pose stream), the release SPATIALLY YIELDS —
        // nothing is written, so the latest physics tick remains the sole
        // world authority and the handoff is continuous wherever the body is
        // (a short hop may end mid-walk — no reliance on recall timing).
        // Without a physics base the legacy 'none' => home release passes
        // through untouched (the WorldSpace fence clamps it to home).
        let physicsArmed = false;
        try {
          physicsArmed =
            this.physicsDriver != null &&
            this.physicsDriver.getState().mode !== "idle";
        } catch {
          physicsArmed = false;
        }
        const write = resolvePackRelease(out.pose, base, physicsArmed);
        if (write.kind === "pose") {
          this.setWorldPose(write.pose);
        }
        // yield: nothing to do — the last physics tick already owns the pose.
      } else {
        this.setWorldPose(composePackWorldPose(out.pose, base));
      }
    }
    // Inside a physics-mode segment the D-0090 driver forwarded one tick
    // earlier (priority 25 < 26): it owns pose AND the wake/light feeds.
    if (!out.poseYield) {
      try {
        const g = (globalThis as any).SidekickFormMasterRig;
        g?.setPhysicsWake?.(out.wakeVX, out.wakeVY);
        g?.setPhysicsLight?.(out.lightSpeed);
      } catch {
        /* global absent (non-legacy mount) */
      }
    }
    // GASPER-CRAFT-001 · C4: face-energy carrier → the AU6+AU12 smile-shape
    // intake (all-script-3.js setFaceEnergy). Always forwarded (also inside
    // physics segments — the face is secondary action to the flight) and on
    // disarm (out.face 0 → identity).
    // GASPER-CRAFT-002 · S4: the authored impact ripple (ground_impact
    // channel) → the setGroundImpact intake at the pose's (x, z) — the floor
    // answers where the being answers. Forwarded on every tick and on disarm
    // (out.groundImpact 0 → the ring restores its authored rest state once).
    try {
      const g = (globalThis as any).SidekickFormMasterRig;
      g?.setFaceEnergy?.(out.face);
      g?.setGroundImpact?.(out.groundImpact, out.pose.x, out.pose.z);
    } catch {
      /* global absent (non-legacy mount) */
    }
    this.curveSilhouetteDeltas = out.silhouetteDeltas;
    this.lastPackFace = out.face;
    this.lastPackBeatId = out.beatId;
    this.lastPackShotScale = out.shotScale;
  }

  private ensurePerformancePackDriver(): PerformancePackDriver {
    if (!this.performancePackDriver) {
      this.performancePackDriver = new PerformancePackDriver(
        this.organismClock,
        (out) => this.applyPerformancePackDriverOutput(out),
      );
    }
    return this.performancePackDriver;
  }

  /**
   * C1: absolute silhouette values for the living flush fence — the loop's
   * PRE-scene living base + the pack driver's bounded deltas. Undefined at
   * rest so the fence stays closed outside an armed pack performance.
   */
  private curveSilhouetteAdmissionRecord():
    | Readonly<Record<string, number>>
    | undefined {
    const deltas = this.curveSilhouetteDeltas;
    if (!Object.keys(deltas).length) return undefined;
    const base = this.living?.eightLoop.getSilhouetteBaseValues();
    if (!base) return undefined;
    const out = admitPhysicsSilhouetteDeltas(base, deltas);
    return Object.keys(out).length ? out : undefined;
  }

  /** Run a compiled PerformancePack (the graph-editor session as data). */
  runPerformancePack(
    pack: PerformancePack,
    opts: { provenance?: PackProvenance } = {},
  ): void {
    // A review lease is a hard authority fence, not a suggestion. This also
    // blocks life intents that were scheduled just before the lease was acquired.
    if (this.ownerReviewSnapshot) return;
    this.ensurePerformancePackDriver().run(pack, opts);
  }

  /** Release the curve authority — provenance none, renderer eases home. */
  stopPerformancePack(): void {
    this.performancePackDriver?.disarm();
  }

  /**
   * GASPER-CRAFT-001 · C5 — run a shipped craft pack by registry id
   * ("s2-bounce", "s2-bounce/blocking", "s4-comet", "s4-comet/blocking").
   * Packs arrive pre-gated (beat sheet, arc phase, amplitude floors at the
   * documented body height, volume-law headroom, world bounds, home-to-home);
   * unknown or gate-rejected ids fail closed and nothing is armed.
   */
  runCraftPack(packId: string, opts: { provenance?: PackProvenance } = {}): boolean {
    if (this.ownerReviewSnapshot) return false;
    const pack = getCraftPack(packId);
    if (!pack) return false;
    this.runPerformancePack(pack, opts);
    return true;
  }

  /** Symmetric stop for the craft-pack intake (alias of stopPerformancePack). */
  stopCraftPack(): void {
    this.stopPerformancePack();
  }

  /** Rail "Craft" (C4 home): tempo 0.75–1.25, exaggeration 0.5–2. */
  setPerformancePackParams(
    params: Partial<{ tempo: number; exaggeration: number }> | undefined,
  ): void {
    this.ensurePerformancePackDriver().setParams(params);
  }

  /** Telemetry for proofs / the rail read-back (null = never armed). */
  getPerformancePackState() {
    return this.performancePackDriver?.getState() ?? null;
  }

  /** Face-energy carrier read-back (C4 maps AU recipes onto it). */
  getPerformancePackFace(): number {
    return this.lastPackFace;
  }

  /** Beat under the playhead (C5 beat-sheet telemetry); null in gaps. */
  getPerformancePackBeatId(): string | null {
    return this.lastPackBeatId;
  }

  /**
   * Shot scale under the playhead — witness telemetry for the depth-
   * legibility law (Doctrine 1: the scale names Gasper's authored depth).
   */
  getPerformancePackShotScale(): PackShotScale | null {
    return this.lastPackShotScale;
  }

  getMount() {
    return this.mount;
  }

  getDomainState(): GasperMultiDomainState {
    return this.mixer.getDomain();
  }

  topologyStatus() {
    return topologyStatusForController({
      topologyErrors: this.topologyErrors,
      lastFlush: this.mixer.getLastFlushReport(),
    });
  }

  /** Wave R8 — Validate runtime / topology / path hygiene. */
  validateRuntime() {
    const emb = this.selection.getState().embodiment;
    const topo = this.mount?.topology ?? {
      contourSamples: GASPER_TOPOLOGY.contourSamples,
      structuralNodes: GASPER_TOPOLOGY.structuralNodes,
      structuralTriangles: GASPER_TOPOLOGY.structuralTriangles,
    };
    return validateRuntimeForController({
      embodimentId: emb,
      topology: topo,
      domain: this.mixer.getDomain(),
      lastFlush: this.mixer.getLastFlushReport(),
      legacyFormMaster: !!this.mount?.legacyFormMaster,
    });
  }

  exportDocument(): GasperDocumentV1 {
    return exportDocumentForController(this.mixer.getDomain());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  /**
   * Coalesce GSAP / preview frame updates onto one rAF so stage can
   * recompute handle UV + bounds every interpolation frame without thrash.
   */
  private emitFrame() {
    if (this.emitRaf != null) return;
    const schedule =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : ((cb: FrameRequestCallback) =>
            setTimeout(() => cb(Date.now()), 0) as unknown as number);
    this.emitRaf = schedule(() => {
      this.emitRaf = null;
      this.emit();
    });
  }

  /** Sync Face Isolation flag into mixer so flush re-applies temporary aids. */
  setFaceIsolation(on: boolean) {
    const prev = this.selection.getState().faceIsolation;
    this.mixer.setFaceIsolation(on);
    if (prev !== on) {
      this.selection.setFaceIsolation(on);
    }
    this.mixer.flush();
    this.emit();
  }

  /**
   * Measure live content-space geometry from mounted SVG layers (getBBox)
   * expanded by current host form scale — not fixed viewBox alone.
   */
  measureContentGeometry(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    const mount = this.mount;
    if (!mount?.svgRoot) return null;
    const svg = mount.svgRoot;
    // Character Fit must measure the organism mass, not optical envelopes.
    // chromaticShell/cosmicTextureLayer/idleRig intentionally carry glows,
    // orbit fields and material spill; including them here makes a “character
    // fit” frame the effects and leaves the body visually undersized. Those
    // layers remain represented by GasperVisualBounds' visual/safe envelopes.
    const selectors = [
      "#body",
      "#shellBaseLayer",
      "#innerVolumeLayer",
      "#faceRecessLayer",
      "#reliefLayer",
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let any = false;
    for (const sel of selectors) {
      const el = svg.querySelector(sel) as SVGGraphicsElement | null;
      if (!el || typeof el.getBBox !== "function") continue;
      try {
        const b = el.getBBox();
        if (!b.width && !b.height) continue;
        any = true;
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      } catch {
        /* detached */
      }
    }
    if (!any) return null;
    // Expand by the SAME host transform mixer applies (shell, fullness, residual, lifts…)
    const live = this.readLive();
    const domain = this.mixer.getDomain();
    const host = computeHostTransform({
      overall_width: live.overall_width,
      overall_height: live.overall_height,
      crown_height: live.crown_height,
      lower_body_fullness: live.lower_body_fullness,
      ground_flattening: live.ground_flattening,
      singularity_outer_radius: live.singularity_outer_radius,
      singularity_vertical_compression: live.singularity_vertical_compression,
      shell_thickness: live.shell_thickness,
      orbital_plane_scale: live.orbital_plane_scale,
      center_of_mass_y: live.center_of_mass_y,
      horizon_vertical_position: live.horizon_vertical_position,
      residual: domain.dynamics.residual,
    });
    return applyHostTransformToRect(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      host,
    );
  }

  /**
   * Apply a binding snapshot temporarily, run fn, restore live document values.
   * Used for Compare baseline ghost capture without permanent mutation.
   */
  withBindingSnapshot<T>(
    values: Record<string, number>,
    fn: () => T,
  ): T {
    const prev = this.mixer.getForm();
    this.mixer.setForm(values);
    this.mixer.flush();
    try {
      return fn();
    } finally {
      this.mixer.setForm(prev);
      this.mixer.flush();
    }
  }

  /** Clone current host markup after applying values (Compare baseline ghost). */
  captureHostMarkup(values?: Record<string, number>): string | null {
    const host = this.mount?.svgRoot?.parentElement;
    if (!host) return null;
    if (!values) return host.outerHTML;
    return this.withBindingSnapshot(values, () => host.outerHTML);
  }

  /**
   * Request one FormMaster frame. The FormMaster renderer itself is wrapped by
   * the VEC-701 transaction; the controller performs no post-paint SVG writes.
   * Implementation: controller/legacyAuthorityAdapter.ts
   */
  private paintLegacyAuthority(): void {
    paintLegacyAuthorityFrame({
      legacyFormMaster: !!this.mount?.legacyFormMaster,
      rig: this.mount?.rig ?? null,
    });
  }

  /**
   * Map modern semantic pose keys into FormMaster motion/bindings and paint.
   * Does not invoke native mixer flush (would flatten complete character).
   * The FormMaster transaction is the only production projection writer.
   * Implementation: controller/legacyAuthorityAdapter.ts
   */
  private applyPoseToLegacyAuthority(pose: Record<string, number>): void {
    const g = globalThis as unknown as {
      SidekickFormMasterRig?: {
        applyCanonicalProjection?: (packet: CanonicalProductionFieldPacket) => void;
        applySemanticPose?: (p: Record<string, number>) => void;
        applyBindings?: (p: Record<string, number>) => void;
        setBinding?: (id: string, v: number) => void;
        setMotion?: (v: number) => void;
        setYaw?: (v: number) => void;
        requestOneFrame?: () => void;
        setPaused?: (v: boolean) => void;
        setReliefPreset?: (v: string) => void;
      };
    };
    const livingStatus = this.living.getStatus();
    applyPoseToLegacyAuthorityAdapter(
      {
        legacyFormMaster: !!this.mount?.legacyFormMaster,
        rig: this.mount?.rig ?? null,
        globalRig: g.SidekickFormMasterRig,
        eightStateFaceMorphActive: this.eightStateFaceMorphActive,
        externalBlinkEyeAuthority: this.externalBlinkEyeAuthority,
        livingEmbodimentTransitionKey: this.livingEmbodimentTransitionKey,
        eightStateLoop: !!livingStatus.eightStateLoop,
        reducedMotion: !!livingStatus.reducedMotion,
        eightState: livingStatus.eightState,
        onOperationalRelief: (amplitude, p) =>
          this.applyOperationalRelief(amplitude, p),
        ensureLiveSvgRootVisible: () => this.ensureLiveSvgRootVisible(),
      },
      pose,
    );
  }

  /**
   * Generate real adaptive relief field and cache authority drive payload.
   * Integrator hook — does not modify authority asset sources.
   */
  applyOperationalRelief(
    amplitude: number,
    pose: Record<string, number> = {},
  ): ReliefAuthorityDrive {
    // VEC-401: proof/operator code must explicitly step or scrub the clock.
    // Relief never invents private fallback time.
    this.operationalClockSec = this.organismClock.elapsed() / 1000;
    const domain = this.mixer.getDomain();
    const field = this.reliefGen.generate({
      width: 25,
      height: 40,
      amplitude: Math.max(0, Math.min(1, amplitude)),
      scale: pose.texture_scale ?? domain.texture?.scale ?? 1,
      seed: this.organismClock.getSeed() || 17,
      timeSeconds: this.operationalClockSec,
      motion: pose.motion ?? domain.relief?.motionCoupling ?? 0.5,
      energy: pose.energy_level ?? domain.energy?.level ?? 0.5,
      tension: pose.skin_tension ?? domain.skin?.tension ?? 0.4,
      damping: pose.skin_damping ?? domain.skin?.damping ?? 0.5,
      coupling: pose.skin_coupling ?? domain.skin?.coupling ?? 0.5,
    });
    // Keep multi-domain relief samples in sync for probes
    try {
      const samples = domain.relief?.samples;
      if (samples && samples.length >= field.samples.length) {
        samples.set(field.samples);
      }
      if (domain.relief) {
        domain.relief.amplitude = amplitude;
      }
    } catch {
      /* */
    }
    const drive = reliefFieldToAuthorityDrive(field, {
      amplitude,
      seed: 17,
    });
    this.lastReliefDrive = drive;
    // Legacy FormMaster owns its expression relief preset. Only the native
    // candidate path may derive a preset from controller amplitude.
    if (!this.mount?.legacyFormMaster) {
      const g = globalThis as unknown as {
        SidekickFormMasterRig?: { setReliefPreset?: (v: string) => void };
      };
      if (amplitude > 0.02) {
        g.SidekickFormMasterRig?.setReliefPreset?.("goosebumps");
      } else {
        g.SidekickFormMasterRig?.setReliefPreset?.("none");
      }
    }
    return drive;
  }

  getLastReliefDrive(): ReliefAuthorityDrive | null {
    return this.lastReliefDrive;
  }

  /**
   * Compose authored clip + living + preview into a resolved pose with traces.
   * Scrub mode suppresses living; interrupt holds visible pose.
   * Implementation: controller/stateResolver.ts (canonical compositor only).
   */
  resolveComposedPose(opts: {
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
  }): ResolvedPose {
    // VEC-501 anchors: resolveComposedPoseForController emits
    // controller:character-state-final after constraints; bindingTargets from registry.
    const bindingTargets = Object.fromEntries(
      this.registry.all().map((binding) => [
        binding.id,
        [...binding.affectedNodeIds],
      ]),
    );
    return resolveComposedPoseForController(
      {
        committed: this.committed,
        visibleControlIds: () => this.visibleControlIds(),
        registryTargets: () => bindingTargets,
        onResolved: (resolved) => {
          this.lastResolvedPose = resolved;
          this.compositorInvocations += 1;
        },
      },
      this.lastResolvedPose,
      opts,
    );
  }

  getLastResolvedPose(): ResolvedPose | null {
    return this.lastResolvedPose;
  }

  /** Production authority remains complete FormMaster; native is lab-only. */
  getProductionRendererId(): string {
    return "legacy-authority-formmaster-v655";
  }

  /**
   * Public applyPose for MCP/HTTP bridge — routes Legacy vs native correctly.
   * Exposed on controller so ensureDaisHostBound does not bypass FormMaster.
   */
  applyExternalPose(pose: Record<string, number>): void {
    // Always through compositor so MCP/UI share one resolution path.
    this.applyComposedExternalPose(pose, { scrubMode: this.scrubModeActive });
  }

  /**
   * Direct FormMaster coefficient seam for authored form-design controls.
   * These keys are not semantic pose bindings and must bypass the compositor,
   * which intentionally drops unknown channels before the legacy renderer.
   */
  setLiveFormCoeff(key: string, value: number): void {
    if (!key || typeof key !== "string") throw new TypeError("form coefficient key required");
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`invalid form coefficient value for ${key}`);
    }
    const g = globalThis as unknown as {
      SidekickFormMasterRig?: {
        setLiveFormCoeff?: (profile: string, coefficient: string, next: number) => void;
        requestOneFrame?: () => void;
      };
    };
    const profile = this.authoredMainForm || this.selection.getState().embodiment || "wispwalker";
    const rig = g.SidekickFormMasterRig;
    if (typeof rig?.setLiveFormCoeff !== "function") {
      throw new Error("FORMMASTER_LIVE_COEFFICIENT_API_MISSING");
    }
    rig.setLiveFormCoeff(profile, key, value);
    rig.requestOneFrame?.();
  }

  /**
   * S10 (owner N42) — the Boo ghost-flight demo seam: swaps the kernel's
   * flight organ to the golden-split Boo parameter set (dreamy jets, heavy
   * drag, same hover equilibrium) and arms the perpetual-bob carrier (the
   * ghost never stands). Owner-invoked for the demo's second half; off =
   * byte-identical FlightLaw behavior.
   */
  enableBoo(v: boolean): void {
    this.ensurePhysicsDriver().setBooMode(v);
  }

  /** Fresh-load opening: frontal heading, no travel. */
  pinOpeningRest(): void {
    this.headingPinDeg = 0;
    this.setWanderEnabled(false);
    this.setLifeEnabled(false);
  }

  /** Instant form. Never the 1.6s Presence morph. */
  snapEmbodiment(id: string) {
    this.authoredMainForm = id;
    this.selection.setEmbodiment(id);
    this.living.eightLoop.setEmbodiment(id);
    try {
      const rig = this.mount?.rig as
        | {
            cancelBehavior?: () => void;
            clearMorphPreview?: () => void;
            setProfile?: (name: string, settle?: string) => void;
            requestOneFrame?: () => void;
          }
        | undefined;
      // cancelBehavior bumps the morph serial. clearMorphPreview alone
      // leaves morphToBehavioral running and it settles onto Presence.
      rig?.cancelBehavior?.();
      rig?.clearMorphPreview?.();
      rig?.setProfile?.(id, "settle");
      rig?.requestOneFrame?.();
    } catch {
      /* FormMaster optional in tests */
    }
    this.mixer.rebuildNodeCache();
    this.emit();
  }

  setEmbodiment(id: string) {
    this.selection.setEmbodiment(id);
    // WISPWALKER FIRST-CLASS: durable main-form choice; the live loop never overwrites this
    // (it patches selection.embodiment on hold-settle, so selection is not the source of truth).
    this.authoredMainForm = id;
    this.living.eightLoop.setEmbodiment(id);
    // ONE mass: morph the LIVE body. Do not rewrite x0, do not setWorldPose
    // home, do not disarm, do not spawn a second COM. Silhouette interpolates
    // on the planted world the kernel already owns.
    const liveRig = this.mount?.rig as
      | {
          morphToBehavioral?: (name: string, options?: { durationMs?: number }) => Promise<unknown>;
          setMorphPreview?: (from: string, to: string, mix: number) => void;
          setProfile?: (id: string) => void;
          getSnapshot?: () => { profile?: string };
        }
      | undefined;
    const currentProfile = (liveRig as { getSnapshot?: () => { profile?: string } } | undefined)
      ?.getSnapshot?.()?.profile;
    if (currentProfile === id) {
      // Same form: do not rebuild BASE_CONTOUR (that is the 1-frame statue).
      // Still paint the live SVG so a remount cannot leave a dead poster.
      if (this.mount?.legacyFormMaster) this.paintLegacyAuthority();
      try {
        this.mount?.rig.setPaused?.(false);
        this.mount?.rig.setMotion?.(0.55);
        this.mount?.rig.requestOneFrame?.();
      } catch {
        /* optional FormMaster ambient motion */
      }
      this.mixer.rebuildNodeCache();
      this.emit();
      return;
    }
    // Morph the LIVE planted body. setProfile + mixer.flush(forceAll) is a
    // second statue (1-frame pop). Take/prep stay on this COM.
    if (typeof liveRig?.morphToBehavioral === "function") {
      void liveRig.morphToBehavioral(id, { durationMs: 1618 });
    } else if (typeof liveRig?.setMorphPreview === "function" && currentProfile) {
      liveRig.setMorphPreview(currentProfile, id, 0);
    } else {
      this.mount?.rig.setProfile(id);
    }
    this.mixer.rebuildNodeCache();
    this.emit();
  }

  setExpression(fixtureId: string) {
    this.selection.setExpression(fixtureId);
    // Hybrid production path: resolve kernel aliases (recognition-spark →
    // mischievous-spark) before touching FormMaster EMOTION_FIXTURES.
    const rigId = this.mount?.legacyFormMaster
      ? resolveFormMasterEmotionFixtureId(fixtureId)
      : fixtureId;
    try {
      this.mount?.rig.setFixtureImmediate(rigId);
    } catch {
      try {
        this.mount?.rig.setFixture(rigId);
      } catch (e) {
        console.warn("[GasperRigController] fixture", e, { fixtureId, rigId });
      }
    }
    // Legacy Authority: fixture geometry lives in FormMaster face-plane scripts.
    // Native mixer/tracks would overwrite complete face with partial domain state.
    if (this.mount?.legacyFormMaster) {
      this.paintLegacyAuthority();
      this.emit();
      return;
    }
    // Native: prefer last character-merged channels over stale fixture partials
    // so setExpression cannot silently undo applyVisualStateEndpoint holds.
    const characterMerged = this.lastCharacterApply?.mergedChannels ?? {};
    const projected =
      (this.mount?.rig as { lastProjectedBindings?: Record<string, number> })
        ?.lastProjectedBindings ?? {};
    const targets = {
      ...flattenDomainBindings(this.mixer.getDomain()),
      ...projected,
      ...characterMerged,
    };
    this.mixer.setForm(targets);
    this.mixer.flush({ forceAll: true });
    this.tracks.playCoordinated(targets, {
      duration: 0.45,
      label: `expression:${fixtureId}`,
    });
    this.emit();
  }

  /**
   * GASPER-007-G R3 — apply one of the eight visual state endpoints on the
   * production path. Embodiment profile + channel targets; no acceptance-only
   * face geometry writers. R4 consumes the same profiles via project/hash APIs.
   *
   * Character authority enrichment: identity-governed channels merge with
   * endpoint bindings (character invariants win for silhouette/volume/CoM/
   * attachment ownership; state signature supplies semantic deltas).
   */
  applyVisualStateEndpoint(
    stateId: string,
    opts?: {
      reducedMotion?: boolean;
      /** Immediate apply (no GSAP settle). Default true for endpoint holds. */
      immediate?: boolean;
      durationSec?: number;
    },
  ): VisualStateProjectReport {
    if (!isEightStateId(stateId)) {
      throw new TypeError(`unknown eight-state visual endpoint: ${stateId}`);
    }
    const proj = projectVisualStateEndpoint(stateId, {
      reducedMotion: opts?.reducedMotion,
    });
    // Character eight-state visual language: identity-governed enrichment.
    // Session is controller-owned (not module-global). Reduced-motion damping
    // is preserved so character channels cannot defeat energy_pulse/rebound/motion caps.
    // Soft-fail (identityOk false) still keeps character-merged channels when non-empty
    // — never reverts to raw endpoint face_scale 0.42 lattice-unsafe fade.
    const characterApply = applyCharacterStateVisual(
      stateId,
      {
        endpointChannels: proj.bindings,
        reducedMotion: opts?.reducedMotion,
      },
      this.characterSession,
    );
    this.lastCharacterApply = characterApply;
    // Single merge path (shared with NativeGasperRenderer): character wins.
    const resolved = resolveNativeAuthorityBindings(stateId, {
      reducedMotion: opts?.reducedMotion,
      characterChannels: characterApply.mergedChannels,
      blockFixtureOverride: true,
    });
    const characterBindings = { ...resolved.bindings };
    const canonicalHold = this.resolveComposedPose({
      base: flattenDomainBindings(this.mixer.getDomain()),
      characterState: characterBindings,
    });
    const effectiveBindings = canonicalHold.values;
    // Seal hold into committed base so living/compositor re-resolve cannot
    // silently restore DEFAULT_FORM over character eight-state channels.
    for (const [k, v] of Object.entries(effectiveBindings)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        this.committed[k] = v;
      }
    }
    const ep = getVisualStateEndpoint(stateId)!;
    const fixtureId = this.mount?.legacyFormMaster
      ? FORM_MASTER_FIXTURE_BY_LIVING_STATE[stateId as LivingEightStateId]
      : proj.expressionAffinity;
    // Selection truth reflects the fixture actually accepted by the renderer.
    this.selection.patch({
      embodiment: this.mainFormOverride(proj.embodimentId), // V2.1 DEFECT-1: explicit presence-* apply keeps authored main form
      expression: fixtureId,
    });
    // Same live silhouette. setProfile on an unchanged form rebuilt BASE_CONTOUR
    // every eight-state apply — a 1-frame statue swap.
    {
      const nextForm = this.mainFormOverride(proj.embodimentId);
      const liveRig = this.mount?.rig as
        | {
            morphToBehavioral?: (name: string, options?: { durationMs?: number }) => Promise<unknown>;
            getSnapshot?: () => { profile?: string };
            setProfile?: (id: string) => void;
          }
        | undefined;
      const cur = liveRig?.getSnapshot?.()?.profile;
      if (cur !== nextForm && typeof liveRig?.morphToBehavioral === "function") {
        void liveRig.morphToBehavioral(nextForm, { durationMs: 1618 });
      } else if (cur !== nextForm) {
        liveRig?.setProfile?.(nextForm);
      }
    }
    try {
      this.mount?.rig.setFixtureImmediate(fixtureId);
    } catch {
      try {
        this.mount?.rig.setFixture(fixtureId);
      } catch {
        /* affinity may be soft */
      }
    }

    const immediate = opts?.immediate !== false;
    const duration = opts?.durationSec ?? 0.35;

    if (this.mount?.legacyFormMaster) {
      // Legacy authority: profile/fixture paint + FormMaster-safe semantic pose.
      // Production path forbids acceptance-only face geometry writers.
      // filterLegacyEndpointValues still fences mass/topology keys.
      const safe = filterLegacyEndpointValues(effectiveBindings);
      this.applyPoseToLegacyAuthority(safe);
      this.mixer.setLegacyAuthorityDomWriteFirewall(true);
      // Keep multi-domain state in sync for probes/export even under firewall.
      this.mixer.setForm(effectiveBindings);
      this.mixer.setContourProfile(proj.embodimentId);
      // Domain probe truth is available immediately (DOM writes stay firewalled).
      this.mixer.flush({ forceAll: true });
      this.emit();
      return { ...proj, bindings: effectiveBindings };
    }

    this.mixer.setLegacyAuthorityDomWriteFirewall(false);
    this.mixer.setContourProfile(proj.embodimentId);
    // VEC-501: the canonical compositor already sealed explicit character-state
    // authority after constraints. No independent GasperLayerMixer ordering path.
    const targets = effectiveBindings;
    this.mixer.setForm(targets);
    // Synchronous flush so geometry probes / telemetry see post-render truth
    // immediately (rAF schedule alone left eye/mouth/energy spans null).
    this.mixer.flush({ forceAll: true });
    if (immediate) {
      // Hold endpoint without motion scheduler ownership (R4 owns continuous loop).
      this.emit();
    } else {
      this.tracks.playCoordinated(targets, {
        duration,
        label: `visual-endpoint:${ep.stateId}`,
        ease: "power2.out",
      });
      this.emit();
    }
    return { ...proj, bindings: effectiveBindings };
  }

  /**
   * Post-apply rendered feature geometry from the production mixer path.
   * Native holds stamp non-null eye/mouth/energy channels; legacy firewall
   * still exposes domain truth for probes (DOM writes gated separately).
   */
  measureRenderedFeatureGeometry() {
    return this.mixer.measureRenderedFeatureGeometry();
  }

  /**
   * Project character state visual (pure; no DOM). Identity-governed channels.
   */
  projectCharacterStateVisual(
    stateId: string,
  ): CharacterPoseProjection | null {
    return projectCharacterStateVisual(stateId);
  }

  /**
   * Validate last-applied character identity stamp (controller session).
   */
  validateActiveCharacterIdentity(): {
    ok: boolean;
    stateId: string | null;
    identityOk: boolean;
    message: string;
  } {
    return validateActiveCharacterIdentity(this.characterSession);
  }

  /** Last character apply report for probes / structural tests. */
  getLastCharacterApplyReport(): StateVisualApplyReport | null {
    return (
      this.lastCharacterApply ??
      getLastCharacterApplyReport(this.characterSession)
    );
  }

  /** Controller-owned character apply session (tests / probes). */
  getCharacterApplySession(): CharacterApplySession {
    return this.characterSession;
  }

  /** Deterministic parameter export for one endpoint (no DOM required). */
  exportVisualStateEndpoint(
    stateId: string,
    opts?: { reducedMotion?: boolean },
  ): Record<string, string | number | boolean> {
    return exportVisualStateEndpointParameters(stateId, opts);
  }

  /** All eight endpoint hashes for evidence / R4 freeze. */
  exportVisualStateEndpointHashes(opts?: {
    reducedMotion?: boolean;
  }): Record<EightStateId, string> {
    return exportAllVisualStateEndpointHashes(opts);
  }

  /** Last applied eight-state id from selection expression+embodiment, if matched. */
  resolveActiveVisualStateId(): EightStateId | null {
    const { embodiment, expression } = this.selection.getState();
    for (const id of [
      "presence-neutral-settled",
      "presence-listening-receive",
      "presence-thinking-knit",
      "presence-recognition-spark",
      "comet-executing-drive",
      "presence-blocked-strain",
      "presence-pleased-resolve",
      "dormant-orbit-maintain",
    ] as EightStateId[]) {
      const ep = getVisualStateEndpoint(id)!;
      const expectedExpression = this.mount?.legacyFormMaster
        ? FORM_MASTER_FIXTURE_BY_LIVING_STATE[id]
        : ep.expressionAffinity;
      if (
        ep.embodimentId === embodiment &&
        expectedExpression === expression
      ) {
        // Comet + listening-orient and pleased-soft collisions need channel check
        if (
          id === "comet-executing-drive" ||
          id === "presence-listening-receive" ||
          id === "presence-recognition-spark" ||
          id === "presence-pleased-resolve"
        ) {
          const form = this.mixer.getForm();
          const energy = form.energy_level ?? 0;
          if (id === "comet-executing-drive" && embodiment === "comet") {
            return id;
          }
          if (id === "presence-recognition-spark" && energy >= 0.7) return id;
          if (
            id === "presence-pleased-resolve" &&
            energy < 0.7 &&
            energy >= 0.55
          ) {
            return id;
          }
          if (id === "presence-listening-receive" && energy >= 0.6 && energy < 0.72) {
            return id;
          }
          continue;
        }
        return id;
      }
    }
    return null;
  }

  setMorph(from: string, to: string, mix: number) {
    this.mount?.rig.setMorphPreview(from, to, mix);
    if (this.mount?.legacyFormMaster) {
      this.paintLegacyAuthority();
      this.emitFrame();
      return;
    }
    const projected =
      (this.mount?.rig as { lastProjectedBindings?: Record<string, number> })
        ?.lastProjectedBindings ?? {};
    const targets = {
      ...flattenDomainBindings(this.mixer.getDomain()),
      ...projected,
      energy_pulse: 0.15 + mix * 0.4,
    };
    this.mixer.setForm(targets);
    this.emitFrame();
  }

  /** Book 004 AnimationPlan → GSAP adapter (required by architecture lock). */
  async playAnimationPlan(plan: AnimationPlan | {
    from: string;
    to: string;
    durationMs?: number;
  }) {
    if ("rigTargets" in plan) {
      this.planCompiler.compileAndPlay(plan);
      this.emit();
      return;
    }
    // Embodiment morph via native MorphAdapter (Wave R3) + domain plan
    this.mount?.rig.setMorphPreview(plan.from, plan.to, 1);
    const projected =
      (this.mount?.rig as { lastProjectedBindings?: Record<string, number> })
        ?.lastProjectedBindings ?? {};
    const targets = {
      ...flattenDomainBindings(this.mixer.getDomain()),
      ...projected,
    };
    targets.energy_level = Math.min(1, (targets.energy_level ?? 0.5) + 0.12);
    targets.relief_amplitude = Math.min(
      1,
      (targets.relief_amplitude ?? 0.4) + 0.1,
    );
    this.mixer.setForm(targets);
    this.tracks.playCoordinated(targets, {
      duration: (plan.durationMs ?? 900) / 1000,
      label: `book004:${plan.from}->${plan.to}`,
    });
    this.emit();
  }

  /**
   * Wave R4 — RUNTIME behavioral sequence driven by AnimationPlan adapters,
   * not GasperLivingRuntime autoSequence over MICROSTATE_TARGETS.
   * MICROSTATE_TARGETS remain diagnostic/fallback fixtures only.
   */
  async playBehavioralSequenceViaPlans(opts?: {
    stepSeconds?: number;
    ids?: MicrostateId[];
  }) {
    const { BEHAVIORAL_SEQUENCE, GasperLivingRuntime: LR } = await import(
      "./GasperLivingRuntime"
    );
    const ids = opts?.ids ?? [...BEHAVIORAL_SEQUENCE];
    const step = opts?.stepSeconds ?? 0.9;
    for (const id of ids) {
      const plan = LR.microstateToAnimationPlan(id, {
        durationSeconds: step,
        planId: `runtime-plan:${id}`,
      });
      await this.playAnimationPlan(plan);
      await new Promise((r) => setTimeout(r, step * 1000 * 0.85));
    }
    this.emit();
  }

  /**
   * Animator Studio — play canonical clip from animation command session (preferred)
   * or legacy animateSession keyframes / default studio clip.
   */
  playStudioAnimate(opts?: {
    durationSeconds?: number;
    onPlayhead?: (t: number) => void;
  }): void {
    const cmd = getAnimationCommandSession();
    const clip = cmd.activeClip();
    if (clip && collectMergedKeyframes(clip).length >= 2) {
      this.playCanonicalClip(clip, opts);
      return;
    }

    const duration = opts?.durationSeconds ?? (clip ? clip.duration_ms / 1000 : 1.4);
    const live = this.mixer.getForm();
    const wasLiving = this.living.getStatus().running === true;
    if (wasLiving) this.stopLiving();

    const resumeLivingIfNeeded = (t: number) => {
      opts?.onPlayhead?.(t);
      this.emitFrame();
      if (t >= 1 && wasLiving) {
        try {
          this.startLiving({ autoSequence: false });
        } catch {
          /* ignore */
        }
      }
    };

    if (this.animateSession.getKeyframes().length >= 2) {
      this.animateSession.setDurationSeconds(duration);
      const ok = this.animateSession.playOnOrchestrator(this.tracks, {
        durationSeconds: duration,
        seedLive: live,
        onProgress: resumeLivingIfNeeded,
      });
      if (ok) {
        this.emit();
        return;
      }
    }

    const targets: Record<string, number> = {
      ...flattenDomainBindings(this.mixer.getDomain()),
      ...live,
      overall_height: clamp01((live.overall_height ?? 0.55) + 0.08),
      crown_height: clamp01(Math.min(1, (live.crown_height ?? 0.05) + 0.35)),
      eye_openness: clamp01(Math.max(0.12, (live.eye_openness ?? 0.85) - 0.5)),
      energy_level: clamp01((live.energy_level ?? 0.45) + 0.4),
      energy_pulse: clamp01((live.energy_pulse ?? 0.3) + 0.5),
      relief_amplitude: clamp01((live.relief_amplitude ?? 0.4) + 0.35),
      settling: clamp01((live.settling ?? 0.3) + 0.35),
      internal_glow: clamp01((live.internal_glow ?? 0.4) + 0.3),
    };
    for (const [k, v] of Object.entries(live)) {
      if (typeof v === "number") this.tracks.ensureProxy(k, v).value = v;
    }
    this.tracks.playCoordinated(targets, {
      duration,
      ease: "power2.inOut",
      label: "studio-animate-clip",
      onProgress: resumeLivingIfNeeded,
    });
    this.emit();
  }

  /** Play a canonical AnimationClip via multi-segment GSAP with per-keyframe easing. */
  playCanonicalClip(
    clip: AnimationClip,
    opts?: { onPlayhead?: (t: number) => void },
  ): void {
    const kfs = collectMergedKeyframes(clip);
    if (kfs.length < 2) return;

    const wasLiving = this.living.getStatus().running === true;
    if (wasLiving) this.stopLiving();

    const live = this.mixer.getForm();
    for (const [k, v] of Object.entries(live)) {
      if (typeof v === "number") this.tracks.ensureProxy(k, v).value = v;
    }
    // Retarget-current: seed from live, not snap to first keyframe anchors
    const durationSec = Math.max(0.05, clip.duration_ms / 1000);
    const t0 = kfs[0].time_ms;
    const t1 = kfs[kfs.length - 1].time_ms;
    const totalSpan = Math.max(1, t1 - t0);

    const playbackGeneration = ++this.canonicalPlaybackGeneration;
    const loopMode = clip.loop_mode ?? "none";
    let reverse = false;
    let segmentIndex = 0;
    const orderedFrames = () => (reverse ? [...kfs].reverse() : kfs);
    const playSegment = () => {
      if (playbackGeneration !== this.canonicalPlaybackGeneration) return;
      const frames = orderedFrames();
      if (segmentIndex >= frames.length - 1) {
        if (loopMode === "loop") {
          reverse = false;
          segmentIndex = 0;
          this.tracks.applyValues(kfs[0].values, 0);
          opts?.onPlayhead?.(0);
          playSegment();
          return;
        }
        if (loopMode === "ping_pong") {
          reverse = !reverse;
          segmentIndex = 0;
          playSegment();
          return;
        }
        opts?.onPlayhead?.(reverse ? 0 : 1);
        if (wasLiving) {
          try {
            this.startLiving({ autoSequence: false });
          } catch {
            /* */
          }
        }
        return;
      }
      const fromKf = frames[segmentIndex];
      const toKf = frames[segmentIndex + 1];
      const segWeight = Math.abs(toKf.time_ms - fromKf.time_ms) / totalSpan;
      const segDur = Math.max(0.02, durationSec * segWeight);
      const targets: Record<string, number> = { ...toKf.values };
      for (const [id, v] of Object.entries(fromKf.values)) {
        if (targets[id] === undefined) targets[id] = v;
      }
      this.tracks.playCoordinated(targets, {
        duration: segDur,
        ease: fromKf.easing || "power2.inOut",
        label: `canon-seg-${reverse ? "rev" : "fwd"}-${segmentIndex}`,
        onProgress: (local) => {
          if (playbackGeneration !== this.canonicalPlaybackGeneration) return;
          const sessionT = fromKf.time_ms + (toKf.time_ms - fromKf.time_ms) * local;
          opts?.onPlayhead?.(clamp01((sessionT - t0) / totalSpan));
          this.emitFrame();
        },
        onComplete: () => {
          if (playbackGeneration !== this.canonicalPlaybackGeneration) return;
          segmentIndex += 1;
          playSegment();
        },
      });
    };
    playSegment();
    this.emit();
  }

  /** Scrub Animator playhead 0–1 — evaluate clip, resolve via compositor, paint. */
  scrubStudioAnimate(t: number): void {
    this.scrubModeActive = true;
    const clip = getAnimationCommandSession().activeClip();
    let clipPose: Record<string, number> = {};
    if (clip) {
      clipPose = evaluateClipAt(clip, { t });
    } else if (this.animateSession.getKeyframes().length >= 1) {
      clipPose = this.animateSession.scrubOnOrchestrator(this.tracks, t);
    }
    if (Object.keys(clipPose).length === 0) {
      this.tracks.seek(t);
      this.emitFrame();
      return;
    }
    this.lastClipPose = { ...clipPose };
    // Scrub suppresses living — compositor enforces authored keyframes win
    this.applyComposedExternalPose(clipPose, { scrubMode: true, living: {} });
  }

  /** Capture native multi-track keyframe at playhead from live mixer values. */
  captureStudioKeyframe(t?: number, label?: string) {
    const tt = typeof t === "number" ? t : this.tracks.getPlayhead();
    return this.animateSession.captureKeyframe(tt, this.mixer.getForm(), {
      label,
      includeAll: true,
    });
  }

  getAnimateSessionSnapshot() {
    return this.animateSession.getSnapshot();
  }

  pauseStudioAnimate(): void {
    this.tracks.pause();
    this.planCompiler.interrupt();
  }

  resumeStudioAnimate(): void {
    this.tracks.resume();
  }

  /**
   * Hard stop of plan + coordinated tracks (timeline Interrupt).
   * Retarget-from-current / no-snap: freeze the live pose in place.
   * Do NOT animate to neutral-settled (that would snap/override held values).
   */
  interruptStudioAnimate(): void {
    this.canonicalPlaybackGeneration += 1;
    // Capture pose before killing tweens so we can re-apply as committed hold.
    const held = { ...this.readLive() };
    this.tracks.interrupt();
    this.planCompiler.interrupt();
    // Stop living additive tracks so they cannot overwrite the held authoring pose.
    try {
      this.stopLiving();
    } catch {
      /* ignore */
    }
    this.scrubModeActive = true;
    // Compositor interrupt holds the exact resolved visible pose
    this.resolveComposedPose({
      base: held,
      clip: this.lastClipPose,
      living: {},
      interrupted: true,
    });
    this.lastClipPose = { ...held };
    for (const [id, value] of Object.entries(held)) {
      if (typeof value === "number") this.committed[id] = value;
    }
    if (this.mount?.legacyFormMaster) {
      this.applyPoseToLegacyAuthority(held);
    } else {
      this.tracks.applyValues(held);
      this.mixer.setForm(held);
    }
    this.emitFrame();
    this.emit();
  }

  getStudioPlayhead(): number {
    return this.tracks.getPlayhead();
  }

  isStudioAnimating(): boolean {
    return this.tracks.isPlaying();
  }

  readAll(): Record<string, number> {
    return this.registry.serialize();
  }

  /**
   * Live Form/Face values for UI mirror + inspection.
   * - Legacy Authority: committed wins (mixer is not written on that path).
   * - Native / tests: mixer form wins so GSAP preview + withBindingSnapshot work.
   */
  readLive(): Record<string, number> {
    const form = this.mixer.getForm();
    if (this.mount?.legacyFormMaster) {
      return { ...form, ...this.committed };
    }
    return { ...this.committed, ...form };
  }

  /**
   * Single Form/Face mutation pipe — UI, MCP scrub form keys, and tests.
   * Preview only: live geometry + UI, no undo stack.
   */
  previewBinding(id: string, value: number): void {
    const b = this.registry.get(id);
    if (!b) {
      throw new TypeError(`unknown binding: ${id}`);
    }
    b.preview(value);
    // Ensure committed mirror for readLive even if preview path skipped commit
    this.committed[id] = value;
    // D-0083: user touched this binding — the living flush must not stomp it
    // (eye_openness stays loop-owned under the N3 aperture authority).
    if (id !== "eye_openness") this.userOwnedBindings.add(id);
    this.emitFrame();
  }

  /**
   * Single Form/Face mutation pipe — commit with undo + Legacy/native apply.
   */
  commitBinding(id: string, value: number): void {
    const b = this.registry.get(id);
    if (!b) {
      throw new TypeError(`unknown binding: ${id}`);
    }
    b.commit(value);
    // commit already emit()s; re-assert live includes committed for UI
    this.committed[id] = value;
    // D-0083: user touched this binding — the living flush must not stomp it
    // (eye_openness stays loop-owned under the N3 aperture authority).
    if (id !== "eye_openness") this.userOwnedBindings.add(id);
    this.emit();
  }

  /**
   * D-0083: release all user-owned bindings back to the living loop.
   * Called by expression-studio reset (resetDaisExpression).
   */
  clearUserOwnedBindings(): void {
    this.userOwnedBindings.clear();
  }

  /**
   * D-0083: explicit "the user touched this param" mark for the dais rail.
   * Needed for params that are NOT registry bindings (e.g. yaw) where
   * commitBinding throws and the adapter falls back to applyExternalPose.
   */
  markUserOwnedBinding(id: string): void {
    if (id && id !== "eye_openness") this.userOwnedBindings.add(id);
  }

  visibleControlIds(): string[] {
    return this.registry.ids();
  }

  /**
   * Book 004 AnimationPlan for a fallback microstate (demo targets via plan adapter).
   * Prefer authored plans in RUNTIME; this proves plan → GSAP path works.
   */
  playFallbackMicrostatePlan(id: MicrostateId, durationSeconds = 0.75) {
    const plan = GasperLivingRuntime.microstateToAnimationPlan(id, {
      durationSeconds,
    });
    return this.playAnimationPlan(plan);
  }

  /** Real React Dais inspection (not legacy candidate HTML). */
  inspectDais(extra?: {
    viewport?: GasperViewportController | null;
    bounds?: BoundsSnapshot | null;
    performance?: Record<string, number> | null;
  }) {
    return inspectDaisForController(this, extra);
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
