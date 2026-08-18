import { GASPER_ORGANS, type Organ, type OrganStatus } from "./catalog";
import type { NodeClass, NodeParam, NodeTypeId, RigElement, RigEvent, SocketType } from "./types";

export type NodeBlueprint = {
  typeId: NodeTypeId;
  idPrefix: string;
  class: NodeClass;
  label: string;
  organId: string;
  status: OrganStatus;
  note: string;
  element: RigElement;
  event: RigEvent;
  inType: SocketType;
  outType: SocketType;
  params: NodeParam[];
};

const PIPELINE_TYPE: Record<string, NodeTypeId> = {
  "contour-512": "input.identity",
  "relief-1000": "input.cage",
  stance: "deform.handles",
  "gait-law": "physics.gait",
  voigt: "physics.voigt",
  kappa: "deform.kappa",
  orbit: "view.orbit",
  pearl: "shade.pearl",
  "closed-spline": "output.hull",
};

const PIPELINE_ID: Record<string, string> = {
  "contour-512": "identity",
  "relief-1000": "cage",
  stance: "handles",
  "gait-law": "gait",
  voigt: "voigt",
  kappa: "kappa",
  orbit: "orbit",
  pearl: "pearl",
  "closed-spline": "hull",
};

const CLASS_OF: Record<string, NodeClass> = {
  "contour-512": "input",
  "relief-1000": "input",
  stance: "geometry",
  "gait-law": "physics",
  voigt: "physics",
  kappa: "geometry",
  orbit: "view",
  pearl: "shade",
  "closed-spline": "output",
};

type Meta = {
  element: RigElement;
  event: RigEvent;
  inType: SocketType;
  outType: SocketType;
  params: NodeParam[];
};

