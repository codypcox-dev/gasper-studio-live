/**
 * Live expression session for Dais manipulation — pure state + project API.
 * Live commits route through FacialBodyContinuum (continuous deformation).
 * Does not replace GSAP frame authority; consumers apply channels on host tick.
 */

import type { DomainScalarMap } from "../GasperDomainState";
import {
  blendExpressionChannels,
  projectExpression,
  sampleExpressionContinuum,
  type ExpressionGrammarState,
  type ProjectExpressionResult,
} from "./grammar";
import { listAnchorBindingIds } from "./anchorBindings";
import { FacialBodyContinuum } from "../facial/FacialBodyContinuum";
import {
  applyChannelsToDocumentGeometry,
  measureDocumentGeometry,
  type DocumentFacialGeometry,
  type DocumentGeometryMeasures,
} from "../facial/DocumentFacialGeometry";

export type ExpressionSessionSnapshot = {
  fixtureId: string;
  embodiment: string;
  expressionGain: number;
  channels: DomainScalarMap;
  family: string;
  chiralitySummary: Array<{ axis: string; sign: string; value: number }>;
  transitionDecision: string | null;
  revision: number;
  /** Continuum motion phase (hold when settled). */
  continuumPhase: string;
  /** Document-geometry measures bound from continuum channels (finite). */
  documentGeometry: DocumentGeometryMeasures;
};

export type ExpressionSessionListener = (snap: ExpressionSessionSnapshot) => void;

const DEFAULT_FIXTURE = "neutral-settled";
const DEFAULT_EMBODIMENT = "presence";
const DEFAULT_GAIN = 0.4;
const DEFAULT_TRANSITION_FRAMES = 48;

export class ExpressionStudioSession {
  private fixtureId = DEFAULT_FIXTURE;
  private embodiment = DEFAULT_EMBODIMENT;
  private expressionGain = DEFAULT_GAIN;
  private state: ExpressionGrammarState | null = null;
  private revision = 0;
  private listeners = new Set<ExpressionSessionListener>();
  /** Session-owned continuum — live channel authority (no discrete pose swaps). */
  private continuum = new FacialBodyContinuum();
  /** Document geometry last projected from continuum channels. */
  private documentGeometry: DocumentFacialGeometry | null = null;

  constructor() {
    this.bootstrapContinuum(DEFAULT_FIXTURE);
    this.reprojectMeta();
    this.syncDocumentGeometry();
  }

  subscribe(fn: ExpressionSessionListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = this.getSnapshot();
    for (const fn of this.listeners) fn(snap);
  }

  /** Seed continuum at fixture and drain to hold (initial / reset only). */
  private bootstrapContinuum(fixtureId: string) {
    this.continuum = new FacialBodyContinuum();
    this.continuum.setTarget({
      targetId: fixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      totalFrames: 16,
    });
    for (let i = 0; i < 20; i++) this.continuum.step();
    this.continuum.clearHistory();
  }

  /** Project affect/chirality/transition metadata without swapping live channels. */
  private reprojectMeta(from?: { fixtureId?: string; embodiment?: string }): ProjectExpressionResult {
    const result = projectExpression({
      fixtureId: this.fixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      fromFixtureId: from?.fixtureId,
      fromEmbodiment: from?.embodiment,
    });
    if (result.ok && result.state) {
      // Keep projected metadata, but live channels come from continuum.
      this.state = {
        ...result.state,
        channels: this.continuum.asDomainScalars(),
      };
      this.revision += 1;
    }
    return result;
  }

  getSnapshot(): ExpressionSessionSnapshot {
    const s = this.state;
    const cont = this.continuum.getSnapshot();
    const geom =
      this.documentGeometry ??
      applyChannelsToDocumentGeometry(this.continuum.asDomainScalars(), {
        expressionId: this.fixtureId,
        revision: this.revision,
      });
    return {
      fixtureId: this.fixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      channels: this.continuum.asDomainScalars(),
      family: s?.family ?? "neutral",
      chiralitySummary: (s?.chirality ?? []).map((c) => ({
        axis: c.axis,
        sign: c.sign,
        value: c.value,
      })),
      transitionDecision: s?.transition?.decision ?? null,
      revision: this.revision + cont.revision,
      continuumPhase: cont.phase,
      documentGeometry: measureDocumentGeometry(geom),
    };
  }

