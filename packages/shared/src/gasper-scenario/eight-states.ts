/**
 * Authoritative eight showcase scenario intents + channel targets.
 * Values are provisional authored engineering seeds (MegaBook §8).
 */

import type { GasperChannelDomainId, GasperChannelTargetV1 } from "./channels";
import { GASPER_CHANNEL_DOMAINS } from "./channels";
import type {
  EightScenarioId,
  GasperScenarioIntentV1,
  IdentityConstraintsV1,
} from "./types";
import { EIGHT_SCENARIO_IDS } from "./types";

const IDENTITY: IdentityConstraintsV1 = {
  character: "gasper",
  identity_lock: true,
  topology_lock: true,
  max_deviation: 0.35,
  protected_invariants: [
    "dark_pearl_shell",
    "cyan_violet_internal_energy",
    "single_species_identity",
    "face_legibility",
    "no_generic_sphere_dormant",
  ],
  no_color_only_distinction: true,
  no_mouth_only_distinction: true,
};

function ct(
  domain: GasperChannelDomainId,
  params: Record<string, number>,
  extra?: Partial<GasperChannelTargetV1>,
): GasperChannelTargetV1 {
  return {
    schema: "gasper.channel-target.v1",
    domain,
    params,
    ...extra,
  };
}

/** Build full 17-domain target map for a state. */
export function buildChannelTargets(
  partial: Partial<Record<GasperChannelDomainId, GasperChannelTargetV1>>,
): Record<GasperChannelDomainId, GasperChannelTargetV1> {
  const out = {} as Record<GasperChannelDomainId, GasperChannelTargetV1>;
  for (const d of GASPER_CHANNEL_DOMAINS) {
    out[d] =
      partial[d] ??
      ct(d, {
        active: 0.5,
        amplitude: 0.35,
      });
  }
  return out;
}

type StateDef = {
  intent: GasperScenarioIntentV1;
  channels: Record<GasperChannelDomainId, GasperChannelTargetV1>;
  binding_targets: Record<string, number>;
};

/**
 * Eight states — each pair engineered to differ across ≥4 domains and all
 * super-groups (form, motion, attention/face, energy/material).
 */
