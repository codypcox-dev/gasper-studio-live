/**
 * Floating instrument table — categorized, paginated tools above the move pills.
 * ThinkOps: picker + pages, not a slider dump. Recede, never hide a dial.
 */
import { useCallback, useState, type ReactElement } from "react";
import type { DesignDomainId } from "../../../desktop/src/studio/worldclass/adapter/types";
import { dispatchField } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import { WISPWALKER_AUTHORING_DEFAULTS } from "./wispwalkerAuthoringDefaults";
import {
  applyCraftRailParams,
  applyWalkReviewShot,
  applyWorldPhysicsParams,
  commitDesignParam,
  disarmWorldBodyFromRail,
  enableDirectManipulation,
  launchWorldBounceFromRail,
  launchWorldCometFromRail,
  playNorthstarTwentyFromRail,
  previewDesignParam,
  releaseWalkReviewShot,
  resetExpressionViaAdapter,
  setExpressionGain,
  setWalkBooLoopFromRail,
  stopWalkBooTwentyFromRail,
  transitionWake,
  type DaisFirstAdapter,
} from "./daisFirstControls";
import { applySkinTake, type SkinTake } from "./LumenGlass";

export type InstrumentCategory = "tools" | "sliders" | "effects";

type SliderSpec = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  domain?: DesignDomainId;
  kind: "design" | "gain" | "phys" | "craft" | "goose";
  fallback: number;
};

type SliderPage = { id: string; label: string; sliders: SliderSpec[] };

const SLIDER_PAGES: SliderPage[] = [
  {
    id: "skin",
    label: "Skin",
    sliders: [
      { id: "scaffold_pressure", label: "Pressure", min: 0, max: 1, step: 0.01, domain: "form", kind: "design", fallback: 0 },
      { id: "scaffold_coupling", label: "Rim", min: 0, max: 2, step: 0.05, domain: "form", kind: "design", fallback: 0.5 },
      { id: "relief_amplitude", label: "Relief", min: 0, max: 1, step: 0.01, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.reliefAmplitude },
      { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, kind: "gain", fallback: WISPWALKER_AUTHORING_DEFAULTS.expressionGain },
    ],
  },
  {
    id: "fabric",
    label: "Fabric",
    sliders: [
      { id: "fabric_torso", label: "Torso", min: -1.2, max: 1.6, step: 0.05, kind: "goose", fallback: 0 },
      { id: "fabric_crown", label: "Crown", min: -1.2, max: 1.6, step: 0.05, kind: "goose", fallback: 0 },
      { id: "fabric_legs", label: "Legs", min: -1.2, max: 1.6, step: 0.05, kind: "goose", fallback: 0 },
      { id: "fabric_tau", label: "τ", min: 0.04, max: 0.5, step: 0.01, kind: "goose", fallback: 0.12 },
    ],
  },
  {
    id: "pose",
    label: "Pose",
    sliders: [
      { id: "asym", label: "Asym", min: -1, max: 1, step: 0.01, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.asym },
      { id: "body_lean", label: "Lean", min: -1, max: 1, step: 0.01, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.bodyLean },
      { id: "posture_x", label: "Pos X", min: -20, max: 20, step: 0.5, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.postureX },
      { id: "posture_y", label: "Pos Y", min: -20, max: 20, step: 0.5, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.postureY },
    ],
  },
  {
    id: "form",
    label: "Form",
    sliders: [
      { id: "form_crown_amp", label: "Crown", min: -5, max: 10, step: 0.1, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.crownAmp },
      { id: "form_chin_amp", label: "Chin", min: -5, max: 10, step: 0.1, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.chinAmp },
      { id: "form_lobe_amp", label: "Lobes", min: -5, max: 10, step: 0.1, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.lobeAmp },
      { id: "form_cleft_depth", label: "Cleft", min: -5, max: 10, step: 0.1, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.cleftDepth },
    ],
  },
  {
    id: "limbs",
    label: "Limbs",
    sliders: [
      { id: "form_foot_amp", label: "Feet", min: 0, max: 4, step: 0.1, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.footAmp },
      { id: "form_arm_amp", label: "Arms", min: 0, max: 4, step: 0.1, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.form.armAmp },
      { id: "wide", label: "Wide", min: -1, max: 1, step: 0.01, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.pose.wide },
      { id: "yaw", label: "Yaw", min: 0, max: 45, step: 0.5, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.yawDegrees },
    ],
  },
  {
    id: "walk",
    label: "Walk",
    sliders: [
      { id: "walk_amp", label: "Walk", min: 0, max: 2, step: 0.05, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.walkAmp },
      { id: "walk_period", label: "Step s", min: 0.5, max: 3, step: 0.05, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.walkPeriodSeconds },
      { id: "walk_accent", label: "Accent", min: 0, max: 1, step: 0.05, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.walkAccent },
      { id: "visco_tau", label: "Weight", min: 0.02, max: 1, step: 0.01, domain: "form", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.behavior.viscoTau },
    ],
  },
  {
    id: "phys",
    label: "Physics",
    sliders: [
      { id: "gravityScale", label: "Gravity", min: 0.25, max: 2, step: 0.05, kind: "phys", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.gravityScale },
      { id: "restitution", label: "Bounce", min: 0, max: 0.9, step: 0.02, kind: "phys", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.restitution },
      { id: "launchPower", label: "Launch", min: 0.25, max: 2, step: 0.05, kind: "phys", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.launchPower },
      { id: "intensity", label: "Squash", min: 0, max: 1, step: 0.05, kind: "phys", fallback: WISPWALKER_AUTHORING_DEFAULTS.physics.intensity },
    ],
  },
  {
    id: "craft",
    label: "Craft",
    sliders: [
      { id: "eye_openness", label: "Eye", min: 0, max: 1, step: 0.01, domain: "face", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.eyeOpenness },
      { id: "energy_level", label: "Energy", min: 0, max: 1, step: 0.01, domain: "energy", kind: "design", fallback: WISPWALKER_AUTHORING_DEFAULTS.rig.energyLevel },
      { id: "exaggeration", label: "Exag.", min: 0.5, max: 2, step: 0.05, kind: "craft", fallback: WISPWALKER_AUTHORING_DEFAULTS.craft.exaggeration },
      { id: "tempo", label: "Tempo", min: 0.75, max: 1.25, step: 0.05, kind: "craft", fallback: WISPWALKER_AUTHORING_DEFAULTS.craft.tempo },
    ],
  },
];

