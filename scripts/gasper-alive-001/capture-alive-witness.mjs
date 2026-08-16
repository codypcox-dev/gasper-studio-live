// GASPER-ALIVE-001 · D-0108 — THE LONG-AUTONOMY WITNESS CAPTURE.
//
// Transport (same law as capture-s7-drive.mjs): Playwright MCP. The probe
// phase is an in-page expression persisted by browser_evaluate's `filename`
// parameter (research/proofs/gasper-alive-001/probe.json). The long-stretch
// sign-off is browser_run_code_unsafe with recordVideo: a FRESH context
// loads the stage (idle life is the default — autoSequence opens on mount),
// a 2 Hz observer-only sampler rides inside the page for the whole take,
// then the context closes and Playwright persists the webm.
//
// Standing law: captures are OBSERVER-ONLY — pixels never feed organism
// state. The sampler reads telemetry; it writes nothing. The only commands
// in this file are the probe's public provenance-fenced intakes.
//
// The witness series (2 Hz, ~210 samples over the 105 s take):
//   ph / m / e   — life-director phase, mood rotor, event count
//   a            — attention target (normalized) or null
//   px/py/pz/wp  — applied world pose + target provenance (bounds + mover)
//   gz           — external-gaze strength telemetry (avatar dataset)
//   hPx          — on-screen contour height (D-0098 idiom: the depth read)
//   wph / we     — wander organ phase + master switch (hierarchy witness)
//
// Life gates (computed from the series by witness-gates.mjs):
//   G1 autonomy volume   — eventCount ≥ 15 self-initiated acts in the take
//   G2 life moves him    — life-authority samples > 0, min applied z ≤ −600
//                          (the approach actually reaches the glass lane)
//   G3 breath never stops— no 6-sample (3 s) run of identical hPx; σ > 0
//   G4 attention visible — gaze-engaged samples > 0, ≥ 3 distinct targets
//   G5 never metronomic  — ≥ 8 distinct inter-event intervals
//   G6 hierarchy live    — every approaching sample has wander disabled

export const STAGE_URL = "http://localhost:5174/";
export const TAKE_SECONDS = 105;
export const SAMPLE_MS = 500;

export const SAMPLER = `
window.__LIVE_WITNESS__ = [];
window.__LIVE_WITNESS_IV__ = setInterval(() => {
  try {
    const d = window.__GASPER_DAIS__;
    const rig = window.SidekickFormMasterRig;
    const av = document.querySelector("#avatar");
    const clip = document.querySelector("#bodyClip path");
    const user = document.querySelector("#chromaticShell") ||
      document.querySelector("[clip-path='url(#bodyClip)']");
    const ctm = user && user.getScreenCTM ? user.getScreenCTM() : null;
    const hPx = clip && ctm ? clip.getBBox().height * Math.hypot(ctm.b, ctm.d) : null;
    const wp = rig.getWorldPose();
    const life = d.getLifeState();
    const w = d.getWanderState();
    window.__LIVE_WITNESS__.push({
      t: performance.now(),
      ph: life.phase, m: life.mood, e: life.eventCount,
      a: life.attention ? [life.attention.nx, life.attention.ny] : null,
      px: +wp.applied.x.toFixed(1), py: +wp.applied.y.toFixed(1),
      pz: +wp.applied.z.toFixed(1), prov: wp.target.provenance,
      gz: av ? +av.dataset.externalGazeS : null,
      hPx: hPx ? +hPx.toFixed(2) : null,
      wph: w.phase, we: w.enabled,
    });
  } catch (err) { /* the witness never interrupts the life it watches */ }
}, ${SAMPLE_MS});
`;

// The recording run is performed interactively via browser_run_code_unsafe:
//   new context (recordVideo 1600×800) → goto STAGE_URL → verify autonomy
//   open → install SAMPLER → waitForTimeout(TAKE_SECONDS·1000) → collect
//   series + final life state → close page/context → video.path().
// The webm is then copied into research/proofs/gasper-alive-001/captures/
// and witness-gates.mjs computes G1–G6 from the deposited series.
