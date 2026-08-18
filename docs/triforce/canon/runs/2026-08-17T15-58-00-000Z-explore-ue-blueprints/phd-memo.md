# CanonOps PHD — discover · Unreal Engine Blueprints

Earned under N20 / N335. Engine **3.0.0**.
Deposit: `docs/triforce/canon/runs/2026-08-17T15-58-00-000Z-explore-ue-blueprints`
Parent: `visual-scripting`.

## 1. THE WALL

Blueprints is not one thing. Treating it as “the node graph we should copy” would put Event Tick on the 512.
Dual: `event-graph = character-graph`.

## 2. WHAT UNREAL ACTUALLY HAS

| Graph | When it runs | What it is | Gasper analog |
|---|---|---|---|
| Construction Script | Spawn / construct | Birth the actor | **Home / Identity** |
| Event Graph | BeginPlay, Tick, input | Gameplay side effects | **Forbidden on the hull** |
| Anim Graph | Every frame | Pose flows to Output Pose | **Cook: Handles → Gait → … → Hull** |
| Control Rig | Every frame | Deformer / IK | **Cage + Voigt + κ** |
| Function | When called | Reusable, no latent | Future group. Pure. |

Epic: exec pins (white) activate a node then fire the next. Data pins are typed and colored. Function Call has one exec in, one exec out.

Anim Graph is the important sentence: *it is not event-based and is evaluated each frame. Pose pins pass poses. Event Graph fires; Anim Graph always cooks.*

## 3. EVALUATION LAW (UE)

- **Impure** — has exec. Runs only when exec arrives.
- **Pure** — no exec. Recooks **once per data wire**. A Random wired to two Adds rolls twice.
- **Latent** — Delay / async. One action per node instance. Re-exec cancels the previous. A Delay inside a loop keeps only the last.

Those three rules are why Tick-driven character graphs rot.

## 4. STEAL / REFUSE

**Steal**

- Type-colored data pins. Auto-cast as an inserted node, not a silent coerce.
- Construction vs cook as two *times*: Home is authored once; the frame graph cooks.
- Anim Graph law: contour/pose flows every frame toward Hull. Pulse the live wire.
- Click-to-break (UE Alt-click). We already cut a wire by clicking it.

**Refuse**

- Event Tick on the 512.
- Latent Delay as plant or first-step.
- BeginPlay as a walk starter (`fire()` / snap world x).
- White exec arrows on the hull.
- Naming our page “Blueprints.”

## 5. MAPPING

- **20s** is a score (montage / notify analog), not a latent chain.
- **Mute** is passthrough, not an exec skip.
- **Viewer** is a look, not Output Pose. Hull is Output Pose.
- **Library chips** are node definitions, not Actor events.

## 6. NOT THIS CUT

Do not add exec pins. Do not recut FormMaster.
Next Work is still `GeoSocket` from the visual-scripting residual. Blueprints do not jump the queue. They only named the two times: **Home** and **Cook**.
