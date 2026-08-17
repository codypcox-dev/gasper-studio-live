import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MACHINE_DEFAULT,
  PRESENCE_IDS,
  reduceMachine,
} from "./GasperStateMachine";

const painter = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "all-script-3.js"),
  "utf8",
);

describe("GasperStateMachine", () => {
  it("starts at rest / idle / neutral", () => {
    expect(MACHINE_DEFAULT.locomotion).toBe("rest");
    expect(MACHINE_DEFAULT.gaitGate).toBe(0);
    expect(MACHINE_DEFAULT.takePlay).toBe(false);
    expect(MACHINE_DEFAULT.eightState).toBe("presence-neutral-settled");
  });

  it("walk and 20s raise the gate; rest drops it", () => {
    const walked = reduceMachine(MACHINE_DEFAULT, { type: "walk" });
    expect(walked.locomotion).toBe("walk");
    expect(walked.take).toBe("playing");
    expect(walked.gaitGate).toBe(1);
    const home = reduceMachine(walked, { type: "rest" });
    expect(home.gaitGate).toBe(0);
    expect(home.take).toBe("idle");
  });

  it("presence never flips locomotion or take", () => {
    const walked = reduceMachine(MACHINE_DEFAULT, { type: "play20" });
    const think = reduceMachine(walked, { type: "presence", id: "presence-thinking-knit" });
    expect(think.locomotion).toBe("walk");
    expect(think.takePlay).toBe(true);
    expect(think.presence).toBe("presence-thinking-knit");
    expect(think.gaitGate).toBe(1);
  });

  it("presence has no walk/run/plant", () => {
    expect(PRESENCE_IDS.some((id) => /walk|run|plant/i.test(id))).toBe(false);
  });

  it("does not write the hull", () => {
    expect(painter).not.toContain("__GASPER_MACHINE__");
    expect(painter).not.toContain("reduceMachine");
  });
});
