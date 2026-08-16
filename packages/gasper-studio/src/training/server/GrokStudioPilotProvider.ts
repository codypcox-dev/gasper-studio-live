import {
  STUDIO_PILOT_MODEL,
  STUDIO_PILOT_OUTPUT_JSON_SCHEMA,
  studioPilotActionBatchSchema,
  type StudioPilotActionBatch,
  type StudioPilotPromptPacket,
} from "../StudioPilotProtocol.js";
import {
  createGrokProcessRunner,
  type GrokProcessRunner,
  type GrokReasoningEffort,
  type GrokRunnerOutput,
} from "./GrokSemanticMotionProvider.js";
import {
  parseGrokResponseIdentity,
  type GrokResponseIdentity,
} from "./GrokResponseIdentity.js";

const DEFAULT_MAX_OUTPUT_BYTES = 1_000_000;

export type GrokStudioPilotProviderOptions = Readonly<{
  executable?: string;
  cwd?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  reasoningEffort?: GrokReasoningEffort;
  runner?: GrokProcessRunner;
}>;

export type StudioPilotTurnResult = Readonly<{
  responseId: string;
  model: typeof STUDIO_PILOT_MODEL;
  identity: GrokResponseIdentity;
  batch: StudioPilotActionBatch;
}>;

function failureTail(result: GrokRunnerOutput): string {
  return (result.stderr.trim() || result.stdout.trim())
    .replace(/\u001B\[[0-9;]*m/g, "")
    .slice(-2_000);
}

function parseProviderOutput(stdout: string, maxOutputBytes: number): Readonly<{
  responseId: string;
  identity: GrokResponseIdentity;
  batch: StudioPilotActionBatch;
}> {
  if (Buffer.byteLength(stdout) > maxOutputBytes) throw new Error("Studio pilot provider output too large");
  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error("Studio pilot provider returned invalid JSON");
  }
  const record = envelope as Record<string, unknown>;
  let output = record.structuredOutput;
  if (output === undefined && typeof record.text === "string") {
    try {
      output = JSON.parse(record.text);
    } catch {
      throw new Error("Studio pilot provider response did not contain structured output");
    }
  }
  if (output === undefined) throw new Error("Studio pilot provider response did not contain structured output");
  let batch: StudioPilotActionBatch;
  try {
    batch = studioPilotActionBatchSchema.parse(output);
  } catch (error) {
    throw new Error(`Studio pilot action schema rejected output: ${error instanceof Error ? error.message : String(error)}`);
  }
  const identity = parseGrokResponseIdentity(envelope, STUDIO_PILOT_MODEL);
  return { responseId: identity.requestId, identity, batch };
}

export class GrokStudioPilotProvider {
  readonly id = "grok-local-studio-pilot";
  readonly model = STUDIO_PILOT_MODEL;
  private readonly runner: GrokProcessRunner;
  private readonly maxOutputBytes: number;

  constructor(options: GrokStudioPilotProviderOptions = {}) {
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.runner = options.runner ?? createGrokProcessRunner({
      executable: options.executable,
      cwd: options.cwd,
      timeoutMs: options.timeoutMs,
      maxOutputBytes: options.maxOutputBytes,
      model: STUDIO_PILOT_MODEL,
      reasoningEffort: options.reasoningEffort ?? "high",
    });
  }

  async generateTurn(packet: StudioPilotPromptPacket, signal: AbortSignal): Promise<StudioPilotTurnResult> {
    if (packet.schemaName !== "gasper.studio-pilot.action-batch.v1") {
      throw new Error("unsupported Studio pilot output schema");
    }
    if (packet.system.length > 32_768 || packet.user.length > 786_432) {
      throw new Error("Studio pilot prompt too large");
    }
    if (signal.aborted) throw new DOMException("Studio pilot request aborted", "AbortError");
    const result = await this.runner({
      system: packet.system,
      prompt: packet.user,
      schema: STUDIO_PILOT_OUTPUT_JSON_SCHEMA,
      signal,
      disableTools: true,
    });
    if (result.exitCode !== undefined && result.exitCode !== 0) {
      throw new Error(`Studio pilot provider exited ${result.exitCode}: ${failureTail(result)}`);
    }
    const parsed = parseProviderOutput(result.stdout, this.maxOutputBytes);
    return {
      responseId: parsed.responseId,
      model: this.model,
      identity: parsed.identity,
      batch: parsed.batch,
    };
  }
}
