// GASPER-ALIVE-001 · D-0108 — THE LIFE GATES (machine side of the witness).
//
// Reads the 2 Hz observer-only witness series (telemetry-chunk-*.json,
// deposited by capture-alive-witness.mjs) and computes G1–G6. The series is
// READ-ONLY evidence: pixels and telemetry never fed organism state.
//
//   G1 autonomy volume    — ≥ 15 self-initiated acts in the window
//   G2 life moves him     — life-authority samples > 0 and min applied z ≤ −600
//                           (the approach reaches the glass lane)
//   G3 breath never stops — no 6-sample (3 s) run of identical hPx; σ(hPx) > 0
//   G4 attention visible  — gaze-engaged samples > 0; ≥ 3 distinct targets
//   G5 never metronomic   — ≥ 8 distinct inter-event intervals
//   G6 hierarchy live     — every approaching sample has wander disabled,
//                           and wander is enabled somewhere else in the take

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proofs = join(here, "..", "..", "research", "proofs", "gasper-alive-001");

let samples = [];
for (const c of ["A", "B", "C", "D"]) {
  try {
    const j = JSON.parse(
      readFileSync(join(proofs, `telemetry-chunk-${c}.json`), "utf8"),
    );
    samples = samples.concat(j.samples ?? []);
  } catch {
    /* a missing chunk simply contributes nothing */
  }
}
samples.sort((a, b) => a.t - b.t);
if (samples.length < 60) {
  console.error("witness series too short:", samples.length);
  process.exit(1);
}

const spanS = (samples[samples.length - 1].t - samples[0].t) / 1000;

// G1 — autonomy volume: eventCount deltas.
const events = samples[samples.length - 1].e - samples[0].e;
const g1 = events >= 15;

// G2 — life-authority actually moves him through the world.
const lifeSamples = samples.filter((s) => s.prov === "life-authority");
const minZ = Math.min(...samples.map((s) => s.pz));
const g2 = lifeSamples.length > 0 && minZ <= -600;

// G3 — breath never stops: hPx never frozen for 3 s; variance present.
let frozenRun = 0;
let maxFrozenRun = 0;
for (let i = 1; i < samples.length; i++) {
  frozenRun = samples[i].hPx === samples[i - 1].hPx ? frozenRun + 1 : 0;
  maxFrozenRun = Math.max(maxFrozenRun, frozenRun);
}
const hs = samples.map((s) => s.hPx).filter((v) => typeof v === "number");
const mean = hs.reduce((a, b) => a + b, 0) / hs.length;
const sigma = Math.sqrt(
  hs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / hs.length,
);
const g3 = maxFrozenRun < 6 && sigma > 0;

// G4 — attention visible: gaze engaged; several distinct targets.
const engaged = samples.filter((s) => (s.gz ?? 0) >= 0.5);
const targets = new Set(
  samples
    .filter((s) => s.a)
    .map((s) => `${s.a[0].toFixed(1)},${s.a[1].toFixed(1)}`),
);
const g4 = engaged.length > 0 && targets.size >= 3;

// G5 — never metronomic: inter-event intervals (e increments) are varied.
const gaps = [];
for (let i = 1; i < samples.length; i++) {
  if (samples[i].e > samples[i - 1].e) {
    gaps.push(+((samples[i].t - samples[i - 1].t) / 1000).toFixed(2));
  }
}
// The 2 Hz sampler quantizes gaps to 0.5 s; distinct quantized gaps ≥ 8.
const distinctGaps = new Set(gaps);
const g5 = distinctGaps.size >= 8;

// G6 — hierarchy live: approaching ⇒ wander disabled; wander on elsewhere.
const approaching = samples.filter((s) => s.ph === "approaching");
const g6 =
  approaching.length > 0 &&
  approaching.every((s) => s.we === false) &&
  samples.some((s) => s.we === true);

// Census for the manifest.
const phaseCensus = {};
const provCensus = {};
const moodCensus = {};
for (const s of samples) {
  phaseCensus[s.ph] = (phaseCensus[s.ph] ?? 0) + 1;
  provCensus[s.prov] = (provCensus[s.prov] ?? 0) + 1;
  moodCensus[s.m] = (moodCensus[s.m] ?? 0) + 1;
}

const gates = {
  id: "GASPER-ALIVE-001",
  decision: "D-0108",
  at: new Date().toISOString(),
  series: {
    samples: samples.length,
    spanSeconds: +spanS.toFixed(1),
    hz: 2,
    source: "telemetry-chunk-[ABC].json (observer-only 2 Hz witness)",
  },
  gates: {
    G1_autonomy_volume: { pass: g1, events, threshold: 15 },
    G2_life_moves_him: {
      pass: g2,
      lifeAuthoritySamples: lifeSamples.length,
      minAppliedZ: minZ,
      thresholdZ: -600,
    },
    G3_breath_never_stops: {
      pass: g3,
      maxFrozen3sRun: maxFrozenRun >= 6 ? maxFrozenRun : maxFrozenRun,
      hPxSigma: +sigma.toFixed(2),
    },
    G4_attention_visible: {
      pass: g4,
      engagedSamples: engaged.length,
      distinctTargets: targets.size,
    },
    G5_never_metronomic: { pass: g5, distinctGapBins: distinctGaps.size },
    G6_hierarchy_live: {
      pass: g6,
      approachingSamples: approaching.length,
      wanderDisabledDuringAllApproaches: approaching.every((s) => s.we === false),
    },
  },
  census: { phaseCensus, provCensus, moodCensus },
  allMachineGatesPass: g1 && g2 && g3 && g4 && g5 && g6,
};

writeFileSync(
  join(proofs, "life-gates.json"),
  JSON.stringify(gates, null, 2),
);
console.log(
  JSON.stringify(
    {
      spanS: gates.series.spanSeconds,
      events,
      allMachineGatesPass: gates.allMachineGatesPass,
      gates: Object.fromEntries(
        Object.entries(gates.gates).map(([k, v]) => [k, v.pass]),
      ),
    },
    null,
    2,
  ),
);
process.exit(gates.allMachineGatesPass ? 0 : 1);
