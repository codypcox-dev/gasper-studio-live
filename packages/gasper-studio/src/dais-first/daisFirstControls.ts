/**
 * Dais-first interaction mappers — pure helpers wired to real adapter / dais paths.
 * Frame step, keyboard map, A/B compare, embodiment/expression/design domain.
 * Does not claim Cody visual acceptance.
 */

import type {
  DesignDomainId,
  StageMode,
  WorldClassStudioAdapter,
} from "../../../desktop/src/studio/worldclass/adapter/types";
import {
  applyExpressionToDais,
  resetDaisExpression,
  setLiveExpressionGain,
  type ApplyExpressionResult,
} from "../expression/daisManipulation";
import {
  EIGHT_HOLD_STATE_IDS,
  type EightHoldStateId,
} from "./daisReviewMode";
import {
  OPERATE_SHOT,
  WALK_REVIEW_FRAME,
  WALK_REVIEW_SHOT,
  operateRestModePolicy,
  walkReviewModePolicy,
  type StudioShotId,
} from "./walkReviewShot";

export { EIGHT_HOLD_STATE_IDS };
export type { EightHoldStateId };

/** Default review frame rate (matches EA-V008 capture target). */
export const DEFAULT_FRAME_FPS = 60;

/** Milliseconds per frame at the given fps. */
export function frameDurationMs(fps: number = DEFAULT_FRAME_FPS): number {
  const f = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FRAME_FPS;
  return 1000 / f;
}

/** Adapter surface used by control mappers (subset + extended production methods). */
export type DaisFirstAdapter = WorldClassStudioAdapter & {
  resetExpressionStudio?: () => ApplyExpressionResult;
  pinProofBaseline?: () => { ok: boolean; keyCount: number };
  compareProofBaseline?: () => {
    ok: boolean;
    identical?: boolean;
    maxAbsDelta?: number;
    deltaCount?: number;
    error?: string;
  };
};

export type FrameStepResult = {
  ok: boolean;
  fromMs: number;
  toMs: number;
  deltaMs: number;
  fps: number;
};

/**
 * Step playhead by ±1 frame (default 60fps). Clamps to [0, durationMs].
 */
export function stepFrame(
  adapter: DaisFirstAdapter,
  direction: 1 | -1,
  options?: {
    fps?: number;
    playheadMs?: number;
    durationMs?: number;
  },
): FrameStepResult {
  const fps = options?.fps ?? DEFAULT_FRAME_FPS;
  const deltaMs = frameDurationMs(fps) * direction;
  const snap = adapter.getSnapshot();
  const fromMs =
    typeof options?.playheadMs === "number"
      ? options.playheadMs
      : snap.animation.playheadMs;
  const clip = snap.animation.clips.find(
    (c) => c.id === snap.animation.activeClipId,
  );
  const durationMs =
    typeof options?.durationMs === "number"
      ? options.durationMs
      : (clip?.durationMs ?? snap.animation.visibleRangeMs.end ?? 0);
  const toMs = Math.max(0, Math.min(durationMs, fromMs + deltaMs));
  adapter.scrub(toMs);
  return { ok: true, fromMs, toMs, deltaMs, fps };
}

/** Keyboard command identifiers for the Dais-first host. */
export type DaisKeyboardCommand =
  | "play-toggle"
  | "interrupt"
  | "frame-back"
  | "frame-forward"
  | "reset"
  | "jump-home"
  | "jump-end"
  | "ab-pin"
  | "ab-compare";

/**
 * Keyboard → command map for Dais-first traversal.
 * Complements shell keyboard; host-local handlers cover frame/reset/A-B.
 */
export const DAIS_KEYBOARD_MAP: Readonly<
  Record<string, DaisKeyboardCommand>
> = {
  " ": "play-toggle",
  Space: "play-toggle",
  Escape: "interrupt",
  ArrowLeft: "frame-back",
  ArrowRight: "frame-forward",
  r: "reset",
  R: "reset",
  Home: "jump-home",
  End: "jump-end",
  b: "ab-pin",
  B: "ab-pin",
  c: "ab-compare",
  C: "ab-compare",
};

