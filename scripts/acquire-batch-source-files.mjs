#!/usr/bin/env node
/**
 * Conservative local raw-file acquisition for publishers that return an
 * exact file index with publisher MD5, after all-source metadata staging.
 *
 * This is NOT dataset integration, extraction, deidentification, redistribution
 * or release clearance. No file without an official digest is downloaded.
 * All file writes remain in gitignored local-data/.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateCandidateManifest, assessPublisherRecord } from './batch-alternative-resources.mjs';
import { openVerifiedPublisherStream } from './verified-publisher-download.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BASE = path.join(ROOT, 'local-data/studio-resources/alternative-candidates');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const safeName = v => typeof v === 'string' && /^[A-Za-z0-9_. -]{1,180}$/.test(v) &&
  v !== '.' && v !== '..' && !v.startsWith('.') && !v.includes('..');
const MB = 1024 * 1024;

function safePrivatePath(filename) {
  const relative = path.relative(ROOT, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('ACQUIRE_OUTSIDE_LOCAL_DATA');
  let loc = ROOT;
  for (const seg of relative.split(path.sep).filter(Boolean)) {
    loc = path.join(loc, seg);
    if (fs.lstatSync(loc, { throwIfNoEntry: false })?.isSymbolicLink())
      throw Error('ACQUIRE_UNSAFE_SYMLINK');
  }
  if (!filename.startsWith(BASE + path.sep)) throw Error('ACQUIRE_OUTSIDE_PRIVATE_CANDIDATES');
}
function read(pathname) { safePrivatePath(pathname); return fs.readFileSync(pathname); }
function privateWrite(file, bytes) {
  safePrivatePath(file);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  safePrivatePath(file);
  fs.writeFileSync(file, bytes, { mode: 0o600 });
}

export function officialDownloadUrl(source, f) {
  if (!safeName(f.name) || !/^[a-f0-9]{32}$/i.test(f.publisherMd5 || '') ||
      !Number.isSafeInteger(f.bytes) || f.bytes <= 0) throw Error('ACQUIRE_UNPINNED_OR_UNSAFE_FILE');
  if (source.provider === 'figshare') {
    if (!Number.isSafeInteger(f.sourceFileId)) throw Error('ACQUIRE_UNTRUSTED_FIGSHARE_FILE_ID');
    return 'https://ndownloader.figshare.com/files/' + f.sourceFileId;
  }
  if (source.provider === 'zenodo') {
    const expected = source.officialMd5ByFilename?.[f.name];
    if (!expected || expected.toLowerCase() !== f.publisherMd5.toLowerCase())
      throw Error('ACQUIRE_UNPINNED_ZENODO_ARCHIVE');
    return 'https://zenodo.org/records/' + source.recordId + '/files/' +
      encodeURIComponent(f.name) + '?download=1';
  }
  throw Error('ACQUIRE_NO_PUBLISHER_FILE_INDEX');
}

/** Build one safe, predictable batch. This does not contact any website. */
export function createExactFileAcquisitionPlan({ manifest, catalog, evidenceBySource,
  maxFileMiB = 512, maxTotalMiB = 4096 }) {
  const sources = validateCandidateManifest(manifest, catalog);
  if (!Number.isSafeInteger(maxFileMiB) || maxFileMiB < 1 || maxFileMiB > 8192 ||
      !Number.isSafeInteger(maxTotalMiB) || maxTotalMiB < 1 || maxTotalMiB > 32768)
    throw Error('ACQUIRE_INVALID_SIZE_LIMITS');
  const files = [], excluded = [];
  let planned = 0;
  for (const source of sources) {
    const record = evidenceBySource[source.id];
    if (source.provider !== 'figshare' && source.provider !== 'zenodo') {
      excluded.push({ source: source.id, reason: 'PUBLISHER_FILE_MANIFEST_NOT_YET_PINNED' });
      continue;
    }
    if (!record || record.status !== 'SOURCE_CANDIDATE_STAGED' ||
        !record.snapshot || record.sha256 !== sha(record.snapshot)) {
      excluded.push({ source: source.id, reason: 'OFFICIAL_PUBLISHER_METADATA_MISSING_OR_CHANGED' });
      continue;
    }
    let assessed;
    try { assessed = assessPublisherRecord(source, record.snapshot); }
    catch (err) {
      excluded.push({ source: source.id, reason: err.message });
      continue;
    }
    for (const f of assessed.filenamePins) {
      let downloadUrl;
      try { downloadUrl = officialDownloadUrl(source, f); }
      catch (err) {
        excluded.push({ source: source.id, filename: f.name, reason: err.message }); continue;
      }
      if (f.bytes > maxFileMiB * MB || planned + f.bytes > maxTotalMiB * MB) {
        excluded.push({ source: source.id, filename: f.name, reason: 'SIZE_CAP_REACHED',
          expectedBytes: f.bytes }); continue;
      }
      files.push({ source: source.id, filename: f.name,
        expectedBytes: f.bytes, publisherMd5: f.publisherMd5.toLowerCase(), downloadUrl,
        ...(source.provider === 'figshare' ? { sourceFileId: f.sourceFileId } : {}) });
      planned += f.bytes;
    }
  }
  return { files, excluded, totalBytes: planned, maxTotalMiB, maxFileMiB,
    medicalReview: 'pending', privacyReview: 'pending', releaseEligible: false };
}

