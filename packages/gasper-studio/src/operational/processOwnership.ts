/**
 * Ownership-aware process tracking for ORBIT-started processes only.
 *
 * Never kill arbitrary user processes. Track only what ORBIT scripts launch,
 * then terminate by ownership on clean shutdown.
 */

export type ProcessOwner = "ORBIT" | "OMEGA" | "test-harness" | "packaged-app";

export type ProcessPurpose =
  | "gateway"
  | "studio"
  | "static-server"
  | "playwright"
  | "probe"
  | "other";

export type TrackedProcess = {
  pid: number;
  owner: ProcessOwner;
  purpose: ProcessPurpose;
  command: string;
  startTime: string;
  expectedTermination: "clean-close" | "test-end" | "manual" | "orphan-reap";
  terminationResult:
    | "running"
    | "exited"
    | "killed-by-owner"
    | "already-dead"
    | "access-denied"
    | "not-owned"
    | null;
  application_instance_id?: string | null;
  notes?: string;
};

export type ProcessOwnershipLedger = {
  processes: TrackedProcess[];
  updatedAt: string;
  rogueCount: number;
};

const ledger = new Map<number, TrackedProcess>();

export function trackProcess(entry: {
  pid: number;
  owner: ProcessOwner;
  purpose: ProcessPurpose;
  command: string;
  expectedTermination?: TrackedProcess["expectedTermination"];
  application_instance_id?: string | null;
  notes?: string;
}): TrackedProcess {
  if (!Number.isFinite(entry.pid) || entry.pid <= 0) {
    throw new Error("process_ownership: pid must be a positive number");
  }
  const row: TrackedProcess = {
    pid: Math.floor(entry.pid),
    owner: entry.owner,
    purpose: entry.purpose,
    command: entry.command,
    startTime: new Date().toISOString(),
    expectedTermination: entry.expectedTermination ?? "clean-close",
    terminationResult: "running",
    application_instance_id: entry.application_instance_id ?? null,
    notes: entry.notes,
  };
  ledger.set(row.pid, row);
  return { ...row };
}

export function markTerminated(
  pid: number,
  result: Exclude<TrackedProcess["terminationResult"], null | "running">,
): TrackedProcess | null {
  const row = ledger.get(pid);
  if (!row) return null;
  row.terminationResult = result;
  return { ...row };
}

/**
 * Ownership-aware shutdown request. Refuses pids not in the ORBIT ledger.
 * Does not send OS signals itself in the browser; host scripts perform kill.
 */
export function requestOwnedShutdown(pid: number, requester: ProcessOwner): {
  allowed: boolean;
  reason: string;
  process: TrackedProcess | null;
} {
  const row = ledger.get(pid);
  if (!row) {
    return {
      allowed: false,
      reason: "not-owned: pid not in ORBIT process ledger (refuse arbitrary kill)",
      process: null,
    };
  }
  if (row.owner !== requester && requester !== "OMEGA" && requester !== "test-harness") {
    return {
      allowed: false,
      reason: `not-owned: owner=${row.owner} requester=${requester}`,
      process: { ...row },
    };
  }
  if (row.terminationResult && row.terminationResult !== "running") {
    return {
      allowed: false,
      reason: `already-terminal: ${row.terminationResult}`,
      process: { ...row },
    };
  }
  return {
    allowed: true,
    reason: "owned-shutdown-permitted",
    process: { ...row },
  };
}

export function listTrackedProcesses(): TrackedProcess[] {
  return [...ledger.values()].map((p) => ({ ...p }));
}

export function runningOwnedProcesses(): TrackedProcess[] {
  return listTrackedProcesses().filter((p) => p.terminationResult === "running");
}

export function getProcessOwnershipLedger(): ProcessOwnershipLedger {
  const processes = listTrackedProcesses();
  // "Rogue" = still running past expected clean-close with no termination result update
  // after close path — counted by consumers after shutdown. Here: running with purpose
  // that should not survive Closed when expectedTermination is clean-close.
  const rogueCount = processes.filter(
    (p) => p.terminationResult === "running" && p.expectedTermination === "clean-close",
  ).length;
  return {
    processes,
    updatedAt: new Date().toISOString(),
    rogueCount,
  };
}

export function resetProcessOwnershipForTests(): void {
  ledger.clear();
}
