/**
 * GasperField — normalized 25×40 cage API for UI, MCP, and authoring.
 * C = Γ(L) + Σs_i. Looks are captured 1000-float embeddings, not remeshes.
 */
import { SCAFFOLD_RINGS, SCAFFOLD_SECTORS, SCAFFOLD_VERTEX_COUNT } from "./AdaptiveShellScaffold";
import { goosePivot } from "./GoosebumpsField";
import {
  FABRIC_MORPH_IDS,
  type FabricMorphId,
  createFabricState,
  fabricPeak,
  publishFabric,
  setMorph,
  setRegion,
  tickFabric,
  type FabricState,
} from "./FabricSolver";
import { FABRIC_REGION_IDS, type FabricRegionId } from "./FabricRegions";
import { rotateScaffoldField, spinScaffoldField } from "./HexFieldRotate";
import { shadeMesh, loftXYZFromHull } from "./SurfaceShader";
import { cageShadeCanvas } from "./CageShadePass";

export const GASPER_FIELD_SCHEMA = "gasper.field.api.v1" as const;
export const GASPER_LOOKS_KEY = "gasper.field.looks.v1";

export type FieldMode = "protrude" | "bas-relief" | "engrave";

export type SavedLook = {
  id: string;
  label: string;
  note?: string;
  kind: "embodiment-look";
  samples: number[];
  savedAt: string;
};

type Host = {
  __GASPER_CAPTURED_FIELD__?: Float32Array;
  __GASPER_SHOW_GRID__?: boolean;
  __GASPER_FIELD_SCULPT__?: boolean;
  GasperField?: GasperFieldSurface;
};

function host(): Host {
  return globalThis as Host;
}

let fabricState: FabricState | null = null;

export function fabric(): FabricState {
  if (!fabricState) {
    fabricState = createFabricState();
    publishFabric(fabricState);
  }
  return fabricState;
}

export function capturedField(): Float32Array {
  const h = host();
  if (!h.__GASPER_CAPTURED_FIELD__ || h.__GASPER_CAPTURED_FIELD__.length !== SCAFFOLD_VERTEX_COUNT) {
    h.__GASPER_CAPTURED_FIELD__ = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  }
  return h.__GASPER_CAPTURED_FIELD__;
}

export function fieldClear(): void {
  capturedField().fill(0);
  const st = fabric();
  setMorph(st, "rest", 0);
  st.live.fill(0);
  for (const id of FABRIC_REGION_IDS) setRegion(st, id, { inflate: 0, isolated: false });
  publishFabric(st);
  const h = host() as Host & { __GASPER_LIVE_COEFFS__?: { scaffold?: { scaffoldCoupling?: number; pressure?: number } } };
  if (!h.__GASPER_LIVE_COEFFS__) h.__GASPER_LIVE_COEFFS__ = {};
  h.__GASPER_LIVE_COEFFS__.scaffold = { ...(h.__GASPER_LIVE_COEFFS__.scaffold ?? {}), scaffoldCoupling: 0, pressure: 0 };
}

export function fieldSculpt(input: {
  u: number;
  v: number;
  radius?: number;
  amplitude?: number;
}): { peak: number } {
  const u = wrap01(Number(input.u));
  const v = clamp01(Number(input.v));
  const radius = Math.max(0.02, Math.min(0.45, Number(input.radius) || 0.12));
  const amp = Math.max(-2.5, Math.min(2.5, Number(input.amplitude) || 0.6));
  const field = capturedField();
  const su = radius;
  const sv = radius * 1.15;
  for (let ring = 0; ring < SCAFFOLD_RINGS; ring++) {
    const vv = ring / (SCAFFOLD_RINGS - 1);
    const dv = (vv - v) / sv;
    for (let s = 0; s < SCAFFOLD_SECTORS; s++) {
      let du = Math.abs(s / SCAFFOLD_SECTORS - u);
      if (du > 0.5) du = 1 - du;
      du /= su;
      field[ring * SCAFFOLD_SECTORS + s] += amp * Math.exp(-0.5 * (du * du + dv * dv));
    }
  }
  return { peak: fieldPeak(field) };
}

export function fieldSetVertex(index: number, height: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= SCAFFOLD_VERTEX_COUNT) return;
  capturedField()[index] = Math.max(-3, Math.min(3, height));
}

