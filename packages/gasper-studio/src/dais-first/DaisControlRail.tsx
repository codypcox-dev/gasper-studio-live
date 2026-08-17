/**
 * Primary right rail — Dais-first authoring + eight-state review controls.
 * Dense layout: eight hold states, transitions, embodiment, expression, gain,
 * rig params, Form/Face DM, review mode. No-scroll primary set.
 * Wired to production adapter + daisManipulation. No Cody acceptance claim.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { DesignDomainId } from "../../../desktop/src/studio/worldclass/adapter/types";
import { getExpressionStudioSession } from "../../../desktop/src/gasper/expression";
import {
  applyCraftRailParams,
  applyWalkReviewShot,
  applyWorldPhysicsParams,
  commitDesignParam,
  disarmWorldBodyFromRail,
  enableDirectManipulation,
  launchWorldBounceFromRail,
  launchWorldCometFromRail,
  playNorthstarTwentyFromRail,
  setWalkBooLoopFromRail,
  stopWalkBooTwentyFromRail,
  setReliefPresetFromRail,
  previewDesignParam,
  RAIL_EMBODIMENTS,
  releaseWalkReviewShot,
  resetExpressionViaAdapter,
  runDaisCraftPack,
  selectEightHoldState,
  selectEmbodiment,
  selectExpression,
  setExpressionGain,
  stopDaisCraftPack,
  transitionWake,
  type CraftRailSettings,
  type DaisFirstAdapter,
  type WorldPhysicsRailParams,
} from "./daisFirstControls";
import {
  EIGHT_HOLD_STATE_IDS,
  EIGHT_HOLD_STATE_LABELS,
  type EightHoldStateId,
} from "./daisReviewMode";
import { TuningLabPanel } from "../tuning/TuningLabPanel";
import type { TuningLabSession } from "../tuning/tuningRegistry";
import type { ReferenceTrainingSession } from "../training/ReferenceTrainingSession";
import type { StudioPilotSession } from "../training/StudioPilotSession";
import { WISPWALKER_AUTHORING_DEFAULTS } from "./wispwalkerAuthoringDefaults";
import { listLooks, loadLook, type SavedLook } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import {
  AuthoringAtlas,
  type AuthoringChapterId,
} from "./AuthoringAtlas";
import {
  captureCanonicalBaseline,
  factoryCanonicalBaseline,
  persistCanonicalBaseline,
  readPersistedCanonicalBaseline,
  type CanonicalBaseline,
} from "./canonicalBaseline";

export type DaisControlRailProps = {
  adapter: DaisFirstAdapter;
  tuningLab?: TuningLabSession;
  referenceTraining?: ReferenceTrainingSession;
  studioPilot?: StudioPilotSession;
  /** Review mode isolates character crop; rail tools collapse. */
  reviewMode?: boolean;
  onReviewModeChange?: (enabled: boolean) => void;
  /** Active eight-state hold id (controlled or local). */
  activeEightState?: string | null;
  onEightStateChange?: (stateId: string) => void;
};

type RigParam = {
  domain: DesignDomainId;
  paramId: string;
  label: string;
  controlId: string;
  fallback: number;
  min?: number;
  max?: number;
  step?: number;
  /** Optional group header shown above this param when the group changes (D-0022 catch-up). */
  group?: string;
};

const RIG_PARAMS: readonly RigParam[] = [
  {
    domain: "form",
    paramId: "relief_amplitude",
    label: "Relief",
    controlId: "rig-relief",
    fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.reliefAmplitude,
  },
  {
    domain: "face",
    paramId: "eye_openness",
    label: "Eye",
    controlId: "rig-eye",
    fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.eyeOpenness,
  },
  {
    domain: "energy",
    paramId: "energy_level",
    label: "Energy",
    controlId: "rig-energy",
    fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.energyLevel,
  },
  // GasperResearch-registered v6.5.5 VIEW_RIG — 2.5D authored yaw spike (0–45°).
  {
    domain: "form",
    paramId: "yaw",
    label: "Yaw 2.5D",
    controlId: "rig-yaw",
    fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.yawDegrees,
    min: 0,
    max: 45,
    step: 0.5,
  },
];

/**
 * V1 TURBO LIVE-SCULPT: body channels + per-profile gauss coefficient overrides.
 * Body channels (asym/lean/posture/wide) are consumed by sampleBodyForProfile in
 * all-script-3.js. Form coefficients (crown/chin/lobes/cleft) override the authored
 * gauss amplitudes in formRadiusAtFor for the active embodiment. All route through
 * previewDesignParam/commitDesignParam → adapter → applyExternalPose → applySemanticPose.
 */
