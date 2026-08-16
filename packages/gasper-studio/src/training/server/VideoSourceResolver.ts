import { createHash } from "node:crypto";
import { once } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, realpath, rename, stat, unlink } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest, type RequestOptions as HttpsRequestOptions } from "node:https";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import { videoSourceReceiptSchema } from "../../../../shared/src/gasper-performance/reference/schemas.js";
import type { VideoSourceReceipt } from "../../../../shared/src/gasper-performance/reference/types.js";

export type VideoSourceInput =
  | Readonly<{ kind: "local"; path: string }>
  | Readonly<{ kind: "url"; url: string }>;

export type MediaProbeResult = VideoSourceReceipt["media"];

export type ResolvedAddress = Readonly<{ address: string; family: number }>;

export type RemoteResponse = Readonly<{
  status: number;
  headers: Readonly<Record<string, string | undefined>>;
  body: Readable;
}>;

export type PinnedRequestOptions = HttpsRequestOptions & Readonly<{
  protocol: "http:" | "https:";
  hostname: string;
  family: number;
  port: number;
  path: string;
  headers: Readonly<Record<string, string>>;
}>;

export type VideoSourceResolverDeps = Readonly<{
  lookupHost: (hostname: string) => Promise<readonly ResolvedAddress[]>;
  probeMedia: (path: string, signal?: AbortSignal, timeoutMs?: number) => Promise<MediaProbeResult>;
  requestRemote: (request: Readonly<{
    url: URL;
    resolvedAddresses: readonly ResolvedAddress[];
    timeoutMs: number;
    signal?: AbortSignal;
  }>) => Promise<RemoteResponse>;
}>;

export type VideoSourceResolverOptions = Readonly<{
  artifactRoot: string;
  allowedLocalRoots?: readonly string[];
  maxBytes?: number;
  timeoutMs?: number;
  maxDurationMs?: number;
  maxRedirects?: number;
  signal?: AbortSignal;
}>;

export type ResolvedVideoSource = Readonly<{
  receipt: VideoSourceReceipt;
  artifactPath: string;
}>;

const RESOLVER_ID = "gasper-video-source-resolver";
const RESOLVER_VERSION = "1.0.0";
const DEFAULT_MAX_BYTES = 512 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_DURATION_MS = 15 * 60 * 1_000;
const DEFAULT_MAX_REDIRECTS = 4;
const ALLOWED_MEDIA_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "application/octet-stream",
]);
const DIRECT_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".mkv", ".m4v"]);

export type VideoSourceErrorCode =
  | "ABORTED"
  | "DURATION_LIMIT"
  | "PROVIDER_REQUIRED"
  | "TIMEOUT";

export class VideoSourceError extends Error {
  readonly code: VideoSourceErrorCode;

  constructor(code: VideoSourceErrorCode, message: string) {
    super(message);
    this.name = "VideoSourceError";
    this.code = code;
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new VideoSourceError("ABORTED", "video source resolution was aborted by the caller");
  }
}

function parseIpv4(address: string): readonly number[] | null {
  const parts = address.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : null;
}

function unsafeIpv4Parts(parts: readonly number[]): boolean {
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b! >= 64 && b! <= 127) ||
    a! >= 224
  );
}

function parseIpv6Hextets(address: string): readonly number[] | null {
  let value = address.toLowerCase().split("%", 1)[0] ?? address.toLowerCase();
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const ipv4 = parseIpv4(value.slice(lastColon + 1));
    if (lastColon < 0 || !ipv4) return null;
    const high = (ipv4[0]! << 8) | ipv4[1]!;
    const low = (ipv4[2]! << 8) | ipv4[3]!;
    value = `${value.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`;
  }
  if (value.split("::").length > 2) return null;
  const [leftText, rightText] = value.split("::");
  const left = leftText ? leftText.split(":") : [];
  const right = rightText ? rightText.split(":") : [];
  if (!value.includes("::") && left.length !== 8) return null;
  if (left.length + right.length > 8) return null;
  const fill = value.includes("::") ? Array(8 - left.length - right.length).fill("0") : [];
  const values = [...left, ...fill, ...right].map((part) => Number.parseInt(part, 16));
  return values.length === 8 && values.every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff)
    ? values
    : null;
}

function unsafeAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0] ?? address.toLowerCase();
  const family = isIP(normalized);
  if (family === 4) {
    const parts = parseIpv4(normalized);
    return !parts || unsafeIpv4Parts(parts);
  }
  if (family === 6) {
    const parts = parseIpv6Hextets(normalized);
    if (!parts) return true;
    const [a, b, c, d, e, f, g, h] = parts;
    const mapped = a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0xffff;
    if (mapped) {
      return unsafeIpv4Parts([g! >> 8, g! & 0xff, h! >> 8, h! & 0xff]);
    }
    return (
      parts.every((part) => part === 0) ||
      (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && g === 0 && h === 1) ||
      (a! & 0xfe00) === 0xfc00 ||
      (a! & 0xffc0) === 0xfe80 ||
      (a! & 0xff00) === 0xff00 ||
      // Fail closed for transition formats that can embed a forbidden IPv4 destination.
      a === 0x2002 ||
      (a === 0x0064 && b === 0xff9b) ||
      (a === 0x2001 && b === 0x0000) ||
      (a === 0x2001 && b === 0x0db8)
    );
  }
  return true;
}

function requiresProviderAdapter(url: URL): boolean {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  return hostname === "youtube.com" || hostname === "youtu.be" || hostname === "vimeo.com";
}

async function validateRemoteUrl(
  value: string | URL,
  lookupHost: VideoSourceResolverDeps["lookupHost"],
  signal?: AbortSignal,
): Promise<Readonly<{ url: URL; resolvedAddresses: readonly ResolvedAddress[] }>> {
  throwIfAborted(signal);
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value) : new URL(value);
  } catch {
    throw new Error("invalid video source URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsafe video source protocol; only http(s) direct media is supported");
  }
  if (url.username || url.password) {
    throw new Error("credentialed video source URLs are unsafe");
  }
  if (requiresProviderAdapter(url)) {
    throw new VideoSourceError(
      "PROVIDER_REQUIRED",
      "linked provider pages require an explicit video provider adapter",
    );
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname.toLowerCase() === "localhost" || hostname.toLowerCase().endsWith(".localhost")) {
    throw new Error("local video source hosts are unsafe");
  }
  if (isIP(hostname) && unsafeAddress(hostname)) {
    throw new Error("private or local video source address is unsafe");
  }

  const resolvedAddresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookupHost(hostname);
  throwIfAborted(signal);
  if (resolvedAddresses.length === 0 || resolvedAddresses.some((entry) => unsafeAddress(entry.address))) {
    throw new Error("video source resolved to a private, local, or unsafe address");
  }
  return { url, resolvedAddresses };
}

function sanitizedSourceRef(url: URL): string {
  const sanitized = new URL(url);
  sanitized.username = "";
  sanitized.password = "";
  sanitized.search = "";
  sanitized.hash = "";
  return sanitized.toString();
}

function assertedByteLimit(value: number | undefined): number {
  const maxBytes = value ?? DEFAULT_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("maxBytes must be a positive safe integer");
  }
  return maxBytes;
}

function assertedPositiveLimit(value: number | undefined, fallback: number, name: string): number {
  const limit = value ?? fallback;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return limit;
}

async function hashLocalFile(
  path: string,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<Readonly<{ hash: string; bytes: number }>> {
  throwIfAborted(signal);
  const info = await stat(path);
  if (!info.isFile()) throw new Error("selected local video is not a file");
  if (info.size <= 0) throw new Error("selected local video is empty");
  if (info.size > maxBytes) throw new Error(`selected local video exceeds byte limit ${maxBytes}`);
  const hasher = createHash("sha256");
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    throwIfAborted(signal);
    hasher.update(chunk as Buffer);
  }
  return { hash: hasher.digest("hex"), bytes: info.size };
}

async function assertAllowedLocalPath(path: string, roots: readonly string[] | undefined): Promise<string> {
  if (!roots || roots.length === 0) {
    throw new Error("local video source requires an explicit allowed root");
  }
  const realFile = await realpath(resolve(path));
  for (const root of roots) {
    const realRoot = await realpath(resolve(root));
    const rel = relative(realRoot, realFile);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
      return realFile;
    }
  }
  throw new Error("selected local video is outside the allowed root");
}

function artifactExtension(source: string): string {
  const extension = extname(new URL(source, "https://gasper.invalid").pathname).toLowerCase();
  return /^[.][a-z0-9]{1,8}$/.test(extension) ? extension : ".media";
}

async function placeContentAddressed(
  tempPath: string,
  artifactRoot: string,
  hash: string,
  extension: string,
): Promise<string> {
  const sourcesRoot = join(resolve(artifactRoot), "sources");
  await mkdir(sourcesRoot, { recursive: true });
  const finalPath = join(sourcesRoot, `${hash}${extension}`);
  try {
    await stat(finalPath);
    await unlink(tempPath).catch(() => undefined);
    return finalPath;
  } catch {
    await rename(tempPath, finalPath);
    return finalPath;
  }
}

