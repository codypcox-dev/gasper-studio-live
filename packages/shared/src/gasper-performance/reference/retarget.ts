import { z } from "zod";

import { hashJsonArtifact, sha256OfCanonical } from "../hashing.js";
import { hashMotionScore, parseMotionScore } from "./motionScore.js";
import { physicsIntentPlanSchema } from "./schemas.js";
import type {
  EvidenceRef,
  FormCapabilityProfile,
  MotionPrimitiveId,
  MotionScore,
  MotionScoreBeat,
  PhysicsGoal,
  PhysicsIntentBeat,
  PhysicsIntentPlan,
} from "./types.js";

export type EnvironmentPhysicsProfile = Readonly<{
  schema: "gasper.environment-physics.v1";
  id: string;
  version: string;
  gravityUnitsPerS2: number;
  frictionMu: number;
  restitution: number;
  bounds: Readonly<{
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  }>;
  provenance: readonly string[];
}>;

export type RetargetDisposition = Readonly<{
  beatId: string;
  primitive: MotionPrimitiveId;
  disposition: "exact" | "stylized";
}>;

export type RetargetRefusal = Readonly<{
  beatId: string;
  primitive: MotionPrimitiveId;
  code:
    | "UNSUPPORTED_PRIMITIVE"
    | "SUPPORT_COUNT_MISMATCH"
    | "SUPPORT_ID_UNMAPPED"
    | "CALIBRATION_REQUIRED";
  message: string;
  missingCalibration?: readonly string[];
}>;

export type RetargetResult =
  | Readonly<{
      ok: true;
      plan: PhysicsIntentPlan;
      dispositions: readonly RetargetDisposition[];
    }>
  | Readonly<{
      ok: false;
      refusals: readonly RetargetRefusal[];
    }>;

const environmentSchema = z
  .object({
    schema: z.literal("gasper.environment-physics.v1"),
    id: z.string().trim().min(1),
    version: z.string().trim().min(1),
    gravityUnitsPerS2: z.number().finite().positive(),
    frictionMu: z.number().finite().min(0).max(2),
    restitution: z.number().finite().min(0).max(1),
    bounds: z
      .object({
        xMin: z.number().finite(),
        xMax: z.number().finite(),
        yMin: z.number().finite(),
        yMax: z.number().finite(),
        zMin: z.number().finite(),
        zMax: z.number().finite(),
      })
      .strict(),
    provenance: z.array(z.string().trim().min(1)).min(1),
  })
  .strict()
  .superRefine((environment, ctx) => {
    for (const [minimum, maximum, axis] of [
      [environment.bounds.xMin, environment.bounds.xMax, "x"],
      [environment.bounds.yMin, environment.bounds.yMax, "y"],
      [environment.bounds.zMin, environment.bounds.zMax, "z"],
    ] as const) {
      if (maximum <= minimum) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bounds"],
          message: `${axis} maximum must exceed minimum`,
        });
      }
    }
  });

const REQUIRED_SUPPORTS: Readonly<Partial<Record<MotionPrimitiveId, number>>> = Object.freeze({
  plant: 1,
  release: 1,
  slide: 1,
  pivot: 1,
  support_exchange: 2,
  launch: 2,
});

const REQUIRED_CALIBRATION: Readonly<Partial<Record<MotionPrimitiveId, readonly string[]>>> =
  Object.freeze({
    launch: Object.freeze(["mass_kg", "inertia_kg_m2"]),
  });

