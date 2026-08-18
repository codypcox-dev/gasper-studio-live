# Investigate — `svg-path-animation`

Earned under N20 / N335. Engine 3.0.0.
Parent: caged-hull lock. Live writer: `closedSpline` → `#body`.

## 1. THE WALL

There are four ways to animate an SVG `d`. Three of them look like a shortcut around our painter. They are not. They interpolate **ink**. Gasper is **points**.

## 2. THE FOUR FAMILIES

| Family | What it tweens | Same-command rule | Safari | Springs | Lawful on `#body` |
|---|---|---|---|---|---|
| SMIL `<animate attributeName="d">` | The attribute | Yes, or it aborts | Yes | No | **No** — second writer vs `_lp` |
| CSS `d: path()` | A presentation property | Yes | **No interpolation** | `linear()` only | **No** |
| WAAPI | Same as CSS | Yes | **No** | `linear()` only | **No** |
| JS `setAttribute('d')` | Whatever we serialize | We already lock it | Yes | Our `_lp` is the spring | **Yes — this is live** |

Libraries (GSAP MorphSVG, Flubber, Motion+Flubber) remesh unequal paths. That is a second topology. Forbidden.

`pathLength` + dashoffset is a **draw-on**. `getPointAtLength` is a **sampler**. FLIP is for boxes. None of those are a body.

## 3. WHAT WE ALREADY DO

```
512 posed pts  →  _lp (Voigt)  →  closedSpline  →  body.setAttribute('d')
                     │
                     └─ clipBody uses the unfiltered 512
```

`closedSpline` is Catmull-Rom written as cubics:

```
M p0
C c1 c2 p2   × 512
Z
```

Tangent is `(p_{i+1} − p_{i−1}) / 6`. Command count is locked to sample count. That is why a 512-to-512 lerp of **points** is always interpolable, and a 512-to-Flubber-paddle `d` string is not.

## 4. THE LAW

**Animate the 512 / 1000. Serialize to `d`. Never the reverse.**

- Takes store embeddings (cage floats or 512 xy), not `d` keyframes.
- Playback = lerp points → `closedSpline`. SMIL `dur` is not `τ`.
- `getPointAtLength` may sample an authored paddle onto our lock. It may not replace the lock.
- Stroke-draw may reveal the grid. It may not fake feet.
- Chrome / dock / pills may use SMIL or WAAPI. `#body` may not.

## 5. FAILURES WE WILL NOT BUY

- SMIL and rAF both writing `d` → last writer wins, W buzzes.
- CSS `d` tween → Safari snaps, Chrome fights `_lp`.
- Flubber rest→paddle → new vertex count, identity W gone.
- Saved takes as `d` strings → next spline tweak orphans the library.

## 6. IMPLEMENTATION

Investigate only. No painter cut.

Live writer is already the correct family. Next implement, if asked: a take recorder that stores 512/1000 floats.

## 7. TESTS

- Painter contains `function closedSpline(pts)` and `body.setAttribute('d',bodyD)`.
- Live avatar markup has no `<animate attributeName="d"`.
- No Flubber / MorphSVG dependency on the hull.
