/**
 * ScoreUnion — one reader of beats + tracks.
 * Dual killed: headingWindows = yaw track for LIGHTS only.
 * Painted travel is headingDeg (beats). Orbit.yaw is the cage / n̂·L sink.
 * Channel ids are node.param.
 */
import { evalChannel } from "../curves/CurveTrack";
import type { GasperTake } from "./GasperTake";
import { evaluateTake, type EvaluatedTake } from "./evaluateTake";

export type ScoreBind = Readonly<{
  node: string;
  param: string;
  value: number;
}>;

export type EvaluatedScore = EvaluatedTake &
  Readonly<{
    binds: readonly ScoreBind[];
    params: Readonly<Record<string, number>>;
  }>;

const ALIAS: Readonly<Record<string, { node: string; param: string }>> = {
  yaw: { node: "orbit", param: "yaw" },
  "orbit.yaw": { node: "orbit", param: "yaw" },
  face: { node: "pearl", param: "depth" },
  "pearl.depth": { node: "pearl", param: "depth" },
  cadenceHz: { node: "gait", param: "hz" },
  "gait.hz": { node: "gait", param: "hz" },
  driveGain: { node: "gait", param: "drive" },
  "gait.drive": { node: "gait", param: "drive" },
  stretch: { node: "handles", param: "stretch" },
};

export function parseScoreChannel(id: string): { node: string; param: string } {
  if (ALIAS[id]) return ALIAS[id];
  const dot = id.indexOf(".");
  if (dot > 0) return { node: id.slice(0, dot), param: id.slice(dot + 1) };
  return { node: id, param: "value" };
}

function planted(state: EvaluatedTake): boolean {
  return state.walkEnable !== 0 || state.runInPlace != null;
}

export function evaluateScore(take: GasperTake, t: number): EvaluatedScore {
  const state = evaluateTake(take, t);
  const params: Record<string, number> = {};
  const binds: ScoreBind[] = [];
  const tracks = take.tracks ?? {};
  for (const [id, track] of Object.entries(tracks)) {
    if (!track) continue;
    const dest = parseScoreChannel(id);
    let value = evalChannel(track, t).value;
    if ((dest.param === "stretch" || id === "stretch") && planted(state)) value = 0;
    const key = `${dest.node}.${dest.param}`;
    params[key] = value;
    binds.push({ node: dest.node, param: dest.param, value });
  }
  return { ...state, binds, params };
}

type ScoreHost = {
  __GASPER_ORBIT_YAW__?: number;
  __GASPER_ORBIT_PITCH__?: number;
  __GASPER_GAIT_HZ__?: number;
  __GASPER_GAIT_DRIVE__?: number;
  __GASPER_HANDLE_STRETCH__?: number;
  __GASPER_LIVE_COEFFS__?: {
    pearl?: Record<string, number>;
  };
  SidekickFormMasterRig?: {
    setOrbit?: (y: number, p: number) => void;
    setFaceEnergy?: (n: number) => void;
  };
};

export function applyScoreBinds(binds: readonly ScoreBind[]): void {
  const host = globalThis as ScoreHost;
  for (const b of binds) {
    if (b.node === "orbit" && b.param === "yaw") {
      // Lights + cage loft only. Do NOT setYaw — that is the painted dial
      // and adds with headingYawDeg. One writer for painted travel: heading beats.
      host.__GASPER_ORBIT_YAW__ = b.value;
      host.SidekickFormMasterRig?.setOrbit?.(b.value, host.__GASPER_ORBIT_PITCH__ ?? 0);
    }
    if (b.node === "pearl" && b.param === "depth") {
      if (!host.__GASPER_LIVE_COEFFS__) host.__GASPER_LIVE_COEFFS__ = {};
      host.__GASPER_LIVE_COEFFS__.pearl = {
        ...(host.__GASPER_LIVE_COEFFS__.pearl ?? {}),
        depth: b.value,
      };
      const face = Math.max(0, Math.min(1, (b.value - 0.72) / 0.36));
      host.SidekickFormMasterRig?.setFaceEnergy?.(face);
    }
    if (b.node === "gait" && b.param === "hz") {
      host.__GASPER_GAIT_HZ__ = b.value;
    }
    if (b.node === "gait" && b.param === "drive") {
      host.__GASPER_GAIT_DRIVE__ = b.value;
    }
    if (b.node === "handles" && b.param === "stretch") {
      host.__GASPER_HANDLE_STRETCH__ = b.value;
    }
  }
}
