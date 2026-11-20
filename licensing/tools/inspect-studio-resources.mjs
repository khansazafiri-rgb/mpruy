// Offline inspection only. No download, publication, runtime mount, or output writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateCatalog, validateResources, safePath, SHA256, validDate } from '../../packages/studio-contract/manifest.mjs';
import { inspectCommercialEvidence } from './audit-commercial-evidence.mjs';
import { assertCommercialReleaseReady } from './check-commercial-release.mjs';
import { scanDistribution, loadPolicy } from './check-distribution.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const DATA_CAPABILITIES = new Set(['anatomy3d', 'slice-navigation', 'mpr', 'window-level', 'measurement', 'structure-identification', 'ultrasound-probe', 'clinical-case']);
const PERMISSIVE = new Set(['CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0', 'MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0']);

export function inspectStudioResources({ studioId, catalog, catalogSchema, resources, resourceSchema, evidence, commercialManifest, buildRoot, quarantine = loadPolicy(), use = 'educational' }) {
  const errors = [];
  const fail = (where, code, message) => errors.push({ path: where, code, message });
  const finish = () => ({ ok: errors.length === 0, errors, decision: { eligible: errors.length === 0, blockers: errors.map(e => e.code) } });
  try {
    const c = validateCatalog(catalog, catalogSchema), r = validateResources(resources, resourceSchema);
    if (!c.ok) errors.push(...c.errors);
    if (!r.ok) errors.push(...r.errors);
    if (errors.length) return finish();
    const studio = catalog.studios.find(s => s.id === studioId);
    if (!studio) { fail('studioId', 'unknown-studio', 'Studio is not in the canonical catalog'); return finish(); }
    const product = 'studio:' + studio.id;
    if (studio.release.status !== 'publishable' || studio.licensing.status !== 'verified' || studio.blockers.length || studio.review.clinical === 'pending' || studio.review.anatomical === 'pending') fail(studio.id, 'studio-not-cleared', 'Catalog constraints remain closed');
    if (studio.licensing.ref !== 'licensing/commercial-release.json#' + product) fail(studio.id, 'product-reference', 'Studio must reference its own explicit product policy');
    // Reuse the existing rights engine. Do not require unrelated legacy products to be cleared.
    inspectCommercialEvidence(evidence, { studioIds: catalog.studios.map(s => s.id) });
    const byRights = new Map(evidence.records.map(x => [x.id, x]));
    const byAsset = new Map(resources.assets.map(x => [x.id, x]));
    const bySource = new Map(resources.sources.map(x => [x.id, x]));
    const requiredDatasets = new Set(studio.datasets.map(x => x.id));
    if (studio.datasets.some(x => x.protected || x.licence !== 'verified')) fail(studio.id, 'protected-or-unverified', 'Dataset cannot enter a public static release');
    if (!buildRoot || !fs.existsSync(buildRoot) || !fs.lstatSync(buildRoot).isDirectory() || fs.lstatSync(buildRoot).isSymbolicLink()) { fail('buildRoot', 'missing-build', 'An actual, non-symlink build root is required'); return finish(); }
    const actual = new Map();
    function walk(dir, prefix = '') {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix + entry.name, absolute = path.join(dir, entry.name);
        if (!safePath(rel) || entry.isSymbolicLink()) { fail(rel, 'unsafe-path', 'Unsafe path or symlink'); continue; }
        if (entry.isDirectory()) walk(absolute, rel + '/');
        else if (entry.isFile()) { const b = fs.readFileSync(absolute); actual.set(rel, { bytes: b.length, sha256: digest(b), buffer: b }); }
        else fail(rel, 'unsafe-file', 'Special files cannot enter a studio build');
      }
    }
    walk(buildRoot);
    if (errors.some(x => x.code === 'unsafe-path' || x.code === 'unsafe-file')) return finish();
    const manifestFile = actual.get('studio-manifest.json');
    if (!manifestFile) { fail('studio-manifest.json', 'missing-manifest', 'Studio release manifest missing'); return finish(); }
    const manifest = JSON.parse(manifestFile.buffer.toString('utf8'));
    if (manifest.schema !== 'medcoel.studio.v1' || manifest.id !== studio.id || manifest.releaseId !== studio.runtime.releaseId || manifest.entry !== studio.runtime.entry || !/^[a-f0-9]{40}$/.test(manifest.builtFrom || '') || !safePath(manifest.entry)) fail('studio-manifest.json', 'release-identity', 'Release identity, entry or source commit mismatch');
    if (!Array.isArray(manifest.files) || !Array.isArray(manifest.assetRefs)) { fail('studio-manifest.json', 'manifest-shape', 'files and assetRefs arrays required'); return finish(); }
    const listed = new Set();
    for (const file of manifest.files) {
      if (!safePath(file.path) || file.path === 'studio-manifest.json' || file.path === '.release-source.json' || listed.has(file.path)) { fail('files', 'unsafe-inventory', 'Invalid, duplicate or reserved file path'); continue; }
      listed.add(file.path);
      if (!SHA256.test(file.sha256 || '') || actual.get(file.path)?.sha256 !== file.sha256) fail(file.path, 'file-hash', 'Inventory differs from actual bytes');
    }
    for (const rel of actual.keys()) if (rel !== 'studio-manifest.json' && !listed.has(rel)) fail(rel, 'unmanifested-file', 'All shipped bytes must be enumerated');
    if (!listed.has(studio.runtime.entry)) fail('entry', 'missing-entry', 'Runtime entry must be in the inventory');
    const resourceFile = actual.get('resource-manifest.json');
    if (!resourceFile || !listed.has('resource-manifest.json') || manifest.resourceManifestSha256 !== resourceFile.sha256 || JSON.stringify(JSON.parse(resourceFile.buffer.toString('utf8'))) !== JSON.stringify(resources)) fail('resource-manifest.json', 'resource-binding', 'Exact resource manifest must be bound to the build');
    const included = new Set(), includedPaths = new Set(), closure = new Set();
    function visit(id) {
      const asset = byAsset.get(id);
      if (!asset || closure.has(id)) return;
      closure.add(id); asset.dependsOn.forEach(edge => visit(edge.assetId));
    }
    for (const ref of manifest.assetRefs) {
      const asset = byAsset.get(ref.assetId);
      if (!asset || included.has(ref.assetId) || asset.version !== ref.version || asset.sha256 !== ref.sha256 || !SHA256.test(ref.sha256 || '')) fail('assetRefs', 'asset-reference', 'Unknown, duplicate or changed asset reference');
      else { included.add(asset.id); includedPaths.add(asset.path); visit(asset.id); }
    }
    if (studio.plannedCapabilities.some(c => DATA_CAPABILITIES.has(c)) && !included.size) fail(studio.id, 'missing-assets', 'Clinical studio needs actual approved resources');
    const deliveredDatasets = new Set([...included].map(id => byAsset.get(id)?.datasetId));
    for (const dataset of requiredDatasets) if (!deliveredDatasets.has(dataset)) fail(dataset, 'dataset-coverage', 'Declared dataset has no released asset');
    const requiredKind = { anatomy3d: 'mesh', ct: 'volume', mri: 'volume', xray: 'image', ultrasound: 'volume', ecg: 'waveform' }[studio.modality];
    if (!studio.internal && (studio.plannedCapabilities.some(c => DATA_CAPABILITIES.has(c)) || studio.capabilities.some(c => DATA_CAPABILITIES.has(c))) && ![...included].some(id => byAsset.get(id)?.kind === requiredKind)) fail(studio.id, 'dataset-coverage', 'Clinical studio requires modality-appropriate data, not only code');
    const rightIds = new Set();
    for (const id of closure) {
      const asset = byAsset.get(id), source = bySource.get(asset.sourceRef), rights = byRights.get(asset.rightsEvidenceRef);
      if (!source || source.status !== 'VERIFIED_SOURCE') fail(id, 'source-unverified', 'Source must be verified for its exact release');
      if (!source?.evidence.some(e => SHA256.test(e.snapshotSha256 || ''))) fail(id, 'source-evidence', 'Version-specific source evidence needs a retained snapshot digest');
      if (!asset.dependsOn.length && (!asset.sourceFile || !/^https:\/\/[^\s]+$/.test(asset.sourceFile.url) || !safePath(asset.sourceFile.member) || !SHA256.test(asset.sourceFile.sha256))) fail(id, 'source-file', 'Original source file/member and digest required');
      if (!asset.dependsOn.length && asset.sourceFile?.sha256 !== asset.sha256) fail(id, 'missing-derivation', 'Changed source bytes require an explicit parent and transform');
      if (!source || !PERMISSIVE.has(source.licenseId) || /(?:^|-)NC(?:-|$)/i.test(source.licenseId)) fail(id, 'licence-not-allowed', 'Unknown, NC or unsupported source licence');
      if (!rights || rights.status !== 'verified' || rights.sourceCommercialUse !== true || !rights.products.includes(product) || !rights.clearance?.assetSha256.includes(asset.sha256) || !rights.scope.includes(asset.path)) fail(id, 'rights-unverified', 'Exact asset must have scoped, verified original evidence');
      else {
        rightIds.add(rights.id);
        if (!validDate(rights.clearance.reviewedAt)) fail(id, 'rights-review-date', 'Rights review date must be a real calendar date');
        if (rights.sourceLicense !== source.licenseId || rights.sourceRevision !== source.release) fail(id, 'source-rights-conflict', 'Source licence/release differs from rights evidence');
        const share = rights.clearance.shareAlike;
        if (source.licenseId.startsWith('CC-BY-SA-') && share !== source.licenseId) fail(id, 'sharealike-conflict', 'Pilot derivatives retain the exact ShareAlike licence');
        if (asset.attributionRef !== rights.id) fail(id, 'attribution-reference', 'Attribution must reference original clearance');
        if (included.has(id)) {
          const notice = actual.get(asset.notice.path);
          if (!notice || !SHA256.test(asset.notice.sha256 || '') || notice.sha256 !== asset.notice.sha256 || !notice.buffer.toString('utf8').includes(rights.clearance.attribution) || !notice.buffer.toString('utf8').includes(source.licenseId)) fail(id, 'attribution-notice', 'Actual notice must match hash, credit and licence');
        }
        for (const edge of asset.dependsOn) if (!rights.dependencies.includes(byAsset.get(edge.assetId)?.rightsEvidenceRef)) fail(id, 'lineage-rights', 'Technical lineage is missing from rights evidence');
      }
      if (asset.protected) fail(id, 'protected-asset', 'Protected assets cannot enter public releases');
      if (!SHA256.test(asset.sha256 || '') || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) fail(id, 'asset-hash', 'Exact asset bytes/hash required');
      if (quarantine.hashes.has(asset.sha256)) fail(id, 'quarantined', 'Withheld input or descendant cannot be cleared');
      const sourceMember = asset.path;
      if (/(^|\/)local-data\//i.test(sourceMember) || /(^|\/)models\/nervous\.glb$/i.test(sourceMember)) fail(id, 'quarantined', 'Quarantined path');
      if (['volume', 'mesh', 'waveform', 'annotation'].includes(asset.kind) && !asset.geometry) fail(id, 'missing-geometry', 'Spatial/signal metadata required');
      for (const [kind, review] of [['medical', asset.medicalReview], ['privacy', asset.privacyReview]]) {
        const technical = ['code', 'dependency', 'test-content'].includes(asset.kind);
        if (review.reviewedSha256 !== asset.sha256 || !review.scope.includes(use) || review.status === 'pending' || (review.status === 'not-required' && (!technical || !review.reason.trim()))) fail(id, kind + '-review', 'Review must cover exact bytes and intended use; N/A requires reviewed technical scope');
      }
      if (included.has(id) && (!listed.has(asset.path) || actual.get(asset.path)?.sha256 !== asset.sha256 || actual.get(asset.path)?.bytes !== asset.bytes)) fail(id, 'asset-bytes', 'Delivered asset does not match approved bytes');
    }
    // Every executable/content file must be represented by an asset, not only dataset bytes.
    const notices = new Set([...included].map(id => byAsset.get(id).notice.path));
    for (const rel of actual.keys()) if (!['studio-manifest.json', 'resource-manifest.json'].includes(rel) && !notices.has(rel) && !includedPaths.has(rel)) fail(rel, 'missing-rights-coverage', 'Shipped code/data/dependencies must all have rights coverage');
    const productRights = evidence.records.filter(r => r.products.includes(product));
    if (!productRights.length || productRights.some(r => r.status !== 'verified' || !rightIds.has(r.id))) fail(product, 'product-evidence', 'Product evidence must be verified and match the actual dependency closure');
    for (const problem of scanDistribution(buildRoot, quarantine)) fail('distribution', 'quarantined', problem);
    if (!commercialManifest) fail(product, 'missing-policy', 'Commercial release policy file required');
    if (!errors.length) assertCommercialReleaseReady(product, buildRoot, commercialManifest, { allowOwnerOverride: false });
  } catch (e) { fail('inspection', 'clearance-failed', e instanceof Error ? e.message : 'Invalid input'); }
  return finish();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [studioId, buildRoot] = process.argv.slice(2);
    const report = inspectStudioResources({ studioId, buildRoot, catalog: read(path.join(ROOT, 'shared/studios/catalog.v1.json')), catalogSchema: read(path.join(ROOT, 'shared/studios/catalog.schema.json')), resources: read(path.join(ROOT, 'licensing/resources.v1.json')), resourceSchema: read(path.join(ROOT, 'licensing/resource-manifest.schema.json')), evidence: read(path.join(ROOT, 'licensing/commercial-rights-evidence.json')), commercialManifest: path.join(ROOT, 'licensing/commercial-release.json') });
    console.log(JSON.stringify(report, null, 2)); process.exitCode = report.decision.eligible ? 0 : 1;
  } catch { console.error(JSON.stringify({ ok: false, errors: [{ path: '$', code: 'invalid-input', message: 'Unable to read offline input' }], decision: { eligible: false } })); process.exitCode = 1; }
}
