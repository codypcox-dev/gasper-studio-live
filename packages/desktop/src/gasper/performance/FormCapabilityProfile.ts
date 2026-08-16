import type {
  FormCapabilityProfile,
  MotionPrimitiveId,
} from "../../../../shared/src/gasper-performance/reference/types.js";

export type { FormCapabilityProfile };

export type FormPrimitiveRequest = Readonly<{
  /** Open string at this trust boundary: model output is untrusted input. */
  id: string;
  supportCount?: number;
}>;

export type PrimitiveValidationResult =
  | Readonly<{ ok: true; primitive: MotionPrimitiveId }>
  | Readonly<{
      ok: false;
      code:
        | "UNSUPPORTED_ANATOMY"
        | "UNSUPPORTED_PRIMITIVE"
        | "SUPPORT_COUNT_MISMATCH"
        | "CALIBRATION_REQUIRED";
      message: string;
      missingCalibration?: readonly string[];
    }>;

const REQUIRED_SUPPORTS: Readonly<Record<string, number>> = Object.freeze({
  plant: 1,
  release: 1,
  slide: 1,
  pivot: 1,
  support_exchange: 2,
  launch: 2,
});

const REQUIRED_CALIBRATION: Readonly<Record<string, readonly string[]>> = Object.freeze({
  launch: Object.freeze(["mass_kg", "inertia_kg_m2"]),
});

function anatomyToken(id: string, profile: FormCapabilityProfile): string | null {
  const tokens = id.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return profile.forbiddenAnatomy.find((forbidden) => tokens.includes(forbidden)) ?? null;
}

/**
 * Fail-closed form gate for inferred motion primitives.
 *
 * This function validates capability only. It cannot move Gasper and exposes
 * no renderer, controller, or transform handle.
 */
export function validatePrimitiveAgainstForm(
  request: FormPrimitiveRequest,
  profile: FormCapabilityProfile,
): PrimitiveValidationResult {
  const forbidden = anatomyToken(request.id, profile);
  if (forbidden) {
    return {
      ok: false,
      code: "UNSUPPORTED_ANATOMY",
      message: `${profile.formId} has no ${forbidden} anatomy; retarget the mechanic to form-native controls`,
    };
  }

  if (!profile.primitives.includes(request.id as MotionPrimitiveId)) {
    return {
      ok: false,
      code: "UNSUPPORTED_PRIMITIVE",
      message: `${request.id} is not declared by ${profile.formId} capability profile ${profile.version}`,
    };
  }

  if (request.supportCount !== undefined) {
    const required = REQUIRED_SUPPORTS[request.id];
    const impossible =
      !Number.isInteger(request.supportCount) ||
      request.supportCount < 0 ||
      request.supportCount > profile.supports.length ||
      (required !== undefined && request.supportCount !== required);
    if (impossible) {
      return {
        ok: false,
        code: "SUPPORT_COUNT_MISMATCH",
        message: `${request.id} requested ${request.supportCount} supports; ${profile.formId} exposes ${profile.supports.length}`,
      };
    }
  }

  const missingCalibration = (REQUIRED_CALIBRATION[request.id] ?? []).filter(
    (quantity) => profile.physics[quantity]?.status !== "resolved",
  );
  if (missingCalibration.length > 0) {
    return {
      ok: false,
      code: "CALIBRATION_REQUIRED",
      message: `${request.id} requires calibrated physical quantities: ${missingCalibration.join(", ")}`,
      missingCalibration,
    };
  }

  return { ok: true, primitive: request.id as MotionPrimitiveId };
}
