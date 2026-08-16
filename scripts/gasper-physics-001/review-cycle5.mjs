// CANONOPS PRESSURE COOKER — Cycle 5 re-verify instrument (D-0116, take 4).
// Observer-only: witness (a) the Cycle-3 bars STILL hold, (b) the Cycle-4
// frontal channels STILL hold, and (c) the NEW Cycle-5 step channel
// (step-cycle-phd-memo, D-0118 step vocabulary): S1 planted-base hold +
// switch fraction, S2 footfall<->squash phase lock + skew fence, S3
// collapse at rest. ZERO commands to the organism.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const EXEC = process.env.GASPER_CHROMIUM_EXEC || "C:\\Users\\funny\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const OUT = process.env.GASPER_PHYSICS_REVIEW_OUT || "C:\\Users\\funny\\Documents\\GasperStudio\\research\\proofs\\gasper-physics-001\\reviews";
const URL = process.env.GASPER_PHYSICS_REVIEW_URL || "http://localhost:7100/";
const FFMPEG = process.env.GASPER_FFMPEG || "ffmpeg";
const SECONDS = Number(process.argv[2] || 75);
mkdirSync(`${OUT}/frames-c5`, { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL);
await page.waitForSelector("#avatar", { timeout: 20000 });
await page.waitForTimeout(2500); // settle

// 20 Hz witness: wander phrasing + gait channels incl. Cycle-5 step channel
await page.evaluate((hz) => {
  window.__C5W__ = [];
  window.__C5W_IV__ = setInterval(() => {
    try {
      const av = document.querySelector("#avatar");
      const rig = window.SidekickFormMasterRig;
      const d = window.__GASPER_DAIS__;
      const wp = rig && rig.getWorldPose ? rig.getWorldPose() : null;
      const body = d && d.getWorldBodyState ? d.getWorldBodyState() : null;
      const w = d && d.getWanderState ? d.getWanderState() : null;
      const life = d && d.getLifeState ? d.getLifeState() : null;
      window.__C5W__.push({
        t: performance.now(),
        px: wp ? +wp.applied.x.toFixed(1) : null,
        pz: wp ? +wp.applied.z.toFixed(1) : null,
        prov: wp ? wp.target.provenance : null,
        wph: w ? w.phase : null,
        lf: life ? life.phase : null,
        legPhase: w ? w.legPhase : null,
        legMode: w ? w.legMode : null,
        legSteady: w ? +w.legSteadySeconds.toFixed(3) : null,
        // The production surface exposes the authoritative ratio through the
        // body-state packet; older builds also mirrored it into a DOM data
        // attribute. Read the packet first and retain the DOM fallback so the
        // observer cannot silently classify a live gait as rest.
        gSr: av ? +(body?.gait?.speedRatio ?? av.dataset.gaitSpeedRatio ?? 0) : +(body?.gait?.speedRatio ?? 0),
        gHz: av ? +(av.dataset.gaitHz ?? 0) : null,
        gBob: av ? +(av.dataset.gaitBob ?? 0) : null,
        gSwayX: av ? +(av.dataset.gaitSwayX ?? 0) : null,
        gRoll: av ? +(av.dataset.gaitRoll ?? 0) : null,
        gSquash: av ? +(av.dataset.gaitSquash ?? 0) : null,
        gPh: av ? +(av.dataset.gaitPhase ?? 0) : null,
        gStepX: av ? +(av.dataset.gaitStepX ?? 0) : null,
        gStepSkew: av ? +(av.dataset.gaitStepSkew ?? 0) : null,
        mMode: document.documentElement.dataset.motionMode ?? null,
      });
    } catch { /* observer never throws into the organism */ }
  }, 1000 / hz);
}, 20);

// rAF-rate sampler: M3 spectrum + Cycle-4 phase binning + Cycle-5 step
// channel need >=2x stepHz sampling (gait ~5.8 Hz => 60 fps rAF).
await page.evaluate(() => {
  window.__C5S__ = [];
  window.__C5_T0__ = performance.timeOrigin; // epoch ms anchor for frame mapping
  const step = () => {
    try {
      const g = document.getElementById("ground");
      const cs = document.getElementById("contactShadow");
      const av = document.querySelector("#avatar");
      const d = window.__GASPER_DAIS__;
      const body = d && d.getWorldBodyState ? d.getWorldBodyState() : null;
      const w = d && d.getWanderState ? d.getWanderState() : null;
      window.__C5S__.push({
        t: performance.now(),
        gOp: g ? parseFloat(g.getAttribute("opacity")) : null,
        cOp: cs ? parseFloat(cs.getAttribute("opacity")) : null,
        gPh: av ? +(av.dataset.gaitPhase ?? 0) : null,
        gHz: av ? +(av.dataset.gaitHz ?? 0) : null,
        gSr: av ? +(body?.gait?.speedRatio ?? av.dataset.gaitSpeedRatio ?? 0) : +(body?.gait?.speedRatio ?? 0),
        gRoll: av ? +(av.dataset.gaitRoll ?? 0) : null,
        gSquash: av ? +(av.dataset.gaitSquash ?? 0) : null,
        gSwayX: av ? +(av.dataset.gaitSwayX ?? 0) : null,
        gStepX: av ? +(av.dataset.gaitStepX ?? 0) : null,
        gStepSkew: av ? +(av.dataset.gaitStepSkew ?? 0) : null,
        legPhase: w ? w.legPhase : null,
        legSteady: w ? +w.legSteadySeconds.toFixed(3) : null,
        legMode: w ? w.legMode : null,
      });
    } catch { /* observer never throws */ }
    window.__C5S_RAF__ = requestAnimationFrame(step);
  };
  step();
});

// 60fps screencast
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async (ev) => {
  frames.push({ ts: ev.metadata.timestamp, data: ev.data });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }); } catch {}
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 80, everyFrame: true, maxFramerate: 60 });
await page.waitForTimeout(SECONDS * 1000);
await cdp.send("Page.stopScreencast");

