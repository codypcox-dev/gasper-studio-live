# CanonOps PHD — explore · pbr-shader

Earned under N20 / N335.
Date: 2026-08-17T01:07:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-17T01-07-00-000Z-explore-pbr-shader
Parent: explore · subsurface-scattering (diffuse slot)

## 1. THE WALL

The cage now has real normals. What we put on them is still a 1970s mix:

```
I = 0.16 + 0.72 Σ max(0, n·L) + 0.35 Σ (n·H)^16
```

`roughness` (default 0.35) and `clearcoat` (0.42) are first-class bindings. They scale opacity: `1 − 0.18 r`. That is a dimmer. Dual to name: **`phong-blob = energy-conserving BRDF`**.

Facets on screen are a different residual (`shade-is-facets`). This packet is the energy law on each sample.

## 2. THE LAW (BRDF)

A BRDF is local — same point in and out. Energy:

```
∀ ωo,  ∫ f_r(ωi, ωo) (n·ωi) dωi  ≤  1
```

Cook–Torrance (1982):

```
f_s = D(h) G(n,L,V) F(h,V) / (4 (n·L) (n·V))
```

Production close (Disney 2012, Karis / UE4, glTF 2.0):

| Term | Lawful pick | Gasper |
|---|---|---|
| D | GGX / Trowbridge–Reitz | `α = roughness²` |
| G | Smith GGX | same α |
| F | Schlick | `F0 = 0.04` (dielectric gel) |
| Diffuse | Lambert × (1−F), or BSSRDF | SSS Explore occupies this slot |
| Metal | `F0 = albedo`, no diffuse | **Forbidden. metalness = 0.** |
| Coat | Second GGX, `F0=0.04`, `α≈0.1` | existing `clearcoat` amount |
| IBL | Split-sum env | **No env. Three analytic lights.** |

Schlick:

```
F(θ) = F0 + (1 − F0) (1 − cos θ)⁵
```

At grazing, even a rough gel mirrors. Today the rim is a third painted light. That is why the lee goes dead and the rim does not climb.

## 3. TWO WORKFLOWS — ONLY ONE IS OURS

| Dialect | Knobs | Lawful here? |
|---|---|---|
| Metallic–roughness (Disney / glTF / UE4) | baseColor, metallic, roughness | **Yes. metallic locked 0.** |
| Specular–glossiness | specular color + gloss | No. Breaks F0 discipline. |
| Full Disney 2012 | + sheen, clearcoat, anisotropic | Clearcoat yes. Sheen optional. Aniso no. |
| Path-traced / WebGL PBR | fragment shader | No. FormMaster is SVG. |

We already speak metallic–roughness. We just do not evaluate it.

## 4. WHAT IS LIVE

| Piece | Live? | Lawful? |
|---|---|---|
| `n̂` from φ | Yes | Yes |
| Three view-fixed lights | Yes | Yes |
| Lambert + Blinn^16 | Yes | No |
| `roughness` → D(α) | No — opacity | No |
| `clearcoat` → second lobe | No — opacity | No |
| Fresnel | LightRig has a rim-fresnel look | Not F |
| Env / IBL | No | And must stay no |
| SSS M | Packet only | Diffuse slot |
| FACE_CANON | Locked 72 / 38 / +28 | Off this organ |

## 5. PHYSICAL vs ARTISTIC

Physical: energy that hits a microfacet either reflects (F) or refracts into the pearl (1−F). Roughness widens D and must not raise energy. Grazing brightens by Fresnel, not by a rim slider alone.

Artistic: dark pearl, intensity-only, no chrome, no new hue, coat reads as gel, gain-gated identity, face untouched, 1000 stays 1000.

## 6. STACK WITH SSS

Prior Explore (`subsurface-scattering`):

```
E_i = n·L            # irradiance in
M_j = Σ E_i Rd(r)    # BSSRDF out  →  diffuse / cyan / pearl
```

This Explore:

```
f_s, f_coat          # local, same vertex
I = M_sss + f_s + f_coat
```

Do not run Lambert *and* SSS. Pick one diffuse. Specular stays local either way.

## 7. NOT THIS RECEIPT

Explore only. Painter not recut.

If Work: replace `shadeNormal` with GGX + Smith + Schlick. `α = r²`. `F0 = 0.04`. `metallic = 0`. Coat lobe from the existing slider. Delete `1 − 0.18 r`. No IBL. No WebGL. No metallic control.

Facets stay a later residual.