async function copyLocalToArtifact(
  sourcePath: string,
  artifactRoot: string,
  hash: string,
  extension: string,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal);
  const sourcesRoot = join(resolve(artifactRoot), "sources");
  await mkdir(sourcesRoot, { recursive: true });
  const finalPath = join(sourcesRoot, `${hash}${extension}`);
  try {
    await stat(finalPath);
    return finalPath;
  } catch {
    const tempPath = join(sourcesRoot, `.incoming-${randomUUID()}`);
    await pipeline(
      createReadStream(sourcePath),
      createWriteStream(tempPath, { flags: "wx" }),
      signal ? { signal } : {},
    );
    return placeContentAddressed(tempPath, artifactRoot, hash, extension);
  }
}

async function writeBoundedRemote(
  response: RemoteResponse,
  artifactRoot: string,
  maxBytes: number,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Readonly<{ tempPath: string; hash: string; bytes: number }>> {
  const declared = Number(response.headers["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) {
    response.body.destroy();
    throw new Error(`linked video exceeds byte limit ${maxBytes}`);
  }
  const sourcesRoot = join(resolve(artifactRoot), "sources");
  await mkdir(sourcesRoot, { recursive: true });
  const tempPath = join(sourcesRoot, `.incoming-${randomUUID()}`);
  const output = createWriteStream(tempPath, { flags: "wx" });
  const hasher = createHash("sha256");
  let bytes = 0;
  let terminalError: Error | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const terminate = (error: Error): void => {
    terminalError ??= error;
    response.body.destroy(error);
  };
  const resetIdleTimer = (): void => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      terminate(new VideoSourceError("TIMEOUT", `linked video body timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  };
  const abort = (): void => {
    terminate(new VideoSourceError("ABORTED", "video source resolution was aborted by the caller"));
  };
  try {
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (terminalError) throw terminalError;
    resetIdleTimer();
    for await (const chunkValue of response.body) {
      if (terminalError) throw terminalError;
      resetIdleTimer();
      const chunk = Buffer.isBuffer(chunkValue) ? chunkValue : Buffer.from(chunkValue as Uint8Array);
      bytes += chunk.length;
      if (bytes > maxBytes) throw new Error(`linked video exceeds byte limit ${maxBytes}`);
      hasher.update(chunk);
      if (!output.write(chunk)) await once(output, "drain");
    }
    if (bytes <= 0) throw new Error("linked video response was empty");
    output.end();
    await once(output, "finish");
    return { tempPath, hash: hasher.digest("hex"), bytes };
  } catch (error) {
    output.destroy();
    response.body.destroy();
    await unlink(tempPath).catch(() => undefined);
    throw terminalError ?? error;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    signal?.removeEventListener("abort", abort);
  }
}

async function resolveRemote(
  sourceUrl: string,
  options: VideoSourceResolverOptions,
  deps: VideoSourceResolverDeps,
): Promise<Readonly<{ sourceRef: string; artifactPath: string; hash: string; bytes: number }>> {
  const timeoutMs = assertedPositiveLimit(options.timeoutMs, DEFAULT_TIMEOUT_MS, "timeoutMs");
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0) {
    throw new Error("maxRedirects must be a non-negative safe integer");
  }
  const maxBytes = assertedByteLimit(options.maxBytes);
  let next: string | URL = sourceUrl;

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    throwIfAborted(options.signal);
    const target = await validateRemoteUrl(next, deps.lookupHost, options.signal);
    const response = await deps.requestRemote({ ...target, timeoutMs, signal: options.signal });
    if (options.signal?.aborted) {
      response.body.destroy();
      throwIfAborted(options.signal);
    }
    if (response.status >= 300 && response.status < 400) {
      response.body.destroy();
      const location = response.headers.location;
      if (!location) throw new Error("linked video redirect omitted Location");
      if (redirects === maxRedirects) throw new Error("linked video exceeded redirect limit");
      next = new URL(location, target.url);
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      response.body.destroy();
      throw new Error(`linked video returned HTTP ${response.status}`);
    }
    const mediaType = (response.headers["content-type"] ?? "application/octet-stream")
      .split(";", 1)[0]!
      .trim()
      .toLowerCase();
    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
      response.body.destroy();
      throw new Error(`linked source is not direct supported video media (${mediaType || "missing type"})`);
    }
    if (
      mediaType === "application/octet-stream" &&
      !DIRECT_VIDEO_EXTENSIONS.has(extname(target.url.pathname).toLowerCase())
    ) {
      response.body.destroy();
      throw new Error("ambiguous octet-stream source is not a direct video extension; provider adapter required");
    }
    const downloaded = await writeBoundedRemote(
      response,
      options.artifactRoot,
      maxBytes,
      timeoutMs,
      options.signal,
    );
    const artifactPath = await placeContentAddressed(
      downloaded.tempPath,
      options.artifactRoot,
      downloaded.hash,
      artifactExtension(target.url.toString()),
    );
    return {
      sourceRef: sanitizedSourceRef(target.url),
      artifactPath,
      hash: downloaded.hash,
      bytes: downloaded.bytes,
    };
  }
  throw new Error("linked video redirect resolution failed");
}

/**
 * Build request options whose socket connects to a previously validated
 * literal address. TLS identity and HTTP routing remain bound to the source
 * hostname, so the transport never performs a second DNS lookup.
 */
export function buildPinnedRequestOptions(input: Readonly<{
  url: URL;
  resolvedAddresses: readonly ResolvedAddress[];
  timeoutMs: number;
}>): PinnedRequestOptions {
  const hostname = input.url.hostname.replace(/^\[|\]$/g, "");
  const selected = input.resolvedAddresses.find(
    (entry) => (entry.family === 4 || entry.family === 6) && !unsafeAddress(entry.address),
  );
  if (!selected) throw new Error("no validated public address available for pinned transport");
  if (input.url.protocol !== "http:" && input.url.protocol !== "https:") {
    throw new Error("pinned transport supports only http(s)");
  }
  const secure = input.url.protocol === "https:";
  return {
    protocol: input.url.protocol,
    hostname: selected.address,
    family: selected.family,
    port: Number(input.url.port || (secure ? 443 : 80)),
    path: `${input.url.pathname}${input.url.search}`,
    method: "GET",
    ...(secure ? { servername: hostname, rejectUnauthorized: true } : {}),
    headers: {
      Host: input.url.host,
      Accept: "video/*,application/octet-stream;q=0.8",
      "Accept-Encoding": "identity",
      Connection: "close",
      "User-Agent": `${RESOLVER_ID}/${RESOLVER_VERSION}`,
    },
    timeout: input.timeoutMs,
  };
}

const defaultDeps: VideoSourceResolverDeps = {
  lookupHost: async (hostname) => {
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.map((record) => ({ address: record.address, family: record.family }));
  },
  probeMedia: probeMediaWithFfprobe,
  requestRemote: requestRemotePinned,
};

/**
 * Resolve a selected local file or a direct public video URL into immutable,
 * content-addressed local bytes and a strict provenance receipt.
 */
export async function resolveVideoSource(
  input: VideoSourceInput,
  options: VideoSourceResolverOptions,
  dependencies: Partial<VideoSourceResolverDeps> = {},
): Promise<ResolvedVideoSource> {
  const deps = { ...defaultDeps, ...dependencies };
  let sourceKind: VideoSourceReceipt["sourceKind"];
  let sourceRef: string;
  let artifactPath: string;
  let hash: string;
  let bytes: number;

  if (input.kind === "local") {
    sourceKind = "local";
    const realFile = await assertAllowedLocalPath(input.path, options.allowedLocalRoots);
    const identity = await hashLocalFile(realFile, assertedByteLimit(options.maxBytes), options.signal);
    sourceRef = `selected:sha256:${identity.hash}`;
    artifactPath = await copyLocalToArtifact(
      realFile,
      options.artifactRoot,
      identity.hash,
      artifactExtension(realFile),
      options.signal,
    );
    hash = identity.hash;
    bytes = identity.bytes;
  } else {
    sourceKind = "direct_url";
    const remote = await resolveRemote(input.url, options, deps);
    sourceRef = remote.sourceRef;
    artifactPath = remote.artifactPath;
    hash = remote.hash;
    bytes = remote.bytes;
  }

  try {
    const timeoutMs = assertedPositiveLimit(options.timeoutMs, DEFAULT_TIMEOUT_MS, "timeoutMs");
    const maxDurationMs = assertedPositiveLimit(
      options.maxDurationMs,
      DEFAULT_MAX_DURATION_MS,
      "maxDurationMs",
    );
    throwIfAborted(options.signal);
    const media = await deps.probeMedia(artifactPath, options.signal, timeoutMs);
    if (media.durationMs > maxDurationMs) {
      throw new VideoSourceError(
        "DURATION_LIMIT",
        `video duration ${media.durationMs}ms exceeds limit ${maxDurationMs}ms`,
      );
    }
    const receipt = videoSourceReceiptSchema.parse({
      schema: "gasper.video-source-receipt.v1",
      id: `source-${hash}`,
      sourceKind,
      sourceRef,
      contentHash: `sha256:${hash}`,
      byteLength: bytes,
      media,
      resolver: { id: RESOLVER_ID, version: RESOLVER_VERSION },
    }) as VideoSourceReceipt;
    return { receipt, artifactPath };
  } catch (error) {
    // The content-addressed source may be shared by an earlier valid receipt;
    // do not delete it here. The artifact store owns garbage collection.
    if (error instanceof VideoSourceError) throw error;
    throw new Error(`video media probe rejected source: ${error instanceof Error ? error.message : String(error)}`);
  }
}

type FfprobeJson = Readonly<{
  streams?: readonly Readonly<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
    r_frame_rate?: string;
    duration?: string;
  }>[];
  format?: Readonly<{ duration?: string; format_name?: string }>;
}>;

function parseRate(value: string | undefined): number {
  if (!value) return 0;
  const [numerator, denominator = "1"] = value.split("/");
  const n = Number(numerator);
  const d = Number(denominator);
  return Number.isFinite(n) && Number.isFinite(d) && d !== 0 ? n / d : 0;
}

export async function probeMediaWithFfprobe(
  path: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<MediaProbeResult> {
  throwIfAborted(signal);
  const output = await new Promise<string>((resolveOutput, reject) => {
    const child = spawn(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", path],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      fail(new VideoSourceError("TIMEOUT", `ffprobe timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const cleanup = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      child.kill();
      reject(error);
    };
    const abort = (): void => {
      fail(new VideoSourceError("ABORTED", "video media probe was aborted by the caller"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 2_000_000) fail(new Error("ffprobe output exceeded safe limit"));
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", fail);
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (code === 0) resolveOutput(stdout);
      else reject(new Error(`ffprobe failed (${code}): ${stderr.trim() || "unknown error"}`));
    });
  });
  const parsed = JSON.parse(output) as FfprobeJson;
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error("media contains no video stream");
  const durationSeconds = Number(video.duration ?? parsed.format?.duration);
  const frameRateHz = parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate);
  const result: MediaProbeResult = {
    durationMs: durationSeconds * 1_000,
    widthPx: Number(video.width),
    heightPx: Number(video.height),
    frameRateHz,
    container: parsed.format?.format_name ?? "unknown",
    videoCodec: video.codec_name ?? "unknown",
  };
  if (
    !Number.isFinite(result.durationMs) || result.durationMs <= 0 ||
    !Number.isInteger(result.widthPx) || result.widthPx <= 0 ||
    !Number.isInteger(result.heightPx) || result.heightPx <= 0 ||
    !Number.isFinite(result.frameRateHz) || result.frameRateHz <= 0
  ) {
    throw new Error("ffprobe returned incomplete or invalid video metadata");
  }
  return result;
}

