import { describe, expect, it } from "vitest";
import {
  buildPaddleMesh,
  buildPaddleOutline,
  paddleVertex,
  raycastOutline,
  PADDLE_HANDLE_W,
  PADDLE_THROAT_Y,
  PADDLE_TIP_Y,
} from "./PaddleMesh";

describe("paddle mesh", () => {
  it("keeps the face in the blade and sends the rim bottom down the handle", () => {
    const { xy, heights } = buildPaddleMesh();
    expect(xy.length).toBe(2000);
    expect(heights.length).toBe(1000);
    const core = paddleVertex(0.5, 0.2);
    expect(Math.hypot(core.x, core.y)).toBeLessThan(30);
    const tip = paddleVertex(0.5, 1);
    expect(tip.y).toBeGreaterThan(PADDLE_THROAT_Y + 20);
    expect(tip.y).toBeLessThan(PADDLE_TIP_Y + 1);
    expect(Math.abs(tip.x)).toBeLessThan(9);
    const shaft = paddleVertex(0.1, 0.85);
    expect(Math.abs(shaft.x)).toBeLessThan(PADDLE_HANDLE_W + 0.2);
    expect(shaft.y).toBeGreaterThan(PADDLE_THROAT_Y);
  });

  it("outline raycast hits a shaft wall, not a teardrop diagonal", () => {
    const outline = buildPaddleOutline(128);
    const tip = raycastOutline(Math.PI / 2, outline);
    expect(tip?.y).toBeGreaterThan(PADDLE_THROAT_Y + 20);
    const side = raycastOutline(1.45, outline);
    expect(side).toBeTruthy();
    expect(Math.abs(side!.x)).toBeGreaterThan(PADDLE_HANDLE_W * 0.7);
    expect(Math.abs(side!.x)).toBeLessThan(PADDLE_HANDLE_W + 4);
    expect(side!.y).toBeGreaterThan(PADDLE_THROAT_Y - 4);
  });
});
