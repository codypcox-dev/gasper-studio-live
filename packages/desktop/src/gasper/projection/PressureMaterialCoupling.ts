/**
 * GASPER-VEC-401 — production-owned pressure → material causality.
 *
 * This packet is pure and renderer-agnostic. It translates canonical field
 * scalars into a bounded signed pressure, shell response, and material-space
 * coupling. Frame time affects phase only; it is deliberately excluded from
 * the causal identity hash.
 */

export type PressureMaterialInput = {
  readonly revision?: number;
  readonly energy: Readonly<Record<string, number>>;
  readonly dynamics: Readonly<Record<string, number>>;
  readonly relief: Readonly<Record<string, number>>;
  readonly material: Readonly<Record<string, number>>;
  readonly time?: number;
  readonly delta?: number;
  readonly frame?: Readonly<{ time: number; delta: number }>;
};

export type PressureMaterialResponse = {
  readonly pressure: number;
  readonly shellCompliance: number;
  readonly reliefGain: number;
  readonly materialCoupling: number;
  readonly phase: number;
  readonly hash: string;
  readonly sourceHash: string;
  readonly revision: number;
};

export type MaterialResponseTarget = Readonly<Record<string, number>>;

export type AppliedPressureMaterialResponse = MaterialResponseTarget &
  Pick<PressureMaterialResponse, "pressure" | "reliefGain" | "materialCoupling">;

const TAU = Math.PI * 2;
const IDENTITY_KEYS = [
  "energy_level",
  "energy_target",
  "energy_pulse",
  "energy_lag",
  "energy_occlusion",
  "internal_glow",
  "motion",
  "coupling",
  "inertia",
  "rebound",
  "relief_amplitude",
  "relief",
  "texture_scale",
  "key_intensity",
  "key_direction",
  "rim",
  "pearl",
  "absorption",
  "clearcoat",
  "texture",
  "normal_strength",
  "curvature_response",
] as const;

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function channel(domain: Readonly<Record<string, number>>, key: string): number {
  return finite(domain[key]);
}

function safeRevision(value: unknown): number {
  if (typeof value !== "number") return 0;
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function wrapPhase(value: number): number {
  return ((value % TAU) + TAU) % TAU;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function identity(input: PressureMaterialInput, revision: number): string {
  const domains = [input.energy, input.dynamics, input.relief, input.material];
  const values = IDENTITY_KEYS.map((key) => {
    const domain = domains.find((candidate) => Object.prototype.hasOwnProperty.call(candidate, key));
    return Number(finite(domain?.[key]).toFixed(6));
  });
  return fnv1a(JSON.stringify({ revision, values }));
}

/** Evaluate the bounded pressure → shell relief → material coupling chain. */
export function evaluatePressureMaterialCoupling(
  input: PressureMaterialInput,
): PressureMaterialResponse {
  const revision = safeRevision(input.revision ?? 0);
  const energy = input.energy;
  const dynamics = input.dynamics;
  const relief = input.relief;
  const material = input.material;
  const energyDrive =
    channel(energy, "energy_level") * 0.72 +
    channel(energy, "energy_pulse") * 0.34 +
    channel(energy, "internal_glow") * 0.2;
  const dynamicsDrive =
    channel(dynamics, "motion") * 0.2 +
    channel(dynamics, "coupling") * 0.42 +
    channel(dynamics, "rebound") * 0.12 -
    channel(dynamics, "inertia") * 0.16;
  const directionalBias = channel(material, "key_direction") * 0.12;
  const pressure = clamp(Math.tanh((energyDrive + dynamicsDrive + directionalBias - 0.58) * 2.4), -1, 1);
  const shellCompliance = clamp(
    0.18 +
      channel(relief, "relief_amplitude") * 0.34 +
      channel(relief, "relief") * 0.28 +
      channel(relief, "texture_scale") * 0.12 +
      channel(dynamics, "coupling") * 0.08,
    0,
    1,
  );
  const delta = clamp(finite(input.delta ?? input.frame?.delta), 0, 0.25);
  const relaxation = 1 - Math.exp(-delta * (4 + Math.abs(pressure) * 8));
  const energyLevel = clamp(channel(energy, "energy_level"), 0, 1);
  const reliefGain = clamp(
    (Math.abs(pressure) * shellCompliance + energyLevel * 0.16) * (0.45 + relaxation * 0.55),
    0,
    1,
  );
  const materialBase =
    channel(material, "key_intensity") * 0.32 +
    channel(material, "rim") * 0.12 +
    channel(material, "normal_strength") * 0.16 +
    channel(material, "curvature_response") * 0.14 +
    channel(material, "texture") * 0.08;
  const materialCoupling = clamp(
    (Math.abs(pressure) * 0.46 + energyLevel * 0.24 + materialBase * 0.18) *
      (0.45 + relaxation * 0.55),
    0,
    1,
  );
  const phase = wrapPhase(
    finite(input.time ?? input.frame?.time) * (0.7 + Math.abs(pressure) * 0.55) + pressure * 0.4,
  );

  return Object.freeze({
    pressure,
    shellCompliance,
    reliefGain,
    materialCoupling,
    phase,
    hash: identity(input, revision),
    sourceHash: identity(input, revision),
    revision,
  });
}

/** Apply coupling to material-space values without taking ownership of rendering. */
export function applyPressureMaterialResponse(
  target: MaterialResponseTarget,
  response: PressureMaterialResponse,
): AppliedPressureMaterialResponse {
  return Object.freeze({
    ...target,
    intensity: response.materialCoupling,
    transport: response.reliefGain,
    pressure: response.pressure,
    reliefGain: response.reliefGain,
    materialCoupling: response.materialCoupling,
  });
}
