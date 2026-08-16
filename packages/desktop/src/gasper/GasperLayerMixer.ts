/**
 * VEC-501 compatibility adapter over the canonical ResolvedPoseCompositor.
 * This class preserves the historical API but owns no independent final-value algorithm.
 */

import type { MotionLayerId } from "./eight-state-loop/types";
import { LAYER_AUTHORITY } from "./eight-state-loop/layer-authority";
import {
  antiCollapseIdentityConstraints,
  enforceAntiCollapseFloors,
  type AntiCollapseMode,
} from "./continuity/energyGrammar";
import {
  enforceNoBlackoutFloors,
  type NoBlackoutMode,
} from "./continuity/noBlackoutInvariant";
import {
  composeResolvedPose,
  makeLayer,
  type PoseConstraint,
  type PoseLayer,
} from "./compositor";

export type RigValueMap = Record<string, number>;
export type RigPoseLayers = {
  base: RigValueMap;
  embodiment: RigValueMap;
  expression: RigValueMap;
  behavior: RigValueMap;
  manual: RigValueMap;
  microstate: RigValueMap;
};
export type IdentityConstraint = {
  id: string;
  bindingId: string;
  min: number;
  max: number;
  mode: "clamp" | "reject";
};
export type LivingMotionLayers = Partial<Record<MotionLayerId, RigValueMap>>;

function entries(values: RigValueMap) {
  return Object.entries(values)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([bindingId, value]) => ({ bindingId, value }));
}

function poseLayers(pose: RigPoseLayers): PoseLayer[] {
  return [
    makeLayer("document_base", entries(pose.base), { id: "compat:base", blendMode: "absolute" }),
    makeLayer("embodiment", entries(pose.embodiment), { id: "compat:embodiment", blendMode: "additive" }),
    makeLayer("expression", entries(pose.expression), { id: "compat:expression", blendMode: "additive" }),
    makeLayer("runtime", entries(pose.behavior), { id: "compat:behavior", blendMode: "additive" }),
    makeLayer("manual_preview", entries(pose.manual), { id: "compat:manual", priority: 10, blendMode: "additive" }),
    makeLayer("manual_preview", entries(pose.microstate), { id: "compat:microstate", priority: 20, blendMode: "additive" }),
  ];
}

function canonicalConstraints(constraints: readonly IdentityConstraint[]): PoseConstraint[] {
  return constraints.map((constraint) => ({ ...constraint }));
}

function livingLayers(living: LivingMotionLayers, reducedMotionGate?: number): PoseLayer[] {
  return [...LAYER_AUTHORITY]
    .sort((a, b) => a.precedence - b.precedence)
    .flatMap((authority) => {
      const values = living[authority.id];
      if (!values) return [];
      const contributions = Object.entries(values).flatMap(([bindingId, raw]) => {
        if (typeof raw !== "number" || !Number.isFinite(raw)) return [];
        if (authority.neverOwns.includes(bindingId)) return [];
        const owned = authority.owns.includes("*") || authority.owns.includes(bindingId) ||
          authority.mix === "additive" || authority.mix === "modulate" || authority.mix === "gate";
        if (!owned && authority.mix === "replace") return [];
        if (authority.mix === "modulate") return [{ bindingId, value: 1 + raw }];
        if (authority.mix === "gate") {
          const scale = Math.max(0, Math.min(1, reducedMotionGate ?? raw));
          return [{ bindingId, value: 0.65 + 0.35 * scale }];
        }
        return [{ bindingId, value: raw }];
      });
      if (contributions.length === 0) return [];
      const blendMode = authority.mix === "additive" ? "additive" :
        authority.mix === "modulate" || authority.mix === "gate" ? "multiplicative" : "absolute";
      return [makeLayer("living", contributions, {
        id: `compat:living:${authority.id}`,
        priority: authority.precedence,
        blendMode,
        suppressOnScrub: true,
      })];
    });
}

export class GasperLayerMixer {
  mix(layers: RigPoseLayers, constraints: readonly IdentityConstraint[] = []): RigValueMap {
    return composeResolvedPose({ layers: poseLayers(layers), constraints: canonicalConstraints(constraints) }).values;
  }

  mixWithLiving(
    pose: RigPoseLayers,
    living: LivingMotionLayers,
    constraints: readonly IdentityConstraint[] = [],
    opts?: { reducedMotionGate?: number },
  ): RigValueMap {
    return composeResolvedPose({
      layers: [...poseLayers(pose), ...livingLayers(living, opts?.reducedMotionGate)],
      constraints: canonicalConstraints(constraints),
    }).values;
  }

  authorityTable() {
    return LAYER_AUTHORITY.map((layer) => ({
      id: layer.id,
      precedence: layer.precedence,
      mix: layer.mix,
      owns: [...layer.owns],
      neverOwns: [...layer.neverOwns],
    }));
  }

  mixWithCharacterAuthority(
    pose: RigPoseLayers,
    living: LivingMotionLayers,
    characterAuthority: RigValueMap,
    constraints: readonly IdentityConstraint[] = [],
    opts?: { reducedMotionGate?: number },
  ): RigValueMap {
    return composeResolvedPose({
      layers: [
        ...poseLayers(pose),
        ...livingLayers(living, opts?.reducedMotionGate),
        makeLayer("character_state", entries(characterAuthority), {
          id: "compat:character-state-final",
          blendMode: "absolute",
        }),
      ],
      constraints: canonicalConstraints(constraints),
    }).values;
  }

  mixWithEnergyContinuity(
    pose: RigPoseLayers,
    living: LivingMotionLayers,
    opts?: {
      reducedMotionGate?: number;
      antiCollapseMode?: AntiCollapseMode;
      characterAuthority?: RigValueMap;
      constraints?: readonly IdentityConstraint[];
    },
  ): RigValueMap {
    const mode = opts?.antiCollapseMode ?? "ordinary";
    const layers = [...poseLayers(pose), ...livingLayers(living, opts?.reducedMotionGate)];
    if (opts?.characterAuthority) {
      layers.push(makeLayer("character_state", entries(opts.characterAuthority), {
        id: "compat:character-state-final",
        blendMode: "absolute",
      }));
    }
    return composeResolvedPose({
      layers,
      constraints: canonicalConstraints([
        ...antiCollapseIdentityConstraints(mode),
        ...(opts?.constraints ?? []),
      ]),
      constraintResolvers: [
        { id: `anti-collapse:${mode}:composite`, resolve: (values) => enforceAntiCollapseFloors(values, mode) },
        { id: `no-blackout:${mode}:composite`, resolve: (values) => enforceNoBlackoutFloors(values, mode as NoBlackoutMode) },
      ],
    }).values;
  }
}
