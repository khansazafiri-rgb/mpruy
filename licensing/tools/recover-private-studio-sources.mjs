#!/usr/bin/env node
// MEDCOEL private data recovery: official exact-file source URLs + SHA-256 pins from the committed resource registry.
// Default mode is offline PLAN. Explicit --recover downloads only the curated five verified-source-license subsets.
// Optional BodyParts3D and SRI24 tissue-only candidate datasets require separate flags and stay PRIVATE_REVIEW.
// Never downloads LPBA40, AMOS or legacy NC Atlas sources. Never approves rights, registers releases or deploys.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listZip, getMember } from '../../apps/studios/tools/zip-range.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const LOCAL = path.join(ROOT, 'local-data');
const REG = path.join(ROOT, 'licensing/resources.v1.json');
const RESULTS = path.join(LOCAL, 'studio-resources/clearance/official-data-recovery.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const SHA = /^[a-f0-9]{64}$/;
const DEFAULT = Object.freeze(['ptbxl-physionet', 'spider-zenodo', 'ptx498-zenodo', 'hc18-zenodo', 'lidc-idri-tcia']);
const OPT_IN = Object.freeze(['bodyparts3d-dbcls', 'sri24-nitrc']);
const ZIP_RANGE = new Set(['spider-zenodo', 'ptx498-zenodo', 'hc18-zenodo']);
const PATHS = Object.freeze({
  'ptbxl-physionet': 'studio-resources/raw/ptbxl',
  'spider-zenodo': 'studio-resources/raw/spider',
  'ptx498-zenodo': 'studio-resources/raw/ptx498',
  'hc18-zenodo': 'studio-resources/raw/hc18',
  'lidc-idri-tcia': 'studio-resources/raw/lidc',
  'bodyparts3d-dbcls': 'licensing-quarantine/bp3d-4.0',
  'sri24-nitrc': 'studio-resources/raw/sri24',
});
const URL_PREFIX = Object.freeze({
  'ptbxl-physionet': 'https://physionet.org/files/ptb-xl/1.0.3/',
  'spider-zenodo': 'https://zenodo.org/api/records/10159290/files/',
  'ptx498-zenodo': 'https://zenodo.org/api/records/8266529/files/',
  'hc18-zenodo': 'https://zenodo.org/api/records/1327317/files/',
  'lidc-idri-tcia': 'https://services.cancerimagingarchive.net/nbia-api/services/v1/getImage?SeriesInstanceUID=',
  'bodyparts3d-dbcls': 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/',
  'sri24-nitrc': 'https://www.nitrc.org/frs/download.php/',
});
const MAX_DIRECT = 210 * 1024 * 1024; // BodyParts3D 4.0 ZIP is ~136 MB.
const MAX_ZIP_MEMBER = 96 * 1024 * 1024;
const MAX_DICOM = 64 * 1024 * 1024;
const REQUIRED_LICENSES = new Set(['CC-BY-3.0', 'CC-BY-4.0']);

const isSafeMember = str => typeof str === 'string' && str.length > 0 &&
  !str.startsWith('/') && !str.includes('\\') && !str.includes('\0') &&
  str.split('/').every(p => p && p !== '.' && p !== '..');
const withinLocal = p => path.resolve(p).startsWith(path.resolve(LOCAL) + path.sep);
const safeAbsolute = (root, member) => {
  if (!isSafeMember(member)) throw Error('Unsafe source member path: ' + String(member));
  const dest = path.resolve(root, member);
  if (!withinLocal(dest) || !dest.startsWith(path.resolve(root) + path.sep)) throw Error('Path escapes local-data: ' + member);
  return dest;
};
const getRegistry = () => JSON.parse(fs.readFileSync(REG, 'utf8'));
export function selectedSourceIds(flags = []) {
  const opts = new Set(flags);
  const ids = [...DEFAULT];
  if (opts.has('--include-bodyparts')) ids.push('bodyparts3d-dbcls');
  if (opts.has('--include-sri24-tissue')) ids.push('sri24-nitrc');
  return ids;
}
export function localSourcePath(sourceId, sourceFile, root = LOCAL) {
  const dir = safeAbsolute(root, PATHS[sourceId]);
  const member = sourceFile.member;
  if (sourceId === 'spider-zenodo') {
    if (member === 'images/1_t2.mha') return safeAbsolute(dir, '1_t2.mha');
    if (member === 'masks/1_t2.mha') return safeAbsolute(dir, '1_t2_mask.mha');
    throw Error('Unexpected SPIDER source member: ' + member);
  }
  return safeAbsolute(dir, member);
}
export function sourceEntries({ registry = getRegistry(), sourceId }) {
  const source = registry.sources.find(s => s.id === sourceId);
  if (!source || !PATHS[sourceId]) throw Error('Unknown source: ' + sourceId);
  if (DEFAULT.includes(sourceId)) {
    if (source.status !== 'VERIFIED_SOURCE' || !REQUIRED_LICENSES.has(source.licenseId))
      throw Error('Default source licensing changed; refuse acquisition: ' + sourceId);
  } else if (source.status !== 'REVIEW_REQUIRED' || !OPT_IN.includes(sourceId))
    throw Error('Optional source is not within the private-review allowlist: ' + sourceId);
  let entries = registry.assets.filter(a => a.sourceRef === sourceId && a.sourceFile);
  // LONI did not grant LPBA40 rights; never recover SRI24's LPBA40 label archive.
  if (sourceId === 'sri24-nitrc') entries = entries.filter(a => a.sourceFile.member !== 'sri24_labels_nifti.zip');
  if (!entries.length) throw Error('No pinned official source assets for ' + sourceId);
  return entries.map(asset => {
    const meta = asset.sourceFile;
    if (!SHA.test(asset.sha256) || meta.sha256 !== asset.sha256 ||
        !isSafeMember(meta.member) || !meta.url.startsWith(URL_PREFIX[sourceId]) ||
        asset.path !== 'source/' + sourceId + '/' + meta.member)
      throw Error('Unpinned source asset or unexpected official URL: ' + asset.id);
    const u = new URL(meta.url);
    if (u.protocol !== 'https:') throw Error('Official source URL must be HTTPS');
    return { id: asset.id, sourceId, member: meta.member, url: meta.url, sha256: asset.sha256,
      destination: localSourcePath(sourceId, meta) };
  });
}
export function recoveryPlan({ registry = getRegistry(), flags = [], root = LOCAL }) {
  const ids = selectedSourceIds(flags);
  const sources = ids.map(id => {
    const items = sourceEntries({ registry, sourceId: id });
    const assets = items.map(item => {
      const rel = path.relative(LOCAL, item.destination);
      const destination = path.resolve(root, rel);
      const exists = fs.existsSync(destination), digest = exists ? sha(fs.readFileSync(destination)) : null;
      return { id: item.id, member: item.member, sha256: item.sha256, local: rel,
        status: !exists ? 'missing' : digest === item.sha256 ? 'verified-local' : 'wrong-hash-existing-file' };
    });
    return { id, assets, requiredFiles: assets.length, verifiedLocal: assets.filter(a => a.status === 'verified-local').length,
      downloadRequired: assets.filter(a => a.status === 'missing').length };
  });
  return { schema: 'medcoel.private-recovery-plan.v1', mode: 'offline', releaseApproved: false,
    userAccess: false, note: 'Source verification and private preprocessing are NOT asset clearance or permission to publish.',
    sources };
}
const sleep = t => new Promise(resolve => setTimeout(resolve, t));
async function boundedGet(url, max = MAX_DIRECT) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'MEDCOEL-private-source-verification/1.0' }, redirect: 'follow',
        signal: AbortSignal.timeout(180000) });
      if (!r.ok || !r.body) {
        if (r.status === 429 || r.status >= 500) throw Error('HTTP transient ' + r.status);
        throw Error('Official resource HTTP ' + r.status + ' (' + url + ')');
      }
      if (new URL(r.url).protocol !== 'https:') throw Error('Insecure redirect from official source');
      const declared = Number(r.headers.get('content-length') || 0);
      if (declared > max) throw Error('Official source exceeds safety byte cap: ' + url);
      const chunks = [], reader = r.body.getReader(); let received = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > max) throw Error('Official resource exceeded size cap: ' + url);
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel().catch(() => {}); }
      return Buffer.concat(chunks, received);
    } catch (e) {
      error = e;
      if (attempt !== 2 && /(?:HTTP transient|fetch failed|timeout|aborted|network)/i.test(String(e))) {
        await sleep(1000 * (attempt + 1)); continue;
      }
      break;
    }
  }
  throw error;
}
function storeVerified(dest, bytes, expected) {
  if (sha(bytes) !== expected) throw Error('SHA-256 mismatch against committed official source metadata: ' + path.basename(dest));
  if (fs.existsSync(dest)) {
    if (sha(fs.readFileSync(dest)) !== expected) throw Error('Existing file has wrong SHA-256; refusing overwrite: ' + dest);
    return 'already-verified';
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  const tmp = dest + '.private-partial-' + process.pid;
  try {
    fs.writeFileSync(tmp, bytes, { mode: 0o600, flag: 'wx' });
    fs.renameSync(tmp, dest);
  } catch (e) { fs.rmSync(tmp, { force: true }); throw e; }
  return 'downloaded-and-verified';
}
export function assertPrivateDefaults(registry = getRegistry()) {
  const list = DEFAULT.flatMap(id => sourceEntries({ registry, sourceId: id }));
  if (list.some(item => /lpba40|amos22|nervous\.glb|licenses?\/?nc/i.test(item.member + item.url)))
    throw Error('Restricted source entered default recovery set');
  if (sourceEntries({ registry, sourceId: 'sri24-nitrc' }).some(item => /labels|lpba40/i.test(item.member)))
    throw Error('Restricted LONI label archive entered optional MRI source list');
  return list.length;
}
async function recoverGroup(sourceId, items) {
  const records = [];
  if (ZIP_RANGE.has(sourceId)) {
    const byUrl = new Map();
    for (const a of items) { if (!byUrl.has(a.url)) byUrl.set(a.url, []); byUrl.get(a.url).push(a); }
    for (const [url, batch] of byUrl) {
      if (batch.every(x => fs.existsSync(x.destination) && sha(fs.readFileSync(x.destination)) === x.sha256)) {
        records.push(...batch.map(a => ({ member: a.member, result: 'already-verified' }))); continue;
      }
      const directory = new Map((await listZip(url)).map(e => [e.name, e]));
      for (const a of batch) {
        const e = directory.get(a.member);
        if (!e || e.uncompressed > MAX_ZIP_MEMBER || ![0, 8].includes(e.method))
          throw Error('Missing/oversized/unsupported official ZIP member: ' + a.member);
        const bytes = await getMember(url, e); // ZIP CRC+uncompressed size checked by existing ZIP64 utility.
        records.push({ member: a.member, result: storeVerified(a.destination, bytes, a.sha256) });
      }
    }
  } else {
    for (const a of items) {
      if (fs.existsSync(a.destination)) {
        if (sha(fs.readFileSync(a.destination)) !== a.sha256) throw Error('Wrong hash existing: ' + a.destination);
        records.push({ member: a.member, result: 'already-verified' }); continue;
      }
      const bytes = await boundedGet(a.url);
      records.push({ member: a.member, result: storeVerified(a.destination, bytes, a.sha256) });
    }
  }
  return records;
}
async function verifyPtbxlSumFile(items) {
  const root = path.join(LOCAL, PATHS['ptbxl-physionet']);
  const file = path.join(root, 'SHA256SUMS.txt');
  // Official directory manifest, checked against every separately pinned exact file.
  if (!fs.existsSync(file)) {
    const bytes = await boundedGet(URL_PREFIX['ptbxl-physionet'] + 'SHA256SUMS.txt', 16 * 1024 * 1024);
    if (!/^[a-f0-9]{64}\s/m.test(bytes.toString('utf8'))) throw Error('Official PTB-XL SHA256SUMS format unexpected');
    fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/), sums = new Map();
  for (const line of lines) {
    const m = line.match(/^([a-f0-9]{64})\s+\*?(\S+)/);
    if (m) sums.set(m[2], m[1]);
  }
  for (const entry of items) if (sums.get(entry.member) !== entry.sha256)
    throw Error('PTB-XL official SHA256SUMS differs from pinned file: ' + entry.member);
  return { status: 'official-sums-matched', count: items.length };
}
function safeLidcDcmEntries(zip, mode) {
  const raw = execFileSync('unzip', ['-Z', '-1', zip], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  const names = raw.split(/\r?\n/).filter(s => s.toLowerCase().endsWith('.dcm'));
  if ((mode === 'CT' && names.length < 20) || (mode === 'SEG' && names.length !== 1))
    throw Error('Unexpected TCIA DICOM count in ' + path.basename(zip) + ': ' + names.length);
  const used = new Set();
  const safe = names.map(name => {
    if (!isSafeMember(name)) throw Error('Unsafe TCIA ZIP entry: ' + name);
    const basename = path.posix.basename(name);
    if (!/^[a-z0-9._-]+\.dcm$/i.test(basename)) throw Error('Unsafe DICOM filename: ' + name);
    const final = mode === 'SEG' ? '00000001.dcm' : basename;
    if (used.has(final)) throw Error('Duplicate flattened DICOM filename: ' + final);
    used.add(final); return { name, final };
  });
  return safe;
}
export function extractTciaSeries(zip, dest, mode) {
  if (!withinLocal(dest) || !['CT', 'SEG'].includes(mode)) throw Error('Private DICOM output path invalid');
  const names = safeLidcDcmEntries(zip, mode);
  if (fs.existsSync(dest)) {
    for (const { name, final } of names) {
      const bytes = execFileSync('unzip', ['-p', zip, name], { maxBuffer: MAX_DICOM });
      const file = path.join(dest, final);
      if (!fs.existsSync(file) || sha(fs.readFileSync(file)) !== sha(bytes))
        throw Error('Existing extracted TCIA series inconsistent; refusing overwrite: ' + dest);
    }
    return names.length;
  }
  const staging = dest + '.private-partial-' + process.pid;
  fs.mkdirSync(staging, { recursive: true, mode: 0o700 });
  try {
    for (const { name, final } of names) {
      const bytes = execFileSync('unzip', ['-p', zip, name], { maxBuffer: MAX_DICOM });
      fs.writeFileSync(path.join(staging, final), bytes, { flag: 'wx', mode: 0o600 });
    }
    fs.renameSync(staging, dest);
  } catch (e) { fs.rmSync(staging, { recursive: true, force: true }); throw e; }
  return names.length;
}
function extractLidcGroups(entries) {
  const recovered = [];
  for (const item of entries) {
    const mode = item.member.split('/')[0], uid = path.basename(item.member, '.zip');
    if (!['CT', 'SEG'].includes(mode) || !/^[0-9.]+$/.test(uid)) throw Error('Unexpected TCIA series UID/path');
    const target = path.join(LOCAL, PATHS['lidc-idri-tcia'], mode, uid);
    recovered.push({ mode, uid, slices: extractTciaSeries(item.destination, target, mode) });
  }
  return recovered;
}
const PREPARE = Object.freeze({
  'ptbxl-physionet': [['apps/studios/tools/prepare-ecg.mjs']],
  'spider-zenodo': [['apps/studios/tools/prepare-spine-mri.mjs']],
  'ptx498-zenodo': [['apps/studios/tools/prepare-image2d.mjs', 'chest-xray']],
  'hc18-zenodo': [['apps/studios/tools/prepare-image2d.mjs', 'pelvis-ultrasound']],
  'lidc-idri-tcia': [['apps/studios/tools/prepare-chest-ct.mjs']],
  'bodyparts3d-dbcls': [
    ...['brain-anatomy', 'head-neck-anatomy', 'spine-anatomy', 'thorax-anatomy', 'heart-anatomy',
      'abdomen-anatomy', 'pelvis-anatomy', 'upper-limb-anatomy', 'lower-limb-anatomy']
      .map(id => ['apps/studios/tools/prepare-bp3d-region.mjs', id]),
  ],
  'sri24-nitrc': [['apps/studios/tools/prepare-brain-mri-tissue-only.mjs']],
});
function buildLocation(sourceId, args) {
  if (sourceId === 'sri24-nitrc') return path.join(LOCAL, 'studio-resources/build/brain-mri-sri24-tissue-only');
  if (sourceId === 'bodyparts3d-dbcls') return path.join(LOCAL, 'studio-resources/build/brain-anatomy');
  if (sourceId === 'ptbxl-physionet') return path.join(LOCAL, 'studio-resources/build/ecg');
  if (sourceId === 'spider-zenodo') return path.join(LOCAL, 'studio-resources/build/spine-mri');
  if (sourceId === 'ptx498-zenodo') return path.join(LOCAL, 'studio-resources/build/chest-xray');
  if (sourceId === 'hc18-zenodo') return path.join(LOCAL, 'studio-resources/build/pelvis-ultrasound');
  if (sourceId === 'lidc-idri-tcia') return path.join(LOCAL, 'studio-resources/build/chest-ct');
  return null;
}
function prepareGroup(sourceId) {
  const expected = buildLocation(sourceId);
  if (sourceId !== 'bodyparts3d-dbcls' && expected && fs.existsSync(path.join(expected, 'provenance.json')))
    return { result: 'existing-private-build-not-overwritten' };
  const command = PREPARE[sourceId];
  if (!command) throw Error('No private preparer: ' + sourceId);
  let completed = 0;
  for (const [script, ...args] of command) {
    const full = path.join(ROOT, script);
    const studioId = args[0] || null;
    const destination = studioId && sourceId === 'bodyparts3d-dbcls'
      ? path.join(LOCAL, 'studio-resources/build', studioId) : null;
    if (destination && fs.existsSync(path.join(destination, 'provenance.json'))) {
      completed++; continue;
    }
    const response = execFileSync(process.execPath, [full, ...args],
      { cwd: ROOT, encoding: 'utf8', timeout: 480000, maxBuffer: 2 * 1024 * 1024 });
    process.stdout.write(response.slice(0, 500) + '\n');
    completed++;
  }
  return { result: 'private-build-prepared-not-cleared', preparersCompleted: completed };
}
function privateReport(data) {
  const dest = RESULTS;
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  fs.writeFileSync(dest, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  return path.relative(ROOT, dest);
}
export async function recoverPrivate({ flags = [], registry = getRegistry() } = {}) {
  assertPrivateDefaults(registry);
  const ids = selectedSourceIds(flags), outcomes = [];
  for (const sourceId of ids) {
    const items = sourceEntries({ registry, sourceId });
    console.log('\nSOURCE: ' + sourceId + ' (' + items.length + ' hash-pinned files)');
    const result = { sourceId, files: items.length, status: 'incomplete', releaseApproved: false };
    try {
      result.fileResults = await recoverGroup(sourceId, items);
      if (sourceId === 'ptbxl-physionet') result.officialManifest = await verifyPtbxlSumFile(items);
      if (sourceId === 'lidc-idri-tcia') result.extracted = extractLidcGroups(items);
      result.status = 'exact-sources-verified';
      if (!flags.includes('--fetch-only')) {
        result.preparation = prepareGroup(sourceId);
        result.status = 'prepared-for-private-review-only';
      }
    } catch (e) {
      result.status = 'recovery-or-preparation-failed';
      result.error = String(e.message || e).slice(0, 550);
      console.error('Source failed, proceeding to other sources: ' + result.error);
    }
    outcomes.push(result);
  }
  const status = {
    schema: 'medcoel.official-data-recovery.v1', generatedAt: new Date().toISOString(),
    releaseApproved: false, studentAccess: false, rightsAndHumanReviews: 'pending',
    scope: ids, excluded: ['sri24_labels_nifti.zip / LONI LPBA40', 'AMOS', 'legacy NC Atlas code/assets'],
    outcomes,
    note: 'Private processing does not confer copyright, privacy, clinical, terminology or release clearance.',
  };
  if (!flags.includes('--fetch-only')) {
    try {
      const text = execFileSync(process.execPath,
        [path.join(ROOT, 'licensing/tools/clinical-clearance-batch.mjs'), '--report', '--packages'],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 480000 });
      status.reviewPacketRun = { result: 'completed-not-approved', output: text.slice(0, 1500) };
    } catch (e) {
      status.reviewPacketRun = { result: 'failed', message: String(e.message).slice(0, 350) };
    }
  }
  const where = privateReport(status);
  console.log('\nPrivate report: ' + where);
  console.log('Recovered/prepared sources: ' + outcomes.filter(x => x.status.startsWith('exact') || x.status.startsWith('prepared')).length + '/' + ids.length);
  if (outcomes.some(x => x.status === 'recovery-or-preparation-failed') || status.reviewPacketRun?.result === 'failed')
    process.exitCode = 1;
  return status;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const flags = process.argv.slice(2);
  const supported = new Set(['--plan', '--recover', '--fetch-only', '--include-bodyparts', '--include-sri24-tissue']);
  if (flags.some(f => !supported.has(f)) || (flags.includes('--plan') && flags.includes('--recover')) ||
      (flags.includes('--fetch-only') && !flags.includes('--recover'))) {
    console.error('Usage: node licensing/tools/recover-private-studio-sources.mjs [--plan | --recover [--fetch-only]] [--include-bodyparts] [--include-sri24-tissue]');
    process.exitCode = 2;
  } else {
    const registry = getRegistry();
    const plan = recoveryPlan({ registry, flags });
    for (const group of plan.sources) console.log(group.id + ': ' + group.verifiedLocal + '/' + group.requiredFiles +
      ' source files verified locally; ' + group.downloadRequired + ' missing');
    if (!flags.includes('--recover')) {
      console.log('OFFLINE PLAN ONLY. No download, no public release. To fetch/preprocess five official verified-source subsets, use --recover.');
    } else {
      console.log('PRIVATE RECOVERY ONLY. All rights, medical and privacy release gates remain closed.');
      await recoverPrivate({ flags, registry });
    }
  }
}
