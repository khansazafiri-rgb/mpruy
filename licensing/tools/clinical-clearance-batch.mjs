#!/usr/bin/env node
/**
 * Consolidated, read-only Clinical Studios clearance dashboard and private review orchestrator.
 *
 * Not an approval engine: the canonical licensing registry, signed reviewer decisions, B1
 * inspector, attestation and release receipts remain the only release authorities.
 * This tool does NOT download assets, create reviewers, sign decisions, set source rights
 * to verified, run a production deployment or expose review data via a public route.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = relative => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const OUTPUT = path.join(ROOT, 'local-data/studio-resources/clearance');
const ROOT_PREFIX = path.resolve(ROOT, 'local-data') + path.sep;
const SOURCE_NOTES = Object.freeze({
  'bodyparts3d-dbcls': '2013 OBJ headers CC BY-SA 2.1 Japan vs DBCLS current site CC BY 4.0; confirm exact grant, credits and ShareAlike; license compatibility alone is not clearance.',
  'amos-zenodo': 'Zenodo CC BY 4.0 vs internal amos22/dataset.json CC BY-SA 4.0; confirm scope for each image and segmentation file.',
  'sri24-nitrc': 'SRI24 T1/tissue CC BY-SA 3.0 must be separated from blocked LONI LPBA40-derived labels; alternative atlas/underlay requires separate exact-file rights.',
});
const PENDING = 'pending';
const actionable = Object.freeze({
  noRealData: 'Obtain an independently licensed real teaching dataset, record hashes and source license (fixture is not a real medical release).',
  sourceRights: 'Resolve exact-file source license, embedded notices and third-party contributions, including attribution/ShareAlike.',
  fileRights: 'Obtain per-asset/provenance rights evidence and independently review exact hashes; do not manually set verified.',
  medical: 'Have an identified qualified reviewer check anatomical/clinical accuracy, interpretation and answer keys for exact bytes.',
  privacy: 'Have an authorized reviewer check identity/burned-in PHI, image metadata and redistribution/privacy obligations.',
  terminology: 'Review localized names/synonyms and typed-answer keys with an identified terminology reviewer.',
  release: 'After independent rights and signed medical/privacy/terminology review, run existing B1 inspector, receipt, attestation and isolated staging acceptance.',
  blocked: 'Keep the restricted input excluded; replace with licensed independent data or obtain an appropriately scoped written grant.',
});
const pendingReview = v => !v || v.status !== 'approved';
const idSort = (a, b) => a.localeCompare(b);

export function createBatchSnapshot({ catalog, resources, ledger, status, reviewers, decisions, policy }) {
  if (policy?.core?.accessModel !== 'free-for-all-learners' ||
      policy.core.paywallAllowed !== false || policy.core.subscriptionRequired !== false ||
      policy.optionalFuturePaidOffering?.mustNotRestrictCoreFeatures !== true)
    throw Error('MEDCOEL_FREE_CORE_POLICY_NOT_CONFIRMED');
  const canonical = catalog.studios.filter(s => !s.internal);
  if (canonical.length !== 24 || status.total !== canonical.length) throw Error('STUDIO_CATALOG_STATUS_MISMATCH');
  const byStatus = new Map(status.studios.map(s => [s.id, s]));
  if (byStatus.size !== canonical.length || canonical.some(s => !byStatus.has(s.id))) throw Error('STUDIO_STATUS_ID_MISMATCH');
  const bySource = new Map(resources.sources.map(s => [s.id, s]));
  const byAsset = new Map(resources.assets.map(a => [a.id, a]));
  const blockedRights = new Set(ledger.records.filter(r => r.status === 'blocked').map(r => r.id));
  const byRights = new Map(ledger.records.map(r => [r.id, r]));
  if (bySource.size !== resources.sources.length || byAsset.size !== resources.assets.length ||
      byRights.size !== ledger.records.length) throw Error('DUPLICATE_RIGHTS_OR_RESOURCE_IDS');
  if (!blockedRights.has('atlas-code') || !blockedRights.has('studio-res-brain-mri-lpba40'))
    throw Error('HISTORIC_NC_OR_LPBA40_BLOCK_MUST_REMAIN');
  const signedReviews = Array.isArray(decisions?.decisions) ? decisions.decisions.length : 0;
  const recordedReviewers = Array.isArray(reviewers?.reviewers) ? reviewers.reviewers.length : 0;
  const studios = canonical.map(c => {
    const stat = byStatus.get(c.id);
    const derived = resources.assets.filter(a => !a.sourceFile && a.id.startsWith(c.id + '.'));
    const sourceIds = [...new Set([...stat.sources.map(s => s.id), ...derived.map(a => a.sourceRef)])].sort(idSort);
    const sources = sourceIds.map(id => {
      const s = bySource.get(id);
      if (!s) throw Error('STUDIO_UNKNOWN_SOURCE:' + c.id + '/' + id);
      return { id, publisher: s.publisher, release: s.release, doi: s.doi || null, licenseId: s.licenseId, status: s.status, officialUrl: s.officialUrl, note: SOURCE_NOTES[id] || null };
    });
    const requiredRights = [...new Set([
      ...stat.rights.map(r => r.id),
      ...derived.map(a => a.rightsEvidenceRef),
    ])].sort(idSort);
    const rights = requiredRights.map(id => {
      const r = byRights.get(id);
      if (!r) throw Error('STUDIO_UNKNOWN_RIGHTS:' + c.id + '/' + id);
      return { id, status: r.status, reason: r.blockingReason || null };
    });
    const medicalPending = derived.filter(a => pendingReview(a.medicalReview)).length;
    const privacyPending = derived.filter(a => pendingReview(a.privacyReview)).length;
    const risks = [];
    if (!derived.length) risks.push('no-real-data');
    if (sources.some(s => s.status !== 'VERIFIED_SOURCE')) risks.push('source-license-review');
    if (rights.some(r => r.status === 'blocked')) risks.push('restricted-resource-blocked');
    if (rights.some(r => r.status !== 'verified')) risks.push('rights-evidence-pending');
    if (derived.length && medicalPending) risks.push('medical-review-pending');
    if (derived.length && privacyPending) risks.push('privacy-review-pending');
    if (derived.length && stat.reviews.terminology !== 'approved') risks.push('terminology-review-pending');
    if (!stat.releaseEligible || !stat.studentAccess) risks.push('release-gate-closed');
    const tasks = [];
    const add = (cond, label) => { if (cond && !tasks.includes(label)) tasks.push(label); };
    add(!derived.length, actionable.noRealData);
    add(sources.some(s => s.status !== 'VERIFIED_SOURCE'), actionable.sourceRights);
    add(rights.some(r => r.status === 'blocked'), actionable.blocked);
    add(rights.some(r => r.status !== 'verified'), actionable.fileRights);
    add(medicalPending > 0, actionable.medical);
    add(privacyPending > 0, actionable.privacy);
    add(derived.length && stat.reviews.terminology !== 'approved', actionable.terminology);
    add(true, actionable.release);
    const priority = stat.category === 'FUNCTIONAL_PRIVATE_REVIEW' ? 'A-source-documented'
      : stat.category === 'FUNCTIONAL_WITH_PENDING_CLEARANCE' ? 'B-source-questions'
      : 'C-need-real-data';
    return {
      id: c.id, category: stat.category, priority,
      sourceLicenses: sources, rights, derivedAssetCount: derived.length,
      exactAssetDigests: derived.map(a => ({ id: a.id, sha256: a.sha256 })).sort((a, b) => idSort(a.id, b.id)),
      pendingReviewCounts: { medical: medicalPending, privacy: privacyPending },
      terminology: stat.reviews.terminology,
      historicalBlockers: [...stat.rightsBlocked],
      risks, nextSteps: tasks,
      studentAccess: false,
      releaseAuthorizedByThisTool: false,
    };
  });
  const total = studios.length;
  const counts = {};
  for (const s of studios) counts[s.category] = (counts[s.category] || 0) + 1;
  return {
    schema: 'medcoel.clinical-clearance-batch.v1',
    origin: 'committed MEDCOEL catalog, resource registry, rights records and computed studio status',
    informationalOnly: true,
    product: { coreFreeForAll: true, paidCoreFeatureAllowed: false, possibleSeparatelyLicensedPaidQuestionVideos: true },
    releaseAuthorizedByThisTool: false,
    signedReviewerDecisionsRecorded: signedReviews,
    humanReviewersRegistered: recordedReviewers,
    totalStudios: total,
    counts, sourceConflicts: Object.fromEntries(
      Object.entries(SOURCE_NOTES).map(([id, note]) => [id, { note, currentStatus: bySource.get(id)?.status || 'MISSING' }])
    ),
    externalContacts: { dbcls: 'sent_by_owner_not_permission', loni: 'exception_declined_lpba40_blocked', amos: 'sent_by_owner_not_permission' },
    studios,
    remainingUnverified: studios.filter(s => !s.releaseAuthorizedByThisTool).length,
    important: 'A digest inventory and permissive source license cannot substitute for exact-file rights, authorized human reviews, medical/privacy checks, B1 inspector, receipt and attestation.',
  };
}
export function renderMarkdown(snapshot) {
  const heading = [
    '# MEDCOEL Clinical Studios — batched clearance worklist',
    '',
    '**PRELIMINARY / PRIVATE / NOT A LICENSE OR RELEASE APPROVAL.**',
    '',
    'MEDCOEL Core (24 studios, Atlas, 4D Lab and question bank) remains free. Optional paid question-explanation videos are separate content and require separate rights.',
    '',
    'Total: **' + snapshot.totalStudios + '** studios · Registered human reviewers: **' + snapshot.humanReviewersRegistered + '** · Review decisions in append-only log: **' + snapshot.signedReviewerDecisionsRecorded + '**.',
    '',
    'No public rights or student-access status is modified by this report. Missing original datasets, qualified reviewers and licensing clarifications cannot be supplied by GitHub CI.',
    '',
    '## Suggested execution sequence',
    '',
    '1. Start with the studios already using verified-source-license datasets (ECG, Chest CT, Spine MRI, Chest X-ray and obstetric fetal-head ultrasound): prepare real exact-hash rights/medical/privacy review packets. Do not claim approval.',
    '2. Complete BodyParts3D nine-studio exact FMA/FJ provenance with the private ZIP and select the lawful CC license route and ShareAlike notices.',
    '3. Keep LPBA40 blocked; independently validate a Harvard–Oxford atlas plus licensed aligned MRI underlay, or a reviewed SRI24 tissue-only candidate.',
    '4. Resolve the AMOS conflicting archive/Zenodo licenses; other seven fixture-only studios require independently licensed real resources and medical content.',
    '5. Resolve legacy NC Atlas frontend code separately from the nine independent studio apps; keep the 4D Lab license workstream distinct.',
    '6. Only after genuine source/asset clearance and human decisions, prepare the existing signed build receipt/attestation and test in isolated staging. No deployment during this phase.',
    '',
    '## Exact open source-license questions',
    '',
    ...Object.entries(snapshot.sourceConflicts).map(([id, v]) => '- **' + id + '** (' + v.currentStatus + '): ' + v.note),
    '',
    '## All studio work queues',
    '',
  ];
  for (const x of [...snapshot.studios].sort((a, b) => idSort(a.priority, b.priority) || idSort(a.id, b.id))) {
    heading.push('### ' + x.id + ' — ' + x.category,
      '', '**Priority:** ' + x.priority + ' · **Derived registered assets:** ' + x.derivedAssetCount +
      ' · **Outstanding asset reviews:** medical ' + x.pendingReviewCounts.medical + ', privacy ' + x.pendingReviewCounts.privacy + '.',
      '',
      '**Sources:** ' + (x.sourceLicenses.map(s => s.id + ' (' + s.licenseId + ', ' + s.status + ')').join('; ') || 'no real source'),
      '',
      '**Restricted rights:** ' + (x.historicalBlockers.join(', ') || 'none explicitly blocked; remaining rights may still be pending'),
      '',
      '**Next actions:**');
    x.nextSteps.forEach((step, i) => heading.push((i + 1) + '. ' + step));
    heading.push('');
  }
  heading.push('## Follow-up evidence instructions', '',
    '- Keep raw CT/MRI/ECG/ultrasound/GLB, private challenge keys, detailed review findings and contact replies off GitHub and public servers.',
    '- Record exact SHA-256 of all raw and transformed assets, publisher notice, original DOI and per-asset derivative lineage.',
    '- For named reviewers, use the existing signed review workflow: `node licensing/tools/studio-review.mjs package <studioId>`; then signed decisions against actual hashes.',
    '- Do not enter a fictitious reviewer, alter approval flags manually, or assume a sent licensing request is permission.',
    '- Before public access, run the canonical B1 inspector and signed release pipeline; this worklist is not a bypass.',
    '');
  return heading.join('\n');
}

/** PRIVATE DRAFT: a source list for a human rights reviewer, never a publication-ready NOTICE. */
export function renderRightsNoticeDraft(snapshot) {
  const sources = new Map();
  for (const studio of snapshot.studios) for (const src of studio.sourceLicenses) {
    const prev = sources.get(src.id);
    if (prev) prev.studios.push(studio.id);
    else sources.set(src.id, { ...src, studios: [studio.id] });
  }
  const out = [
    '# MEDCOEL — source attribution / rights NOTICE review draft',
    '',
    '**DRAFT ONLY; NOT FOR PUBLICATION, NOT A GRANT OF RIGHTS OR COMPLETE LEGAL ATTRIBUTION.**',
    '',
    'This table uses source metadata in the committed registry. It does not independently establish the upstream authors, the exact redistribution grant, third-party rights, ShareAlike compatibility, or clinical/privacy clearance.',
    '',
    'MEDCOEL Core remains free; hypothetical paid question videos need independently licensed content.',
    '',
    '## Sources and candidate credit records',
    '',
  ];
  for (const src of [...sources.values()].sort((a, b) => idSort(a.id, b.id))) {
    out.push('### ' + src.id, '', '- Publisher in source registry: ' + src.publisher,
      '- Release: ' + src.release,
      '- Registry license (NOT exact-file clearance): ' + src.licenseId,
      '- Source review status: ' + src.status,
      '- Source page: ' + src.officialUrl,
      '- DOI: ' + (src.doi || 'not recorded'),
      '- Studios: ' + src.studios.join(', '),
      '- Outstanding issue: ' + (src.note || 'Verify exact original-file license, attribution, modifications, derivative restrictions and credited contributors.'),
      '- Required reviewer work: inspect original file notices and credits; identify transformations and inherited licenses for each derivative; make a signed exact-build decision and publish only a human-approved NOTICE.',
      '');
  }
  out.push('## Do not conflate these items', '',
    '- The official source-license category with independent asset-level rights and patient-privacy obligations.',
    '- BodyParts3D original OBJ notices (CC BY-SA 2.1 Japan) with a later database-level CC BY 4.0 web page.',
    '- AMOS Zenodo license metadata with the internal archive dataset.json notice.',
    '- SRI24 T1/tissue rights with upstream LONI LPBA40-derived labels, which remain blocked.',
    '- Standalone Anatomy Studio Three.js code with the separate legacy NC Atlas frontend.',
    '',
    'Before publishing: add full authors/citations; verify exact source notice; document every conversion; include appropriate license links, share-alike terms and attribution; obtain authorized reviewers and signed release evidence.',
    '');
  return out.join('\\n');
}