const META: Record<string, Meta> = {
  "contour-512": { element: "bone", event: "construction", inType: "scalar", outType: "contour", params: [
    { id: "footAmp", label: "Foot nub", min: 0, max: 8, step: 0.1, value: 4, base: 4 },
    { id: "cleftDepth", label: "Cleft", min: 0, max: 6.4, step: 0.1, value: 3.2, base: 3.2 },
  ]},
  "lattice-360": { element: "bone", event: "construction", inType: "contour", outType: "lattice", params: [
    { id: "mass", label: "Mass", min: 0, max: 2, step: 0.05, value: 1 },
  ]},
  "relief-1000": { element: "bone", event: "forwards", inType: "scalar", outType: "relief", params: [
    { id: "coupling", label: "Rim couple", min: -2, max: 2, step: 0.05, value: 0, base: 0 },
    { id: "grid", label: "Grid", min: 0, max: 1, step: 1, value: 1 },
  ]},
  "topology-lock": { element: "null", event: "construction", inType: "contour", outType: "contour", params: [
    { id: "lock", label: "Lock", min: 0, max: 1, step: 1, value: 1 },
  ]},
  "scaffold-z": { element: "bone", event: "dynamics", inType: "contour", outType: "contour", params: [
    { id: "gain", label: "Z gain", min: 0, max: 2, step: 0.05, value: 1 },
  ]},
  "paint-grid": { element: "bone", event: "forwards", inType: "scalar", outType: "contour", params: [
    { id: "show", label: "Show", min: 0, max: 1, step: 1, value: 0 },
  ]},
  "hex-cube": { element: "null", event: "forwards", inType: "scalar", outType: "relief", params: [
    { id: "spin", label: "Spin", min: 0, max: 6, step: 1, value: 0 },
  ]},
  "contour-solver": { element: "bone", event: "construction", inType: "contour", outType: "contour", params: [
    { id: "firewall", label: "Firewall", min: 0, max: 1, step: 1, value: 1 },
  ]},
  "adaptive-shell": { element: "bone", event: "forwards", inType: "relief", outType: "relief", params: [
    { id: "rings", label: "Rings", min: 8, max: 40, step: 1, value: 25 },
  ]},
  arap: { element: "bone", event: "dynamics", inType: "contour", outType: "contour", params: [
    { id: "iters", label: "Iters", min: 1, max: 16, step: 1, value: 4 },
  ]},
  "fabric-solver": { element: "bone", event: "dynamics", inType: "contour", outType: "contour", params: [
    { id: "tau", label: "τ field", min: 0.02, max: 0.8, step: 0.01, value: 0.12 },
  ]},
  stance: { element: "control", event: "forwards", inType: "phase", outType: "pose", params: [
    { id: "lift", label: "Lift", min: 0, max: 2, step: 0.01, value: 1, base: 1 },
    { id: "advance", label: "Advance", min: 0, max: 2, step: 0.01, value: 1, base: 1 },
  ]},
  "gait-law": { element: "control", event: "forwards", inType: "scalar", outType: "phase", params: [
    { id: "hz", label: "Hz", min: 0.6, max: 4.6, step: 0.05, value: 2.6, base: 2.6 },
    { id: "live", label: "Live", min: 0, max: 1, step: 1, value: 1 },
  ]},
  support: { element: "control", event: "forwards", inType: "phase", outType: "phase", params: [
    { id: "k", label: "Plant k", min: 1, max: 11, step: 0.1, value: 6, base: 6 },
  ]},
  voigt: { element: "bone", event: "dynamics", inType: "contour", outType: "contour", params: [
    { id: "tau", label: "τ lower", min: 0.02, max: 0.08, step: 0.01, value: 0.05, base: 0.05 },
    { id: "rest", label: "τ rest", min: 0.20, max: 0.64, step: 0.01, value: 0.42, base: 0.42 },
  ]},
  kappa: { element: "bone", event: "dynamics", inType: "contour", outType: "contour", params: [
    { id: "cap", label: "θ cap", min: 0.4, max: 1.4, step: 0.02, value: 0.9, base: 0.9 },
  ]},
  "world-driver": { element: "control", event: "forwards", inType: "phase", outType: "phase", params: [
    { id: "gate", label: "Gait gate", min: 0, max: 2, step: 0.01, value: 1, base: 1 },
  ]},
  "radial-facing": { element: "view", event: "forwards", inType: "scalar", outType: "pose", params: [
    { id: "yaw", label: "Facing", min: -180, max: 180, step: 1, value: 8, base: 8 },
  ]},
  orbit: { element: "control", event: "forwards", inType: "scalar", outType: "pose", params: [
    { id: "yaw", label: "Yaw", min: -180, max: 180, step: 1, value: 8, base: 8 },
    { id: "pitch", label: "Pitch", min: -80, max: 80, step: 1, value: 0, base: 0 },
  ]},
  formmaster: { element: "bone", event: "construction", inType: "contour", outType: "contour", params: [
    { id: "authority", label: "Authority", min: 0, max: 1, step: 1, value: 1 },
  ]},
  "closed-spline": { element: "bone", event: "forwards", inType: "contour", outType: "contour", params: [] },
  pearl: { element: "view", event: "forwards", inType: "contour", outType: "shade", params: [
    { id: "depth", label: "Depth", min: 0, max: 1.44, step: 0.01, value: 0.72, base: 0.72 },
  ]},
  "surface-shader": { element: "view", event: "forwards", inType: "shade", outType: "shade", params: [
    { id: "rough", label: "Rough", min: 0, max: 1, step: 0.01, value: 0.2 },
  ]},
  "cage-light": { element: "view", event: "forwards", inType: "shade", outType: "shade", params: [
    { id: "spec", label: "Spec", min: -1, max: 1, step: 0.02, value: 0 },
  ]},
  "hard-highlights": { element: "view", event: "forwards", inType: "shade", outType: "shade", params: [
    { id: "mute", label: "Mute", min: 0, max: 1, step: 1, value: 1 },
  ]},
  ribbons: { element: "bone", event: "construction", inType: "contour", outType: "contour", params: [
    { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, value: 0 },
  ]},
  "path-take": { element: "control", event: "backwards", inType: "take", outType: "pose", params: [
    { id: "bake", label: "Bake handles", min: 0, max: 1, step: 1, value: 0 },
  ]},
  "northstar-20": { element: "control", event: "backwards", inType: "take", outType: "pose", params: [
    { id: "play", label: "Play", min: 0, max: 1, step: 1, value: 0 },
  ]},
  gsap: { element: "control", event: "forwards", inType: "scalar", outType: "pose", params: [
    { id: "energy", label: "Energy", min: 0, max: 1, step: 0.01, value: 0.4 },
  ]},
  "eight-state": { element: "control", event: "construction", inType: "scalar", outType: "pose", params: [
    { id: "state", label: "State", min: 0, max: 7, step: 1, value: 0 },
  ]},
  "curve-track": { element: "control", event: "backwards", inType: "take", outType: "pose", params: [
    { id: "tau", label: "Hermite τ", min: 0, max: 1, step: 0.01, value: 0.5 },
  ]},
  "field-api": { element: "null", event: "forwards", inType: "scalar", outType: "relief", params: [
    { id: "amp", label: "Field amp", min: 0, max: 2, step: 0.05, value: 1 },
  ]},
  "rig-controller": { element: "null", event: "forwards", inType: "take", outType: "pose", params: [
    { id: "bind", label: "Bind", min: 0, max: 1, step: 1, value: 1 },
  ]},
  compositor: { element: "null", event: "forwards", inType: "pose", outType: "pose", params: [
    { id: "mix", label: "Mix", min: 0, max: 1, step: 0.01, value: 1 },
  ]},
  machine: { element: "control", event: "construction", inType: "scalar", outType: "pose", params: [
    { id: "gate", label: "Gait gate", min: 0, max: 1, step: 1, value: 0 },
  ]},
  instrument: { element: "null", event: "construction", inType: "scalar", outType: "scalar", params: [
    { id: "open", label: "Open", min: 0, max: 1, step: 1, value: 0 },
  ]},
  lumen: { element: "null", event: "construction", inType: "scalar", outType: "scalar", params: [
    { id: "glass", label: "Glass", min: 0, max: 1, step: 1, value: 1 },
  ]},
  worldclass: { element: "null", event: "construction", inType: "scalar", outType: "scalar", params: [
    { id: "shell", label: "Shell", min: 0, max: 1, step: 1, value: 1 },
  ]},
  couple: { element: "bone", event: "dynamics", inType: "scalar", outType: "scalar", params: [
    { id: "mix", label: "Mix", min: 0, max: 1, step: 0.01, value: 1, base: 1 },
  ]},
  goose: { element: "bone", event: "dynamics", inType: "relief", outType: "relief", params: [
    { id: "amp", label: "Goose", min: 0, max: 2, step: 0.05, value: 0 },
  ]},
  paddle: { element: "bone", event: "backwards", inType: "contour", outType: "contour", params: [
    { id: "snap", label: "Snap", min: 0, max: 1, step: 0.01, value: 0 },
  ]},
  "walk-scaffold": { element: "bone", event: "dynamics", inType: "contour", outType: "contour", params: [
    { id: "gate", label: "Gate", min: 0, max: 1, step: 1, value: 0 },
  ]},
};

