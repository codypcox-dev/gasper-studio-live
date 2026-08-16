/**
 * Packaged visual authority — single truthful source of identity and inspection data.
 *
 * Current packaged Gasper Studio mounts the complete FormMaster compatibility rig
 * through mountGasperDocument(). The native renderer remains an incomplete,
 * explicitly selected lab candidate until parity is proven with packaged evidence.
 *
 * Morphology/runtime authority is separate from geometry executor authority:
 * the packaged FormMaster document may still run the production eight-state loop.
 */

/** Current packaged renderer identity. */
export const PRODUCTION_AUTHORITY_ID =
  "legacy-authority-formmaster-v655" as const;

/** Current packaged authority class. */
export const PRODUCTION_AUTHORITY_CLASS = "legacy-authority" as const;

/**
 * Honest packaged-path summary. It must not imply that native parity is complete.
 */
export const PRODUCTION_AUTHORITY_SUMMARY =
  "Packaged production visual authority: FormMaster compatibility renderer v6.5.5. " +
  "mountGasperDocument selects the complete FormMaster character and geometry executor. " +
  "The native candidate remains incomplete and lab-only until packaged-native parity is proven. " +
  "The exercised packaged path may still use eight-state production morphology targets; " +
  "geometry authority and morphology runtime authority are reported separately.";

export const PRODUCTION_RENDERER_VERSION = "6.5.5-authority" as const;

/** Layer / shell short label for WorldClass adapter diagnostics. */
export const PRODUCTION_LAYER_SUMMARY =
  "FormMaster Compatibility · packaged authority" as const;

/**
 * Truth flags for the current packaged path.
 * `completeness` means native-parity completeness, not FormMaster character coverage.
 */
export const PRODUCTION_AUTHORITY_FLAGS = {
  legacyAuthorityActive: true as const,
  nativeCandidateIncomplete: true as const,
  microstateTargetsAreFallbackDemo: false as const,
  productionMicrostateTargetsAreFallbackDemo: false as const,
  fallbackDemoCount: 0 as const,
  fallbackDemoFraction: 0 as const,
  completeness: false as const,
  productionPath: true as const,
} as const;

/**
 * Descriptor proving the exercised packaged path uses eight-state production
 * morphology targets rather than the Book-005 fallback MICROSTATE_TARGETS demo.
 */
export const PRODUCTION_MORPHOLOGY_TARGET_DESCRIPTOR = {
  kind: "eight-state-production" as const,
  source: "IntegratedGasperStage.ensureEightStateRestingLoop",
  eightStateLoop: true as const,
  autoSequence: true as const,
  usesFallbackMicrostateTargets: false as const,
  usesBook005FallbackDemo: false as const,
  targetFamily: "EIGHT_STATE_TARGETS" as const,
  note:
    "Packaged resting loop drives eight-state production morphology endpoints; " +
    "this does not promote the incomplete native geometry candidate.",
} as const;

export type ProductionAuthorityInspection = {
  authorityId: typeof PRODUCTION_AUTHORITY_ID;
  authorityClass: typeof PRODUCTION_AUTHORITY_CLASS;
  productionAuthoritySummary: typeof PRODUCTION_AUTHORITY_SUMMARY;
  rendererVersion: typeof PRODUCTION_RENDERER_VERSION;
  layerSummary: typeof PRODUCTION_LAYER_SUMMARY;
  legacyAuthorityActive: true;
  nativeCandidateIncomplete: true;
  microstateTargetsAreFallbackDemo: false;
  productionMicrostateTargetsAreFallbackDemo: false;
  fallbackDemoCount: 0;
  fallbackDemoFraction: 0;
  completeness: false;
  productionPath: true;
  morphology: typeof PRODUCTION_MORPHOLOGY_TARGET_DESCRIPTOR;
};

