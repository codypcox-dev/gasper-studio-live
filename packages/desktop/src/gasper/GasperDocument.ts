/**
 * Gasper document mount â€” dual-renderer authority recovery.
 *
 * Production default (Legacy Authority):
 * - local gasper-rig-v655.svg + all-script-0..3 via mountGasperDocumentLegacyFormMaster
 * - complete original character until native parity is proven
 * - no iframe, no Sidekick HTML discovery, no AgentBridge, no Playwright
 *
 * Native candidate (parity lab only):
 * - mountGasperDocumentNativeCandidate â†’ NativeGasperRigInstance + extracted SVG
 * - incomplete face/material/relief stack â€” not production visual authority
 */

import svgSource from "./assets/gasper-rig-v655.svg?raw";
import script0 from "./assets/all-script-0.js?raw";
import script1 from "./assets/all-script-1.js?raw";
import script2 from "./assets/all-script-2.js?raw";
import script3 from "./assets/all-script-3.js?raw"; // life9 hold inspect
import vectorMaterialRuntime from "./assets/vector-material.js?raw";
import materialFeatureManifest from "./assets/vector-material-manifest.json";
import { GASPER_TOPOLOGY } from "./GasperTopologyLock";
import {
  getEmbodimentProfile,
  listEmbodimentProfiles,
  profileToDomainBindings,
} from "./GasperRigDefinition";
import {
  applyBoundMorphFrame,
  clearMorphFrame,
} from "./GasperMorphAdapter";
import {
  getExpressionFixture,
  listExpressionFamilies,
} from "./GasperExpressionFixtures";
import { projectExpressionFixture } from "./GasperExpressionProjector";
import {
  PRODUCTION_AUTHORITY_CLASS,
  PRODUCTION_AUTHORITY_ID,
} from "./renderer/productionAuthority";
import { getGasperOrganismClock } from "./clock";
import {
  VisibleFacialBinding,
  type DocumentGeometryMeasures,
} from "./facial";
import {
  getGasperVectorProjectionAuthority,
  type GasperVectorProjectionLease,
} from "./projection";
import {
  evaluatePressureMaterialCoupling,
  type PressureMaterialInput,
  type PressureMaterialResponse,
} from "./projection/PressureMaterialCoupling";
import {
  PROJECTOR_FACE_VIS_FLOORS,
  resolveProjectorFaceVisibility,
} from "./continuity/noBlackoutInvariant";
import { controlAlreadyNeutralized } from "./legacyFocusPolicy";

const GASPER_MATERIAL_FEATURE_MANIFEST = Object.freeze({
  packet: materialFeatureManifest.packet,
  version: materialFeatureManifest.version,
  clock: materialFeatureManifest.clock,
  coordinateSpace: materialFeatureManifest.coordinateSpace,
  cosmicFlecks: Object.freeze(
    materialFeatureManifest.cosmicFlecks.map((anchor) => Object.freeze({ ...anchor })),
  ),
  cosmicStreaks: Object.freeze(
    materialFeatureManifest.cosmicStreaks.map((anchor) => Object.freeze({ ...anchor })),
  ),
  subsurfaceBands: Object.freeze(
    materialFeatureManifest.subsurfaceBands.map((anchor) => Object.freeze({ ...anchor })),
  ),
  hardHighlights: Object.freeze(
    materialFeatureManifest.hardHighlights.map((anchor) => Object.freeze({ ...anchor })),
  ),
});

type FormMasterRender = (...args: any[]) => unknown;
type ProjectionRenderWrapper = (render: FormMasterRender) => FormMasterRender;

type GasperProjectionHost = typeof globalThis & {
  __GASPER_VECTOR_PROJECTION_WRAP_RENDER__?: ProjectionRenderWrapper;
  __GASPER_MATERIAL_FEATURE_MANIFEST__?: typeof GASPER_MATERIAL_FEATURE_MANIFEST;
  __GASPER_PRESSURE_MATERIAL__?: {
    readonly packet: "GASPER-VEC-401";
    readonly evaluate: (input: PressureMaterialInput) => PressureMaterialResponse;
  };
  __GASPER_FACE_VISIBILITY_POLICY__?: {
    readonly packet: "GASPER-FINISH-01";
    readonly floors: typeof PROJECTOR_FACE_VIS_FLOORS;
    readonly resolve: typeof resolveProjectorFaceVisibility;
  };
};

export type FormMasterRig = {
  applyCanonicalProjection?: (packet: {
    readonly version: "1";
    readonly packet: "GASPER-UNIFIED-FIELD-001";
    readonly revision: number;
    readonly sourceHash: string;
    readonly domains: Readonly<Record<string, Readonly<Record<string, number>>>>;
  }) => void;
  setProfile: (name: string, settle?: "settle" | boolean) => void;
  setFixture: (id: string) => void;
  setFixtureImmediate: (id: string) => void;
  setMorphPreview: (from: string, to: string, mix: number) => void;
  clearMorphPreview: () => void;
  setYaw: (v: number) => void;
  setPaused: (v: boolean) => void;
  setMotion: (v: number) => void;
  requestOneFrame?: () => void;
  getSnapshot: () => Record<string, unknown>;
  getExpressionState: () => Record<string, unknown>;
  listEmotionFamilies: () => Array<{
    family: string;
    fixtures: Array<{ id: string; label: string }>;
  }>;
  setExpressionPreview?: (from: string, to: string, mix: number) => void;
  triggerMicrostate?: (id: string, options?: unknown) => unknown;
  morphToBehavioral?: (name: string, options?: unknown) => Promise<unknown>;
  setReliefPreset?: (v: string) => void;
  /** VEC-401: release the FormMaster clock subscriber before DOM teardown. */
  disposeOrganismClockSubscription?: () => void;
  /** VEC-401: inspect the clock port adopted by FormMaster. */
  inspectOrganismClock?: () => Record<string, unknown>;
};

