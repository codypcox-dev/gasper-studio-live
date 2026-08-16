// GASPER-CRAFT-002 · S7 — CAPTURE DRIVE v3 (the Monitor Doctrine proof drive).
//
// Transport: Playwright MCP `browser_evaluate` — each phase is an in-page
// async expression (self-contained, below); the tool's `filename` parameter
// persists the returned JSON server-side into research/proofs/
// gasper-craft-002/s7/phase-<name>.json. The WebBridge transport of drive
// v1 is blocked (engine defect reported), and the server-process VM exposes
// no fs/require/import, so the page itself runs the sampling loops and the
// MCP tool persists their results. The video sign-off phase uses
// browser_run_code_unsafe with recordVideo (Playwright persists the webm).
//
// Phases (each deposits phase-<name>.json):
//   probe  — surface gates: dais + rig present, provenance fence fail-closed
//            re-proof (bogus → home; wander-authority accepted), world-body
//            state null (no physics armed), initial living policy snapshot.
//   home   — freeze autonomy; home-settled anchor: contour height h0,
//            viewport camera baseline, applied pose + depth-scale witness.
//   pack-s2 / pack-s4 — run the craft pack (capture-drive authority), sample
//            the full witness series at ~50Hz: camera state (fixity), applied
//            pose + provenance (bounds), contour height + dataset depth scale
//            (depth read), wake/light feeds (physics read), beat telemetry.
//   wander — restore autonomy; sample the golden-wander organ at 4Hz across
//            its φ² cooldown into its first legs (law read).
//
// Standing law: captures are OBSERVER-ONLY — pixels never feed organism
// state; every command here enters through the public provenance-fenced
// intakes (runCraftPack / setWorldPose / applyModePolicy).
//
// The silhouette's ON-SCREEN height idiom (D-0098 contour × the full
// transform chain): the #bodyClip path lives in <defs> (no layout of its
// own, getBoundingClientRect ≡ 0), so on-screen height = its local bbox ×
// the CTM scale of the rendered group it clips — that chain carries the
// worldRig depth scale + the viewport zoom. Expressed in-page as:
//   contourPx() = clip.getBBox().height * hypot(ctm.b, ctm.d)

// ================================================================ probe
export const PROBE = `
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const d = window.__GASPER_DAIS__;
  const rig = window.SidekickFormMasterRig;
  if (!d || !rig) return { ok: false, error: "dais/rig surface absent" };
  const vp = typeof d.getViewport === "function" ? d.getViewport() : null;
  const vs = vp && vp.getState ? vp.getState() : null;
  const clip = document.querySelector("#bodyClip path");
  const contourPx = (() => {
    if (!clip) return null;
    const user = document.querySelector("#chromaticShell") ||
      document.querySelector("[clip-path='url(#bodyClip)']");
    const ctm = user && user.getScreenCTM ? user.getScreenCTM() : null;
    return ctm ? clip.getBBox().height * Math.hypot(ctm.b, ctm.d) : null;
  })();
  const surface = {
    ok: true,
    zoom: vs ? vs.zoom : null,
    locked: vs ? !!vs.performanceCameraLocked : null,
    hPx: contourPx,
    wanderSurface: typeof d.getWanderState === "function" && typeof d.setWanderEnabled === "function",
  };
  // Provenance fence re-proof (v1 idiom): bogus fails closed to home.
  rig.setWorldPose({ x: 400, z: 200, provenance: "bogus-authority" });
  const bogusTarget = rig.getWorldPose().target;
  await sleep(350);
  const bogusApplied = rig.getWorldPose().applied;
  // wander-authority (D-0106) is a recognized mover in the live fence:
  rig.setWorldPose({ x: 120, z: 40, provenance: "wander-authority" });
  const wanderTarget = rig.getWorldPose().target;
  await sleep(350);
  const wanderApplied = rig.getWorldPose().applied;
  // Release home (provenance none) and let the ease settle.
  rig.setWorldPose({ provenance: "none" });
  await sleep(1000);
  const releasedHome = rig.getWorldPose().applied;
  return {
    phase: "probe",
    at: new Date().toISOString(),
    surface,
    fence: {
      bogusTarget, bogusApplied,
      bogusFailedClosed: bogusTarget.provenance === "none" && bogusTarget.x === 0,
      wanderTarget, wanderApplied,
      wanderAccepted: wanderTarget.provenance === "wander-authority" && wanderTarget.x === 120,
      releasedHome,
    },
    physics: {
      worldBodyState: d.getWorldBodyState(),
      worldPhysicsParams: d.getWorldPhysicsParams(),
    },
    livingStatusInitial: d.living.getStatus(),
  };
})()
`;