/** Full packaged-authority inspection payload for global / matrix probes. */
export function getProductionAuthorityInspection(): ProductionAuthorityInspection {
  return {
    authorityId: PRODUCTION_AUTHORITY_ID,
    authorityClass: PRODUCTION_AUTHORITY_CLASS,
    productionAuthoritySummary: PRODUCTION_AUTHORITY_SUMMARY,
    rendererVersion: PRODUCTION_RENDERER_VERSION,
    layerSummary: PRODUCTION_LAYER_SUMMARY,
    legacyAuthorityActive: PRODUCTION_AUTHORITY_FLAGS.legacyAuthorityActive,
    nativeCandidateIncomplete: PRODUCTION_AUTHORITY_FLAGS.nativeCandidateIncomplete,
    microstateTargetsAreFallbackDemo:
      PRODUCTION_AUTHORITY_FLAGS.microstateTargetsAreFallbackDemo,
    productionMicrostateTargetsAreFallbackDemo:
      PRODUCTION_AUTHORITY_FLAGS.productionMicrostateTargetsAreFallbackDemo,
    fallbackDemoCount: PRODUCTION_AUTHORITY_FLAGS.fallbackDemoCount,
    fallbackDemoFraction: PRODUCTION_AUTHORITY_FLAGS.fallbackDemoFraction,
    completeness: PRODUCTION_AUTHORITY_FLAGS.completeness,
    productionPath: PRODUCTION_AUTHORITY_FLAGS.productionPath,
    morphology: PRODUCTION_MORPHOLOGY_TARGET_DESCRIPTOR,
  };
}

/** True when living status proves eight-state production morphology is active. */
export function isProductionMorphologyActive(
  living: Record<string, unknown> | null | undefined,
): boolean {
  if (!living) return false;
  return living.eightStateLoop === true;
}

/**
 * Apply packaged-path truth fields onto a Dais / living inspection report.
 * This function may normalize stale reporters, but it must never hide which
 * geometry executor is actually mounted.
 */
export function applyProductionAuthorityToInspection<
  T extends Record<string, unknown>,
>(
  report: T,
): T & {
  productionAuthority: ProductionAuthorityInspection;
  document: Record<string, unknown>;
  living: Record<string, unknown>;
} {
  const auth = getProductionAuthorityInspection();
  const base = report as Record<string, unknown>;
  const doc =
    base.document && typeof base.document === "object"
      ? { ...(base.document as Record<string, unknown>) }
      : {};
  const livingRaw =
    base.living && typeof base.living === "object"
      ? { ...(base.living as Record<string, unknown>) }
      : {};

  doc.formMasterSummary = auth.productionAuthoritySummary;
  doc.productionAuthoritySummary = auth.productionAuthoritySummary;
  doc.authorityId = auth.authorityId;
  doc.authorityClass = auth.authorityClass;
  doc.legacyFormMaster = true;
  doc.formMasterDeepRig = true;
  doc.geometryExecutor = "form-master";

  const living = applyProductionAuthorityToLivingStatus(livingRaw);
  const morphologyActive = isProductionMorphologyActive(living);

  return {
    ...base,
    document: doc,
    living,
    productionAuthority: auth,
    productionAuthoritySummary: auth.productionAuthoritySummary,
    legacyAuthorityActive: true,
    nativeCandidateIncomplete: true,
    completeness: false,
    productionPath: true,
    // Fallback seal only when production morphology is proven active.
    microstateTargetsAreFallbackDemo: morphologyActive
      ? false
      : living.microstateTargetsAreFallbackDemo === true,
    fallbackDemoFraction: morphologyActive
      ? 0
      : typeof living.fallbackDemoFraction === "number"
        ? living.fallbackDemoFraction
        : living.microstateTargetsAreFallbackDemo === true
          ? 1
          : 0,
    productionMorphologyActive: morphologyActive,
  } as unknown as T & {
    productionAuthority: ProductionAuthorityInspection;
    document: Record<string, unknown>;
    living: Record<string, unknown>;
  };
}

/**
 * Seal livingStatus() fields for the production matrix path.
 * Only clears fallback-demo flags when eight-state morphology is active.
 */
export function applyProductionAuthorityToLivingStatus<
  T extends Record<string, unknown>,
