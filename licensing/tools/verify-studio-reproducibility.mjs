#!/usr/bin/env node
// Reproducibility check for Clinical Studio resources (private, local only).
// 1. Every parent asset (official raw input) in licensing/resources.v1.json is re-hashed from the retained acquisition.
// 2. Every preparation tool is re-run from those inputs; every derived asset must come out byte-identical.
// 3. Each derived asset's tool digest must equal the current tool file (otherwise the registry is stale).
// Writes a machine-readable record to local-data/studio-resources/evidence/reproducibility.json (never committed).
// Exit code 0 only if everything matches. Needs local-data/ (gitignored); prints SKIP and exits 2 without it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const RAW = path.join(REPO, 'local-data/studio-resources/raw'), BP3D = path.join(REPO, 'local-data/licensing-quarantine/bp3d-4.0');
const BUILD = path.join(REPO, 'local-data/studio-resources/build');

/** Maps a parent's logical "source/<sourceId>/<member>" path to the retained local file. */
export function localRawFile(asset) {
  const [, sourceId, ...rest] = asset.path.split('/'), member = asset.sourceFile.member;
  const base = { 'sri24-nitrc': path.join(RAW, 'sri24'), 'ptbxl-physionet': path.join(RAW, 'ptbxl'), 'lidc-idri-tcia': path.join(RAW, 'lidc'),
    'bodyparts3d-dbcls': BP3D }[sourceId];
  if (sourceId === 'spider-zenodo') return path.join(RAW, 'spider', member.startsWith('masks/') ? '1_t2_mask.mha' : '1_t2.mha');
  if (!base || !rest.length) throw Error('Unknown parent path ' + asset.path);
  return path.join(base, member);
}

export async function verify({ run = true } = {}) {
  const resources = JSON.parse(fs.readFileSync(path.join(REPO, 'licensing/resources.v1.json'), 'utf8'));
  const parents = resources.assets.filter(a => a.sourceFile), derived = resources.assets.filter(a => !a.sourceFile);
  const result = { schema: 'medcoel.reproducibility.v1', checkedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim(),
    parents: { total: parents.length, matched: 0, mismatches: [] }, derived: { total: derived.length, matched: 0, mismatches: [] }, staleToolDigests: [], ran: [] };
  for (const a of parents) {
    const f = localRawFile(a);
    if (!fs.existsSync(f)) { result.parents.mismatches.push({ id: a.id, reason: 'missing local file' }); continue; }
    const h = sha(fs.readFileSync(f));
    if (h === a.sha256 && h === a.sourceFile.sha256) result.parents.matched++; else result.parents.mismatches.push({ id: a.id, expected: a.sha256, actual: h });
  }
  const studios = [...new Set(derived.map(a => a.id.split('.')[0]))];
  for (const a of derived) {
    const [tool, digest] = a.derivation.tool.split('@sha256:');
    if (sha(fs.readFileSync(path.join(REPO, tool))) !== digest) result.staleToolDigests.push({ id: a.id, tool });
  }
  if (run) for (const studio of studios) {
    const tool = derived.find(a => a.id.startsWith(studio + '.')).derivation.tool.split('@')[0];
    const args = tool.endsWith('prepare-bp3d-region.mjs') ? [tool, studio] : [tool];
    execFileSync(process.execPath, args, { cwd: REPO, stdio: 'ignore' });
    result.ran.push(args.join(' '));
  }
  for (const a of derived) {
    const studio = a.id.split('.')[0], f = path.join(BUILD, studio, a.path);
    const h = fs.existsSync(f) ? sha(fs.readFileSync(f)) : null;
    if (h === a.sha256) result.derived.matched++; else result.derived.mismatches.push({ id: a.id, expected: a.sha256, actual: h });
  }
  result.ok = !result.parents.mismatches.length && !result.derived.mismatches.length && !result.staleToolDigests.length;
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(RAW)) { console.log('SKIP: local-data/studio-resources/raw is not present on this machine'); process.exit(2); }
  const r = await verify({ run: !process.argv.includes('--no-run') });
  const out = path.join(REPO, 'local-data/studio-resources/evidence/reproducibility.json');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(r, null, 2));
  console.log(JSON.stringify({ ok: r.ok, head: r.head, parents: `${r.parents.matched}/${r.parents.total}`, derived: `${r.derived.matched}/${r.derived.total}`, stale: r.staleToolDigests.length,
    mismatches: [...r.parents.mismatches, ...r.derived.mismatches].slice(0, 5) }, null, 1));
  process.exit(r.ok ? 0 : 1);
}
