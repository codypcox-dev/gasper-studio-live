/**
 * Secondary optics + contact (Lane R4).
 * Maps to accepted Gasper visual intent — no decorative substitute glows.
 */

import type {
  OpticsGenerationInput,
  OpticsOperationalState,
  OpticsSystemState,
} from "./types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function fnv(parts: number[]): string {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const q = Math.round(p * 1e6);
    h = Math.imul(h ^ (q & 0xff), 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function bouncePath(intensity: number): string {
  if (intensity < 0.02) return "";
  const w = 18 + intensity * 12;
  const h = 6 + intensity * 4;
  return `M ${-w} 0 Q 0 ${-h} ${w} 0 Q 0 ${h * 0.4} ${-w} 0 Z`;
}

function rimPath(intensity: number): string {
  if (intensity < 0.02) return "";
  const r = 42 + intensity * 8;
  return `M ${-r} 0 A ${r} ${r * 0.92} 0 1 0 ${r} 0`;
}

function contactShadowPath(intensity: number, emb: string): string {
  if (intensity < 0.02) return "";
  const squash = emb === "low-orbit" ? 1.35 : emb === "dormant-orbit" ? 0.85 : 1;
  const rx = (28 + intensity * 16) * squash;
  const ry = (6 + intensity * 4) / squash;
  return `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 Z`;
}

function groundGlowPath(intensity: number): string {
  if (intensity < 0.02) return "";
  const rx = 36 + intensity * 20;
  const ry = 8 + intensity * 6;
  return `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 Z`;
}

function classify(
  hasGeometry: boolean,
  intensity: number,
  stateResponsive: boolean,
): OpticsSystemState["classification"] {
  if (!hasGeometry && intensity < 0.02) return "present-inactive";
  if (!hasGeometry && intensity >= 0.02) return "placeholder";
  if (hasGeometry && stateResponsive) return "operational";
  if (hasGeometry) return "operational-state-only";
  return "present-inactive";
}

export function evaluateSecondaryOptics(
  input: OpticsGenerationInput,
): OpticsOperationalState {
  const energy = clamp01(input.energy);
  const motion = clamp01(input.motion);
  const key = clamp01(input.keyIntensity);
  const rim = clamp01(input.rim);
  const ground = clamp01(input.groundContact);
  const normals = clamp01(input.normalStrength);
  const curv = clamp01(input.curvatureResponse);
  const depth = clamp01(input.opticalDepth);
  const emb = input.embodimentId || "presence";

  // Embodiment-aware contact bias
  const contactBias =
    emb === "low-orbit" ? 1.2 : emb === "dormant-orbit" ? 0.7 : emb === "comet" ? 0.85 : 1;

  const systems: OpticsSystemState[] = [];

  const secondaryI = clamp01(key * 0.55 + energy * 0.2);
  const secondaryPath = bouncePath(secondaryI * 0.7);
  systems.push({
    id: "secondary_reflection",
    intensity: secondaryI,
    geometryPath: secondaryPath,
    hasGeometry: secondaryPath.length > 0,
    visible: secondaryI > 0.05,
    classification: classify(secondaryPath.length > 0, secondaryI, true),
    mapsToAcceptedIntent: true,
    notes: "bounceGrad / fillGrad secondary fill — accepted material stack",
  });

  const rimI = clamp01(rim * 0.8 + energy * 0.15);
  const rimP = rimPath(rimI);
  systems.push({
    id: "edge_rims",
    intensity: rimI,
    geometryPath: rimP,
    hasGeometry: rimP.length > 0,
    visible: rimI > 0.05,
    classification: classify(rimP.length > 0, rimI, true),
    mapsToAcceptedIntent: true,
    notes: "rimGrad / rimVioletGrad edge response",
  });

  const bounceI = clamp01(key * 0.35 + motion * 0.15);
  const bounceP = bouncePath(bounceI);
  systems.push({
    id: "lower_bounce",
    intensity: bounceI,
    geometryPath: bounceP,
    hasGeometry: bounceP.length > 0,
    visible: bounceI > 0.05,
    classification: classify(bounceP.length > 0, bounceI, true),
    mapsToAcceptedIntent: true,
    notes: "lower fill bounce under shell",
  });

  const auraI = clamp01(energy * 0.25 + ground * 0.15);
  // Exterior aura uses soft groundGlow path — subordinate intensity
  const auraP = groundGlowPath(auraI * 0.6);
  systems.push({
    id: "exterior_aura",
    intensity: auraI,
    geometryPath: auraP,
    hasGeometry: auraP.length > 0,
    visible: auraI > 0.08,
    classification: classify(auraP.length > 0, auraI, true),
    mapsToAcceptedIntent: true,
    notes: "soft exterior aura (blurSoft/groundGlow intent)",
  });

  systems.push({
    id: "normal_response",
    intensity: normals,
    geometryPath: normals > 0.05 ? "normal-field" : "",
    hasGeometry: normals > 0.05,
    visible: normals > 0.05,
    classification: normals > 0.05 ? "operational-state-only" : "present-inactive",
    mapsToAcceptedIntent: true,
    notes: "normal strength drives shading (state-only when no path mesh)",
  });

  systems.push({
    id: "curvature_response",
    intensity: curv,
    geometryPath: curv > 0.05 ? "curvature-field" : "",
    hasGeometry: curv > 0.05,
    visible: curv > 0.05,
    classification: curv > 0.05 ? "operational-state-only" : "present-inactive",
    mapsToAcceptedIntent: true,
    notes: "curvature response couples shell specular",
  });

  systems.push({
    id: "optical_depth",
    intensity: depth,
    geometryPath: depth > 0.05 ? "optical-depth" : "",
    hasGeometry: depth > 0.05,
    visible: depth > 0.05,
    classification: depth > 0.05 ? "operational-state-only" : "present-inactive",
    mapsToAcceptedIntent: true,
    notes: "opticalDepth / opticalDepthGrad",
  });

  const shadowI = clamp01(ground * contactBias * (0.55 + energy * 0.2));
  const shadowP = contactShadowPath(shadowI, emb);
  systems.push({
    id: "contact_shadow",
    intensity: shadowI,
    geometryPath: shadowP,
    hasGeometry: shadowP.length > 0,
    visible: shadowI > 0.05,
    classification: classify(shadowP.length > 0, shadowI, true),
    mapsToAcceptedIntent: true,
    notes: "contactShadow under body",
  });

  const glowI = clamp01(ground * 0.45 + energy * 0.2);
  const glowP = groundGlowPath(glowI);
  systems.push({
    id: "ground_glow",
    intensity: glowI,
    geometryPath: glowP,
    hasGeometry: glowP.length > 0,
    visible: glowI > 0.05,
    classification: classify(glowP.length > 0, glowI, true),
    mapsToAcceptedIntent: true,
    notes: "groundGlow accepted contact energy",
  });

  const embContactI = clamp01(ground * contactBias);
  const embContactP = contactShadowPath(embContactI, emb);
  systems.push({
    id: "embodiment_aware_contact",
    intensity: embContactI,
    geometryPath: embContactP,
    hasGeometry: embContactP.length > 0,
    visible: embContactI > 0.05,
    classification: classify(embContactP.length > 0, embContactI, true),
    mapsToAcceptedIntent: true,
    notes: `contact bias for embodiment=${emb}`,
  });

  const hash = fnv(systems.map((s) => s.intensity));
  return { systems, hash, subordinateToFace: true };
}

export function opticsStatusReport(state: OpticsOperationalState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of state.systems) {
    out[s.id] = s.classification;
  }
  return out;
}
