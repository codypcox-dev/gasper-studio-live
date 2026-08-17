import { describe, expect, it } from "vitest";
import { WISPWALKER_AUTHORING_DEFAULTS } from "./wispwalkerAuthoringDefaults";
import {
  captureCanonicalBaseline,
  factoryCanonicalBaseline,
  isCanonicalBaseline,
} from "./canonicalBaseline";

describe("canonical baseline", () => {
  it("factory is the Cody Wispwalker home", () => {
    const factory = factoryCanonicalBaseline();
    expect(factory.schema).toBe("gasper.canonical-baseline.v1");
    expect(factory.source).toBe("factory");
    expect(factory.embodiment).toBe("wispwalker");
    expect(factory.form).toEqual(WISPWALKER_AUTHORING_DEFAULTS.form);
    expect(factory.behavior.walkEnabled).toBe(1);
  });

  it("user capture is a named morphable snapshot", () => {
    const live = captureCanonicalBaseline({
      ...WISPWALKER_AUTHORING_DEFAULTS,
      form: { ...WISPWALKER_AUTHORING_DEFAULTS.form, crownAmp: 2 },
    });
    expect(isCanonicalBaseline(live)).toBe(true);
    expect(live.source).toBe("user");
    expect(live.form.crownAmp).toBe(2);
    expect(live.embodiment).toBe("wispwalker");
    expect(factoryCanonicalBaseline().form.crownAmp).toBe(-5);
  });
});
