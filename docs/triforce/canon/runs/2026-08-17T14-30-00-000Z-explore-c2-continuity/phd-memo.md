# CanonOps PHD — explore · C2 curve continuity

Earned under N20 / N335. Engine 3.0.0.
Parent: `leg-spikes` (un-normalized handles) · `leg-shear-dual-foot`.
Deposit: docs/triforce/canon/runs/2026-08-17T14-30-00-000Z-explore-c2-continuity

## 1. THE WALL

A spike is a **G⁰ failure** (the tangent reverses). Un-normalized handles stopped the launch. They did not name the continuity class the W is allowed to have. `closedSpline` is C¹ Catmull–Rom. CurveTrack is C¹ Hermite. Neither is C². Without a constraint, the next writer can grow a new lobe and the cubic will ink it.

## 2. QUESTION

What do C⁰ / C¹ / C² / G¹ / G² mean on a closed 512, which class is live, which class the W is *allowed* to break, and which constraint makes a needle geometrically illegal?

## 3. COORDINATE SPACES

- Spatial: closed polyline pᵢ ∈ R², i ∈ Z/512Z, content px. Parameter u = i/512 on S¹.
- Discrete turning: θᵢ = atan2(det(eᵢ, eᵢ₊₁), eᵢ·eᵢ₊₁), eᵢ = pᵢ − pᵢ₋₁.
- Discrete curvature: κᵢ = 2 θᵢ / (|eᵢ| + |eᵢ₊₁|).
- Painted curve: γ(u) = `closedSpline`(p) — cubic Bézier per edge, τ = 1/6.
- Time: t seconds. Dual-foot leave(φ) is C∞ in phase. `_lp` is C⁰ in t.

## 4. PHYSICAL / GEOMETRIC LAW

| Class | Meaning | Discrete test |
|---|---|---|
| C⁰ | Position continuous | pᵢ shared (true by construction) |
| G¹ | Tangent *direction* continuous | \|θᵢ\| < π − ε (no cusp) |
| C¹ | Tangent *vector* continuous | incoming 3(p − c₂) = outgoing 3(c₁ − p) |
| G² | Curvature continuous | \|κᵢ − κᵢ₊₁\| ≤ ε_κ |
| C² | Second derivative continuous | discrete Laplacian matches across the knot |

Facts:

- Uniform Catmull–Rom → Bézier (`c1 = p1+(p2-p0)/6`) is **C¹, not C²**. Second derivative jumps at every sample. That jump is invisible when θᵢ ≈ rest. It is a horn when θᵢ → π.
- A *periodic cubic spline* (solve the 512-banded system for Mᵢ = γ̈(uᵢ)) is C². Cost is O(n). Lawful. Not live.
- A closed cubic B-spline (degree 3, one knot vector, periodic) is C² by construction. Would replace `closedSpline`. New `d` writer. Dual unless it is the only writer.
- Clothoids between handles are G². Wrong tool for a 512 polar rim (they ignore the identity W).
- **κ-box** is the cheap hard constraint: κᵢ(t) ≤ max(1.6 · κᵢ(rest), κ_cap) with κ_cap = 0.90 rad turning. Project pᵢ toward the chord until θᵢ is legal. C² is not required if G¹ is enforced.

W law: the cleft and two feet are **features**. Rest θ at the cleft is 0.54. That is a legal G¹ corner budget, not a defect. C² *everywhere* would round the W into a U (already seen when a CR through three sockets replaced the rim).

Temporal law: leave_L/R from `tanh(k cos(φ/2))` is C∞. First-step `__GASPER_VISCO_SNAP__` is a deliberate C⁰ in time. Do not C²-smooth that snap — it is the plant.

## 5. ARTISTIC LAW

- The W must stay a W. C² on the lower rim is illegal if it erases the cleft.
- Needles (θ → π, new lobes off the feet) are illegal.
- The painted path may be C¹. The *samples* must stay inside the rest κ-box.
- Face plane is a hard Dirichlet. Continuity constraints do not move it.

## 6. FAMILIES (what is live)

| Family | Continuity | Live? |
|---|---|---|
| Polar hypot + un-normalized handles | C⁰ samples, G¹ if θ stays in box | **Yes** — paint |
| `closedSpline` CR-Bézier τ=1/6 | C¹ path, not C² | **Yes** — sole `d` writer |
| CurveTrack Hermite | C¹ in time on takes | Yes — takes, not hull |
| `_lp` Kelvin–Voigt | C⁰ in time (exp) | Yes — after samples |
| Periodic cubic spline | C² path | No |
| Closed cubic B-spline | C² path | No |
| Clothoid / Euler | G² | No |
| κ-box projection | Enforces G¹ | **Not yet** — measure only |

