# Grok 4.6 Studio Pilot — Architecture Worker Audit

**Date:** 2026-08-13
**Author role:** Grok 4.6 architecture worker
**Status:** READ-ONLY audit. No implementation. No commit.
**Residual:** the visible Studio prompt is not a typed inspect→act→observe control loop.
**Lead force:** ThinkOps (architecture). PlanOps / DesignOps constrain.
**Scope:** `C:\Users\funny\Documents\GasperStudio` only. Grimoire untouched.

This packet designs the smallest production-grade change that turns the visible natural-language prompt into a genuine Grok 4.6 Studio pilot with broad legitimate in-app authority. It does not replace the N153–N159 video-to-behavior lane.

**Governing specs:**

- `docs/triforce/NORTHSTAR.md` (N120 Tuning Lab; N153–N159 semantic/video; S3/S4/S5; N55 reduced-motion)
- `docs/triforce/NORTHSTAR-SEMANTIC-PERFORMANCE.md`
- `docs/triforce/plans/2026-08-13-gasper-video-to-behavior-foundation.md`

**Required architecture (mission law):**

1. Grok receives typed capability discovery plus current Studio observations.
2. Grok emits a strict versioned JSON action batch, never prose masquerading as control.
3. Browser executes only enumerated actions through existing public authorities (tuning session, reference training, GasperRigController/DAIS, physics/performance APIs). Never eval, shell, filesystem, direct DOM transform, or renderer bypass.
4. Executor returns per-action observations/receipts. Loop: inspect → act → observe → revise until `complete` / `needs_user` / bounded max turns.
5. Physics / compiler / topology / bounds / reduced-motion remain authoritative. Owner visual acceptance remains separate.
6. Prompt UI exposes model, live capabilities, progress, action receipts, stop/rollback, and honest errors.
7. Existing video-to-behavior flow remains intact and integrates with the pilot.
8. Tests catch malformed plans, unsupported actions, bad bounds, partial failure, cancellation, iteration limit, provider failure, and actual authority calls.
9. No commit / push / reset / stash / clean / delete / install / credential changes. Never touch Grimoire.

---

## A. Exact seams and risks (file / symbol citations)

### A1. The visible prompt is not Grok

`TuningLabPanel` (`packages/gasper-studio/src/tuning/TuningLabPanel.tsx`) is the owner-facing prompt:

- Placeholder: **“Tell Gasper what to do…”**
- `data-testid="tuning-lab-intent"`
- Enter / Apply calls `TuningLabSession.applyIntent` → `compileMotionIntent`

`compileMotionIntent` (`packages/gasper-studio/src/tuning/intentToMotion.ts`) is a regex phrase matcher:

- `crip walk` / `wispwalker.*walk` → fixed Wispwalker footwork rehearsal knobs
- `vertical|height` + `15|fifteen %` → `verticalDepthGain: 0.85`
- `ground|heavy|weight` → bob / squash / viscoTau preset
- Unknown text returns `"intent has no bounded N120 mapping yet"`

This is the N153 overclaim: phrase-to-preset is not semantic understanding and is not a Studio agent.

`TuningLabSession.applyIntent` (`packages/gasper-studio/src/tuning/tuningRegistry.ts`) is already the right **execution** shape: transactional, rolls back on any rejected knob via `rollbackTo` / `restoreSurfaceState`, and routes only through `TuningLabSurface` (`commitBinding`, `setDesignParameter`, `setPerformancePackParams`, `setTuningLabParams`, `setExpressionGain`, `setEmbodiment`).

`TuningLabSurface` is late-bound from `window.__GASPER_DAIS__` in `GasperStudioApp` (`packages/gasper-studio/src/GasperStudioApp.tsx`, `tuningLab` `useMemo`).

### A2. Grok is a one-shot meaning proposer, not a Studio agent

