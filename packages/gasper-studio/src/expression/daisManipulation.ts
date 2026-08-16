/**
 * Production Dais manipulation helpers — apply expression grammar to live rig.
 * Document session first, then rig (never rig-only document silence).
 *
 * Legacy Authority path: FormMaster fixture owns face geometry; multi-domain
 * additive life is filtered (no mass/host scale, no raw face unit dump).
 * Living loop is stopped so expression hold is authoritative until resumed.
 */

import {
  getExpressionStudioSession,
  projectExpression,
  type ExpressionSessionSnapshot,
} from "../../../desktop/src/gasper/expression";
import {
  buildLegacySafePose,
  buildNativePose,
  isLegacyAuthorityDais,
  toFormMasterFixtureId,
  toKernelFixtureId,
} from "../../../desktop/src/gasper/expression/formMasterBridge";
import {
  applyBoundedDeformation,
  morphologyDomainCoverage,
} from "../../../desktop/src/gasper/morphology";
import {
  getAnimationCommandSession,
} from "../../../desktop/src/gasper/GasperAnimationCommands";
import type { GasperRigController } from "../../../desktop/src/gasper/GasperRigController";

export type DaisHandle = GasperRigController & {
  stopLiving?: () => void;
};

type LegacyMountProbe = {
  mount?: { legacyFormMaster?: boolean } | null;
};

export function getLiveDais(): DaisHandle | null {
  return (
    (globalThis as unknown as { __GASPER_DAIS__?: DaisHandle }).__GASPER_DAIS__ ??
    null
  );
}

export type ApplyExpressionResult = {
  ok: boolean;
  fixtureId?: string;
  formMasterFixtureId?: string;
  channelCount?: number;
  domains?: string[];
  error?: string;
  snapshot?: ExpressionSessionSnapshot;
  /** Honest side-effect report (reviewer reliability contract). */
  documentExpressionWritten: boolean;
  documentBindingsWritten: number;
  daisPresent: boolean;
  livingStopped: boolean;
  fixtureApplied: boolean;
  poseApplied: boolean;
  legacyAuthority: boolean;
};

function emptyFlags(
  partial: Partial<ApplyExpressionResult> & { ok: boolean },
): ApplyExpressionResult {
  return {
    documentExpressionWritten: false,
    documentBindingsWritten: 0,
    daisPresent: false,
    livingStopped: false,
    fixtureApplied: false,
    poseApplied: false,
    legacyAuthority: false,
    ...partial,
  };
}

/**
 * Apply an expression anchor through grammar → bounded deformation → session + dais.
 */
export function applyExpressionToDais(
  fixtureId: string,
  options?: {
    expressionGain?: number;
    embodiment?: string;
    dais?: DaisHandle | null;
    /** When true (default), stop living loop so expression hold is authoritative. */
    holdAgainstLiving?: boolean;
  },
): ApplyExpressionResult {
  const session = getExpressionStudioSession();
  if (typeof options?.expressionGain === "number") {
    session.setExpressionGain(options.expressionGain);
  }
  if (options?.embodiment) {
    session.setEmbodiment(options.embodiment);
  }

  const kernelId = toKernelFixtureId(fixtureId);
  const projected = session.setExpression(kernelId);
  if (!projected.ok || !projected.state) {
    return emptyFlags({
      ok: false,
      error: projected.error ?? "project failed",
    });
  }

  const deformed = applyBoundedDeformation(projected.state.channels, {
    strictCompleteness: true,
  });
  if (!deformed.ok) {
    return emptyFlags({
      ok: false,
      error: deformed.error ?? "bounded deformation rejected",
      fixtureId: projected.state.fixtureId,
    });
  }

  const formMasterId = toFormMasterFixtureId(projected.state.fixtureId);
  const anim = getAnimationCommandSession();
  let documentExpressionWritten = false;
  let documentBindingsWritten = 0;

  // Document identity: prefer FormMaster-compatible id for pack interop,
  // kernel id retained on ExpressionStudioSession.
  try {
    anim.setExpressionSync(formMasterId);
    documentExpressionWritten = true;
  } catch {
    try {
      anim.setExpressionSync(projected.state.fixtureId);
      documentExpressionWritten = true;
    } catch {
      /* catalog may not list all fixtures yet */
    }
  }
  if (options?.embodiment) {
    try {
      anim.setEmbodimentSync(options.embodiment);
    } catch {
      /* */
    }
  }

  for (const [k, v] of Object.entries(deformed.channels)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    try {
      anim.setBaseBindingSync(k, v);
      documentBindingsWritten += 1;
    } catch {
      /* optional */
    }
  }

  const dais = options?.dais !== undefined ? options.dais : getLiveDais();
  const daisPresent = !!dais;
  const legacyAuthority = isLegacyAuthorityDais(
    dais as unknown as LegacyMountProbe | null,
  );
  let livingStopped = false;
  let fixtureApplied = false;
  let poseApplied = false;

  if (dais) {
    const hold = options?.holdAgainstLiving !== false;
    if (hold && typeof dais.stopLiving === "function") {
      try {
        dais.stopLiving();
        livingStopped = true;
      } catch {
        /* */
      }
    }

    try {
      if (options?.embodiment) dais.setEmbodiment(options.embodiment);
    } catch {
      /* */
    }

    // Face authority: FormMaster fixture (or native affinity) — never dump
    // domain-scale mouth/eye absolute units as FormMaster face geometry.
    try {
      dais.setExpression(formMasterId);
      fixtureApplied = true;
    } catch {
      try {
        dais.setExpression(projected.state.fixtureId);
        fixtureApplied = true;
      } catch {
        /* */
      }
    }

    const pose = legacyAuthority
      ? buildLegacySafePose(deformed.channels, { includeCornerPull: true })
      : buildNativePose(deformed.channels);

    if (Object.keys(pose).length > 0 && typeof dais.applyExternalPose === "function") {
      try {
        dais.applyExternalPose(pose);
        poseApplied = true;
      } catch {
        /* */
      }
    }

    try {
      dais.syncEditorProjectionFromAnimationSession?.();
    } catch {
      /* */
    }
  }

  (globalThis as unknown as { __GASPER_EXPRESSION_SESSION__?: unknown }).__GASPER_EXPRESSION_SESSION__ =
    session;

  const coverage = morphologyDomainCoverage(deformed.channels);

  // ok requires projection+deformation; side-effects are reported honestly.
  const ok =
    documentExpressionWritten ||
    fixtureApplied ||
    poseApplied ||
    documentBindingsWritten > 0;

  return {
    ok,
    fixtureId: projected.state.fixtureId,
    formMasterFixtureId: formMasterId,
    channelCount: Object.keys(deformed.channels).length,
    domains: coverage.domains,
    snapshot: session.getSnapshot(),
    documentExpressionWritten,
    documentBindingsWritten,
    daisPresent,
    livingStopped,
    fixtureApplied,
    poseApplied,
    legacyAuthority,
    error: ok
      ? undefined
      : "projection ok but no document/dais side-effect succeeded",
  };
}

