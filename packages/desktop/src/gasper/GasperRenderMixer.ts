/**
 * Multi-domain flush onto the live SVG mount (Architecture Pack v0.2).
 * Wave R1: dirty-domain scheduler, cached SVG node refs, cadence tiers,
 * Authoring Neutral optical preset.
 */

import type {
  DirtyDomainId,
  DomainFlushReport,
  GasperMultiDomainState,
  OpticalMode,
} from "./GasperDomainState";
import {
  ALL_DIRTY_DOMAINS,
  applyBindingToDomainsInPlace,
  createDefaultDomainState,
  dirtyDomainsFromBinding,
  flattenDomainBindings,
  tickDomainFields,
} from "./GasperDomainState";
import type { MorphologyDomainId } from "./GasperMorphologyDomains";
import { computeHostTransform } from "./GasperHostTransform";
import {
  macroStateFromDomain,
  solveContour,
  type ContourSolveResult,
} from "./GasperContourSolver";
import {
  ENERGY_RENDER_SCALE_FLOOR,
  FACE_RENDER_SCALE_FLOOR,
} from "./continuity/energyGrammar";
import { PROJECTOR_FACE_VIS_FLOORS } from "./continuity/noBlackoutInvariant";
import {
  getGasperVectorProjectionAuthority,
  type GasperProjectionInspection,
  type GasperVectorProjectionLease,
} from "./projection";

/** @deprecated Use multi-domain state; kept for binding id compatibility. */
export type FormOverrideState = ReturnType<typeof flattenDomainBindings>;

export const DEFAULT_FORM: FormOverrideState = flattenDomainBindings(
  createDefaultDomainState(),
);

const RELIEF_CADENCE_MS_AUTHORING = 1000 / 30;
const OPTICS_CADENCE_MS_AUTHORING = 1000 / 20;
const RELIEF_CADENCE_MS_BEAUTY = 1000 / 60;
const OPTICS_CADENCE_MS_BEAUTY = 1000 / 30;