export function checkBatch(snapshot, { catalog, resources, ledger }) {
  const issues = [];
  if (snapshot.totalStudios !== 24) issues.push('Expected exactly 24 Clinical Studios');
  if (snapshot.studios.some(s => s.studentAccess !== false || s.releaseAuthorizedByThisTool !== false))
    issues.push('Report must not grant student access');
  if (resources.sources.find(s => s.id === 'bodyparts3d-dbcls')?.status !== 'REVIEW_REQUIRED')
    issues.push('BodyParts3D license version is still under review');
  if (resources.sources.find(s => s.id === 'amos-zenodo')?.status !== 'REVIEW_REQUIRED')
    issues.push('AMOS embedded license conflict remains open');
  for (const id of ['studio-res-brain-mri-lpba40', 'atlas-code'])
    if (ledger.records.find(r => r.id === id)?.status !== 'blocked') issues.push('Restricted item must remain blocked: ' + id);
  if (catalog.studios.filter(s => !s.internal).some(s => s.release.status === 'publishable' && s.licensing.status !== 'verified'))
    issues.push('Publishable studio without verified licensing');
  return issues;
}
function writePrivate(relative, content) {
  if (!OUTPUT.startsWith(ROOT_PREFIX)) throw Error('OUTPUT_ESCAPES_PRIVATE_WORKSPACE');
  fs.mkdirSync(OUTPUT, { recursive: true, mode: 0o700 });
  const f = path.join(OUTPUT, relative);
  fs.writeFileSync(f, content, { mode: 0o600 });
  return path.relative(ROOT, f);
}
export function runPrivatePackages(snapshot) {
  const results = [];
  for (const studio of snapshot.studios) {
    if (studio.derivedAssetCount === 0) { results.push({ studio: studio.id, outcome: 'skipped-no-real-data' }); continue; }
    const build = path.join(ROOT, 'local-data/studio-resources/build', studio.id);
    if (!fs.existsSync(path.join(build, 'data')) || !fs.existsSync(path.join(build, 'provenance.json'))) {
      results.push({ studio: studio.id, outcome: 'skipped-no-private-build' }); continue;
    }
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'licensing/tools/studio-review.mjs'), 'package', studio.id],
        { cwd: ROOT, encoding: 'utf8', timeout: 90000, maxBuffer: 1024 * 1024 });
      results.push({ studio: studio.id, outcome: 'private-review-package-generated-not-approved' });
    } catch (e) {
      results.push({ studio: studio.id, outcome: 'review-package-error', error: String(e.message).slice(0, 240) });
    }
  }
  return results;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const flags = process.argv.slice(2);
  if (!flags.length || flags.some(s => !['--check', '--report', '--packages'].includes(s))) {
    console.error('Usage: node licensing/tools/clinical-clearance-batch.mjs --check | --report [--packages]');
    process.exitCode = 2;
  } else {
    const input = {
      catalog: read('shared/studios/catalog.v1.json'),
      resources: read('licensing/resources.v1.json'),
      ledger: read('licensing/commercial-rights-evidence.json'),
      status: read('docs/clinical-studios/studio-status.v1.json'),
      reviewers: read('licensing/reviews/reviewers.v1.json'),
      decisions: read('licensing/reviews/decisions.v1.json'),
      policy: read('licensing/medcoel-usage-intent.v1.json'),
    };
    const snapshot = createBatchSnapshot(input);
    const issues = checkBatch(snapshot, input);
    if (issues.length) {
      console.error('Fail-closed issues:\n' + issues.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('Clearance worklist validated: ' + snapshot.totalStudios +
        ' studios; statuses ' + JSON.stringify(snapshot.counts) + '; actual public releases NOT authorized.');
      if (flags.includes('--report')) {
        const files = [
          writePrivate('clinical-clearance-worklist.json', JSON.stringify(snapshot, null, 2) + '\n'),
          writePrivate('clinical-clearance-worklist.md', renderMarkdown(snapshot)),
          writePrivate('source-rights-NOTICE-REVIEW-DRAFT.md', renderRightsNoticeDraft(snapshot)),
        ];
        console.log('Private outputs: ' + files.join(', '));
      }
      if (flags.includes('--packages')) {
        if (!flags.includes('--report')) throw Error('--packages requires --report');
        const outcomes = runPrivatePackages(snapshot);
        const file = writePrivate('private-package-execution.json', JSON.stringify(outcomes, null, 2) + '\n');
        console.log('Private human-review package generation: ' + file + ' (' + outcomes.filter(x => x.outcome.startsWith('private-review')).length + ' generated; no approvals)');
        if (outcomes.some(x => x.outcome === 'review-package-error')) process.exitCode = 1;
      }
    }
  }
}
