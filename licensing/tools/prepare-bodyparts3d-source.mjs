// MEDCOEL: independently source official BodyParts3D 4.0 geometry and IDs.
// This is a candidate crosswalk, NOT model-origin proof and NOT commercial
// release approval. Outputs stay in gitignored local-data for inspection.
// Usage: node licensing/tools/prepare-bodyparts3d-source.mjs
//   --names /download/isa_parts_list_e.txt
//   [--archive /download/isa_BP3D_4.0_obj_99.zip]
//   [--out local-data/licensing-quarantine/bp3d-4.0-review.json]
// Never writes to shipped Atlas GLBs, CT/USG, release gates, or licensing ledger.
import { createReadStream, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const BP3D_OFFICIAL = Object.freeze({
  release: '4.0',
  license: 'CC-BY-4.0',
  licenseAsOf: '2025-02-27',
  licensePage: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
  downloadPage: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
  namesUrl: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt',
  archiveUrl: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip',
  attribution: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
});
const validSystems = new Set(['skeletal', 'muscular', 'joints', 'cardiovascular', 'lymphatic', 'visceral']);
export function normalizeAnatomyName(name) {
  let input = String(name || '').normalize('NFKD').replace(/[‐‑–—]/g, '-');
  const side = input.match(/\.([lr])$/i);
  if (side) input = (side[1].toLowerCase() === 'l' ? 'left ' : 'right ') + input.slice(0, -2);
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
export function parseOfficialNames(tsv) {
  if (typeof tsv !== 'string') throw new Error('Official BodyParts3D names table must be UTF-8 text.');
  const lines = tsv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.shift()?.trim() !== 'concept id\trepresentation id\ten')
    throw new Error('Unexpected official table header. Refuse to guess schema.');
  const out = [], seen = new Set();
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    const cells = line.split('\t');
    if (cells.length !== 3 || !/^FMA\d+$/.test(cells[0]) ||
      !/^BP\d+$/.test(cells[1]) || !cells[2].trim()) {
      throw new Error('Unexpected BodyParts3D table row ' + (i + 2));
    }
    const key = cells[0] + ':' + cells[1] + ':' + cells[2];
    if (seen.has(key)) throw new Error('Duplicate official identity row: ' + key);
    seen.add(key);
    out.push({ fmaId: cells[0], bpId: cells[1], name: cells[2].trim() });
  }
  if (!out.length) throw new Error('Empty official BodyParts3D name table.');
  return out;
}
export function checkArchiveEntryNames(names) {
  if (!Array.isArray(names) || !names.length) throw new Error('Empty BodyParts3D archive listing.');
  const seen = new Set(), obj = [];
  for (const name of names) {
    if (typeof name !== 'string' || !name || name.includes('\0') ||
      name.startsWith('/') || name.includes('\\') ||
      name.split('/').some(p => p === '..' || p === '.') || seen.has(name)) {
      throw new Error('Unsafe or repeated ZIP entry: ' + String(name));
    }
    seen.add(name);
    if (/\.obj$/i.test(name)) obj.push(name);
  }
  if (!obj.length) throw new Error('BodyParts3D source archive contains no OBJ geometry.');
  return { entries: names.length, objMeshes: obj.length };
}
/** A name match suggests a possible replacement; it cannot prove old mesh identity. */
export function candidateCrosswalk(catalog, rows) {
  if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object')
    throw new Error('Expected a structure catalog.');
  const byName = new Map();
  for (const item of rows) {
    const n = normalizeAnatomyName(item.name);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(item);
  }
  const candidates = [];
  for (const [name, value] of Object.entries(catalog)) {
    if (!validSystems.has(value?.source)) continue;
    const matching = byName.get(normalizeAnatomyName(name)) || [];
    const matches = matching.map(v => ({ fmaId: v.fmaId, bpId: v.bpId, officialName: v.name }));
    candidates.push({
      atlasName: name, atlasSystem: value.source,
      matchMethod: 'name-only-unverified',
      state: matches.length === 1 ? 'candidate' : matches.length > 1 ? 'ambiguous' : 'unmatched',
      matches,
      geometryIdentityVerified: false, redistributionApproved: false,
    });
  }
  const summary = { reviewedNames: candidates.length,
    candidates: candidates.filter(v => v.state === 'candidate').length,
    ambiguous: candidates.filter(v => v.state === 'ambiguous').length,
    unmatched: candidates.filter(v => v.state === 'unmatched').length,
    geometryVerified: 0 };
  return { summary, candidates };
}
async function sha256File(file) {
  const h = createHash('sha256');
  for await (const piece of createReadStream(file)) h.update(piece);
  return h.digest('hex');
}
function parseArgs(argv) {
  const vals = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!['--names', '--archive', '--out'].includes(key) || !argv[i + 1] ||
      argv[i + 1].startsWith('--') || vals[key]) throw new Error('Invalid argument ' + key);
    vals[key] = argv[i + 1];
  }
  if (!vals['--names']) throw new Error('Required: --names official BodyParts3D isa_parts_list_e.txt');
  return vals;
}
export async function makeLocalSourceReview(args) {
  const namesPath = path.resolve(args['--names']);
  if (path.basename(namesPath) !== 'isa_parts_list_e.txt')
    throw new Error('Expected the official ISA names table filename.');
  const sourceNames = readFileSync(namesPath);
  const officialNames = parseOfficialNames(sourceNames.toString('utf8'));
  const catalog = JSON.parse(readFileSync(path.join(ROOT, 'apps/anatomy/public/data/atlas-catalog.json'), 'utf8'));
  const crosswalk = candidateCrosswalk(catalog, officialNames);
  let archive = null;
  if (args['--archive']) {
    const input = path.resolve(args['--archive']);
    if (path.basename(input) !== 'isa_BP3D_4.0_obj_99.zip')
      throw new Error('Expected the official ISA 4.0 OBJ archive filename.');
    const bytes = statSync(input).size;
    if (bytes < 1000) throw new Error('Suspiciously small BodyParts3D source archive.');
    const names = execFileSync('unzip', ['-Z', '-1', input],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
      .trim().split(/\r?\n/);
    archive = { name: path.basename(input), url: BP3D_OFFICIAL.archiveUrl, bytes,
      sha256: await sha256File(input), ...checkArchiveEntryNames(names) };
  }
  const report = {
    schemaVersion: 1,
    kind: 'official-bp3d-replacement-candidate-review',
    warning: 'Name matching alone is NOT proof that current MEDCOEL GLBs originate from the official dataset, nor an approval to publish or regenerate CT. Do not change release gates.',
    source: BP3D_OFFICIAL,
    namesTable: { name: 'isa_parts_list_e.txt', url: BP3D_OFFICIAL.namesUrl,
      bytes: sourceNames.length, sha256: createHash('sha256').update(sourceNames).digest('hex'),
      rows: officialNames.length },
    archive, ...crosswalk,
  };
  if (args['--out']) {
    const file = path.resolve(ROOT, args['--out']);
    const root = path.resolve(ROOT, 'local-data') + path.sep;
    if (!file.startsWith(root) || !file.endsWith('.json'))
      throw new Error('Reports may only be written under gitignored local-data/*.json.');
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await makeLocalSourceReview(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify({
      note: result.warning, archive: result.archive,
      table: result.namesTable,
      comparison: result.summary,
      report: 'Full mapping can be written under local-data using --out',
    }, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
