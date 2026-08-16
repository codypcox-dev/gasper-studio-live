# Gasper Video-to-Behavior Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use triforce-worker-orchestration (recommended) or triforce-plan-execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete, reviewable path from a linked or local human-motion reference to a measured Motion Score, a form-valid Wispwalker retarget plan, and a physics-authoritative Gasper preview that can be saved as training data.

**Architecture:** Extend the existing `gasper-performance` grammar with versioned reference-observation, motion-score, form-capability, and physics-intent contracts. Video analysis runs off the Studio UI thread and emits evidence with confidence; the deterministic retargeter maps that evidence to Wispwalker action primitives and submits goals to the existing physics authority rather than applying source coordinates. The 5179 Studio owns the live session, while MCP is a projection of the same session.

**Tech Stack:** TypeScript 5.8, React 19, Vite 7, Vitest, Zod 3, existing Studio bridge/MCP, browser Web Worker, MediaPipe Tasks Vision Pose Landmarker behind a replaceable backend, ffprobe/ffmpeg for media truth, existing Gasper organism clock and `WorldPhysicsDriver`.

## Global Constraints

- Preserve the clean N152 baseline and safety ref `capstone/pre-main-reconcile-2026-08-10`.
- Do not modify Grimoire or install global tools.
- Do not restart or repurpose the live `5179` server during an owner review.
- `WorldPhysicsDriver` remains the sole free-motion writer; video, LLM, UI,
  timeline, and MCP layers only propose typed goals.
- The organism clock remains the sole playback time authority.
- Source landmarks, root coordinates, and model output may not write SVG/DOM
  transforms, contour points, or world position directly.
- No LLM/VLM call occurs in the frame loop.
- Wispwalker is the only walking form; footless forms do not inherit human foot
  contacts.
- All new variables have unit, safe range, authority, provenance, and validation.
- Monocular video may not claim measured absolute mass, force, friction, floor
  scale, or camera calibration.
- Unknown/low-confidence data fails visibly or requests calibration; it never
  falls back to a plausible-looking preset.
- Raw media and derived session data live under `.gasper/training/` and remain
  uncommitted by default. Curated owner-accepted behavior artifacts receive a
  separate explicit promotion step.
- Existing v1 performance contracts remain readable. New contracts are additive
  and versioned; do not silently change v1 hashes.
- Add `@mediapipe/tasks-vision` at the registry-verified stable version `1.0.1`
  and include the resulting `package-lock.json` only in the feature checkpoint.
- Repository law still requires explicit owner authorization before a commit.
  Each task prepares a reviewable checkpoint but does not commit automatically.
- TDD: every task starts with a focused failing test and ends with focused tests,
  typecheck, and `git diff --check`.
- UI completion requires a fresh screenshot plus chronological motion video.

---

## File structure

### Shared contracts and compiler

- Create `packages/shared/src/gasper-performance/reference/types.ts` — source,
  observation, score, capability, retarget, and training artifact types.
- Create `packages/shared/src/gasper-performance/reference/schemas.ts` — closed
  Zod schemas and deterministic canonical hashes.
- Create `packages/shared/src/gasper-performance/reference/mechanics.ts` — pure
  timestamp-aware feature extraction from normalized tracks.
- Create `packages/shared/src/gasper-performance/reference/segment.ts` — pure
  beat segmentation and recognition-critical feature derivation.
- Create `packages/shared/src/gasper-performance/reference/retarget.ts` — pure
  score-to-capability retarget compiler.
- Create `packages/shared/src/gasper-performance/reference/index.ts` — public
  exports.
- Modify `packages/shared/src/gasper-performance/index.ts` — export the additive
  reference/performance surface without mutating v1 artifacts.

### Physics and Wispwalker realization

- Create `packages/desktop/src/gasper/performance/FormCapabilityProfile.ts` —
  runtime form capability registry.
- Create `packages/desktop/src/gasper/performance/WispwalkerCapabilityProfile.ts`
  — pinned Wispwalker supports, controls, physical envelope, and primitive map.
- Create `packages/desktop/src/gasper/performance/PerformancePrimitiveDriver.ts`
  — organism-clock executor that translates validated primitive goals into
  existing physics/controller calls.
- Modify `packages/desktop/src/gasper/GasperRigController.ts` — expose the
  narrow validated performance-plan start/interrupt/inspect facade.

### Video analysis and storage

