# CanonOps PHD — explore · disney-principled

Earned under N20 / N335.
Date: 2026-08-17T01:25:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-17T01-25-00-000Z-explore-disney-principled
Parents: pbr-shader · subsurface-scattering · anisotropic-reflections

## 1. THE WALL

We have a pile of material knobs and three prior packets. They do not speak one language. `roughness` and `clearcoat` exist. They used to dim him. GGX now eats roughness. SSS and aniso are packets, not layers. Dual: **`dimmer-stack = principled-layer-stack`**.

Disney named this in 2012 so a studio could stop inventing a new shader per show. That is the residual.

## 2. WHAT “PRINCIPLED” MEANS

Burley, SIGGRAPH 2012, then 2015:

- One artist dialect over Cook–Torrance + a designed diffuse.
- Knobs lerp the way an artist expects. Blending two materials stays sane.
- Fit to MERL. Shipped on *Wreck-It Ralph*.
- 2015 adds a real BSSRDF and thin / transmission. That is a BSDF, not a new brand.

It is **not** new physics. It is the *name* of the stack we have been earning piece by piece.

## 3. THE ELEVEN + FOUR

**2012 BRDF**

| Knob | Law | Gasper |
|---|---|---|
| baseColor | albedo | pearl intensity on existing violet/cyan |
| subsurface | 2012 = fake shape mix | **use 2015 instead** (SSS packet) |
| metallic | no diffuse, F0=albedo | **locked 0** |
| specular | F0 scale (0.5 ≈ 4%) | missing; F0 hard 0.04 |
| specularTint | hue toward base | **forbidden D-0033** |
| roughness | α = r² | bound, live in GGX |
| anisotropic | αx ≠ αy | packet; source = φ stretch |
| sheen | cloth grazing | omit. not gel |
| sheenTint | hue | **forbidden** |
| clearcoat | second lobe, F0=0.04 | bound, live fragment |
| clearcoatGloss | α_coat | missing; fixed 0.1 |

**2015 BSDF**

| Knob | Law | Gasper |
|---|---|---|
| scatterDistance | ld | absorption becomes σa when SSS lands |
| specTrans | glass | **0. opaque** |
| ior | F0 from n | implicit 1.5 |
| thin | thin-wall / multipole | W legs |

## 4. DIFFUSE — THE MISSING LAW

Live: `Lambert × (1−F)`.

Disney:

```
F90 = 0.5 + 2 r (h·L)²
fd  = (base/π) (1+(F90−1)(1−nL)⁵)(1+(F90−1)(1−nV)⁵)
```

Retro at grazing. Optional. Dark pearl may not need it. If SSS is live, **SSS occupies this slot**. Do not run both.

## 5. HOW THE THREE PACKETS SIT

```
I = M_sss          # 2015 subsurface  (or Burley/Lambert if SSS gain 0)
  + f_s(αx,αy)     # 2012 specular, aniso from stretch
  + f_coat         # 2012 clearcoat, always isotropic
```

- **pbr-shader** = the Cook–Torrance law.
- **anisotropic-reflections** = the anisotropic knob, sourced from φ.
- **subsurface-scattering** = the 2015 volume slot.
- **this packet** = the dialect that names them and forbids the rest.

## 6. PHYSICAL vs ARTISTIC

Physical: energy-bounded layers. Roughness widens D. Coat is a second D. Metallic would delete diffuse. Stretch induces aniso. ScatterDistance is σa.

Artistic: dark pearl, no chrome, no hue tints, no cloth sheen, no glass, rest isotropic, face off this organ, knobs keep their Gasper names but must mean layers.

## 7. NOT THIS RECEIPT

Explore only. Painter not recut.

If Work: do **not** add every Disney knob. Adopt the dialect. Keep the lawful live set (roughness, clearcoat, pearl, absorption). Leave metallic / tints / sheen / specTrans off the UI. Optional: Burley diffuse, clearcoatGloss, specular-as-F0. Plug SSS and aniso in when those Works land. Delete remaining opacity-as-material.
