/**
 * VEC-801 — FormMaster-safe living/endpoint policy for the hybrid production path.
 * Pure policy only: no DOM, no clock, no projection writer.
 */

import type { EightStateId as LivingEightStateId } from "../eight-state-loop";
import { SCENE_SUITE_SILHOUETTE_CHANNELS } from "../eight-state-loop/scene-suites";
import { toFormMasterFixtureId } from "../expression/formMasterBridge";

/**
 * FormMaster v6.5.5 fixture ids used by the resting showcase route.
 * Must be real EMOTION_FIXTURES keys (see all-script-3.js).
 * recognition-spark is a kernel/eight-state alias → mischievous-spark on FormMaster
 * (KERNEL_TO_FORM_MASTER in expression/formMasterBridge.ts).
 */
export const FORM_MASTER_FIXTURE_BY_LIVING_STATE: Record<LivingEightStateId, string> = {
  "presence-neutral-settled": "neutral-settled",
  "presence-listening-receive": "listening-receive",
  "presence-thinking-knit": "thinking-knit",
  "presence-recognition-spark": "mischievous-spark",
  "comet-executing-drive": "executing-drive",
  "presence-blocked-strain": "blocked-compressed",
  "presence-pleased-resolve": "pleased-resolve",
  "dormant-orbit-maintain": "neutral-settled",
  wake: "neutral-social",
};

/** Resolve kernel/eight-state alias → FormMaster EMOTION_FIXTURES id (shipped). */
export function resolveFormMasterEmotionFixtureId(id: string): string {
  return toFormMasterFixtureId(id);
}

/**
 * FormMaster-safe living keys (P0 living runtime on production legacy path).
 * Additive life via applySemanticPose. Unified Theory volume channels are the
 * sole deliberate exception: when the packet carries unified_time_seconds,
 * its conserved width/height pair is admitted as a bounded field projection.
 *
 * RECONCILE 2026-07-24: re-admit the blob-era technical channels that FormMaster
 * already maps without thrashing topology — yaw (VIEW_RIG 2.5D turntable),
 * crown_height / lower_body_fullness (subtle mass feel), relief, motion, energy.
 * GASPER-007-F: exported so structural suites drive the shipped policy set.
 */
export const LEGACY_LIVING_SAFE_KEYS = new Set([
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "eye_openness",
  "gaze",
  "relief_amplitude",
  "relief_motion_coupling",
  "secondary_lag",
  "settling",
  "rebound",
  "inertia",
  "internal_glow",
  "skin_tension",
  "face_emissive",
  "motion",
  // 2.5D / Adobe turntable-derived view rig (FormMaster setYaw 0–45°)
  "yaw",
  // Subtle mass feel (maps to FormMaster crown / low — not overall_width thrash)
  "crown_height",
  "lower_body_fullness",
  // V2.4 / D-0016 §6d: weight-transfer body channels. Admitted so a living/TS source CAN
  // drive the wispwalker lateral step on the legacy FormMaster path (applySemanticPose already
  // maps them at all-script-3.js:1023-1027). The current living loop does not emit them (the
  // walk is computed JS-native inside sampleBodyForProfile), so this is a parity enabler, not a
  // live-behavior change. Vertical bob must use posture_y, never overall_height (fenced below).
  "asym",
  "body_lean",
  "posture_x",
  "posture_y",
  "wide",
  "low",
  "unified_time_seconds",
  "unified_breath",
  "unified_breath_phase",
  "unified_wander",
  "unified_spring_x",
  "unified_spring_y",
  "unified_spring_theta",
  "unified_energy_pulse",
  "unified_relief_drift",
  "unified_micro_tremor",
  "unified_anticipation",
]);