- Create `packages/gasper-studio/src/training/server/VideoSourceResolver.ts` —
  Node-only safe local/direct/provider source resolution contract.
- Create `packages/gasper-studio/src/training/pose/PoseBackend.ts` — backend
  interface and normalized track types.
- Create `packages/gasper-studio/src/training/pose/MediaPipePoseBackend.ts` —
  MediaPipe adapter only; no semantic logic.
- Create `packages/gasper-studio/src/training/pose/pose.worker.ts` — off-main-
  thread frame inference with progress/cancel.
- Create `packages/gasper-studio/src/training/server/TrainingSessionStore.ts` —
  Node-only atomic session artifact persistence through the 5179 middleware.
- Create `packages/gasper-studio/src/training/SemanticMotionInterpreter.ts` —
  provider-neutral structured semantic proposal/validation seam.
- Create `packages/gasper-studio/src/training/TrainingLabSession.ts` — owns the
  source→observation→score→retarget→preview transaction.

### Studio and protocol

- Create `packages/studio-protocol/src/trainingLabBridge.ts` — typed bridge
  request/response union.
- Create `packages/gasper-studio/src/training/TrainingLabPanel.tsx` — source,
  overlays, interpretation, capability mapping, preview, A/B, and promotion UI.
- Create `packages/gasper-studio/src/training/trainingLab.css` — scoped visual
  layout.
- Modify `packages/gasper-studio/src/GasperStudioApp.tsx` — mount the new lab
  without replacing existing stage/timeline tools.
- Modify `packages/gasper-studio/vite.config.ts` or the active root Vite config
  — add contained media/session endpoints and no other server authority.
- Create `packages/gasper-mcp/src/trainingLabHttpClient.ts` — MCP projection of
  the browser-owned training session.
- Modify `packages/gasper-mcp/src/index.ts` — add bounded training operations.

### Fixtures and proofs

- Create `tests/fixtures/video-training/manifest.json` — checked-in metadata and
  expected annotations for tiny licensed/synthetic fixtures.
- Store tiny fixture media under `tests/fixtures/video-training/media/` only if
  license and repository size gates pass; otherwise generate deterministic
  synthetic tracks in tests and keep media under `.gasper/training/fixtures/`.
- Create `scripts/gasper-video-training-proof.ts` — emits deterministic schema,
  feature, retarget, physics-authority, and product receipts.

---

### Task 1: Freeze the additive reference-performance contracts

**Files:**
- Create: `packages/shared/src/gasper-performance/reference/types.ts`
- Create: `packages/shared/src/gasper-performance/reference/schemas.ts`
- Create: `packages/shared/src/gasper-performance/reference/index.ts`
- Modify: `packages/shared/src/gasper-performance/index.ts`
- Test: `packages/shared/src/gasper-performance/reference/schemas.test.ts`

**Interfaces:**
- Consumes: existing stable hashing helpers from
  `packages/shared/src/gasper-performance/index.ts`.
- Produces: `VideoSourceReceipt`, `PoseObservationTrack`, `MotionScore`,
  `FormCapabilityProfile`, `PhysicsIntentPlan`, and
  `ReferenceBehaviorArtifact` plus parse/hash helpers.

- [ ] **Step 1: Write failing schema and determinism tests.**

```ts
import { describe, expect, it } from "vitest";
import {
  hashMotionScore,
  parseMotionScore,
  type MotionScore,
} from "./index";

describe("motion score contract", () => {
  it("hashes identical mechanics identically and rejects unknown fields", () => {
    const score: MotionScore = {
      schema: "gasper.motion-score.v1",
      id: "score-step-exchange",
      sourceObservationHash: `sha256:${"a".repeat(64)}`,
      durationMs: 1000,
      beats: [{
        id: "beat-1",
        t0Ms: 0,
        t1Ms: 1000,
        primitive: "support_exchange",
        purpose: "cross support while preserving lateral rhythm",
        contact: { requiredSupports: ["source_left", "source_right"], order: ["source_left", "source_right"] },
        motionQuality: { weight: 0.6, flow: 0.7, energy: 0.5, directness: 0.8 },
        recognitionCritical: ["left-to-right support order"],
        confidence: 0.91,
        evidence: [{ kind: "derived", ref: "contact-track:12-29" }],
      }],
      provenance: { compiler: "fixture", compilerVersion: "1", sourceRefs: [] },
    };
    expect(hashMotionScore(score)).toBe(hashMotionScore(structuredClone(score)));
    expect(() => parseMotionScore({ ...score, surprise: true })).toThrow(/unknown/i);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the reference
  contract does not exist.**

Run: `npx vitest run packages/shared/src/gasper-performance/reference/schemas.test.ts`

Expected: FAIL on unresolved `./index` exports.

- [ ] **Step 3: Implement the closed types and schemas.**

```ts
export type EvidenceClass = "measured" | "derived" | "inferred" | "calibrated" | "simulated";
export type MotionPrimitiveId =
  | "plant" | "release" | "slide" | "pivot" | "support_exchange"
  | "travel" | "hold" | "compress" | "launch" | "float"
  | "recoil" | "follow_through" | "settle" | "orient";

