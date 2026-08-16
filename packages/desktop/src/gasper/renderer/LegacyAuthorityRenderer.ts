/**
 * Legacy Authority Renderer — EQUIVALENCE-LAB WRAPPER ONLY (not the packaged mount).
 *
 * Embeds complete original Gasper (SVG + all-script-0..3) for dual-renderer lab
 * / equivalence comparison. Not an iframe, Sidekick HTML candidate, Playwright
 * page, or AgentBridge dependency.
 *
 * MUST NOT be returned by production selection helpers and must not be substituted
 * for the packaged FormMaster mount.
 * authorityClass is always "legacy-authority".
 *
 * Packaged production authority remains FormMaster via
 * mountGasperDocument → mountGasperDocumentLegacyFormMaster
 * (PRODUCTION_AUTHORITY_ID = legacy-authority-formmaster-v655).
 * NativeGasperRenderer is lab-only / incomplete until parity is proven.
 */

import {
  mountGasperDocumentLegacyFormMaster,
  type GasperDocumentMount,
  type FormMasterRig,
} from "../GasperDocument";
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
import { poseToLegacyControlMap } from "./CanonicalStateAdapter";
import {
  PRODUCTION_AUTHORITY_CLASS,
  quarantineLegacyProductionUse,
} from "./productionAuthority";

export const LEGACY_AUTHORITY_RENDERER_ID = "legacy-authority-formmaster-v655";
export const LEGACY_AUTHORITY_RENDERER_VERSION = "6.5.5-authority";

export class LegacyAuthorityRenderer implements GasperRenderer {
  readonly rendererId = LEGACY_AUTHORITY_RENDERER_ID;
  readonly rendererVersion = LEGACY_AUTHORITY_RENDERER_VERSION;
  /** Always lab legacy — never production-native. */
  readonly authorityClass = "legacy-authority" as const;

  private documentMount: GasperDocumentMount | null = null;
  private host: HTMLElement | null = null;
  private embodimentId: string | null = "presence";
  private expressionId: string | null = "neutral-settled";
  private livingSuspended = true;
  private clock: DeterministicRendererClock = { timeMs: 0, seed: 1005 };

  async mount(
    host: HTMLElement,
    options?: RendererMountOptions,
  ): Promise<RendererMountResult> {
    this.destroy();
    // Fail-closed if mounted under a production label / role.
    if (
      options?.role === (PRODUCTION_AUTHORITY_CLASS as never) ||
      host.getAttribute("data-gasper-production") === "1" ||
      host.getAttribute("data-gasper-authority") === PRODUCTION_AUTHORITY_CLASS
    ) {
      try {
        quarantineLegacyProductionUse("LegacyAuthorityRenderer.mount under production label");
      } catch (e) {
        return {
          ok: false,
          host,
          svgRoot: null,
          error: (e as Error).message,
        };
      }
    }
    try {
      host.setAttribute("data-gasper-allow-legacy", "1");
      this.documentMount = mountGasperDocumentLegacyFormMaster(host, {
        allowLab: true,
      });
      this.host = host;
      host.setAttribute("data-gasper-renderer", this.rendererId);
      host.setAttribute("data-gasper-authority", this.authorityClass);
      host.setAttribute("data-gasper-lab-only", "1");
      host.setAttribute("data-gasper-production-forbidden", "1");
      host.removeAttribute("data-gasper-production");
      // One frame so face/material populate
      try {
        this.documentMount.rig.requestOneFrame?.();
        this.documentMount.rig.setPaused(true);
      } catch {
        /* */
      }
      return {
        ok: true,
        host,
        svgRoot: this.documentMount.svgRoot,
      };
    } catch (e) {
      return {
        ok: false,
        host,
        svgRoot: null,
        error: (e as Error).message,
      };
    }
  }

