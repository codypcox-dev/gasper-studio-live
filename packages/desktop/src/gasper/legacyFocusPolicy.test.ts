/**
 * CYCLE-7 FRAME BUDGET (frame-budget-phd-memo F2) — controlAlreadyNeutralized.
 *
 * The idempotent guard of the neutralize path. A control already at the full
 * neutralized target state is skipped with ZERO writes; any single missing
 * clause forces a full re-neutralize. These tests pin the guard so a future
 * edit cannot silently widen the skip (which would re-open the GASPER-007
 * hidden-focus hazard) nor tighten it (which would resurrect the mutation
 * storm the cycle exists to remove).
 */
import { describe, expect, it } from "vitest";
import {
  controlAlreadyNeutralized,
  type NeutralizeStateProbe,
} from "./legacyFocusPolicy";

const neutralized = (over: Partial<NeutralizeStateProbe> = {}): NeutralizeStateProbe => ({
  tag: "button",
  inputType: undefined,
  legacyCompat: true,
  productAutomation: "exclude",
  ariaHidden: "true",
  tabIndex: -1,
  pointerEvents: "none",
  disabled: true,
  hasHref: false,
  ...over,
});

describe("controlAlreadyNeutralized — full target state is required", () => {
  it("accepts a fully neutralized button", () => {
    expect(controlAlreadyNeutralized(neutralized())).toBe(true);
  });

  it("rejects when any single clause is missing", () => {
    expect(controlAlreadyNeutralized(neutralized({ legacyCompat: false }))).toBe(false);
    expect(controlAlreadyNeutralized(neutralized({ productAutomation: null }))).toBe(false);
    expect(controlAlreadyNeutralized(neutralized({ ariaHidden: null }))).toBe(false);
    expect(controlAlreadyNeutralized(neutralized({ ariaHidden: "false" }))).toBe(false);
    expect(controlAlreadyNeutralized(neutralized({ tabIndex: 0 }))).toBe(false);
    expect(controlAlreadyNeutralized(neutralized({ pointerEvents: "auto" }))).toBe(false);
  });
});

describe("controlAlreadyNeutralized — disabled / href clauses mirror neutralize", () => {
  it("form controls must be disabled", () => {
    for (const tag of ["button", "select", "textarea"]) {
      expect(controlAlreadyNeutralized(neutralized({ tag, disabled: true }))).toBe(true);
      expect(controlAlreadyNeutralized(neutralized({ tag, disabled: false }))).toBe(false);
    }
  });

  it("inputs are neutralized when disabled, except range/hidden stay writable", () => {
    expect(controlAlreadyNeutralized(neutralized({ tag: "input", disabled: true }))).toBe(true);
    expect(controlAlreadyNeutralized(neutralized({ tag: "input", disabled: false }))).toBe(false);
    // Ranges stay value-writable for FormMaster — never disabled, still neutralized.
    expect(
      controlAlreadyNeutralized(neutralized({ tag: "input", inputType: "range", disabled: false })),
    ).toBe(true);
    expect(
      controlAlreadyNeutralized(neutralized({ tag: "input", inputType: "hidden", disabled: false })),
    ).toBe(true);
  });

  it("anchors are neutralized only once href is removed", () => {
    expect(controlAlreadyNeutralized(neutralized({ tag: "a", hasHref: false }))).toBe(true);
    expect(controlAlreadyNeutralized(neutralized({ tag: "a", hasHref: true }))).toBe(false);
  });

  it("non-interactive containers pass once the attribute clauses hold", () => {
    expect(controlAlreadyNeutralized(neutralized({ tag: "div", disabled: false }))).toBe(true);
  });
});
