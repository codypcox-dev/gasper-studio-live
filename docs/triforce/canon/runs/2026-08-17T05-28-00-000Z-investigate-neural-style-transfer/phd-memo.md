# Investigate — `neural-style-transfer`

Earned under N20 / N335. Engine 3.0.0.
Parent: caged-hull · looks API. Not a raster cut.

## 1. THE WALL

Neural style transfer matches **pixels** to a painting. Gasper is a **vector organism**. Running Gatys on a screenshot would give us a second body — the same crime as cosmic cells and a WebGL sandwich.

## 2. WHAT NST ACTUALLY MATCHES

Gatys (2015/16):

```
I* = argmin_I   α ‖F(I) − F(I_c)‖²   +   β Σ_ℓ ‖G^ℓ(I) − G^ℓ(I_s)‖²
```

- **Content** `F` = VGG activations (where things are).
- **Style** `G` = Gram matrices of those activations (channel correlations — “does it look like Van Gogh,” not “where is the W”).
- Solver: hundreds of steps on a raster. Seconds to minutes. Not 16 ms.

Then the field sped up, still in pixel space:

| Method | What it is | Frame-legal? | Emits |
|---|---|---|---|
| Gatys opt | Per-image GD | No | PNG |
| Johnson 2016 | One net per style | Maybe | PNG |
| **AdaIN 2017** | Match `μ, σ` of feature maps | Yes, raster | PNG |
| Diffusion / CLIP | Semantic stylize | No | PNG |

AdaIN is the honest core:

```
AdaIN(F_c, F_s) = σ_s · (F_c − μ_c) / σ_c  +  μ_s
```

That is **moment matching**. On a CNN feature map it is style transfer. On a 1000-float field it is just scaling a look. On a screenshot of Gasper it is vandalism.

Vector NST papers (2023): the same losses barely move a path drawing. The style *is* the paths.

## 3. THE MAPPING ONTO GASPER

| NST word | Lawful Gasper object |
|---|---|
| Content image `I_c` | Cage `C = Γ(L) + Σ s_i` + face lock |
| Style image `I_s` | A **saved look** (1000 floats + material packet) |
| Gram / AdaIN | Material moments: pearl, clearcoat, rim, key, optical depth; optional `μ,σ` on the 1000 |
| Stylizer | `loadLook` / `saveLook` (already live) |
| Output `I_t` | Same 512 / 25×40, new embedding + stops |

Canonical pearl is **identity**, not a style. You do not Van Gogh the urethane. A look may tint inside the violet well. It may not change species.

## 4. WHAT WE WILL NOT DO

- VGG / ONNX / diffusion in the painter.
- Screenshot → stylize → `<image>` under `#body`.
- `mix-blend-mode: screen` as “style” (already banned).
- Style-image upload.

## 5. WHAT WE ALREADY HAVE

`GasperField.saveLook` / `loadLook` stores the 1000-float embedding. That *is* style transfer for this organism: content = live cage, style = the look, output = the same topology.

## 6. IMPLEMENTATION

Investigate only. No painter cut.

Next implement, if asked: AdaIN **on the 1000-float relief/shade field** between two looks. Still no CNN.

## 7. TESTS

- No `vgg` / `onnx` / `tensorflow` in live painter deps.
- No `<image>` as the hull.
- Looks remain floats, not PNG, not `d`.
