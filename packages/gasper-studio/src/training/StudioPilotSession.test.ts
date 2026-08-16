import { describe, expect, it, vi } from "vitest";

import type { StudioPilotAuthorityDependencies } from "./StudioPilotAuthority.js";
import { studioPilotActionBatchSchema } from "./StudioPilotProtocol.js";
import { StudioPilotSession } from "./StudioPilotSession.js";

function authority(): StudioPilotAuthorityDependencies {
  let revision = 0;
  let gaitBobGain = 1;
  const adapter = {
    getSnapshot: () => ({
      character: { embodiment: "wispwalker", expression: "neutral-settled" },
      animation: { playback: "paused", playheadMs: 0, activeClipId: null, clips: [], visibleRangeMs: { start: 0, end: 1_000 } },
    }),
    setEmbodiment: vi.fn(), setExpression: vi.fn(), play: vi.fn(), pause: vi.fn(), interrupt: vi.fn(), setPlayhead: vi.fn(),
  } as never;
  const dais = {
    livingStatus: () => ({ running: true, reducedMotion: false }),
    ownerReviewStatus: () => ({ wanderEnabled: false, lifeEnabled: false, boo: false }),
    getWorldPhysicsParams: () => ({ gravityScale: 1, restitution: 0.5, launchPower: 1, intensity: 1 }),
    setWorldPhysicsParams: vi.fn(), disarmWorldBody: vi.fn(), stopCraftPack: vi.fn(),
    setWanderEnabled: vi.fn(), setLifeEnabled: vi.fn(), enableBoo: vi.fn(), startLiving: vi.fn(), stopLiving: vi.fn(),
  };
  const state = () => ({
    verticalDepthGain: 1, craftExaggeration: 1.25, gaitBobGain, contactSquashGain: 1,
    supportExchangeGain: 1, footworkPrimitiveGain: 1, footRootGain: 1, walkAmp: 1.25,
    walkAccent: 0.6, stepDepth: 7.2, walkPeriod: 1.25, footworkTempo: 1,
    actingGain: 1, viscoTau: 0.25,
  });
  return {
    adapter,
    tuningLab: {
      snapshot: () => ({
        state: state(), embodiment: "wispwalker", baselinePinned: false,
        changedFromBaseline: false, revision, telemetry: {},
      }),
      set: vi.fn((id: string, value: number) => {
        if (id === "gaitBobGain") gaitBobGain = value;
        revision += 1;
        return { ok: true, action: "set", state: state() };
      }),
      reset: vi.fn(() => ({ ok: true, action: "reset", state: state() })),
      pinBaseline: vi.fn(() => ({ ok: true, action: "pin-baseline", state: state() })),
      compareBaseline: vi.fn(() => ({ identical: true, changed: [] })),
      captureProof: vi.fn(() => ({ ok: true, bundleHash: "proof" })),
    } as never,
    referenceTraining: {
      snapshot: () => ({ status: "empty", revision: 0, sessionId: null, source: null, physicsPlan: null, errorCode: null }),
      linkVideo: vi.fn(), analyze: vi.fn(), cancel: vi.fn(), preview: vi.fn(), stopPreview: vi.fn(),
    } as never,
    getDais: () => dais,
    now: () => revision + 1,
  };
}

const tuneBatch = studioPilotActionBatchSchema.parse({
  schema: "gasper.studio-pilot.action-batch.v1",
  disposition: "act",
  summary: "Reduce the gait bob.",
  message: "Applying one bounded change.",
  continueOnError: false,
  actions: [{ id: "bob", kind: "tuning.set", reason: "Reduce vertical travel.", parameter: "gaitBobGain", value: 0.65 }],
});

const completeBatch = studioPilotActionBatchSchema.parse({
  schema: "gasper.studio-pilot.action-batch.v1",
  disposition: "complete",
  summary: "Goal reached.",
  message: "Gait bob is now 0.65.",
  continueOnError: false,
  actions: [],
});

describe("Studio pilot iterative session", () => {
  it("feeds receipts and the new observation back to Grok before completing", async () => {
    const calls: unknown[] = [];
    const provider = {
      generateTurn: vi.fn(async (request: unknown) => {
        calls.push(request);
        return { responseId: `response-${calls.length}`, model: "grok-4.6" as const, batch: calls.length === 1 ? tuneBatch : completeBatch };
      }),
    };
    const session = new StudioPilotSession({ authority: authority(), provider, createId: () => "pilot-session" });

    await session.run("Make Wispwalker feel less vertically bouncy.", 4);

    expect(provider.generateTurn).toHaveBeenCalledTimes(2);
    expect(calls[1]).toMatchObject({
      turn: 2,
      history: [{ receipts: [{ status: "applied", kind: "tuning.set" }] }],
      observation: { tuning: { state: { gaitBobGain: 0.65 } } },
    });
    expect(session.snapshot()).toMatchObject({
      status: "complete",
      model: "grok-4.6",
      turn: 2,
      message: "Gait bob is now 0.65.",
      rollbackAvailable: true,
    });
  });

  it("fails closed at the iteration limit", async () => {
    const provider = { generateTurn: vi.fn(async () => ({ responseId: "again", model: "grok-4.6" as const, batch: tuneBatch })) };
    const session = new StudioPilotSession({ authority: authority(), provider, createId: () => "bounded-session" });

    await session.run("Keep changing forever.", 2);

    expect(provider.generateTurn).toHaveBeenCalledTimes(2);
    expect(session.snapshot()).toMatchObject({ status: "iteration_limit", turn: 2 });
  });

  it("cancels an in-flight provider and rolls the session back through public authorities", async () => {
    const deps = authority();
    const provider = {
      generateTurn: vi.fn((_request: unknown, signal: AbortSignal) => new Promise<never>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      })),
    };
    const session = new StudioPilotSession({ authority: deps, provider, createId: () => "cancel-session" });
    const running = session.run("Wait for Grok.", 4);
    session.cancel();
    await running;
    expect(session.snapshot().status).toBe("cancelled");

    await session.rollback();
    expect(deps.getDais()?.disarmWorldBody).toHaveBeenCalled();
    expect(deps.referenceTraining.cancel).toHaveBeenCalled();
    expect(session.snapshot().status).toBe("rolled_back");
  });
});
