/**
 * Resolve the embodiment the eye is actually seeing.
 *
 * Tuning Lab / inspect_tuning used to report the document default (`presence`)
 * while FormMaster was already painting Wispwalker. The rendered profile is
 * the identity of record when the walker is on stage.
 */
export function resolveRenderedEmbodiment(input: {
  renderedProfile?: string | null;
  authoredMainForm?: string | null;
  documentEmbodiment?: string | null;
  telemetryEmbodiment?: string | null;
}): string | null {
  const candidates = [
    input.renderedProfile,
    input.authoredMainForm,
    input.documentEmbodiment,
    input.telemetryEmbodiment,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function readLiveRenderedProfile(
  formMaster: { getSnapshot?: () => { profile?: string | null } | null } | null | undefined,
): string | null {
  const profile = formMaster?.getSnapshot?.()?.profile;
  return typeof profile === "string" && profile.trim() ? profile.trim() : null;
}
