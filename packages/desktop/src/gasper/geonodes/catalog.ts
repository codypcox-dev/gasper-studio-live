/**
 * Honest inventory of every Gasper organ.
 * LIVE = writes the painted #body this frame.
 * TWIN = same math, not the paint path.
 * UNHOOKED = exists, not mounted.
 * DEAD = leftover / opacity 0 / gated off.
 */
export type OrganStatus = "LIVE" | "TWIN" | "UNHOOKED" | "DEAD";

export type OrganKind =
  | "cage"
  | "grid"
  | "animation"
  | "physics"
  | "renderer"
  | "view"
  | "controller"
  | "take"
  | "ui";

export type Organ = {
  id: string;
  kind: OrganKind;
  label: string;
  status: OrganStatus;
  lock?: string;
  file: string;
  note: string;
};

export const GASPER_ORGANS: readonly Organ[] = [
  { id: "contour-512", kind: "cage", label: "512 contour", status: "LIVE", lock: "512", file: "assets/all-script-3.js", note: "Silhouette samples. Sole hull." },
  { id: "lattice-360", kind: "cage", label: "360/672 lattice", status: "LIVE", lock: "360/672", file: "assets/all-script-3.js", note: "Interior mass + face anchors." },
  { id: "relief-1000", kind: "cage", label: "25×40 relief", status: "LIVE", lock: "1000", file: "scaffold/AdaptiveShellScaffold.ts", note: "Pressure / goose / regions. Rim 24 may push 512." },
  { id: "topology-lock", kind: "cage", label: "Topology lock", status: "LIVE", lock: "512/360/672/1000", file: "GasperTopologyLock.ts", note: "Never remesh." },
  { id: "scaffold-z", kind: "grid", label: "Scaffold Z", status: "LIVE", file: "assets/all-script-3.js", note: "scaffoldContourZ on the 512." },
  { id: "paint-grid", kind: "grid", label: "Painted cage grid", status: "LIVE", file: "assets/all-script-3.js", note: "__GASPER_SHOW_GRID__. Skin, not overlay." },
  { id: "hex-cube", kind: "grid", label: "Hex cube field", status: "TWIN", file: "scaffold/HexCube.ts", note: "Rotate/spin helpers. Not the hull." },
  { id: "contour-solver", kind: "cage", label: "gaspContourSolver", status: "UNHOOKED", file: "GasperContourSolver.ts", note: "Firewall. Does not paint." },
  { id: "adaptive-shell", kind: "cage", label: "AdaptiveShellScaffold", status: "UNHOOKED", file: "scaffold/AdaptiveShellScaffold.ts", note: "Book 009 contract. Twin." },
  { id: "arap", kind: "physics", label: "ARAP energy", status: "UNHOOKED", file: "scaffold/ArapSolver.ts", note: "Rest-shape projector. Not a physics engine. Not on the paint path." },
  { id: "fabric-solver", kind: "physics", label: "FabricSolver", status: "TWIN", file: "scaffold/FabricSolver.ts", note: "Per-vert τ field. Thrown away at rest." },
  { id: "stance", kind: "physics", label: "Stance sockets", status: "LIVE", file: "physics/StanceInstrument.ts", note: "Two feet + cleft. Dual-foot hold." },
  { id: "gait-law", kind: "physics", label: "GaitLaw", status: "LIVE", file: "physics/GaitLaw.ts", note: "Phase, Hz, plant carriers." },
  { id: "support", kind: "physics", label: "SupportExchange", status: "LIVE", file: "physics/SupportExchange.ts", note: "hold = tanh(k cos φ/2)." },
  { id: "voigt", kind: "physics", label: "Kelvin–Voigt _lp", status: "LIVE", file: "assets/all-script-3.js", note: "τ on the 512 after handles." },
  { id: "kappa", kind: "physics", label: "κ-box", status: "LIVE", file: "physics/KappaBox.ts", note: "G¹ cap 0.90. Lower hemisphere." },
  { id: "world-driver", kind: "controller", label: "WorldPhysicsDriver", status: "LIVE", file: "physics/WorldPhysicsDriver.ts", note: "COM, gaitGate, first-stroke phase." },
  { id: "radial-facing", kind: "view", label: "RadialFacing / Adobe 2.5D", status: "LIVE", file: "physics/RadialFacingLaw.ts", note: "Continuous yaw. No card squash." },
  { id: "orbit", kind: "view", label: "Orbit yaw/pitch", status: "LIVE", file: "assets/all-script-3.js", note: "Separate from identity yaw=8." },
  { id: "formmaster", kind: "renderer", label: "FormMaster v6.5.5", status: "LIVE", file: "assets/all-script-3.js", note: "Sole #body writer via closedSpline." },
  { id: "closed-spline", kind: "renderer", label: "closedSpline C¹", status: "LIVE", file: "assets/all-script-3.js", note: "Catmull-Rom τ=1/6. Only d." },
  { id: "pearl", kind: "renderer", label: "Pearl layer stack", status: "LIVE", file: "assets/all-script-3.js", note: "bodyBase, opticalDepth, crown bloom." },
  { id: "surface-shader", kind: "renderer", label: "SurfaceShader", status: "TWIN", file: "scaffold/SurfaceShader.ts", note: "Cage normals. Shade loft." },
  { id: "cage-light", kind: "renderer", label: "CageLight", status: "TWIN", file: "scaffold/CageLight.ts", note: "Not the SVG fills." },
  { id: "hard-highlights", kind: "renderer", label: "Hard highlights", status: "DEAD", file: "assets/all-script-3.js", note: "muteHardHighlights. Opacity 0." },
  { id: "ribbons", kind: "renderer", label: "Ribbon lobes", status: "DEAD", file: "assets/all-script-3.js", note: "Ears/lobes outside grid. Killed." },
  { id: "path-take", kind: "take", label: "PathEmbeddingTake", status: "LIVE", file: "takes/PathEmbeddingTake.ts", note: "512 floats. No d strings." },
  { id: "northstar-20", kind: "take", label: "Northstar 20s", status: "LIVE", file: "takes/NorthstarTwentyTake.ts", note: "Scored walk take." },
  { id: "gsap", kind: "animation", label: "GSAP tracks", status: "LIVE", file: "GasperGsapTrackOrchestrator.ts", note: "Face / energy. Not the hull." },
  { id: "eight-state", kind: "animation", label: "Eight-state loop", status: "LIVE", file: "eight-state-loop/EightStateLoopController.ts", note: "Presence grammar." },
  { id: "curve-track", kind: "animation", label: "CurveTrack Hermite", status: "LIVE", file: "curves/CurveTrack.ts", note: "Takes. C¹ in time." },
  { id: "field-api", kind: "controller", label: "GasperFieldApi", status: "LIVE", file: "scaffold/GasperFieldApi.ts", note: "25×40 API for UI/MCP." },
  { id: "rig-controller", kind: "controller", label: "GasperRigController", status: "LIVE", file: "GasperRigController.ts", note: "Takes, play, inspect." },
  { id: "machine", kind: "controller", label: "State machine", status: "LIVE", file: "machine/GasperStateMachine.ts", note: "Three regions. Flags only. No d." },
  { id: "instrument", kind: "ui", label: "Instrument table", status: "DEAD", file: "dais-first/InstrumentTable.tsx", note: "Unmounted sliders. Leftover." },
  { id: "lumen", kind: "ui", label: "Lumen glass", status: "DEAD", file: "dais-first/LumenGlass.tsx", note: "Unmounted Play / Rec / Orbit pills." },
  { id: "worldclass", kind: "ui", label: "WorldClass shell", status: "DEAD", file: "studio/worldclass/", note: "CSS-corpsed Operate / Form / Motion chrome." },
  { id: "geonode-editor", kind: "ui", label: "GeoNode editor", status: "DEAD", file: "dais-first/GeoNodeEditor.tsx", note: "Unmounted editor. Leftover." },
  { id: "authoring-atlas", kind: "ui", label: "Authoring atlas", status: "DEAD", file: "dais-first/AuthoringAtlas.tsx", note: "Unmounted atlas. Leftover." },
  { id: "dais-control-rail", kind: "ui", label: "Dais control rail", status: "DEAD", file: "dais-first/DaisControlRail.tsx", note: "Unmounted this wave." },
  { id: "dais-transport-bar", kind: "ui", label: "Dais transport bar", status: "DEAD", file: "dais-first/DaisTransportBar.tsx", note: "Unmounted this wave." },
  { id: "machine-strip", kind: "ui", label: "Machine strip", status: "DEAD", file: "dais-first/MachineStrip.tsx", note: "Unmounted leftover strip." },
  { id: "studio-desk", kind: "ui", label: "Studio desk", status: "LIVE", file: "dais-first/StudioDesk.tsx", note: "Theater desk. Mounts in DaisFirstStageHost. Not a Cook card." },
  { id: "node-graph-page", kind: "ui", label: "Node graph page", status: "LIVE", file: "dais-first/NodeGraphPage.tsx", note: "Graph workspace. Not a Cook card." },
  { id: "studio-transport", kind: "ui", label: "Studio transport", status: "LIVE", file: "dais-first/StudioTransport.tsx", note: "Single playhead. Not a Cook card." },
  { id: "couple", kind: "physics", label: "Couple", status: "LIVE", file: "geonodes/coupling.ts", note: "Driven keys. Hz→τ, gate→lift, yaw→pearl, k→τ." },
  { id: "paddle", kind: "animation", label: "Paddle mesh", status: "UNHOOKED", file: "scaffold/PaddleMesh.ts", note: "UV snap. Not live hull." },
  { id: "walk-scaffold", kind: "animation", label: "walkScaffoldZ", status: "DEAD", file: "assets/all-script-3.js", note: "Gated off under physics-authority." },
] as const;

/** Chrome is catalogued for honesty. It is not a Cook card. */
export function isCookOrgan(o: Pick<Organ, "kind">): boolean {
  return o.kind !== "ui";
}

export const COOK_ORGANS: readonly Organ[] = GASPER_ORGANS.filter(isCookOrgan);

export const LIVE_PIPELINE = [
  "contour-512",
  "relief-1000",
  "stance",
  "gait-law",
  "voigt",
  "kappa",
  "orbit",
  "pearl",
  "closed-spline",
] as const;
