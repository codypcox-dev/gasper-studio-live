import { formCapabilityProfileSchema } from "../../../../shared/src/gasper-performance/reference/schemas.js";
import type {
  FormCapabilityProfile,
  PhysicalQuantity,
  PhysicalQuantityApplication,
  QuantityAuthority,
  SemanticControlCapability,
} from "../../../../shared/src/gasper-performance/reference/types.js";
import { GASPER_EMBODIMENT_PROFILES } from "../GasperRigDefinition.js";
import { GASPER_TOPOLOGY } from "../GasperTopologyLock.js";
import {
  GAIT_EXCHANGE_SWITCH_FRAC,
  GAIT_LAW,
  GAIT_LEG_UNITS,
  GAIT_STEP_HZ_MAX,
} from "../physics/GaitLaw.js";
import { PHI_LAW } from "../physics/PhiLaw.js";
import { WORLD_PHYSICS_CONSTANTS } from "../physics/WorldPhysics.js";
import { PHYSICS_CHANNEL_BOUNDS } from "../physics/PhysicsSilhouetteAuthority.js";
import { validatePrimitiveAgainstForm } from "./FormCapabilityProfile.js";

export { validatePrimitiveAgainstForm } from "./FormCapabilityProfile.js";

const SOURCE = Object.freeze({
  gait: "packages/desktop/src/gasper/physics/GaitLaw.ts",
  phi: "packages/desktop/src/gasper/physics/PhiLaw.ts",
  world: "packages/desktop/src/gasper/physics/WorldPhysics.ts",
  field: "packages/desktop/src/gasper/physics/PhysicsField.ts",
  rig: "packages/desktop/src/gasper/GasperRigDefinition.ts#wispwalker",
  topology: "packages/desktop/src/gasper/GasperTopologyLock.ts",
  tuning: "packages/gasper-studio/src/tuning/tuningRegistry.ts#TUNING_PARAMETER_SPECS",
  northstar: "docs/triforce/NORTHSTAR-SEMANTIC-PERFORMANCE.md#wispwalker-semantic-rig",
  silhouette: "packages/desktop/src/gasper/physics/PhysicsSilhouetteAuthority.ts",
});

const MAX_AREA_CONSERVING_VERTICAL_COMPRESSION =
  1 - 1 / (1 + PHYSICS_CHANNEL_BOUNDS.overall_width.max);

type QuantityMetadata = Readonly<{
  label: string;
  meaning: string;
  affectedObservables: readonly string[];
  application: PhysicalQuantityApplication;
  tunable: boolean;
}>;

