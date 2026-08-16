import {
  retargetMotionScore,
  type EnvironmentPhysicsProfile,
  type RetargetDisposition,
} from "../../../shared/src/gasper-performance/reference/retarget.js";
import type { MotionMechanicsSummary } from "../../../shared/src/gasper-performance/reference/mechanics.js";
import type {
  FormCapabilityProfile,
  MotionScore,
  PhysicsIntentPlan,
  PoseObservationTrack,
  VideoAnalysisSelection,
  VideoSourceReceipt,
} from "../../../shared/src/gasper-performance/reference/types.js";
import { validatePrimitiveAgainstForm } from "../../../desktop/src/gasper/performance/FormCapabilityProfile.js";
import { compileSemanticMotionScore } from "./SemanticMotionCompiler.js";
import type {
  SemanticEvidenceFrameRef,
  SemanticMotionProposal,
  ProviderSemanticMotionInterpreter,
} from "./SemanticMotionInterpreter.js";

export type ReferenceTrainingStatus =
  | "empty"
  | "resolving"
  | "source_ready"
  | "analyzing"
  | "interpreting"
  | "needs_review"
  | "compiled"
  | "previewing"
  | "blocked";

export type ReferenceTrainingErrorCode =
  | "ABORTED"
  | "ANALYSIS_FAILED"
  | "DURATION_LIMIT"
  | "FORM_PROFILE_ABSENT"
  | "INVALID_SOURCE"
  | "PERSISTENCE_FAILED"
  | "POSE_BACKEND_ABSENT"
  | "PREVIEW_FAILED"
  | "PREVIEW_UNAVAILABLE"
  | "PROVIDER_REQUIRED"
  | "RETARGET_REFUSED"
  | "SEMANTIC_FAILED"
  | "SEMANTIC_PROVIDER_ABSENT"
  | "SOURCE_API_UNAVAILABLE"
  | "SOURCE_REJECTED"
  | "SOURCE_REQUIRED"
  | "TIMEOUT"
  | "UNKNOWN_MOVEMENT";

export type ReferenceTrainingDiagnostic = Readonly<{
  severity: "info" | "warning" | "error";
  code: ReferenceTrainingErrorCode;
  message: string;
}>;

export type ResolvedReferenceSource = Readonly<{
  sessionId: string;
  receipt: VideoSourceReceipt;
  mediaUrl: string;
}>;

export interface ReferenceTrainingApi {
  resolveLinkedSource(url: string, signal: AbortSignal): Promise<ResolvedReferenceSource>;
}

export type ReferenceTrainingProgress = Readonly<{
  stage: "analyzing" | "interpreting" | "persisting";
  completed: number;
  total: number;
  tMs?: number;
}>;

export type ReferenceAnalysisResult = Readonly<{
  selection: VideoAnalysisSelection;
  poseTrack: PoseObservationTrack;
  mechanics: MotionMechanicsSummary;
  evidenceFrames: readonly SemanticEvidenceFrameRef[];
}>;

export interface ReferenceMotionAnalyzer {
  readonly id: string;
  readonly version: string;
  analyze(
    input: Readonly<{
      sessionId: string;
      source: VideoSourceReceipt;
      mediaUrl: string;
    }>,
    signal: AbortSignal,
    onProgress: (progress: Omit<ReferenceTrainingProgress, "stage">) => void,
  ): Promise<ReferenceAnalysisResult>;
}

export type ReferenceTrainingStage =
  | "selection"
  | "pose"
  | "mechanics"
  | "semantic"
  | "score"
  | "form"
  | "physics_plan";

export interface ReferenceTrainingPersister {
  writeStage(
    sessionId: string,
    stage: ReferenceTrainingStage,
    artifact: unknown,
    signal: AbortSignal,
  ): Promise<Readonly<{ artifactHash: string }>>;
}

export interface ReferencePerformancePreviewPort {
  start(plan: PhysicsIntentPlan): unknown;
  stop(): unknown;
}

export type ReferenceTrainingDependencies = Readonly<{
  analyzer?: ReferenceMotionAnalyzer;
  semanticInterpreter?: Pick<ProviderSemanticMotionInterpreter, "interpret">;
  formProfile?: FormCapabilityProfile;
  environment?: EnvironmentPhysicsProfile;
  seed?: number;
  persister?: ReferenceTrainingPersister;
  preview?: ReferencePerformancePreviewPort;
}>;