function fallbackMeta(o: Organ): Meta {
  return {
    element: o.kind === "view" ? "view" : o.kind === "controller" || o.kind === "take" || o.kind === "animation" ? "control" : o.kind === "ui" ? "null" : "bone",
    event: o.kind === "take" ? "backwards" : o.kind === "physics" ? "dynamics" : "forwards",
    inType: "scalar",
    outType: "scalar",
    params: [{ id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, value: o.status === "LIVE" ? 1 : 0 }],
  };
}

export function blueprintFromOrgan(o: Organ): NodeBlueprint {
  const meta = META[o.id] ?? fallbackMeta(o);
  return {
    typeId: PIPELINE_TYPE[o.id] ?? "organ.module",
    idPrefix: PIPELINE_ID[o.id] ?? o.id,
    class: CLASS_OF[o.id] ?? "module",
    label: PIPELINE_ID[o.id] ? ({
      identity: "Identity",
      cage: "Cage 25×40",
      handles: "Handles",
      gait: "Gait",
      voigt: "Voigt τ",
      kappa: "κ-box",
      orbit: "Orbit",
      pearl: "Pearl",
      hull: "Hull",
    } as Record<string, string>)[PIPELINE_ID[o.id]] ?? o.label : o.label,
    organId: o.id,
    status: o.status,
    note: o.note,
    ...meta,
  };
}

export const NODE_BLUEPRINTS: readonly NodeBlueprint[] = GASPER_ORGANS.map(blueprintFromOrgan);

export function blueprintByOrgan(organId: string): NodeBlueprint | undefined {
  return NODE_BLUEPRINTS.find((b) => b.organId === organId);
}

export function blueprintByPrefix(id: string): NodeBlueprint | undefined {
  return NODE_BLUEPRINTS.find((b) => b.idPrefix === id);
}
