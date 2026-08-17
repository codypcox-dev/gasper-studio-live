# CanonOps PHD — explore · hex-lattice

Earned under N20 / N335.
Date: 2026-08-16T22:55:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

Goose claims a hexagonal follicle lattice on the locked 25×40 cage. Live `hexPapule` is odd-r offset plus a Euclidean Gaussian in that offset plane. Polar UV is not that plane. `fu=8` does not land odd-row sites on vertices. Fine `18×11` does not tile the cage at all.

ThinkOps dual to name: `offset-UV-Euclidean = hex-lattice`.

## 2. COORDINATE SYSTEMS (Amit Patel / Red Blob)

| System | Stores | Computes | Live? |
|---|---|---|---|
| Offset odd-r (pointy) | `(col, row)` + half-step on odd rows | neighbors depend on parity | Yes — `hexPapule` |
| Axial `(q, r)` | two axes | vector add | No |
| Cube `(q, r, s)` `q+r+s=0` | three | distance, rotate, round | No |
| Doubled | even sum | uniform neighbors | No |

Law: **offset is layout, axial is storage, cube is arithmetic.** We stopped at layout.

Cube distance (the hex metric):

```
d = max(|Δq|, |Δr|, |Δs|) = (|Δq| + |Δr| + |Δs|) / 2
```

Euclidean-in-offset is not that. Odd-r neighbor lengths: east/west = 1, diagonal = √1.25 ≈ 1.118. Measured. Papules are taller than wide in UV before the polar map stretches them again.

Xiangguo Li continuous hex Euclidean (axial): `√(Δq² + Δr² + Δq·Δr)`. Lawful kernel if we stay continuous. Not live.

## 3. WHAT THE CAGE ACTUALLY IS

```
u = sector / 40     wraps
v = ring / 24       clamps (poles)
```

Dermis is a **cylinder band** (mask kills crown v<0.18 and feet v>0.92). A cylinder admits a perfect hex tiling. A closed sphere does not — Euler requires 12 pentagons (Goldberg / geodesic / HEALPix). We must not remesh toward an icosahedron. Topology stays 25×40.

Cylinder tiling is integer or it beats:

| Frequency | 40 / fu | odd-row step 20/fu | On-vertex? |
|---|---|---|---|
| 4 | 10 | 5 | yes |
| 5 | 8 | 4 | yes |
| **8 (live)** | 5 | **2.5** | even rows only (16/32) |
| **10** | 4 | 2 | yes (40/40) |
| 18 (live fine) | 2.22 | 1.11 | no (128/128 miss) |

Measured this receipt: `fu=8` odd-row sites sit at sector `n+0.5`. `collectGoosePapules` then `round`s them onto a neighbor vertex. Half the follicles are quantized one half-sector off their own peak.

`xAlt` wrap: 0 real hits on the 1000. Integer `fu` makes `x` and `x±fu` share a fractional part. Dead code.

## 4. ALGORITHMS (lawful on this cage)

| Algorithm | What it is | Lawful? | Live? |
|---|---|---|---|
| Odd-r offset layout | pointy rows = rings | Yes (cylinder) | Yes |
| Cube / axial arithmetic | distance, neighbors, rotate | Yes | No |
| Hex-metric Gaussian | `exp(−½ d_hex² / σ²)` | Yes | No — Euclidean offset |
| Li hex-Euclidean | `√(q²+r²+qr)` continuous | Yes | No |
| Dual triangular grain | vertices of the coarse hex | Yes — the lawful fine octave | No — 18×11 instead |
| Hex Voronoi basins | nearest-site assignment | Height only | No |
| Hex binning (d3-hexbin) | count into cells | Not paint | No |
| Cube wrap on `q` | cylinder period | Yes if `fu \| 20` | Fake `xAlt` |
| Geodesic / Goldberg / HEALPix | hex a sphere + 12 pentagons | **No** — remesh | No |
| Micro-tess from hex faces | grow tiles | **No** — shatter dual | Killed |

Two octaves: coarse sites on a tiling frequency (`fu ∈ {5,10}`, `fv ∈ {4,6}`). Fine = **dual** of that hex (its vertices), not a second incommensurate lattice. Dual killed: `more-frequency = more-hex`.

## 5. PHYSICAL vs ARTISTIC

Physical: hex distance is the 6-neighbor metric on the honeycomb. A papule that is a follicle is isotropic in that metric, then mapped through polar UV (area shrinks toward poles — that is why `dermisMask` exists).

Artistic: ~32 visible mounds on the dermis. Rounded, not tiles. Rim from the same field. Poles stay rest.

## 6. NOT THIS RECEIPT

Explore only. Painter not recut. Next Investigate, if wanted: retile `fu/fv` to a cage-commensurate pair and switch the kernel to cube/Li. Do not invent a geodesic body.
