/**
 * Dais-first stage host — primary live character canvas + control rail + transport.
 * Composes IntegratedGasperStage (or any stage child) as the open workspace focus.
 * Dais remains render-only; shell rail owns AUTHORING tools.
 *
 * Review mode: state-isolated presentation that hides irrelevant chrome and
 * exposes character crop + external state labels for high-res facial review.
 *
 * Keyboard single-dispatch contract:
 * - Host React onKeyDown owns all Dais keys when focus is inside the host.
 * - Window listener only for Dais-only keys when focus is OUTSIDE host.
 * Does not claim Cody visual acceptance.
 */
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
import { DaisControlRail } from "./DaisControlRail";
import { DaisTransportBar } from "./DaisTransportBar";
import { InstrumentTable } from "./InstrumentTable";
import { applySkinTake, LumenGlass, type SkinTake } from "./LumenGlass";
import { dispatchField } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import { publishScaffoldAuthority } from "../../../desktop/src/gasper/scaffold/ScaffoldFieldAuthority";
import { playNorthstarTwentyFromRail, setWalkBooLoopFromRail } from "./daisFirstControls";
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
  tuningLab,
  referenceTraining,
  studioPilot,
  children,
  fps = DEFAULT_FRAME_FPS,
  className,
  reviewMode: reviewModeProp,
  onReviewModeChange,
}: DaisFirstStageHostProps): React.ReactElement {
  const [localReviewMode, setLocalReviewMode] = useState(false);
  const [take, setTake] = useState<SkinTake>("neutral");

  useEffect(() => {
    const id = window.setTimeout(() => {
      applySkinTake("neutral");
      dispatchField("showGrid", { on: false });
      dispatchField("clear", {});
      publishScaffoldAuthority({ pressure: 0, coupling: 0, relief: 0 });
      setWalkBooLoopFromRail(true);
      playNorthstarTwentyFromRail();
    }, 1400);
    return () => window.clearTimeout(id);
  }, []);
  const [activeEightState, setActiveEightState] = useState<string>(
    "presence-neutral-settled",
  );

  const reviewMode = reviewModeProp ?? localReviewMode;
  const setReviewMode = useCallback(
    (enabled: boolean) => {
      setLocalReviewMode(enabled);
      onReviewModeChange?.(enabled);
    },
    [onReviewModeChange],
  );

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
        {children}
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
        <InstrumentTable adapter={adapter} take={take} onTake={setTake} />
        <LumenGlass take={take} onTake={setTake} />
      </div>
      <DaisControlRail
        adapter={adapter}
        tuningLab={tuningLab}
        referenceTraining={referenceTraining}
        studioPilot={studioPilot}
        reviewMode={reviewMode}
        onReviewModeChange={setReviewMode}
        activeEightState={activeEightState}
        onEightStateChange={setActiveEightState}
      />
      <DaisTransportBar
        adapter={adapter}
        fps={fps}
        reviewMode={reviewMode}
      />
    </div>
  );
}

export default DaisFirstStageHost;