const witness = await page.evaluate(() => { clearInterval(window.__C5W_IV__); return window.__C5W__; });
const shadow = await page.evaluate(() => { cancelAnimationFrame(window.__C5S_RAF__); return window.__C5S__; });
const timeOriginMs = await page.evaluate(() => window.__C5_T0__);
await browser.close();

frames.forEach((f, i) => writeFileSync(`${OUT}/frames-c5/f${String(i).padStart(5, "0")}.jpg`, Buffer.from(f.data, "base64")));
const dt = frames.length > 1 ? (frames[frames.length - 1].ts - frames[0].ts) / (frames.length - 1) : 0;
writeFileSync(`${OUT}/cycle5-witness.json`, JSON.stringify(witness, null, 1));
writeFileSync(`${OUT}/cycle5-shadow.json`, JSON.stringify(shadow, null, 1));
writeFileSync(`${OUT}/cycle5-frametimes.json`, JSON.stringify(frames.map((f) => f.ts)));
// N24 lose-nothing: deposit the epoch anchor so frame<->sample mapping is
// reproducible offline (take 4 lost it — never again).
writeFileSync(`${OUT}/cycle5-timeorigin.json`, JSON.stringify({ timeOriginMs, note: "epoch ms = performance.timeOrigin; frame epoch s in cycle5-frametimes.json; sample t ms = performance.now()" }));

// time-true encode
const list = [];
for (let i = 0; i < frames.length; i++) {
  const dur = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].ts - frames[i].ts) : 0.02;
  list.push(`file 'frames-c5/f${String(i).padStart(5, "0")}.jpg'\nduration ${dur.toFixed(4)}`);
}
list.push(`file 'frames-c5/f${String(frames.length - 1).padStart(5, "0")}.jpg'`);
writeFileSync(`${OUT}/frames-c5-concat.txt`, list.join("\n") + "\n");
const webm = `${OUT}/cycle5-60fps.webm`;
execFileSync(FFMPEG, ["-nostdin", "-y", "-f", "concat", "-safe", "0", "-i", `${OUT}/frames-c5-concat.txt`, "-vf", "fps=60", "-c:v", "libvpx-vp9", "-b:v", "2500k", webm], { cwd: OUT, stdio: ["ignore", "ignore", "inherit"] });