export const EIGHT_STATE_DEFINITIONS: Record<EightScenarioId, StateDef> = {
  "presence-neutral-settled": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "presence-neutral-settled",
      title: "Presence / Neutral Settled",
      seed: 1001,
      event: {
        description: "No urgent event; available for interaction.",
        stimulus_class: "settled_recovery",
      },
      appraisal: {
        novelty: 0.15,
        relevance: 0.35,
        congruence: 0.2,
        certainty: 0.85,
        predictability: 0.88,
        coping: 0.9,
        urgency: 0.12,
        self_agency: 0.55,
        interruption_pressure: 0.1,
      },
      affect: {
        valence: 0.12,
        arousal: 0.28,
        expression_gain: 0.32,
        attention: 0.48,
        certainty: 0.85,
        social_openness: 0.62,
        urgency: 0.12,
      },
      action_tendencies: {
        orient: 0.45,
        explore: 0.25,
        approach: 0.2,
        affiliate: 0.55,
        persist: 0.3,
        reject: 0.05,
        withdraw: 0.1,
        inhibit: 0.15,
        repair: 0.1,
        release: 0.2,
      },
      cognition: { mode: "idle", load: 0.2, focus: 0.4 },
      social: {
        availability: 0.78,
        warmth: 0.55,
        playfulness: 0.28,
        guardedness: 0.15,
      },
      embodiment: "presence",
      visual_semantic: [
        "calm_awareness",
        "controlled_asymmetry",
        "no_fixed_smile",
        "never_blank",
      ],
      historical_fixture_affinities: [
        "neutral-settled",
        "neutral-social",
        "neutral-wry",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "scale_durations",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s1",
        megabook_section: "§8 S1",
        notes: "Baseline social availability resting state.",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.62,
        vertical_bias: 0.5,
        asymmetry: 0.12,
        compression: 0.18,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.28,
        shell_contact: 0.42,
        lobe_definition: 0.55,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 1.0,
          overall_width: 1.0,
          crown_height: 0.04,
          ground_flattening: 0.02,
        },
        {
          binding_hints: {
            overall_height: 1,
            overall_width: 1,
            crown_height: 0.04,
            ground_flattening: 0.02,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 1.0, plane_recess: 0.35, legibility: 0.82 },
        { binding_hints: { face_scale: 1 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.56, spacing: 0.0, almond: 0.7 },
        { binding_hints: { eye_openness: 0.56, eye_spacing: 0 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.32, width: 1.0, corner_pull: 0.0 },
        {
          binding_hints: {
            mouth_openness: 0.08,
            mouth_width: 1,
            corner_pull_l: 0,
            corner_pull_r: 0,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: 0.0, aperture: 0.55, target_lock: 0.2 },
        { binding_hints: { gaze: 0 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.42, motion_coupling: 0.35, energy_coupling: 0.4 },
        { binding_hints: { relief_amplitude: 0.42 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.52, pulse: 0.16, lag: 0.35, focus: 0.4 },
        {
          binding_hints: {
            energy_level: 0.52,
            energy_pulse: 0.16,
            energy_lag: 0.35,
            internal_glow: 0.48,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.36, damping: 0.5, amount: 0.4 },
        { binding_hints: { skin_tension: 0.36 } },
      ),
      material: ct(
        "material",
        { roughness: 0.35, clearcoat: 0.4, pearl: 0.55 },
        {
          binding_hints: {
            roughness: 0.35,
            clearcoat: 0.4,
            pearl_intensity: 0.55,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.58,
          rim: 0.42,
          face_emissive: 0.32,
          absorption: 0.22,
        },
        {
          binding_hints: {
            key_intensity: 0.58,
            rim: 0.42,
            face_emissive: 0.32,
            absorption: 0.22,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.0,
        y: 0.0,
        stability: 0.85,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.32, lag: 0.4, rebound: 0.28, settling: 0.55 },
        {
          binding_hints: {
            inertia: 0.32,
            secondary_lag: 0.4,
            rebound: 0.28,
            settling: 0.55,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.35, hold: 0.25, asymmetry: 0.08 },
        { policy: "idle_social_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.18,
        frequency: 0.22,
        seed_weight: 0.4,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.55, hold_bias: 0.4 },
        { policy: "scale_durations" },
      ),
    }),
    binding_targets: {
      overall_height: 1,
      overall_width: 1,
      crown_height: 0.04,
      ground_flattening: 0.02,
      face_scale: 1,
      eye_openness: 0.56,
      eye_spacing: 0,
      mouth_openness: 0.08,
      mouth_width: 1,
      corner_pull_l: 0,
      corner_pull_r: 0,
      gaze: 0,
      relief_amplitude: 0.42,
      energy_level: 0.52,
      energy_pulse: 0.16,
      energy_lag: 0.35,
      internal_glow: 0.48,
      skin_tension: 0.36,
      roughness: 0.35,
      clearcoat: 0.4,
      pearl_intensity: 0.55,
      key_intensity: 0.58,
      rim: 0.42,
      face_emissive: 0.32,
      absorption: 0.22,
      inertia: 0.32,
      secondary_lag: 0.4,
      rebound: 0.28,
      settling: 0.55,
    },
  },

  "presence-listening-receive": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "presence-listening-receive",
      title: "Presence / Listening Receive",
      seed: 1002,
      event: {
        description: "Meaningful external input begins.",
        stimulus_class: "orientation",
      },
      appraisal: {
        novelty: 0.35,
        relevance: 0.82,
        congruence: 0.25,
        certainty: 0.7,
        predictability: 0.55,
        coping: 0.8,
        urgency: 0.35,
        self_agency: 0.45,
        interruption_pressure: 0.25,
      },
      affect: {
        valence: 0.08,
        arousal: 0.48,
        expression_gain: 0.48,
        attention: 0.78,
        certainty: 0.7,
        social_openness: 0.72,
        urgency: 0.35,
      },
      action_tendencies: {
        orient: 0.88,
        explore: 0.2,
        approach: 0.25,
        affiliate: 0.65,
        persist: 0.4,
        reject: 0.05,
        withdraw: 0.08,
        inhibit: 0.55,
        repair: 0.1,
        release: 0.1,
      },
      cognition: { mode: "listening", load: 0.4, focus: 0.75 },
      social: {
        availability: 0.85,
        warmth: 0.6,
        playfulness: 0.18,
        guardedness: 0.12,
      },
      embodiment: "presence",
      visual_semantic: [
        "mass_toward_reception",
        "stable_gaze",
        "wider_sensory_aperture",
        "lower_random_motion",
      ],
      historical_fixture_affinities: [
        "listening-open",
        "listening-focus",
        "listening-warm",
        "listening-orient",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "scale_durations",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s2",
        megabook_section: "§8 S2",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.58,
        vertical_bias: 0.54,
        asymmetry: 0.18,
        compression: 0.22,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.4,
        shell_contact: 0.5,
        lobe_definition: 0.6,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 1.025,
          overall_width: 0.99,
          crown_height: 0.08,
          ground_flattening: 0.01,
        },
        {
          binding_hints: {
            overall_height: 1.025,
            overall_width: 0.99,
            crown_height: 0.08,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 1.03, plane_recess: 0.3, legibility: 0.88 },
        { binding_hints: { face_scale: 1.03 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.64, spacing: 0.04, almond: 0.72 },
        { binding_hints: { eye_openness: 0.64, eye_spacing: 0.04 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.26, width: 1.02, corner_pull: 0.03 },
        {
          binding_hints: {
            mouth_openness: 0.26,
            mouth_width: 1.02,
            corner_pull_l: 0.03,
            corner_pull_r: 0.03,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: 0.14, aperture: 0.78, target_lock: 0.72 },
        { binding_hints: { gaze: 0.14 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.5, motion_coupling: 0.28, energy_coupling: 0.5 },
        { binding_hints: { relief_amplitude: 0.5 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.64, pulse: 0.22, lag: 0.28, focus: 0.7 },
        {
          binding_hints: {
            energy_level: 0.64,
            energy_pulse: 0.22,
            energy_lag: 0.28,
            internal_glow: 0.56,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.42, damping: 0.48, amount: 0.42 },
        { binding_hints: { skin_tension: 0.42 } },
      ),
      material: ct(
        "material",
        { roughness: 0.32, clearcoat: 0.45, pearl: 0.58 },
        {
          binding_hints: {
            roughness: 0.32,
            clearcoat: 0.45,
            pearl_intensity: 0.58,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.62,
          rim: 0.48,
          face_emissive: 0.4,
          absorption: 0.18,
        },
        {
          binding_hints: {
            key_intensity: 0.62,
            rim: 0.48,
            face_emissive: 0.4,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.06,
        y: 0.02,
        stability: 0.8,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.28, lag: 0.32, rebound: 0.22, settling: 0.45 },
        {
          binding_hints: {
            inertia: 0.28,
            secondary_lag: 0.32,
            rebound: 0.22,
            settling: 0.45,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.22, hold: 0.4, asymmetry: 0.05 },
        { policy: "listening_reduced_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.1,
        frequency: 0.15,
        seed_weight: 0.3,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.5, hold_bias: 0.55 },
        { policy: "scale_durations" },
      ),
    }),
    binding_targets: {
      overall_height: 1.025,
      overall_width: 0.99,
      crown_height: 0.08,
      face_scale: 1.03,
      eye_openness: 0.64,
      eye_spacing: 0.04,
      mouth_openness: 0.26,
      mouth_width: 1.02,
      corner_pull_l: 0.03,
      corner_pull_r: 0.03,
      gaze: 0.14,
      relief_amplitude: 0.5,
      energy_level: 0.64,
      energy_pulse: 0.22,
      energy_lag: 0.28,
      internal_glow: 0.56,
      skin_tension: 0.42,
      roughness: 0.32,
      clearcoat: 0.45,
      pearl_intensity: 0.58,
      key_intensity: 0.62,
      rim: 0.48,
      face_emissive: 0.4,
      inertia: 0.28,
      secondary_lag: 0.32,
      rebound: 0.22,
      settling: 0.45,
    },
  },

  "presence-thinking-knit": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "presence-thinking-knit",
      title: "Presence / Thinking Knit",
      seed: 1003,
      event: {
        description: "Input requires integration and internal work.",
        stimulus_class: "cognitive_load_increase",
      },
      appraisal: {
        novelty: 0.5,
        relevance: 0.85,
        congruence: 0.15,
        certainty: 0.55,
        predictability: 0.4,
        coping: 0.75,
        urgency: 0.4,
        self_agency: 0.65,
        interruption_pressure: 0.35,
      },
      affect: {
        valence: 0.05,
        arousal: 0.5,
        expression_gain: 0.45,
        attention: 0.7,
        certainty: 0.55,
        social_openness: 0.45,
        urgency: 0.4,
      },
      action_tendencies: {
        orient: 0.4,
        explore: 0.55,
        approach: 0.15,
        affiliate: 0.35,
        persist: 0.75,
        reject: 0.1,
        withdraw: 0.2,
        inhibit: 0.6,
        repair: 0.15,
        release: 0.1,
      },
      cognition: { mode: "thinking", load: 0.72, focus: 0.68 },
      social: {
        availability: 0.55,
        warmth: 0.4,
        playfulness: 0.12,
        guardedness: 0.25,
      },
      embodiment: "presence",
      visual_semantic: [
        "upper_shell_organization",
        "inward_energy_knitting",
        "deliberate_gaze_changes",
        "controlled_tension",
        "no_generic_upward_look",
      ],
      historical_fixture_affinities: [
        "thinking-knit",
        "thinking-scan",
        "thinking-resolve",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "scale_durations",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s3",
        megabook_section: "§8 S3",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.55,
        vertical_bias: 0.58,
        asymmetry: 0.1,
        compression: 0.35,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.58,
        shell_contact: 0.55,
        lobe_definition: 0.68,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 0.99,
          overall_width: 0.98,
          crown_height: 0.12,
          ground_flattening: 0.04,
        },
        {
          binding_hints: {
            overall_height: 0.99,
            overall_width: 0.98,
            crown_height: 0.12,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 0.98, plane_recess: 0.48, legibility: 0.75 },
        { binding_hints: { face_scale: 0.98 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.48, spacing: -0.06, almond: 0.65 },
        { binding_hints: { eye_openness: 0.48, eye_spacing: -0.06 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.22, width: 0.96, corner_pull: -0.02 },
        {
          binding_hints: {
            mouth_openness: 0.22,
            mouth_width: 0.96,
            corner_pull_l: -0.02,
            corner_pull_r: -0.02,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: -0.08, aperture: 0.42, target_lock: 0.35 },
        { binding_hints: { gaze: -0.08 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.58, motion_coupling: 0.45, energy_coupling: 0.62 },
        { binding_hints: { relief_amplitude: 0.58 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.58, pulse: 0.35, lag: 0.55, focus: 0.8 },
        {
          binding_hints: {
            energy_level: 0.58,
            energy_pulse: 0.35,
            energy_lag: 0.55,
            internal_glow: 0.5,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.52, damping: 0.42, amount: 0.48 },
        { binding_hints: { skin_tension: 0.52 } },
      ),
      material: ct(
        "material",
        { roughness: 0.38, clearcoat: 0.36, pearl: 0.5 },
        {
          binding_hints: {
            roughness: 0.38,
            clearcoat: 0.36,
            pearl_intensity: 0.5,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.52,
          rim: 0.38,
          face_emissive: 0.28,
          absorption: 0.28,
        },
        {
          binding_hints: {
            key_intensity: 0.52,
            rim: 0.38,
            face_emissive: 0.28,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.0,
        y: 0.04,
        stability: 0.7,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.45, lag: 0.55, rebound: 0.18, settling: 0.35 },
        {
          binding_hints: {
            inertia: 0.45,
            secondary_lag: 0.55,
            rebound: 0.18,
            settling: 0.35,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.28, hold: 0.5, asymmetry: 0.12 },
        { policy: "thinking_deliberate_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.14,
        frequency: 0.28,
        seed_weight: 0.45,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.48, hold_bias: 0.5 },
        { policy: "scale_durations" },
      ),
    }),
    binding_targets: {
      overall_height: 0.99,
      overall_width: 0.98,
      crown_height: 0.12,
      face_scale: 0.98,
      eye_openness: 0.48,
      eye_spacing: -0.06,
      mouth_openness: 0.22,
      mouth_width: 0.96,
      corner_pull_l: -0.02,
      corner_pull_r: -0.02,
      gaze: -0.08,
      relief_amplitude: 0.58,
      energy_level: 0.58,
      energy_pulse: 0.35,
      energy_lag: 0.55,
      internal_glow: 0.5,
      skin_tension: 0.52,
      roughness: 0.38,
      clearcoat: 0.36,
      pearl_intensity: 0.5,
      key_intensity: 0.52,
      rim: 0.38,
      face_emissive: 0.28,
      inertia: 0.45,
      secondary_lag: 0.55,
      rebound: 0.18,
      settling: 0.35,
    },
  },

  "presence-recognition-spark": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "presence-recognition-spark",
      title: "Presence / Recognition Spark",
      seed: 1004,
      event: {
        description: "Useful pattern, answer, match, or target recognized.",
        stimulus_class: "recognition",
      },
      appraisal: {
        novelty: 0.78,
        relevance: 0.9,
        congruence: 0.7,
        certainty: 0.8,
        predictability: 0.45,
        coping: 0.88,
        urgency: 0.55,
        self_agency: 0.75,
        interruption_pressure: 0.3,
      },
      affect: {
        valence: 0.55,
        arousal: 0.72,
        expression_gain: 0.7,
        attention: 0.85,
        certainty: 0.8,
        social_openness: 0.7,
        urgency: 0.55,
      },
      action_tendencies: {
        orient: 0.8,
        explore: 0.35,
        approach: 0.7,
        affiliate: 0.5,
        persist: 0.45,
        reject: 0.05,
        withdraw: 0.05,
        inhibit: 0.2,
        repair: 0.1,
        release: 0.35,
        assert_direction: 0.4,
      },
      cognition: { mode: "attending", load: 0.5, focus: 0.9 },
      social: {
        availability: 0.8,
        warmth: 0.65,
        playfulness: 0.45,
        guardedness: 0.1,
      },
      embodiment: "presence",
      visual_semantic: [
        "fast_aperture_change",
        "vertical_forward_lift",
        "internal_focus_spark",
        "brief_anticipation_recoil",
        "not_generic_celebration",
      ],
      historical_fixture_affinities: [
        "mischievous-spark",
        "mischievous-side",
        "mischievous-hold",
        "thinking-resolve",
        "recognition-spark",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "scale_durations",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s4",
        megabook_section: "§8 S4",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.52,
        vertical_bias: 0.68,
        asymmetry: 0.22,
        compression: 0.15,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.48,
        shell_contact: 0.38,
        lobe_definition: 0.72,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 1.06,
          overall_width: 0.97,
          crown_height: 0.16,
          ground_flattening: 0.0,
        },
        {
          binding_hints: {
            overall_height: 1.06,
            overall_width: 0.97,
            crown_height: 0.16,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 1.04, plane_recess: 0.25, legibility: 0.9 },
        { binding_hints: { face_scale: 1.04 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.72, spacing: 0.05, almond: 0.68 },
        { binding_hints: { eye_openness: 0.72, eye_spacing: 0.05 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.36, width: 1.06, corner_pull: 0.06 },
        {
          binding_hints: {
            mouth_openness: 0.36,
            mouth_width: 1.06,
            corner_pull_l: 0.06,
            corner_pull_r: 0.06,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: 0.1, aperture: 0.88, target_lock: 0.85 },
        { binding_hints: { gaze: 0.1 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.62, motion_coupling: 0.55, energy_coupling: 0.72 },
        { binding_hints: { relief_amplitude: 0.62 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.78, pulse: 0.55, lag: 0.22, focus: 0.92 },
        {
          binding_hints: {
            energy_level: 0.78,
            energy_pulse: 0.55,
            energy_lag: 0.22,
            internal_glow: 0.72,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.4, damping: 0.38, amount: 0.45 },
        { binding_hints: { skin_tension: 0.4 } },
      ),
      material: ct(
        "material",
        { roughness: 0.28, clearcoat: 0.55, pearl: 0.62 },
        {
          binding_hints: {
            roughness: 0.28,
            clearcoat: 0.55,
            pearl_intensity: 0.62,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.7,
          rim: 0.58,
          face_emissive: 0.55,
          absorption: 0.12,
        },
        {
          binding_hints: {
            key_intensity: 0.7,
            rim: 0.58,
            face_emissive: 0.55,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.02,
        y: 0.08,
        stability: 0.55,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.25, lag: 0.22, rebound: 0.55, settling: 0.25 },
        {
          binding_hints: {
            inertia: 0.25,
            secondary_lag: 0.22,
            rebound: 0.55,
            settling: 0.25,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.4, hold: 0.15, asymmetry: 0.15 },
        { policy: "spark_burst_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.32,
        frequency: 0.45,
        seed_weight: 0.55,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.42, hold_bias: 0.3 },
        { policy: "scale_durations" },
      ),
    }),
    binding_targets: {
      overall_height: 1.06,
      overall_width: 0.97,
      crown_height: 0.16,
      face_scale: 1.04,
      eye_openness: 0.72,
      eye_spacing: 0.05,
      mouth_openness: 0.36,
      mouth_width: 1.06,
      corner_pull_l: 0.06,
      corner_pull_r: 0.06,
      gaze: 0.1,
      relief_amplitude: 0.62,
      energy_level: 0.78,
      energy_pulse: 0.55,
      energy_lag: 0.22,
      internal_glow: 0.72,
      skin_tension: 0.4,
      roughness: 0.28,
      clearcoat: 0.55,
      pearl_intensity: 0.62,
      key_intensity: 0.7,
      rim: 0.58,
      face_emissive: 0.55,
      inertia: 0.25,
      secondary_lag: 0.22,
      rebound: 0.55,
      settling: 0.25,
    },
  },

  "comet-executing-drive": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "comet-executing-drive",
      title: "Comet / Executing Drive",
      seed: 1005,
      event: {
        description: "Action selected; execution underway.",
        stimulus_class: "execution",
      },
      appraisal: {
        novelty: 0.4,
        relevance: 0.92,
        congruence: 0.45,
        certainty: 0.88,
        predictability: 0.65,
        coping: 0.9,
        urgency: 0.72,
        self_agency: 0.92,
        interruption_pressure: 0.4,
      },
      affect: {
        valence: 0.25,
        arousal: 0.78,
        expression_gain: 0.62,
        attention: 0.88,
        certainty: 0.88,
        social_openness: 0.35,
        urgency: 0.72,
      },
      action_tendencies: {
        orient: 0.7,
        explore: 0.15,
        approach: 0.85,
        affiliate: 0.2,
        persist: 0.9,
        reject: 0.1,
        withdraw: 0.05,
        inhibit: 0.25,
        repair: 0.1,
        release: 0.15,
        assert_direction: 0.88,
      },
      cognition: { mode: "executing", load: 0.6, focus: 0.92 },
      social: {
        availability: 0.35,
        warmth: 0.3,
        playfulness: 0.15,
        guardedness: 0.2,
      },
      embodiment: "comet",
      visual_semantic: [
        "directed_mass",
        "forward_gaze",
        "controlled_energy_stream",
        "reduced_idle_randomness",
        "strong_velocity_continuity",
      ],
      historical_fixture_affinities: [
        "mischievous-spark",
        "thinking-resolve",
        "neutral-social",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "scale_durations",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s5",
        megabook_section: "§8 S5",
        notes: "Comet embodiment; no direct 1:1 historical fixture.",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.35,
        vertical_bias: 0.45,
        asymmetry: 0.35,
        compression: 0.42,
        directionality: 0.88,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.72,
        shell_contact: 0.28,
        lobe_definition: 0.45,
        stream_alignment: 0.85,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 0.92,
          overall_width: 1.12,
          crown_height: 0.06,
          ground_flattening: 0.0,
        },
        {
          binding_hints: {
            overall_height: 0.92,
            overall_width: 1.12,
            crown_height: 0.06,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 0.95, plane_recess: 0.4, legibility: 0.7 },
        { binding_hints: { face_scale: 0.95 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.6, spacing: 0.02, almond: 0.75 },
        { binding_hints: { eye_openness: 0.6, eye_spacing: 0.02 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.24, width: 0.94, corner_pull: 0.0 },
        {
          binding_hints: {
            mouth_openness: 0.24,
            mouth_width: 0.94,
            corner_pull_l: 0,
            corner_pull_r: 0,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: 0.35, aperture: 0.65, target_lock: 0.9 },
        { binding_hints: { gaze: 0.35 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.55, motion_coupling: 0.75, energy_coupling: 0.8 },
        { binding_hints: { relief_amplitude: 0.55 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.85, pulse: 0.62, lag: 0.15, focus: 0.88 },
        {
          binding_hints: {
            energy_level: 0.85,
            energy_pulse: 0.62,
            energy_lag: 0.15,
            internal_glow: 0.78,
            spectral_energy_envelope: 0.82,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.48, damping: 0.3, amount: 0.5 },
        { binding_hints: { skin_tension: 0.48 } },
      ),
      material: ct(
        "material",
        { roughness: 0.25, clearcoat: 0.6, pearl: 0.48 },
        {
          binding_hints: {
            roughness: 0.25,
            clearcoat: 0.6,
            pearl_intensity: 0.48,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.75,
          rim: 0.65,
          face_emissive: 0.42,
          absorption: 0.15,
        },
        {
          binding_hints: {
            key_intensity: 0.75,
            rim: 0.65,
            face_emissive: 0.42,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.22,
        y: -0.05,
        stability: 0.4,
        velocity_bias: 0.85,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.55, lag: 0.18, rebound: 0.4, settling: 0.15 },
        {
          binding_hints: {
            inertia: 0.55,
            secondary_lag: 0.18,
            rebound: 0.4,
            settling: 0.15,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.18, hold: 0.2, asymmetry: 0.04 },
        { policy: "execution_minimal_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.08,
        frequency: 0.35,
        seed_weight: 0.2,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.4, hold_bias: 0.25 },
        { policy: "scale_durations" },
      ),
    }),
    binding_targets: {
      overall_height: 0.92,
      overall_width: 1.12,
      crown_height: 0.06,
      face_scale: 0.95,
      eye_openness: 0.6,
      eye_spacing: 0.02,
      mouth_openness: 0.24,
      mouth_width: 0.94,
      corner_pull_l: 0,
      corner_pull_r: 0,
      gaze: 0.35,
      relief_amplitude: 0.55,
      energy_level: 0.85,
      energy_pulse: 0.62,
      energy_lag: 0.15,
      internal_glow: 0.78,
      spectral_energy_envelope: 0.82,
      skin_tension: 0.48,
      roughness: 0.25,
      clearcoat: 0.6,
      pearl_intensity: 0.48,
      key_intensity: 0.75,
      rim: 0.65,
      face_emissive: 0.42,
      inertia: 0.55,
      secondary_lag: 0.18,
      rebound: 0.4,
      settling: 0.15,
      center_of_mass_y: -0.05,
    },
  },

  "presence-blocked-strain": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "presence-blocked-strain",
      title: "Presence / Blocked Strain",
      seed: 1006,
      event: {
        description: "Obstacle prevents progress.",
        stimulus_class: "goal_obstruction",
      },
      appraisal: {
        novelty: 0.45,
        relevance: 0.9,
        congruence: -0.55,
        certainty: 0.35,
        predictability: 0.25,
        coping: 0.4,
        urgency: 0.7,
        self_agency: 0.45,
        interruption_pressure: 0.82,
      },
      affect: {
        valence: -0.4,
        arousal: 0.68,
        expression_gain: 0.55,
        attention: 0.65,
        certainty: 0.35,
        social_openness: 0.25,
        urgency: 0.7,
      },
      action_tendencies: {
        orient: 0.5,
        explore: 0.2,
        approach: 0.25,
        affiliate: 0.2,
        persist: 0.8,
        reject: 0.45,
        withdraw: 0.25,
        inhibit: 0.7,
        repair: 0.55,
        release: 0.1,
      },
      cognition: { mode: "blocked", load: 0.78, focus: 0.6 },
      social: {
        availability: 0.4,
        warmth: 0.25,
        playfulness: 0.05,
        guardedness: 0.55,
      },
      embodiment: "presence",
      visual_semantic: [
        "bound_motion",
        "compressed_upper_shell",
        "reduced_motion_freedom",
        "tighter_face_energy",
        "no_villain_scowl",
        "no_fear_caricature",
      ],
      historical_fixture_affinities: [
        "blocked-strain",
        "blocked-stall",
        "blocked-guard",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "scale_durations",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s6",
        megabook_section: "§8 S6",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.48,
        vertical_bias: 0.42,
        asymmetry: 0.08,
        compression: 0.62,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.78,
        shell_contact: 0.65,
        lobe_definition: 0.5,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 0.94,
          overall_width: 0.96,
          crown_height: 0.02,
          ground_flattening: 0.12,
        },
        {
          binding_hints: {
            overall_height: 0.94,
            overall_width: 0.96,
            crown_height: 0.02,
            ground_flattening: 0.12,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 0.96, plane_recess: 0.55, legibility: 0.72 },
        { binding_hints: { face_scale: 0.96 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.42, spacing: -0.1, almond: 0.6 },
        { binding_hints: { eye_openness: 0.42, eye_spacing: -0.1 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.18, width: 0.88, corner_pull: -0.12 },
        {
          binding_hints: {
            mouth_openness: 0.18,
            mouth_width: 0.88,
            corner_pull_l: -0.12,
            corner_pull_r: -0.12,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: 0.05, aperture: 0.38, target_lock: 0.55 },
        { binding_hints: { gaze: 0.05 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.35, motion_coupling: 0.25, energy_coupling: 0.3 },
        { binding_hints: { relief_amplitude: 0.35 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.38, pulse: 0.12, lag: 0.7, focus: 0.55 },
        {
          binding_hints: {
            energy_level: 0.38,
            energy_pulse: 0.12,
            energy_lag: 0.7,
            internal_glow: 0.32,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.72, damping: 0.35, amount: 0.55 },
        { binding_hints: { skin_tension: 0.72 } },
      ),
      material: ct(
        "material",
        { roughness: 0.48, clearcoat: 0.28, pearl: 0.42 },
        {
          binding_hints: {
            roughness: 0.48,
            clearcoat: 0.28,
            pearl_intensity: 0.42,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.45,
          rim: 0.3,
          face_emissive: 0.18,
          absorption: 0.4,
        },
        {
          binding_hints: {
            key_intensity: 0.45,
            rim: 0.3,
            face_emissive: 0.18,
            absorption: 0.4,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.0,
        y: -0.06,
        stability: 0.5,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.6, lag: 0.65, rebound: 0.12, settling: 0.25 },
        {
          binding_hints: {
            inertia: 0.6,
            secondary_lag: 0.65,
            rebound: 0.12,
            settling: 0.25,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.45, hold: 0.35, asymmetry: 0.1 },
        { policy: "strain_irregular_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.2,
        frequency: 0.4,
        seed_weight: 0.5,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.45, hold_bias: 0.6 },
        { policy: "scale_durations" },
      ),
    }),
    binding_targets: {
      overall_height: 0.94,
      overall_width: 0.96,
      crown_height: 0.02,
      ground_flattening: 0.12,
      face_scale: 0.96,
      eye_openness: 0.42,
      eye_spacing: -0.1,
      mouth_openness: 0.18,
      mouth_width: 0.88,
      corner_pull_l: -0.12,
      corner_pull_r: -0.12,
      gaze: 0.05,
      relief_amplitude: 0.35,
      energy_level: 0.38,
      energy_pulse: 0.12,
      energy_lag: 0.7,
      internal_glow: 0.32,
      skin_tension: 0.72,
      roughness: 0.48,
      clearcoat: 0.28,
      pearl_intensity: 0.42,
      key_intensity: 0.45,
      rim: 0.3,
      face_emissive: 0.18,
      absorption: 0.4,
      inertia: 0.6,
      secondary_lag: 0.65,
      rebound: 0.12,
      settling: 0.25,
    },
  },

  "presence-pleased-resolve": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "presence-pleased-resolve",
      title: "Presence / Pleased Resolve",
      seed: 1007,
      event: {
        description: "Work completes or obstruction resolves.",
        stimulus_class: "successful_resolution",
      },
      appraisal: {
        novelty: 0.3,
        relevance: 0.8,
        congruence: 0.75,
        certainty: 0.9,
        predictability: 0.7,
        coping: 0.92,
        urgency: 0.2,
        self_agency: 0.8,
        interruption_pressure: 0.12,
      },
      affect: {
        valence: 0.55,
        arousal: 0.38,
        expression_gain: 0.48,
        attention: 0.55,
        certainty: 0.9,
        social_openness: 0.7,
        urgency: 0.2,
      },
      action_tendencies: {
        orient: 0.45,
        explore: 0.25,
        approach: 0.3,
        affiliate: 0.7,
        persist: 0.35,
        reject: 0.05,
        withdraw: 0.1,
        inhibit: 0.15,
        repair: 0.15,
        release: 0.75,
      },
      cognition: { mode: "reviewing", load: 0.3, focus: 0.5 },
      social: {
        availability: 0.75,
        warmth: 0.72,
        playfulness: 0.35,
        guardedness: 0.1,
      },
      embodiment: "presence",
      visual_semantic: [
        "controlled_lift",
        "small_asymmetric_satisfaction",
        "energy_release_settle",
        "competence_completion",
        "not_broad_generic_smile",
      ],
      historical_fixture_affinities: [
        "pleased-soft",
        "pleased-glow",
        "pleased-bright",
        "recovering",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "scale_durations",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s7",
        megabook_section: "§8 S7",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.7,
        vertical_bias: 0.62,
        asymmetry: 0.24,
        compression: 0.08,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.22,
        shell_contact: 0.36,
        lobe_definition: 0.66,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 1.05,
          overall_width: 1.04,
          crown_height: 0.1,
          ground_flattening: 0.0,
        },
        {
          binding_hints: {
            overall_height: 1.05,
            overall_width: 1.04,
            crown_height: 0.1,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 1.04, plane_recess: 0.28, legibility: 0.9 },
        { binding_hints: { face_scale: 1.04 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.62, spacing: 0.04, almond: 0.78 },
        { binding_hints: { eye_openness: 0.62, eye_spacing: 0.04 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.42, width: 1.1, corner_pull: 0.1 },
        {
          binding_hints: {
            mouth_openness: 0.42,
            mouth_width: 1.1,
            corner_pull_l: 0.1,
            corner_pull_r: 0.1,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: 0.08, aperture: 0.68, target_lock: 0.48 },
        { binding_hints: { gaze: 0.08 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.54, motion_coupling: 0.44, energy_coupling: 0.52 },
        { binding_hints: { relief_amplitude: 0.54 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.68, pulse: 0.3, lag: 0.24, focus: 0.58 },
        {
          binding_hints: {
            energy_level: 0.68,
            energy_pulse: 0.3,
            energy_lag: 0.24,
            internal_glow: 0.62,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.28, damping: 0.6, amount: 0.34 },
        { binding_hints: { skin_tension: 0.28 } },
      ),
      material: ct(
        "material",
        { roughness: 0.26, clearcoat: 0.58, pearl: 0.66 },
        {
          binding_hints: {
            roughness: 0.26,
            clearcoat: 0.58,
            pearl_intensity: 0.66,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.7,
          rim: 0.56,
          face_emissive: 0.52,
          absorption: 0.12,
        },
        {
          binding_hints: {
            key_intensity: 0.7,
            rim: 0.56,
            face_emissive: 0.52,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.04,
        y: 0.06,
        stability: 0.78,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.26, lag: 0.28, rebound: 0.5, settling: 0.68 },
        {
          binding_hints: {
            inertia: 0.26,
            secondary_lag: 0.28,
            rebound: 0.5,
            settling: 0.68,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.3, hold: 0.22, asymmetry: 0.14 },
        { policy: "pleased_soft_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.22,
        frequency: 0.26,
        seed_weight: 0.42,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.48, hold_bias: 0.38 },
        { policy: "scale_durations" },
      ),
    }),
    binding_targets: {
      overall_height: 1.05,
      overall_width: 1.04,
      crown_height: 0.1,
      face_scale: 1.04,
      eye_openness: 0.62,
      eye_spacing: 0.04,
      mouth_openness: 0.42,
      mouth_width: 1.1,
      corner_pull_l: 0.1,
      corner_pull_r: 0.1,
      gaze: 0.08,
      relief_amplitude: 0.54,
      energy_level: 0.68,
      energy_pulse: 0.3,
      energy_lag: 0.24,
      internal_glow: 0.62,
      skin_tension: 0.28,
      roughness: 0.26,
      clearcoat: 0.58,
      pearl_intensity: 0.66,
      key_intensity: 0.7,
      rim: 0.56,
      face_emissive: 0.52,
      inertia: 0.26,
      secondary_lag: 0.28,
      rebound: 0.5,
      settling: 0.68,
    },
  },

  "dormant-orbit-maintain": {
    intent: {
      schema: "gasper.scenario.intent.v1",
      id: "dormant-orbit-maintain",
      title: "Dormant Orbit / Maintain",
      seed: 1008,
      event: {
        description: "No immediate task; low-energy self-maintenance.",
        stimulus_class: "dormancy",
      },
      appraisal: {
        novelty: 0.08,
        relevance: 0.15,
        congruence: 0.1,
        certainty: 0.75,
        predictability: 0.92,
        coping: 0.7,
        urgency: 0.05,
        self_agency: 0.35,
        interruption_pressure: 0.05,
      },
      affect: {
        valence: 0.02,
        arousal: 0.12,
        expression_gain: 0.15,
        attention: 0.18,
        certainty: 0.75,
        social_openness: 0.12,
        urgency: 0.05,
      },
      action_tendencies: {
        orient: 0.15,
        explore: 0.08,
        approach: 0.05,
        affiliate: 0.1,
        persist: 0.4,
        reject: 0.05,
        withdraw: 0.75,
        inhibit: 0.55,
        repair: 0.2,
        release: 0.3,
      },
      cognition: { mode: "dormant", load: 0.1, focus: 0.15 },
      social: {
        availability: 0.12,
        warmth: 0.2,
        playfulness: 0.05,
        guardedness: 0.35,
      },
      embodiment: "dormant-orbit",
      visual_semantic: [
        "stable_residual_gravity_well",
        "traveling_low_energy_spectral_motion",
        "disciplined_asymmetry",
        "face_reduction_compression_occlusion",
        "same_body_not_generic_ringed_sphere",
      ],
      historical_fixture_affinities: [
        "neutral-settled",
        "recovering",
        "dormant-orbit",
      ],
      identity: IDENTITY,
      reduced_motion_policy: "skip_secondary",
      validation_status: "provisional_authored",
      provenance: {
        source: "megabook_s8",
        megabook_section: "§8 S8",
        notes: "Embodiment shift; wake route returns to neutral settled.",
      },
    },
    channels: buildChannelTargets({
      contour_silhouette: ct("contour_silhouette", {
        mass_roundness: 0.78,
        vertical_bias: 0.4,
        asymmetry: 0.14,
        compression: 0.55,
        orbital_ring: 0.75,
      }),
      structural_lattice: ct("structural_lattice", {
        tension: 0.22,
        shell_contact: 0.2,
        lobe_definition: 0.28,
        orbital_definition: 0.8,
      }),
      macro_deformation: ct(
        "macro_deformation",
        {
          overall_height: 0.88,
          overall_width: 0.95,
          crown_height: 0.0,
          ground_flattening: 0.08,
        },
        {
          binding_hints: {
            overall_height: 0.88,
            overall_width: 0.95,
            crown_height: 0,
            ground_flattening: 0.08,
          },
        },
      ),
      face_plane: ct(
        "face_plane",
        { face_scale: 0.72, plane_recess: 0.75, legibility: 0.35 },
        { binding_hints: { face_scale: 0.72 } },
      ),
      eyes: ct(
        "eyes",
        { openness: 0.22, spacing: 0.0, almond: 0.5 },
        { binding_hints: { eye_openness: 0.22, eye_spacing: 0 } },
      ),
      mouth: ct(
        "mouth",
        { openness: 0.1, width: 0.9, corner_pull: 0.0 },
        {
          binding_hints: {
            mouth_openness: 0.1,
            mouth_width: 0.9,
            corner_pull_l: 0,
            corner_pull_r: 0,
          },
        },
      ),
      gaze_attention: ct(
        "gaze_attention",
        { gaze: 0.0, aperture: 0.15, target_lock: 0.05 },
        { binding_hints: { gaze: 0 } },
      ),
      adaptive_relief: ct(
        "adaptive_relief",
        { amplitude: 0.22, motion_coupling: 0.5, energy_coupling: 0.25 },
        { binding_hints: { relief_amplitude: 0.22 } },
      ),
      internal_energy: ct(
        "internal_energy",
        { level: 0.22, pulse: 0.08, lag: 0.75, focus: 0.2 },
        {
          binding_hints: {
            energy_level: 0.22,
            energy_pulse: 0.08,
            energy_lag: 0.75,
            internal_glow: 0.2,
            orbital_circulation: 0.55,
            spectral_energy_envelope: 0.35,
          },
        },
      ),
      skin_texture: ct(
        "skin_texture",
        { tension: 0.25, damping: 0.7, amount: 0.3 },
        { binding_hints: { skin_tension: 0.25 } },
      ),
      material: ct(
        "material",
        { roughness: 0.42, clearcoat: 0.35, pearl: 0.45 },
        {
          binding_hints: {
            roughness: 0.42,
            clearcoat: 0.35,
            pearl_intensity: 0.45,
          },
        },
      ),
      world_lighting_optics: ct(
        "world_lighting_optics",
        {
          key_intensity: 0.35,
          rim: 0.55,
          face_emissive: 0.08,
          absorption: 0.55,
        },
        {
          binding_hints: {
            key_intensity: 0.35,
            rim: 0.55,
            face_emissive: 0.08,
            absorption: 0.55,
          },
        },
      ),
      center_of_mass: ct("center_of_mass", {
        x: 0.0,
        y: -0.02,
        stability: 0.95,
        orbital_bias: 0.7,
      }),
      secondary_dynamics: ct(
        "secondary_dynamics",
        { inertia: 0.7, lag: 0.8, rebound: 0.08, settling: 0.75 },
        {
          binding_hints: {
            inertia: 0.7,
            secondary_lag: 0.8,
            rebound: 0.08,
            settling: 0.75,
          },
        },
      ),
      blink_scheduler_policy: ct(
        "blink_scheduler_policy",
        { rate: 0.05, hold: 0.7, asymmetry: 0.02 },
        { policy: "dormant_rare_blink_v1" },
      ),
      microvariation: ct("microvariation", {
        amplitude: 0.06,
        frequency: 0.12,
        seed_weight: 0.25,
      }),
      reduced_motion_behavior: ct(
        "reduced_motion_behavior",
        { scale: 0.25, hold_bias: 0.85 },
        { policy: "skip_secondary" },
      ),
    }),
    binding_targets: {
      overall_height: 0.88,
      overall_width: 0.95,
      crown_height: 0,
      ground_flattening: 0.08,
      face_scale: 0.72,
      eye_openness: 0.22,
      eye_spacing: 0,
      mouth_openness: 0.1,
      mouth_width: 0.9,
      corner_pull_l: 0,
      corner_pull_r: 0,
      gaze: 0,
      relief_amplitude: 0.22,
      energy_level: 0.22,
      energy_pulse: 0.08,
      energy_lag: 0.75,
      internal_glow: 0.2,
      orbital_circulation: 0.55,
      spectral_energy_envelope: 0.35,
      skin_tension: 0.25,
      roughness: 0.42,
      clearcoat: 0.35,
      pearl_intensity: 0.45,
      key_intensity: 0.35,
      rim: 0.55,
      face_emissive: 0.08,
      absorption: 0.55,
      inertia: 0.7,
      secondary_lag: 0.8,
      rebound: 0.08,
      settling: 0.75,
    },
  },
};

export function getEightStateDefinition(id: EightScenarioId): StateDef {
  return EIGHT_STATE_DEFINITIONS[id];
}

export function listEightScenarioIds(): EightScenarioId[] {
  return [...EIGHT_SCENARIO_IDS];
}

export function isEightScenarioId(id: string): id is EightScenarioId {
  return (EIGHT_SCENARIO_IDS as readonly string[]).includes(id);
}
