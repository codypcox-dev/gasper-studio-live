# Grok 4.6 Successor Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use triforce-worker-orchestration (recommended) or triforce-plan-execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Gasper Studio prove the real Grok 4.6 response route, persist a disk-authoritative takeover packet, expose AgentBridge readiness honestly, and show the successor state visibly in the 5179 Studio.

**Architecture:** Keep the existing bounded runtime pilot, but add a response-identity parser that validates the actual `modelUsage` envelope instead of trusting a constant. A Node-only successor service probes the installed Grok client and AgentBridge, owns an atomic `.gasper/successor/continuity.json`, and exposes loopback same-origin status/continuity routes; a small React panel renders the result. Developer tool execution remains a separate later authority and is not smuggled into the runtime prompt.

**Tech Stack:** TypeScript, Zod, Node child-process/fs/crypto APIs, Vite middleware, React, Vitest, PlanOps 4.0, Grok CLI 1.0.3.

## Global Constraints

- Preserve safety ref `capstone/pre-main-reconcile-2026-08-10` at `0cf58721a452e423915df792091ce1750ec6ac34`.
- Create one local checkpoint branch/commit before successor source changes; never push.
- Never modify `C:/Users/funny/Documents/Grimoire/`, `toolkit/grimoire/`, credentials, or global packages.
- Never reset, clean, stash, rebase, discard, or overwrite pre-existing dirty work.
- Do not commit `.gasper/` runtime media, caches, logs, or oversized proof video.
- Grok response identity is verified only from the actual response envelope `modelUsage`; environment availability is a separate evidence class.
- The runtime pilot retains its closed action registry. This slice does not grant shell, arbitrary methods, DOM transforms, renderer writes, or Git writes to the Tuning Lab prompt.
- AgentBridge is green only when `grok mcp doctor --json` reports `healthy_count >= 1`; discovered tools and incompatible/skipped tool warnings remain separate fields.
- Continuity truth lives on disk in a versioned, validated packet. Grok session memory may supplement but never replace it.
- All new behavior is TDD: focused red, minimal green, then full validation.
- UI completion requires a fresh inspected screenshot. Motion/owner acceptance is outside this slice.

---

### Task 0: Protected checkpoint and isolated successor workspace

**Files:**
- Inspect: entire current Git status
- Commit: validated source, tests, governance docs, and small receipts only
- Exclude: `.gasper/`, runtime logs, caches, raw media, MP4/WebM proof assets

**Interfaces:**
- Consumes: current `main` HEAD `5d67445082e3c4a265da0ce50d08af1cf04e6309` plus the validated dirty feature tree.
- Produces: branch `checkpoint/grok-successor-2026-08-13`, a recoverable commit, and an isolated `feature/grok-successor-foundation` worktree created from it.

- [ ] **Step 1: Inventory exact checkpoint candidates and reject runtime baggage**

Run `git status --short`, measure untracked top-level paths, and inspect `.gitignore`. Stage only source, tests, governance state, plans, and small JSON/Markdown proof receipts.

- [ ] **Step 2: Create the protected checkpoint branch and commit**

Run:

```powershell
git switch -c checkpoint/grok-successor-2026-08-13
git add <explicit validated paths only>
git commit -m "checkpoint: preserve Grok pilot and video training foundation"
```

Expected: checkpoint commit succeeds; `.gasper/` and large proof media remain unstaged.

- [ ] **Step 3: Verify recoverability and safety ref**

Run:

```powershell
git rev-parse checkpoint/grok-successor-2026-08-13
git rev-parse capstone/pre-main-reconcile-2026-08-10
git status --short
```

Expected: both refs resolve, safety ref is unchanged, and remaining dirty entries are enumerated rather than discarded.

- [ ] **Step 4: Create an isolated feature worktree**

Use the worktree-boundary procedure, create `feature/grok-successor-foundation` from the checkpoint, install nothing globally, and run `npm test` before editing.

---

### Task 1: Response-verified Grok identity

**Files:**
- Create: `packages/gasper-studio/src/training/server/GrokResponseIdentity.ts`
- Create: `packages/gasper-studio/src/training/server/GrokResponseIdentity.test.ts`
- Modify: `packages/gasper-studio/src/training/server/GrokStudioPilotProvider.ts`
- Modify: `packages/gasper-studio/src/training/server/GrokStudioPilotProvider.test.ts`

**Interfaces:**
- Consumes: raw Grok JSON envelope containing `requestId`, `sessionId`, and `modelUsage`.
- Produces: `GrokResponseIdentity` and `parseGrokResponseIdentity(envelope, expectedModel)`; `StudioPilotTurnResult.identity` carries the verified response identity.

- [ ] **Step 1: Write the failing identity tests**

The production breaks caught are a forged static model label, a fallback model response, missing request/session identity, and zero model calls. Use a hand-authored literal envelope:

```ts
expect(parseGrokResponseIdentity({
  requestId: "req-1",
  sessionId: "session-1",
  modelUsage: {
    "grok-4.6-build": { modelCalls: 1, inputTokens: 10, outputTokens: 2 },
  },
}, "grok-4.6")).toMatchObject({
  verification: "response",
  canonicalModel: "grok-4.6",
  backendModel: "grok-4.6-build",
  requestId: "req-1",
  sessionId: "session-1",
});
```

Also assert that `grok-4.5`, an empty `modelUsage`, and multiple nonmatching model keys throw.

- [ ] **Step 2: Run the focused test and verify RED**

Run `npx vitest run packages/gasper-studio/src/training/server/GrokResponseIdentity.test.ts`.
Expected: FAIL because the parser module does not exist.

- [ ] **Step 3: Implement the minimal strict parser**

Define:

```ts
export type GrokResponseIdentity = Readonly<{
  verification: "response";
  canonicalModel: "grok-4.6";
  backendModel: string;
  requestId: string;
  sessionId: string;
  modelCalls: number;
}>;

export function parseGrokResponseIdentity(
  envelope: unknown,
  expectedModel: "grok-4.6",
): GrokResponseIdentity;
```

Require one matching `grok-4.6`/`grok-4.6-*` entry with integer `modelCalls >= 1`, plus nonempty request and session IDs.

- [ ] **Step 4: Thread verified identity through the provider**

Parse the envelope before returning a pilot turn. Never synthesize response verification from `STUDIO_PILOT_MODEL`. Extend provider tests so a 4.5 envelope is rejected even when the requested model was 4.6.

- [ ] **Step 5: Run focused tests GREEN**

Run both identity and provider test files. Expected: PASS; mutation check confirms wrong backend model, absent IDs, zero calls, and missing validation each fail.

---

### Task 2: Durable continuity and environment/bridge status

**Files:**
- Create: `packages/gasper-studio/src/training/GrokSuccessorProtocol.ts`
- Create: `packages/gasper-studio/src/training/GrokSuccessorProtocol.test.ts`
- Create: `packages/gasper-studio/src/training/server/GrokSuccessorService.ts`
- Create: `packages/gasper-studio/src/training/server/GrokSuccessorService.test.ts`
- Create: `bin/planops.mjs`
- Create: `tests/planops-wrapper.test.ts`

**Interfaces:**
- Consumes: fixed Grok CLI probes, Git inspector, PlanOps state, continuity path, and optional last response identity.
- Produces: `GrokSuccessorStatus`, `GrokContinuityPacket`, `GrokSuccessorService.status()`, `.readContinuity()`, `.writeContinuity()`, and a canonical PlanOps wrapper.

- [ ] **Step 1: Write failing protocol tests**

Require schema `gasper.grok-successor.continuity.v1`, exact repo root/branch/HEAD, dirty manifest, PlanOps turn/phase/gate/work, Northstar refs, completed work, open risks, next action, proof refs, and optional verified response identity. Reject unknown fields, missing next action, invalid hashes, and `Grimoire` in allowed paths.

- [ ] **Step 2: Run protocol tests RED**

Run `npx vitest run packages/gasper-studio/src/training/GrokSuccessorProtocol.test.ts`.
Expected: FAIL because the protocol does not exist.

- [ ] **Step 3: Implement strict shared schemas**

Export Zod schemas plus inferred types. Keep status evidence classes distinct:

```ts
identity: { environmentVerified: boolean; responseVerified: boolean; requestedModel: "grok-4.6"; backendModel?: string }
bridge: { healthy: boolean; protocol?: string; discoveredTools: number; incompatibleTools: string[] }
```

- [ ] **Step 4: Write failing service tests**

Inject fake command/file/repository readers. Prove that a healthy model catalog plus healthy MCP doctor yields environment green, a dead bridge stays red, continuity writes are atomic, malformed disk packets are rejected, and a saved packet survives a new service instance.

- [ ] **Step 5: Run service tests RED**

Run `npx vitest run packages/gasper-studio/src/training/server/GrokSuccessorService.test.ts`.
Expected: FAIL because the service does not exist.

- [ ] **Step 6: Implement the Node-only service**

Use fixed executable/argument arrays only. Probe `grok --version`, `grok models`, and `grok mcp doctor --json`; compute the executable SHA-256; read Git/PlanOps via injected inspectors; store continuity through write-temp then rename under `.gasper/successor/continuity.json`. Cache probes briefly and never invoke a paid model call from status polling.

- [ ] **Step 7: Restore the canonical PlanOps wrapper red-first**

Write a test that spawns `node bin/planops.mjs status` and expects the current JSON state. Verify RED with module-not-found, then create a one-purpose ESM wrapper importing `../vendor/triforce-engine/constituents/planops-engine/bin/planops.mjs` and verify GREEN.

---

### Task 3: Loopback API and visible successor HUD

