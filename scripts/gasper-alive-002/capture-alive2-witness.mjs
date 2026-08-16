// GASPER-ALIVE-002 · D-0109 — THE "FACE THINKS, BODY BREATHES, PLACE IS LIT" WITNESS.
//
// Transport (same law as capture-alive-witness.mjs): Playwright MCP.
//   - telemetry rides the MCP page: attach SAMPLER (fast evaluate), drain
//     every ~24 s with immediate splices, Bash sleeps between drains;
//   - the video sign-off is a SEPARATE recorded context: run_code_unsafe
//     call A creates it (recordVideo + goto) and returns immediately; a
//     Bash sleep covers the take; call B closes it and returns the webm
//     path (Playwright persists on close). Zero commands during the take.
//
// Standing law: captures are OBSERVER-ONLY — the sampler reads telemetry
// and writes nothing; every intake it touches is read-only dataset/DOM.
//
// The witness series (2 Hz over the ~105 s take), alive-001 fields plus:
//   eol         — rendered left-eye aperture (blink witness)
//   smc         — applied state mouth curve (rest-warmth witness)
//   lk          — composed look (the almond-slide gaze vector — the ONLY gaze
//                 channel; the face is pupil-less by ratified character design)
//   np          — count of [data-pupil] nodes (D-0110 absence proof; must be 0)
//
// Life-002 gates (computed by alive2-gates.mjs from telemetry-chunk-*.json):
//   H1 gaze thinks       — lk σ > 0.25, max |lk| ≥ 1.2 (the attention hold
//                          reads through the design language, no anatomy),
//                          AND [data-pupil] count ≡ 0 across every sample
//                          (character-design law machine-proven on the loop)
//   H2 the body breathes — rest-window (prov none, phase observing/resting)
//                          hPx σ ≥ 0.5 px; no 6-sample frozen hPx run anywhere
//   H3 blinks land       — ≥ 2 samples with eol < 0.3
//   H4 life volume holds — eventCount grows ≥ 8 across the take; every
//                          approaching sample has wander disabled (hierarchy)
//   H5 rest is calm      — rest-window mean smc ≥ 0.10 (the warmth floor)
//   H6 the place reads   — lower-third luma of the new take exceeds the
//                          owner's gaspLong_small.mp4 baseline by ≥ 1.25×
//                          (computed offline with ffmpeg signalstats)

export const STAGE_URL = "http://localhost:5174/";
export const TAKE_SECONDS = 105;
export const SAMPLE_MS = 500;

export const SAMPLER = `
window.__LIVE2_WITNESS__ = [];
window.__LIVE2_IV__ = setInterval(() => {
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
    window.__LIVE2_WITNESS__.push({
      t: performance.now(),
      ph: life.phase, m: life.mood, e: life.eventCount,
      a: life.attention ? [life.attention.nx, life.attention.ny] : null,
      px: +wp.applied.x.toFixed(1), py: +wp.applied.y.toFixed(1),
      pz: +wp.applied.z.toFixed(1), prov: wp.target.provenance,
      gz: av ? +av.dataset.externalGazeS : null,
      np: document.querySelectorAll("[data-pupil]").length,
      eol: av ? +av.dataset.renderedEyeOpenL : null,
      smc: av ? +av.dataset.stateMouthCurve : null,
      lk: av ? +av.dataset.lookX : null,
      hPx: hPx ? +hPx.toFixed(2) : null,
      wph: w.phase, we: w.enabled,
    });
  } catch (e) { /* observer never throws into the organism */ }
}, ${SAMPLE_MS});
`;

export const DRAIN = `
(() => { const out = window.__LIVE2_WITNESS__ || []; window.__LIVE2_WITNESS__ = []; return out; })()
`;
