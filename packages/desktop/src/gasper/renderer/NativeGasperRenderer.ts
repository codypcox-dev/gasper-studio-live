/**
 * Native Gasper renderer — explicit lab/candidate backend.
 *
 * It resolves canonical state and projects through GasperRenderMixer for
 * equivalence and renderer-development work. Packaged production remains the
 * complete FormMaster authority mounted by mountGasperDocument().
 *
 * VEC-701 requires one leased writer on the native SVG root. The document rig
 * is target/probe-only; the mixer owns all candidate SVG mutation.
 */

import {
  mountGasperDocumentNativeCandidate,
  NATIVE_CANDIDATE_AUTHORITY_CLASS,
  NATIVE_CANDIDATE_AUTHORITY_ID,
  type GasperDocumentMount,
  type FormMasterRig,
} from "../GasperDocument";
import {
  GasperRenderMixer,
  type RenderedFeatureGeometry,
} from "../GasperRenderMixer";
import {
  isEightStateId,
  projectExpressionFixture,
  projectVisualStateEndpoint,
  resolveNativeAuthorityBindings,
  type EightStateId,
  type VisualStateProjectReport,
} from "../GasperExpressionProjector";
import {
  applyCharacterStateVisual,
  createCharacterApplySession,
  type CharacterApplySession,
  type StateVisualApplyReport,
} from "../state-visuals";
import {
  type GasperRenderer,
  type GasperCanonicalState,
  type GasperResolvedPose,
  type GasperEmbodimentId,
  type GasperExpressionId,
  type RenderContext,
  type RendererMountOptions,
  type RendererMountResult,
  type RenderResult,
  type RendererInspection,
  type RendererLayerManifest,
  type DeterministicRendererClock,
  measureSvgPathStats,
  boundsOf,
} from "./GasperRendererContract";
import { poseToNativeBindings } from "./CanonicalStateAdapter";
import {
  applyOpticalLegibilityClamps,
  resolveOpticalStateClass,
  type OpticalClampReport,
  type OpticalStateClass,
} from "./opticalLegibility";

/** Native-candidate identity; never selected as packaged production. */
export const NATIVE_CANDIDATE_RENDERER_ID = NATIVE_CANDIDATE_AUTHORITY_ID;
export const NATIVE_CANDIDATE_RENDERER_VERSION = "6.5.5-native-candidate";

export type NativeEightStateApplyReport = VisualStateProjectReport & {
  characterApply: StateVisualApplyReport;
  geometry: RenderedFeatureGeometry;
  authorityConnected: boolean;
  legacyOverrideBlocked: true;
};

export class NativeGasperRenderer implements GasperRenderer {
  readonly rendererId = NATIVE_CANDIDATE_RENDERER_ID;
  readonly rendererVersion = NATIVE_CANDIDATE_RENDERER_VERSION;
  readonly authorityClass = NATIVE_CANDIDATE_AUTHORITY_CLASS;

  private documentMount: GasperDocumentMount | null = null;
  private host: HTMLElement | null = null;
  private mixer: GasperRenderMixer | null = null;
  private embodimentId: string | null = "presence";
  private expressionId: string | null = "neutral-settled";
  private livingSuspended = true;
  private clock: DeterministicRendererClock = { timeMs: 0, seed: 1005 };
  private characterSession: CharacterApplySession = createCharacterApplySession();
  /** Last character/eight-state channels applied — win over fixture defaults. */
  private authorityChannels: Record<string, number> = {};
  private lastStateId: string | null = null;
  private authorityConnected = false;
  private lastCharacterApply: StateVisualApplyReport | null = null;
  /** Last optical legibility clamp report (post mixer flush). */
  private lastOpticalClamp: OpticalClampReport | null = null;
  private pendingOpticalStateHint: string | null = null;

  /**
   * Enforce R4 optical floors after every native mixer flush so ordinary
   * routes cannot bury the face via zero/near-zero emission or multiply
   * collapse. Idempotent; does not replace GSAP/native frame authority.
   * Also stamps data-optical-state-class on the SVG root so SVG CSS
   * state-relative floors (dormant/blocked) select correctly.
   */
  private enforceOpticalLegibility(stateHint?: string | null): OpticalClampReport {
    const svg = this.documentMount?.svgRoot ?? null;
    const hint = stateHint ?? this.lastStateId ?? this.expressionId ?? "ordinary";
    const stateClass: OpticalStateClass = resolveOpticalStateClass(hint);
    const report = applyOpticalLegibilityClamps(svg, stateClass);
    this.lastOpticalClamp = report;
    if (this.host) {
      this.host.setAttribute("data-optical-legibility", "r4");
      this.host.setAttribute("data-optical-state-class", stateClass);
    }
    return report;
  }

