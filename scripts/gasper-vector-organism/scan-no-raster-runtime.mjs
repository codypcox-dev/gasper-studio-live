#!/usr/bin/env node
/**
 * GASPER-FINISH-01 — canonical no-raster runtime scanner.
 *
 * Named replacement for the historically referenced (but absent)
 * scripts/gasper-vector-organism/scan-no-raster-runtime.mjs.
 *
 * Scope: executable Gasper runtime source (ts/js with comments stripped,
 * strings preserved) plus SVG/HTML/CSS assets scanned raw. It refuses the
 * organism's forbidden primitives: canvas/raster APIs, bitmap decode,
 * SVG raster/filter/mask nodes, foreignObject, CSS masks, and blend modes.
 *
 * Exit 0 = clean. Exit 1 = forbidden hit or self-test failure.
 * Usage:
 *   node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs [--json]
 *   node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs --selftest
 *   node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs --out <path>
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const SCAN_ROOTS = [
  "packages/desktop/src/gasper",
  "packages/gasper-studio/public",
];
const CODE_EXTS = new Set([".ts", ".js", ".mjs", ".cjs"]);
const RAW_EXTS = new Set([".svg", ".html", ".css"]);
const EXCLUDE_BASENAME = /\.test\.[tj]s$/;
/**
 * Lab-only native renderer candidate assets. The production FormMaster path
 * is the shipping authority; candidate-script-* is the incomplete lab
 * candidate. The default production-scope scan excludes these files and
 * declares the exclusion in its report. `--include-lab` scans them too and
 * is EXPECTED TO FAIL while the lab candidate still uses forbidden filter
 * primitives — that standing failure is part of the evidence that the native
 * candidate is not promotable (productionAuthority.nativeCandidateIncomplete).
 */
const LAB_CANDIDATE_BASENAME = /candidate-script-\d+\.js$/;

/** Forbidden primitives. Patterns are word/usage-shaped, not bare words, so
 *  prose in string payloads does not false-fire; comments are stripped first. */