## 7. INVARIANTS

- 512 samples. Closed. `closedSpline` remains the only `d` writer this explore.
- Rest max θ on y>140 = 0.54 rad. Walk max θ ≤ 0.90. 3 rad is a fail.
- Un-normalized handles: `posed += Σ wᵢ Δᵢ`. Never `/Σw`.
- Lower rim shares one τ (0.05) while stance is live.
- Dual-foot leave is C∞ in φ. Phase is 4π-periodic. No 2π wrap. No sustain reset.
- C² must not be bought by flattening the W.

## 8. FAILURE MODES

- `/Σw` on overlapping gaussians → θ → π (the film).
- Peak τ ≠ neighbor τ → one-vertex lead → needle after a C¹ cubic.
- CR through 3 sockets as the rim → C²-looking U, W dies.
- Periodic spline with κ-cap = 0 → circle. Identity dies.
- Replacing `closedSpline` with a second C² writer → two `d`s. Dual.
- C²-filtering the first-step snap → plant is taffy again.

## 9. UNCERTAINTY

- Whether a *periodic* C² spline *with* the rest W as the interpolant (and handles as soft Dirichlet) stays a W at 2.6 Hz. Unknown until measured.
- κ-box projection vs one Jacobi on the lower rim — which keeps the cleft deeper.
- Discrete κ from `getPointAtLength` (the painted cubic) vs from the 512 samples. The film is the painted one. The lock should be on samples *and* on the cubic.

## 10. TESTS

- Rest: max θ(y>140) ∈ [0.45, 0.62]. Height 168.3. Floor 197.8.
- Walk 2 s @ 2.6 Hz: max θ(y>140) ≤ 0.90. No sample with θ > 1.2.
- Un-normalized: painter contains `posed.x+=(S.left.x-100)*wL` and does not contain `/wSum`.
- C¹ of `closedSpline`: incoming tangent at each knot equals outgoing (algebraic, τ=1/6).
- Identity: live=0 ⇒ byte-identical pearl (no κ-box motion).
- W valley: crotch y < min(left.y, right.y) − 8 while stance live.

## 11. VISUAL CONSEQUENCES

- Feet lift as lobes, not as extra toes.
- The cleft stays a cleft. No pad, no U.
- The cubic may look slightly softer than the polyline. It must not grow horns.
- Grid on: same 512 the cubic is stroking.

## 12. IMPLEMENTATION (next, not this receipt)

Explore only. Do not recut FormMaster this deposit.

1. Keep un-normalized handles + uniform lower τ. That is G¹ *in the writer*.
2. Next cut: **κ-box projection** after `_lp`, before `closedSpline`. 2–4 Jacobi steps on y>140: if θᵢ > θ_cap, pull pᵢ toward (pᵢ₋₁+pᵢ₊₁)/2. Re-assert the two foot peaks (highest w_L, w_R) so the W cannot pad.
3. Do **not** replace `closedSpline` with a periodic C² spline until (2) is filmed and the W still reads.
4. If (2) is not enough: periodic cubic spline *constrained* to the rest κ-box, still one `d` writer (replace the 1/6 CR, do not add a second).

## 13. CITATIONS

- Farin, *Curves and Surfaces for CAGD* — Cⁿ vs Gⁿ. Catmull–Rom is C¹. Periodic cubic spline is C².
- Catmull & Rom 1974 — interpolating C¹ piecewise cubics. The 1/6 Bézier convert is live in `closedSpline`.
- Hoschek & Lasser — G² = curvature continuous; a cusp is G⁰.
- Canon `leg-spikes` 2026-08-17T14-28 — `/Σw` is the needle. κ-box is the named lock.
- Canon `leg-shear-dual-foot` — hold = tanh(k cos(φ/2)) is C∞ in phase.
- CurveTrack (GASPER-CRAFT-001 C1) — temporal Hermite is C¹, not a hull writer.

## 14. THINKOPS

Residual: `c2-continuity`.
Dual killed: `C² everywhere = better W`. C² that erases the cleft is a pad. G¹ inside a rest κ-box is the organism.
Next: κ-box projection, then film. Periodic C² spline only if the box is not enough.