**Files:**
- Create: `packages/gasper-studio/src/training/HttpGrokSuccessorApi.ts`
- Create: `packages/gasper-studio/src/training/HttpGrokSuccessorApi.test.ts`
- Create: `packages/gasper-studio/src/training/GrokSuccessorPanel.tsx`
- Create: `packages/gasper-studio/src/training/GrokSuccessorPanel.test.tsx`
- Modify: `packages/gasper-studio/src/training/server/trainingSourceMiddleware.ts`
- Modify: `packages/gasper-studio/src/training/server/trainingSourceMiddleware.test.ts`
- Modify: `packages/gasper-studio/src/training/server/GrokStudioPilotProvider.ts`
- Modify: `packages/gasper-studio/src/tuning/TuningLabPanel.tsx`
- Modify: `packages/gasper-studio/src/dais-first/daisFirst.css`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `GrokSuccessorService` and shared strict schemas.
- Produces: same-origin routes `/__gasper/training/successor/status` and `/__gasper/training/successor/continuity`, a typed browser API, and an always-visible status card inside Tuning Lab.

- [ ] **Step 1: Write failing middleware and browser API tests**

Prove GET status returns the strict payload, GET continuity returns the disk packet, POST continuity rejects malformed/oversized/cross-origin input, and provider response diagnostics update the last verified identity.

- [ ] **Step 2: Run route/API tests RED**

Run the middleware and `HttpGrokSuccessorApi` tests. Expected: FAIL with missing routes/classes.

- [ ] **Step 3: Implement the API minimally**

Reuse the existing loopback/same-origin gate and abort semantics. Cap continuity POST bodies at 1 MiB. Return `Cache-Control: no-store` and strict success/error envelopes.

- [ ] **Step 4: Write the failing panel test**

Render with a literal status fixture and assert visible user-facing outcomes: `GROK 4.6 VERIFIED`, `AGENTBRIDGE HEALTHY`, discovered tool count, current PlanOps work/turn, continuity timestamp/next action, and a warning when incompatible tools are present.

- [ ] **Step 5: Run panel test RED**

Run `npx vitest run packages/gasper-studio/src/training/GrokSuccessorPanel.test.tsx`.
Expected: FAIL because the component does not exist.

- [ ] **Step 6: Implement and integrate the panel**

Poll status on mount and by explicit Refresh only; do not trigger model calls. Show environment verification and response verification separately. Render bridge/tool compatibility honestly, plus the durable next action. Integrate below the current Grok pilot controls without removing expert tuning controls.

- [ ] **Step 7: Run focused UI/API tests GREEN**

Run all new and modified focused tests. Expected: PASS; wrong status branches and empty/default returns must fail at least one test.

---

### Task 4: Runtime proof, takeover packet, and full validation

**Files:**
- Create: `.gasper/successor/continuity.json` at runtime only
- Create: `research/proofs/grok-successor-001/status.json`
- Create: `research/proofs/grok-successor-001/studio-successor-ready.jpg`
- Create: `work/grok-successor-001/HANDOFF.md`

**Interfaces:**
- Consumes: built successor service/UI and verified response identity.
- Produces: visible 5179 HUD, durable continuity packet, proof receipt, and a next-worker handoff.

- [ ] **Step 1: Run focused tests, full tests, typecheck, build, and diff hygiene**

Run:

```powershell
npx vitest run packages/gasper-studio/src/training tests/planops-wrapper.test.ts
npm test
npm run typecheck
npm run build
git diff --check
node bin/triforce.mjs doctor
node bin/triforce.mjs reconcile
```

Expected: every command exits zero.

- [ ] **Step 2: Restart only the exact owned 5179 preview**

Verify the listener command line, stop that PID only, launch the built Vite preview hidden, and require `/__gasper/training/successor/status` to become ready.

- [ ] **Step 3: Exercise one real Grok pilot turn**

Submit a bounded inspection instruction. Require `modelUsage` to verify `grok-4.6-build`; record request/session IDs without storing thought text or credentials.

- [ ] **Step 4: Persist the takeover packet**

Write current repo/PlanOps/proof/open-risk/next-action data through the continuity API. Reload the page and prove the packet survives the service/browser lifecycle.

- [ ] **Step 5: Capture and inspect the visible HUD**

Capture a fresh screenshot showing model identity, bridge health, tool compatibility, PlanOps state, and next action. Browser console must contain zero errors. Mark visual integration PASS or blocked; never claim motion acceptance.

- [ ] **Step 6: Write the durable handoff**

Record exact branch/worktree, commit, service PID/URL, continuity path, PlanOps gate, test counts, proof paths, compatible/incompatible tool state, and the next Grok worker action in `work/grok-successor-001/HANDOFF.md`.

## Self-review result

- Spec coverage: checkpoint, real response identity, environment/bridge status, durable continuity, canonical PlanOps entrypoint, visible UI, cold persistence, and proof are each assigned to a task.
- Scope split: AgentBridge tool-name repair remains a separate infrastructure follow-up; this plan only diagnoses and displays incompatible names.
- Placeholder scan: no deferred implementation placeholders remain.
- Type consistency: shared status/continuity schemas are the only browser/server payload authority; `GrokResponseIdentity` is the only response-verification authority.