/**
 * Keys also handled by WorldClassStudioShell — host must stopPropagation
 * after single-dispatch so shell does not double-fire (often at different fps).
 */
export const SHELL_SHARED_KEY_COMMANDS: ReadonlySet<DaisKeyboardCommand> =
  new Set([
    "play-toggle",
    "interrupt",
    "frame-back",
    "frame-forward",
    "jump-home",
    "jump-end",
  ]);

/**
 * Dais-only keys the shell does not handle — safe for outside-host window bind.
 */
export const WINDOW_ONLY_KEY_COMMANDS: ReadonlySet<DaisKeyboardCommand> =
  new Set(["reset", "ab-pin", "ab-compare"]);

/**
 * Resolve a keyboard event-like object to a Dais command.
 * Ignores events from form fields (input/select/textarea).
 * Ignores Space on BUTTON (native activate / avoid play-toggle steal).
 */
export function resolveDaisKeyCommand(event: {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  targetTag?: string;
}): DaisKeyboardCommand | null {
  const tag = (event.targetTag || "").toUpperCase();
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  // Space on button activates the button — do not also play-toggle.
  if (tag === "BUTTON" && (event.key === " " || event.code === "Space")) {
    return null;
  }
  if (DAIS_KEYBOARD_MAP[event.key]) return DAIS_KEYBOARD_MAP[event.key];
  if (event.code && DAIS_KEYBOARD_MAP[event.code]) {
    return DAIS_KEYBOARD_MAP[event.code];
  }
  return null;
}

export type DispatchHandlers = {
  playToggle: () => void;
  interrupt: () => void;
  frameBack: () => void;
  frameForward: () => void;
  reset: () => void;
  jumpHome: () => void;
  jumpEnd: () => void;
  abPin: () => void;
  abCompare: () => void;
};

/** Dispatch a resolved command to handlers. Returns true if handled. */
export function dispatchDaisKeyCommand(
  cmd: DaisKeyboardCommand,
  handlers: DispatchHandlers,
): boolean {
  switch (cmd) {
    case "play-toggle":
      handlers.playToggle();
      return true;
    case "interrupt":
      handlers.interrupt();
      return true;
    case "frame-back":
      handlers.frameBack();
      return true;
    case "frame-forward":
      handlers.frameForward();
      return true;
    case "reset":
      handlers.reset();
      return true;
    case "jump-home":
      handlers.jumpHome();
      return true;
    case "jump-end":
      handlers.jumpEnd();
      return true;
    case "ab-pin":
      handlers.abPin();
      return true;
    case "ab-compare":
      handlers.abCompare();
      return true;
    default:
      return false;
  }
}

/** Build default handlers bound to a production adapter. */
export function buildDaisKeyHandlers(
  adapter: DaisFirstAdapter,
  fps: number = DEFAULT_FRAME_FPS,
): DispatchHandlers {
  return {
    playToggle: () => {
      const snap = adapter.getSnapshot();
      if (snap.animation.playback === "playing") adapter.pause();
      else adapter.play();
    },
    interrupt: () => adapter.interrupt(),
    frameBack: () => {
      stepFrame(adapter, -1, { fps });
    },
    frameForward: () => {
      stepFrame(adapter, 1, { fps });
    },
    reset: () => {
      resetExpressionViaAdapter(adapter);
    },
    jumpHome: () => adapter.setPlayhead(0),
    jumpEnd: () => {
      const snap = adapter.getSnapshot();
      const clip = snap.animation.clips.find(
        (c) => c.id === snap.animation.activeClipId,
      );
      const dur = clip?.durationMs ?? snap.animation.visibleRangeMs.end ?? 0;
      adapter.setPlayhead(dur);
    },
    abPin: () => pinAbBaseline(adapter),
    abCompare: () => compareAbBaseline(adapter),
  };
}

/**
 * Enable direct manipulation: AUTHORING stage + design domain tool
 * so stage handles appear (shell-owned; Dais remains render-only).
 */
export function enableDirectManipulation(
  adapter: DaisFirstAdapter,
  domain: DesignDomainId = "form",
): { stageMode: StageMode; domain: DesignDomainId } {
  adapter.setStageMode?.("author");
  adapter.setDesignDomain(domain);
  return { stageMode: "author", domain };
}