  /**
   * Register optical floors as a VEC-701 post-write extension. The hook runs
   * inside GasperRenderMixer's leased projection transaction.
   */
  private installFlushOpticalHook(): void {
    const mixer = this.mixer;
    if (!mixer) return;
    mixer.setProjectionPostWriteHook(() => {
      const hint = this.pendingOpticalStateHint ?? this.lastStateId;
      this.pendingOpticalStateHint = null;
      this.enforceOpticalLegibility(hint);
    });
  }

  async mount(
    host: HTMLElement,
    _options?: RendererMountOptions,
  ): Promise<RendererMountResult> {
    this.destroy();
    try {
      // Explicit native candidate mount. The rig is target-only and the
      // mixer claims the candidate SVG as its sole projector.
      this.documentMount = mountGasperDocumentNativeCandidate(host);
      this.host = host;
      this.mixer = new GasperRenderMixer(
        this.documentMount.svgRoot,
        undefined,
        host,
      );
      // Native path: mixer owns SVG writes. Never enable legacy firewall here.
      this.mixer.setLegacyAuthorityDomWriteFirewall(false);
      this.mixer.setContourProfile(this.embodimentId || "presence");
      this.installFlushOpticalHook();
      this.mixer.flush({ forceAll: true });
      host.setAttribute("data-gasper-renderer", this.rendererId);
      host.setAttribute("data-gasper-authority", this.authorityClass);
      host.setAttribute("data-gasper-state-visuals", "character-authority");
      host.setAttribute("data-gasper-lab-only", "1");
      host.setAttribute("data-gasper-production-forbidden", "1");
      host.removeAttribute("data-gasper-production");
      return { ok: true, host, svgRoot: this.documentMount.svgRoot };
    } catch (e) {
      this.destroy();
      return { ok: false, host, svgRoot: null, error: (e as Error).message };
    }
  }

  private rig(): FormMasterRig | null {
    return this.documentMount?.rig ?? null;
  }

  private requireMixer(): GasperRenderMixer | null {
    return this.mixer;
  }

  /**
   * Probe / structural-test mount: bind host + SVG + optional rig without the
   * full asset document loader. It still constructs the real candidate
   * GasperRenderMixer and runs the same applyEightStateHold path.
   * Never enables legacy DOM firewall.
   */
  attachProbeMount(opts: {
    host: HTMLElement;
    svgRoot: SVGSVGElement;
    rig?: FormMasterRig;
  }): void {
    this.destroy();
    const rig: FormMasterRig =
      opts.rig ??
      ({
        setProfile: (id: string) => {
          this.embodimentId = id;
        },
        setFixture: (id: string) => {
          this.expressionId = id;
        },
        setFixtureImmediate: (id: string) => {
          this.expressionId = id;
        },
        setMorphPreview: () => undefined,
        clearMorphPreview: () => undefined,
        setYaw: () => undefined,
        setPaused: () => undefined,
        setMotion: () => undefined,
        requestOneFrame: () => undefined,
        getSnapshot: () => ({}),
        getExpressionState: () => ({}),
        listEmotionFamilies: () => [],
        lastProjectedBindings: {},
      } as FormMasterRig & { lastProjectedBindings: Record<string, number> });

    this.documentMount = {
      host: opts.host,
      svgRoot: opts.svgRoot,
      idleRig: (opts.svgRoot.querySelector?.("#idleRig") as SVGGElement | null) ?? null,
      rig,
      topology: {
        contourSamples: 512,
        structuralNodes: 360,
        structuralTriangles: 672,
      },
      legacyFormMaster: false,
      authorityId: NATIVE_CANDIDATE_AUTHORITY_ID,
      authorityClass: NATIVE_CANDIDATE_AUTHORITY_CLASS,
      geometryExecutor: "native",
      productionPath: false,
      labOnly: true,
      destroy: () => undefined,
    };
    this.host = opts.host;
    this.mixer = new GasperRenderMixer(opts.svgRoot, undefined, opts.host);
    this.mixer.setLegacyAuthorityDomWriteFirewall(false);
    this.mixer.setContourProfile(this.embodimentId || "presence");
    this.installFlushOpticalHook();
    this.mixer.flush({ forceAll: true });
    opts.host.setAttribute("data-gasper-renderer", this.rendererId);
    opts.host.setAttribute("data-gasper-authority", this.authorityClass);
    opts.host.setAttribute("data-gasper-state-visuals", "character-authority");
    opts.host.setAttribute("data-gasper-lab-only", "1");
    opts.host.setAttribute("data-gasper-production-forbidden", "1");
    opts.host.removeAttribute("data-gasper-production");
    opts.host.setAttribute("data-gasper-probe-mount", "1");
  }

