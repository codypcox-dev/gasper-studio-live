/**
 * Production/Tauri local-service fetch bridge.
 *
 * Development keeps relative URLs so Vite's proxy remains authoritative.
 * Built previews and packaged desktop surfaces do not have that proxy, so
 * AgentBridge service paths are routed to the owned loopback gateway.
 */

const SERVICE_PATH = /^\/(?:health|mcp|v1(?:\/|$))/;
const DEFAULT_CONTROL_BASE = "http://127.0.0.1:19528";

function controlBase(): string {
  const configured = String(import.meta.env.VITE_CONTROL_BASE || "").trim();
  return (configured || DEFAULT_CONTROL_BASE).replace(/\/$/, "");
}

function routedUrl(url: URL): URL | null {
  if (!SERVICE_PATH.test(url.pathname)) return null;

  // Never rewrite absolute requests already aimed at a loopback control plane
  // (primary 19528 or overflow 19529 / other loopback AgentBridge ports).
  if (
    (url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]") &&
    url.pathname.startsWith("/v1/studio-bridge")
  ) {
    return null;
  }

  // Never rewrite requests that already target the configured AgentBridge gateway.
  const base = new URL(controlBase());
  if (url.origin === base.origin) return null;

  return new URL(`${base.origin}${url.pathname}${url.search}${url.hash}`);
}

export function installLocalServiceFetchBridge(): void {
  // In development, Vite proxies /health, /mcp, and /v1 to AgentBridge.
  if (import.meta.env.DEV) return;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (typeof input === "string") {
        if (SERVICE_PATH.test(input)) {
          return originalFetch(`${controlBase()}${input}`, init);
        }
        return originalFetch(input, init);
      }

      if (input instanceof URL) {
        const routed = routedUrl(input);
        return originalFetch(routed ?? input, init);
      }

      if (input instanceof Request) {
        const routed = routedUrl(new URL(input.url));
        if (routed) {
          return originalFetch(new Request(routed, input), init);
        }
      }
    } catch {
      // Preserve native fetch behavior for malformed or unsupported inputs.
    }

    return originalFetch(input, init);
  }) as typeof globalThis.fetch;
}
