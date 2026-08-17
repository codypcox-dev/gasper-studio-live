export const GEONODES_SCHEMA = "gasper.geometry-nodes.v1" as const;

export type NodeClass = "input" | "geometry" | "physics" | "view" | "shade" | "output" | "module";

export type NodeTypeId =
  | "input.identity"
  | "input.cage"
  | "deform.handles"
  | "physics.gait"
  | "physics.voigt"
  | "deform.kappa"
  | "view.orbit"
  | "shade.pearl"
  | "output.hull"
  | "organ.module";

export type SocketType = "contour" | "lattice" | "relief" | "scalar" | "phase" | "shade" | "pose" | "take";

export type RigElement = "control" | "bone" | "null" | "view";

export type RigEvent = "construction" | "forwards" | "dynamics" | "backwards";

export type NodeParam = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
};

export type GraphNode = {
  id: string;
  typeId: NodeTypeId;
  class: NodeClass;
  label: string;
  organId: string;
  muted: boolean;
  x: number;
  y: number;
  params: NodeParam[];
  element?: RigElement;
  event?: RigEvent;
  inType?: SocketType;
  outType?: SocketType;
  status?: "LIVE" | "TWIN" | "UNHOOKED" | "DEAD";
};

export type GraphLink = {
  from: string;
  to: string;
};

export type GeoGraph = {
  schema: typeof GEONODES_SCHEMA;
  nodes: GraphNode[];
  links: GraphLink[];
  output: string;
  selected: string | null;
  layoutVersion?: number;
};

export type GeoEval = {
  schema: typeof GEONODES_SCHEMA;
  mute: Record<string, boolean>;
  params: Record<string, Record<string, number>>;
  order: string[];
  selected: string | null;
};

const SCALAR_OK: SocketType[] = ["contour", "lattice", "relief", "scalar", "phase", "shade", "pose", "take"];

export function socketsCompatible(from: SocketType, to: SocketType): boolean {
  if (from === to) return true;
  if (from === "scalar" || to === "scalar") return true;
  const family = new Set<SocketType>(["contour", "lattice", "relief", "pose", "phase", "shade", "take"]);
  return family.has(from) && family.has(to);
}
