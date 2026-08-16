import {
  GROK_LEGAL_CONTINUITY_NAME,
  isLegalGrokToolName,
  legalAliasForIncompatible,
  resolveGrokGasperAlias,
} from "../GrokCompatibleNames.js";
import { compileMotionIntent } from "../../tuning/intentToMotion.js";
import { TUNING_PARAMETER_SPECS, type TuningParameterId } from "../../tuning/tuningRegistry.js";
import { getAnimationCommandSession } from "../../../../shared/src/gasper-animation/index.js";
import { TuningLabHttpClient } from "../../../../gasper-mcp/src/tuningLabHttpClient.js";

export type GrokLaneRequest = Readonly<{
  name: string;
  args?: Record<string, unknown>;
}>;

export type GrokLaneResult = Readonly<{
  ok: boolean;
  name: string;
  operation?: string;
  result?: unknown;
  error?: string;
  code?: string;
}>;

export type GrokGasperLaneDeps = Readonly<{
  inspectTuning?: () => Promise<unknown>;
  setTuning?: (id: TuningParameterId, value: number) => Promise<unknown>;
  compileIntent?: (intent: string) => unknown;
  dispatchCommand?: (op: string, params: Record<string, unknown>) => Promise<unknown>;
  listClips?: () => Promise<unknown>;
  listKeyframes?: () => Promise<unknown>;
  readContinuity?: () => Promise<unknown>;
}>;

const TUNING_IDS = new Set(TUNING_PARAMETER_SPECS.map((spec) => spec.id));

function fail(name: string, code: string, error: string, operation?: string): GrokLaneResult {
  return { ok: false, name, code, error, ...(operation ? { operation } : {}) };
}

function ok(name: string, operation: string, result: unknown): GrokLaneResult {
  return { ok: true, name, operation, result };
}

function defaultTuningClient(): TuningLabHttpClient {
  return new TuningLabHttpClient();
}

