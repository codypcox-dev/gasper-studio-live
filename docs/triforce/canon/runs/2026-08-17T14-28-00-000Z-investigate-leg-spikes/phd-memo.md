# Investigate — `leg-spikes`

Film: `gaspspikes.mp4` at 20 fps. Live measure on the 512.

## 1. WHAT THE FILM IS

Not whole-body shear. **Needles on the W.** Rest lower turning = 0.54 rad. The clip hits ~π (a cusp). Extra toes.

## 2. THE EQUATION THAT MAKES A NEEDLE

```
posed += (Σ w_i Δ_i) / Σ w_i
```

Three overlapping gaussians (left 1.83, right 1.31, crotch π/2). On the **peak**, Σw ≈ 1, fine. On the **flank**, Σw ≈ 0.04 and Δ_left ≠ Δ_right. Dividing by 0.04 fires that vertex the *average of both feet* — 14 px in a garbage direction. ClosedSpline turns that into a horn.

Second crime: peak τ = 0.02, neighbor τ = 0.25. The peak arrives, the neighbor has not. A one-vertex lead is a spike.

Third: `footAmp` nub + socket yank on the same angle = double toe.

`skewX` was already 0. τ numbers were already right. The **writer** was illegal.

## 3. THE RULE (PERMANENT)

Handles are **un-normalized**. Never divide by Σw.

```
posed += w_L Δ_L + w_R Δ_R + w_C Δ_C
```

A vertex with 4% weight moves 4%. It cannot be launched. Lower rim shares one τ (0.05) so neighbors cannot race. Dual-foot hold is still C∞. Phase is not reset on sustain.

κ lock: walk max turning on y>140 must stay ≤ ~0.90 (rest 0.54). 3 rad is a fail.

## 4. MEASURED AFTER THE CUT

Rest 0.54 / 168.3 / 197.8. Walk worst 0.85 / 168.7 / 197.1. Cusps gone.
