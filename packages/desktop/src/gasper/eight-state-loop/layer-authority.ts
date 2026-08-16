/**
 * Explicit motion layer authority — no silent ownership.
 * Precedence 0 = lowest base; higher wins on replace; additive stacks after.
 */

import type { LayerAuthorityEntry, MotionLayerId } from "./types";

export const LAYER_AUTHORITY: readonly LayerAuthorityEntry[] = [
  {
    id: "base_form",
    precedence: 0,
    mix: "replace",
    owns: ["overall_height", "overall_width", "crown_height", "lower_body_fullness", "ground_flattening"],
    neverOwns: ["eye_openness", "gaze"],
    notes: "Authored rest form; scenario retargets from current, never teleports.",
  },
  {
    id: "embodiment_transition",
    precedence: 10,
    mix: "replace",
    owns: ["overall_height", "overall_width", "face_scale", "ground_flattening"],
    neverOwns: ["blink", "gaze"],
    notes: "Embodiment morph envelopes; R3 visual applies endpoints; R4 times the move.",
  },
  {
    id: "expression_state_target",
    precedence: 20,
    mix: "replace",
    owns: [
      "eye_spacing",
      "mouth_openness",
      "mouth_width",
      "corner_pull_l",
      "corner_pull_r",
      "face_scale",
      "skin_tension",
    ],
    neverOwns: ["energy_pulse"],
    notes: "State expression targets; blink layer may temporarily gate eye_openness.",
  },
  {
    id: "primary_scenario_transition",
    precedence: 30,
    mix: "replace",
    owns: [
      "energy_level",
      "energy_lag",
      "internal_glow",
      "face_emissive",
      "inertia",
      "secondary_lag",
      "settling",
      "rebound",
      "relief_amplitude",
      "relief_motion_coupling",
    ],
    neverOwns: [],
    notes: "Primary scenario GSAP timeline; starts from actual current values.",
  },
  {
    id: "blink",
    precedence: 40,
    mix: "replace",
    owns: ["eye_openness"],
    neverOwns: ["gaze", "overall_height", "energy_level"],
    notes: "Exclusive eye_openness during blink events; rest pose from expression base.",
  },
  {
    id: "gaze_saccade",
    precedence: 50,
    mix: "replace",
    owns: ["gaze"],
    neverOwns: ["eye_openness", "overall_height"],
    notes: "Exclusive gaze; saccades additive around state center.",
  },
  {
    id: "breathing",
    precedence: 60,
    mix: "additive",
    owns: ["overall_height", "overall_width"],
    neverOwns: ["eye_openness", "gaze"],
    notes: "Bounded volumetric idle; applied post-scenario as delta, not ownership steal.",
  },
  {
    id: "energy_pulse_lag",
    precedence: 70,
    mix: "modulate",
    owns: ["energy_pulse", "energy_lag", "energy_level"],
    neverOwns: ["eye_openness"],
    notes: "Continuous pulse/lag oscillators; phase preserved across non-dormant transitions.",
  },
  {
    id: "relief_drift",
    precedence: 80,
    mix: "additive",
    owns: ["relief_amplitude", "relief_motion_coupling"],
    neverOwns: ["face_scale"],
    notes: "Low-frequency relief drift during holds; decorrelated from breath.",
  },
  {
    id: "microvariation",
    precedence: 90,
    mix: "additive",
    owns: ["skin_tension", "internal_glow", "face_emissive"],
    neverOwns: ["overall_height"],
    notes: "Seeded micro noise; reduced-motion collapses amplitude.",
  },
  {
    id: "secondary_wobble",
    precedence: 100,
    mix: "additive",
    owns: ["overall_width", "secondary_lag", "inertia"],
    neverOwns: ["eye_openness", "gaze"],
    notes: "Secondary mass wobble; off under reduced motion.",
  },
  {
    id: "interruption_recovery",
    precedence: 110,
    mix: "replace",
    owns: ["*"],
    neverOwns: [],
    notes: "Retargets scenario channels from interpolated state; preserves additive layers.",
  },
  {
    id: "manual_override",
    precedence: 120,
    mix: "replace",
    owns: ["*"],
    neverOwns: [],
    notes: "Authoring scrub / direct manip; freezes loop transport while active.",
  },
  {
    id: "reduced_motion_projection",
    precedence: 130,
    mix: "gate",
    owns: ["*"],
    neverOwns: [],
    notes: "Final gate: scales oscillation & amplitude; never blanks face identity.",
  },
] as const;

export function layerById(id: MotionLayerId): LayerAuthorityEntry {
  const e = LAYER_AUTHORITY.find((l) => l.id === id);
  if (!e) throw new Error(`Unknown motion layer: ${id}`);
  return e;
}

export function layersByPrecedence(): LayerAuthorityEntry[] {
  return [...LAYER_AUTHORITY].sort((a, b) => a.precedence - b.precedence);
}

/** Binding → owning exclusive layers (replace mode only, non-wildcard). */
export function exclusiveOwnersForBinding(bindingId: string): MotionLayerId[] {
  return LAYER_AUTHORITY.filter(
    (l) =>
      l.mix === "replace" &&
      l.owns.includes(bindingId) &&
      !l.neverOwns.includes(bindingId),
  ).map((l) => l.id);
}