const TOOL_PAGES = [
  {
    id: "sculpt",
    label: "Sculpt",
    actions: [
      { id: "form", label: "Form" },
      { id: "face", label: "Face" },
      { id: "author", label: "Author" },
      { id: "sculpt", label: "Sculpt" },
      { id: "clear", label: "Clear" },
    ],
  },
  {
    id: "field",
    label: "Field",
    actions: [
      { id: "protrude", label: "Protrude ?" },
      { id: "bas", label: "Bas-relief" },
      { id: "engrave", label: "Engrave" },
      { id: "morph-puff", label: "Puff" },
      { id: "morph-remote", label: "Remote" },
      { id: "morph-pinch", label: "Pinch" },
      { id: "morph-spike", label: "Spike" },
      { id: "morph-wave", label: "Wave" },
      { id: "spin", label: "Turn 60°" },
      { id: "save", label: "Save look" },
    ],
  },
];

const EFFECT_PAGES = [
  {
    id: "skin",
    label: "Skin",
    actions: [
      { id: "neutral", label: "Neutral" },
      { id: "puff", label: "Puff" },
      { id: "goose", label: "Goose" },
      { id: "wake", label: "Wake" },
    ],
  },
  {
    id: "move",
    label: "Move",
    actions: [
      { id: "bounce", label: "Bounce" },
      { id: "comet", label: "Comet" },
      { id: "walk", label: "Walk" },
      { id: "twenty", label: "20s" },
      { id: "loop", label: "Loop" },
      { id: "stand", label: "Stand" },
      { id: "stop", label: "Stop" },
    ],
  },
];

function fmt(n: number): string {
  if (Math.abs(n) >= 10) return n.toFixed(0);
  return n.toFixed(2);
}

