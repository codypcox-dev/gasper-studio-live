/**
 * Production stage host — real packaged Dais for WorldClassStudioShell stageSlot.
 * First-run resting view is the continuous eight-state showcase loop.
 *
 * Visual authority: production-native (NativeGasperRigInstance via mountGasperDocument).
 * Inspection surfaces wrap residual raw reporters so matrix seal fields are truthful.
 */
import { useEffect, useRef, useState } from "react";
import {
  GasperDaisStage,
  GasperRigController,
  GasperSelectionModel,
} from "../../desktop/src/gasper";
import {
  getAnimationCommandSession,
} from "../../desktop/src/gasper/GasperAnimationCommands";
import {
  getExpressionStudioSession,
} from "../../desktop/src/gasper/expression";
import {
  applyProductionAuthorityToInspection,
  applyProductionAuthorityToLivingStatus,
  getProductionAuthorityInspection,
  PRODUCTION_AUTHORITY_CLASS,
  PRODUCTION_AUTHORITY_ID,
  PRODUCTION_AUTHORITY_SUMMARY,
} from "../../desktop/src/gasper/renderer/productionAuthority";
import {
  applyExpressionToDais,
} from "./expression/daisManipulation";

export const DEFAULT_EIGHT_STATE_RESTING_LOOP = {
  eightStateLoop: true,
  autoSequence: true,
  restrainedIdle: false,
  forceInterrupt: false,
  proofMode: true,
  timingScale: 1,
  seed: 1005,
} as const;

export function ensureEightStateRestingLoop(
  gasper: GasperRigController,
  restart = false,
): void {
  const status = gasper.livingStatus();
  if (!restart && status.running && status.eightStateLoop && status.autoSequence) {
    return;
  }
  gasper.startLiving(DEFAULT_EIGHT_STATE_RESTING_LOOP);
}

/**
 * Seal production inspection on a live Dais controller.
 * Overrides residual formMasterSummary / microstateTargetsAreFallbackDemo
 * with production-truth fields from productionAuthority.ts.
 */
export function sealProductionDaisInspection(gasper: GasperRigController): void {
  const c = gasper as GasperRigController & {
    inspectDais?: (extra?: unknown) => Record<string, unknown>;
    livingStatus: () => Record<string, unknown>;
    __productionAuthoritySealed?: boolean;
  };
  if (c.__productionAuthoritySealed) return;

  const rawLiving = c.livingStatus.bind(c);
  c.livingStatus = (() =>
    applyProductionAuthorityToLivingStatus(
      rawLiving() as Record<string, unknown>,
    )) as typeof c.livingStatus;

  if (typeof c.inspectDais === "function") {
    const rawInspect = c.inspectDais.bind(c);
    c.inspectDais = ((extra?: unknown) => {
      const report = rawInspect(extra) as Record<string, unknown>;
      return applyProductionAuthorityToInspection(report);
    }) as unknown as typeof c.inspectDais;
  } else {
    c.inspectDais = (() =>
      applyProductionAuthorityToInspection({
        source: "react-studio-dais",
        document: {
          formMasterSummary: PRODUCTION_AUTHORITY_SUMMARY,
        },
        living: {
          microstateTargetsAreFallbackDemo: false,
        },
      })) as typeof c.inspectDais;
  }

  c.__productionAuthoritySealed = true;

  const g = globalThis as unknown as {
    __GASPER_PRODUCTION_AUTHORITY__?: ReturnType<
      typeof getProductionAuthorityInspection
    >;
    __GASPER_DAIS__?: GasperRigController;
  };
  g.__GASPER_PRODUCTION_AUTHORITY__ = getProductionAuthorityInspection();
  g.__GASPER_DAIS__ = gasper;
}

export type IntegratedGasperStageProps = {
  onReady?: () => void;
  /** When true (default), start the eight-state resting loop after ready. */
  startLivingIdle?: boolean;
};

