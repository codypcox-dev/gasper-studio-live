import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const host = readFileSync(new URL("./DaisFirstStageHost.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("./StudioDesk.tsx", import.meta.url), "utf8");
const table = readFileSync(new URL("./InstrumentTable.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./daisFirst.css", import.meta.url), "utf8");

describe("theater desk", () => {
  it("is the single instrument under the stage", () => {
    expect(host).toContain("StudioDesk");
    expect(host).not.toContain("<LumenGlass");
    expect(host).not.toContain("<GeoNodeEditor");
    expect(desk).toContain('data-testid="studio-desk"');
    expect(desk).toContain("desk-chapter-");
    expect(desk).toContain("nodes");
    expect(desk).toContain('data-testid="lumen-play-twenty"');
    expect(desk).toContain('data-testid="lumen-grid-toggle"');
    expect(desk).toContain("PillarBoard");
    expect(desk).toContain("MachineStrip");
    expect(desk).toContain("GeoNodeEditor");
    expect(desk).toContain("embedded");
    expect(table).toContain("embedded");
    expect(css).toContain(".studio-desk");
    expect(css).toContain("--desk:");
  });
});