// ---------- ANALYSIS ----------
const T0 = witness.length ? witness[0].t : 0;
const TWO_PI = 2 * Math.PI;
const mod2pi = (p) => ((p % TWO_PI) + TWO_PI) % TWO_PI;
const meanAbs = (xs) => (xs.length ? xs.reduce((a, b) => a + Math.abs(b), 0) / xs.length : 0);
const p95 = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))];
};

// --- Cycle-3 bars (must still hold) ---
const steadyRuns = [];
let run = null;
for (const w of witness) {
  const inSteady = w.legPhase === "steady" && w.gSr != null && w.gSr >= 0.8;
  if (inSteady) {
    if (!run) run = { t0: w.t, t1: w.t, mode: w.legMode, composed: w.legSteady };
    run.t1 = w.t;
  } else if (run) {
    steadyRuns.push(run); run = null;
  }
}
if (run) steadyRuns.push(run);
const bestRun = steadyRuns.reduce((a, b) => ((b.t1 - b.t0) > (a.t1 - a.t0) ? b : a), { t0: 0, t1: 0 });

const steadyRunsRaf = [];
let runR = null;
for (const s of shadow) {
  const on = s.legPhase === "steady" && s.gSr != null && s.gSr >= 0.8;
  if (on) {
    if (!runR) runR = { t0: s.t, t1: s.t, composed: s.legSteady, mode: s.legMode };
    runR.t1 = s.t;
  } else if (runR) {
    steadyRunsRaf.push(runR); runR = null;
  }
}
if (runR) steadyRunsRaf.push(runR);
const bestRunRaf = steadyRunsRaf.reduce((a, b) => ((b.t1 - b.t0) > (a.t1 - a.t0) ? b : a), { t0: 0, t1: 0 });

const legs = {};
for (const w of witness) if (w.legMode) legs[w.legMode] = (legs[w.legMode] || 0) + 1;

const travel = shadow.filter((s) => s.gHz > 1 && s.gOp != null);
let m3 = { samples: travel.length, p2pRel: null, bins: 0 };
if (travel.length > 200) {
  const NB = 16;
  const bins = Array.from({ length: NB }, () => []);
  for (const s of travel) {
    const ph = mod2pi(s.gPh);
    bins[Math.min(NB - 1, Math.floor((ph / TWO_PI) * NB))].push(s.gOp);
  }
  const means = bins.filter((b) => b.length >= 3).map((b) => b.reduce((a, v) => a + v, 0) / b.length);
  const hi = Math.max(...means), lo = Math.min(...means);
  m3 = { samples: travel.length, bins: means.length, hi: +hi.toFixed(4), lo: +lo.toFixed(4), p2pRel: +((hi - lo) / hi).toFixed(4) };
}

const REST_DRIFT = 3200 / (1.618033988749895 ** 2);
const dormant = witness.filter((w) => w.wph === "dormant" && w.px != null && w.prov === "none");
const lifeWalkSamples = witness.filter(
  (w) => w.wph === "dormant" && (w.prov === "physics-authority" || w.prov === "life-authority"),
).length;
let maxDrift = 0;
for (let i = 1; i < dormant.length; i++) {
  const a = dormant[i - 1], b = dormant[i];
  const dts = (b.t - a.t) / 1000;
  if (dts <= 0 || dts > 0.5) continue;
  const v = Math.hypot(b.px - a.px, b.pz - a.pz) / dts;
  if (v > maxDrift) maxDrift = v;
}

// --- Cycle-4 frontal channels (must still hold) ---
const walking = shadow.filter((s) => s.gHz > 1 && s.gSr >= 0.8);
const W = 0.55;
const nearMid = walking.filter((w) => { const p = mod2pi(w.gPh); return p < W || p > TWO_PI - W; });
const nearDbl = walking.filter((w) => Math.abs(mod2pi(w.gPh) - Math.PI) < W);

