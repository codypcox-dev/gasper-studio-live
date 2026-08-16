import { useCallback, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { WorldClassStudioShellProps } from "../adapter/types";
import { useAdapterSnapshot } from "../hooks/useAdapterSnapshot";
import {
  dispatchShellKeyCommand,
  resolveShellKeyCommand,
} from "../keyboard/shellKeyboard";
import { ApplicationBar } from "./ApplicationBar";
import { ContextToolbar } from "./ContextToolbar";
import { Navigator } from "./Navigator";
import { Inspector } from "./Inspector";
import { StatusLine } from "./StatusLine";
import { DesignWorkspace } from "../workspaces/DesignWorkspace";
import { AnimateWorkspace } from "../workspaces/AnimateWorkspace";
import { BehaviorWorkspace } from "../workspaces/BehaviorWorkspace";
import { OperateWorkspace } from "../workspaces/OperateWorkspace";
import { ProofWorkspace } from "../workspaces/ProofWorkspace";
import { normalizeWorkspaceId } from "../adapter/jobOntology";
import { layoutModeFromWidth } from "../adapter/productTruth";
import "../theme/worldclass.css";

/**
 * Drop-in Gasper Studio world-class product shell.
 * Mounts via adapter + stageSlot only — no production runtime imports.
 */
export function WorldClassStudioShell({
  adapter,
  stageSlot,
  diagnosticsSlot,
  className,
}: WorldClassStudioShellProps) {
  const snap = useAdapterSnapshot(adapter);

  // Responsive layout observation (adapter may own layoutMode; shell can suggest)
  useEffect(() => {
    if (!adapter.setLayoutMode) return;
    const onResize = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1440;
      adapter.setLayoutMode?.(layoutModeFromWidth(w));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [adapter]);

  // Reduced motion preference
  useEffect(() => {
    if (!adapter.setReducedMotion || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => adapter.setReducedMotion?.(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [adapter]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const cmd = resolveShellKeyCommand({
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        targetTag: target?.tagName,
      });
      if (!cmd) return;
      const handled = dispatchShellKeyCommand(cmd, {
        playToggle: () => {
          if (snap.animation.playback === "playing") adapter.pause();
          else adapter.play();
        },
        interrupt: () => adapter.interrupt(),
        undo: () => adapter.undo(),
        redo: () => adapter.redo(),
        save: adapter.saveDocument ? () => adapter.saveDocument?.() : undefined,
        setWorkspace: (id) => adapter.setWorkspace(id),
        clearSelection: () => adapter.clearKeyframeSelection(),
        cancelDrag: () => adapter.cancelKeyframeDrag(),
        deleteSelection: () => {
          const sel = snap.animation.selectedKeyframeIds[0];
          if (!sel) return;
          const track = snap.animation.tracks.find((t) =>
            t.keyframes.some((k) => k.id === sel),
          );
          if (track) adapter.deleteKeyframe?.(track.id, sel);
        },
        stepPlayhead: (deltaMs) => {
          const clip = snap.animation.clips.find((c) => c.id === snap.animation.activeClipId);
          const dur = clip?.durationMs ?? snap.animation.visibleRangeMs.end ?? 0;
          const next = Math.max(0, Math.min(dur, snap.animation.playheadMs + deltaMs));
          adapter.scrub(next);
        },
        jumpPlayheadHome: () => adapter.setPlayhead(0),
        jumpPlayheadEnd: () => {
          const clip = snap.animation.clips.find((c) => c.id === snap.animation.activeClipId);
          const dur = clip?.durationMs ?? snap.animation.visibleRangeMs.end ?? 0;
          adapter.setPlayhead(dur);
        },
      });
      if (handled) e.preventDefault();
    },
    [
      adapter,
      snap.animation.playback,
      snap.animation.selectedKeyframeIds,
      snap.animation.tracks,
      snap.animation.clips,
      snap.animation.activeClipId,
      snap.animation.playheadMs,
      snap.animation.visibleRangeMs.end,
    ],
  );

  return (
    <div
      data-gasper-worldclass-shell
      data-testid="gwc-shell-root"
      data-workspace={snap.workspace}
      data-layout={snap.diagnostics.layoutMode}
      data-connection={snap.connection.state}
      data-document={snap.document.lifecycle}
      data-dirty={snap.document.dirty ? "true" : "false"}
      data-playback={snap.animation.playback}
      data-reduced-motion={snap.diagnostics.reducedMotion ? "true" : "false"}
      className={className}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <ApplicationBar snap={snap} adapter={adapter} />
      <ContextToolbar snap={snap} adapter={adapter} />

      <div className="gwc-body" data-testid="gwc-body">
        <Navigator snap={snap} adapter={adapter} />

        {(() => {
          const job = normalizeWorkspaceId(snap.workspace);
          if (job === "operate") {
            return (
              <OperateWorkspace snap={snap} adapter={adapter} stageSlot={stageSlot} />
            );
          }
          if (job === "form") {
            return (
              <DesignWorkspace snap={snap} adapter={adapter} stageSlot={stageSlot} />
            );
          }
          if (job === "motion") {
            return (
              <AnimateWorkspace snap={snap} adapter={adapter} stageSlot={stageSlot} />
            );
          }
          if (job === "affect") {
            return (
              <BehaviorWorkspace snap={snap} stageSlot={stageSlot} adapter={adapter} />
            );
          }
          if (job === "proof") {
            return (
              <ProofWorkspace snap={snap} stageSlot={stageSlot} adapter={adapter} />
            );
          }
          return null;
        })()}

        <Inspector snap={snap} adapter={adapter} />
      </div>

      <StatusLine snap={snap} diagnosticsSlot={diagnosticsSlot} />
    </div>
  );
}
