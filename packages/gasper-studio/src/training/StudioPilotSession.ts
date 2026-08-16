import {
  StudioPilotExecutor,
  captureStudioPilotObservation,
  createStudioPilotCapabilityCatalog,
  type StudioPilotAuthorityDependencies,
  type StudioPilotRollbackSnapshot,
} from "./StudioPilotAuthority.js";
import {
  STUDIO_PILOT_MAX_TURNS,
  STUDIO_PILOT_MODEL,
  type StudioPilotActionBatch,
  type StudioPilotActionReceipt,
  type StudioPilotObservation,
  type StudioPilotTurnRequest,
} from "./StudioPilotProtocol.js";

export type StudioPilotProvider = Readonly<{
  generateTurn(request: StudioPilotTurnRequest, signal: AbortSignal): Promise<Readonly<{
    responseId: string;
    model: typeof STUDIO_PILOT_MODEL;
    batch: StudioPilotActionBatch;
  }>>;
}>;

export type StudioPilotStatus =
  | "idle"
  | "running"
  | "complete"
  | "needs_user"
  | "failed"
  | "cancelled"
  | "iteration_limit"
  | "rolling_back"
  | "rolled_back";

export type StudioPilotHistoryEntry = Readonly<{
  batch: StudioPilotActionBatch;
  receipts: StudioPilotActionReceipt[];
  responseId: string;
}>;

export type StudioPilotSessionSnapshot = Readonly<{
  status: StudioPilotStatus;
  model: typeof STUDIO_PILOT_MODEL;
  sessionId: string | null;
  goal: string;
  turn: number;
  maxTurns: number;
  message: string;
  error: string | null;
  history: StudioPilotHistoryEntry[];
  receipts: StudioPilotActionReceipt[];
  observation: StudioPilotObservation | null;
  rollbackAvailable: boolean;
}>;

export type StudioPilotSessionOptions = Readonly<{
  authority: StudioPilotAuthorityDependencies;
  provider: StudioPilotProvider;
  executor?: StudioPilotExecutor;
  createId?: () => string;
}>;

function defaultId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `pilot-${Date.now().toString(36)}-${random}`;
}

export class StudioPilotSession {
  private readonly listeners = new Set<() => void>();
  private readonly executor: StudioPilotExecutor;
  private readonly createId: () => string;
  private controller: AbortController | null = null;
  private rollbackSnapshot: StudioPilotRollbackSnapshot | null = null;
  private state: StudioPilotSessionSnapshot = {
    status: "idle",
    model: STUDIO_PILOT_MODEL,
    sessionId: null,
    goal: "",
    turn: 0,
    maxTurns: 4,
    message: "Grok 4.6 is ready for a bounded Studio instruction.",
    error: null,
    history: [],
    receipts: [],
    observation: null,
    rollbackAvailable: false,
  };

  constructor(private readonly options: StudioPilotSessionOptions) {
    this.executor = options.executor ?? new StudioPilotExecutor(options.authority);
    this.createId = options.createId ?? defaultId;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): StudioPilotSessionSnapshot {
    return this.state;
  }

