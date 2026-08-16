export const GROK_SUCCESSOR_MODEL = "grok-4.6" as const;

export type GrokResponseIdentity = Readonly<{
  verification: "response";
  canonicalModel: typeof GROK_SUCCESSOR_MODEL;
  backendModel: string;
  requestId: string;
  sessionId: string;
  modelCalls: number;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function traceId(record: Record<string, unknown>, key: "requestId" | "sessionId"): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Grok response ${key === "requestId" ? "request id" : "session id"} missing`);
  }
  return value.trim();
}

function matchesCanonicalModel(backendModel: string): boolean {
  return backendModel === GROK_SUCCESSOR_MODEL || backendModel.startsWith(`${GROK_SUCCESSOR_MODEL}-`);
}

export function parseGrokResponseIdentity(
  envelope: unknown,
  requestedModel: string,
): GrokResponseIdentity {
  if (requestedModel !== GROK_SUCCESSOR_MODEL) {
    throw new Error(`Grok response attestation requires requested model ${GROK_SUCCESSOR_MODEL}`);
  }
  const record = asRecord(envelope);
  if (!record) throw new Error("Grok response envelope missing");
  const requestId = traceId(record, "requestId");
  const sessionId = traceId(record, "sessionId");
  const usage = asRecord(record.modelUsage);
  if (!usage) throw new Error("Grok response model usage missing");

  const entries = Object.entries(usage).map(([backendModel, rawUsage]) => {
    const usageRecord = asRecord(rawUsage);
    const modelCalls = usageRecord?.modelCalls;
    return {
      backendModel,
      modelCalls: typeof modelCalls === "number" && Number.isSafeInteger(modelCalls)
        ? modelCalls
        : -1,
    };
  });
  const canonicalEntries = entries.filter(({ backendModel }) => matchesCanonicalModel(backendModel));
  if (canonicalEntries.length === 0) {
    throw new Error(`Grok response did not attest a ${GROK_SUCCESSOR_MODEL} backend`);
  }
  const activeEntries = entries.filter(({ modelCalls }) => modelCalls >= 1);
  const activeCanonicalEntries = canonicalEntries.filter(({ modelCalls }) => modelCalls >= 1);
  if (activeCanonicalEntries.length === 0) {
    throw new Error("Grok response model calls must be at least one");
  }
  if (activeEntries.length !== 1 || activeCanonicalEntries.length !== 1) {
    throw new Error("Grok response model usage is ambiguous");
  }
  const [{ backendModel, modelCalls }] = activeCanonicalEntries;
  return {
    verification: "response",
    canonicalModel: GROK_SUCCESSOR_MODEL,
    backendModel,
    requestId,
    sessionId,
    modelCalls,
  };
}
