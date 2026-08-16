# GASPER-CRAFT-002 — THE MONITOR DOCTRINE

Owner-approved plan (plan gate, 2026-08-04). Doctrine record: D-0099. Supersedes the retired camera direction of D-0095/D-0097/D-0098.

Five owner-ratified doctrines (alignment pass 2026-08-04):
**D1 Camera is the monitor** — viewport never moves during performances; all framing comes from Gasper's position + depth. **D2 Bounds law** — real physical bounds (walls/floor/ceiling/near-glass/far-fade); he knows them before contact; bounds are performance affordances. **D3 Movement truth** — drawn = authored keys (no auto-smoothing in performances); per-beat timing budgets; corpus physics gates (h=e²·H ±5%, squash∝impulse, deliberate ζ, hard arc law); blocking-first approval. **D4 Place** — grounded environment: receding ground plane + horizon, floor answers to weight, legible bounds, Gasper-motivated light. **D5 Meaning** — objective per beat, value turn per scene (compiler-enforced), holds as events, emotion as result.

## First-hand facts (verified 2026-08-04)
- Depth scaling ALREADY half-wired: `worldRig` transform applies `scale(depthScale)` (all-script-3.js :2619) — but far-lane scale is only 0.82 with an 18px horizon lift (AS3:480 `WORLD_SPACE`), never authored by packs (z=0 always), no bounds model behind it.
- The float: `WORLD_SPACE.tau = 0.14s` renderer-side pose smoothing (AS3:480) over authored keys — corpus-forbidden (`phi-beta-motion-perception`).
- Camera motion sources to retire: viewport `enableWorldFollow/stepWorldFollow` (GasperViewportController.ts:87–117) + shot-direction block in GasperDaisStage.tsx:547–610.
- D-0098 contour measurement (live silhouette ~153px) stays — the legibility ranges for depth measure against it.
- Canon corpus citations: `virtual-production-led-volume-2019`, `multiplane-parallax-camera`, `twelve-principles-1981`, `phi-beta-motion-perception`, `timing-for-animation-1981`, `newton-restitution-impulse`, `mass-spring-damper-settle`, `mccay-split-system-1914`, `animatic-first-previs`, `blocking-spline-polish-phases`, `acting-for-animators-2011`, `story-1997`, `the-anime-machine`, `digital-lighting-and-rendering-2013`.

## Stages

### S1 — Doctrine deposit
Decision record D-0099 (the five doctrines, verbatim alignment outcomes) in DECISION_LOG; state.json; this plan deposited to docs/triforce/plans/. Gate: doctor ok.

### S2 — Depth law: the illusion engine (D1+D2)
- **WorldSpace projection law** (replaces linear 0.82): `scale(z) = D0/(D0+z)`, D0 = authored home-view distance; constants `zNear` (the monitor glass — body reads at authored max legible size, ~2.4× home, measured against the 153px contour) and `zFar` (far fade — min legible size, ~0.35×). Floor-plane coupling: screen-y lift derived from the SAME projection so feet stay planted on the receding ground at every depth (near = low+big, far = high+small).
- **Frustum bounds model**: visible half-width grows with depth (`xHalf(z) = xHalf·(D0+z)/D0`); floor y=0, ceiling yMax(z), z∈[zNear,zFar]. New API `worldBoundsAt(z)` — consumed by (a) the pack compiler gate (every authored point inside bounds at its own depth), (b) autonomous behavior (wander targets never leave unknowingly — awareness Layer 2), (c) physics walls (Layer 1).
- **Renderer**: worldRig transform consumes the new law; **tau smoothing REMOVED for curve-authority and physics-authority poses** (drawn = target on tick); smoothing survives ONLY as the reduced-motion fold-home policy transition. Byte-stable home preserved.
- Tests: projection law math, feet-on-floor across z, bounds API, no-smoothing gate, home byte-stability, fold intact.

### S3 — Camera fixity (D1)
- GasperDaisStage pack loop: shot-direction engagement REMOVED; world-follow never engages during performances; zoom/pan frozen for the duration, restored on release. User dial untouched (Book 005 §15.2).
- ShotDirector repurposed compile-time: framing bands become a **legibility band on Gasper's on-screen size at each beat's authored depth** (successor of the amplitude floors; camera-free). Live zoom framing retired.
- Capture-side machine gate added: zoom delta ≡ 0 across any performance.

### S4 — Place (D4)
- StageWorld rebuild: STATIC environment (no travel-driven parallax — fixed camera). Ground plane receding to a horizon, depth lanes positioned by the S2 projection law (the lanes are the ruler his size-scaling reads against); legible bound cues at frame edges; horizon placed so home framing reads as a place.
- Floor answers: contact shadow law extended in z (position/size/fade = f(x, altitude, z)); authored bounded impact ripple on heavy landings (McCay ground-sag, vector-only).
- Light motivated: the pool is Gasper's own light — tracks x AND z, attenuates with altitude; near-glass approach brightens the floor toward the viewer.
- Byte-stable home + reduced-motion static art preserved.

### S5 — Meaning schema (D5)
- PerformancePack schema: `beat.objective` REQUIRED; scene `valueTurn {from,to}` REQUIRED; holds flagged as events with intent; face beats reference their objective. Compiler fail-closed on missing fields; golden tests; rubric gate wired.

### S6 — Scene re-authoring + BLOCKING GATE (D2+D3+D5)
- **s2 "play"** (stillness → delighted showing-off): discovers he can bounce → tries it → delights → shows off; depth travel toward the viewer on the final bounce, ending near-glass with a genuine AU6+AU12 smile at the user (bounds Layer 3 affordance). Timing budgets from authored gravity (h=e²·H gate, apex hang from key count, squash∝impulse at each contact).
- **s4 "daring"** (tension → exhilaration): eyes the far wall (awareness beat) → coils and BRACES against the bound (affordance) → fires (the whip is a handful of frames, not seconds) → wall impact (bounds Layer 1) → recoil → thrilled grin; a depth dip mid-flight sells the space.
- **OWNER GATE (process law, the one broken last time):** both scenes performed first as **STEPPED BLOCKING** (no easing) for owner timing approval — cheap to retime, iterated until approved — splined only after. `animatic-first-previs` + `blocking-spline-polish-phases`.

### S7 — Proof + acceptance
Capture drive v3: camera-stability proof (zoom delta 0), depth-read proof (on-screen size change matches projection law), bounds-read proof (never outside frustum), physics-gate reads, meaning manifest + shot suite; live demo; owner verdict = phase gate (and the commit question stays answered only by the owner).

## Guardrails
Per stage: vitest packages scope + tsc + canon suite + no-raster scanner + triforce doctor + decision record + state.json. Standing constraints in force: 5174 never touched without consent; captures observer-only; vector-only; organism clock sole time source; reduced-motion collapse everywhere; classification vocabulary; NO commit without owner confirmation.

## Order
S1 → S2 → S3 → S4 → S5 → S6 (first owner checkpoint = stepped blocking) → S7. GASPER-SPACE-001 Phase C (balloon gate) remains held until craft acceptance.