export type GasperDocumentMount = {
  host: HTMLElement;
  svgRoot: SVGSVGElement;
  idleRig: SVGGElement | null;
  rig: FormMasterRig;
  destroy: () => void;
  topology: {
    contourSamples: number;
    structuralNodes: number;
    structuralTriangles: number;
  };
  legacyFormMaster: boolean;
  authorityId: string;
  authorityClass: string;
  geometryExecutor: "form-master" | "native";
  productionPath: boolean;
  labOnly: boolean;
};

export const HIDDEN_STUB_COUNT_NORMAL_RUNTIME = 0;
export const NATIVE_CANDIDATE_AUTHORITY_ID = "native-gasper-candidate" as const;
export const NATIVE_CANDIDATE_AUTHORITY_CLASS = "native-candidate" as const;

function stampMountAuthority(
  mountEl: HTMLElement,
  truth: Pick<
    GasperDocumentMount,
    | "authorityId"
    | "authorityClass"
    | "geometryExecutor"
    | "legacyFormMaster"
    | "productionPath"
    | "labOnly"
  >,
): void {
  mountEl.setAttribute("data-gasper-authority", truth.authorityClass);
  mountEl.setAttribute("data-gasper-renderer", truth.authorityId);
  mountEl.setAttribute("data-gasper-geometry-executor", truth.geometryExecutor);

  if (truth.productionPath) {
    mountEl.setAttribute("data-gasper-production", "1");
    mountEl.removeAttribute("data-gasper-production-forbidden");
  } else {
    mountEl.removeAttribute("data-gasper-production");
    mountEl.setAttribute("data-gasper-production-forbidden", "1");
  }

  if (truth.labOnly) {
    mountEl.setAttribute("data-gasper-lab-only", "1");
  } else {
    mountEl.removeAttribute("data-gasper-lab-only");
  }

  if (truth.legacyFormMaster) {
    mountEl.setAttribute("data-gasper-legacy-authority", "1");
  } else {
    mountEl.removeAttribute("data-gasper-legacy-authority");
  }
}

/**
 * Per-mount native rig (Wave R2 host + Wave R3 deep authority).
 * Profile / fixture / morph project through typed modules â€” not FormMaster scripts.
 */
export class NativeGasperRigInstance implements FormMasterRig {
  private profile = "presence";
  private fixture = "neutral-settled";
  private paused = true;
  private motion = 0.45;
  private yaw = 0;
  private morph: { from: string; to: string; mix: number } | null = null;
  private reliefPreset = "none";
  /** Last domain bindings produced by profile/fixture/morph (for controller). */
  lastProjectedBindings: Record<string, number> = {};
  /** Native-candidate whole-face geometry binding (inspection/parity lab only). */
  private readonly facialBinding: VisibleFacialBinding;

  constructor(
    private readonly svgRoot: SVGSVGElement | null,
    private readonly mountId: string,
  ) {
    this.facialBinding = new VisibleFacialBinding({ svgRoot });
    this.setProfile("wispwalker");
    this.facialBinding.setExpressionAndSettle("neutral-settled", 24);
  }

  setProfile(name: string) {
    const id = name || "wispwalker";
    if (!getEmbodimentProfile(id)) {
      throw new TypeError(`unknown embodiment profile: ${id}`);
    }
    this.profile = id;
    this.morph = null;
    if (this.svgRoot) {
      const report = applyBoundMorphFrame(this.svgRoot, id, id, 1);
      this.lastProjectedBindings = { ...report.domains };
    } else {
      const p = getEmbodimentProfile(id)!;
      this.lastProjectedBindings = profileToDomainBindings(p);
    }
    this.syncDataset();
  }

  setFixture(id: string) {
    const fix = getExpressionFixture(id);
    if (!fix) {
      // Allow unknown ids as soft state (selection may use family labels)
      this.fixture = id || "neutral-settled";
      this.syncDataset();
      return;
    }
    this.fixture = fix.id;
    const proj = projectExpressionFixture(fix.id);
    this.lastProjectedBindings = {
      ...this.lastProjectedBindings,
      ...proj.bindings,
    };
    // Fixture is a target; the shipped continuum resolves whole-face geometry.
    this.facialBinding.setExpression(fix.id, { totalFrames: 24 });
    this.syncDataset();
  }

