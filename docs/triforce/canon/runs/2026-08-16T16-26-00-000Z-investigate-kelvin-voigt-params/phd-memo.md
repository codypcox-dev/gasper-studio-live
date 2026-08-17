# CanonOps PHD — investigate · kelvin-voigt-params

Earned under N20 / N335.
Date: 2026-08-16T16:26:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T16-26-00-000Z-investigate-kelvin-voigt-params

## 1. THE WALL

Textbook KV has `E` and `η`. Gasper only integrates `τ = η/E`. Two sliders would fake a ratio. Plant stiffness is an **E-ratio**, not a new dashpot.

## 2. QUESTION

Which parameters do we actually have, what do 0.02 and 0.25 mean, and what must never become a slider?

## 3. VERDICT

**We own τ only.**

| Symbol | Role | Value |
|---|---|---|
| τ_swing | Weight | viscoTau, default 0.25 s |
| τ_plant | Floor | 0.02 s, not a slider |
| η | Shared dashpot | implied, not stored |
| E_plant / E_swing | Contact vs free | **12.5** if η shared |
| E, η, ζ_KV as knobs | — | **forbidden** |

Gate `E` (by lowering τ at the plant). Do not drop `η` (that makes a watery foot).

## 4. PHASE (why 0.25 already matters)

`φ = atan(2π f τ)`. At ~1.43 Hz strut:

- swing 0.25 s → **~66° late** (weight)
- plant 0.02 s → **~10°** (tracks)
- Weight 0.50 s → **~77°** (taffy)

## 5. DISCRETE CHECK (60 fps)

- `sa(0.25) ≈ 0.065` — the authored ~15× first-frame cut
- `sa(0.02) ≈ 0.565` — still kills half a pixel-flip
- `sa(0) = 1` — snap, buzz returns

## 6. FIX SPEC (not written this receipt)

When Approve writes `_lp`: `tau_i = viscoTau + w*(0.02 − viscoTau)`. Comment the 12.5× E-ratio. No `kelvin_E`. No `kelvin_eta`. Atlas: Weight τ · Plant ×12.5 · Settle ζ.
