import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA,
  semanticMotionProposalSchema,
  type SemanticMotionProvider,
  type SemanticPromptPacket,
} from "../SemanticMotionInterpreter.js";

export const DEFAULT_SEMANTIC_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_000_000;
const DEFAULT_MODEL = "grok-4.6";
const DEFAULT_REASONING_EFFORT = "low" as const;

export type GrokReasoningEffort = "low" | "medium" | "high";

export type GrokRunnerInput = Readonly<{
  system: string;
  prompt: string;
  schema: Readonly<Record<string, unknown>>;
  signal: AbortSignal;
  disableTools: true;
}>;

export type GrokRunnerOutput = Readonly<{
  stdout: string;
  stderr: string;
  exitCode?: number;
}>;

export type GrokProcessRunner = (input: GrokRunnerInput) => Promise<GrokRunnerOutput>;

export type GrokSemanticMotionProviderOptions = Readonly<{
  executable?: string;
  cwd?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  model?: string;
  reasoningEffort?: GrokReasoningEffort;
  runner?: GrokProcessRunner;
}>;

export type GrokInvocationInput = Readonly<{
  promptPath: string;
  leaderSocketPath: string;
  system: string;
  schema: Readonly<Record<string, unknown>>;
  model: string;
  reasoningEffort: GrokReasoningEffort;
}>;

export function buildGrokArgs(input: GrokInvocationInput): string[] {
  return [
    "--prompt-file", input.promptPath,
    "--system-prompt-override", input.system,
    "--json-schema", JSON.stringify(input.schema),
    "--model", input.model,
    "--reasoning-effort", input.reasoningEffort,
    "--leader-socket", input.leaderSocketPath,
    "--max-turns", "1",
    "--no-memory",
    "--no-plan",
    "--no-subagents",
    "--disable-web-search",
    "--permission-mode", "dontAsk",
    "--tools", "",
    "--output-format", "json",
    "--verbatim",
  ];
}

function resolveGrokExecutable(explicit?: string): string {
  if (explicit) return explicit;
  const profile = process.env.USERPROFILE;
  return profile ? join(profile, ".grok", "bin", "grok.exe") : "grok";
}

function defaultGrokHome(): string | undefined {
  if (process.env.GROK_HOME) return process.env.GROK_HOME;
  return process.env.USERPROFILE ? join(process.env.USERPROFILE, ".grok") : undefined;
}

export function createGrokProcessRunner(options: GrokSemanticMotionProviderOptions): GrokProcessRunner {
  const executable = resolveGrokExecutable(options.executable);
  const timeoutMs = options.timeoutMs ?? DEFAULT_SEMANTIC_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const model = options.model ?? DEFAULT_MODEL;
  const reasoningEffort = options.reasoningEffort ?? DEFAULT_REASONING_EFFORT;
  return async ({ system, prompt, schema, signal }) => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "gasper-semantic-"));
    const promptPath = join(temporaryRoot, "prompt.txt");
    const leaderSocketPath = join(temporaryRoot, "leader.sock");
    await writeFile(promptPath, prompt, "utf8");
    try {
      return await new Promise<GrokRunnerOutput>((resolveRun, rejectRun) => {
        const args = buildGrokArgs({
          promptPath,
          leaderSocketPath,
          system,
          schema,
          model,
          reasoningEffort,
        });
        const environment = { ...process.env };
        const grokHome = defaultGrokHome();
        if (grokHome) environment.GROK_HOME = grokHome;
        const child = spawn(executable, args, {
          cwd: options.cwd ?? process.cwd(),
          env: environment,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const finish = (error?: Error, value?: GrokRunnerOutput) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          signal.removeEventListener("abort", abort);
          if (error) rejectRun(error);
          else resolveRun(value!);
        };
        const enforceBound = () => {
          if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) <= maxOutputBytes) return;
          child.kill();
          finish(new Error("semantic provider output too large"));
        };
        child.stdout.on("data", (chunk: Buffer | string) => {
          stdout += chunk.toString();
          enforceBound();
        });
        child.stderr.on("data", (chunk: Buffer | string) => {
          stderr += chunk.toString();
          enforceBound();
        });
        child.once("error", (error) => finish(error));
        child.once("close", (exitCode) => finish(undefined, { stdout, stderr, exitCode: exitCode ?? -1 }));
        const abort = () => {
          child.kill();
          finish(new DOMException("semantic provider request aborted", "AbortError"));
        };
        signal.addEventListener("abort", abort, { once: true });
        const timeout = setTimeout(() => {
          child.kill();
          finish(new Error(`semantic provider timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  };
}

function parseGrokOutput(stdout: string, maxOutputBytes: number): Readonly<{ responseId: string; output: unknown }> {
  if (Buffer.byteLength(stdout) > maxOutputBytes) throw new Error("semantic provider output too large");
  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error("semantic provider returned invalid JSON");
  }
  const record = envelope as Record<string, unknown>;
  let output = record.structuredOutput;
  if (output === undefined && typeof record.text === "string") {
    try {
      output = JSON.parse(record.text);
    } catch {
      throw new Error("semantic provider response did not contain structured output");
    }
  }
  if (output === undefined) throw new Error("semantic provider response did not contain structured output");
  const validated = semanticMotionProposalSchema.parse(output);
  const responseId = [record.requestId, record.sessionId]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!responseId) throw new Error("semantic provider response id missing");
  return { responseId, output: validated };
}

function providerFailureTail(result: GrokRunnerOutput): string {
  const diagnostic = (result.stderr.trim() || result.stdout.trim())
    .replace(/\u001B\[[0-9;]*m/g, "");
  return diagnostic.slice(-2_000);
}

export class GrokSemanticMotionProvider implements SemanticMotionProvider {
  readonly id = "grok-local-structured";
  readonly model: string;
  private readonly runner: GrokProcessRunner;
  private readonly maxOutputBytes: number;

  constructor(options: GrokSemanticMotionProviderOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.runner = options.runner ?? createGrokProcessRunner(options);
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  }

  async generateStructured(
    packet: SemanticPromptPacket,
    signal: AbortSignal,
  ): Promise<Readonly<{ responseId: string; output: unknown }>> {
    if (packet.schemaName !== "gasper.semantic-motion-proposal.v1") {
      throw new Error("unsupported semantic output schema");
    }
    if (packet.system.length > 16_384 || packet.user.length > 524_288) {
      throw new Error("semantic provider prompt too large");
    }
    if (signal.aborted) throw new DOMException("semantic provider request aborted", "AbortError");
    const result = await this.runner({
      system: packet.system,
      prompt: packet.user,
      schema: SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA,
      signal,
      disableTools: true,
    });
    if (result.exitCode !== undefined && result.exitCode !== 0) {
      throw new Error(`semantic provider exited ${result.exitCode}: ${providerFailureTail(result)}`);
    }
    return parseGrokOutput(result.stdout, this.maxOutputBytes);
  }
}
