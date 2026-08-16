/**
 * VisibleFacialBinding — project facial continuum + expression grammar onto
 * visible document geometry and instrument finite eye/mouth/energy measures.
 *
 * Frame authority stays with GSAP/native host: this module supplies document
 * geometry targets each step and never owns the wall-clock ticker.
 * Standalone: no AgentBridge HQ dependency.
 */

import {
  DEFAULT_FACIAL_POLICY,
  projectDormantLegibleChannels,
  type FacialChannelMap,
  type FacialContinuumPolicy,
} from "../../../../shared/src/gasper/facial";
import {
  FacialBodyContinuum,
  projectFacialTarget,
  type ContinuumSnapshot,
  type ContinuumTargetSpec,
} from "./FacialBodyContinuum";
import {
  SIX_EXPRESSION_TARGETS,
  analyzeDocumentGeometrySequence,
  applyChannelsToDocumentGeometry,
  createRestDocumentGeometry,
  documentFeatureDistance,
  isRenderedBlackOrInert,
  measureDocumentGeometry,
  renderedGeometrySignature,
  writeDocumentGeometryToSvg,
  type DocumentFacialGeometry,
  type DocumentGeometryMeasures,
  type DocumentGeometrySequenceReport,
  MIN_DOCUMENT_GEOMETRY_SEPARATION,
} from "./DocumentFacialGeometry";

export type VisibleFacialBindingOptions = {
  policy?: Partial<FacialContinuumPolicy>;
  /** Optional SVG document root for attribute write-through. */
  svgRoot?: Element | null;
};

export type VisibleFacialFrame = {
  index: number;
  t: number;
  expressionId: string;
  phase: string;
  channels: FacialChannelMap;
  geometry: DocumentFacialGeometry;
  measures: DocumentGeometryMeasures;
  continuum: ContinuumSnapshot;
  interruptEdge: boolean;
  holdingLastGood: boolean;
};

export type ExpressionGeometrySignature = {
  id: string;
  targetId: string;
  measures: DocumentGeometryMeasures;
  signature: string;
  eyeOpenness: number;
  mouthOpenness: number;
  energyLevel: number;
};

/**
 * Resolve production expression labels onto continuum-capable target ids.
 * Six Presence holds map to whole-face morphology semantic keys.
 */
export function resolveVisibleExpressionTarget(id: string): string {
  const aliases: Record<string, string> = {
    Neutral: "neutral",
    neutral: "neutral",
    "neutral-settled": "neutral",
    Listening: "listening",
    listening: "listening",
    "listening-open": "listening",
    "listening-orient": "listening",
    "listening-warm": "listening",
    "listening-focus": "listening",
    "listening-receive": "listening",
    Thinking: "thinking",
    thinking: "thinking",
    "thinking-knit": "thinking",
    Recognition: "recognition",
    recognition: "recognition",
    "recognition-spark": "recognition",
    "mischievous-spark": "recognition",
    Blocked: "blocked",
    blocked: "blocked",
    "blocked-strain": "blocked",
    Pleased: "pleased",
    pleased: "pleased",
    "pleased-glow": "pleased",
    "pleased-soft": "pleased",
    "Dormant Maintain": "neutral-settled",
    "dormant-maintain": "neutral-settled",
    dormant: "neutral-settled",
  };
  return aliases[id] ?? id;
}

/**
 * Live binding session: continuum steps → document geometry → optional SVG write.
 */
export class VisibleFacialBinding {
  private continuum: FacialBodyContinuum;
  private geometry: DocumentFacialGeometry;
  private expressionId = "neutral-settled";
  private svgRoot: Element | null;
  private frames: VisibleFacialFrame[] = [];
  private revision = 0;
  /** Last-good document geometry for interrupt hold. */
  private lastGoodGeometry: DocumentFacialGeometry;

  constructor(opts: VisibleFacialBindingOptions = {}) {
    this.continuum = new FacialBodyContinuum(opts.policy ?? {});
    this.svgRoot = opts.svgRoot ?? null;
    this.geometry = createRestDocumentGeometry();
    this.lastGoodGeometry = this.geometry;
    // Seed document from continuum rest pose.
    this.applyCurrent("neutral-settled");
  }

  /** Attach / replace SVG document root for write-through. */
  attachDocument(svgRoot: Element | null): void {
    this.svgRoot = svgRoot;
    if (this.svgRoot) {
      writeDocumentGeometryToSvg(this.svgRoot, this.geometry);
    }
  }

  getRevision(): number {
    return this.revision;
  }

