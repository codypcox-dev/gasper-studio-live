/**
 * Studio Proof job — export + baseline compare without mutating authoring document.
 * Pure helpers; adapter/UI own clipboard/download side effects.
 */

export type ProofIdentityInput = {
  buildIdentity: string | null;
  document: {
    name: string;
    path: string | null;
    revision: number;
    lifecycle: string;
    dirty: boolean;
    contentHash?: string | null;
  };
  connection: { state: string; label: string };
  character: {
    embodiment: string | null;
    expression: string | null;
  };
  authorityRenderer: string | null;
  health: string | null;
  living?: { running?: boolean; microstate?: string | null } | null;
  playheadMs?: number;
  activeClipId?: string | null;
  livePose?: Record<string, number> | null;
};

export type StudioProofBundle = {
  schema: "gasper.studio.proof.v1";
  exportedAt: string;
  buildIdentity: string | null;
  document: ProofIdentityInput["document"];
  connection: ProofIdentityInput["connection"];
  character: ProofIdentityInput["character"];
  authorityRenderer: string | null;
  health: string | null;
  living: ProofIdentityInput["living"];
  playheadMs: number;
  activeClipId: string | null;
  /** Optional pose snapshot (numbers only) — not a full golden visual. */
  poseSnapshot: Record<string, number> | null;
  /** Deterministic content fingerprint of this bundle body (excludes exportedAt). */
  bundleHash: string;
};

export type PoseCompareResult = {
  baselineKeys: number;
  currentKeys: number;
  matched: number;
  deltas: Array<{ key: string; baseline: number; current: number; abs: number }>;
  maxAbsDelta: number;
  identical: boolean;
};

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(",")}}`;
}

function fnvHash64(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x01000193) >>> 0;
  }
  const parts: string[] = [];
  let a = h1;
  let b = h2;
  for (let i = 0; i < 4; i++) {
    a = Math.imul(a ^ (b + i), 0x85ebca6b) >>> 0;
    b = Math.imul(b ^ (a + i * 17), 0xc2b2ae35) >>> 0;
    parts.push(a.toString(16).padStart(8, "0"));
  }
  return parts.join("");
}

export function buildProofBundle(
  input: ProofIdentityInput,
  opts?: { exportedAt?: string },
): StudioProofBundle {
  const pose =
    input.livePose && typeof input.livePose === "object"
      ? Object.fromEntries(
          Object.entries(input.livePose).filter(
            ([, v]) => typeof v === "number" && Number.isFinite(v),
          ) as Array<[string, number]>,
        )
      : null;

  const body = {
    schema: "gasper.studio.proof.v1" as const,
    buildIdentity: input.buildIdentity,
    document: { ...input.document },
    connection: { ...input.connection },
    character: { ...input.character },
    authorityRenderer: input.authorityRenderer,
    health: input.health,
    living: input.living ?? null,
    playheadMs: input.playheadMs ?? 0,
    activeClipId: input.activeClipId ?? null,
    poseSnapshot: pose && Object.keys(pose).length ? pose : null,
  };

  const bundleHash = fnvHash64(stableStringify(body));
  return {
    ...body,
    exportedAt: opts?.exportedAt ?? new Date().toISOString(),
    bundleHash,
  };
}

/** Compare current pose to pinned baseline; pure, no mutation. */
export function comparePoseToBaseline(
  baseline: Record<string, number> | null | undefined,
  current: Record<string, number> | null | undefined,
  opts?: { epsilon?: number },
): PoseCompareResult {
  const eps = opts?.epsilon ?? 1e-6;
  const b = baseline ?? {};
  const c = current ?? {};
  const keys = new Set([...Object.keys(b), ...Object.keys(c)]);
  const deltas: PoseCompareResult["deltas"] = [];
  let matched = 0;
  let maxAbsDelta = 0;
  for (const key of [...keys].sort()) {
    const bv = typeof b[key] === "number" ? b[key]! : 0;
    const cv = typeof c[key] === "number" ? c[key]! : 0;
    const abs = Math.abs(cv - bv);
    if (abs <= eps) matched += 1;
    else {
      deltas.push({ key, baseline: bv, current: cv, abs });
      if (abs > maxAbsDelta) maxAbsDelta = abs;
    }
  }
  return {
    baselineKeys: Object.keys(b).length,
    currentKeys: Object.keys(c).length,
    matched,
    deltas,
    maxAbsDelta,
    identical: deltas.length === 0 && Object.keys(b).length > 0,
  };
}

export function proofBundleToJson(bundle: StudioProofBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
