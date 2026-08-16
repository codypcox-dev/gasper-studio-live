#!/usr/bin/env node
/**
 * Project-local Tri-Force CLI shim.
 * Resolution order: the repo's own committed working copy
 * (vendor/triforce-engine) wins, then local install metadata
 * (.triforce/local.json), then legacy lock engineRoot, node_modules, and
 * home fallbacks. A stale pointer can never shadow a healthy working copy.
 *
 * Portable kernel.lock.json must not carry host paths (engineRoot/resolvedPath).
 * Host-local resolution lives only under ignored .triforce/local.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.resolve(__dirname, '..')
const VENDOR_ROOT = path.join(PROJECT, 'vendor', 'triforce-engine')
const VENDOR_BIN = path.join(VENDOR_ROOT, 'bin', 'triforce-engine.mjs')

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function engineBinFromRoot(engineRoot) {
  if (!engineRoot || typeof engineRoot !== 'string') return null
  return path.join(engineRoot, 'bin', 'triforce-engine.mjs')
}

function candidates() {
  const home = process.env.USERPROFILE || process.env.HOME || ''
  const found = []

  // First: the repo's own committed working copy. It cannot vanish when an
  // external checkout moves or a local pointer rots.
  found.push(VENDOR_BIN)

  // Local install metadata (ignored; portable lock carries no engineRoot).
  const local = readJson(path.join(PROJECT, '.triforce', 'local.json'))
  if (local) {
    const fromLocal =
      engineBinFromRoot(local.engineRoot) ||
      engineBinFromRoot(local.installer?.engineRoot) ||
      engineBinFromRoot(local.engines?.['triforce-engine']?.resolvedPath)
    if (fromLocal) found.push(fromLocal)
  }

  // Legacy fallback: older installs stamped engineRoot on the portable lock.
  const lock = readJson(path.join(PROJECT, 'docs', 'triforce', 'kernel.lock.json'))
  if (lock?.installer?.engineRoot) {
    const fromLock = engineBinFromRoot(lock.installer.engineRoot)
    if (fromLock) found.push(fromLock)
  }

  found.push(
    path.join(PROJECT, 'node_modules', '@triforce', 'engine', 'bin', 'triforce-engine.mjs'),
    path.join(home, 'Documents', 'triforce-engine', 'bin', 'triforce-engine.mjs'),
    path.resolve(PROJECT, '..', 'triforce-engine', 'bin', 'triforce-engine.mjs'),
  )

  // The engine repository itself: self-resolve so the canonical shim never
  // depends on where the home checkout happens to live.
  const selfPkg = readJson(path.join(PROJECT, 'package.json'))
  if (selfPkg?.name === '@triforce/engine') {
    found.push(path.join(PROJECT, 'bin', 'triforce-engine.mjs'))
  }

  return found.filter(Boolean)
}

function syncRepairCommand() {
  const local = readJson(path.join(PROJECT, '.triforce', 'local.json'))
  const source = local?.syncedFrom?.engineRoot
  const bin = source && fs.existsSync(path.join(source, 'bin', 'triforce-engine.mjs'))
    ? `${source}/bin/triforce-engine.mjs`
    : '<main-install>/bin/triforce-engine.mjs'
  return `node "${bin}" sync --project "${PROJECT}"`
}

const tried = candidates()
const engineBin = tried.find((p) => fs.existsSync(p))

if (!engineBin) {
  console.error(`Tri-Force Engine CLI not found for this repository.

Candidates tried (in order):
${tried.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}

Repair from the main Tri-Force installation (adopts this repo into the
working-copy model, materializing vendor/triforce-engine):
  ${syncRepairCommand()}

Or install fresh:
  node "<main-install>/bin/triforce-engine.mjs" install --project "${PROJECT}"`)
  process.exit(2)
}

if (engineBin === VENDOR_BIN) {
  // The working copy is committed truth, but its node_modules runtime chain
  // is gitignored per-machine machinery (fresh clones lack it). Fail loud
  // with the exact repair command instead of dying inside the module loader.
  const pkg = readJson(path.join(VENDOR_ROOT, 'package.json'))
  const missing = Object.keys(pkg?.dependencies || {}).filter(
    (dep) => !fs.existsSync(path.join(VENDOR_ROOT, 'node_modules', ...dep.split('/'))),
  )
  if (missing.length > 0) {
    console.error(`Tri-Force working copy found at vendor/triforce-engine, but its runtime
chain is missing (gitignored; re-materialize after a fresh clone):
${missing.map((m) => `  - ${m}`).join('\n')}

Repair from the main Tri-Force installation:
  ${syncRepairCommand()}`)
    process.exit(2)
  }
}

const r = spawnSync(process.execPath, [engineBin, ...process.argv.slice(2)], {
  cwd: PROJECT,
  env: { ...process.env, TF_PROJECT_ROOT: PROJECT },
  stdio: 'inherit',
})
process.exit(r.status ?? 1)
