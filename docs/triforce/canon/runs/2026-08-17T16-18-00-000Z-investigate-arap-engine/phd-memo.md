# CanonOps PHD — investigate · ARAP physics engine

Earned under N20 / N335. Engine **3.0.0**.
Deposit: `docs/triforce/canon/runs/2026-08-17T16-18-00-000Z-investigate-arap-engine`
Parent: `control-rig`. Ancestors: `arap-solver`, `arap-constraints`.

## 1. THE WALL

ARAP is being asked to be a physics engine. It is not one.
Dual: `energy = engine`.

## 2. QUESTION

What is ARAP, what does our file actually run, where it sits on the cook, and what must never be hooked as “the engine”?

## 3. TWO OBJECTS (do not swap them)

| Object | State | Time | Job |
|---|---|---|---|
| **Physics engine** | (x, v), forces, contacts | Integrator, dt | Move mass |
| **ARAP** | Positions + rest metric φ̄ | None in E | Stay locally rigid |

```
E = Σ w_ij || (p_i − p_j) − R_i (p̄_i − p̄_j) ||²
R_i = atan2(S21 − S12, S11 + S22)     // 2D Kabsch. Not a 3×3 SVD.
L p = b                                 // global Poisson
```

Voigt (`σ = Eε + ηė`) is the material. XPBD is a constraint engine. Control Rig Dynamics is particles. **ARAP is a projector.**

Igarashi 2005 is our paper (2D character, few handles). Sorkine 2007 is the 3D twin. Do not import SVD.

## 4. WHAT IS LIVE

`ArapSolver.ts` · organ **UNHOOKED** · Dynamics lane · Bone.

One `tickArap`:
1. Local: per-vert atan2 on weighted covariance.
2. Global: **Jacobi** (weighted neighbor average), not factored L.
3. Then `projectStretch` (distance, α = 0).

That last step is the known crime (arap-constraints): stretch after rotations undoes R_i.

It does **not** write `#body`. Tests exist. Paint does not call it.

## 5. LAWFUL COOK (Control Rig + prior stack)

```
Construction   Identity rest
Forwards       Handles / gait  →  bones
Predict        Voigt on FREE verts only
Hard           Face, pole, pins
Energy         ARAP local + global   ← this organ
G¹             κ-box
Ink            closedSpline          ← only d
```

Mute ARAP = incoming contour passes through.
Iters on the card are energy steps, not a clock.
Rest metric: pearl for rest/gait. **φ\*** itself for paddle. Rebuild L when the morph id changes, never per frame.

## 6. WHAT MUST NOT HAPPEN

- Do not hook Jacobi+stretch into FormMaster and call it an engine.
- Do not replace Voigt with ARAP.
- Do not KV the locked face — ARAP then has nothing to do.
- Do not weld the whole rim. That is a blend shape.
- Do not name the card “physics engine.” Name: **ARAP energy**.

## 7. NOT THIS CUT

Investigate only. Picture must not change (rest 168.3).
Next hook, if ever: Voigt → `tickArap` **without** `projectStretch` → κ → spline. Measure Jacobi vs Cholesky before swapping.
