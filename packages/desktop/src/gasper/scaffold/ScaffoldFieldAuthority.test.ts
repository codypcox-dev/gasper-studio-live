import { afterEach, describe, expect, it } from "vitest";
import {
  publishScaffoldAuthority,
  readScaffoldAuthority,
  SCAFFOLD_AUTHORITY_SCHEMA,
} from "./ScaffoldFieldAuthority";

describe("ScaffoldFieldAuthority", () => {
  afterEach(() => {
    const g = globalThis as {
      __GASPER_SCAFFOLD_AUTHORITY__?: unknown;
      __GASPER_LIVE_COEFFS__?: unknown;
    };
    delete g.__GASPER_SCAFFOLD_AUTHORITY__;
    delete g.__GASPER_LIVE_COEFFS__;
  });

  it("publishes pressure and coupling without painting SVG", () => {
    const state = publishScaffoldAuthority({ pressure: 0.75, coupling: 0.5 });
    expect(state.schema).toBe(SCAFFOLD_AUTHORITY_SCHEMA);
    expect(state.vertexCount).toBe(1000);
    expect(state.pressure).toBe(0.75);
    expect(readScaffoldAuthority()?.pressure).toBe(0.75);
    const live = (globalThis as { __GASPER_LIVE_COEFFS__?: { scaffold?: { pressure?: number } } })
      .__GASPER_LIVE_COEFFS__;
    expect(live?.scaffold?.pressure).toBe(0.75);
  });

  it("clamps pressure and treats 0 as identity intent", () => {
    expect(publishScaffoldAuthority({ pressure: 9 }).pressure).toBe(1);
    expect(publishScaffoldAuthority({ pressure: 0 }).pressure).toBe(0);
  });
});