export class ReferenceTrainingApiError extends Error {
  readonly code: ReferenceTrainingErrorCode;

  constructor(code: ReferenceTrainingErrorCode, message: string) {
    super(message);
    this.name = "ReferenceTrainingApiError";
    this.code = code;
  }
}

export type ReferenceTrainingSnapshot = Readonly<{
  status: ReferenceTrainingStatus;
  revision: number;
  sessionId: string | null;
  source: VideoSourceReceipt | null;
  mediaUrl: string | null;
  availability: Readonly<{
    poseBackend: "available" | "absent";
    semanticProvider: "available" | "absent";
    persistence: "available" | "absent";
    preview: "available" | "absent";
  }>;
  progress: ReferenceTrainingProgress | null;
  userIntent: string;
  selection: VideoAnalysisSelection | null;
  poseTrack: PoseObservationTrack | null;
  mechanics: MotionMechanicsSummary | null;
  semanticProposal: SemanticMotionProposal | null;
  motionScore: MotionScore | null;
  formProfile: FormCapabilityProfile | null;
  physicsPlan: PhysicsIntentPlan | null;
  dispositions: readonly RetargetDisposition[];
  diagnostics: readonly ReferenceTrainingDiagnostic[];
  errorCode: ReferenceTrainingErrorCode | null;
  error: string | null;
}>;

export type ReferenceTrainingAction = Readonly<{
  ok: boolean;
  code?: ReferenceTrainingErrorCode;
  revision: number;
  sessionId?: string;
}>;

function cloneReceipt(receipt: VideoSourceReceipt | null): VideoSourceReceipt | null {
  return receipt
    ? {
        ...receipt,
        media: { ...receipt.media },
        resolver: { ...receipt.resolver },
      }
    : null;
}

export class ReferenceTrainingSession {
  private status: ReferenceTrainingStatus = "empty";
  private revision = 0;
  private sessionId: string | null = null;
  private source: VideoSourceReceipt | null = null;
  private mediaUrl: string | null = null;
  private progress: ReferenceTrainingProgress | null = null;
  private userIntent = "";
  private selection: VideoAnalysisSelection | null = null;
  private poseTrack: PoseObservationTrack | null = null;
  private mechanics: MotionMechanicsSummary | null = null;
  private semanticProposal: SemanticMotionProposal | null = null;
  private motionScore: MotionScore | null = null;
  private formProfile: FormCapabilityProfile | null = null;
  private physicsPlan: PhysicsIntentPlan | null = null;
  private dispositions: readonly RetargetDisposition[] = [];
  private diagnostics: ReferenceTrainingDiagnostic[] = [];
  private errorCode: ReferenceTrainingErrorCode | null = null;
  private error: string | null = null;
  private activeRequest: AbortController | null = null;
  private cachedSnapshot: ReferenceTrainingSnapshot | null = null;
  private readonly listeners = new Set<() => void>();
  private availability: ReferenceTrainingSnapshot["availability"];
  private readonly dependencies: ReferenceTrainingDependencies;

