import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizePrivateAcquisition } from './alternative-source-readiness.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT,'licensing/candidates/alternative-sources-batch.v1.json'),'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT,'shared/studios/catalog.v1.json'),'utf8'));

test('READINESS-001: map all nine sources across 24 studios without approving release', () => {
  const batch = { outcomes: manifest.sources.map(s=>({id:s.id,status:'SOURCE_CANDIDATE_STAGED'})) };
  const acquisition = {
    results: [
      {source:'fracatlas-v7',filename:'FracAtlas.zip',status:'DOWNLOADED_PRIVATE_ONLY'},
      {source:'grazpedwri-v2',filename:'dataset.csv',status:'DOWNLOADED_PRIVATE_ONLY'},
      {source:'grazpedwri-v2',filename:'folder_structure.zip',status:'DOWNLOADED_PRIVATE_ONLY'}
    ],
    skipped: [
      {source:'grazpedwri-v2',reason:'SIZE_CAP_REACHED',filename:'images_part1.zip'},
      {source:'totalsegmentator-small-v201',reason:'SIZE_CAP_REACHED',filename:'Totalsegmentator_dataset_small_v201.zip'},
      {source:'hra-3d-ref-organ',reason:'PUBLISHER_FILE_MANIFEST_NOT_YET_PINNED'}
    ]
  };
  const report = summarizePrivateAcquisition(manifest,catalog,batch,acquisition);
  assert.equal(report.totalClinicalStudios,24);
  assert.equal(report.candidateSourcePackages,9);
  assert.equal(report.summary.partialOrArchivedSources,2);
  assert.equal(report.releaseEligible,false);
  assert.equal(report.sources.find(s=>s.id==='fracatlas-v7').status,'PRIVATE_ARCHIVES_RECORDED');
  assert.equal(report.sources.find(s=>s.id==='grazpedwri-v2').status,'PARTIAL_ARCHIVES_RECORDED');
  assert.equal(report.sources.find(s=>s.id==='totalsegmentator-small-v201').status,'NO_ARCHIVES_READY');
  assert.ok(report.studios.find(s=>s.studioId==='msk-xray').candidateSources.length===2);
  assert.ok(report.sources.every(s=>!s.medicalApproved && !s.privacyApproved && !s.rightsApproved));
});

test('READINESS-002: a missing metadata claim or failed acquisition is never called ready', () => {
  const batch = {outcomes:[{id:'fracatlas-v7',status:'SOURCE_METADATA_BLOCKED'}]};
  const acquisition = {results:[
    {source:'fracatlas-v7',status:'DOWNLOADED_PRIVATE_ONLY',filename:'FracAtlas.zip'},
    {source:'grazpedwri-v2',status:'REJECTED_OR_QUARANTINED',error:'HTTP 403'}
  ],skipped:[]};
  const report = summarizePrivateAcquisition(manifest,catalog,batch,acquisition);
  assert.equal(report.sources.find(s=>s.id==='fracatlas-v7').status,
    'PUBLISHER_METADATA_NOT_CURRENTLY_VERIFIED');
  assert.equal(report.sources.find(s=>s.id==='grazpedwri-v2').status,
    'PUBLISHER_METADATA_NOT_CURRENTLY_VERIFIED');
  assert.equal(report.releaseEligible,false);
});