/**
 * Legacy-authority endpoint channel keys for eight-state living on FormMaster.
 *
 * DOPS-01B / 60fps face recovery: FormMaster fixture owns the **mouth plane**
 * (mouth_openness / mouth_width / corner pulls). Eight-state IR defaults
 * (mouth_openness≈0.32) previously repainted an open grin over restrained
 * neutral-settled (fixture mouthOpen≈0.06) every living tick.
 *
 * Allowed: energy, eyes (clamped), relief, motion, optics, yaw/2.5D, subtle mass —
 * never overall_width/height contour rewrites.
 */
export const LEGACY_ENDPOINT_SAFE_KEYS = new Set([
  ...LEGACY_LIVING_SAFE_KEYS,
  "eye_spacing",
  "energy_occlusion",
  "relief_energy_coupling",
  "skin_damping",
  "skin_coupling",
  "key_intensity",
  "key_direction",
  "rim",
  "pearl_intensity",
  "absorption",
]);

/** Mouth-plane keys FormMaster fixtures own on the hybrid production path. */
export const LEGACY_FORMMASTER_MOUTH_PLANE_KEYS = new Set([
  "mouth_openness",
  "mouth_width",
  "corner_pull_l",
  "corner_pull_r",
  "face_scale",
]);

export function filterLegacyEndpointValues(
  values: Record<string, number>,
  opts?: { blinkFloor?: number; eyeCeiling?: number },
): Record<string, number> {
  // CONTINUOUS_FLUID_LOOP: the live eight-state loop widens the eye band so the
  // loop's authored blink (eye_openness dip toward ~0.08) actually closes on
  // screen. Default (no opts) preserves the shipped product Presence band.
  const blinkFloor = opts?.blinkFloor ?? 0.5;
  const eyeCeiling = opts?.eyeCeiling ?? 0.78;
  const out: Record<string, number> = {};
  const unifiedFieldActive =
    typeof values.unified_time_seconds === "number" &&
    Number.isFinite(values.unified_time_seconds);
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (
      (k === "overall_width" || k === "overall_height") &&
      !unifiedFieldActive
    )
      continue;
    if (LEGACY_FORMMASTER_MOUTH_PLANE_KEYS.has(k)) continue;
    if (
      !LEGACY_ENDPOINT_SAFE_KEYS.has(k) &&
      !(unifiedFieldActive && (k === "overall_width" || k === "overall_height"))
    )
      continue;
    // Awake-but-not-bug-eyed band for product Presence face at stage scale.
    if (k === "eye_openness") {
      // Product open almond band (FormMaster neutral-settled eyeOpenL≈0.55).
      // Prior ceiling 0.48 forced closed-arc lids on 60fps living reels.
      // Floor keeps social availability; ceiling still blocks bug-eyed IR spikes.
      out[k] = Math.min(eyeCeiling, Math.max(blinkFloor, v));
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** Filter living flush values to FormMaster-safe keys (shipped policy function). */
export function filterFormMasterSafeLivingValues(
  values: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== "number") continue;
    if (k === "overall_width" || k === "overall_height") continue;
    if (!LEGACY_LIVING_SAFE_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * D-0088 (owner-approved fence change, 2026-08-03): admit scene-suite-authored
 * silhouette values through the FormMaster fence. Scene-scoped provenance: the
 * caller supplies the exact absolute values the suite authored this frame
 * (living base + bound-clamped delta, computed by sceneSilhouetteAdmission).
 * The general fence (LEGACY_ENDPOINT_SAFE_KEYS, the unified-field exception)
 * is untouched — no other living source can drive these channels.
 */
export function admitSceneSilhouetteValues(
  filtered: Record<string, number>,
  sceneSilhouette: Readonly<Record<string, number>> | undefined,
): Record<string, number> {
  if (!sceneSilhouette) return filtered;
  let out = filtered;
  for (const k of SCENE_SUITE_SILHOUETTE_CHANNELS) {
    const v = sceneSilhouette[k];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (out === filtered) out = { ...filtered };
    out[k] = v;
  }
  return out;
}
