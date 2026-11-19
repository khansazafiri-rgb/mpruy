// Independent STATIC asset package for MEDCOEL 4D Lab. This code copies ONLY
// separately licensed anatomy model/data resources, NOT the CC BY-NC-SA
// nqwrc/3d-anatomy application source. This does not grant commercial rights:
// model provenance and 4D Lab authored-code rights still require review.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ATLAS_PUBLIC = fileURLToPath(new URL('../../anatomy/public/', import.meta.url));
const LAB_PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
export const SOURCE_MODELS = Object.freeze(['skeletal', 'muscular', 'joints', 'cardiovascular', 'lymphatic', 'visceral']);
export const PACK_DIR = 'atlas-assets';
export const PACK_FILES = Object.freeze([
  ...SOURCE_MODELS.map(s => 'models/' + s + '.glb'),
  'models/License.txt',
  'data/atlas-catalog.json',
  'draco/draco_decoder.wasm',
  'draco/draco_wasm_wrapper.js',
  'draco/draco_decoder.js',
  'NOTICE.txt',
]);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const packSource = relative => relative === 'NOTICE.txt'
  ? path.join(LAB_PUBLIC, 'data/atlas/NOTICE.txt')
  : path.join(ATLAS_PUBLIC, relative);
const sourceManifest = () => JSON.parse(readFileSync(path.join(LAB_PUBLIC, 'data/atlas/anatomy.json'), 'utf8'));
const validFileSet = new Set(PACK_FILES);

/** Return an allowlisted source file or null; URL input is never used as a filesystem path. */
export function atlasPackDevFile(relative) {
  return typeof relative === 'string' && validFileSet.has(relative) ? packSource(relative) : null;
}

/** Build a dedicated model pack in the Lab's own static root. */
export function buildAtlasPack(outDir) {
  const atlas = sourceManifest(), hashes = atlas.build?.sourceModels || {};
  if (SOURCE_MODELS.some(s => !/^[0-9a-f]{64}$/.test(hashes[s + '.glb'] || '')) ||
      Object.keys(hashes).length !== SOURCE_MODELS.length) {
    throw new Error('Atlas asset pack: CT source-model manifest must enumerate all six cleared GLBs.');
  }
  const packDir = path.join(outDir, PACK_DIR);
  rmSync(packDir, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });
  const files = {};
  for (const relative of PACK_FILES) {
    const source = packSource(relative), destination = path.join(packDir, relative);
    const bytes = readFileSync(source);
    const hash = sha(bytes);
    if (relative.startsWith('models/') && relative.endsWith('.glb')) {
      const name = path.basename(relative);
      if (hash !== hashes[name]) throw new Error('Atlas asset pack: ' + name + ' does not match 4D Lab CT source model. Rebuild atlas dataset from cleared inputs before publishing.');
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    files[relative] = hash;
  }
  writeFileSync(path.join(packDir, 'manifest.json'), JSON.stringify({
    schema: 'medcoel.atlas-asset-pack.v1',
    note: 'Source-code isolation is not commercial-rights clearance. Source model provenance still requires review.',
    sourceModels: hashes, files,
  }, null, 2) + '\n');
  return verifyAtlasPack(packDir, atlas);
}

/** Require exactly the allowlisted files and exact bytes; reject stale assets. */
export function verifyAtlasPack(packDir, atlas = sourceManifest()) {
  const manifest = JSON.parse(readFileSync(path.join(packDir, 'manifest.json'), 'utf8'));
  if (manifest.schema !== 'medcoel.atlas-asset-pack.v1' ||
      Object.keys(manifest.files || {}).length !== PACK_FILES.length ||
      PACK_FILES.some(file => !(file in (manifest.files || {})))) {
    throw new Error('Atlas asset pack: incomplete or unexpected asset manifest.');
  }
  for (const sys of SOURCE_MODELS) {
    const name = sys + '.glb';
    if (manifest.sourceModels?.[name] !== atlas.build?.sourceModels?.[name])
      throw new Error('Atlas asset pack: model hash differs from bundled CT metadata: ' + name);
  }
  const seen = [];
  function walk(dir, relative = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Atlas asset pack: symlinks forbidden: ' + name);
      if (entry.isDirectory()) walk(full, name);
      else if (entry.isFile()) seen.push(name);
      else throw new Error('Atlas asset pack: unsupported entry ' + name);
    }
  }
  walk(packDir);
  if (seen.length !== PACK_FILES.length + 1 || seen.some(file => file !== 'manifest.json' && !validFileSet.has(file))) {
    throw new Error('Atlas asset pack: unexpected file in output.');
  }
  for (const relative of PACK_FILES) {
    const full = path.join(packDir, relative);
    if (!existsSync(full) || !statSync(full).isFile() || sha(readFileSync(full)) !== manifest.files[relative])
      throw new Error('Atlas asset pack: missing or modified file ' + relative);
  }
  return { checked: PACK_FILES.length, models: SOURCE_MODELS.length };
}
