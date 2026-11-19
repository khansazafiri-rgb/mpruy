// Evidence reconciliation, NOT a rights grant or live deployment scan.
// Separate *implemented compliance controls* from *verified commercial rights*.
// No network calls, no production writes, and no release-manifest mutation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (root, name) => fs.readFileSync(path.join(root, name), 'utf8');
const json = (root, name) => JSON.parse(read(root, name));
const exists = (root, name) => fs.existsSync(path.join(root, name));

export function summarizeRights(evidence, release) {
  if (!Array.isArray(evidence?.records) || !release?.products)
    throw new Error('Expected MEDCOEL commercial-rights ledger and release policy.');
  const records = evidence.records;
  const count = status => records.filter(r => r.status === status).length;
  const products = {};
  for (const id of ['atlas-viewer', '4d-lab']) {
    const policy = release.products[id];
    if (!policy) throw new Error('Release manifest missing product ' + id);
    const relevant = records.filter(r => r.products?.includes(id));
    products[id] = {
      releaseStatus: policy.status,
      exactApprovedBuilds: policy.approvedBuilds?.length || 0,
      records: relevant.length,
      verifiedRights: relevant.filter(r => r.status === 'verified').length,
      unresolvedIds: relevant.filter(r => r.status !== 'verified').map(r => r.id),
      blockedForCommercialRelease: policy.status !== 'cleared' ||
        relevant.some(r => r.status !== 'verified') || !policy.approvedBuilds?.length,
    };
  }
  return { records: records.length, verified: count('verified'),
    blocked: count('blocked'), needsReview: count('needs-review'), products };
}

export function inspectImplementedControls(root = ROOT) {
  const anatomy = json(root, 'apps/anatomy/package.json');
  const lab = json(root, 'apps/4d-lab/package.json');
  const policy = json(root, 'licensing/quarantine-policy.json');
  const anatomyDataset = json(root, 'apps/4d-lab/public/data/atlas/anatomy.json');
  const caddy = read(root, 'deploy/anatomy.caddy.snippet');
  const atlasLicence = read(root, 'apps/anatomy/public/LICENSE');
  const labNotice = read(root, 'apps/4d-lab/public/data/atlas/NOTICE.txt');
  const officialSources = [
    'apps/anatomy/index.html',
    'apps/anatomy/src/atlas/engine.js',
    'apps/anatomy/src/atlas/ui.js',
    'apps/anatomy/SOURCE-PUBLICATION.md',
    'apps/anatomy/INTEGRATION-PROVENANCE.json',
  ];
  const withheld = policy.quarantinedFiles || [];
  const blockedNervous = withheld.some(x => x.path === 'apps/anatomy/public/models/nervous.glb');
  const modelHashes = anatomyDataset.build?.sourceModels || {};
  const sixSourceModels = ['skeletal','muscular','joints','cardiovascular','lymphatic','visceral']
    .every(s => /^[a-f0-9]{64}$/.test(modelHashes[s + '.glb'] || ''));
  const checks = [
    { id:'published-source-tree', passed:officialSources.every(p=>exists(root,p)),
      description:'Anatomy source, documentation and source provenance are tracked. Public GitHub visibility must be confirmed separately.' },
    { id:'separate-viewer-app', passed:exists(root,'apps/web/package.json') &&
        exists(root,'apps/anatomy/package.json') &&
        caddy.includes('handle_path /anatomy/viewer/*') &&
        caddy.includes('/var/lib/medcoel/anatomy-viewer'),
      description:'Independent Anatomy Vite package and dedicated static release mount are defined. This does not prove a second VPS is live.' },
    { id:'attribution-present', passed:exists(root,'apps/anatomy/NOTICE') &&
        exists(root,'apps/anatomy/public/models/License.txt') &&
        exists(root,'apps/4d-lab/public/data/atlas/NOTICE.txt'),
      description:'Attribution and adaptation notices are tracked, subject to exact-release checks.' },
    { id:'known-nc-model-quarantine', passed:blockedNervous &&
        !exists(root,'apps/anatomy/public/models/nervous.glb') &&
        ['Kidney.l','Kidney.r','Renal pelvis.l','Renal pelvis.r']
          .every(n=>policy.quarantinedStructures?.visceral?.includes(n)) &&
        ['Malleus.l','Malleus.r','Incus.l','Incus.r','Stapes.l','Stapes.r']
          .every(n=>policy.quarantinedStructures?.skeletal?.includes(n)),
      description:'Known NC or ambiguous nervous, kidney/pelvis and ear ossicles are excluded from current candidate.' },
    { id:'atlas-ct-rebuild-trace', passed:sixSourceModels &&
        Array.isArray(anatomyDataset.build?.quarantinePolicy?.excludedStructures) &&
        anatomyDataset.build?.quarantinePolicy?.excludedSystems?.includes('nervous') &&
        labNotice.includes('EXCLUDED'),
      description:'CT input hashes and excluded structures are recorded; their upstream licence/geometry provenance is not proven by hashes.' },
    { id:'nc-source-acknowledged', passed:anatomy.license === 'CC-BY-NC-SA-4.0' &&
        atlasLicence.includes('Application source code') && atlasLicence.includes('CC BY-NC-SA 4.0'),
      description:'Third-party application NC source licence is explicitly preserved, NOT commercially cleared by opening code.' },
    { id:'lab-code-ownership-not-inferred-from-license-field', passed:typeof lab.license === 'string',
      description:'The 4D Lab package licence field exists; source authorship/permission still requires evidence.' },
  ];
  return checks;
}

export function generateReconciliation(root=ROOT) {
  const rights = summarizeRights(
    json(root, 'licensing/commercial-rights-evidence.json'),
    json(root, 'licensing/commercial-release.json'));
  const checks = inspectImplementedControls(root);
  return {
    reportType: 'rights-gap-reconciliation-not-clearance',
    rule: 'Repository controls and public source availability are not copyright ownership, upstream commercial permission, or an exact-release approval.',
    trackedControls: {total:checks.length, present:checks.filter(c=>c.passed).length, checks},
    rights,
    unverifiedLiveFacts: ['second physical VM status', 'current medcoel.com asset responses',
      'actual active release', 'public caches / historic Git exposures'],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = generateReconciliation();
    console.log(JSON.stringify(report, null, 2));
    if (report.trackedControls.checks.some(c=>!c.passed)) process.exitCode=1;
    // Do NOT return nonzero merely because legal rights are pending: the
    // separate --require-clearance audit and commercial staging gates enforce that.
  } catch (err) { console.error(err); process.exitCode=1; }
}