  /** Project live continuum channels onto document feature geometry. */
  private syncDocumentGeometry(): DocumentFacialGeometry {
    this.documentGeometry = applyChannelsToDocumentGeometry(
      this.continuum.asDomainScalars(),
      {
        expressionId: this.fixtureId,
        revision: this.revision,
      },
    );
    return this.documentGeometry;
  }

  getDocumentGeometry(): DocumentFacialGeometry {
    return this.syncDocumentGeometry();
  }

  getDocumentGeometryMeasures(): DocumentGeometryMeasures {
    return measureDocumentGeometry(this.syncDocumentGeometry());
  }

  listFixtures(): string[] {
    return listAnchorBindingIds();
  }

  /**
   * Retarget expression continuously — does not discrete-swap eye/mouth channels.
   * Snapshot channels remain at the continuum current pose; call stepFacial(dt)
   * from the host tick (GSAP/native frame authority) to advance.
   */
  setExpression(fixtureId: string): ProjectExpressionResult {
    const prev = { fixtureId: this.fixtureId, embodiment: this.embodiment };
    const probe = projectExpression({
      fixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      fromFixtureId: prev.fixtureId,
      fromEmbodiment: prev.embodiment,
    });
    if (!probe.ok || !probe.state) return probe;

    const contSnap = this.continuum.getSnapshot();
    const retarget =
      contSnap.phase !== "hold"
        ? this.continuum.interrupt({
            targetId: probe.state.fixtureId,
            embodiment: this.embodiment,
            expressionGain: this.expressionGain,
            totalFrames: DEFAULT_TRANSITION_FRAMES,
          })
        : this.continuum.setTarget({
            targetId: probe.state.fixtureId,
            embodiment: this.embodiment,
            expressionGain: this.expressionGain,
            totalFrames: DEFAULT_TRANSITION_FRAMES,
          });
    if (!retarget.ok) {
      return { ok: false, error: retarget.error ?? "continuum retarget failed" };
    }

    this.fixtureId = probe.state.fixtureId;
    this.state = {
      ...probe.state,
      channels: this.continuum.asDomainScalars(),
    };
    this.revision += 1;
    this.syncDocumentGeometry();
    this.emit();
    return {
      ok: true,
      state: this.state,
      binding: probe.binding,
    };
  }

  /**
   * Retarget and advance continuum until hold (still continuous frame steps,
   * never a one-frame pose swap). Useful for tests and non-ticked previews.
   */
  setExpressionAndSettle(
    fixtureId: string,
    totalFrames = DEFAULT_TRANSITION_FRAMES,
  ): ProjectExpressionResult {
    const result = this.setExpression(fixtureId);
    if (!result.ok) return result;
    // Ensure totalFrames for this settle path.
    this.continuum.setTarget({
      targetId: this.fixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      totalFrames,
    });
    for (let i = 0; i < totalFrames + 4; i++) {
      this.continuum.step();
    }
    if (this.state) {
      this.state = { ...this.state, channels: this.continuum.asDomainScalars() };
    }
    this.revision += 1;
    this.syncDocumentGeometry();
    this.emit();
    return {
      ok: true,
      state: this.state ?? undefined,
      binding: result.binding,
    };
  }

  /** Advance the session continuum one host frame (policy math only; no GSAP steal). */
  stepFacial(dt?: number): ExpressionSessionSnapshot {
    this.continuum.step(dt);
    if (this.state) {
      this.state = { ...this.state, channels: this.continuum.asDomainScalars() };
    }
    this.revision += 1;
    this.syncDocumentGeometry();
    this.emit();
    return this.getSnapshot();
  }