const FORBIDDEN = [
  { id: "canvas-element", re: /\bHTMLCanvasElement\b|\bOffscreenCanvas\b|\bCanvasRenderingContext2D\b/ },
  { id: "canvas-context", re: /\.getContext\s*\(\s*['"](?:2d|webgl|webgl2|bitmaprenderer)['"]/ },
  { id: "canvas-create", re: /createElement(?:NS)?\s*\(\s*(?:[^,)]*,\s*)?['"]canvas['"]/ },
  { id: "bitmap-image", re: /\bnew\s+Image\s*\(|\bcreateImageBitmap\s*\(|\bImageData\b|\bImageBitmap\b/ },
  { id: "bitmap-pixels", re: /\btoDataURL\s*\(|\bgetImageData\s*\(|\bputImageData\s*\(|\bdrawImage\s*\(/ },
  { id: "svg-raster-node", re: /<image[\s>]|<foreignObject[\s>]|\bforeignObject\b/ },
  { id: "svg-filter", re: /<filter[\s>]|\bfilter\s*=\s*["']|\bsetAttribute\s*\(\s*['"]filter['"]|<fe[A-Z][A-Za-z]*\b|\bsetAttribute\s*\(\s*['"]filter['"]/ },
  { id: "svg-mask", re: /<mask[\s>]|\bmask\s*=\s*["']|\bsetAttribute\s*\(\s*['"]mask['"]/ },
  { id: "css-blend", re: /mix-blend-mode|mixBlendMode|\bbackground-blend-mode\b/ },
  { id: "css-mask", re: /mask-image|maskImage|-webkit-mask/ },
];

/** Strip // and /* *\/ comments from JS/TS while preserving strings and
 *  template literals. Regex literals containing comment openers are a known
 *  residual risk and are not present in the scanned tree. */
function stripComments(source) {
  let out = "";
  let i = 0;
  const n = source.length;
  let state = "code";
  let quote = "";
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (state === "code") {
      if (c === "/" && next === "/") {
        state = "line";
        i += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        state = "block";
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        state = "string";
        quote = c;
        out += c;
        i += 1;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (state === "line") {
      if (c === "\n") {
        state = "code";
        out += c;
      }
      i += 1;
      continue;
    }
    if (state === "block") {
      if (c === "*" && next === "/") {
        state = "code";
        i += 2;
        continue;
      }
      if (c === "\n") out += c;
      i += 1;
      continue;
    }
    // string
    if (c === "\\") {
      out += c + (next ?? "");
      i += 2;
      continue;
    }
    if (c === quote) {
      state = "code";
      out += c;
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function scanFile(path) {
  const ext = extname(path);
  const raw = readFileSync(path, "utf8");
  const content = CODE_EXTS.has(ext) ? stripComments(raw) : raw;
  const hits = [];
  const lines = content.split("\n");
  for (const rule of FORBIDDEN) {
    for (let line = 0; line < lines.length; line += 1) {
      if (rule.re.test(lines[line])) {
        hits.push({ rule: rule.id, line: line + 1, text: lines[line].trim().slice(0, 160) });
      }
      rule.re.lastIndex = 0;
    }
  }
  return hits;
}

function collectFiles(includeLab) {
  const files = [];
  const labExcluded = [];
  for (const root of SCAN_ROOTS) {
    const abs = join(ROOT, root);
    for (const file of walk(abs)) {
      const ext = extname(file);
      if (!CODE_EXTS.has(ext) && !RAW_EXTS.has(ext)) continue;
      if (EXCLUDE_BASENAME.test(file)) continue;
      if (!includeLab && LAB_CANDIDATE_BASENAME.test(file)) {
        labExcluded.push(relative(ROOT, file));
        continue;
      }
      files.push(file);
    }
  }
  return { files: files.sort(), labExcluded: labExcluded.sort() };
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "gasper-no-raster-"));
  const badSvg = join(dir, "bad.svg");
  writeFileSync(
    badSvg,
    '<svg xmlns="http://www.w3.org/2000/svg"><filter id="f"><feGaussianBlur stdDeviation="2"/></filter><foreignObject width="10" height="10"></foreignObject><rect filter="url(#f)" mask="url(#m)"/><mask id="m"></mask></svg>',
  );
  const badJs = join(dir, "bad.js");
  writeFileSync(
    badJs,
    'const c = document.createElement("canvas"); const ctx = c.getContext("2d"); ctx.drawImage(new Image(), 0, 0); el.style.mixBlendMode = "screen"; // HTMLCanvasElement mention in comment is stripped\n/* foreignObject in a comment is stripped too */\n',
  );
  const cleanSvg = join(dir, "clean.svg");
  writeFileSync(
    cleanSvg,
    '<svg xmlns="http://www.w3.org/2000/svg"><radialGradient id="g"><stop offset="0" stop-color="#fff"/></radialGradient><ellipse fill="url(#g)" rx="4" ry="3"/></svg>',
  );
  const results = {
    badSvg: scanFile(badSvg),
    badJs: scanFile(badJs),
    cleanSvg: scanFile(cleanSvg),
  };
  const detected = new Set([
    ...results.badSvg.map((h) => h.rule),
    ...results.badJs.map((h) => h.rule),
  ]);
  const required = ["svg-filter", "svg-mask", "svg-raster-node", "canvas-create", "canvas-context", "css-blend"];
  const missing = required.filter((id) => !detected.has(id));
  const commentStrippingWorks =
    !results.badJs.some((h) => h.text.includes("mention in comment")) &&
    results.badJs.every((h) => h.rule !== "svg-raster-node" || !h.text.startsWith("/*"));
  return {
    ok: missing.length === 0 && results.cleanSvg.length === 0 && commentStrippingWorks,
    missing,
    cleanSvgHits: results.cleanSvg,
    commentStrippingWorks,
    detected: [...detected],
  };
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const outIndex = args.indexOf("--out");
const outPath = outIndex >= 0 ? resolve(args[outIndex + 1]) : null;

if (args.includes("--selftest")) {
  const result = selfTest();
  const report = { scanner: "scan-no-raster-runtime", mode: "selftest", ...result };
  const text = JSON.stringify(report, null, 2);
  if (outPath) writeFileSync(outPath, text + "\n");
  if (json || !outPath) process.stdout.write(text + "\n");
  else process.stdout.write(`selftest ok=${result.ok}\n`);
  process.exit(result.ok ? 0 : 1);
}

const includeLab = args.includes("--include-lab");
const { files, labExcluded } = collectFiles(includeLab);
const findings = [];
for (const file of files) {
  const hits = scanFile(file);
  if (hits.length) {
    findings.push({ file: relative(ROOT, file), hits });
  }
}
const report = {
  scanner: "scan-no-raster-runtime",
  scope: includeLab ? "production+lab-candidate" : "production",
  scannedRoots: SCAN_ROOTS,
  labCandidatesExcluded: includeLab ? [] : labExcluded,
  filesScanned: files.length,
  forbiddenRules: FORBIDDEN.map((rule) => rule.id),
  findings,
  ok: findings.length === 0,
};
const text = JSON.stringify(report, null, 2);
if (outPath) writeFileSync(outPath, text + "\n");
if (json || !outPath) process.stdout.write(text + "\n");
else {
  process.stdout.write(
    `scan-no-raster-runtime: ${files.length} files scanned, ${findings.length} files with forbidden hits -> ${report.ok ? "PASS" : "FAIL"}\n`,
  );
  for (const finding of findings) {
    process.stdout.write(`  ${finding.file}: ${finding.hits.map((h) => `${h.rule}@${h.line}`).join(", ")}\n`);
  }
}
process.exit(report.ok ? 0 : 1);
