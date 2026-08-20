import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  buildDaisKeyHandlers,
  DEFAULT_FRAME_FPS,
  dispatchDaisKeyCommand,
  resolveDaisKeyCommand,
  SHELL_SHARED_KEY_COMMANDS,
  WINDOW_ONLY_KEY_COMMANDS,
  type DaisFirstAdapter,
  type DaisKeyboardCommand,
} from "./daisFirstControls";
import { StudioDesk } from "./StudioDesk";
import { applySkinTake, type SkinTake } from "./LumenGlass";
import { dispatchField } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import { publishScaffoldAuthority } from "../../../desktop/src/gasper/scaffold/ScaffoldFieldAuthority";
import {
  computeReviewCropLabelGeometry,
  EIGHT_HOLD_STATE_LABELS,
  labelForHoldState,
  reviewModeChromeFlags,
  REVIEW_MODE_HOST,
  type EightHoldStateId,
} from "./daisReviewMode";
import type { TuningLabSession } from "../tuning/tuningRegistry";
import type { ReferenceTrainingSession } from "../training/ReferenceTrainingSession";
import type { StudioPilotSession } from "../training/StudioPilotSession";
import { ModeToggle } from "../modes/ModeToggle";
import { DraggablePanel } from "../environments/DraggablePanel";
import { VWebGLRuntime } from "../environments/vwebgl/VWebGLRuntime";
import { ENVIRONMENTS } from "../environments/registry";
import {
  readStoredMode,
  writeStoredMode,
  type StudioModeId,
} from "../modes/registry";
import "../modes/mode-shell.css";
import "../environments/EnvironmentHost.css";

const HOST_TEST_ID = "dais-first-stage-host";

export type DaisFirstStageHostProps = {
  adapter: DaisFirstAdapter;
  tuningLab?: TuningLabSession;
  referenceTraining?: ReferenceTrainingSession;
  studioPilot?: StudioPilotSession;
  children: ReactNode;
  /** Frame step rate for transport + keyboard (default 60). */
  fps?: number;
  className?: string;
  /** Controlled review mode (optional). */
  reviewMode?: boolean;
  onReviewModeChange?: (enabled: boolean) => void;
};

function isFocusInsideHost(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest(`[data-testid="${HOST_TEST_ID}"]`);
}