const LIVE_SCULPT_PARAMS: readonly RigParam[] = [
  // — Pose & mass: body channels consumed by sampleBodyForProfile in all-script-3.js —
  { domain: "form", paramId: "asym", label: "Asym", controlId: "sculpt-asym", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.asym, min: -1, max: 1, step: 0.01, group: "Pose & mass" },
  { domain: "form", paramId: "body_lean", label: "Lean", controlId: "sculpt-lean", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.bodyLean, min: -1, max: 1, step: 0.01, group: "Pose & mass" },
  { domain: "form", paramId: "posture_x", label: "Pos X", controlId: "sculpt-px", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.postureX, min: -20, max: 20, step: 0.5, group: "Pose & mass" },
  { domain: "form", paramId: "posture_y", label: "Pos Y", controlId: "sculpt-py", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.postureY, min: -20, max: 20, step: 0.5, group: "Pose & mass" },
  { domain: "form", paramId: "wide", label: "Wide", controlId: "sculpt-wide", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.wide, min: -1, max: 1, step: 0.01, group: "Pose & mass" },
  // — Form sculpt: per-profile gauss amplitudes in formRadiusAtFor for the active embodiment —
  { domain: "form", paramId: "form_crown_amp", label: "Crown", controlId: "sculpt-crown", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.crownAmp, min: -5, max: 10, step: 0.1, group: "Form sculpt" },
  { domain: "form", paramId: "form_chin_amp", label: "Chin", controlId: "sculpt-chin", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.chinAmp, min: -5, max: 10, step: 0.1, group: "Form sculpt" },
  { domain: "form", paramId: "form_lobe_amp", label: "Lobes", controlId: "sculpt-lobes", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.lobeAmp, min: -5, max: 10, step: 0.1, group: "Form sculpt" },
  { domain: "form", paramId: "form_cleft_depth", label: "Cleft", controlId: "sculpt-cleft", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.cleftDepth, min: -5, max: 10, step: 0.1, group: "Form sculpt" },
  // — V2.2 WISPWALKER NUB FEET/ARMS (D-0016): mass-continuous foot/arm nub amplitudes —
  { domain: "form", paramId: "form_foot_amp", label: "Feet", controlId: "sculpt-feet", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.footAmp, min: 0, max: 4, step: 0.1, group: "Feet & arms" },
  { domain: "form", paramId: "form_arm_amp", label: "Arms", controlId: "sculpt-arms", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.armAmp, min: 0, max: 4, step: 0.1, group: "Feet & arms" },
  // — V2.3 WALK-IN-PLACE + V2.5 WALK-STEP (D-0021): weight-transfer strength / tempo / accent / step / on-off —
  { domain: "form", paramId: "walk_amp", label: "Walk", controlId: "sculpt-walk", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.walkAmp, min: 0, max: 2, step: 0.05, group: "Walk & step" },
  { domain: "form", paramId: "walk_period", label: "Step s", controlId: "sculpt-walkper", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.walkPeriodSeconds, min: 0.5, max: 3, step: 0.05, group: "Walk & step" },
  { domain: "form", paramId: "walk_accent", label: "Accent", controlId: "sculpt-walkacc", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.walkAccent, min: 0, max: 1, step: 0.05, group: "Walk & step" },
  { domain: "form", paramId: "step_depth", label: "Step", controlId: "sculpt-stepd", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.stepDepth, min: 0, max: 10, step: 0.1, group: "Walk & step" },
  { domain: "form", paramId: "walk_enable", label: "Walk on", controlId: "sculpt-walken", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.walkEnabled, min: 0, max: 1, step: 1, group: "Walk & step" },
  // — V2.6 VISCOELASTIC WEIGHT (D-0022): the D-0018 contour-inertia time-constant = how heavy/quick the mass feels —
  { domain: "form", paramId: "visco_tau", label: "Weight", controlId: "sculpt-weight", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.viscoTau, min: 0.02, max: 1.0, step: 0.01, group: "Motion & weight" },
];

const SKIN_PARAMS: readonly RigParam[] = [
  { domain: "form", paramId: "scaffold_pressure", label: "Pressure", controlId: "skin-pressure", fallback: 0, min: 0, max: 1, step: 0.01, group: "1000-field" },
  { domain: "form", paramId: "scaffold_coupling", label: "Rim", controlId: "skin-coupling", fallback: 0.5, min: 0, max: 2, step: 0.05, group: "1000-field" },
  { domain: "form", paramId: "relief_amplitude", label: "Relief", controlId: "skin-relief", fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.reliefAmplitude, min: 0, max: 1, step: 0.01, group: "1000-field" },
];

/**
 * GASPER-SPACE-001 PHASE B (D-0090): labeled rail sliders for the
 * world-physics authority — every emergent behavior ships its own knob group.
 * These live on the rig controller (not the design domains): the physics
 * authority is a performer, not an authored clip value.
 */
type WorldPhysParam = {
  key: keyof Required<WorldPhysicsRailParams>;
  label: string;
  controlId: string;
  fallback: number;
  min: number;
  max: number;
  step: number;
};

const WORLD_PHYSICS_PARAMS: readonly WorldPhysParam[] = [
  { key: "gravityScale", label: "Gravity", controlId: "phys-gravity", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.gravityScale, min: 0.25, max: 2, step: 0.05 },
  { key: "restitution", label: "Bounce", controlId: "phys-bounce", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.restitution, min: 0, max: 0.9, step: 0.02 },
  { key: "launchPower", label: "Launch", controlId: "phys-launch", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.launchPower, min: 0.25, max: 2, step: 0.05 },
  { key: "intensity", label: "Squash", controlId: "phys-intensity", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.intensity, min: 0, max: 1, step: 0.05 },
];

const WORLD_PHYSICS_FALLBACKS: Required<WorldPhysicsRailParams> =
  Object.fromEntries(
    WORLD_PHYSICS_PARAMS.map((p) => [p.key, p.fallback]),
  ) as Required<WorldPhysicsRailParams>;

/**
 * GASPER-CRAFT-001 · C4: the Craft rail — live craft dials over a pack
 * performance. Exaggeration scales amplitude (the volume law is enforced
 * downstream in the driver), Tempo scales pack time, Shot bias pulls every
 * beat scale one step toward the bias scale. Bounds mirror curves/CraftRail
 * (the pure module owns the fence; the rail is thin wiring).
 */
type CraftParam = {
  key: "exaggeration" | "tempo";
  label: string;
  controlId: string;
  fallback: number;
  min: number;
  max: number;
  step: number;
};

const CRAFT_PARAMS: readonly CraftParam[] = [
  { key: "exaggeration", label: "Exaggeration", controlId: "craft-exaggeration", fallback: WISPWALKER_AUTHORING_DEFAULTS.craft.exaggeration, min: 0.5, max: 2, step: 0.05 },
  { key: "tempo", label: "Tempo", controlId: "craft-tempo", fallback: WISPWALKER_AUTHORING_DEFAULTS.craft.tempo, min: 0.75, max: 1.25, step: 0.05 },
];

const CRAFT_FALLBACKS: Required<CraftRailSettings> = {
  exaggeration: WISPWALKER_AUTHORING_DEFAULTS.craft.exaggeration,
  shotBias: WISPWALKER_AUTHORING_DEFAULTS.craft.shotBias,
  tempo: WISPWALKER_AUTHORING_DEFAULTS.craft.tempo,
};

function useSnap(adapter: DaisFirstAdapter) {
  return useSyncExternalStore(
    (onChange) => adapter.subscribe(onChange),
    () => adapter.getSnapshot(),
    () => adapter.getSnapshot(),
  );
}

