import { describe, expect, it } from "vitest";
import {
  TUNING_LAB_BRIDGE_OPS,
  TuningLabBridgeQueue,
  parseTuningLabBridgeRequest,
} from "./tuningLabBridge";

describe("Tuning Lab live bridge", () => {
  it("accepts only typed Northstar operations and round-trips a result", () => {
    const queue = new TuningLabBridgeQueue();
    const request = parseTuningLabBridgeRequest({
      requestId: "req-1",
      op: "set_tuning_parameter",
      input: { id: "gaitBobGain", value: 0.8 },
    });

    expect(request).toMatchObject({ requestId: "req-1", op: "set_tuning_parameter" });
    expect(TUNING_LAB_BRIDGE_OPS).toContain(request?.op);
    expect(queue.enqueue(request!)).toBe(true);
    expect(queue.dequeue()).toEqual(request);
    expect(queue.dequeue()).toBeUndefined();

    queue.resolve({ requestId: "req-1", ok: true, result: { revision: 2 } });
    expect(queue.takeResult("req-1")).toEqual({
      requestId: "req-1",
      ok: true,
      result: { revision: 2 },
    });
    expect(queue.takeResult("req-1")).toBeUndefined();
  });

  it("rejects arbitrary commands and malformed envelopes", () => {
    expect(
      parseTuningLabBridgeRequest({ requestId: "x", op: "delete_everything" }),
    ).toBeUndefined();
    expect(parseTuningLabBridgeRequest({ requestId: "x", op: "inspect_tuning_lab" })).toMatchObject({
      requestId: "x",
      op: "inspect_tuning_lab",
    });
    expect(parseTuningLabBridgeRequest(null)).toBeUndefined();
  });
});