async function streamAndVerify(entry, { fetcher = fetch } = {}) {
  const url = new URL(entry.downloadUrl);
  if (url.protocol !== 'https:' || !['ndownloader.figshare.com', 'zenodo.org'].includes(url.hostname))
    throw Error('ACQUIRE_URL_NOT_ALLOWLISTED');
  const out = path.join(BASE, entry.source, 'downloads', entry.filename);
  safePrivatePath(out);
  fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
  safePrivatePath(out);
  const availableDisk = fs.statfsSync(path.dirname(out));
  const freeBytes = Number(availableDisk.bavail) * Number(availableDisk.bsize);
  if (!fs.existsSync(out) && freeBytes < entry.expectedBytes + 256 * MB)
    throw Error('ACQUIRE_NOT_ENOUGH_FREE_DISK_SPACE');
  if (fs.existsSync(out)) {
    const info = fs.lstatSync(out);
    if (!info.isFile() || info.size !== entry.expectedBytes)
      throw Error('ACQUIRE_EXISTING_FILE_MISMATCH_QUARANTINED');
    const md5 = crypto.createHash('md5'), digest = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(out)) {
      md5.update(chunk); digest.update(chunk);
    }
    if (md5.digest('hex') !== entry.publisherMd5)
      throw Error('ACQUIRE_EXISTING_FILE_MISMATCH_QUARANTINED');
    return { status: 'ALREADY_VERIFIED_PRIVATE', sha256: digest.digest('hex') };
  }
  const { response } = await openVerifiedPublisherStream(entry, { fetcher });
  const temp = out + '.partial-' + process.pid;
  safePrivatePath(temp);
  const fd = fs.openSync(temp, 'wx', 0o600);
  const md5 = crypto.createHash('md5'), digest = crypto.createHash('sha256');
  const reader = response.body?.getReader();
  if (!reader) { fs.closeSync(fd); fs.rmSync(temp, { force: true }); throw Error('ACQUIRE_EMPTY_DOWNLOAD'); }
  let written = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      written += chunk.value.byteLength;
      if (written > entry.expectedBytes) throw Error('ACQUIRE_OVERSIZED_DOWNLOAD');
      md5.update(chunk.value); digest.update(chunk.value);
      fs.writeSync(fd, chunk.value);
    }
    fs.fsyncSync(fd);
    if (written !== entry.expectedBytes || md5.digest('hex') !== entry.publisherMd5)
      throw Error('ACQUIRE_CHECKSUM_OR_LENGTH_MISMATCH');
  } catch (error) {
    fs.closeSync(fd); fs.rmSync(temp, { force: true }); throw error;
  } finally { reader.releaseLock(); }
  fs.closeSync(fd);
  fs.renameSync(temp, out);
  return { status: 'DOWNLOADED_PRIVATE_ONLY', sha256: digest.digest('hex') };
}

