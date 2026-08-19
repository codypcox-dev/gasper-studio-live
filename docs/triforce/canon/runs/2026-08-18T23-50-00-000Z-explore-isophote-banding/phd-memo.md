# CanonOps PHD — explore · isophote-banding

Earned under N20 / N335.
Date: 2026-08-18T23:50:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-18T23-50-00-000Z-explore-isophote-banding
Parents: urethane-to-vector · pbr-shader · disney-principled · medial-fabric

## 1. THE WALL

The urethane packet named “isophote bands” as the painter and then described this:

```
band k = { quads whose mean E ∈ [t_k, t_{k+1}) }
union those quads → one path
```

That is **quad-binning**. It is not an isophote. The band edge follows the 25×40, so the cage shows through as stained glass. Six bins of n·L is cel-shading. Dual: **`quad-bin = isophote`**. Dual also killed: **`isophote-band = cel-step`**.

A glossy urethane does not have six posters. It has a *smooth body turn* and *one thin coat highlight*. CAD has been drawing those curves since 1984 to judge whether a surface is even legal.

## 2. THREE CURVES PEOPLE CONFUSE

| Curve | Definition | What it sees | Gasper slot |
|---|---|---|---|
| **Isophote** (Poeschl 1984) | `{ P : n̂(P) · L = c }` | Equal illuminance. Subtle ripples on gentle curves. | Body turn (`E` or `f_base`) |
| **Highlight / zebra / reflection line** | Reflection of a linear (or circular) light. Theisel 2001: *not* the same class as isophotes. | Long-run fairness, patch joins, Class-A. | Coat (`S_coat` or `n·H`) |
| **Isoparametric** | Constant `u` or `v` on the chart | The grid itself | Overlay toggle only |

Theisel (CAD 2001): isophotes and reflection lines are different, not disjoint. A car-paint highlight is closer to a reflection line. A gel body turn is an isophote. **Two scalars. Two extractors. Do not dump E and S into one ramp.**

If those curves *kink*, the surface has a G1/G2 break. On Gasper that kink is the pizza chart through the W — the medial-fabric residual — not a missing blur. Painter cannot hide a broken controller. M1 still before M2.

## 3. THE EXTRACTION LAW

A 25×40 scalar field `φ[r,s]` (periodic in `s`).

**Isoline** (one value `c`): marching squares (Lorensen–Cline cousin).

- Each cell: 4 corners → 4-bit case 0..15.
- Edge crossing by linear interpolation:

```
t = (c − φ_a) / (φ_b − φ_a)
P  = (1−t) A + t B
```

- Saddle (cases 5 and 10): resolve by the center sample `(φ_00+φ_10+φ_01+φ_11)/4`. Asymptotic decider. Do not pick at random — flicker.

**Isoband** (between `c0` and `c1`): the filled region. Corners are ternary (below / inside / above) → more cases than 16. Output is closed polygons, not polylines. Wikipedia: “isobands — filled areas between isolines.” This is the primitive we paint.

**Quad-bin (refused):** a cell is all-in or all-out. The boundary is the cage edge. That is stained glass. Dual already named.

Wrap: sector `0` shares an edge with sector `39`. Ring 24 is the 512; do not contour past it. `z<0` cells (back hemisphere) stay out of every band.

## 4. HOW MANY BANDS (artistic law)

Cel / Decaudin / toon = a step function on `n·L`. That is a *look*. It is not urethane.

Gooch 1998 (cool-to-warm) is a *continuous* ramp on `n·L ∈ [−1,1]`. No posters. Useful as a mental model for the body: keep form in the terminator. Not a new hue (D-0033) — cool/warm stay inside the pearl hex.

Lawful count for Gasper:

| Layer | Scalar | Bands | Feather | Area at rest |
|---|---|---|---|---|
| SSS under | `E` blurred (Jimenez) | 1 fill | σ ≈ 6–8 px | full hull, opacity 0.08–0.12 |
| Body turn | `f_base` or `E` | **2 isobands**, overlapped | σ ≈ 4–6 px | they must read as a ramp, not posters |
| Coat | `S_coat` (GGX, α≈0.06) | **1 isoband** above a high `c` | σ ≈ 1.5–2.5 px | 6–10% of front area |
| Fresnel rim | Schlick on `n·V` | *not a stroke* | last body isoband climbs | — |

Four DOM nodes plus `#body` as the darkest base. Not 6–8. Not 960.

Body thresholds are **fixed in value space**, e.g. `E ∈ [0.15, 0.45)` and `E ∈ [0.45, 1]`. Percentile / histogram thresholds swim when the W plants. Forbidden.

Coat threshold is fixed on `S_coat` (e.g. `> 0.55 × specGain`). The existing `_cageSpecSm` EMA stays as the centroid diagnostic, not as the band.

## 5. TEMPORAL COHERENCE