  setFixtureImmediate(id: string) {
    const fix = getExpressionFixture(id);
    if (!fix) {
      this.setFixture(id);
      return;
    }
    this.fixture = fix.id;
    const proj = projectExpressionFixture(fix.id);
    this.lastProjectedBindings = {
      ...this.lastProjectedBindings,
      ...proj.bindings,
    };
    this.facialBinding.setExpressionAndSettle(fix.id, 24);
    this.syncDataset();
  }

  setMorphPreview(from: string, to: string, mix: number) {
    const m = Math.max(0, Math.min(1, mix));
    this.morph = { from, to, mix: m };
    if (this.svgRoot) {
      const frame = applyBoundMorphFrame(this.svgRoot, from, to, m);
      this.lastProjectedBindings = { ...frame.domains };
      if (m >= 0.999) this.profile = to;
    }
    this.syncDataset();
  }

  clearMorphPreview() {
    this.morph = null;
    if (this.svgRoot) {
      const report = clearMorphFrame(this.svgRoot, this.profile);
      this.lastProjectedBindings = { ...report.domains };
    }
    this.syncDataset();
  }

  setYaw(v: number) {
    this.yaw = v;
  }

  setPaused(v: boolean) {
    this.paused = Boolean(v);
  }

  setMotion(v: number) {
    this.motion = Math.max(0, Math.min(1, Number(v) || 0));
  }

  setReliefPreset(v: string) {
    this.reliefPreset = v || "none";
  }

  requestOneFrame() {
    // Native candidate parity path: host owns the frame request; binding owns
    // only continuum math and document geometry projection.
    if (!this.paused) this.facialBinding.step();
  }

  getFacialBinding(): VisibleFacialBinding {
    return this.facialBinding;
  }

  getFacialGeometryMeasures(): DocumentGeometryMeasures {
    return this.facialBinding.getMeasures();
  }

  getSnapshot(): Record<string, unknown> {
    const p = getEmbodimentProfile(this.profile);
    return {
      candidate: "native-dais-r3",
      profile: this.profile,
      morph: this.morph ? { ...this.morph } : null,
      demoMode: false,
      geometryModel: p?.geometryModel ?? "radial-shared-topology",
      paused: this.paused,
      motion: this.motion,
      contourSamples: GASPER_TOPOLOGY.contourSamples,
      structuralNodes: GASPER_TOPOLOGY.structuralNodes,
      structuralTriangles: GASPER_TOPOLOGY.structuralTriangles,
      reliefSamples: GASPER_TOPOLOGY.adaptiveRelief.fieldSamples,
      activeReliefSamples: GASPER_TOPOLOGY.adaptiveRelief.fieldSamples,
      detailTier: "native",
      reliefPreset: this.reliefPreset,
      topologyStable: true,
      mountId: this.mountId,
      fixture: this.fixture,
      viewYawDegrees: this.yaw,
      nativeWave: "R3",
      face: p?.face ?? true,
      label: p?.label,
      facialGeometry: this.facialBinding.getMeasures(),
      facialRevision: this.facialBinding.getRevision(),
      embodiments: listEmbodimentProfiles().map((x) => x.id),
    };
  }

  getExpressionState(): Record<string, unknown> {
    const fix = getExpressionFixture(this.fixture);
    return {
      fixture: this.fixture,
      family: fix?.family ?? "neutral",
      native: true,
      label: fix?.label,
    };
  }

  listEmotionFamilies() {
    return listExpressionFamilies();
  }

  private syncDataset() {
    const root = this.svgRoot;
    if (!root) return;
    root.dataset.gasperProfile = this.profile;
    root.dataset.gasperFixture = this.fixture;
    root.dataset.gasperMountId = this.mountId;
    root.dataset.gasperNative = "r3";
    if (this.morph) {
      root.dataset.gasperMorphFrom = this.morph.from;
      root.dataset.gasperMorphTo = this.morph.to;
      root.dataset.gasperMorphMix = String(this.morph.mix);
    } else {
      delete root.dataset.gasperMorphFrom;
      delete root.dataset.gasperMorphTo;
      delete root.dataset.gasperMorphMix;
    }
  }
}

let mountSerial = 0;

function mountSvgShell(mountEl: HTMLElement): {
  host: HTMLElement;
  svgRoot: SVGSVGElement;
} {
  mountEl.innerHTML = "";
  mountEl.style.position = "relative";
  mountEl.style.width = "100%";
  mountEl.style.height = "100%";

  const host = document.createElement("div");
  host.className = "gasper-native-host";
  host.style.cssText = "position:absolute;inset:0;overflow:visible";
  host.setAttribute("data-gasper-native-host", "1");
  mountEl.appendChild(host);

  const svgWrap = document.createElement("div");
  svgWrap.className = "gasper-svg-host";
  svgWrap.style.cssText =
    "position:absolute;left:50%;top:50%;width:240px;height:220px;transform:translate(-50%,-50%);transform-origin:center center;overflow:visible";
  svgWrap.innerHTML = svgSource;
  host.appendChild(svgWrap);

  const svgRoot = svgWrap.querySelector("svg") as SVGSVGElement;
  if (!svgRoot) throw new Error("Gasper SVG root missing after mount");
  svgRoot.style.display = "block";
  svgRoot.style.width = "100%";
  svgRoot.style.height = "100%";
  svgRoot.style.overflow = "visible";

  return { host, svgRoot };
}

