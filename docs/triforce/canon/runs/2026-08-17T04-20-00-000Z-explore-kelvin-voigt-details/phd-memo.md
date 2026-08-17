# Explore — `kelvin-voigt-details`

Earned under N20 / N335. Engine 3.0.0.
Parent: `uniform-lp`. Prior: `kelvin-voigt-params` (two-τ world).

## 1. THE WALL

Textbook KV is a spring parallel to a dashpot. We integrate one number: `τ = η/E`.

The old packet owned **two** times (`0.02` / `0.25`) and called the ratio **12.5**. The lock now owns **four**. Live `_lp` already mixes them. This Explore names the model so the next cut is not another τ.

## 2. THE ELEMENT

```
        σ
        │
   ┌────┴────┐
   │         │
   E         η      Kelvin–Voigt  (parallel)
   │         │
   └────┬────┘
        │
       ground
```

`σ = E ε + η ε̇`. Retardation time `τ = η/E`.

Under a held target shape `x*` the analog ODE is

```
ẋ = (x* − x) / τ
```

Exact step (what `_lp` already is):

```
x ← x + (x* − x) (1 − e^{−dt/τ})
```

He **creeps to a shape**. Bounded. Recovers when `x*` goes home.

## 3. WHAT HE IS NOT

| Model | Picture | Why not |
|---|---|---|
| **Maxwell** (series) | Relaxes to 0. Creeps forever. | Melt. Forbidden. |
| **Zener / SLS** | Instant hop + creep + residual | Third constant. Forbidden sliders. |
| **τ = 0** | `sa = 1` | Snap. Pixel buzz. |
| **One τ = 0.25** | Plant crawls with swing | `uniform-lp`. Killed last turn. |

Wikipedia’s “KV relaxes after release” is **recovery to zero strain**, not Maxwell stress-decay. Do not cite it as puddle.

## 4. FOUR TIMES, ONE GEL

If `η` is shared (one organism): `E_a / E_b = τ_b / τ_a`.

| Organ | τ (s) | `E_plant / E` | φ @ 1.43 Hz | sa @ 60 / 120 | 63% frames @ 60 |
|---|---|---|---|---|---|
| Plant | **0.02** | 1 | 10.2° | 0.565 / 0.341 | 1.2 |
| Swing | **0.07** | **3.5** | 32.2° | 0.212 / 0.112 | 4.2 |
| Fabric | **0.12** | 6 | 47.2° | 0.130 / 0.067 | 7.2 |
| Weight (slider) | 0.25 | 12.5 | 66.0° | 0.065 / 0.033 | 15 |
| Rest | **0.42** | 21 | 75.2° | 0.039 / 0.020 | 25 |

The **12.5** from the old packet is plant vs **Weight**, not plant vs **swing**. Swing is **3.5×** softer than plant. That is the leave.

## 5. LIVE CUT (already written)

```
τ = REST                          if restHold
  = stance.tau mix                if gait and wL+wR > 0.05
  = viscoTau + w (0.02 − viscoTau) otherwise
```

Stance publishes plant `0.02` / swing `0.07`. Rest sockets publish `0.42`. Snap flag is consumed and cleared.

Weight (`viscoTau`) only tints verts the W gauss does not own. It must not override `stance.tau`.

## 6. WHAT THIS DOES NOT FIX

`_lp` still lives on the **512**. The 25×40 does not integrate. Next residual is `cage-writes-hull`, not a fifth τ.

Mesh points without `th` take swing/gated, so interior rings may not plant-glue. That is a mapping bug, not a missing `E`.

## 7. DO NOT

- Add `kelvin_E` / `kelvin_eta` / Zener.
- Put 12.5 back as the plant/swing story.
- Flip `applyFabricSnap` at rest (pizza-POS).
- Raise CoM `c` to harden the W.
- Recut this Explore into a slider.

## 8. PROOF OF THE MODEL (not a new feature)

Strut: plant tracks in ~2 frames, swing lags ~8 @ 120 fps, cleft holds. Rest: τ `0.42`, W does not breathe. If both feet leave together, `_lp` went global again.
