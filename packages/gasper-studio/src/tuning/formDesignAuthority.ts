/**
 * Form-design keys that belong to FormMaster's live coefficient authority.
 * These are not compositor bindings: sending them through the generic pose
 * path silently drops them before the production renderer can consume them.
 */
const LIVE_FORM_COEFFICIENTS: Record<string, string> = {
  foot_amp: "footAmp",
  walk_amp: "walkAmp",
  walk_accent: "walkAccent",
  walk_period: "walkPeriod",
  step_depth: "stepDepth",
};

export type LiveFormCoefficientSurface = {
  setLiveFormCoeff?: (key: string, value: number) => void;
};

export function liveFormCoefficientFor(parameterId: string): string | null {
  return LIVE_FORM_COEFFICIENTS[parameterId] ?? null;
}

export function applyLiveFormDesignParameter(
  parameterId: string,
  value: number,
  surface: LiveFormCoefficientSurface,
): boolean {
  const key = liveFormCoefficientFor(parameterId);
  if (!key || typeof surface.setLiveFormCoeff !== "function") return false;
  surface.setLiveFormCoeff(key, value);
  return true;
}
