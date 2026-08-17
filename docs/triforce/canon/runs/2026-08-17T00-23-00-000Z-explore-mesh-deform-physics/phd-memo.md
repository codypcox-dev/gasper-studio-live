# CanonOps PHD — explore · mesh-deform-physics

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-17T00:23:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-17T00-23-00-000Z-explore-mesh-deform-physics

## 1. THE WALL

The 1000 is a frozen cage. Independent per-vertex τ and a kinematic UV remap are not deformation physics. Neighbors must resist strain or the handle is a drawing, not a fabric.

## 2. QUESTION

What is mesh deformation physics on a locked 25×40, which energies are lawful, and why scalar Kelvin-Voigt plus a paddle UV is not a living fabric?

## 3. COORDINATE SPACES

Cage: u=s/40, v=r/24, 1000 verts, 960 quads. Positions φ:V→R² in content px. Rest Γ(L) is polar. Rim ring 24 is the hull. Face lock: v∈[0.32,0.58]. Time s. Do not remesh.

## 4. PHYSICAL LAW

- Topology is identity. Deformation is a map φ:V→R². Connectivity never changes.
- C(θ) = lerp of rim φ(u,1). The hull is the mesh, not a polar hypot and not a stance socket.
- Independent KV ẋ_i=(x*_i-x_i)/τ is 1000 1D springs. Fabric requires neighbor energy.
- ARAP: E=Σ_i Σ_{j∈N(i)} w_ij ||(φ_i-φ_j)-R_i(φ̄_i-φ̄_j)||². Local rotation, global Poisson.
- Stretch: E_e=½k(||e'||/ℓ0-1)². Area: E_q=½μ(det F_q-1)². KV damps toward a target embedding.
- A paddle is a Dirichlet target on a subset of V, not a second silhouette writer.

## 5. ARTISTIC LAW

- Blade cells stay nearly rigid. The handle is allowed stretch. The throat is the only large strain.
- Face UV is a lock, not a fade. Eyes do not ride the shaft.
- Gel read comes from regional τ and ARAP rotations, not from painted foam.
- Grid on must equal the same φ the hull uses. Two embeddings is a dual.

## 6. FAMILIES

| Family | Lawful on 25×40? | Live? |
|---|---|---|
| Independent KV on scalars | No — no neighbors | Yes (FabricSolver) |
| Kinematic UV / blend shape | As a *target*, not as motion | Yes (PaddleMesh) |
| Hull = rim XY | Yes | Yes (meshOutlinePoint) |
| Mass-spring / stretch | Yes | No |
| Area / det F | Yes | No |
| ARAP (Sorkine–Alexa 2007) | Yes | No |
| PBD / projective dynamics | Yes | No |
| FEM remesh / remeshing | No | No |
| SDF / marching cubes | No | No |

## 7. INVARIANTS

- verts=25×40=1000. quads=24×40=960. 512 contour samples the rim only.
- Rest φ=Γ(L). Zero live field ⇒ pearl, byte-identical.
- Face-lock vertices move < 2 px under a paddle snap.
- No remesh. No SDF extract. No new triangles.
- One embedding. Hull and grid read the same Float32 xy[2000].

## 8. FAILURE MODES

- Independent τ: meridians cross, handle collapses to a polyline, throat inverts.
- Polar hypot of rim: handle is one spike; W/stance redraws the pearl (already seen).
- Kinematic UV only: no overshoot, no neighbor, no physics — a blend shape.
- Two writers: stance sockets + mesh rim. The blob wins.
- Area-free stretch: quads flip at the throat and the gel pinches black.

## 9. UNCERTAINTY

- One ARAP local-global step per frame vs projective dynamics vs PBD — cost on 1000 is small; quality at the throat is the unknown.
- Whether handle stretch should preserve area (volume-looking shaft) or allow thinning.
- 2D content-px ARAP vs polar-metric ARAP (weights by rest sector length).

## 10. TESTS

- Rest field + rest φ is exact Γ(L). Peak |φ-Γ|=0.
- Paddle: rim max y > blade bottom + 20; |face verts| < 40 from origin.
- Neighbor: no edge longer than 2.4× rest after a snap tick.
- Quad det F > 0.15 (no flip) on all 960.
- Grid path vertices equal φ. Hull samples equal rim lerp of φ.

## 11. VISUAL CONSEQUENCES

- Paddle is an oval blade and a shaft whose outline is the rim meridians, not a pearl with a drawing inside.
- Turning Grid on shows the same cage the fill is made of.
- A slap or puff should ripple across edges, not inflate 1000 scalars in isolation.

## 12. IMPLEMENTATION

1. Explore only this receipt. Do not recut FormMaster.
2. Next: LiveMesh φ[2000] is the sole SoT. FabricSolver writes φ, not just s_i.
3. Rest lengths from the pearl. One KV step toward the target embedding, then one ARAP local-global (or PBD stretch+area).
4. Keep meshOutlinePoint as the 512 writer. Ban stance/plant/nubs while φ is live.
5. Regional τ already exists — apply it to φ, not to a parallel scalar.

## 13. CITATIONS

- `sorkine-alexa-2007` [reference] Sorkine & Alexa, As-Rigid-As-Possible Surface Modeling, SGP 2007 — Local rigidity via per-cell rotations; global Poisson on the same vertices.
- `muller-pbd-2007` [reference] Müller et al., Position Based Dynamics, 2007 — Project constraints on positions. Stretch and area are projections, not forces.
- `bouaziz-pd-2014` [reference] Bouaziz et al., Projective Dynamics, TOG 2014 — Local constraint projections + global linear solve. Real-time on a 1000 is cheap.
- `gasper-C-law` [canon] AdaptiveShellScaffold C = Γ(L) + Σs_i — Shape is an embedding on a frozen cage. s_i must become Δφ, not a second paint.
- `kelvin-voigt-prior` [canon] 2026-08-16T16-26-00-000Z-investigate-kelvin-voigt-params — τ is a damper on a degree of freedom. The DOF is now φ, not a height.
- `procedural-mesh-prior` [canon] 2026-08-16T20-08-00-000Z-explore-procedural-mesh — More field, not more triangles. Deformation physics is the field’s motion law.

## 14. THINKOPS

Residual: `independent-tau=fabric-physics`.
Dual killed: `UV-remap = deformation`. A target embedding is a boundary condition. Physics is the energy that walks the cage there.
