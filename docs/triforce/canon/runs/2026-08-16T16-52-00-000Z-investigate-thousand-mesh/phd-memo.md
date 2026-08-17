# CanonOps PHD — investigate · thousand-mesh

Earned under N20 / N335.
Date: 2026-08-16T16:52:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T16-52-00-000Z-investigate-thousand-mesh

## 1. THE WALL

The 1000-point system exists as three locked fields. Locomotion and viscosity ignore two of them. Shape-snap and regional physics were designed here and never mastered.

## 2. WHAT STILL EXISTS (live)

| Field | Count | Live writer | Job |
|---|---|---|---|
| Contour | 512 | `sampleBodyForProfile` | Silhouette, gait, KV τ, morph |
| Lattice | 360 nodes / 672 tris | `ARTICULATION_MESH` | Mass, sculpt offsets, face anchors, light dome |
| Relief | 25×40 = 1000 | `SidekickReliefFields.evaluateRelief` + `__GASPER_SCAFFOLD_Z__` | Pressure, goose, optional rim push |

Topology lock is real. `RELIEF_TOPOLOGY_SPEC` names it. The painter prints it in the readout.

## 3. WHAT IT IS NOT

- Not a general shape-snap. Only named `FORM_PROFILES` (presence, wispwalker, comet, singularity, dormant-orbit, low-orbit, halo).
- Not per-sample physics. One τ + a plant gauss.
- Not blowfish. `_formK` is ±2.5% whole-form scale.
- Not one 1000-point “body mesh.” 360 is mass. 1000 is skin pressure.
- `AdaptiveReliefInstrument` (golden-spiral 1000, face regions) is a tested twin, not the paint path.

## 4. THE DESIGN THAT WAS ALREADY RIGHT

GASPER-009: interior pressure → rim ring 24 → 512 radius. Neutral rim is 0.
Morphology domains: a contour-only morph is invalid.
Book 009: 1000 must not paint a face. Coupled, not merged.

Blowfish = pressure on the 1000, rim pushes the 512.
Remote = new 512 embedding, same lock.
Goose = DETAIL_TOPOLOGY vector, already started (D-0086).

## 5. PIVOT (not written this receipt)

Master the lock before more gait.

1. Atlas names Contour 512 · Lattice 360 · Relief 1000.
2. Unify the 1000 onto polar 25×40. Retire or port the golden-spiral twin.
3. Regional physics as `Float32Array[1000]` sampled like `scaffoldContourZ`. Plant gate becomes a region.
4. Shape-snap later: target curve → 512. Legs stay next after this organ is named and honest.
