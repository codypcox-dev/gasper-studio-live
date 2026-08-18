# Investigate — `leg-shear-dual-foot`

Earned under N20 / N335. Engine 3.0.0.
Parent: Adobe 2.5D lock · KV plant/swing · ARAP handles.

## 1. THE WALL

Spikey leg shear is not missing `skewX`. It is a **boolean plant-swap** written after the polar hypot. One `side` bit exchanges both feet. Adjacent rim points take different gaussians of two jumping handles. That is a spike.

## 2. RESEARCH WE ALREADY HAD

| Memo | Law |
|---|---|
| Adobe 2.5D | Shell `skewX=0`. Plant is sockets + Voigt, not a parallelogram. |
| mesh-deform-physics | Two writers (sockets after φ) — the blob wins. Hull is the mesh. |
| ARAP constraints | Gait plants are **two soft handles on the rim**, not stance sockets after φ. |
| uniform-lp / KV | τ is damper on a DOF. Plant 0.02 / swing 0.07. Independent τ without neighbors shears meridians. |
| SupportExchange | `hold = tanh(k·cos(φ/2))` is already C∞ and 4π-periodic. |

## 3. THE MODEL

```
hold(φ)     = tanh(k · cos(φ/2))     k = 2φ²
leave_L     = ½ (1 + hold) · live
leave_R     = ½ (1 − hold) · live
left.xy     = rest + splay_L · leave_L
right.xy    = rest + splay_R · leave_R
```

- Side is **telemetry**. It does not author pose when φ exists.
- Do not wrap φ into 2π before hold (2π is the other foot, not the same sticker).
- After handles: 2 Jacobi steps on the lower rim, **except** the two foot peaks. Neighbor energy. Not a second silhouette.

## 4. FORBIDDEN

- `plantR = side > 0` swapping both sockets
- `min(22,|θ|)` as a fold (already locked)
- `stepSkewDeg` while stance is live
- `walkScaffoldZ` / flatten as a second W while sockets live

## 6. THE 2π SPIKE (found on film)

`setPerformanceGait` re-ran every 0.5s (take sustain) and reset `gaitPhase = 0`. hold(2π) = −1, hold(0) = +1. One frame, 14 px, both feet swap. That *was* the shear.

Law: prime φ only on the **first stroke**. Sustain updates cadence, not the clock.