/**
 * Production Studio mount â€” **Legacy Authority Renderer** (complete character).
 *
 * Product decision (renderer recovery megagoal):
 * NativeGasperRigInstance remains available for parity lab / candidate path,
 * but is **not** the default visual authority until dual-renderer parity passes.
 *
 * Uses local bundled SVG + all-script-0..3 only (no iframe, no Sidekick HTML
 * candidate discovery, no AgentBridge, no Playwright).
 */
export function mountGasperDocument(mountEl: HTMLElement): GasperDocumentMount {
  // Production default: Legacy Authority (complete FormMaster character).
  return mountGasperDocumentLegacyFormMaster(mountEl);
}

/**
 * Native-candidate mount (Wave R2) â€” incomplete character extraction.
 * Use only for dual-renderer lab / explicit native backend selection.
 */
export function mountGasperDocumentNativeCandidate(
  mountEl: HTMLElement,
): GasperDocumentMount {
  const { svgRoot } = mountSvgShell(mountEl);
  const mountId = `gasper-mount-${++mountSerial}`;
  // VEC-701: the rig resolves target/probe state only. Passing null keeps
  // embodiment, morph, facial, and dataset writes off the mixer-owned SVG root.
  const rig = new NativeGasperRigInstance(null, mountId);
  rig.setProfile("wispwalker");
  rig.setMotion(0.45);
  rig.setPaused(true);

  const authorityTruth = {
    authorityId: NATIVE_CANDIDATE_AUTHORITY_ID,
    authorityClass: NATIVE_CANDIDATE_AUTHORITY_CLASS,
    geometryExecutor: "native" as const,
    legacyFormMaster: false,
    productionPath: false,
    labOnly: true,
  };
  stampMountAuthority(mountEl, authorityTruth);

  return {
    host: mountEl,
    svgRoot,
    idleRig: svgRoot.querySelector("#idleRig") as SVGGElement | null,
    rig,
    topology: {
      contourSamples: GASPER_TOPOLOGY.contourSamples,
      structuralNodes: GASPER_TOPOLOGY.structuralNodes,
      structuralTriangles: GASPER_TOPOLOGY.structuralTriangles,
    },
    legacyFormMaster: false,
    authorityId: NATIVE_CANDIDATE_AUTHORITY_ID,
    authorityClass: NATIVE_CANDIDATE_AUTHORITY_CLASS,
    geometryExecutor: "native",
    productionPath: false,
    labOnly: true,
    destroy: () => {
      mountEl.innerHTML = "";
    },
  };
}

// â”€â”€â”€ Migration / regression only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LEGACY_STUB_IDS = [
  "pause", "motion", "motionValue", "yaw", "yawValue", "readout",
  "referencePanel", "referenceToggle", "debug", "debugToggle", "debugPoints",
  "debugEdges", "reset", "resetMesh", "exportMesh", "stage", "allLayers",
  "baselineLayers", "fixtureButtons", "fixtureBlendControls", "microstateButtons",
  "materialLayerControls", "emotionDemo", "enterDormant", "wakePresence",
  "interruptBlocked", "cancelBehavior", "restartIdle", "behaviorBlend",
  "behaviorMemory", "behaviorMicrostate", "behaviorMorph", "behaviorOrbit",
  "behaviorProgress", "behaviorRouteDemo", "behaviorSingularity", "behaviorWake",
  "conversationSequence", "runtimeEmotion", "runtimeFixture", "runtimeInterruptions",
  "runtimeTransition", "runtimeTransitionBar", "idleCycleBar", "idleCycleStatus",
  "coupling", "couplingValue", "interiorEnergy", "interiorValue", "faceAnchorDebug",
] as const;

/**
 * GASPER-007 DOPS-01 / P0-HIDDEN-LEGACY-FOCUS â€” neutralize a legacy FormMaster
 * compatibility subtree so it cannot receive keyboard focus, pointer events, or
 * product automation targeting. Off-canvas translation alone is NOT isolation.
 *
 * GASPER-007-F: when called on the production legacy host (`data-gasper-legacy-host`),
 * only control stubs are neutralized. The host also mounts the FormMaster SVG
 * (`#avatar`); applying visibility:hidden to the whole host erased the Presence face.
 */
