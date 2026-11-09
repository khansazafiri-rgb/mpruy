// A machine-checkable RIGHTS EVIDENCE WORKLIST, not a grant of rights.
// A clean inventory is NOT a "cleared" product. Public stage still requires
// separately reviewed exact-build approvals in commercial-release.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const INVENTORY_FILE = fileURLToPath(new URL('../commercial-rights-evidence.json', import.meta.url));
export const MODEL_SYSTEMS = Object.freeze(['skeletal', 'muscular', 'joints', 'cardiovascular', 'lymphatic', 'visceral']);
export const REQUIRED_IDS = Object.freeze([
  'atlas-code', ...MODEL_SYSTEMS.map(s => `model-${s}`),
  'atlas-previews', 'atlas-definitions', 'atlas-other-data',
  'atlas-synthetic-ct', 'lab-application-code', 'software-dependencies',
  'medcoel-promotional-media',
]);
const STATUSES = new Set(['blocked', 'needs-review', 'verified']);
const KNOWN_PRODUCTS = new Set(['atlas-viewer', '4d-lab', 'medcoel-platform']);
const PROVENANCE_VERIFIED = new Set(['per-asset-confirmed', 'ownership-documented']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const text = v => typeof v === 'string' && !!v.trim();
const localEvidence = v => text(v) && !v.startsWith('/') &&
  !v.includes('\\') && !v.split('/').includes('..') && !v.startsWith('./');
const validEvidenceURL = url => /^https:\/\/[a-z0-9.-]+\/[^\s]+$/i.test(url) || localEvidence(url);

/** Throws if evidence is missing/misrepresented; 'pending' inventory is valid.
 * Verification requires written/version-specific rights evidence and independent
 * review. No boolean or status edit can establish ownership on its own.
 */
export function inspectCommercialEvidence(data, { verifyLocal = false, root = ROOT, atlasPackage = null } = {}) {
  const faults = [];
  const fail = detail => faults.push(detail);
  if (data?.schemaVersion !== 1 || !Array.isArray(data.records))
    throw new Error('Commercial rights evidence: invalid inventory schema.');
  const records = data.records, byId = new Map();
  for (const r of records) {
    if (!r || !text(r.id) || byId.has(r.id)) { fail('Missing or duplicate asset ID: ' + r?.id); continue; }
    byId.set(r.id, r);
    if (!Array.isArray(r.products) || !r.products.length || !r.products.every(p => KNOWN_PRODUCTS.has(p)))
      fail(r.id + ': missing or unknown product scope');
    if (!Array.isArray(r.scope) || !r.scope.length || !r.scope.every(text))
      fail(r.id + ': missing file scope');
    if (!text(r.source) || !text(r.sourceRevision) || !text(r.sourceLicense))
      fail(r.id + ': source, source revision and claimed licence are required');
    if (![true, false, null].includes(r.sourceCommercialUse))
      fail(r.id + ': commercial-use source claim must be true, false or null');
    if (!text(r.provenance) || !STATUSES.has(r.status))
      fail(r.id + ': provenance and audit status required');
    if (!Array.isArray(r.evidence) || !r.evidence.length ||
        !r.evidence.every(e => text(e?.kind) && validEvidenceURL(e?.url)))
      fail(r.id + ': at least one specific, nonempty evidence reference required');
    if (verifyLocal) for (const e of r.evidence || [])
      if (localEvidence(e?.url) && !fs.existsSync(path.join(root, e.url)))
        fail(r.id + ': local evidence path missing: ' + e.url);
    if (!Array.isArray(r.dependencies)) fail(r.id + ': dependencies must be an array');
    if (r.status !== 'verified' && !text(r.blockingReason))
      fail(r.id + ': missing explicit clearance blocker');
    if (r.status === 'verified') {
      const a = r.clearance;
      if (!PROVENANCE_VERIFIED.has(r.provenance)) fail(r.id + ': inferred provenance cannot be verified');
      if (!a || !text(a.rightsHolder) || !text(a.reviewer) || !ISO_DATE.test(a.reviewedAt || '') ||
          !Array.isArray(a.assetSha256) || !a.assetSha256.length ||
          !a.assetSha256.every(s => SHA256.test(s)) ||
          a.commercialUse !== true || a.redistribution !== true || a.adaptation !== true ||
          !text(a.attribution) || !text(a.shareAlike) ||
          !Array.isArray(a.evidence) || !a.evidence.length ||
          !a.evidence.every(e => text(e.kind) && validEvidenceURL(e.url))) {
        fail(r.id + ': verified claims require reviewed rights-holder identity, exact asset hashes, explicit rights, obligations and evidence');
      }
      if (r.sourceCommercialUse === false && !(a?.evidence || []).some(e => e.kind === 'explicit-commercial-permission'))
        fail(r.id + ': original NC source needs explicit written commercial permission');
    }
    if (r.status === 'blocked' && r.sourceCommercialUse === true && !text(r.blockingReason))
      fail(r.id + ': explain why even a commercially permissive source is blocked');
  }
  for (const id of REQUIRED_IDS) if (!byId.has(id)) fail('Missing mandatory audit component: ' + id);
  for (const r of records) for (const id of r.dependencies || []) if (!byId.has(id) || id === r.id)
    fail(r.id + ': unknown or self dependency ' + id);
  for (const sys of MODEL_SYSTEMS) {
    const id = 'model-' + sys, r = byId.get(id);
    if (!r?.scope?.includes('apps/anatomy/public/models/' + sys + '.glb'))
      fail(id + ': required shipped GLB is not tracked');
  }
  const code = byId.get('atlas-code');
  let pkg = atlasPackage;
  if (!pkg && verifyLocal) pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/anatomy/package.json'), 'utf8'));
  if (pkg && code && code.sourceLicense !== pkg.license)
    fail('Atlas code ledger disagrees with actual package.json licence');
  if (code && /-NC/i.test(code.sourceLicense) && code.status === 'verified' &&
      !(code.clearance?.evidence || []).some(e => e.kind === 'explicit-commercial-permission'))
    fail('Atlas code source declares NC and has no explicit commercial permission');
  // A derivative cannot be declared verified while any of its inputs are unresolved.
  for (const r of records) if (r.status === 'verified') for (const dep of r.dependencies || [])
    if (byId.get(dep)?.status !== 'verified') fail(r.id + ': derived asset dependency not verified: ' + dep);
  if (faults.length) throw new Error('Commercial rights evidence invalid:\n- ' + faults.join('\n- '));
  const statusCounts = { verified: 0, blocked: 0, 'needs-review': 0 };
  for (const r of records) statusCounts[r.status]++;
  const products = {};
  for (const product of KNOWN_PRODUCTS) {
    const relevant = records.filter(r => r.products.includes(product));
    products[product] = {
      total: relevant.length,
      verified: relevant.filter(r => r.status === 'verified').length,
      pending: relevant.filter(r => r.status !== 'verified').map(r => r.id),
      evidenceComplete: relevant.length > 0 && relevant.every(r => r.status === 'verified'),
    };
  }
  return { total: records.length, statusCounts, products, readyForReview: Object.values(products).every(p => p.evidenceComplete) };
}
export function readCommercialEvidence(file = INVENTORY_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = inspectCommercialEvidence(readCommercialEvidence(), { verifyLocal: true });
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--require-clearance') && !result.readyForReview) {
      console.error('Commercial rights evidence: NOT READY. This inventory does not authorize a public release.');
      process.exitCode = 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
