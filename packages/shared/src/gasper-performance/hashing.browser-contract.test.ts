import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { sha256Hex } from "./hashing.js";

describe("browser-safe canonical SHA-256", () => {
  it("does not import a Node-only crypto module into the shared browser graph", () => {
    const source = readFileSync(fileURLToPath(new URL("./hashing.ts", import.meta.url)), "utf8");
    expect(source).not.toMatch(/from\s+["']node:crypto["']/);
  });

  it.each(["", "abc", "Gasper 👻", "φ".repeat(1_000)])(
    "matches Node SHA-256 for %j",
    (input) => {
      const expected = createHash("sha256").update(input).digest("hex");
      expect(sha256Hex(input)).toBe(expected);
    },
  );
});