export function neutralizeLegacyCompatSubtree(root: HTMLElement): void {
  // Production mount host includes SVG character â€” isolate stubs only, keep face paintable.
  if (root.getAttribute("data-gasper-legacy-host") === "1") {
    root.querySelectorAll<HTMLElement>("[data-gasper-stubs]").forEach((child) => {
      if (child.classList.contains("gasper-svg-host")) return;
      if (child.querySelector("svg#avatar")) return;
      neutralizeLegacyCompatSubtree(child);
    });
    root.querySelectorAll<HTMLElement>(".gasper-svg-host").forEach((el) => {
      el.style.visibility = "visible";
      el.style.opacity = el.style.opacity || "1";
      el.removeAttribute("aria-hidden");
      try {
        (el as HTMLElement & { inert?: boolean }).inert = false;
      } catch {
        /* */
      }
    });
    const avatar = root.querySelector<SVGElement>("svg#avatar");
    if (avatar) {
      avatar.style.visibility = "visible";
      avatar.removeAttribute("visibility");
      avatar.removeAttribute("aria-hidden");
    }
    return;
  }
  // Never neutralize the product SVG stage itself.
  if (
    root.classList.contains("gasper-svg-host") ||
    root.id === "avatar" ||
    root.getAttribute("data-gasper-product-stage") === "1"
  ) {
    return;
  }

  // CYCLE-7 FRAME BUDGET (frame-budget-phd-memo F2 â€” observer-convergence law):
  // every write below is guarded by target-state compare. Identical-value
  // setAttribute STILL queues a mutation record (machine-proven this session,
  // 1000/1000), so unguarded re-neutralization paid the whole document's
  // observers ~650 records per FormMaster control event. Guarded writes make
  // the neutralize path converge: state already holding costs zero records.
  const setAttrIf = (el: HTMLElement, name: string, value: string) => {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };
  setAttrIf(root, "data-gasper-stubs", root.getAttribute("data-gasper-stubs") || "1");
  setAttrIf(root, "data-gasper-legacy-only", "1");
  setAttrIf(root, "data-legacy-compat", "1");
  setAttrIf(root, "data-product-automation", "exclude");
  setAttrIf(root, "aria-hidden", "true");
  // inert removes the subtree from focus order, click targeting, and a11y tree (modern Chromium/WebView).
  if (!(root as HTMLElement & { inert?: boolean }).inert) {
    try {
      (root as HTMLElement & { inert?: boolean }).inert = true;
    } catch {
      /* older engines: fall through to manual neutralization */
    }
  }
  if (root.style.pointerEvents !== "none") root.style.pointerEvents = "none";
  root.style.visibility = root.style.visibility || "hidden";
  // Include contenteditable and explicit positive tabindex survivors FormMaster may inject.
  const interactive = root.querySelectorAll<HTMLElement>(
    "button,input,select,textarea,a[href],[tabindex],audio,video,iframe,[contenteditable='true']",
  );
  interactive.forEach((el) => {
    // Idempotent guard: an element already at the full neutralized target state
    // is skipped with ZERO writes. New/dirty elements (FormMaster rebuilds the
    // control DOM on fixture/microstate events) get the full contract. The
    // wrap root's inert/aria-hidden blanket persists throughout, so the
    // GASPER-007 hazard invariant (live count 0) holds across the skip.
    if (
      controlAlreadyNeutralized({
        tag: el.tagName.toLowerCase(),
        inputType:
          el instanceof HTMLInputElement ? el.type.toLowerCase() : undefined,
        legacyCompat: el.getAttribute("data-legacy-compat") === "1",
        productAutomation: el.getAttribute("data-product-automation"),
        ariaHidden: el.getAttribute("aria-hidden"),
        tabIndex: el.tabIndex,
        pointerEvents: el.style.pointerEvents,
        disabled:
          (el instanceof HTMLButtonElement ||
            el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement) &&
          el.disabled,
        hasHref: el instanceof HTMLAnchorElement && el.hasAttribute("href"),
      })
    ) {
      return;
    }
    el.setAttribute("tabindex", "-1");
    el.tabIndex = -1;
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("data-product-automation", "exclude");
    el.setAttribute("data-legacy-compat", "1");
    el.style.pointerEvents = "none";
    if (el instanceof HTMLButtonElement) {
      el.disabled = true;
    } else if (el instanceof HTMLInputElement) {
      // Ranges stay value-writable for FormMaster; never in tab order.
      if (el.type !== "range" && el.type !== "hidden") {
        el.disabled = true;
      }
    } else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.disabled = true;
    } else if (el instanceof HTMLAnchorElement) {
      el.removeAttribute("href");
      el.setAttribute("role", "presentation");
    }
  });
}

/**
 * Live probe for product hidden-focus hazards inside a root (DOM).
 * Excludes data-product-automation=exclude and inert/legacy-compat trees.
 */
export function countProductHiddenFocusHazardsInDom(root: ParentNode = document): number {
  const all = root.querySelectorAll<HTMLElement>(
    "button,input,select,textarea,a[href],[tabindex],audio,video,iframe",
  );
  let n = 0;
  for (const el of Array.from(all)) {
    if (el.closest?.('[data-product-automation="exclude"]')) continue;
    if (el.closest?.("[data-gasper-legacy-only],[data-legacy-compat]")) continue;
    if ((el as HTMLElement & { inert?: boolean }).inert) continue;
    if (el.closest?.("[inert]")) continue;
    const disabled =
      (el instanceof HTMLButtonElement ||
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement) &&
      el.disabled;
    if (disabled) continue;
    if (el.tabIndex < 0) continue;
    let styleHidden = false;
    let boxHidden = false;
    try {
      if (typeof getComputedStyle === "function") {
        const st = getComputedStyle(el);
        styleHidden =
          st.display === "none" ||
          st.visibility === "hidden" ||
          st.opacity === "0";
      }
      if (typeof el.getBoundingClientRect === "function") {
        const r = el.getBoundingClientRect();
        boxHidden = r.width === 0 || r.height === 0;
      }
    } catch {
      /* non-browser */
    }
    const aria = el.getAttribute("aria-hidden") === "true";
    if ((styleHidden || boxHidden || aria) && el.tabIndex >= 0) n += 1;
  }
  return n;
}

