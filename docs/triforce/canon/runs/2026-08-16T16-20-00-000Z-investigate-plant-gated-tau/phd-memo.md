# CanonOps PHD — investigate · plant-gated-tau

Earned under N20 / N335.
Date: 2026-08-16T16:20:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T16-20-00-000Z-investigate-plant-gated-tau

## 1. THE WALL

One τ smears the plant after it is posed. `supportSide` already names which gauss is locked. `_lp` ignores that name.

## 2. QUESTION

Plant-gated τ inside `_lp`, or a new per-vertex stiffness field?

## 3. VERDICT

**Plant-gated τ inside existing `_lp`.** Reject a stiffness field.

Pose already computes `_plantArtW` on 1.31 / 1.83. The integrator must use that same weight. A new field would be a second writer.

## 4. MECHANISM

```
pose  →  plant gauss locked, swing gauss lifted
_lp   →  today: every point takes sa = 1 − exp(−dt/viscoTau)
         earned: tau_i = viscoTau + w·(0.02 − viscoTau)
                 w = _plantArtW (same as paint)
```

τ_plant = **0.02 s** (D-0018 floor). Not 0. Zero is a snap and the buzz returns.

Rest (`supportSide === 0`): one τ. Drag: snap. Mesh: same `w` from `theta`.

## 5. INVARIANTS

- Do not delete `_lp`. Do not set τ=0.
- No W-rig. No stiffness array. No N37 retune.
- Chin/cleft unspecialized (`chinKeep`).
- Rest/drag byte-identical.

## 6. FIX SPEC (not written this receipt)

`_lp` branch only. Atlas: Weight = free-mass τ. Plant τ is not a slider.
Next Approve writes that branch.
