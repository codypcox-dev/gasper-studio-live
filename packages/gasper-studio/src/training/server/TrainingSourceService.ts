import { randomUUID } from "node:crypto";
import { readdir, realpath, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import type { ResolvedReferenceSource } from "../ReferenceTrainingSession.js";
import {
  resolveVideoSource,
  type ResolvedVideoSource,
  type VideoSourceInput,
  type VideoSourceResolverOptions,
} from "./VideoSourceResolver.js";
import {
  TrainingSessionStore,
  type TrainingStage,
} from "./TrainingSessionStore.js";

type ResolveSource = (
  input: VideoSourceInput,
  options: VideoSourceResolverOptions,
) => Promise<ResolvedVideoSource>;

export type TrainingSourceServiceOptions = Readonly<{
  createSessionId?: () => string;
  resolveSource?: ResolveSource;
  maxBytes?: number;
  maxDurationMs?: number;
  timeoutMs?: number;
}>;

export class TrainingSourceService {
  readonly store: TrainingSessionStore;
  private readonly root: string;
  private readonly createSessionId: () => string;
  private readonly resolveSource: ResolveSource;
  private readonly limits: Pick<
    VideoSourceResolverOptions,
    "maxBytes" | "maxDurationMs" | "timeoutMs"
  >;

  constructor(root: string, options: TrainingSourceServiceOptions = {}) {
    this.root = resolve(root);
    this.store = new TrainingSessionStore(this.root);
    this.createSessionId = options.createSessionId ?? (() => `training-${randomUUID()}`);
    this.resolveSource = options.resolveSource ?? resolveVideoSource;
    this.limits = {
      maxBytes: options.maxBytes ?? 512 * 1024 * 1024,
      maxDurationMs: options.maxDurationMs ?? 5 * 60 * 1_000,
      timeoutMs: options.timeoutMs ?? 30_000,
    };
  }

  async resolveLinked(url: string, signal?: AbortSignal): Promise<ResolvedReferenceSource> {
    const resolvedSource = await this.resolveSource(
      { kind: "url", url },
      {
        artifactRoot: this.root,
        ...this.limits,
        signal,
      },
    );
    await this.assertStoredArtifact(resolvedSource.artifactPath);
    const sessionId = this.createSessionId();
    await this.store.writeStage(sessionId, "source", resolvedSource.receipt);
    const hash = resolvedSource.receipt.contentHash.slice("sha256:".length);
    return {
      sessionId,
      receipt: resolvedSource.receipt,
      mediaUrl: `/__gasper/training/media/${hash}`,
    };
  }

  async findMediaPath(hash: string): Promise<string> {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("invalid training media hash");
    const sourcesRoot = join(this.root, "sources");
    let entries: string[];
    try {
      entries = await readdir(sourcesRoot);
    } catch {
      throw new Error(`training media not found: ${hash}`);
    }
    const filename = entries.sort().find((entry) => entry.startsWith(`${hash}.`));
    if (!filename) throw new Error(`training media not found: ${hash}`);
    const path = join(sourcesRoot, filename);
    await this.assertStoredArtifact(path);
    const info = await stat(path);
    if (!info.isFile()) throw new Error(`training media not found: ${hash}`);
    return path;
  }

  writeStage(sessionId: string, stage: TrainingStage, artifact: unknown) {
    return this.store.writeStage(sessionId, stage, artifact);
  }

  private async assertStoredArtifact(path: string): Promise<void> {
    const sourcesRoot = await realpath(join(this.root, "sources"));
    const artifact = await realpath(path);
    const rel = relative(sourcesRoot, artifact);
    if (rel.startsWith("..") || resolve(sourcesRoot, rel) !== artifact) {
      throw new Error("resolved training media escaped the content-addressed source store");
    }
  }
}