function createLegacyStubControls(container: HTMLElement) {
  const wrap = document.createElement("div");
  wrap.setAttribute("data-gasper-stubs", "1");
  wrap.setAttribute("data-gasper-legacy-only", "1");
  wrap.setAttribute("data-legacy-compat", "1");
  wrap.setAttribute("data-product-automation", "exclude");
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText =
    "position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;visibility:hidden";
  for (const id of LEGACY_STUB_IDS) {
    let el: HTMLElement;
    if (id === "motion" || id === "yaw" || id === "coupling" || id === "interiorEnergy") {
      el = document.createElement("input");
      (el as HTMLInputElement).type = "range";
      (el as HTMLInputElement).min = "0";
      (el as HTMLInputElement).max = "1";
      (el as HTMLInputElement).step = "0.01";
      (el as HTMLInputElement).value = id === "motion" ? "0.55" : "0";
    } else if (id.includes("Button") || id === "pause" || id === "reset") {
      el = document.createElement("button");
      el.textContent = id;
    } else {
      el = document.createElement("div");
    }
    el.id = id;
    el.setAttribute("tabindex", "-1");
    el.tabIndex = -1;
    wrap.appendChild(el);
  }
  neutralizeLegacyCompatSubtree(wrap);
  container.appendChild(wrap);

  // FormMaster scripts re-populate fixture/microstate hosts after mount â€” re-neutralize.
  // CYCLE-7 FRAME BUDGET (frame-budget-phd-memo F2): deliveries are COALESCED to
  // at most one neutralize per animation frame. FormMaster rebuilds its control
  // DOM on every fixture/eye/microstate event (several tasks per frame); the
  // old per-delivery re-neutralize amplified each event into a full-subtree
  // rewrite. The idempotent guard inside neutralize makes the coalesced pass
  // read-only when state already holds. The wrap root stays inert throughout,
  // so the one-frame coalesce window never exposes a live hazard (GASPER-007).
  try {
    let neutralizePending = false;
    const runNeutralize = () => {
      neutralizePending = false;
      neutralizeLegacyCompatSubtree(wrap);
    };
    const mo = new MutationObserver(() => {
      if (neutralizePending) return;
      neutralizePending = true;
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(runNeutralize);
      } else {
        setTimeout(runNeutralize, 16);
      }
    });
    mo.observe(wrap, { childList: true, subtree: true });
    (wrap as HTMLElement & { __legacyCompatObserver?: MutationObserver }).__legacyCompatObserver =
      mo;
  } catch {
    /* */
  }
  return wrap;
}

function runLegacyScript(source: string, label: string) {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(source);
    fn();
  } catch (e) {
    console.error(`[GasperDocument legacy] script ${label} failed`, e);
    throw e;
  }
}

/**
 * Legacy Authority mount â€” complete original procedural Gasper (local assets only).
 * Production default via mountGasperDocument().
 */