export async function dispatchGrokGasperLane(
  request: GrokLaneRequest,
  deps: GrokGasperLaneDeps = {},
): Promise<GrokLaneResult> {
  const name = typeof request?.name === "string" ? request.name.trim() : "";
  const args = request?.args && typeof request.args === "object" && !Array.isArray(request.args)
    ? request.args
    : {};

  if (!name) return fail(name, "INVALID_ARGS", "legal Grok tool name is required");
  if (name.includes("__")) {
    const alias = legalAliasForIncompatible(name);
    return fail(
      name,
      "ILLEGAL_GROK_NAME",
      alias
        ? `AgentBridge name ${name} is not a legal Grok qualified-tool name; use ${alias.legal}`
        : `${name} is not a legal Grok qualified-tool name`,
    );
  }
  if (!isLegalGrokToolName(name)) {
    return fail(name, "ILLEGAL_GROK_NAME", `${name} is not a legal Grok qualified-tool name`);
  }

  if (name === GROK_LEGAL_CONTINUITY_NAME) {
    if (!deps.readContinuity) {
      return fail(name, "UNAUTHORIZED", "continuity reload is not available on this lane", "reload_continuity");
    }
    return ok(name, "reload_continuity", await deps.readContinuity());
  }

  const alias = resolveGrokGasperAlias(name);
  if (!alias) return fail(name, "UNKNOWN_OPERATION", `unknown Grok Gasper operation: ${name}`);

  const session = getAnimationCommandSession();
  const tuning = defaultTuningClient();

  switch (alias.operation) {
    case "manifest":
      return ok(name, alias.operation, {
        server: "gasper-grok-lane",
        version: "0.1.0",
        commandLayer: "GasperAnimationCommandSession",
        legalNames: [
          "gasper_manifest",
          "gasper_tuning_lab_manifest",
          "gasper_inspect_tuning",
          "gasper_set_tuning",
          "gasper_compile_intent",
          "gasper_dispatch_command",
          "gasper_animation_clips",
          "gasper_animation_keyframes",
          GROK_LEGAL_CONTINUITY_NAME,
        ],
        residualAgentBridgeNames: [
          "gasper__manifest",
          "gasper__tuning_lab_manifest",
          "gasper__inspect_tuning",
          "gasper__set_tuning",
          "gasper__compile_intent",
          "gasper__dispatch_command",
          "gasper__animation_clips",
          "gasper__animation_keyframes",
        ],
        authority: "physics kernels remain authoritative; this lane does not play canned animation",
      });
    case "tuning_lab_manifest":
      return ok(name, alias.operation, {
        northstar: "N120",
        schema: "gasper.tuning-lab.v1",
        parameters: TUNING_PARAMETER_SPECS,
        authority: "physics kernels remain authoritative; lab gains are bounded inputs",
      });
    case "inspect_tuning": {
      const inspect = deps.inspectTuning ?? (() => tuning.dispatch("inspect_tuning_lab").then((response) => {
        if (!response.ok) throw new Error(response.error || "tuning_lab_command_rejected");
        return response.result;
      }));
      try {
        return ok(name, alias.operation, await inspect());
      } catch (error) {
        return fail(name, "TUNING_LAB_UNAVAILABLE", error instanceof Error ? error.message : String(error), alias.operation);
      }
    }
    case "set_tuning": {
      const id = args.id;
      const value = args.value;
      if (typeof id !== "string" || !TUNING_IDS.has(id as TuningParameterId)) {
        return fail(name, "INVALID_ARGS", "set_tuning requires a registered tuning id", alias.operation);
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return fail(name, "INVALID_ARGS", "set_tuning requires a finite numeric value", alias.operation);
      }
      const setTuning = deps.setTuning ?? ((parameterId, parameterValue) =>
        tuning.dispatch("set_tuning_parameter", { id: parameterId, value: parameterValue }).then((response) => {
          if (!response.ok) throw new Error(response.error || "tuning_lab_command_rejected");
          return response.result;
        }));
      try {
        return ok(name, alias.operation, await setTuning(id as TuningParameterId, value));
      } catch (error) {
        return fail(name, "TUNING_LAB_UNAVAILABLE", error instanceof Error ? error.message : String(error), alias.operation);
      }
    }
    case "compile_intent": {
      const intent = typeof args.intent === "string" ? args.intent : "";
      const compile = deps.compileIntent ?? compileMotionIntent;
      const compiled = compile(intent);
      if (!compiled || (typeof compiled === "object" && "ok" in compiled && compiled.ok === false)) {
        return fail(
          name,
          "INVALID_ARGS",
          compiled && typeof compiled === "object" && "error" in compiled
            ? String(compiled.error)
            : "compile_intent rejected",
          alias.operation,
        );
      }
      return ok(name, alias.operation, compiled);
    }
    case "dispatch_command": {
      const op = typeof args.op === "string" ? args.op.trim() : "";
      if (!op) return fail(name, "INVALID_ARGS", "dispatch_command requires op", alias.operation);
      const params = args.params && typeof args.params === "object" && !Array.isArray(args.params)
        ? args.params as Record<string, unknown>
        : {};
      const dispatch = deps.dispatchCommand ?? ((command, commandParams) => session.dispatch(command, commandParams));
      const dispatched = await dispatch(op, params) as { ok?: unknown; error?: unknown };
      if (dispatched && typeof dispatched === "object" && dispatched.ok === false) {
        return fail(
          name,
          "DISPATCH_REJECTED",
          dispatched.error ? String(dispatched.error) : `dispatch rejected: ${op}`,
          alias.operation,
        );
      }
      return ok(name, alias.operation, dispatched);
    }
    case "animation_clips": {
      const list = deps.listClips ?? (() => session.list_animation_clips());
      return ok(name, alias.operation, await list());
    }
    case "animation_keyframes": {
      const list = deps.listKeyframes ?? (() => {
        const document = session.getDocument();
        return Promise.resolve({
          document_id: document.id,
          keyframes: document.animation.clips.flatMap((clip) =>
            clip.tracks.flatMap((track) =>
              track.keyframes.map((keyframe) => ({
                clip_id: clip.id,
                track_id: track.id,
                id: keyframe.id,
                time_ms: keyframe.time_ms,
                easing: keyframe.easing,
              })),
            ),
          ),
        });
      });
      return ok(name, alias.operation, await list());
    }
    default: {
      const unhandled: never = alias;
      return fail(name, "UNKNOWN_OPERATION", `unhandled operation: ${String(unhandled)}`);
    }
  }
}

export async function runGrokGasperLaneCli(argv: readonly string[]): Promise<number> {
  const name = argv[0] ?? "";
  let args: Record<string, unknown> = {};
  if (argv[1]) {
    try {
      const parsed = JSON.parse(argv[1]) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("args must be a JSON object");
      }
      args = parsed as Record<string, unknown>;
    } catch (error) {
      process.stdout.write(`${JSON.stringify({
        ok: false,
        name,
        code: "INVALID_ARGS",
        error: error instanceof Error ? error.message : String(error),
      }, null, 2)}\n`);
      return 2;
    }
  }
  const result = await dispatchGrokGasperLane({ name, args });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.ok ? 0 : 2;
}