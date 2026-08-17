# CanonOps PHD — investigate · arap-solver

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-17T00:26:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-17T00-26-00-000Z-investigate-arap-solver
Parent: explore · mesh-deform-physics

## 1. THE WALL

`ARAP-from-pearl = paddle` is a dual. The pearl’s rest metric cannot grow a shaft. Independent KV is not ARAP. The solver must walk φ toward a target embedding, then restore local rigidity **in that embedding’s metric**.

## 2. QUESTION

What is the exact ARAP implementation on Gasper’s 25×40, which rest metric is lawful for a paddle, and what is one 60 fps tick?

## 3. TWO PAPERS (do not swap them)

| Paper | Dim | Job |
|---|---|---|
| Igarashi, Moscovich, Hughes 2005 | 2D character | Interior follows a few handles. This is our paper. |
| Sorkine & Alexa 2007 | 3D surface | Same local/global split. Do not import 3D SVD. |

2D Kabsch is `atan2`. Not a 3×3 SVD.

## 4. THE REST-METRIC LAW

Let φ̄ be ARAP rest, φ* the morph target, φ the live mesh.

| Morph | Lawful φ̄ | Why |
|---|---|---|
| rest / puff / slap / gait | pearl Γ(L) | Small strain. ARAP keeps the pearl rigid. |
| paddle / remote | **φ* itself** | A shaft is a new metric. Pearl rest fights it and shortens the handle. |

Rebuild φ̄ and refactor L when the morph id changes. Never per frame.

## 5. GRAPH

- Vertex `i = r*40 + s`. 1000 verts.
- Edges: 4-neighbors. `s±1` wraps. `r±1` clamps.
- Ring 0 is the pole: 40 samples, one position. Treat as one DOF (write the same xy to all 40).
- Weights: `w_ij = 1 / ||φ̄_i − φ̄_j||` (skip if length < 1e-6).
- Quads: 24×40 = 960. Used only for `det F` tests, not for the first Laplacian.

## 6. ONE TICK (60 fps)

```
k_i = 1 - exp(-dt / τ_i)          // regional τ already exists
φ  ← φ + k ⊙ (φ* - φ)             // Kelvin-Voigt predict

for i in 0..999:                   // LOCAL
  S = Σ_j w_ij (φ_i-φ_j)(φ̄_i-φ̄_j)^T
  θ_i = atan2(S_21 - S_12, S_11 + S_22)
  R_i = [[cos θ, -sin θ],[sin θ, cos θ]]

solve L φ = b                      // GLOBAL, L factored at morph change
  b_i = Σ_j (w_ij/2) (R_i+R_j)(φ̄_i-φ̄_j)
  face-lock rows: φ_i = φ*_i
  pole: one unknown, broadcast

publish __GASPER_FABRIC_POS__ = φ
```

`meshOutlinePoint` already samples rim φ. Do not add a second hull writer.

## 7. LAPLACIAN

```
L_ii = Σ_j w_ij
L_ij = -w_ij
```

n = 1000. Sparse ~ 5000 entries. Dense 1000×1000 Cholesky once per morph is legal (~8 ms worst, then 1 ms solves). Do **not** invert every frame.

Dirichlet: replace locked rows with `e_i`. Face band `v ∈ [0.32, 0.58]` always locked to φ*.

If every vertex is Dirichlet, ARAP is a no-op — that is a blend shape. Free the interior. The rim may be soft (KV only) or hard (Dirichlet to φ* rim) for a held paddle.

**Held paddle (v1):** rim Dirichlet to φ*, face Dirichlet to φ*, interior free under ARAP with φ̄=φ*. Interior becomes a rigid-as-possible fill of the paddle, not a UV fan.

## 8. WHAT NOT TO WRITE

- φ̄ = pearl while morph = paddle.
- 3D SVD.
- Remesh / extra verts.
- Stance sockets after φ (already banned in the hull path).
- ARAP on the old scalar `s_i`.
- Per-frame refactor of L.

## 9. FILES (next receipt, not this one)

| File | Owns |
|---|---|
| `ArapSolver.ts` | rest, L, local, global, tick |
| `FabricSolver.ts` | φ*, τ, morph id, publish φ |
| `PaddleMesh.ts` | φ* only |
| `all-script-3.js` | already reads POS — do not recut this receipt |

## 10. TESTS

- Identity: φ=φ̄ ⇒ max\|Δφ\|=0 after tick.
- Pearl rest + zero morph ⇒ restPolarMesh.
- Paddle: φ̄ is paddle; rim max y > blade+20; face \|φ\| < 40.
- Poke: one free vert +8 px; one tick; neighbors move; face \|Δ\| < 2 px.
- No edge > 2.4× rest. All 960 det F > 0.15.

## 11. IMPLEMENTATION

1. Investigate only this receipt. Packet returned before any solver file.
2. Next write: `ArapSolver.ts` + tests above. Wire `tickFabric` → `tickArap` → POS.
3. Keep `meshOutlinePoint`. Ban a second silhouette.
4. Regional τ applies to the KV predict, not to a parallel height.

## 12. THINKOPS

Residual: `arap-from-pearl=paddle`.
Dual killed: `full-Dirichlet=ARAP` (that is a blend shape).
Next actor: implement `ArapSolver.ts` on Approve / “do it”.
