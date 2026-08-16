import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  grokContinuityPacketSchema,
  grokPlanOpsStateSchema,
  grokRepoStateSchema,
  grokResponseIdentitySchema,
  grokSuccessorStatusSchema,
  type GrokContinuityPacket,
  type GrokPlanOpsState,
  type GrokRepoState,
  type GrokResponseIdentityPayload,
  type GrokSuccessorStatus,
} from "../GrokSuccessorProtocol.js";
import { GROK_LEGAL_GASPER_ALIASES } from "../GrokCompatibleNames.js";

export type GrokSuccessorCommandResult = Readonly<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

export type GrokSuccessorCommandRunner = (
  executable: string,
  args: readonly string[],
) => Promise<GrokSuccessorCommandResult>;

export { GROK_INCOMPATIBLE_GASPER_TOOL_NAMES as KNOWN_GROK_INCOMPATIBLE_GASPER_TOOLS } from "../GrokCompatibleNames.js";

export type GrokSuccessorServiceOptions = Readonly<{
  root: string;
  continuityPath?: string;
  grokExecutable?: string;
  commandRunner?: GrokSuccessorCommandRunner;
  hashExecutable?: (path: string) => Promise<string>;
  inspectRepo?: () => Promise<GrokRepoState>;
  inspectPlanOps?: () => Promise<GrokPlanOpsState>;
  incompatibleTools?: readonly string[];
  legalAliases?: readonly { incompatible: string; legal: string; operation: string }[];
  lastResponseIdentity?: GrokResponseIdentityPayload;
  now?: () => Date;
  cacheMs?: number;
}>;

function defaultGrokExecutable(): string {
  const configured = process.env.GROK_BIN?.trim();
  if (configured) return configured;
  const userProfile = process.env.USERPROFILE?.trim();
  if (userProfile) {
    const installed = join(userProfile, ".grok", "bin", "grok.exe");
    if (existsSync(installed)) return installed;
  }
  return "grok";
}

function processRunner(root: string): GrokSuccessorCommandRunner {
  return (executable, args) => new Promise((resolveResult) => {
    execFile(executable, [...args], {
      cwd: root,
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      const numericCode = error && typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number"
        ? (error as NodeJS.ErrnoException & { code: number }).code
        : error ? 1 : 0;
      resolveResult({
        exitCode: numericCode,
        stdout: String(stdout),
        stderr: String(stderr),
      });
    });
  });
}

async function sha256File(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function modelCatalogContains46(stdout: string): boolean {
  return /(?:^|\s)grok-4\.6(?:\s|$)/m.test(stdout);
}

function bridgeFromDoctor(
  result: GrokSuccessorCommandResult,
  incompatibleTools: readonly string[],
  legalAliases: readonly { incompatible: string; legal: string; operation: string }[],
): GrokSuccessorStatus["bridge"] {
  let doctor: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    doctor = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    doctor = null;
  }
  const servers = Array.isArray(doctor?.servers) ? doctor.servers : [];
  const healthyServer = servers.find((server) => (
    server !== null && typeof server === "object" && (server as { healthy?: unknown }).healthy === true
  )) as { checks?: unknown } | undefined;
  const checks = Array.isArray(healthyServer?.checks) ? healthyServer.checks : [];
  let protocol: string | undefined;
  let discoveredTools = 0;
  for (const rawCheck of checks) {
    if (rawCheck === null || typeof rawCheck !== "object") continue;
    const check = rawCheck as { label?: unknown; detail?: unknown };
    const label = typeof check.label === "string" ? check.label : "";
    const detail = typeof check.detail === "string" ? check.detail : "";
    const protocolMatch = /protocol\s+([^\s]+)/i.exec(`${label} ${detail}`);
    if (protocolMatch) protocol = protocolMatch[1];
    const toolsMatch = /(\d+)\s+tools?\s+discovered/i.exec(`${label} ${detail}`);
    if (toolsMatch) discoveredTools = Number(toolsMatch[1]);
  }
  const healthyCount = typeof doctor?.healthy_count === "number" ? doctor.healthy_count : 0;
  const failingCount = typeof doctor?.failing_count === "number" ? doctor.failing_count : 0;
  return {
    healthy: result.exitCode === 0 && healthyCount >= 1 && failingCount === 0 && Boolean(healthyServer),
    ...(protocol ? { protocol } : {}),
    discoveredTools,
    incompatibleTools: [...incompatibleTools],
    legalAliases: legalAliases.map((alias) => ({ ...alias })),
  };
}

export class GrokSuccessorService {
  readonly root: string;
  readonly continuityPath: string;
  readonly grokExecutable: string;
  private readonly commandRunner: GrokSuccessorCommandRunner;
  private readonly hashExecutable: (path: string) => Promise<string>;
  private readonly inspectRepo: () => Promise<GrokRepoState>;
  private readonly inspectPlanOps: () => Promise<GrokPlanOpsState>;
  private readonly incompatibleTools: readonly string[];
  private readonly legalAliases: readonly { incompatible: string; legal: string; operation: string }[];
  private readonly now: () => Date;
  private readonly cacheMs: number;
  private lastResponseIdentity?: GrokResponseIdentityPayload;
  private cachedStatus?: Readonly<{ expiresAt: number; value: GrokSuccessorStatus }>;

