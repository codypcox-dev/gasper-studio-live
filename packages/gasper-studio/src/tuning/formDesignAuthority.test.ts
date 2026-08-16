import { describe, expect, it, vi } from "vitest";
import {
  applyLiveFormDesignParameter,
  liveFormCoefficientFor,
} from "./formDesignAuthority";

describe("FormMaster live design authority", () => {
  it("keeps authored footwork keys on the direct coefficient route", () => {
    expect(liveFormCoefficientFor("foot_amp")).toBe("footAmp");
    expect(liveFormCoefficientFor("walk_amp")).toBe("walkAmp");
    expect(liveFormCoefficientFor("walk_accent")).toBe("walkAccent");
    expect(liveFormCoefficientFor("walk_period")).toBe("walkPeriod");
    expect(liveFormCoefficientFor("step_depth")).toBe("stepDepth");
  });

  it("does not misroute ordinary bindings or session-only tuning keys", () => {
    expect(liveFormCoefficientFor("overall_height")).toBeNull();
    expect(liveFormCoefficientFor("visco_tau")).toBeNull();
  });

  it("writes a mapped key through the direct live coefficient seam", () => {
    const setLiveFormCoeff = vi.fn();
    expect(
      applyLiveFormDesignParameter("foot_amp", 1.75, { setLiveFormCoeff }),
    ).toBe(true);
    expect(setLiveFormCoeff).toHaveBeenCalledWith("footAmp", 1.75);
  });
});