  /**
   * Canonical eight-state hold: character language + endpoint projection
   * materially control mixer → SVG feature geometry. Fixture affinity is soft
   * selection truth only; character-merged channels always win.
   */
  applyEightStateHold(
    stateId: string,
    opts?: { reducedMotion?: boolean; force?: boolean },
  ): NativeEightStateApplyReport {
    if (!isEightStateId(stateId)) {
      throw new TypeError(`unknown eight-state visual endpoint: ${stateId}`);
    }
    const mixer = this.requireMixer();
    if (!mixer || !this.documentMount) {
      throw new Error("NativeGasperRenderer.applyEightStateHold: not mounted");
    }

    const proj = projectVisualStateEndpoint(stateId, {
      reducedMotion: opts?.reducedMotion,
    });
    const characterApply = applyCharacterStateVisual(
      stateId,
      {
        endpointChannels: proj.bindings,
        reducedMotion: opts?.reducedMotion,
        force: opts?.force,
      },
      this.characterSession,
    );
    this.lastCharacterApply = characterApply;

    // Single shared merge path with controller — character wins, fixture blocked.
    const resolved = resolveNativeAuthorityBindings(stateId, {
      reducedMotion: opts?.reducedMotion,
      characterChannels: characterApply.mergedChannels,
      blockFixtureOverride: true,
    });
    const effectiveBindings: Record<string, number> = { ...resolved.bindings };

    // Soft fixture affinity for selection/dataset — never sole geometry writer.
    const fixtureId = resolved.expressionAffinity;
    this.embodimentId = resolved.embodimentId;
    this.expressionId = fixtureId;
    this.lastStateId = stateId;

    try {
      const rig = this.documentMount.rig as FormMasterRig & {
        morphToBehavioral?: (name: string, options?: { durationMs?: number }) => Promise<unknown>;
      };
      const cur = (rig.getSnapshot?.() as { profile?: string } | undefined)?.profile;
      if (cur !== resolved.embodimentId && typeof rig.morphToBehavioral === "function") {
        void rig.morphToBehavioral(resolved.embodimentId, { durationMs: 1618 });
      } else if (cur !== resolved.embodimentId) {
        rig.setProfile(resolved.embodimentId);
      }
    } catch {
      /* profile may already be set */
    }
    try {
      if (typeof this.documentMount.rig.setFixtureImmediate === "function") {
        this.documentMount.rig.setFixtureImmediate(fixtureId);
      } else {
        this.documentMount.rig.setFixture(fixtureId);
      }
    } catch {
      /* soft affinity */
    }

    // Discard lastProjectedBindings fixture partials — character channels win.
    mixer.setLegacyAuthorityDomWriteFirewall(false);
    mixer.setContourProfile(resolved.embodimentId);
    mixer.setForm(effectiveBindings);
    this.pendingOpticalStateHint = stateId;
    mixer.flush({ forceAll: true });

    this.authorityChannels = { ...effectiveBindings };
    this.authorityConnected = true;

    if (this.host) {
      this.host.setAttribute("data-gasper-state-id", stateId);
      this.host.setAttribute("data-gasper-authority-connected", "1");
      this.host.setAttribute("data-gasper-legacy-override", "blocked");
    }

    const geometry = mixer.measureRenderedFeatureGeometry();
    return {
      ...proj,
      embodimentId: resolved.embodimentId,
      expressionAffinity: resolved.expressionAffinity,
      bindings: effectiveBindings,
      characterApply,
      geometry,
      authorityConnected: true,
      legacyOverrideBlocked: true,
    };
  }

  applyCanonicalState(
    state: GasperCanonicalState,
    context?: RenderContext,
  ): RenderResult {
    const changed: string[] = [];
    if (state.embodimentId) {
      const r = this.setEmbodiment(state.embodimentId, context);
      if (!r.ok) return r;
      changed.push("embodiment");
    }
    if (state.expressionId) {
      const r = this.setExpression(state.expressionId, context);
      if (!r.ok) return r;
      changed.push("expression");
    }
    if (state.pose && Object.keys(state.pose).length) {
      const r = this.applyPose(state.pose, context);
      if (!r.ok) return r;
      changed.push("pose");
    }
    return { ok: true, changed };
  }