  getGeometry(): DocumentFacialGeometry {
    return this.cloneGeom(this.geometry);
  }

  getMeasures(): DocumentGeometryMeasures {
    return measureDocumentGeometry(this.geometry);
  }

  getContinuumSnapshot(): ContinuumSnapshot {
    return this.continuum.getSnapshot();
  }

  getFrames(): VisibleFacialFrame[] {
    return this.frames.map((f) => ({
      ...f,
      channels: { ...f.channels },
      geometry: this.cloneGeom(f.geometry),
      measures: { ...f.measures, featureVector: [...f.measures.featureVector] },
    }));
  }

  clearFrames(): void {
    this.frames = [];
  }

  /**
   * Retarget expression continuously. Does not snap document pose.
   * Host must call step() on its frame authority path.
   */
  setExpression(
    targetId: string,
    opts?: { totalFrames?: number; embodiment?: string; expressionGain?: number },
  ): { ok: boolean; error?: string; snapshot: ContinuumSnapshot } {
    const resolved = resolveVisibleExpressionTarget(targetId);
    const result = this.continuum.setTarget({
      targetId: resolved,
      totalFrames: opts?.totalFrames,
      embodiment: opts?.embodiment,
      expressionGain: opts?.expressionGain,
    });
    if (result.ok) {
      this.expressionId = resolved;
      this.revision += 1;
    }
    return result;
  }

  /**
   * Interrupt mid-route with hold-last-good on document geometry.
   * First post-interrupt step freezes last valid geometry (no discrete eye/mouth swap).
   */
  interrupt(
    targetId: string,
    opts?: { totalFrames?: number; embodiment?: string; expressionGain?: number },
  ): { ok: boolean; error?: string; snapshot: ContinuumSnapshot } {
    const resolved = resolveVisibleExpressionTarget(targetId);
    this.lastGoodGeometry = this.cloneGeom(this.geometry);
    const result = this.continuum.interrupt({
      targetId: resolved,
      totalFrames: opts?.totalFrames,
      embodiment: opts?.embodiment,
      expressionGain: opts?.expressionGain,
    });
    if (result.ok) {
      this.expressionId = resolved;
      this.revision += 1;
    }
    return result;
  }

  /**
   * Advance one synthetic host frame: continuum step → document geometry bind.
   * Idempotent channel→geometry projection; revision bumps each successful step.
   */
  step(dt?: number): VisibleFacialFrame {
    const cont = this.continuum.getSnapshot();
    const stepResult = this.continuum.step(dt);
    const snap = stepResult.snapshot;

    // Hold-last-good: interrupt edge frame retains prior valid document geometry.
    if (snap.holdingLastGood && stepResult.frame.interruptEdge) {
      this.geometry = {
        ...this.cloneGeom(this.lastGoodGeometry),
        revision: this.revision + 1,
        expressionId: this.expressionId,
      };
    } else {
      this.geometry = applyChannelsToDocumentGeometry(snap.channels, {
        expressionId: this.expressionId,
        revision: this.revision + 1,
      });
      if (!snap.holdingLastGood) {
        this.lastGoodGeometry = this.cloneGeom(this.geometry);
      }
    }

    this.revision += 1;
    if (this.svgRoot) {
      writeDocumentGeometryToSvg(this.svgRoot, this.geometry);
    }

    const measures = measureDocumentGeometry(this.geometry);
    const frame: VisibleFacialFrame = {
      index: this.frames.length,
      t: stepResult.frame.t,
      expressionId: this.expressionId,
      phase: snap.phase,
      channels: { ...snap.channels },
      geometry: this.cloneGeom(this.geometry),
      measures,
      continuum: snap,
      interruptEdge: stepResult.frame.interruptEdge,
      holdingLastGood: snap.holdingLastGood,
    };
    this.frames.push(frame);
    return frame;
  }

  /**
   * Retarget and settle to hold (continuous multi-frame steps, never one-frame swap).
   */
  setExpressionAndSettle(
    targetId: string,
    totalFrames = 48,
  ): VisibleFacialFrame {
    this.setExpression(targetId, { totalFrames });
    let last: VisibleFacialFrame | null = null;
    for (let i = 0; i < totalFrames + 4; i++) {
      last = this.step();
    }
    return last ?? this.step();
  }

