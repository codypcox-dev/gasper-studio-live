# 2026-08-14 — Adobe Illustrator vs Gasper 2.5D turntable (audit)

**Worktree:** `C:\Users\funny\Documents\GasperStudio-worktrees\integrate-main-20260814`
**5179:** this tree. **Owner acceptance:** never self-issued. **No push. No Grimoire.**
**Sources:** official Adobe helpx pages (fetched/cited 2026-08-14) plus the Adobe Community Turntable post. Helpx HTML timed out in-agent; titles, update dates, and procedure text below are from Adobe's own result snippets and the community page body.

---

## Official Adobe pages cited

| What | Official URL | Last updated (Adobe) |
|---|---|---|
| Map artwork on 3D objects | https://helpx.adobe.com/illustrator/desktop/special-effects-styles/create-3d-graphics/map-artwork-on-3d-objects.html | Oct 27, 2025 |
| 3D and Materials panel options | https://helpx.adobe.com/illustrator/desktop/special-effects-styles/create-3d-graphics/3d-materials-panel-options.html | Oct 30, 2025 |
| Rotate objects in 3D | https://helpx.adobe.com/illustrator/desktop/special-effects-styles/create-3d-graphics/rotate-objects-in-3d.html | Oct 27, 2025 |
| Create 3D objects (Extrude / Revolve) | https://helpx.adobe.com/illustrator/desktop/special-effects-styles/create-3d-graphics/create-3d-objects.html | Oct 27, 2025 |
| Generative Turntable | https://community.adobe.com/featured-content-766/turntable-in-illustrator-multi-angle-viewing-for-vector-and-raster-objects-1556004 | Adobe Community featured |

Adobe's own 3D-graphics index on those pages also lists: Create 3D vector artwork, Add artworks to the 3D panel, Render 3D vector artworks, Export 3D vector artwork, Create 3D text effects, Add custom bevel paths.

---

## What Adobe actually does

### 1. Rotate (continuous Euler of a 2D vector in 3D)

Adobe: *Effect > 3D and Materials > 3D (Classic) > Rotate (Classic)*. The 3D Rotate Options dialog sets **Position** — "the object's rotation and viewing angle" — continuously on X/Y/Z. Preview is live. There is no 45° cone and no 12-slice clock. A 90° yaw is a 90° yaw; a 180° yaw is the back of the same object.

Gasper (before this cut): `facingProjectionYawDeg` **folds any |θ| > 45 into ±45**. 90° and 180° paint as the same 3/4 sticker. That is the opposite of Rotate.

### 2. Extrude & Bevel / Inflate (volume, not a card)

Adobe Extrude (*Create 3D objects*, Oct 27 2025): "extends a 2D object along the object's z-axis to add depth." Inflate (3D and Materials panel, Oct 30 2025): "Puffs up the object for a balloon-like effect." Depth is a slider. Height is not the reciprocal of width.

Gasper (before): the radial-facing memo authored `hK = 1 − 0.15·hemisphere` and `vK = 1/hK`. Wave 2C killed the Y write (`facingVerticalScale='1.0000'`) but left the **width** side of that volume-conjugate as a gated X-scale. Reciprocal squash is a card gag. Adobe's Inflate/Extrude never do it.

### 3. Revolve (profile around an axis)

Adobe Revolve: "sweeps a path around the global Y axis to create a 3D object." The path is half the profile; the other longitudes are generated. Every yaw is a different silhouette of the **same** solid.

Gasper: one frontal contour, then `_orthoWidth = √(cos²θ + t² sin²θ)` — the right *idea* (finite-thickness ellipse) — then **two gates** destroy it:
- `_frontGate = smoothstep(|θ|/45)` permanently subtracts 8% after 45° (so 180° never returns to frontal breadth).
- `_shoulderGate = smoothstep((|θ|−45)/30)` withholds `_orthoWidth` until past 45°.
- Apply: `if (hemisphere > 0.001) scale all pts and renderMesh in X`.

That is a single frontal cutout with a delayed X-squash, not a Revolve.

### 4. Map Art (artwork rides surfaces as yaw changes)

Adobe Map Art (Oct 27 2025): a 3D object "comprises multiple surfaces"; graphics are applied to individual surfaces; "Select and drag the blue widget on the applied graphic to adjust the mapped artwork to move it around the 3D object." The decal belongs to the turning volume.