export function mountGasperDocumentLegacyFormMaster(
  mountEl: HTMLElement,
  _options?: { allowLab?: boolean },
): GasperDocumentMount {
  mountEl.innerHTML = "";
  mountEl.style.position = "relative";
  mountEl.style.width = "100%";
  mountEl.style.height = "100%";

  const stubHost = document.createElement("div");
  stubHost.style.cssText = "position:absolute;inset:0;overflow:visible";
  stubHost.setAttribute("data-gasper-legacy-host", "1");
  mountEl.appendChild(stubHost);
  createLegacyStubControls(stubHost);

  const svgWrap = document.createElement("div");
  svgWrap.className = "gasper-svg-host";
  svgWrap.setAttribute("data-gasper-product-stage", "1");
  svgWrap.style.cssText =
    "position:absolute;left:50%;top:50%;width:240px;height:220px;transform:translate(-50%,-50%);transform-origin:center center;overflow:visible;visibility:visible";
  svgWrap.innerHTML = svgSource;
  stubHost.appendChild(svgWrap);

  const svgRoot = svgWrap.querySelector("svg") as SVGSVGElement;
  if (!svgRoot) throw new Error("Gasper SVG root missing after legacy mount");
  svgRoot.style.display = "block";
  svgRoot.style.width = "100%";
  svgRoot.style.height = "100%";
  svgRoot.style.overflow = "visible";
  svgRoot.style.visibility = "visible";
  svgRoot.removeAttribute("visibility");

  // VEC-701: claim the sole production SVG writer before FormMaster executes.
  // The raw FormMaster bundle cannot import TypeScript modules, so it consumes
  // this realm-local wrapper at its actual clock-driven render boundary.
  const projectionAuthority = getGasperVectorProjectionAuthority();
  const projectionLease: GasperVectorProjectionLease =
    projectionAuthority.claim(
      svgRoot,
      "formmaster-vector-projector",
      "production",
    );
  const projectionHost = globalThis as GasperProjectionHost;
  const previousProjectionWrapper =
    projectionHost.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__;
  const previousMaterialFeatureManifest =
    projectionHost.__GASPER_MATERIAL_FEATURE_MANIFEST__;
  const previousPressureMaterialBridge = projectionHost.__GASPER_PRESSURE_MATERIAL__;
  projectionHost.__GASPER_MATERIAL_FEATURE_MANIFEST__ =
    GASPER_MATERIAL_FEATURE_MANIFEST;
  // VEC-401/GASPER-VEC-401: the packaged FormMaster realm consumes the same
  // pure pressureâ†’material evaluator as the typed controller contract.
  projectionHost.__GASPER_PRESSURE_MATERIAL__ = Object.freeze({
    packet: "GASPER-VEC-401" as const,
    evaluate: evaluatePressureMaterialCoupling,
  });
  // GASPER-FINISH-01 / VEC-101: hand the raw FormMaster bundle the bounded
  // face-visibility policy (dormant reduction with hard floors, never node
  // deletion). The bundle cannot import TypeScript, so it consumes this
  // realm-local resolver; standalone fallback keeps legacy behavior.
  const previousFaceVisibilityPolicy =
    projectionHost.__GASPER_FACE_VISIBILITY_POLICY__;
  projectionHost.__GASPER_FACE_VISIBILITY_POLICY__ = Object.freeze({
    packet: "GASPER-FINISH-01" as const,
    floors: PROJECTOR_FACE_VIS_FLOORS,
    resolve: resolveProjectorFaceVisibility,
  });
  let projectionFrameIndex = 0;
  const projectionWrapper: ProjectionRenderWrapper = (render) => {
    return (...args: any[]) => {
      const nowMs = Number(args[0]);
      const safeTimeMs = Number.isFinite(nowMs)
        ? Math.max(0, nowMs)
        : getGasperOrganismClock().nowMs();
      const clockFrameIndex = getGasperOrganismClock().getFrameIndex();
      projectionFrameIndex = Math.max(
        projectionFrameIndex + 1,
        Number.isInteger(clockFrameIndex) && clockFrameIndex >= 0
          ? clockFrameIndex
          : 0,
      );
      return projectionLease.transact(
        {
          frameIndex: projectionFrameIndex,
          timeMs: safeTimeMs,
          // This is a deterministic render-receipt hash, not a claim that the
          // full SVG markup was serialized or rasterized.
          resolvedHash: `formmaster-render-${projectionFrameIndex}-${Math.round(safeTimeMs)}`,
        },
        () => render(...args),
      ).value;
    };
  };
  projectionHost.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__ = projectionWrapper;

  const realGet = document.getElementById.bind(document);
  document.getElementById = ((id: string) => {
    const local =
      stubHost.querySelector?.(`#${CSS.escape(id)}`) ||
      svgRoot.querySelector(`#${CSS.escape(id)}`);
    if (local) return local as HTMLElement;
    return realGet(id);
  }) as typeof document.getElementById;

  // VEC-401: install/adopt the typed clock before FormMaster executes. The
  // production script must consume this port rather than create a second clock.
  getGasperOrganismClock().installGlobal();

  try {
    runLegacyScript(script0, "adaptive-mesh");
    runLegacyScript(script1, "face-plane");
    runLegacyScript(script2, "relief");
    runLegacyScript(vectorMaterialRuntime, "vector-material");
    runLegacyScript(script3, "form-master");
  } catch (e) {
    projectionHost.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__ =
      previousProjectionWrapper;
    if (previousMaterialFeatureManifest) {
      projectionHost.__GASPER_MATERIAL_FEATURE_MANIFEST__ =
        previousMaterialFeatureManifest;
    } else {
      delete projectionHost.__GASPER_MATERIAL_FEATURE_MANIFEST__;
    }
    if (previousPressureMaterialBridge) {
      projectionHost.__GASPER_PRESSURE_MATERIAL__ = previousPressureMaterialBridge;
    } else {
      delete projectionHost.__GASPER_PRESSURE_MATERIAL__;
    }
    if (previousFaceVisibilityPolicy) {
      projectionHost.__GASPER_FACE_VISIBILITY_POLICY__ =
        previousFaceVisibilityPolicy;
    } else {
      delete projectionHost.__GASPER_FACE_VISIBILITY_POLICY__;
    }
    projectionLease.dispose();
    document.getElementById = realGet;
    throw e;
  }

  // DOPS-01 / P0-HIDDEN-LEGACY-FOCUS: FormMaster injects fixture/microstate/material
  // controls into stubs â€” re-assert inert after script population and late mutations.
  const reassertLegacyIsolation = () => {
    neutralizeLegacyCompatSubtree(stubHost);
    const stubRoot = stubHost.querySelector<HTMLElement>("[data-gasper-legacy-only]");
    if (stubRoot) neutralizeLegacyCompatSubtree(stubRoot);
    // Any interactive node FormMaster parked outside the wrap but under stubHost.
    stubHost.querySelectorAll<HTMLElement>("[data-gasper-stubs]").forEach((n) => {
      neutralizeLegacyCompatSubtree(n);
    });
  };
  reassertLegacyIsolation();

  // Host-level observer: FormMaster often mutates after first paint.
  let hostObserver: MutationObserver | null = null;
  try {
    hostObserver = new MutationObserver(() => {
      reassertLegacyIsolation();
    });
    hostObserver.observe(stubHost, { childList: true, subtree: true });
  } catch {
    /* */
  }
  // Delayed reassert for script-driven async population.
  const reassertTimers: Array<ReturnType<typeof setTimeout>> = [];
  for (const ms of [0, 50, 250, 1000]) {
    reassertTimers.push(setTimeout(() => reassertLegacyIsolation(), ms));
  }

  const g = globalThis as unknown as {
    SidekickFormMasterRig?: FormMasterRig;
    SidekickAdaptiveRig?: FormMasterRig;
  };
  const rig = g.SidekickFormMasterRig || g.SidekickAdaptiveRig;
  if (!rig) {
    hostObserver?.disconnect();
    for (const t of reassertTimers) clearTimeout(t);
    document.getElementById = realGet;
    throw new Error("SidekickFormMasterRig failed to initialize (legacy)");
  }

  try {
    rig.setProfile("wispwalker", "settle");
    rig.setMotion(0.45);
    rig.setPaused(true);
    rig.requestOneFrame?.();
  } catch (e) {
    console.warn("[GasperDocument legacy] boot profile", e);
  }
  reassertLegacyIsolation();

  let topology = {
    contourSamples: GASPER_TOPOLOGY.contourSamples,
    structuralNodes: GASPER_TOPOLOGY.structuralNodes,
    structuralTriangles: GASPER_TOPOLOGY.structuralTriangles,
  };
  try {
    const snap = rig.getSnapshot() as {
      contourSamples?: number;
      structuralNodes?: number;
      structuralTriangles?: number;
    };
    topology = {
      contourSamples:
        (snap.contourSamples as typeof topology.contourSamples) ??
        topology.contourSamples,
      structuralNodes:
        (snap.structuralNodes as typeof topology.structuralNodes) ??
        topology.structuralNodes,
      structuralTriangles:
        (snap.structuralTriangles as typeof topology.structuralTriangles) ??
        topology.structuralTriangles,
    };
  } catch {
    /* defaults */
  }

  const authorityTruth = {
    authorityId: PRODUCTION_AUTHORITY_ID,
    authorityClass: PRODUCTION_AUTHORITY_CLASS,
    geometryExecutor: "form-master" as const,
    legacyFormMaster: true,
    productionPath: true,
    labOnly: false,
  };
  stampMountAuthority(mountEl, authorityTruth);

  return {
    host: mountEl,
    svgRoot,
    idleRig: svgRoot.querySelector("#idleRig") as SVGGElement | null,
    rig,
    topology,
    legacyFormMaster: true,
    authorityId: PRODUCTION_AUTHORITY_ID,
    authorityClass: PRODUCTION_AUTHORITY_CLASS,
    geometryExecutor: "form-master",
    productionPath: true,
    labOnly: false,
    destroy: () => {
      hostObserver?.disconnect();
      for (const t of reassertTimers) clearTimeout(t);
      try {
        rig.disposeOrganismClockSubscription?.();
      } catch (error) {
        console.warn("[GasperDocument legacy] clock subscriber disposal", error);
      }
      if (
        projectionHost.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__ ===
        projectionWrapper
      ) {
        if (previousProjectionWrapper) {
          projectionHost.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__ =
            previousProjectionWrapper;
        } else {
          delete projectionHost.__GASPER_VECTOR_PROJECTION_WRAP_RENDER__;
        }
      }
      if (
        projectionHost.__GASPER_MATERIAL_FEATURE_MANIFEST__ ===
        GASPER_MATERIAL_FEATURE_MANIFEST
      ) {
        if (previousMaterialFeatureManifest) {
          projectionHost.__GASPER_MATERIAL_FEATURE_MANIFEST__ =
            previousMaterialFeatureManifest;
        } else {
          delete projectionHost.__GASPER_MATERIAL_FEATURE_MANIFEST__;
        }
      }
      if (projectionHost.__GASPER_PRESSURE_MATERIAL__?.evaluate === evaluatePressureMaterialCoupling) {
        if (previousPressureMaterialBridge) {
          projectionHost.__GASPER_PRESSURE_MATERIAL__ = previousPressureMaterialBridge;
        } else {
          delete projectionHost.__GASPER_PRESSURE_MATERIAL__;
        }
      }
      if (
        projectionHost.__GASPER_FACE_VISIBILITY_POLICY__?.resolve ===
        resolveProjectorFaceVisibility
      ) {
        if (previousFaceVisibilityPolicy) {
          projectionHost.__GASPER_FACE_VISIBILITY_POLICY__ =
            previousFaceVisibilityPolicy;
        } else {
          delete projectionHost.__GASPER_FACE_VISIBILITY_POLICY__;
        }
      }
      projectionLease.dispose();
      document.getElementById = realGet;
      mountEl.innerHTML = "";
    },
  };
}

