import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCORE_CHANNEL_IDS } from "./ScoreDopesheet";

const sheet = readFileSync(new URL("./ScoreDopesheet.tsx", import.meta.url), "utf8");
const transport = readFileSync(new URL("./StudioTransport.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("./StudioDesk.tsx", import.meta.url), "utf8");
const graph = readFileSync(new URL("./NodeGraphPage.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./daisFirst.css", import.meta.url), "utf8");

describe("score dopesheet", () => {
  it("mounts under studio-transport with one scrub and no monitor timeline", () => {
    expect(transport).toContain("ScoreDopesheet");
    expect(transport).toContain('data-testid="score-graph-toggle"');
    expect(transport).toContain("<ScoreDopesheet");
    expect(transport.match(/data-testid="studio-scrub"/g)?.length).toBe(1);
    expect(desk).not.toContain("monitor-timeline");
    expect(graph).not.toContain('data-testid="monitor-timeline"');
    expect(graph).not.toContain("monitor-timeline");
  });

  it("lists the five Northstar score channels and samples evalChannel", () => {
    expect(SCORE_CHANNEL_IDS).toEqual(["orbit.yaw", "pearl.depth", "gait.hz", "driveGain", "stretch"]);
    expect(sheet).toContain('data-testid="score-dopesheet"');
    expect(sheet).toContain('data-testid="score-value-graph"');
    expect(sheet).toContain("NORTHSTAR_TWENTY_TRACKS");
    expect(sheet).toContain("evalChannel");
    expect(sheet).toContain("SAMPLE_COUNT = 80");
    expect(sheet).toContain("playhead.t");
    expect(sheet).not.toContain("requestAnimationFrame");
    expect(css).toContain(".score-dopesheet");
    expect(css).toContain(".score-value-graph");
    expect(css).toContain("height: 72px");
  });

  it("sends slider dials through commit so undo can rewind them", () => {
    expect(graph).toMatch(/const param = useCallback\([\s\S]*commit\(\(g\) => setNodeParam/);
  });
});
