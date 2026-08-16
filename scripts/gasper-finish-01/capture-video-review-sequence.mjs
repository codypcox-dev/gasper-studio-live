import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const outDir = resolve("research/proofs/gasper-finish-01/visual/sequence");
mkdirSync(outDir, { recursive: true });

const states = [
  { id: "neutral", label: "Neutral", file: "frame-01-neutral.png" },
  { id: "listening", label: "Listening", file: "frame-02-listening.png" },
  { id: "thinking", label: "Thinking", file: "frame-03-thinking.png" },
  { id: "executing", label: "Executing", file: "frame-04-executing.png" },
  { id: "pleased", label: "Pleased", file: "frame-05-pleased.png" },
  { id: "dormant", label: "Dormant", file: "frame-06-dormant.png" },
];

function sendWb(command) {
  const tmpFile = resolve(process.env.TEMP || "C:/Users/funny/AppData/Local/Temp", `wb-seq-${Date.now()}.json`);
  writeFileSync(tmpFile, JSON.stringify(command, null, 2), "utf-8");
  const res = execSync(`curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@${tmpFile}"`, { encoding: "utf-8" });
  return JSON.parse(res);
}

console.log("Starting visual review state sequence capture on Port 5175...");

for (const s of states) {
  console.log(`Triggering state: ${s.label}...`);
  sendWb({
    action: "evaluate",
    args: {
      code: `const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '${s.label}'); if(btn) btn.click();`,
    },
    session: "gasper-visual-review",
  });

  // Wait 600ms for 3-beat sequence transition
  execSync("powershell -Command Start-Sleep -Milliseconds 600");

  const savePath = join(outDir, s.file);
  console.log(`Capturing screenshot: ${s.file}...`);
  sendWb({
    action: "screenshot",
    args: {
      format: "png",
      path: savePath,
    },
    session: "gasper-visual-review",
  });
}

console.log(JSON.stringify({ ok: true, outDir, count: states.length }));
