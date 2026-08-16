# 2026-08-14 — 2.5D / movement review (R2)

**Branch:** `feature/wave-25d-natural`
**Worktree:** `C:\Users\funny\Documents\GasperStudio-worktrees\wave-25d-20260814`
**Against:** integrate-main `e9d15b516`
**Owner acceptance:** never self-issued.

Stayed off R1 plant-lock files: `SupportExchange.ts`, `WorldPhysicsDriver` plantedWorld / gaitScreen plant fields, `all-script-3.js` `setPhysicsGait` / `stepRig` / `shadowStepDxPx`. Did not touch Grimoire. Did not push.

---

## How the body becomes 2.5D today

```
WorldPhysicsDriver (sole free-motion writer)
  facingBearingDeg(vx,vz) | null if speed < 40
       │
GasperRigController.applyPhysicsDriverOutput
  setHeadingYaw(slice center)          // was folded ±45 — a card
  wander telegraph → setAttentionYaw + setExternalGaze   // fired at origin
  verticalDepthGain → overall_height   // was a squeeze gag
       │
all-script-3.js
  effectiveViewYaw = view + heading + attention     // rotated the SHELL at rest
  worldRig = translate + uniform scale(z) + rotate(-tilt)
  getViewMetrics: facingCompress / faceTurnFade / backPresence exist but
                  heading never left the 45° cone, so they never ran from travel
  face: authorKeyViewPoint + faceShift decal
```

---

## Defects

### D1 — Origin telegraph reads as a body turn
- **File:** `GasperRigController.ts` ~838–851; `all-script-3.js` `effectiveViewYaw` / `authorKeyViewPoint` / `getViewMetrics`
- **Now:** N41 look-then-go writes `setAttentionYaw` for φ⁻¹ s while `vx,vz` are still 0. `headingYaw` stays 0. Composed yaw still deforms the shell and face plane. He spins in place, then slides.
- **Why fake:** Anticipation is eyes, not a turret. Constitution 7.3 wants eyes → mass → shell. The blob yaws first.
- **Legal tune (T1):** Telegraph may drive gaze + attention strength only. `shellViewYaw = view + heading + (headingTravelLive ? attention : 0)`. `setHeadingYaw(null)` marks travel dead. `dataset.facingDeg` still composes attention (the look). Body yaw = heading after speed ≥ 40, pursued at existing τ·φ².
- **Proof:** `shellViewYawDeg(0, 0, 27.8, false) === 0`. Renderer contract: `shellViewYaw` + `headingTravelLive`. 5179: eyes address; the pearl does not spin at the origin.

### D2 — Travel facing was a ±45° card
- **File:** `GasperRigController.ts` `setHeadingYaw(facingProjectionYawDeg(facingSliceCenterDeg(bearing)))`
- **Now:** 90° and 180° both display as ±45°. `faceTurnFade` needs |θ| > 75, so a 12-o'clock walk never recedes the face. Side and rear are the same sticker.
- **Why fake:** A volume turns. A card yaws in place. The renderer already has hemisphere / fade / `_orthoWidth`; the clamp starved them.
- **Legal tune (T3):** Pass the 12-slice clock (not the cone fold). `viewAmount` still saturates at ±1 (authored cone not exploded). Extension terms read `|shellViewYaw| > 45`. Face plane rides `shellViewYaw`. `faceShift` cut by φ⁻¹ so apertures belong to the shell, not a second decal yaw. `worldRig rotate(-wTilt)` stays physics lean/bank only — not a yaw card-spin.
- **Proof:** Slice 12 → heading 180 → `faceTurnFade` / `backPresence` live. `viewAmount` still ∈ [-1, 1]. No new turntable. No pupils.

### D3 — Linear heading lerp resets through the camera
- **File:** `all-script-3.js` ~2464 heading pursuit
- **Now:** `headingYawDeg += (target - current) * α`. Crossing the away pole (+170 → −170) lerps through 0 (the lens).
- **Why fake:** A body does not unwind through the audience to face the next slice. Continuity law: no reset-through-neutral.
- **Legal tune:** Shortest-arc wrap at the existing thrust τ (`pursueFacingDeg`). φ timing unchanged. No `Math.random`.
- **Proof:** `pursueFacingDeg(170, -170, 0.05)` stays on the dorsal side.

### D4 — `verticalDepthGain` crushed stature
- **File:** `tuningRegistry.ts` ~314, ~612 `commitBinding("overall_height", value)`
- **Now:** The knob is labeled “Vertical depth” and writes host `overall_height`. 0.85 makes a shorter card. Reciprocal of the depth law (Interior → Pressure → Surface).
- **Why fake:** Depth is thickness / foreshortening, not a squash gag. Camera law already forbids `_vK=1/_hK`.
- **Legal tune (T2):** Stop writing `overall_height`. Gain rides `wDepthScale = 1 - g·(1 − D0/(D0+z))` and `facingCompress` (finite-thickness breadth, `_orthoWidth` also contributes inside the cone by φ⁻¹). Home / frontal stay identity. `facingVerticalScale` stays `1.0000`. Physics silhouette `Sx·Sy=1` untouched.
- **Proof:** `lab.set("verticalDepthGain", 0.8)` does **not** call `commitBinding("overall_height")`. `facingCompressWithDepthGain(1, 0.85) === 1`. `worldDepthScaleWithGain(1, 0.85) === 1`.

### D5 — `worldRig` rotate was the only 3D
- **File:** `all-script-3.js` ~2866 `rotate(-wTilt)` about the floor anchor
- **Now:** One quad, one uniform scale(z), one rotate. Yaw was a 2D squash of a cutout.
- **Why fake:** A pearl has near/far lobes and thickness. A playing-card has a spin.
- **Legal tune (T3):** Do not add yaw to `worldRig`. Tilt stays vault/bank/flight lean. Yaw is shell deformation + finite thickness (`authorKeyViewPoint`, `facingCompress`, `faceTurnFade`). Face belongs to that shell.
- **Proof:** No `rotate(heading)` added. Contract still forbids reciprocal Y. 5179: 3-o'clock = near lobe / far tuck; 12-o'clock = face recedes with the volume.

### D6 — Plant skate (not this branch)
- **File:** `WorldPhysicsDriver` `stepBaseXUnits` body-relative; renderer `stepRig` / `shadowStepDxPx`
- **Left for R1 agent.** World-locked `plantedWorld` is ignored by the contour foot.

### D7 — Walk volume / Y=0 puck (not this branch)
- **File:** `WorldPhysicsDriver` walkingSupport freezes `y=0`; gather/impact barely reach the silhouette
- **Left for R3.**

---

## Implemented (R2 T1–T3 only)

| Tune | What changed |
|---|---|
| T1 | `shellViewYaw` / `headingTravelLive`. Telegraph gaze+attention kept. Shell does not rotate at rest. |
| T2 | `verticalDepthGain` → `setVerticalDepthGain` → `wDepthScale` + `facingCompress`. No `overall_height`. |
| T3 | Full 12-slice heading (cone stays in `viewAmount`). Stronger in-cone `_orthoWidth`. Face shift /φ. Shortest-arc pursuit. Face plane follows shell yaw. |

---

## Left for other agents

- **R1** — `plantedScreenXUnits` / `stepRig` anti-skate
- **R3** — gather / impact as base-anchored volume crouch; keep `y=0`
- **R4** — causal affect → physics goals (no emotion names)
- **R5** — reverse-direction wind samples
- **R6** — Adaptive Shell Scaffold contract
- Bank/lean overlap on `body.angle` if cinematic wants it — not taken here
