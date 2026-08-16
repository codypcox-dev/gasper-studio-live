# Grok 4.6 Studio Pilot Implementation Plan

> Owner mandate: wire the existing "Tell Gasper what to do…" prompt to Grok
> 4.6, give it complete bounded in-product control of Gasper Studio, and use a
> supervised Grok worker during implementation.

## Contract

- Work in the current intentional live feature lane because the 5179 preview
  depends on its uncommitted video/physics foundation.
- Preserve every unrelated dirty file and the protected safety ref.
- Do not commit, push, reset, rebase, stash, clean, delete, or touch Grimoire.
- Grok plans; existing Studio/Dais/Tuning/physics/reference APIs execute.
- No arbitrary method names, eval, DOM transforms, renderer writes, filesystem,
  shell, credentials, or Git access are exposed to the runtime model.
- Every model output and browser action is schema-validated and receipted.
- Failure, cancellation, turn limits, unavailable authorities, and partial
  execution are visible and fail closed.
- Human visual acceptance remains separate from model/runtime success.

## Architecture

```text
Tuning Lab prompt
  -> StudioPilotSession (bounded loop, cancellation, rollback)
  -> HttpStudioPilotProvider
  -> loopback same-origin /__gasper/training/pilot
  -> GrokStudioPilotProvider (grok-4.6, strict JSON, no tools/memory/web)
  -> versioned action batch
  -> StudioPilotExecutor
  -> existing Tuning Lab / Dais adapter / controller / reference session
  -> action receipts + fresh observation
  -> next Grok turn or complete / needs_user / turn_limit
```

## Capability catalog (MVP complete in-product surface)

1. Inspect compact Studio, selection, transport, tuning, controller, physics,
   craft, autonomy, and reference-training state.
2. Set any registered Tuning Lab parameter; reset, pin/compare baseline, and
   capture proof.
3. Select one of the eight authored embodiments, an available expression, an
   admitted eight-state hold, and bounded expression gain.
4. Play, pause, interrupt, scrub home/end, and step the Studio transport.
5. Set bounded world-physics parameters; launch bounce/comet; disarm safely.
6. Set craft tempo/exaggeration/shot bias; run or stop an admitted craft pack.
7. Start/stop living, wander, life, and Boo through controller authorities.
8. Link a video, analyze it, preview/interrupt/stop its compiled physics plan.

The catalog is discoverable and reports per-action availability. Actions with
missing live authorities are rejected; they are never silently simulated.

## Task 1 — Protocol and closed schemas (red first)

Files:
- Create `packages/gasper-studio/src/training/StudioPilotProtocol.ts`
- Create `packages/gasper-studio/src/training/StudioPilotProtocol.test.ts`

Tests must catch unsupported action kinds, unknown keys, out-of-range values,
empty act batches, invalid stop/action combinations, overlong goals/history,
and malformed provider output. Define literal fixtures independent of the
parser. Then implement the versioned request, batch, receipt, observation, and
capability schemas plus the provider prompt builder.

## Task 2 — Grok 4.6 server lane (red first)

Files:
- Create `packages/gasper-studio/src/training/server/GrokStudioPilotProvider.ts`
- Create `packages/gasper-studio/src/training/server/GrokStudioPilotProvider.test.ts`
- Update `packages/gasper-studio/src/training/server/trainingSourceMiddleware.ts`
- Update its focused tests and `vite.config.ts`

Tests must prove the exact `grok-4.6` invocation, one-turn structured output,
disabled tools/web/memory/subagents, prompt and output bounds, abort/timeout,
non-zero exit handling, invalid JSON/schema rejection, loopback same-origin
enforcement, and honest status capability. Reuse or safely factor the existing
structured Grok process lane without weakening semantic-motion behavior.

## Task 3 — Browser HTTP provider (red first)

Files:
- Create `packages/gasper-studio/src/training/HttpStudioPilotProvider.ts`
- Create `packages/gasper-studio/src/training/HttpStudioPilotProvider.test.ts`

Tests must prove the versioned POST body, `grok-4.6` identity, abort semantics,
provider error propagation, and rejection of malformed success responses.

## Task 4 — Real action executor (red first)

Files:
- Create `packages/gasper-studio/src/training/StudioPilotExecutor.ts`
- Create `packages/gasper-studio/src/training/StudioPilotExecutor.test.ts`

Inject the production Dais adapter, TuningLabSession, ReferenceTrainingSession,
and late-bound GasperRigController. Use existing public helpers/methods only.
Tests must prove each action reaches the intended authority with validated
arguments, unsupported/unavailable actions fail closed, sequential stop versus
continue-on-error semantics are correct, cancellation skips remaining actions,
fresh observations are returned, and rollback restores every reversible start
state while safely stopping transient performances.

## Task 5 — Iterative pilot session (red first)

Files:
- Create `packages/gasper-studio/src/training/StudioPilotSession.ts`
- Create `packages/gasper-studio/src/training/StudioPilotSession.test.ts`

Implement inspect -> plan -> execute -> observe -> revise with a default four
turn limit and a hard ceiling of six. Tests must cover simple completion,
multi-turn correction after a failed action receipt, `needs_user`, provider
failure, malformed/empty action plan, cancellation during planning, cancellation
between actions, superseding a prior run, turn-limit closure, and rollback.

## Task 6 — Replace the visible prompt with the pilot UI

Files:
- Create `packages/gasper-studio/src/training/StudioPilotPanel.tsx`
- Create its focused component test and stylesheet
- Thread `StudioPilotSession` through `GasperStudioApp.tsx`,
  `DaisFirstStageHost.tsx`, `DaisControlRail.tsx`, and `TuningLabPanel.tsx`

Preserve `tuning-lab-intent` and `tuning-lab-apply-intent` selectors, but route
them to Grok when the production pilot is present. Show model, availability,
turn/progress, final disposition, recent action receipts, Stop, and Roll back.
Keep the deterministic expert sliders as direct low-level controls and retain a
fail-closed non-pilot fallback for tests/offline construction.

## Task 7 — Live exercise and proof

1. Run focused tests after every red/green slice.
2. Run full tests, typecheck, production build, and `git diff --check`.
3. Restart only the owned 5179 preview process so the new server middleware is
   loaded; verify the built asset identity and status endpoint.
4. In the actual browser, submit a compound prompt that changes embodiment,
   tuning, and motion/physics, then verify the action receipts and resulting
   runtime state. Exercise Stop and Roll back.
5. Capture a fresh screenshot and a short current-behavior video. Inspect both;
   classify them as runtime/visual evidence, not owner acceptance.
6. Run TriForce doctor and reconcile check. Preserve the safety ref and prove
   no Grimoire path or unrelated Git state changed.

## Stop conditions

Stop and report instead of improvising if the real Grok provider is absent,
the 5179 process cannot be safely identified, a required existing authority has
no reversible/public route, baseline tests regress outside this slice, or the
same blocker repeats without new evidence.