export function DaisFirstStageHost({
  adapter,
  children,
  fps = DEFAULT_FRAME_FPS,
  className,
  reviewMode: reviewModeProp,
}: DaisFirstStageHostProps): React.ReactElement {
  const [take, setTake] = useState<SkinTake>("neutral");
  const [studioMode, setStudioMode] = useState<StudioModeId>(() => readStoredMode());

  const onStudioMode = useCallback((id: StudioModeId) => {
    writeStoredMode(id);
    setStudioMode(id);
    try {
      const rig = (window as unknown as { SidekickFormMasterRig?: { setPaused?: (v: boolean) => void } })
        .SidekickFormMasterRig;
      rig?.setPaused?.(id !== "vector");
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    writeStoredMode(studioMode);
  }, [studioMode]);

  const resetScene = useCallback(() => {
    if (studioMode === "hybrid") {
      window.dispatchEvent(new CustomEvent("gasper-reset-vwebgl"));
      return;
    }
    try {
      const rig = (
        window as unknown as {
          SidekickFormMasterRig?: {
            setOrbit?: (y: number, p: number) => void;
            setYaw?: (y: number) => void;
            setTurntable?: (on: boolean, restore?: boolean) => void;
            setProfile?: (id: string, settle?: string) => void;
          };
        }
      ).SidekickFormMasterRig;
      rig?.setTurntable?.(false, true);
      rig?.setProfile?.("wispwalker", "settle");
      rig?.setOrbit?.(8, 0);
      rig?.setYaw?.(8);
      (window as unknown as { __GASPER_ORBIT_YAW__?: number }).__GASPER_ORBIT_YAW__ = 8;
      (window as unknown as { __GASPER_SHOW_GRID__?: boolean }).__GASPER_SHOW_GRID__ = false;
      (window as unknown as { __GASPER_SHOW_SKELETON__?: boolean }).__GASPER_SHOW_SKELETON__ = false;
    } catch {
      /* */
    }
  }, [studioMode]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      applySkinTake("neutral");
      dispatchField("clear", {});
      publishScaffoldAuthority({ pressure: 0, coupling: 0, relief: 0 });
    }, 1400);
    return () => window.clearTimeout(id);
  }, []);
  const [activeEightState] = useState<string>(
    "presence-neutral-settled",
  );

  const reviewMode = reviewModeProp ?? false;

  const chrome = useMemo(() => reviewModeChromeFlags(reviewMode), [reviewMode]);

  // Crop/label geometry for a representative stage (CSS % uses the same ratios).
  const cropGeom = useMemo(
    () =>
      computeReviewCropLabelGeometry({ width: 1280, height: 720 }),
    [],
  );

  const handlers = useMemo(
    () => buildDaisKeyHandlers(adapter, fps),
    [adapter, fps],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const cmd = resolveDaisKeyCommand({
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        targetTag: target?.tagName,
      });
      if (!cmd) return;
      const handled = dispatchDaisKeyCommand(cmd, handlers);
      if (!handled) return;
      e.preventDefault();
      if (SHELL_SHARED_KEY_COMMANDS.has(cmd)) {
        e.stopPropagation();
      }
    },
    [handlers],
  );

  useEffect(() => {
    const onWinKey = (e: KeyboardEvent) => {
      if (isFocusInsideHost(e.target)) return;

      const target = e.target as HTMLElement | null;
      const cmd = resolveDaisKeyCommand({
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        targetTag: target?.tagName,
      });
      if (!cmd) return;
      if (!WINDOW_ONLY_KEY_COMMANDS.has(cmd as DaisKeyboardCommand)) return;

      const handled = dispatchDaisKeyCommand(cmd, handlers);
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onWinKey);
    return () => window.removeEventListener("keydown", onWinKey);
  }, [handlers]);

  const stateLabel = labelForHoldState(activeEightState);
  const labelPct = {
    left: `${cropGeom.labelRegion.x * 100}%`,
    top: `${cropGeom.labelRegion.y * 100}%`,
    width: `${cropGeom.labelRegion.width * 100}%`,
    height: `${cropGeom.labelRegion.height * 100}%`,
  };
  const cropPct = {
    left: `${cropGeom.characterCrop.x * 100}%`,
    top: `${cropGeom.characterCrop.y * 100}%`,
    width: `${cropGeom.characterCrop.width * 100}%`,
    height: `${cropGeom.characterCrop.height * 100}%`,
  };

  return (
    <div
      className={[
        "dais-first-stage-host",
        reviewMode ? REVIEW_MODE_HOST.className : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={HOST_TEST_ID}
      data-dais-first="1"
      data-era="lumen"
      data-hierarchy-primary="stage-canvas"
      data-keyboard-dispatch="single"
      data-review-mode={reviewMode ? "1" : "0"}
      data-facial-review-scale={chrome.facialReviewScale ? "1" : "0"}
      data-character-crop-primary={chrome.characterCropPrimary ? "1" : "0"}
      data-studio-v2="1"
      data-mode={studioMode}
      data-runtime={ENVIRONMENTS[studioMode].runtime}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="region"
      aria-label="Dais-first open workspace"
    >
      <div
        className="dais-first-canvas"
        data-testid="dais-first-canvas"
        data-hierarchy-role="stage-canvas"
        data-facial-review-scale={chrome.facialReviewScale ? "1" : "0"}
      >
        <DraggablePanel
          id="mode-rail-v2"
          variant="rail"
          defaultX={Math.max(24, (typeof window !== "undefined" ? window.innerWidth : 1280) / 2 - 120)}
          defaultY={10}
          testId="gasper-mode-bar"
          headerExtra={
            <>
              <ModeToggle mode={studioMode} onChange={onStudioMode} />
              <button
                type="button"
                className="gasper-mode-reset"
                data-testid="scene-reset"
                onClick={resetScene}
              >
                Reset
              </button>
            </>
          }
        >
          {null}
        </DraggablePanel>
        <div
          className="env-layer"
          data-testid="env-vector"
          data-runtime="formmaster-svg"
          hidden={studioMode !== "vector"}
          aria-hidden={studioMode !== "vector"}
        >
          {children}
        </div>
        <VWebGLRuntime active={studioMode === "hybrid"} />
        {reviewMode ? (
          <div
            className="dais-review-overlay"
            data-testid="dais-review-mode-root"
            data-review-mode="1"
            aria-hidden="false"
          >
            <div
              className="dais-review-character-crop"
              data-testid="dais-review-character-crop"
              data-labels-outside="1"
              style={{
                position: "absolute",
                left: cropPct.left,
                top: cropPct.top,
                width: cropPct.width,
                height: cropPct.height,
                pointerEvents: "none",
              }}
            />
            <div
              className="dais-review-state-label"
              data-testid="dais-review-state-label"
              data-control-id="review-state-label"
              data-state-id={activeEightState}
              style={{
                position: "absolute",
                left: labelPct.left,
                top: labelPct.top,
                width: labelPct.width,
                height: labelPct.height,
                pointerEvents: "none",
              }}
            >
              {stateLabel}
              {activeEightState in EIGHT_HOLD_STATE_LABELS
                ? ` · ${activeEightState as EightHoldStateId}`
                : ` · ${activeEightState}`}
            </div>
          </div>
        ) : null}
      </div>
      <StudioDesk adapter={adapter} take={take} onTake={setTake} />
    </div>
  );
}

export default DaisFirstStageHost;
