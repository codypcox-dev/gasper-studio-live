# CanonOps PHD — explore · Control Rig mechanics

Earned under N20 / N335. Engine **3.0.0**.
Deposit: `docs/triforce/canon/runs/2026-08-17T16-08-00-000Z-explore-control-rig`
Parent: `ue-blueprints`.

## 1. THE WALL

The 512 is both the thing you grab and the thing that deforms.
Takes bake the mesh. Paddle ghosts stick.
There is Forwards (handles → hull) and no named Backwards (hull → handles).
Dual: `samples = handles`.

## 2. WHAT CONTROL RIG ACTUALLY IS

Not Blueprints. Not Event Tick. A deformer graph with three **elements** and three **times**.

| Element | Epic | Gasper |
|---|---|---|
| **Control** | What you grab. Drives bones. | Handles, face, orbit |
| **Bone** | What deforms the mesh | 512 / lattice / relief |
| **Null** | Hidden group / space | Regions (crown, cleft, feet), COM |

| Time | Epic | Gasper |
|---|---|---|
| **Construction** | Once. Init offsets. Spawn only here. | Home / Identity rest |
| **Forwards** | Controls → bones. Every animate frame. | Cook: Handles → 512 → closedSpline |
| **Backwards** | Bones → controls. Bake anim onto the rig. | Missing. Takes write 512 floats. |

Combo mode is Backwards then Forwards: a baked clip sits on controls, then Forwards deforms. That is how a take should load.

## 3. SPACES AND IK/FK

A Space is the parent a control is solved in (Parent / World / another Control).
Switch is one frame + a compensating transform so the picture does not pop.
Epic: use **Controls** as custom spaces. Bones as space risk cycles.

IK and FK are two Forwards recipes on the **same** chain. Not two skeletons.
Plant = IK space on the foot control (world hold).
Swing = FK on the same control.

## 4. WHERE VOIGT SITS

Control Rig Physics / Dynamics (UE 5.8) is a particle solver **on the bones after Forwards**.
Voigt and κ-box are that. They are not controls. They must not become the rig.

## 5. STEAL / REFUSE

**Steal**
- Name Controls vs Bones vs Nulls on the Nodes page.
- Construction / Forwards / Backwards as three events, not one cook.
- Space switch with no pop (orbit ≠ identity yaw; plant ≠ swing).
- Backwards node: take/mocap → handles, then Forwards. Never leave a baked 512 as live `d`.

**Refuse**
- A joint hierarchy as a second writer.
- Parenting a handle to the sample it drives.
- Calling the 512 a control.
- Event Tick. Exec pins. Baking takes as the hull.

## 6. NOT THIS CUT

Do not recut FormMaster. Do not grow a skeleton.
Next Work is still typed sockets. Control Rig adds one organ to that work: **Backwards** — writes handles, never `d`.