export function rasterGlyph(glyph: string, amplitude: number): Float32Array {
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  if (typeof document === "undefined") return out;
  const text = String(glyph || "?").slice(0, 3);
  const canvas = document.createElement("canvas");
  canvas.width = SCAFFOLD_SECTORS;
  canvas.height = SCAFFOLD_RINGS;
  const ctx = canvas.getContext("2d");
  if (!ctx) return out;
  ctx.clearRect(0, 0, SCAFFOLD_SECTORS, SCAFFOLD_RINGS);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(SCAFFOLD_RINGS * 0.72)}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, SCAFFOLD_SECTORS / 2, SCAFFOLD_RINGS / 2 + 0.5);
  const img = ctx.getImageData(0, 0, SCAFFOLD_SECTORS, SCAFFOLD_RINGS).data;
  const sign = amplitude < 0 ? -1 : 1;
  const mag = Math.min(2.4, Math.abs(amplitude) || 0.85);
  for (let r = 0; r < SCAFFOLD_RINGS; r++) {
    for (let s = 0; s < SCAFFOLD_SECTORS; s++) {
      const a = img[(r * SCAFFOLD_SECTORS + s) * 4 + 3] / 255;
      out[(SCAFFOLD_RINGS - 1 - r) * SCAFFOLD_SECTORS + s] = a * mag * sign;
    }
  }
  return out;
}

export function fieldStampGlyph(input: {
  glyph?: string;
  amplitude?: number;
  mode?: FieldMode;
  replace?: boolean;
}): { peak: number; mode: FieldMode; glyph: string } {
  const mode = input.mode ?? "protrude";
  const glyph = String(input.glyph || "?").slice(0, 3);
  let amp = Number(input.amplitude);
  if (!Number.isFinite(amp)) amp = mode === "engrave" ? -0.7 : mode === "bas-relief" ? 0.55 : 0.95;
  if (mode === "engrave" && amp > 0) amp = -amp;
  if (mode === "bas-relief") amp = Math.sign(amp || 1) * Math.min(0.7, Math.abs(amp));
  const stamp = rasterGlyph(glyph, amp);
  const field = capturedField();
  if (input.replace !== false) field.fill(0);
  for (let i = 0; i < field.length; i++) field[i] += stamp[i] ?? 0;
  const h = host() as Host & { __GASPER_SCAFFOLD_AUTHORITY__?: Record<string, number>; __GASPER_LIVE_COEFFS__?: { scaffold?: { scaffoldCoupling?: number } } };
  h.__GASPER_SCAFFOLD_AUTHORITY__ = { ...(h.__GASPER_SCAFFOLD_AUTHORITY__ ?? {}), coupling: 0.7 };
  if (!h.__GASPER_LIVE_COEFFS__) h.__GASPER_LIVE_COEFFS__ = {};
  h.__GASPER_LIVE_COEFFS__.scaffold = { ...(h.__GASPER_LIVE_COEFFS__.scaffold ?? {}), scaffoldCoupling: 0.7 };
  return { peak: fieldPeak(field), mode, glyph };
}

export function fieldSnapshot(): { samples: number[]; peak: number; count: number } {
  const field = capturedField();
  return { samples: Array.from(field), peak: fieldPeak(field), count: field.length };
}

export function fieldApply(samples: ArrayLike<number>): { peak: number } {
  const field = capturedField();
  field.fill(0);
  const n = Math.min(field.length, samples.length);
  for (let i = 0; i < n; i++) field[i] = Number(samples[i]) || 0;
  return { peak: fieldPeak(field) };
}

export function fieldRotate(input: {
  turns?: number;
  u?: number;
  v?: number;
  axis?: "hex" | "pole";
}): { peak: number; turns: number; axis: "hex" | "pole" } {
  const turns = Number.isFinite(Number(input.turns)) ? Math.round(Number(input.turns)) : 1;
  const axis = input.axis === "hex" ? "hex" : "pole";
  if (axis === "hex") {
    const u = Number.isFinite(Number(input.u)) ? Number(input.u) : 0.18;
    const v = Number.isFinite(Number(input.v)) ? Number(input.v) : 0.38;
    const pivot =
      Number.isFinite(Number(input.u)) || Number.isFinite(Number(input.v))
        ? uvToCube(u, v, 10, 4)
        : goosePivot();
    capturedField().set(rotateScaffoldField(capturedField(), turns, pivot));
  } else {
    capturedField().set(spinScaffoldField(capturedField(), turns * 4));
  }
  return { peak: fieldPeak(capturedField()), turns: ((turns % 6) + 6) % 6, axis };
}

export function listLooks(): SavedLook[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(GASPER_LOOKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isLook) : [];
  } catch {
    return [];
  }
}

