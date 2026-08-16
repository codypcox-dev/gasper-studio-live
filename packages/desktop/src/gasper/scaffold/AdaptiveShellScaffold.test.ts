import { describe, expect, it } from "vitest";

import { GASPER_TOPOLOGY, assertTopologyLock } from "../GasperTopologyLock";
import {
  compileCausalPhrase,
  emptyTendency,
  goalsFromState,
  mergeTendency,
  semanticIntentFromTendency,
  type ActionTendencyV2,
  type CoreAffectV2,
} from "../expression/CausalAffectStack";
import { PHI } from "../physics/PhiLaw";
import {
  LATTICE_NODE_COUNT,
  LATTICE_TRIANGLE_COUNT,
  SCAFFOLD_COUPLING_LAW,
  SCAFFOLD_FACE_COUNT,
  SCAFFOLD_FORBIDDEN,
  SCAFFOLD_RINGS,
  SCAFFOLD_SECTORS,
  SCAFFOLD_SOURCE_KINDS,
  SCAFFOLD_VERTEX_COUNT,
  assertScaffoldContract,
  composeAdaptiveShellScaffold,
  composeScaffoldVertices,
  computeLocalFrame,
  latticeCouplingGamma,
  restLatticeNodes,
  restNormalAt,
  sourceContribution,
  sourcesFromCausalGoals,
  transientFaces,
  zeroSource,
} from "./AdaptiveShellScaffold";
import {
  RELIEF_RESAMPLE,
  capturedScaffoldSource,
  emptyReliefField,
  reliefScaffoldSource,
  resampleFieldToScaffold,
} from "./ReliefScaffoldSource";

const AFFECT: CoreAffectV2 = {
  valence: 1 / PHI,
  arousal: 1 / PHI,
  expression_gain: 1 / PHI,
  source: "inherited",
};

function tendency(patch: Partial<ActionTendencyV2>): ActionTendencyV2 {
  return mergeTendency(emptyTendency(), patch);
}

