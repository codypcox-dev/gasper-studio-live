// CanonOps G1 fast-follow merge — computational-graphics agent survey into research/canon/anim-physics.
// One-shot maintenance script; safe to delete after run (kept for provenance).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "research/canon/anim-physics");
const rw = (f) => JSON.parse(readFileSync(join(ROOT, f), "utf8"));
const wr = (f, o) => writeFileSync(join(ROOT, f), JSON.stringify(o, null, 2) + "\n");
const byId = (a, id) => a.find((e) => e.id === id);

// ---------- frameworks ----------
const fws = rw("frameworks.json");

let e = byId(fws, "linear-blend-skinning");
e.description =
  "Vertex = weighted blend of joint matrices: v′ = Σᵢ wᵢ (Mᵢ v) with Σwᵢ = 1. Cheap, universal, GPU-friendly and industry-standard; but the blended matrix is generally non-rigid, so volume collapses at high twist — the candy-wrapper / joint-collapse artifact formally analyzed in Kavan 2008.";
e.machineRules = [
  "weights per vertex sum to 1 within 1e-5; renormalize or reject at import otherwise",
  "twist beyond ~45deg requires DQS or corrective shapes",
  "skin-weight buffers validate at import; unweighted vertices rejected",
];
e.sources.push("https://doi.org/10.1145/1409625.1409627");

e = byId(fws, "dual-quaternion-skinning-2008");
e.description =
  "Bones as unit dual quaternions q̂ = q₀ + εqε; blend then renormalize q̂′ = (Σwᵢq̂ᵢ)/‖Σwᵢqᵢ‖ — the result stays on the rigid-motion manifold, so DQS preserves volume under twist where LBS pinches; points transform via v′ = v + 2q₀×(q₀×v + qε). Cannot represent scale/shear natively; near-drop-in replacement in rigs.";
e.machineRules = [
  "use DQS on twist joints; blended dual quaternion MUST be renormalized or validation fails",
  "opposing bone weights (sum near zero) detected and clamped to avoid NaN poses",
  "corrective shapes only for residuals DQS cannot express",
];
e.sources.push("https://doi.org/10.1145/1409625.1409627");

e = byId(fws, "rendering-equation-1986");
e.tier = "canon";
e.description =
  "Outgoing radiance = emitted + BRDF-weighted cosine integral of incoming radiance over the hemisphere: L_o(x,ω_o) = L_e + ∫_Ω f_r L_i |cosθ| dω (Kajiya SIGGRAPH 1986, independent: Immel et al. 1986). BRDF f_r = dL_o/dE_i obeys reciprocity f_r(ω_i,ω_o)=f_r(ω_o,ω_i) and energy conservation ∫ f_r cosθ dω ≤ 1. Subsumes Whitted ray tracing (1980); the law all light-transport engines (RenderMan RIS, Hyperion) approximate by Monte Carlo.";
e.machineRules = [
  "light response models must be expressible as BRDF-weighted hemisphere integrals",
  "energy conservation: hemispherical reflectance ≤ 1; brighter-than-white materials flagged",
  "BRDF reciprocity holds within tolerance; asymmetric responses are defects unless explicitly non-reciprocal",
];
e.sources.push("https://www.pbr-book.org/4ed/Radiometry,_Spectra,_and_Color/Surface_Reflection.html");

e = byId(fws, "monte-carlo-light-transport-1998");
e.tier = "canon";
e.description =
  "Monte Carlo estimation of light transport: F_N = (1/N) Σ f(Xᵢ)/p(Xᵢ), unbiased with variance O(1/N); importance sampling aligns p with the integrand (BRDF/cosine/light-source, combined by MIS weights). Path tracing (Kajiya 1986) is the first general-purpose unbiased MC light-transport algorithm; Veach 1998 gives the variance-control mathematics (MIS, bidirectional PT, MLT) inside production path tracers; LTE operator form L = Le + T L unifies all light-transport algorithms.";
e.machineRules = [
  "combine sampling strategies with MIS weights; never trust a single strategy",
  "sampling budget (spp) declared per render; renders without declared spp are unapproved",
  "convergence: doubling samples must reduce estimator variance; non-converging integrators are defective",
  "denoising runs only from a declared minimum sample count (RenderMan guidance ~96 spp); below threshold is blocked",
];
e.sources.push(
  "https://www.pbr-book.org/4ed/Monte_Carlo_Integration/Monte_Carlo_Basics.html",
  "https://www.pbr-book.org/4ed/Light_Transport_I_Surface_Reflection/Path_Tracing.html"
);