const QUANTITY_METADATA: Readonly<Record<string, QuantityMetadata>> = Object.freeze({
  body_height_units: {
    label: "Body height",
    meaning: "Canonical Wispwalker height used to convert normalized motion into world-scale goals.",
    affectedObservables: ["travel distance", "gait stride", "silhouette scale"],
    application: "form_constant",
    tunable: false,
  },
  effective_leg_units: {
    label: "Effective support radius",
    meaning: "Inverted-pendulum support radius used by the grounded gait law.",
    affectedObservables: ["vault arc", "gait bob", "support sway"],
    application: "form_constant",
    tunable: false,
  },
  cadence_min_hz: {
    label: "Minimum cadence",
    meaning: "Slowest admitted Wispwalker support-exchange cadence.",
    affectedObservables: ["step timing", "support exchange", "rhythm"],
    application: "performance_bound",
    tunable: false,
  },
  cadence_max_hz: {
    label: "Maximum cadence",
    meaning: "Fastest cadence that preserves the minimum readable double-support window.",
    affectedObservables: ["step timing", "support exchange", "rhythm"],
    application: "safety_bound",
    tunable: false,
  },
  support_exchange_min_seconds: {
    label: "Minimum support exchange",
    meaning: "Shortest readable time allowed for weight to pass between structural roots.",
    affectedObservables: ["contact readability", "root handoff", "footwork continuity"],
    application: "safety_bound",
    tunable: false,
  },
  max_grounded_lean_degrees: {
    label: "Maximum grounded lean",
    meaning: "Largest form-safe body lean while the roots maintain grounded support.",
    affectedObservables: ["body tilt", "acceleration read", "balance"],
    application: "safety_bound",
    tunable: false,
  },
  gravity_units_per_s2: {
    label: "Gravity",
    meaning: "Environment-owned downward acceleration used by every body and gait calculation.",
    affectedObservables: ["traction", "flight arc", "settle", "comfortable cruise"],
    application: "environment_input",
    tunable: true,
  },
  restitution: {
    label: "Restitution",
    meaning: "Environment-owned retained velocity ratio across impacts.",
    affectedObservables: ["bounce height", "impact decay", "settle time"],
    application: "environment_input",
    tunable: true,
  },
  friction_mu: {
    label: "Surface friction",
    meaning: "Coulomb traction coefficient that bounds grounded acceleration and braking.",
    affectedObservables: ["acceleration", "braking distance", "turning", "arrival"],
    application: "environment_input",
    tunable: true,
  },
  speed_cap_units_per_s: {
    label: "World speed cap",
    meaning: "Hard environment safety ceiling for physical body speed.",
    affectedObservables: ["travel speed", "wind response", "world containment"],
    application: "safety_bound",
    tunable: false,
  },
  silhouette_scale_x: {
    label: "Silhouette width scale",
    meaning: "Pinned horizontal scale of the canonical Wispwalker form.",
    affectedObservables: ["silhouette width", "contact footprint"],
    application: "form_constant",
    tunable: false,
  },
  silhouette_scale_y: {
    label: "Silhouette height scale",
    meaning: "Pinned vertical scale of the canonical Wispwalker form.",
    affectedObservables: ["silhouette height", "body proportion"],
    application: "form_constant",
    tunable: false,
  },
  mass_kg: {
    label: "Body mass",
    meaning: "Absolute mass required before force-sensitive reference primitives may execute.",
    affectedObservables: ["impulse", "force", "momentum"],
    application: "calibration_gate",
    tunable: false,
  },
  inertia_kg_m2: {
    label: "Rotational inertia",
    meaning: "Absolute rotational inertia required before force-sensitive turns or launches may execute.",
    affectedObservables: ["angular acceleration", "pivot", "launch stability"],
    application: "calibration_gate",
    tunable: false,
  },
});

function metadataFor(id: string): QuantityMetadata {
  const metadata = QUANTITY_METADATA[id];
  if (!metadata) throw new Error(`missing Wispwalker physical quantity metadata: ${id}`);
  return metadata;
}

function resolvedQuantity(id: string, input: {
  value: number;
  unit: string;
  safeMin: number;
  safeMax: number;
  authority: QuantityAuthority;
  provenance: readonly string[];
}): PhysicalQuantity {
  return { ...metadataFor(id), status: "resolved", ...input };
}

function uncalibratedQuantity(
  id: string,
  unit: string,
  authority: QuantityAuthority,
  provenance: readonly string[],
): PhysicalQuantity {
  return { ...metadataFor(id), status: "requires_calibration", unit, authority, provenance };
}

function control(
  id: string,
  unit: string,
  safeMin: number,
  safeMax: number,
  authority: QuantityAuthority,
  ...provenance: string[]
): SemanticControlCapability {
  return { id, unit, safeMin, safeMax, authority, provenance };
}

const wispwalkerRig = GASPER_EMBODIMENT_PROFILES.wispwalker;
if (!wispwalkerRig || wispwalkerRig.frontAppendage !== "rooted-feet") {
  throw new Error("Wispwalker capability profile requires the canonical rooted-feet rig");
}

