# Investigate — `uniform-lp`

Two adversaries agreed. Residual is not gloss and not a missing cage module.

## Wall

The northstar run looks non-viscous because **`_lp` is a global chew**.

- Stance sockets write a W (`0.02` plant / `0.07` swing).
- `_lp` then eases every contour point with `viscoTau = 0.25`.
- Plant should glue in ~2 frames (`k≈0.56` at 60fps). It crawls for ~15.
- Swing should leave late. It leaves with the plant. Cleft fills. Pad.

`FabricSolver.compose` already builds a per-vert τ field. `applyFabricSnap` ticks it and **throws the result away** at `morph==='rest'`. Twin, not master.

## Law

Kelvin–Voigt. We integrate `τ = η/E` only.

```
τ_i = REST · restHold + (1 − restHold) · (SWING + w · (PLANT − SWING))
w   = gauss(th, thPlant, 0.16) · (1 − chinKeep) · lower
```

| | τ | picture |
|---|---|---|
| Plant | 0.02 | sits |
| Swing | 0.07 | leaves, air gap |
| Rest | 0.42 | hold |
| Fabric | 0.12 | non-W live verts |

Same `w` as pose. One law, two readers (xy + τ).

## Duals we will not touch this cut

- `applyFabricSnap` at rest (pizza-POS if flipped)
- `walkScaffoldZ` under physics-authority (second walk)
- LIGHT_RIG / ribbons
- New `CageTau.ts`

## Proof

Strut: `S.left.tau` and `S.right.tau` swap `0.02`/`0.07`. Plant foot tracks in ≤4 frames. Swing lags. Cleft ≥10. Rest `_lp` uses `0.42`.
