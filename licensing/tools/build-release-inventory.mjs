// Exact-byte technical inventory for a local candidate; never confers rights approval.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { releaseDigest } from './check-commercial-release.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const evidence = JSON.parse(fs.readFileSync(path.join(repo, 'licensing/commercial-rights-evidence.json'), 'utf8'));
const mapped = Object.fromEntries(evidence.records.map(record => [record.id, record]));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function rightsFor(product, rel) {
  if (product === '4d-lab') {
    if (/^atlas-assets\/models\/(skeletal|muscular|joints|cardiovascular|lymphatic|visceral)\.glb$/.test(rel))
      return ['model-' + path.basename(rel, '.glb')];
    if (/^data\/atlas\//.test(rel)) return ['atlas-synthetic-ct'];
    if (/^atlas-assets\/data\//.test(rel)) return ['atlas-other-data'];
    if (/^atlas-assets\/draco\//.test(rel)) return ['software-dependencies'];
    if (/^atlas-assets\//.test(rel)) return ['software-dependencies', 'atlas-synthetic-ct'];
    if (/^data\/phantom\//.test(rel)) return ['lab-application-code'];
    if (/^assets\//.test(rel) || /^atlas-preview\//.test(rel) || rel === 'index.html') return ['lab-application-code', 'software-dependencies'];
  }
  if (product === 'atlas-viewer') {
    if (/^models\/(skeletal|muscular|joints|cardiovascular|lymphatic|visceral)\.glb$/.test(rel))
      return ['model-' + path.basename(rel, '.glb')];
    if (/^thumbnails\//.test(rel)) return ['atlas-previews'];
    if (rel === 'data/definitions.json') return ['atlas-definitions'];
    if (/^data\//.test(rel)) return ['atlas-other-data'];
    if (/^draco\//.test(rel)) return ['software-dependencies'];
    if (/^assets\//.test(rel) || rel === 'index.html') return ['atlas-code', 'software-dependencies'];
  }
  return [];
}

export function buildInventory(product, root) {
  if (!['4d-lab', 'atlas-viewer'].includes(product)) throw Error('Unknown inventory product');
  const records = [];
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const rel = path.posix.join(prefix, entry.name), absolute = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw Error('Symlink is not an immutable asset: ' + rel);
      if (entry.isDirectory()) walk(absolute, rel);
      else if (entry.isFile() && rel !== '.release-source.json') {
        const bytes = fs.readFileSync(absolute), recordIds = rightsFor(product, rel);
        records.push({ path: rel, sha256: sha(bytes), bytes: bytes.length,
          evidenceRecords: recordIds,
          rightsStatus: recordIds.length && recordIds.every(id => mapped[id]?.status === 'verified') ? 'requires-human-review' : 'unresolved',
        });
      } else if (!entry.isFile()) throw Error('Unexpected build entry: ' + rel);
    }
  }
  walk(root);
  const lock = JSON.parse(fs.readFileSync(path.join(repo, 'apps', product === '4d-lab' ? '4d-lab' : 'anatomy', 'package-lock.json'), 'utf8'));
  const packages = Object.entries(lock.packages || {}).filter(([location]) => location.startsWith('node_modules/'))
    .map(([location, data]) => ({ location, name: data.name || location.replace(/^node_modules\//, ''), version: data.version,
      licenseFromLockfile: data.license || null, integrity: data.integrity || null, dev: !!data.dev,
      rightsStatus: 'metadata-only-review-required' }));
  return { schemaVersion: 1, product, purpose: 'Local technical inventory; not a rights approval',
    buildDigest: releaseDigest(root), lockfileSha256: sha(fs.readFileSync(path.join(repo, 'apps', product === '4d-lab' ? '4d-lab' : 'anatomy', 'package-lock.json'))),
    files: records, packages, commercialRelease: 'blocked-pending-evidence',
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [product, root, output] = process.argv.slice(2);
  if (!product || !root) { console.error('usage: build-release-inventory.mjs <4d-lab|atlas-viewer> <build-dir> [output.json]'); process.exitCode = 2; }
  else {
    try {
      const inventory = buildInventory(product, root), serialized = JSON.stringify(inventory, null, 2) + '\n';
      if (output) fs.writeFileSync(output, serialized); else process.stdout.write(serialized);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
