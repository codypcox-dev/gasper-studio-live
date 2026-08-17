# CanonOps PHD — explore · arap-constraints

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-17T00:37:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-17T00-37-00-000Z-explore-arap-constraints
Parent: investigate · arap-solver

## 1. THE WALL

Four constraint families share one tick with no declared order or stiffness. KV, face Dirichlet, ARAP Jacobi, then stretch. Stretch undoes rotations. Face lock is a band of hundreds of hard handles. Gait is still not a constraint.

## 2. QUESTION

What constraint types exist in ARAP/PBD, which are live on Gasper’s φ, what is the lawful priority stack, and what must never be a hard lock?

## 3. FAMILIES

| Family | Type | Live? | Lawful? |
|---|---|---|---|
| Face band Dirichlet | Hard C(φ)=φ* | Yes — v∈[0.32,0.58] | Yes, but the band is too wide |
| Pole r=0 | Hard, 1 DOF | Yes | Yes |
| Author pins | Hard | API only (tests) | Yes, tiny set |
| KV toward φ* | Predict / accidental Dirichlet | Yes — **all** verts | Predict only on **free** verts |
| ARAP energy | Soft, no α | Yes — Jacobi | Yes |
| Stretch distance | Hard projection, α=0 | Yes — after Jacobi | Soft. α from τ |
| Area / det F | — | No | Soft, later |
| Gait plant | — | No — stance post-pose | Two soft rim pins |
| All-rim weld | Hard | No | **Never** — that is a blend shape |

## 4. PHYSICAL LAW

- A constraint is `C(φ)=0`, not a second silhouette. Hard: replace the row. Soft: `Δφ = −s ∇C / (∇C M⁻¹ ∇C + α̃)`.
- ARAP is an energy, not a hard C. It yields to Dirichlet.
- Stretch after ARAP with α=0 fights the rotations (the poke was invisible until stretch was added; the rotation had absorbed it).
- KV on locked verts is a full-mesh Dirichlet. ARAP then has nothing to do.
- Compliance `α̃ = α/dt²`. τ owns α. Plant 0.02 is stiffer than swing 0.25. No new slider.

## 5. LAWFUL STACK (one tick)

```
1. Predict     KV on FREE verts only
2. Hard        face, pole, explicit pins
3. Soft C      stretch / area with α(τ)     (Gauss–Seidel / XPBD)
4. Energy      one ARAP local + Jacobi
5. Re-assert   hard again (stretch must not drift a welded vert)
```

Igarashi: few hard handles, interior is energy. Sorkine: handles are Dirichlet rows. Müller: project C one by one. Macklin: α makes stiffness independent of dt.

## 6. INVARIANTS

- Hard set is tiny: face + pole + pins. Not the whole cage.
- φ=φ̄ and no pins ⇒ tick is identity.
- Stretch never moves a hard vert.
- One φ. The 512 only reads the rim.

## 7. FAILURE MODES

- KV on locked verts → ARAP is a no-op.
- Stretch after ARAP at α=0 → cells smear, rotations die.
- Face band too wide → blade welded, only the shaft lives.
- All-rim Dirichlet → blend shape.
- Gait as post-pose → second writer. The stack is a lie.

## 8. UNCERTAINTY

- XPBD stretch+ARAP vs Igarashi energy-only for a held paddle.
- Shrink face lock to fixture UV (eyes/mouth) vs the current v-band.
- Gauss–Seidel count at L2 vs 60 fps.

## 9. TESTS

- Identity: no pins, φ=φ̄ ⇒ max|Δφ|=0.
- Hard: face |φ−φ*|=0 after tick. Stretch did not move them.
- Soft pin: one rim +8, neighbors move, face |Δ|<2.
- KV-free: locked verts unchanged by predict.
- Order: re-assert hard after stretch.

## 10. IMPLEMENTATION

1. Explore only. Do not recut ArapSolver this receipt.
2. Next: name a ConstraintStack. Hard / stretch / ARAP / re-assert.
3. KV predict skips hard verts. τ → XPBD α. No stiffness knob.
4. Gait plants become two soft pins on φ. Delete stance post-pose.
5. Shrink face Dirichlet to fixture UV when Investigate says so.

## 11. THINKOPS

Residual: `kv-on-locked=arap`.
Dual killed: `weld-the-rim=fabric`. A paddle hold is φ̄, not 3920 Dirichlet verts.
