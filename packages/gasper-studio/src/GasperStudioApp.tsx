/**
 * Standalone Gasper Studio â€” final integration product root.
 * WorldClassStudioShell is the sole application chrome.
 * Connection state: connectionAuthority only (no duplicate strip).
 * Old SidekickStudioView timeline chrome is not mounted.
 */
import { useEffect, useMemo, useState } from "react";
import { WorldClassStudioShell } from "../../desktop/src/studio/worldclass";
import type { GasperRigController } from "../../desktop/src/gasper";
import {
  WISPWALKER_CAPABILITY_PROFILE,
  WISPWALKER_STUDIO_ENVIRONMENT_PROFILE,
} from "../../desktop/src/gasper";
import { StudioHttpBridgeClient } from "./http-bridge-client";
import {
  bindDesktopAnimationPersist,
  getAnimationCommandSession,
} from "../../desktop/src/gasper/GasperAnimationCommands";
import { createProductionWorldClassAdapter } from "./createProductionWorldClassAdapter";
import { IntegratedGasperStage } from "./IntegratedGasperStage";
import { UnifiedFieldReadout } from "./dais-first/UnifiedFieldReadout";
import {
  publishBridgeStatus,
  publishStandalone,
  registerReconnectHandler,
} from "./connectionAuthority";
import { shouldAutoStartAgentBridge } from "./operational/identities";
import {
  openGasperDocument,
  saveGasperDocument,
  saveGasperDocumentAs,
  loadGasperDocumentObject,
  newLiveDocument,
} from "./documentFileWorkflow";
import { listRecentDocuments } from "./recentDocuments";
import { mountPackagedGasperPilotHost } from "./pilot/mountPackagedPilotHost";
import { ExpressionDaisPanel } from "./expression/ExpressionDaisPanel";
import { setLiveExpressionGain } from "./expression/daisManipulation";
import { DaisFirstStageHost } from "./dais-first";
import { TuningLabSession, type TuningLabSurface } from "./tuning/tuningRegistry";
import {
  CINEMATIC_PAN_Y,
  CINEMATIC_ZOOM,
} from "../../desktop/src/gasper/GasperViewportController";
import {
  readLiveRenderedProfile,
  resolveRenderedEmbodiment,
} from "./tuning/renderedEmbodimentIdentity";
import { startTuningLabBrowserBridge } from "./tuning/tuningLabBridgeClient";
import { ReferenceTrainingSession } from "./training/ReferenceTrainingSession";
import { HttpReferenceTrainingApi } from "./training/HttpReferenceTrainingApi";
import { HttpSemanticMotionProvider } from "./training/HttpSemanticMotionProvider";
import { HttpStudioPilotProvider } from "./training/HttpStudioPilotProvider";
import { StudioPilotSession } from "./training/StudioPilotSession";
import type { StudioPilotDaisSurface } from "./training/StudioPilotAuthority";
import { ProviderSemanticMotionInterpreter } from "./training/SemanticMotionInterpreter";
import {
  BrowserReferenceMotionAnalyzer,
  browserReferenceAnalysisSupported,
} from "./training/BrowserReferenceMotionAnalyzer";
import "./dais-first/daisFirst.css";