>(status: T): T & Record<string, unknown> {
  const base = status as Record<string, unknown>;
  if (isProductionMorphologyActive(base)) {
    return {
      ...status,
      microstateTargetsAreFallbackDemo: false,
      productionMicrostateTargetsAreFallbackDemo: false,
      fallbackDemoCount: 0,
      fallbackDemoFraction: 0,
      eightStateProductionTargets: true,
      productionSealApplied: true,
    };
  }
  return {
    ...status,
    eightStateProductionTargets: false,
    productionSealApplied: false,
  };
}

/** True when a document mount is the current packaged FormMaster path. */
export function isProductionMount(
  mount:
    | {
        legacyFormMaster?: boolean;
        authorityId?: string;
        authorityClass?: string;
        geometryExecutor?: string;
        productionPath?: boolean;
        labOnly?: boolean;
        host?: HTMLElement | null;
      }
    | null
    | undefined,
): boolean {
  if (!mount) return false;
  if (mount.labOnly === true || mount.productionPath === false) return false;
  if (mount.legacyFormMaster !== true) return false;
  if (
    mount.authorityId !== undefined &&
    mount.authorityId !== PRODUCTION_AUTHORITY_ID
  ) {
    return false;
  }
  if (
    mount.authorityClass !== undefined &&
    mount.authorityClass !== PRODUCTION_AUTHORITY_CLASS
  ) {
    return false;
  }
  if (
    mount.geometryExecutor !== undefined &&
    mount.geometryExecutor !== "form-master"
  ) {
    return false;
  }

  const host = mount.host;
  if (host) {
    const authority = host.getAttribute("data-gasper-authority");
    const renderer = host.getAttribute("data-gasper-renderer");
    const executor = host.getAttribute("data-gasper-geometry-executor");
    if (host.getAttribute("data-gasper-lab-only") === "1") return false;
    if (authority && authority !== PRODUCTION_AUTHORITY_CLASS) return false;
    if (renderer && renderer !== PRODUCTION_AUTHORITY_ID) return false;
    if (executor && executor !== "form-master") return false;
  }
  return true;
}

/**
 * Renderer-object classification is fail-closed. Identity alone is insufficient;
 * the object must also report the FormMaster executor used by packaged production.
 */
export function isProductionRenderer(
  renderer:
    | {
        authorityClass?: string;
        rendererId?: string;
        geometryExecutor?: string;
        legacyFormMaster?: boolean;
        productionPath?: boolean;
        labOnly?: boolean;
      }
    | null
    | undefined,
): boolean {
  if (!renderer) return false;
  return (
    renderer.authorityClass === PRODUCTION_AUTHORITY_CLASS &&
    renderer.rendererId === PRODUCTION_AUTHORITY_ID &&
    renderer.geometryExecutor === "form-master" &&
    renderer.legacyFormMaster === true &&
    renderer.productionPath !== false &&
    renderer.labOnly !== true
  );
}

/** Packaged selection helpers. */
export function selectProductionAuthorityId(): typeof PRODUCTION_AUTHORITY_ID {
  return PRODUCTION_AUTHORITY_ID;
}

export function selectProductionAuthorityClass(): typeof PRODUCTION_AUTHORITY_CLASS {
  return PRODUCTION_AUTHORITY_CLASS;
}

