import { describe, expect, it } from "vitest";
import {
  dispatchField,
  fieldClear,
  fieldSculpt,
  mountGasperField,
  capturedField,
} from "./GasperFieldApi";

describe("GasperField API", () => {
  it("mounts a 1000-float cage and sculpts additively", () => {
    const api = mountGasperField();
    fieldClear();
    expect(api.vertexCount).toBe(1000);
    expect(api.rings).toBe(25);
    expect(api.sectors).toBe(40);
    const { peak } = fieldSculpt({ u: 0.5, v: 0.5, radius: 0.12, amplitude: 0.8 });
    expect(peak).toBeGreaterThan(0.5);
    expect(capturedField().length).toBe(1000);
  });

  it("dispatches named methods for MCP", () => {
    fieldClear();
    const carved = dispatchField("protrude", { glyph: "?", amplitude: 0.9 }) as { glyph: string };
    expect(carved.glyph).toBe("?");
    const listed = dispatchField("listLooks");
    expect(Array.isArray(listed)).toBe(true);
  });
});
