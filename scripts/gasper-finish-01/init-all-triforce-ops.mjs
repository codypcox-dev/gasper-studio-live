import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve('.');
const constituentsDir = resolve('C:/Users/funny/Documents/triforce-engine/constituents');

const engines = [
  'planops-engine',
  'thinkops-engine',
  'designops-engine',
  'codeops-engine',
  'renderops-engine',
  'vfxops-engine',
  'audioops-engine',
  'videoops-engine',
  'netops-engine',
  'modelops-engine',
  'gameops-engine',
  'alignops-engine',
];

const results = [];

for (const name of engines) {
  const binName = name.replace('-engine', '.mjs');
  const binPath = resolve(constituentsDir, name, 'bin', binName);
  if (existsSync(binPath)) {
    const res = spawnSync(process.execPath, [binPath, 'init'], {
      cwd: projectRoot,
      encoding: 'utf-8',
    });
    results.push({ name, status: res.status === 0 ? 'initialized' : 'failed', output: res.stdout.trim() || res.stderr.trim() });
  } else {
    results.push({ name, status: 'no_bin', binPath });
  }
}

console.log(JSON.stringify(results, null, 2));
