#!/usr/bin/env node
// Writes resource-manifest.json and studio-manifest.json into an independently built studio dist/.
// Usage: node scripts/build-studio-manifest.mjs --dist <dir> --studio <id> --release <id>
//          [--resources <resources.v1.json>] [--capabilities a,b]
// This only describes bytes. It approves nothing: clearance is the B1 inspector + a signed receipt on the server.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const C = require('../packages/studio-contract/clearance.cjs');
const REPO = fileURLToPath(new URL('../', import.meta.url));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

export function buildStudioManifest({ dist, studioId, releaseId, resourcesFile, capabilities = [], builtFrom, challengeRestricted = [] }) {
  if (!C.STUDIO_ID.test(studioId) || !C.RELEASE_ID.test(releaseId)) throw Error('Invalid studio or release id');
  const resources = JSON.parse(fs.readFileSync(resourcesFile || path.join(REPO, 'licensing/resources.v1.json'), 'utf8'));
  for (const reserved of ['studio-manifest.json', 'resource-manifest.json']) fs.rmSync(path.join(dist, reserved), { force: true });
  const resourceBytes = Buffer.from(JSON.stringify(resources));
  fs.writeFileSync(path.join(dist, 'resource-manifest.json'), resourceBytes);
  const files = [];
  (function walk(dir, prefix) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = prefix + e.name, abs = path.join(dir, e.name);
      if (e.isSymbolicLink()) throw Error('Symlink refused: ' + rel);
      if (e.isDirectory()) walk(abs, rel + '/');
      else if (e.isFile() && rel !== 'studio-manifest.json') {
        if (!C.safeAssetPath(rel) || !C.contentTypeFor(rel)) throw Error('Unsafe or undeliverable file in build: ' + rel);
        const b = fs.readFileSync(abs); files.push({ path: rel, bytes: b.length, sha256: sha(b) });
      }
    }
  })(dist, '');
  const byPath = new Map(files.map(f => [f.path, f]));
  const assetRefs = resources.assets.filter(a => byPath.get(a.path)?.sha256 === a.sha256).map(a => ({ assetId: a.id, version: a.version, sha256: a.sha256 }));
  let commit = builtFrom;
  if (!commit) { try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim(); } catch { commit = ''; } }
  if (!/^[a-f0-9]{40}$/.test(commit)) throw Error('Exact git source commit required');
  const manifest = { schema: 'medcoel.studio.v1', id: studioId, releaseId, entry: 'index.html', builtFrom: commit, files, assetRefs,
    resourceManifestSha256: sha(resourceBytes), capabilities: [...new Set(capabilities)].sort(),
    // Files that reveal answers (e.g. label volumes, structure names) are withheld by the server during Challenge sessions.
    challengeRestricted: [...new Set(challengeRestricted)].filter(p => byPath.has(p)).sort() };
  const problem = C.validateInventory(manifest, { studioId, releaseId });
  if (problem) throw Error('Generated manifest invalid: ' + problem);
  fs.writeFileSync(path.join(dist, 'studio-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  const m = buildStudioManifest({ dist: o.dist, studioId: o.studio, releaseId: o.release, resourcesFile: o.resources, capabilities: (o.capabilities || '').split(',').filter(Boolean), challengeRestricted: (o['challenge-restricted'] || '').split(',').filter(Boolean) });
  console.log('Studio manifest written (describes bytes only, approves nothing):', m.id, m.releaseId, m.files.length, 'files');
}
