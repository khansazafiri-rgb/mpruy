// Stage a reviewed Anatomy Live 4D Lab build as an atomic release symlink (outside apps/web/dist).
// Never reloads Caddy or any service. Usage:
//   LAB4D_RELEASE_ID=2026-11-07a node scripts/stage-4d-lab.mjs        (stage apps/4d-lab/dist)
//   node scripts/stage-4d-lab.mjs --rollback                           (switch back to the previous release)
import { cp, mkdir, readFile, writeFile, rename, symlink, lstat, readlink, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const repo = fileURLToPath(new URL('../', import.meta.url));
const BASE = '/anatomy/4d-lab/';
const DATA = ['ct.nrrd', 'labels.nrrd', 'anatomy.json', 'registration.json', 'skin.glb', 'organs.glb'];

export async function validateLab(root) {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="(\/anatomy\/4d-lab\/assets\/[^"#]+)"/g)].map((m) => m[1].slice(BASE.length));
  if (!assets.some((a) => a.endsWith('.js'))) throw Error('Build apps/4d-lab with base /anatomy/4d-lab/ first');
  for (const a of assets) { if (a.split('/').includes('..')) throw Error('Invalid asset path'); await readFile(path.join(root, a)); }
  for (const f of DATA) await readFile(path.join(root, 'data/phantom', f));
  const anatomy = JSON.parse(await readFile(path.join(root, 'data/phantom/anatomy.json'), 'utf8'));
  if (anatomy.schema !== 'medcoel.anatomy.v1') throw Error('Unknown anatomy manifest');
  const reg = JSON.parse(await readFile(path.join(root, 'data/phantom/registration.json'), 'utf8'));
  for (const m of reg.meshes) {
    const sha = createHash('sha256').update(await readFile(path.join(root, 'data/phantom', m.file))).digest('hex');
    if (sha !== m.sha256) throw Error('Mesh hash mismatch: ' + m.file);
  }
  return { assets: assets.length, indexSha256: createHash('sha256').update(html).digest('hex') };
}

async function current(dest) {
  try { const s = await lstat(dest); if (!s.isSymbolicLink()) throw Error('Destination is a real directory; migrate it to a release symlink first.'); return path.resolve(path.dirname(dest), await readlink(dest)); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
async function activate(dest, target) { const tmp = dest + '.next-' + randomUUID(); await symlink(target, tmp, 'dir'); try { await rename(tmp, dest); } catch (e) { await rm(tmp, { force: true }); throw e; } }

export async function stageLab({ source = path.join(repo, 'apps/4d-lab/dist'), dest = process.env.LAB4D_DIR || '/var/lib/medcoel/4d-lab', releaseId = process.env.LAB4D_RELEASE_ID || new Date().toISOString().replace(/[^0-9]/g, ''), rollback = false } = {}) {
  dest = path.resolve(dest);
  const webDist = path.join(repo, 'apps/web/dist');
  if (dest === webDist || dest.startsWith(webDist + path.sep)) throw Error('Destination must be outside the main web dist');
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(releaseId)) throw Error('Invalid release ID');
  const releases = dest + '-releases', record = path.join(releases, 'deployment.json');
  await mkdir(releases, { recursive: true });
  const previous = await current(dest);
  if (rollback) {
    const r = JSON.parse(await readFile(record, 'utf8'));
    if (previous !== r.currentTarget || !r.previousTarget) throw Error('No matching previous release to roll back to');
    await validateLab(r.previousTarget); await activate(dest, r.previousTarget);
    const out = { currentTarget: r.previousTarget, previousTarget: previous, rolledBackAt: new Date().toISOString() };
    await writeFile(record, JSON.stringify(out, null, 2)); return out;
  }
  source = await realpath(source);
  const validation = await validateLab(source);
  const release = path.join(releases, releaseId);
  try { await lstat(release); throw Error('Release ID already exists; choose a new one'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await cp(source, release, { recursive: true });
  try {
    await validateLab(release);
    const out = { dest, currentTarget: release, previousTarget: previous, createdAt: new Date().toISOString(), ...validation };
    await writeFile(record, JSON.stringify(out, null, 2));
    await activate(dest, release);
    return out;
  } catch (e) { await rm(release, { recursive: true, force: true }); throw e; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  stageLab({ rollback: process.argv.includes('--rollback') }).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
