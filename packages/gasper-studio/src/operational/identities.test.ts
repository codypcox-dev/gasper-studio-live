import { afterEach, describe, expect, it } from "vitest";
import { shouldAutoStartAgentBridge } from "./identities";

type BridgeGlobals = typeof globalThis & {
  __GASPER_AGENT_BRIDGE_AUTOSTART__?: boolean;
  __GASPER_PACKAGED__?: boolean;
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

const bridgeGlobals = globalThis as BridgeGlobals;

function clearBridgeGlobals() {
  delete bridgeGlobals.__GASPER_AGENT_BRIDGE_AUTOSTART__;
  delete bridgeGlobals.__GASPER_PACKAGED__;
  delete bridgeGlobals.__TAURI__;
  delete bridgeGlobals.__TAURI_INTERNALS__;
}

describe("shouldAutoStartAgentBridge", () => {
  afterEach(clearBridgeGlobals);

  it("keeps ordinary browser previews standalone by default", () => {
    expect(shouldAutoStartAgentBridge()).toBe(false);
  });

  it("auto-starts for the packaged shell", () => {
    bridgeGlobals.__GASPER_PACKAGED__ = true;
    expect(shouldAutoStartAgentBridge()).toBe(true);
  });

  it("allows an explicit browser opt-in", () => {
    bridgeGlobals.__GASPER_AGENT_BRIDGE_AUTOSTART__ = true;
    expect(shouldAutoStartAgentBridge()).toBe(true);
  });

  it("allows an explicit opt-out even when packaged", () => {
    bridgeGlobals.__GASPER_PACKAGED__ = true;
    bridgeGlobals.__GASPER_AGENT_BRIDGE_AUTOSTART__ = false;
    expect(shouldAutoStartAgentBridge()).toBe(false);
  });
});