  /**
   * Run from→to sequence on document geometry (seeded at from, continuous route to to).
   */
  runExpressionRoute(
    fromId: string,
    toId: string,
    opts?: { totalFrames?: number; dt?: number },
  ): { frames: VisibleFacialFrame[]; report: DocumentGeometrySequenceReport } {
    this.clearFrames();
    const total = opts?.totalFrames ?? 48;
    const dt = opts?.dt ?? DEFAULT_FACIAL_POLICY.dtDefault;

    // Seed at from (settle quickly so route starts at distinct origin).
    this.continuum = new FacialBodyContinuum();
    this.setExpressionAndSettle(fromId, 24);
    this.clearFrames();
    // Record origin hold frame.
    this.recordHoldFrame();

    this.setExpression(toId, { totalFrames: total });
    for (let i = 0; i < total; i++) this.step(dt);

    const geoms = this.frames.map((f) => f.geometry);
    return {
      frames: this.getFrames(),
      report: analyzeDocumentGeometrySequence(geoms),
    };
  }

  /**
   * Interrupt sequence: from → first mid-route interrupt → second, hold-last-good.
   */
  runInterruptRoute(opts?: {
    fromId?: string;
    firstTarget?: string;
    secondTarget?: string;
    totalFrames?: number;
    interruptAt?: number;
    dt?: number;
  }): { frames: VisibleFacialFrame[]; report: DocumentGeometrySequenceReport } {
    this.clearFrames();
    const fromId = opts?.fromId ?? "neutral";
    const first = opts?.firstTarget ?? "recognition";
    const second = opts?.secondTarget ?? "blocked";
    const total = opts?.totalFrames ?? 48;
    const interruptAt = opts?.interruptAt ?? Math.floor(total / 2);
    const dt = opts?.dt ?? DEFAULT_FACIAL_POLICY.dtDefault;

    this.continuum = new FacialBodyContinuum();
    this.setExpressionAndSettle(fromId, 24);
    this.clearFrames();
    this.recordHoldFrame();

    this.setExpression(first, { totalFrames: total });
    for (let i = 0; i < interruptAt; i++) this.step(dt);
    this.interrupt(second, { totalFrames: total });
    for (let i = 0; i < total; i++) this.step(dt);

    const geoms = this.frames.map((f) => f.geometry);
    return {
      frames: this.getFrames(),
      report: analyzeDocumentGeometrySequence(geoms),
    };
  }

  /**
   * Dormant Maintain floor: settle neutral-settled then dim to legible dormant.
   * Quality floor — geometry must remain mature, attached, and non-black.
   * Dormant may be intentionally dim but must remain the same character.
   */
  runDormantMaintain(holdFrames = 24): {
    frames: VisibleFacialFrame[];
    report: DocumentGeometrySequenceReport;
    measures: DocumentGeometryMeasures;
  } {
    this.clearFrames();
    this.continuum = new FacialBodyContinuum();
    this.setExpressionAndSettle("neutral-settled", 32);
    // Dim presence into dormant-legible channels (not blackout).
    const presence = this.continuum.getSnapshot().channels;
    const dormant = projectDormantLegibleChannels(presence);
    this.applyChannels(dormant, "dormant-maintain");
    this.clearFrames();
    for (let i = 0; i < holdFrames; i++) {
      // Hold last-good dormant geometry without re-collapsing energy.
      this.geometry = applyChannelsToDocumentGeometry(
        projectDormantLegibleChannels(this.geometry.channels),
        { expressionId: "dormant-maintain", revision: this.revision + 1, visibilityMode: "dormant" },
      );
      this.revision += 1;
      if (this.svgRoot) writeDocumentGeometryToSvg(this.svgRoot, this.geometry);
      const measures = measureDocumentGeometry(this.geometry);
      const snap = this.continuum.getSnapshot();
      this.frames.push({
        index: this.frames.length,
        t: this.frames.length * DEFAULT_FACIAL_POLICY.dtDefault,
        expressionId: "dormant-maintain",
        phase: "hold",
        channels: { ...this.geometry.channels },
        geometry: this.cloneGeom(this.geometry),
        measures,
        continuum: snap,
        interruptEdge: false,
        holdingLastGood: false,
      });
    }
    const geoms = this.frames.map((f) => f.geometry);
    return {
      frames: this.getFrames(),
      report: analyzeDocumentGeometrySequence(geoms),
      measures: this.getMeasures(),
    };
  }