export type MotionScore = Readonly<{
  schema: "gasper.motion-score.v1";
  id: string;
  sourceObservationHash: string;
  durationMs: number;
  beats: readonly MotionScoreBeat[];
  provenance: Readonly<{ compiler: string; compilerVersion: string; sourceRefs: readonly string[] }>;
}>;
```

Use `.strict()` Zod objects, finite-number checks, monotonic beat-time checks,
confidence `[0,1]`, SHA-256 patterns, and canonical six-decimal hashing. Keep
raw landmarks outside `MotionScore`; it references their artifact hash.

- [ ] **Step 4: Run the focused schema tests.**

Run: `npx vitest run packages/shared/src/gasper-performance/reference/schemas.test.ts`

Expected: PASS.

- [ ] **Step 5: Run v1 performance-contract regression tests.**

Run: `npx vitest run packages/shared/src/gasper-performance`

Expected: existing v1 hashes and tests remain green.

---

### Task 2: Define Wispwalker's capability and physical envelope

**Files:**
- Create: `packages/desktop/src/gasper/performance/FormCapabilityProfile.ts`
- Create: `packages/desktop/src/gasper/performance/WispwalkerCapabilityProfile.ts`
- Test: `packages/desktop/src/gasper/performance/WispwalkerCapabilityProfile.test.ts`

**Interfaces:**
- Consumes: current embodiment profile, world constants, gait/contact laws,
  topology lock, and N152 tuning bounds.
- Produces: `getFormCapabilityProfile("wispwalker")` and
  `validatePrimitiveAgainstForm(primitive, profile)`.

- [ ] **Step 1: Write the failing capability tests.**

```ts
it("declares exactly two structural supports and refuses humanoid-only actions", () => {
  const profile = getFormCapabilityProfile("wispwalker");
  expect(profile.supports.map((s) => s.id)).toEqual(["root_left", "root_right"]);
  expect(profile.locomotion).toContain("grounded");
  expect(validatePrimitiveAgainstForm({ id: "support_exchange", supportCount: 2 }, profile).ok).toBe(true);
  expect(validatePrimitiveAgainstForm({ id: "knee_kick", supportCount: 1 }, profile)).toMatchObject({
    ok: false,
    code: "UNSUPPORTED_ANATOMY",
  });
});
```

- [ ] **Step 2: Run the test and verify the profile is missing.**

Run: `npx vitest run packages/desktop/src/gasper/performance/WispwalkerCapabilityProfile.test.ts`

Expected: FAIL on unresolved profile module.

- [ ] **Step 3: Implement the generic profile and derive Wispwalker values from
  existing constants.**

```ts
export type PhysicalQuantity = Readonly<{
  value: number;
  unit: string;
  safeMin: number;
  safeMax: number;
  authority: "environment" | "form" | "performance";
  provenance: readonly string[];
}>;

