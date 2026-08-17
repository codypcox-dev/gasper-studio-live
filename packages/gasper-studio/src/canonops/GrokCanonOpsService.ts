import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DEFAULT_CANONOPS_RESIDUAL,
  type CanonOpsMode,
  type CanonOpsPhdPacket,
  type CanonOpsResidual,
  type CanonOpsRunRequest,
} from "./CanonOpsProtocol.js";

const SEED_CITATIONS = [
  {
    id: "codeops-engine/proc-phys-048",
    tier: "canon" as const,
    source: "TriForce corpus · inverted pendulum + Froude number",
    rule: "Normalize locomotion by Fr = v²/(g·l); walk cannot be judged if the plant is off-frame.",
  },
  {
    id: "vfxops-engine/3danim-state-locomotion",
    tier: "canon" as const,
    source: "TriForce corpus · Williams walk contact/passing",
    rule: "A gait is its footfall rhythm. One foot planted, one free. Shot must show both lobes.",
  },
  {
    id: "gait-expression-phd-memo",
    tier: "canon" as const,
    source: "research/canon/anim-physics/gait-expression-phd-memo.md L8/L9",
    rule: "Phase is travel, never clock. Expression is illegal if it cannot be reviewed.",
  },
  {
    id: "d-0099-doctrine-1",
    tier: "canon" as const,
    source: "GASPER-CRAFT-002 · S3 / CraftRail D-0107",
    rule: "The monitor never moves during a performance. shotBias is retired as a live camera dial. A framing return is a DEPTH offset or a one-time authored hold.",
  },
  {
    id: "n334-opening-rest",
    tier: "canon" as const,
    source: "NORTHSTAR N334 · GasperStudioApp boot",
    rule: "Bare 5179 is sealed Wispwalker rest. Wander and life stay down until an owned walk-review shot opens the wander gate.",
  },
  {
    id: "gait-law-x1-walk-band",
    tier: "canon" as const,
    source: "GaitLaw.ts · X1 stride × φ Hz",
    rule: "Grounded stroll is 918·φ ≈ 1485 u/s. The 2610/3200 Froude band is flight terminal-v, not a walk.",
  },
  {
    id: "world-physics-field-g",
    tier: "canon" as const,
    source: "PhysicsField.ts · worldPhysicsParamsFromField + WorldPhysics.ts",
    rule: "Live g/μ/maxSpeed come from the field. The World rail only multiplies gravity, restitution, launch, intensity.",
  },
  {
    id: "n35-monitor-glass",
    tier: "canon" as const,
    source: "WorldSpace.ts zNear · owner N35",
    rule: "He may approach only to +20% size (z=-320). The monitor does not pull back.",
  },
  {
    id: "support-exchange-plant",
    tier: "canon" as const,
    source: "SupportExchange.ts · planted-base sample-and-hold",
    rule: "The planted foot is world-space sample-and-hold. Mass shifts onto that support. Travel is the support carrier, not a root slide.",
  },
  {
    id: "gait-lobe-n305",
    tier: "canon" as const,
    source: "GaitLaw.ts GAIT_LOBE · N305–N310",
    rule: "One existing lobe lifts (~68 px) with cleft held. Loaded drops. COM settles. No shoes. No second travel writer.",
  },
  {
    id: "williams-contact-passing",
    tier: "reference" as const,
    source: "Williams · The Animator's Survival Kit · walk contact/passing",
    rule: "A walk is contact and passing. One foot planted, one free. Both down for the whole stride is a skate.",
  },
  {
    id: "inverted-pendulum-vault",
    tier: "reference" as const,
    source: "Cavagna / Kuo / Adamczyk · COM vault + step-to-step transition",
    rule: "Single support is an inverted pendulum: COM rides an arc over the plant. Double support is a collision, not a vault. IP models do not simulate the exchange.",
  },
  {
    id: "alexander-froude-walk",
    tier: "reference" as const,
    source: "Alexander · Fr = v²/(g L) dynamic similarity",
    rule: "Same Fr ⇒ same gait class. Comfortable walk ≈ 0.15–0.35. Walk–run ≈ 0.5. Fr does not set screen stride.",
  },
  {
    id: "world-8-u-per-px",
    tier: "canon" as const,
    source: "WorldSpace.ts unitsPerContentPx · GASPER-SPACE-001",
    rule: "Home plane: 8 world u = 1 SVG content px. 960 u half-width = 120 px = half of viewBox 240. Inverse of paint: kernel u / 8.",
  },
  {
    id: "content-viewbox-240",
    tier: "canon" as const,
    source: "gasper-rig-v655.svg viewBox 0 0 240 220 · GasperVisualBounds CONTENT_VIEWBOX",
    rule: "Content canvas is 240×220. Stage map: (cx−120)·zoom + pan + stage/2. 1 content px = zoom CSS px. Not a meet-fill of the dais.",
  },
];

export type GrokCanonOpsServiceOptions = Readonly<{
  root: string;
  engineVersion?: string;
}>;

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function questionFor(mode: CanonOpsMode, residual: CanonOpsResidual): string {
  if (mode === "explore") {
    return `What corpus already governs ${residual.id}, and what is still unearned?`;
  }
  if (mode === "summarize") {
    return `What earned laws already constrain the wall: ${residual.wall}`;
  }
  return `What PHD must be earned so the wall can be fixed inside canon only: ${residual.wall}`;
}

function fieldsFor(
  mode: CanonOpsMode,
  residual: CanonOpsResidual,
): Pick<
  CanonOpsPhdPacket,
  | "coordinateSpaces"
  | "physicalLaw"
  | "artisticLaw"
  | "invariants"
  | "failureModes"
  | "uncertainty"
  | "tests"
  | "visualConsequences"
  | "implementation"