  constructor(
    private readonly api: ReferenceTrainingApi,
    availability: Partial<ReferenceTrainingSnapshot["availability"]> = {},
    dependencies: ReferenceTrainingDependencies = {},
  ) {
    this.dependencies = dependencies;
    this.availability = Object.freeze({
      poseBackend: availability.poseBackend ?? (dependencies.analyzer ? "available" : "absent"),
      semanticProvider: availability.semanticProvider ?? (dependencies.semanticInterpreter ? "available" : "absent"),
      persistence: availability.persistence ?? (dependencies.persister ? "available" : "absent"),
      preview: availability.preview ?? (dependencies.preview ? "available" : "absent"),
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  updateAvailability(
    availability: Partial<ReferenceTrainingSnapshot["availability"]>,
  ): ReferenceTrainingAction {
    const next = Object.freeze({ ...this.availability, ...availability });
    if (
      next.poseBackend === this.availability.poseBackend &&
      next.semanticProvider === this.availability.semanticProvider &&
      next.persistence === this.availability.persistence &&
      next.preview === this.availability.preview
    ) {
      return { ok: true, revision: this.revision, sessionId: this.sessionId ?? undefined };
    }
    this.availability = next;
    if (this.source && this.status !== "blocked") this.diagnostics = this.availabilityDiagnostics();
    this.bump();
    return { ok: true, revision: this.revision, sessionId: this.sessionId ?? undefined };
  }

  snapshot(): ReferenceTrainingSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot;
    this.cachedSnapshot = Object.freeze({
      status: this.status,
      revision: this.revision,
      sessionId: this.sessionId,
      source: cloneReceipt(this.source),
      mediaUrl: this.mediaUrl,
      availability: this.availability,
      progress: this.progress ? { ...this.progress } : null,
      userIntent: this.userIntent,
      selection: this.selection,
      poseTrack: this.poseTrack,
      mechanics: this.mechanics,
      semanticProposal: this.semanticProposal,
      motionScore: this.motionScore,
      formProfile: this.formProfile,
      physicsPlan: this.physicsPlan,
      dispositions: [...this.dispositions],
      diagnostics: this.diagnostics.map((entry) => ({ ...entry })),
      errorCode: this.errorCode,
      error: this.error,
    });
    return this.cachedSnapshot;
  }

  async linkVideo(url: string): Promise<ReferenceTrainingAction> {
    const sourceUrl = url.trim();
    if (!sourceUrl) {
      return this.fail("INVALID_SOURCE", "Paste a direct video URL before importing.");
    }
    this.activeRequest?.abort();
    const request = new AbortController();
    this.activeRequest = request;
    this.status = "resolving";
    this.sessionId = null;
    this.source = null;
    this.mediaUrl = null;
    this.clearDerivedArtifacts();
    this.diagnostics = [];
    this.errorCode = null;
    this.error = null;
    this.bump();

    try {
      const resolved = await this.api.resolveLinkedSource(sourceUrl, request.signal);
      if (this.activeRequest !== request || request.signal.aborted) {
        return { ok: false, code: "ABORTED", revision: this.revision };
      }
      this.activeRequest = null;
      this.sessionId = resolved.sessionId;
      this.source = cloneReceipt(resolved.receipt);
      this.mediaUrl = resolved.mediaUrl;
      this.status = "source_ready";
      this.diagnostics = this.availabilityDiagnostics();
      this.bump();
      return { ok: true, revision: this.revision, sessionId: resolved.sessionId };
    } catch (caught) {
      if (request.signal.aborted || this.activeRequest !== request) {
        return { ok: false, code: "ABORTED", revision: this.revision };
      }
      this.activeRequest = null;
      const apiError = caught instanceof ReferenceTrainingApiError ? caught : null;
      const code = apiError?.code ?? "SOURCE_API_UNAVAILABLE";
      const message = caught instanceof Error ? caught.message : String(caught);
      return this.fail(code, message);
    }
  }

  cancel(): ReferenceTrainingAction {
    this.activeRequest?.abort();
    this.activeRequest = null;
    this.dependencies.preview?.stop();
    this.status = this.physicsPlan ? "compiled" : this.source ? "source_ready" : "empty";
    this.progress = null;
    this.errorCode = null;
    this.error = null;
    this.diagnostics = this.source ? this.availabilityDiagnostics() : [];
    this.bump();
    return { ok: true, revision: this.revision, sessionId: this.sessionId ?? undefined };
  }

  async analyze(userIntent = "Encode the observed movement for Wispwalker while preserving recognition-critical mechanics."): Promise<ReferenceTrainingAction> {
    if (!this.source) return this.fail("SOURCE_REQUIRED", "Import a measured video source first.");
    if (!this.sessionId || !this.mediaUrl) {
      return this.fail("SOURCE_REQUIRED", "The measured source transaction is incomplete.");
    }
    if (this.availability.poseBackend !== "available" || !this.dependencies.analyzer) {
      return this.fail(
        "POSE_BACKEND_ABSENT",
        "Pose analysis is unavailable until a real observation backend is installed.",
      );
    }
    this.activeRequest?.abort();
    const request = new AbortController();
    this.activeRequest = request;
    this.clearDerivedArtifacts();
    this.status = "analyzing";
    this.userIntent = userIntent.trim() || "Encode the observed movement for Wispwalker while preserving recognition-critical mechanics.";
    this.progress = { stage: "analyzing", completed: 0, total: 1 };
    this.errorCode = null;
    this.error = null;
    this.bump();

    try {
      const analyzed = await this.dependencies.analyzer.analyze(
        { sessionId: this.sessionId, source: this.source, mediaUrl: this.mediaUrl },
        request.signal,
        (progress) => {
          if (this.activeRequest !== request || request.signal.aborted) return;
          this.progress = { stage: "analyzing", ...progress };
          this.bump();
        },
      );
      this.assertCurrent(request);
      this.selection = analyzed.selection;
      this.poseTrack = analyzed.poseTrack;
      this.mechanics = analyzed.mechanics;
      await this.persistStages(request, [
        ["selection", analyzed.selection],
        ["pose", analyzed.poseTrack],
        ["mechanics", analyzed.mechanics],
      ]);
      this.assertCurrent(request);

      if (!this.dependencies.semanticInterpreter || this.availability.semanticProvider !== "available") {
        this.activeRequest = null;
        this.status = "needs_review";
        this.progress = null;
        this.diagnostics = this.availabilityDiagnostics();
        this.bump();
        return { ok: true, revision: this.revision, sessionId: this.sessionId };
      }
      const form = this.dependencies.formProfile;
      const environment = this.dependencies.environment;
      if (!form || !environment) {
        return this.fail("FORM_PROFILE_ABSENT", "A validated form and environment profile are required before retargeting.");
      }

      this.status = "interpreting";
      this.progress = { stage: "interpreting", completed: 0, total: 1 };
      this.bump();
      const executablePrimitives = form.primitives.filter((primitive) =>
        validatePrimitiveAgainstForm({ id: primitive }, form).ok,
      );
      if (executablePrimitives.length === 0) {
        return this.fail("RETARGET_REFUSED", `${form.formId} exposes no currently executable motion primitives.`);
      }
      const semantic = await this.dependencies.semanticInterpreter.interpret({
        userIntent: this.userIntent,
        mechanics: analyzed.mechanics,
        evidenceFrames: analyzed.evidenceFrames,
        externalDefinitions: [],
        allowedPrimitives: executablePrimitives,
      }, request.signal);
      this.assertCurrent(request);
      if (semantic.resolution === "unknown_movement") {
        this.semanticProposal = semantic;
        await this.persistStages(request, [["semantic", semantic]]);
        return this.fail(
          "UNKNOWN_MOVEMENT",
          `The semantic provider could not establish ${semantic.movementName} from the supplied evidence.`,
        );
      }
      const score = compileSemanticMotionScore(
        analyzed.mechanics,
        semantic,
        `score-${this.sessionId}`,
      );
      const retargeted = retargetMotionScore(
        score,
        form,
        environment,
        this.dependencies.seed ?? 1,
      );
      if (!retargeted.ok) {
        this.semanticProposal = semantic;
        this.motionScore = score;
        await this.persistStages(request, [["semantic", semantic], ["score", score], ["form", form]]);
        return this.fail(
          "RETARGET_REFUSED",
          retargeted.refusals.map((entry) => `${entry.beatId}: ${entry.message}`).join("; "),
        );
      }

      await this.persistStages(request, [
        ["semantic", semantic],
        ["score", score],
        ["form", form],
        ["physics_plan", retargeted.plan],
      ]);
      this.assertCurrent(request);
      this.semanticProposal = semantic;
      this.motionScore = score;
      this.formProfile = form;
      this.physicsPlan = retargeted.plan;
      this.dispositions = retargeted.dispositions;
      this.activeRequest = null;
      this.status = "compiled";
      this.progress = null;
      this.diagnostics = this.availabilityDiagnostics();
      this.bump();
      return { ok: true, revision: this.revision, sessionId: this.sessionId };
    } catch (caught) {
      if (request.signal.aborted || this.activeRequest !== request) {
        return { ok: false, code: "ABORTED", revision: this.revision, sessionId: this.sessionId };
      }
      this.activeRequest = null;
      const message = caught instanceof Error ? caught.message : String(caught);
      const code: ReferenceTrainingErrorCode = /persist/i.test(message)
        ? "PERSISTENCE_FAILED"
        : this.status === "interpreting"
          ? "SEMANTIC_FAILED"
          : "ANALYSIS_FAILED";
      return this.fail(code, message);
    }
  }

  preview(): ReferenceTrainingAction {
    if (!this.physicsPlan) return this.fail("PREVIEW_UNAVAILABLE", "Compile a physics intent plan before previewing.");
    if (!this.dependencies.preview || this.availability.preview !== "available") {
      return this.fail("PREVIEW_UNAVAILABLE", "The live Gasper preview port is unavailable.");
    }
    try {
      this.dependencies.preview.start(this.physicsPlan);
      this.status = "previewing";
      this.error = null;
      this.errorCode = null;
      this.bump();
      return { ok: true, revision: this.revision, sessionId: this.sessionId ?? undefined };
    } catch (caught) {
      return this.fail("PREVIEW_FAILED", caught instanceof Error ? caught.message : String(caught));
    }
  }

  stopPreview(): ReferenceTrainingAction {
    this.dependencies.preview?.stop();
    this.status = this.physicsPlan ? "compiled" : this.source ? "source_ready" : "empty";
    this.error = null;
    this.errorCode = null;
    this.bump();
    return { ok: true, revision: this.revision, sessionId: this.sessionId ?? undefined };
  }

  private availabilityDiagnostics(): ReferenceTrainingDiagnostic[] {
    const result: ReferenceTrainingDiagnostic[] = [];
    if (this.availability.poseBackend === "absent") {
      result.push({
        severity: "warning",
        code: "POSE_BACKEND_ABSENT",
        message: "Source is measured; pose observation backend is not installed yet.",
      });
    }
    if (this.availability.semanticProvider === "absent") {
      result.push({
        severity: "warning",
        code: "SEMANTIC_PROVIDER_ABSENT",
        message: "No language/vision provider is bound for semantic beat interpretation.",
      });
    }
    if (this.availability.persistence === "absent") {
      result.push({
        severity: "warning",
        code: "PERSISTENCE_FAILED",
        message: "Derived artifacts are browser-memory only until the training store route is bound.",
      });
    }
    if (this.availability.preview === "absent") {
      result.push({
        severity: "info",
        code: "PREVIEW_UNAVAILABLE",
        message: "The live Wispwalker preview port is not bound.",
      });
    }
    return result;
  }

  private clearDerivedArtifacts(): void {
    this.progress = null;
    this.userIntent = "";
    this.selection = null;
    this.poseTrack = null;
    this.mechanics = null;
    this.semanticProposal = null;
    this.motionScore = null;
    this.formProfile = null;
    this.physicsPlan = null;
    this.dispositions = [];
  }

  private assertCurrent(request: AbortController): void {
    if (this.activeRequest !== request || request.signal.aborted) {
      throw new DOMException("reference training transaction aborted", "AbortError");
    }
  }

  private async persistStages(
    request: AbortController,
    stages: readonly (readonly [ReferenceTrainingStage, unknown])[],
  ): Promise<void> {
    if (!this.dependencies.persister || !this.sessionId) return;
    for (let index = 0; index < stages.length; index += 1) {
      this.assertCurrent(request);
      this.progress = { stage: "persisting", completed: index, total: stages.length };
      this.bump();
      const [stage, artifact] = stages[index]!;
      await this.dependencies.persister.writeStage(this.sessionId, stage, artifact, request.signal);
    }
  }

  private fail(code: ReferenceTrainingErrorCode, message: string): ReferenceTrainingAction {
    this.activeRequest = null;
    this.progress = null;
    this.status = "blocked";
    this.errorCode = code;
    this.error = message;
    this.diagnostics = [
      ...this.availabilityDiagnostics().filter((entry) => entry.code !== code),
      { severity: "error", code, message },
    ];
    this.bump();
    return { ok: false, code, revision: this.revision, sessionId: this.sessionId ?? undefined };
  }

  private bump(): void {
    this.revision += 1;
    this.cachedSnapshot = null;
    for (const listener of this.listeners) listener();
  }
}