| Symbol | Path | What it actually does |
|---|---|---|
| `GrokSemanticMotionProvider.generateStructured` | `packages/gasper-studio/src/training/server/GrokSemanticMotionProvider.ts` | Spawns local `grok.exe` with `--max-turns 1 --tools "" --json-schema` for `gasper.semantic-motion-proposal.v1` only. Default model `grok-4.6`. Timeout 180s. Isolated temp prompt + leader socket. |
| `buildGrokArgs` | same | `--no-memory --no-plan --no-subagents --disable-web-search --permission-mode dontAsk --tools "" --output-format json --verbatim` |
| `HttpSemanticMotionProvider` | `packages/gasper-studio/src/training/HttpSemanticMotionProvider.ts` | Browser POST `/__gasper/training/semantic` |
| `createTrainingSourceMiddleware` `/semantic` | `packages/gasper-studio/src/training/server/trainingSourceMiddleware.ts` | Accepts `{packet}` only if `schemaName === "gasper.semantic-motion-proposal.v1"`. No capabilities, no observations, no action batch. Loopback + same-origin gate. |
| `GET /__gasper/training/status` | same | Capabilities are only `{source, persistence, semantic}` — not Studio capability discovery. |
| `ProviderSemanticMotionInterpreter.interpret` | `packages/gasper-studio/src/training/SemanticMotionInterpreter.ts` | Validates proposal against `semanticMotionProposalSchema`, stamps trusted `provider`, never executes. |
| `compileSemanticMotionScore` | `packages/gasper-studio/src/training/SemanticMotionCompiler.ts` | Merges model meaning into mechanics-owned `MotionScore`. Measured beat boundaries / contact order / root travel stay mechanics-owned. |
| `retargetMotionScore` | `packages/shared/src/gasper-performance/reference/retarget.ts` | Form gate → `PhysicsIntentPlan` or typed refusal (`UNSUPPORTED_PRIMITIVE`, `SUPPORT_COUNT_MISMATCH`, `CALIBRATION_REQUIRED`). |
| `validatePrimitiveAgainstForm` | `packages/desktop/src/gasper/performance/FormCapabilityProfile.ts` | Fail-closed form gate. Cannot move Gasper. |
| `ReferenceTrainingSession.analyze` | `packages/gasper-studio/src/training/ReferenceTrainingSession.ts` | One linear transaction: pose → Grok interpret → compile → retarget → persist. Status machine: `empty → resolving → source_ready → analyzing → interpreting → compiled \| needs_review \| blocked`. |
| `gasperReferenceTrainingSource` | `vite.config.ts` | Wires `TrainingSourceService` + `GrokSemanticMotionProvider` into Vite middleware. |

Grok never sees Studio state. It never emits actions. It cannot revise after preview.

### A3. Video-to-behavior lane is intact and must stay a callee

`ReferenceTrainingPanel` (`packages/gasper-studio/src/training/ReferenceTrainingPanel.tsx`) is a **second** prompt (“What must Gasper preserve from this movement?”) mounted **inside** Tuning Lab by `TuningLabPanel`.

Public training authority (`ReferenceTrainingSession`):

- `linkVideo(url)`
- `analyze(userIntent)`
- `cancel()`
- `preview()`
- `stopPreview()`
- `snapshot()` / `subscribe()` / `updateAvailability()`

Preview already goes through the live controller (`GasperStudioApp.tsx`):

```ts
preview: {
  start: (plan) => {
    const dais = window.__GASPER_DAIS__;
    dais.setEmbodiment("wispwalker");
    return dais.startReferencePerformance(plan);
  },
  stop: () => dais?.stopReferencePerformance() ?? null,
}
```

Do not fold this into the phrase matcher or into Grok tools. The pilot may **invoke** `linkVideo` / `analyze` / `preview` as catalog actions.

### A4. Public authorities already exist. The hazard is calling the wrong ones.

**Safe, already-public write/inspect surfaces:**

| Surface | File | Symbols |
|---|---|---|
| Tuning Lab session | `packages/gasper-studio/src/tuning/tuningRegistry.ts` | `set`, `applyIntent`, `pinBaseline`, `compareBaseline`, `reset`, `captureProof`, `snapshot` |
| Reference training | `packages/gasper-studio/src/training/ReferenceTrainingSession.ts` | `linkVideo`, `analyze`, `cancel`, `preview`, `stopPreview`, `snapshot` |
| DAIS rail helpers | `packages/gasper-studio/src/dais-first/daisFirstControls.ts` | `selectEmbodiment`, `selectExpression`, `setExpressionGain`, `commitDesignParam`, `applyWorldPhysicsParams`, `launchWorldBounceFromRail`, `launchWorldCometFromRail`, `disarmWorldBodyFromRail`, `applyCraftRailParams`, `runDaisCraftPack`, `stopDaisCraftPack`, `pinAbBaseline`, `compareAbBaseline`, `stepFrame` |
| Adapter transport | same + WorldClass adapter | `play`, `pause`, `interrupt`, `setPlayhead` |
| Rig controller | `packages/desktop/src/gasper/GasperRigController.ts` | `setTuningLabParams`, `getTuningLabTelemetry`, `startReferencePerformance`, `interruptReferencePerformance`, `stopReferencePerformance`, `inspectReferencePerformance`, `launchWorldBounce`, `launchWorldComet`, `disarmWorldBody`, `getWorldBodyState`, `setWorldPhysicsParams`, `runCraftPack`, `runPerformancePack`, `inspectDais`, `livingStatus`, `topologyStatus`, `validateRuntime`, `setEmbodiment`, `setExpression`, `setMicrostate` |
| Performance driver | `packages/desktop/src/gasper/performance/PerformancePrimitiveDriver.ts` | `start` / `interrupt` / `stop` / `inspect` — sole performance locomotion owner (`setLocomotion("performance", …)`) |
| Inspection | `packages/desktop/src/gasper/GasperDaisInspection.ts` `buildDaisInspectionReport`; `packages/desktop/src/gasper/controller/inspectionService.ts` `inspectDaisForController` | Typed observation, not a write |

**Unsafe if the pilot can reach them (they exist on the same `__GASPER_DAIS__` object):**

