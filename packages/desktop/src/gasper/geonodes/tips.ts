import { GASPER_ORGANS } from "./catalog";
import { PILLARS, type PillarId } from "./pillars";
import type { GraphNode } from "./types";

const CARD: Record<string, string> = {
  identity:
    "Identity — the 512-sample silhouette. This is Gasper’s outline. Foot nub and cleft set the W at the floor. Locked: mute it and there is no body.",
  "contour-512":
    "Identity — the 512-sample silhouette. Sole hull. Foot nub / cleft shape the W. Locked.",
  cage:
    "Cage 25×40 — 1000-point pressure field over the hull. Coupling pushes the rim. Grid toggle paints the meridians. This is the skin lattice, not a second body.",
  "relief-1000":
    "Cage 25×40 — 1000-point relief. Goose, pinch, and region pressure live here.",
  handles:
    "Handles — two feet + crotch sockets. Lift / Advance scale the swing. Dual-foot hold so the W never collapses to a U.",
  stance:
    "Handles — stance sockets. Same organ as Handles.",
  gait:
    "Gait — the step clock. Hz is how many plants per second (canonical 2.6). Phase φ ∈ [0,1). Does not draw; it times the kernel.",
  "gait-law":
    "GaitLaw — phase, Hz, plant carriers. Bob = ℓ(1−cos α).",
  support:
    "Support — plant gate. hold = tanh(k · cos(φ/2)). k is how hard a foot sticks before it lets go.",
  voigt:
    "Voigt τ — Kelvin–Voigt damper on the 512 after handles. σ = Eε + ηε̇. Low τ = solid legs. High τ = gel. Canonical lower τ = 0.05 s.",
  kappa:
    "κ-box — curvature cap. After Voigt, any rim turn sharper than θ_cap (0.90 rad) is pulled back. Kills leg spikes. G¹ only.",
  orbit:
    "Orbit — 3D turntable. Yaw ±180° around his face (home 8°). Pitch ±80°. Drives view yaw and cage loft. Center of the slider is canonical.",
  envelope:
    "Skeleton — 5-node body rig. Puff scales canal radii (1 = rest pearl). Collapse tucks plants. Hook bends the torso. Bones shows the gold Y. Rest stays the canonical 512 until a dial leaves zero.",
  pearl:
    "Pearl — dark-pearl material stack. Depth is interior volume / SSS. This is light on the cage, not a second skin.",
  hull:
    "Hull — closedSpline, Catmull-Rom τ = 1/6. The only writer of SVG path d. Locked: mute it and the renderer goes blank.",
  "closed-spline":
    "Hull — the only d. C¹ Catmull-Rom.",
  machine:
    "Machine — May I? Rest / Walk / Presence flags only. Never moves mass. Never draws.",
  "world-driver":
    "World driver — COM, first-stroke phase, gaitGate. Where the mass is. Tempo multiplies Hz.",
  "northstar-20":
    "Northstar 20s — scored walk take. Replays the authored 20-second sequence over time.",
  couple:
    "Couple — driven keys. Mix blends authored dials into physics laws: Hz→τ, gate→lift, yaw→pearl, k→τ. Park to isolate sliders.",
  "field-api":
    "Field API — 25×40 region API (pinch, bas-relief, MCP). Talks to the cage.",
  "radial-facing":
    "Facing — 2.5D radial yaw. 12-slice clock for telemetry; paint is continuous. Home 8°.",
  "eight-state":
    "Eight-state — presence grammar (listen, think, spark…). Flags the machine. Not a hull writer.",
  gsap:
    "GSAP — face / energy tracks. Animates expression, not the silhouette.",
  "path-take":
    "Path take — 512 floats over time. No d strings.",
  "curve-track":
    "CurveTrack — Hermite C¹ in time for takes.",
  "rig-controller":
    "Rig controller — play, inspect, bind takes.",
};

const PARAM: Record<string, string> = {
  footAmp: "Foot nub height. Canonical 4. Builds the W with cleft.",
  cleftDepth: "Crotch depth. Canonical 3.2. With footAmp this is the W, not a U.",
  coupling: "Cage-to-rim couple. 0 = field stays inside. + pushes nubs. − sucks them in.",
  grid: "Paint the 25×40 meridians on the skin.",
  lift: "Swing height of the planted handles. 1 is canonical.",
  advance: "How far a swing foot leads. 1 is canonical.",
  hz: "Steps per second. Canonical 2.6. Faster also stiffens τ via Couple.",
  live: "Arm the gait clock. 0 parks phase.",
  k: "Plant stiffness. hold = tanh(k cos φ/2).",
  tau: "Kelvin–Voigt time constant. σ = Eε + ηε̇. Low = solid. High = gel.",
  rest: "τ while standing. Canonical 0.42.",
  cap: "Max rim turn in radians. 0.90 kills spikes.",
  gate: "Gait gate / machine flag. 1 allows walk.",
  yaw: "Turntable yaw in degrees. Center = home 8°. Full tilt ±180°.",
  pitch: "Turntable pitch. Center 0. Full tilt ±80°.",
  depth: "Pearl optical depth / SSS. Canonical 0.72.",
  mix: "How hard Couple laws push. 0 = authored dials only.",
  play: "Arm the Northstar 20s take.",
  spec: "Specular response on the cage.",
  rScale: "Puff. 1 = rest pearl. 1.07 = blowfish. Regularity clamp keeps tubes legal.",
  collapse: "Tuck plants toward the crotch. 0 = rest feet. 1 = paddle.",
  hook: "Bend the torso sideways in px. 0 = rest. ±18 is the question look.",
  bones: "Show the gold 5-node Y. Off at rest. Independent of the grid toggle.",
};

const UI: Record<string, string> = {
  zoomOut: "Zoom out. Also Ctrl −.",
  fit: "Fit all columns. Shortcut: F or Ctrl 0.",
  zoomIn: "Zoom in. Also Ctrl +.",
  compile: "Reset columns and reseat live cards.",
  cook: "Flash the cook order. Kahn topological pass.",
  undo: "Undo. Ctrl Z.",
  redo: "Redo. Ctrl Shift Z.",
  mute: "Park this card. Delete also parks. Esc clears selection.",
  lock: "Locked. Identity and Hull cannot be parked.",
  portIn: "Input. Drag from an output onto this.",
  portOut: "Output. Drag to another card’s input.",
  browser: "Parked organs. Click to seat, or drag onto the matching column.",
  monitor: "Drag the title to move. Grid paints his skin meridians. The bar scrubs the loop.",
  busMayI: "Machine → Kernel. Permission before mass.",
  busMass: "Kernel → Cook. Mass becomes a silhouette.",
  busSil: "Cook → Painter. Draw that silhouette once.",
  busFrame: "Painter → Score. A frame can be replayed.",
  busAgain: "Score → Machine. The loop closes.",
};

export function tipForNode(n: Pick<GraphNode, "id" | "organId" | "label">): string {
  return CARD[n.id] ?? CARD[n.organId] ?? GASPER_ORGANS.find((o) => o.id === n.organId)?.note ?? n.label;
}

export function tipForParam(id: string): string {
  return PARAM[id] ?? id;
}

export function tipForPillar(id: PillarId | string): string {
  const p = PILLARS.find((x) => x.id === id);
  if (!p) return String(id);
  return `${p.label} — ${p.law} ${p.allow} ${p.refuse}`;
}

export function tipForUi(id: string): string {
  return UI[id] ?? id;
}
