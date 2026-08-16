import {
  compileMechanicsDraftScore,
  type MotionMechanicsSummary,
} from "../../../shared/src/gasper-performance/reference/mechanics.js";
import { motionScoreSchema } from "../../../shared/src/gasper-performance/reference/schemas.js";
import type {
  EvidenceRef,
  MotionPrimitiveId,
  MotionScore,
  MotionScoreBeat,
} from "../../../shared/src/gasper-performance/reference/types.js";
import type { SemanticMotionProposal } from "./SemanticMotionInterpreter.js";

const REQUIRED_SUPPORT_COUNT: Readonly<Partial<Record<MotionPrimitiveId, number>>> = Object.freeze({
  plant: 1,
  release: 1,
  slide: 1,
  pivot: 1,
  support_exchange: 2,
  launch: 2,
});

function overlapMs(
  left: Readonly<{ t0Ms: number; t1Ms: number }>,
  right: Readonly<{ t0Ms: number; t1Ms: number }>,
): number {
  return Math.max(0, Math.min(left.t1Ms, right.t1Ms) - Math.max(left.t0Ms, right.t0Ms));
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function inferredEvidence(refs: readonly string[], confidence: number): EvidenceRef[] {
  return unique(refs).map((ref) => ({ kind: "inferred", ref, confidence }));
}

function requiredSupportsFor(
  primitive: MotionPrimitiveId,
  measuredOrder: readonly string[],
): readonly string[] | null {
  const required = REQUIRED_SUPPORT_COUNT[primitive] ?? 0;
  if (required === 0) return [];
  const distinct = unique(measuredOrder);
  if (distinct.length < required) return null;
  return distinct.slice(-required);
}

/**
 * Merge model-authored meaning into a mechanics-owned score. The compiler
 * never changes measured beat boundaries, frame ranges, contact order, root
 * travel, cadence, or the four mechanics-derived quality dimensions.
 */
export function compileSemanticMotionScore(
  mechanics: MotionMechanicsSummary,
  proposal: SemanticMotionProposal,
  id: string,
): MotionScore {
  if (!id.trim()) throw new Error("semantic Motion Score id is required");
  if (proposal.resolution === "unknown_movement") {
    throw new Error(`cannot compile unknown movement: ${proposal.movementName}`);
  }
  if (proposal.beats.length === 0) throw new Error("semantic proposal contains no beats");

  const draft = compileMechanicsDraftScore(mechanics, `${id}-mechanics`);
  const beats = draft.beats.map((measured): MotionScoreBeat => {
    const semantic = proposal.beats
      .map((candidate) => ({ candidate, overlap: overlapMs(measured, candidate) }))
      .filter((entry) => entry.overlap > 0)
      .sort((left, right) => right.overlap - left.overlap)[0]?.candidate;

    if (!semantic) {
      return {
        ...measured,
        ambiguities: [
          ...measured.ambiguities,
          {
            id: `${measured.id}-semantic-gap`,
            description: "No semantic proposal beat overlaps this measured mechanics interval.",
            confidence: 1,
            evidence: measured.evidence,
          },
        ],
      };
    }

    const semanticEvidence = inferredEvidence(semantic.evidenceRefs, semantic.confidence);
    const requestedSupports = requiredSupportsFor(semantic.primitive, measured.contact.order);
    const primitive = requestedSupports === null ? measured.primitive : semantic.primitive;
    const requiredSupports = requestedSupports ?? measured.contact.requiredSupports;
    const primitiveConflict = primitive !== semantic.primitive;
    const uncertaintyAmbiguities = proposal.uncertainties.map((uncertainty) => ({
      id: `${measured.id}-${uncertainty.id}`,
      description: uncertainty.description,
      confidence: uncertainty.confidence,
      evidence: inferredEvidence(uncertainty.evidenceRefs, uncertainty.confidence),
    }));

    return {
      ...measured,
      primitive,
      purpose: semantic.purpose,
      contact: {
        requiredSupports,
        order: measured.contact.order,
      },
      rhythm: {
        cadenceHz: measured.rhythm.cadenceHz,
        phase: semantic.rhythm.phase,
        accentTimesMs: unique([
          ...measured.rhythm.accentTimesMs,
          ...semantic.rhythm.accentTimesMs.filter(
            (accent) => accent >= measured.t0Ms && accent <= measured.t1Ms,
          ),
        ]).sort((left, right) => left - right),
      },
      motionQuality: {
        weight: measured.motionQuality.weight,
        flow: measured.motionQuality.flow,
        energy: measured.motionQuality.energy,
        directness: measured.motionQuality.directness,
        restraint: semantic.motionQuality.restraint,
        playfulness: semantic.motionQuality.playfulness,
        urgency: semantic.motionQuality.urgency,
      },
      poseIntent: {
        extremes: [...semantic.poseIntent.extremes],
        silhouette: semantic.poseIntent.silhouette,
        lineOfAction: semantic.poseIntent.lineOfAction,
      },
      roles: unique(semantic.roles),
      recognitionCritical: unique([
        ...measured.recognitionCritical,
        ...semantic.recognitionCritical,
      ]),
      confidence: Math.min(measured.confidence, semantic.confidence),
      evidence: [...measured.evidence, ...semanticEvidence],
      ambiguities: [
        ...uncertaintyAmbiguities,
        ...(primitiveConflict
          ? [{
              id: `${measured.id}-primitive-conflict`,
              description: `Semantic primitive ${semantic.primitive} requires support evidence absent from the measured ${measured.primitive} interval; measured primitive retained.`,
              confidence: 1,
              evidence: [...measured.evidence, ...semanticEvidence],
            }]
          : []),
      ],
      corrections: [...measured.corrections],
    };
  });

  return motionScoreSchema.parse({
    schema: "gasper.motion-score.v1",
    id: id.trim(),
    sourceObservationHash: mechanics.sourceObservationHash,
    durationMs: mechanics.durationMs,
    beats,
    provenance: {
      compiler: "gasper-semantic-motion-compiler",
      compilerVersion: beats.some((beat) =>
        beat.travel.rootPath.some((point) => Math.abs(point.y) > 1e-6),
      ) ? "1.1.0" : "1.0.0",
      sourceRefs: unique([
        mechanics.sourceObservationHash,
        `semantic-provider:${proposal.provider.id}:${proposal.provider.model}:${proposal.provider.responseId}`,
        ...proposal.externalDefinitionRefs,
      ]),
    },
  }) as MotionScore;
}