function projectionStateHash(
  domain: GasperMultiDomainState,
  contourProfileId: string,
  opticalMode: OpticalMode,
  dirty: ReadonlySet<DirtyDomainId>,
): string {
  const snapshot = JSON.stringify({
    bindings: Object.entries(flattenDomainBindings(domain)).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    contourProfileId,
    opticalMode,
    dirty: [...dirty].sort(),
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < snapshot.length; i += 1) {
    hash ^= snapshot.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

type SvgEl = SVGElement | SVGGElement | null;

export type RigNodeCache = {
  body: SvgEl;
  clipBody: SvgEl;
  faceCluster: SvgEl;
  eyeL: SvgEl;
  eyeR: SvgEl;
  mouth: SvgEl;
  innerVolumePath: SvgEl;
  pearlCorePath: SvgEl;
  violetCorePath: SvgEl;
  innerVolumeLayer: SvgEl;
  reliefLayer: SvgEl;
  reliefHighlight: SvgEl;
  reliefShadow: SvgEl;
  chromaticShell: SvgEl;
  shellBaseLayer: SvgEl;
  cosmicTextureLayer: SvgEl;
  specularSurfacePath: SvgEl;
  keyReflectionLayer: SvgEl;
  keyHalo: SvgEl;
  rim: SvgEl;
  faceEmissionLayer: SvgEl;
  contactShadow: SvgEl;
  ready: boolean;
};

function emptyCache(): RigNodeCache {
  return {
    body: null,
    clipBody: null,
    faceCluster: null,
    eyeL: null,
    eyeR: null,
    mouth: null,
    innerVolumePath: null,
    pearlCorePath: null,
    violetCorePath: null,
    innerVolumeLayer: null,
    reliefLayer: null,
    reliefHighlight: null,
    reliefShadow: null,
    chromaticShell: null,
    shellBaseLayer: null,
    cosmicTextureLayer: null,
    specularSurfacePath: null,
    keyReflectionLayer: null,
    keyHalo: null,
    rim: null,
    faceEmissionLayer: null,
    contactShadow: null,
    ready: false,
  };
}

function q(svg: SVGSVGElement, id: string): SvgEl {
  return svg.querySelector(`#${id}`) as SvgEl;
}

function buildNodeCache(svg: SVGSVGElement | null): RigNodeCache {
  if (!svg) return emptyCache();
  return {
    body: q(svg, "body"),
    clipBody: q(svg, "clipBody"),
    faceCluster: q(svg, "faceRecessLayer"),
    eyeL: q(svg, "eyeL"),
    eyeR: q(svg, "eyeR"),
    mouth: q(svg, "mouth"),
    innerVolumePath: q(svg, "innerVolumePath"),
    pearlCorePath: q(svg, "pearlCorePath"),
    violetCorePath: q(svg, "violetCorePath"),
    innerVolumeLayer: q(svg, "innerVolumeLayer"),
    reliefLayer: q(svg, "reliefLayer"),
    reliefHighlight: q(svg, "reliefHighlight"),
    reliefShadow: q(svg, "reliefShadow"),
    chromaticShell: q(svg, "chromaticShell"),
    shellBaseLayer: q(svg, "shellBaseLayer"),
    cosmicTextureLayer: q(svg, "cosmicTextureLayer"),
    specularSurfacePath: q(svg, "specularSurfacePath"),
    keyReflectionLayer: q(svg, "keyReflectionLayer"),
    keyHalo: q(svg, "keyHalo"),
    rim: q(svg, "rim"),
    faceEmissionLayer: q(svg, "faceEmissionLayer"),
    contactShadow: q(svg, "contactShadow"),
    ready: true,
  };
}

function setStyleIfChanged(
  el: SvgEl,
  prop:
    | "transform"
    | "transformOrigin"
    | "transformBox"
    | "opacity"
    | "filter",
  value: string,
  last: Map<string, string>,
  key: string,
): boolean {
  if (!el) return false;
  if (last.get(key) === value) return false;
  last.set(key, value);
  el.style[prop] = value;
  return true;
}

function setAttrIfChanged(
  el: SvgEl,
  name: string,
  value: string,
  last: Map<string, string>,
  key: string,
): boolean {
  if (!el) return false;
  if (last.get(key) === value) return false;
  last.set(key, value);
  el.setAttribute(name, value);
  return true;
}

/**
 * Post-render feature geometry probe — domain truth + DOM write evidence.
 * Used by NativeGasperRenderer / structural rendered-authority tests.
 * Never returns synthetic hand-built geometry; reads mixer domain + lastWritten.
 */
export type RenderedFeatureGeometry = {
  eyeOpenness: number | null;
  mouthOpenness: number | null;
  energyLevel: number | null;
  energyScale: number | null;
  faceScale: number | null;
  overallWidth: number | null;
  overallHeight: number | null;
  crownHeight: number | null;
  shellOpacity: number | null;
  centerOfMassY: number | null;
  contourPathLength: number | null;
  contourProfileId: string | null;
  eyeTransform: string | null;
  mouthTransform: string | null;
  energyTransform: string | null;
  bodyPathD: string | null;
  faceWritten: boolean;
  energyWritten: boolean;
  contourWritten: boolean;
  legacyFirewall: boolean;
  domains: {
    silhouette: { width: number; height: number; crown: number; ground: number };
    face: {
      eyeOpen: number;
      mouthOpen: number;
      mouthWidth: number;
      faceScale: number;
      gaze: number;
      eyeSpacing: number;
    };
    shell: { tension: number; damping: number; opacity: number | null };
    energy: {
      level: number;
      pulse: number;
      glow: number;
      scale: number;
      occlusion: number;
    };
    posture: { comY: number; ground: number; residual: number };
  };
  /** True when eye/mouth/energy feature channels are finite (non-null). */
  featureChannelsNonNull: boolean;
};

export class GasperRenderMixer {
  private pending = false;
  private projectionLease: GasperVectorProjectionLease | null = null;
  private projectionFrameIndex = 0;
  private projectionPostWriteHook: (() => void) | null = null;
  private domain: GasperMultiDomainState = createDefaultDomainState();
  private lastFlush: DomainFlushReport = {
    domainsTouched: [],
    contourOnly: true,
    reliefAnimated: false,
    energyHasVolumeState: false,
    reliefSampleRms: 0,
    energyVolume: null,
    dirtyDomainsFlushed: [],
    opticalMode: "authoring-neutral",
    usedNodeCache: false,
    domainsSkipped: [],
  };
  private lastTickMs = 0;
  private lastReliefTickMs = 0;
  private lastOpticsTickMs = 0;
  private faceIsolation = false;
  private opticalMode: OpticalMode = "authoring-neutral";
  private dirty = new Set<DirtyDomainId>();
  private nodes: RigNodeCache = emptyCache();
  private lastWritten = new Map<string, string>();
  private fullFlushOnce = true;
  private _lastEnergyScale = 0.85;
  private _lastEnergyOpacity = 0.12;
  private _lastSvgVolumeWritten = false;
  /**
   * Legacy-authority DOM-write firewall.
   * FormMaster may own the production SVG while the mixer retains scalar state,
   * cache references, and in-memory contour probes. No mixer DOM writer may run.
   */
  private legacyAuthorityDomWriteFirewall = false;
  /** Active embodiment for native contour polar solve (Wave R3 continued). */
  private contourProfileId = "presence";
  private lastContour: ContourSolveResult | null = null;
  private profileCounters = {
    flushes: 0,
    domainRenders: 0,
    skippedFlushes: 0,
    querySelectorAvoided: 0,
  };

  constructor(
    private svg: SVGSVGElement | null,
    private onFlush?: () => void,
    private hostEl: HTMLElement | null = null,
  ) {
    this.nodes = buildNodeCache(svg);
    this.markAllDirty();
    this.syncProjectionLease();
  }

  setFaceIsolation(on: boolean) {
    if (this.faceIsolation === on) return;
    this.faceIsolation = on;
    this.markDirty("face", "energy", "optics", "normals");
  }

  getFaceIsolation(): boolean {
    return this.faceIsolation;
  }

  /** Single production-authority policy; call sites must not special-case flushes. */
  setLegacyAuthorityDomWriteFirewall(enabled: boolean) {
    if (this.legacyAuthorityDomWriteFirewall === enabled) return;
    this.legacyAuthorityDomWriteFirewall = enabled;
    this.syncProjectionLease();
  }

  isLegacyAuthorityDomWriteFirewallEnabled(): boolean {
    return this.legacyAuthorityDomWriteFirewall;
  }

  setOpticalMode(mode: OpticalMode) {
    if (this.opticalMode === mode) return;
    this.opticalMode = mode;
    this.markDirty("optics", "skin", "material", "normals", "energy");
    this.scheduleFlush();
  }

  getOpticalMode(): OpticalMode {
    return this.opticalMode;
  }

  setSvg(svg: SVGSVGElement | null) {
    if (this.svg !== svg) {
      this.projectionLease?.dispose();
      this.projectionLease = null;
      this.projectionFrameIndex = 0;
    }
    this.svg = svg;
    this.nodes = buildNodeCache(svg);
    this.lastWritten.clear();
    this.fullFlushOnce = true;
    this.markAllDirty();
    this.syncProjectionLease();
  }

  private syncProjectionLease(): void {
    if (this.legacyAuthorityDomWriteFirewall || !this.svg) {
      this.projectionLease?.dispose();
      this.projectionLease = null;
      this.projectionFrameIndex = 0;
      return;
    }
    if (this.projectionLease) return;
    this.projectionLease = getGasperVectorProjectionAuthority().claim(
      this.svg,
      "native-vector-projector",
      "native-lab",
    );
  }

  getProjectionInspection(): GasperProjectionInspection | null {
    return this.projectionLease?.inspect() ?? null;
  }

  /**
   * Optional native-candidate write extension. It runs inside the same leased
   * transaction after core geometry/material writes and before commit.
   */
  setProjectionPostWriteHook(hook: (() => void) | null): void {
    this.projectionPostWriteHook = hook;
  }

  setHost(host: HTMLElement | null) {
    this.hostEl = host;
    this.markDirty("macro");
  }

  /**
   * Set embodiment id used by GasperContourSolver when rewriting body path `d`.
   * Does not itself change domain bindings (controller projects those separately).
   */
  setContourProfile(profileId: string) {
    if (this.contourProfileId === profileId) return;
    this.contourProfileId = profileId || "presence";
    this.markDirty("macro");
    this.scheduleFlush();
  }

  getContourProfile(): string {
    return this.contourProfileId;
  }

  getLastContour(): ContourSolveResult | null {
    return this.lastContour;
  }

  rebuildNodeCache() {
    this.nodes = buildNodeCache(this.svg);
    this.lastWritten.clear();
    this.markAllDirty();
  }

  getNodeCache(): RigNodeCache {
    return this.nodes;
  }

  getDomain(): GasperMultiDomainState {
    return this.domain;
  }

  getForm(): FormOverrideState {
    return flattenDomainBindings(this.domain);
  }

  getLastFlushReport(): DomainFlushReport {
    return {
      ...this.lastFlush,
      domainsTouched: [...this.lastFlush.domainsTouched],
      dirtyDomainsFlushed: this.lastFlush.dirtyDomainsFlushed
        ? [...this.lastFlush.dirtyDomainsFlushed]
        : [],
      domainsSkipped: this.lastFlush.domainsSkipped
        ? [...this.lastFlush.domainsSkipped]
        : [],
    };
  }

  getProfileCounters() {
    return { ...this.profileCounters };
  }

  /** Last CSS/attr values written by native DOM flush (empty under legacy firewall). */
  getLastWrittenSnapshot(): Record<string, string> {
    return Object.fromEntries(this.lastWritten.entries());
  }

  /**
   * Measure post-apply rendered feature geometry from domain state + DOM writes.
   * Call after setForm + flush. Rejects null feature channels when domain is live.
   */
  measureRenderedFeatureGeometry(): RenderedFeatureGeometry {
    const d = this.domain;
    const written = this.lastWritten;
    const eyeT = written.get("eyeL.transform") ?? written.get("eyeR.transform") ?? null;
    const mouthT = written.get("mouth.transform") ?? null;
    const energyT =
      written.get("innerVolumePath.transform") ??
      written.get("pearlCorePath.transform") ??
      null;
    const bodyD = written.get("body.d") ?? null;
    const shellOpRaw = written.get("shellBase.opacity");
    const shellOpacity =
      shellOpRaw !== undefined && shellOpRaw !== ""
        ? Number(shellOpRaw)
        : nodesShellOpacity(this.nodes);

    const eyeOpenness = finiteOrNull(d.face.eye_openness);
    const mouthOpenness = finiteOrNull(d.face.mouth_openness);
    const energyLevel = finiteOrNull(d.energy.level);
    const energyScale = finiteOrNull(this._lastEnergyScale);
    const faceScale = finiteOrNull(d.face.face_scale);
    const overallWidth = finiteOrNull(d.macro.overall_width);
    const overallHeight = finiteOrNull(d.macro.overall_height);
    const crownHeight = finiteOrNull(d.macro.crown_height);
    const centerOfMassY = finiteOrNull(d.singularity.center_of_mass_y);
    const contourPathLength =
      bodyD && bodyD.length > 0
        ? bodyD.length
        : this.lastContour
          ? this.lastContour.pathD.length
          : null;

    const faceWritten = Boolean(eyeT || mouthT);
    const energyWritten = Boolean(energyT) || this._lastSvgVolumeWritten;
    const contourWritten = Boolean(bodyD) || Boolean(this.lastContour);
    const domainFinite =
      eyeOpenness !== null &&
      mouthOpenness !== null &&
      energyLevel !== null &&
      faceScale !== null;
    // When native SVG writers are active (firewall off + svg present), require
    // post-flush write evidence — domain defaults alone must not pass.
    const svgPresent = Boolean(this.svg);
    const writersActive =
      !this.legacyAuthorityDomWriteFirewall && svgPresent;
    const featureChannelsNonNull = writersActive
      ? domainFinite && faceWritten && energyWritten
      : domainFinite;

    return {
      eyeOpenness,
      mouthOpenness,
      energyLevel,
      energyScale,
      faceScale,
      overallWidth,
      overallHeight,
      crownHeight,
      shellOpacity: shellOpacity !== null && Number.isFinite(shellOpacity)
        ? shellOpacity
        : null,
      centerOfMassY,
      contourPathLength,
      contourProfileId: this.contourProfileId,
      eyeTransform: eyeT,
      mouthTransform: mouthT,
      energyTransform: energyT,
      bodyPathD: bodyD,
      faceWritten,
      energyWritten,
      contourWritten,
      legacyFirewall: this.legacyAuthorityDomWriteFirewall,
      domains: {
        silhouette: {
          width: d.macro.overall_width,
          height: d.macro.overall_height,
          crown: d.macro.crown_height,
          ground: d.macro.ground_flattening,
        },
        face: {
          eyeOpen: d.face.eye_openness,
          mouthOpen: d.face.mouth_openness,
          mouthWidth: d.face.mouth_width,
          faceScale: d.face.face_scale,
          gaze: d.face.gaze,
          eyeSpacing: d.face.eye_spacing,
        },
        shell: {
          tension: d.skin.tension,
          damping: d.skin.damping,
          opacity:
            shellOpacity !== null && Number.isFinite(shellOpacity)
              ? shellOpacity
              : null,
        },
        energy: {
          level: d.energy.level,
          pulse: d.energy.pulse,
          glow: d.optics.internalGlow,
          scale: this._lastEnergyScale,
          occlusion: d.energy.occlusion,
        },
        posture: {
          comY: d.singularity.center_of_mass_y,
          ground: d.macro.ground_flattening,
          residual: d.dynamics.residual,
        },
      },
      featureChannelsNonNull,
    };
  }

  markDirty(...domains: DirtyDomainId[]) {
    for (const d of domains) this.dirty.add(d);
  }

  markAllDirty() {
    for (const d of ALL_DIRTY_DOMAINS) this.dirty.add(d);
  }

  private markDirtyFromBinding(id: string) {
    for (const d of dirtyDomainsFromBinding(id)) this.dirty.add(d);
  }

  setFormValue(id: string, value: number) {
    const prev = flattenDomainBindings(this.domain)[id];
    if (typeof prev === "number" && Math.abs(prev - value) < 1e-5) return;
    applyBindingToDomainsInPlace(this.domain, id, value);
    this.markDirtyFromBinding(id);
    this.scheduleFlush();
  }

  setForm(partial: Partial<FormOverrideState>) {
    const current = flattenDomainBindings(this.domain);
    let any = false;
    for (const [k, v] of Object.entries(partial)) {
      if (typeof v !== "number") continue;
      const prev = current[k];
      if (typeof prev === "number" && Math.abs(prev - v) < 1e-5) continue;
      applyBindingToDomainsInPlace(this.domain, k, v);
      this.markDirtyFromBinding(k);
      any = true;
    }
    if (any) this.scheduleFlush();
  }

  tick(nowMs: number) {
    const dt = this.lastTickMs
      ? Math.min(0.05, (nowMs - this.lastTickMs) / 1000)
      : 0.016;
    this.lastTickMs = nowMs;

    const reliefCadence =
      this.opticalMode === "authoring-neutral"
        ? RELIEF_CADENCE_MS_AUTHORING
        : RELIEF_CADENCE_MS_BEAUTY;
    const opticsCadence =
      this.opticalMode === "authoring-neutral"
        ? OPTICS_CADENCE_MS_AUTHORING
        : OPTICS_CADENCE_MS_BEAUTY;

    const doRelief =
      !this.lastReliefTickMs || nowMs - this.lastReliefTickMs >= reliefCadence;
    const doOptics =
      !this.lastOpticsTickMs || nowMs - this.lastOpticsTickMs >= opticsCadence;

    if (doRelief) this.lastReliefTickMs = nowMs;
    if (doOptics) this.lastOpticsTickMs = nowMs;

    const motion =
      Math.abs(this.domain.macro.overall_width - 1) * 0.5 +
      this.domain.dynamics.residual * 2 +
      0.35;

    const residualBefore = this.domain.dynamics.residual;
    const levelBefore = this.domain.energy.level;
    const glowBefore = this.domain.optics.internalGlow;

    tickDomainFields(this.domain, dt, motion, {
      inPlace: true,
      updateEnergy: true,
      updateDynamics: true,
      updateRelief: doRelief,
      updateOptics: doOptics,
    });

    const levelQ = Math.round(this.domain.energy.level * 200);
    const levelBeforeQ = Math.round(levelBefore * 200);
    if (levelQ !== levelBeforeQ) this.markDirty("energy");

    if (Math.abs(this.domain.dynamics.residual - residualBefore) > 0.0008) {
      this.markDirty("dynamics", "macro");
    }
    if (doRelief) this.markDirty("relief");
    if (
      doOptics &&
      Math.abs(this.domain.optics.internalGlow - glowBefore) > 0.002
    ) {
      this.markDirty("optics");
    }

    if (this.dirty.size > 0) this.scheduleFlush();
  }

  /** VEC-701: mutations are marked pending and drained by the organism clock. */
  private scheduleFlush() {
    this.pending = true;
  }

  flushScheduled(): void {
    if (this.pending || this.dirty.size > 0) this.flush();
  }

  flush(opts?: { forceAll?: boolean }) {
    this.pending = false;
    const forceAll = opts?.forceAll === true || this.fullFlushOnce;
    if (forceAll) {
      this.markAllDirty();
      this.fullFlushOnce = false;
    }

    if (this.dirty.size === 0) {
      this.profileCounters.skippedFlushes += 1;
      return;
    }

    const svg = this.svg;
    const d = this.domain;
    const nodes = this.nodes.ready ? this.nodes : buildNodeCache(svg);
    if (!this.nodes.ready && svg) this.nodes = nodes;

    const dirty = new Set(this.dirty);
    this.dirty.clear();
    const touched = new Set<MorphologyDomainId>();
    const flushed: DirtyDomainId[] = [];
    const skipped: DirtyDomainId[] = [];
    for (const id of ALL_DIRTY_DOMAINS) {
      if (!dirty.has(id)) skipped.push(id);
    }

    const needsMacro = dirty.has("macro") || dirty.has("singularity") || dirty.has("dynamics") || dirty.has("camera");
    const needsFace = dirty.has("face") || dirty.has("gaze");
    const needsEnergy = dirty.has("energy") || dirty.has("singularity");
    const needsRelief = dirty.has("relief");
    const needsSkin = dirty.has("skin");
    const needsTexture = dirty.has("texture");
    const needsNormals = dirty.has("normals") || dirty.has("material");
    const needsOptics = dirty.has("optics") || dirty.has("material") || dirty.has("energy");

    if (this.legacyAuthorityDomWriteFirewall) {
      if (needsMacro) this.renderContour(d, nodes, touched, false);
      for (const id of dirty) if (!skipped.includes(id)) skipped.push(id);
      this.profileCounters.skippedFlushes += 1;
      this.finalizeFlush(touched, d, flushed, skipped, nodes.ready);
      return;
    }

    if (!svg) {
      if (needsMacro) this.renderContour(d, nodes, touched, false);
      this.finalizeFlush(touched, d, flushed, skipped, nodes.ready);
      return;
    }

    this.syncProjectionLease();
    const lease = this.projectionLease;
    if (!lease) {
      for (const id of dirty) this.dirty.add(id);
      throw new Error("VEC-701 native projection lease is unavailable");
    }
    const frameIndex = ++this.projectionFrameIndex;
    const timeMs = this.lastTickMs > 0 ? this.lastTickMs : typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const resolvedHash = projectionStateHash(d, this.contourProfileId, this.opticalMode, dirty);

    try {
      lease.transact({ frameIndex, timeMs: Math.max(0, timeMs), resolvedHash, changedWrites: dirty.size }, () => {
        if (needsMacro) {
          this.renderMacro(d, touched);
          flushed.push("macro");
          if (dirty.has("singularity")) flushed.push("singularity");
          if (dirty.has("dynamics")) flushed.push("dynamics");
          if (dirty.has("camera")) flushed.push("camera");
          this.renderContour(d, nodes, touched, true);
        }
        if (needsFace) {
          this.renderFace(d, nodes, touched);
          flushed.push("face");
          if (dirty.has("gaze")) flushed.push("gaze");
        }
        if (needsEnergy) {
          this.renderEnergy(d, nodes, touched);
          if (!flushed.includes("energy")) flushed.push("energy");
        }
        if (needsRelief) { this.renderRelief(d, nodes, touched); flushed.push("relief"); }
        if (needsSkin) { this.renderSkin(d, nodes, touched); flushed.push("skin"); }
        if (needsTexture) { this.renderTexture(d, nodes, touched); flushed.push("texture"); }
        if (needsNormals) {
          this.renderNormals(d, nodes, touched);
          flushed.push("normals");
          if (dirty.has("material")) flushed.push("material");
        }
        if (needsOptics) {
          this.renderOptics(d, nodes, touched);
          if (!flushed.includes("optics")) flushed.push("optics");
          if (dirty.has("material") && !flushed.includes("material")) flushed.push("material");
        }
        this.projectionPostWriteHook?.();
        this.profileCounters.flushes += 1;
        this.profileCounters.domainRenders += flushed.length;
        if (nodes.ready) this.profileCounters.querySelectorAvoided += 1;
        this.finalizeFlush(touched, d, flushed, skipped, nodes.ready);
      });
    } catch (error) {
      for (const id of dirty) this.dirty.add(id);
      throw error;
    }
  }

  private renderMacro(
    d: GasperMultiDomainState,
    touched: Set<MorphologyDomainId>,
  ) {
    const sing = d.singularity;
    const { sx, sy, crownLift } = computeHostTransform({
      overall_width: d.macro.overall_width,
      overall_height: d.macro.overall_height,
      crown_height: d.macro.crown_height,
      lower_body_fullness: d.macro.lower_body_fullness,
      ground_flattening: d.macro.ground_flattening,
      singularity_outer_radius: sing.singularity_outer_radius,
      singularity_vertical_compression: sing.singularity_vertical_compression,
      shell_thickness: sing.shell_thickness,
      orbital_plane_scale: sing.orbital_plane_scale,
      center_of_mass_y: sing.center_of_mass_y,
      horizon_vertical_position: sing.horizon_vertical_position,
      residual: d.dynamics.residual,
    });

    if (this.hostEl) {
      const transform = `translate(-50%, calc(-50% + ${crownLift}px)) scale(${sx}, ${sy})`;
      if (this.hostEl.style.transform !== transform) {
        this.hostEl.style.transform = transform;
      }
      this.hostEl.style.transformOrigin = "center center";
      this.hostEl.dataset.formWidth = String(sx);
      this.hostEl.dataset.formHeight = String(sy);
      this.hostEl.dataset.energyLevel = String(d.energy.level);
      this.hostEl.dataset.reliefAmp = String(d.relief.amplitude);
      this.hostEl.dataset.outerRadius = String(sing.singularity_outer_radius);
      this.hostEl.dataset.vCompression = String(
        sing.singularity_vertical_compression,
      );
      this.hostEl.dataset.spectralEnergy = String(
        sing.spectral_energy_envelope,
      );
      // Feature-channel telemetry stamps (reject null spans in visual-qa probes)
      this.hostEl.dataset.eyeOpenness = String(d.face.eye_openness);
      this.hostEl.dataset.mouthOpenness = String(d.face.mouth_openness);
      this.hostEl.dataset.faceScale = String(d.face.face_scale);
      this.hostEl.dataset.centerOfMassY = String(sing.center_of_mass_y);
      this.hostEl.dataset.featureMotion = "1";
      touched.add("macro_deformation_field");
      touched.add("structural_lattice");
      touched.add("canonical_contour");
    }

    if (this.nodes.contactShadow) {
      const rx = 55 * (1 + d.macro.ground_flattening * 0.35);
      setAttrIfChanged(
        this.nodes.contactShadow,
        "rx",
        String(rx),
        this.lastWritten,
        "ground.rx",
      );
      touched.add("macro_deformation_field");
    }

    if (Math.abs(d.dynamics.residual) > 1e-4 || d.dynamics.inertia > 0) {
      touched.add("secondary_dynamics");
    }
  }

  /**
   * Native 512-sample polar contour → body / clipBody path `d`.
   * Host CSS scale remains for residual mass; path carries silhouette identity.
   */
  private renderContour(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
    writeDom: boolean,
  ) {
    const solved = solveContour({
      profileId: this.contourProfileId,
      macro: macroStateFromDomain(d.macro),
    });
    this.lastContour = solved;
    touched.add("canonical_contour");
    touched.add("structural_lattice");

    if (!writeDom) return;

    if (nodes.body) {
      setAttrIfChanged(
        nodes.body,
        "d",
        solved.pathD,
        this.lastWritten,
        "body.d",
      );
    }
    if (nodes.clipBody) {
      setAttrIfChanged(
        nodes.clipBody,
        "d",
        solved.pathD,
        this.lastWritten,
        "clipBody.d",
      );
    }
    if (this.hostEl) {
      this.hostEl.dataset.contourSamples = String(solved.sampleCount);
      this.hostEl.dataset.contourProfile = solved.profileId;
      this.hostEl.dataset.contourGeometry = String(solved.geometryModel);
    }
  }

  private renderFace(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
  ) {
    const faceIsoBoost = this.faceIsolation ? 1.45 : 1;
    if (nodes.faceCluster) {
      // Anti-collapse: never whole-head squeeze / zero-scale as ordinary expression.
      const rawFs =
        d.face.face_scale * (1 + d.skin.tension * 0.04) * faceIsoBoost;
      const fs = Math.max(FACE_RENDER_SCALE_FLOOR * (this.faceIsolation ? 1 : 1), rawFs);
      setStyleIfChanged(
        nodes.faceCluster,
        "transform",
        `translate(120px, 112px) scale(${fs}) translate(-120px, -112px)`,
        this.lastWritten,
        "face.transform",
      );
      setStyleIfChanged(
        nodes.faceCluster,
        "filter",
        this.faceIsolation ? "brightness(1.15)" : "",
        this.lastWritten,
        "face.filter",
      );
      if (this.svg && typeof this.svg.setAttribute === "function") {
        if (this.faceIsolation) this.svg.setAttribute("data-face-isolation", "1");
        else if (typeof this.svg.removeAttribute === "function") {
          this.svg.removeAttribute("data-face-isolation");
        }
      }
      touched.add("face_plane");
    }
    for (const [id, el] of [
      ["eyeL", nodes.eyeL],
      ["eyeR", nodes.eyeR],
    ] as const) {
      if (!el) continue;
      const open = d.face.eye_openness;
      const sp =
        d.face.eye_spacing * 8 + d.face.gaze * (id === "eyeL" ? -2 : 2);
      const sign = id === "eyeL" ? -1 : 1;
      // SVG CSS transforms default to the document origin. Without an explicit
      // feature-local transform box/origin, vertical eye scaling moves the
      // sharp eye path away from its bloom and shadow copies.
      setStyleIfChanged(
        el,
        "transformBox",
        "fill-box",
        this.lastWritten,
        `${id}.transformBox`,
      );
      setStyleIfChanged(
        el,
        "transformOrigin",
        "center center",
        this.lastWritten,
        `${id}.transformOrigin`,
      );
      setStyleIfChanged(
        el,
        "transform",
        `translate(${sign * sp}px, 0) scale(1, ${0.35 + open * 0.65})`,
        this.lastWritten,
        `${id}.transform`,
      );
      // R4 no-blackout: eyes remain facially communicative (never hard-zero).
      const eyeOp = Math.max(
        PROJECTOR_FACE_VIS_FLOORS.featureDormant,
        0.55 + open * 0.45,
      );
      setStyleIfChanged(
        el,
        "opacity",
        String(eyeOp),
        this.lastWritten,
        `${id}.opacity`,
      );
      touched.add("face_plane");
    }
    if (nodes.mouth) {
      setStyleIfChanged(
        nodes.mouth,
        "transformBox",
        "fill-box",
        this.lastWritten,
        "mouth.transformBox",
      );
      setStyleIfChanged(
        nodes.mouth,
        "transformOrigin",
        "center center",
        this.lastWritten,
        "mouth.transformOrigin",
      );
      setStyleIfChanged(
        nodes.mouth,
        "transform",
        `translate(0, ${d.face.mouth_openness * 4}px) scale(${d.face.mouth_width}, ${0.4 + d.face.mouth_openness * 0.8})`,
        this.lastWritten,
        "mouth.transform",
      );
      touched.add("face_plane");
    }
  }

  private renderEnergy(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
  ) {
    const sing = d.singularity;
    // Energy scale tracks domain level so inspection-visible volume varies with
    // state/route energy grammar (rejects flat 0.52). Floor prevents disappearance.
    const rawEnergyScale =
      0.85 +
      d.energy.level * 0.45 +
      sing.spectral_energy_envelope * 0.18 +
      sing.horizon_radius * 0.08;
    const energyScale = Math.max(ENERGY_RENDER_SCALE_FLOOR, rawEnergyScale);
    const energyOpacity = Math.max(
      0.06,
      (this.faceIsolation ? 0.08 : 0.12) +
        d.energy.level *
          (this.faceIsolation ? 0.12 : 0.55) *
          (1 - d.energy.occlusion * 0.5) *
          (1 - sing.center_void * 0.25),
    );

    let svgVolumeWritten = false;
    for (const [id, el] of [
      ["innerVolumePath", nodes.innerVolumePath],
      ["pearlCorePath", nodes.pearlCorePath],
      ["violetCorePath", nodes.violetCorePath],
      ["innerVolumeLayer", nodes.innerVolumeLayer],
    ] as const) {
      if (!el) continue;
      svgVolumeWritten = true;
      if (id === "innerVolumeLayer") {
        setStyleIfChanged(
          el,
          "opacity",
          String(0.35 + d.energy.level * 0.5),
          this.lastWritten,
          `${id}.opacity`,
        );
      } else {
        setStyleIfChanged(
          el,
          "transform",
          `translate(120px, 118px) scale(${energyScale}) translate(-120px, -118px)`,
          this.lastWritten,
          `${id}.transform`,
        );
        setStyleIfChanged(
          el,
          "opacity",
          String(energyOpacity),
          this.lastWritten,
          `${id}.opacity`,
        );
      }
      setAttrIfChanged(
        el,
        "data-energy-scale",
        String(energyScale),
        this.lastWritten,
        `${id}.escale`,
      );
      setAttrIfChanged(
        el,
        "data-energy-lagged",
        String(d.energy.laggedLevel),
        this.lastWritten,
        `${id}.elag`,
      );
      touched.add("internal_volume_energy");
    }
    this._lastEnergyScale = energyScale;
    this._lastEnergyOpacity = energyOpacity;
    this._lastSvgVolumeWritten = svgVolumeWritten;
  }

  private renderRelief(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
  ) {
    if (!nodes.reliefLayer) return;
    let sum = 0;
    const samples = d.relief.samples;
    const step = this.opticalMode === "authoring-neutral" ? 4 : 1;
    let count = 0;
    for (let i = 0; i < samples.length; i += step) {
      sum += samples[i] * samples[i];
      count++;
    }
    const rms = Math.sqrt(sum / Math.max(1, count));
    const op = Math.min(
      0.85,
      0.08 + Math.abs(rms) * 2.2 * d.relief.amplitude,
    );
    setStyleIfChanged(
      nodes.reliefLayer,
      "opacity",
      String(op),
      this.lastWritten,
      "relief.opacity",
    );
    setAttrIfChanged(
      nodes.reliefLayer,
      "data-relief-rms",
      String(rms),
      this.lastWritten,
      "relief.rms",
    );
    setAttrIfChanged(
      nodes.reliefLayer,
      "data-relief-animated",
      "1",
      this.lastWritten,
      "relief.anim",
    );
    const mean = samples.length ? samples[Math.floor(samples.length / 2)] : 0;
    if (nodes.reliefHighlight) {
      setStyleIfChanged(
        nodes.reliefHighlight,
        "opacity",
        String(0.15 + Math.max(0, mean) * d.relief.amplitude),
        this.lastWritten,
        "reliefHi.opacity",
      );
    }
    if (nodes.reliefShadow) {
      setStyleIfChanged(
        nodes.reliefShadow,
        "opacity",
        String(0.15 + Math.max(0, -mean) * d.relief.amplitude),
        this.lastWritten,
        "reliefSh.opacity",
      );
    }
    touched.add("adaptive_relief_field");
    this.lastFlush.reliefSampleRms = rms;
  }

  private renderSkin(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
  ) {
    if (nodes.chromaticShell) {
      const filter =
        this.opticalMode === "runtime-beauty"
          ? `saturate(${1 + d.skin.tension * 0.35}) contrast(${1 + d.skin.coupling * 0.15})`
          : "";
      setStyleIfChanged(
        nodes.chromaticShell,
        "filter",
        filter,
        this.lastWritten,
        "shell.filter",
      );
      touched.add("skin_surface");
    }
    if (nodes.shellBaseLayer) {
      setStyleIfChanged(
        nodes.shellBaseLayer,
        "opacity",
        String(0.9 + d.skin.damping * 0.08),
        this.lastWritten,
        "shellBase.opacity",
      );
      touched.add("skin_surface");
    }
  }

  private renderTexture(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
  ) {
    if (!nodes.cosmicTextureLayer) return;
    const amount =
      this.opticalMode === "authoring-neutral"
        ? d.texture.amount * 0.65
        : d.texture.amount;
    setStyleIfChanged(
      nodes.cosmicTextureLayer,
      "opacity",
      String(0.25 + amount * 0.55),
      this.lastWritten,
      "tex.opacity",
    );
    setStyleIfChanged(
      nodes.cosmicTextureLayer,
      "transform",
      `scale(${d.texture.scale})`,
      this.lastWritten,
      "tex.transform",
    );
    touched.add("surface_texture_relief");
  }

  private renderNormals(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
  ) {
    if (nodes.specularSurfacePath) {
      setStyleIfChanged(
        nodes.specularSurfacePath,
        "opacity",
        String(
          0.05 +
            d.normals.normalStrength * 0.2 * (1 - d.material.roughness * 0.5),
        ),
        this.lastWritten,
        "spec.opacity",
      );
      touched.add("normal_curvature_field");
    }
    if (nodes.keyReflectionLayer) {
      const baseOp =
        0.35 +
        d.normals.curvatureResponse * 0.4 +
        d.material.clearcoat * 0.2;
      const mult =
        this.opticalMode === "authoring-neutral"
          ? this.faceIsolation
            ? 0.2
            : 0.75
          : this.faceIsolation
            ? 0.25
            : 1;
      setStyleIfChanged(
        nodes.keyReflectionLayer,
        "opacity",
        String(baseOp * mult),
        this.lastWritten,
        "keyRef.opacity",
      );
      touched.add("normal_curvature_field");
    }
  }

  private renderOptics(
    d: GasperMultiDomainState,
    nodes: RigNodeCache,
    touched: Set<MorphologyDomainId>,
  ) {
    if (nodes.pearlCorePath) {
      const pe = 0.2 + d.material.pearl_intensity * 0.6;
      const op = Math.max(
        Number(this.lastWritten.get("pearlCorePath.opacity")) || 0,
        pe * (0.7 + d.energy.level * 0.3),
      );
      setStyleIfChanged(
        nodes.pearlCorePath,
        "opacity",
        String(op),
        this.lastWritten,
        "pearlCorePath.opacity",
      );
      touched.add("world_space_optical_rig");
    }
    if (nodes.keyHalo) {
      const haloOp =
        this.opticalMode === "authoring-neutral"
          ? 0.08 + d.optics.keyIntensity * 0.28
          : 0.1 + d.optics.keyIntensity * 0.5;
      setStyleIfChanged(
        nodes.keyHalo,
        "opacity",
        String(haloOp),
        this.lastWritten,
        "keyHalo.opacity",
      );
      if (this.opticalMode === "runtime-beauty") {
        setStyleIfChanged(
          nodes.keyHalo,
          "transform",
          `rotate(${d.optics.keyDirection * 25}deg)`,
          this.lastWritten,
          "keyHalo.transform",
        );
      }
      touched.add("world_space_optical_rig");
    }
    if (nodes.rim) {
      setStyleIfChanged(
        nodes.rim,
        "opacity",
        String(0.3 + d.optics.rim * 0.5),
        this.lastWritten,
        "rim.opacity",
      );
      touched.add("world_space_optical_rig");
    }
    if (nodes.faceEmissionLayer) {
      // R4 no-blackout: emission opacity never drops below dim-legible floor.
      const rawEm = 0.15 + d.optics.faceEmissive * 0.6;
      const emOp = Math.max(PROJECTOR_FACE_VIS_FLOORS.emissionDormant, rawEm);
      setStyleIfChanged(
        nodes.faceEmissionLayer,
        "opacity",
        String(emOp),
        this.lastWritten,
        "faceEm.opacity",
      );
      touched.add("world_space_optical_rig");
    }
  }

  private finalizeFlush(
    touched: Set<MorphologyDomainId>,
    d: GasperMultiDomainState,
    flushed: DirtyDomainId[],
    skipped: DirtyDomainId[],
    usedCache: boolean,
  ) {
    let sum = 0;
    const samples = d.relief.samples;
    let count = 0;
    for (let i = 0; i < samples.length; i += 4) {
      sum += samples[i] * samples[i];
      count++;
    }
    const rms = Math.sqrt(sum / Math.max(1, count));
    const domainsTouched = [...touched];
    const nonMacro = domainsTouched.filter(
      (x) =>
        x !== "macro_deformation_field" &&
        x !== "structural_lattice" &&
        x !== "canonical_contour",
    );
    const spatialScale =
      this._lastSvgVolumeWritten || flushed.includes("energy")
        ? this._lastEnergyScale
        : 0.85 +
          d.energy.level * 0.45 +
          d.singularity.spectral_energy_envelope * 0.18 +
          d.singularity.horizon_radius * 0.08;
    const volumeOpacity =
      this._lastSvgVolumeWritten || flushed.includes("energy")
        ? this._lastEnergyOpacity
        : 0.12 + d.energy.level * 0.55 * (1 - d.energy.occlusion * 0.5);
    const lagDelta = Math.abs(d.energy.target - d.energy.laggedLevel);
    const energyHasVolumeState =
      d.energy.lag > 0.01 &&
      spatialScale > 0.85 &&
      typeof d.energy.pulsePhase === "number" &&
      d.optics.internalGlow >= 0;

    // Always stamp feature channels on host for telemetry (even firewall path).
    if (this.hostEl?.dataset) {
      this.hostEl.dataset.eyeOpenness = String(d.face.eye_openness);
      this.hostEl.dataset.mouthOpenness = String(d.face.mouth_openness);
      // Inspection channel: report real domain energy (grammar-driven variation).
      this.hostEl.dataset.energyLevel = String(d.energy.level);
      this.hostEl.dataset.faceScale = String(
        Math.max(FACE_RENDER_SCALE_FLOOR * 0.8, d.face.face_scale),
      );
      this.hostEl.dataset.energyScale = String(
        Math.max(ENERGY_RENDER_SCALE_FLOOR, spatialScale),
      );
      this.hostEl.dataset.centerOfMassY = String(d.singularity.center_of_mass_y);
      this.hostEl.dataset.featureMotion = featureChannelsLive(d) ? "1" : "0";
    }

    this.lastFlush = {
      domainsTouched,
      contourOnly: nonMacro.length === 0 && domainsTouched.length > 0,
      reliefAnimated:
        (domainsTouched.includes("adaptive_relief_field") ||
          d.relief.animated) &&
        rms > 0.001,
      energyHasVolumeState,
      reliefSampleRms: rms,
      energyVolume: {
        spatialScale,
        volumeOpacity,
        lagDelta,
        laggedLevel: d.energy.laggedLevel,
        level: d.energy.level,
        target: d.energy.target,
        pulsePhase: d.energy.pulsePhase,
        opticalGlow: d.optics.internalGlow,
        svgVolumeWritten: this._lastSvgVolumeWritten,
      },
      dirtyDomainsFlushed: flushed,
      opticalMode: this.opticalMode,
      usedNodeCache: usedCache,
      domainsSkipped: skipped,
    };
    this.onFlush?.();
  }
}

function finiteOrNull(v: number | undefined | null): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function featureChannelsLive(d: GasperMultiDomainState): boolean {
  return (
    Number.isFinite(d.face.eye_openness) &&
    Number.isFinite(d.face.mouth_openness) &&
    Number.isFinite(d.energy.level)
  );
}

function nodesShellOpacity(nodes: RigNodeCache): number | null {
  const el = nodes.shellBaseLayer ?? nodes.chromaticShell;
  if (!el) return null;
  const op = (el as SVGElement).style?.opacity;
  if (op === undefined || op === "") {
    const attr =
      typeof (el as SVGElement).getAttribute === "function"
        ? (el as SVGElement).getAttribute("opacity")
        : null;
    if (attr == null || attr === "") return null;
    const n = Number(attr);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(op);
  return Number.isFinite(n) ? n : null;
}