/** Apply expression through real grammar path (adapter or daisManipulation). */
export function selectExpression(
  adapter: DaisFirstAdapter,
  fixtureId: string,
): ApplyExpressionResult | void {
  if (typeof adapter.setExpression === "function") {
    adapter.setExpression(fixtureId);
    return;
  }
  return applyExpressionToDais(fixtureId);
}

/** Set embodiment through document-first adapter path. */
export function selectEmbodiment(
  adapter: DaisFirstAdapter,
  embodimentId: string,
): void {
  adapter.setEmbodiment?.(embodimentId);
}

/** Control-as-gain via live expression session. */
export function setExpressionGain(gain: number): ApplyExpressionResult {
  return setLiveExpressionGain(gain);
}

/** Reset expression → neutral-settled / presence. */
export function resetExpressionViaAdapter(
  adapter: DaisFirstAdapter,
): ApplyExpressionResult {
  if (typeof adapter.resetExpressionStudio === "function") {
    return adapter.resetExpressionStudio();
  }
  return resetDaisExpression();
}

/** Design parameter commit (visible character effect). */
export function commitDesignParam(
  adapter: DaisFirstAdapter,
  domain: DesignDomainId,
  paramId: string,
  value: number,
): void {
  adapter.setDesignParameter?.(domain, paramId, value);
}

/** Design parameter live preview (slider drag). */
export function previewDesignParam(
  adapter: DaisFirstAdapter,
  domain: DesignDomainId,
  paramId: string,
  value: number,
): void {
  adapter.previewDesignParameter?.(domain, paramId, value);
}

/** A/B pin current live pose as proof baseline. */
export function pinAbBaseline(adapter: DaisFirstAdapter): {
  ok: boolean;
  keyCount: number;
} {
  if (typeof adapter.pinProofBaseline === "function") {
    return adapter.pinProofBaseline();
  }
  return { ok: false, keyCount: 0 };
}

/** A/B compare live pose to pinned baseline. */
export function compareAbBaseline(adapter: DaisFirstAdapter): {
  ok: boolean;
  identical?: boolean;
  maxAbsDelta?: number;
  deltaCount?: number;
  error?: string;
} {
  if (typeof adapter.compareProofBaseline === "function") {
    return adapter.compareProofBaseline();
  }
  return { ok: false, error: "no_compare" };
}

/** Primary design parameters exposed on the control rail. */
export const RAIL_DESIGN_PARAMS: ReadonlyArray<{
  domain: DesignDomainId;
  paramId: string;
  label: string;
  controlId: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    domain: "form",
    paramId: "relief_amplitude",
    label: "Relief",
    controlId: "rig-relief",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    domain: "face",
    paramId: "eye_openness",
    label: "Eye",
    controlId: "rig-eye",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    domain: "energy",
    paramId: "energy_level",
    label: "Energy",
    controlId: "rig-energy",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    domain: "form",
    paramId: "yaw",
    label: "Yaw 2.5D",
    controlId: "rig-yaw",
    min: 0,
    max: 45,
    step: 0.5,
  },
];

/**
 * Direct-manipulation domain tools on the rail.
 * Form/Face only — GasperDaisStage paints handles for form|face|light|material;
 * energy/morph have no handle affordance and must not appear as primary DM tools.
 */
export const RAIL_DOMAIN_TOOLS: ReadonlyArray<{
  domain: DesignDomainId;
  label: string;
  controlId: string;
}> = [
  { domain: "form", label: "Form", controlId: "tool-form" },
  { domain: "face", label: "Face", controlId: "tool-face" },
];

/** Embodiments exposed as primary rail buttons (all 8 authored FORM_PROFILES). */
export const RAIL_EMBODIMENTS = [
  "presence",
  "singularity",
  "comet",
  "dormant-orbit",
  "wispwalker",
  "halo",
  "lantern",
  "low-orbit",
] as const;

/**
 * Structural contract: keyboard map covers required traversal commands.
 */
