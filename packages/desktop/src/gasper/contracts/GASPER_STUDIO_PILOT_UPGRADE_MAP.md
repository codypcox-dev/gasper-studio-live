# Gasper Studio Upgrade Map — Pilot Kernel Wave (Bounded)

**Authority:** Gasper Turbo lead (implementation) · **Visual acceptance:** Cody only  
**Kernel:** `gasper.pilot.kernel` v1.0.0 · `@agentbridge/shared/gasper-pilot`  
**Product surface:** standalone packaged Gasper Studio (`gasper-studio/packaged-native`)  
**Not equivalent to:** AgentBridge control plane, browser-dev Studio, Sidekick fixtures  

---

## 0. Non-negotiables (carry every upgrade)

| Law | Enforcement |
|-----|-------------|
| Standalone packaged Gasper Studio is the product | No substitution with AgentBridge UI, Vite browser, or Sidekick |
| GSAP / native owns continuous frames | Pilot kernel only hands off low-frequency targets |
| Cody owns human visual acceptance | No agent self-accept |
| Runtime survival ≠ bridge survival | `bridgeRequiredForSurvival: false` always |
| No MCP frame driving | `frameAuthority` ∈ {`gsap-native`, `hold`} only |
| Topology lock 512 / 360 / 672 + 25×40 relief | Pilot constraints refuse unlock |

---

## 1. What shipped (this wave)

| Deliverable | Location |
|-------------|----------|
| Typed `GasperPilotPlan` + state/result contracts | `packages/shared/src/gasper-pilot/types.ts` |
| `get_state` / `validate_plan` / `apply_plan` / `get_result` | `packages/shared/src/gasper-pilot/kernel.ts` |
| Revision + idempotency rules | same kernel; contract JSON |
| Safe interrupt policies (`hold` / `blend` / `retarget` / `queue`) | kernel + validate |
| Standalone recovery (`standalone_resume` / `hold_last_good` / `return_to_settled`) | `recoverStandalone()` |
| Studio host adapter (GSAP handoff hook only) | `packages/desktop/src/gasper/pilot/` |
| Architecture contract lock | `packages/desktop/src/gasper/contracts/gasper-pilot-kernel.v1.json` |
| Structural tests | `tests/structural/gasper-pilot/` |

**Explicitly not shipped:** MCP tools that apply pilot plans per-frame, HQ lifecycle coupling, UI chrome redesign, curve editor, full PilotOps embodiment mesh.

---

## 2. Upgrade map — five grounded tracks

Tracks are ordered for dependency safety. Each track lists **now (kernel)**, **next (Studio wire)**, **later (product polish)**, and **acceptance owner**.

### Track A — Visual stage ergonomics

| Step | Scope | Status | Notes |
|------|-------|--------|-------|
| A0 | Low-frequency operational mode visible in state (`standalone` / `bridged` / `degraded` / `recovering`) | **Now** | Kernel state only; no chrome yet |
| A1 | Stage chrome badge: standalone vs bridged without implying survival dependency | Next | Read `get_state().operationalMode` + `bridgeConnected` |
| A2 | Fit / safe-margin / content viewBox remain VisualBounds authority | Unchanged | Do not re-center from pilot plans |
| A3 | Authoring Neutral optical tier remains performance gate | Unchanged | Pilot must not force full optical rebuild |
| A4 | Dais selection path grammar (Document › Workspace › Mode › Tool) | Unchanged | Pilot is not a second mode authority |
| A5 | Cody visual pass on stage legibility under pilot transitions | Later | Human-only |

**Ergonomics rule:** React chrome updates on pilot result events only — never on GSAP ticker.

### Track B — Rig controls

| Step | Scope | Status | Notes |
|------|-------|--------|-------|
| B0 | Pilot `channelHints` are sparse semantic hints, not binding writes | **Now** | Validate range; protect channels |
| B1 | Host maps applied intent → `GasperRigController` / living runtime targets | Next | Via `onGsapHandoff` only |
| B2 | Parameter registry remains sole interactive binding authority | Unchanged | Pilot never bypasses registry on hot path |
| B3 | Direct-manipulation preview stays `quickTo` / dirty-domain | Unchanged | Forbidden: MCP/REST/CDP on slider drag |
| B4 | Fail closed when inspector control lacks registered binding | Unchanged | Architecture lock build gate |

**Rig rule:** Pilot may request state; rig modules apply through existing controllers.

### Track C — Topology continuity

| Step | Scope | Status | Notes |
|------|-------|--------|-------|
| C0 | Topology lock snapshot on every `get_state` | **Now** | 512 / 360 / 672 / 25×40 / 1000 |
| C1 | `constraints.topologyLock: false` rejected while locked | **Now** | `TOPOLOGY_LOCK_VIOLATION` |
| C2 | Embodiment transitions keep shared topology (no re-mesh) | **Now (measured)** | Topology stability asserted on every handoff |
| C3 | Relief field remains movement-bearing, not decorative-only | Unchanged | Architecture lock |
| C4 | Migration-only path for topology count drift | Later | Explicit schema migration |

**Topology rule:** Pilot plans never change contour sample counts or lattice counts.

### Track D — Eye / mouth temporal coherence