| Symbol | File | Why forbidden |
|---|---|---|
| `applyExternalPose` | `GasperRigController.ts`; also `http-bridge-client.ts`, `daisManipulation.ts`, `createProductionWorldClassAdapter.ts` | Renderer / pose bypass |
| `applyComposedExternalPose` | `GasperRigController.ts` | Compositor bypass |
| `applyOperationalRelief` | `GasperRigController.ts` | Relief write outside design-param path |
| `setWorldPose` | `GasperRigController.ts` | Second body writer |
| `setLiveFormCoeff` | `GasperRigController.ts`; `formDesignAuthority.ts` | Raw FormMaster coeff. Legal only via `TuningLabSession` / typed design params |
| `WorldPhysicsDriver.setLocomotion` | `packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts` | Pilot must not file `wander` / `life` / `internal` owners |
| `playAnimationPlan` / `playBehavioralSequenceViaPlans` | `GasperRigController.ts` | GSAP plan injection |
| `beginOwnerReview` | `GasperRigController.ts` | Owner-lease; blocks `startReferencePerformance` |
| `GasperPilotHost` / `mountStudioPilotAdapter` / `mountPackagedGasperPilotHost` | `packages/desktop/src/gasper/pilot/*`; `packages/gasper-studio/src/pilot/mountPackagedPilotHost.ts` | **Name collision.** This “pilot” is eight-state / GSAP living handoff (GASPER-PILOT-002), not an LLM Studio agent. Do not extend it. |

### A5. Transport that looks like a loop but is not this loop

`TuningLabBridgeQueue` + `TUNING_LAB_BRIDGE_OPS` (`packages/studio-protocol/src/tuningLabBridge.ts`) and `startTuningLabBrowserBridge` (`packages/gasper-studio/src/tuning/tuningLabBridgeClient.ts`) are **MCP → Vite queue → browser poll → `TuningLabSession`**. Inverse of the needed Grok loop (browser owns the turn; server only proposes). Reuse the receipt idea, not the poll direction. Do not send Grok through MCP.

Ops already on that bridge: `inspect_tuning_lab`, `set_tuning_parameter`, `pin_tuning_baseline`, `compare_tuning_baseline`, `reset_tuning_lab`, `capture_tuning_proof`, `read_tuning_telemetry`, `apply_motion_intent`. These remain MCP projections of the lab. They are not the Studio pilot.

### A6. Authority fights already encoded

`GasperRigController.startReferencePerformance` refuses:

- active owner-review lease
- non-`wispwalker` embodiment
- running performance pack
- physics modes `bounce` / `comet-gather` / `comet-fly`

A pilot that launches bounce then previews video will fail closed. The executor must surface that as an action receipt, not retry via `setWorldPose`.

`WorldPhysicsDriver.setLocomotion` hierarchy: spatial owners outrank `internal`. Pilot must never file locomotion except through `PerformancePrimitiveDriver` (`owner: "performance"`).

`N55`: reduced-motion keeps authority target and provenance, collapses expression. Executor must read `livingStatus().reducedMotion` and fail mutating performance/physics actions with `REDUCED_MOTION_COLLAPSE` rather than inventing a second clock.

### A7. Vite / process seam

`vite.config.ts`:

- `gasperTuningLabBridge()` — MCP lab queue
- `gasperReferenceTrainingSource()` — source / stage / semantic / media / status
- Body cap on generic JSON: 256_000 bytes
- Training `/semantic` body cap: 768 KiB
- Training `/stage` body cap: 64 MiB (artifacts, not Grok)

New pilot turn route must be a **third** plugin or an additive path. Do not replace `/__gasper/training/semantic`.

---

## B. Proposed versioned types and strict schemas

New additive package. Do **not** mutate v1 motion-score / IR hashes.

Proposed root: `packages/shared/src/gasper-performance/studio-pilot/`

Schema names are literals. All objects Zod `.strict()`. Unknown fields fail. Numbers finite. IDs `/^[a-z][a-z0-9_-]{0,63}$/`.

### B1. Capability catalog — `gasper.studio-pilot.capability-catalog.v1`

```ts
type StudioPilotCapability = Readonly<{
  id: StudioPilotActionId;          // closed enum; see §C
  domain:
    | "inspect" | "tuning" | "dais" | "physics"
    | "craft" | "performance" | "reference" | "session";
  mutates: boolean;
  waitMs?: { min: number; max: number };
  inputSchemaId: string;
  authority:
    | "TuningLabSession"
    | "ReferenceTrainingSession"
    | "GasperRigController"
    | "daisFirstControls"
    | "WorldClassStudioAdapter";
  method: string;                   // exact symbol, e.g. "setTuningLabParams"
  bounds?: Readonly<Record<string, { min: number; max: number; unit: string }>>;
  preconditions: readonly string[];
  conflictsWith: readonly StudioPilotActionId[];
}>;

type StudioPilotCapabilityCatalog = Readonly<{
  schema: "gasper.studio-pilot.capability-catalog.v1";
  catalogVersion: string;           // semver pinned in code
  model: "grok-4.6";
  actions: readonly StudioPilotCapability[];
}>;
```

Catalog hash (`sha256` of canonical JSON) rides on every turn request so a stale model cannot call a retired action.

### B2. Observation — `gasper.studio-pilot.observation.v1`