export async function acquireEligibleFiles({ manifest, catalog, evidenceBySource,
  maxFileMiB = 512, maxTotalMiB = 4096, fetcher = fetch, write = true }) {
  const plan = createExactFileAcquisitionPlan({ manifest, catalog, evidenceBySource, maxFileMiB, maxTotalMiB });
  if (!write) return { plan, results: [], downloads: 0 };
  const results = [];
  for (const f of plan.files) {
    try {
      const value = await streamAndVerify(f, { fetcher });
      results.push({ source: f.source, filename: f.filename, ...value });
    } catch (e) {
      results.push({ source: f.source, filename: f.filename, status: 'REJECTED_OR_QUARANTINED', error: e.message });
    }
  }
  const report = { schema: 'medcoel.private-source-acquisition.v1',
    generatedAt: new Date().toISOString(), releaseApproved: false,
    medicalReview: 'pending', privacyReview: 'pending',
    downloads: results.filter(x => x.status === 'DOWNLOADED_PRIVATE_ONLY').length,
    skipped: plan.excluded, results };
  privateWrite(path.join(BASE, 'acquisition-report.json'), JSON.stringify(report, null, 2) + '\n');
  return { plan, results, downloads: report.downloads };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 2 || !args.every(a => /^--max-(file|total)-mib=\d+$/.test(a)))
    throw Error('usage: node scripts/acquire-batch-source-files.mjs [--max-file-mib=N] [--max-total-mib=N]');
  const arg = (name, fallback) => {
    const r = args.find(a => a.startsWith('--max-' + name + '-mib='));
    return r ? Number(r.split('=')[1]) : fallback;
  };
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/candidates/alternative-sources-batch.v1.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/studios/catalog.v1.json'), 'utf8'));
  const evidenceBySource = {};
  // Never reuse a previously staged source if its latest publisher check failed
  // or the metadata snapshot is older than one day.
  const current = JSON.parse(read(path.join(BASE, 'batch-report.json')));
  const age = Date.now() - Date.parse(current.generatedAt);
  if (!Number.isFinite(age) || age < 0 || age > 86400000 ||
      current.publicReleaseAuthorized !== false)
    throw Error('ACQUIRE_REFRESH_PUBLISHER_METADATA_FIRST');
  const byId = new Map(current.outcomes.map(x => [x.id, x]));
  for (const s of manifest.sources) {
    try {
      const currentRow = byId.get(s.id);
      if (currentRow?.status !== 'SOURCE_CANDIDATE_STAGED') continue;
      const dir = path.join(BASE, s.id);
      const rec = JSON.parse(read(path.join(dir, 'source-evidence.json')));
      const snapshot = read(path.join(dir, 'source-metadata.snapshot'));
      if (rec.metadataSha256 !== currentRow.metadataSha256 ||
          rec.status !== currentRow.status ||
          sha(snapshot) !== rec.metadataSha256) continue;
      evidenceBySource[s.id] = { status: rec.status, sha256: rec.metadataSha256, snapshot };
    } catch { /* Unstaged or blocked source is skipped, never downloaded. */ }
  }
  const result = await acquireEligibleFiles({ manifest, catalog, evidenceBySource,
    maxFileMiB: arg('file', 512), maxTotalMiB: arg('total', 4096) });
  console.table(result.results.map(x => ({ source: x.source, file: x.filename, status: x.status })));
  console.log('Skipped or pending-manifest files:', result.plan.excluded.length);
  console.log('Private only: local-data/studio-resources/alternative-candidates/acquisition-report.json');
  console.log('No source unpacking, UI integration, clinical clearance or public deployment.');
  if (result.results.some(x => x.status === 'REJECTED_OR_QUARANTINED')) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
