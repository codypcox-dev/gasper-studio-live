import { describe, expect, it, vi } from "vitest";

import { studioPilotActionBatchSchema } from "./StudioPilotProtocol.js";
import {
  StudioPilotExecutor,
  captureStudioPilotObservation,
  createStudioPilotCapabilityCatalog,
  type StudioPilotAuthorityDependencies,
} from "./StudioPilotAuthority.js";

function dependencies(): StudioPilotAuthorityDependencies {
  const tuningSnapshot = {
    state: { gaitBobGain: 1 },
    embodiment: "presence",
    baselinePinned: false,
    changedFromBaseline: false,
    revision: 3,
    telemetry: { physicsMode: "idle" },
  };
  const dais = {
    livingStatus: () => ({ running: true, reducedMotion: false, eightState: "presence-neutral-settled" }),
    getWorldPhysicsParams: () => ({ gravityScale: 1, restitution: 0.5, launchPower: 1, intensity: 1 }),
    getWorldBodyState: () => ({ mode: "idle", body: { x: 0, z: 0 } }),
    inspectReferencePerformance: () => null,
    setWorldPhysicsParams: vi.fn(),
    launchWorldBounce: vi.fn(),
    launchWorldComet: vi.fn(),
    disarmWorldBody: vi.fn(),
    runCraftPack: vi.fn(() => true),
    stopCraftPack: vi.fn(),
    setPerformancePackParams: vi.fn(),
    setCraftShotBias: vi.fn(),
    setWanderEnabled: vi.fn(),
    setLifeEnabled: vi.fn(),
    enableBoo: vi.fn(),
    startLiving: vi.fn(),
    stopLiving: vi.fn(),
    setMicrostate: vi.fn(),
  };
  return {
    adapter: {
      getSnapshot: () => ({
        character: { embodiment: "presence", expression: "neutral-settled" },
        animation: { playback: "paused", playheadMs: 120, activeClipId: null, clips: [], visibleRangeMs: { start: 0, end: 1_000 } },
      }),
      setEmbodiment: vi.fn(),
      setExpression: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      interrupt: vi.fn(),
      setPlayhead: vi.fn(),
    } as never,
    tuningLab: {
      snapshot: () => tuningSnapshot,
      set: vi.fn(() => ({ ok: true, action: "set", state: tuningSnapshot.state })),
      reset: vi.fn(() => ({ ok: true, action: "reset", state: tuningSnapshot.state })),
      pinBaseline: vi.fn(() => ({ ok: true, action: "pin-baseline", state: tuningSnapshot.state })),
      compareBaseline: vi.fn(() => ({ identical: true, changed: [] })),
      captureProof: vi.fn(() => ({ ok: true, bundleHash: "sha256:proof" })),
    } as never,
    referenceTraining: {
      snapshot: () => ({ status: "empty", revision: 0, sessionId: null, source: null, physicsPlan: null, errorCode: null }),
      linkVideo: vi.fn(async () => ({ ok: true, revision: 1, sessionId: "reference-1" })),
      analyze: vi.fn(async () => ({ ok: true, revision: 2, sessionId: "reference-1" })),
      cancel: vi.fn(() => ({ ok: true, revision: 2 })),
      preview: vi.fn(() => ({ ok: true, revision: 3 })),
      stopPreview: vi.fn(() => ({ ok: true, revision: 4 })),
    } as never,
    getDais: () => dais,
    now: () => 123,
  };
}

describe("Studio pilot browser authority", () => {
  it("publishes a closed catalog and projects observations without exposing methods", () => {
    const deps = dependencies();
    const catalog = createStudioPilotCapabilityCatalog(deps);
    const observation = captureStudioPilotObservation(deps);

    expect(catalog.some((entry) => entry.kind === "tuning.set" && entry.available)).toBe(true);
    expect(catalog.some((entry) => entry.kind.includes("shell") || entry.kind.includes("transform"))).toBe(false);
    expect(observation).toMatchObject({
      schema: "gasper.studio-pilot.observation.v1",
      capturedAtMs: 123,
      tuning: { revision: 3, embodiment: "presence" },
      physics: { params: { gravityScale: 1 }, body: { mode: "idle" } },
      reference: { status: "empty" },
    });
    expect(JSON.stringify(observation)).not.toMatch(/function|setWorldPhysicsParams|__GASPER_DAIS__/);
  });

  it("executes only typed public actions and emits one receipt per action", async () => {
    const deps = dependencies();
    const executor = new StudioPilotExecutor(deps);
    const batch = studioPilotActionBatchSchema.parse({
      schema: "gasper.studio-pilot.action-batch.v1",
      disposition: "act",
      summary: "Select and tune Wispwalker.",
      message: "Applying bounded controls.",
      continueOnError: false,
      actions: [
        { id: "form", kind: "studio.set_embodiment", reason: "Use the admitted form.", embodiment: "wispwalker" },
        { id: "bob", kind: "tuning.set", reason: "Reduce vertical travel.", parameter: "gaitBobGain", value: 0.65 },
        { id: "gravity", kind: "physics.set_params", reason: "Increase weight.", params: { gravityScale: 1.2 } },
        { id: "video", kind: "reference.link_video", reason: "Load measured source.", url: "https://example.com/move.mp4" },
      ],
    });

    const receipts = await executor.executeBatch(batch, new AbortController().signal);

    expect(receipts).toHaveLength(4);
    expect(receipts.every((receipt) => receipt.status === "applied")).toBe(true);
    expect(deps.adapter.setEmbodiment).toHaveBeenCalledWith("wispwalker");
    expect(deps.tuningLab.set).toHaveBeenCalledWith("gaitBobGain", 0.65);
    expect(deps.getDais()?.setWorldPhysicsParams).toHaveBeenCalledWith({ gravityScale: 1.2 });
    expect(deps.referenceTraining.linkVideo).toHaveBeenCalledWith("https://example.com/move.mp4");
  });

  it("stops a batch after authority rejection and marks the remainder skipped", async () => {
    const deps = dependencies();
    vi.mocked(deps.tuningLab.set).mockReturnValueOnce({ ok: false, action: "set", state: {} as never, error: "authority rejected" });
    const executor = new StudioPilotExecutor(deps);
    const batch = studioPilotActionBatchSchema.parse({
      schema: "gasper.studio-pilot.action-batch.v1",
      disposition: "act",
      summary: "Try two changes.",
      message: "Stopping on failure.",
      continueOnError: false,
      actions: [
        { id: "bad", kind: "tuning.set", reason: "Test rejection.", parameter: "gaitBobGain", value: 0.5 },
        { id: "later", kind: "physics.launch_bounce", reason: "Must not run after failure." },
      ],
    });

    const receipts = await executor.executeBatch(batch, new AbortController().signal);

    expect(receipts.map((receipt) => receipt.status)).toEqual(["failed", "skipped"]);
    expect(deps.getDais()?.launchWorldBounce).not.toHaveBeenCalled();
  });
});