export function keyboardMapCoversTraversal(
  map: Readonly<Record<string, DaisKeyboardCommand>> = DAIS_KEYBOARD_MAP,
): { ok: boolean; missing: DaisKeyboardCommand[] } {
  const required: DaisKeyboardCommand[] = [
    "frame-back",
    "frame-forward",
    "reset",
    "play-toggle",
    "interrupt",
  ];
  const values = new Set(Object.values(map));
  const missing = required.filter((c) => !values.has(c));
  return { ok: missing.length === 0, missing };
}

/* —— Eight-state + review-mode mappers (owner-review surface) —— */

/** Minimal Dais surface for eight-state hold selection. */
export type DaisEightStateSurface = {
  living?: {
    goEightState?: (
      id: string,
      opts?: { duration?: number; interrupt?: boolean },
    ) => void;
  };
  setMicrostate?: (id: string, opts?: { duration?: number }) => void;
  livingStatus?: () => { eightState?: string | null; running?: boolean };
};

/**
 * Resolve the packaged Dais controller (shell-owned window hook).
 * No DOM inspection of providers; only the Studio-owned stage handle.
 */
export function resolvePackagedDais(): DaisEightStateSurface | null {
  try {
    const g = globalThis as unknown as {
      __GASPER_DAIS__?: DaisEightStateSurface;
    };
    return g.__GASPER_DAIS__ ?? null;
  } catch {
    return null;
  }
}

export type SelectEightStateResult = {
  ok: boolean;
  stateId: string;
  path: "goEightState" | "setMicrostate" | "none";
  error?: string;
};

/**
 * Hold the living loop on one of the eight review states from current values.
 * Prefers living.goEightState (GSAP retarget); falls back to setMicrostate.
 */
export function selectEightHoldState(
  stateId: string,
  opts?: {
    dais?: DaisEightStateSurface | null;
    duration?: number;
  },
): SelectEightStateResult {
  if (!(EIGHT_HOLD_STATE_IDS as readonly string[]).includes(stateId)) {
    return {
      ok: false,
      stateId,
      path: "none",
      error: `not_an_eight_hold_state:${stateId}`,
    };
  }
  const dais = opts?.dais ?? resolvePackagedDais();
  if (!dais) {
    return { ok: false, stateId, path: "none", error: "no_dais" };
  }
  const duration = opts?.duration ?? 0.55;
  if (typeof dais.living?.goEightState === "function") {
    dais.living.goEightState(stateId, { duration });
    return { ok: true, stateId, path: "goEightState" };
  }
  if (typeof dais.setMicrostate === "function") {
    dais.setMicrostate(stateId, { duration });
    return { ok: true, stateId, path: "setMicrostate" };
  }
  return { ok: false, stateId, path: "none", error: "no_eight_state_path" };
}

/**
 * Core transition: wake closing route into Neutral (eight-state wake id).
 */
export function transitionWake(opts?: {
  dais?: DaisEightStateSurface | null;
  duration?: number;
}): SelectEightStateResult {
  const dais = opts?.dais ?? resolvePackagedDais();
  if (!dais) {
    return { ok: false, stateId: "wake", path: "none", error: "no_dais" };
  }
  const duration = opts?.duration ?? 0.7;
  if (typeof dais.living?.goEightState === "function") {
    dais.living.goEightState("wake", { duration, interrupt: true });
    return { ok: true, stateId: "wake", path: "goEightState" };
  }
  return { ok: false, stateId: "wake", path: "none", error: "no_wake_path" };
}

/**
 * Core transition: interrupt living motion (adapter + optional dais).
 */
export function transitionInterrupt(adapter: DaisFirstAdapter): void {
  adapter.interrupt();
}

/**
 * Read current eight-state id from living status when available.
 */
export function readActiveEightState(
  dais?: DaisEightStateSurface | null,
): string | null {
  const d = dais ?? resolvePackagedDais();
  try {
    const st = d?.livingStatus?.();
    return st?.eightState ?? null;
  } catch {
    return null;
  }
}

/* —— GASPER-SPACE-001 PHASE B (D-0090): World & Physics rail surface —— */