Projected. Never raw `inspectDais` (that report can carry notes / markup). Same idea as `projectMechanicsForSemanticPrompt`.

```ts
type StudioPilotObservation = Readonly<{
  schema: "gasper.studio-pilot.observation.v1";
  atMs: number;
  revision: number;
  reducedMotion: boolean;
  embodiment: string;
  expression: string;
  living: {
    running: boolean;
    reducedMotion: boolean;
    eightState: string | null;
  };
  physics: {
    mode: string;
    bodyX: number;
    bodyZ: number;
    gaitStepHz: number;
    supportExchange: number;
    residual: number | null;
  };
  topology: {
    errorCount: number;
    contourOnly: boolean;
  };
  tuning: {
    revision: number;
    embodiment: string;
    changedFromBaseline: boolean;
    knobs: Readonly<Record<string, number>>;
  };
  reference: {
    status: ReferenceTrainingStatus;
    sessionId: string | null;
    hasSource: boolean;
    hasScore: boolean;
    hasPlan: boolean;
    errorCode: string | null;
  };
  performance: {
    active: boolean;
    planId: string | null;
    beatId: string | null;
    disposition: string | null;
  };
  lastReceipts: readonly StudioPilotActionReceipt[];
  diagnostics: readonly {
    severity: "info" | "warning" | "error";
    code: string;
    message: string;
  }[];
}>;
```

### B3. Action batch — `gasper.studio-pilot.action-batch.v1`

The **only** legal Grok output. JSON Schema handed to `--json-schema` (`STUDIO_PILOT_OUTPUT_JSON_SCHEMA`) is this object, `additionalProperties: false`, same style as `SEMANTIC_MOTION_OUTPUT_JSON_SCHEMA`.

```ts
type StudioPilotStop = "continue" | "complete" | "needs_user" | "blocked";

type StudioPilotAction = Readonly<{
  id: string;                       // unique inside the batch
  action: StudioPilotActionId;      // closed enum
  input: Readonly<Record<string, unknown>>; // per-action zod
}>;

type StudioPilotActionBatch = Readonly<{
  schema: "gasper.studio-pilot.action-batch.v1";
  batchId: string;
  turn: number;
  stop: StudioPilotStop;
  rationale: string;                // display only; never executed
  uncertainties: readonly string[]; // max 8
  actions: readonly StudioPilotAction[]; // max 8; empty iff stop !== "continue"
}>;
```

Provider identity is stamped after parse, never model-authored (same law as `ProviderSemanticMotionInterpreter`).

### B4. Action receipt — `gasper.studio-pilot.action-receipt.v1`

```ts
type StudioPilotReceiptCode =
  | "UNSUPPORTED_ACTION"
  | "MALFORMED_INPUT"
  | "BOUNDS_VIOLATION"
  | "PRECONDITION_FAILED"
  | "AUTHORITY_REJECTED"
  | "PARTIAL_BATCH"
  | "CANCELLED"
  | "ITERATION_LIMIT"
  | "PROVIDER_FAILED"
  | "REDUCED_MOTION_COLLAPSE";

type StudioPilotActionReceipt = Readonly<{
  schema: "gasper.studio-pilot.action-receipt.v1";
  actionId: string;
  action: StudioPilotActionId;
  ok: boolean;
  code?: StudioPilotReceiptCode;
  message?: string;
  authority: string;
  method: string;
  beforeRev: number;
  afterRev: number;
  observation?: StudioPilotObservation;
  rollbackToken?: string;
}>;
```

### B5. Turn protocol

```ts
// Browser → server
type StudioPilotTurnRequest = Readonly<{
  schema: "gasper.studio-pilot.turn-request.v1";
  sessionId: string;
  turn: number;
  maxTurns: number;                 // host default 8, hard max 12
  model: "grok-4.6";
  userGoal: string;                 // visible prompt text
  catalogHash: string;
  observation: StudioPilotObservation;
  history: readonly {
    batch: StudioPilotActionBatch;
    receipts: readonly StudioPilotActionReceipt[];
  }[];                              // max 6 prior turns
}>;

// Server → browser
type StudioPilotTurnResponse = Readonly<{
  schema: "gasper.studio-pilot.turn-response.v1";
  ok: boolean;
  responseId: string;
  model: string;
  batch?: StudioPilotActionBatch;
  error?: {
    code: "PROVIDER_FAILED" | "MALFORMED_PLAN" | "ABORTED" | "TIMEOUT";
    message: string;
  };
}>;
```

### B6. Closed system prompt law (not freeform)

Pinned string, same role as `buildSemanticMotionPrompt` system text:

- emit only `gasper.studio-pilot.action-batch.v1`
- call only `catalog.actions[].id`
- do not invent anatomy, mass, force, or world coordinates
- do not emit prose, markdown, shell, JS, or CSS
- if the goal needs a missing capability, `stop: "needs_user"` or `"blocked"` with empty `actions`
- physics / compiler / topology remain downstream authorities; a plan is a proposal

---

## C. Complete MVP action / capability table

Broad enough to reach every legitimate in-app control the owner already has on the rail, lab, training panel, and physics performances. Not a 3-action toy. Every row is an existing symbol. No new motion writer.

