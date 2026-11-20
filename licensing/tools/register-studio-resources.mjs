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
  { id: 'ptx498-zenodo', publisher: 'Zenodo (Wang et al., PTX-498)', officialUrl: 'https://zenodo.org/records/8266529', datasetId: 'ptx-498', release: 'v2-fix (Zenodo record 8266529)', doi: '10.5281/zenodo.8266529', licenseId: 'CC-BY-4.0', status: 'VERIFIED_SOURCE',
    evidence: [{ url: 'https://zenodo.org/api/records/8266529', release: 'v2-fix (Zenodo record 8266529)', checkedAt: today, snapshotSha256: snapshot('zenodo-8266529.json') }],
    note: 'Licence cc-by-4.0 in the official Zenodo record metadata (no licence file inside the archive); images anonymised by the publisher; all cases are pneumothorax-positive.' },
  { id: 'hc18-zenodo', publisher: 'Zenodo (van den Heuvel et al., HC18)', officialUrl: 'https://zenodo.org/records/1327317', datasetId: 'hc18', release: 'Zenodo record 1327317', doi: '10.5281/zenodo.1327317', licenseId: 'CC-BY-4.0', status: 'VERIFIED_SOURCE',
    evidence: [{ url: 'https://zenodo.org/api/records/1327317', release: 'Zenodo record 1327317', checkedAt: today, snapshotSha256: snapshot('zenodo-1327317.json') }],
    note: 'Licence cc-by-4.0 in the official Zenodo record metadata. Obstetric fetal-head ultrasound: the pelvis-ultrasound clinical scope needs an owner/educator decision.' },
  { id: 'amos-zenodo', publisher: 'Zenodo (Ji et al., AMOS 2022)', officialUrl: 'https://zenodo.org/records/7262581', datasetId: 'amos22', release: 'amos22.zip (Zenodo record 7262581)', doi: '10.5281/zenodo.7262581', licenseId: 'CC-BY-SA-4.0', status: 'REVIEW_REQUIRED',
    evidence: [{ url: 'https://zenodo.org/api/records/7262581', release: 'amos22.zip (Zenodo record 7262581)', checkedAt: today, snapshotSha256: snapshot('zenodo-7262581.json') }],
    note: 'Discrepancy: Zenodo record metadata says cc-by-4.0, the archive\'s own dataset.json says CC-BY-SA 4.0. The stricter SA terms are recorded until the publisher clarifies.' },
];

