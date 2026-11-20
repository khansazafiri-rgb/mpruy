#!/usr/bin/env node
// Registers the ACQUIRED Clinical Studio resources in the existing resource index (licensing/resources.v1.json) and the
// existing rights ledger (commercial-rights-evidence.json), from the provenance files written by the preparation tools
// in local-data/. Every record is honest about its state: sources carry their retained licence evidence; assets and
// rights records stay "needs-review" / pending until a human rights, privacy and medical review signs the exact bytes.
// Nothing here can make a studio eligible: the B1 inspector still refuses unverified rights and pending reviews.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const BUILD = path.join(REPO, 'local-data/studio-resources/build');
const EVID = path.join(REPO, 'local-data/studio-resources/evidence');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const snapshot = f => (fs.existsSync(path.join(EVID, f)) ? sha(fs.readFileSync(path.join(EVID, f))) : null);
const today = '2026-11-20';

export const SOURCES = [
  { id: 'sri24-nitrc', publisher: 'SRI International / NITRC (Rohlfing et al.)', officialUrl: 'https://www.nitrc.org/projects/sri24/', datasetId: 'sri24', release: 'NITRC frs release (archives dated 2012-03-12)', doi: '10.1002/hbm.20906', licenseId: 'CC-BY-SA-3.0', status: 'REVIEW_REQUIRED',
    evidence: [{ url: 'https://www.nitrc.org/frs/download.php/4499/sri24_anatomy_nifti.zip', release: 'sri24_anatomy_nifti.zip', checkedAt: today, snapshotSha256: '35b6ea8bfe7c3d060001a55ed51ca826f6d9320194e2b93b0505069919472b90' }],
    note: 'Licence text inside the official archive: CC BY-SA 3.0 Unported. LPBA40 and AAL-derived label sets are third-party atlases redistributed by the SRI24 authors: upstream terms need legal review.' },
  { id: 'ptbxl-physionet', publisher: 'PhysioNet (Wagner et al.)', officialUrl: 'https://physionet.org/content/ptb-xl/1.0.3/', datasetId: 'ptb-xl', release: '1.0.3', doi: '10.13026/kfzx-aw45', licenseId: 'CC-BY-4.0', status: 'VERIFIED_SOURCE',
    evidence: [{ url: 'https://physionet.org/files/ptb-xl/1.0.3/LICENSE.txt', release: '1.0.3', checkedAt: today, snapshotSha256: '9a78e7f22742dde9f66ae235ec793ba2212019dc4d0ced75c4da09ced0b35fb2' }],
    note: 'LICENSE.txt digest equals the entry in the official SHA256SUMS.txt.' },
  { id: 'lidc-idri-tcia', publisher: 'The Cancer Imaging Archive (LIDC/IDRI consortium)', officialUrl: 'https://www.cancerimagingarchive.net/collection/lidc-idri/', datasetId: 'lidc-idri', release: 'TCIA collection (updated 2023-11-20)', doi: '10.7937/K9/TCIA.2015.LO9QL9SX', licenseId: 'CC-BY-3.0', status: 'VERIFIED_SOURCE',
    evidence: [{ url: 'https://services.cancerimagingarchive.net/nbia-api/services/v1/getSeries?Collection=LIDC-IDRI&PatientID=LIDC-IDRI-0001', release: 'NBIA API 2026-11-20', checkedAt: today, snapshotSha256: snapshot('lidc-collection.html') }],
    note: 'Licence stated per series by the NBIA API and on the collection page; TCIA data usage policy and citation requirements apply.' },
  { id: 'spider-zenodo', publisher: 'Zenodo (van der Graaf et al., Radboudumc)', officialUrl: 'https://zenodo.org/records/10159290', datasetId: 'spider-lumbar-spine', release: 'Zenodo record 10159290', doi: '10.5281/zenodo.10159290', licenseId: 'CC-BY-4.0', status: 'VERIFIED_SOURCE',
    evidence: [{ url: 'https://zenodo.org/api/records/10159290', release: 'Zenodo record 10159290', checkedAt: today, snapshotSha256: '8be46e77b0e560046f0518bd1c301000226b516cc3d600ea44a28b277452dc78' }],
    note: 'Licence cc-by-4.0 in the official Zenodo record metadata; single members fetched by HTTP Range with ZIP CRC verified.' },
  { id: 'bodyparts3d-dbcls', publisher: 'Database Center for Life Science (DBCLS)', officialUrl: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/', datasetId: 'bodyparts3d', release: '4.0 (isa_BP3D_4.0_obj_99)', doi: null, licenseId: 'CC-BY-SA-2.1-JP', status: 'REVIEW_REQUIRED',
    evidence: [{ url: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip', release: '4.0', checkedAt: today, snapshotSha256: '40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e' }],
    note: 'OBJ headers: CC BY-SA 2.1 Japan; DBCLS website (2025-02-27): CC BY 4.0. Discrepancy unresolved; SA 2.1 JP is not on the B1 allow-list.' },
];

const STUDIO_DATA = {
  'brain-mri': { source: 'sri24-nitrc', nature: 'population-template', protected: false, licence: 'CC-BY-SA-3.0', kinds: { 'data/t1.nii.gz': ['volume', 'NIfTI-1 gz'], 'data/labels-lpba40.nii.gz': ['annotation', 'NIfTI-1 gz'], 'data/tissues.nii.gz': ['annotation', 'NIfTI-1 gz'], 'data/labels.json': ['terminology', 'JSON'] }, notice: 'data/NOTICE-SRI24.txt' },
  ecg: { source: 'ptbxl-physionet', nature: 'acquired-patient', protected: true, licence: 'CC-BY-4.0', kinds: null, notice: 'data/NOTICE-PTB-XL.txt' },
  'spine-mri': { source: 'spider-zenodo', nature: 'acquired-patient', protected: true, licence: 'CC-BY-4.0', kinds: { 'data/t1.nii.gz': ['volume', 'NIfTI-1 gz (from MetaImage)'], 'data/labels-lpba40.nii.gz': ['annotation', 'NIfTI-1 gz (from MetaImage mask)'], 'data/labels.json': ['terminology', 'JSON'] }, notice: 'data/NOTICE-SPIDER.txt' },
  'chest-ct': { source: 'lidc-idri-tcia', nature: 'acquired-patient', protected: true, licence: 'CC-BY-3.0', kinds: { 'data/ct.nii.gz': ['volume', 'NIfTI-1 gz (from DICOM)'], 'data/readers.nii.gz': ['annotation', 'NIfTI-1 gz (from DICOM SEG)'], 'data/annotations.json': ['annotation', 'JSON'] }, notice: 'data/NOTICE-LIDC-IDRI.txt' },
};
for (const id of ['brain-anatomy', 'head-neck-anatomy', 'spine-anatomy', 'thorax-anatomy', 'heart-anatomy', 'abdomen-anatomy', 'pelvis-anatomy', 'upper-limb-anatomy', 'lower-limb-anatomy']) {
  STUDIO_DATA[id] = { source: 'bodyparts3d-dbcls', nature: 'derived', protected: false, licence: 'CC-BY-SA-2.1-JP', kinds: { 'data/model.glb': ['mesh', 'glTF 2.0 binary'], 'data/structures.json': ['terminology', 'JSON'] }, notice: 'data/NOTICE-BodyParts3D.txt' };
}

const pending = { status: 'pending', reviewer: '', reviewedAt: null, reviewedSha256: null, scope: [], reason: 'Awaiting human review of the exact bytes and intended educational use.' };

export function register() {
  // Evidence entries name the exact release they cover (validator requirement).
  const resources = { schemaVersion: 1, sources: SOURCES.map(({ note, ...s }) => ({ ...s, evidence: s.evidence.map(e => ({ ...e, release: s.release })) })), assets: [] };
  const evidence = JSON.parse(fs.readFileSync(path.join(REPO, 'licensing/commercial-rights-evidence.json'), 'utf8'));
  evidence.records = evidence.records.filter(r => !String(r.id).startsWith('studio-res-'));
  const report = [];
  for (const [studio, cfg] of Object.entries(STUDIO_DATA)) {
    const prov = path.join(BUILD, studio, 'provenance.json');
    if (!fs.existsSync(prov)) { report.push({ studio, registered: 0, reason: 'no local provenance' }); continue; }
    const p = JSON.parse(fs.readFileSync(prov, 'utf8'));
    const src = SOURCES.find(s => s.id === cfg.source);
    const rightsId = 'studio-res-' + studio;
    const notice = p.outputs[cfg.notice];
    const files = Object.entries(p.outputs).filter(([k]) => k.startsWith('data/') && !/NOTICE|LICENSE|dataset\.json/.test(k));
    const scope = [];
    for (const [rel, out] of files) {
      const [kind, format] = (cfg.kinds && cfg.kinds[rel]) || (rel.startsWith('data/cases/') ? ['waveform', 'JSON (WFDB format-16 samples, gain, baseline, fs)'] : ['annotation', 'JSON']);
      scope.push(rel);
      resources.assets.push({ id: (studio + '.' + rel.replace(/^data\//, '').replace(/\//g, '-')).toLowerCase(), version: '1', datasetId: src.datasetId, sourceRef: src.id, kind, dataNature: cfg.nature, format, path: rel,
        bytes: out.bytes, sha256: out.sha256, protected: cfg.protected, rightsEvidenceRef: rightsId, attributionRef: rightsId, notice: { path: cfg.notice, sha256: notice ? notice.sha256 : null },
        dependsOn: [], derivation: { operation: 'convert', tool: p.tool, toolVersion: '1', pipelineCommit: '0'.repeat(40), parametersSha256: sha(JSON.stringify(p.validation || {})) },
        geometry: kind === 'terminology' ? null : { spaceId: studio.endsWith('anatomy') ? 'BodyParts3D mm (+X patient left)' : kind === 'waveform' ? 'time series' : 'NIfTI RAS mm', units: kind === 'waveform' ? 'mV @ 500 Hz' : 'mm', details: 'See provenance validation (local-data); attestation only, not a parser.' },
        medicalReview: { ...pending }, privacyReview: { ...pending }, sourceFile: null });
    }
    evidence.records.push({ id: rightsId, products: ['studio:' + studio], scope, source: src.publisher + ' — ' + src.officialUrl, sourceRevision: src.release, sourceLicense: cfg.licence,
      sourceCommercialUse: true, provenance: 'source-confirmed', status: 'needs-review', dependencies: [],
      evidence: [{ kind: 'upstream-license', url: src.evidence[0].url }],
      blockingReason: 'Acquired from the official source with retained licence evidence and checksums, but the exact derived bytes have no human rights, privacy and medical review yet' + (src.status === 'REVIEW_REQUIRED' ? '; source licence question open: ' + SOURCES.find(s => s.id === cfg.source).note : '.') });
    report.push({ studio, registered: files.length, source: src.id, licence: cfg.licence });
  }
  fs.writeFileSync(path.join(REPO, 'licensing/resources.v1.json'), JSON.stringify(resources, null, 2) + '\n');
  fs.writeFileSync(path.join(REPO, 'licensing/commercial-rights-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.table(register());