`StudioPilotActionId` is the closed enum of the `action` column.

| `action` | Domain | Mutates | Authority.method | Input (bounded) | Preconditions / conflicts |
|---|---|---|---|---|---|
| `inspect.snapshot` | inspect | no | compose `inspectDais` + `TuningLabSession.snapshot` + `ReferenceTrainingSession.snapshot` + `getWorldBodyState` + `inspectReferencePerformance` | none | always legal |
| `inspect.wait` | inspect | no | host clock (not organism clock) | `{ ms: 100..4000 }` then re-observe | not in the same batch as `session.complete` |
| `tuning.set` | tuning | yes | `TuningLabSession.set` | `{ id: TuningParameterId, value }` clamped to `TUNING_PARAMETER_SPECS` min/max/step | transactional with other `tuning.set` in the same batch |
| `tuning.reset` | tuning | yes | `TuningLabSession.reset` | none | conflicts with in-flight `reference.analyze` |
| `tuning.pin_baseline` | tuning | yes | `TuningLabSession.pinBaseline` | none | — |
| `tuning.compare_baseline` | tuning | no | `TuningLabSession.compareBaseline` | none | — |
| `tuning.capture_proof` | tuning | no | `TuningLabSession.captureProof` | none | surface must expose `captureProof` |
| `dais.set_embodiment` | dais | yes | `selectEmbodiment` / adapter `setEmbodiment` | `{ id ∈ RAIL_EMBODIMENTS }` (`presence`, `singularity`, `comet`, `dormant-orbit`, `wispwalker`, `halo`, `lantern`, `low-orbit`) | `performance.preview_plan` requires `wispwalker` after this |
| `dais.set_expression` | dais | yes | `selectExpression` | `{ fixtureId: nonEmpty }` | — |
| `dais.set_eight_state` | dais | yes | living `goEightState` / `setMicrostate` via existing living surface only | `{ id ∈ EIGHT_HOLD_STATE_IDS }` | living runtime present |
| `dais.set_expression_gain` | dais | yes | `setExpressionGain` | `{ gain: 0.5..1.5 }` | — |
| `dais.commit_design` | dais | yes | `commitDesignParam` | `{ domain, paramId, value }` **only** ids in `RAIL_DESIGN_PARAMS ∪ LIVE_SCULPT_PARAMS` with those min/max | not raw `setLiveFormCoeff` |
| `dais.transport` | dais | yes | adapter `play` / `pause` / `interrupt` / `setPlayhead` / `stepFrame` | `{ op: play\|pause\|interrupt\|home\|end\|step, dir?: 1\|-1 }` | — |
| `dais.ab_pin` | dais | yes | `pinAbBaseline` | none | — |
| `dais.ab_compare` | dais | no | `compareAbBaseline` | none | baseline must exist or receipt `PRECONDITION_FAILED` |
| `physics.set_params` | physics | yes | `applyWorldPhysicsParams` | `{ gravityScale 0.25..2, restitution 0..0.9, launchPower 0.25..2, intensity 0..1 }` | reduced-motion → `REDUCED_MOTION_COLLAPSE` |
| `physics.launch_bounce` | physics | yes | `launchWorldBounceFromRail` | none (controller default cfg) | conflicts with `performance.preview_plan` until `physics.disarm` |
| `physics.launch_comet` | physics | yes | `launchWorldCometFromRail` | none | same conflict |
| `physics.disarm` | physics | yes | `disarmWorldBodyFromRail` | none | — |
| `craft.set_params` | craft | yes | `applyCraftRailParams` | `{ exaggeration 0.5..2, tempo 0.75..1.25, shotBias?: authored\|medium\|wide }` | — |
| `craft.run_pack` | craft | yes | `runDaisCraftPack` | `{ packId ∈ CRAFT_PACK_IDS }` (`s2-bounce`, `s2-bounce/blocking`, `s4-comet`, `s4-comet/blocking`) | conflicts with `performance.preview_plan` |
| `craft.stop_pack` | craft | yes | `stopDaisCraftPack` | none | — |
| `performance.preview_plan` | performance | yes | `ReferenceTrainingSession.preview` → `startReferencePerformance` | none (uses compiled plan) | `reference.status === compiled`; embodiment `wispwalker`; no owner-review lease; no bounce/comet; no running pack; not reduced-motion |
| `performance.interrupt` | performance | yes | `interruptReferencePerformance` | none | active plan required, else start-or-`PRECONDITION_FAILED` |
| `performance.stop` | performance | yes | `stopReferencePerformance` / `stopPreview` | none | — |
| `reference.link_video` | reference | yes | `ReferenceTrainingSession.linkVideo` | `{ url }` — `VideoSourceResolver` still rejects private / credential / `file:` / link-local | loopback source API available |
| `reference.analyze` | reference | yes | `analyze(userIntent)` | `{ intent? }` defaulting to the pilot goal | source ready; pose backend available |
| `reference.cancel` | reference | yes | `cancel` | none | — |
| `session.stop` | session | yes | abort controller + `performance.stop` + optional disarm | `{ disarm?: boolean }` | ends loop with `CANCELLED` |
| `session.rollback` | session | yes | restore last `rollbackToken` snapshot (lab state + stop performance + cancel in-flight) | `{ token }` | token must match pinned pre-pilot snapshot |
| `session.complete` | session | no | stop the loop | `{ message }` | `actions` must be empty or this last |
| `session.needs_user` | session | no | stop the loop | `{ message }` | same |

