/**
 * Single authoritative selection model for Dais authoring.
 * Navigator, inspector, HUD, and rig all read from this store.
 */

export type StageMode = "AUTHORING" | "PREVIEW" | "RUNTIME" | "COMPARE";
export type StageTool =
  | "select"
  | "form"
  | "face"
  | "motion"
  | "material"
  | "light"
  | "morph";

export type GasperSelectionState = {
  documentId: string;
  embodiment: string;
  expression: string;
  tool: StageTool;
  stageMode: StageMode;
  selectedRegion: string | null;
  /** Temporary face authoring isolation (does not change embodiment id). */
  faceIsolation: boolean;
  /** Compare baseline snapshot of binding values (null = no baseline). */
  compareBaseline: Record<string, number> | null;
};

type Listener = (s: GasperSelectionState) => void;

const EMBODIMENTS = [
  "presence",
  "singularity",
  "dormant-orbit",
  "low-orbit",
  "comet",
  "wispwalker",
  "halo",
  "lantern",
] as const;

export class GasperSelectionModel {
  private state: GasperSelectionState = {
    documentId: "gasper-v6.5.5",
    embodiment: "presence",
    expression: "neutral",
    tool: "form",
    stageMode: "AUTHORING",
    selectedRegion: null,
    faceIsolation: false,
    compareBaseline: null,
  };
  private listeners = new Set<Listener>();

  getState(): GasperSelectionState {
    return { ...this.state };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snap = this.getState();
    for (const fn of this.listeners) fn(snap);
  }

  setEmbodiment(id: string) {
    if (!EMBODIMENTS.includes(id as (typeof EMBODIMENTS)[number])) {
      throw new TypeError(`unknown embodiment: ${id}`);
    }
    // Atomic: clear any multi-select residue — single active embodiment only
    this.state = {
      ...this.state,
      embodiment: id,
      selectedRegion: null,
    };
    this.emit();
  }

  setExpression(id: string) {
    this.state = { ...this.state, expression: id };
    this.emit();
  }

  setTool(tool: StageTool) {
    this.state = { ...this.state, tool };
    this.emit();
  }

  setStageMode(stageMode: StageMode) {
    this.state = { ...this.state, stageMode };
    this.emit();
  }

  setSelectedRegion(region: string | null) {
    this.state = { ...this.state, selectedRegion: region };
    this.emit();
  }

  setFaceIsolation(on: boolean) {
    this.state = { ...this.state, faceIsolation: on };
    this.emit();
  }

  setCompareBaseline(baseline: Record<string, number> | null) {
    this.state = { ...this.state, compareBaseline: baseline };
    this.emit();
  }

  /** Apply multiple fields in one emission (atomic UI update). */
  patch(partial: Partial<GasperSelectionState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  static readonly EMBODIMENTS = EMBODIMENTS;
}

export const gasperSelection = new GasperSelectionModel();