  setEmbodiment(embodiment: string): ProjectExpressionResult {
    const prev = { fixtureId: this.fixtureId, embodiment: this.embodiment };
    this.embodiment = embodiment;
    const result = this.reprojectMeta(prev);
    // Retarget continuum at same fixture under new embodiment metadata.
    this.continuum.setTarget({
      targetId: this.fixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      totalFrames: DEFAULT_TRANSITION_FRAMES,
    });
    if (result.ok) this.emit();
    return result;
  }

  setExpressionGain(gain: number): ProjectExpressionResult {
    this.expressionGain = gain;
    const result = this.reprojectMeta();
    this.continuum.setTarget({
      targetId: this.fixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      totalFrames: DEFAULT_TRANSITION_FRAMES,
    });
    if (result.ok) this.emit();
    return result;
  }

  /** Preview blend between current continuum pose and target fixture (does not commit). */
  previewTransition(toFixtureId: string, mix: number): DomainScalarMap | null {
    const fromChannels = this.continuum.asDomainScalars();
    const to = projectExpression({
      fixtureId: toFixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      fromFixtureId: this.fixtureId,
    });
    if (!to.ok || !to.state) return null;
    return blendExpressionChannels(fromChannels, to.state.channels, mix);
  }

  /**
   * Continuous multi-frame sample along current continuum pose → target.
   * Does not commit session state.
   */
  previewContinuumFrame(
    toFixtureId: string,
    frame: number,
    totalFrames = 48,
  ): DomainScalarMap | null {
    const fromChannels = this.continuum.asDomainScalars();
    const to = projectExpression({
      fixtureId: toFixtureId,
      embodiment: this.embodiment,
      expressionGain: this.expressionGain,
      fromFixtureId: this.fixtureId,
    });
    if (!to.ok || !to.state) return null;
    return sampleExpressionContinuum(
      fromChannels,
      to.state.channels,
      frame,
      totalFrames,
    ).channels;
  }

  /** Return the session continuum (shared instance — does not steal GSAP). */
  createFacialContinuum(): FacialBodyContinuum {
    return this.continuum;
  }

  /** Reset to neutral-settled / presence / default gain via continuum bootstrap. */
  reset(): ExpressionSessionSnapshot {
    this.fixtureId = DEFAULT_FIXTURE;
    this.embodiment = DEFAULT_EMBODIMENT;
    this.expressionGain = DEFAULT_GAIN;
    this.bootstrapContinuum(DEFAULT_FIXTURE);
    this.reprojectMeta();
    // Re-sync document geometry so measures match live continuum (not prior expression).
    this.documentGeometry = null;
    this.syncDocumentGeometry();
    this.emit();
    return this.getSnapshot();
  }

  /** Inspection ergonomics payload for HUD / proof surfaces. */
  inspect(): {
    source: "expression-studio-session";
    snapshot: ExpressionSessionSnapshot;
    channelCount: number;
    domainsHint: string[];
  } {
    const snap = this.getSnapshot();
    const domains = new Set<string>();
    for (const k of Object.keys(snap.channels)) {
      if (k.startsWith("eye_") || k.startsWith("mouth_") || k.startsWith("face_") || k === "gaze" || k.startsWith("corner_")) {
        domains.add("face");
      } else if (k.startsWith("energy_")) domains.add("energy");
      else if (k.startsWith("relief_") || k.startsWith("skin_")) domains.add("relief_skin");
      else if (k.startsWith("overall_") || k === "crown_height" || k === "ground_flattening") {
        domains.add("macro");
      } else if (k === "internal_glow" || k === "face_emissive") domains.add("optics");
      else domains.add("other");
    }
    return {
      source: "expression-studio-session",
      snapshot: snap,
      channelCount: Object.keys(snap.channels).length,
      domainsHint: [...domains].sort(),
    };
  }
}

let singleton: ExpressionStudioSession | null = null;

export function getExpressionStudioSession(): ExpressionStudioSession {
  if (!singleton) singleton = new ExpressionStudioSession();
  return singleton;
}

export function resetExpressionStudioSessionForTests(): void {
  singleton = null;
}