**Tuning parameter ids already fenced** (`TUNING_PARAMETER_SPECS` in `tuningRegistry.ts`):

`verticalDepthGain` 0.8–1.1×, `craftExaggeration` 0.5–2×, `gaitBobGain` 0–1.5×, `contactSquashGain` 0–1.5×, `supportExchangeGain` 0–1.5×, `footworkPrimitiveGain` 0–1.5×, `footRootGain` 0.5–2.5×, `walkAmp` 0–2×, `walkAccent` 0–1×, `stepDepth` 0–10 u, `walkPeriod` 0.5–3 s, `footworkTempo` 0.75–1.25×, `actingGain` 0.5–1.5×, `viscoTau` 0.02–1 s.

**Design / sculpt ids already fenced** (`RAIL_DESIGN_PARAMS` + `LIVE_SCULPT_PARAMS` in `DaisControlRail.tsx` / `daisFirstControls.ts`):

`relief_amplitude`, `eye_openness`, `energy_level`, `yaw` (0–45°), `asym`, `body_lean`, `posture_x`, `posture_y`, `wide`, `form_crown_amp`, `form_chin_amp`, `form_lobe_amp`, `form_cleft_depth`, `form_foot_amp`, `form_arm_amp`, `walk_amp`, `walk_period`, `walk_accent`, `step_depth`, `walk_enable`, `visco_tau`.

**Explicitly absent from the catalog (tests must reject as `UNSUPPORTED_ACTION`):**

`eval`, `Function`, shell, filesystem, `applyExternalPose`, `setWorldPose`, `setLiveFormCoeff`, `setLocomotion`, `playAnimationPlan`, `beginOwnerReview`, `applyComposedExternalPose`, `window` / `document` writes, CSS / SVG path writes, MCP, Grimoire, `compileMotionIntent` as a Grok action.

`compileMotionIntent` / `tuning.apply_phrase` is **not** in the Grok catalog. Keep the phrase matcher as a **local fallback** if the pilot provider is absent, so the visible box never silently dies.

---

## D. Server / browser request-response loop

Host-owned loop. Grok stays tool-free and one model-turn per HTTP turn. That preserves the current spawn law (`buildGrokArgs`: `--tools "" --max-turns 1 --no-memory --no-plan --no-subagents --disable-web-search`).

```text
TuningLabPanel prompt  ("Tell Gasper what to do…")
        │
        v
StudioPilotSession.start(goal)
        │  pin rollback snapshot (lab state + embodiment + performance stopped)
        │  observation0 = projectObservation()
        v
POST /__gasper/studio-pilot/turn     { gasper.studio-pilot.turn-request.v1 }
        │  loopback + same-origin only
        │  (copy createTrainingSourceMiddleware sameOriginOrNonBrowser)
        │  GrokStudioPilotProvider.generateStructured(
        │      packet,
        │      schema = STUDIO_PILOT_OUTPUT_JSON_SCHEMA
        │  )
        v
parseStudioPilotActionBatch
        │  fail → PROVIDER_FAILED / MALFORMED_PLAN
        v
StudioPilotExecutor.execute(batch)   sequential; stop on first hard fail
        │  each action → public authority only
        │  emit gasper.studio-pilot.action-receipt.v1 + observation
        v
stop ∈ {complete, needs_user, blocked}
 or turn == maxTurns                 ITERATION_LIMIT
 or user Stop / abort                CANCELLED
        │ else turn++ and POST again with history + new observation
        v
UI: model, catalog, turn i/N, receipts, honest error, Rollback
```

**Vite:** add `gasperStudioPilot()` beside `gasperReferenceTrainingSource()` in `vite.config.ts`. Do **not** replace `/__gasper/training/semantic`. Two providers, two schemas.

**Process harness:** extract a tiny `spawnGrokStructured({ schema, system, user, signal })` from `GrokSemanticMotionProvider.createDefaultRunner` so video semantics and the pilot share one process harness. Both remain `--tools ""`. Do not give Grok filesystem or tools even though in-app authority is broad — authority lives in the browser executor.

**Observation projection:** never send `buildDaisInspectionReport` wholesale. Send `StudioPilotObservation` only.

**Partial failure:** execute prefix, mark remaining `PARTIAL_BATCH`, do not auto-rollback unless the action is in a declared transaction group (`tuning.set`* inside one batch is transactional like `applyIntent`; physics launches are not). Offer Rollback in UI.

**Cancellation:** `AbortController` on the session aborts in-flight POST and calls `reference.cancel()` + `performance.stop()`. Do not kill the 5179 server (S5 / N159).

**Reduced motion:** executor reads `livingStatus().reducedMotion`. Mutating performance / physics actions return `REDUCED_MOTION_COLLAPSE` and may still inspect. Matches N55.