export type FormCapabilityProfile = Readonly<{
  schema: "gasper.form-capability.v1";
  formId: string;
  version: string;
  locomotion: readonly ("grounded" | "slide" | "hop" | "float" | "flight")[];
  supports: readonly SupportCapability[];
  controls: readonly SemanticControlCapability[];
  physics: Readonly<Record<string, PhysicalQuantity>>;
  primitives: readonly MotionPrimitiveId[];
  forbiddenAnatomy: readonly string[];
}>;
```

Do not invent missing constants. Represent unresolved mass/inertia calibration
as explicit `status: "requires_calibration"` fields and block primitives that
need them. Cite the source file for every adopted quantity.

- [ ] **Step 4: Run capability tests and focused physics tests.**

Run: `npx vitest run packages/desktop/src/gasper/performance packages/desktop/src/gasper/physics`

Expected: PASS; two supports only; no new motion writer.

---

### Task 3: Implement safe video-source receipts and media truth

**Files:**
- Create: `packages/gasper-studio/src/training/server/VideoSourceResolver.ts`
- Create: `packages/studio-protocol/src/trainingLabBridge.ts`
- Modify: active Vite config for contained training endpoints
- Test: `packages/gasper-studio/src/training/server/VideoSourceResolver.test.ts`

**Interfaces:**
- Consumes: a local path selected by the desktop host or an HTTP(S) URL.
- Produces: a local contained media artifact plus `VideoSourceReceipt`.

- [ ] **Step 1: Write failing URL-policy and byte-identity tests.**

```ts
it.each([
  "file:///C:/Windows/win.ini",
  "http://127.0.0.1/secret",
  "http://169.254.169.254/latest/meta-data",
  "ftp://example.com/a.mp4",
  "https://user:pass@example.com/a.mp4",
])("rejects unsafe source %s", async (url) => {
  await expect(resolveVideoSource({ kind: "url", url })).rejects.toThrow();
});

it("gives identical content hashes to identical local and linked bytes", async () => {
  const local = await resolveFixtureAsLocal();
  const linked = await resolveFixtureOverHttp();
  expect(local.contentHash).toBe(linked.contentHash);
  expect(local.media.durationMs).toBe(linked.media.durationMs);
});
```

- [ ] **Step 2: Run the tests and verify the resolver is missing.**

Run: `npx vitest run packages/gasper-studio/src/training/server/VideoSourceResolver.test.ts`

- [ ] **Step 3: Implement source-policy validation before network access.**

```ts
export type VideoSourceResolver = Readonly<{
  id: string;
  canResolve(input: VideoSourceInput): boolean;
  resolve(input: VideoSourceInput, signal: AbortSignal): Promise<VideoSourceReceipt>;
}>;
```

Use array-argument child processes for `ffprobe`; never construct a shell
command from URL text. Enforce contained output, redirect revalidation,
download byte budget, duration budget, timeout, and cancellation. Page links
return `PROVIDER_REQUIRED` until an explicit provider is registered; they do
not masquerade as direct media.

- [ ] **Step 4: Run source resolver and protocol tests.**

Run: `npx vitest run packages/gasper-studio/src/training packages/studio-protocol`

Expected: PASS, with zero network access in unit tests.

---

### Task 4: Add off-main-thread pose observation

**Files:**
- Create: `packages/gasper-studio/src/training/pose/PoseBackend.ts`
- Create: `packages/gasper-studio/src/training/pose/MediaPipePoseBackend.ts`
- Create: `packages/gasper-studio/src/training/pose/pose.worker.ts`
- Test: `packages/gasper-studio/src/training/pose/PoseBackend.test.ts`

**Interfaces:**
- Consumes: timestamped decoded frames plus source/crop/subject settings.
- Produces: immutable raw `PoseObservationTrack` and model receipt.

- [ ] **Step 1: Write failing timestamp, confidence, and cancellation tests.**

```ts
it("preserves source timestamps and never invents a missing landmark", async () => {
  const result = await analyzeWithFakeBackend([
    frame(0, visiblePose()),
    frame(16.667, null),
    frame(33.333, visiblePose()),
  ]);
  expect(result.samples.map((s) => s.tMs)).toEqual([0, 16.667, 33.333]);
  expect(result.samples[1].poses).toEqual([]);
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "POSE_MISSING" }));
});
```

- [ ] **Step 2: Run tests and verify the backend is missing.**

Run: `npx vitest run packages/gasper-studio/src/training/pose/PoseBackend.test.ts`

- [ ] **Step 3: Implement the backend contract and fake backend first.**

```ts
export interface PoseBackend {
  readonly id: string;
  readonly version: string;
  initialize(signal: AbortSignal): Promise<void>;
  observe(frame: VideoFrameLike, tMs: number): Promise<readonly ObservedPose[]>;
  close(): Promise<void>;
}
```

- [ ] **Step 4: Add MediaPipe in VIDEO mode behind the interface.**

Install the pinned package only when this task begins:

Run: `npm install --save-exact @mediapipe/tasks-vision@1.0.1`

Run all `detectForVideo` calls in `pose.worker.ts`; post only structured-clone
data to React. Preserve normalized and world landmark outputs, visibility, and
model metadata. The main thread owns progress rendering and cancellation only.

- [ ] **Step 5: Prove UI-thread isolation.**

Add a test that the production analyzer constructs a `Worker` and that no
MediaPipe import enters `TrainingLabPanel.tsx` or the main Studio bundle path.

Run: `npx vitest run packages/gasper-studio/src/training/pose`

Expected: PASS.

---

### Task 5: Derive mechanics without erasing uncertainty

**Files:**
- Create: `packages/shared/src/gasper-performance/reference/mechanics.ts`
- Create: `packages/shared/src/gasper-performance/reference/segment.ts`
- Test: `packages/shared/src/gasper-performance/reference/mechanics.test.ts`

**Interfaces:**
- Consumes: raw pose observations, optional floor/scale calibration, and source
  timestamps.
- Produces: cleaned track, mechanics tracks, diagnostics, and draft
  `MotionScore` evidence.

- [ ] **Step 1: Write analytic fixture tests.**

```ts
it("derives alternating support from low foot speed near the calibrated floor", () => {
  const track = syntheticAlternatingStepTrack({ fps: 60, cycles: 2 });
  const mechanics = deriveMotionMechanics(track, calibratedFloor());
  expect(mechanics.supportEvents.map((e) => e.support)).toEqual([
    "source_left", "source_right", "source_left", "source_right",
  ]);
  expect(mechanics.diagnostics).not.toContainEqual(expect.objectContaining({ severity: "error" }));
});