/** Rail-facing parameter set of the world-physics authority. */
export type WorldPhysicsRailParams = {
  gravityScale?: number;
  restitution?: number;
  launchPower?: number;
  intensity?: number;
};

/** Structural slice of the packaged rig controller the physics rail drives. */
export type DaisWorldPhysicsSurface = {
  setWorldPhysicsParams?: (params: WorldPhysicsRailParams) => void;
  getWorldPhysicsParams?: () => Required<WorldPhysicsRailParams>;
  launchWorldBounce?: (cfg?: { x0?: number; vx?: number; vy?: number }) => void;
  launchWorldComet?: (cfg?: {
    x0?: number;
    vx?: number;
    vy?: number;
    gatherSeconds?: number;
  }) => void;
  disarmWorldBody?: () => void;
};

/** Same shell-owned hook as resolvePackagedDais (window.__GASPER_DAIS__). */
export function resolveWorldPhysicsSurface(): DaisWorldPhysicsSurface | null {
  try {
    const g = globalThis as unknown as {
      __GASPER_DAIS__?: DaisWorldPhysicsSurface;
    };
    return g.__GASPER_DAIS__ ?? null;
  } catch {
    return null;
  }
}

export type WorldPhysicsActionResult = { ok: boolean; error?: string };

/** Merge partial physics params into the authority (fail-closed off-rig). */
export function applyWorldPhysicsParams(
  params: WorldPhysicsRailParams,
  surface?: DaisWorldPhysicsSurface | null,
): WorldPhysicsActionResult {
  const s = surface ?? resolveWorldPhysicsSurface();
  if (!s?.setWorldPhysicsParams) return { ok: false, error: "no_surface" };
  try {
    s.setWorldPhysicsParams(params);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** S2 — the bouncing ball performance. */
export function launchWorldBounceFromRail(
  surface?: DaisWorldPhysicsSurface | null,
): WorldPhysicsActionResult {
  const s = surface ?? resolveWorldPhysicsSurface();
  if (!s?.launchWorldBounce) return { ok: false, error: "no_surface" };
  try {
    s.launchWorldBounce();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** S4 — the comet shot performance (gather hold → impulse). */
export function launchWorldCometFromRail(
  surface?: DaisWorldPhysicsSurface | null,
): WorldPhysicsActionResult {
  const s = surface ?? resolveWorldPhysicsSurface();
  if (!s?.launchWorldComet) return { ok: false, error: "no_surface" };
  try {
    s.launchWorldComet();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Release the physics authority — the character eases home. */
export function disarmWorldBodyFromRail(
  surface?: DaisWorldPhysicsSurface | null,
): WorldPhysicsActionResult {
  const s = surface ?? resolveWorldPhysicsSurface();
  if (!s?.disarmWorldBody) return { ok: false, error: "no_surface" };
  try {
    s.disarmWorldBody();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* —— GASPER-CRAFT-001 · C4: Craft rail surface —— */

/** The craft dials as seen from the rail. */
export type CraftRailSettings = {
  /** Amplitude dial 0.5–2 (default 1.25) — volume law enforced downstream. */
  exaggeration?: number;
  /**
   * Shot dial (amended D-0097): "authored" performs beat scales as authored
   * (the framing the amplitude floors were authored against); medium/wide
   * pull every beat scale one step toward the bias scale.
   */
  shotBias?: "authored" | "medium" | "wide";
  /** Pack time scale 0.75–1.25. */
  tempo?: number;
};

/** Structural slice of the packaged rig controller the craft rail drives. */
export type DaisCraftRailSurface = {
  setPerformancePackParams?: (params: {
    tempo?: number;
    exaggeration?: number;
  }) => void;
  setCraftShotBias?: (bias: string) => void;
  getCraftShotBias?: () => string;
  runCraftPack?: (packId: string) => boolean;
  stopCraftPack?: () => void;
};

/** Same shell-owned hook as resolveWorldPhysicsSurface (window.__GASPER_DAIS__). */
export function resolveCraftRailSurface(): DaisCraftRailSurface | null {
  try {
    const g = globalThis as unknown as { __GASPER_DAIS__?: DaisCraftRailSurface };
    return g.__GASPER_DAIS__ ?? null;
  } catch {
    return null;
  }
}

/** Apply the craft dials to the pack authority (fail-closed off-rig). */
export function applyCraftRailParams(
  params: CraftRailSettings,
  surface?: DaisCraftRailSurface | null,
): WorldPhysicsActionResult {
  const s = surface ?? resolveCraftRailSurface();
  if (!s?.setPerformancePackParams && !s?.setCraftShotBias) {
    return { ok: false, error: "no_surface" };
  }
  try {
    if (typeof params.exaggeration === "number" || typeof params.tempo === "number") {
      s?.setPerformancePackParams?.({
        exaggeration: params.exaggeration,
        tempo: params.tempo,
      });
    }
    if (
      params.shotBias === "authored" ||
      params.shotBias === "medium" ||
      params.shotBias === "wide"
    ) {
      s?.setCraftShotBias?.(params.shotBias);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* —— GASPER-CRAFT-001 · C5: shipped craft-pack intake —— */

/** The shipped craft pack ids (mirror of curves/CraftPacks registry). */
export const CRAFT_PACK_IDS = [
  "s2-bounce",
  "s2-bounce/blocking",
  "s4-comet",
  "s4-comet/blocking",
] as const;

/** Run a shipped craft pack on the dais (fail-closed off-rig / unknown id). */
export function runDaisCraftPack(
  packId: string,
  surface?: DaisCraftRailSurface | null,
): WorldPhysicsActionResult {
  const s = surface ?? resolveCraftRailSurface();
  if (!s?.runCraftPack) return { ok: false, error: "no_surface" };
  try {
    return s.runCraftPack(packId)
      ? { ok: true }
      : { ok: false, error: `unknown_or_rejected_pack:${packId}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Release the craft-pack authority (renderer eases Gasper home). */
export function stopDaisCraftPack(
  surface?: DaisCraftRailSurface | null,
): WorldPhysicsActionResult {
  const s = surface ?? resolveCraftRailSurface();
  if (!s?.stopCraftPack) return { ok: false, error: "no_surface" };
  try {
    s.stopCraftPack();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* —— N336 walk-review shot: authored body hold + wander gate —— */

export type WalkReviewViewport = {
  releaseUserWorldFrame?: () => void;
  holdUserWorldFrame?: (frame?: {
    zoom?: number;
    panX?: number;
    panY?: number;
  }) => void;
  getState?: () => {
    zoom?: number;
    panX?: number;
    panY?: number;
    autoFit?: boolean;
    userWorldFrameHeld?: boolean;
  };
};

export type DaisWalkReviewSurface = {
  getViewport?: () => WalkReviewViewport | undefined;
  setWanderEnabled?: (v: boolean) => void;
  ensurePhysicsDriver?: () => void;
  living?: {
    applyModePolicy?: (policy: {
      autoSequence: boolean;
      restrainedIdle: boolean;
      freezeSequence: boolean;
    }) => void;
  };
};

export function resolveWalkReviewSurface(): DaisWalkReviewSurface | null {
  try {
    const g = globalThis as unknown as { __GASPER_DAIS__?: DaisWalkReviewSurface };
    return g.__GASPER_DAIS__ ?? null;
  } catch {
    return null;
  }
}

export type WalkReviewActionResult = {
  ok: boolean;
  error?: string;
  shot?: StudioShotId;
  wander?: boolean;
};

function markProductShot(shot: StudioShotId): void {
  try {
    const root = document.querySelector("[data-product='gasper-studio']");
    if (root instanceof HTMLElement) root.setAttribute("data-shot", shot);
  } catch {
    /* jsdom / no document */
  }
}

/** Hold the walk-review body crop and open the wander gate. Never writes travel. */
export function applyWalkReviewShot(
  surface?: DaisWalkReviewSurface | null,
): WalkReviewActionResult {
  const s = surface ?? resolveWalkReviewSurface();
  const vp = s?.getViewport?.();
  if (!vp?.holdUserWorldFrame || !s?.setWanderEnabled) {
    return { ok: false, error: "no_surface" };
  }
  try {
    s.ensurePhysicsDriver?.();
    s.living?.applyModePolicy?.(walkReviewModePolicy());
    vp.releaseUserWorldFrame?.();
    vp.holdUserWorldFrame({ ...WALK_REVIEW_FRAME });
    s.setWanderEnabled(true);
    markProductShot(WALK_REVIEW_SHOT);
    return { ok: true, shot: WALK_REVIEW_SHOT, wander: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Stand wander down. Keep the body hold so the plant stays reviewable. */
export function releaseWalkReviewShot(
  surface?: DaisWalkReviewSurface | null,
): WalkReviewActionResult {
  const s = surface ?? resolveWalkReviewSurface();
  if (!s?.setWanderEnabled) return { ok: false, error: "no_surface" };
  try {
    s.setWanderEnabled(false);
    s.living?.applyModePolicy?.(operateRestModePolicy());
    markProductShot(OPERATE_SHOT);
    return { ok: true, shot: OPERATE_SHOT, wander: false };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export type DaisWalkBooSurface = {
  playWalkBooTwenty?: () => void;
  playNorthstarTwenty?: () => void;
  setWalkBooLoop?: (v: boolean) => void;
  isWalkBooLoop?: () => boolean;
  stopWalkBooTwenty?: () => void;
};

function resolveWalkBooSurface(): (DaisWalkReviewSurface & DaisWalkBooSurface) | null {
  return resolveWalkReviewSurface() as (DaisWalkReviewSurface & DaisWalkBooSurface) | null;
}

export function setReliefPresetFromRail(preset: string): { ok: boolean; error?: string } {
  try {
    const g = globalThis as {
      SidekickFormMasterRig?: { setReliefPreset?: (v: string) => void };
      __GASPER_DAIS__?: { setReliefPreset?: (v: string) => void };
    };
    if (g.SidekickFormMasterRig?.setReliefPreset) {
      g.SidekickFormMasterRig.setReliefPreset(preset);
      return { ok: true };
    }
    const rig = (document.querySelector("[data-gasper-stage]") as HTMLElement | null)?.ownerDocument
      ? g.SidekickFormMasterRig
      : null;
    if (rig?.setReliefPreset) {
      rig.setReliefPreset(preset);
      return { ok: true };
    }
    return { ok: false, error: "no_surface" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function playNorthstarTwentyFromRail(
  surface?: DaisWalkBooSurface | null,
): WalkReviewActionResult {
  const s = surface ?? resolveWalkBooSurface();
  if (!s?.playNorthstarTwenty) return { ok: false, error: "no_surface" };
  try {
    s.playNorthstarTwenty();
    markProductShot(WALK_REVIEW_SHOT);
    return { ok: true, shot: WALK_REVIEW_SHOT, wander: false };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function playWalkBooTwentyFromRail(
  surface?: DaisWalkBooSurface | null,
): WalkReviewActionResult {
  const s = surface ?? resolveWalkBooSurface();
  if (!s?.playWalkBooTwenty) return { ok: false, error: "no_surface" };
  try {
    s.playWalkBooTwenty();
    markProductShot(WALK_REVIEW_SHOT);
    return { ok: true, shot: WALK_REVIEW_SHOT, wander: false };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function setWalkBooLoopFromRail(
  loop: boolean,
  surface?: DaisWalkBooSurface | null,
): WalkReviewActionResult {
  const s = surface ?? resolveWalkBooSurface();
  if (!s?.setWalkBooLoop || !s.playNorthstarTwenty) return { ok: false, error: "no_surface" };
  try {
    s.setWalkBooLoop(loop);
    if (loop) s.playNorthstarTwenty();
    markProductShot(WALK_REVIEW_SHOT);
    return { ok: true, shot: WALK_REVIEW_SHOT, wander: false };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function stopWalkBooTwentyFromRail(
  surface?: DaisWalkBooSurface | null,
): WalkReviewActionResult {
  const s = surface ?? resolveWalkBooSurface();
  if (!s?.stopWalkBooTwenty) return { ok: false, error: "no_surface" };
  try {
    s.stopWalkBooTwenty();
    return { ok: true, shot: OPERATE_SHOT, wander: false };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
