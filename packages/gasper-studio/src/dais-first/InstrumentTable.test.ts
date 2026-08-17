import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const host = readFileSync(new URL("./DaisFirstStageHost.tsx", import.meta.url), "utf8");
const table = readFileSync(new URL("./InstrumentTable.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./daisFirst.css", import.meta.url), "utf8");

describe("collapsible settings pane", () => {
  it("docks on the right, lists every dial, and collapses", () => {
    expect(host).toContain("InstrumentTable");
    expect(host).toContain("<LumenGlass");
    expect(table).toContain('data-testid="instrument-table"');
    expect(table).toContain('data-testid="settings-toggle"');
    expect(table).toContain('"tools"');
    expect(table).toContain('"sliders"');
    expect(table).toContain('"effects"');
    expect(table).toContain('id: "fabric"');
    expect(table).toContain("fabric_torso");
    expect(table).toContain("instrument-section-${group.id}");
    expect(table).not.toContain("instrument-prev");
    expect(css).toContain(".instrument-table");
    expect(css).toContain("data-open");
    expect(css).toContain("right: 16px");
  });
});