Marching squares on a live field *pops* when a corner crosses `c`.

| Fix | Lawful? |
|---|---|
| Fixed value thresholds | Yes |
| EMA the scalar: `φ ← 0.65 φ + 0.35 φ_now` | Yes, one frame of smear |
| Hysteresis (±ε around `c`) | Yes for the coat |
| Rank / percentile bands | **No** — swim |
| Change band count mid-take | **No** |
| Re-extract topology every frame from scratch | Yes *if* thresholds are fixed; the polygons will slide, not pop |

If the coat isoband splits into two islands under yaw, that is legal (two lobes, two lights). Do not force a single blob. The overlay-ellipse packet already died for that reason.

## 6. SVG RECONSTRUCTION

Marching-squares isoband → 1..N closed rings (outer + holes if a band is an annulus around the coat).

```
<path d="M…Z  M…Z" fill="pearlHex(mid)" clip-path="url(#bodyClip)"/>
```

Feather is a filter, not a second painter:

```
<filter id="isoFeather">
  <feGaussianBlur stdDeviation="4.5"/>
</filter>
```

Coat uses a tighter blur. SSS uses a wider one. Do **not** blur 960 quads and call it an isophote.

`<meshGradient>` / Coons (Sun 2007, Tavmjong 2012) is still the gold *continuous* reconstruction. Chromium does not paint it. Isobands are the SVG-native stand-in. A canvas `<image>` of the same `φ` remains last resort, not the claim.

## 7. PHYSICAL vs ARTISTIC

| Physical | Artistic |
|---|---|
| Isophote = level set of n·L | 2 body isobands, pearl hex lock |
| Coat = highlight region of GGX_coat | 1 thin band, 6–10% area, spec stays white-violet |
| Linear interpolation of crossings | Feather σ so C0 reads C1 |
| Saddle decider = center sample | Hidden |
| Kinked isophotes ⇒ G1 break in the cage | Do not “fix” with more blur; fix the fabric |

## 8. FAILURE MODES

- **Union of quads.** Stained glass. Dual killed.
- **Six equal E-steps.** Cel. Dual killed.
- **One scalar for body and coat.** Coat becomes a brighter poster, not varnish.
- **Percentile bands.** Swim on plant.
- **Blur the 960.** Facets under milk. Already refused.
- **White `#body` stroke as the Fresnel isophote.** A stroke is not a level set.
- **Force one coat island.** Second light is a second island.
- **Paint bands before the chart is medial.** Isophotes will pizza through the W and look like a cracked toy. That is a *correct diagnostic*. Do not mute it with blur.

## 9. TESTS

- Painter DOM nodes ≤ 6 (sss + 2 body + coat + optional rim). Unique fills ≤ 6.
- No band edge coincides with a cage edge for more than 3 consecutive samples (proves interpolation, not quad-bin).
- Yaw 0→40: coat isoband centroid travels ≥ 12 px. Band count stays 1 or splits to 2, never 0 and never 6.
- Rest: vision must not say “cel / poster / stained glass / facets.”
- Grid OFF: organism still reads glossy. Grid ON: dots do not add light.
- W / calves receive body isobands (not a dead pad). If they *kink*, that is an M1 fail, not an M2 fail.
- No pixel with (r,g,b) all > 200.

## 10. IMPLEMENTATION (not this deposit)

1. Keep `shadeCagePoints`. Publish `E` and `S_coat` as two `Float32Array(1000)`.
2. `marchIsoband(φ, c0, c1)` on the 25×40 torus-in-u. Wrap `s`. Skip `z<0`.
3. `paintUrethaneBands` = SSS fill + 2 body isobands + 1 coat isoband. Kill `paintCageFill` in the same commit.
4. `#body` stroke opacity 0.
5. Do not touch `bindHullToLiveGrid` here. If the W isophotes kink, that is the medial-fabric packet doing its job.

## 11. SOURCES

- Poeschl, *Detecting surface irregularities using isophotes*, CAD 1984
- Theisel, *Are isophotes and reflection lines the same?*, CAGD 2001
- Patrikalakis–Maekawa–Cho, MIT hyperbook §8.1.2 (reflection lines)
- Novedge, *Surface Interrogation in CAD* (zebra / Class-A history)
- Lorensen & Cline, Marching Cubes, SIGGRAPH 1987; marching squares / isobands (Wikipedia; Nils Olovsson)
- Gooch, Gooch, Shirley, Cohen, *A Non-Photorealistic Lighting Model for Automatic Technical Illustration*, SIGGRAPH 1998
- Decaudin / Sayeed NPR surveys (cel as stepped n·L — the look we refuse)
- Sun et al., gradient meshes, SIGGRAPH 2007
- Live: urethane-to-vector, pbr-shader, disney-principled, medial-fabric
- Live painter: `shadeCagePoints`, `paintCageFill`, `_cageSpecSm`
