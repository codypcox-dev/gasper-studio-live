#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, ".grok-export", "visual");
mkdirSync(OUT, { recursive: true });

const files = {
  svg: "packages/desktop/src/gasper/assets/gasper-rig-v655.svg",
  worldclass: "packages/desktop/src/studio/worldclass/theme/worldclass.css",
  tokens: "packages/desktop/src/studio/worldclass/theme/tokens.css",
  daisFirst: "packages/gasper-studio/src/dais-first/daisFirst.css",
  daisCss: "packages/desktop/src/gasper/gasper-dais.css",
  wisp: "packages/gasper-studio/public/__sol_review/profile-atlas-pass1/wispwalker.png",
  wispDefault: "packages/gasper-studio/public/__sol_review/current-user-wispwalker-default.png",
  wispFinal: "packages/gasper-studio/public/__sol_review/wispwalker-user-final-settings.png",
  presence: "packages/gasper-studio/public/__sol_review/profile-atlas-pass1/presence.png",
  script0: "packages/desktop/src/gasper/assets/all-script-0.js",
  script1: "packages/desktop/src/gasper/assets/all-script-1.js",
  script2: "packages/desktop/src/gasper/assets/all-script-2.js",
  material: "packages/desktop/src/gasper/assets/vector-material.js",
};

const report = [];
for (const [key, rel] of Object.entries(files)) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    report.push({ key, rel, missing: true });
    continue;
  }
  const buf = readFileSync(abs);
  if (rel.endsWith(".png")) {
    const b64 = buf.toString("base64");
    const chunk = 36000;
    const parts = Math.ceil(b64.length / chunk);
    for (let i = 0; i < parts; i++) {
      writeFileSync(join(OUT, `${key}-${i}.b64`), b64.slice(i * chunk, (i + 1) * chunk), "utf8");
    }
    report.push({ key, rel, kind: "png", bytes: buf.length, parts, b64: b64.length });
  } else {
    writeFileSync(join(OUT, `${key}${rel.slice(rel.lastIndexOf("."))}`), buf);
    report.push({ key, rel, kind: "text", bytes: buf.length });
  }
}
writeFileSync(join(OUT, "report.json"), JSON.stringify({ ok: true, report }, null, 2));
console.log(JSON.stringify({ ok: true, out: ".grok-export/visual", files: report.length, report }));
