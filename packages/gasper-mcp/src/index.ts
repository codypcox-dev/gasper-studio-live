/**
 * Gasper Studio MCP server.
 *
 * Runs inside the standalone Gasper Studio repository and exposes the canonical
 * Gasper animation/document command layer (GasperAnimationCommandSession) as
 * MCP tools. AgentBridge connects to this server as a third-party MCP server
 * (namespace `gasper`), so any MCP client can drive Gasper without embedding
 * Gasper source into AgentBridge.
 *
 * Run: node --import tsx src/index.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getAnimationCommandSession,
  createEmptyDocument,
} from "../../shared/src/gasper-animation/index.js";
import {
  TUNING_PARAMETER_SPECS,
  type TuningParameterId,
} from "../../gasper-studio/src/tuning/tuningRegistry.js";
import { compileMotionIntent } from "../../gasper-studio/src/tuning/intentToMotion.js";
import { TuningLabHttpClient } from "./tuningLabHttpClient.js";

const SERVER_NAME = "gasper-studio-mcp";
const SERVER_VERSION = "0.1.0";

const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(e: unknown) {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { code: "GASPER_MCP_ERROR", message: e instanceof Error ? e.message : String(e) },
          null,
          2,
        ),
      },
    ],
  };
}

async function run<T>(fn: () => Promise<T> | T) {
  try {
    return textResult(await fn());
  } catch (e) {
    return errorResult(e);
  }
}

const ro = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;
const mut = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: false,
} as const;

const session = getAnimationCommandSession();
// The browser owns the typed control-plane receipt. MCP is only a transport
// projection and fails closed when the live 5179 page is not connected.
const tuningLab = new TuningLabHttpClient();

async function runLiveTuning(
  op: Parameters<TuningLabHttpClient["dispatch"]>[0],
  input: Record<string, unknown> = {},
) {
  const response = await tuningLab.dispatch(op, input);
  if (!response.ok) throw new Error(response.error || "tuning_lab_command_rejected");
  return response.result;
}

server.registerTool(
  "manifest",
  {
    title: "Gasper Studio manifest",
    description:
      "Read what this Gasper Studio MCP server exposes: command layer, schema version, available dispatch ops.",
    inputSchema: {},
    annotations: ro,
  },
  async () =>
    run(() => ({
      server: SERVER_NAME,
      version: SERVER_VERSION,
      commandLayer: "GasperAnimationCommandSession",
      capabilities: [
        "document: new / load / save / summary",
        "animation: clip / track / keyframe CRUD",
        "animation: easing, play / scrub / pause / interrupt",
        "expression: seed thinking-knit",
        "tuning-lab: bounded reversible Northstar parameters",
      ],
      canonicalSource: "GasperStudio repository (not embedded in AgentBridge)",
    })),
);

server.registerTool(
  "tuning_lab_manifest",
  {
    title: "Gasper Tuning Lab manifest",
    description: "Read the active N120 tuning parameters, bounds, and authority mapping.",
    inputSchema: {},
    annotations: ro,
  },
  async () =>
    run(() => ({
      northstar: "N120",
      schema: "gasper.tuning-lab.v1",
      parameters: TUNING_PARAMETER_SPECS,
      authority: "physics kernels remain authoritative; lab gains are bounded inputs",
      runtimeSurface: "live browser adapter via local 5179 tuning bridge",
    })),
);

server.registerTool(
  "inspect_tuning_lab",
  {
    title: "Inspect Tuning Lab",
    description: "Read current tuning values, baseline receipt, and change state.",
    inputSchema: {},
    annotations: ro,
  },
  async () => run(() => runLiveTuning("inspect_tuning_lab")),
);

server.registerTool(
  "set_tuning_parameter",
  {
    title: "Set Tuning Lab parameter",
    description:
      "Set one bounded N120 parameter. Connected Studio routing applies the same typed command to the live browser session.",
    inputSchema: {
      id: z.enum([
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
      ]),
      value: z.number(),
    },
    annotations: mut,
  },
  async ({ id, value }) =>
    run(() => runLiveTuning("set_tuning_parameter", { id: id as TuningParameterId, value })),
);

server.registerTool(
  "pin_tuning_baseline",
  {
    title: "Pin Tuning Lab baseline",
    description: "Pin the current lab state for A/B comparison.",
    inputSchema: {},
    annotations: mut,
  },
  async () => run(() => runLiveTuning("pin_tuning_baseline")),
);

server.registerTool(
  "compare_tuning_baseline",
  {
    title: "Compare Tuning Lab baseline",
    description: "Return changed parameter ids against the pinned baseline.",
    inputSchema: {},
    annotations: ro,
  },
  async () => run(() => runLiveTuning("compare_tuning_baseline")),
);

server.registerTool(
  "reset_tuning_lab",
  {
    title: "Reset Tuning Lab",
    description: "Restore the N120 parameter defaults through the reversible control plane.",
    inputSchema: {},
    annotations: mut,
  },
  async () => run(() => runLiveTuning("reset_tuning_lab")),
);

server.registerTool(
  "capture_tuning_proof",
  {
    title: "Capture Tuning Lab proof",
    description: "Capture the current before/after tuning state through the production proof bundle.",
    inputSchema: {},
    annotations: mut,
  },
  async () => run(() => runLiveTuning("capture_tuning_proof")),
);

server.registerTool(
  "read_tuning_telemetry",
  {
    title: "Read Tuning Lab telemetry",
    description: "Read current gait, support-carrier, body, and acting telemetry from the connected Studio.",
    inputSchema: {},
    annotations: ro,
  },
  async () => run(() => runLiveTuning("read_tuning_telemetry")),
);

server.registerTool(
  "compile_motion_intent",
  {
    title: "Compile motion intent",
    description: "Compile a phrase to Motion Score → capability gate → physics goals. N120 sliders are a labeled legacy fallback only.",
    inputSchema: { intent: z.string() },
    annotations: ro,
  },
  async ({ intent }) => run(() => compileMotionIntent(intent)),
);

server.registerTool(
  "dispatch_command",
  {
    title: "Gasper animation command dispatch",
    description:
      "Dispatch a typed animation command (same layer as Animator Studio UI). " +
      "Read: inspect_animation_document, list_animation_clips, inspect_animation_pose. " +
      "Write: clip/track/keyframe CRUD, easing, scrub/play/pause/interrupt, save, seed_thinking_knit.",
    inputSchema: {
      op: z.string().describe("Command name, e.g. create_animation_clip"),
      params: z.record(z.unknown()).optional().describe("Typed command params"),
    },
    annotations: mut,
  },
  async ({ op, params }) =>
    run(async () => session.dispatch(op, (params || {}) as Record<string, unknown>)),
);

server.registerTool(
  "inspect_animation_document",
  {
    title: "Inspect Gasper animation document",
    description: "Read document id, revision, dirty, content_hash, clip count, active clip, playhead.",
    inputSchema: {},
    annotations: ro,
  },
  async () => run(async () => session.inspect_animation_document()),
);

server.registerTool(
  "list_animation_clips",
  {
    title: "List animation clips",
    description: "List clips in the active Gasper animation document.",
    inputSchema: {},
    annotations: ro,
  },
  async () => run(async () => session.list_animation_clips()),
);

server.registerTool(
  "create_animation_clip",
  {
    title: "Create animation clip",
    description: "Create a multi-track animation clip (default face/macro/energy tracks).",
    inputSchema: {
      name: z.string().optional(),
      duration_ms: z.number().optional(),
      id: z.string().optional(),
    },
    annotations: mut,
  },
  async (params) =>
    run(async () => session.create_animation_clip(params as never)),
);

server.registerTool(
  "add_animation_keyframe",
  {
    title: "Add animation keyframe",
    description: "Add a keyframe on a track with binding values and easing.",
    inputSchema: {
      track_id: z.string(),
      time_ms: z.number(),
      values: z.record(z.number()),
      easing: z.string().optional(),
      label: z.string().optional(),
      id: z.string().optional(),
      clip_id: z.string().optional(),
    },
    annotations: mut,
  },
  async (params) => run(async () => session.add_animation_keyframe(params as never)),
);

server.registerTool(
  "set_keyframe_easing",
  {
    title: "Set keyframe easing",
    description: "Set GSAP-compatible easing on a keyframe.",
    inputSchema: {
      track_id: z.string(),
      keyframe_id: z.string(),
      easing: z.string(),
      clip_id: z.string().optional(),
    },
    annotations: mut,
  },
  async (params) => run(async () => session.set_keyframe_easing(params as never)),
);

server.registerTool(
  "play_animation",
  {
    title: "Play animation clip",
    description: "Play the active (or specified) canonical clip via GSAP command host.",
    inputSchema: { clip_id: z.string().optional() },
    annotations: mut,
  },
  async (params) => run(async () => session.play_animation(params as never)),
);

server.registerTool(
  "scrub_animation",
  {
    title: "Scrub animation",
    description: "Scrub the animation playhead to a normalized time.",
    inputSchema: { time: z.number().min(0).max(1), clip_id: z.string().optional() },
    annotations: mut,
  },
  async (params) => run(async () => session.scrub_animation(params as never)),
);

server.registerTool(
  "pause_animation",
  {
    title: "Pause animation",
    description: "Pause the active clip.",
    inputSchema: {},
    annotations: mut,
  },
  async () => run(async () => session.pause_animation()),
);

server.registerTool(
  "interrupt_animation",
  {
    title: "Interrupt animation",
    description: "Interrupt the active clip (retain current pose).",
    inputSchema: {},
    annotations: mut,
  },
  async () => run(async () => session.interrupt_animation()),
);

server.registerTool(
  "seed_thinking_knit",
  {
    title: "Seed thinking-knit clip",
    description: "Seed the canonical thinking-knit clip into the active document.",
    inputSchema: {},
    annotations: mut,
  },
  async () => run(async () => session.seed_thinking_knit()),
);

server.registerTool(
  "new_document",
  {
    title: "New Gasper document",
    description: "Create a fresh canonical Gasper document (topology 512/360/672).",
    inputSchema: { id: z.string().optional() },
    annotations: mut,
  },
  async ({ id }) => {
    session.loadDocument(createEmptyDocument(id));
    return textResult({ ok: true, id: id ?? "gasper-untitled", topology: "512/360/672" });
  },
);

server.registerTool(
  "load_document",
  {
    title: "Load Gasper document",
    description: "Load a canonical Gasper document from a JSON object.",
    inputSchema: {
      document: z.record(z.unknown()).describe("Canonical Gasper document JSON"),
      path: z.string().optional().describe("Optional source path for persist"),
    },
    annotations: mut,
  },
  async ({ document, path }) =>
    run(async () => session.loadDocument(document as never, path ?? null)),
);

server.registerTool(
  "save_document",
  {
    title: "Save Gasper document",
    description: "Persist the active document to a path (JSON, UTF-8 without BOM).",
    inputSchema: {
      path: z.string().describe("Absolute destination path"),
    },
    annotations: mut,
  },
  async ({ path }) => run(async () => session.save_gasper_document({ path })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
