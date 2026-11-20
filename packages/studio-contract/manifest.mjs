import { error, validateSchema } from './validation.mjs';
export const SHA256 = /^[a-f0-9]{64}$/;
export const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export const safePath = v => typeof v === 'string' && v.length > 0 && v.length <= 240 && /^[A-Za-z0-9._/-]+$/.test(v) && v.split('/').every(s => s && s !== '.' && s !== '..') && !v.includes('//');
const result = (value, errors) => errors.length ? { ok: false, errors } : { ok: true, value };

export function validateCatalog(catalog, schema, { previousFrozenIds } = {}) {
  const shaped = validateSchema(schema, catalog);
  if (!shaped.ok) return shaped;
  const errors = [], ids = catalog.studios.map(s => s.id);
  const fail = (s, code, message) => errors.push(error('studio.' + s.id, code, message));
  if (new Set(ids).size !== ids.length) errors.push(error('studios', 'duplicate-id', 'duplicate studio id/route'));
  if (previousFrozenIds && (!Array.isArray(previousFrozenIds) || previousFrozenIds.some((id, i) => ids[i] !== id))) errors.push(error('studios', 'frozen-id-changed', 'Existing studio IDs may only be appended, never renamed, reordered or removed'));
  for (const s of catalog.studios) {
    const internal = s.internal === true;
    if (internal !== (s.region === 'internal') || internal !== (s.modality === 'none')) fail(s, 'internal-only', 'Reserved internal region/modality');
    if (internal && (s.access.roles.length !== 1 || s.access.roles[0] !== 'admin')) fail(s, 'internal-access', 'Internal studio must be admin-only');
    if (s.runtime.entry !== null && !safePath(s.runtime.entry)) fail(s, 'unsafe-path', 'Unsafe runtime entry');
    if (s.capabilities.length && !s.runtime.releaseId) fail(s, 'missing-release', 'Capabilities declared without a release');
    if (s.datasets.some(d => d.protected || d.licence === 'restricted') && !s.blockers.length) fail(s, 'protected-dataset', 'Protected/restricted dataset needs a blocker');
    if (s.licensing.status === 'blocked' && !s.blockers.some(b => b.kind === 'licence')) fail(s, 'missing-blocker', 'Blocked licence needs a licence blocker');
    if ([s.review.clinical, s.review.anatomical].includes('approved') && (!s.review.approvedBy?.trim() || !validDate(s.review.approvedOn))) fail(s, 'review-evidence', 'Approval needs approvedBy and a valid approvedOn');
    if (s.release.status === 'publishable') {
      if (!s.runtime.entry || !s.runtime.releaseId) fail(s, 'missing-runtime', 'Publishable without runtime entry/release');
      if (s.licensing.status !== 'verified' || !s.licensing.ref) fail(s, 'unverified-licence', `Publishable with licence ${s.licensing.status} or no reference`);
      if (!['approved', 'not-required'].includes(s.review.clinical) || !['approved', 'not-required'].includes(s.review.anatomical)) fail(s, 'unreviewed', 'Publishable without approved review');
      if (s.blockers.length || s.datasets.some(d => d.licence !== 'verified' || d.protected)) fail(s, 'blocked', 'Publishable with blockers or unverified/protected data');
    }
  }
  return result(catalog, errors);
}

export function validateResources(resources, schema) {
  const shaped = validateSchema(schema, resources);
  if (!shaped.ok) return shaped;
  const errors = [], sources = new Map(), assets = new Map();
  const fail = (path, code, message) => errors.push(error(path, code, message));
  for (const source of resources.sources) {
    if (sources.has(source.id)) fail(source.id, 'duplicate-source', 'Duplicate source id');
    sources.set(source.id, source);
    if (!/^https:\/\/[^\s]+$/.test(source.officialUrl)) fail(source.id, 'source-url', 'Official source URL must use HTTPS');
    for (const e of source.evidence) if (!validDate(e.checkedAt) || e.release !== source.release || (!/^https:\/\/[^\s]+$/.test(e.url) && !safePath(e.url))) fail(source.id, 'source-evidence', 'Evidence must cover this release with a valid date and URL/path');
    if (source.status === 'VERIFIED_SOURCE' && !source.evidence.length) fail(source.id, 'source-evidence', 'Verified source needs version-specific evidence');
  }
  for (const asset of resources.assets) {
    if (assets.has(asset.id)) fail(asset.id, 'duplicate-asset', 'Duplicate asset id');
    assets.set(asset.id, asset);
    if (!sources.has(asset.sourceRef)) fail(asset.id, 'unknown-source', 'Source reference does not resolve');
    if (!safePath(asset.path) || !safePath(asset.notice.path)) fail(asset.id, 'unsafe-path', 'Unsafe asset/notice path');
    if (asset.attributionRef !== asset.rightsEvidenceRef) fail(asset.id, 'attribution-reference', 'Attribution must come from the same rights evidence record');
    for (const review of [asset.medicalReview, asset.privacyReview]) if (review.status !== 'pending' && (!review.reviewer.trim() || !validDate(review.reviewedAt) || !SHA256.test(review.reviewedSha256 || '') || !review.scope.length)) fail(asset.id, 'review-evidence', 'Review requires identity/date/hash/scope');
    if (asset.derivation && (!asset.derivation.operation.trim() || !asset.derivation.tool.trim() || !asset.derivation.toolVersion.trim() || !SHA256.test(asset.derivation.parametersSha256))) fail(asset.id, 'derivation', 'Derived assets require reproducible operation metadata');
    if (asset.dependsOn.length && !asset.derivation) fail(asset.id, 'derivation', 'Derived asset missing processing chain');
  }
  const visiting = new Set(), done = new Set();
  function visit(asset, depth = 0) {
    if (depth > 256) { fail(asset.id, 'lineage-depth', 'Lineage exceeds the bounded inspection depth'); return; }
    if (visiting.has(asset.id)) { fail(asset.id, 'lineage-cycle', 'Asset lineage contains a cycle'); return; }
    if (done.has(asset.id)) return;
    visiting.add(asset.id);
    for (const edge of asset.dependsOn) {
      const parent = assets.get(edge.assetId);
      if (!parent) fail(asset.id, 'unknown-parent', edge.assetId);
      else {
        if (parent.version !== edge.version || parent.sha256 !== edge.sha256 || !SHA256.test(edge.sha256)) fail(asset.id, 'parent-hash', 'Parent identity/version/hash mismatch');
        visit(parent, depth + 1);
      }
    }
    visiting.delete(asset.id); done.add(asset.id);
  }
  resources.assets.forEach(visit);
  return result(resources, errors);
}

// Public planning metadata is deliberately small; no evidence documents, keys, or storage paths.
export function publicResourceSummary(asset) {
  return { id: asset.id, version: asset.version, kind: asset.kind, dataNature: asset.dataNature, format: asset.format };
}
