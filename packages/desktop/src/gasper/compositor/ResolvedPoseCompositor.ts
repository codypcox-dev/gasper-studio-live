/**
 * VEC-501 canonical state compositor.
 *
 * Resolution order:
 * document base -> embodiment -> expression -> clip -> runtime -> living ->
 * manual/preview -> constraints -> explicit character-state final authority.
 */

import type {
  BlendMode,
  CanonicalLayerOwnership,
  CompositorInput,
  FinalPoseOwner,
  InspectionTrace,
  LayerOwnership,
  PoseContributionTrace,
  PoseConstraintTrace,
  PoseLayer,
  ResolvedPose,
  SemanticBindingId,
} from "./types";

export const CANONICAL_POSE_ORDER: readonly CanonicalLayerOwnership[] = [
  "document_base",
  "embodiment",
  "expression",
  "clip",
  "runtime",
  "living",
  "manual_preview",
  "character_state",
] as const;

const PRE_CONSTRAINT_ORDER = CANONICAL_POSE_ORDER.filter(
  (ownership) => ownership !== "character_state",
);

function normalizeOwnership(ownership: LayerOwnership): CanonicalLayerOwnership {
  return ownership === "preview" ? "manual_preview" : ownership;
}

function rank(ownership: LayerOwnership): number {
  return CANONICAL_POSE_ORDER.indexOf(normalizeOwnership(ownership));
}

function applyBlend(
  current: number | undefined,
  incoming: number,
  mode: BlendMode,
  weight: number,
  mask: number,
): number {
  const w = Math.max(0, Math.min(1, weight)) * Math.max(0, Math.min(1, mask));
  if (current === undefined) return mode === "additive" ? incoming * w : incoming;
  switch (mode) {
    case "absolute":
    case "weighted_override":
    case "masked_override":
      return current * (1 - w) + incoming * w;
    case "additive":
      return current + incoming * w;
    case "multiplicative":
      return current * (1 - w + incoming * w);
    default:
      return incoming;
  }
}

