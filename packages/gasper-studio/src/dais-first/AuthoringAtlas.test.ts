import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUTHORING_CHAPTERS } from "./AuthoringAtlas";

const rail = readFileSync(new URL("./DaisControlRail.tsx", import.meta.url), "utf8");
const atlas = readFileSync(new URL("./AuthoringAtlas.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./daisFirst.css", import.meta.url), "utf8");

describe("authoring atlas instrument", () => {
  it("every chapter has a rail organ and a focus rule", () => {
    for (const chapter of AUTHORING_CHAPTERS) {
      expect(rail).toContain(`data-chapter="${chapter.id}"`);
      expect(css).toContain(`[data-focus="${chapter.id}"]`);
    }
    expect(rail).toContain('data-focus={chapter}');
    expect(css).toContain(".dais-control-rail[data-focus] [data-chapter]");
    expect(css).toContain("opacity: 0.42");
    expect(atlas).toContain('data-testid="atlas-chapter-all"');
  });

  it("does not delete capability — All restores full mixer", () => {
    expect(css).toContain('[data-focus="all"] [data-chapter]');
    expect(css).toContain("[data-era=\"lumen\"]");
    expect(css).toContain("lumen-glass");
    expect(atlas).toContain("readout.weight");
    expect(atlas).toContain("readout.plant");
    expect(atlas).toContain("readout.settle");
    expect(atlas).toContain("readout.mesh");
    expect(atlas).toContain('id: "skin"');
  });
});
