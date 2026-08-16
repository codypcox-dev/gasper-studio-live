// Take-4 offline re-analysis — mirrors the corrected review-cycle5.mjs
// analysis section 1:1, reading the deposited JSONs. Every bar in
// cycle5-verdict.md is recomputed here from saved data.
import { readFileSync } from "node:fs";
const OUT = "C:\\Users\\funny\\Documents\\GasperStudio\\research\\proofs\\gasper-physics-001\\reviews";
const witness = JSON.parse(readFileSync(`${OUT}/cycle5-witness.json`, "utf8"));
const shadow = JSON.parse(readFileSync(`${OUT}/cycle5-shadow.json`, "utf8"));

const T0 = witness.length ? witness[0].t : 0;
const TWO_PI = 2 * Math.PI;
const mod2pi = (p) => ((p % TWO_PI) + TWO_PI) % TWO_PI;
const meanAbs = (xs) => (xs.length ? xs.reduce((a, b) => a + Math.abs(b), 0) / xs.length : 0);

// --- Cycle-3 bars ---
const steadyRuns = [];
let run = null;
for (const w of witness) {
  const inSteady = w.legPhase === "steady" && w.gSr != null && w.gSr >= 0.8;
  if (inSteady) { if (!run) run = { t0: w.t, t1: w.t, mode: w.legMode, composed: w.legSteady }; run.t1 = w.t; }
  else if (run) { steadyRuns.push(run); run = null; }
}
if (run) steadyRuns.push(run);
const bestRun = steadyRuns.reduce((a, b) => ((b.t1 - b.t0) > (a.t1 - a.t0) ? b : a), { t0: 0, t1: 0 });

const steadyRunsRaf = [];
let runR = null;
for (const s of shadow) {
  const on = s.legPhase === "steady" && s.gSr != null && s.gSr >= 0.8;
  if (on) { if (!runR) runR = { t0: s.t, t1: s.t, composed: s.legSteady, mode: s.legMode }; runR.t1 = s.t; }
  else if (runR) { steadyRunsRaf.push(runR); runR = null; }
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
  for (const s of travel) bins[Math.min(NB - 1, Math.floor((mod2pi(s.gPh) / TWO_PI) * NB))].push(s.gOp);
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

// --- Cycle-4 bars ---
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

// --- Cycle-5 bars (corrected, projection-free) ---
const K_LAW = 2 * 1.618033988749895 ** 2;
const U_SWITCH = Math.atanh(0.9) / K_LAW;
const stepXs = walking.map((w) => w.gStepX ?? 0);
const normSamples = [];
for (const w of walking) {
  const u = Math.cos(mod2pi(w.gPh) / 2);
  if (Math.abs(u) < 0.3 || Math.abs(w.gSwayX ?? 0) < 2) continue;
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
const skews = walking.map((w) => w.gStepSkew ?? 0);
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
  stepLockToContactRad: +angDistToPi(stepMinBinCenter).toFixed(3),
  squashLockToContactRad: +angDistToPi(squashMaxBinCenter).toFixed(3),
  maxAbsSkewDeg: +(Math.max(0, ...skews.map(Math.abs)).toFixed(3)),
  skewFenceOk: skews.every((k) => Math.abs(k) <= 4.001),
  skewAlive: Math.max(0, ...skews.map(Math.abs)) > 0.3,
  deltaRatioMaxNormalized: +deltaRatioMaxNormalized.toFixed(4),
  lawDeltaMax: 0.6187,
};
s2.phaseLockOk = s2.stepLockToContactRad <= 0.45 && s2.squashLockToContactRad <= 0.45;
s2.deltaRatioOk = deltaRatioMaxNormalized >= 0.5 && deltaRatioMaxNormalized <= 0.72;

const s3 = {
  trueRestSamples: dormant.length,
  restMaxAbsStepX: +(Math.max(0, ...dormant.map((w) => Math.abs(w.gStepX ?? 0))).toFixed(4)),
  restMaxAbsSkew: +(Math.max(0, ...dormant.map((w) => Math.abs(w.gStepSkew ?? 0))).toFixed(4)),
};
s3.collapseOk = s3.restMaxAbsStepX < 0.01 && s3.restMaxAbsSkew < 0.01;

console.log(JSON.stringify({
  witnessSamples: witness.length, shadowSamples: shadow.length,
  cycle3Bars: {
    bestObservedSteadySeconds: +((bestRun.t1 - bestRun.t0) / 1000).toFixed(3),
    bestObservedSteadySecondsRaf: +((bestRunRaf.t1 - bestRunRaf.t0) / 1000).toFixed(3),
    bestComposedSteadySeconds: bestRunRaf.composed ?? bestRun.composed ?? null,
    bestRunMode: bestRunRaf.mode ?? bestRun.mode ?? null,
    steadyRunCount: steadyRuns.length,
    steadyRunCountRaf: steadyRunsRaf.length,
    allRunsRaf: steadyRunsRaf.map((r) => ({ at: +((r.t0 - (shadow.length ? shadow[0].t : 0)) / 1000).toFixed(1), dur: +((r.t1 - r.t0) / 1000).toFixed(3), composed: r.composed, mode: r.mode })),
    legModeCensus: legs,
    m3,
    singularity: { trueRestSamples: dormant.length, lifeWalkSamples, maxDriftUnitsPerSec: +maxDrift.toFixed(1), restDriftLimit: +REST_DRIFT.toFixed(1), pass: maxDrift <= REST_DRIFT },
  },
  cycle4: { f1, f2, f3 },
  cycle5: { s1, s2, s3 },
  machineVerdict: {
    cycle3: m3.p2pRel != null && m3.p2pRel >= 0.10 && maxDrift <= REST_DRIFT && (bestRunRaf.t1 - bestRunRaf.t0) / 1000 >= 0.5,
    cycle4: f1.fenceOk && f1.signFlips >= 4 && f2.rollPhaseLawOk && f2.swayPhaseLawOk && f3.contactAnswerOk && f3.restCollapseOk,
    cycle5: s1.holdOk && s1.switchFractionOk && s1.bothSidesOk && s2.phaseLockOk && s2.skewFenceOk && s2.skewAlive && s2.deltaRatioOk && s3.collapseOk,
  },
}, null, 1));
