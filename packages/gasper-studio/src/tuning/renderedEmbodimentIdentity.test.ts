import { describe, expect, it } from "vitest";
import {
  readLiveRenderedProfile,
  resolveRenderedEmbodiment,
} from "./renderedEmbodimentIdentity";

describe("rendered embodiment identity", () => {
  it("prefers the painted FormMaster profile over a stale presence document", () => {
    expect(
      resolveRenderedEmbodiment({
        renderedProfile: "wispwalker",
        authoredMainForm: "presence",
        documentEmbodiment: "presence",
        telemetryEmbodiment: "presence",
      }),
    ).toBe("wispwalker");
  });

  it("falls back to authored main form, then document, then telemetry", () => {
    expect(
      resolveRenderedEmbodiment({
        authoredMainForm: "wispwalker",
        documentEmbodiment: "presence",
      }),
    ).toBe("wispwalker");
    expect(
      resolveRenderedEmbodiment({
        documentEmbodiment: "wispwalker",
        telemetryEmbodiment: "presence",
      }),
    ).toBe("wispwalker");
    expect(resolveRenderedEmbodiment({ telemetryEmbodiment: "presence" })).toBe("presence");
    expect(resolveRenderedEmbodiment({})).toBeNull();
  });

  it("reads the live FormMaster snapshot when the walker is shown", () => {
    expect(
      readLiveRenderedProfile({
        getSnapshot: () => ({ profile: "wispwalker" }),
      }),
    ).toBe("wispwalker");
    expect(readLiveRenderedProfile({ getSnapshot: () => ({ profile: "presence" }) })).toBe(
      "presence",
    );
    expect(readLiveRenderedProfile(null)).toBeNull();
  });
});