describe("R6 Adaptive Shell Scaffold — Book 009 contract, not a face painter", () => {
  it("locks 25×40 = 1000 points and 1920 transient faces without touching 512/360/672", () => {
    expect(SCAFFOLD_RINGS * SCAFFOLD_SECTORS).toBe(1000);
    expect(SCAFFOLD_VERTEX_COUNT).toBe(1000);
    expect(SCAFFOLD_FACE_COUNT).toBe((SCAFFOLD_RINGS - 1) * SCAFFOLD_SECTORS * 2);
    expect(SCAFFOLD_FACE_COUNT).toBe(1920);
    expect(LATTICE_NODE_COUNT).toBe(360);
    expect(LATTICE_TRIANGLE_COUNT).toBe(672);
    expect(GASPER_TOPOLOGY.contourSamples).toBe(512);
    expect(GASPER_TOPOLOGY.structuralNodes).toBe(360);
    expect(GASPER_TOPOLOGY.structuralTriangles).toBe(672);
    expect(GASPER_TOPOLOGY.adaptiveRelief.width).toBe(25);
    expect(GASPER_TOPOLOGY.adaptiveRelief.height).toBe(40);
    expect(GASPER_TOPOLOGY.adaptiveRelief.maxSamples).toBe(1000);
    expect(GASPER_TOPOLOGY.adaptiveRelief.changesSilhouetteTopology).toBe(false);
    expect(GASPER_TOPOLOGY.adaptiveRelief.changesFaceTopology).toBe(false);

    const lock = assertTopologyLock({
      contourSamples: 512,
      structuralNodes: 360,
      structuralTriangles: 672,
      adaptiveReliefMaxSamples: 1000,
    });
    expect(lock).toEqual({ ok: true });

    const faces = transientFaces();
    expect(faces.length).toBe(1920 * 3);
    expect(Math.max(...faces)).toBe(999);
    expect(Math.min(...faces)).toBe(0);
  });

  it("couples C=Γ(L)+∑s_i without merging lattice or authoring a face", () => {
    const lattice = restLatticeNodes();
    expect(lattice.length).toBe(360 * 3);
    const gamma = latticeCouplingGamma(lattice);
    expect(gamma.length).toBe(1000 * 3);

    const frame = composeAdaptiveShellScaffold(lattice, [], { faces: true, normals: true });
    const contract = assertScaffoldContract(frame);
    expect(contract).toEqual({ ok: true });
    expect(frame.coupling.law).toBe(SCAFFOLD_COUPLING_LAW);
    expect(frame.coupling.merged).toBe(false);
    expect(frame.coupling.paintsFace).toBe(false);
    expect(frame.coupling.faceAuthor).toBe(false);
    expect(frame.coupling.changesSilhouetteTopology).toBe(false);
    expect(frame.coupling.changesFaceTopology).toBe(false);
    expect(frame.faces?.length).toBe(1920 * 3);
    expect(frame.normals?.length).toBe(1000 * 3);
    expect(SCAFFOLD_SOURCE_KINDS).toEqual(["pressure", "relief", "captured"]);
    expect(SCAFFOLD_FORBIDDEN).toContain("face-author");
    expect(SCAFFOLD_FORBIDDEN).toContain("fourth-face-system");
    expect(SCAFFOLD_FORBIDDEN).toContain("pupils");
  });

  it("amplitude 0 is exact identity zeros — C equals Γ(L) byte-for-byte", () => {
    const lattice = restLatticeNodes();
    const gamma = latticeCouplingGamma(lattice);
    const sources = [zeroSource("pressure"), zeroSource("relief"), zeroSource("captured")];
    for (const src of sources) {
      expect(src.amplitude).toBe(0);
      expect(src.samples.length).toBe(1000);
      for (let i = 0; i < src.samples.length; i++) {
        expect(Object.is(src.samples[i], 0)).toBe(true);
      }
    }
    const composed = composeScaffoldVertices(lattice, sources);
    expect(composed.length).toBe(gamma.length);
    for (let i = 0; i < composed.length; i++) {
      expect(composed[i]).toBe(gamma[i]);
    }
  });

  it("continuous pressure produces continuous displacement, not opacity", () => {
    const lattice = restLatticeNodes();
    const gamma = latticeCouplingGamma(lattice);
    const low = {
      kind: "pressure" as const,
      amplitude: 1 / PHI,
      samples: Float32Array.from({ length: 1000 }, () => 1),
    };
    const high = {
      kind: "pressure" as const,
      amplitude: 2 / PHI,
      samples: Float32Array.from({ length: 1000 }, () => 1),
    };
    const a = composeScaffoldVertices(lattice, [low]);
    const b = composeScaffoldVertices(lattice, [high]);
    let movedA = 0;
    let movedB = 0;
    for (let i = 0; i < 1000; i++) {
      const o = i * 3;
      const n = restNormalAt(i);
      const da = Math.hypot(a[o]! - gamma[o]!, a[o + 1]! - gamma[o + 1]!, a[o + 2]! - gamma[o + 2]!);
      const db = Math.hypot(b[o]! - gamma[o]!, b[o + 1]! - gamma[o + 1]!, b[o + 2]! - gamma[o + 2]!);
      movedA += da;
      movedB += db;
      expect(a[o]).toBeCloseTo(gamma[o]! + n[0] * low.amplitude, 6);
      expect(b[o]).toBeCloseTo(gamma[o]! + n[0] * high.amplitude, 6);
    }
    expect(movedA).toBeGreaterThan(0);
    expect(movedB).toBeGreaterThan(movedA);
  });

  it("composed vertices equal Γ(L) plus the summed source normal displacements", () => {
    const lattice = restLatticeNodes();
    const gamma = latticeCouplingGamma(lattice);
    const pressure = {
      kind: "pressure" as const,
      amplitude: 1 / PHI,
      samples: Float32Array.from({ length: 1000 }, (_, i) => (i % 7 === 0 ? 1 : 0)),
    };
    const relief = {
      kind: "relief" as const,
      amplitude: 1 / (PHI * PHI),
      samples: Float32Array.from({ length: 1000 }, (_, i) => (i % 5 === 0 ? -1 : 0)),
    };
    const C = composeScaffoldVertices(lattice, [pressure, relief]);
    for (let i = 0; i < 1000; i++) {
      const sum = sourceContribution([pressure, relief], i);
      const n = restNormalAt(i);
      const o = i * 3;
      expect(C[o]).toBeCloseTo(gamma[o]! + n[0] * sum, 6);
      expect(C[o + 1]).toBeCloseTo(gamma[o + 1]! + n[1] * sum, 6);
      expect(C[o + 2]).toBeCloseTo(gamma[o + 2]! + n[2] * sum, 6);
    }
  });

  it("optional local frames are orthogonal and do not dump a face system", () => {
    const frame = composeAdaptiveShellScaffold(undefined, [], { frames: true });
    expect(frame.frames?.length).toBe(1000);
    const mid = computeLocalFrame(frame.vertices, 500);
    const tn = mid.tangent[0] * mid.normal[0] + mid.tangent[1] * mid.normal[1] + mid.tangent[2] * mid.normal[2];
    const bn = mid.bitangent[0] * mid.normal[0] + mid.bitangent[1] * mid.normal[1] + mid.bitangent[2] * mid.normal[2];
    const tb = mid.tangent[0] * mid.bitangent[0] + mid.tangent[1] * mid.bitangent[1] + mid.tangent[2] * mid.bitangent[2];
    expect(Math.abs(tn)).toBeLessThan(1e-6);
    expect(Math.abs(bn)).toBeLessThan(1e-6);
    expect(Math.abs(tb)).toBeLessThan(1e-6);
    expect(frame.coupling.paintsFace).toBe(false);
  });

  it("R4 expand/contract and gather are scaffold SOURCES, not blendshapes", () => {
    const expandIntent = semanticIntentFromTendency(tendency({ affiliate: 1 }), AFFECT, 1);
    const contractIntent = semanticIntentFromTendency(tendency({ inhibit: 1 }), AFFECT, -1);
    const expandGoals = { gather: 0 };
    const gatherGoals = { gather: 1 / PHI };

    const expandSources = sourcesFromCausalGoals(expandIntent, expandGoals);
    const contractSources = sourcesFromCausalGoals(contractIntent, expandGoals);
    const gatherSources = sourcesFromCausalGoals(
      semanticIntentFromTendency(emptyTendency(), AFFECT, 0),
      gatherGoals,
    );
    const quiet = sourcesFromCausalGoals(
      semanticIntentFromTendency(emptyTendency(), AFFECT, 0),
      { gather: 0 },
    );

    expect(expandSources.map((s) => s.kind)).toEqual(["pressure", "relief"]);
    expect(expandSources[0]!.amplitude).toBeGreaterThan(0);
    expect(contractSources[0]!.amplitude).toBeLessThan(0);
    expect(gatherSources[1]!.kind).toBe("relief");
    expect(gatherSources[1]!.amplitude).toBeGreaterThan(0);
    expect(quiet[0]!.amplitude).toBe(0);
    expect(quiet[1]!.amplitude).toBe(0);
    for (const s of quiet[0]!.samples) expect(Object.is(s, 0)).toBe(true);

    const compiled = compileCausalPhrase("expand");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const fromPhrase = sourcesFromCausalGoals(compiled.state.semanticIntent, compiled.physicsGoals);
    expect(fromPhrase[0]!.kind).toBe("pressure");
    expect(fromPhrase[0]!.amplitude).toBe(compiled.state.semanticIntent.expand_contract);
    expect(JSON.stringify(fromPhrase)).not.toMatch(/happy|sad|angry|pupil|fixture|blendshape/i);

    const lattice = restLatticeNodes();
    const quietC = composeScaffoldVertices(lattice, quiet);
    const gamma = latticeCouplingGamma(lattice);
    for (let i = 0; i < quietC.length; i++) expect(quietC[i]).toBe(gamma[i]);
    const liveC = composeScaffoldVertices(lattice, expandSources);
    let delta = 0;
    for (let i = 0; i < liveC.length; i++) delta += Math.abs(liveC[i]! - gamma[i]!);
    expect(delta).toBeGreaterThan(0);
    expect(goalsFromState(compiled.state).gather).toBeGreaterThanOrEqual(0);
  });

  it("relief resample is bilinear wrapped-u clamped-v and +0 at amplitude 0", () => {
    expect(RELIEF_RESAMPLE).toBe("bilinear.wrapped-u.clamped-v");
    const field = emptyReliefField();
    field.samples[0] = 1;
    field.samples[1] = 2;
    const zero = resampleFieldToScaffold(field, 0);
    expect(zero.length).toBe(1000);
    for (let i = 0; i < zero.length; i++) expect(Object.is(zero[i], 0)).toBe(true);
    const src = reliefScaffoldSource(field, 0);
    expect(src.kind).toBe("relief");
    expect(src.amplitude).toBe(0);
    const captured = capturedScaffoldSource(null, 0);
    expect(captured.kind).toBe("captured");
    expect(captured.amplitude).toBe(0);
  });
});
