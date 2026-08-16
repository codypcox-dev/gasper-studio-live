import {
  TUNING_LAB_BRIDGE_PATH,
  parseTuningLabBridgeRequest,
  type TuningLabBridgeRequest,
  type TuningLabBridgeResponse,
} from "../../../studio-protocol/src/tuningLabBridge";
import { TuningLabSession, type TuningParameterId } from "./tuningRegistry";

function dispatchLiveRequest(
  tuningLab: TuningLabSession,
  request: TuningLabBridgeRequest,
): TuningLabBridgeResponse {
  try {
    const input = request.input;
    switch (request.op) {
      case "inspect_tuning_lab":
        return { requestId: request.requestId, ok: true, result: tuningLab.snapshot() };
      case "set_tuning_parameter": {
        const action = tuningLab.set(
          String(input.id) as TuningParameterId,
          Number(input.value),
        );
        return { requestId: request.requestId, ok: action.ok, result: action, error: action.error };
      }
      case "pin_tuning_baseline": {
        const action = tuningLab.pinBaseline();
        return { requestId: request.requestId, ok: action.ok, result: action, error: action.error };
      }
      case "compare_tuning_baseline":
        return { requestId: request.requestId, ok: true, result: tuningLab.compareBaseline() };
      case "reset_tuning_lab": {
        const action = tuningLab.reset();
        return { requestId: request.requestId, ok: action.ok, result: action, error: action.error };
      }
      case "capture_tuning_proof": {
        const result = tuningLab.captureProof();
        return { requestId: request.requestId, ok: result.ok, result, error: result.error };
      }
      case "read_tuning_telemetry":
        return { requestId: request.requestId, ok: true, result: tuningLab.snapshot().telemetry };
      case "apply_motion_intent": {
        const action = tuningLab.applyIntent(String(input.intent ?? ""));
        return { requestId: request.requestId, ok: action.ok, result: action, error: action.error };
      }
    }
  } catch (error) {
    return {
      requestId: request.requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Lets a local MCP client drive the same browser-owned session over 5179.
 * A missing server is intentionally quiet: standalone Studio remains usable.
 */
export function startTuningLabBrowserBridge(tuningLab: TuningLabSession): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;

  const loop = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const response = await fetch(`${TUNING_LAB_BRIDGE_PATH}/poll`, {
        cache: "no-store",
      });
      if (response.ok) {
        const request = parseTuningLabBridgeRequest(await response.json());
        if (request) {
          const result = dispatchLiveRequest(tuningLab, request);
          await fetch(`${TUNING_LAB_BRIDGE_PATH}/result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          });
        }
      }
    } catch {
      // 5179 may be a static host without the optional bridge middleware.
    } finally {
      inFlight = false;
      if (!stopped) timer = setTimeout(loop, 120);
    }
  };
  void loop();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
