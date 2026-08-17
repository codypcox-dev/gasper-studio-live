import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PATH_TAKE_SAMPLES,
  PATH_TAKE_SCHEMA,
  applyRim,
  cubicCount,
  encodeF32,
  decodeF32,
  lerpF32,
  packRim,
  sampleTake,
  createPathTakeRuntime,
  mountPathTake,
  type PathTake,
} from "./PathEmbeddingTake";

const here = dirname(fileURLToPath(import.meta.url));
const painter = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

function circle(n = 512, r = 70): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: 120 + r * Math.cos(a), y: 110 + r * Math.sin(a) };
  });
}

describe("path embedding take", () => {
  it("never stores d — only 512-float embeddings", () => {
    const rim = packRim(circle(), PATH_TAKE_SAMPLES);
    expect(rim.length).toBe(1024);
    const b64 = encodeF32(rim);
    expect(b64.includes("M ")).toBe(false);
    expect(b64.includes(" C ")).toBe(false);
    const back = decodeF32(b64);
    expect(back[0]).toBeCloseTo(rim[0] ?? 0, 5);
  });

  it("lerps two embeddings without changing command count", () => {
    const a = packRim(circle(512, 70));
    const b = packRim(circle(512, 80));
    const mid = lerpF32(a, b, 0.5);
    expect(mid.length).toBe(1024);
    expect(mid[0]).toBeCloseTo(((a[0] ?? 0) + (b[0] ?? 0)) / 2, 5);
  });

  it("sampleTake interpolates frames by time", () => {
    const take: PathTake = {
      schema: PATH_TAKE_SCHEMA,
      id: "t",
      name: "t",
      durationSec: 1,
      samples: 512,
      hz: 20,
      frames: [
        { t: 0, rim: encodeF32(packRim(circle(512, 70))) },
        { t: 1, rim: encodeF32(packRim(circle(512, 80))) },
      ],
    };
    const mid = sampleTake(take, 0.5);
    const rest = packRim(circle(512, 75));
    expect(mid[0]).toBeCloseTo(rest[0] ?? 0, 1);
  });

  it("applyRim writes points in place so closedSpline can serialize", () => {
    const pts = circle(512, 70);
    applyRim(pts, packRim(circle(512, 90)));
    expect(pts[0]?.y).toBeCloseTo(20, 0);
  });

  it("record/stop/play never produce a d string", () => {
    const rt = createPathTakeRuntime();
    const api = mountPathTake(rt);
    api.record("strut");
    api._ingest(circle(512, 70));
    rt.recAcc = -1;
    api._ingest(circle(512, 74));
    const take = api.stop();
    expect(take?.schema).toBe(PATH_TAKE_SCHEMA);
    expect(take?.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(take).includes('"d":')).toBe(false);
    expect(JSON.stringify(take).includes(" C ")).toBe(false);
  });

  it("painter still serializes via closedSpline and does not SMIL the hull", () => {
    expect(painter).toContain("function closedSpline(pts)");
    expect(painter).toContain("body.setAttribute('d',bodyD)");
    expect(painter).toContain("GasperPathTake");
    expect(painter).not.toContain('<animate attributeName="d"');
    expect(painter).not.toContain("flubber");
    expect(painter).not.toContain("MorphSVG");
    expect(cubicCount("M 0 0 C 1 1 2 2 3 3 C 4 4 5 5 6 6 Z")).toBe(2);
  });
});