export function resetDaisExpression(dais?: DaisHandle | null): ApplyExpressionResult {
  const session = getExpressionStudioSession();
  session.reset();
  const handle = dais !== undefined ? dais : getLiveDais();
  // D-0083: release user-owned rail bindings so the living loop owns them again.
  handle?.clearUserOwnedBindings?.();
  return applyExpressionToDais("neutral-settled", {
    expressionGain: 0.4,
    embodiment: "presence",
    dais: handle,
  });
}

export function inspectDaisExpression(dais?: DaisHandle | null): {
  expression: ReturnType<ReturnType<typeof getExpressionStudioSession>["inspect"]>;
  dais: {
    embodiment: string | null;
    expression: string | null;
    living: unknown;
    liveSample: Record<string, number> | null;
    legacyAuthority: boolean;
  } | null;
  projected: ReturnType<typeof projectExpression>;
  formMasterFixtureId: string | null;
} {
  const session = getExpressionStudioSession();
  const snap = session.getSnapshot();
  const handle = dais !== undefined ? dais : getLiveDais();
  const projected = projectExpression({
    fixtureId: snap.fixtureId,
    embodiment: snap.embodiment,
    expressionGain: snap.expressionGain,
  });
  let daisInfo: {
    embodiment: string | null;
    expression: string | null;
    living: unknown;
    liveSample: Record<string, number> | null;
    legacyAuthority: boolean;
  } | null = null;
  if (handle) {
    const sel = handle.selection?.getState?.();
    const live =
      typeof handle.readLive === "function" ? handle.readLive() : null;
    daisInfo = {
      embodiment: sel?.embodiment ?? null,
      expression: sel?.expression ?? null,
      living: typeof handle.livingStatus === "function" ? handle.livingStatus() : null,
      liveSample: live,
      legacyAuthority: isLegacyAuthorityDais(
        handle as unknown as LegacyMountProbe | null,
      ),
    };
  }
  return {
    expression: session.inspect(),
    dais: daisInfo,
    projected,
    formMasterFixtureId: toFormMasterFixtureId(snap.fixtureId),
  };
}

export function setLiveExpressionGain(
  gain: number,
  embodiment?: string,
): ApplyExpressionResult {
  const session = getExpressionStudioSession();
  const snap = session.getSnapshot();
  return applyExpressionToDais(snap.fixtureId, {
    expressionGain: gain,
    embodiment: embodiment ?? snap.embodiment,
    // Gain is a live parameter tweak, not an expression hold — the living loop
    // must keep running so the view doesn't freeze when the slider is touched.
    holdAgainstLiving: false,
  });
}

export function listStudioExpressionIds(): string[] {
  return getExpressionStudioSession().listFixtures();
}
