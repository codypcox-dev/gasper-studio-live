import {
  embodimentLocomotionClass,
  type EmbodimentLocomotionClass,
} from "../behavior/EmbodimentLocomotion";
import type { GasperTake, TakeBind } from "./GasperTake";

export function bindTake(
  take: GasperTake,
  live: {
    x: number;
    z: number;
    headingDeg?: number;
    embodimentId?: string | null;
  },
): TakeBind {
  const klass = embodimentLocomotionClass(live.embodimentId);
  const rejected: string[] = [];
  if (take.needs === "walker" && klass !== "walker") {
    rejected.push("needs-walker");
  }
  if (take.needs === "presence" && klass !== "presence") {
    rejected.push("needs-presence");
  }
  const admitted = rejected.length === 0 || take.policy === "snap";
  if (!admitted) {
    return {
      originX: live.x,
      originZ: live.z,
      headingRad: 0,
      class: klass,
      admitted: false,
      rejected,
    };
  }
  const headingDeg = take.heading === "live" ? Number(live.headingDeg) || 0 : 0;
  return {
    originX: Number.isFinite(live.x) ? live.x : 0,
    originZ: Number.isFinite(live.z) ? live.z : 0,
    headingRad: (headingDeg * Math.PI) / 180,
    class: klass,
    admitted: true,
    rejected,
  };
}

export function takeNeedsClass(need: GasperTake["needs"]): EmbodimentLocomotionClass | "any" {
  if (need === "any") return "any";
  return need;
}