it("labels absolute force unavailable without physical calibration", () => {
  const mechanics = deriveMotionMechanics(syntheticAlternatingStepTrack({ fps: 30, cycles: 1 }), null);
  expect(mechanics.unavailable).toContain("absolute_force");
  expect(mechanics.unavailable).toContain("surface_friction");
});
```

- [ ] **Step 2: Run and observe the missing extractor failure.**

Run: `npx vitest run packages/shared/src/gasper-performance/reference/mechanics.test.ts`

- [ ] **Step 3: Implement timestamp-aware normalized features.**

Keep raw and cleaned tracks separate. Derive velocities/accelerations from
actual timestamp deltas. Build contact likelihood from foot height, speed,
visibility, and calibrated floor evidence. Emit confidence components instead
of a single unexplained score. Do not add anthropometric constants until a
CanonOps memo and golden-fixture gate pins their source.

- [ ] **Step 4: Implement deterministic beat segmentation.**

Segment first on contact changes, velocity extrema, holds, facing reversals,
and pose-extreme change points. A semantic model may label or merge segments,
but it may not remove measured events without a visible conflict record.

- [ ] **Step 5: Run mechanic, determinism, and resampling tests.**

Run: `npx vitest run packages/shared/src/gasper-performance/reference`

Expected: the same motion sampled at 30/60fps yields equivalent event ordering
within declared timestamp tolerance; hashes remain stable for identical inputs.

---

### Task 6: Add the structured semantic-video interpreter

**Files:**
- Create: `packages/gasper-studio/src/training/SemanticMotionInterpreter.ts`
- Create: `packages/gasper-studio/src/training/semanticPrompt.ts`
- Test: `packages/gasper-studio/src/training/SemanticMotionInterpreter.test.ts`

**Interfaces:**
- Consumes: mechanics summary, sampled evidence frames/contact sheet, user
  prompt, and closed Motion Score schema.
- Produces: `SemanticMotionProposal` only; never a runtime plan.

- [ ] **Step 1: Write fail-closed proposal tests.**

```ts
it("rejects prose, unknown primitives, and uncited mechanics", async () => {
  await expect(validateSemanticProposal("looks cool")).rejects.toThrow();
  await expect(validateSemanticProposal(proposal({ primitive: "magic_dance" }))).rejects.toThrow(/primitive/);
  await expect(validateSemanticProposal(proposal({ evidence: [] }))).rejects.toThrow(/evidence/);
});
```

- [ ] **Step 2: Run the failing test.**

Run: `npx vitest run packages/gasper-studio/src/training/SemanticMotionInterpreter.test.ts`

- [ ] **Step 3: Implement the provider-neutral seam and exact prompt packet.**

```ts
export interface SemanticMotionInterpreter {
  interpret(input: Readonly<{
    userIntent: string;
    mechanics: MotionMechanicsSummary;
    evidenceFrames: readonly EvidenceFrameRef[];
    allowedPrimitives: readonly MotionPrimitiveId[];
  }>, signal: AbortSignal): Promise<SemanticMotionProposal>;
}
```

The model prompt must require: plain-language interpretation, beat list,
recognition-critical mechanics, observed evidence refs, uncertainties,
unsupported assumptions, and closed JSON only. Named movements unknown to the
model require research/source refs or an `UNKNOWN_MOVEMENT` result.

- [ ] **Step 4: Add deterministic fake-provider tests and one opt-in live
  contract test.**

Live tests remain skipped without explicit provider credentials. Provider text
is never written into canonical training data until schema validation and user
acceptance.

---

### Task 7: Compile Motion Scores through form capabilities

**Files:**
- Create: `packages/shared/src/gasper-performance/reference/retarget.ts`
- Test: `packages/shared/src/gasper-performance/reference/retarget.test.ts`

**Interfaces:**
- Consumes: accepted `MotionScore`, `FormCapabilityProfile`, environment
  profile, and seed.
- Produces: deterministic `PhysicsIntentPlan` or a typed refusal.

- [ ] **Step 1: Write the failing exact/stylize/refuse matrix.**

```ts
it.each([
  ["support_exchange", "exact"],
  ["human_arm_swing", "stylized"],
  ["knee_kick", "refused"],
])("maps %s as %s for Wispwalker", (primitive, expected) => {
  expect(retargetBeat(beat(primitive), wispwalkerProfile()).disposition).toBe(expected);
});
```

- [ ] **Step 2: Run and observe the missing retargeter failure.**

Run: `npx vitest run packages/shared/src/gasper-performance/reference/retarget.test.ts`

- [ ] **Step 3: Implement retarget dispositions and physics goals.**

```ts
export type PhysicsIntentBeat = Readonly<{
  id: string;
  t0Ms: number;
  t1Ms: number;
  primitive: MotionPrimitiveId;
  supportGoals: readonly SupportGoal[];
  rootGoal: RootTrajectoryGoal;
  facingGoal: FacingGoal;
  expressiveGoals: readonly ExpressiveGoal[];
  constraints: readonly PhysicsConstraintRef[];
  sourceEvidence: readonly EvidenceRef[];
}>;