| Step | Scope | Status | Notes |
|------|-------|--------|-------|
| D0 | Coherence flags on state: blink/gaze exclusive, mouth retarget-from-current | **Now** | Policy flags only |
| D1 | Temporal policy ids: `eight-state-gaze-blink` / `hold` / `reduced-motion` | **Now** | Kernel tracks policy; GSAP times events |
| D2 | Handoff respects layer authority (blink owns `eye_openness`, gaze owns `gaze`) | **Now (policy)** | Measured mid-blink protection on handoff; living soft-retarget |
| D3 | Scenario transitions must not teleport mouth/eyes | **Now (policy)** | `mouthRetargetFromCurrent` measured; GSAP proxy from current |
| D4 | Headed proof: interrupt mid-blink policy + living handoff | **Now (measured)** | `artifacts/gasper-pilot-002` — Cody visual still later |

**Temporal rule:** Kernel never schedules blink frames; native schedulers do.

### Track E — PilotOps operational-state embodiment

| Step | Scope | Status | Notes |
|------|-------|--------|-------|
| E0 | Intent kinds: set_operational_state, transition_scenario, hold, recover, interrupt | **Now** | Bounded set |
| E1 | Playback: idle / transitioning / holding / interrupted / recovering / settled | **Now** | Embodied in pilot state |
| E2 | Map eight-state scenario ids onto living runtime / IR targets | Next | Reuse scenario compiler IR |
| E3 | Optics / energy / relief respond as operational-state-only or operational | Next | Existing layer activation audit |
| E4 | PilotOps panel (low-frequency): last plan, revision, recovery action | Later | Chrome only |
| E5 | DesignOps cartography refresh after headed pilot proof | Later | Not browser-dev evidence |

**PilotOps rule:** Operational embodiment is a native GSAP concern after handoff; pilot records the semantic state.

---

## 3. Contract surface (operators)

```text
get_state()        → GasperPilotState
validate_plan(P)   → { ok, planContentHash, issues } | error
apply_plan(P)      → { ok, result, state }
get_result(id)     → GasperPilotResult | null
```

### Revision

- `expectedRevision` must match kernel revision on apply (when provided).
- Successful mutating apply increments revision.
- Idempotent replay and queue-accept do **not** increment.
- Reject does **not** increment.

### Idempotency

- Key: `idempotencyKey`.
- Same key + same plan content hash → `idempotent_replay` (no double side effects).
- Same key + different hash → `IDEMPOTENCY_MISMATCH`.

### Interrupt policies

| Policy | Behavior |
|--------|----------|
| `hold` | Freeze handoff authority to hold; clear queue |
| `blend` | Retarget from current via GSAP handoff |
| `retarget` | Immediate retarget from current via GSAP handoff |
| `queue` | Enqueue if transitioning; drain on `notifyTransitionSettled` |

### Standalone recovery

| Mode | Effect |
|------|--------|
| `standalone_resume` | Restore last good semantic state; GSAP handoff |
| `hold_last_good` | Restore last good; hold frames |
| `return_to_settled` | Presence + `presence-neutral-settled` |

Bridge/HQ disconnect never forces kernel close. `recoverStandalone()` is always available.

---

## 4. Wiring checklist (implementation packets)

1. **Host mount** — ✅ construct `GasperPilotHost` once in Studio app bootstrap (packaged path): `packages/gasper-studio/src/pilot/mountPackagedPilotHost.ts` via `GasperStudioApp` + narrow adapter `packages/desktop/src/gasper/pilot/studioPilotAdapter.ts`.
2. **GSAP handoff** — ✅ `onGsapHandoff` → living runtime `goEightState` / `goMicrostate` when `__GASPER_DAIS__` present; safe no-op when living unavailable; never MCP.
3. **Lifecycle** — ✅ bridge report from `connectionAuthority`; pilot `standalone` when bridge down; Studio `StandaloneOperational` coexists without survival coupling.
4. **Bridge optional** — ✅ `reportBridgeConnected` from connection authority only.
5. **Settled notify** — ✅ living `setOnTransitionSettled` / transition hold → `notifyGsapSettled()`; host re-fires handoff on queue drain (**GASPER-PILOT-002**).
6. **Measured handoff** — ✅ interrupt duration hints, mid-blink / mouth policy measurements, topology stability flags (`handoffPolicy.ts` + `lastHandoff.measured`).
7. **No new MCP tools** in this wave that apply pilot plans as frame streams.

---

## 5. Test / proof gates

| Gate | Evidence |
|------|----------|
| Structural unit | `tests/structural/gasper-pilot/pilot-kernel.test.ts` |
| Handoff / interrupt / mid-blink / mouth / topology / disconnect | `tests/structural/gasper-pilot/pilot-handoff-proof.test.ts` (**GASPER-PILOT-002**) |
| Forbidden frame authorities rejected | pilot-kernel suite |
| Survival without bridge | `recoverStandalone` with `bridgeConnected: false` |
| Architecture lock topology | contract JSON + state topology snapshot |
| Packaged product evidence | `scripts/gasper-pilot-002/run-headed-packaged-proof.mjs` → `artifacts/gasper-pilot-002/HEADED_PROOF.json` |
| Visual acceptance | Cody only (not claimed by agent packets) |

---

## 6. Explicit out-of-scope (do not sneak in)

- Driving GSAP ticker from MCP or HQ
- Auto-launching Studio from AgentBridge for pilot survival
- Claiming DesignOps ship from browser screenshots alone
- Replacing eight-state IR / scenario compiler with ad-hoc pilot targets
- Per-frame React setState as animation authority

---

## 7. Context receipt fields (operator)

```text
system: gasper-studio
surface: packaged-native (production evidence)
kernel: gasper.pilot.kernel@1.0.0
animation_authority: gsap-native
visual_acceptance: Cody
bridge_required_for_survival: false
mcp_frame_driving: false
```
