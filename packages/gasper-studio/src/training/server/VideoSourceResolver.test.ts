import { Readable } from "node:stream";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildPinnedRequestOptions,
  resolveVideoSource,
  type MediaProbeResult,
  type RemoteResponse,
  type VideoSourceResolverDeps,
} from "./VideoSourceResolver.js";

const cleanupRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "gasper-video-source-"));
  cleanupRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const probe: MediaProbeResult = {
  durationMs: 1_000,
  widthPx: 640,
  heightPx: 360,
  frameRateHz: 30,
  container: "mov,mp4,m4a,3gp,3g2,mj2",
  videoCodec: "h264",
};

function deps(overrides: Partial<VideoSourceResolverDeps> = {}): VideoSourceResolverDeps {
  return {
    lookupHost: async () => [{ address: "93.184.216.34", family: 4 }],
    probeMedia: async () => probe,
    requestRemote: async () => {
      throw new Error("unexpected remote request");
    },
    ...overrides,
  };
}

describe("video source resolver", () => {
  it("builds transport options that connect to a validated IP without losing TLS host identity", () => {
    // Break caught: the network client could resolve the hostname a second
    // time after validation, reopening DNS-rebinding and TOCTOU SSRF risk.
    const options = buildPinnedRequestOptions({
      url: new URL("https://video.example:8443/path/move.mp4?token=ephemeral"),
      resolvedAddresses: [{ address: "93.184.216.34", family: 4 }],
      timeoutMs: 10_000,
    });

    expect(options).toMatchObject({
      protocol: "https:",
      hostname: "93.184.216.34",
      family: 4,
      port: 8443,
      path: "/path/move.mp4?token=ephemeral",
      servername: "video.example",
      headers: {
        Host: "video.example:8443",
        "Accept-Encoding": "identity",
      },
    });
  });

  it.each([
    "file:///C:/Windows/win.ini",
    "ftp://example.com/a.mp4",
    "https://user:pass@example.com/a.mp4",
    "http://localhost/a.mp4",
    "http://127.0.0.1/a.mp4",
    "http://169.254.169.254/latest/meta-data",
    "http://10.2.3.4/a.mp4",
    "http://172.16.2.3/a.mp4",
    "http://192.168.1.4/a.mp4",
    "http://[::1]/a.mp4",
    "http://[::ffff:172.16.0.1]/a.mp4",
    "http://[::ffff:169.254.169.254]/a.mp4",
    "http://[::ffff:ac10:1]/a.mp4",
    "http://[2002:7f00:0001::]/a.mp4",
    "http://[64:ff9b::7f00:1]/a.mp4",
  ])("rejects unsafe linked source %s before transport", async (url) => {
    // Break caught: a video link could become an SSRF/file-read primitive.
    const root = await tempRoot();
    let requested = false;

    await expect(
      resolveVideoSource(
        { kind: "url", url },
        { artifactRoot: join(root, "artifacts") },
        deps({
          requestRemote: async () => {
            requested = true;
            throw new Error("must not be called");
          },
        }),
      ),
    ).rejects.toThrow(/unsafe|protocol|credential|private|local/i);
    expect(requested).toBe(false);
  });

  it("fails closed when public-looking DNS resolves to any private address", async () => {
    // Break caught: a hostname could hide a loopback/private destination.
    const root = await tempRoot();

    await expect(
      resolveVideoSource(
        { kind: "url", url: "https://video.example/move.mp4" },
        { artifactRoot: join(root, "artifacts") },
        deps({
          lookupHost: async () => [
            { address: "93.184.216.34", family: 4 },
            { address: "127.0.0.1", family: 4 },
          ],
        }),
      ),
    ).rejects.toThrow(/private|unsafe/i);
  });

  it.each([
    "https://www.youtube.com/watch?v=abc",
    "https://youtu.be/abc",
    "https://vimeo.com/123456",
  ])("returns PROVIDER_REQUIRED for page link %s before transport", async (url) => {
    // Break caught: an HTML page could be downloaded and misrepresented as a
    // direct video instead of routing through an explicit provider adapter.
    const root = await tempRoot();
    let requested = false;
    const promise = resolveVideoSource(
      { kind: "url", url },
      { artifactRoot: join(root, "artifacts") },
      deps({
        requestRemote: async () => {
          requested = true;
          throw new Error("must not be called");
        },
      }),
    );

    await expect(promise).rejects.toMatchObject({ code: "PROVIDER_REQUIRED" });
    expect(requested).toBe(false);
  });

  it("revalidates every redirect and rejects a redirect into localhost", async () => {
    // Break caught: a safe first URL could redirect around the SSRF fence.
    const root = await tempRoot();
    let requests = 0;

    await expect(
      resolveVideoSource(
        { kind: "url", url: "https://video.example/move.mp4" },
        { artifactRoot: join(root, "artifacts") },
        deps({
          requestRemote: async (): Promise<RemoteResponse> => {
            requests += 1;
            return {
              status: 302,
              headers: { location: "http://127.0.0.1/private.mp4" },
              body: Readable.from([]),
            };
          },
        }),
      ),
    ).rejects.toThrow(/private|local|unsafe/i);
    expect(requests).toBe(1);
  });

  it("gives identical local and linked bytes one content identity", async () => {
    // Break caught: provenance route or chunking could alter the training
    // identity even when the source media bytes are exactly the same.
    const root = await tempRoot();
    const allowedRoot = join(root, "selected");
    const artifactRoot = join(root, "artifacts");
    const localPath = join(allowedRoot, "move.mp4");
    const bytes = Buffer.from("fixture-video-bytes\n");
    await mkdir(allowedRoot, { recursive: true });
    await writeFile(localPath, bytes);

    const local = await resolveVideoSource(
      { kind: "local", path: localPath },
      { artifactRoot, allowedLocalRoots: [allowedRoot] },
      deps(),
    );
    const linked = await resolveVideoSource(
      { kind: "url", url: "https://video.example/move.mp4" },
      { artifactRoot },
      deps({
        requestRemote: async (): Promise<RemoteResponse> => ({
          status: 200,
          headers: { "content-type": "video/mp4", "content-length": String(bytes.length) },
          body: Readable.from([bytes.subarray(0, 7), bytes.subarray(7)]),
        }),
      }),
    );

    expect(local.receipt.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(linked.receipt.contentHash).toBe(local.receipt.contentHash);
    expect(linked.artifactPath).toBe(local.artifactPath);
    expect(linked.receipt.sourceRef).not.toContain("?");
  });

  it("rejects local path escape and linked bodies beyond the byte cap", async () => {
    // Break caught: an input could read arbitrary local files or exhaust disk.
    const root = await tempRoot();
    const allowedRoot = join(root, "selected");
    const outside = join(root, "outside.mp4");
    await mkdir(allowedRoot, { recursive: true });
    await writeFile(outside, Buffer.from("outside"));

    await expect(
      resolveVideoSource(
        { kind: "local", path: outside },
        { artifactRoot: join(root, "artifacts"), allowedLocalRoots: [allowedRoot] },
        deps(),
      ),
    ).rejects.toThrow(/allowed|outside|root/i);

    await expect(
      resolveVideoSource(
        { kind: "url", url: "https://video.example/huge.mp4" },
        { artifactRoot: join(root, "artifacts"), maxBytes: 4 },
        deps({
          requestRemote: async (): Promise<RemoteResponse> => ({
            status: 200,
            headers: { "content-type": "video/mp4", "content-length": "5" },
            body: Readable.from([Buffer.from("12345")]),
          }),
        }),
      ),
    ).rejects.toThrow(/large|byte|limit/i);
  });

  it("cancels a stalled response body and enforces the media-duration budget", async () => {
    // Break caught: a slow-drip response or overlong clip could pin a Studio
    // training session indefinitely after response headers were accepted.
    const root = await tempRoot();
    const stalled = new Readable({ read() {} });
    await expect(
      resolveVideoSource(
        { kind: "url", url: "https://video.example/stalled.mp4" },
        { artifactRoot: join(root, "artifacts"), timeoutMs: 25 },
        deps({
          requestRemote: async (): Promise<RemoteResponse> => ({
            status: 200,
            headers: { "content-type": "video/mp4" },
            body: stalled,
          }),
        }),
      ),
    ).rejects.toThrow(/timed out|abort/i);

    const bytes = Buffer.from("short-but-long-duration");
    await expect(
      resolveVideoSource(
        { kind: "url", url: "https://video.example/long.mp4" },
        { artifactRoot: join(root, "artifacts"), maxDurationMs: 60_000 },
        deps({
          requestRemote: async (): Promise<RemoteResponse> => ({
            status: 200,
            headers: { "content-type": "video/mp4" },
            body: Readable.from([bytes]),
          }),
          probeMedia: async () => ({ ...probe, durationMs: 60_001 }),
        }),
      ),
    ).rejects.toThrow(/duration|long/i);
  });

  it("honors caller cancellation and rejects ambiguous octet-stream page bodies", async () => {
    // Break caught: closing/cancelling analysis would leave hidden network work
    // alive, or an extensionless HTML payload could consume the full byte cap.
    const root = await tempRoot();
    const controller = new AbortController();
    const stalled = new Readable({ read() {} });
    const resolving = resolveVideoSource(
      { kind: "url", url: "https://video.example/cancel.mp4" },
      { artifactRoot: join(root, "artifacts"), signal: controller.signal },
      deps({
        requestRemote: async (): Promise<RemoteResponse> => ({
          status: 200,
          headers: { "content-type": "video/mp4" },
          body: stalled,
        }),
      }),
    );
    controller.abort();
    await expect(resolving).rejects.toThrow(/abort|cancel/i);

    await expect(
      resolveVideoSource(
        { kind: "url", url: "https://video.example/download" },
        { artifactRoot: join(root, "artifacts") },
        deps({
          requestRemote: async (): Promise<RemoteResponse> => ({
            status: 200,
            headers: { "content-type": "application/octet-stream" },
            body: Readable.from([Buffer.from("<html>not video</html>")]),
          }),
        }),
      ),
    ).rejects.toThrow(/direct|media|extension|provider/i);
  });
});