> {
  if (residual.id === "kernel-8" && mode === "explore") {
    return {
      coordinateSpaces:
        "World u. Home map: 8 u = 1 content px (unitsPerContentPx). ViewBox 240×220. Home frustum half-width 960 u = 120 px. D0=1920. scale(z)=D0/(D0+z). Zoom-2 cinematic multiplies the already-projected content px. h_G=1224 u = 153 content px at home.",
      physicalLaw: [
        "Kernel-8 is not Cycle 8 (X1 cadence). It is the home-plane ruler: px = u / 8. Paint of lift/advance/drop is that inverse.",
        "Authored GAIT_LOBE.swingLiftUnits = 68·8 = 544 u means 68 content px at z=0. Painting 544/8 = 68 is identity. Painting 42·(u/544) was a second ruler.",
        "Depth: screen = (u/8)·scale(z)·zoom. At z=0, zoom=2, 68 content px ≈ 136 CSS px if 1:1 CSS/content — then the stage scale maps viewBox→dais.",
        "Desktop desk law: 1920 u home width / 240 viewBox = 8. He is a creature on a desk (~60–150 content px), not a dot in a stadium and not a 1 u = 1 px giant.",
        "The 22 px advance remap (352 u → 22) and 0.35 drop attenuator were extra rulers. They are off. One map remains.",
      ],
      artisticLaw: [
        "Do not invent a second px scale to 'see' a step. If 68 home-px is invisible, the verb is wrong (W-chew), not the ruler.",
        "Zoom-2 is a shot, not a change of unitsPerContentPx. Do not set the ruler to 4 so zoom-2 'looks like 8'.",
      ],
      invariants: [
        "unitsPerContentPx stays 8. Do not retune it to fix gait.",
        "Do not mix content-px authorship (68, 44, 24) with world u without ·8 / ÷8.",
        "Do not confuse kernel-8 with Cycle 8 X1 (stride 918 · φ Hz).",
      ],
      failureModes: [
        "Two rulers: kernel stores 544 u, painter treats 68 as a cap and remaps to 42.",
        "Calling Cycle 8 (cadence) 'kernel 8' and changing stride to fix a px map.",
        "Changing 8 to make the W-unhook look like a longer step.",
      ],
      uncertainty: [
        "Exact CSS-px per content-px on the live 1120×758 dais after zoom-2 was not remeasured this receipt. The ruler itself is earned.",
      ],
      tests: [
        "WORLD_SPACE.unitsPerContentPx === 8 in TS and all-script-3.js.",
        "swingLiftUnits 544 paints 68 content px. swingAdvanceUnits 352 paints 44. loadedDropUnits 192 paints 24.",
        "960 / 8 === 120 === viewBox/2.",
      ],
      visualConsequences: [
        "A 68 px lift is a real home-plane number. If the tape still chews, the contour is the wall, not the 8.",
      ],
      implementation: [
        "Explore only. Do not change 8. Do not recut gait this receipt.",
        "Cycle 8 X1 stays a different organ.",
      ],
    };
  }
  if (residual.id === "inverted-pendulum" && mode === "explore") {
    return {
      coordinateSpaces:
        "World u. l_eff = COM height = 0.5·h_G = 612 u. Stride λ = v/f. Vault angle α: tan α = λ/(2·l_eff). Bob = l_eff·(1−cos α). Content px = u/8. Live Northstar strut: v=200, f≈1.43 Hz ⇒ λ≈140 u ⇒ α≈0.114 rad ⇒ bob≈4 u ≈ 0.5 px.",
      physicalLaw: [
        "L5: walking single-support is an inverted pendulum. The planted foot is the hinge. COM rides a circular arc of radius l_eff. Rise is geometric: bob = l_eff·(1−cos α), not a bounce authored on Y.",
        "X1 triple convergence: at λ = 0.75·h_G = 918 u, tan α = 0.75, vault bob = exactly 10% of h_G (122 u). That is the walk-band (1485 u/s), not the Northstar strut.",
        "At strut 200 the vault is ~4 u. Below a pixel. The pendulum is lawful and invisible. A −100 u measured bob is not L5 (L5 bob is ≥ 0). It is load-drop / COM-settle, signed down.",
        "Contact squash q = v_v²/(g·h_G) with v_v = (bob/2)·2π·f. Tiny vault ⇒ tiny q. Measured squash ≈ 0 is the geometry, not a dead organ.",
        "Froude Fr = v²/(g·l_eff). Comfort walk is Fr∈[0.15,0.35]. Strut 200 at field g is Fr≪0.15 — a stroll class, not a vault class.",
        "IP models are not cyclic through double support (McGrath 2015; Kuo/Donelan step-to-step). The exchange is a collision redirection. SupportExchange owns that window. The vault only exists in single support.",
      ],
      artisticLaw: [
        "Do not amplify L5 bob at strut 200 to 10% h_G. That would be a 1485 walk painted on a 200 body — a hop lie.",
        "At stroll speed, weight reads from plant vs swing and lean, not from COM height. GaitLaw already says this: strut fills transfer via sway so 200 is not a 6% skate.",
        "GAIT_LOBE.comBobUnits is a load drop of the pearl, not the inverted-pendulum vault-up. Do not add them. Opposite signs.",
      ],
      invariants: [
        "Do not write body.y to fake a vault. Y=0 is the floor. Bob is an observable the renderer expresses.",
        "Do not raise Northstar strut cruise to 1485 to make the pendulum visible. Strut is 200 by N191.",
        "Do not use cart-pole inverted-pendulum (upright balance) as the walk law. Walking IP is the stance-leg vault.",
      ],
      failureModes: [
        "Expecting a readable vault at cruise 200. Geometry forbids it (~0.5 px).",
        "Signing load-drop as vault bob. Live probe bob −100 is the wrong channel.",
        "Asking the IP to draw double support. It cannot. That is the exchange organ.",
        "Scaling bob until the pearl hops so the skate 'looks like a walk'.",
      ],
      uncertainty: [
        "Which screen channel getGaitProofSample.bobUnits was (vault-up vs load-drop) was not printed separately this receipt. Sign is enough to know it is not L5.",
        "Live field g on the 20s take was not logged; Fr at 200 is ≪0.15 on both 2600 and 74210.",
      ],
      tests: [
        "deriveGait({speed:200}) bobUnits ≈ 4 u, never negative.",
        "deriveGait at λ=918 (X1 floor) bobUnits ≈ 0.1·h_G.",
        "contactSquash at strut 200 stays ≪ the 2% plant JND.",
        "SupportExchange.flight = 0 on the strut plant. Vault is single-support only.",
      ],
      visualConsequences: [
        "A stranger will not see him rise and fall at strut 200. That is honest.",
        "They must see the hinge: one lobe planted, one free, COM lean onto the plant. The pendulum is the plant, not the bounce.",
      ],
      implementation: [
        "Explore only. Do not recut deriveGait or raise strut cruise.",
        "Investigate next still names skate-no-swing (paint vs kernel lift), not a bigger vault.",
        "If a later cut touches bob: keep L5 ≥ 0 and keep load-drop on its own channel.",
      ],
    };
  }
  if (residual.id === "weight-transfer" && mode === "explore") {
    return {
      coordinateSpaces:
        "World u; h_G=1224 u; content px=u/8. Planted world (x,z) sample-and-hold. Screen plant = plantedScreenXUnits. Swing lift authored 68 px = 544 u. Loaded drop 24 px. Strut cruise 200 u/s. Live 20s strut: stepHz 1.43, supportSide ±1, bob −99..−110 u, squash ≈0, plantedX 16–26 u.",
      physicalLaw: [
        "Weight transfer is the inverted-pendulum vault: COM pays over a planted hinge, then the free limb lands and the old support releases.",
        "SupportExchange is the organ: plantedWorld is sample-and-hold; plantedCompress high at mid-stance; incomingCompress high on the unloaded side; skateUnits of a held plant must stay ~0.",
        "gaitLobePose derives swingLift = 544 u · clearance, loadedDrop = 192 u · compress. Clearance is 0 through double support (exchangeHold 0.35) so landing can overlap.",
        "Gait phase is travel-locked. supportSide flipping without a visible lift is a renderer fail, not a missing clock.",
        "Williams: contact and passing. Both feet down for the whole stride is a skate, not a walk.",
      ],
      artisticLaw: [
        "One pearl. Lower-contour articulation, not shoes. No opacity vanish. No second walk writer (walkEnable form-coeff must not fight SupportExchange).",
        "COM payment must be stranger-visible at zoom-2: settle, then rise/transfer. A −100 u bob with both lobes grounded is a crouched skate.",
        "True 3/4: near/far lobe depth alternates. Face/membrane stay seq18.",
      ],
      invariants: [
        "Do not invent a second travel writer or _plantHoldX on the whole body.",
        "Do not enlarge cruise or strut length to fake a bigger step.",
        "Do not restore gait8 contour smear or 118 px arch (N305 reject).",
        "Do not recut the 20s beats until a 6s walk picture shows plant vs swing.",
      ],
      failureModes: [
        "Kernel live / picture dead: supportSide flips, both cyan lobes stay on the floor (N245, measured 2026-08-16 20s).",
        "Negative bob + zero squash: he sinks as a unit instead of vaulting over a plant.",
        "walkEnable lateral-first form walk fighting physics lobes on the same silhouette.",
        "Seat kills gait (stepHz 0, plantedX 0) — arrival is a freeze, not a last exchange.",
      ],
      uncertainty: [
        "Live 20s probe did not print swingLiftUnits / swingClearance. Visual both-down is certain; whether gaitLobePose returned 0 or the painter gated it is unearned.",
        "z ±25 u during strut may be heading/3-4 projection, not a second writer. Not isolated.",
      ],
      tests: [
        "Strut 200: supportSide alternates; swingClearance > 0 for a countable interval each step.",
        "Stranger can count ≥2 plants: loaded lobe holds, swing lifts with air gap, lands, old support releases.",
        "COM: plantedCompress rises on plant; contactSquash > 0 on exchange; bob is not a stance-long sink.",
        "skateUnits of a held plant ≈ 0. No _plantHoldX on body.x.",
      ],
      visualConsequences: [
        "A stranger sees one foot carry him and one foot free. Not a two-lobed puck sliding at 200.",
        "Weight reads in the whole pearl (settle / lean / lift), not in a wiggling base under a frozen egg.",
      ],
      implementation: [
        "Explore only. Do not recut GaitLaw, SupportExchange, or the 20s this receipt.",
        "Next Investigate names whether swingLift is zero at the kernel or dropped in all-script-3.js paint.",
        "Fix spec when earned: make the EXISTING lobe pose visible at zoom-2. Do not add shoes.",
      ],
    };
  }
  if (residual.id === "physics-bounds" && mode === "explore") {
    return {
      coordinateSpaces:
        "World u; h_G=1224 u; l_eff=612 u; content px=u/8. Home frustum 1920×1080. D0=1920. scale(z)=D0/(D0+z). Field g≈74210 u/s² (φ-scale). Authored desktop g=2600 is the rail multiplier base, not the live field.",
      physicalLaw: [
        "Walk-band cruise is X1: λ=0.75·h_G=918 u × φ Hz ≈ 1485 u/s. Live Walk Review filed exactly this (1485.355).",
        "Froude comfort is v=√(Fr·g·l_eff), Fr∈[0.15,0.35]. At field g=74210 that is ≈[2612,3990]. cruiseBase 3200 sits inside it and is reserved for flight terminal-v, not grounded stroll.",
        "Kernel speed cap is a ceiling-height fall: maxSpeed=√(2 g H_ceil) (authored fallback 4200). Integrator dt≤0.05 s.",
        "Room: zNear=-320 (scale 1.2, N35 glass), zFar=3566 (scale ≈0.35). Painted wander further caps z≤160, |x|≤2000 so the first stroll is not a depth teleport.",
        "Traction is Coulomb: ax/az apply only in contact. Airborne they are silently zero unless flight-marked.",
        "Silhouette physics deltas: height [-0.35,+0.18], width [-0.16,+0.30], flatten [0,0.60]. Volume law after exaggeration.",
      ],
      artisticLaw: [
        "The World rail may tune gravity scale, restitution, launch, intensity. It must not rename walk-band as 'speed' or expose the Froude teleport as a stroll.",
        "Walk Review is a body hold, not a bound. Bounds are world/field. The monitor does not move to fake a fence.",
        "A 1485 u/s stroll can still look like a zip if depth approaches the glass (he grows, plant margin shrinks). That is projection, not a second speed law.",
      ],
      invariants: [
        "Do not invent a second walk writer or a second gravity.",
        "Do not clamp grounded stroll up into the 2612–3990 Froude band (that is the old teleport).",
        "Do not expose maxSpeed 4200 or cruiseBase 3200 as owner walk knobs.",
        "Do not move the camera to compensate for zNear growth.",
      ],
      failureModes: [
        "Dual fence: comments still advertise [2612,3990] as stroll while painted wander files 1485.",
        "Rail lie: owner sliders do not name the fences that actually bound the walk.",
        "Glass approach: fixed Walk Review hold + z→zNear shrinks plant margin (measured dip to 56 px).",
        "Silent zero: airborne ax/az dropped, reads as a stall.",
      ],
      uncertainty: [
        "Later wander legs after the painted seed may still compose against comfortCruiseBand(field g). Not re-measured past the first three legs this receipt.",
        "Live field g on this preview was not printed; walk-band match is exact, field g is corpus (GaitLaw.test G=74210).",
      ],
      tests: [
        "Walk Review first seed cruise === GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC (918·φ).",
        "comfortCruiseBand(74210) brackets 3200 and does not equal 1485.",
        "WORLD_PHYSICS rail clamps stay gravityScale 0.25–2, restitution 0–0.9, launch 0.25–2, intensity 0–1.",
        "Painted wander target z≤160 and |x|≤2000. zNear remains -320.",
      ],
      visualConsequences: [
        "A stranger can name which fence they are watching: walk-band stroll, flight comfort, or glass approach.",
        "Plant stays reviewable at home z; he may fill the frame if he walks at the glass — that is depth, not a crop bug.",
      ],
      implementation: [
        "Do not recut GaitLaw or WorldPhysics this receipt. Explore only.",
        "If a next cut is earned: one owner-facing bound map (walk-band / flight / room / rail) and stop comments that call 3200 a stroll.",
        "Investigate next only if Cody names one fence (two-speed-fences or glass-approach-plant).",
      ],
    };
  }
  if (residual.id === "viewbox-scaling" && mode === "investigate") {
    return {
      coordinateSpaces:
        "Three stacked maps. (1) World u / 8 = content px. (2) SVG #avatar viewBox 0 0 240 220 — the content canvas; origin for camera at (120, 110). (3) Stage: screen = stage/2 + pan + (content − origin)·zoom. 1 content px = zoom CSS px. Dais measured 1120×758. Cinematic zoom=2, panY=−40. Depth scale(z)=1920/(1920+z) applies INSIDE the avatar before (3).",
      physicalLaw: [
        "The viewBox is not stretched to fill the dais. meet(1120/240, 758/220)=3.445 is NOT the gait scale. Using it double-counts zoom and lies about lift size.",
        "Honest walk-review scale: 1 content px = 2 CSS px. Kernel 544 u → 68 content px → 136 CSS px at zoom 2.",
        "Home silhouette law: 1224 u / 8 = 153 content px. × zoom 2 = 306 CSS px (~34% of a 900 px stage). Measured #body ~300×337 on 1120×758 — Wispwalker, not Presence 153.",
        "Fit is a computed zoom (production ~2.31) that face-plates. It is a shot, not a change of viewBox. Judging a 68 px lift under Fit is the operate plate, not walk review.",
        "Owner 6.8s tape is a tight portrait crop (black void). That crop is not the 1120×758 dais. Do not score CSS px off that tape without knowing its zoom.",
      ],
      artisticLaw: [
        "Doctrine 1: camera is the monitor. viewBox stays 240×220. Shot scale is zoom/pan or him moving in z. Do not resize the viewBox to 'see the step'.",
        "Walk review holds zoom 2. Operate/Fit may face-plate. Those are different pictures.",
      ],
      invariants: [
        "viewBox stays 0 0 240 220.",
        "unitsPerContentPx stays 8.",
        "Do not meet-fill the dais and then also apply zoom.",
        "Do not change viewBox to 120×110 or 480×440 to fake a bigger lift.",
      ],
      failureModes: [
        "Treating 240×220 as a texture that fills 1120×758 (×3.45) and concluding 68 px is huge or tiny.",
        "Fit (2.31) used as the walk-review ruler.",
        "Scoring the owner tape in CSS px without its zoom.",
        "Resizing viewBox so a W-chew looks like a longer step.",
      ],
      uncertainty: [
        "How the owner 6.8s tape was framed (export crop vs dais) is unearned. The three-map stack on the live dais is earned.",
      ],
      tests: [
        "svg#avatar viewBox === '0 0 240 220'.",
        "At zoom=1, a 10 content-px edge is 10 CSS px on the stage (not 34).",
        "At cinematic zoom=2, 68 content-px lift = 136 CSS px.",
        "CONTENT_VIEWBOX.width === 240 && 960/8 === 120.",
      ],
      visualConsequences: [
        "The W-unhook size is 68 content px (~136 CSS at zoom 2). If it still reads as a bite, the verb is wrong. The viewBox is not the wall.",
      ],
      implementation: [
        "Packet only. Do not change viewBox, 8, or zoom 2 this receipt.",
        "When scoring gait, lock walk-review frame (zoom 2) and quote content px, not dais-fill px.",
        "Next picture residual remains w-unhook (contour verb), not a bigger canvas.",
      ],
    };
  }
  if (residual.id === "froude-scaling" && mode === "investigate") {
    return {
      coordinateSpaces:
        "World u. L = l_eff = 612 u. Field g = 74210 u/s² (D-0112). Desktop g = 2600 (rail base only). Fr = v²/(g·L). v = √(Fr·g·L). Cadence X1: f = clamp(v/918, 1, f_max) Hz. λ_actual = v/f.",
      physicalLaw: [
        "Alexander: same Fr ⇒ same gait class. Comfortable walk Fr∈[0.15, 0.35]. Walk–run ≈ 0.5. This classifies. It does not pick a screen stride.",
        "comfortCruiseBand(g) = √(Fr·g·l_eff) over [0.15, 0.35]. At field g that is [2612, 3990]. cruiseBase 3200 sits inside it. That band is dynamic similarity at his φ-scale g.",
        "X1 cadence is f = v/λ_norm, λ_norm = 0.75·h_G = 918 u, floored at 1 Hz, capped so exchange ≥ 60 ms. Walk-band 1485 = 918·φ. Same stride as the Froude floor, slower cadence (φ Hz vs 2.84 Hz).",
        "Fr at live speeds, field g: strut 200 → 0.00088 (not a walk). Walk-band 1485 → 0.049 (below comfort). 2612 → 0.15. 3200 → 0.23. 3990 → 0.35.",
        "Fr at desktop g=2600 is a lie for class: 1485 → Fr 1.39 (a run). Never classify grounded walk on the rail gravity.",
        "Cycle 8 rejected Froude-scaled cadence (5.83 Hz): perception 3× out of regime. Fr keeps SPEED class. X1 keeps TIME the eye can count.",
        "At f floor 1 Hz, λ shrinks: strut 200 ⇒ λ = 200 u, not 918. tan α = 0.16. Vault dies. That is lawful X1, not a Froude match.",
      ],
      artisticLaw: [
        "Northstar strut 200 is acting, not a Fr walk. Do not raise it to 2612 to 'be similar'.",
        "Do not call 3200 a stroll. Comments that do are false. 3200 is flight / comfort-band terminal.",
        "clampToComfortBand is for the wander φ-ladder only. fileStrut and walk-band must not pass through it.",
      ],
      invariants: [
        "Do not clamp grounded Wispwalker up into [2612, 3990]. That is the old teleport.",
        "Do not restore Froude cadence (f ∝ √(g/L)). X1 stands.",
        "Do not classify gait on desktop g=2600.",
        "Do not merge the three speeds into one 'walk' knob.",
      ],
      failureModes: [
        "Dual fence unnamed: wander comments still advertise [2612, 3990] as stroll; painted wander files 1485; Northstar files 200.",
        "clampToComfortBand eating a strut or a walk-band intent (class change: stroll→teleport or walk→run).",
        "Using Fr to set bob/cadence at 200 so the pendulum 'shows' — that is a hop lie.",
        "Owner rail labeled 'speed' pointing at cruiseBase 3200.",
      ],
      uncertainty: [
        "Which live callers still pass intents through clampToComfortBand was not re-audited this receipt beyond GoldenWander + fileStrut (fileStrut writes 200 directly).",
        "Walk-run Fr 0.5 at field g is ~4764 u/s. Whether any flight path uses that fence is unearned.",
      ],
      tests: [
        "comfortCruiseBand(74210) ≈ {min:2612, max:3990}.",
        "Fr(200, 74210, 612) < 0.01. Fr(1485, 74210, 612) < 0.15. Fr(3200, 74210, 612) ∈ [0.15, 0.35].",
        "gaitStepHz(1485) === φ. gaitStepHz(2612) ≈ 2.84. gaitStepHz(200) === 1.",
        "fileStrut({cruise:200}) does not pass clampToComfortBand.",
        "clampToComfortBand(200, 74210) === 2612 — prove it must NOT be applied to strut.",
      ],
      visualConsequences: [
        "A stranger can name which speed they are watching: acting strut (200), grounded walk-band (1485), or flight comfort (2612–3990).",
        "Froude is a class label, not a bigger bounce. The plant still has to read at whatever speed is filed.",
      ],
      implementation: [
        "Do not recut speeds this receipt. Packet only.",
        "When cut: one owner map with three named fences (strut 200 / walk-band 1485 / Fr comfort 2612–3990). Stop comments that call 3200 a stroll.",
        "Guard: fileStrut and walk-band intents never enter clampToComfortBand. Wander φ-ladder still may.",
        "Do not change GaitLaw Fr endpoints or X1 λ. They are different organs.",
        "Investigate skate-no-swing remains a separate residual. Froude will not paint the swing.",
      ],
    };
  }
  if (
    mode === "summarize" &&
    (residual.id === "froude-scaling" ||
      residual.id === "weight-transfer" ||
      residual.id === "inverted-pendulum" ||
      residual.id === "skate-no-swing")
  ) {
    return {
      coordinateSpaces:
        "World u; l_eff=612; field g=74210. Screen px=u/8. Zoom-2 strut 200. Kernel swing 544 u; painter remaps to 42 px.",
      physicalLaw: [
        "Fr = v²/(g L) classifies under field g. Comfort [2612, 3990]. Not a screen stride.",
        "X1 cadence: f = v/918, floor 1 Hz. Walk-band 1485 = 918·φ. Strut 200 is acting (Fr 0.00088).",
        "L5 vault bob = l_eff·(1−cos α). At 200 that is ~4 u. Invisible. Live −100 bob is load-drop.",
        "SupportExchange sample-and-holds the plant. gaitLobePose names swing lift / loaded drop / COM settle.",
        "Williams: contact and passing. Both lobes down is a skate.",
      ],
      artisticLaw: [
        "Three named speeds. Do not call 3200 a stroll. Do not raise strut to show a vault.",
        "One pearl. No shoes. No second travel writer. walkEnable must not fight SupportExchange.",
      ],
      invariants: [
        "Do not clamp strut through clampToComfortBand.",
        "Do not restore Froude cadence.",
        "Do not write body.y to fake a vault.",
        "Do not add a second walk writer.",
      ],
      failureModes: [
        "Kernel supportSide flips; painter both-down.",
        "Painter still remaps 68 px kernel lift to the 42 px notch N305 rejected.",
        "Unnamed dual fence: 200 / 1485 / 2612–3990 all called walk.",
      ],
      uncertainty: [
        "gaitExpressionGate and planted=false during live strut not re-logged this summarize.",
      ],
      tests: [
        "fileStrut 200 never clampToComfortBand.",
        "deriveGait(200).bobUnits ≈ 4 and ≥ 0.",
        "Painter lift at full clearance must exceed the 42 px invisible notch at zoom-2.",
      ],
      visualConsequences: [
        "Stranger names the speed class, then counts plant vs swing. No bounce required at 200.",
      ],
      implementation: [
        "Summarize only. Fixes stay on the Investigate packets. Do not recut this receipt.",
      ],
    };
  }
  if (residual.id === "weight-transfer" && mode === "investigate") {
    return {
      coordinateSpaces:
        "World u. Planted world (x,z). Screen plant = plantedScreenXUnits. GAIT_LOBE: swing 544 u, drop 192 u, settle 288 u. Live 20s strut: stepHz 1.43, supportSide ±1, plantedX 16–26 u, squash ≈0.",
      physicalLaw: [
        "Weight transfer is plant-hinge + COM pay + free limb land + old support release.",
        "SupportExchange is the organ. skateUnits of a held plant ≈ 0. plantedCompress mid-stance. incomingCompress on the free side.",
        "gaitLobePose already derives the paint. Clearance 0 in double support (exchangeHold 0.35).",
        "At strut 200 the vault cannot carry the read (~4 u). Transfer must be lobe contrast and lean, not bob height.",
      ],
      artisticLaw: [
        "One pearl. Lower-contour only. No shoes. No opacity vanish.",
        "COM payment stranger-visible at zoom-2 as settle/lean, not as a hop.",
        "walkEnable form-coeff is a second walk. It must not flatten SupportExchange contrast.",
      ],
      invariants: [
        "No _plantHoldX on body.x. No second travel writer. No cruise raise.",
        "Do not restore gait8 smear or 118 px arch.",
        "Do not recut 20s beats until a 6s walk shows plant vs swing.",
      ],
      failureModes: [
        "supportSide live, both lobes grounded (measured 2026-08-16).",
        "Seat kills gait (stepHz 0, plantedX 0) — freeze, not last exchange.",
        "Form walkEnable fighting physics lobes.",
      ],
      uncertainty: [
        "Whether gaitLobePose returned 0 or the painter dropped it is owned by skate-no-swing.",
      ],
      tests: [
        "Strut 200: supportSide alternates; stranger counts ≥2 plants.",
        "skateUnits held plant ≈ 0.",
        "Seat keeps one exchange; does not zero plantedX on the first arrived frame.",
      ],
      visualConsequences: [
        "One foot carries him. One foot free. Whole pearl settles. Not a two-lobed puck.",
      ],
      implementation: [
        "Packet only. The cut is skate-no-swing (paint path), not new GaitLaw amplitudes.",
        "After skate-no-swing paints lift: re-watch 6s only (N258). Then 20s.",
      ],
    };
  }
  if (residual.id === "inverted-pendulum" && mode === "investigate") {
    return {
      coordinateSpaces:
        "l_eff=612 u. bob = l_eff·(1−cos α), tan α = λ/(2·l_eff). Strut 200 / 1.43 Hz ⇒ λ≈140 ⇒ bob≈4 u. X1 floor λ=918 ⇒ bob=122 u.",
      physicalLaw: [
        "Single support is the inverted pendulum. Double support is a collision. SupportExchange owns the exchange.",
        "L5 bob is always ≥ 0. Live −100 is load-drop (GAIT_LOBE.comBob), opposite sign, opposite law.",
        "Fr≪0.15 at 200: stroll class. The pendulum is lawful and sub-pixel.",
        "This is not cart-pole balance. Walking IP is the stance-leg vault.",
      ],
      artisticLaw: [
        "Do not amplify L5 at 200 to 10% h_G. That is a 1485 walk on a 200 body.",
        "Do not add vault-up to load-drop. Do not write body.y. Y=0 is the floor.",
      ],
      invariants: [
        "Strut cruise stays 200 (N191).",
        "L5 and comBob stay separate channels.",
        "No Y bounce to fake a vault.",
      ],
      failureModes: [
        "Reading −100 bob as L5.",
        "Raising strut so the vault shows.",
        "Asking IP to draw double support.",
      ],
      uncertainty: [
        "getGaitProofSample channel map (vault vs load-drop) still not split in the 20s probe.",
      ],
      tests: [
        "deriveGait(200).bobUnits ≈ 4 and ≥ 0.",
        "deriveGait at λ=918 bobUnits ≈ 0.1·h_G.",
        "SupportExchange.flight = 0 on the strut plant.",
      ],
      visualConsequences: [
        "No rise-and-fall at 200. The hinge is the read: planted lobe, free lobe, lean.",
      ],
      implementation: [
        "Packet only. Do not recut deriveGait. Do not raise strut. Next cut is still skate-no-swing.",
      ],
    };
  }
  if (residual.id === "w-unhook" && mode === "investigate") {
    return {
      coordinateSpaces:
        "One closed contour. Foot nubs at th=1.31 (viewer's right) and th=1.83 (left). SVG +y down. Lift is posed.y -= liftPx·w. Owner tape 6.8s zoom-2: body stays centered; one V of the cyan W rises and snaps back.",
      physicalLaw: [
        "The W is not two feet. It is two radius gaussians on one pearl (footAmp at 1.31/1.83). Topology never splits.",
        "skate-no-swing lift translates those vertices UP the screen. The valley of the W shortens. That is a chew, not a step. The swing never occupies a new floor X.",
        "Laterality is lawful: supportSide +1 plants 1.31 (right), swings 1.83 (left). The unhook is the correct side. The motion is the wrong verb (Y-chew vs leave/travel/land).",
        "Advance is still remapped: 352 u → 22 px (same class as the old 42 px lift cap). 22 px on a 300 px body is a nudge. The tape shows no forward travel of the free lobe.",
        "Plant drop is 0.35·loadedDrop/8. The hinge barely pays. Exchange = lift weight moves to the other gauss, previous side snaps to rest radius. That is the W reconstituting on the tape.",
        "D-0016 walk-in-place is lateral-first and forbids per-step vertical sink. Physics Y-lift was bolted onto the same contour. Two laws, one polyline. The chew is their interference pattern.",
      ],
      artisticLaw: [
        "A step is leave / travel / land / take weight (N251). A W-unhook is a bite in the base. Countable, not a walk.",
        "Do not split the pearl into shoes. Do not raise strut cruise so the chew gets bigger.",
        "Camera hold that nails COM to center makes travel unreadable. The W becomes the only motion.",
      ],
      invariants: [
        "One writer. One contour. No _plantHoldX. No second silhouette.",
        "Do not restore 118 px arch or gait8 smear.",
        "Do not call a Y-chew a swing.",
      ],
      failureModes: [
        "Y-lift of a foot-nub gaussian = W-unhook (this tape).",
        "22 px advance remap hides leave/travel/land.",
        "0.35 plant-drop remap hides COM pay.",
        "Centered hold + frontal heading ⇒ only the W is visible.",
      ],
      uncertainty: [
        "Whether walkEnable form press (stepDepth on radius) still fights the physics Y-lift on this tape was not isolated. walkPhysicsDrivenHold zeros the old walkGate when physics is live — radius nubs still exist.",
      ],
      tests: [
        "Swing nub's lowest painted y is above the plant nub by a countable air gap AND its x has advanced along heading before contact.",
        "At exchange, old swing x becomes the new plant x. Not: old swing y snaps back to the rest W.",
        "Painter advance = swingAdvanceUnits/8, not 22·(u/352).",
      ],
      visualConsequences: [
        "Stranger sees a foot leave the W, move, and become the new W-side. Not a bite that heals.",
      ],
      implementation: [
        "Analyze / packet only this receipt.",
        "When cut: stop Y-chewing the rest nub. Pose the EXISTING swing gauss in screen (x,y) from gaitLobePose (lift + full advance, no 22 px remap). Plant gauss stays world-locked. Exchange is a handoff of which gauss is locked, not a snap-back of y.",
        "Drop the 0.35 plant-drop attenuator. Paint loadedDropUnits/8.",
        "6s tape only. Do not recut 20s or Froude.",
      ],
    };
  }
  if (residual.id === "skate-no-swing" && mode === "investigate") {
    return {
      coordinateSpaces:
        "Kernel GAIT_LOBE.swingLiftUnits = 68·8 = 544 u. Painter all-script-3.js: liftPx = 42 · (swingLiftUnits / 544) · gaitLive. Full clearance ⇒ 42 px. Zoom-2 cinematic. N305: 42 px · σ=0.22 was a notch Cody could not see.",
      physicalLaw: [
        "WorldPhysicsDriver already calls gaitLobePose and publishes swingLiftUnits · gaitExpressionGate.",
        "gaitSwingClearance is 0 unless planted and |tanh(k cos(φ/2))| ≥ 0.35. If planted is false, lift is zero even when supportSide telemetry flips.",
        "The painter remaps the 68 px kernel lift back to a 42 px cap — the exact notch N305 rejected.",
        "Chin-keep (gauss at π/2, σ=0.16) zeros lift on the belly. If lobe gaussians miss the cyan nubs, lift is computed and invisible.",
      ],
      artisticLaw: [
        "Show the EXISTING lobe pose. Do not invent shoes. Do not enlarge cruise.",
        "Air gap must hold a countable interval in single support. No permanent cyan bridge.",
        "Face/membrane seq18 untouchable.",
      ],
      invariants: [
        "One writer: WorldPhysicsDriver. No _plantHoldX.",
        "Do not restore 118 px arch (N305 reject) or gait8 smear.",
        "Do not raise strut cruise to 1485 to make lift obvious.",
      ],
      failureModes: [
        "42 px remap: kernel 68 never reaches the screen (earned this receipt from source).",
        "planted=false while supportSide ≠ 0 → clearance 0.",
        "gaitExpressionGate still ramping through the 2.6 s strut window.",
        "walkEnable lateral-first form walk flattening contrast.",
      ],
      uncertainty: [
        "Live 20s did not print swingLiftUnits / swingClearance / gaitExpressionGate. Visual both-down is certain. planted=false vs 42 px remap not isolated on the tape.",
      ],
      tests: [
        "During strut single support: gaitScreen.swingLiftUnits > 0 and swingClearance > 0.",
        "Painter full-clearance lift ≥ 68 content px at zoom-2 (the N305 floor), not 42.",
        "Stranger counts ≥2 plants on a 6s take. Both-down skate fails.",
        "No _plantHoldX. No shoes. Seq18 face unchanged.",
      ],
      visualConsequences: [
        "One cyan lobe holds the floor. The other lifts with black separation, advances, lands. Then weight transfers.",
      ],
      implementation: [
        "Packet only this receipt. When cut: stop remapping 544 u → 42 px. Paint GAIT_LOBE.swingLiftUnits / 8 directly (68 px) on the swing nub only.",
        "Confirm planted=true whenever supportSide ≠ 0. If not, that is the kernel bug — fix SupportExchange planted, not the painter.",
        "Proof: 6s only at 120fps (N258). Not the full 20s until the 6s picture passes.",
        "Do not touch Froude endpoints or strut 200 to 'help' the lift.",
      ],
    };
  }
  if (mode === "investigate") {
    return {
      coordinateSpaces:
        "World u; h_G=1224 u; content px=u/8; viewBox 240×220. Measured 1440×900 preview, dais 1120×758. Cinematic hold zoom=2 panY=-40: #body 300×337 @ y=254–591, ground 631, stage bottom 834 (243 px plant margin). Production Fit calibrates 231% and face-plates. Facial-review targetHeightFraction 0.72 + ZOOM_MAX 4 is the operate plate.",
      physicalLaw: [
        "A walk is an inverted-pendulum vault: one support planted, COM pays, swing limb clears.",
        "Plant/swing contrast is a screen observable. A face plate makes gait unreviewable even when GaitLaw is live.",
        "Phase is travel-locked. wanderGateOpen requires living.autoSequence; boot seals autoSequence false (N334), so wander enable alone files no locomotion.",
        "headingPinDeg pins paint yaw only. Frontal pin (0) is lawful for walk review — both lobes face the monitor while travel still writes.",
      ],
      artisticLaw: [
        "Operate / Fit stay face-first (facial-review 0.62–0.72). That shot is expression, not gait.",
        "Walk review is a dedicated authored hold equal to the isolated-proof cinematic frame (zoom 2, panY -40). Not shotBias. Not a moving camera during the walk.",
        "Doctrine 1: set the hold once, freeze it, do not follow COM. User Fit still outranks if they take the dial.",
      ],
      invariants: [
        "Do not invent a second walk writer. Wander files walk-band LocomotionIntent; the rail never writes x/z/cruise.",
        "Do not enlarge cruise, add shoes, or change GaitLaw amplitudes to fake a plant.",
        "Do not change face grammar or Wispwalker authoring defaults to simulate gait.",
        "Do not resurrect shotBias as a live camera actuator (D-0107).",
      ],
      failureModes: [
        "Face plate: Fit / production 231% crop hides both lobes.",
        "Silent wander: Walk clicked but autoSequence stays false, so the gate never opens.",
        "Hover/skate: both lobes stay grounded or both leave together.",
        "Clock walk: phase advances while travel is zero.",
        "Second camera: live zoom/pan during the stroll (Doctrine 1 leak).",
      ],
      uncertainty: [
        "Stranger-countable plant vs swing still requires owner eyes at 60fps after wander is live. This PHD only unblocks the shot + gate.",
      ],
      tests: [
        "Walk Review hold equals {zoom:2, panX:0, panY:-40}, userWorldFrameHeld, autoFit false.",
        "On a ≥700 px dais, #body bottom and #ground stay above the stage fold by ≥80 px.",
        "After Walk, wanderEnabled is true and living.autoSequence is true; after Stand, wanderEnabled is false.",
        "No new setLocomotion writer appears in the rail path. GaitLaw is untouched.",
        "Reduced motion still collapses gait to byte-identical rest.",
      ],
      visualConsequences: [
        "A stranger can count plant vs swing on the lower contour without clicking Fit.",
        "Both Wispwalker foot-root lobes and the contact shadow stay on stage.",
        "Operate Fit still face-plates for expression review.",
      ],
      implementation: [
        "Add walkReviewShot.ts: WALK_REVIEW_FRAME = cinematic hold. Operate Fit stays facial-review.",
        "Rail Walk: releaseUserWorldFrame + holdUserWorldFrame(WALK_REVIEW_FRAME), living.applyModePolicy({autoSequence:true, restrainedIdle:false, freezeSequence:true}), ensurePhysicsDriver, setWanderEnabled(true). Keep heading pin. Mark data-shot=walk-review.",
        "Rail Stand: setWanderEnabled(false), restore autoSequence false, keep the body hold.",
        "Do not change GaitLaw, CraftRail shotBias, or Wispwalker authoring defaults.",
      ],
    };
  }
  return {
    coordinateSpaces:
      "World units u; h_G = 1224 u; content px = u/8; operate crop is face-first; Proof/100% still may hide lobes.",
    physicalLaw: [
      "A walk is an inverted-pendulum vault: one support planted, COM pays, swing limb clears.",
      "Plant/swing contrast is a screen observable. If both lobes are off-frame, gait is unreviewable.",
      "Phase is travel-locked. A face crop cannot substitute for a body-visible shot.",
    ],
    artisticLaw: [
      "Face-first operate crop is lawful for expression review. It is not the walk-review shot.",
      "Walk review requires a medium/wide authored bias so both foot-root lobes are stranger-countable.",
    ],
    invariants: [
      "Do not invent a second walk writer.",
      "Do not enlarge cruise or add shoes to fake a plant.",
      "Do not change face grammar to simulate gait.",
    ],
    failureModes: [
      "Hover/skate: both lobes stay grounded or both leave together.",
      "Face plate: walk is on but the plant is cropped out.",
      "Clock walk: phase advances while travel is zero.",
    ],
    uncertainty: [
      "Authored 100% still face-crops; Fit currently zooms to 400%. Exact wide-shot camera law is not re-derived this receipt.",
    ],
    tests: [
      "Proof + authored-wide (or equivalent) shows both Wispwalker foot-root lobes.",
      "During walk, loaded lobe stays world-planted while swing lobe shows air gap.",
      "Reduced motion collapses gait to byte-identical rest.",
    ],
    visualConsequences: [
      "A stranger can count plant vs swing on the lower contour.",
      "COM settles onto the planted lobe; the pearl does not float over wiggling feet.",
    ],
    implementation: [
      "Hold operate face-first. Walk review uses Motion/Proof with shot bias wide or a dedicated body crop.",
      "Do not change GaitLaw amplitudes to compensate for a cropped shot.",
      "Return this packet to TriForce under docs/triforce/canon/runs/ before any walk-crop fix.",
    ],
  };
}