const rolls = walking.map((w) => w.gRoll ?? 0);
const f1 = {
  walkingSamples: walking.length,
  maxAbsRollDeg: +(Math.max(0, ...rolls.map(Math.abs)).toFixed(3)),
  minRollDeg: +(Math.min(0, ...rolls).toFixed(3)),
  maxRollDeg: +(Math.max(0, ...rolls).toFixed(3)),
  signFlips: rolls.reduce((n, r, i) => (i > 0 && Math.sign(r) !== Math.sign(rolls[i - 1]) && Math.abs(r) > 0.3 && Math.abs(rolls[i - 1]) > 0.3 ? n + 1 : n), 0),
  fenceOk: rolls.every((r) => Math.abs(r) <= 5.001),
};

const f2 = {
  nearMidSamples: nearMid.length,
  nearDoubleSamples: nearDbl.length,
  rollMidMeanDeg: +(meanAbs(nearMid.map((w) => w.gRoll)).toFixed(3)),
  rollDoubleMeanDeg: +(meanAbs(nearDbl.map((w) => w.gRoll)).toFixed(3)),
  swayMidMeanU: +(meanAbs(nearMid.map((w) => w.gSwayX)).toFixed(2)),
  swayDoubleMeanU: +(meanAbs(nearDbl.map((w) => w.gSwayX)).toFixed(2)),
};
f2.rollPhaseLawOk = f2.rollMidMeanDeg >= 1 && f2.rollDoubleMeanDeg <= 0.4 * f2.rollMidMeanDeg;
f2.swayPhaseLawOk = f2.swayMidMeanU > 5 && f2.swayDoubleMeanU <= 0.35 * f2.swayMidMeanU;

const squashes = walking.map((w) => w.gSquash ?? 0);
const rest = witness.filter((w) => (w.gHz ?? 0) <= 0.5);
const f3 = {
  peakSquash: +(Math.max(0, ...squashes).toFixed(4)),
  squashAtContactMean: +(meanAbs(nearDbl.map((w) => w.gSquash)).toFixed(4)),
  squashAtMidstanceMean: +(meanAbs(nearMid.map((w) => w.gSquash)).toFixed(4)),
  restSamples: rest.length,
  restMaxSquash: +(Math.max(0, ...rest.map((w) => w.gSquash ?? 0)).toFixed(5)),
  fenceOk: squashes.every((c) => c <= 0.05001),
};
f3.contactAnswerOk = f3.squashAtContactMean >= 2 * Math.max(f3.squashAtMidstanceMean, 1e-6) && f3.peakSquash > 0.004;
f3.restCollapseOk = f3.restMaxSquash < 0.0005;

