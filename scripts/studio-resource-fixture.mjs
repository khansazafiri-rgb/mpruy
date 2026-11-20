// Engineering-only fixture. Never writes clinical approval into repository policy data.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { digest } from '../licensing/tools/inspect-studio-resources.mjs';
import { releaseDigest } from '../licensing/tools/check-commercial-release.mjs';
const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
export function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-b1-engineering-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const f = { studioId: 'foundation-fixture', catalog: read('shared/studios/catalog.v1.json'), catalogSchema: read('shared/studios/catalog.schema.json'), resourceSchema: read('licensing/resource-manifest.schema.json'), evidence: read('licensing/commercial-rights-evidence.json'), buildRoot: path.join(dir, 'build'), commercialManifest: path.join(dir, 'approval.json'), buffers: new Map() };
  fs.mkdirSync(f.buildRoot);
  f.studio = f.catalog.studios.find(s => s.id === f.studioId);
  Object.assign(f.studio.runtime, { entry: 'index.html', releaseId: 'engineering-only' });
  f.studio.licensing = { status: 'verified', ref: 'licensing/commercial-release.json#studio:' + f.studioId };
  f.studio.release.status = 'publishable';
  f.studio.datasets = [{ id: 'test-data', kind: 'test-content', provenance: 'Original neutral engineering fixture', licence: 'verified', protected: false }];
  f.resources = { schemaVersion: 1, sources: [{ id: 'engineering-source', publisher: 'Engineering fixture only', officialUrl: 'https://example.org/engineering', datasetId: 'engineering-only', release: 'fixture-v1', doi: null, licenseId: 'MIT', status: 'VERIFIED_SOURCE', evidence: [{ url: 'https://example.org/engineering/LICENSE', release: 'fixture-v1', checkedAt: '2026-11-20', snapshotSha256: 'f'.repeat(64) }] }], assets: [] };
  for (const [id, file, kind, bytes] of [['fixture-code', 'index.html', 'code', '<p>Engineering fixture only</p>'], ['fixture-data', 'fixture.bin', 'test-content', 'NEUTRAL SYNTHETIC TEST BYTES']]) {
    const buffer = Buffer.from(bytes), sha256 = digest(buffer), rightsId = id + '-rights';
    const attribution = 'Engineering-only credit: ' + id;
    const noticePath = id + '-NOTICE.txt', noticeBytes = Buffer.from(attribution + '\nMIT\n');
    f.buffers.set(file, buffer); f.buffers.set(noticePath, noticeBytes);
    const review = { status: 'approved', reviewer: 'Engineering test reviewer (not clinical sign-off)', reviewedAt: '2026-11-20', reviewedSha256: sha256, scope: ['educational'], reason: 'Synthetic engineering fixture only' };
    f.resources.assets.push({ id, version: '1', datasetId: 'test-data', sourceRef: 'engineering-source', kind, dataNature: 'synthetic', format: kind === 'code' ? 'HTML' : 'BIN', path: file, bytes: buffer.length, sha256, protected: false, rightsEvidenceRef: rightsId, attributionRef: rightsId, notice: { path: noticePath, sha256: digest(noticeBytes) }, dependsOn: [], derivation: null, sourceFile: { url: 'https://example.org/engineering/' + file, member: file, sha256 }, geometry: null, medicalReview: structuredClone(review), privacyReview: structuredClone(review) });
    f.evidence.records.push({ id: rightsId, products: ['studio:' + f.studioId], scope: [file], source: 'Engineering-only original test bytes', sourceRevision: 'fixture-v1', sourceLicense: 'MIT', sourceCommercialUse: true, provenance: 'ownership-documented', status: 'verified', dependencies: [], evidence: [{ kind: 'test-only-notice', url: 'https://example.org/engineering/LICENSE' }], clearance: { rightsHolder: 'Engineering test only', reviewer: 'Engineering test only', reviewedAt: '2026-11-20', assetSha256: [sha256], commercialUse: true, redistribution: true, adaptation: true, attribution, shareAlike: 'not-required', evidence: [{ kind: 'test-only-grant', url: 'https://example.org/engineering/LICENSE' }] } });
  }
  f.manifest = { schema: 'medcoel.studio.v1', id: f.studioId, releaseId: f.studio.runtime.releaseId, entry: 'index.html', builtFrom: 'a'.repeat(40), files: [], assetRefs: [], resourceManifestSha256: null };
  f.policy = { schemaVersion: 1, products: { ['studio:' + f.studioId]: { status: 'cleared', blockers: [], approvedBuilds: [] } } };
  f.sync = () => {
    for (const [file, bytes] of f.buffers) fs.writeFileSync(path.join(f.buildRoot, file), bytes);
    const resourceBytes = Buffer.from(JSON.stringify(f.resources));
    fs.writeFileSync(path.join(f.buildRoot, 'resource-manifest.json'), resourceBytes);
    f.manifest.resourceManifestSha256 = digest(resourceBytes);
    f.manifest.files = [...f.buffers.entries(), ['resource-manifest.json', resourceBytes]].map(([file, bytes]) => ({ path: file, sha256: digest(bytes) }));
    f.manifest.assetRefs = f.resources.assets.map(a => ({ assetId: a.id, version: a.version, sha256: a.sha256 }));
    f.approve();
  };
  f.approve = () => {
    fs.writeFileSync(path.join(f.buildRoot, 'studio-manifest.json'), JSON.stringify(f.manifest));
    f.policy.products['studio:' + f.studioId].approvedBuilds = [{ sha256: releaseDigest(f.buildRoot), reviewer: 'Synthetic fixture reviewer only', reviewedAt: '2026-11-20', evidence: 'engineering-test-only', commercialUse: true, redistribution: true, attribution: 'Fixture notices', shareAlike: 'not-required' }];
    fs.writeFileSync(f.commercialManifest, JSON.stringify(f.policy));
  };
  f.sync(); return f;
}