**Video integration:** if the goal is “learn this clip”, a legal batch is `reference.link_video` → `inspect.wait` → `reference.analyze` → `performance.preview_plan`. Grok does not reimplement pose or compile. `ProviderSemanticMotionInterpreter` remains the meaning step inside `analyze`.

**MCP:** out of this slice. Existing Tuning Lab bridge stays as-is. A later Sol task may project the same `StudioPilotSession` the way `tuningLabHttpClient.ts` projects the lab.

---

## E. Bite-sized TDD file plan (disjoint Grok vs Sol)

Sol owns schema arbitration, UI, vite wiring, visual critique, and claims (`NORTHSTAR-SEMANTIC-PERFORMANCE.md` worker law). Grok owns executor, loop, registry, and provider-harness tests. No shared files in the same implementation turn.

### E1. Sol lane

| Task | Files (Sol only) | First failing proof |
|---|---|---|
| S1 contracts | Create `packages/shared/src/gasper-performance/studio-pilot/{types,schemas,index}.ts` + `schemas.test.ts`. Export from `packages/shared/src/gasper-performance/index.ts` without touching v1 hashes. | unknown fields throw; batch with `stop: "continue"` and empty `actions` throws; catalog hash stable; v1 `gasper-performance` suite still green |
| S2 HTTP | Create `packages/gasper-studio/src/studio-pilot/HttpStudioPilotApi.ts` + `packages/gasper-studio/src/studio-pilot/server/studioPilotMiddleware.ts` + `studioPilotMiddleware.test.ts` | loopback gate 403; invalid body 400; existing `/__gasper/training/semantic` still 200 |
| S3 vite | Modify **only** `vite.config.ts` to mount the new plugin (implementation turn; not this audit) | `/__gasper/studio-pilot/turn` and `/__gasper/training/semantic` both present |
| S4 UI | Modify `packages/gasper-studio/src/tuning/TuningLabPanel.tsx` (+ scoped CSS) + panel tests | model label, live capability count, turn `i/N`, action receipts, Stop, Rollback, provider-absent fallback to `applyIntent` |
| S5 app | Modify `packages/gasper-studio/src/GasperStudioApp.tsx` to construct `StudioPilotSession` with live ports. Do not change reference-training wiring. | `__GASPER_STUDIO_PILOT__` diagnostic only; `__GASPER_REFERENCE_TRAINING__` unchanged |
| S6 visual | 5179 screenshot + one chronological clip of prompt → inspect → embodiment/tune **or** video analyze → receipt | architect review; owner acceptance separate (S3 / N44) |

### E2. Grok lane

| Task | Files (Grok only) | First failing test |
|---|---|---|
| G1 registry | Create `packages/gasper-studio/src/studio-pilot/StudioPilotRegistry.ts` + `.test.ts` | unknown `action` → `UNSUPPORTED_ACTION`; catalog hash stable; forbidden method names (`applyExternalPose`, `setWorldPose`, `setLocomotion`, `eval`) absent from registry |
| G2 parse | Studio-local parse helpers that import Sol S1 schemas. Grok does **not** author the shared schema file. | malformed batch / extra keys / bad stop+actions pairing |
| G3 executor | Create `packages/gasper-studio/src/studio-pilot/StudioPilotExecutor.ts` + `.test.ts` | malformed input; bounds; unsupported; authority mock **actually invoked**; partial batch stops; cancel mid-batch; reduced-motion; bounce-then-preview `PRECONDITION_FAILED` |
| G4 session loop | Create `packages/gasper-studio/src/studio-pilot/StudioPilotSession.ts` + `.test.ts` | max turns; provider throw; abort; complete; needs_user; history bound; rollback restores lab mock |
| G5 provider | Create `packages/gasper-studio/src/studio-pilot/server/GrokStudioPilotProvider.ts` + `.test.ts` | args still `--tools "" --max-turns 1 --model grok-4.6`; rejects prose / unknown fields / nonzero exit / timeout / oversized; schema name must be action-batch, **not** `gasper.semantic-motion-proposal.v1` |

Executor tests inject a `StudioPilotPorts` fake. Assert `ports.tuning.set` / `ports.dais.selectEmbodiment` / `ports.reference.analyze` **were called**, and `ports.dais.applyExternalPose` **does not exist on the port type**.

### E3. Required test matrix (both lanes)

| Failure class | Owner | Assertion |
|---|---|---|
| Malformed plan | G3 / G5 | extra keys, missing `schema`, `stop: "continue"` + empty actions, >8 actions |
| Unsupported action | G1 / G3 | `"applyExternalPose"`, `"setWorldPose"`, `"shell"`, unknown string |
| Bad bounds | G3 | `tuning.set` `gaitBobGain: 9`, `inspect.wait` `ms: 0`, `physics.set_params` `restitution: 2` |
| Partial failure | G3 | second of three actions throws; first receipt `ok`; rest `PARTIAL_BATCH`; no later authority calls |
| Cancellation | G4 | abort during wait/provider; `CANCELLED`; preview stopped |
| Iteration limit | G4 | `maxTurns` exhausted → `ITERATION_LIMIT`; no extra POST |
| Provider failure | G5 / G4 | nonzero exit, invalid JSON, missing `structuredOutput`, timeout, oversized stdout |
| Actual authority calls | G3 | mock `TuningLabSession.set` / `selectEmbodiment` / `linkVideo` invoked with exact args |

