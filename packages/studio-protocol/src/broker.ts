/**
 * StudioCommandBroker — single dispatch path for human UI and AgentBridge MCP.
 * Wraps the shared Gasper animation command session (and future document cmds).
 * Animation command V2 names alias onto the same session path (Lane A5 + Integrator).
 */
import {
  getAnimationCommandSession,
  type AnimationChangeResult,
} from "../../shared/src/gasper-animation";
import type { CommandRequest, CommandResult, StudioProtocolError } from "./types.js";
import { compileMotionIntent } from "../../gasper-studio/src/tuning/intentToMotion";

const ANIMATION_OPS = new Set([
  "inspect_animation_document",
  "list_animation_clips",
  "create_animation_clip",
  "select_animation_clip",
  "rename_animation_clip",
  "set_animation_duration",
  "create_animation_track",
  "set_animation_track_state",
  "capture_animation_keyframe",
  "add_animation_keyframe",
  "update_animation_keyframe",
  "move_animation_keyframe",
  "duplicate_animation_keyframe",
  "delete_animation_keyframe",
  "set_keyframe_easing",
  "inspect_animation_pose",
  "scrub_animation",
  "play_animation",
  "pause_animation",
  "interrupt_animation",
  "begin_animation_transaction",
  "commit_animation_transaction",
  "cancel_animation_transaction",
  "undo_animation_edit",
  "redo_animation_edit",
  "save_gasper_document",
  "seed_thinking_knit",
]);

/** N120 typed control-plane commands; the browser owns the live session. */
const TUNING_OPS = new Set([
  "tuning_lab_manifest",
  "inspect_tuning_lab",
  "set_tuning_parameter",
  "pin_tuning_baseline",
  "compare_tuning_baseline",
  "reset_tuning_lab",
  "capture_tuning_proof",
  "read_tuning_telemetry",
  "compile_motion_intent",
  "apply_motion_intent",
]);

/** Document / studio inspection aliases map onto animation session where applicable. */
const ALIASES: Record<string, string> = {
  inspect_document: "inspect_animation_document",
  inspect_studio: "inspect_animation_document",
  undo: "undo_animation_edit",
  redo: "redo_animation_edit",
  begin_transaction: "begin_animation_transaction",
  commit_transaction: "commit_animation_transaction",
  cancel_transaction: "cancel_animation_transaction",
  // Animation command V2 (shared UI + MCP vocabulary) → same session ops
  inspect_resolved_pose: "inspect_animation_pose",
  inspect_binding_contribution: "inspect_animation_pose",
  list_clips: "list_animation_clips",
  create_clip: "create_animation_clip",
  rename_clip: "rename_animation_clip",
  select_clip: "select_animation_clip",
  create_track: "create_animation_track",
  capture_keyframe: "capture_animation_keyframe",
  update_keyframe: "update_animation_keyframe",
  move_keyframe: "move_animation_keyframe",
  delete_keyframe: "delete_animation_keyframe",
  set_keyframe_easing: "set_keyframe_easing",
  set_playhead: "scrub_animation",
  scrub: "scrub_animation",
  play: "play_animation",
  pause: "pause_animation",
  interrupt: "interrupt_animation",
  save: "save_gasper_document",
  validate: "inspect_animation_document",
};

export type BrokerContext = {
  /** When false, all commands return STUDIO_UNAVAILABLE (AgentBridge without Studio). */
  studioConnected: boolean;
  callerIdentity?: string;
};

export class StudioCommandBroker {
  constructor(private ctx: BrokerContext = { studioConnected: true }) {}

  setStudioConnected(connected: boolean) {
    this.ctx.studioConnected = connected;
  }

  isStudioConnected(): boolean {
    return this.ctx.studioConnected;
  }

  listCommands(): string[] {
    return [...ANIMATION_OPS, ...TUNING_OPS, ...Object.keys(ALIASES)];
  }

