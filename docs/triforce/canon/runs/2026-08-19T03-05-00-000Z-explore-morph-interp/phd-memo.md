# Morph table interpolation — GASPER-ENVELOPE-001 E7

**Mode:** explore. No paint. Dual killed: `snap-id = interpolation`.

## What we have

`GASPER_ENVELOPE_MORPH` is four named rows. `envelopeMode()` returns **one row**. `__GASPER_ENVELOPE_MORPH__ = 'blowfish'` is a snap. `collapsePlants` is a boolean. The organism cannot be 40% puffed and 20% paddled.

`blendPointSets` already lerps the 512. That is the **retired** morph (E7: no second writer). `sampleRefractoryArc` is already the time-ease. Reuse it.

## The families (and which one is ours)

| Family | What it interpolates | Gasper? |
|---|---|---|
| **Parameter lerp** | the table columns, then resample | **Home.** 3-vector `(rScale, collapse, hook)` |
| **Log-radius** | `r(t) = r₀ (r₁/r₀)^t` | Optional on puff only. Constant-speed scale |
| **Barycentric** | weights on named rows, rest = 1−Σ | UI: mix several at once |
| **Regularity clamp** | after lerp, `|Δr| < L−ε` | Law. Every frame of the mix |
| **Refractory mix** | `sampleRefractoryArc` → the lerp | One clock. Do not grow another |
| **PSD / RBF** (Lewis 2000) | scattered examples in pose space | Later. Only after off-axis sculpts |
| **Slerp / DQS** (Shoemake / Kavan) | rotations / rigid motions | Already plant-yaw. Not puff |
| **Silhouette lerp** | 512 xy | **Illegal.** Two inks, not one body |

Lewis: sculpted targets live *anywhere* in pose space; the interpolator is scattered, not a spline on a grid. With **four axial presets** an RBF degenerates to the 3-axis lerp. Do not pay for RBF until a fifth row exists that is not on an axis (blowfish+paddle as a real sculpt).

Kavan DQS avoids volume collapse when **blending rotations**. Blowfish is isotropic scale. Paddle is plant translation. There is no rotation to slerp. Dual: `slerp = puff`.

Shoemake slerp is already the right tool for **plant-yaw** (`R_Y(θ)`). Keep it there.

## Regularity during a mix

Uniform `rScale` **preserves** `σ = (r_B−r_A)/L`. Mixing scale with plant collapse **changes L** while `Δr` stays, so `|σ|` can cross 1 in the middle of the blend and the canal dies (cusp / flip).

Law: compose the 3-vector, pose the five nodes, **then** clamp `|r_B−r_A| < L−0.5` on every bone. Shrink `r`, never stretch `L`. FACE_CANON does not move.

## Lawful interpolator

```
preset  →  3-vector (rScale, collapse, hook)
mix     →  lerp or barycentric of vectors
time    →  sampleRefractoryArc (already in the house)
pose    →  poseSkeleton(vector)
clamp   →  |Δr| < L−ε
ink     →  occupiedOutline  (one #body, one closedSpline)
```

Named ids stay as **presets**, not as the runtime state.

## Waves (when the owner says go)

1. Continuous 3-vector. Snap ids become presets. `collapsePlants ∈ [0,1]`.
2. Refractory mix between two presets. Regularity clamp. Film rest↔blowfish.
3. RBF/PSD only if we author an off-axis example.

Do not lerp `#body.d`. Do not revive `blendPointSets` as the envelope morph. Do not move the face.