  async run(rawGoal: string, requestedMaxTurns = 4): Promise<StudioPilotSessionSnapshot> {
    const goal = rawGoal.trim();
    if (!goal) {
      this.patch({ status: "failed", error: "Enter a Studio instruction before running Grok.", message: "Instruction required." });
      return this.state;
    }
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const maxTurns = Math.max(1, Math.min(STUDIO_PILOT_MAX_TURNS, Math.trunc(requestedMaxTurns)));
    const sessionId = this.createId();
    this.rollbackSnapshot = this.executor.captureRollbackSnapshot();
    const capabilities = createStudioPilotCapabilityCatalog(this.options.authority);
    let observation = captureStudioPilotObservation(this.options.authority);
    const history: StudioPilotHistoryEntry[] = [];
    this.state = {
      status: "running",
      model: STUDIO_PILOT_MODEL,
      sessionId,
      goal,
      turn: 0,
      maxTurns,
      message: "Grok 4.6 is inspecting Studio state.",
      error: null,
      history: [],
      receipts: [],
      observation,
      rollbackAvailable: true,
    };
    this.emit();

    try {
      for (let turn = 1; turn <= maxTurns; turn += 1) {
        if (controller.signal.aborted) throw new DOMException("Studio pilot cancelled", "AbortError");
        this.patch({ turn, message: `Grok 4.6 turn ${turn}/${maxTurns}: inspect → propose.` });
        const request: StudioPilotTurnRequest = {
          schema: "gasper.studio-pilot.turn-request.v1",
          sessionId,
          turn,
          maxTurns,
          model: STUDIO_PILOT_MODEL,
          userGoal: goal,
          capabilities,
          observation,
          history: history.map(({ batch, receipts }) => ({ batch, receipts })),
        };
        const proposed = await this.options.provider.generateTurn(request, controller.signal);
        if (proposed.model !== STUDIO_PILOT_MODEL) throw new Error(`unexpected Studio pilot model: ${proposed.model}`);

        if (proposed.batch.disposition === "complete") {
          history.push({ batch: proposed.batch, receipts: [], responseId: proposed.responseId });
          this.finish("complete", proposed.batch.message, history, observation);
          return this.state;
        }
        if (proposed.batch.disposition === "needs_user") {
          history.push({ batch: proposed.batch, receipts: [], responseId: proposed.responseId });
          this.finish("needs_user", proposed.batch.message, history, observation);
          return this.state;
        }

        this.patch({ message: `Grok 4.6 turn ${turn}/${maxTurns}: executing ${proposed.batch.actions.length} typed action${proposed.batch.actions.length === 1 ? "" : "s"}.` });
        const receipts = await this.executor.executeBatch(proposed.batch, controller.signal);
        history.push({ batch: proposed.batch, receipts, responseId: proposed.responseId });
        observation = captureStudioPilotObservation(this.options.authority);
        this.patch({
          history: [...history],
          receipts: history.flatMap((entry) => entry.receipts),
          observation,
          message: `Grok 4.6 observed ${receipts.filter((entry) => entry.status === "applied").length}/${receipts.length} applied actions; revising.`,
        });
      }
      this.finish(
        "iteration_limit",
        `Grok 4.6 reached the ${maxTurns}-turn safety limit before proving completion.`,
        history,
        observation,
        "iteration limit reached",
      );
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        this.finish("cancelled", "Studio pilot cancelled; use rollback to restore the starting controls.", history, observation);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.finish("failed", `Grok 4.6 pilot failed: ${message}`, history, observation, message);
      }
    } finally {
      if (this.controller === controller) this.controller = null;
    }
    return this.state;
  }

  cancel(): void {
    if (!this.controller) return;
    this.controller.abort();
    this.patch({ status: "cancelled", message: "Cancelling the active Studio pilot…" });
  }

  async rollback(): Promise<StudioPilotSessionSnapshot> {
    if (!this.rollbackSnapshot) {
      this.patch({ status: "failed", error: "No pilot rollback snapshot is available.", message: "Nothing to roll back." });
      return this.state;
    }
    this.controller?.abort();
    this.patch({ status: "rolling_back", message: "Restoring the pre-pilot Studio controls…", error: null });
    try {
      await this.executor.rollback(this.rollbackSnapshot);
      const observation = captureStudioPilotObservation(this.options.authority);
      this.rollbackSnapshot = null;
      this.patch({
        status: "rolled_back",
        message: "Reversible Studio controls restored; transient craft, physics, and reference activity stopped.",
        observation,
        rollbackAvailable: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.patch({ status: "failed", error: message, message: `Rollback failed: ${message}` });
    }
    return this.state;
  }

  private finish(
    status: StudioPilotStatus,
    message: string,
    history: StudioPilotHistoryEntry[],
    observation: StudioPilotObservation,
    error: string | null = null,
  ): void {
    this.patch({
      status,
      message,
      error,
      history: [...history],
      receipts: history.flatMap((entry) => entry.receipts),
      observation,
    });
  }

  private patch(patch: Partial<StudioPilotSessionSnapshot>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
