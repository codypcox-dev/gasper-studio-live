# Implement — ARAP + polar LOD

Parent Investigate: `arap-solver`.
Date: 2026-08-17T00:33:00.000Z

## Written

- `MeshLadder.ts` — L1 25×40 = 1000, L2 49×80 = 3920. Refine is 2R−1 × 2S. No remesh.
- `ArapSolver.ts` — 2D Kabsch + Jacobi + stretch projection. Face Dirichlet. Pins pull neighbors.
- `FabricSolver` — paddle binds φ̄=φ*=paddle at L2. One tick: KV on φ, then ARAP.
- Painter reads `__GASPER_FABRIC_TOPO__`. Hull is rim of φ at whatever count.

## Law

Point total changes only on the polar ladder, to satisfy a morph (paddle/remote → L2). Identity remains 1000. Gait still owns the pearl W until handles are registered on φ.

## Not this receipt

Stance sockets are not yet φ handles. That is the next unification.