export class GrokCanonOpsService {
  constructor(private readonly options: GrokCanonOpsServiceOptions) {}

  async run(request: CanonOpsRunRequest): Promise<CanonOpsPhdPacket> {
    const residual = request.residual ?? DEFAULT_CANONOPS_RESIDUAL;
    const engineVersion = this.options.engineVersion ?? this.readEngineVersion();
    const runId = `${stamp()}-${request.mode}-${residual.id}`;
    const depositRel = join("docs", "triforce", "canon", "runs", runId);
    const depositAbs = resolve(this.options.root, depositRel);
    mkdirSync(depositAbs, { recursive: true });

    const packet: CanonOpsPhdPacket = {
      schema: "gasper.canonops.phd-packet.v1",
      mode: request.mode,
      residual,
      question: questionFor(request.mode, residual),
      ...fieldsFor(request.mode, residual),
      citations: SEED_CITATIONS,
      triforce: {
        engineVersion,
        depositPath: depositRel.replaceAll("\\", "/"),
        returned: true,
      },
      earnedAt: new Date().toISOString(),
    };

    writeFileSync(join(depositAbs, "packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
    writeFileSync(join(depositAbs, "phd-memo.md"), renderMemo(packet));
    writeFileSync(
      resolve(this.options.root, "docs", "triforce", "canon", "LATEST.json"),
      `${JSON.stringify({ runId, mode: packet.mode, residual: residual.id, depositPath: packet.triforce.depositPath }, null, 2)}\n`,
    );
    return packet;
  }

  private readEngineVersion(): string {
    try {
      const lockPath = resolve(this.options.root, "docs", "triforce", "kernel.lock.json");
      const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
        installer?: { engineVersion?: string };
      };
      return lock.installer?.engineVersion ?? "3.0.0";
    } catch {
      return "3.0.0";
    }
  }
}

function renderMemo(packet: CanonOpsPhdPacket): string {
  return `# CanonOps PHD — ${packet.mode} · ${packet.residual.id}

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: ${packet.earnedAt}
Tri-Force: ${packet.triforce.engineVersion}
Deposit: ${packet.triforce.depositPath}

## 1. THE WALL

${packet.residual.wall}

## 2. QUESTION

${packet.question}

## 3. COORDINATE SPACES

${packet.coordinateSpaces}

## 4. PHYSICAL LAW

${packet.physicalLaw.map((line) => `- ${line}`).join("\n")}

## 5. ARTISTIC LAW

${packet.artisticLaw.map((line) => `- ${line}`).join("\n")}

## 6. INVARIANTS

${packet.invariants.map((line) => `- ${line}`).join("\n")}

## 7. FAILURE MODES

${packet.failureModes.map((line) => `- ${line}`).join("\n")}

## 8. UNCERTAINTY

${packet.uncertainty.map((line) => `- ${line}`).join("\n")}

## 9. TESTS

${packet.tests.map((line) => `- ${line}`).join("\n")}

## 10. VISUAL CONSEQUENCES

${packet.visualConsequences.map((line) => `- ${line}`).join("\n")}

## 11. IMPLEMENTATION

${packet.implementation.map((line, i) => `${i + 1}. ${line}`).join("\n")}

## 12. CITATIONS

${packet.citations.map((c) => `- \`${c.id}\` [${c.tier}] ${c.source} — ${c.rule}`).join("\n")}
`;
}