e = byId(fws, "usd-composition-arcs");
e.description +=
  " Prim specifiers def (concrete) / over (partial non-defining opinion) / class (abstract for inherits) control whether an opinion defines, layers, or abstracts; the session layer sits above the root LayerStack as the strongest live opinion; flatten produces a single-layer result. Pixar internal heritage: Marionette (menv) → Presto → TidScene → USD (named ~2012).";
e.machineRules.push(
  "shot-level composition prefers sublayering over referencing (USD FAQ: muting, edit targets, compact runtime)",
  "every LayerStack is ordered strongest-to-weakest; implicit ordering is a pipeline defect"
);
e.sources.push("https://openusd.org/release/usdfaq.html");

e = byId(fws, "spider-verse-stylized-2019");
e.tier = "canon";
e.venue =
  "SIGGRAPH 2019 course (Dimian et al.); SIGGRAPH 2023 papers (Grochola et al. linework; Davignon & St. Clair NPR compositing); Into/Across the Spider-Verse";
e.description =
  "CG posed and lit physically, then stylized — design and style matter more than accuracy or realism (Dimian et al.): projected ink lines generated procedurally but adhering to the 3D animation with per-character styles (Grochola et al.), hand-drawn FX, halftone/hatch lighting, camera and character on different stepping rates (2s for hand-drawn feel). Non-photorealistic compositing (Patcher Tool lineage) applies painterly nodes to 3D renders as post-process — lighting is drawn over, never trusted as physical final.";
e.machineRules = [
  "physical light base first; stylization layers after",
  "stepping rate is an authored per-element property (1s/2s)",
  "stylized shows keep a non-destructive separation between 3D lighting passes and painterly post; baked-in looks are rejected",
  "every linework generation tracks the underlying 3D animation frame-to-frame; detached linework is a defect",
];
e.sources.push(
  "https://doi.org/10.1145/3292423.3313758",
  "https://doi.org/10.1145/3587421.3595456",
  "https://doi.org/10.1145/3587421.3595463"
);

e = byId(fws, "alembic-baked-cache-2011");
e.description +=
  " Cache-based playback decouples simulation cost from playback frame rate — the film determinism pattern (same law in Ziva sim caches and USD pose caches/Value Clips): identical inputs + solver version reproduce identical frames.";
e.machineRules.push(
  "cache regeneration from identical inputs and solver versions MUST reproduce identical output; divergence is a pipeline bug",
  "cache frame ranges fully cover the shot range plus handles before approval"
);
e.sources.push(
  "https://web.archive.org/web/20221128065347/https://zivadynamics.com/",
  "https://www.openusd.org/release/intro.html"
);