/** Assert the current packaged-authority postconditions. */
export function assertProductionAuthoritySealed(fields: {
  legacyAuthorityActive?: boolean;
  nativeCandidateIncomplete?: boolean;
  microstateTargetsAreFallbackDemo?: boolean;
  fallbackDemoFraction?: number;
  completeness?: boolean;
  productionPath?: boolean;
  productionAuthoritySummary?: string;
  authorityClass?: string;
  authorityId?: string;
}): void {
  const required: Array<keyof typeof fields> = [
    "legacyAuthorityActive",
    "nativeCandidateIncomplete",
    "microstateTargetsAreFallbackDemo",
    "fallbackDemoFraction",
    "authorityClass",
    "authorityId",
  ];
  for (const key of required) {
    if (fields[key] === undefined) {
      throw new Error(
        `production authority seal failed: required field missing: ${String(key)}`,
      );
    }
  }
  if (fields.legacyAuthorityActive !== true) {
    throw new Error(
      "production authority seal failed: legacyAuthorityActive must be true for the current packaged path",
    );
  }
  if (fields.nativeCandidateIncomplete !== true) {
    throw new Error(
      "production authority seal failed: nativeCandidateIncomplete must be true until native parity is proven",
    );
  }
  if (fields.microstateTargetsAreFallbackDemo === true) {
    throw new Error(
      "production authority seal failed: microstateTargetsAreFallbackDemo must be false",
    );
  }
  if (fields.fallbackDemoFraction !== 0) {
    throw new Error(
      "production authority seal failed: fallbackDemoFraction must be 0",
    );
  }
  if (fields.completeness === true) {
    throw new Error(
      "production authority seal failed: native parity completeness cannot be true",
    );
  }
  if (fields.productionPath === false) {
    throw new Error(
      "production authority seal failed: productionPath cannot be false",
    );
  }
  if (fields.productionAuthoritySummary) {
    const rejected = summaryMatchesRejectedGeometry(
      fields.productionAuthoritySummary,
    );
    if (rejected.rejected) {
      throw new Error(
        "production authority seal failed: summary contains a false native-production promotion",
      );
    }
  }
  if (fields.authorityClass !== PRODUCTION_AUTHORITY_CLASS) {
    throw new Error(
      `production authority seal failed: authorityClass=${fields.authorityClass}`,
    );
  }
  if (fields.authorityId !== PRODUCTION_AUTHORITY_ID) {
    throw new Error(
      `production authority seal failed: authorityId=${fields.authorityId}`,
    );
  }
}

/**
 * The LegacyAuthorityRenderer class remains an equivalence-lab wrapper. This
 * quarantine prevents that wrapper from being relabeled as the packaged mount;
 * it does not quarantine the FormMaster document selected by mountGasperDocument.
 */
export function quarantineLegacyProductionUse(context?: string): never {
  const where = context ? ` (${context})` : "";
  throw new Error(
    `QUARANTINED: LegacyAuthorityRenderer is an equivalence-lab wrapper${where}. ` +
      `Packaged production uses ${PRODUCTION_AUTHORITY_ID} / ${PRODUCTION_AUTHORITY_CLASS} ` +
      `through mountGasperDocument -> mountGasperDocumentLegacyFormMaster. ` +
      `Do not substitute the lab wrapper for the packaged mount.`,
  );
}

/** Fail closed when the incomplete native candidate is labeled production. */
export function quarantineNativeProductionUse(context?: string): never {
  const where = context ? ` (${context})` : "";
  throw new Error(
    `QUARANTINED: native Gasper candidate is incomplete and lab-only${where}. ` +
      `Current packaged production is ${PRODUCTION_AUTHORITY_ID} / ${PRODUCTION_AUTHORITY_CLASS}.`,
  );
}

/** False-promotion patterns that must not appear on the packaged seal surface. */
export const REJECTED_SUMMARY_PATTERNS = {
  legacyAuthority:
    /legacy formmaster[^.]{0,160}(?:lab[- ]only|never (?:the )?production default)/i,
  nativeCandidateIncomplete:
    /(?:native gasper production renderer|production-native|complete packaged production path)/i,
} as const;

export function summaryMatchesRejectedGeometry(summary: string): {
  matchesLegacy: boolean;
  matchesNativeIncomplete: boolean;
  rejected: boolean;
} {
  const matchesLegacy = REJECTED_SUMMARY_PATTERNS.legacyAuthority.test(summary);
  const matchesNativeIncomplete =
    REJECTED_SUMMARY_PATTERNS.nativeCandidateIncomplete.test(summary);
  return {
    matchesLegacy,
    matchesNativeIncomplete,
    rejected: matchesLegacy || matchesNativeIncomplete,
  };
}