Gasper: `faceShift` from `authorKeyViewPoint` (authored cone, saturates at ±45°) plus a **second** fade (`faceTurnFade` 75–105°). When heading was folded, the face never receded from travel. When the dial crossed 45°, the whole body X-scaled and the face became a sliding sticker. That is not Map Art.

### 5. Generative Turntable (dense sampled views + slider interpolation)

Adobe Community post (Object > Generative > Turntable, Firefly): "takes your 2D object and generates multiple rotated views"; "smoothly slide between these views"; rotate left/right, tilt up/down; "Want more angles? Just drag the rotate slider or use the tilt arrows." Up to a dense set of views (Adobe's own marketing: up to 74). Interpolation is the product.

Gasper: 12 slices of 30° (`facingSliceCenterDeg`) **and** a 45° fold. The R2 review (`docs/triforce/plans/2026-08-14-25d-movement-review.md`) passed 12-slice heading on another worktree and left "no new turntable" as an explicit leftover. On this tree, heading was still `facingProjectionYawDeg(facingSliceCenterDeg(bearing))`. Crossing 45° of the *slice grid* (46° → 60° → fold 45°) is a discrete width jump. That is a 12-card flip, not a turntable slider.

---

## Named discrete crimes (be brutal)

| Crime | Site | What it does |
|---|---|---|
| 30° quantization of paint | `facingSliceCenterDeg` | 14°→0°, 16°→30°. Painted width seeks the next pie slice. |
| ±45° cone fold | `facingProjectionYawDeg` | 90° and 180° both display as ±45°. Side and back are one sticker. |
| `frontConeDeg = 45` as a paint gate | `RADIAL_FACING_LAW` + memo | Law comment admitted "legacy renderer is a thickness-aware 2.5D surface, not a full turntable." |
| hemisphere ramp start | `hemisphere = clamp((|θ|−45)/135)` | Width extension is **off** until 45°. |
| `_frontGate` 8% squash | `getViewMetrics` | After 45°, 8% is never given back. 180° stays 0.92, not dorsal 1.0. |
| `_shoulderGate` | `getViewMetrics` | `_orthoWidth` is withheld until 45–75°. |
| **The snap Cody named** | apply `hemisphere>0.001` | At the 45.001° crossing, **every contour pt and renderMesh vertex** is X-scaled by `facingCompress` (~0.92) about the centroid. Whole-body width-profile jump. |
| Reciprocal height (memo) | `radial-facing-phd-memo.md` | `vK = 1/hK`. Card squash. Renderer already refuses the Y write; the memo still taught it. |
| Lobe role via saturated `amount` | `nearLobeScale:1+.09*amount` | `viewAmount` caps at ±1 (45°). After that, lobes freeze. Not `sin(yaw)`. |
| Face vanish window | `faceTurnFade` 75–105° | Honest C1 fade — but heading snaps made it a 1-frame vanish when a slice jumped the window. |
| Linear heading lerp | `headingYawDeg += (target-current)*α` | Crossing the away pole unwinds through the lens (R2 D3, still live on this tree). |
| `viewAuthority='bounded-0-45-spike'` | `applyFormPresence` | The product named its own crime. |

---

## Verdict

Adobe Rotate / Revolve / Inflate / Map Art / Generative Turntable are all **continuous in the viewing angle**. Gasper's law was a 12-slice clock folded into a 45° cone, then a hard X-scale gate at the cone shoulder, then a reciprocal-volume leftover. That cannot fool the eye into 3D.

The marble cut on this tree:

1. Painted yaw = continuous pursued heading (`facingPaintYawDeg`). Slice ids stay telemetry.
2. `facingCompress(θ) = √(cos²θ + t² sin²θ)`, t=0.90. C∞. 1 at 0° and 180°, 0.90 at ±90°. No fold, no 45° gate, no `vK=1/hK`.
3. Apply always (skip only at identity `|hK-1|<1e-12` so θ=0 is byte-identical).
4. Lobes = `1 ± k·sin(θ)`. Face shift rides `1-faceTurnFade` (Map Art analogue). Heading pursuit is shortest-arc.
5. `worldRig` rotate stays physics lean/bank. WorldPhysicsDriver remains the sole free-motion writer.

Owner visual acceptance is never self-issued.
