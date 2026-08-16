// GASPER-ALIVE-002 · D-0109 — the life-002 gate computer.
// Reads research/proofs/gasper-alive-002/telemetry-chunk-*.json (concatenated
// in filename order — one page, one contiguous series), computes H1–H5 from
// the series and takes H6 (place-luma ratio vs the owner's baseline video)
// as --luma-ratio=<x> from the offline ffmpeg measurement. Writes
// life2-gates.json; exits nonzero on any fail.
//
// WINDOW LAW (D-0110 witness protocol): count thresholds are RATES, not
// absolutes. They were authored against the design take length (105s) and are
// span-scaled to the actual observation window, because the witness sampler
// attached to the living page mid-run (browser recovery) — raw counts would
// punish window position, not behavior. The design rates are the law:
//   rest occupancy  >= 20 / 105s  (= 0.1905 samples/s)
//   life events     >=  8 / 105s  (= 0.0762 events/s)
// Each gate reports the raw count AND the scaled requirement side by side.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proofDir = join(here, "..", "..", "research", "proofs", "gasper-alive-002");
const lumaArg = process.argv.find((a) => a.startsWith("--luma-ratio="));
const lumaRatio = lumaArg ? Number(lumaArg.split("=")[1]) : null;

const chunks = readdirSync(proofDir)
  .filter((f) => /^telemetry-chunk-.*\.json$/.test(f))
  .sort();
const series = chunks.flatMap((f) =>
  JSON.parse(readFileSync(join(proofDir, f), "utf8")),
);
if (series.length < 60) {
  console.error(`too few samples: ${series.length}`);
  process.exit(1);
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sigma = (xs) => {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m))));
};

const lk = series.map((s) => s.lk).filter((v) => v !== null && Number.isFinite(v));
const maxPupilNodes = series.reduce((mx, s) => Math.max(mx, s.np ?? 0), 0);
const eol = series.map((s) => s.eol).filter((v) => v !== null && Number.isFinite(v));
const rest = series.filter(
  (s) => s.prov === "none" && (s.ph === "observing" || s.ph === "resting"),
);
const restHPx = rest.map((s) => s.hPx).filter((v) => v !== null && Number.isFinite(v));
const restSmc = rest.map((s) => s.smc).filter((v) => v !== null && Number.isFinite(v));
const allHPx = series.map((s) => s.hPx).filter((v) => v !== null && Number.isFinite(v));

// frozen-run scan (breath never stops)
let maxFrozen = 1, run = 1;
for (let i = 1; i < allHPx.length; i++) {
  run = allHPx[i] === allHPx[i - 1] ? run + 1 : 1;
  maxFrozen = Math.max(maxFrozen, run);
}

const approaching = series.filter((s) => s.ph === "approaching");
const blinkSamples = eol.filter((v) => v < 0.3).length;

// Window-scaled count requirements (see WINDOW LAW above).
const DESIGN_TAKE_SECONDS = 105;
const spanSeconds = +((series[series.length - 1].t - series[0].t) / 1000).toFixed(1);
const restSamplesRequired = Math.ceil((20 / DESIGN_TAKE_SECONDS) * spanSeconds);
const eventGrowthRequired = Math.ceil((8 / DESIGN_TAKE_SECONDS) * spanSeconds);

const gates = {
  at: new Date().toISOString(),
  samples: series.length,
  spanSeconds,
  windowLaw: `count thresholds span-scaled from the ${DESIGN_TAKE_SECONDS}s design take (rest >= 0.1905/s, events >= 0.0762/s)`,
  H1_gaze_thinks_pupilless: {
    sigmaLk: +sigma(lk).toFixed(3),
    maxAbsLk: +Math.max(...lk.map(Math.abs)).toFixed(2),
    maxPupilNodes,
    pass:
      sigma(lk) > 0.25 &&
      Math.max(...lk.map(Math.abs)) >= 1.2 &&
      maxPupilNodes === 0,
  },
  H2_body_breathes: {
    restSigmaHPx: +sigma(restHPx).toFixed(3),
    restSamples: restHPx.length,
    restSamplesRequired,
    maxFrozenRun: maxFrozen,
    pass: restHPx.length >= restSamplesRequired && sigma(restHPx) >= 0.5 && maxFrozen < 6,
  },
  H3_blinks_land: { blinkSamples, pass: blinkSamples >= 2 },
  H4_life_volume: {
    eventGrowth: series[series.length - 1].e - series[0].e,
    eventGrowthRequired,
    approachingSamples: approaching.length,
    approachingWanderDisabled: approaching.every((s) => s.we === false),
    lifeAuthoritySamples: series.filter((s) => s.prov === "life-authority").length,
    pass:
      series[series.length - 1].e - series[0].e >= eventGrowthRequired &&
      approaching.every((s) => s.we === false),
  },
  H5_rest_calm: {
    restMeanSmc: restSmc.length ? +mean(restSmc).toFixed(3) : 0,
    restSamples: restSmc.length,
    restSamplesRequired,
    pass: restSmc.length >= restSamplesRequired && mean(restSmc) >= 0.1,
  },
  H6_place_reads: {
    lumaRatio,
    pass: lumaRatio !== null && lumaRatio >= 1.25,
  },
};
gates.pass = Object.values(gates)
  .filter((v) => v && typeof v === "object" && "pass" in v)
  .every((v) => v.pass);

writeFileSync(join(proofDir, "life2-gates.json"), JSON.stringify(gates, null, 2));
console.log(JSON.stringify(gates, null, 2));
process.exit(gates.pass ? 0 : 1);
