# CanonOps PHD — explore · viscosity-tuning

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T16:16:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T16-16-00-000Z-explore-viscosity-tuning

## 1. THE WALL

viscoTau is one number on the whole pearl. Planted nubs stay clay. Tuning Weight makes him heavier everywhere, including the floor lock the intro just demanded.

## 2. QUESTION

What viscosity organs already exist, what do they own, and what must be split so a planted W can be stiff?

## 3. COORDINATE SPACES

Contour low-pass lives in content px after pose, before paint. τ seconds. `sa = 1 − exp(−dt/τ)`. Default 0.25 s. Range 0.02–1.0. Separate: MOMENTUM_RIG CoM damper (N37). Kernel plant is world u; painter then smears x/y.

## 4. PHYSICAL LAW

- Kelvin–Voigt: one τ is homogeneous rubber. Planted contact is high E (τ → 0). Free limb is finite η (τ ~ 0.25 s).
- D-0018 low-pass kills 80 Hz buzz. It is not a gait writer. Face is not smoothed.
- N37 settle viscosity is CoM cLow/cHigh, not viscoTau.
- A world-locked plant that then shares the swing’s τ is unlocked by construction.

## 5. ARTISTIC LAW

- Weight = free-mass feel. Not floor grease.
- One pearl. Plant sits. Swing is soft.
- Keep motion bounciness (N37). Do not kill life to harden the plant.

## 6. INVARIANTS

- Do not delete D-0018.
- Do not raise global τ to fake a solid plant.
- Do not retune MOMENTUM_RIG to fix the W.
- No W-skeleton this receipt. Explore only.

## 7. TWO ORGANS (do not conflate)

| Organ | What it is | Slider today |
|---|---|---|
| Contour inertia (D-0018 / D-0022) | First-order low-pass on every hull x/y | Weight / visco_tau |
| CoM settle (N37) | Spring-damper on momentum offset | Not on the Weight slider |

## 8. NEXT

Investigate names the split: plant-gated τ vs per-vertex stiffness from supportSide. Fix only when earned: harden the loaded nub. Keep buzz-kill on the unspecialized hull. Name both organs on the atlas.