function fnv(values: Record<string, number>): string {
  let h = 2166136261 >>> 0;
  for (const k of Object.keys(values).sort()) {
    const q = Math.round((values[k] ?? 0) * 1e6);
    h = Math.imul(h ^ (q & 0xff), 16777619) >>> 0;
    for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

let heldPose: Record<SemanticBindingId, number> | null = null;
let heldTargets: Record<SemanticBindingId, string[]> = {};

export function clearHeldPose(): void {
  heldPose = null;
  heldTargets = {};
}

export function composeResolvedPose(input: CompositorInput): ResolvedPose {
  const scrub = !!input.scrubMode;
  const interrupted = !!input.interrupted;
  const diagnostics: string[] = [];

  if (interrupted && heldPose) {
    const traces: InspectionTrace[] = Object.keys(heldPose).sort().map((bindingId) => ({
      bindingId,
      base: heldPose![bindingId] ?? null,
      embodiment: null,
      expression: null,
      clip: null,
      runtime: null,
      living: null,
      preview: null,
      manualPreview: null,
      characterState: null,
      resolved: heldPose![bindingId]!,
      finalValue: heldPose![bindingId]!,
      owners: [],
      finalOwner: "held_pose",
      contributions: [],
      constraints: [],
      svgTargets: [...(heldTargets[bindingId] ?? [])],
    }));
    return { values: { ...heldPose }, traces, diagnostics: ["held_resolved_pose"], held: true, hash: fnv(heldPose) };
  }

  const orderedLayers = [...input.layers].sort((a, b) => {
    const byStage = rank(a.ownership) - rank(b.ownership);
    if (byStage !== 0) return byStage;
    const byPriority = (a.priority ?? 0) - (b.priority ?? 0);
    return byPriority !== 0 ? byPriority : a.id.localeCompare(b.id);
  });
  const preConstraintLayers = orderedLayers.filter(
    (layer) => normalizeOwnership(layer.ownership) !== "character_state",
  );
  const characterLayers = orderedLayers.filter(
    (layer) => normalizeOwnership(layer.ownership) === "character_state",
  );

  const values: Record<SemanticBindingId, number> = {};
  const owners: Record<SemanticBindingId, CanonicalLayerOwnership[]> = {};
  const finalOwners: Record<SemanticBindingId, FinalPoseOwner> = {};
  const layerValues: Record<SemanticBindingId, Partial<Record<CanonicalLayerOwnership, number>>> = {};
  const contributionTraces: Record<SemanticBindingId, PoseContributionTrace[]> = {};
  const constraintTraces: Record<SemanticBindingId, PoseConstraintTrace[]> = {};

  const applyLayer = (layer: PoseLayer) => {
    const ownership = normalizeOwnership(layer.ownership);
    if (scrub && (layer.suppressOnScrub || ownership === "living")) return;
    for (const contribution of layer.contributions) {
      if (!Number.isFinite(contribution.value)) {
        diagnostics.push(`NON_FINITE_CONTRIBUTION:${layer.id}:${contribution.bindingId}`);
        continue;
      }
      const mask = contribution.mask ?? 1;
      const weight = (contribution.weight ?? 1) * layer.weight;
      const before = values[contribution.bindingId];
      const after = applyBlend(before, contribution.value, layer.blendMode, weight, mask);
      values[contribution.bindingId] = after;
      owners[contribution.bindingId] ??= [];
      if (!owners[contribution.bindingId]!.includes(ownership)) owners[contribution.bindingId]!.push(ownership);
      layerValues[contribution.bindingId] ??= {};
      layerValues[contribution.bindingId]![ownership] = contribution.value;
      contributionTraces[contribution.bindingId] ??= [];
      contributionTraces[contribution.bindingId]!.push({
        layerId: layer.id,
        ownership,
        blendMode: layer.blendMode,
        inputValue: contribution.value,
        weight,
        mask,
        before: before ?? null,
        after,
      });
      finalOwners[contribution.bindingId] = ownership;
    }
  };

  for (const ownership of PRE_CONSTRAINT_ORDER) {
    for (const layer of preConstraintLayers) {
      if (normalizeOwnership(layer.ownership) === ownership) applyLayer(layer);
    }
  }

  for (const constraint of input.constraints ?? []) {
    const before = values[constraint.bindingId];
    if (before === undefined) continue;
    let after = before;
    if (constraint.mode === "clamp") {
      after = Math.min(constraint.max, Math.max(constraint.min, before));
    } else if (before < constraint.min || before > constraint.max) {
      diagnostics.push(`CONSTRAINT_REJECTED:${constraint.id}:${constraint.bindingId}:${before}`);
      throw new Error(`Pose constraint ${constraint.id} rejected ${constraint.bindingId}=${before}`);
    }
    values[constraint.bindingId] = after;
    constraintTraces[constraint.bindingId] ??= [];
    constraintTraces[constraint.bindingId]!.push({
      id: constraint.id,
      mode: constraint.mode,
      min: constraint.min,
      max: constraint.max,
      before,
      after,
      changed: Math.abs(after - before) > 1e-12,
    });
    if (Math.abs(after - before) > 1e-12) finalOwners[constraint.bindingId] = "constraints";
  }

  for (const resolver of input.constraintResolvers ?? []) {
    const beforeMap = { ...values };
    const resolvedMap = resolver.resolve(Object.freeze({ ...values }));
    for (const [bindingId, candidate] of Object.entries(resolvedMap)) {
      if (!Number.isFinite(candidate)) {
        diagnostics.push(`NON_FINITE_CONSTRAINT_RESOLVER:${resolver.id}:${bindingId}`);
        continue;
      }
      const before = beforeMap[bindingId];
      values[bindingId] = candidate;
      const changed = before === undefined || Math.abs(candidate - before) > 1e-12;
      constraintTraces[bindingId] ??= [];
      constraintTraces[bindingId]!.push({
        id: resolver.id,
        mode: "resolver",
        min: null,
        max: null,
        before: before ?? null,
        after: candidate,
        changed,
      });
      if (changed) finalOwners[bindingId] = "constraints";
    }
  }

  for (const layer of characterLayers) applyLayer(layer);

  for (const bindingId of input.requiredBindings ?? []) {
    if (values[bindingId] === undefined) diagnostics.push(`MISSING_BINDING:${bindingId}`);
  }

  const traces: InspectionTrace[] = Object.keys(values).sort().map((bindingId) => {
    const layer = layerValues[bindingId] ?? {};
    const manualPreview = layer.manual_preview ?? null;
    return {
      bindingId,
      base: layer.document_base ?? null,
      embodiment: layer.embodiment ?? null,
      expression: layer.expression ?? null,
      clip: layer.clip ?? null,
      runtime: layer.runtime ?? null,
      living: layer.living ?? null,
      preview: manualPreview,
      manualPreview,
      characterState: layer.character_state ?? null,
      resolved: values[bindingId]!,
      finalValue: values[bindingId]!,
      owners: owners[bindingId] ?? [],
      finalOwner: finalOwners[bindingId] ?? null,
      contributions: contributionTraces[bindingId] ?? [],
      constraints: constraintTraces[bindingId] ?? [],
      svgTargets: [...(input.bindingTargets?.[bindingId] ?? [])],
    };
  });

  if (interrupted) {
    heldPose = { ...values };
    heldTargets = Object.fromEntries(
      Object.entries(input.bindingTargets ?? {}).map(([key, targets]) => [key, [...targets]]),
    );
  }

  return { values, traces, diagnostics, held: false, hash: fnv(values) };
}

export function makeLayer(
  ownership: LayerOwnership,
  contributions: PoseLayer["contributions"],
  opts: Partial<Omit<PoseLayer, "ownership" | "contributions" | "id">> & { id?: string } = {},
): PoseLayer {
  const normalized = normalizeOwnership(ownership);
  return {
    id: opts.id ?? `layer-${normalized}`,
    ownership: normalized,
    blendMode: opts.blendMode ?? (normalized === "living" ? "additive" : "absolute"),
    weight: opts.weight ?? 1,
    persistence: opts.persistence ??
      (normalized === "manual_preview" || normalized === "living" ? "transient" : "durable"),
    interruption: opts.interruption ?? "hold_resolved",
    contributions,
    priority: opts.priority ?? 0,
    suppressOnScrub: opts.suppressOnScrub ?? normalized === "living",
  };
}
