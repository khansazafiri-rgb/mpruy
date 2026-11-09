// Stage a reviewed Anatomy Live 4D Lab build as an atomic release symlink (outside apps/web/dist).
// Never reloads Caddy or any service. Usage:
//   LAB4D_RELEASE_ID=2026-11-07a node scripts/stage-4d-lab.mjs        (stage apps/4d-lab/dist)
//   node scripts/stage-4d-lab.mjs --rollback                           (switch back to the previous release)
import { cp, mkdir, readFile, writeFile, rename, symlink, lstat, readlink, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { assertDistributionClean } from '../licensing/tools/check-distribution.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const BASE = '/anatomy/4d-lab/';
const DATA = ['ct.nrrd', 'labels.nrrd', 'anatomy.json', 'registration.json', 'skin.glb', 'organs.glb'];

export async function validateLab(root) {
  assertDistributionClean([root], '4D Lab release'); // licence quarantine: fail closed
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="(\/anatomy\/4d-lab\/assets\/[^"#]+)"/g)].map((m) => m[1].slice(BASE.length));
  if (!assets.some((a) => a.endsWith('.js'))) throw Error('Build apps/4d-lab with base /anatomy/4d-lab/ first');
  for (const a of assets) { if (a.split('/').includes('..')) throw Error('Invalid asset path'); await readFile(path.join(root, a)); }
  for (const f of DATA) await readFile(path.join(root, 'data/phantom', f));
  // bundled datasets: the procedural phantom (always) and the atlas-derived dataset (default view, when built)
  const sets = ['phantom'];
  try { await readFile(path.join(root, 'data/atlas/registration.json')); sets.push('atlas'); } catch { /* optional in older builds */ }
  for (const set of sets) {
    const anatomy = JSON.parse(await readFile(path.join(root, 'data', set, 'anatomy.json'), 'utf8'));
    if (anatomy.schema !== 'medcoel.anatomy.v1') throw Error('Unknown anatomy manifest');
    for (const f of ['ct.nrrd', 'labels.nrrd', ...(set === 'atlas' ? ['NOTICE.txt'] : [])]) await readFile(path.join(root, 'data', set, f)); // atlas derivative ships its licence/adaptation notice
    const reg = JSON.parse(await readFile(path.join(root, 'data', set, 'registration.json'), 'utf8'));
    for (const m of reg.meshes) {
      const sha = createHash('sha256').update(await readFile(path.join(root, 'data', set, m.file))).digest('hex');
      if (sha !== m.sha256) throw Error('Mesh hash mismatch: ' + set + '/' + m.file);
    }
  }
  return { assets: assets.length, datasets: sets, indexSha256: createHash('sha256').update(html).digest('hex') };
}

/**
 * The lab's atlas-derived dataset was generated from specific Anatomy Atlas GLBs (sha256 in
 * data/atlas/anatomy.json -> build.sourceModels). The atlas deployment serving /anatomy/viewer/ must
 * serve exactly those files, otherwise 3D anatomy and imaging would no longer correspond.
 */
export async function checkAtlasModels(labRoot, atlasRoot) {
  let anatomy;
  try { anatomy = JSON.parse(await readFile(path.join(labRoot, 'data/atlas/anatomy.json'), 'utf8')); } catch { return { checked: 0, note: 'no atlas dataset in this build' }; }
  const expected = anatomy.build?.sourceModels || {}, mismatched = [];
  for (const [file, hash] of Object.entries(expected)) {
    let got = null; try { got = createHash('sha256').update(await readFile(path.join(atlasRoot, 'models', file))).digest('hex'); } catch { /* missing */ }
    if (got !== hash) mismatched.push(file);
  }
  if (mismatched.length) throw Error(`Atlas models at ${atlasRoot} differ from the ones the lab dataset was built from (${mismatched.join(', ')}): rebuild with npm run atlas:dataset --prefix apps/4d-lab`);
  return { checked: Object.keys(expected).length, atlasRoot };
}

async function current(dest) {
  try { const s = await lstat(dest); if (!s.isSymbolicLink()) throw Error('Destination is a real directory; migrate it to a release symlink first.'); return path.resolve(path.dirname(dest), await readlink(dest)); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
async function activate(dest, target) { const tmp = dest + '.next-' + randomUUID(); await symlink(target, tmp, 'dir'); try { await rename(tmp, dest); } catch (e) { await rm(tmp, { force: true }); throw e; } }

export async function stageLab({ source = path.join(repo, 'apps/4d-lab/dist'), dest = process.env.LAB4D_DIR || '/var/lib/medcoel/4d-lab', releaseId = process.env.LAB4D_RELEASE_ID || new Date().toISOString().replace(/[^0-9]/g, ''), rollback = false, atlasRoot = null } = {}) {
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
  // compare with the live atlas deployment when it is reachable from here (set ANATOMY_VIEWER_DIR to force)
  const atlasDir = atlasRoot || process.env.ANATOMY_VIEWER_DIR || '/var/lib/medcoel/anatomy-viewer';
  let atlasExists = false; try { atlasExists = (await lstat(atlasDir)) && true; } catch { /* not on this host */ }
  validation.atlasModels = atlasExists || process.env.ANATOMY_VIEWER_DIR ? await checkAtlasModels(source, atlasDir) : { checked: 0, note: `atlas directory ${atlasDir} not found on this host: check it on the server before activation` };
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
