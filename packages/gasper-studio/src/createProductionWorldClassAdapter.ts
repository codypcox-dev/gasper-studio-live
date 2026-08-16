/**
 * Production WorldClassStudioAdapter — maps real Grok 1 runtime to Grok 2 shell contract.
 * No DOM/renderer handles stored on the adapter; stage mounts separately as stageSlot.
 */

import type {
  ConnectionState,
  DesignDomainId,
  DocumentLifecycle,
  PlaybackState,
  StageMode,
  TimelineTrack,
  WorldClassStudioAdapter,
  WorldClassStudioSnapshot,
  WorkspaceId,
} from "../../desktop/src/studio/worldclass/adapter/types";
import {
  defaultJobAvailability,
  normalizeWorkspaceId,
} from "../../desktop/src/studio/worldclass/adapter/jobOntology";
import {
  buildPresetIntent,
  compileStudioAffectIntent,
  type AffectPresetId,
  type StudioCompileResult,
} from "../../desktop/src/studio/worldclass/affect/studioAffectCompiler";
import {
  buildProofBundle,
  comparePoseToBaseline,
  proofBundleToJson,
} from "../../desktop/src/studio/worldclass/proof/studioProofBundle";
import {
  getAnimationCommandSession,
  type GasperCanonicalDocument,
} from "../../desktop/src/gasper/GasperAnimationCommands";
import type { GasperRigController } from "../../desktop/src/gasper/GasperRigController";
import {
  getStudioConnection,
  requestManualReconnect,
  subscribeStudioConnection,
} from "./connectionAuthority";
import { listRecentDocuments } from "./recentDocuments";
import {
  applyExpressionToDais,
  inspectDaisExpression,
  listStudioExpressionIds,
  resetDaisExpression,
} from "./expression/daisManipulation";
import {
  PRODUCTION_AUTHORITY_ID,
  PRODUCTION_AUTHORITY_CLASS,
  PRODUCTION_AUTHORITY_SUMMARY,
  PRODUCTION_LAYER_SUMMARY,
  PRODUCTION_AUTHORITY_FLAGS,
  getProductionAuthorityInspection,
} from "../../desktop/src/gasper/renderer/productionAuthority";
import { applyLiveFormDesignParameter } from "./tuning/formDesignAuthority";

type Dais = GasperRigController;

function getDais(): Dais | null {
  return (
    (globalThis as unknown as { __GASPER_DAIS__?: Dais }).__GASPER_DAIS__ ?? null
  );
}

function mapStageMode(raw: string | undefined): StageMode {
  const s = (raw || "AUTHORING").toUpperCase();
  if (s.includes("PREVIEW")) return "preview";
  if (s.includes("RUNTIME")) return "runtime";
  return "author";
}

function mapPlayback(mode: string | undefined): PlaybackState {
  switch (mode) {
    case "play":
      return "playing";
    case "scrub":
      return "scrubbing";
    case "idle":
      return "stopped";
    default:
      return "stopped";
  }
}

function tracksFromEditor(editor: ReturnType<Dais["editorSession"]["getState"]>): TimelineTrack[] {
  return (editor.trackRows || []).map((tr) => ({
    id: tr.trackId,
    label: tr.label,
    bindingIds: [...tr.bindingIds],
    muted: tr.muted,
    locked: tr.locked,
    solo: false,
    keyframes: tr.keyframes.map((k) => ({
      id: k.id,
      trackId: tr.trackId,
      timeMs: k.timeMs,
      selected: k.selected,
    })),
  }));
}

function docLifecycle(doc: GasperCanonicalDocument | null, dirty: boolean): DocumentLifecycle {
  // Production Studio always has a working projection document after boot.
  if (!doc) return "ready";
  if (dirty) return "dirty";
  return "ready";
}

export type ProductionAdapterOptions = {
  /** @deprecated Do not pass developer paths — native Save As establishes path. */
  defaultSavePath?: string;
  buildIdentity?: string | null;
};

/**
 * Create production adapter. Call after Dais controller is constructed
 * (stage host sets window.__GASPER_DAIS__).
 */
