/**
 * Exclusive layer ownership map for Gasper character body.
 * shell owns contour mass; energy owns internal glow/pulse (not contour);
 * face owns eyes/mouth attached to shell-relative lattice; motion owns dynamics only.
 */

import {
  ENERGY_INTERNAL_CHANNELS,
  FACE_FEATURE_CHANNELS,
  MOTION_DYNAMIC_CHANNELS,
  SHELL_CONTOUR_CHANNELS,
  THEATRICAL_OVERLAY_KEYS,
} from "./invariants";
import type {
  CharacterChannelMap,
  CharacterLayer,
  CharacterStateProfile,
  CharacterValidationFailure,
  LayerOwner,
} from "./types";

/** Exclusive ownership map: channel → single owner. */
export const LAYER_OWNERSHIP_MAP: Readonly<Record<string, LayerOwner>> =
  Object.freeze({
    // Shell — contour mass
    overall_width: "shell",
    overall_height: "shell",
    crown_height: "shell",
    lower_body_fullness: "shell",
    ground_flattening: "shell",
    center_of_mass_y: "shell",
    pearl_intensity: "shell",
    roughness: "shell",
    clearcoat: "shell",
    absorption: "shell",
    skin_tension: "shell",
    skin_damping: "shell",
    skin_coupling: "shell",
    texture_amount: "shell",
    texture_scale: "shell",
    normal_strength: "shell",
    curvature_response: "shell",
    // Energy — internal glow / pulse (never contour)
    energy_level: "energy",
    energy_pulse: "energy",
    energy_lag: "energy",
    energy_occlusion: "energy",
    internal_glow: "energy",
    face_emissive: "energy",
    spectral_energy_envelope: "energy",
    relief_energy_coupling: "energy",
    // Face — attached features
    eye_openness: "face",
    eye_spacing: "face",
    gaze: "face",
    mouth_openness: "face",
    mouth_width: "face",
    corner_pull_l: "face",
    corner_pull_r: "face",
    face_scale: "face",
    // Motion — dynamics only
    inertia: "motion",
    settling: "motion",
    rebound: "motion",
    secondary_lag: "motion",
    motion: "motion",
    relief_motion_coupling: "motion",
    // Shared optics keyed to shell lighting (shell authority for rim/key)
    key_intensity: "shell",
    key_direction: "shell",
    rim: "shell",
    // Relief amplitude co-owned via shell surface (shell)
    relief_amplitude: "shell",
  });

export function ownerForChannel(channel: string): LayerOwner | null {
  return LAYER_OWNERSHIP_MAP[channel] ?? null;
}

export function channelsOwnedBy(layer: CharacterLayer): string[] {
  return Object.entries(LAYER_OWNERSHIP_MAP)
    .filter(([, owner]) => owner === layer)
    .map(([ch]) => ch);
}

/**
 * Detect disconnected layer ownership.
 * Any claim that differs from LAYER_OWNERSHIP_MAP[channel] is REJECT.
 * Also rejects theatrical overlay keys and incomplete multi-domain body.
 */
