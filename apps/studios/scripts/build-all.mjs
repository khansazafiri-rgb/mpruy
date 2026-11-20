#!/usr/bin/env node
// Builds every Clinical Studio as its OWN Vite application (separate entry, bundle, dist and manifest).
//   node scripts/build-all.mjs [--only id,id] [--private]
// Default data = technical fixtures (CI). --private copies prepared data from local-data/ (never committed); such a
// build is for private review only and still cannot launch without a signed clearance receipt.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { buildStudioManifest } from '../../../scripts/build-studio-manifest.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REPO = path.resolve(ROOT, '../..');
const args = process.argv.slice(2);
const only = (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean);
const usePrivate = args.includes('--private');
let commit = '0'.repeat(40);
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim(); } catch { /* no git */ }

export async function buildStudio(id, { privateData = false } = {}) {
  const dir = path.join(ROOT, id), config = JSON.parse(fs.readFileSync(path.join(dir, 'studio.config.json'), 'utf8'));
  const dist = path.join(dir, 'dist');
  await build({ root: dir, base: './', logLevel: 'warn', configFile: false, build: { outDir: dist, emptyOutDir: true, chunkSizeWarningLimit: 4000 } });
  const src = config.privateData && path.join(REPO, config.privateData);
  let dataKind = 'technical-fixture';
  if (privateData && src && fs.existsSync(path.join(src, 'data'))) {
    for (const sub of ['data', 'server']) if (fs.existsSync(path.join(src, sub))) fs.cpSync(path.join(src, sub), path.join(dist, sub), { recursive: true });
    dataKind = 'private-review';
  } else if (config.fixtureTool) {
    const tool = await import(pathToFileURL(path.join(ROOT, config.fixtureTool)).href);
    const fn = Object.values(tool).find(v => typeof v === 'function');
    await fn(dist, { studioId: id, title: config.title || id });
  }
  const releaseId = (dataKind === 'private-review' ? 'review-' : 'fixture-') + commit.slice(0, 12);
  const m = buildStudioManifest({ dist, studioId: id, releaseId, capabilities: config.capabilities, challengeRestricted: config.challengeRestricted || [], builtFrom: commit });
  return { id, releaseId, dataKind, files: m.files.length, bytes: m.files.reduce((n, f) => n + f.bytes, 0) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ids = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'studio.config.json'))).filter(d => !only.length || only.includes(d)).sort();
  const results = [];
  for (const id of ids) results.push(await buildStudio(id, { privateData: usePrivate }));
  console.table(results);
}