// --- Cycle-5 step channel (the new bar) ---
// S1 — planted-base character, PROJECTION-FREE. The step channel is a screen
// projection: swayX and stepX BOTH carry the same heading factor P=(-vz/speed)
// and the same amplitude A=swayUnits, so the normalized waveform
//   b_hat = stepX*u/swayX = tanh(k*u),  u = cos(phase/2),
// cancels heading and amplitude; the law reads as a pure function of phase.
// (Amplitude bars like p95(|stepX|) are confounded the moment the wander
// heading leaves pure depth — take 4's first metric was exactly that error,
// corrected here.) HOLD: near mid-stance |b_hat| ~ tanh(k) ~ 1 — the base
// plants at extremum. SWITCH: the fraction of walking phase inside the
// exchange window |tanh(k*u)| < 0.9 (i.e. |u| < atanh(0.9)/k) estimates the
// double-support fraction of the step period (law 18.1 %, clinical band
// 10-20 %; step-cycle-phd-memo S1/T1).
const K_LAW = 2 * 1.618033988749895 ** 2; // = GAIT_LAW.stepPlacementSharpness
const U_SWITCH = Math.atanh(0.9) / K_LAW;
const stepXs = walking.map((w) => w.gStepX ?? 0);
const normSamples = [];
for (const w of walking) {
  const u = Math.cos(mod2pi(w.gPh) / 2);
  if (Math.abs(u) < 0.3 || Math.abs(w.gSwayX ?? 0) < 2) continue; // envelope stable
  normSamples.push({ ph: mod2pi(w.gPh), bHat: ((w.gStepX ?? 0) * u) / (w.gSwayX ?? 1) });
}
const nearMidNorm = normSamples.filter((n) => n.ph < W || n.ph > TWO_PI - W);
const inSwitchPhase = walking.filter((w) => Math.abs(Math.cos(mod2pi(w.gPh) / 2)) < U_SWITCH);
const s1 = {
  law: { k: +K_LAW.toFixed(5), uSwitch: +U_SWITCH.toFixed(4), switchFraction: +(((Math.PI - 2 * Math.acos(U_SWITCH)) / Math.PI).toFixed(4)) },
  walkingSamples: walking.length,
  normalizedSamples: normSamples.length,
  nearMidSamples: nearMidNorm.length,
  holdMidMeanAbsBHat: nearMidNorm.length ? +(meanAbs(nearMidNorm.map((n) => n.bHat)).toFixed(4)) : null,
  holdMidMinAbsBHat: nearMidNorm.length ? +(Math.min(...nearMidNorm.map((n) => Math.abs(n.bHat))).toFixed(4)) : null,
  switchFraction: walking.length ? +((inSwitchPhase.length / walking.length).toFixed(4)) : null,
  bothSidesPlanted: {
    maxStepU: +(Math.max(0, ...stepXs).toFixed(2)),
    minStepU: +(Math.min(0, ...stepXs).toFixed(2)),
  },
};
s1.holdOk = s1.nearMidSamples > 10 && s1.holdMidMeanAbsBHat != null && s1.holdMidMeanAbsBHat >= 0.97;
s1.switchFractionOk = s1.switchFraction != null && s1.switchFraction >= 0.10 && s1.switchFraction <= 0.26;
s1.bothSidesOk = s1.bothSidesPlanted.maxStepU > 5 && s1.bothSidesPlanted.minStepU < -5;

// S2 — footfall<->squash phase lock + skew expression.
//
// INSTRUMENT CORRECTION (cycle-6 verdict, disclosed): the cycle-5 estimator
// was a 16-bin argmax — the squash MAXIMUM bin / |stepX| MINIMUM bin center
// must sit within 0.45 rad of pi (the contact beat). The fence 0.45 lands
// exactly BETWEEN the two adjacent bin readings 0.196 (bin 7) and 0.589
// (bin 6), and squash-vs-phase is a broad plateau around contact (bin means
// within tens of %), so the argmax flips between "green" and "red" on
// sampling noise — a degenerate read (takes 7/8/10/11 red at 0.589, takes
// 7b/7c/9 green at 0.196, zero code changes between). The gating estimator
// is now the WEIGHTED CIRCULAR MEAN of gait phase (directional statistics —
// the consistent estimator of a distribution's central angle): squash
// weighted by squash magnitude (lock of compression to contact), step
// weighted by step smallness (lock of the planted beat to contact). Same
// 0.45 rad fence, same walking gate (gHz > 1 && gSr >= 0.8). The argmax
// read is still deposited beside it (squashLockArgmaxRad/stepLockArgmaxRad).
const NB = 16;
const stepBins = Array.from({ length: NB }, () => []);
const squashBins = Array.from({ length: NB }, () => []);
for (const w of walking) {
  const b = Math.min(NB - 1, Math.floor((mod2pi(w.gPh) / TWO_PI) * NB));
  stepBins[b].push(Math.abs(w.gStepX ?? 0));
  squashBins[b].push(w.gSquash ?? 0);
}
const binMean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Infinity);
const stepBinMeans = stepBins.map(binMean);
const squashBinMeans = squashBins.map((xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : -Infinity));
const argmin = (xs) => xs.indexOf(Math.min(...xs));
const argmax = (xs) => xs.indexOf(Math.max(...xs));
const stepMinBinCenter = ((argmin(stepBinMeans) + 0.5) / NB) * TWO_PI;
const squashMaxBinCenter = ((argmax(squashBinMeans) + 0.5) / NB) * TWO_PI;
const angDistToPi = (a) => Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI)));
// Weighted circular mean phase (cycle-6 correction) for the SQUASH channel
// only — the step channel's argmin is a sharp feature (|stepX| minimum),
// never degenerate across all cycle-6 takes, and stays the committed read.
// Validity: the mean direction is meaningful only when the weighted
// distribution is concentrated (mean resultant length Rbar >= 0.2, the
// directional-statistics floor); below that the channel FAILS CLOSED
// (Infinity) — a diffuse squash distribution is not a lock.
const circStats = (weights, phases) => {
  let sx = 0, sy = 0, W = 0;
  for (let i = 0; i < phases.length; i++) {
    const wt = weights[i];
    if (!(wt > 0)) continue;
    sx += wt * Math.cos(phases[i]);
    sy += wt * Math.sin(phases[i]);
    W += wt;
  }
  return W > 0
    ? { phase: mod2pi(Math.atan2(sy, sx)), rBar: Math.hypot(sx, sy) / W }
    : null;
};
const walkPhases = walking.map((w) => mod2pi(w.gPh));
const squashWeighted = circStats(walking.map((w) => Math.max(0, w.gSquash ?? 0)), walkPhases);
const SQUASH_RBAR_FLOOR = 0.2;
const squashLockWeighted =
  squashWeighted && squashWeighted.rBar >= SQUASH_RBAR_FLOOR
    ? angDistToPi(squashWeighted.phase)
    : Infinity;
