import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const host = readFileSync(new URL("./DaisFirstStageHost.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("./StudioDesk.tsx", import.meta.url), "utf8");
const transport = readFileSync(new URL("./StudioTransport.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./daisFirst.css", import.meta.url), "utf8");

describe("theater desk", () => {
  it("is the single instrument under the stage", () => {
    expect(host).toContain("StudioDesk");
    expect(host).toContain('data-studio-v2="1"');
    expect(desk).toContain('data-testid="studio-desk"');
    expect(desk).toContain("StudioTransport");
    expect(desk).toContain("NodeGraphPage");
    expect(transport).toContain('data-testid="studio-transport"');
    expect(transport).toContain('data-testid="studio-scrub"');
    expect(transport).toContain('data-testid="studio-transport-play"');
    expect(transport).toContain('data-testid="lumen-play-twenty"');
    expect(transport).toContain('data-testid="lumen-grid-toggle"');
    expect(transport).toContain("ScoreDopesheet");
    expect(transport).toContain('data-testid="score-graph-toggle"');
    expect(css).toContain(".studio-desk");
    expect(css).toContain(".studio-transport");
    expect(css).toContain(".score-dopesheet");
    expect(css).toContain("--desk:");
    expect(transport.match(/data-testid="studio-scrub"/g)?.length).toBe(1);
  });
});