fws.push(
  {
    id: "pose-space-deformation-2000",
    name: "Pose Space Deformation (Corrective Blendshapes)",
    authors: ["J. P. Lewis", "Matt Cordner", "Nickson Fong"],
    year: 2000,
    venue: "SIGGRAPH 2000; ML successors: Neural Blend Shapes (SIGGRAPH 2021), RigNet (2020)",
    domain: "computational-graphics",
    tier: "governed",
    description:
      "Artists sculpt corrective displacements at discrete poses in pose space (e.g. shoulder raised 90°); at runtime the current joint pose interpolates nearby sculpted corrections as local vertex displacements — fixing LBS/DQS residual artifacts without changing the skinning solver. Shape-by-example (2003) is the data-driven precedent; Neural Blend Shapes learn the pose→displacement map; RigNet auto-rigs skeleton + weights.",
    machineRules: [
      "rigs carry corrective shapes at extreme poses (shoulder 90/180) before character approval",
      "corrective blend weights are driven by joint pose, not by animation curves, to remain pose-consistent",
    ],
    sources: [
      "https://doi.org/10.1145/344779.344862",
      "https://doi.org/10.1145/3450626.3459852",
      "https://doi.org/10.48550/arxiv.2005.00559",
    ],
  },
  {
    id: "loop-blinn-vector-gpu-2005",
    name: "Resolution-Independent GPU Vector Rendering (Loop-Blinn / Slug / SDF)",
    authors: ["Charles Loop", "Jim Blinn", "Slug library", "W3C SVG"],
    year: 2005,
    venue: "Loop & Blinn SIGGRAPH 2005; Slug production library; SVG 2 W3C CR 2018; Flash production lineage",
    domain: "computational-graphics",
    tier: "canon",
    description:
      "Resolution-independent vector rendering: Loop-Blinn encodes curve geometry so a pixel shader evaluates the curve equation per pixel — crisp at any resolution/zoom without re-tessellation; Slug renders shapes directly from quadratic Bézier outline data on the GPU, explicitly with no precomputed textures or SDFs; signed distance fields are the contrasting approach (distance-to-boundary textures thresholded for scalable contours). SVG 2 is the web-standard vector format; Flash timeline vector animation is the production ancestor. This is the graphics substrate law for vector-only organisms.",
    machineRules: [
      "vector text/UI/characters render from curve or SDF data, never from pre-rasterized bitmaps; bitmap zoom artifacts are release-blocking",
      "every vector renderer declares its technique (analytic curve vs SDF vs tessellation) for compatibility review",
      "edges stay crisp across the full authored zoom range without re-tessellation",
    ],
    sources: [
      "https://doi.org/10.1145/1073204.1073303",
      "https://www.sluglibrary.com/",
      "https://www.w3.org/TR/SVG2/",
      "https://en.wikipedia.org/wiki/Adobe_Flash",
    ],
  },
  {
    id: "virtual-production-led-volume-2019",
    name: "LED-Volume Virtual Production (StageCraft / nDisplay)",
    authors: ["ILM StageCraft", "Epic Games nDisplay"],
    year: 2019,
    venue: "The Mandalorian (2019); ~300 LED stages worldwide by Oct 2022; Unreal nDisplay docs",
    domain: "computational-graphics",
    tier: "governed",
    description:
      "LED walls display real-time-rendered environments while actors perform; the tracked camera drives correct parallax — the core perceptual trick. nDisplay runs one engine instance per display with a primary node coordinating; viewports match the physical screen geometry so frustums are correct. Frame coherence across nodes is essential (no tearing at LED seams, no mixed frames on camera): hardware genlock/framelock (Quadro Sync II + sync generator). Real-time determinism must be engineered via sync hardware; offline renderers (USD/RIS/Hyperion) have it by construction.",
    machineRules: [
      "LED clusters run genlock/framelock; unsynchronized clusters fail pre-shoot validation",
      "viewport frustums match measured physical screen geometry; mismatches above tolerance break parallax and require recalibration",
      "camera tracking latency measured per setup; jitter above threshold blocks shooting",
    ],
    sources: [
      "https://en.wikipedia.org/wiki/On-set_virtual_production",
      "https://web.archive.org/web/20220503111918/https://docs.unrealengine.com/5.0/en-US/ndisplay-overview-for-unreal-engine/",
      "https://web.archive.org/web/20220124063256/https://docs.unrealengine.com/4.27/en-US/WorkingWithMedia/IntegratingMedia/nDisplay/Synchronization/ndisplay-synchronization-with-nvidia/",
    ],
  }
);
wr("frameworks.json", fws);

// ---------- books ----------
const books = rw("books.json");
books.push({
  id: "renderman-companion-1989",
  title: "The RenderMan Companion",
  author: "Steve Upstill",
  year: 1989,
  domain: "studio-systems",
  stage: 4,
  tier: "reference",
  keyPrinciples: [
    "The classic RenderMan API text: scene description consumed by a spec-compliant renderer",
    "Shaders (surface/light/volume/displacement) as the artist-facing physical-parameter layer",
    "Separation of what-is-described from how-it-renders predates USD opinions",
  ],
  machineRules: ["renderer-facing content stays spec-compliant; renderer-private formats are rejected"],
  sources: ["https://api.openalex.org/works?search=The+RenderMan+Companion", "https://en.wikipedia.org/wiki/Pixar_RenderMan"],
});
wr("books.json", books);

// ---------- lineage ----------
const lin = rw("lineage.json");
lin.push({
  id: "kavan-lewis-deformation",
  name: "Skinning & corrective deformation lineage",
  era: "1988-",
  contribution:
    "LBS matrix-palette skinning and its candy-wrapper collapse → DQS rigidity fix (Kavan 2008) → pose-space corrective blendshapes (Lewis 2000) → data-driven/ML deformation (Neural Blend Shapes, RigNet) and physics-based tissue sim (Ziva) as the high-end alternative.",
  influencers: [],
  influenced: ["facs-blendshape-rigs"],
});
byId(lin, "facs-blendshape-rigs").influencers.push("kavan-lewis-deformation");
byId(lin, "usd-interchange").contribution =
  "Non-destructive layered scene interchange; opinions and composition arcs for multi-department collaboration. Pixar internal heritage Marionette (menv) → Presto → TidScene → USD (named ~2012); open-sourced 2016; AOUSD Core Spec 1.0.";
wr("lineage.json", lin);

console.log("G1 merge written: frameworks", fws.length, "books", books.length, "lineage", lin.length);