const profileInput = {
  schema: "gasper.form-capability.v1" as const,
  formId: "wispwalker",
  version: "1.1.0",
  locomotion: ["grounded", "slide", "hop"] as const,
  supports: [
    {
      id: "root_left",
      kind: "structural_root" as const,
      modes: ["plant", "load", "release", "slide", "pivot"] as const,
      maxLoadShare: 1,
      provenance: [SOURCE.rig, SOURCE.northstar],
    },
    {
      id: "root_right",
      kind: "structural_root" as const,
      modes: ["plant", "load", "release", "slide", "pivot"] as const,
      maxLoadShare: 1,
      provenance: [SOURCE.rig, SOURCE.northstar],
    },
  ],
  controls: [
    control("vertical_depth_gain", "ratio", 0.8, 1.1, "form", SOURCE.tuning),
    control(
      "vertical_compression",
      "body-height-ratio",
      0,
      MAX_AREA_CONSERVING_VERTICAL_COMPRESSION,
      "performance",
      SOURCE.silhouette,
      SOURCE.northstar,
    ),
    control("gait_bob_gain", "ratio", 0, 1.5, "performance", SOURCE.tuning, SOURCE.gait),
    control("contact_squash_gain", "ratio", 0, 1.5, "performance", SOURCE.tuning, SOURCE.gait),
    control("support_exchange_gain", "ratio", 0, 1.5, "performance", SOURCE.tuning, SOURCE.gait),
    control("footwork_primitive_gain", "ratio", 0, 1.5, "performance", SOURCE.tuning, SOURCE.gait),
    control("foot_root_gain", "ratio", 0.5, 2.5, "form", SOURCE.tuning, SOURCE.rig),
    control("walk_mass_shift_gain", "ratio", 0, 2, "form", SOURCE.tuning, SOURCE.rig),
    control("walk_accent_gain", "ratio", 0, 1, "performance", SOURCE.tuning),
    control("step_depth_units", "world_unit", 0, 10, "form", SOURCE.tuning),
    control("in_place_walk_period_seconds", "second", 0.5, 3, "performance", SOURCE.tuning),
    control("footwork_tempo", "ratio", 0.75, 1.25, "performance", SOURCE.tuning, SOURCE.gait),
    control("acting_gain", "ratio", 0.5, 1.5, "performance", SOURCE.tuning),
    control("contour_viscosity_tau", "second", 0.02, 1, "form", SOURCE.tuning),
  ],
  physics: {
    body_height_units: resolvedQuantity("body_height_units", {
      value: GAIT_LAW.bodyHeightUnits,
      unit: "world_unit",
      safeMin: GAIT_LAW.bodyHeightUnits,
      safeMax: GAIT_LAW.bodyHeightUnits,
      authority: "form",
      provenance: [SOURCE.gait],
    }),
    effective_leg_units: resolvedQuantity("effective_leg_units", {
      value: GAIT_LEG_UNITS,
      unit: "world_unit",
      safeMin: GAIT_LEG_UNITS,
      safeMax: GAIT_LEG_UNITS,
      authority: "form",
      provenance: [SOURCE.gait],
    }),
    cadence_min_hz: resolvedQuantity("cadence_min_hz", {
      value: GAIT_LAW.stepHzFloor,
      unit: "hertz",
      safeMin: GAIT_LAW.stepHzFloor,
      safeMax: GAIT_STEP_HZ_MAX,
      authority: "form",
      provenance: [SOURCE.gait],
    }),
    cadence_max_hz: resolvedQuantity("cadence_max_hz", {
      value: GAIT_STEP_HZ_MAX,
      unit: "hertz",
      safeMin: GAIT_LAW.stepHzFloor,
      safeMax: GAIT_STEP_HZ_MAX,
      authority: "form",
      provenance: [SOURCE.gait],
    }),
    support_exchange_min_seconds: resolvedQuantity("support_exchange_min_seconds", {
      value: GAIT_LAW.exchangeCriticalDurationSec,
      unit: "second",
      safeMin: GAIT_LAW.exchangeCriticalDurationSec,
      safeMax: GAIT_EXCHANGE_SWITCH_FRAC / GAIT_LAW.stepHzFloor,
      authority: "form",
      provenance: [SOURCE.gait],
    }),
    max_grounded_lean_degrees: resolvedQuantity("max_grounded_lean_degrees", {
      value: GAIT_LAW.maxGroundedLeanDeg,
      unit: "degree",
      safeMin: 0,
      safeMax: GAIT_LAW.maxGroundedLeanDeg,
      authority: "form",
      provenance: [SOURCE.gait],
    }),
    gravity_units_per_s2: resolvedQuantity("gravity_units_per_s2", {
      value: WORLD_PHYSICS_CONSTANTS.gravity,
      unit: "world_unit_per_second_squared",
      safeMin: WORLD_PHYSICS_CONSTANTS.gravity * WORLD_PHYSICS_CONSTANTS.gravityScaleMin,
      safeMax: WORLD_PHYSICS_CONSTANTS.gravity * WORLD_PHYSICS_CONSTANTS.gravityScaleMax,
      authority: "environment",
      provenance: [SOURCE.world, SOURCE.field],
    }),
    restitution: resolvedQuantity("restitution", {
      value: PHI_LAW.restitution,
      unit: "ratio",
      safeMin: WORLD_PHYSICS_CONSTANTS.restitutionMin,
      safeMax: WORLD_PHYSICS_CONSTANTS.restitutionMax,
      authority: "environment",
      provenance: [SOURCE.phi, SOURCE.field, SOURCE.world],
    }),
    friction_mu: resolvedQuantity("friction_mu", {
      value: PHI_LAW.frictionMu,
      unit: "coefficient",
      safeMin: 0,
      safeMax: 2,
      authority: "environment",
      provenance: [SOURCE.phi, SOURCE.field, `${SOURCE.world}#clampWorldPhysicsParams`],
    }),
    speed_cap_units_per_s: resolvedQuantity("speed_cap_units_per_s", {
      value: WORLD_PHYSICS_CONSTANTS.maxSpeed,
      unit: "world_unit_per_second",
      safeMin: WORLD_PHYSICS_CONSTANTS.maxSpeed,
      safeMax: WORLD_PHYSICS_CONSTANTS.maxSpeed,
      authority: "environment",
      provenance: [SOURCE.world, SOURCE.field],
    }),
    silhouette_scale_x: resolvedQuantity("silhouette_scale_x", {
      value: wispwalkerRig.sx,
      unit: "ratio",
      safeMin: wispwalkerRig.sx,
      safeMax: wispwalkerRig.sx,
      authority: "form",
      provenance: [SOURCE.rig],
    }),
    silhouette_scale_y: resolvedQuantity("silhouette_scale_y", {
      value: wispwalkerRig.sy,
      unit: "ratio",
      safeMin: wispwalkerRig.sy,
      safeMax: wispwalkerRig.sy,
      authority: "form",
      provenance: [SOURCE.rig],
    }),
    mass_kg: uncalibratedQuantity(
      "mass_kg",
      "kilogram",
      "form",
      [SOURCE.northstar, "calibration:pending"],
    ),
    inertia_kg_m2: uncalibratedQuantity("inertia_kg_m2", "kilogram_meter_squared", "form", [
      SOURCE.northstar,
      "calibration:pending",
    ]),
  },
  primitives: [
    "plant",
    "release",
    "slide",
    "pivot",
    "support_exchange",
    "travel",
    "hold",
    "compress",
    "launch",
    "recoil",
    "follow_through",
    "settle",
    "orient",
  ] as const,
  forbiddenAnatomy: [
    "arm",
    "elbow",
    "hand",
    "hip",
    "knee",
    "ankle",
    "heel",
    "toe",
    "shoulder",
  ],
  topologyRef: `${SOURCE.topology}#${GASPER_TOPOLOGY.contourSamples}/${GASPER_TOPOLOGY.structuralNodes}/${GASPER_TOPOLOGY.structuralTriangles}`,
};

export const WISPWALKER_CAPABILITY_PROFILE = Object.freeze(
  formCapabilityProfileSchema.parse(profileInput),
) as FormCapabilityProfile;

export function getFormCapabilityProfile(formId: string): FormCapabilityProfile {
  if (formId !== "wispwalker") {
    throw new Error(`no form capability profile registered for ${formId}`);
  }
  return WISPWALKER_CAPABILITY_PROFILE;
}

// Keep this import live: it makes the profile's gate part of this public seam
// without adding a second wrapper or executor.
void validatePrimitiveAgainstForm;