// ================================================================== home
export const HOME = `
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const d = window.__GASPER_DAIS__;
  // Freeze autonomy (demo-craft-live idiom) so the pack reads stand alone.
  const l = d.living;
  l.applyModePolicy({ autoSequence: false, restrainedIdle: false, freezeSequence: true });
  if (typeof l.eightLoop.setAutoLoop === "function") l.eightLoop.setAutoLoop(false);
  const frozenStatus = l.getStatus();
  // The wander organ's gate just closed — it recalls home on its own
  // (D-0106: recall is a brisk φ× leg, never a teleport). Poll until the
  // applied pose settles at home (provenance none emitted once on arrival).
  let settled = null;
  const t0 = performance.now();
  while (performance.now() - t0 < 5000) {
    await sleep(200);
    const p = window.SidekickFormMasterRig.getWorldPose();
    const near = Math.abs(p.applied.x) < 1 && Math.abs(p.applied.y) < 1 && Math.abs(p.applied.z) < 1;
    if (near) { settled = p; await sleep(400); settled = window.SidekickFormMasterRig.getWorldPose(); break; }
  }
  await sleep(600); // breath settle on the anchor frame
  const pose = window.SidekickFormMasterRig.getWorldPose();
  const vp = d.getViewport();
  const vs = vp.getState();
  const clip = document.querySelector("#bodyClip path");
  const av = document.querySelector("#avatar");
  const user = document.querySelector("#chromaticShell") ||
    document.querySelector("[clip-path='url(#bodyClip)']");
  const ctm = user && user.getScreenCTM ? user.getScreenCTM() : null;
  return {
    phase: "home",
    at: new Date().toISOString(),
    frozenStatus,
    anchor: {
      zoom: vs.zoom, panX: vs.panX, panY: vs.panY,
      locked: !!vs.performanceCameraLocked,
      x: pose.applied.x, y: pose.applied.y, z: pose.applied.z,
      prov: pose.applied.provenance ?? pose.target.provenance,
      hPx: ctm && clip ? clip.getBBox().height * Math.hypot(ctm.b, ctm.d) : null,
      dsScale: av.dataset.worldDepthScale != null ? Number(av.dataset.worldDepthScale) : null,
    },
    stage: typeof vp.getStageSize === "function" ? vp.getStageSize() : null,
  };
})()
`;

// ==================================================== pack-s2 / pack-s4
// One parameterized source: substitute __PACK_ID__ before evaluating.
export const PACK = `
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const d = window.__GASPER_DAIS__;
  const packId = "__PACK_ID__";
  const read = () => {
    const pose = window.SidekickFormMasterRig.getWorldPose();
    const vp = d.getViewport();
    const vs = vp.getState();
    const clip = document.querySelector("#bodyClip path");
    const av = document.querySelector("#avatar");
    const ps = d.getPerformancePackState();
    let hPx = null;
    try {
      if (clip) {
        const user = document.querySelector("#chromaticShell") ||
          document.querySelector("[clip-path='url(#bodyClip)']");
        const ctm = user && user.getScreenCTM ? user.getScreenCTM() : null;
        if (ctm) hPx = clip.getBBox().height * Math.hypot(ctm.b, ctm.d);
      }
    } catch (e) {}
    return {
      zoom: vs.zoom, panX: vs.panX, panY: vs.panY, locked: !!vs.performanceCameraLocked,
      x: pose.applied.x, y: pose.applied.y, z: pose.applied.z,
      prov: pose.applied.provenance ?? pose.target.provenance,
      hPx,
      dsScale: av.dataset.worldDepthScale != null ? Number(av.dataset.worldDepthScale) : null,
      wake: Number(av.dataset.physicsWake || 0),
      light: Number(av.dataset.physicsLight || 0),
      packRunning: ps ? !!ps.running : false,
      packT: ps ? ps.t : null,
      beatId: d.getPerformancePackBeatId(),
      shotScale: d.getPerformancePackShotScale(),
    };
  };
  const started = d.runCraftPack(packId, { provenance: "capture-drive" });
  const t0 = performance.now();
  const samples = [];
  let sawRunning = false, doneAt = null;
  while (true) {
    const ms = performance.now() - t0;
    samples.push({ ms: Math.round(ms), ...read() });
    const cur = samples[samples.length - 1];
    if (cur.packRunning) sawRunning = true;
    if (sawRunning && !cur.packRunning) {
      if (doneAt === null) doneAt = ms;
      if (ms - doneAt > 1400) break; // 1.4s release tail
    }
    if (ms > 26000) break; // hard safety budget (evaluate timeout guard)
    await sleep(18); // ~50Hz
  }
  return {
    phase: "pack", packId, at: new Date().toISOString(), started,
    sampleCount: samples.length,
    durationMs: Math.round(performance.now() - t0),
    samples,
  };
})()
`;

// ================================================================ wander
export const WANDER = `
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const d = window.__GASPER_DAIS__;
  // Restore autonomy (the wander gate is the living status): open the
  // sequence, release the freeze, then sample across the φ² cooldown and
  // into the first legs.
  const l = d.living;
  l.applyModePolicy({ autoSequence: true, restrainedIdle: false, freezeSequence: false });
  if (typeof l.eightLoop.setAutoLoop === "function") l.eightLoop.setAutoLoop(true);
  const restoredStatus = l.getStatus();
  const t0 = performance.now();
  const samples = [];
  while (performance.now() - t0 < 9000) {
    const pose = window.SidekickFormMasterRig.getWorldPose();
    const ws = d.getWanderState();
    samples.push({
      ms: Math.round(performance.now() - t0),
      x: pose.applied.x, y: pose.applied.y, z: pose.applied.z,
      prov: pose.applied.provenance ?? pose.target.provenance,
      wander: ws ? {
        enabled: ws.enabled, phase: ws.phase, nextStep: ws.nextStep,
        holdSecondsLeft: ws.holdSecondsLeft,
        plan: ws.plan ? {
          step: ws.plan.step, bearingDeg: ws.plan.bearingDeg,
          targetX: ws.plan.targetX, targetY: ws.plan.targetY, targetZ: ws.plan.targetZ,
          speedUnitsPerSec: ws.plan.speedUnitsPerSec, dwellSeconds: ws.plan.dwellSeconds,
        } : null,
      } : null,
    });
    await sleep(250); // 4Hz — the wander sign-off idiom
  }
  return {
    phase: "wander", at: new Date().toISOString(), restoredStatus,
    sampleCount: samples.length, samples,
  };
})()
`;