export function saveLook(input: { label: string; note?: string; id?: string }): SavedLook {
  const looks = listLooks();
  const snap = fieldSnapshot();
  const look: SavedLook = {
    id: input.id || `look-${Date.now().toString(36)}`,
    label: String(input.label || "Untitled").slice(0, 48),
    note: input.note ? String(input.note).slice(0, 160) : undefined,
    kind: "embodiment-look",
    samples: snap.samples,
    savedAt: new Date().toISOString(),
  };
  const next = [look, ...looks.filter((l) => l.id !== look.id)].slice(0, 24);
  persistLooks(next);
  return look;
}

export function loadLook(id: string): SavedLook | null {
  const look = listLooks().find((l) => l.id === id) ?? null;
  if (look) fieldApply(look.samples);
  return look;
}

export function deleteLook(id: string): boolean {
  const next = listLooks().filter((l) => l.id !== id);
  persistLooks(next);
  return next.length !== listLooks().length + 1 || true;
}

export function showGrid(on: boolean): void {
  host().__GASPER_SHOW_GRID__ = !!on;
  if (!on && typeof document !== "undefined") {
    const g = document.getElementById("scaffoldGridLayer");
    if (g) {
      g.setAttribute("opacity", "0");
      for (const node of g.querySelectorAll("path")) node.setAttribute("d", "");
    }
  }
}

export function setSculpt(on: boolean): void {
  host().__GASPER_FIELD_SCULPT__ = !!on;
}

export type GasperFieldSurface = {
  schema: typeof GASPER_FIELD_SCHEMA;
  vertexCount: typeof SCAFFOLD_VERTEX_COUNT;
  rings: typeof SCAFFOLD_RINGS;
  sectors: typeof SCAFFOLD_SECTORS;
  law: "C=Γ(L)+Σs_i";
  showGrid: typeof showGrid;
  setSculpt: typeof setSculpt;
  clear: typeof fieldClear;
  sculpt: typeof fieldSculpt;
  setVertex: typeof fieldSetVertex;
  protrude: (input: { glyph?: string; amplitude?: number }) => ReturnType<typeof fieldStampGlyph>;
  basRelief: (input: { glyph?: string; amplitude?: number }) => ReturnType<typeof fieldStampGlyph>;
  engrave: (input: { glyph?: string; amplitude?: number }) => ReturnType<typeof fieldStampGlyph>;
  snapshot: typeof fieldSnapshot;
  apply: typeof fieldApply;
  rotate: typeof fieldRotate;
  morph: (id: FabricMorphId, amplitude?: number) => { morph: FabricMorphId; peak: number };
  isolate: (id: FabricRegionId, on?: boolean) => { id: FabricRegionId; isolated: boolean };
  inflate: (id: FabricRegionId, amount: number) => { id: FabricRegionId; inflate: number };
  setTau: (id: FabricRegionId, tau: number) => { id: FabricRegionId; tau: number };
  tick: (dt?: number) => { peak: number; morph: FabricMorphId };
  saveLook: typeof saveLook;
  listLooks: typeof listLooks;
  loadLook: typeof loadLook;
  deleteLook: typeof deleteLook;
  describe: () => {
    schema: typeof GASPER_FIELD_SCHEMA;
    peak: number;
    looks: Array<{ id: string; label: string }>;
    grid: boolean;
    sculpt: boolean;
    lod: number;
    verts: number;
    morph: FabricMorphId;
  };
};

export function mountGasperField(): GasperFieldSurface {
  const api: GasperFieldSurface = {
    schema: GASPER_FIELD_SCHEMA,
    vertexCount: SCAFFOLD_VERTEX_COUNT,
    rings: SCAFFOLD_RINGS,
    sectors: SCAFFOLD_SECTORS,
    law: "C=Γ(L)+Σs_i",
    showGrid,
    setSculpt,
    clear: fieldClear,
    sculpt: fieldSculpt,
    setVertex: fieldSetVertex,
    protrude: (input) => fieldStampGlyph({ ...input, mode: "protrude" }),
    basRelief: (input) => fieldStampGlyph({ ...input, mode: "bas-relief" }),
    engrave: (input) => fieldStampGlyph({ ...input, mode: "engrave" }),
    snapshot: fieldSnapshot,
    apply: fieldApply,
    rotate: fieldRotate,
    morph: (id, amplitude) => {
      showGrid(false);
      const st = fabric();
      setMorph(st, id, amplitude);
      tickFabric(st, 1 / 30);
      return { morph: st.morph, peak: fabricPeak(st.live) };
    },
    isolate: (id, on = true) => {
      setRegion(fabric(), id, { isolated: !!on });
      return { id, isolated: fabric().regions[id].isolated };
    },
    inflate: (id, amount) => {
      setRegion(fabric(), id, { inflate: Math.max(-2, Math.min(2, amount)) });
      return { id, inflate: fabric().regions[id].inflate };
    },
    setTau: (id, tau) => {
      setRegion(fabric(), id, { tau: Math.max(0.02, Math.min(0.8, tau)) });
      return { id, tau: fabric().regions[id].tau };
    },
    tick: (dt) => {
      const st = fabric();
      tickFabric(st, dt ?? 1 / 60);
      return { peak: fabricPeak(st.live), morph: st.morph };
    },
    saveLook,
    listLooks,
    loadLook,
    deleteLook,
    describe: () => ({
      schema: GASPER_FIELD_SCHEMA,
      peak: fieldPeak(capturedField()),
      looks: listLooks().map((l) => ({ id: l.id, label: l.label })),
      grid: !!host().__GASPER_SHOW_GRID__,
      sculpt: !!host().__GASPER_FIELD_SCULPT__,
      lod: fabric().lod,
      verts: fabric().rings * fabric().sectors,
      morph: fabric().morph,
    }),
  };
  host().GasperField = api;
  cageShadeCanvas();
  (host() as Host & { __GASPER_SHADE_LOFT__?: typeof shadeMesh }).__GASPER_SHADE_LOFT__ = (
    xy: Float32Array,
    rings: number,
    sectors: number,
    yaw: number,
    cx: number,
    cy: number,
  ) => {
    const xyz = loftXYZFromHull(xy, rings, sectors, cx, cy);
    return shadeMesh(xyz, rings, sectors, yaw);
  };
  return api;
}

