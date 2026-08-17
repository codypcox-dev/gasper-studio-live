# CanonOps PHD — explore · subsurface-scattering

Earned under N20 / N335.
Date: 2026-08-16T23:31:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

The body looks volumetric because someone painted a volume. Cyan reservoir, inset pearl/violet cores, three `#subsurface-band-*` ellipses, `DEPTH_GLOW`, and a slider named `absorption` are looks. `absorption` is `1 − 0.32a` on intensity. That is a dimmer. Beer–Lambert is `exp(−σa s)`.

`shadeCagePoints` now gives every dermis vertex a real `n̂ · L`. That is **irradiance at the entry point**. It does not leave anywhere else. Goose follicles therefore sit as glued hemispheres. Dual to name: `painted-volume = scattering`.

## 2. THE LAW (RTE → BSSRDF)

In a participating medium:

```
ω · ∇L = −σt L + σs ∫ p(ω′,ω) L dω′ + Q
σt = σs + σa
σs′ = σs (1 − g)          # reduced (Henyey–Greenstein g)
α′  = σs′ / (σs′ + σa)
σtr = √( 3 σa (σa + σs′) )
ld  = 1 / σtr             # diffusion length
```

A **BRDF** is local: same point in and out. A **BSSRDF** `S(xi, ωi, xo, ωo)` is the organism — light enters at `i`, random-walks, exits at `o`.

Jensen, Marschner, Levoy, Hanrahan (SIGGRAPH 2001) close the multiple-scatter part with a **dipole**: a real source a reduced mean free path *below* the surface and a virtual source *above* so the extrapolated boundary stays dark. Radial profile `Rd(r)` falls as a pair of decaying `exp(−σtr d) / d²` terms. Assumptions: optically thick, `σs ≫ σa`, locally flat, semi-infinite slab.

Energy: `∫ 2π r Rd(r) dr` equals the reduced albedo (minus diffuse Fresnel). If the integral is not conserved, the pearl gains or loses light for free.

## 3. WHAT BREAKS THE DIPOLE

| Regime | Why dipole lies | Lawful next |
|---|---|---|
| Thin (W legs, nubs) | Semi-infinite slab is false | Multipole (Donner–Jensen 2005) or thickness-scaled `ld` |
| Near the source (a follicle spec) | Diffusion ignores the first bounce | Single-scatter term, or quantized diffusion (d'Eon 2011) |
| Strong absorption (dark pearl) | `σs ≫ σa` is weak | Shorter `ld`; do not fake it with a dimmer |
| Spectral | Tissue: red `σa` is smaller → red travels ~16 mm | On Gasper: **cyan is the long channel**, pearl/violet the short. D-0033: no new hue |

## 4. PRODUCTION APPROXIMATIONS (what actually ships)

| Model | Move | Live? |
|---|---|---|
| Jensen dipole | Analytic `Rd(r)` | No |
| Donner–Jensen multipole | Thin / layered | No |
| d'Eon Gaussian fit (GPU Gems 3) | `Rd ≈ Σ wi G(vi, r)` | No |
| Jimenez separable SSS | Irradiance texture → U then V Gaussians → weighted sum | No — **but the 25×40 is already that texture** |
| Burley 2015/16 normalized diffusion | Artist `d` + albedo; `∫Rd = 1` | No. Pixar/Disney. |
| Path-traced volume | Full RTE | Forbidden. No volume mesh. SVG. |
| Painted bands + cyan ellipse | Opacity from 2D `n·L` | **Live. Not transport.** |

Jimenez is the lawful real-time fit: two or three Gaussians, separable on the cage (ring, then sector, sector wraps). Stretch-correct by local polar Jacobian so poles do not smear. That is the same stretch reason `dermisMask` exists.

## 5. WHAT THE CAGE ALREADY IS

```
E_i = n̂_i · L          # shadeCagePoints, surface
M_j = Σ_i E_i Rd(‖x_j − x_i‖) A_i
```

`E` exists. `Rd` does not. Distance on the dermis is the hex/cube metric (prior Explore) or polar-UV with stretch. Screen distance after the idleRig rotate is a lie (highlights glued again).

Thickness for the W: chord through the 512 at that `u`, not a 3D SDF. Thin → shorter profile → less bleed, a little transmit. That is the opposite of the current flatten-and-shade.

`absorption` today is a gain. Lawful: it is `σa`. It shrinks `ld`. Doubling it must *localize* the glow, not dim the whole pearl.

## 6. PHYSICAL vs ARTISTIC

Physical: energy that enters leaves nearby or is absorbed. Follicles bloom. Lee of a lit cheek is not black. Thin parts transmit.

Artistic: dark pearl, cyan well, violet core, intensity-only, pupil-less face off this organ, 1000 stays 1000, gain 0 = today's painted look (reversible).

The three subsurface bands may stay as jewelry. They are not the BSSRDF.

## 7. NOT THIS RECEIPT

Explore only. Painter not recut. Next Investigate / Work, if wanted: `E` buffer → two separable Gaussians on 25×40 → write `M` into cyan / inner volume. Do not path-trace. Do not remesh. Do not invent red.
