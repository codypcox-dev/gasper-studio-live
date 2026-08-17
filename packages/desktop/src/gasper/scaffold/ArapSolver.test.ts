import { describe, expect, it } from "vitest";
import { maxDelta, tickArap } from "./ArapSolver";
import { lodForMorph, maxEdgeStrain, restPolarMesh, topoAt } from "./MeshLadder";
import { buildPaddleMesh } from "./PaddleMesh";
import { createFabricState, setMorph, tickFabric } from "./FabricSolver";

describe("ARAP + ladder", () => {
  it("is identity on rest", () => {
    const rest = restPolarMesh(25, 40);
    const live = rest.slice();
    tickArap(live, rest, 25, 40);
    expect(maxDelta(live, rest)).toBeLessThan(1e-4);
  });

  it("refines paddle to L2 and keeps the face in the blade", () => {
    expect(lodForMorph("paddle")).toBe(2);
    expect(topoAt(2).vertexCount).toBe(3920);
    const st = createFabricState();
    setMorph(st, "paddle");
    tickFabric(st, 1 / 60);
    expect(st.lod).toBe(2);
    expect(st.liveXY?.length).toBe(7840);
    const topo = topoAt(2);
    const face = Math.round(0.4 * (topo.rings - 1)) * topo.sectors;
    const x = st.liveXY![face * 2] ?? 0;
    const y = st.liveXY![face * 2 + 1] ?? 0;
    expect(Math.hypot(x, y)).toBeLessThan(45);
    expect(maxEdgeStrain(st.liveXY!, st.restXY!, st.rings, st.sectors)).toBeLessThan(2.4);
  });

  it("a poke moves neighbors and leaves the face", () => {
    const rest = buildPaddleMesh(25, 40).xy;
    const live = rest.slice();
    const i = 18 * 40 + 10;
    live[i * 2] = (live[i * 2] ?? 0) + 8;
    tickArap(live, rest, 25, 40, { lockTo: rest, iterations: 6, pins: new Set([i]) });
    const j = 18 * 40 + 11;
    const moved = Math.hypot((live[j * 2] ?? 0) - (rest[j * 2] ?? 0), (live[j * 2 + 1] ?? 0) - (rest[j * 2 + 1] ?? 0));
    expect(moved).toBeGreaterThan(0.05);
    const face = 10 * 40 + 20;
    const fd = Math.hypot((live[face * 2] ?? 0) - (rest[face * 2] ?? 0), (live[face * 2 + 1] ?? 0) - (rest[face * 2 + 1] ?? 0));
    expect(fd).toBeLessThan(2);
  });
});
