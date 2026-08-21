# Gasper v4 — Tri-Force Engine Authority

**Purpose:** distinguish the canonical orchestration engine from Gasper's historical vendored host projection.

## Canonical engine

The v4 refactor is governed by the canonical **Tri-Force 4.0.x** line.

Certified workstation state from the preceding engine run:

- current certified patch: **4.0.1**;
- certified tip: `70b449e`;
- immutable v4.0.0 anchor: `be7f70bf1a64431ca253b2d1653cffaface4ca6b`;
- v4.0.1 release ref/tag is the preferred current orchestrator;
- host skill projections were previously certified without drift.

Use the canonical engine/skill projection for PlanOps/Tri-Force admission and GrokForce coordination.

## Gasper vendored lock

`docs/triforce/kernel.lock.json` in the Gasper repository currently records a historical Tri-Force 3.0.0 host install.

Do **not** manually rewrite that file to claim 4.x installation.

The user has already established that Gasper does not need to vendor the canonical 4.x engine merely to be governed by it.

Therefore the v4 execution model is:

```text
Canonical Tri-Force 4.0.1 orchestrator / skill projection
        │
        ├── admission / PlanOps / worker graph / proofs
        ▼
Gasper Studio repository
        │
        └── existing vendored metadata remains truthful until an explicit host-install action updates it
```

## Worker boot rule

The primary Grok controller must verify that it is operating under the canonical 4.0.x orchestration context before executing the v4 graph.

It may read Gasper's local Tri-Force documents for project law and residual history, but it must not downgrade the controlling run to v3 merely because the repository's old vendor lock is still present.

## Upgrade prohibition

Do not:

- fake `kernel.lock.json` versions;
- replace known 4.0.1 with an invented later version;
- vendor-copy the engine into Gasper unless a separately admitted host-install plan requires it;
- use package version text alone as proof of engine efficacy.

## Current v4 run label

Use:

`GASPER-V4-REAL-001 / Tri-Force 4.0.1 orchestrated`

for execution receipts and GrokForce proof packets.