export function retargetMotionScore(
  score: MotionScore,
  form: FormCapabilityProfile,
  environment: EnvironmentPhysicsProfile,
  seed: number,
): RetargetResult;
```

Source root deltas become normalized trajectory goals. They are time/amplitude
warped within declared envelopes and always executed through physics. Form
constants remain unchanged by reference style. Unsupported mechanics report
the missing capability and suggested rig extension.

- [ ] **Step 4: Prove deterministic compile and no direct-transform fields.**

Run: `npx vitest run packages/shared/src/gasper-performance/reference`

Expected: dual compile hashes match; a structural scanner rejects `svgPath`,
`domTransform`, raw landmark arrays, or direct world-position setters in the
plan schema.

---

### Task 8: Execute primitives through existing physics authority

**Files:**
- Create: `packages/desktop/src/gasper/performance/PerformancePrimitiveDriver.ts`
- Modify: `packages/desktop/src/gasper/GasperRigController.ts`
- Test: `packages/desktop/src/gasper/performance/PerformancePrimitiveDriver.test.ts`

**Interfaces:**
- Consumes: validated `PhysicsIntentPlan`.
- Produces: start/interrupt/stop/inspect results and existing physics outputs.

- [ ] **Step 1: Write authority and interruption tests.**

```ts
it("submits goals to the physics driver and preserves velocity on retarget", () => {
  const host = createFakePhysicsHost();
  const driver = new PerformancePrimitiveDriver(host, fakeOrganismClock());
  driver.start(planA());
  host.tick(1 / 120);
  const before = host.bodyState();
  driver.interrupt(planB());
  expect(host.bodyState().velocity).toEqual(before.velocity);
  expect(host.directTransformWrites).toBe(0);
});
```

- [ ] **Step 2: Run and verify the executor is missing.**

Run: `npx vitest run packages/desktop/src/gasper/performance/PerformancePrimitiveDriver.test.ts`

- [ ] **Step 3: Implement a narrow host interface around existing authorities.**

Do not instantiate a second clock, RAF, body, or collision solver. Plant/release
events modify typed support goals; travel/facing goals route through existing
world intent; expressive goals remain bounded post-kernel projections. Stop
and interruption release cleanly to current-state authority.

- [ ] **Step 4: Run performance driver and physics regression suites.**

Run: `npx vitest run packages/desktop/src/gasper/performance packages/desktop/src/gasper/physics`

Expected: sole-writer checks, reduced-motion collapse, rest stability,
interruption continuity, and N152 gait tests pass.

---

### Task 9: Persist auditable training sessions

**Files:**
- Create: `packages/gasper-studio/src/training/server/TrainingSessionStore.ts`
- Create: `packages/gasper-studio/src/training/TrainingLabSession.ts`
- Test: `packages/gasper-studio/src/training/server/TrainingSessionStore.test.ts`

**Interfaces:**
- Consumes: artifacts from every pipeline stage.
- Produces: atomic `.gasper/training/sessions/<id>/` state and promotion receipt.

- [ ] **Step 1: Write transaction and promotion tests.**

```ts
it("rolls back a failed stage and promotes owner-accepted artifacts only", async () => {
  const store = createMemoryTrainingStore();
  await store.writeStage("s1", "source", sourceReceipt());
  await expect(store.writeStage("s1", "score", invalidScore())).rejects.toThrow();
  expect(store.read("s1").stages).toEqual(["source"]);
  await expect(store.promote("s1", "machine_valid")).rejects.toThrow(/owner_accepted/);
});
```

- [ ] **Step 2: Run and observe the missing store failure.**

Run: `npx vitest run packages/gasper-studio/src/training/server/TrainingSessionStore.test.ts`

- [ ] **Step 3: Implement atomic stage writes and content-addressed artifacts.**

Use temporary sibling file + rename for every JSON artifact. Store manifest
hashes and schema versions. `experiment`, `machine_valid`,
`architect_reviewed`, `owner_accepted`, and `rejected` are append-only state
events. Promotion to canonical content requires a separate explicit operation.

- [ ] **Step 4: Run store and corruption-recovery tests.**

Run: `npx vitest run packages/gasper-studio/src/training`

Expected: torn/corrupt records fail closed; source bytes remain outside Git.

---

### Task 10: Build the Training Lab cockpit

**Files:**
- Create: `packages/gasper-studio/src/training/TrainingLabPanel.tsx`
- Create: `packages/gasper-studio/src/training/trainingLab.css`
- Modify: `packages/gasper-studio/src/GasperStudioApp.tsx`
- Test: `packages/gasper-studio/src/training/TrainingLabPanel.test.tsx`

**Interfaces:**
- Consumes: `TrainingLabSession` snapshots/actions.
- Produces: one reviewable source→understanding→mapping→preview→promotion flow.

- [ ] **Step 1: Write state-machine UI tests.**

Test empty, resolving, calibrating, analyzing, interpreting, needs-review,
compiled, previewing, failed, and accepted states. Assert the UI always shows
source identity, confidence, unavailable quantities, form disposition, and
undo/cancel controls.

- [ ] **Step 2: Run and verify the panel is missing.**

Run: `npx vitest run packages/gasper-studio/src/training/TrainingLabPanel.test.tsx`

- [ ] **Step 3: Implement the cockpit without duplicating the Gasper stage.**

Use the existing Integrated Gasper Stage as the preview. Arrange source video
and overlays beside the live stage; place the editable Motion Score and form
mapping below; keep expert physics variables in a collapsible panel. Render
analysis progress from Worker messages without polling the render loop.

- [ ] **Step 4: Run interaction tests, typecheck, and build.**

Run: `npm run typecheck`

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Capture and inspect a fresh screenshot.**

Open the 5179 Training Lab, import a fixture, and capture the full cockpit. The
architect must inspect hierarchy, legibility, disabled/error states, overlay
alignment, and whether the source-to-Gasper mapping can be understood without
reading logs.

---

### Task 11: Expose the same session through MCP

**Files:**
- Create: `packages/gasper-mcp/src/trainingLabHttpClient.ts`
- Modify: `packages/gasper-mcp/src/index.ts`
- Test: `packages/gasper-mcp/src/trainingLabHttpClient.test.ts`

**Interfaces:**
- Consumes: typed 5179 training bridge.
- Produces: MCP tools `inspect_training_lab`, `import_reference_video`,
  `analyze_reference_motion`, `compile_reference_behavior`,
  `preview_reference_behavior`, `compare_reference_variants`,
  `capture_reference_proof`, and `promote_reference_behavior`.

- [ ] **Step 1: Write unavailable, timeout, schema, and same-session tests.**

MCP must fail with `TRAINING_LAB_UNAVAILABLE` when the browser-owned session is
absent. It may not instantiate a headless parallel session.

- [ ] **Step 2: Run and verify the client/tools are missing.**

Run: `npx vitest run packages/gasper-mcp/src/trainingLabHttpClient.test.ts`

- [ ] **Step 3: Implement bounded bridge operations.**

Every mutating operation returns the session revision, artifact hash, changed
stage, and rollback token. Promotion requires explicit `owner_accepted: true`
and refuses all other states.

- [ ] **Step 4: Run MCP, protocol, and Tuning Lab regression tests.**

Run: `npx vitest run packages/gasper-mcp packages/studio-protocol packages/gasper-studio/src/tuning`

Expected: existing Tuning Lab tools remain green.

---

### Task 12: Prove the complete vertical slice

**Files:**
- Create: `scripts/gasper-video-training-proof.ts`
- Create: `research/proofs/gasper-video-training-001/README.md`
- Generate: contained proof receipts/captures under
  `research/proofs/gasper-video-training-001/<run-id>/`

**Interfaces:**
- Consumes: one licensed/synthetic stepping clip and the complete product path.
- Produces: machine receipt, source overlay, Motion Score, retarget plan,
  chronological Gasper video, contact sheet, and architect verdict.

- [ ] **Step 1: Write the proof script's red gate.**

The proof must fail unless all of these exist and validate: source hash, media
metadata, monotonically timestamped raw track, confidence diagnostics,
mechanics events, Motion Score, capability disposition per beat, deterministic
plan hash, zero direct-transform writes, sole physics writer, reduced-motion
collapse, and rollback to baseline.

- [ ] **Step 2: Run the red proof before completing the product path.**

Run: `node --import tsx scripts/gasper-video-training-proof.ts --fixture synthetic-step-exchange`

Expected: FAIL with named missing stages.

- [ ] **Step 3: Complete the product path until the receipt passes.**

Do not weaken thresholds after observing candidate output. Any threshold change
requires a fixture rationale recorded before the next candidate run.

- [ ] **Step 4: Run full validation.**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `node bin/triforce.mjs doctor`

Run: `git diff --check`

Expected: all pass.

- [ ] **Step 5: Capture and review exact-rate behavior.**

Capture the reference overlay and Gasper result at source cadence plus the
canonical 120Hz Gasper proof cadence. Review every beat chronologically and
record recognition-critical mechanics, support/contact truth, mass transfer,
timing, follow-through, artifacts, and declared stylizations. Architect verdict
and owner verdict remain separate.

---

## Worker decomposition

### Read-only architecture crossfire

1. **Worker A — contracts and inference:** audit the proposed data/evidence
   model, existing `gasper-performance` v1, pose uncertainty, and deterministic
   hash boundary. No edits.
2. **Worker B — physics and Wispwalker rig:** map every Motion Score primitive
   to existing physics/support/contour authorities; enumerate missing real
   variables and forbidden second authorities. No edits.
3. **Worker C — Studio and media:** audit linked-source safety, Web Worker
   analysis, session persistence, MCP parity, latency, and review workflow. No
   edits.

Sol reconciles their contradictions before implementation.

### Implementation lanes

- Lane A owns Tasks 1, 5, 6, and 7 under
  `packages/shared/src/gasper-performance/reference/` plus semantic adapter
  tests.
- Lane B owns Tasks 2 and 8 under
  `packages/desktop/src/gasper/performance/` and the narrow controller facade.
- Lane C begins only after A/B interfaces freeze; it owns Tasks 3, 4, 9, 10,
  and 11 under Studio/protocol/MCP paths.
- Sol owns integration, Task 12, visual review, claims, Northstar updates, and
  all commits.

No two coding workers receive overlapping files. Maximum concurrent coding
workers: two.

## Self-review

- Spec coverage: source links/local files, measurement, uncertainty,
  semantics, form capabilities, physics variables, retargeting, execution,
  Studio, MCP, training promotion, proof, and visual acceptance each map to a
  task above.
- Completeness scan: every step names its inputs, outputs, proof, and failure
  behavior. Missing physical constants explicitly block and route to a CanonOps
  calibration memo.
- Type consistency: `MotionScore` feeds `retargetMotionScore`;
  `FormCapabilityProfile` gates it; the result is `PhysicsIntentPlan`;
  `PerformancePrimitiveDriver` is the only executor; `TrainingLabSession`
  persists hashes for each stage.

## Execution mode

Use bounded worker orchestration: one read-only architecture crossfire, Sol
reconciliation, then at most two disjoint implementation workers with one
correction round. Every worker report includes files, evidence, risks, and
unresolved physical quantities.