  async dispatch(
    command: string,
    input: Record<string, unknown> = {},
    requestId = `req-${Date.now()}`,
  ): Promise<CommandResult> {
    const t0 = Date.now();
    if (!this.ctx.studioConnected) {
      return {
        type: "command.result",
        requestId,
        success: false,
        error: {
          code: "STUDIO_UNAVAILABLE",
          message:
            "Gasper Studio is not connected. Launch Studio manually; AgentBridge will not auto-launch it.",
        },
        durationMs: Date.now() - t0,
        timestamp: new Date().toISOString(),
      };
    }

    const op = ALIASES[command] ?? command;
    if (TUNING_OPS.has(op)) {
      try {
        const lab = (
          globalThis as unknown as {
            __GASPER_TUNING_LAB__?: {
              snapshot: () => unknown;
              set: (id: string, value: number) => unknown;
              pinBaseline: () => unknown;
              compareBaseline: () => unknown;
              reset: () => unknown;
              applyIntent: (source: string) => unknown;
              captureProof: () => unknown;
            };
          }
        ).__GASPER_TUNING_LAB__;
        if (!lab && op !== "compile_motion_intent" && op !== "tuning_lab_manifest") {
          throw new Error("TUNING_LAB_UNAVAILABLE");
        }
        const liveLab = lab!;
        const result =
          op === "compile_motion_intent"
            ? compileMotionIntent(String(input.intent ?? ""))
            : op === "tuning_lab_manifest"
              ? {
                  northstar: "N120",
                  schema: "gasper.tuning-lab.v1",
                  parameters: [
                    "verticalDepthGain",
                    "craftExaggeration",
                    "gaitBobGain",
                    "contactSquashGain",
                    "supportExchangeGain",
                    "footworkPrimitiveGain",
                    "footRootGain",
                    "walkAmp",
                    "walkAccent",
                    "stepDepth",
                    "walkPeriod",
                    "footworkTempo",
                    "actingGain",
                    "viscoTau",
                  ],
                }
            : op === "inspect_tuning_lab"
            ? liveLab.snapshot()
            : op === "set_tuning_parameter"
              ? liveLab.set(String(input.id), Number(input.value))
              : op === "pin_tuning_baseline"
                ? liveLab.pinBaseline()
                : op === "compare_tuning_baseline"
                  ? liveLab.compareBaseline()
                  : op === "reset_tuning_lab"
                  ? liveLab.reset()
                    : op === "capture_tuning_proof"
                      ? liveLab.captureProof()
                      : op === "read_tuning_telemetry"
                        ? liveLab.snapshot()
                    : op === "apply_motion_intent"
                      ? liveLab.applyIntent(String(input.intent ?? ""))
                    : {
                        northstar: "N120",
                        schema: "gasper.tuning-lab.v1",
                        parameters: [
                          "verticalDepthGain",
                          "craftExaggeration",
                          "gaitBobGain",
                          "contactSquashGain",
                          "supportExchangeGain",
                          "footworkPrimitiveGain",
                          "footRootGain",
                          "walkAmp",
                          "walkAccent",
                          "stepDepth",
                          "walkPeriod",
                          "footworkTempo",
                          "actingGain",
                          "viscoTau",
                        ],
                      };
        return {
          type: "command.result",
          requestId,
          success: true,
          result,
          changeSummary: op,
          durationMs: Date.now() - t0,
          timestamp: new Date().toISOString(),
        };
      } catch (e) {
        return {
          type: "command.result",
          requestId,
          success: false,
          error: {
            code: "STUDIO_UNAVAILABLE",
            message: (e as Error).message,
          },
          durationMs: Date.now() - t0,
          timestamp: new Date().toISOString(),
        };
      }
    }
    if (!ANIMATION_OPS.has(op)) {
      return {
        type: "command.result",
        requestId,
        success: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown Studio command: ${command}`,
        },
        durationMs: Date.now() - t0,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const session = getAnimationCommandSession();
      const r = (await session.dispatch(op, input)) as AnimationChangeResult;
      return {
        type: "command.result",
        requestId,
        success: r.ok,
        result: r,
        documentRevision: r.revision,
        changeSummary: r.detail || r.op,
        error: r.ok
          ? undefined
          : ({
              code: "VALIDATION_FAILED",
              message: r.error || "command failed",
            } satisfies StudioProtocolError),
        durationMs: Date.now() - t0,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      return {
        type: "command.result",
        requestId,
        success: false,
        error: {
          code: "INTERNAL",
          message: (e as Error).message,
        },
        durationMs: Date.now() - t0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async handleRequest(req: CommandRequest): Promise<CommandResult> {
    return this.dispatch(req.command, req.input || {}, req.requestId);
  }
}

/** Process-local broker for Studio process (always connected to local runtime). */
let localBroker: StudioCommandBroker | null = null;

export function getLocalStudioBroker(): StudioCommandBroker {
  if (!localBroker) localBroker = new StudioCommandBroker({ studioConnected: true });
  return localBroker;
}

/** AgentBridge-side broker — starts disconnected until Studio registers. */
let bridgeBroker: StudioCommandBroker | null = null;

export function getBridgeStudioBroker(): StudioCommandBroker {
  if (!bridgeBroker) bridgeBroker = new StudioCommandBroker({ studioConnected: false });
  return bridgeBroker;
}
