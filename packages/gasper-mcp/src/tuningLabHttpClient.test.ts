import { describe, expect, it, vi } from "vitest";
import { TuningLabHttpClient } from "./tuningLabHttpClient";

describe("TuningLabHttpClient", () => {
  it("posts a typed request and returns the browser-owned receipt", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, requestId: "req-1" }), { status: 202 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ requestId: "req-1", ok: true, result: { embodiment: "wispwalker" } }), {
          status: 200,
        }),
      );
    const client = new TuningLabHttpClient({ baseUrl: "http://127.0.0.1:5179", fetchImpl, pollMs: 0 });

    await expect(client.dispatch("inspect_tuning_lab")).resolves.toEqual({
      requestId: "req-1",
      ok: true,
      result: { embodiment: "wispwalker" },
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5179/__gasper/tuning-lab/command",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fails closed when the live browser bridge is unavailable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const client = new TuningLabHttpClient({ baseUrl: "http://127.0.0.1:5179", fetchImpl });
    await expect(client.dispatch("reset_tuning_lab")).rejects.toThrow("TUNING_LAB_UNAVAILABLE");
  });
});
