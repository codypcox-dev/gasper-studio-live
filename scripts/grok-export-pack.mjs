#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, ".grok-export");
const SHARD_BYTES = 48_000;
const ROOTS = [
  "packages/studio-protocol/src",
  "packages/gasper-studio/src",
  "packages/desktop/src",
  "packages/shared/src",
  "packages/gasper-mcp/src",
  "packages/desktop/vendor",
  "public",
  "index.html",
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
];
const SKIP = new Set(["node_modules", ".git", "dist", ".gasper", ".grok-export", "coverage"]);
const SKIP_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/i;
const TEXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|md|svg|gasper)$/i;

function walk(abs, acc) {
  let st;
  try { st = statSync(abs); } catch { return; }
  if (st.isDirectory()) {
    const name = abs.split(/[\\/]/).pop();
    if (SKIP.has(name)) return;
    for (const ent of readdirSync(abs)) walk(join(abs, ent), acc);
    return;
  }
  const rel = relative(ROOT, abs).replaceAll("\\", "/");
  if (SKIP_RE.test(rel)) return;
  if (!TEXT_RE.test(rel) && !rel.endsWith("index.html")) return;
  acc.push({ rel, size: st.size, abs });
}

const files = [];
for (const r of ROOTS) walk(join(ROOT, r), files);
files.sort((a, b) => a.rel.localeCompare(b.rel));
mkdirSync(OUT, { recursive: true });
const manifest = [];
let shard = [];
let shardBytes = 0;
let shardIdx = 0;

function flush() {
  if (!shard.length) return;
  const name = `shard-${String(shardIdx).padStart(3, "0")}.json`;
  writeFileSync(join(OUT, name), JSON.stringify(shard), "utf8");
  manifest.push({ name, files: shard.length, bytes: shardBytes });
  shard = [];
  shardBytes = 0;
  shardIdx += 1;
}

for (const f of files) {
  if (f.size > 80_000) {
    const text = readFileSync(f.abs, "utf8");
    const parts = Math.ceil(text.length / SHARD_BYTES);
    for (let i = 0; i < parts; i++) {
      const slice = text.slice(i * SHARD_BYTES, (i + 1) * SHARD_BYTES);
      writeFileSync(join(OUT, `part-${f.rel.replaceAll("/", "__")}-${i}.txt`), slice, "utf8");
    }
    manifest.push({ large: f.rel, size: f.size, parts });
    continue;
  }
  const content = readFileSync(f.abs, "utf8");
  const rec = { path: f.rel, content };
  const recBytes = Buffer.byteLength(JSON.stringify(rec));
  if (shard.length && shardBytes + recBytes > SHARD_BYTES) flush();
  shard.push(rec);
  shardBytes += recBytes;
}
flush();
writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), fileCount: files.length, shards: manifest }, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, files: files.length, shards: manifest.length, out: ".grok-export" }));