/**
 * Default network transport. The DNS validation result is carried with the
 * request contract; production deployment must use a transport that pins the
 * socket to one of those validated addresses. Until then, fail closed.
 */
export async function requestRemotePinned(input: Readonly<{
  url: URL;
  resolvedAddresses: readonly ResolvedAddress[];
  timeoutMs: number;
  signal?: AbortSignal;
}>): Promise<RemoteResponse> {
  throwIfAborted(input.signal);
  const options = buildPinnedRequestOptions(input);
  const requestFn = options.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolveResponse, reject) => {
    const abort = (): void => {
      request.destroy(new VideoSourceError("ABORTED", "linked video request was aborted by the caller"));
    };
    const request = requestFn(options, (response) => {
      input.signal?.removeEventListener("abort", abort);
      const headers: Record<string, string | undefined> = {};
      for (const [name, value] of Object.entries(response.headers)) {
        headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
      }
      resolveResponse({
        status: response.statusCode ?? 0,
        headers,
        body: response,
      });
    });
    request.setTimeout(input.timeoutMs, () => {
      request.destroy(new VideoSourceError("TIMEOUT", `linked video request timed out after ${input.timeoutMs}ms`));
    });
    input.signal?.addEventListener("abort", abort, { once: true });
    request.on("error", (error) => {
      input.signal?.removeEventListener("abort", abort);
      reject(error);
    });
    request.end();
  });
}