const skews = walking.map((w) => w.gStepSkew ?? 0);
// Delta ratio, projection-free: |stepX - swayX|*|u|/|swayX| = |tanh(k*u) - u|
// (same heading/amplitude cancellation as S1). Law max 0.6187*A (memo S2:
// +0.12 % vs 1/phi, OBSERVED not claimed). The raw p95-ratio is reported
// for reference only; the bar rides the normalized value.
let deltaRatioMaxNormalized = 0;
for (const w of walking) {
  if (Math.abs(w.gSwayX ?? 0) < 2) continue;
  const u = Math.cos(mod2pi(w.gPh) / 2);
  const r = Math.abs((w.gStepX ?? 0) - (w.gSwayX ?? 0)) * Math.abs(u) / Math.abs(w.gSwayX ?? 1);
  if (r > deltaRatioMaxNormalized) deltaRatioMaxNormalized = r;
}
const s2 = {
  stepMinBinCenterRad: +stepMinBinCenter.toFixed(3),
  squashMaxBinCenterRad: +squashMaxBinCenter.toFixed(3),
  // 16-bin argmax reads — the cycle-5 estimators. The step argmin stays the
  // committed gate (sharp feature, never degenerate in any cycle-6 take);
  // the squash argmax is degenerate on the contact plateau, so it is kept
  // for DISCLOSURE only and no longer gates.
  stepLockArgmaxRad: +angDistToPi(stepMinBinCenter).toFixed(3),
  squashLockArgmaxRad: +angDistToPi(squashMaxBinCenter).toFixed(3),
  // Gating reads: step = committed argmin bin center; squash = weighted
  // circular mean phase (cycle-6 correction), same 0.45 rad fence, fails
  // closed when the weighted distribution is diffuse (Rbar < floor).
  stepLockToContactRad: +angDistToPi(stepMinBinCenter).toFixed(3),
  squashLockToContactRad: Number.isFinite(squashLockWeighted) ? +squashLockWeighted.toFixed(3) : Infinity,
  squashWeightedPhaseRad: squashWeighted ? +squashWeighted.phase.toFixed(3) : null,
  squashWeightedRBar: squashWeighted ? +squashWeighted.rBar.toFixed(3) : 0,
  maxAbsSkewDeg: +(Math.max(0, ...skews.map(Math.abs)).toFixed(3)),
  skewFenceOk: skews.every((k) => Math.abs(k) <= 4.001),
  skewAlive: Math.max(0, ...skews.map(Math.abs)) > 0.3,
  deltaRatioMaxNormalized: +deltaRatioMaxNormalized.toFixed(4),
  lawDeltaMax: 0.6187,
};
s2.phaseLockOk = s2.stepLockToContactRad <= 0.45 && s2.squashLockToContactRad <= 0.45;
s2.deltaRatioOk = deltaRatioMaxNormalized >= 0.5 && deltaRatioMaxNormalized <= 0.72;

