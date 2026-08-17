#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCanonOpsRequest } from "../../packages/gasper-studio/src/canonops/CanonOpsProtocol.ts";
import { GrokCanonOpsService } from "../../packages/gasper-studio/src/canonops/GrokCanonOpsService.ts";

const modeArg = (process.argv[2] ?? "investigate").toLowerCase();
const mode = modeArg === "explore" || modeArg === "summarize" || modeArg === "investigate"
  ? modeArg
  : null;
if (!mode) {
  console.error("usage: node --import tsx scripts/canonops/run-phd.mjs <explore|summarize|investigate>");
  process.exit(2);
}

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const service = new GrokCanonOpsService({ root });
const packet = await service.run(buildCanonOpsRequest(mode));
console.log(JSON.stringify({
  ok: true,
  mode: packet.mode,
  residual: packet.residual.id,
  engineVersion: packet.triforce.engineVersion,
  depositPath: packet.triforce.depositPath,
}, null, 2));