export function InstrumentTable({
  adapter,
  take,
  onTake,
}: {
  adapter: DaisFirstAdapter;
  take: SkinTake;
  onTake: (id: SkinTake) => void;
}): ReactElement {
  const [category, setCategory] = useState<InstrumentCategory>("sliders");
  const [values, setValues] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const group of SLIDER_PAGES) {
      for (const s of group.sliders) next[s.id] = s.fallback;
    }
    return next;
  });
  const [loopOn, setLoopOn] = useState(true);
  const [gridOn, setGridOn] = useState(false);
  const [status, setStatus] = useState("All dials · cube hex");
  const [open, setOpen] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem("gasper.settings.open") === "1";
    } catch {
      return false;
    }
  });

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("gasper.settings.open", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const goCategory = useCallback((id: InstrumentCategory) => {
    setCategory(id);
    setOpen(true);
  }, []);

  const writeSlider = useCallback(
    (spec: SliderSpec, raw: number, commit: boolean) => {
      const next = Math.max(spec.min, Math.min(spec.max, raw));
      setValues((prev) => ({ ...prev, [spec.id]: next }));
      if (spec.kind === "gain") {
        setExpressionGain(next);
        if (commit) setStatus(`Gain ${fmt(next)}`);
        return;
      }
      if (spec.kind === "phys") {
        applyWorldPhysicsParams({ [spec.id]: next });
        if (commit) setStatus(`Physics ${spec.label}`);
        return;
      }
      if (spec.kind === "goose") {
        if (spec.id === "fabric_torso") dispatchField("inflate", { id: "torso", amount: next });
        else if (spec.id === "fabric_crown") dispatchField("inflate", { id: "crown", amount: next });
        else if (spec.id === "fabric_legs") {
          dispatchField("inflate", { id: "leftLeg", amount: next });
          dispatchField("inflate", { id: "rightLeg", amount: next });
        } else if (spec.id === "fabric_tau") {
          dispatchField("setTau", { id: "torso", tau: next });
          dispatchField("setTau", { id: "crown", tau: next });
        }
        if (commit) setStatus(`Fabric ${spec.label} ${fmt(next)}`);
        return;
      }
      if (spec.kind === "craft") {
        applyCraftRailParams({ [spec.id]: next });
        if (commit) setStatus(`Craft ${spec.label}`);
        return;
      }
      if (spec.domain) {
        previewDesignParam(adapter, spec.domain, spec.id, next);
        if (commit) commitDesignParam(adapter, spec.domain, spec.id, next);
        if (commit) setStatus(`${spec.label} ${fmt(next)}`);
      }
    },
    [adapter],
  );

  const onTool = useCallback(
    (id: string) => {
      if (id === "form" || id === "face") {
        enableDirectManipulation(adapter, id);
        setStatus(`Tool · ${id}`);
        return;
      }
      if (id === "author") {
        adapter.setStageMode?.("author");
        setStatus("Stage · author");
        return;
      }
      if (id === "sculpt") {
        onTake("sculpt");
        setStatus("Field · sculpt");
        return;
      }
      if (id === "grid") {
        const next = !gridOn;
        setGridOn(next);
        dispatchField("showGrid", { on: next });
        setStatus(next ? "Grid on" : "Grid hidden");
        return;
      }
      if (id === "clear") {
        dispatchField("clear");
        setStatus("Field cleared");
        return;
      }
      if (id === "protrude") {
        dispatchField("protrude", { glyph: "?" });
        onTake("sculpt");
        setStatus("Protrude · ?");
        return;
      }
      if (id === "bas") {
        dispatchField("basRelief", { glyph: "?" });
        onTake("sculpt");
        setStatus("Bas-relief · ?");
        return;
      }
      if (id === "engrave") {
        dispatchField("engrave", { glyph: "?" });
        onTake("sculpt");
        setStatus("Engrave · ?");
        return;
      }
      if (id.startsWith("morph-")) {
        const morph = id.slice(6);
        dispatchField("showGrid", { on: false });
        dispatchField("morph", { id: morph, amplitude: 1 });
        onTake("goose");
        setStatus(`Fabric · ${morph}`);
        return;
      }
      if (id === "spin") {
        const g = globalThis as { __GASPER_GOOSE__?: { turns?: number } };
        const prev = g.__GASPER_GOOSE__ ?? {};
        const turns = ((((prev.turns ?? 0) + 1) % 6) + 6) % 6;
        g.__GASPER_GOOSE__ = { ...prev, turns };
        dispatchField("rotate", { turns: 1 });
        setValues((v) => ({ ...v, goose_turns: turns }));
        setStatus(`Turn ${turns} · 60°`);
        return;
      }
      if (id === "save") {
        const label =
          typeof window !== "undefined"
            ? window.prompt("Name this look", "Look")
            : "Look";
        if (!label) return;
        dispatchField("saveLook", { label });
        setStatus(`Saved · ${label}`);
      }
    },
    [adapter, gridOn, onTake],
  );

  const onEffect = useCallback(
    (id: string) => {
      if (id === "neutral" || id === "puff" || id === "goose") {
        onTake(id);
        applySkinTake(id);
        setStatus(`Skin · ${id}`);
        return;
      }
      if (id === "wake") {
        transitionWake();
        setStatus("Wake");
        return;
      }
      if (id === "bounce") {
        launchWorldBounceFromRail();
        setStatus("Bounce");
        return;
      }
      if (id === "comet") {
        launchWorldCometFromRail();
        setStatus("Comet");
        return;
      }
      if (id === "walk") {
        applyWalkReviewShot();
        setStatus("Walk review");
        return;
      }
      if (id === "twenty") {
        playNorthstarTwentyFromRail();
        setStatus("Northstar 20s");
        return;
      }
      if (id === "loop") {
        const next = !loopOn;
        setWalkBooLoopFromRail(next);
        setLoopOn(next);
        setStatus(next ? "Loop on" : "Loop off");
        return;
      }
      if (id === "stand") {
        stopWalkBooTwentyFromRail();
        releaseWalkReviewShot();
        setStatus("Stand");
        return;
      }
      if (id === "stop") {
        disarmWorldBodyFromRail();
        stopWalkBooTwentyFromRail();
        resetExpressionViaAdapter(adapter);
        setStatus("Stop");
      }
    },
    [adapter, loopOn, onTake],
  );

  return (
    <aside
      className="instrument-table"
      data-testid="instrument-table"
      data-category={category}
      data-open={open ? "1" : "0"}
    >
      {!open ? (
        <button
          type="button"
          className="instrument-table__tab"
          data-testid="settings-toggle"
          aria-expanded={false}
          onClick={toggleOpen}
        >
          Settings
        </button>
      ) : (
        <div className="instrument-table__sheet" id="settings-sheet">
          <header className="instrument-table__head">
            <div className="instrument-table__head-row">
              <div>
                <p className="instrument-table__title">Settings</p>
                <p className="instrument-table__status" data-testid="instrument-status">
                  {status}
                </p>
              </div>
              <button
                type="button"
                className="instrument-table__tab"
                data-testid="settings-toggle"
                aria-expanded={true}
                aria-controls="settings-sheet"
                onClick={toggleOpen}
              >
                Hide
              </button>
            </div>
            <div className="instrument-table__cats" role="tablist" aria-label="Settings">
              {(["sliders", "tools", "effects"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  data-testid={`instrument-cat-${id}`}
                  data-active={category === id ? "1" : "0"}
                  aria-selected={category === id}
                  onClick={() => goCategory(id)}
                >
                  {id === "sliders" ? "Dials" : id === "tools" ? "Tools" : "Play"}
                </button>
              ))}
            </div>
          </header>

          <div className="instrument-table__body">
            {category === "sliders"
              ? SLIDER_PAGES.map((group) => (
                  <details
                    key={group.id}
                    className="instrument-table__section"
                    data-testid={`instrument-section-${group.id}`}
                    open
                  >
                    <summary>{group.label}</summary>
                    <div className="instrument-table__sliders" data-testid={group.id === "goose" ? "instrument-sliders" : undefined}>
                      {group.sliders.map((spec) => {
                        const value = values[spec.id] ?? spec.fallback;
                        return (
                          <label
                            key={spec.id}
                            className="instrument-table__slider"
                            data-testid={`instrument-slider-${spec.id}`}
                          >
                            <span>
                              {spec.label}
                              <em>{fmt(value)}</em>
                            </span>
                            <input
                              type="range"
                              min={spec.min}
                              max={spec.max}
                              step={spec.step}
                              value={value}
                              onChange={(e) => writeSlider(spec, Number(e.target.value), false)}
                              onPointerUp={(e) => writeSlider(spec, Number(e.currentTarget.value), true)}
                              onBlur={(e) => writeSlider(spec, Number(e.currentTarget.value), true)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </details>
                ))
              : (category === "tools" ? TOOL_PAGES : EFFECT_PAGES).map((group) => (
                  <section
                    key={group.id}
                    className="instrument-table__section"
                    data-testid={`instrument-section-${group.id}`}
                  >
                    <h3>{group.label}</h3>
                    <div className="instrument-table__actions" data-testid={`instrument-actions-${category}`}>
                      {group.actions.map((action) => {
                        const active =
                          (action.id === take &&
                            (take === "neutral" || take === "puff" || take === "goose")) ||
                          (action.id === "loop" && loopOn) ||
                          (action.id === "grid" && gridOn) ||
                          (action.id === "sculpt" && take === "sculpt");
                        return (
                          <button
                            key={action.id}
                            type="button"
                            data-testid={`instrument-action-${action.id}`}
                            data-active={active ? "1" : "0"}
                            onClick={() => (category === "tools" ? onTool(action.id) : onEffect(action.id))}
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
          </div>
        </div>
      )}
    </aside>
  );
}
