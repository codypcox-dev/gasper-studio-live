/**
 * GASPER-FINISH-01 / Task 2 (VEC-101) — deterministic asset-serving probe.
 *
 * Boots the canonical root Vite server on an ephemeral port and asserts:
 *  1. The authored showcase manifest is served (HTTP 200) with the expected
 *     pack identity.
 *  2. `10-showcase-project.gasper` is served with document id
 *     `doc-showcase-project` — the exact document GasperStudioApp requests
 *     first, so the app cannot silently fall back to seeded thinking-knit.
 *  3. One representative scene document (`01-presence-living-idle.gasper`)
 *     is served with its expected document id.
 *  4. The pre-existing root asset path `public/vendor/gsap/gsap.min.js`
 *     remains served (regression guard for the retained vendor route).
 *
 * Deterministic: fixed pack files, fixed document IDs, ephemeral localhost
 * port, no external network.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const PACK_ROUTE = "/demo/gasper-hero-pack-v1";

let server: ViteDevServer;
let base: string;

beforeAll(async () => {
  server = await createServer({
    root: ROOT,
    configFile: fileURLToPath(new URL("../../../vite.config.ts", import.meta.url)),
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("vite dev server did not bind a TCP port");
  }
  base = `http://127.0.0.1:${address.port}`;
}, 60_000);

afterAll(async () => {
  await server?.close();
});

describe("authored showcase pack serving (VEC-101)", () => {
  it("serves the pack manifest with the expected pack identity", async () => {
    const res = await fetch(`${base}${PACK_ROUTE}/manifest.json`);
    expect(res.status).toBe(200);
    const manifest = (await res.json()) as {
      pack_id?: string;
      document_hashes?: Record<string, string>;
    };
    expect(manifest.pack_id).toBe("gasper-hero-pack-v1");
    expect(manifest.document_hashes).toBeTypeOf("object");
    expect(
      Object.keys(manifest.document_hashes ?? {}),
    ).toContain("doc-showcase-project");
  });

  it("serves 10-showcase-project.gasper with document id doc-showcase-project", async () => {
    const res = await fetch(
      `${base}${PACK_ROUTE}/documents/10-showcase-project.gasper`,
    );
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { id?: string; format?: string };
    expect(doc.id).toBe("doc-showcase-project");
  });

  it("serves a representative scene document with its expected id", async () => {
    const res = await fetch(
      `${base}${PACK_ROUTE}/documents/01-presence-living-idle.gasper`,
    );
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { id?: string };
    expect(doc.id).toBe("doc-presence-living-idle");
  });

  it("retains the existing root vendor/gsap asset path", async () => {
    const res = await fetch(`${base}/vendor/gsap/gsap.min.js`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(1000);
  });

  it("fails closed on traversal outside the pack root", async () => {
    const res = await fetch(`${base}${PACK_ROUTE}/..%2F..%2Fpackage.json`);
    expect([403, 404]).toContain(res.status);
  });
});