export function detectDisconnectedOwnership(
  channels: CharacterChannelMap,
  claimedOwnership?: Partial<Record<string, LayerOwner>>,
): CharacterValidationFailure[] {
  const failures: CharacterValidationFailure[] = [];

  // Theatrical overlays are disconnected by definition.
  for (const k of Object.keys(channels)) {
    const lower = k.toLowerCase();
    if (
      THEATRICAL_OVERLAY_KEYS.some(
        (t) => lower === t || lower.startsWith(`${t}_`) || lower.endsWith(`_${t}`),
      )
    ) {
      failures.push({
        code: "theatrical_overlay",
        message: `theatrical overlay key forbidden: ${k}`,
        details: { key: k },
      });
    }
  }

  // Complete ownership check: any claim ≠ LAYER_OWNERSHIP_MAP is disconnected.
  if (claimedOwnership) {
    for (const [channel, claimed] of Object.entries(claimedOwnership)) {
      if (!claimed) continue;
      const expected = LAYER_OWNERSHIP_MAP[channel];
      if (expected && claimed !== expected) {
        failures.push({
          code: "disconnected_layer_ownership",
          message: `channel ${channel} claimed by ${claimed}; expected ${expected}`,
          details: { channel, claimed, expected },
        });
      } else if (!expected && claimed) {
        // Claiming ownership of an unmapped channel as face/energy overlay is suspicious
        // only when it's a known domain channel family — skip unmapped free keys.
      }
    }
  }

  // Multi-domain coverage required for one body.
  const hasShell = SHELL_CONTOUR_CHANNELS.some(
    (k) => typeof channels[k] === "number",
  );
  const hasFace = FACE_FEATURE_CHANNELS.some(
    (k) => typeof channels[k] === "number",
  );
  const hasEnergy = ENERGY_INTERNAL_CHANNELS.some(
    (k) => typeof channels[k] === "number",
  );
  const hasMotion = MOTION_DYNAMIC_CHANNELS.some(
    (k) => typeof channels[k] === "number",
  );

  if (!hasShell || !hasFace || !hasEnergy || !hasMotion) {
    failures.push({
      code: "disconnected_layer_ownership",
      message:
        "incomplete multi-domain body (need shell+face+energy+motion channels)",
      details: { hasShell, hasFace, hasEnergy, hasMotion },
    });
  }

  return failures;
}

/**
 * Build default ownership map for a profile's channels from LAYER_OWNERSHIP_MAP.
 */
export function ownershipForChannels(
  channels: CharacterChannelMap,
): Record<string, LayerOwner> {
  const out: Record<string, LayerOwner> = {};
  for (const k of Object.keys(channels)) {
    const owner = ownerForChannel(k);
    if (owner) out[k] = owner;
  }
  return out;
}

/**
 * Assert layer ownership integrity for a full profile.
 */
export function assertLayerOwnership(
  profile: CharacterStateProfile,
  claimedOwnership?: Partial<Record<string, LayerOwner>>,
): CharacterValidationFailure[] {
  const failures = detectDisconnectedOwnership(
    profile.channels,
    claimedOwnership,
  );
  // Layer activations must all be present and finite.
  const act = profile.layerActivations;
  for (const layer of ["shell", "energy", "face", "motion"] as const) {
    const v = act[layer];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1.05) {
      failures.push({
        code: "disconnected_layer_ownership",
        stateId: profile.stateId,
        message: `invalid layer activation for ${layer}: ${String(v)}`,
      });
    }
  }
  // Shell must always have non-zero activation (contour always present).
  if (act.shell < 0.2) {
    failures.push({
      code: "disconnected_layer_ownership",
      stateId: profile.stateId,
      message: "shell layer activation below identity floor (0.2)",
    });
  }
  return failures.map((f) => ({ ...f, stateId: f.stateId ?? profile.stateId }));
}

/**
 * Strip theatrical / icon overlay keys from a channel map.
 * Pure: returns filtered channel map. Does not strip ownership violations
 * (those are claim-map checks, not channel-value filtering).
 */
export function stripTheatricalOverlayKeys(
  channels: CharacterChannelMap,
): CharacterChannelMap {
  const out: CharacterChannelMap = {};
  for (const [k, v] of Object.entries(channels)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const lower = k.toLowerCase();
    if (
      THEATRICAL_OVERLAY_KEYS.some(
        (t) => lower === t || lower.startsWith(`${t}_`) || lower.endsWith(`_${t}`),
      )
    ) {
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * @deprecated Alias of stripTheatricalOverlayKeys — kept for call-site stability.
 * Name historically overclaimed ownership stripping; theatrical keys only.
 */
export const stripDisconnectedOverlayKeys = stripTheatricalOverlayKeys;