  /**
   * Sample all six named expressions at settled document geometry.
   * Pairwise distances must exceed MIN_DOCUMENT_GEOMETRY_SEPARATION.
   */
  sampleSixExpressionSignatures(settleFrames = 48): {
    signatures: ExpressionGeometrySignature[];
    pairwise: Array<{ a: string; b: string; distance: number; ok: boolean }>;
    allDistinct: boolean;
    allLegible: boolean;
  } {
    const signatures: ExpressionGeometrySignature[] = [];
    let allLegible = true;
    for (const t of SIX_EXPRESSION_TARGETS) {
      this.continuum = new FacialBodyContinuum();
      this.setExpressionAndSettle(t.targetId, settleFrames);
      const geom = this.getGeometry();
      const measures = this.getMeasures();
      if (isRenderedBlackOrInert(geom)) allLegible = false;
      signatures.push({
        id: t.id,
        targetId: t.targetId,
        measures,
        signature: renderedGeometrySignature(geom),
        eyeOpenness: measures.eyeOpenness,
        mouthOpenness: measures.mouthOpenness,
        energyLevel: measures.energyLevel,
      });
    }

    const pairwise: Array<{ a: string; b: string; distance: number; ok: boolean }> =
      [];
    let allDistinct = true;
    for (let i = 0; i < signatures.length; i++) {
      for (let j = i + 1; j < signatures.length; j++) {
        const a = signatures[i]!;
        const b = signatures[j]!;
        const distance = documentFeatureDistance(a.measures, b.measures);
        const sameSig = a.signature === b.signature;
        const ok = distance >= MIN_DOCUMENT_GEOMETRY_SEPARATION && !sameSig;
        if (!ok) allDistinct = false;
        pairwise.push({ a: a.id, b: b.id, distance, ok });
      }
    }
    return { signatures, pairwise, allDistinct, allLegible };
  }

  /** Project channels without continuum (direct document bind — tests / mixer). */
  applyChannels(
    channels: FacialChannelMap,
    expressionId?: string,
  ): DocumentFacialGeometry {
    this.geometry = applyChannelsToDocumentGeometry(channels, {
      expressionId: expressionId ?? this.expressionId,
      revision: this.revision + 1,
    });
    this.revision += 1;
    this.lastGoodGeometry = this.cloneGeom(this.geometry);
    if (this.svgRoot) writeDocumentGeometryToSvg(this.svgRoot, this.geometry);
    return this.getGeometry();
  }

  /** Expose continuum for host tick consumers (does not steal GSAP). */
  getContinuum(): FacialBodyContinuum {
    return this.continuum;
  }

  private applyCurrent(expressionId: string): void {
    const snap = this.continuum.getSnapshot();
    this.expressionId = expressionId;
    this.geometry = applyChannelsToDocumentGeometry(snap.channels, {
      expressionId,
      revision: this.revision,
    });
    this.lastGoodGeometry = this.cloneGeom(this.geometry);
    if (this.svgRoot) writeDocumentGeometryToSvg(this.svgRoot, this.geometry);
  }

  private recordHoldFrame(): void {
    const snap = this.continuum.getSnapshot();
    const measures = measureDocumentGeometry(this.geometry);
    this.frames.push({
      index: 0,
      t: 0,
      expressionId: this.expressionId,
      phase: snap.phase,
      channels: { ...snap.channels },
      geometry: this.cloneGeom(this.geometry),
      measures,
      continuum: snap,
      interruptEdge: false,
      holdingLastGood: false,
    });
  }

  private cloneGeom(g: DocumentFacialGeometry): DocumentFacialGeometry {
    return {
      ...g,
      channels: { ...g.channels },
      shell: { ...g.shell },
      facePlane: { ...g.facePlane },
      eyeL: { ...g.eyeL },
      eyeR: { ...g.eyeR },
      mouth: { ...g.mouth },
      cheekL: { ...g.cheekL },
      cheekR: { ...g.cheekR },
      browL: { ...g.browL },
      browR: { ...g.browR },
      energy: { ...g.energy },
      attachment: { ...g.attachment },
    };
  }
}

/**
 * One-shot: project a target onto document geometry via shipped continuum path.
 */
export function projectExpressionToDocumentGeometry(
  targetId: string,
  opts?: ContinuumTargetSpec & { settleFrames?: number },
): {
  ok: boolean;
  error?: string;
  geometry?: DocumentFacialGeometry;
  measures?: DocumentGeometryMeasures;
} {
  const resolved = resolveVisibleExpressionTarget(targetId);
  const projected = projectFacialTarget(resolved, {
    embodiment: opts?.embodiment,
    expressionGain: opts?.expressionGain,
  });
  if (!projected.ok) {
    return { ok: false, error: projected.error };
  }
  const binding = new VisibleFacialBinding();
  binding.setExpressionAndSettle(resolved, opts?.settleFrames ?? 48);
  return {
    ok: true,
    geometry: binding.getGeometry(),
    measures: binding.getMeasures(),
  };
}
