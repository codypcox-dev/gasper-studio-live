import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StudioPilotSession } from "../training/StudioPilotSession.js";
import { TuningLabPanel } from "./TuningLabPanel.js";
import { TuningLabSession } from "./tuningRegistry.js";

describe("Tuning Lab Grok pilot prompt", () => {
  it("identifies the real model and reviewable in-app authority on the existing prompt", () => {
    const pilot = {
      subscribe: () => () => undefined,
      snapshot: () => ({
        status: "idle",
        model: "grok-4.6",
        sessionId: null,
        goal: "",
        turn: 0,
        maxTurns: 4,
        message: "Grok 4.6 is ready for a bounded Studio instruction.",
        error: null,
        history: [],
        receipts: [],
        observation: null,
        rollbackAvailable: false,
      }),
      run: async () => undefined,
      cancel: () => undefined,
      rollback: async () => undefined,
    } as unknown as StudioPilotSession;

    const html = renderToStaticMarkup(<TuningLabPanel lab={new TuningLabSession()} studioPilot={pilot} />);

    expect(html).toMatch(/Grok 4\.6/);
    expect(html).toMatch(/22 typed controls/);
    expect(html).toMatch(/inspect.*act.*observe.*revise/i);
    expect(html).toContain('data-testid="tuning-lab-intent"');
    expect(html).toContain('data-testid="tuning-lab-apply-intent"');
    expect(html).toMatch(/Run Grok/);
    expect(html).not.toMatch(/system\.shell|filesystem control|direct transform/i);
  });
});
