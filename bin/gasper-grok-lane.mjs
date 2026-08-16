import { runGrokGasperLaneCli } from "../packages/gasper-studio/src/training/server/GrokGasperLane.ts";

const code = await runGrokGasperLaneCli(process.argv.slice(2));
process.exit(code);