/**
 * Opening 10s @ 120fps — kernel review of playNorthstarTwenty.
 * Writes JSON + prints isolated leg faults to code sites.
 */
import "../../packages/desktop/src/gasper/physics/gsapTestHydrate.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resetGasperOrganismClockForTests } from "../../packages/desktop/src/gasper/clock";
import { GasperRigController } from "../../packages/desktop/src/gasper/GasperRigController.ts";

const OUT = resolve(
  process.env.GASPER_OPEN10_OUT ||
    "docs/triforce/canon/runs/2026-08-16T16-38-00-000Z-review-opening-10s",
);
mkdirSync(OUT, { recursive: true });

const FPS = 120;
const STEP_MS = 1000 / FPS;
const SEC = 10;
const FRAMES = SEC * FPS;

resetGasperOrganismClockForTests({
  authorityId: "open10-120",
  seed: 20260814,
  fixedStepMs: STEP_MS,
});

const ctl = new GasperRigController();
const clock = ctl.getOrganismClock();
clock.start({ mode: "fixed-step" });
clock.setFixedStepMs(STEP_MS);
ctl.playNorthstarTwenty();

type Row = {
  i: number;
  t: number;
  x: number;
  y: number;
  z: number;
  supportSide: number;
  planted: boolean;
  plantedWorldX: number;
  plantedScreenX: number;
  swingLift: number;
  swingForward: number;
  loadedCompress: number;
  stepHz: number;
  phase: number;
  comVertical: number;
};

const rows: Row[] = [];
for (let i = 0; i <= FRAMES; i += 1) {
  const g = ctl.getGaitProofSample();
  rows.push({
    i,
    t: clock.nowMs() / 1000,
    x: g.bodyX,
    y: g.bodyY,
    z: g.bodyZ,
    supportSide: g.supportSide,
    planted: g.planted,
    plantedWorldX: g.plantedWorldX,
    plantedScreenX: g.plantedScreenXUnits,
    swingLift: g.swingLift,
    swingForward: g.swingForward,
    loadedCompress: g.loadedCompress,
    stepHz: g.stepHz,
    phase: g.phase,
    comVertical: g.comVertical,
  });
  if (i === FRAMES) break;
  clock.step(STEP_MS);
}

function windowOf(a: number, b: number) {
  return rows.filter((r) => r.t + 1e-9 >= a && r.t < b);
}

function flips(ws: Row[]) {
  let n = 0;
  for (let i = 1; i < ws.length; i += 1) {
    if (ws[i]!.supportSide !== ws[i - 1]!.supportSide) n += 1;
  }
  return n;
}

function holdSpans(ws: Row[], pred: (r: Row) => boolean) {
  const spans: { start: number; end: number; n: number }[] = [];
  let cur: { start: number; end: number; n: number } | null = null;
  for (const r of ws) {
    if (pred(r)) {
      if (!cur) cur = { start: r.t, end: r.t, n: 1 };
      else {
        cur.end = r.t;
        cur.n += 1;
      }
    } else if (cur) {
      spans.push(cur);
      cur = null;
    }
  }
  if (cur) spans.push(cur);
  return spans;
}

const rest = windowOf(0, 2.618);
const strut = windowOf(2.618, 5.15);
const seat = windowOf(5.15, 6.6);
const notice = windowOf(6.6, 10);

const restLiftMax = Math.max(0, ...rest.map((r) => r.swingLift));
const restSideMax = Math.max(0, ...rest.map((r) => Math.abs(r.supportSide)));
const restDx = Math.max(...rest.map((r) => r.x)) - Math.min(...rest.map((r) => r.x));
const restDy = Math.max(...rest.map((r) => r.y)) - Math.min(...rest.map((r) => r.y));

const strutFlips = flips(strut);
const liftOn = holdSpans(strut, (r) => r.swingLift > 40);
const liftZeroWhileMoving = strut.filter(
  (r) => r.swingLift < 8 && Math.abs(r.supportSide) > 0 && Math.hypot(r.x - (strut[0]?.x ?? 0), r.z) > 8,
);
const plantDrift: number[] = [];
{
  let holdX: number | null = null;
  let holdSide = 0;
  for (const r of strut) {
    if (r.supportSide !== holdSide) {
      holdSide = r.supportSide;
      holdX = r.plantedWorldX;
    } else if (holdX !== null && r.planted) {
      plantDrift.push(Math.abs(r.plantedWorldX - holdX));
    }
  }
}
const maxPlantDrift = plantDrift.length ? Math.max(...plantDrift) : 0;
const maxLift = Math.max(0, ...strut.map((r) => r.swingLift));
const maxAdv = Math.max(0, ...strut.map((r) => r.swingForward));
const maxDrop = Math.max(0, ...strut.map((r) => r.loadedCompress));
const strutDx = (strut.at(-1)?.x ?? 0) - (strut[0]?.x ?? 0);