// S3 — collapse: true rest carries no step channel (home byte-stability law).
const s3 = {
  trueRestSamples: dormant.length,
  restMaxAbsStepX: +(Math.max(0, ...dormant.map((w) => Math.abs(w.gStepX ?? 0))).toFixed(4)),
  restMaxAbsSkew: +(Math.max(0, ...dormant.map((w) => Math.abs(w.gStepSkew ?? 0))).toFixed(4)),
};
s3.collapseOk = s3.restMaxAbsStepX < 0.01 && s3.restMaxAbsSkew < 0.01;

// --- visual pair: map a mid-stance and a double-support sample inside the
// best rAF steady run onto screencast frame indices (epoch-ms alignment).
const frameEpoch = frames.map((f) => f.ts * 1000);
const frameForEpoch = (epochMs) => {
  let lo = 0, hi = frameEpoch.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (frameEpoch[mid] < epochMs) lo = mid + 1; else hi = mid; }
  if (lo > 0 && Math.abs(frameEpoch[lo - 1] - epochMs) < Math.abs(frameEpoch[lo] - epochMs)) lo--;
  return lo;
};
let visualPair = null;
if (bestRunRaf.t1 > bestRunRaf.t0) {
  const inRun = walking.filter((w) => w.t >= bestRunRaf.t0 && w.t <= bestRunRaf.t1);
  let midS = null, dblS = null;
  for (const w of inRun) {
    const p = mod2pi(w.gPh);
    const dm = Math.min(p, TWO_PI - p);
    const dd = Math.abs(p - Math.PI);
    if (!midS || dm < midS.dm) midS = { ...w, dm };
    if (!dblS || dd < dblS.dd) dblS = { ...w, dd };
  }
  if (midS && dblS) {
    visualPair = {
      runSeconds: +((bestRunRaf.t1 - bestRunRaf.t0) / 1000).toFixed(3),
      midFrame: frameForEpoch(timeOriginMs + midS.t),
      midPhase: +mod2pi(midS.gPh).toFixed(3),
      dblFrame: frameForEpoch(timeOriginMs + dblS.t),
      dblPhase: +mod2pi(dblS.gPh).toFixed(3),
      framesApart: Math.abs(frameForEpoch(timeOriginMs + midS.t) - frameForEpoch(timeOriginMs + dblS.t)),
    };
  }
}

console.log(JSON.stringify({
  frames: frames.length, measuredFps: dt > 0 ? +(1 / dt).toFixed(2) : null,
  witnessSamples: witness.length, shadowSamples: shadow.length, webm,
  cycle3Bars: {
    bestObservedSteadySeconds: +((bestRun.t1 - bestRun.t0) / 1000).toFixed(3),
    bestObservedSteadySecondsRaf: +((bestRunRaf.t1 - bestRunRaf.t0) / 1000).toFixed(3),
    bestComposedSteadySeconds: bestRunRaf.composed ?? bestRun.composed ?? null,
    bestRunMode: bestRunRaf.mode ?? bestRun.mode ?? null,
    steadyRunCount: steadyRuns.length,
    steadyRunCountRaf: steadyRunsRaf.length,
    allRuns: steadyRunsRaf.slice(0, 12).map((r) => ({ at: +((r.t0 - (shadow.length ? shadow[0].t : 0)) / 1000).toFixed(1), dur: +((r.t1 - r.t0) / 1000).toFixed(3), composed: r.composed, mode: r.mode })),
    legModeCensus: legs,
    m3,
    singularity: { trueRestSamples: dormant.length, lifeWalkSamples, maxDriftUnitsPerSec: +maxDrift.toFixed(1), restDriftLimit: +REST_DRIFT.toFixed(1), pass: maxDrift <= REST_DRIFT },
  },
  cycle4: { f1, f2, f3 },
  cycle5: { s1, s2, s3 },
  visualPair,
}, null, 1));