export function dispatchField(method: string, args: Record<string, unknown> = {}): unknown {
  const api = host().GasperField ?? mountGasperField();
  switch (method) {
    case "manifest":
    case "describe":
      return api.describe();
    case "clear":
      api.clear();
      return api.describe();
    case "sculpt":
      return api.sculpt({
        u: Number(args.u),
        v: Number(args.v),
        radius: args.radius != null ? Number(args.radius) : undefined,
        amplitude: args.amplitude != null ? Number(args.amplitude) : undefined,
      });
    case "protrude":
      return api.protrude({ glyph: String(args.glyph ?? "?"), amplitude: Number(args.amplitude) });
    case "basRelief":
    case "bas_relief":
      return api.basRelief({ glyph: String(args.glyph ?? "?"), amplitude: Number(args.amplitude) });
    case "engrave":
      return api.engrave({ glyph: String(args.glyph ?? "?"), amplitude: Number(args.amplitude) });
    case "showGrid":
      api.showGrid(!!args.on);
      return api.describe();
    case "setSculpt":
      api.setSculpt(!!args.on);
      return api.describe();
    case "snapshot":
      return api.snapshot();
    case "apply":
      return api.apply((args.samples as number[]) || []);
    case "rotate":
      return api.rotate({
        turns: args.turns != null ? Number(args.turns) : 1,
        u: args.u != null ? Number(args.u) : undefined,
        v: args.v != null ? Number(args.v) : undefined,
        axis: args.axis === "hex" ? "hex" : "pole",
      });
    case "saveLook":
      return api.saveLook({ label: String(args.label ?? "Look"), note: args.note ? String(args.note) : undefined });
    case "listLooks":
      return api.listLooks().map(({ samples: _s, ...rest }) => rest);
    case "loadLook":
      return api.loadLook(String(args.id ?? ""));
    case "deleteLook":
      return { ok: api.deleteLook(String(args.id ?? "")) };
    case "morph": {
      const id = FABRIC_MORPH_IDS.includes(args.id as FabricMorphId)
        ? (args.id as FabricMorphId)
        : "puff";
      return api.morph(id, args.amplitude != null ? Number(args.amplitude) : 1);
    }
    case "isolate":
      return api.isolate(String(args.id) as FabricRegionId, args.on !== false);
    case "inflate":
      return api.inflate(String(args.id) as FabricRegionId, Number(args.amount));
    case "setTau":
      return api.setTau(String(args.id) as FabricRegionId, Number(args.tau));
    case "tick":
      return api.tick(args.dt != null ? Number(args.dt) : undefined);
    default:
      throw new Error(`unknown field method: ${method}`);
  }
}

function persistLooks(looks: SavedLook[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(GASPER_LOOKS_KEY, JSON.stringify(looks));
}

function isLook(value: unknown): value is SavedLook {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedLook;
  return typeof v.id === "string" && typeof v.label === "string" && Array.isArray(v.samples);
}

function fieldPeak(field: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < field.length; i++) {
    const a = Math.abs(field[i] ?? 0);
    if (a > peak) peak = a;
  }
  return peak;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n <= 0 ? 0 : n >= 1 ? 1 : n;
}

function wrap01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const w = n - Math.floor(n);
  return w < 0 ? w + 1 : w;
}