  constructor(options: GrokSuccessorServiceOptions) {
    this.root = resolve(options.root);
    this.continuityPath = options.continuityPath ?? join(this.root, ".gasper", "successor", "continuity.json");
    this.grokExecutable = options.grokExecutable ?? defaultGrokExecutable();
    this.commandRunner = options.commandRunner ?? processRunner(this.root);
    this.hashExecutable = options.hashExecutable ?? sha256File;
    this.inspectRepo = options.inspectRepo ?? (() => this.defaultInspectRepo());
    this.inspectPlanOps = options.inspectPlanOps ?? (() => this.defaultInspectPlanOps());
    this.incompatibleTools = options.incompatibleTools ?? [];
    this.legalAliases = options.legalAliases ?? GROK_LEGAL_GASPER_ALIASES;
    this.lastResponseIdentity = options.lastResponseIdentity
      ? grokResponseIdentitySchema.parse(options.lastResponseIdentity)
      : undefined;
    this.now = options.now ?? (() => new Date());
    this.cacheMs = options.cacheMs ?? 3_000;
  }

  recordResponseIdentity(identity: GrokResponseIdentityPayload): void {
    this.lastResponseIdentity = grokResponseIdentitySchema.parse(identity);
    this.cachedStatus = undefined;
  }

  async status(): Promise<GrokSuccessorStatus> {
    const nowMs = this.now().getTime();
    if (this.cachedStatus && this.cachedStatus.expiresAt > nowMs) return this.cachedStatus.value;
    const [version, models, doctor, executableSha256, repo, planops, continuity] = await Promise.all([
      this.commandRunner(this.grokExecutable, ["--version"]),
      this.commandRunner(this.grokExecutable, ["models"]),
      this.commandRunner(this.grokExecutable, ["mcp", "doctor", "--json"]),
      this.hashExecutable(this.grokExecutable).catch(() => undefined),
      this.inspectRepo(),
      this.inspectPlanOps(),
      this.readContinuity(),
    ]);
    const cliVersion = version.stdout.trim().split(/\r?\n/, 1)[0] || undefined;
    const responseIdentity = this.lastResponseIdentity ?? continuity?.lastResponseIdentity;
    const environmentVerified = version.exitCode === 0 &&
      models.exitCode === 0 &&
      modelCatalogContains46(models.stdout) &&
      typeof executableSha256 === "string" &&
      /^[0-9a-f]{64}$/.test(executableSha256);
    const status = grokSuccessorStatusSchema.parse({
      schema: "gasper.grok-successor.status.v1",
      capturedAt: this.now().toISOString(),
      identity: {
        environmentVerified,
        responseVerified: Boolean(responseIdentity),
        requestedModel: "grok-4.6",
        ...(responseIdentity ? { backendModel: responseIdentity.backendModel } : {}),
        ...(cliVersion ? { cliVersion } : {}),
        ...(executableSha256 ? { executableSha256 } : {}),
      },
      bridge: bridgeFromDoctor(doctor, this.incompatibleTools, this.legalAliases),
      repo,
      planops,
      continuity: continuity ? {
        available: true,
        writtenAt: continuity.writtenAt,
        nextAction: continuity.nextAction,
      } : { available: false },
    });
    this.cachedStatus = { expiresAt: nowMs + this.cacheMs, value: status };
    return status;
  }

  async readContinuity(): Promise<GrokContinuityPacket | null> {
    let raw: string;
    try {
      raw = await readFile(this.continuityPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Grok successor continuity contains invalid JSON");
    }
    const result = grokContinuityPacketSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Grok successor continuity is invalid: ${result.error.message}`);
    }
    return result.data;
  }

  async writeContinuity(packet: GrokContinuityPacket): Promise<GrokContinuityPacket> {
    const validated = grokContinuityPacketSchema.parse(packet);
    const directory = dirname(this.continuityPath);
    await mkdir(directory, { recursive: true });
    const tempPath = join(directory, `.continuity-${process.pid}-${randomUUID()}.tmp`);
    try {
      await writeFile(tempPath, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await rename(tempPath, this.continuityPath);
    } finally {
      await unlink(tempPath).catch(() => undefined);
    }
    this.cachedStatus = undefined;
    return validated;
  }

  private async defaultInspectRepo(): Promise<GrokRepoState> {
    const [root, branch, head, dirty] = await Promise.all([
      this.commandRunner("git", ["rev-parse", "--show-toplevel"]),
      this.commandRunner("git", ["branch", "--show-current"]),
      this.commandRunner("git", ["rev-parse", "HEAD"]),
      this.commandRunner("git", ["status", "--short"]),
    ]);
    if ([root, branch, head, dirty].some((result) => result.exitCode !== 0)) {
      throw new Error("Unable to inspect the Gasper Git checkout");
    }
    return grokRepoStateSchema.parse({
      root: root.stdout.trim().replaceAll("\\", "/"),
      branch: branch.stdout.trim(),
      head: head.stdout.trim(),
      dirty: dirty.stdout.split(/\r?\n/).filter(Boolean),
    });
  }

  private async defaultInspectPlanOps(): Promise<GrokPlanOpsState> {
    const state = JSON.parse(await readFile(join(this.root, "docs", "planops", "state.json"), "utf8")) as Record<string, unknown>;
    return grokPlanOpsStateSchema.parse({
      bookId: state.bookId,
      turn: state.turn,
      phase: state.phase,
      gate: state.gate,
      workId: state.activeWorkId ?? null,
    });
  }
}
