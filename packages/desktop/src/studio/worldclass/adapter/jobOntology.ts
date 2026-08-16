/**
 * DesignOps job ontology — Operate · Affect · Form · Motion · Proof.
 * Legacy Design/Animate/Behavior IDs normalize into this model.
 */

/** Canonical job workspace ids (product primary). */
export type JobWorkspaceId = "operate" | "affect" | "form" | "motion" | "proof";

/** Legacy chrome ids kept as aliases for adapters/tests. */
export type LegacyWorkspaceId = "design" | "animate" | "behavior";

export type WorkspaceId = JobWorkspaceId | LegacyWorkspaceId;

export const JOB_WORKSPACE_ORDER: JobWorkspaceId[] = [
  "operate",
  "affect",
  "form",
  "motion",
  "proof",
];

export const JOB_WORKSPACE_LABELS: Record<JobWorkspaceId, string> = {
  operate: "Operate",
  affect: "Affect",
  form: "Form",
  motion: "Motion",
  proof: "Proof",
};

/** Map any accepted id → canonical job id. */
export function normalizeWorkspaceId(id: string | null | undefined): JobWorkspaceId {
  const raw = (id || "").toLowerCase().trim();
  switch (raw) {
    case "operate":
      return "operate";
    case "affect":
    case "behavior":
      return "affect";
    case "form":
    case "design":
      return "form";
    case "motion":
    case "animate":
      return "motion";
    case "proof":
      return "proof";
    default:
      return "motion";
  }
}

/** True when id is the same job as target (including legacy alias). */
export function workspaceIs(
  current: string | null | undefined,
  target: JobWorkspaceId | LegacyWorkspaceId,
): boolean {
  return normalizeWorkspaceId(current) === normalizeWorkspaceId(target);
}

export type JobAvailability = {
  operate: boolean;
  affect: boolean;
  form: boolean;
  motion: boolean;
  proof: boolean;
};

/** Default product availability: Affect graph + Proof product not fully shipped. */
export function defaultJobAvailability(opts?: {
  affectAvailable?: boolean;
  proofAvailable?: boolean;
}): JobAvailability {
  return {
    operate: true,
    affect: opts?.affectAvailable === true,
    form: true,
    motion: true,
    proof: opts?.proofAvailable === true,
  };
}