const STUDIO_DATA = {
  'brain-mri': { source: 'sri24-nitrc', nature: 'population-template', protected: false, licence: 'CC-BY-SA-3.0', kinds: { 'data/t1.nii.gz': ['volume', 'NIfTI-1 gz'], 'data/labels-lpba40.nii.gz': ['annotation', 'NIfTI-1 gz'], 'data/tissues.nii.gz': ['annotation', 'NIfTI-1 gz'], 'data/labels.json': ['terminology', 'JSON'] }, notice: 'data/NOTICE-SRI24.txt' },
  ecg: { source: 'ptbxl-physionet', nature: 'acquired-patient', protected: true, licence: 'CC-BY-4.0', kinds: null, notice: 'data/NOTICE-PTB-XL.txt' },
  'spine-mri': { source: 'spider-zenodo', nature: 'acquired-patient', protected: true, licence: 'CC-BY-4.0', kinds: { 'data/t1.nii.gz': ['volume', 'NIfTI-1 gz (from MetaImage)'], 'data/labels-lpba40.nii.gz': ['annotation', 'NIfTI-1 gz (from MetaImage mask)'], 'data/labels.json': ['terminology', 'JSON'] }, notice: 'data/NOTICE-SPIDER.txt' },
  'chest-ct': { source: 'lidc-idri-tcia', nature: 'acquired-patient', protected: true, licence: 'CC-BY-3.0', kinds: { 'data/ct.nii.gz': ['volume', 'NIfTI-1 gz (from DICOM)'], 'data/readers.nii.gz': ['annotation', 'NIfTI-1 gz (from DICOM SEG)'], 'data/annotations.json': ['annotation', 'JSON'] }, notice: 'data/NOTICE-LIDC-IDRI.txt' },
};
STUDIO_DATA['abdomen-ct'] = { source: 'amos-zenodo', nature: 'acquired-patient', protected: true, licence: 'CC-BY-SA-4.0', kinds: { 'data/ct.nii.gz': ['volume', 'NIfTI-1 gz (header text cleared)'], 'data/labels.nii.gz': ['annotation', 'NIfTI-1 gz (uint8, kidney labels withheld)'], 'data/labels.json': ['terminology', 'JSON'] }, notice: 'data/NOTICE-AMOS.txt' };
for (const [id, source, notice] of [['chest-xray', 'ptx498-zenodo', 'data/NOTICE-PTX-498.txt'], ['pelvis-ultrasound', 'hc18-zenodo', 'data/NOTICE-HC18.txt']]) {
  const kinds = {}; for (let n = 1; n <= 4; n++) { kinds['data/image-' + n + '.png'] = ['image', 'PNG greyscale (re-encoded, no metadata chunks)']; kinds['data/annotations-' + n + '.json'] = ['annotation', 'JSON polygons (from reference mask/contour)']; }
  STUDIO_DATA[id] = { source, nature: 'acquired-patient', protected: true, licence: 'CC-BY-4.0', kinds, notice };
}
for (const id of ['brain-anatomy', 'head-neck-anatomy', 'spine-anatomy', 'thorax-anatomy', 'heart-anatomy', 'abdomen-anatomy', 'pelvis-anatomy', 'upper-limb-anatomy', 'lower-limb-anatomy']) {
  STUDIO_DATA[id] = { source: 'bodyparts3d-dbcls', nature: 'derived', protected: false, licence: 'CC-BY-SA-2.1-JP', kinds: { 'data/model.glb': ['mesh', 'glTF 2.0 binary'], 'data/structures.json': ['terminology', 'JSON'] }, notice: 'data/NOTICE-BodyParts3D.txt' };
}

