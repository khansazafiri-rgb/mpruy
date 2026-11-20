// TEST ENVIRONMENT ONLY. Builds a fully bound, neutral engineering release in a temporary directory:
// a private licensing root (committed ledger + synthetic test records), a test catalog entry with a "test-" id,
// the build with manifest, and an approved-build policy. Never writes into the repository's licensing data.
import fs from 'node:fs';
import path from 'node:path';
import { digest } from '../licensing/tools/inspect-studio-resources.mjs';
import { releaseDigest } from '../licensing/tools/check-commercial-release.mjs';
import { buildStudioManifest } from './build-studio-manifest.mjs';

const REPO = new URL('../', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p, REPO), 'utf8'));

/** files: Map(relativePath -> Buffer). */
export function createTestRelease({ dir, studioId = 'test-fixture', releaseId = 'fixture-release', campuses = [], files, capabilities = ['fixture-echo'], challengeRestricted = [], learningModes = { guided: 'none', challenge: 'none', typedQuiz: 'none' } }) {
  if (!/^test-/.test(studioId)) throw Error('Test releases must use a test- studio id');
  const licensingRoot = path.join(dir, 'licensing'), dist = path.join(dir, 'dist');
  fs.mkdirSync(licensingRoot, { recursive: true }); fs.mkdirSync(dist, { recursive: true });
  const product = 'studio:' + studioId;
  const evidence = read('licensing/commercial-rights-evidence.json');
  const policy = read('licensing/commercial-release.json');
  const resources = { schemaVersion: 1, sources: [{ id: 'engineering-source', publisher: 'Engineering fixture only', officialUrl: 'https://example.org/engineering', datasetId: 'engineering-only', release: 'fixture-v1', doi: null, licenseId: 'MIT', status: 'VERIFIED_SOURCE', evidence: [{ url: 'https://example.org/engineering/LICENSE', release: 'fixture-v1', checkedAt: '2026-11-20', snapshotSha256: 'f'.repeat(64) }] }], assets: [] };
  let n = 0;
  for (const [file, buffer] of files) {
    const id = 'test-asset-' + (++n), sha256 = digest(buffer), rightsId = id + '-rights';
    const attribution = 'Engineering-only credit: ' + id, noticePath = 'NOTICE-' + id + '.txt', noticeBytes = Buffer.from(attribution + '\nMIT\n');
    fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
    fs.writeFileSync(path.join(dist, file), buffer); fs.writeFileSync(path.join(dist, noticePath), noticeBytes);
    const kind = /\.(html|js|css)$/.test(file) ? 'code' : 'test-content';
    const review = { status: 'approved', reviewer: 'Engineering test reviewer (not clinical sign-off)', reviewedAt: '2026-11-20', reviewedSha256: sha256, scope: ['educational'], reason: 'Synthetic engineering fixture only' };
    resources.assets.push({ id, version: '1', datasetId: 'test-data', sourceRef: 'engineering-source', kind, dataNature: 'synthetic', format: kind === 'code' ? 'HTML' : 'BIN', path: file, bytes: buffer.length, sha256, protected: false, rightsEvidenceRef: rightsId, attributionRef: rightsId, notice: { path: noticePath, sha256: digest(noticeBytes) }, dependsOn: [], derivation: null, sourceFile: { url: 'https://example.org/engineering/' + file, member: file, sha256 }, geometry: null, medicalReview: structuredClone(review), privacyReview: structuredClone(review) });
    evidence.records.push({ id: rightsId, products: [product], scope: [file], source: 'Engineering-only original test bytes', sourceRevision: 'fixture-v1', sourceLicense: 'MIT', sourceCommercialUse: true, provenance: 'ownership-documented', status: 'verified', dependencies: [], evidence: [{ kind: 'test-only-notice', url: 'https://example.org/engineering/LICENSE' }], clearance: { rightsHolder: 'Engineering test only', reviewer: 'Engineering test only', reviewedAt: '2026-11-20', assetSha256: [sha256], commercialUse: true, redistribution: true, adaptation: true, attribution, shareAlike: 'not-required', evidence: [{ kind: 'test-only-grant', url: 'https://example.org/engineering/LICENSE' }] } });
  }
  const resourcesFile = path.join(licensingRoot, 'resources.v1.json');
  fs.writeFileSync(resourcesFile, JSON.stringify(resources, null, 2));
  fs.writeFileSync(path.join(licensingRoot, 'commercial-rights-evidence.json'), JSON.stringify(evidence, null, 2));
  fs.copyFileSync(new URL('licensing/quarantine-policy.json', REPO), path.join(licensingRoot, 'quarantine-policy.json'));
  // resource-manifest.json is code-free metadata; give it rights coverage like every other shipped byte via the manifest exception.
  buildStudioManifest({ dist, studioId, releaseId, resourcesFile, capabilities, challengeRestricted, builtFrom: 'a'.repeat(40) });
  policy.products[product] = { status: 'cleared', blockers: [], approvedBuilds: [{ sha256: releaseDigest(dist), reviewer: 'Synthetic fixture reviewer only', reviewedAt: '2026-11-20', evidence: 'engineering-test-only', commercialUse: true, redistribution: true, attribution: 'Fixture notices', shareAlike: 'not-required' }] };
  fs.writeFileSync(path.join(licensingRoot, 'commercial-release.json'), JSON.stringify(policy, null, 2));
  const catalog = read('shared/studios/catalog.v1.json');
  catalog.studios.push({ schemaVersion: 1, id: studioId, title: 'Test fixture (engineering)', titleId: 'Fixture uji (rekayasa)', region: 'thorax', modality: 'xray',
    runtime: { type: 'iframe', entry: 'index.html', releaseId }, capabilities, plannedCapabilities: capabilities,
    learningModes,
    datasets: [{ id: 'test-data', kind: 'test-content', provenance: 'Original neutral engineering fixture', licence: 'verified', protected: false }],
    reuses: null, access: { roles: ['user', 'admin'], campuses }, review: { clinical: 'not-required', anatomical: 'not-required' },
    licensing: { status: 'verified', ref: 'licensing/commercial-release.json#' + product }, release: { status: 'publishable' }, blockers: [] });
  const catalogFile = path.join(dir, 'test-catalog.json');
  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2));
  return { licensingRoot, dist, catalogFile, studioId, releaseId, testEntry: catalog.studios.at(-1) };
}