export function createProductionWorldClassAdapter(
  opts: ProductionAdapterOptions = {},
): WorldClassStudioAdapter {
  const listeners = new Set<() => void>();
  let workspace: WorkspaceId = "motion";
  let activeTool: WorldClassStudioSnapshot["activeTool"] = "select";
  let stageMode: StageMode = "author";
  let showSafeBounds = false;
  let layoutMode: WorldClassStudioSnapshot["diagnostics"]["layoutMode"] = "full";
  let reducedMotion = false;
  let activeDesignDomain: DesignDomainId = "form";
  let selectedNavigatorId: string | null = null;
  let openGroups: Record<string, boolean> = {
    document: true,
    character: true,
    animation: true,
    connection: true,
  };
  let statusMessage = "Gasper Studio — production shell";
  /** Timeline presentation zoom (1 = full clip window). Real effect via visible range. */
  let timelineZoom = 1;
  /** When set, overrides editor/default visible window (ms). */
  let timelineVisibleRange: { start: number; end: number } | null = null;
  /** Lane E — last Affect compile result + preset metadata. */
  let lastAffect: {
    result: StudioCompileResult;
    presetId: AffectPresetId;
    seed: number;
    expressionHint: string | null;
    embodimentHint: string | null;
  } | null = null;
  /** Lane E — proof baseline pose (selection-level, not document). */
  let proofBaseline: Record<string, number> | null = null;
  let lastProofExport: { bundleHash: string; exportedAt: string } | null = null;
  let lastProofCompare: {
    identical: boolean;
    maxAbsDelta: number;
    deltaCount: number;
  } | null = null;
  // Active path lives on the animation session; never hardcode developer paths.
  void opts.defaultSavePath;

  /**
   * useSyncExternalStore requires getSnapshot to return a cached reference
   * until the store mutates (React error #185 / infinite re-render).
   */
  let cachedSnap: WorldClassStudioSnapshot | null = null;
  let snapDirty = true;
  let daisUnsub: (() => void) | null = null;

  const emit = () => {
    snapDirty = true;
    for (const l of listeners) l();
  };

  // Bridge connection authority + editor session into shell refresh
  subscribeStudioConnection(emit);

  const session = getAnimationCommandSession();
  session.subscribe(emit);

  const bindDais = () => {
    const d = getDais();
    if (!d || daisUnsub) return;
    // RigController.subscribe covers editor + living frame updates.
    daisUnsub = d.subscribe(emit);
  };
  if (typeof window !== "undefined") {
    setTimeout(bindDais, 0);
    setTimeout(bindDais, 250);
    setTimeout(bindDais, 1000);
  }

  function buildSnapshot(): WorldClassStudioSnapshot {
    const dais = getDais();
    // Optional-chain editorSession: residual / test dais stubs may omit it.
    const editor = dais?.editorSession?.getState() ?? null;
    // Sole document authority: GasperAnimationCommandSession.
    // Editor projection is derived; never let a stale editor outrank session.
    const animDoc = session.getDocument();
    const history = session.getHistoryState();
    const conn = getStudioConnection();
    // Character identity authority: document fields first (AMB-EMB-EXPR).
    // Rig selection is a live mirror applied after session writes.
    const emb = animDoc.embodiment_id ?? dais?.selection.getState().embodiment ?? "presence";
    const expr =
      animDoc.expression_fixture_id ??
      dais?.selection.getState().expression ??
      "neutral-settled";
    const clips = animDoc.animation.clips.map((c) => ({
      id: c.id,
      name: c.name,
      durationMs: c.duration_ms,
      markers: (c.markers ?? []).map((marker) => ({
        id: marker.id,
        timeMs: marker.time_ms,
        label: marker.label,
      })),
    }));
    const activeClipId =
      animDoc.animation.active_clip_id ?? clips[0]?.id ?? null;
    // Prefer editor tracks only when they already track the canonical active clip;
    // otherwise rebuild from the command session so bridge mutations cannot leave
    // the shell on a discarded placeholder clip.
    const editorAligned =
      !!editor &&
      editor.activeClipId === activeClipId &&
      (editor.document?.revision ?? 0) === (animDoc.revision ?? 0);
    const tracks = editorAligned
      ? tracksFromEditor(editor)
      : (
          animDoc.animation.clips.find((c) => c.id === activeClipId)?.tracks ?? []
        ).map((tr) => ({
          id: tr.id,
          label: tr.label,
          bindingIds: [...tr.binding_ids],
          muted: tr.muted,
          locked: tr.locked,
          solo: false,
          keyframes: tr.keyframes.map((k) => ({
            id: k.id,
            trackId: tr.id,
            timeMs: k.time_ms,
            selected: false,
          })),
        }));
    // Playhead authority: GasperAnimationCommandSession only (AMB-PLAYHEAD).
    // Editor playhead is a presentation mirror written by the playhead applier.
    const playheadMs = session.getPlayheadMs() ?? 0;
    const dirty = !!animDoc.dirty;
    const revision = animDoc.revision ?? 0;
    const documentPath = session.getPath();
    const name =
      documentPath?.split(/[/\\]/).pop() ??
      animDoc.id ??
      "Untitled";

    const playback: PlaybackState = mapPlayback(
      editorAligned ? editor?.editorMode : undefined,
    );
    const stageRaw = dais?.selection.getState().stageMode;
    const resolvedStage = stageMode || mapStageMode(stageRaw);

    return {
      workspace: normalizeWorkspaceId(workspace),
      activeTool,
      stageMode: resolvedStage,
      showSafeBounds,
      document: {
        lifecycle: docLifecycle(animDoc, !!dirty),
        name,
        path: documentPath,
        revision,
        dirty: !!dirty,
        contentHash:
          typeof animDoc?.content_hash === "string" ? animDoc.content_hash : null,
      },
      connection: {
        state: conn.state,
        label: conn.label,
        detail: conn.detail,
        endpointLabel: conn.endpointLabel,
      },
      character: {
        id: "gasper",
        name: "Gasper",
        embodiment: emb,
        expression: expr,
        selectionLabel: emb,
        availableEmbodiments: [
          "presence",
          "singularity",
          "comet",
          "dormant-orbit",
          "low-orbit",
        ],
        availableExpressions: listStudioExpressionIds(),
        layerSummary: PRODUCTION_LAYER_SUMMARY,
      },
      animation: {
        clips,
        activeClipId,
        tracks,
        playheadMs,
        visibleRangeMs: (() => {
          const defaultEnd = Math.max(
            1,
            clips.find((c) => c.id === activeClipId)?.durationMs ?? 4000,
          );
          if (timelineVisibleRange) return { ...timelineVisibleRange };
          if (editorAligned && editor?.visibleRangeMs) {
            return { ...editor.visibleRangeMs };
          }
          return { start: 0, end: defaultEnd };
        })(),
        zoom: timelineZoom,
        loop: editorAligned ? (editor?.loop ?? false) : false,
        playback,
        // History authority is the command session undo/redo stacks.
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        snap: editor?.snapMode ?? true,
        selectedKeyframeIds: editorAligned
          ? (editor?.selectedKeyframes ?? []).map((k) => k.keyframeId)
          : [],
        selectedTrackIds: editorAligned ? (editor?.selectedTrackIds ?? []) : [],
        dragPreview: null,
      },
      navigator: [
        { id: "char-gasper", label: "Gasper", kind: "character", depth: 0 },
        ...clips.map((c) => ({
          id: c.id,
          label: c.name,
          kind: "clip" as const,
          depth: 1,
          parentId: "char-gasper",
        })),
      ],
      selectedNavigatorId,
      inspectorGroups: [
        {
          id: "document",
          label: "Document",
          open: openGroups.document !== false,
          rows: [
            { id: "name", label: "Name", value: name, readOnly: true },
            { id: "rev", label: "Revision", value: revision, readOnly: true },
            { id: "dirty", label: "Dirty", value: !!dirty, control: "toggle", readOnly: true },
          ],
        },
        {
          id: "character",
          label: "Character",
          open: openGroups.character !== false,
          rows: [
            { id: "embodiment", label: "Embodiment", value: emb ?? "", control: "text" },
            { id: "expression", label: "Expression", value: expr ?? "", control: "text" },
          ],
        },
        {
          id: "connection",
          label: "Connection",
          open: openGroups.connection !== false,
          rows: [
            { id: "state", label: "State", value: conn.label, readOnly: true },
            {
              id: "detail",
              label: "Detail",
              value: conn.detail ?? "",
              readOnly: true,
            },
          ],
        },
      ],
      designDomains: [
        {
          id: "form",
          label: "Form",
          summary: "Silhouette & relief",
          parameters: [
            {
              id: "relief_amplitude",
              label: "Relief",
              // Prefer live paint (includes preview); fall back to committed base_bindings.
              value:
                dais?.readLive()?.relief_amplitude ??
                (typeof session.getBaseBindings().relief_amplitude === "number"
                  ? (session.getBaseBindings().relief_amplitude as number)
                  : 0.45),
              min: 0,
              max: 1,
            },
            // GasperResearch runtime-candidate v6.5.5 VIEW_RIG (0–45° authored spike).
            // FormMaster setYaw → authorKeyViewPoint / depthParallax 2.5D shift.
            {
              id: "yaw",
              label: "Yaw 2.5D",
              value:
                dais?.readLive()?.yaw ??
                (typeof session.getBaseBindings().yaw === "number"
                  ? (session.getBaseBindings().yaw as number)
                  : 8),
              min: 0,
              max: 45,
            },
          ],
        },
        {
          id: "face",
          label: "Face",
          summary: "Expression",
          parameters: [
            {
              id: "eye_openness",
              label: "Eye openness",
              value:
                dais?.readLive()?.eye_openness ??
                (typeof session.getBaseBindings().eye_openness === "number"
                  ? (session.getBaseBindings().eye_openness as number)
                  : 0.55),
              min: 0,
              max: 1,
            },
            {
              id: "crown_height",
              label: "Crown",
              value:
                dais?.readLive()?.crown_height ??
                (typeof session.getBaseBindings().crown_height === "number"
                  ? (session.getBaseBindings().crown_height as number)
                  : 0),
              min: 0,
              max: 1,
            },
          ],
        },
        {
          id: "energy",
          label: "Energy",
          summary: "Field",
          parameters: [
            {
              id: "energy_level",
              label: "Level",
              value:
                dais?.readLive()?.energy_level ??
                (typeof session.getBaseBindings().energy_level === "number"
                  ? (session.getBaseBindings().energy_level as number)
                  : 0.55),
              min: 0,
              max: 1,
            },
          ],
        },
        {
          id: "material",
          label: "Material",
          summary: "Surface",
          parameters: [],
        },
        {
          id: "light",
          label: "Light",
          summary: "Key & rim",
          parameters: [],
        },
        {
          id: "morph",
          label: "Morph",
          summary: "Embodiment blend",
          parameters: [],
        },
      ],
      activeDesignDomain,
      behaviorAvailable: true,
      behaviorNote:
        "Affect compiler loop available (provisional GASPER-006 contracts). Curve/graph editor still deferred.",
      behaviorOverview: {
        expressionFixture: expr,
        behavioralState: lastAffect?.result.ok
          ? `compiled · ${lastAffect.presetId} · ir ${lastAffect.result.ir_hash.slice(0, 12)}…`
          : lastAffect && !lastAffect.result.ok
            ? `compile failed · ${(lastAffect.result.issues || []).join(",")}`
            : null,
        transitionSummary: lastAffect?.result.ok
          ? lastAffect.result.phase_ids.join(" → ")
          : null,
        livingMotionAuthority: "GasperLivingRuntime (additive)",
        authoredVsRuntime: "Compositor: clip owns authored; living is additive",
      },
      jobAvailability: defaultJobAvailability({
        affectAvailable: true,
        proofAvailable: true,
      }),
      proofNote:
        "Proof export + baseline compare available. Full headed visual PASS remains Cody (Lane F).",
      affectCompile: lastAffect
        ? {
            ok: lastAffect.result.ok,
            irHash: lastAffect.result.ok ? lastAffect.result.ir_hash : null,
            intentHash: lastAffect.result.ok ? lastAffect.result.intent_hash : null,
            phaseIds: lastAffect.result.ok ? lastAffect.result.phase_ids : [],
            issues: lastAffect.result.ok ? [] : lastAffect.result.issues,
            presetId: lastAffect.presetId,
            seed: lastAffect.seed,
            calibrationNote:
              "Calibration: synthetic_provisional (D003S). Not human-validated.",
          }
        : null,
      proofStatus: {
        lastBundleHash: lastProofExport?.bundleHash ?? null,
        lastExportedAt: lastProofExport?.exportedAt ?? null,
        baselinePinned: !!proofBaseline,
        baselineKeyCount: proofBaseline ? Object.keys(proofBaseline).length : 0,
        lastCompare: lastProofCompare,
      },
      // Production truth from productionAuthority — not residual getProductionRendererId().
      // Extra seal fields ride on the diagnostics object (typed loosely for residual schema).
      diagnostics: {
        messages: [
          `authority=${PRODUCTION_AUTHORITY_ID}`,
          `class=${PRODUCTION_AUTHORITY_CLASS}`,
          `fallbackDemo=0`,
          `legacyActive=false`,
          `nativeIncomplete=false`,
        ],
        reducedMotion,
        layoutMode,
        health: "ok",
        buildIdentity: opts.buildIdentity ?? null,
        authorityRenderer: PRODUCTION_AUTHORITY_ID,
        errors: [],
        warnings: [],
        // Seal fields (consumers read via cast / JSON probe)
        authorityClass: PRODUCTION_AUTHORITY_CLASS,
        productionAuthoritySummary: PRODUCTION_AUTHORITY_SUMMARY,
        microstateTargetsAreFallbackDemo:
          PRODUCTION_AUTHORITY_FLAGS.microstateTargetsAreFallbackDemo,
        fallbackDemoFraction: PRODUCTION_AUTHORITY_FLAGS.fallbackDemoFraction,
        legacyAuthorityActive: PRODUCTION_AUTHORITY_FLAGS.legacyAuthorityActive,
        nativeCandidateIncomplete:
          PRODUCTION_AUTHORITY_FLAGS.nativeCandidateIncomplete,
        completeness: PRODUCTION_AUTHORITY_FLAGS.completeness,
        productionAuthority: getProductionAuthorityInspection(),
      } as import("../../desktop/src/studio/worldclass/adapter/types").DiagnosticsSnapshot,
      statusMessage,
    };
  }

  function getSnapshot(): WorldClassStudioSnapshot {
    if (!snapDirty && cachedSnap) return cachedSnap;
    cachedSnap = buildSnapshot();
    snapDirty = false;
    return cachedSnap;
  }

  const adapter: WorldClassStudioAdapter = {
    getSnapshot,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setWorkspace: (id) => {
      workspace = normalizeWorkspaceId(id);
      emit();
    },
    setActiveTool: (t) => {
      activeTool = t;
      try {
        const dais = getDais();
        // Keep Dais selection tool in sync when shell owns domain chrome (render-only).
        dais?.selection.setTool?.(t as never);
      } catch {
        /* */
      }
      emit();
    },
    selectNavigatorItem: (id) => {
      selectedNavigatorId = id;
      if (id?.startsWith("clip") || id?.includes("clip")) {
        getDais()?.editorSession.dispatch({ type: "select_clip", clipId: id });
      }
      emit();
    },
    setDesignDomain: (id) => {
      activeDesignDomain = id;
      // Design domain cards map 1:1 onto Dais stage tools (form/face/motion/…).
      const toolMap: Record<string, string> = {
        form: "form",
        face: "face",
        energy: "select",
        material: "material",
        light: "light",
        morph: "morph",
        motion: "motion",
      };
      const tool = toolMap[id] ?? id;
      activeTool = tool as WorldClassStudioSnapshot["activeTool"];
      try {
        getDais()?.selection.setTool?.(tool as never);
      } catch {
        /* */
      }
      emit();
    },
    toggleInspectorGroup: (gid) => {
      openGroups = { ...openGroups, [gid]: !openGroups[gid] };
      emit();
    },
    setStageMode: (m) => {
      stageMode = m;
      const dais = getDais();
      const map: Record<StageMode, string> = {
        author: "AUTHORING",
        preview: "PREVIEW",
        runtime: "RUNTIME",
      };
      try {
        dais?.selection.setStageMode(map[m] as "AUTHORING" | "PREVIEW" | "RUNTIME");
      } catch {
        /* */
      }
      emit();
    },
    setShowSafeBounds: (v) => {
      showSafeBounds = v;
      emit();
    },
    setLayoutMode: (m) => {
      if (layoutMode === m) return;
      layoutMode = m;
      emit();
    },
    setReducedMotion: (v) => {
      if (reducedMotion === v) return;
      reducedMotion = v;
      emit();
    },
    newDocument: () => {
      void (async () => {
        await session.dispatch("new_document", {});
        getDais()?.syncEditorProjectionFromAnimationSession?.();
        statusMessage = "New document";
        emit();
      })();
    },
    openDocument: () => {
      void (async () => {
        const { openGasperDocument } = await import("./documentFileWorkflow");
        const r = await openGasperDocument();
        if (r.ok === false && "cancelled" in r && r.cancelled) {
          statusMessage = "Open cancelled";
          emit();
          return;
        }
        if (!r.ok) {
          statusMessage = `Open failed: ${"error" in r ? r.error : "unknown"}`;
          emit();
          return;
        }
        getDais()?.syncEditorProjectionFromAnimationSession?.();
        statusMessage = `Opened ${r.path}`;
        emit();
      })();
    },
    saveDocument: () => {
      void (async () => {
        const { saveGasperDocument } = await import("./documentFileWorkflow");
        const r = await saveGasperDocument();
        if (r.ok === false && "cancelled" in r && r.cancelled) {
          statusMessage = "Save cancelled";
          emit();
          return;
        }
        if (!r.ok) {
          statusMessage = `Save failed: ${"error" in r ? r.error : "unknown"}`;
          emit();
          return;
        }
        statusMessage = `Saved ${r.path}`;
        emit();
      })();
    },
    saveDocumentAs: () => {
      void (async () => {
        const { saveGasperDocumentAs } = await import("./documentFileWorkflow");
        const r = await saveGasperDocumentAs();
        if (r.ok === false && "cancelled" in r && r.cancelled) {
          statusMessage = "Save As cancelled";
          emit();
          return;
        }
        if (!r.ok) {
          statusMessage = `Save As failed: ${"error" in r ? r.error : "unknown"}`;
          emit();
          return;
        }
        statusMessage = `Saved as ${r.path}`;
        emit();
      })();
    },
    listRecentDocuments: () =>
      listRecentDocuments().map((e) => ({ path: e.path, name: e.name })),
    openRecentDocument: (path: string) => {
      void (async () => {
        const { openGasperDocument } = await import("./documentFileWorkflow");
        const r = await openGasperDocument(path);
        if (!r.ok) {
          if ("cancelled" in r && r.cancelled) return;
          statusMessage = `Open recent failed: ${"error" in r ? r.error : "unknown"}`;
          emit();
          return;
        }
        getDais()?.syncEditorProjectionFromAnimationSession?.();
        statusMessage = `Opened ${r.path}`;
        emit();
      })();
    },
    reconnect: () => {
      requestManualReconnect();
      statusMessage = "Reconnecting…";
      emit();
    },
    setEmbodiment: (id) => {
      // Document first, then rig apply (never rig-only document silence).
      try {
        session.setEmbodimentSync(id);
      } catch {
        statusMessage = `Invalid embodiment ${id}`;
        emit();
        return;
      }
      getDais()?.setEmbodiment(id);
      statusMessage = `Embodiment ${id}`;
      emit();
    },
    setExpression: (id) => {
      // Grammar path: 18-anchor kernel → Control-as-gain → bounded multi-domain pose.
      const applied = applyExpressionToDais(id, { dais: getDais() });
      if (!applied.ok) {
        try {
          session.setExpressionSync(id);
          getDais()?.setExpression(id);
          statusMessage = `Expression ${id} (legacy path)`;
          emit();
          return;
        } catch {
          statusMessage = `Invalid expression ${id}: ${applied.error ?? ""}`;
          emit();
          return;
        }
      }
      statusMessage = `Expression ${applied.fixtureId} · ${applied.channelCount ?? 0} channels`;
      emit();
    },
    /**
     * Commit design parameter: rig commit + document base_bindings (Authoritative).
     * Continuous slider drag must use previewDesignParameter, not this.
     */
    setDesignParameter: (_d, paramId, value) => {
      if (typeof value !== "number" || !Number.isFinite(value)) return;
      const dais = getDais();
      // D-0083: mark user-owned regardless of registry/fallback path (yaw & co.).
      dais?.markUserOwnedBinding?.(paramId);
      const directFormWrite =
        _d === "form" &&
        applyLiveFormDesignParameter(paramId, value, {
          setLiveFormCoeff: (key, next) => dais?.setLiveFormCoeff?.(key, next),
        });
      if (!directFormWrite) {
        try {
          dais?.commitBinding?.(paramId, value);
        } catch {
          // Unknown non-form bindings still paint live, then document records intent.
          dais?.applyExternalPose?.({ [paramId]: value });
        }
      }
      try {
        session.setBaseBindingSync(paramId, value);
      } catch {
        /* invalid value already guarded */
      }
      dais?.syncEditorProjectionFromAnimationSession?.();
      statusMessage = `Committed ${paramId}`;
      emit();
    },
    /**
     * Preview-only live paint — no document revision, no base_bindings write.
     */
    previewDesignParameter: (_d, paramId, value) => {
      if (typeof value !== "number" || !Number.isFinite(value)) return;
      const dais = getDais();
      // D-0083: mark user-owned regardless of registry/fallback path (yaw & co.).
      dais?.markUserOwnedBinding?.(paramId);
      try {
        dais?.previewBinding?.(paramId, value);
      } catch {
        // Preview-only fallback paint; must not call setBaseBindingSync.
        dais?.applyExternalPose?.({ [paramId]: value });
      }
      emit();
    },
    cancelDesignPreview: () => {
      // Restore live pose from committed document base_bindings (numbers only).
      const bindings = session.getBaseBindings();
      const pose: Record<string, number> = {};
      for (const [k, v] of Object.entries(bindings)) {
        if (typeof v === "number" && Number.isFinite(v)) pose[k] = v;
      }
      if (Object.keys(pose).length) {
        getDais()?.applyExternalPose?.(pose);
      }
      statusMessage = "Design preview cancelled";
      emit();
    },
    scrub: (timeMs) => {
      // Session clock is written inside the playhead applier; then snapshot reads session.
      getDais()?.editorSession.dispatch({ type: "scrub", timeMs });
      emit();
    },
    setPlayhead: (timeMs) => {
      getDais()?.editorSession.dispatch({ type: "set_playhead", timeMs });
      emit();
    },
    play: () => {
      getDais()?.editorSession.dispatch({ type: "play" });
      emit();
    },
    pause: () => {
      getDais()?.editorSession.dispatch({ type: "pause" });
      emit();
    },
    interrupt: () => {
      getDais()?.editorSession.dispatch({ type: "interrupt" });
      emit();
    },
    toggleLoop: () => {
      getDais()?.editorSession.dispatch({ type: "toggle_loop" });
      emit();
    },
    setZoom: (zoom) => {
      const z = Math.max(0.25, Math.min(8, Number(zoom) || 1));
      timelineZoom = z;
      // Real timeline effect: zoom re-windows around the session/editor playhead.
      const dais = getDais();
      const editor = dais?.editorSession.getState();
      const mid = session.getPlayheadMs();
      const clipDur = Math.max(
        1,
        editor?.document?.clips.find((c) => c.id === editor.activeClipId)?.durationMs ??
          editor?.visibleRangeMs?.end ??
          4000,
      );
      // Reference window ~4s at zoom 1; tighter window at higher zoom.
      const half = Math.max(80, 2000 / z);
      let start = Math.max(0, mid - half);
      let end = mid + half;
      if (end - start > clipDur) {
        start = 0;
        end = clipDur;
      } else if (end > clipDur) {
        end = clipDur;
        start = Math.max(0, end - half * 2);
      }
      timelineVisibleRange = { start, end };
      // Keep editor presentation range in lockstep when present.
      try {
        dais?.editorSession.dispatch({
          type: "set_visible_range",
          start,
          end,
        } as never);
      } catch {
        /* editor may not know command yet — adapter state is authoritative for shell */
      }
      statusMessage = `Timeline zoom ${z.toFixed(2)}×`;
      emit();
    },
    setVisibleRange: (start, end) => {
      const s = Math.min(Number(start) || 0, Number(end) || 0);
      const e = Math.max(Number(start) || 0, Number(end) || 0, s + 1);
      timelineVisibleRange = { start: s, end: e };
      // Approximate zoom from window width relative to a 4s reference.
      const span = e - s;
      timelineZoom = Math.max(0.25, Math.min(8, 4000 / Math.max(1, span)));
      try {
        getDais()?.editorSession.dispatch({
          type: "set_visible_range",
          start: s,
          end: e,
        } as never);
      } catch {
        /* */
      }
      statusMessage = `Timeline range ${Math.round(s)}–${Math.round(e)}ms`;
      emit();
    },
    selectClip: (clipId) => {
      getDais()?.editorSession.dispatch({ type: "select_clip", clipId });
      emit();
    },
    createClip: (name, durationMs) => {
      getDais()?.editorSession.dispatch({ type: "create_clip", name, durationMs });
      emit();
    },
    addMarker: (label, timeMs) => {
      getDais()?.editorSession.dispatch({ type: "add_marker", label, timeMs });
      emit();
    },
    deleteMarker: (markerId) => {
      getDais()?.editorSession.dispatch({ type: "delete_marker", markerId });
      emit();
    },
    selectTrack: (trackId, multi) => {
      getDais()?.editorSession.dispatch({ type: "select_track", trackId, multi });
      emit();
    },
    selectKeyframe: (trackId, keyframeId, multi) => {
      getDais()?.editorSession.dispatch({
        type: "select_keyframe",
        trackId,
        keyframeId,
        multi,
      });
      emit();
    },
    clearKeyframeSelection: () => emit(),
    deleteKeyframe: (trackId, keyframeId) => {
      getDais()?.editorSession.dispatch({
        type: "delete_keyframe",
        trackId,
        keyframeId,
      });
      emit();
    },
    beginKeyframeDrag: (trackId, keyframeId) => {
      getDais()?.editorSession.dispatch({
        type: "begin_drag",
        trackId,
        keyframeId,
      });
      emit();
    },
    previewKeyframeDrag: (timeMs) => {
      getDais()?.editorSession.dispatch({ type: "preview_drag", timeMs });
      emit();
    },
    commitKeyframeDrag: () => {
      getDais()?.editorSession.dispatch({ type: "commit_drag" });
      emit();
    },
    cancelKeyframeDrag: () => {
      getDais()?.editorSession.dispatch({ type: "cancel_drag" });
      emit();
    },
    capturePose: () => {
      getDais()?.editorSession.dispatch({ type: "capture_current_pose" });
      emit();
    },
    undo: () => {
      // Document history authority: GasperAnimationCommandSession only.
      // Editor presentation is rebuilt from session after undo.
      const ok = getAnimationCommandSession().undoSync();
      if (!ok) {
        statusMessage = "Nothing to undo";
        emit();
        return;
      }
      getDais()?.syncEditorProjectionFromAnimationSession?.();
      statusMessage = "Undo";
      emit();
    },
    redo: () => {
      const ok = getAnimationCommandSession().redoSync();
      if (!ok) {
        statusMessage = "Nothing to redo";
        emit();
        return;
      }
      getDais()?.syncEditorProjectionFromAnimationSession?.();
      statusMessage = "Redo";
      emit();
    },

    compileAffectPreset: (presetId, seed) => {
      const preset = (["hold", "notice-hold", "thinking-knit"] as AffectPresetId[]).includes(
        presetId as AffectPresetId,
      )
        ? (presetId as AffectPresetId)
        : "hold";
      const s = typeof seed === "number" && Number.isFinite(seed) ? seed : 1;
      const intent = buildPresetIntent(preset, s);
      const result = compileStudioAffectIntent(intent);
      const first = intent.phases[0];
      lastAffect = {
        result,
        presetId: preset,
        seed: s,
        embodimentHint: first?.embodiment_preference ?? null,
        expressionHint: first?.expression_anchor ?? null,
      };
      if (!result.ok) {
        statusMessage = `Affect compile failed: ${result.issues.join(", ")}`;
        emit();
        return { ok: false, issues: result.issues };
      }
      statusMessage = `Affect compiled · ${preset} · ir ${result.ir_hash.slice(0, 12)}…`;
      emit();
      return { ok: true, irHash: result.ir_hash };
    },

    applyAffectCompileHints: () => {
      if (!lastAffect?.result.ok) {
        statusMessage = "No successful Affect compile to apply";
        emit();
        return;
      }
      const emb = lastAffect.embodimentHint || "wispwalker";
      const expr = lastAffect.expressionHint;
      try {
        session.setEmbodimentSync(emb);
        if (expr) session.setExpressionSync(expr);
      } catch {
        /* invalid id */
      }
      const dais = getDais();
      try {
        dais?.setEmbodiment?.(emb);
        if (expr) dais?.setExpression?.(expr);
      } catch {
        /* */
      }
      statusMessage = `Applied Affect hints · ${emb}${expr ? ` · ${expr}` : ""}`;
      emit();
    },

    exportProofBundle: () => {
      try {
        const dais = getDais();
        const doc = session.getDocument();
        const live =
          typeof dais?.readLive === "function" ? dais.readLive() : null;
        const living =
          typeof dais?.livingStatus === "function" ? dais.livingStatus() : null;
        const snap = getSnapshot();
        const bundle = buildProofBundle({
          buildIdentity: snap.diagnostics.buildIdentity ?? null,
          document: {
            name: snap.document.name,
            path: snap.document.path,
            revision: snap.document.revision,
            lifecycle: snap.document.lifecycle,
            dirty: snap.document.dirty,
            contentHash:
              typeof doc?.content_hash === "string" ? doc.content_hash : null,
          },
          connection: {
            state: snap.connection.state,
            label: snap.connection.label,
          },
          character: {
            embodiment: snap.character.embodiment,
            expression: snap.character.expression,
          },
          authorityRenderer: snap.diagnostics.authorityRenderer ?? null,
          health: snap.diagnostics.health ?? null,
          living: living
            ? { running: living.running, microstate: living.microstate }
            : null,
          playheadMs: snap.animation.playheadMs,
          activeClipId: snap.animation.activeClipId,
          livePose: live,
        });
        lastProofExport = {
          bundleHash: bundle.bundleHash,
          exportedAt: bundle.exportedAt,
        };
        const json = proofBundleToJson(bundle);
        // Side effect: clipboard when available (does not mutate document).
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(json);
          }
        } catch {
          /* optional */
        }
        statusMessage = `Proof exported · ${bundle.bundleHash.slice(0, 12)}…`;
        emit();
        return { ok: true, json, bundleHash: bundle.bundleHash };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        statusMessage = `Proof export failed: ${msg}`;
        emit();
        return { ok: false, error: msg };
      }
    },

    pinProofBaseline: () => {
      const dais = getDais();
      const live =
        typeof dais?.readLive === "function" ? dais.readLive() : null;
      if (!live || typeof live !== "object") {
        statusMessage = "No live pose to pin as proof baseline";
        emit();
        return { ok: false, keyCount: 0 };
      }
      const pose: Record<string, number> = {};
      for (const [k, v] of Object.entries(live)) {
        if (typeof v === "number" && Number.isFinite(v)) pose[k] = v;
      }
      proofBaseline = pose;
      try {
        dais?.selection?.setCompareBaseline?.(pose);
      } catch {
        /* optional selection mirror */
      }
      lastProofCompare = null;
      statusMessage = `Proof baseline pinned · ${Object.keys(pose).length} keys`;
      emit();
      return { ok: true, keyCount: Object.keys(pose).length };
    },

    compareProofBaseline: () => {
      if (!proofBaseline) {
        statusMessage = "Pin a proof baseline first";
        emit();
        return { ok: false, error: "no_baseline" };
      }
      const dais = getDais();
      const live =
        typeof dais?.readLive === "function" ? dais.readLive() : null;
      const current: Record<string, number> = {};
      if (live) {
        for (const [k, v] of Object.entries(live)) {
          if (typeof v === "number" && Number.isFinite(v)) current[k] = v;
        }
      }
      const cmp = comparePoseToBaseline(proofBaseline, current);
      lastProofCompare = {
        identical: cmp.identical,
        maxAbsDelta: cmp.maxAbsDelta,
        deltaCount: cmp.deltas.length,
      };
      statusMessage = cmp.identical
        ? "Proof compare · identical to baseline"
        : `Proof compare · ${cmp.deltas.length} deltas · max|Δ|=${cmp.maxAbsDelta.toFixed(4)}`;
      emit();
      return {
        ok: true,
        identical: cmp.identical,
        maxAbsDelta: cmp.maxAbsDelta,
        deltaCount: cmp.deltas.length,
      };
    },
  };

  // Expression-studio surface (not on base WorldClassStudioAdapter type).
  const extended = adapter as WorldClassStudioAdapter & {
    resetExpressionStudio: () => ReturnType<typeof resetDaisExpression>;
    inspectExpressionStudio: () => ReturnType<typeof inspectDaisExpression>;
  };
  extended.resetExpressionStudio = () => {
    const r = resetDaisExpression(getDais());
    statusMessage = r.ok
      ? "Expression studio reset → neutral-settled"
      : `Reset failed: ${r.error ?? "unknown"}`;
    emit();
    return r;
  };
  extended.inspectExpressionStudio = () => {
    const report = inspectDaisExpression(getDais());
    statusMessage = `Expression inspect · ${report.expression.channelCount} channels`;
    emit();
    return report;
  };

  return extended;
}

// silence unused import type
void (0 as unknown as ConnectionState);