  /**
   * Apply full semantic pose bindings to the native mixer (not motion/yaw only).
   * When character authority is connected, pose keys merge under authority
   * (authority channels win on contested keys — no silent fixture snap-back).
   */
  applyPose(pose: GasperResolvedPose, _context?: RenderContext): RenderResult {
    const mixer = this.requireMixer();
    const rig = this.rig();
    if (!mixer || !rig) return { ok: false, error: "not mounted" };
    try {
      const bindings = poseToNativeBindings(pose);
      if (typeof bindings.motion === "number") rig.setMotion(bindings.motion);
      if (typeof bindings.yaw === "number") rig.setYaw(bindings.yaw);

      // Authority-connected: character channels win contested keys.
      const applied = this.authorityConnected
        ? { ...bindings, ...this.authorityChannels }
        : bindings;

      mixer.setLegacyAuthorityDomWriteFirewall(false);
      mixer.setForm(applied);
      this.pendingOpticalStateHint = this.lastStateId;
      mixer.flush({ forceAll: true });

      if (!this.authorityConnected && Object.keys(bindings).length > 0) {
        // Pose-only path still counts as connected domain authority for probes.
        this.authorityChannels = {
          ...this.authorityChannels,
          ...bindings,
        };
        this.authorityConnected = true;
      }
      return { ok: true, changed: Object.keys(pose) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  setEmbodiment(
    embodiment: GasperEmbodimentId,
    _context?: RenderContext,
  ): RenderResult {
    const mixer = this.requireMixer();
    const rig = this.rig();
    if (!mixer || !rig) return { ok: false, error: "not mounted" };
    try {
      const live = rig as FormMasterRig & {
        morphToBehavioral?: (name: string, options?: { durationMs?: number }) => Promise<unknown>;
      };
      const cur = (live.getSnapshot?.() as { profile?: string } | undefined)?.profile;
      this.embodimentId = embodiment;
      if (cur === embodiment) {
        return { ok: true, changed: ["embodiment"] };
      }
      if (typeof live.morphToBehavioral === "function") {
        void live.morphToBehavioral(embodiment, { durationMs: 1618 });
        return { ok: true, changed: ["embodiment"] };
      }
      live.setProfile(embodiment);
      mixer.setContourProfile(embodiment);
      const projected =
        (rig as { lastProjectedBindings?: Record<string, number> })
          .lastProjectedBindings ?? {};
      const targets = this.authorityConnected
        ? { ...projected, ...this.authorityChannels }
        : { ...projected };
      mixer.setForm(targets);
      this.pendingOpticalStateHint = this.lastStateId ?? embodiment;
      mixer.flush({ forceAll: true });
      return { ok: true, changed: ["embodiment"] };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * Expression fixture affinity only. When character/eight-state authority is
   * connected, fixture bindings never override authority channels.
   */
  setExpression(
    expression: GasperExpressionId,
    _context?: RenderContext,
  ): RenderResult {
    const mixer = this.requireMixer();
    const rig = this.rig();
    if (!mixer || !rig) return { ok: false, error: "not mounted" };
    try {
      if (typeof rig.setFixtureImmediate === "function") {
        rig.setFixtureImmediate(expression);
      } else {
        rig.setFixture(expression);
      }
      this.expressionId = expression;

      let fixtureBindings: Record<string, number> = {};
      try {
        fixtureBindings = { ...projectExpressionFixture(expression).bindings };
      } catch {
        /* unknown soft fixture */
      }

      // HARD GATE: authority channels always win over fixture/default pose.
      const targets = this.authorityConnected
        ? { ...fixtureBindings, ...this.authorityChannels }
        : fixtureBindings;

      mixer.setLegacyAuthorityDomWriteFirewall(false);
      if (Object.keys(targets).length > 0) {
        mixer.setForm(targets);
      }
      this.pendingOpticalStateHint = this.lastStateId ?? expression;
      mixer.flush({ forceAll: true });
      return { ok: true, changed: ["expression"] };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  setDeterministicClock(clock: DeterministicRendererClock): void {
    this.clock = { ...clock };
  }

  suspendLivingMotion(): void {
    this.livingSuspended = true;
    this.rig()?.setPaused(true);
  }

  resumeLivingMotion(): void {
    this.livingSuspended = false;
    this.rig()?.setPaused(false);
  }

  /** Post-render geometry probe (domain + DOM writes). */
  probeRenderedGeometry(): RenderedFeatureGeometry | null {
    return this.mixer?.measureRenderedFeatureGeometry() ?? null;
  }

  isAuthorityConnected(): boolean {
    return this.authorityConnected;
  }

  getLastStateId(): string | null {
    return this.lastStateId;
  }

  getAuthorityChannels(): Record<string, number> {
    return { ...this.authorityChannels };
  }

  getLastCharacterApply(): StateVisualApplyReport | null {
    return this.lastCharacterApply;
  }

  getCharacterApplySession(): CharacterApplySession {
    return this.characterSession;
  }

  getMixer(): GasperRenderMixer | null {
    return this.mixer;
  }

  /** Last post-flush optical legibility clamp (R4 floors). */
  getLastOpticalClamp(): OpticalClampReport | null {
    return this.lastOpticalClamp ? { ...this.lastOpticalClamp, applied: [...this.lastOpticalClamp.applied] } : null;
  }

  /**
   * Re-apply optical floors by forcing one leased mixer transaction.
   */
  reapplyOpticalLegibility(stateHint?: string | null): OpticalClampReport {
    const mixer = this.requireMixer();
    if (!mixer) {
      throw new Error("NativeGasperRenderer.reapplyOpticalLegibility: not mounted");
    }
    this.pendingOpticalStateHint = stateHint ?? this.lastStateId;
    mixer.flush({ forceAll: true });
    if (!this.lastOpticalClamp) {
      throw new Error("NativeGasperRenderer optical clamp did not commit");
    }
    return {
      ...this.lastOpticalClamp,
      applied: [...this.lastOpticalClamp.applied],
    };
  }

  /**
   * Disconnect authority (test adversarial). Subsequent fixture applies would
   * not re-bind character channels until applyEightStateHold / pose reconnects.
   */
  disconnectAuthorityForProbe(): void {
    this.authorityConnected = false;
    this.authorityChannels = {};
    this.lastStateId = null;
    if (this.host) {
      this.host.setAttribute("data-gasper-authority-connected", "0");
    }
  }

  inspect(): RendererInspection {
    const stats = measureSvgPathStats(this.documentMount?.svgRoot ?? null);
    const geom = this.probeRenderedGeometry();
    return {
      rendererId: this.rendererId,
      rendererVersion: this.rendererVersion,
      authorityClass: this.authorityClass,
      mounted: Boolean(this.documentMount),
      embodimentId: this.embodimentId,
      expressionId: this.expressionId,
      livingSuspended: this.livingSuspended,
      pathStats: {
        total: stats.total,
        populated: stats.populated,
        empty: stats.empty,
      },
      facePresent: stats.facePresent || Boolean(geom?.faceWritten),
      notes: [
        "Native candidate — character/eight-state authority drives mixer geometry",
        "packagedProduction=false labCandidate=true soleProjector=GasperRenderMixer",
        `clock.timeMs=${this.clock.timeMs} seed=${this.clock.seed}`,
        `authorityConnected=${this.authorityConnected}`,
        `lastStateId=${this.lastStateId ?? "none"}`,
        `featureChannelsNonNull=${geom?.featureChannelsNonNull ?? false}`,
      ],
    };
  }

  captureLayerManifest(): RendererLayerManifest {
    const svg = this.documentMount?.svgRoot ?? null;
    const stats = measureSvgPathStats(svg);
    const elementIds = svg
      ? [...svg.querySelectorAll("[id]")].map((el) => el.id).filter(Boolean)
      : [];
    return {
      rendererId: this.rendererId,
      rendererVersion: this.rendererVersion,
      authorityClass: this.authorityClass,
      elementIds,
      populatedPathCount: stats.populated,
      emptyPathCount: stats.empty,
      materialLayers: [],
      filterIds: [],
      gradientIds: [],
      faceBounds: boundsOf(
        svg?.querySelector("#eyeL") ?? svg?.querySelector("#mouth") ?? null,
      ),
      bodyBounds: boundsOf(svg?.querySelector("#body") ?? null),
      visibleBounds: boundsOf(svg ?? null),
    };
  }

  destroy(): void {
    try {
      this.mixer?.setProjectionPostWriteHook(null);
      this.mixer?.setSvg(null);
    } catch {
      /* */
    }
    try {
      this.documentMount?.destroy();
    } catch {
      /* */
    }
    this.documentMount = null;
    this.mixer = null;
    this.host = null;
    this.authorityChannels = {};
    this.authorityConnected = false;
    this.lastStateId = null;
    this.lastCharacterApply = null;
    this.lastOpticalClamp = null;
    this.pendingOpticalStateHint = null;
    this.characterSession = createCharacterApplySession();
  }
}

export function createNativeGasperRenderer(): GasperRenderer {
  return new NativeGasperRenderer();
}

/** Type guard for authority-capable native renderer. */
export function isNativeGasperRenderer(
  r: GasperRenderer,
): r is NativeGasperRenderer {
  return r instanceof NativeGasperRenderer;
}

/** Eight hold state ids (re-export convenience for probes). */
export type { EightStateId };
