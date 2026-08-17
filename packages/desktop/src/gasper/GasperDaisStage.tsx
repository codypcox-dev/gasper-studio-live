/**
 * First-class Gasper Dais stage — packaged rig, embodiment-aware bounds/handles.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { mountGasperDocument, FORMMASTER_PAINT_REV } from "./GasperDocument";
import { GasperRigController } from "./GasperRigController";
import { GasperViewportController } from "./GasperViewportController";
import { assessComposedOrganismFrame } from "./GasperCompositionContract";
import { createCompositionWorldEnvelope } from "./GasperCompositionWorldEnvelope";
import { embodimentLocomotionClass } from "./behavior/EmbodimentLocomotion";
import { GasperDirectManipulation } from "./GasperDirectManipulation";
import {
  GasperVisualBoundsService,
  CONTENT_VIEWBOX,
  rectForFitIntent,
  fitCameraFromSafeBounds,
  CHARACTER_FIT_HEIGHT_FRACTION,
  type BoundsSnapshot,
  type FitIntent,
} from "./GasperVisualBounds";

/**
 * Facial-review mass floor for packaged owner-review surface (EA2-V006 / R3-DAIS-FRAMING).
 * Must meet daisReviewMode FACIAL_REVIEW_MIN_HEIGHT_FRACTION (0.62).
 * CHARACTER_FIT_HEIGHT_FRACTION (0.5) is a pre-host legacy target; we raise
 * the fit so character mass dominates the stage crop at a useful face scale.
 *
 * Floor stays at 0.62 (contract / prior structural tests). Actual character fit
 * prefers FACIAL_REVIEW_FIT_TARGET_HEIGHT_FRACTION (0.72) via fitCameraFromSafeBounds
 * so occupancy is owner-reviewable without clip-only CSS zoom.
 */
const FACIAL_REVIEW_FIT_HEIGHT_FRACTION = 0.62;
/** Elevated owner-review fit target — preferred when layout allows (R3-DAIS-FRAMING). */
const FACIAL_REVIEW_FIT_TARGET_HEIGHT_FRACTION = 0.72;
import {
  buildCompareSurfaceState,
  rectToEllipsePath,
  type CompareRenderMode,
} from "./GasperCompare";
import type { StageMode, StageTool } from "./GasperSelectionModel";
import {
  liveBoundsInputSignature,
  boundsSignatureChanged,
  livingPolicyForStageMode,
  shouldSampleHud,
  HUD_SAMPLE_MS,
} from "./GasperStageHotPath";
import { buildDaisInspectionReport } from "./GasperDaisInspection";
import {
  PRODUCTION_AUTHORITY_CLASS,
  PRODUCTION_AUTHORITY_ID,
} from "./renderer/productionAuthority";
import {
  assessFitReadiness,
  scheduleUntilReady,
} from "./GasperDaisLayoutReady";
import "./gasper-dais.css";

/**
 * Interaction chrome policy for the embedded Dais.
 * - full: lab/dev chrome (tools + stage modes on the stage itself)
 * - render-only: packaged Studio — WorldClass shell is sole interaction authority
 */
export type GasperDaisInteractionMode = "full" | "render-only";

export type GasperDaisStageProps = {
  controller: GasperRigController;
  className?: string;
  onReady?: () => void;
  onError?: (message: string) => void;
  /** Notify parent of timeline auto-open preference. */
  onTimelinePreferOpen?: (open: boolean) => void;
  /**
   * Packaged Studio must pass "render-only" (GASPER-007 DOPS-01).
   * Default "full" preserves SidekickStudioView / lab behavior.
   */
  interactionMode?: GasperDaisInteractionMode;
};

/**
 * Chromium filter regions make getBoundingClientRect() unusable for filtered
 * SVG organism geometry (it can report ~3.4e32 extents). Measure authored
 * geometry locally, then project its four corners through the actual screen CTM.
 * This includes world/facing/idle/viewport transforms but excludes filter infinity.
 */
function measureSvgGeometryScreenRect(el: SVGGraphicsElement | null) {
  if (!el) return null;
  try {
    const b = el.getBBox();
    const m = el.getScreenCTM();
    if (!m) return null;
    const project = (x: number, y: number) => ({
      x: m.a * x + m.c * y + m.e,
      y: m.b * x + m.d * y + m.f,
    });
    const pts = [
      project(b.x, b.y),
      project(b.x + b.width, b.y),
      project(b.x + b.width, b.y + b.height),
      project(b.x, b.y + b.height),
    ];
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;
    if (![x, y, width, height].every(Number.isFinite)) return null;
    return { x, y, width, height };
  } catch {
    return null;
  }
}
const TOOLS: Array<{ id: StageTool; label: string }> = [
  { id: "select", label: "Select" },
  { id: "form", label: "Form" },
  { id: "face", label: "Face" },
  { id: "motion", label: "Motion" },
  { id: "material", label: "Material" },
  { id: "light", label: "Light" },
  { id: "morph", label: "Morph" },
];

const MODES: Array<{ id: StageMode; label: string }> = [
  { id: "AUTHORING", label: "Author" },
  { id: "PREVIEW", label: "Preview" },
  { id: "RUNTIME", label: "Runtime" },
  { id: "COMPARE", label: "Compare" },
];