export function DaisControlRail({
  adapter,
  tuningLab,
  referenceTraining,
  studioPilot,
  reviewMode = false,
  onReviewModeChange,
  activeEightState: activeEightStateProp,
  onEightStateChange,
}: DaisControlRailProps): React.ReactElement {
  const snap = useSnap(adapter);
  const exprSession = useMemo(() => getExpressionStudioSession(), []);
  const [gain, setGain] = useState<number>(WISPWALKER_AUTHORING_DEFAULTS.expressionGain);
  const [status, setStatus] = useState<string>("Dais controls ready");
  const [localEightState, setLocalEightState] = useState<string>(
    "presence-neutral-settled",
  );
  // V1 TURBO LIVE-SCULPT: local slider state (not in designDomains snapshot).
  const [liveSculpt, setLiveSculpt] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      [...LIVE_SCULPT_PARAMS, ...SKIN_PARAMS].map((p) => [p.paramId, p.fallback]),
    ),
  );
  // GASPER-SPACE-001 PHASE B (D-0090): local physics-authority knob state.
  const [worldPhys, setWorldPhys] = useState<Required<WorldPhysicsRailParams>>(
    () => WORLD_PHYSICS_FALLBACKS,
  );
  // GASPER-CRAFT-001 · C4: local craft-dial state.
  const [craft, setCraft] = useState<Required<CraftRailSettings>>(
    () => CRAFT_FALLBACKS,
  );
  const [walkReviewOn, setWalkReviewOn] = useState(false);
  const [walkBooLoopOn, setWalkBooLoopOn] = useState(true);
  const [chapter, setChapter] = useState<AuthoringChapterId>("skin");
  const [userBaseline, setUserBaseline] = useState<CanonicalBaseline | null>(
    () => readPersistedCanonicalBaseline(),
  );

  const applyBaseline = useCallback(
    (baseline: CanonicalBaseline) => {
      setGain(baseline.expressionGain);
      setExpressionGain(baseline.expressionGain);
      for (const p of [...RIG_PARAMS, ...LIVE_SCULPT_PARAMS]) {
        adapter.setDesignParameter?.(p.domain, p.paramId, p.fallback);
      }
      adapter.setDesignParameter?.("form", "relief_amplitude", baseline.rig.reliefAmplitude);
      adapter.setDesignParameter?.("face", "eye_openness", baseline.rig.eyeOpenness);
      adapter.setDesignParameter?.("energy", "energy_level", baseline.rig.energyLevel);
      adapter.setDesignParameter?.("form", "yaw", baseline.rig.yawDegrees);
      adapter.setDesignParameter?.("form", "asym", baseline.pose.asym);
      adapter.setDesignParameter?.("form", "body_lean", baseline.pose.bodyLean);
      adapter.setDesignParameter?.("form", "posture_x", baseline.pose.postureX);
      adapter.setDesignParameter?.("form", "posture_y", baseline.pose.postureY);
      adapter.setDesignParameter?.("form", "wide", baseline.pose.wide);
      adapter.setDesignParameter?.("form", "form_crown_amp", baseline.form.crownAmp);
      adapter.setDesignParameter?.("form", "form_chin_amp", baseline.form.chinAmp);
      adapter.setDesignParameter?.("form", "form_lobe_amp", baseline.form.lobeAmp);
      adapter.setDesignParameter?.("form", "form_cleft_depth", baseline.form.cleftDepth);
      adapter.setDesignParameter?.("form", "form_foot_amp", baseline.form.footAmp);
      adapter.setDesignParameter?.("form", "form_arm_amp", baseline.form.armAmp);
      adapter.setDesignParameter?.("form", "walk_amp", baseline.behavior.walkAmp);
      adapter.setDesignParameter?.("form", "walk_period", baseline.behavior.walkPeriodSeconds);
      adapter.setDesignParameter?.("form", "walk_accent", baseline.behavior.walkAccent);
      adapter.setDesignParameter?.("form", "step_depth", baseline.behavior.stepDepth);
      adapter.setDesignParameter?.("form", "walk_enable", baseline.behavior.walkEnabled);
      adapter.setDesignParameter?.("form", "visco_tau", baseline.behavior.viscoTau);
      setLiveSculpt({
        asym: baseline.pose.asym,
        body_lean: baseline.pose.bodyLean,
        posture_x: baseline.pose.postureX,
        posture_y: baseline.pose.postureY,
        wide: baseline.pose.wide,
        form_crown_amp: baseline.form.crownAmp,
        form_chin_amp: baseline.form.chinAmp,
        form_lobe_amp: baseline.form.lobeAmp,
        form_cleft_depth: baseline.form.cleftDepth,
        form_foot_amp: baseline.form.footAmp,
        form_arm_amp: baseline.form.armAmp,
        walk_amp: baseline.behavior.walkAmp,
        walk_period: baseline.behavior.walkPeriodSeconds,
        walk_accent: baseline.behavior.walkAccent,
        step_depth: baseline.behavior.stepDepth,
        walk_enable: baseline.behavior.walkEnabled,
        visco_tau: baseline.behavior.viscoTau,
      });
      setWorldPhys({ ...baseline.physics });
      applyWorldPhysicsParams(baseline.physics);
      setCraft({ ...baseline.craft });
      applyCraftRailParams(baseline.craft);
    },
    [adapter],
  );

  const applyWispwalkerHomeProfile = useCallback(() => {
    applyBaseline(factoryCanonicalBaseline());
  }, [applyBaseline]);

  useEffect(() => {
    return exprSession.subscribe((s) => setGain(s.expressionGain));
  }, [exprSession]);

  useEffect(() => {
    if ((snap.character.embodiment ?? "wispwalker") !== "wispwalker") return;
    applyWispwalkerHomeProfile();
  }, [applyWispwalkerHomeProfile, snap.character.embodiment]);

  const activeEightState = activeEightStateProp ?? localEightState;

  const expressions = snap.character.availableExpressions?.length
    ? snap.character.availableExpressions
    : exprSession.listFixtures();

  const paramValue = useCallback(
    (paramId: string, fallback: number) => {
      for (const d of snap.designDomains) {
        const p = d.parameters.find((x) => x.id === paramId);
        if (p && typeof p.value === "number") return p.value;
      }
      return fallback;
    },
    [snap.designDomains],
  );

  const onEightState = useCallback(
    (id: EightHoldStateId) => {
      const r = selectEightHoldState(id);
      setLocalEightState(id);
      onEightStateChange?.(id);
      setStatus(
        r.ok
          ? `State ${EIGHT_HOLD_STATE_LABELS[id]}`
          : `State failed: ${r.error ?? "unknown"}`,
      );
    },
    [onEightStateChange],
  );

  const onWake = useCallback(() => {
    const r = transitionWake();
    setStatus(r.ok ? "Transition · wake" : `Wake failed: ${r.error ?? ""}`);
  }, []);

  const onEmbodiment = useCallback(
    (id: string) => {
      selectEmbodiment(adapter, id);
      setStatus(`Embodiment ${id}`);
    },
    [adapter],
  );

  const onExpression = useCallback(
    (id: string) => {
      selectExpression(adapter, id);
      setStatus(`Expression ${id}`);
    },
    [adapter],
  );

  const onGain = useCallback((v: number) => {
    setGain(v);
    const r = setExpressionGain(v);
    setStatus(
      r.ok ? `Control-as-gain ${v.toFixed(2)}` : `Gain failed: ${r.error ?? ""}`,
    );
  }, []);

  const onTool = useCallback(
    (domain: DesignDomainId) => {
      const r = enableDirectManipulation(adapter, domain);
      setStatus(`Direct manip · ${r.stageMode} · ${r.domain}`);
    },
    [adapter],
  );

  const onAuthorMode = useCallback(() => {
    adapter.setStageMode?.("author");
    setStatus("Stage AUTHORING");
  }, [adapter]);

  const onReset = useCallback(() => {
    const r = resetExpressionViaAdapter(adapter);
    // Cody's authored home is Wispwalker, not the generic Presence fallback.
    // Reset the runtime first, then atomically re-apply the exact captured 5179
    // profile across expression, rig, form, physics, and craft authorities.
    selectEmbodiment(adapter, "wispwalker");
    applyWispwalkerHomeProfile();
    setStatus(
      r.ok
        ? "Reset → neutral-settled / canonical Wispwalker home"
        : `Reset failed: ${r.error}`,
    );
  }, [adapter, applyWispwalkerHomeProfile]);

  const onToggleReview = useCallback(() => {
    const next = !reviewMode;
    onReviewModeChange?.(next);
    setStatus(next ? "Review mode · character crop" : "Review mode off");
  }, [reviewMode, onReviewModeChange]);

  const commitRig = useCallback(
    (p: RigParam, raw: string | number) => {
      const next = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(next)) return;
      commitDesignParam(adapter, p.domain, p.paramId, next);
      setStatus(`Committed ${p.paramId}`);
    },
    [adapter],
  );

  // V1 TURBO LIVE-SCULPT: preview + commit handlers for body/form coefficient sliders.
  const onSculptPreview = useCallback(
    (p: RigParam, value: number) => {
      setLiveSculpt((prev) => ({ ...prev, [p.paramId]: value }));
      previewDesignParam(adapter, p.domain, p.paramId, value);
    },
    [adapter],
  );

  const onSculptCommit = useCallback(
    (p: RigParam, raw: string | number) => {
      const next = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(next)) return;
      setLiveSculpt((prev) => ({ ...prev, [p.paramId]: next }));
      commitDesignParam(adapter, p.domain, p.paramId, next);
      setStatus(`Sculpt ${p.paramId}`);
    },
    [adapter],
  );

  const onSkinPreset = useCallback(
    (id: "neutral" | "puff" | "goose") => {
      if (id === "neutral") {
        onSculptCommit(SKIN_PARAMS[0]!, 0);
        setReliefPresetFromRail("none");
        setStatus("Skin · neutral +0");
        return;
      }
      if (id === "puff") {
        onSculptCommit(SKIN_PARAMS[0]!, 0.75);
        setStatus("Skin · pressure puff");
        return;
      }
      if (id === "goose") {
        onSculptCommit(SKIN_PARAMS[0]!, 0);
        onSculptCommit(SKIN_PARAMS[1]!, 0.55);
        onSculptCommit(SKIN_PARAMS[2]!, 1);
        const r = setReliefPresetFromRail("goosebumps");
        setStatus(r.ok ? "Skin · goose · one field" : `Goose failed: ${r.error ?? ""}`);
        return;
      }
    },
    [onSculptCommit],
  );

  // GASPER-SPACE-001 PHASE B (D-0090): World & Physics rail handlers. The
  // knobs live-apply to the physics authority; the buttons fire the authored
  // performances (S2 bounce / S4 comet) or release the authority home.
  const onWorldPhysChange = useCallback((p: WorldPhysParam, value: number) => {
    setWorldPhys((prev) => ({ ...prev, [p.key]: value }));
    const r = applyWorldPhysicsParams({ [p.key]: value });
    if (!r.ok && r.error !== "no_surface") {
      setStatus(`Physics param failed: ${r.error}`);
    }
  }, []);

  const onWorldBounce = useCallback(() => {
    const r = launchWorldBounceFromRail();
    setStatus(r.ok ? "World · S2 bounce launched" : `Bounce failed: ${r.error ?? ""}`);
  }, []);

  const onWorldComet = useCallback(() => {
    const r = launchWorldCometFromRail();
    setStatus(r.ok ? "World · S4 comet shot" : `Comet failed: ${r.error ?? ""}`);
  }, []);

  const onWorldStop = useCallback(() => {
    const r = disarmWorldBodyFromRail();
    setStatus(r.ok ? "World · physics released home" : `Stop failed: ${r.error ?? ""}`);
  }, []);

  const onWalkReview = useCallback(() => {
    const r = applyWalkReviewShot();
    if (r.ok) {
      setWalkReviewOn(true);
      setStatus("Walk review · body hold · wander gait");
    } else {
      setStatus(`Walk review failed: ${r.error ?? ""}`);
    }
  }, []);

  const onWalkStand = useCallback(() => {
    stopWalkBooTwentyFromRail();
    setWalkBooLoopOn(false);
    const r = releaseWalkReviewShot();
    if (r.ok) {
      setWalkReviewOn(false);
      setStatus("Stood · sequence stopped");
    } else {
      setStatus(`Stand failed: ${r.error ?? ""}`);
    }
  }, []);

  const onWalkBooTwenty = useCallback(() => {
    const r = playNorthstarTwentyFromRail();
    if (r.ok) {
      setWalkReviewOn(false);
      setStatus("Northstar 20s · strut → notice → zip");
    } else {
      setStatus(`20s failed: ${r.error ?? ""}`);
    }
  }, []);

  const onWalkBooLoop = useCallback(() => {
    const next = !walkBooLoopOn;
    const r = setWalkBooLoopFromRail(next);
    if (r.ok) {
      setWalkBooLoopOn(next);
      setWalkReviewOn(false);
      setStatus(next ? "20s · looping" : "20s · loop off");
    } else {
      setStatus(`Loop failed: ${r.error ?? ""}`);
    }
  }, [walkBooLoopOn]);

  const onWalkBooStop = useCallback(() => {
    const r = stopWalkBooTwentyFromRail();
    if (r.ok) {
      setWalkBooLoopOn(false);
      setStatus("20s · stopped");
    } else {
      setStatus(`Stop 20s failed: ${r.error ?? ""}`);
    }
  }, []);

  const onSaveBaseline = useCallback(() => {
    const snapLive = captureCanonicalBaseline({
      expressionGain: gain,
      rig: {
        reliefAmplitude: paramValue("relief_amplitude", WISPWALKER_AUTHORING_DEFAULTS.rig.reliefAmplitude),
        eyeOpenness: paramValue("eye_openness", WISPWALKER_AUTHORING_DEFAULTS.rig.eyeOpenness),
        energyLevel: paramValue("energy_level", WISPWALKER_AUTHORING_DEFAULTS.rig.energyLevel),
        yawDegrees: paramValue("yaw", WISPWALKER_AUTHORING_DEFAULTS.rig.yawDegrees),
      },
      pose: {
        asym: liveSculpt.asym ?? WISPWALKER_AUTHORING_DEFAULTS.pose.asym,
        bodyLean: liveSculpt.body_lean ?? WISPWALKER_AUTHORING_DEFAULTS.pose.bodyLean,
        postureX: liveSculpt.posture_x ?? WISPWALKER_AUTHORING_DEFAULTS.pose.postureX,
        postureY: liveSculpt.posture_y ?? WISPWALKER_AUTHORING_DEFAULTS.pose.postureY,
        wide: liveSculpt.wide ?? WISPWALKER_AUTHORING_DEFAULTS.pose.wide,
      },
      form: {
        crownAmp: liveSculpt.form_crown_amp ?? WISPWALKER_AUTHORING_DEFAULTS.form.crownAmp,
        chinAmp: liveSculpt.form_chin_amp ?? WISPWALKER_AUTHORING_DEFAULTS.form.chinAmp,
        lobeAmp: liveSculpt.form_lobe_amp ?? WISPWALKER_AUTHORING_DEFAULTS.form.lobeAmp,
        cleftDepth: liveSculpt.form_cleft_depth ?? WISPWALKER_AUTHORING_DEFAULTS.form.cleftDepth,
        footAmp: liveSculpt.form_foot_amp ?? WISPWALKER_AUTHORING_DEFAULTS.form.footAmp,
        armAmp: liveSculpt.form_arm_amp ?? WISPWALKER_AUTHORING_DEFAULTS.form.armAmp,
      },
      behavior: {
        walkAmp: liveSculpt.walk_amp ?? WISPWALKER_AUTHORING_DEFAULTS.behavior.walkAmp,
        walkPeriodSeconds: liveSculpt.walk_period ?? WISPWALKER_AUTHORING_DEFAULTS.behavior.walkPeriodSeconds,
        walkAccent: liveSculpt.walk_accent ?? WISPWALKER_AUTHORING_DEFAULTS.behavior.walkAccent,
        stepDepth: liveSculpt.step_depth ?? WISPWALKER_AUTHORING_DEFAULTS.behavior.stepDepth,
        walkEnabled: liveSculpt.walk_enable ?? WISPWALKER_AUTHORING_DEFAULTS.behavior.walkEnabled,
        viscoTau: liveSculpt.visco_tau ?? WISPWALKER_AUTHORING_DEFAULTS.behavior.viscoTau,
      },
      physics: worldPhys,
      craft,
    });
    setUserBaseline(snapLive);
    persistCanonicalBaseline(snapLive);
    setStatus("Saved · my Wispwalker is the baseline");
  }, [craft, gain, liveSculpt, paramValue, worldPhys]);

  const onRestoreFactory = useCallback(() => {
    selectEmbodiment(adapter, "wispwalker");
    applyWispwalkerHomeProfile();
    setStatus("Restored · factory Wispwalker home");
  }, [adapter, applyWispwalkerHomeProfile]);

  const onRestoreUser = useCallback(() => {
    if (!userBaseline) {
      setStatus("No saved baseline yet");
      return;
    }
    selectEmbodiment(adapter, "wispwalker");
    applyBaseline(userBaseline);
    setStatus("Restored · my Wispwalker");
  }, [adapter, applyBaseline, userBaseline]);

  const onChapter = useCallback((id: AuthoringChapterId) => {
    setChapter(id);
    const el = document.querySelector(`[data-chapter="${id}"]`);
    if (el instanceof HTMLElement) el.scrollIntoView({ block: "nearest" });
  }, []);

  // GASPER-CRAFT-001 · C4: Craft rail handlers — live-apply to the pack
  // authority (exaggeration/tempo) and the shot direction (bias).
  const onCraftChange = useCallback((p: CraftParam, value: number) => {
    setCraft((prev) => ({ ...prev, [p.key]: value }));
    const r = applyCraftRailParams({ [p.key]: value });
    if (!r.ok && r.error !== "no_surface") {
      setStatus(`Craft param failed: ${r.error}`);
    }
  }, []);

  const onCraftBias = useCallback((bias: "authored" | "medium" | "wide") => {
    setCraft((prev) => ({ ...prev, shotBias: bias }));
    const r = applyCraftRailParams({ shotBias: bias });
    setStatus(
      r.ok
        ? `Craft · shot bias ${bias}`
        : `Shot bias failed: ${r.error ?? ""}`,
    );
  }, []);

  // GASPER-CRAFT-001 · C5: shipped craft-pack transport — the beat-sheet
  // performances (s2 bounce, s4 comet) run on the curve authority.
  const onCraftPackRun = useCallback((packId: string) => {
    const r = runDaisCraftPack(packId);
    setStatus(
      r.ok ? `Craft · performing ${packId}` : `Craft pack failed: ${r.error ?? ""}`,
    );
  }, []);

  const onCraftPackStop = useCallback(() => {
    const r = stopDaisCraftPack();
    setStatus(r.ok ? "Craft · pack released home" : `Craft stop failed: ${r.error ?? ""}`);
  }, []);

  const activeEmbodiment = snap.character.embodiment ?? "presence";
  const savedLooks = listLooks();
  const activeExpression = snap.character.expression ?? "neutral-settled";
  const activeDomain = snap.activeDesignDomain;
  const stageMode = snap.stageMode;

  return (
    <aside
      className="dais-control-rail"
      data-testid="dais-control-rail"
      data-primary-controls="1"
      data-rail-density="compact"
      data-review-mode={reviewMode ? "1" : "0"}
      data-focus={chapter}
      aria-label="Dais primary controls"
    >
      <AuthoringAtlas
        chapter={chapter}
        onChapter={onChapter}
        readout={{
          embodiment: activeEmbodiment,
          klass:
            activeEmbodiment === "wispwalker"
              ? "walker"
              : activeEmbodiment === "presence" || activeEmbodiment === "comet"
                ? "presence"
                : "rest",
          take: "northstar-20s",
          shot: walkReviewOn ? "walk-review · zoom 2" : "operate / Fit",
          writer: "WorldPhysicsDriver",
          ruler: "8 u / content px",
          weight: `${(liveSculpt.visco_tau ?? WISPWALKER_AUTHORING_DEFAULTS.behavior.viscoTau).toFixed(2)} s`,
          plant: "×14 · 0.02 s",
          settle: "ζ 0.28 · rest τ 0.42",
          mesh: "512 · 360 · 1000 · P/R/C field",
        }}
      />

      <section
        className="dais-control-rail__section"
        data-testid="canonical-baseline"
        data-chapter="baseline"
      >
        <p className="dais-control-rail__label">
          Canonical form{" "}
          <span className="dais-control-rail__param-value">
            {userBaseline ? "mine + factory" : "factory"}
          </span>
        </p>
        <p className="dais-control-rail__note">
          Recognized Wispwalker home. Save writes your sculpt. Morph is embodiment. Restore brings him home.
        </p>
        <div className="dais-control-rail__row">
          <button
            type="button"
            data-testid="baseline-save"
            onClick={onSaveBaseline}
            title="Save the live sculpt as my canonical Wispwalker"
          >
            Save
          </button>
          <button
            type="button"
            data-testid="baseline-restore-factory"
            onClick={onRestoreFactory}
            title="Restore factory Wispwalker home"
          >
            Factory
          </button>
          <button
            type="button"
            data-testid="baseline-restore-mine"
            onClick={onRestoreUser}
            disabled={!userBaseline}
            title="Restore my saved Wispwalker"
          >
            Mine
          </button>
        </div>
      </section>

      <section
        className="dais-control-rail__section"
        data-control-id="eight-state-select"
        data-testid="dais-rail-eight-states"
        data-chapter="act"
        data-eight-states="presence-neutral-settled,presence-listening-receive,presence-thinking-knit,presence-recognition-spark,comet-executing-drive,presence-blocked-strain,presence-pleased-resolve,dormant-orbit-maintain"
      >
        <p className="dais-control-rail__label">Eight states</p>
        <div className="dais-control-rail__row dais-control-rail__row--states">
          {EIGHT_HOLD_STATE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`dais-rail-state-${id}`}
              data-control-id="eight-state-select"
              data-state-id={id}
              data-active={activeEightState === id ? "1" : "0"}
              aria-pressed={activeEightState === id}
              title={id}
              onClick={() => onEightState(id)}
            >
              {EIGHT_HOLD_STATE_LABELS[id]}
            </button>
          ))}
        </div>
      </section>

      <section
        className="dais-control-rail__section"
        data-testid="dais-rail-transitions"
        data-chapter="shoot"
      >
        <p className="dais-control-rail__label">Transitions</p>
        <div className="dais-control-rail__row">
          <button
            type="button"
            data-testid="dais-rail-transition-wake"
            data-control-id="transition-wake"
            onClick={onWake}
            title="Wake → Neutral"
          >
            Wake
          </button>
          <button
            type="button"
            data-testid="dais-rail-transition-reset"
            data-control-id="transition-reset"
            onClick={onReset}
            title="Reset expression"
          >
            Reset
          </button>
          <button
            type="button"
            data-testid="dais-rail-review-toggle"
            data-control-id="review-mode-toggle"
            data-active={reviewMode ? "1" : "0"}
            aria-pressed={reviewMode}
            onClick={onToggleReview}
            title="State-isolated review mode — hide chrome, character crop"
          >
            {reviewMode ? "Exit review" : "Review"}
          </button>
        </div>
      </section>

      {!reviewMode ? (
        <>
          <section
            className="dais-control-rail__section"
            data-control-id="embodiment-select"
            data-chapter="shape"
          >
            <p className="dais-control-rail__label">Embodiment</p>
            <p className="dais-control-rail__note">Morph the body. Walker has feet. Presence floats. Home stays the saved baseline.</p>
            <div className="dais-control-rail__row dais-control-rail__row--emb">
              {RAIL_EMBODIMENTS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`dais-rail-embodiment-${id}`}
                  data-control-id="embodiment-select"
                  data-active={activeEmbodiment === id ? "1" : "0"}
                  aria-pressed={activeEmbodiment === id}
                  onClick={() => onEmbodiment(id)}
                >
                  {id === "dormant-orbit" ? "dormant" : id}
                </button>
              ))}
              {savedLooks.map((look: SavedLook) => (
                <button
                  key={look.id}
                  type="button"
                  data-testid={`dais-rail-look-${look.id}`}
                  data-control-id="embodiment-select"
                  onClick={() => loadLook(look.id)}
                >
                  {look.label}
                </button>
              ))}
            </div>
          </section>

          <section
            className="dais-control-rail__section"
            data-control-id="expression-select"
          >
            <p className="dais-control-rail__label">Expression</p>
            <select
              data-testid="dais-rail-expression"
              data-control-id="expression-select"
              value={
                expressions.includes(activeExpression)
                  ? activeExpression
                  : expressions[0] ?? ""
              }
              onChange={(e) => onExpression(e.target.value)}
            >
              {expressions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </section>

          <section
            className="dais-control-rail__section"
            data-control-id="control-as-gain"
          >
            <p className="dais-control-rail__label">
              Gain{" "}
              <span data-testid="dais-rail-gain-value">{gain.toFixed(2)}</span>
            </p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={gain}
              data-testid="dais-rail-gain"
              data-control-id="control-as-gain"
              onChange={(e) => onGain(Number(e.target.value))}
            />
          </section>

          <section className="dais-control-rail__section" data-testid="dais-rail-rig">
            <p className="dais-control-rail__label">Rig</p>
            {RIG_PARAMS.map((p) => {
              const v = paramValue(p.paramId, p.fallback);
              const min = p.min ?? 0;
              const max = p.max ?? 1;
              const step = p.step ?? 0.01;
              const clamped = Math.max(min, Math.min(max, v));
              return (
                <div
                  key={p.paramId}
                  className="dais-control-rail__param"
                  data-control-id={p.controlId}
                >
                  <span>{p.label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={clamped}
                    data-testid={`dais-rail-param-${p.paramId}`}
                    data-control-id={p.controlId}
                    onChange={(e) => {
                      previewDesignParam(
                        adapter,
                        p.domain,
                        p.paramId,
                        Number(e.target.value),
                      );
                    }}
                    onPointerUp={(e: ReactPointerEvent<HTMLInputElement>) => {
                      commitRig(p, e.currentTarget.value);
                    }}
                    onBlur={(e: FocusEvent<HTMLInputElement>) => {
                      commitRig(p, e.currentTarget.value);
                    }}
                  />
                  <span className="dais-control-rail__param-value">
                    {p.paramId === "yaw"
                      ? `${clamped.toFixed(0)}°`
                      : clamped.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </section>

          <section
            className="dais-control-rail__section"
            data-testid="dais-rail-live-sculpt"
            data-control-id="live-sculpt"
            data-chapter="shape"
          >
            <p className="dais-control-rail__label">Live sculpt</p>
            {LIVE_SCULPT_PARAMS.map((p, i) => {
              const v = liveSculpt[p.paramId] ?? p.fallback;
              const min = p.min ?? 0;
              const max = p.max ?? 1;
              const step = p.step ?? 0.01;
              const clamped = Math.max(min, Math.min(max, v));
              const showGroup = !!p.group && p.group !== LIVE_SCULPT_PARAMS[i - 1]?.group;
              return (
                <div key={p.paramId}>
                  {showGroup ? (
                    <p className="dais-control-rail__sublabel">{p.group}</p>
                  ) : null}
                  <div
                    className="dais-control-rail__param"
                    data-control-id={p.controlId}
                  >
                    <span>{p.label}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={clamped}
                      data-testid={`dais-rail-sculpt-${p.paramId}`}
                      data-control-id={p.controlId}
                      onChange={(e) => {
                        onSculptPreview(p, Number(e.target.value));
                      }}
                      onPointerUp={(e: ReactPointerEvent<HTMLInputElement>) => {
                        onSculptCommit(p, e.currentTarget.value);
                      }}
                      onBlur={(e: FocusEvent<HTMLInputElement>) => {
                        onSculptCommit(p, e.currentTarget.value);
                      }}
                    />
                    <span className="dais-control-rail__param-value">
                      {clamped.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          <section
            className="dais-control-rail__section skin-dock"
            data-testid="dais-rail-skin"
            data-control-id="skin-field"
            data-chapter="skin"
          >
            <p className="dais-control-rail__label">Skin</p>
            <p className="dais-control-rail__note">
              The 1000-field. Neutral is rest. Puff is pressure. Goose is grain.
            </p>
            <div className="dais-control-rail__row">
              <button type="button" data-testid="skin-preset-neutral" onClick={() => onSkinPreset("neutral")}>
                Neutral
              </button>
              <button type="button" data-testid="skin-preset-puff" onClick={() => onSkinPreset("puff")}>
                Puff
              </button>
              <button type="button" data-testid="skin-preset-goose" onClick={() => onSkinPreset("goose")}>
                Goose
              </button>
            </div>
            {SKIN_PARAMS.map((p, i) => {
              const v = liveSculpt[p.paramId] ?? p.fallback;
              const min = p.min ?? 0;
              const max = p.max ?? 1;
              const step = p.step ?? 0.01;
              const clamped = Math.max(min, Math.min(max, v));
              const showGroup = !!p.group && p.group !== SKIN_PARAMS[i - 1]?.group;
              return (
                <div key={p.paramId}>
                  {showGroup ? (
                    <p className="dais-control-rail__sublabel">{p.group}</p>
                  ) : null}
                  <div className="dais-control-rail__param" data-control-id={p.controlId}>
                    <span>{p.label}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={clamped}
                      data-testid={`dais-rail-skin-${p.paramId}`}
                      data-control-id={p.controlId}
                      onChange={(e) => onSculptPreview(p, Number(e.target.value))}
                      onPointerUp={(e: ReactPointerEvent<HTMLInputElement>) => {
                        onSculptCommit(p, e.currentTarget.value);
                      }}
                      onBlur={(e: FocusEvent<HTMLInputElement>) => {
                        onSculptCommit(p, e.currentTarget.value);
                      }}
                    />
                    <span className="dais-control-rail__param-value">{clamped.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </section>

          <section
            className="dais-control-rail__section"
            data-testid="dais-rail-world-physics"
            data-control-id="world-physics"
            data-chapter="walk"
          >
            <p className="dais-control-rail__label">World &amp; Physics</p>
            <div className="dais-control-rail__row">
              <button
                type="button"
                data-testid="dais-rail-walk-review"
                data-control-id="walk-review"
                data-active={walkReviewOn ? "1" : "0"}
                aria-pressed={walkReviewOn}
                onClick={onWalkReview}
                title="Walk-review shot: body crop so both foot-root lobes stay on stage, then wander gait. Fit stays face-first."
              >
                Walk
              </button>
              <button
                type="button"
                data-testid="dais-rail-walk-stand"
                data-control-id="walk-stand"
                onClick={onWalkStand}
                title="Stand wander down. Keep the body-visible hold."
              >
                Stand
              </button>
              <button
                type="button"
                data-testid="dais-rail-walk-boo-20s"
                data-control-id="walk-boo-20s"
                onClick={onWalkBooTwenty}
                title="Northstar 20s: rest, strut, notice, gather, zip, land"
              >
                20s
              </button>
              <button
                type="button"
                data-testid="dais-rail-walk-boo-loop"
                data-control-id="walk-boo-loop"
                data-active={walkBooLoopOn ? "1" : "0"}
                aria-pressed={walkBooLoopOn}
                onClick={onWalkBooLoop}
                title="Loop the Northstar 20s"
              >
                Loop
              </button>
            </div>
            <p className="dais-control-rail__note">
              Walk review · both lobes on stage
            </p>
            {WORLD_PHYSICS_PARAMS.map((p) => {
              const v = worldPhys[p.key];
              const clamped = Math.max(p.min, Math.min(p.max, v));
              return (
                <div
                  key={p.key}
                  className="dais-control-rail__param"
                  data-control-id={p.controlId}
                >
                  <span>{p.label}</span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={clamped}
                    data-testid={`dais-rail-phys-${p.key}`}
                    data-control-id={p.controlId}
                    onChange={(e) => onWorldPhysChange(p, Number(e.target.value))}
                  />
                  <span className="dais-control-rail__param-value">
                    {clamped.toFixed(2)}
                  </span>
                </div>
              );
            })}
            <div className="dais-control-rail__row" data-chapter="fly">
              <button
                type="button"
                data-testid="dais-rail-phys-bounce"
                data-control-id="phys-bounce-launch"
                onClick={onWorldBounce}
                title="S2 — impulse launch into gravity + restitution"
              >
                Bounce
              </button>
              <button
                type="button"
                data-testid="dais-rail-phys-comet"
                data-control-id="phys-comet-launch"
                onClick={onWorldComet}
                title="S4 — gather hold, then a hard shot across the world"
              >
                Comet
              </button>
              <button
                type="button"
                data-testid="dais-rail-phys-stop"
                data-control-id="phys-stop"
                onClick={onWorldStop}
                title="Release the physics authority — ease home"
              >
                Stop
              </button>
            </div>
          </section>

          <section
            className="dais-control-rail__section"
            data-testid="dais-rail-craft"
            data-control-id="craft"
          >
            <p className="dais-control-rail__label">Craft</p>
            {CRAFT_PARAMS.map((p) => {
              const v = craft[p.key];
              const clamped = Math.max(p.min, Math.min(p.max, v));
              return (
                <div
                  key={p.key}
                  className="dais-control-rail__param"
                  data-control-id={p.controlId}
                >
                  <span>{p.label}</span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={clamped}
                    data-testid={`dais-rail-craft-${p.key}`}
                    data-control-id={p.controlId}
                    onChange={(e) => onCraftChange(p, Number(e.target.value))}
                  />
                  <span className="dais-control-rail__param-value">
                    {clamped.toFixed(2)}
                  </span>
                </div>
              );
            })}
            <div className="dais-control-rail__row">
              <button
                type="button"
                data-testid="dais-rail-craft-bias-authored"
                data-control-id="craft-bias-authored"
                data-active={craft.shotBias === "authored" ? "1" : "0"}
                aria-pressed={craft.shotBias === "authored"}
                onClick={() => onCraftBias("authored")}
                title="Perform beat scales exactly as authored (the framing the floors were authored against)"
              >
                Bias · Authored
              </button>
              <button
                type="button"
                data-testid="dais-rail-craft-bias-medium"
                data-control-id="craft-bias-medium"
                data-active={craft.shotBias === "medium" ? "1" : "0"}
                aria-pressed={craft.shotBias === "medium"}
                onClick={() => onCraftBias("medium")}
                title="Pull every beat scale one step toward medium framing"
              >
                Bias · Medium
              </button>
              <button
                type="button"
                data-testid="dais-rail-craft-bias-wide"
                data-control-id="craft-bias-wide"
                data-active={craft.shotBias === "wide" ? "1" : "0"}
                aria-pressed={craft.shotBias === "wide"}
                onClick={() => onCraftBias("wide")}
                title="Pull every beat scale one step toward wide framing"
              >
                Bias · Wide
              </button>
            </div>
            <div className="dais-control-rail__row">
              <button
                type="button"
                data-testid="dais-rail-craft-pack-s2"
                data-control-id="craft-pack-s2-bounce"
                onClick={() => onCraftPackRun("s2-bounce")}
                title="Run the shipped s2-bounce craft pack (three-beat directed bounce)"
              >
                Play S2 · Bounce
              </button>
              <button
                type="button"
                data-testid="dais-rail-craft-pack-s4"
                data-control-id="craft-pack-s4-comet"
                onClick={() => onCraftPackRun("s4-comet")}
                title="Run the shipped s4-comet craft pack (three-beat directed comet)"
              >
                Play S4 · Comet
              </button>
              <button
                type="button"
                data-testid="dais-rail-craft-pack-stop"
                data-control-id="craft-pack-stop"
                onClick={onCraftPackStop}
                title="Release the craft-pack authority — ease home"
              >
                Stop
              </button>
            </div>
          </section>

          <section
            className="dais-control-rail__section"
            data-testid="dais-rail-tools"
          >
            <p className="dais-control-rail__label">Direct manip</p>
            <div className="dais-control-rail__row">
              <button
                type="button"
                data-testid="dais-rail-stage-author"
                data-control-id="stage-author"
                data-active={stageMode === "author" ? "1" : "0"}
                aria-pressed={stageMode === "author"}
                onClick={onAuthorMode}
                title="AUTHORING stage mode — shell owns handles"
              >
                Author
              </button>
              <button
                type="button"
                data-testid="dais-rail-tool-form"
                data-control-id="tool-form"
                data-active={activeDomain === "form" ? "1" : "0"}
                aria-pressed={activeDomain === "form"}
                onClick={() => onTool("form")}
                title="AUTHORING + form (handle-capable)"
              >
                Form
              </button>
              <button
                type="button"
                data-testid="dais-rail-tool-face"
                data-control-id="tool-face"
                data-active={activeDomain === "face" ? "1" : "0"}
                aria-pressed={activeDomain === "face"}
                onClick={() => onTool("face")}
                title="AUTHORING + face (handle-capable)"
              >
                Face
              </button>
              <button
                type="button"
                data-testid="dais-rail-reset"
                data-control-id="reset-expression"
                onClick={onReset}
              >
                Reset
              </button>
            </div>
          </section>
        </>
      ) : (
        <section
          className="dais-control-rail__section dais-control-rail__section--review-only"
          data-testid="dais-rail-review-only"
        >
          <p className="dais-control-rail__label">Review</p>
          <p className="dais-control-rail__note">
            Character crop primary · labels outside face · Not Cody acceptance
          </p>
        </section>
      )}

      {tuningLab ? (
        <div data-chapter="proof">
          <TuningLabPanel lab={tuningLab} referenceTraining={referenceTraining} studioPilot={studioPilot} />
        </div>
      ) : null}

      <p
        className="dais-control-rail__note"
        data-testid="dais-rail-status"
        title="Shell-owned tools · Dais render-only · Not Cody visual acceptance"
      >
        {status}
      </p>
    </aside>
  );
}

export default DaisControlRail;