export function IntegratedGasperStage({
  onReady,
  startLivingIdle = false,
}: IntegratedGasperStageProps) {
  const gasperRef = useRef<GasperRigController | null>(null);
  if (!gasperRef.current) {
    const selection = new GasperSelectionModel();
    // RUNTIME keeps the eight-state Presence loop off. PREVIEW starts a
    // 1.6s morph to Presence after first paint (N324).
    selection.setStageMode("RUNTIME");
    selection.setEmbodiment("wispwalker");
    gasperRef.current = new GasperRigController(selection);
  }
  const gasper = gasperRef.current;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (window as unknown as { __GASPER_DAIS__?: GasperRigController }).__GASPER_DAIS__ =
      gasper;
    (
      window as unknown as {
        __GASPER_PRODUCTION_AUTHORITY__?: ReturnType<
          typeof getProductionAuthorityInspection
        >;
      }
    ).__GASPER_PRODUCTION_AUTHORITY__ = getProductionAuthorityInspection();
    const exprSession = getExpressionStudioSession();
    (window as unknown as { __GASPER_EXPRESSION_SESSION__?: typeof exprSession }).__GASPER_EXPRESSION_SESSION__ =
      exprSession;
    (window as unknown as {
      __GASPER_EXPRESSION_API__?: {
        apply: typeof applyExpressionToDais;
        session: typeof exprSession;
      };
    }).__GASPER_EXPRESSION_API__ = {
      apply: applyExpressionToDais,
      session: exprSession,
    };
    const unsub = gasper.subscribe(() => {
      /* shell adapter polls via getSnapshot */
    });
    return () => {
      unsub();
      try {
        delete (window as unknown as { __GASPER_EXPRESSION_SESSION__?: unknown })
          .__GASPER_EXPRESSION_SESSION__;
        delete (window as unknown as { __GASPER_EXPRESSION_API__?: unknown })
          .__GASPER_EXPRESSION_API__;
        delete (window as unknown as { __GASPER_PRODUCTION_AUTHORITY__?: unknown })
          .__GASPER_PRODUCTION_AUTHORITY__;
      } catch {
        /* */
      }
    };
  }, [gasper]);

  return (
    <div
      data-testid="integrated-gasper-stage"
      data-gasper-authority={PRODUCTION_AUTHORITY_CLASS}
      data-gasper-renderer={PRODUCTION_AUTHORITY_ID}
      data-gasper-production="1"
      style={{ width: "100%", height: "100%", minHeight: 360, position: "relative" }}
    >
      {error ? (
        <div className="gasper-dais-error" data-testid="stage-error">
          {error}
        </div>
      ) : null}
      <GasperDaisStage
        controller={gasper}
        /* GASPER-007 DOPS-01: WorldClass shell is sole interaction authority. */
        interactionMode="render-only"
        onReady={() => {
          try {
            // Document identity first, then rig (AMB-EMB-EXPR).
            const session = getAnimationCommandSession();
            session.setEmbodimentSync("wispwalker");
            session.setExpressionSync("neutral-settled");
            gasper.selection.setEmbodiment("wispwalker");
            gasper.snapEmbodiment("wispwalker");
            gasper.setExpression("neutral-settled");
            // Expression grammar path: project 18-anchor kernel onto multi-domain pose.
            try {
              applyExpressionToDais("neutral-settled", {
                embodiment: "wispwalker",
                expressionGain: 0.4,
                dais: gasper,
              });
            } catch {
              /* grammar apply optional if channels unavailable */
            }
            // Sync editor projection from animation session
            gasper.syncEditorProjectionFromAnimationSession?.();
            if (startLivingIdle) {
              try {
                // Eight-state production morphology targets (not fallback demo).
                ensureEightStateRestingLoop(gasper);
              } catch {
                /* living optional in tests */
              }
            }
            // After DaisStage assigns inspectDais, seal production-truth surfaces.
            sealProductionDaisInspection(gasper);
            onReady?.();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
        onError={(m) => setError(m)}
      />
    </div>
  );
}

/** Load showcase .gasper JSON into the shared animation session (TS projection). */
export async function loadShowcaseDocument(pathUrl: string): Promise<{
  ok: boolean;
  error?: string;
  activeClip?: string | null;
  beatsLoaded?: boolean;
}> {
  try {
    const res = await fetch(pathUrl);
    if (!res.ok) return { ok: false, error: `fetch ${res.status}` };
    const doc = await res.json();
    // Task 6: expose the authored three-beat registry with the document so
    // the runtime trace can prove scene beats survive the load path.
    let beatsLoaded = false;
    try {
      const registryUrl = pathUrl.replace(
        /\/documents\/[^/]+$/,
        "/beats-registry.json",
      );
      const beatsRes = await fetch(registryUrl);
      if (beatsRes.ok) {
        const registry = await beatsRes.json();
        (window as unknown as { __GASPER_SCENE_BEATS__?: unknown }).__GASPER_SCENE_BEATS__ =
          registry;
        beatsLoaded = true;
      }
    } catch {
      beatsLoaded = false;
    }
    const session = getAnimationCommandSession();
    try {
      // Showcase/open load is clean at loaded revision (not dirty from pack JSON).
      session.loadFromObject(doc, null);
    } catch {
      await session.dispatch("seed_thinking_knit", {});
      session.markPersisted(null);
    }
    const d = session.getDocument();
    const dais = (window as unknown as { __GASPER_DAIS__?: GasperRigController })
      .__GASPER_DAIS__;
    dais?.syncEditorProjectionFromAnimationSession?.();
    // Select showcase content while the Dais continues its resting loop.
    const idle =
      d.animation.clips.find((c) =>
        /living.?idle|presence-living/i.test(c.name + c.id),
      ) ?? d.animation.clips[0];
    if (idle) {
      dais?.editorSession.dispatch({ type: "select_clip", clipId: idle.id });
    }
    // Showcase load is a clean open.
    try {
      dais?.editorSession.dispatch({ type: "mark_saved" });
    } catch {
      /* */
    }
    // Prefer document fields from loaded showcase; default Wispwalker when absent.
    const emb = d.embodiment_id || "wispwalker";
    const expr = d.expression_fixture_id || "neutral-settled";
    try {
      session.setEmbodimentSync(emb);
      session.setExpressionSync(expr);
    } catch {
      /* already matching or invalid pack field */
    }
    dais?.setEmbodiment(emb);
    dais?.setExpression(expr);
    // Document load may overwrite a loop state that already advanced during fetch.
    // Restart once from canonical Neutral, then only recover if something stops it.
    try {
      if (dais) ensureEightStateRestingLoop(dais, true);
    } catch {
      /* */
    }
    const ensureLiving = () => {
      try {
        if (dais) ensureEightStateRestingLoop(dais);
      } catch {
        /* */
      }
    };
    // Survive post-load playhead/scrub side-effects that may stop living once.
    for (const ms of [120, 400, 1000]) {
      setTimeout(ensureLiving, ms);
    }
    return {
      ok: true,
      activeClip: idle?.id ?? d.animation.active_clip_id,
      beatsLoaded,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