export function GasperDaisStage({
  controller,
  className,
  onReady,
  onError,
  onTimelinePreferOpen,
  interactionMode = "full",
}: GasperDaisStageProps) {
  const renderOnly = interactionMode === "render-only";
  const stageRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const viewport = useRef(new GasperViewportController()).current;
  const boundsSvc = useRef(new GasperVisualBoundsService()).current;
  const dm = useRef(new GasperDirectManipulation(controller)).current;
  const [sel, setSel] = useState(() => controller.selection.getState());
  const [vp, setVp] = useState(() => viewport.getState());
  const [bounds, setBounds] = useState<BoundsSnapshot | null>(null);
  const [liveValues, setLiveValues] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [compareMode, setCompareMode] = useState<CompareRenderMode>("ghost");
  const [splitPct, setSplitPct] = useState(50);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const [life, setLife] = useState(() => controller.livingStatus());
  /** Authoring stage overlay: safe-fit + visual bounds (Dispatch 002 truth). */
  const [showBoundsOverlay, setShowBoundsOverlay] = useState(false);
  const prevEmbodiment = useRef(controller.selection.getState().embodiment);
  const prevStageMode = useRef(controller.selection.getState().stageMode);
  const loopCameraSafetyApplied = useRef(false);
  const lastHudSampleMs = useRef(0);
  const lastBoundsSig = useRef("");
  const liveValuesRef = useRef<Record<string, number>>({});
  /**
   * GASPER-NORTHSTAR-001 — the production-monitor calibration basis. The
   * monitor calibration is a per-monitor, per-embodiment CONSTANT: it is
   * (re)computed only when the embodiment or the stage size changes, never
   * from the instantaneous morph geometry every frame.
   */
  const lastProductionCalibrationBasis = useRef<{
    emb: string;
    stageW: number;
    stageH: number;
  } | null>(null);

  const recomputeBoundsAndMaybeFit = useCallback(
    (opts?: { forceFit?: boolean; fitSource?: "automatic" | "user" }): boolean => {
      const stage = stageRef.current;
      if (!stage) return false;
      const live = controller.readLive();
      const emb = controller.selection.getState().embodiment;
      const faceIso = controller.selection.getState().faceIsolation;
      const tool = controller.selection.getState().tool;
      const residual = controller.getDomainState().dynamics.residual;
      const stageRect = stage.getBoundingClientRect();
      const living = controller.livingStatus();
      const loopCameraLocked =
        living.running &&
        living.eightStateLoop &&
        controller.selection.getState().stageMode === "PREVIEW";
      const automaticFitActive =
        viewport.autoFit && !loopCameraLocked && !renderOnly;
      // Never run authoritative Fit against zero/transient stage geometry
      const stageGate = assessFitReadiness(stageRect.width, stageRect.height, {
        width: 1,
        height: 1,
      });
      if (!stageGate.ok && (opts?.forceFit || automaticFitActive)) {
        return false;
      }
      // Cheap gate BEFORE getBBox / double recompute (Architect Review obj 1).
      // Include stageW/H so ResizeObserver / panel resize still Fit (obj 8).
      const cheapSig = liveBoundsInputSignature({
        embodimentId: emb,
        formWidth: live.overall_width,
        formHeight: live.overall_height,
        outerRadius: live.singularity_outer_radius,
        verticalCompression: live.singularity_vertical_compression,
        shellThickness: live.shell_thickness,
        spectralEnergy: live.spectral_energy_envelope,
        energyLevel: live.energy_level,
        orbitalPlaneScale: live.orbital_plane_scale,
        faceIsolation: faceIso,
        tool,
        residual,
        crownHeight: live.crown_height,
        stageW: stageRect.width,
        stageH: stageRect.height,
      });
      if (
        !opts?.forceFit &&
        lastBoundsSig.current &&
        !boundsSignatureChanged(lastBoundsSig.current, cheapSig)
      ) {
        return true; // blink/gaze/pulse-only frames: skip full bounds work
      }
      lastBoundsSig.current = cheapSig;

      const handles = dm.handlesForTool(tool, emb, {
        faceIsolation: faceIso,
      });
      const measured = controller.measureContentGeometry();
      const boundsInput = {
        embodimentId: emb,
        formWidth: live.overall_width,
        formHeight: live.overall_height,
        crownHeight: live.crown_height,
        energyLevel: live.energy_level,
        reliefAmplitude: live.relief_amplitude,
        outerRadius: live.singularity_outer_radius,
        verticalCompression: live.singularity_vertical_compression,
        spectralEnergy: live.spectral_energy_envelope,
        orbitalPlaneScale: live.orbital_plane_scale,
        horizonRadius: live.horizon_radius,
        shellThickness: live.shell_thickness,
        centerOfMassY: live.center_of_mass_y,
        faceIsolation: faceIso,
        measuredGeometry: measured,
        measuredAlreadyHostScaled: !!measured,
        lowerBodyFullness: live.lower_body_fullness,
        groundFlattening: live.ground_flattening,
        residual,
        horizonVerticalPosition: live.horizon_vertical_position,
      };
      const prelim = boundsSvc.recompute(boundsInput);
      const placed = dm.placeHandles(handles, prelim.manipulation);
      const snap = boundsSvc.recompute({
        ...boundsInput,
        handlePoints: placed.map((h) => ({
          x: h.contentX,
          y: h.contentY,
        })),
      });
      setBounds(snap);
      viewport.setStageSize(stageRect.width, stageRect.height);

      // GASPER-COMPOSITION-001 Wave 1.2: editor Fit and production framing
      // share one measured bounds source but have different occupancy targets.
      // The production monitor uses the canonical 0.50 character-fit target
      // and the full safe envelope; it is stored only and never moves the
      // editor camera. Once a performance begins, the camera is fixed.
      //
      // GASPER-NORTHSTAR-001 — the calibration is frozen to a BASIS (embodiment
      // + stage size). Recomputing it from the instantaneous morph geometry
      // every frame made the STORED calibration drift with breath/squash/state
      // levers, and lockPerformanceCamera re-applied the drifted value at every
      // pack/pose lock entry — a ±5 % camera zoom snap inside the "fixed"
      // monitor (validateCameraFixity violation, seen in the ns1-t2 take).
      // Freezing it gives every performance lock the same stable framing and
      // keeps the room (envelope) the physics kernel sees constant per show.
      const productionCam = fitCameraFromSafeBounds(
        stageRect.width,
        stageRect.height,
        snap.safeFit,
        {
          targetHeightFraction: CHARACTER_FIT_HEIGHT_FRACTION,
          massHeight: snap.geometry?.height,
        },
      );
      const basis = lastProductionCalibrationBasis.current;
      // GASPER-NORTHSTAR-001 — rest-class state forms (singularity,
      // dormant-orbit) are the SAME organism at rest: they compose INSIDE the
      // active organism's calibrated production view and never reframe the
      // camera (the N44 "scale excursions" were depth + live-calibration
      // drift, not the rest morph itself). Only genuine active-organism
      // changes (or a monitor resize) recalibrate.
      const restForm = embodimentLocomotionClass(emb) === "rest";
      const calibrationBasisChanged =
        !basis ||
        Math.abs(basis.stageW - stageRect.width) > 1 ||
        Math.abs(basis.stageH - stageRect.height) > 1 ||
        (basis.emb !== emb && !restForm);
      const vpState = viewport.getState?.() ?? {};
      // A filmed 100% world frame must not inherit the 226% production room.
      // That envelope pins travel near x=369 and turns a stroll into a statue.
      if (vpState.cinematicLocked || vpState.userCameraOwned || vpState.userWorldFrameHeld) {
        controller.setCompositionWorldEnvelope(null);
      } else if (calibrationBasisChanged) {
        if (!productionCam.invalid) {
          viewport.setProductionCameraCalibration(
            productionCam.zoom,
            productionCam.panX,
            productionCam.panY,
            productionCam.fitPercent,
          );
          // Wave 1.3B: publish the renderable world envelope from the SAME
          // measured geometry + fixed production camera. Conceptual WorldSpace
          // remains unchanged; every world-pose writer is fenced in the controller.
          controller.setCompositionWorldEnvelope(
            createCompositionWorldEnvelope({
              stageWidth: stageRect.width,
              stageHeight: stageRect.height,
              cameraZoom: productionCam.zoom,
              cameraPanX: productionCam.panX,
              cameraPanY: productionCam.panY,
              safeFit: snap.safeFit,
              geometry: snap.geometry,
            }),
          );
          // GASPER-NORTHSTAR-001 — the production monitor IS the camera: in
          // render-only mode the stored calibration is applied immediately, so
          // the surface opens at the calibrated framing instead of an arbitrary
          // editor fit result, and reframes deliberately per embodiment (never
          // chasing the body). No-op while a performance lock holds.
          if (renderOnly) viewport.applyProductionCameraCalibration();
          lastProductionCalibrationBasis.current = {
            emb,
            stageW: stageRect.width,
            stageH: stageRect.height,
          };
        } else {
          controller.setCompositionWorldEnvelope(null);
        }
      }

      const frameHeld = !!(vpState.userWorldFrameHeld || vpState.cinematicLocked);
      if ((opts?.forceFit || automaticFitActive) && !frameHeld) {
        // Wave R5: Character Fit by default (mass geometry), not full effects envelope
        const intent: FitIntent =
          viewport.fitIntent === "world-100"
            ? "character"
            : (viewport.fitIntent as FitIntent);
        const fitRect = rectForFitIntent(snap, intent);
        const contentGate = assessFitReadiness(
          stageRect.width,
          stageRect.height,
          fitRect,
        );
        if (!contentGate.ok) {
          return false;
        }
        // Character Fit: land mass ≥ facial-review floor (0.62) and prefer
        // elevated target (0.72) for owner-reviewable facial scale.
        // fitCameraFromSafeBounds remains authoritative — no clip-only zoom.
        // Effects Fit: fill stage with envelope (no targetHeightFraction).
        const characterFit =
          intent === "character" || intent === "character-handles";
        if (characterFit) {
          const targetFrac = Math.max(
            CHARACTER_FIT_HEIGHT_FRACTION,
            FACIAL_REVIEW_FIT_HEIGHT_FRACTION,
            FACIAL_REVIEW_FIT_TARGET_HEIGHT_FRACTION,
          );
          const cam = fitCameraFromSafeBounds(
            stageRect.width,
            stageRect.height,
            fitRect,
            {
              targetHeightFraction: targetFrac,
              massHeight: snap.geometry?.height,
            },
          );
          if (cam.invalid) {
            return false;
          }
          viewport.setStageSize(stageRect.width, stageRect.height);
          // GASPER-COMPOSITION-001: machine editor Fit and explicit
          // user Fit are different camera authorities. Only the user path may
          // become the performance camera.
          if (opts?.fitSource === "user") {
            viewport.applyFitCamera(cam.zoom, cam.panX, cam.panY, cam.fitPercent);
          } else {
            viewport.applyAutomaticFitCamera(
              cam.zoom,
              cam.panX,
              cam.panY,
              cam.fitPercent,
            );
          }
          if (!viewport.isPerformanceCameraLocked() && !frameHeld) {
            viewport.setAutoFit(true); // emit subscribers with character-scale camera
          }
        } else if (opts?.fitSource === "user") {
          viewport.fitToSafeBounds(stageRect.width, stageRect.height, fitRect);
        } else {
          viewport.fitToSafeBoundsAutomatic(
            stageRect.width,
            stageRect.height,
            fitRect,
          );
        }
        setVp(viewport.getState());
        return true;
      }
      viewport.updateClipped(loopCameraLocked ? null : snap.visual);
      setVp(viewport.getState());
      return true;
    },
    [boundsSvc, controller, dm, viewport, renderOnly],
  );

  // Mount the packaged document once — Fit only after complete nonzero layout
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let cancelLayout: (() => void) | undefined;
    let readyFired = false;
    try {
      const mount = mountGasperDocument(el);
      controller.attach(mount);
      // Additive living on all product mounts. FormMaster path filters to
      // LEGACY_LIVING_SAFE_KEYS inside GasperRigController (no topology rewrite).
      try {
        const mode = controller.selection.getState().stageMode;
        const policy = livingPolicyForStageMode(mode);
        controller.setOpticalMode(
          mode === "PREVIEW" || mode === "RUNTIME"
            ? "runtime-beauty"
            : "authoring-neutral",
        );
        controller.startLiving({
          autoSequence: renderOnly ? false : policy.autoSequence,
          restrainedIdle: renderOnly ? false : policy.restrainedIdle,
          forceInterrupt: false,
          eightStateLoop: renderOnly ? false : policy.eightStateLoop,
          timingScale: 1,
          seed: 1005,
        });
      } catch (e) {
        console.warn("[GasperDaisStage] living runtime", e);
      }
      // Authority identity is derived from the executor returned by the mount.
      // The Dais may mirror that truth, but it may not promote a lab candidate.
      el.setAttribute("data-gasper-authority", mount.authorityClass);
      el.setAttribute("data-gasper-renderer", mount.authorityId);
      el.setAttribute("data-gasper-geometry-executor", mount.geometryExecutor);
      // Production is sealed only when the mount agrees with the canonical
      // authority constants. This prevents a renderer from self-labeling as
      // packaged production merely by setting productionPath.
      const productionAuthoritySeal =
        mount.productionPath &&
        mount.authorityClass === PRODUCTION_AUTHORITY_CLASS &&
        mount.authorityId === PRODUCTION_AUTHORITY_ID &&
        mount.geometryExecutor === "form-master";
      if (productionAuthoritySeal) {
        el.setAttribute("data-gasper-production", "1");
        el.removeAttribute("data-gasper-production-forbidden");
      } else {
        el.removeAttribute("data-gasper-production");
        el.setAttribute("data-gasper-production-forbidden", "1");
      }
      if (mount.labOnly) {
        el.setAttribute("data-gasper-lab-only", "1");
      } else {
        el.removeAttribute("data-gasper-lab-only");
      }
      if (mount.legacyFormMaster) {
        el.setAttribute("data-gasper-legacy-authority", "1");
        // DOPS-01B: FormMaster owns face fixture; keep only subtle ambient motion.
        // High motion (0.45+) plus eight-state mouth endpoints previously drove
        // open-grin flicker under 60fps review of neutral-settled.
        try {
          try {
            mount.rig.setFixtureImmediate?.("neutral-settled");
          } catch {
            mount.rig.setFixture?.("neutral-settled");
          }
          mount.rig.setPaused?.(false);
          mount.rig.setMotion?.(0.22);
          mount.rig.requestOneFrame?.();
        } catch {
          /* */
        }
      } else {
        el.removeAttribute("data-gasper-legacy-authority");
      }
      // Inspection surface for real React Dais (not legacy candidate)
      const api = controller as GasperRigController & {
        inspectDais?: () => unknown;
        getViewport?: () => GasperViewportController;
      };
      api.getViewport = () => viewport;
      api.inspectDais = () =>
        buildDaisInspectionReport({
          controller,
          viewport,
          bounds: boundsSvc.getSnapshot(),
        });
      (
        window as unknown as {
          __GASPER_DAIS__?: GasperRigController;
          __GASPER_MOUNT_NATIVE__?: (el: HTMLElement) => unknown;
          __GASPER_MOUNT_LEGACY__?: (el: HTMLElement) => unknown;
        }
      ).__GASPER_DAIS__ = controller;
      // Dual-renderer lab hooks (developer / CDP only — not product UI)
      void import("./GasperDocument").then((mod) => {
        const w = window as unknown as {
          __GASPER_MOUNT_NATIVE__?: (el: HTMLElement) => unknown;
          __GASPER_MOUNT_LEGACY__?: (el: HTMLElement) => unknown;
        };
        w.__GASPER_MOUNT_NATIVE__ = (el: HTMLElement) =>
          mod.mountGasperDocumentNativeCandidate(el);
        w.__GASPER_MOUNT_LEGACY__ = (el: HTMLElement) =>
          mod.mountGasperDocumentLegacyFormMaster(el);
      });
      setError(null);
      setLife(controller.livingStatus());

      const markReady = () => {
        if (readyFired) return;
        readyFired = true;
        setReady(true);
        onReady?.();
      };

      // 1 mount SVG → 2 wait complete layout → 3 nonzero stage → 4 bbox → 5 fit → 6 ready
      cancelLayout = scheduleUntilReady(
        () => {
          const stage = stageRef.current;
          if (!stage) return false;
          const r = stage.getBoundingClientRect();
          if (!assessFitReadiness(r.width, r.height, { width: 1, height: 1 }).ok) {
            return false;
          }
          return recomputeBoundsAndMaybeFit({ forceFit: true });
        },
        () => markReady(),
        {
          onGiveUp: () => {
            // Still expose mount for debugging, but keep Fit honest (not fake 25%)
            console.warn(
              "[GasperDaisStage] layout fit not ready after bounded retries",
            );
            markReady();
            recomputeBoundsAndMaybeFit({ forceFit: true });
          },
        },
      );

      return () => {
        cancelLayout?.();
        controller.stopLiving();
        controller.detach();
      };
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      onError?.(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [FORMMASTER_PAINT_REV]);

  useEffect(() => {
    const unsub = controller.selection.subscribe((s) => {
      setSel(s);
      // Mode policy changes only when stage mode changes. Loop-driven embodiment
      // and expression selection updates must not restart transport each hold.
      const modeChanged = s.stageMode !== prevStageMode.current;
      prevStageMode.current = s.stageMode;
      if (modeChanged) {
        const policy = livingPolicyForStageMode(s.stageMode);
        controller.setOpticalMode(
          s.stageMode === "PREVIEW" || s.stageMode === "RUNTIME"
            ? "runtime-beauty"
            : "authoring-neutral",
        );
        controller.startLiving({
          autoSequence: renderOnly ? false : policy.autoSequence,
          restrainedIdle: renderOnly ? false : policy.restrainedIdle,
          forceInterrupt: false,
          eightStateLoop: renderOnly ? false : policy.eightStateLoop,
          timingScale: 1,
          seed: 1005,
        });
      }
      // Timeline preference by tool/mode
      const openTimeline =
        s.tool === "motion" ||
        s.tool === "morph" ||
        s.stageMode === "PREVIEW" ||
        s.stageMode === "RUNTIME";
      onTimelinePreferOpen?.(openTimeline);
      // Resting-loop embodiment changes must not make the camera chase each
      // silhouette. Initial/manual Fit remains available via forceFit.
      const embChanged = s.embodiment !== prevEmbodiment.current;
      prevEmbodiment.current = s.embodiment;
      const living = controller.livingStatus();
      const loopCameraLocked =
        living.running && living.eightStateLoop && s.stageMode === "PREVIEW";
      // GASPER-NORTHSTAR-001 — the production monitor is never touched by the
      // editor loop-camera safety; only the render-only surface's own
      // calibration authority may frame it.
      if (loopCameraLocked && !renderOnly && !loopCameraSafetyApplied.current) {
        loopCameraSafetyApplied.current = true;
        const schedule =
          typeof requestAnimationFrame === "function"
            ? requestAnimationFrame
            : ((cb: FrameRequestCallback) =>
                setTimeout(() => cb(Date.now()), 0) as unknown as number);
        schedule(() => {
          // GASPER-CRAFT-002 · S3 (Doctrine 1): machine framing is forbidden
          // while a performance camera lock holds — defer the safety pass.
          if (viewport.isPerformanceCameraLocked()) return;
          recomputeBoundsAndMaybeFit({ forceFit: true });
          viewport.applyFitSafetyScale(0.82);
          recomputeBoundsAndMaybeFit();
        });
      } else if (!loopCameraLocked) {
        loopCameraSafetyApplied.current = false;
      }
      const heldFrame =
        typeof viewport.isUserWorldFrameHeld === "function" &&
        viewport.isUserWorldFrameHeld();
      recomputeBoundsAndMaybeFit(
        embChanged && viewport.autoFit && !loopCameraLocked && !renderOnly && !heldFrame
          ? { forceFit: true }
          : undefined,
      );
    });
    return () => {
      unsub();
    };
  }, [controller, onTimelinePreferOpen, recomputeBoundsAndMaybeFit, viewport]);

  useEffect(() => {
    const unsub = viewport.subscribe(() => setVp(viewport.getState()));
    return () => {
      unsub();
    };
  }, [viewport]);

  // Continuous GSAP frames: flush stays continuous; bounds gated by live signature;
  // HUD sampled at HUD_SAMPLE_MS — no force-render per frame.
  useEffect(() => {
    const unsub = controller.subscribe(() => {
      // GASPER-CRAFT-002 · S3 (D-0099 Doctrine 1) — CAMERA FIXITY. The
      // viewport IS the monitor: while a pack performs (or any provenanced
      // world pose is in flight) the machine never touches zoom/pan — the
      // retired Phase A world-follow and C2 shot-direction framing are gone.
      // Every shot scale comes from Gasper's authored position + depth
      // (worldRig projection inside content space — the S2 depth law). The
      // lock suspends Auto Fit and every machine framing path for the
      // duration; on release the pre-performance framing is restored unless
      // the user took over (the Book 005 §15.2 dial is untouched and
      // outranks the machine). Capture gate: validateCameraFixity —
      // zoom delta ≡ 0 across any performance.
      {
        const packRunning = !!controller.getPerformancePackState()?.running;
        const appliedWorld = controller.getWorldPoseApplied();
        const poseInFlight =
          !!appliedWorld && appliedWorld.target.provenance !== "none";
        const held =
          (typeof viewport.isUserWorldFrameHeld === "function" &&
            viewport.isUserWorldFrameHeld()) ||
          (typeof viewport.isCinematicCamera === "function" &&
            viewport.isCinematicCamera());
        if (packRunning || poseInFlight) {
          if (!held) viewport.lockPerformanceCamera();
        } else if (viewport.isPerformanceCameraLocked() && !held) {
          viewport.releasePerformanceCamera();
        }
      }
      const live = controller.readLive();
      liveValuesRef.current = live;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      // Early-exit inside when live input signature unchanged (no getBBox)
      recomputeBoundsAndMaybeFit();
      if (shouldSampleHud(now, lastHudSampleMs.current, HUD_SAMPLE_MS)) {
        lastHudSampleMs.current = now;
        setLiveValues(live);
        setLife(controller.livingStatus());

        // GASPER-COMPOSITION-001 · Wave 1.3A — DOM-LAST observer. Judge the
        // production body after every camera/world/facing/deformation transform.
        // Observer only: no camera move and no pose correction happens here.
        const stage = stageRef.current;
        const svg = controller.getMount()?.svgRoot ?? null;
        const bodyEl =
          (svg?.querySelector("#body") as SVGGraphicsElement | null) ??
          (svg?.querySelector("#shellBaseLayer") as SVGGraphicsElement | null);
        const faceEl = svg?.querySelector("#faceRecessLayer") as SVGGraphicsElement | null;
        if (stage) {
          const stageRect = stage.getBoundingClientRect();
          const report = assessComposedOrganismFrame(
            {
              x: stageRect.x,
              y: stageRect.y,
              width: stageRect.width,
              height: stageRect.height,
            },
            measureSvgGeometryScreenRect(bodyEl),
            measureSvgGeometryScreenRect(faceEl),
          );
          stage.dataset.compositionSafe = report.ok ? "1" : "0";
          stage.dataset.compositionViolations = report.violations.join(",");
          stage.dataset.compositionWidth = report.widthFraction.toFixed(4);
          stage.dataset.compositionHeight = report.heightFraction.toFixed(4);
          stage.dataset.compositionAspect = report.aspectRatio.toFixed(4);
          stage.dataset.compositionLeft = report.leftFraction.toFixed(4);
          stage.dataset.compositionRight = report.rightFraction.toFixed(4);
          stage.dataset.compositionTop = report.topFraction.toFixed(4);
          stage.dataset.compositionBottom = report.bottomFraction.toFixed(4);
          stage.dataset.compositionFaceOverlap =
            report.faceOverlapFraction == null
              ? "na"
              : report.faceOverlapFraction.toFixed(4);
          stage.dataset.compositionWorldTransform =
            svg?.querySelector("#worldRig")?.getAttribute("transform") ?? "none";
        }
      }
    });
    return () => {
      unsub();
    };
  }, [controller, recomputeBoundsAndMaybeFit]);

  // ResizeObserver — stage + parent (panel / timeline open-close)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      recomputeBoundsAndMaybeFit();
    });
    ro.observe(stage);
    const parent = stage.parentElement;
    if (parent) ro.observe(parent);
    return () => ro.disconnect();
  }, [recomputeBoundsAndMaybeFit]);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    node.style.transform = viewport.contentTransform();
  }, [vp, viewport]);

  // Keep mixer Face Isolation in sync if selection is set without controller helper.
  useEffect(() => {
    if (!ready) return;
    // setFaceIsolation is idempotent for selection; always re-flush aids through mixer
    controller.setFaceIsolation(sel.faceIsolation);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when flag / ready flip
  }, [sel.faceIsolation, ready]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      viewport.zoomAt(e.clientX, e.clientY, e.deltaY, stage.getBoundingClientRect());
      if (bounds) viewport.updateClipped(bounds.visual);
      setVp(viewport.getState());
    },
    [viewport, bounds],
  );

  const placedHandles = useMemo(() => {
    if (!bounds) return [];
    const handles = dm.handlesForTool(sel.tool, sel.embodiment, {
      faceIsolation: sel.faceIsolation,
    });
    return dm.placeHandles(handles, bounds.manipulation);
  }, [bounds, dm, sel.tool, sel.embodiment, sel.faceIsolation]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || spaceDown) {
        panRef.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;
      const handleEl = (e.target as HTMLElement).closest?.(
        "[data-handle-id]",
      ) as HTMLElement | null;
      if (handleEl) {
        const id = handleEl.dataset.handleId!;
        const handle = placedHandles.find((h) => h.id === id);
        if (handle) {
          dm.begin(handle, e.clientX, e.clientY, {
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
          });
          handleEl.setPointerCapture(e.pointerId);
          e.preventDefault();
        }
      }
    },
    [dm, spaceDown, placedHandles],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panRef.current) {
        viewport.panBy(e.clientX - panRef.current.x, e.clientY - panRef.current.y);
        panRef.current = { x: e.clientX, y: e.clientY };
        if (bounds) viewport.updateClipped(bounds.visual);
        setVp(viewport.getState());
        return;
      }
      if (dm.active) {
        dm.move(e.clientX, e.clientY);
        setLiveValues(controller.readLive());
      }
    },
    [controller, dm, viewport, bounds],
  );

  const onPointerUp = useCallback(() => {
    if (panRef.current) {
      panRef.current = null;
      return;
    }
    if (dm.active) {
      dm.commit();
      setLiveValues(controller.readLive());
      recomputeBoundsAndMaybeFit();
    }
  }, [controller, dm, recomputeBoundsAndMaybeFit]);

  const onDoubleClick = useCallback(() => {
    recomputeBoundsAndMaybeFit({ forceFit: true, fitSource: "user" });
  }, [recomputeBoundsAndMaybeFit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (e.type === "keydown") setSpaceDown(true);
        else setSpaceDown(false);
        if (
          e.target === document.body ||
          (e.target as HTMLElement)?.closest?.(".gasper-dais")
        ) {
          e.preventDefault();
        }
      }
      if (e.key === "Escape" && dm.active) {
        dm.cancel();
        setLiveValues(controller.readLive());
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [controller, dm]);

  /** Real Compare surface state from stage mode API (shared with unit tests). */
  const compareSurface = useMemo(
    () =>
      buildCompareSurfaceState({
        stageMode: sel.stageMode,
        baseline: sel.compareBaseline,
        current: liveValues,
        embodimentId: sel.embodiment,
        selectedBindingId: sel.selectedRegion,
        renderMode: compareMode,
      }),
    [
      sel.stageMode,
      sel.compareBaseline,
      liveValues,
      sel.embodiment,
      sel.selectedRegion,
      compareMode,
    ],
  );
  const compareReport = compareSurface.report;
  const compareActive = compareSurface.active;
  const compareSil = compareSurface.silhouettes;

  /** Host markup clone at baseline values — real character ghost when mounted. */
  const [baselineGhostHtml, setBaselineGhostHtml] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!compareActive || !sel.compareBaseline || !ready) {
      setBaselineGhostHtml(null);
      return;
    }
    try {
      const html = controller.captureHostMarkup(sel.compareBaseline);
      setBaselineGhostHtml(html);
    } catch {
      setBaselineGhostHtml(null);
    }
  }, [compareActive, sel.compareBaseline, controller, ready, sel.embodiment]);

  // GASPER-007-F: authoring form handles only — never in PREVIEW/RUNTIME (detached
  // purple knobs were product-visible while camera/tool did not own them).
  const showHandles =
    sel.stageMode === "AUTHORING" &&
    (sel.tool === "form" ||
      sel.tool === "face" ||
      sel.tool === "light" ||
      sel.tool === "material" ||
      sel.faceIsolation);

  // Map content-space handle → screen via camera
  const stageW = stageRef.current?.clientWidth || 800;
  const stageH = stageRef.current?.clientHeight || 600;
  const ox = CONTENT_VIEWBOX.width / 2;
  const oy = CONTENT_VIEWBOX.height / 2;

  return (
    <section
      className={`gasper-dais ${className || ""}`}
      data-testid="gasper-dais"
      data-stage-mode={sel.stageMode}
      data-embodiment={sel.embodiment}
      data-iframe="false"
      data-face-isolation={sel.faceIsolation ? "1" : "0"}
      data-compare-active={compareActive ? "1" : "0"}
      data-auto-fit={vp.autoFit ? "1" : "0"}
      data-clipped={vp.clipped ? "1" : "0"}
      data-interaction-mode={interactionMode}
      data-render-only={renderOnly ? "1" : "0"}
      ref={stageRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        if (dm.active) dm.cancel();
        panRef.current = null;
      }}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* GASPER-PHYSICS-001 · D-0112 black room (owner law N5): no scenery —
          the retired dais decorations (radial vignette, CSS light pool, guide
          ring) lived here. The environment is a pure black room; the floor
          reads from Gasper's own motivated light + penumbra drop shadow. */}
      <div
        className="gasper-dais-content"
        ref={contentRef}
        data-testid="gasper-rig-mount"
      />

      {/* Compare surfaces — only when active; dual-state baseline vs current */}
      {compareActive && compareSil && (
        <div
          className={`gasper-compare gasper-compare-${compareMode}`}
          data-testid="gasper-compare"
          data-compare-mode={compareMode}
        >
          {/* Baseline character ghost (host markup at pinned bindings) */}
          {(compareMode === "ghost" || compareMode === "split") &&
            baselineGhostHtml && (
              <div
                className="gasper-compare-ghost-host"
                data-testid="gasper-compare-ghost"
                data-compare-state="baseline"
                style={{
                  opacity: compareMode === "ghost" ? 0.38 : 0.55,
                  clipPath:
                    compareMode === "split"
                      ? `inset(0 ${100 - splitPct}% 0 0)`
                      : undefined,
                  transform: viewport.contentTransform(),
                  transformOrigin: "center center",
                }}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: baselineGhostHtml }}
              />
            )}
          {/* Fallback dual silhouettes from same bounds service as Fit */}
          <svg
            className="gasper-compare-contour"
            data-testid="gasper-compare-contour"
            viewBox={`0 0 ${stageW} ${stageH}`}
            width={stageW}
            height={stageH}
          >
            {(() => {
              const mapRect = (r: {
                x: number;
                y: number;
                width: number;
                height: number;
              }) => ({
                x: stageW / 2 + vp.panX + (r.x - ox) * vp.zoom,
                y: stageH / 2 + vp.panY + (r.y - oy) * vp.zoom,
                w: r.width * vp.zoom,
                h: r.height * vp.zoom,
              });
              const b = mapRect(compareSil.baselineGeometry);
              const c = mapRect(compareSil.currentGeometry);
              const showBase =
                compareMode === "ghost" ||
                compareMode === "contour" ||
                compareMode === "split";
              const showCur =
                compareMode === "contour" || compareMode === "ghost";
              return (
                <>
                  {showBase && (
                    <ellipse
                      data-compare-state="baseline"
                      cx={b.x + b.w / 2}
                      cy={b.y + b.h / 2}
                      rx={b.w / 2}
                      ry={b.h / 2}
                      fill={
                        compareMode === "ghost"
                          ? "rgba(168,130,255,0.12)"
                          : "none"
                      }
                      stroke="rgba(168,130,255,0.75)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  )}
                  {showCur && (
                    <ellipse
                      data-compare-state="current"
                      cx={c.x + c.w / 2}
                      cy={c.y + c.h / 2}
                      rx={c.w / 2}
                      ry={c.h / 2}
                      fill="none"
                      stroke="rgba(61,207,239,0.9)"
                      strokeWidth={2}
                    />
                  )}
                  {compareMode === "contour" && (
                    <>
                      <path
                        data-testid="compare-baseline-path"
                        d={rectToEllipsePath(compareSil.baselineGeometry)}
                        fill="none"
                        stroke="transparent"
                        transform={`translate(${stageW / 2 + vp.panX}, ${stageH / 2 + vp.panY}) scale(${vp.zoom}) translate(${-ox}, ${-oy})`}
                      />
                      <path
                        data-testid="compare-current-path"
                        d={rectToEllipsePath(compareSil.currentGeometry)}
                        fill="none"
                        stroke="transparent"
                        transform={`translate(${stageW / 2 + vp.panX}, ${stageH / 2 + vp.panY}) scale(${vp.zoom}) translate(${-ox}, ${-oy})`}
                      />
                    </>
                  )}
                  {compareMode === "split" && (
                    <line
                      data-testid="gasper-compare-wipe"
                      x1={(stageW * splitPct) / 100}
                      y1={0}
                      x2={(stageW * splitPct) / 100}
                      y2={stageH}
                      stroke="rgba(61,207,239,0.85)"
                      strokeWidth={2}
                    />
                  )}
                </>
              );
            })()}
          </svg>
          <div className="gasper-compare-hud" data-testid="gasper-compare-hud">
            <span data-testid="compare-baseline-label">
              {compareReport.baselineLabel}
            </span>
            <span className="sep">vs</span>
            <span data-testid="compare-current-label">
              {compareReport.currentLabel}
            </span>
            <span className="mono" data-testid="compare-changed-count">
              {compareReport.changedCount} changed
            </span>
            {compareReport.selectedDelta && (
              <span
                className="mono delta"
                data-testid="compare-selected-delta"
              >
                {compareReport.selectedDelta.bindingId}:{" "}
                {compareReport.selectedDelta.delta >= 0 ? "+" : ""}
                {compareReport.selectedDelta.delta.toFixed(3)}
              </span>
            )}
            <div className="gasper-compare-modes">
              {(["ghost", "split", "contour"] as CompareRenderMode[]).map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    className={compareMode === m ? "active" : ""}
                    data-compare-render={m}
                    onClick={() => setCompareMode(m)}
                  >
                    {m}
                  </button>
                ),
              )}
            </div>
            {compareMode === "split" && (
              <input
                type="range"
                min={10}
                max={90}
                value={splitPct}
                onChange={(e) => setSplitPct(Number(e.target.value))}
                aria-label="Compare wipe"
              />
            )}
          </div>
        </div>
      )}

      {/* Handles from live bounds — DOPS-01A roving keyboard focus */}
      {ready && showHandles && (
        <div
          className="gasper-handles"
          data-testid="gasper-handles"
          role="toolbar"
          aria-label="Stage form handles"
        >
          {placedHandles.map((h, index) => {
            const left =
              stageW / 2 + vp.panX + ((h.contentX ?? 0) - ox) * vp.zoom;
            const top =
              stageH / 2 + vp.panY + ((h.contentY ?? 0) - oy) * vp.zoom;
            // Skip handles projected fully outside the stage viewport from tab order.
            const offStage =
              left < -16 ||
              top < -16 ||
              left > stageW + 16 ||
              top > stageH + 16;
            const isActive = dm.active?.handleId === h.id;
            // Roving tabindex: active handle, else first on-stage handle.
            const firstOnStageIdx = placedHandles.findIndex((ph) => {
              const pl =
                stageW / 2 + vp.panX + ((ph.contentX ?? 0) - ox) * vp.zoom;
              const pt =
                stageH / 2 + vp.panY + ((ph.contentY ?? 0) - oy) * vp.zoom;
              return !(pl < -16 || pt < -16 || pl > stageW + 16 || pt > stageH + 16);
            });
            const activeIdx = placedHandles.findIndex(
              (ph) => ph.id === dm.active?.handleId,
            );
            const tabStopIdx = activeIdx >= 0 ? activeIdx : firstOnStageIdx;
            const isTabStop = !offStage && index === tabStopIdx;
            const value = liveValues[h.bindingId] ?? 0;
            const ariaName = `${h.label} handle, binding ${h.bindingId}, value ${value.toFixed(3)}`;
            // Off-stage handles: do not paint (mis-projected purple knobs).
            if (offStage) return null;
            return (
              <button
                key={h.id}
                type="button"
                tabIndex={isTabStop ? 0 : -1}
                className={`gasper-handle${isActive ? " active" : ""}`}
                data-handle-id={h.id}
                data-binding={h.bindingId}
                data-embodiment-handle={sel.embodiment}
                data-off-stage="0"
                aria-label={ariaName}
                style={{ left, top }}
                title={ariaName}
                onKeyDown={(e) => {
                  if (offStage) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    controller.selection.setSelectedRegion(h.bindingId);
                    (e.currentTarget as HTMLButtonElement).focus();
                    return;
                  }
                  if (
                    e.key !== "ArrowLeft" &&
                    e.key !== "ArrowRight" &&
                    e.key !== "ArrowUp" &&
                    e.key !== "ArrowDown"
                  ) {
                    return;
                  }
                  e.preventDefault();
                  const onStage = placedHandles
                    .map((ph, i) => {
                      const pl =
                        stageW / 2 +
                        vp.panX +
                        ((ph.contentX ?? 0) - ox) * vp.zoom;
                      const pt =
                        stageH / 2 +
                        vp.panY +
                        ((ph.contentY ?? 0) - oy) * vp.zoom;
                      const off =
                        pl < -16 || pt < -16 || pl > stageW + 16 || pt > stageH + 16;
                      return { ph, i, off };
                    })
                    .filter((x) => !x.off);
                  if (onStage.length === 0) return;
                  const cur = Math.max(
                    0,
                    onStage.findIndex((x) => x.ph.id === h.id),
                  );
                  const delta =
                    e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
                  const next =
                    onStage[(cur + delta + onStage.length) % onStage.length]!;
                  requestAnimationFrame(() => {
                    const el = document.querySelector(
                      `[data-handle-id="${next.ph.id}"]`,
                    ) as HTMLButtonElement | null;
                    el?.focus();
                  });
                }}
              >
                <span className="gasper-handle-knob" />
                {isActive && (
                  <span className="gasper-handle-value">
                    {value.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Face isolation bounds */}
      {sel.faceIsolation && bounds && (
        <div
          className="gasper-face-iso-frame"
          data-testid="gasper-face-isolation"
          style={{
            left:
              stageW / 2 +
              vp.panX +
              (bounds.geometry.x + bounds.geometry.width * 0.25 - ox) *
                vp.zoom,
            top:
              stageH / 2 +
              vp.panY +
              (bounds.geometry.y + bounds.geometry.height * 0.28 - oy) *
                vp.zoom,
            width: bounds.geometry.width * 0.5 * vp.zoom,
            height: bounds.geometry.height * 0.35 * vp.zoom,
          }}
        />
      )}

      {/* Stage HUD — single mode readout */}
      <div className="gasper-hud" data-testid="gasper-hud">
        <span className="gasper-hud-mode" data-stage-mode={sel.stageMode}>
          {sel.stageMode}
        </span>
        <span className="gasper-hud-chip">
          <i className="live-dot" />
          {sel.embodiment}
        </span>
        <span className="gasper-hud-chip muted">{sel.expression}</span>
        <span
          className="gasper-hud-chip mono"
          data-testid="zoom-readout"
          data-clipped={vp.clipped ? "1" : "0"}
          data-world-100={viewport.isWorldScale100() ? "1" : "0"}
          data-auto-fit={vp.autoFit ? "1" : "0"}
          data-fit-percent={vp.lastFitPercent ?? ""}
          title={
            vp.lastFitPercent != null
              ? `Fit was ${vp.lastFitPercent}% · World 100% = scale 1 · range 25–400%`
              : "World 100% = scale 1 · range 25–400%"
          }
        >
          {viewport.displayZoomPercent()}%
          {vp.autoFit && vp.lastFitPercent != null
            ? ` · Fit ${vp.lastFitPercent}%`
            : ""}
          {viewport.clippedHudSuffix()}
        </span>
        {sel.faceIsolation && (
          <span className="gasper-hud-chip" data-testid="face-iso-badge">
            Face Isolation
          </span>
        )}
        {life.running && (
          <span
            className="gasper-hud-chip mono"
            data-testid="living-microstate"
            data-living="1"
            data-microstate={life.microstate}
            data-interrupt-count={life.interruptCount}
            title="GSAP living runtime (Dispatch 001)"
          >
            <i className="live-dot" />
            {life.microstate}
            {life.interruptCount > 0 ? ` · int×${life.interruptCount}` : ""}
          </span>
        )}
      </div>

      {/* DOPS-01: domain tool rail is shell-owned in render-only packaged Studio. */}
      {!renderOnly ? (
        <div
          className="gasper-tools"
          data-testid="gasper-tools"
          role="toolbar"
          aria-label="Stage tools"
        >
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={sel.tool === t.id ? "active" : ""}
              onClick={() => controller.selection.setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className={sel.faceIsolation ? "active" : ""}
            data-testid="face-isolation-toggle"
            onClick={() => controller.setFaceIsolation(!sel.faceIsolation)}
            title="Temporary face authoring isolation"
          >
            Face Iso
          </button>
        </div>
      ) : null}

      {/* Bounds truth overlay (geometry / visual / safe-fit) */}
      {showBoundsOverlay && bounds && (
        <svg
          className="gasper-bounds-overlay"
          data-testid="gasper-bounds-overlay"
          viewBox={`0 0 ${stageW} ${stageH}`}
          width={stageW}
          height={stageH}
          aria-hidden
        >
          {(() => {
            const map = (r: {
              x: number;
              y: number;
              width: number;
              height: number;
            }) => ({
              x: stageW / 2 + vp.panX + (r.x - ox) * vp.zoom,
              y: stageH / 2 + vp.panY + (r.y - oy) * vp.zoom,
              w: r.width * vp.zoom,
              h: r.height * vp.zoom,
            });
            const g = map(bounds.geometry);
            const v = map(bounds.visual);
            const s = map(bounds.safeFit);
            const e = map(bounds.energyEnvelope);
            const t = map(bounds.tailOrbitEnvelope);
            return (
              <>
                <rect
                  data-bounds="safe-fit"
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  fill="none"
                  stroke="rgba(61,207,239,0.45)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                <rect
                  data-bounds="visual"
                  x={v.x}
                  y={v.y}
                  width={v.w}
                  height={v.h}
                  fill="rgba(168,130,255,0.04)"
                  stroke="rgba(168,130,255,0.5)"
                  strokeWidth={1}
                />
                <rect
                  data-bounds="energy"
                  x={e.x}
                  y={e.y}
                  width={e.w}
                  height={e.h}
                  fill="none"
                  stroke="rgba(240,160,96,0.45)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <rect
                  data-bounds="tail-orbit"
                  x={t.x}
                  y={t.y}
                  width={t.w}
                  height={t.h}
                  fill="none"
                  stroke="rgba(100,200,180,0.4)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <rect
                  data-bounds="geometry"
                  x={g.x}
                  y={g.y}
                  width={g.w}
                  height={g.h}
                  fill="none"
                  stroke="rgba(236,236,241,0.35)"
                  strokeWidth={1}
                />
              </>
            );
          })()}
        </svg>
      )}

      <div className="gasper-view-controls" data-testid="gasper-view-controls">
        {/* Camera utilities remain; stage-mode/domain chrome is shell-owned in render-only. */}
        <button
          type="button"
          data-testid="dais-fit"
          onClick={() =>
            recomputeBoundsAndMaybeFit({ forceFit: true, fitSource: "user" })
          }
        >
          Fit
        </button>
        <button
          type="button"
          data-testid="dais-auto-fit"
          className={vp.autoFit ? "active" : ""}
          onClick={() => {
            viewport.setAutoFit(!vp.autoFit);
            if (!vp.autoFit)
              recomputeBoundsAndMaybeFit({ forceFit: true, fitSource: "user" });
            setVp(viewport.getState());
          }}
        >
          Auto Fit
        </button>
        <button
          type="button"
          data-testid="dais-100"
          onClick={() => {
            viewport.setWorldScale100();
            if (bounds) viewport.updateClipped(bounds.visual);
            setVp(viewport.getState());
          }}
        >
          100%
        </button>
        <button
          type="button"
          data-testid="dais-reset"
          title="Reset pan; world 100%; Auto Fit off"
          onClick={() => {
            viewport.reset();
            if (bounds) viewport.updateClipped(bounds.visual);
            setVp(viewport.getState());
          }}
        >
          Reset
        </button>
        {!renderOnly ? (
          <button
            type="button"
            data-testid="dais-bounds-overlay"
            className={showBoundsOverlay ? "active" : ""}
            title="Show geometry / visual / safe-fit overlays"
            onClick={() => setShowBoundsOverlay((v) => !v)}
          >
            Bounds
          </button>
        ) : null}
        {/* DOPS-01: embedded Author/Preview/Runtime/Compare segment removed in render-only. */}
        {!renderOnly ? (
          <div
            className="gasper-mode-seg"
            data-testid="stage-mode-segment"
            role="tablist"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                className={sel.stageMode === m.id ? "active" : ""}
                aria-selected={sel.stageMode === m.id}
                onClick={() => {
                  if (m.id === "COMPARE") {
                    // Pin baseline when entering Compare if none
                    if (!controller.selection.getState().compareBaseline) {
                      controller.selection.setCompareBaseline({
                        ...controller.readLive(),
                      });
                    }
                  }
                  controller.selection.setStageMode(m.id);
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : null}
        {!renderOnly && sel.stageMode === "COMPARE" ? (
          <button
            type="button"
            data-testid="compare-repin"
            onClick={() =>
              controller.selection.setCompareBaseline({
                ...controller.readLive(),
              })
            }
          >
            Pin baseline
          </button>
        ) : null}
      </div>

      {error && (
        <div className="gasper-dais-error" role="alert">
          Rig mount failed: {error}
        </div>
      )}
      {!ready && !error && (
        <div className="gasper-dais-loading">Mounting Gasper…</div>
      )}
    </section>
  );
}

export function createGasperController() {
  return new GasperRigController();
}
