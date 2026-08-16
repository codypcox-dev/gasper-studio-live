import { z } from "zod";

import { sha256OfCanonical } from "../hashing.js";
import { motionScoreSchema } from "./schemas.js";
import type { MotionScore } from "./types.js";

function describeSchemaFailure(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      if (issue.code === z.ZodIssueCode.unrecognized_keys) {
        return `${path}: unknown field(s): ${issue.keys.join(", ")}`;
      }
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function parseMotionScore(input: unknown): MotionScore {
  const parsed = motionScoreSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`invalid MotionScore: ${describeSchemaFailure(parsed.error)}`);
  }
  return parsed.data as MotionScore;
}

export function hashMotionScore(input: MotionScore | unknown): string {
  return `sha256:${sha256OfCanonical(parseMotionScore(input))}`;
}
