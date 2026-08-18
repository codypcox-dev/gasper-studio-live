import { describe, expect, it } from "vitest";
import { defaultGeoGraph } from "../geonodes/defaultGraph";
import {
  applyRevisionSculpt,
  captureRevision,
  decodeSculpt,
  encodeSculpt,
  factoryRevision,
  isGasperRevision,
  REVISION_SCHEMA,
} from "./GasperRevision";
import { readLiveSculpt, writeLiveSculpt } from "./sculptHost";

describe("gasper.revision.v1", () => {
  it("encodes only non-zero sculpt pairs", () => {
    const dense = new Array(2000).fill(0);
    dense[7] = 1.5;
    dense[1999] = -0.25;
    const codec = encodeSculpt(dense);
    expect(codec.n).toBe(2000);
    expect(codec.nz).toEqual([
      [7, 1.5],
      [1999, -0.25],
    ]);
    expect(decodeSculpt(codec)[7]).toBe(1.5);
    expect(decodeSculpt(codec)[8]).toBe(0);
  });

  it("factory is a read-only zero-sculpt publish", () => {
    const f = factoryRevision();
    expect(f.schema).toBe(REVISION_SCHEMA);
    expect(f.kind).toBe("factory");
    expect(f.sculpt.nz).toEqual([]);
    expect(f.take?.id).toBe("take-northstar-20s");
    expect(f.take?.tracks?.["pearl.depth"]).toBeDefined();
    expect(isGasperRevision(f)).toBe(true);
  });

  it("round-trips a captured look onto the live field", () => {
    const dense = new Array(2000).fill(0);
    dense[40] = 3;
    writeLiveSculpt(dense);
    const rev = captureRevision({
      name: "paddle-study",
      kind: "publish",
      graph: defaultGeoGraph(),
      showGrid: true,
    });
    writeLiveSculpt(new Array(2000).fill(0));
    applyRevisionSculpt(rev);
    expect(readLiveSculpt()[40]).toBe(3);
    expect(rev.sourcePin).toBe("checkpoint-live-skin-20260818");
  });
});