  private rig(): FormMasterRig | null {
    return this.documentMount?.rig ?? null;
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

  applyPose(pose: GasperResolvedPose, _context?: RenderContext): RenderResult {
    const rig = this.rig();
    if (!rig) return { ok: false, error: "not mounted" };
    try {
      const mapped = poseToLegacyControlMap(pose, {
        embodimentId: this.embodimentId ?? undefined,
        expressionId: this.expressionId ?? undefined,
      });
      if (typeof mapped.motion === "number" && typeof rig.setMotion === "function") {
        rig.setMotion(mapped.motion);
      }
      if (typeof mapped.yaw === "number" && typeof rig.setYaw === "function") {
        rig.setYaw(mapped.yaw);
      }
      // Domain scalar application when available through global hooks
      const g = globalThis as unknown as {
        SidekickFormMasterRig?: FormMasterRig & {
          setBinding?: (id: string, v: number) => void;
          applyBindings?: (p: Record<string, number>) => void;
        };
      };
      const ext = g.SidekickFormMasterRig;
      if (ext?.applyBindings) {
        ext.applyBindings(mapped.bindings);
      } else if (ext?.setBinding) {
        for (const [k, v] of Object.entries(mapped.bindings)) {
          if (typeof v === "number") ext.setBinding(k, v);
        }
      }
      rig.requestOneFrame?.();
      return { ok: true, changed: Object.keys(pose) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  setEmbodiment(
    embodiment: GasperEmbodimentId,
    _context?: RenderContext,
  ): RenderResult {
    const rig = this.rig();
    if (!rig) return { ok: false, error: "not mounted" };
    try {
      rig.setProfile(embodiment);
      this.embodimentId = embodiment;
      // FormMaster skips RAF paint while paused — force one frame after profile
      try {
        const wasPaused = true;
        rig.setPaused?.(false);
        rig.requestOneFrame?.();
        if (this.livingSuspended) rig.setPaused?.(true);
        else if (wasPaused) {
          /* keep unpaused if living allowed */
        }
      } catch {
        rig.requestOneFrame?.();
      }
      return { ok: true, changed: ["embodiment"] };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  setExpression(
    expression: GasperExpressionId,
    _context?: RenderContext,
  ): RenderResult {
    const rig = this.rig();
    if (!rig) return { ok: false, error: "not mounted" };
    try {
      // Immediate snap so fixtures differ without waiting for transition tween
      if (typeof rig.setFixtureImmediate === "function") {
        rig.setFixtureImmediate(expression);
      } else {
        rig.setFixture(expression);
      }
      this.expressionId = expression;
      // Critical: when paused, requestRuntimeFrame may not paint — force render
      try {
        rig.setPaused?.(false);
        rig.requestOneFrame?.();
        if (this.livingSuspended) rig.setPaused?.(true);
      } catch {
        rig.requestOneFrame?.();
      }
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
    try {
      this.rig()?.setPaused(true);
    } catch {
      /* */
    }
  }

  resumeLivingMotion(): void {
    this.livingSuspended = false;
    try {
      this.rig()?.setPaused(false);
    } catch {
      /* */
    }
  }

  inspect(): RendererInspection {
    const stats = measureSvgPathStats(this.documentMount?.svgRoot ?? null);
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
      facePresent: stats.facePresent,
      notes: [
        "LegacyAuthorityRenderer is an equivalence-lab wrapper, not the packaged mount",
        "Packaged production authority is FormMaster (legacy-authority-formmaster-v655) via mountGasperDocument",
        "NativeGasperRenderer remains lab-only until packaged-native parity is proven",
        `clock.timeMs=${this.clock.timeMs} seed=${this.clock.seed}`,
      ],
    };
  }

  captureLayerManifest(): RendererLayerManifest {
    const svg = this.documentMount?.svgRoot ?? null;
    const stats = measureSvgPathStats(svg);
    const elementIds = svg
      ? [...svg.querySelectorAll("[id]")].map((el) => el.id).filter(Boolean)
      : [];
    const materialLayers = svg
      ? [
          ...new Set(
            [...svg.querySelectorAll("[data-material-layer]")].map(
              (el) => el.getAttribute("data-material-layer") || "",
            ),
          ),
        ].filter(Boolean)
      : [];
    const filterIds = svg
      ? [
          ...new Set(
            [...svg.querySelectorAll("filter[id]")].map((el) => el.id),
          ),
        ]
      : [];
    const gradientIds = svg
      ? [
          ...new Set(
            [
              ...svg.querySelectorAll(
                "linearGradient[id], radialGradient[id]",
              ),
            ].map((el) => el.id),
          ),
        ]
      : [];
    return {
      rendererId: this.rendererId,
      rendererVersion: this.rendererVersion,
      authorityClass: this.authorityClass,
      elementIds,
      populatedPathCount: stats.populated,
      emptyPathCount: stats.empty,
      materialLayers,
      filterIds,
      gradientIds,
      faceBounds: boundsOf(
        svg?.querySelector("#eyeL") ?? svg?.querySelector("#mouth") ?? null,
      ),
      bodyBounds: boundsOf(svg?.querySelector("#body") ?? null),
      visibleBounds: boundsOf(svg ?? null),
    };
  }

  destroy(): void {
    try {
      this.documentMount?.destroy();
    } catch {
      /* */
    }
    this.documentMount = null;
    this.host = null;
  }
}

export function createLegacyAuthorityRenderer(): GasperRenderer {
  return new LegacyAuthorityRenderer();
}
