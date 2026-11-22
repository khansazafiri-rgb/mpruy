#!/usr/bin/env node
/**
 * All-source batch licensing preflight, no release or rights approval.
 * --plan: entirely offline, no writes.
 * --stage-all: query official publisher metadata for EVERY permissive candidate,
 *   store SHA256 snapshots and file indices in gitignored local-data.
 *
 * No raw medical file downloads, decompression, application routing, review
 * approval or deployment in this command. It is safe to rerun as one batch.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MANIFEST = path.join(ROOT, 'licensing/candidates/alternative-sources-batch.v1.json');
const TARGET = path.join(ROOT, 'local-data/studio-resources/alternative-candidates');
const ALLOWED = new Set(['CC-BY-4.0', 'CC0-1.0']);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const HOSTS = new Set([
  'humanatlas.io', 'hubmapconsortium.github.io', 'zenodo.org',
  'api.figshare.com', 'figshare.com', 'data.mendeley.com'
]);
const LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const ascii = s => typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);

function assertLocal(p) {
  const rel = path.relative(ROOT, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw Error('BATCH_OUTSIDE_REPOSITORY');
  let next = ROOT;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    next = path.join(next, part);
    const type = fs.lstatSync(next, { throwIfNoEntry: false });
    if (type?.isSymbolicLink()) throw Error('BATCH_SYMLINK_REFUSED');
  }
}
function save(file, bytes) {
  assertLocal(file);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  assertLocal(file);
  fs.writeFileSync(file, bytes, { mode: 0o600 });
}
function urlCheck(s, expectedHost) {
  const u = new URL(s);
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname) ||
      (expectedHost && u.hostname !== expectedHost) || u.username || u.password ||
      u.port || u.hash) throw Error('BATCH_UNTRUSTED_OFFICIAL_URL');
  return u;
}

export function validateCandidateManifest(m, catalog) {
  if (!m || m.schema !== 'medcoel.alternative-source-batch.v1' ||
      m.policy?.publicReleaseAuthorized !== false ||
      m.policy?.sourceMetadataIsNotRedistributionApproval !== true ||
      !Array.isArray(m.sources) || m.sources.length < 1 ||
      !Array.isArray(m.excludedSources) || m.excludedSources.length < 5) {
    throw Error('BATCH_INVALID_OR_RELEASE_AUTHORIZING_POLICY');
  }
  const studioIds = new Set(catalog.studios.filter(s => !s.internal).map(s => s.id));
  if (studioIds.size !== 24) throw Error('BATCH_STUDIO_CATALOG_MISMATCH');
  const seen = new Set();
  const excluded = new Set(m.excludedSources.map(s => s.id));
  for (const banned of ['bodyparts3d-dbcls', 'lpba40-loni', 'amos-zenodo', 'legacy-nc-atlas-code'])
    if (!excluded.has(banned)) throw Error('BATCH_MISSING_LEGACY_EXCLUSION:' + banned);
  for (const s of m.sources) {
    if (!ascii(s.id) || seen.has(s.id) || excluded.has(s.id) || !ALLOWED.has(s.declaredLicence) ||
        s.clinicalReview !== 'pending' || s.rightsReview !== 'pending' ||
        !Array.isArray(s.studioIds) || s.studioIds.length < 1 ||
        s.studioIds.some(id => !studioIds.has(id))) {
      throw Error('BATCH_UNAPPROVED_SOURCE:' + s?.id);
    }
    seen.add(s.id);
    const url = urlCheck(s.officialUrl), evidenceUrl = urlCheck(s.evidenceUrl);
    const expected = {
      hra: ['humanatlas.io', 'hubmapconsortium.github.io'],
      zenodo: ['zenodo.org', 'zenodo.org'],
      figshare: ['figshare.com', 'api.figshare.com'],
      mendeley: ['data.mendeley.com', 'data.mendeley.com']
    }[s.provider];
    if (!expected || url.hostname !== expected[0] || evidenceUrl.hostname !== expected[1])
      throw Error('BATCH_OFFICIAL_SOURCE_PROVIDER_MISMATCH:' + s.id);
    if (s.provider === 'zenodo' && (!Number.isSafeInteger(s.recordId) ||
        evidenceUrl.pathname !== '/api/records/' + s.recordId)) throw Error('BATCH_BAD_ZENODO_RECORD');
    if (s.provider === 'figshare' && (!Number.isSafeInteger(s.articleId) ||
        evidenceUrl.pathname !== '/v2/articles/' + s.articleId)) throw Error('BATCH_BAD_FIGSHARE_ARTICLE');
  }
  return m.sources;
}

async function boundedFetch(url, fetcher = fetch) {
  const original = urlCheck(url);
  const response = await fetcher(original.href, {
    redirect: 'follow',
    headers: { 'Accept': 'text/html, application/json', 'User-Agent': 'MEDCOEL-safe-source-candidate-audit/1.0' },
    signal: AbortSignal.timeout(30000)
  });
  const final = urlCheck(response.url || original.href, original.hostname);
  if (!response.ok || final.hostname !== original.hostname) throw Error('BATCH_PUBLISHER_HTTP_' + response.status);
  if (Number(response.headers.get('content-length') || 0) > 2500000) throw Error('BATCH_PUBLISHER_METADATA_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) throw Error('BATCH_PUBLISHER_EMPTY_REPLY');
  const chunks = [], cap = 2500000;
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > cap) throw Error('BATCH_PUBLISHER_METADATA_TOO_LARGE');
      chunks.push(Buffer.from(part.value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
const matchCCBY = value => {
  const v = String(value || '').toLowerCase();
  return /cc[\s_-]*by[\s_-]*4\.0/.test(v) ||
    v.includes('creativecommons.org/licenses/by/4.0');
};

export function assessPublisherRecord(source, bytes) {
  const body = bytes.toString('utf8');
  let filenamePins = [];
  let publisherLicence = null;
  if (source.provider === 'figshare') {
    const d = JSON.parse(body);
    const lic = d.license || {};
    publisherLicence = [lic.name, lic.value, lic.url].filter(Boolean).join(' ');
    if (d.id !== source.articleId || d.version !== source.expectedVersion)
      throw Error('BATCH_FIGSHARE_RECORD_VERSION_MISMATCH');
    filenamePins = (d.files || []).map(f => ({
      name: f.name, bytes: f.size, publisherMd5: f.computed_md5 || null,
      sourceFileId: f.id, url: f.download_url
    }));
    if (!filenamePins.length || filenamePins.some(x =>
      typeof x.name !== 'string' || !Number.isSafeInteger(x.bytes) ||
      !/^[a-f0-9]{32}$/i.test(x.publisherMd5 || '') ||
      !Number.isSafeInteger(x.sourceFileId))) {
      throw Error('BATCH_FIGSHARE_MISSING_FILE_INDEX');
    }
  } else if (source.provider === 'zenodo') {
    const d = JSON.parse(body);
    const rights = d.metadata?.rights || [];
    publisherLicence = [
      d.metadata?.license?.id, d.metadata?.license?.title,
      ...rights.map(x => [x.id, x.title, x.description].filter(Boolean).join(' '))
    ].filter(Boolean).join(' ');
    if (d.id !== source.recordId) throw Error('BATCH_ZENODO_RECORD_MISMATCH');
    filenamePins = (d.files || []).map(f => ({
      name: f.key, bytes: f.size, publisherMd5: (f.checksum || '').replace(/^md5:/i, ''),
      url: f.links?.self || null
    }));
    const expected = source.officialMd5ByFilename || {};
    for (const [name, digest] of Object.entries(expected)) {
      const file = filenamePins.find(f => f.name === name);
      if (!file || file.publisherMd5.toLowerCase() !== digest.toLowerCase()) {
        throw Error('BATCH_ZENODO_FILE_PIN_CHANGED:' + name);
      }
    }
  } else if (source.provider === 'mendeley') {
    // Publisher SSR page is used as a licence snapshot; it has no trusted
    // file-by-file checksums. Raw files must be independently indexed later.
    const normalized = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    publisherLicence = /CC BY 4\.0\s*Learn more/i.test(normalized) ? 'CC BY 4.0' : null;
  } else if (source.provider === 'hra') {
    publisherLicence = (/All CCF 3D reference objects are released under Attribution 4\.0 International/i.test(body) ||
      /CC BY 4\.0/i.test(body)) ? 'CC BY 4.0' : null;
  }
  if (!matchCCBY(publisherLicence) || source.declaredLicence !== 'CC-BY-4.0')
    throw Error('BATCH_PUBLISHER_LICENCE_NOT_CONFIRMED:' + source.id);
  return { publisherLicence, filenamePins, legalStatus: 'PUBLISHER_METADATA_COMPATIBLE_ONLY',
    fileRightsVerified: false, privacyVerified: false, clinicalVerified: false,
    releaseEligible: false };
}

export async function stageAllSourceCandidates({ manifest, catalog, fetcher = fetch, write = true }) {
  const sources = validateCandidateManifest(manifest, catalog);
  const outcomes = [];
  for (const s of sources) {
    try {
      const bytes = await boundedFetch(s.evidenceUrl, fetcher);
      const inspected = assessPublisherRecord(s, bytes);
      const row = { id: s.id, status: 'SOURCE_CANDIDATE_STAGED', publisher: s.provider,
        metadataSha256: sha(bytes), metadataSize: bytes.length,
        ...inspected, sourceUrl: s.officialUrl, licenceClaim: s.declaredLicence,
        totalSourceFiles: inspected.filenamePins.length, studioIds: s.studioIds };
      if (write) {
        const dir = path.join(TARGET, s.id);
        save(path.join(dir, 'source-metadata.snapshot'), bytes);
        save(path.join(dir, 'source-evidence.json'), JSON.stringify(row, null, 2) + '\n');
      }
      outcomes.push({ ...row, filenamePins: undefined });
    } catch (error) {
      outcomes.push({ id: s.id, status: 'SOURCE_METADATA_BLOCKED', error: error.message,
        licenceClaim: s.declaredLicence, releaseEligible: false, studioIds: s.studioIds });
    }
  }
  const report = { schema: 'medcoel.alternative-source-batch-report.v1',
    generatedAt: new Date().toISOString(),
    mode: 'official-metadata-only', publicReleaseAuthorized: false,
    excludedCount: manifest.excludedSources.length,
    datasetBytesDownloaded: 0,
    note: 'Publisher metadata is not exact-file rights, privacy or clinical approval. No medical images downloaded. No existing asset or release status changed.',
    outcomes };
  if (write) save(path.join(TARGET, 'batch-report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

const main = async () => {
  const flags = process.argv.slice(2);
  if (flags.length !== 1 || !['--plan', '--stage-all'].includes(flags[0])) {
    throw Error('usage: node scripts/batch-alternative-resources.mjs --plan|--stage-all');
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/studios/catalog.v1.json'), 'utf8'));
  const sources = validateCandidateManifest(manifest, catalog);
  if (flags[0] === '--plan') {
    console.table(sources.map(s => ({
      source: s.id, license: s.declaredLicence, provider: s.provider,
      targets: s.studioIds.length, acquire: s.acquisition,
      status: 'PUBLISHER_METADATA_AND_FILE_RIGHTS_PENDING'
    })));
    console.log('Excluded unresolved/restricted sources:', manifest.excludedSources.map(s => s.id).join(', '));
    console.log('No download; no publication; no clearance.');
  } else {
    const report = await stageAllSourceCandidates({ manifest, catalog });
    console.table(report.outcomes.map(s => ({
      source: s.id, status: s.status, fileIndex: s.totalSourceFiles || 0,
      clinical: 'pending', privacy: 'pending'
    })));
    console.log('Private report: local-data/studio-resources/alternative-candidates/batch-report.json');
    console.log('No clinical images or models downloaded; source archive onboarding requires per-file verification.');
    if (report.outcomes.some(s => s.status === 'SOURCE_METADATA_BLOCKED')) process.exitCode = 2;
  }
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
