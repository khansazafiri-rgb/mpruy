#!/usr/bin/env node
// Machine-readable status of the 24 canonical Clinical Studios, COMPUTED from committed sources of truth
// (catalog, studio configs, resource registry, rights ledger, review log, B1 inspector) — never hand-edited.
//   node scripts/studio-status.mjs          writes docs/clinical-studios/studio-status.v1.json
//   node scripts/studio-status.mjs --check  fails if the committed file is stale
// Categories: RELEASE_ELIGIBLE · FUNCTIONAL_PRIVATE_REVIEW (real data, source licence verified, human reviews pending) ·
// FUNCTIONAL_WITH_PENDING_CLEARANCE (real data, but a source licence question is open or an asset is rights-blocked) ·
// TECHNICAL_FIXTURE_ONLY · PARTIALLY_IMPLEMENTED · BLOCKED · NOT_STARTED.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectStudioResources } from '../licensing/tools/inspect-studio-resources.mjs';

const REPO = fileURLToPath(new URL('../', import.meta.url));
const read = p => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));
const OUT = 'docs/clinical-studios/studio-status.v1.json';

export function computeStatus() {
  const catalog = read('shared/studios/catalog.v1.json'), resources = read('licensing/resources.v1.json');
  const ledger = read('licensing/commercial-rights-evidence.json'), decisions = read('licensing/reviews/decisions.v1.json');
  const studios = catalog.studios.filter(s => !s.id.startsWith('foundation-') && !s.id.startsWith('test-'));
  const out = studios.map(s => {
    const cfg = read('apps/studios/' + s.id + '/studio.config.json');
    const derived = resources.assets.filter(a => !a.sourceFile && a.id.startsWith(s.id + '.'));
    const sourceIds = [...new Set(derived.map(a => a.sourceRef))];
    const sources = resources.sources.filter(x => sourceIds.includes(x.id)).map(x => ({ id: x.id, licenseId: x.licenseId, status: x.status, doi: x.doi }));
    const rights = ledger.records.filter(r => r.products.includes('studio:' + s.id)).map(r => ({ id: r.id, status: r.status }));
    const rightsBlocked = rights.filter(r => r.status === 'blocked').map(r => r.id);
    const approvals = decisions.decisions.filter(d => d.type === 'decision' && d.decision === 'approved' && derived.some(a => d.target === 'asset:' + a.id)).length;
    let eligible = false, inspectorCodes = [];
    try { const r = inspectStudioResources({ studioId: s.id, catalog, catalogSchema: read('shared/studios/catalog.schema.json'), resources, resourceSchema: read('licensing/resource-manifest.schema.json'), evidence: ledger, commercialManifest: path.join(REPO, 'licensing/commercial-release.json'), buildRoot: undefined }); eligible = !!r?.decision?.eligible; inspectorCodes = [...new Set([...(r?.decision?.blockers || []), ...(r?.errors || []).map(e => e.code)])].filter(c => c !== 'missing-build').sort(); }
    catch (e) { inspectorCodes = ['inspector-error']; }
    const catalogBlocked = (s.blockers || []).some(b => b.kind === 'data');
    let category;
    if (eligible) category = 'RELEASE_ELIGIBLE';
    else if (catalogBlocked && !derived.length) category = 'BLOCKED';
    else if (!derived.length) category = 'TECHNICAL_FIXTURE_ONLY';
    else if (sources.some(x => x.status !== 'VERIFIED_SOURCE') || rightsBlocked.length) category = 'FUNCTIONAL_WITH_PENDING_CLEARANCE';
    else category = 'FUNCTIONAL_PRIVATE_REVIEW';
    return { id: s.id, engine: cfg.engine, category, releaseEligible: eligible, studentAccess: false,
      data: derived.length ? 'private-review' : 'technical-fixture', derivedAssets: derived.length, sources, rights, rightsBlocked,
      reviews: { approvedDecisions: approvals, medical: 'pending', privacy: 'pending', terminology: 'pending' },
      catalog: { release: s.release.status, licensing: s.licensing.status, blockers: (s.blockers || []).map(b => b.kind) },
      challengeRestricted: cfg.challengeRestricted || [], inspector: { eligible, codes: inspectorCodes.slice(0, 12) } };
  });
  const counts = out.reduce((m, s) => ((m[s.category] = (m[s.category] || 0) + 1), m), {});
  return { schema: 'medcoel.studio-status.v1', generatedFrom: ['shared/studios/catalog.v1.json', 'licensing/resources.v1.json', 'licensing/commercial-rights-evidence.json', 'licensing/reviews/decisions.v1.json', 'apps/studios/*/studio.config.json'],
    note: 'Computed, not hand-edited. No studio is open to students; release needs verified rights, signed privacy/medical review of the exact bytes, a receipt and an attestation.',
    total: out.length, counts, studios: out };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(computeStatus(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(path.join(REPO, OUT)) ? fs.readFileSync(path.join(REPO, OUT), 'utf8') : '';
    if (cur !== text) { console.error(OUT + ' is stale: run node scripts/studio-status.mjs'); process.exit(1); }
    console.log('studio status up to date');
  } else { fs.writeFileSync(path.join(REPO, OUT), text); console.log(JSON.parse(text).counts); }
}