### E4. Order and freeze

S1 freeze → G1 / G3 / G4 / G5 in parallel with S2 → S3 / S4 / S5 after G3 ports exist → S6 last.

**Do not touch in this slice:**

- `GasperRigController` internals
- `WorldPhysicsDriver`
- `PerformancePrimitiveDriver`
- `SemanticMotionInterpreter` / `SemanticMotionCompiler`
- `packages/desktop/src/gasper/pilot/*`
- Grimoire
- the live 5179 process
- MediaPipe / pose worker (N159 lane stays independent)

Maximum concurrent coding workers: two. No overlapping files.

---

## F. Overclaims and unsafe elements to avoid

1. **Do not call this “GasperPilot.”** `GasperPilotHost` already means GSAP / eight-state handoff. Name the new surface `StudioPilot` / `gasper.studio-pilot.*`.
2. **Do not enable Grok tools.** Broad in-app authority is the **catalog**, not `--tools`. Tools would become shell / filesystem / DOM.
3. **Do not put `GasperRigController` on the port.** Wrap enumerated methods. The class is a god-object (`applyExternalPose`, `setWorldPose`, `setLiveFormCoeff` sit next to legal methods).
4. **Do not let Grok emit `PhysicsIntentPlan` or world `(x,z)`.** Travel goals stay in the video compiler / `PerformancePrimitiveDriver`. The pilot may start a compiled plan, not invent one.
5. **Do not delete `compileMotionIntent` in the same slice** without keeping it as offline fallback. Provider-absent must still do something honest.
6. **Do not send raw pose tracks or video bytes to Grok in this MVP.** `reference.analyze` already has the semantic provider. Pilot observations stay compact.
7. **Do not claim “full control of Gasper.”** Legitimate in-app control = rail + lab + training + physics **performances**. Not contour points, not the organism clock, not topology, not owner acceptance.
8. **Do not self-issue visual acceptance** (S3, N44, N153–N158). Receipts are machine-proven / live-observed only.
9. **Do not restart 5179, commit, push, install, or touch credentials.** N159 already authorized MediaPipe + one prior restart; this slice needs neither.
10. **Do not merge the two prompts into one text box that secretly forks.** One visible prompt drives `StudioPilotSession`; the reference textarea stays the video-preservation note passed into `reference.analyze`.
11. **Do not treat green executor tests as “Grok can operate Studio.”** That claim needs a live provider receipt + authority-call test + chronological clip (S6).
12. **Do not write rollback as `location.reload` or lab `reset` only.** Reset is a legal action; rollback is restore-to-pre-pilot snapshot.
13. **Do not invert the Tuning Lab MCP bridge and call it the pilot.** MCP→browser poll is the wrong direction and the wrong client.
14. **Do not file locomotion as `wander` / `life`.** Those organs already exist. A Grok “walk over there” must become a compiled performance plan or a refused `needs_user`, not `setLocomotion("wander", …)`.
15. **Do not edit NORTHSTAR / this audit’s neighboring plans as a side effect of implementation.** Append N160–N163 only on an explicit write-allowed turn.

---

## Handoff summary

The visible “Tell Gasper what to do…” box (`TuningLabPanel` → `compileMotionIntent`) is still a phrase matcher. Grok is only a one-shot `gasper.semantic-motion-proposal.v1` proposer behind `/__gasper/training/semantic`. Video-to-behavior (`ReferenceTrainingSession` → `compileSemanticMotionScore` → `retargetMotionScore` → `startReferencePerformance`) is intact and must remain a callee.

**Smallest production-grade change:** keep the existing video transaction and Grok spawn harness; add one host-owned turn loop whose only model output is `gasper.studio-pilot.action-batch.v1`, executed by a port-limited browser executor, surfaced on the existing Tuning Lab prompt.

**First implement turn (after approval):** Sol S1 schemas **or** Grok G3 executor against a frozen catalog. Not UI. Not vite. Not controller edits.

**Extracted owner intentions (not written to NORTHSTAR this audit; append on next write-allowed turn):**

- **N160 · Visible prompt is a Studio pilot, not a phrase matcher.** “Tell Gasper what to do…” must compile to a Grok 4.6 inspect→act→observe loop with typed capability discovery and versioned action batches.
- **N161 · Authority stays in existing public surfaces.** Browser executes only enumerated actions through Tuning Lab, reference training, DAIS / controller, and physics / performance APIs. No eval, shell, filesystem, DOM transform, or renderer bypass.
- **N162 · Physics and owner eyes stay separate.** Compiler, topology, bounds, and reduced-motion remain authoritative. Owner visual acceptance is never self-issued.
- **N163 · Video-to-behavior remains a callee.** The N153–N159 lane stays intact; the pilot may invoke it, not replace it.

**Who acts next:** Sol (schema freeze) or the implementation dispatcher. This worker is done and waiting.
