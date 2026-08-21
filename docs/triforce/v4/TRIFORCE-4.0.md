# TriForce 4.0 — Gasper v4 Execution Protocol

**Protocol:** `TRIFORCE-4.0.0`  
**Program:** `GASPER-V4-CANON-001`

## Purpose

TriForce 4.0 is the architecture and execution discipline for the Gasper v4 refactor. It exists to prevent a worker from locally improving one representation while silently violating another authority.

This document upgrades the governance protocol for this program. It does **not** claim that any separate host binary has already been upgraded; runtime/version claims require evidence.

## Command structure

```text
Owner visual authority
        ↓
Architect / Pilot
        ↓
TriForce 4.0 PlanOps graph
        ↓
GrokForce bounded worker lanes
        ↓
Integration + evidence gates
        ↓
Owner visual acceptance
```

## Three-force model

### THINK
First-principles model, authority, invariants, failure hypotheses, duals, evidence design.

### PLAN
Dependency graph, single-writer scopes, contracts, checkpoints, rollback, tests, acceptance gates.

### EXECUTE
Bounded implementation lanes with explicit inputs/outputs and no unilateral canon changes.

No worker may skip THINK/PLAN by immediately painting code into the current failure.

## Architect role

The architect remains above all worker lanes and owns:

- v4 canon;
- dependency graph;
- cross-lane interfaces;
- conflict resolution;
- acceptance criteria;
- integration order;
- visual-review interpretation;
- rerouting stalled/incorrect workers.

Workers may propose canon changes. They may not silently redefine canon.

## Single-writer law

At any integration epoch, each authority has one primary writer:

- volume topology/solver;
- semantic cage attachment;
- vector face evaluator;
- embodiment projection;
- GSAP semantic timeline;
- material/lighting;
- Studio binding layer;
- document/schema.

Readers may instrument and test. Two workers do not concurrently rewrite the same authority.

## Contract-first handoff

Every lane receives:

- input authority files;
- exact write scope;
- explicit forbidden scope;
- required exported contract/API;
- tests;
- visual/evidence proof;
- rollback/checkpoint instruction;
- completion definition.

A lane that cannot state its contract is not ready to code.

## Evidence classes

### E0 — static
Types, tests, topology reports, hashes, source inspection.

### E1 — interactive
Live UI/control binding proof, console/network inspection, deterministic commands.

### E2 — visual motion
Full captures, orbit, gait, face motion, material response, compare views.

### E3 — owner acceptance
Human identity/form judgment. Required for visual canon promotion.

No E0 result can close an E2/E3 gate.

## Failure classification

- `MODEL_ERROR` — wrong representation or assumptions; stop implementation and revise canon/plan.
- `CONTRACT_ERROR` — lane interfaces disagree; architect resolves before merge.
- `IMPLEMENTATION_ERROR` — model/contract are sound; worker repairs code.
- `VISUAL_REGRESSION` — objective tests pass but identity read worsens; block promotion.
- `TOOLING_ERROR` — worker/bridge/TUI issue; replace worker path without changing canon.

The pressed-mint/candy failure is classified primarily as `MODEL_ERROR`, not a shader-tuning bug.

## Branching / integration

Recommended worker branches:

- `g4/volume-kernel`
- `g4/face-vector`
- `g4/render-look`
- `g4/animation-runtime`
- `g4/embodiments`
- `g4/studio-authoring`
- `g4/regression-evidence`

Integration branch:

- `architect/gasper-v4-canon-20260821`

Main is promoted only after gates.

## Turbo execution rule

Parallelize only independent lanes. The architect may run workers concurrently when their write scopes do not overlap and their contracts are frozen.

Fast is achieved by removing ambiguity and conflicts, not by allowing multiple agents to edit the same hot file blindly.

## Checkpoint law

Before each integration wave:

- record starting commit;
- preserve runnable state;
- name expected visual change;
- define rollback trigger;
- capture after evidence;
- merge only if the wave improved or preserved every protected invariant.

## GrokForce relationship

GrokForce is an execution pool under TriForce. Grok workers investigate, implement, test, and produce evidence. They do not own product direction.

A GrokForce lane must return:

1. exact files changed;
2. contract implemented;
3. tests run/results;
4. runtime proof;
5. known residuals;
6. commit/checkpoint;
7. recommendation: ACCEPT / REVISE / BLOCK.

## Promotion rule

v4 canon becomes mainline product canon only when:

- Wispwalker form gate passes;
- vector face gate passes;
- full-orbit/motion gate passes;
- no second body writer remains in the normal runtime;
- Studio bindings point at v4 authorities;
- owner visually accepts the result.