const STYLIZED_PRIMITIVES = new Set<MotionPrimitiveId>(["travel"]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function resolvedQuantityValue(
  form: FormCapabilityProfile,
  id: string,
  fallback: number,
): number {
  const quantity = form.physics[id];
  return quantity?.status === "resolved" && typeof quantity.value === "number"
    ? quantity.value
    : fallback;
}

function controlById(form: FormCapabilityProfile, id: string) {
  return form.controls.find((control) => control.id === id);
}

function sourceSupportIndex(id: string): number | null {
  if (id === "source_left") return 0;
  if (id === "source_right") return 1;
  return null;
}

function goal(
  id: string,
  target: number,
  unit: string,
  safeMin: number,
  safeMax: number,
  authority: PhysicsGoal["authority"],
  evidence: readonly EvidenceRef[],
): PhysicsGoal {
  return { id, target, unit, safeMin, safeMax, authority, evidence };
}

function refusalForBeat(
  beat: MotionScoreBeat,
  form: FormCapabilityProfile,
): RetargetRefusal | null {
  if (!form.primitives.includes(beat.primitive)) {
    return {
      beatId: beat.id,
      primitive: beat.primitive,
      code: "UNSUPPORTED_PRIMITIVE",
      message: `${form.formId} does not declare ${beat.primitive}`,
    };
  }
  const required = REQUIRED_SUPPORTS[beat.primitive];
  if (
    required !== undefined &&
    (beat.contact.requiredSupports.length !== required || required > form.supports.length)
  ) {
    return {
      beatId: beat.id,
      primitive: beat.primitive,
      code: "SUPPORT_COUNT_MISMATCH",
      message: `${beat.primitive} requires ${required} support(s); source declares ${beat.contact.requiredSupports.length} and ${form.formId} exposes ${form.supports.length}`,
    };
  }
  const unmappedSupport = [...beat.contact.requiredSupports, ...beat.contact.order]
    .find((support) => sourceSupportIndex(support) === null);
  if (unmappedSupport) {
    return {
      beatId: beat.id,
      primitive: beat.primitive,
      code: "SUPPORT_ID_UNMAPPED",
      message: `source support ${unmappedSupport} has no accepted form mapping`,
    };
  }
  const missingCalibration = (REQUIRED_CALIBRATION[beat.primitive] ?? []).filter(
    (quantity) => form.physics[quantity]?.status !== "resolved",
  );
  if (missingCalibration.length > 0) {
    return {
      beatId: beat.id,
      primitive: beat.primitive,
      code: "CALIBRATION_REQUIRED",
      message: `${beat.primitive} requires calibrated ${missingCalibration.join(", ")}`,
      missingCalibration,
    };
  }
  return null;
}

function compileBeat(beat: MotionScoreBeat, form: FormCapabilityProfile): PhysicsIntentBeat {
  const evidence = beat.evidence;
  const requiredSupports = REQUIRED_SUPPORTS[beat.primitive] ?? 0;
  const supportGoals: PhysicsGoal[] = requiredSupports > 0
    ? [
        goal(
          "support_count",
          requiredSupports,
          "count",
          0,
          form.supports.length,
          "form",
          evidence,
        ),
        goal(
          "support_load_readability",
          beat.motionQuality.weight,
          "ratio",
          0,
          1,
          "performance",
          evidence,
        ),
      ]
    : [];
  if (beat.contact.order.length > 0) {
    const initialSupportIndex = sourceSupportIndex(beat.contact.order[0]!);
    const terminalSupportIndex = sourceSupportIndex(beat.contact.order.at(-1)!);
    if (initialSupportIndex !== null && terminalSupportIndex !== null) {
      supportGoals.push(
        goal(
          "initial_support_index",
          initialSupportIndex,
          "support-index",
          0,
          Math.max(0, form.supports.length - 1),
          "form",
          evidence,
        ),
        goal(
          "terminal_support_index",
          terminalSupportIndex,
          "support-index",
          0,
          Math.max(0, form.supports.length - 1),
          "form",
          evidence,
        ),
      );
    }
  }
  const bodyGoals: PhysicsGoal[] = [
    goal("motion_energy", beat.motionQuality.energy, "ratio", 0, 1, "performance", evidence),
    goal("motion_weight", beat.motionQuality.weight, "ratio", 0, 1, "performance", evidence),
  ];
  if (beat.primitive === "travel") {
    bodyGoals.push(
      goal(
        "normalized_travel_speed",
        beat.motionQuality.energy,
        "ratio",
        0,
        1,
        "performance",
        evidence,
      ),
    );
  }
  if (beat.travel.direction !== "unknown") {
    bodyGoals.push(
      goal(
        "normalized_travel_x",
        clamp(beat.travel.normalizedDisplacement.x, -2, 2),
        "body-length",
        -2,
        2,
        "performance",
        evidence,
      ),
      goal(
        "normalized_travel_y",
        clamp(beat.travel.normalizedDisplacement.y, -2, 2),
        "body-length",
        -2,
        2,
        "performance",
        evidence,
      ),
    );
  }
  const startFacing = beat.travel.facing.startDegrees;
  const endFacing = beat.travel.facing.endDegrees;
  if (startFacing !== null && endFacing !== null) {
    bodyGoals.push(
      goal(
        "facing_delta",
        Math.max(-180, Math.min(180, endFacing - startFacing)),
        "degrees",
        -180,
        180,
        "performance",
        evidence,
      ),
    );
  }
  if (beat.rhythm.cadenceHz !== null) {
    const cadenceMin = resolvedQuantityValue(form, "cadence_min_hz", 0.1);
    const cadenceMax = resolvedQuantityValue(form, "cadence_max_hz", 10);
    bodyGoals.push(
      goal(
        "cadence",
        clamp(beat.rhythm.cadenceHz, cadenceMin, cadenceMax),
        "hertz",
        cadenceMin,
        cadenceMax,
        "performance",
        evidence,
      ),
    );
  }
  const verticalControl = controlById(form, "vertical_compression");
  const verticalPath = beat.travel.rootPath;
  if (
    verticalControl &&
    verticalPath.some((point) => Math.abs(point.y) > 1e-6)
  ) {
    const measuredTarget = beat.primitive === "compress"
      ? Math.max(0, ...verticalPath.map((point) => point.y))
      : verticalPath.at(-1)!.y;
    bodyGoals.push(
      goal(
        "normalized_vertical_compression",
        clamp(measuredTarget, verticalControl.safeMin, verticalControl.safeMax),
        verticalControl.unit,
        verticalControl.safeMin,
        verticalControl.safeMax,
        verticalControl.authority,
        beat.evidence,
      ),
    );
  }
  const expressiveGoals: PhysicsGoal[] = [
    goal("flow", beat.motionQuality.flow, "ratio", 0, 1, "performance", evidence),
    goal("directness", beat.motionQuality.directness, "ratio", 0, 1, "performance", evidence),
  ];
  for (const [id, target] of [
    ["restraint", beat.motionQuality.restraint],
    ["playfulness", beat.motionQuality.playfulness],
    ["urgency", beat.motionQuality.urgency],
  ] as const) {
    if (target !== null) expressiveGoals.push(goal(id, target, "ratio", 0, 1, "performance", evidence));
  }
  return {
    id: beat.id,
    t0Ms: beat.t0Ms,
    t1Ms: beat.t1Ms,
    primitive: beat.primitive,
    supportGoals,
    bodyGoals,
    expressiveGoals,
    constraints: [
      "physics-authority",
      "environment-bounds",
      "organism-clock",
      "topology-lock",
      "reduced-motion-collapse",
      "no-direct-transform",
    ],
    sourceEvidence: evidence,
  };
}

/** Compile a validated score into form-safe goals or refuse the entire plan. */
export function retargetMotionScore(
  scoreInput: MotionScore | unknown,
  form: FormCapabilityProfile,
  environmentInput: EnvironmentPhysicsProfile | unknown,
  seed: number,
): RetargetResult {
  const score = parseMotionScore(scoreInput);
  const environment = environmentSchema.parse(environmentInput) as EnvironmentPhysicsProfile;
  if (!Number.isSafeInteger(seed)) throw new Error("retarget seed must be a safe integer");

  const refusals = score.beats
    .map((beat) => refusalForBeat(beat, form))
    .filter((entry): entry is RetargetRefusal => entry !== null);
  if (refusals.length > 0) return { ok: false, refusals };

  const plan = physicsIntentPlanSchema.parse({
    schema: "gasper.physics-intent-plan.v1",
    id: `physics-${score.id}-${seed}`,
    sourceMotionScoreHash: hashMotionScore(score),
    formProfileHash: hashJsonArtifact(form),
    environmentProfileHash: hashJsonArtifact(environment),
    seed,
    durationMs: score.durationMs,
    beats: score.beats.map((beat) => compileBeat(beat, form)),
    compiler: {
      id: "gasper-form-retargeter",
      version: score.beats.some((beat) =>
        beat.travel.rootPath.some((point) => Math.abs(point.y) > 1e-6),
      ) ? "1.1.0" : "1.0.0",
    },
  }) as PhysicsIntentPlan;

  return {
    ok: true,
    plan,
    dispositions: score.beats.map((beat) => ({
      beatId: beat.id,
      primitive: beat.primitive,
      disposition:
        STYLIZED_PRIMITIVES.has(beat.primitive) ||
        Math.abs(beat.travel.normalizedDisplacement.x) > 2 ||
        Math.abs(beat.travel.normalizedDisplacement.y) > 2 ||
        (beat.rhythm.cadenceHz !== null &&
          (beat.rhythm.cadenceHz < resolvedQuantityValue(form, "cadence_min_hz", 0.1) ||
            beat.rhythm.cadenceHz > resolvedQuantityValue(form, "cadence_max_hz", 10)))
          ? "stylized" as const
          : "exact" as const,
    })),
  };
}

export function parsePhysicsIntentPlan(input: unknown): PhysicsIntentPlan {
  return physicsIntentPlanSchema.parse(input) as PhysicsIntentPlan;
}

export function hashPhysicsIntentPlan(input: PhysicsIntentPlan | unknown): string {
  return `sha256:${sha256OfCanonical(parsePhysicsIntentPlan(input))}`;
}
