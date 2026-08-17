import { describe, expect, it } from "vitest";
import { SCAFFOLD_VERTEX_COUNT } from "./AdaptiveShellScaffold";
import {
  FIELD_LAYER_ORDER,
  FIELD_SPACE,
  assertFieldIdentity,
  composeNamedField,
  fieldEnergy,
} from "./DisplacementField";

describe("named displacement field", () => {
  it("empty compose is exact +0 on 1000", () => {
    const z = composeNamedField({});
    expect(z.length).toBe(SCAFFOLD_VERTEX_COUNT);
    expect(assertFieldIdentity(z)).toBe(true);
    expect(FIELD_SPACE).toBe("rest-radial-scalar");
    expect(FIELD_LAYER_ORDER).toEqual(["pressure", "relief", "captured"]);
  });

  it("layers add; amp 0 is identity", () => {
    const relief = new Float32Array(SCAFFOLD_VERTEX_COUNT);
    const pressure = new Float32Array(SCAFFOLD_VERTEX_COUNT);
    relief[10] = 2;
    pressure[10] = 3;
    const both = composeNamedField({ relief, pressure, reliefAmp: 1, pressureAmp: 1 });
    expect(both[10]).toBe(5);
    const off = composeNamedField({ relief, reliefAmp: 0 });
    expect(assertFieldIdentity(off)).toBe(true);
    expect(fieldEnergy(both).peak).toBe(5);
  });
});
