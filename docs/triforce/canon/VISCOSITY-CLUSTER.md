# Viscosity cluster — promoted corpus (2026-08-16)

Engine: Tri-Force 3.0.0. Not a chat-PASS. Picture still reviews on the dais.

## Residual

One τ on the whole pearl smears a posed plant. Damping, Weight, and Plant were one casual name.

## Earned law

| Organ | Parameter | Picture | Slider |
|---|---|---|---|
| Weight | τ_swing = viscoTau (default 0.25 s) | Swing arrives late (~66° at 1.43 Hz) | Weight |
| Plant | τ = 0.02 s · E-ratio 12.5 if η shared | Floor sits | none |
| Settle | CoM cLow 1.8 / cHigh 0.6 · ζ ≈ 0.28 | Bubble after a dart dies | none (N37) |

Kelvin–Voigt: we integrate `τ = η/E` only. No `E` slider. No `η` slider. He is Voigt (creeps to a shape), not Maxwell (relaxes to zero).

## Cut in the painter

`_lp` (all-script-3.js, N348):

```
tau_i = viscoTau + w · (0.02 − viscoTau)
w     = gauss(th, thPlant, 0.16) · (1 − chinKeep) · lower
```

Same `w` as pose. Rest (`supportSide === 0`) keeps one τ. Drag snaps. Face unspecialized.

## Packets

| Mode | Residual | Path |
|---|---|---|
| Explore | viscosity-tuning | `runs/2026-08-16T16-16-00-000Z-explore-viscosity-tuning` |
| Investigate | plant-gated-tau | `runs/2026-08-16T16-20-00-000Z-investigate-plant-gated-tau` |
| Explore | viscoelastic-damping | `runs/2026-08-16T16-24-00-000Z-explore-viscoelastic-damping` |
| Investigate | kelvin-voigt-params | `runs/2026-08-16T16-26-00-000Z-investigate-kelvin-voigt-params` |

Related: `w-unhook`, `skate-no-swing`, `weight-transfer`, N347 intro floor lock.

## Invariants

- Do not delete `_lp`. Do not set τ = 0.
- Do not add kelvin_E / kelvin_eta / a W-rig / a stiffness field.
- Do not raise c to harden the W. Do not raise τ to kill the bubble.
- One writer. One contour.
