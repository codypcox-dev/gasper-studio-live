/**
 * Live 1000-field publisher. Compose scalars. Do not paint SVG.
 * FormMaster reads __GASPER_SCAFFOLD_Z__ / __GASPER_SCAFFOLD_AUTHORITY__.
 */
import {
  SCAFFOLD_COUPLING_LAW,
  SCAFFOLD_VERTEX_COUNT,
  composeScaffoldScalars,
  type ScaffoldSource,
} from "./AdaptiveShellScaffold";

export const SCAFFOLD_AUTHORITY_SCHEMA = "gasper.scaffold-authority.v1" as const;
export const SCAFFOLD_PRESSURE_PUFF_PX = 14;

export type ScaffoldAuthorityState = Readonly<{
  schema: typeof SCAFFOLD_AUTHORITY_SCHEMA;
  law: typeof SCAFFOLD_COUPLING_LAW;
  vertexCount: typeof SCAFFOLD_VERTEX_COUNT;
  pressure: number;
  coupling: number;
  relief: number;
}>;

type Host = {
  __GASPER_SCAFFOLD_AUTHORITY__?: ScaffoldAuthorityState;
  __GASPER_SCAFFOLD_COMPOSED__?: Float32Array;
  __GASPER_LIVE_COEFFS__?: { scaffold?: { pressure?: number; scaffoldCoupling?: number } };
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n <= 0 ? 0 : n >= 1 ? 1 : n;
}

export function publishScaffoldAuthority(input: {
  pressure?: number;
  coupling?: number;
  relief?: number;
  sources?: readonly ScaffoldSource[];
}): ScaffoldAuthorityState {
  const pressure = clamp01(Number(input.pressure) || 0);
  const coupling = Math.max(0, Math.min(2, Number(input.coupling) || 0));
  const relief = Math.max(0, Math.min(2.5, Number(input.relief) || 0));
  const state: ScaffoldAuthorityState = Object.freeze({
    schema: SCAFFOLD_AUTHORITY_SCHEMA,
    law: SCAFFOLD_COUPLING_LAW,
    vertexCount: SCAFFOLD_VERTEX_COUNT,
    pressure,
    coupling,
    relief,
  });
  const host = globalThis as Host;
  host.__GASPER_SCAFFOLD_AUTHORITY__ = state;
  if (!host.__GASPER_LIVE_COEFFS__) host.__GASPER_LIVE_COEFFS__ = {};
  host.__GASPER_LIVE_COEFFS__.scaffold = {
    ...(host.__GASPER_LIVE_COEFFS__.scaffold ?? {}),
    pressure,
    scaffoldCoupling: coupling,
  };
  if (input.sources) {
    host.__GASPER_SCAFFOLD_COMPOSED__ = composeScaffoldScalars(input.sources);
  }
  return state;
}

export function readScaffoldAuthority(): ScaffoldAuthorityState | null {
  const state = (globalThis as Host).__GASPER_SCAFFOLD_AUTHORITY__;
  return state?.schema === SCAFFOLD_AUTHORITY_SCHEMA ? state : null;
}