const faults: {
  id: string;
  picture: string;
  site: string;
  evidence: string;
}[] = [];

if (restLiftMax > 8 || restSideMax > 0) {
  faults.push({
    id: "rest-gait-live",
    picture: "Opening rest still walks the W.",
    site: "NorthstarTwentyTake.setup.walkEnable + playAuthoredTake strut-go walkEnable. If kernel still emits supportSide before 2.618, WorldPhysicsDriver deriveGait at vx≈0.",
    evidence: `rest liftMax=${restLiftMax.toFixed(1)} sideMax=${restSideMax} dx=${restDx.toFixed(2)}`,
  });
}
if (restDy > 4) {
  faults.push({
    id: "rest-floor-y",
    picture: "Floor baseline / body.y moves during sealed rest.",
    site: "all-script-3.js heldFloorCy + body.y in WorldPhysicsDriver. Intro lock is cy; kernel y is this.",
    evidence: `rest Δy=${restDy.toFixed(2)} u`,
  });
}
if (strutFlips < 2) {
  faults.push({
    id: "no-exchange",
    picture: "Strut does not hand the plant.",
    site: "SupportExchange.ts · planted-base sample-and-hold / supportSide.",
    evidence: `flips=${strutFlips} over ${strut.length} frames`,
  });
}
if (maxLift < 200) {
  faults.push({
    id: "lift-starved",
    picture: "Swing never reaches a countable air gap (kernel 544 u = 68 px).",
    site: "GaitLaw gaitLobePose swingLiftUnits · gaitExpressionGate in WorldPhysicsDriver.",
    evidence: `maxLift=${maxLift.toFixed(1)} u (want ~544)`,
  });
} else if (liftOn.length === 0) {
  faults.push({
    id: "lift-spikes-only",
    picture: "Lift exists as spikes, not a stance-long free limb.",
    site: "gaitLobePose clearance / exchangeHold 0.35 — clearance 0 through double support.",
    evidence: `maxLift=${maxLift.toFixed(1)} countable spans=${liftOn.length}`,
  });
}
if (maxAdv < 80) {
  faults.push({
    id: "advance-starved",
    picture: "Free lobe does not travel. Y-chew without leave.",
    site: "all-script-3.js posed.x += advPx * swingArtW · gaitLobePose.swingAdvanceUnits.",
    evidence: `maxAdv=${maxAdv.toFixed(1)} u`,
  });
}
if (maxPlantDrift > 24) {
  faults.push({
    id: "plant-skates",
    picture: "Held plant slides in world x.",
    site: "SupportExchange.ts plantedWorld sample-and-hold. Painter _lp if th missing (N348 gate never fires).",
    evidence: `max plant drift ${maxPlantDrift.toFixed(1)} u during a held side`,
  });
}
if (liftZeroWhileMoving.length > strut.length * 0.55 && maxLift < 80) {
  faults.push({
    id: "skate",
    picture: "Moving with both lobes down — skate.",
    site: "Same as lift-starved. Picture = kernel 0, not a missing clock.",
    evidence: `${liftZeroWhileMoving.length}/${strut.length} strut frames lift<8 while moving`,
  });
}

const summary = {
  fps: FPS,
  frames: rows.length,
  rest: { liftMax: restLiftMax, sideMax: restSideMax, dx: restDx, dy: restDy, n: rest.length },
  strut: {
    flips: strutFlips,
    maxLift,
    maxAdv,
    maxDrop,
    maxPlantDrift,
    dx: strutDx,
    liftSpans: liftOn.slice(0, 8),
    n: strut.length,
  },
  seat: {
    liftMax: Math.max(0, ...seat.map((r) => r.swingLift)),
    dx: (seat.at(-1)?.x ?? 0) - (seat[0]?.x ?? 0),
  },
  notice: {
    liftMax: Math.max(0, ...notice.map((r) => r.swingLift)),
    expressionHint: "listening-orient is face, not travel",
  },
  faults,
};

writeFileSync(resolve(OUT, "opening-10s-120fps.json"), JSON.stringify({ summary, rows }, null, 2));
writeFileSync(resolve(OUT, "opening-10s-faults.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
console.log(`wrote ${OUT}`);