function bindStudioPersistWithBridgeFallback(getBridge: () => {
  base: string;
  token: string | null;
  instanceId: string;
}) {
  try {
    bindDesktopAnimationPersist();
  } catch {
    /* */
  }
  const session = getAnimationCommandSession();
  session.setHost({
    persistDocument: async (doc, path) => {
      try {
        const { gasperSaveCanonicalDocument } = await import(
          "../../desktop/src/gasper/GasperDocumentBridge"
        );
        return await gasperSaveCanonicalDocument(doc, path);
      } catch {
        /* fall through */
      }
      const { base, token, instanceId } = getBridge();
      if (!token) throw new Error("save requires Tauri or connected bridge token");
      const res = await fetch(`${base}/v1/studio-bridge/persist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Studio-Bridge-Token": token,
        },
        body: JSON.stringify({ instanceId, path, document: doc }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`bridge persist failed: ${res.status} ${t}`);
      }
      const j = (await res.json()) as { path?: string };
      return { path: j.path || path, ok: true };
    },
  });
}

function readBuildIdentity(): string | null {
  try {
    const el = document.querySelector("[data-frontend-build]");
    const fromAttr = el?.getAttribute("data-frontend-build");
    if (fromAttr) return fromAttr;
    const meta = document.querySelector('meta[name="gasper-frontend-build"]');
    const fromMeta = meta?.getAttribute("content");
    if (fromMeta) return fromMeta;
    const env = (import.meta as unknown as { env?: { VITE_GASPER_FRONTEND_BUILD?: string } })
      .env?.VITE_GASPER_FRONTEND_BUILD;
    return env ?? null;
  } catch {
    return null;
  }
}

export function GasperStudioApp() {
  const [stageReady, setStageReady] = useState(false);
  const [showcaseNote, setShowcaseNote] = useState<string | null>(null);

  const adapter = useMemo(
    () =>
      createProductionWorldClassAdapter({
        buildIdentity: typeof document !== "undefined" ? readBuildIdentity() : null,
      }),
    [],
  );

  const tuningLab = useMemo(
    () =>
      new TuningLabSession(() => {
        const dais = (globalThis as unknown as {
          __GASPER_DAIS__?: TuningLabSurface & {
            getTuningLabTelemetry?: () => Record<string, number | string | null>;
          };
        }).__GASPER_DAIS__;
        if (!dais) return null;
        return {
          commitBinding: (id: string, value: number) => dais.commitBinding?.(id, value),
          setDesignParameter: (domain: string, id: string, value: number) =>
            adapter.setDesignParameter?.(
              domain as Parameters<NonNullable<typeof adapter.setDesignParameter>>[0],
              id,
              value,
            ),
          setPerformancePackParams: (params: { tempo?: number; exaggeration?: number }) =>
            dais.setPerformancePackParams?.(params),
          setTuningLabParams: (params: {
            gaitBobGain?: number;
            contactSquashGain?: number;
            supportExchangeGain?: number;
            footworkPrimitiveGain?: number;
            footworkTempo?: number;
            verticalDepthGain?: number;
          }) => dais.setTuningLabParams?.(params),
          setExpressionGain: (value: number, embodiment?: string) => {
            const result = setLiveExpressionGain(value, embodiment);
            if (!result.ok) throw new Error(result.error || "expression_gain_rejected");
          },
          setEmbodiment: (id: string) => {
            if (typeof adapter.setEmbodiment === "function") {
              // Use the same document-first route as the visible Dais rail so
              // the controller, session, and shell snapshot repaint together.
              adapter.setEmbodiment(id);
              return;
            }
            try {
              getAnimationCommandSession().setEmbodimentSync(id);
            } catch {
              /* the controller remains the live fallback */
            }
            dais.setEmbodiment?.(id);
            (dais as unknown as { selection?: { setEmbodiment?: (value: string) => void } })
              .selection?.setEmbodiment?.(id);
          },
          readEmbodiment: () => {
            const daisRendered =
              typeof (dais as { getRenderedEmbodiment?: () => string }).getRenderedEmbodiment ===
              "function"
                ? (dais as { getRenderedEmbodiment: () => string }).getRenderedEmbodiment()
                : null;
            return resolveRenderedEmbodiment({
              renderedProfile: readLiveRenderedProfile(
                (globalThis as unknown as {
                  SidekickFormMasterRig?: { getSnapshot?: () => { profile?: string | null } };
                }).SidekickFormMasterRig,
              ),
              authoredMainForm: daisRendered,
              documentEmbodiment: getAnimationCommandSession().getDocument().embodiment_id ?? null,
            });
          },
          readTelemetry: () => dais.getTuningLabTelemetry?.() ?? {},
          captureProof: () =>
            adapter.exportProofBundle?.() ?? {
              ok: false,
              error: "proof_surface_unavailable",
            },
          filePhysicsGoals: (goals) => {
            const driver = (
              dais as unknown as {
                ensurePhysicsDriver?: () => {
                  setLocomotion?: (owner: string, intent: { x: number; z: number; cruise: number }) => void;
                  standDownLocomotion?: (owner: string) => void;
                };
              }
            ).ensurePhysicsDriver?.();
            if (!driver) return;
            const cruise = Number(goals?.locomotion?.cruise);
            if (Number.isFinite(cruise) && cruise > 0) {
              driver.setLocomotion?.("life", {
                x: Number(goals.locomotion.x) || 0,
                z: Number(goals.locomotion.z) || 0,
                cruise,
              });
              return;
            }
            driver.standDownLocomotion?.("life");
          },
        };
      }),
    [],
  );

  const referenceApi = useMemo(() => new HttpReferenceTrainingApi(), []);
  const referenceAnalyzer = useMemo(() => new BrowserReferenceMotionAnalyzer(), []);
  const referenceTraining = useMemo(() => {
    const semanticInterpreter = new ProviderSemanticMotionInterpreter(
      new HttpSemanticMotionProvider(),
    );
    return new ReferenceTrainingSession(
      referenceApi,
      {
        poseBackend: browserReferenceAnalysisSupported() ? "available" : "absent",
        semanticProvider: "absent",
        persistence: "absent",
        preview: "absent",
      },
      {
        analyzer: referenceAnalyzer,
        semanticInterpreter,
        formProfile: WISPWALKER_CAPABILITY_PROFILE,
        environment: WISPWALKER_STUDIO_ENVIRONMENT_PROFILE,
        seed: 161803,
        persister: referenceApi,
        preview: {
          start: (plan) => {
            const dais = (window as unknown as { __GASPER_DAIS__?: GasperRigController }).__GASPER_DAIS__;
            if (!dais) throw new Error("live Gasper controller is unavailable");
            dais.setEmbodiment("wispwalker");
            return dais.startReferencePerformance(plan);
          },
          stop: () => {
            const dais = (window as unknown as { __GASPER_DAIS__?: GasperRigController }).__GASPER_DAIS__;
            return dais?.stopReferencePerformance() ?? null;
          },
        },
      },
    );
  }, [referenceAnalyzer, referenceApi]);

  const studioPilot = useMemo(() => new StudioPilotSession({
    authority: {
      adapter,
      tuningLab,
      referenceTraining,
      getDais: () => (
        (window as unknown as { __GASPER_DAIS__?: unknown }).__GASPER_DAIS__ ?? null
      ) as StudioPilotDaisSurface | null,
    },
    provider: new HttpStudioPilotProvider(),
  }), [adapter, referenceTraining, tuningLab]);

  useEffect(() => {
    const controller = new AbortController();
    void referenceApi.getCapabilities(controller.signal).then((capabilities) => {
      if (controller.signal.aborted) return;
      const livePreview = stageReady && Boolean(
        (window as unknown as { __GASPER_DAIS__?: GasperRigController }).__GASPER_DAIS__,
      );
      referenceTraining.updateAvailability({
        poseBackend: browserReferenceAnalysisSupported() ? "available" : "absent",
        semanticProvider: capabilities.semantic ? "available" : "absent",
        persistence: capabilities.persistence ? "available" : "absent",
        preview: livePreview ? "available" : "absent",
      });
    });
    return () => controller.abort();
  }, [referenceApi, referenceTraining, stageReady]);

  useEffect(() => {
    // Live-bootstrap observability: production adapter snapshot surface (read-only).
    (window as unknown as { __GASPER_WORLDCLASS_ADAPTER__?: typeof adapter }).__GASPER_WORLDCLASS_ADAPTER__ =
      adapter;
    return () => {
      try {
        delete (window as unknown as { __GASPER_WORLDCLASS_ADAPTER__?: unknown })
          .__GASPER_WORLDCLASS_ADAPTER__;
      } catch {
        /* */
      }
    };
  }, [adapter]);

  useEffect(() => {
    (window as unknown as { __GASPER_TUNING_LAB__?: TuningLabSession }).__GASPER_TUNING_LAB__ =
      tuningLab;
    const stopTuningLabBridge = startTuningLabBrowserBridge(tuningLab);
    return () => {
      stopTuningLabBridge();
      try {
        const host = window as unknown as {
          __GASPER_TUNING_LAB__?: TuningLabSession;
        };
        if (host.__GASPER_TUNING_LAB__ === tuningLab) delete host.__GASPER_TUNING_LAB__;
      } catch {
        /* */
      }
    };
  }, [tuningLab]);

  useEffect(() => {
    const host = window as unknown as {
      __GASPER_REFERENCE_TRAINING__?: ReferenceTrainingSession;
    };
    host.__GASPER_REFERENCE_TRAINING__ = referenceTraining;
    return () => {
      if (host.__GASPER_REFERENCE_TRAINING__ === referenceTraining) {
        delete host.__GASPER_REFERENCE_TRAINING__;
      }
    };
  }, [referenceTraining]);

  useEffect(() => {
    publishStandalone();
    // Low-frequency pilot host â€” optional living handoff; standalone survives without bridge.
    const pilotMount = mountPackagedGasperPilotHost();
    const client = new StudioHttpBridgeClient();
    const autoStartBridge = shouldAutoStartAgentBridge();
    bindStudioPersistWithBridgeFallback(() => ({
      base: client.bridgeBase || "http://127.0.0.1:19529",
      token: client.bridgeToken,
      instanceId: client.studioInstanceId,
    }));
    registerReconnectHandler(() => client.reconnectNow());
    // Acceptance / release-proof surface (production path wrappers; no bypass).
    (window as unknown as { __GASPER_FILE_WORKFLOW__?: unknown }).__GASPER_FILE_WORKFLOW__ = {
      open: openGasperDocument,
      save: saveGasperDocument,
      saveAs: saveGasperDocumentAs,
      /** Same production load path as Open, for host-side disk proof. */
      loadObject: loadGasperDocumentObject,
      /** Empty native document: no showcase clip. Isolated walk proofs use this. */
      newLiveDocument,
      listRecent: listRecentDocuments,
      reconnect: () => client.reconnectNow(),
    };
    if (autoStartBridge) {
      client.start({
        onStatus: (s, meta) => {
          publishBridgeStatus(s, {
            endpoint: meta?.endpoint ?? client.bridgeBase,
            offlineAttempts: meta?.offlineAttempts,
            nextRetryMs: meta?.nextRetryMs,
            lastAttemptAt: meta?.lastAttemptAt,
          });
        },
      });
    }
    return () => {
      registerReconnectHandler(null);
      client.stop();
      pilotMount.unmount();
      try {
        delete (window as unknown as { __GASPER_FILE_WORKFLOW__?: unknown })
          .__GASPER_FILE_WORKFLOW__;
      } catch {
        /* */
      }
    };
  }, []);

  // First-run / isolated-proof: empty live document, cinematic locked
  // camera, no Presence living-idle clip. Wander files walk-band
  // LocomotionIntent; the app never writes travel.
  useEffect(() => {
    if (!stageReady) return;
    let cancelled = false;
    const boot = async () => {
      const live = await newLiveDocument({
        id: "gasper-live-isolated-proof",
        embodiment: "wispwalker",
      });
      if (cancelled) return;
      const dais = (
        window as unknown as {
          __GASPER_DAIS__?: GasperRigController & {
            getViewport?: () => {
              releaseUserWorldFrame?: () => void;
              holdUserWorldFrame?: (frame?: { zoom?: number; panX?: number; panY?: number }) => void;
            };
            playNorthstarTwenty?: () => void;
            pinOpeningRest?: () => void;
          };
        }
      ).__GASPER_DAIS__;
      if (!dais) {
        setShowcaseNote("Live physics surface · waiting for dais");
        return;
      }
      dais.snapEmbodiment("wispwalker");
      dais.pinOpeningRest?.();
      dais.startLiving?.({
        seed: 20260814,
        autoSequence: false,
        restrainedIdle: false,
        eightStateLoop: false,
        proofMode: false,
        timingScale: 1,
      });
      dais.snapEmbodiment("wispwalker");
      dais.pinOpeningRest?.();
      dais.setLifeEnabled?.(false);
      dais.setWanderEnabled?.(false);
      dais.ensurePhysicsDriver?.();
      try {
        const rig = (
          window as unknown as {
            SidekickFormMasterRig?: {
              setYaw?: (n: number) => void;
              setEightStateEnabled?: (v: boolean) => void;
              cancelBehavior?: () => void;
            };
          }
        ).SidekickFormMasterRig;
        rig?.setEightStateEnabled?.(false);
        rig?.cancelBehavior?.();
        rig?.setYaw?.(8);
      } catch {
        /* opening rest is yaw 8 */
      }
      const vp = dais.getViewport?.();
      vp?.releaseUserWorldFrame?.();
      vp?.holdUserWorldFrame?.({
        zoom: CINEMATIC_ZOOM,
        panX: 0,
        panY: CINEMATIC_PAN_Y,
      });
      // N334: bare 5179 is the sealed rest portrait. Auto-playing the 20s
      // was the opening fault (heading slam + taxi + plane-tilt sway).
      // Capture scripts (?seq20=) still call playNorthstarTwenty themselves.
      const clip = live.ok ? live.activeClipId : "error";
      setShowcaseNote(
        clip
          ? `Live physics surface · clip still loaded ${clip}`
          : "Live physics surface · sealed Wispwalker rest · no clip",
      );
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [stageReady]);

  return (
    <div
      data-product="gasper-studio"
      data-testid="gasper-studio-root"
      data-integration="final"
      data-shell="worldclass"
      data-dais-first="1"
      data-cinematic-set="1"
      style={{ height: "100vh", width: "100vw", overflow: "hidden" }}
    >
      {/* Single chrome: WorldClassStudioShell â€” open Dais-first stage host */}
      <WorldClassStudioShell
        adapter={adapter}
        stageSlot={
          <DaisFirstStageHost
            adapter={adapter}
            tuningLab={tuningLab}
            referenceTraining={referenceTraining}
            studioPilot={studioPilot}
          >
            <IntegratedGasperStage
              onReady={() => setStageReady(true)}
            />
          </DaisFirstStageHost>
        }
        diagnosticsSlot={
          <div
            data-testid="expression-studio-diagnostics"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              maxHeight: 24,
              overflow: "hidden",
            }}
          >
            {showcaseNote ? (
              <span data-testid="showcase-note" style={{ fontSize: 11, opacity: 0.85 }}>
                {showcaseNote}
              </span>
            ) : null}
            {stageReady ? <UnifiedFieldReadout /> : null}
            {/*
              ExpressionDaisPanel is neutralized under dais-first CSS (display:none)
              so it cannot overflow the 28px status strip over the character stage.
              Rail owns expression / gain / embodiment for the open Dais surface.
              Kept mounted for secondary/diagnostics contract continuity only.
            */}
            {stageReady ? <ExpressionDaisPanel compact /> : null}
          </div>
        }
      />
    </div>
  );
}