/** Official raw inputs (the exact files acquired), one parent asset each. Paths are logical ("source/..."), never shipped. */
const RAW = path.join(REPO, 'local-data/studio-resources/raw'), BP3D = path.join(REPO, 'local-data/licensing-quarantine/bp3d-4.0');
function rawInputs(sourceId) {
  const f = (file, url, member, kind, fmt) => ({ file, url, member, kind, fmt });
  if (sourceId === 'sri24-nitrc') return [
    f(path.join(RAW, 'sri24/sri24_anatomy_nifti.zip'), 'https://www.nitrc.org/frs/download.php/4499/sri24_anatomy_nifti.zip', 'sri24_anatomy_nifti.zip', 'volume', 'ZIP of NIfTI-1'),
    f(path.join(RAW, 'sri24/sri24_labels_nifti.zip'), 'https://www.nitrc.org/frs/download.php/4508/sri24_labels_nifti.zip', 'sri24_labels_nifti.zip', 'annotation', 'ZIP of NIfTI-1'),
    f(path.join(RAW, 'sri24/sri24_tissue_nifti.zip'), 'https://www.nitrc.org/frs/download.php/4511/sri24_tissue_nifti.zip', 'sri24_tissue_nifti.zip', 'annotation', 'ZIP of NIfTI-1')];
  if (sourceId === 'ptbxl-physionet') {
    const recs = ['00000/00003', '00000/00023', '00000/00286', '00000/00903', '02000/02509', '04000/04117'];
    return [f(path.join(RAW, 'ptbxl/ptbxl_database.csv'), 'https://physionet.org/files/ptb-xl/1.0.3/ptbxl_database.csv', 'ptbxl_database.csv', 'annotation', 'CSV'),
      ...recs.flatMap(r => ['hea', 'dat'].map(e => f(path.join(RAW, 'ptbxl/records500', r + '_hr.' + e), 'https://physionet.org/files/ptb-xl/1.0.3/records500/' + r + '_hr.' + e, 'records500/' + r + '_hr.' + e, 'waveform', 'WFDB ' + e)))];
  }
  if (sourceId === 'lidc-idri-tcia') {
    const api = 'https://services.cancerimagingarchive.net/nbia-api/services/v1/getImage?SeriesInstanceUID=';
    return ['CT', 'SEG'].flatMap(m => fs.readdirSync(path.join(RAW, 'lidc', m)).filter(z => z.endsWith('.zip')).sort().map(z => f(path.join(RAW, 'lidc', m, z), api + z.replace(/\.zip$/, ''), m + '/' + z, m === 'CT' ? 'volume' : 'annotation', 'ZIP of DICOM ' + m)));
  }
  if (sourceId === 'spider-zenodo') return [
    f(path.join(RAW, 'spider/1_t2.mha'), 'https://zenodo.org/api/records/10159290/files/images.zip/content', 'images/1_t2.mha', 'volume', 'MetaImage (ZIP member, CRC verified)'),
    f(path.join(RAW, 'spider/1_t2_mask.mha'), 'https://zenodo.org/api/records/10159290/files/masks.zip/content', 'masks/1_t2.mha', 'annotation', 'MetaImage (ZIP member, CRC verified)')];
  if (sourceId === 'bodyparts3d-dbcls') return [
    f(path.join(BP3D, 'isa_BP3D_4.0_obj_99.zip'), 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip', 'isa_BP3D_4.0_obj_99.zip', 'mesh', 'ZIP of OBJ'),
    f(path.join(BP3D, 'isa_element_parts.txt'), 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt', 'isa_element_parts.txt', 'terminology', 'TSV'),
    f(path.join(BP3D, 'isa_parts_list_e.txt'), 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt', 'isa_parts_list_e.txt', 'terminology', 'TSV')];
  if (sourceId === 'ptx498-zenodo') {
    const url = 'https://zenodo.org/api/records/8266529/files/PTX-498-v2-fix.zip/content';
    return ['SiteA/1', 'SiteA/10', 'SiteB/1', 'SiteC/1'].flatMap(c => [[c + '.1.img.png', 'image'], [c + '.2.mask.png', 'annotation']].map(([m, k]) => f(path.join(RAW, 'ptx498', m), url, m, k, 'PNG (ZIP member, CRC verified)')));
  }
  if (sourceId === 'hc18-zenodo') {
    const url = 'https://zenodo.org/api/records/1327317/files/training_set.zip/content';
    return [f(path.join(RAW, 'hc18/training_set_pixel_size_and_HC.csv'), 'https://zenodo.org/api/records/1327317/files/training_set_pixel_size_and_HC.csv/content', 'training_set_pixel_size_and_HC.csv', 'annotation', 'CSV (pixel size, reference HC)'),
      ...['000', '010', '100', '300'].flatMap(n => [[n + '_HC.png', 'image'], [n + '_HC_Annotation.png', 'annotation']].map(([m, k]) => f(path.join(RAW, 'hc18/training_set', m), url, 'training_set/' + m, k, 'PNG (ZIP member, CRC verified)')))];
  }
  if (sourceId === 'amos-zenodo') {
    const url = 'https://zenodo.org/api/records/7262581/files/amos22.zip/content';
    return [['dataset.json', 'terminology', 'JSON label table'], ['imagesTr/amos_0004.nii.gz', 'volume', 'NIfTI-1 gz (ZIP64 member, CRC verified)'], ['labelsTr/amos_0004.nii.gz', 'annotation', 'NIfTI-1 gz (ZIP64 member, CRC verified)']]
      .map(([m, k, fmt]) => f(path.join(RAW, 'amos/amos22', m), url, 'amos22/' + m, k, fmt));
  }
  return [];
}
const TOOLS = { 'abdomen-ct': 'apps/studios/tools/prepare-abdomen-ct.mjs', 'chest-xray': 'apps/studios/tools/prepare-image2d.mjs', 'pelvis-ultrasound': 'apps/studios/tools/prepare-image2d.mjs', 'brain-mri': 'apps/studios/tools/prepare-brain-mri.mjs', ecg: 'apps/studios/tools/prepare-ecg.mjs', 'chest-ct': 'apps/studios/tools/prepare-chest-ct.mjs', 'spine-mri': 'apps/studios/tools/prepare-spine-mri.mjs' };
const toolFor = studio => TOOLS[studio] || 'apps/studios/tools/prepare-bp3d-region.mjs';
/** Exact processing evidence: the commit whose tool reproduced every registered byte (checked by --verify). */
const PROCESSING_COMMIT = process.env.MEDCOEL_PROCESSING_COMMIT || '';

const pending = { status: 'pending', reviewer: '', reviewedAt: null, reviewedSha256: null, scope: [], reason: 'Awaiting human review of the exact bytes and intended educational use.' };

export function register() {
  // Evidence entries name the exact release they cover (validator requirement).
  // Evidence entries name the exact release they cover (validator requirement).
  const resources = { schemaVersion: 1, sources: SOURCES.map(({ note, ...s }) => ({ ...s, evidence: s.evidence.map(e => ({ ...e, release: s.release })) })), assets: [] };
  const evidence = JSON.parse(fs.readFileSync(path.join(REPO, 'licensing/commercial-rights-evidence.json'), 'utf8'));
  evidence.records = evidence.records.filter(r => !String(r.id).startsWith('studio-res-') && !String(r.id).startsWith('studio-src-'));
  if (!/^[a-f0-9]{40}$/.test(PROCESSING_COMMIT)) throw Error('Set MEDCOEL_PROCESSING_COMMIT to the exact commit whose tools reproduced the outputs');
  const report = [], parentsBySource = {};
  const studiosBySource = {};
  for (const [studio, cfg] of Object.entries(STUDIO_DATA)) (studiosBySource[cfg.source] = studiosBySource[cfg.source] || []).push(studio);
  // 1. Parent assets: the official raw inputs, hashed now from the retained acquisition.
  for (const src of SOURCES) {
    const inputs = rawInputs(src.id).filter(i => fs.existsSync(i.file));
    if (!inputs.length) continue;
    const rightsId = 'studio-src-' + src.id, cfg = STUDIO_DATA[studiosBySource[src.id][0]];
    parentsBySource[src.id] = inputs.map(i => {
      const b = fs.readFileSync(i.file), h = sha(b);
      const a = { id: ('src.' + src.id + '.' + i.member).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 100), version: src.release.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) || '1', datasetId: src.datasetId, sourceRef: src.id,
        kind: i.kind, dataNature: cfg.nature === 'derived' ? 'population-template' : cfg.nature, format: i.fmt, path: 'source/' + src.id + '/' + i.member.replace(/[^A-Za-z0-9._/-]+/g, '-'), bytes: b.length, sha256: h, protected: true,
        rightsEvidenceRef: rightsId, attributionRef: rightsId, notice: { path: 'source/' + src.id + '/NOTICE', sha256: null }, dependsOn: [], derivation: null,
        geometry: i.kind === 'terminology' ? null : { spaceId: 'as distributed by the publisher', units: i.kind === 'waveform' ? 'adu (WFDB header gain to mV)' : 'mm', details: 'Original distribution file; geometry is read by the preparation tool.' },
        medicalReview: { ...pending }, privacyReview: { ...pending }, sourceFile: { url: i.url, member: i.member, sha256: h } };
      resources.assets.push(a);
      return a;
    });
    evidence.records.push({ id: rightsId, products: studiosBySource[src.id].map(x => 'studio:' + x), scope: parentsBySource[src.id].map(a => a.path), source: src.publisher + ' — ' + src.officialUrl,
      sourceRevision: src.release, sourceLicense: cfg.licence, sourceCommercialUse: true, provenance: 'source-confirmed', status: 'needs-review', dependencies: [],
      evidence: [{ kind: 'upstream-license', url: src.evidence[0].url }],
      blockingReason: 'Official raw inputs retained privately with exact digests; licence, redistribution and privacy obligations still need a human rights review' + (src.status === 'REVIEW_REQUIRED' ? ' (open question: ' + src.note + ')' : '.') });
  }
  // 2. Derived assets: converted outputs bound to their parents with the exact processing commit and tool digest.
  for (const [studio, cfg] of Object.entries(STUDIO_DATA)) {
    const prov = path.join(BUILD, studio, 'provenance.json');
    if (!fs.existsSync(prov)) { report.push({ studio, registered: 0, reason: 'no local provenance' }); continue; }
    const p = JSON.parse(fs.readFileSync(prov, 'utf8'));
    const src = SOURCES.find(s => s.id === cfg.source);
    const parents = parentsBySource[cfg.source] || [];
    const rightsId = 'studio-res-' + studio;
    const notice = p.outputs[cfg.notice];
    const tool = toolFor(studio), toolSha = sha(fs.readFileSync(path.join(REPO, tool)));
    const files = Object.entries(p.outputs).filter(([k]) => k.startsWith('data/') && !/NOTICE|LICENSE|dataset\.json/.test(k));
    const scope = [];
    for (const [rel, out] of files) {
      const onDisk = sha(fs.readFileSync(path.join(BUILD, studio, rel)));
      if (onDisk !== out.sha256) throw Error('Output on disk differs from provenance: ' + studio + '/' + rel);
      const [kind, format] = (cfg.kinds && cfg.kinds[rel]) || (rel.startsWith('data/cases/') ? ['waveform', 'JSON (WFDB format-16 samples, gain, baseline, fs)'] : ['annotation', 'JSON']);
      scope.push(rel);
      resources.assets.push({ id: (studio + '.' + rel.replace(/^data\//, '').replace(/\//g, '-')).toLowerCase(), version: '1', datasetId: src.datasetId, sourceRef: src.id, kind, dataNature: cfg.nature, format, path: rel,
        bytes: out.bytes, sha256: out.sha256, protected: cfg.protected, rightsEvidenceRef: rightsId, attributionRef: rightsId, notice: { path: cfg.notice, sha256: notice ? notice.sha256 : null },
        dependsOn: parents.map(a => ({ assetId: a.id, version: a.version, sha256: a.sha256 })),
        derivation: { operation: 'convert', tool: tool + '@sha256:' + toolSha, toolVersion: 'node ' + process.versions.node, pipelineCommit: PROCESSING_COMMIT, parametersSha256: sha(JSON.stringify({ studio, tool, inputs: parents.map(a => a.sha256) })) },
        geometry: kind === 'terminology' ? null : { spaceId: studio.endsWith('anatomy') ? 'BodyParts3D mm (+X patient left)' : kind === 'waveform' ? 'time series' : STUDIO_DATA[studio].kinds?.['data/image-1.png'] ? 'image pixels (x right, y down)' : 'NIfTI RAS+ mm (+X patient right)',
          units: kind === 'waveform' ? 'mV @ 500 Hz' : STUDIO_DATA[studio].kinds?.['data/image-1.png'] ? (studio === 'pelvis-ultrasound' ? 'px (mm via per-image pixel spacing)' : 'px (no calibration)') : 'mm', details: 'See provenance validation (local-data); attestation only, not a parser.' },
        medicalReview: { ...pending }, privacyReview: { ...pending }, sourceFile: null });
    }
    evidence.records.push({ id: rightsId, products: ['studio:' + studio], scope, source: src.publisher + ' — ' + src.officialUrl, sourceRevision: src.release, sourceLicense: cfg.licence,
      sourceCommercialUse: true, provenance: 'source-confirmed', status: 'needs-review', dependencies: parents.length ? ['studio-src-' + src.id] : [],
      evidence: [{ kind: 'upstream-license', url: src.evidence[0].url }],
      blockingReason: 'Derived bytes reproduced from the official inputs at ' + PROCESSING_COMMIT.slice(0, 12) + ', but no human rights, privacy and medical review yet' + (src.status === 'REVIEW_REQUIRED' ? '; source licence question open: ' + src.note : '.') });
    report.push({ studio, registered: files.length, parents: parents.length, source: src.id, licence: cfg.licence });
  }
  fs.writeFileSync(path.join(REPO, 'licensing/resources.v1.json'), JSON.stringify(resources, null, 2) + '\n');
  fs.writeFileSync(path.join(REPO, 'licensing/commercial-rights-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.table(register());
