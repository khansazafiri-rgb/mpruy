import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listLocalZipEntries, buildArchiveAudit } from './private-totalseg-archive-audit.mjs';

function makeZip(files) {
  const chunks=[],centrals=[];let offset=0;
  for(const [name,content] of files) {
    const n=Buffer.from(name),body=Buffer.from(content);
    const local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20,4);local.writeUInt16LE(0,8);
    local.writeUInt32LE(body.length,18);local.writeUInt32LE(body.length,22);
    local.writeUInt16LE(n.length,26);
    chunks.push(local,n,body);
    const central=Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
    central.writeUInt32LE(body.length,20);central.writeUInt32LE(body.length,24);
    central.writeUInt16LE(n.length,28);central.writeUInt32LE(offset,42);
    centrals.push(central,n);
    offset+=local.length+n.length+body.length;
  }
  const cd=Buffer.concat(centrals);
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...chunks,cd,end]);
}
function withZip(t,files) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-totalseg-index-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'test.zip');fs.writeFileSync(file,makeZip(files));return file;
}
test('CT-INDEX-001: one central-index pass identifies paired CT and 3D source masks',t=>{
  const file=withZip(t,[
    ['Totalsegmentator_dataset_small_v201/s0001/ct.nii.gz','fixture'],
    ['Totalsegmentator_dataset_small_v201/s0001/segmentations/liver.nii.gz','fake'],
    ['Totalsegmentator_dataset_small_v201/s0001/segmentations/aorta.nii.gz','mask'],
    ['Totalsegmentator_dataset_small_v201/s0002/ct.nii.gz','fixture'],
    ['Totalsegmentator_dataset_small_v201/meta.csv','metadata fake']
  ]);
  const rows=listLocalZipEntries(file);
  const report=buildArchiveAudit(rows);
  assert.equal(report.archiveEntryCount,5);
  assert.equal(report.ctVolumePaths,2);
  assert.equal(report.matchedSubjectCount,1);
  assert.equal(report.structureMaskPaths,2);
  assert.equal(report.referenceOrganCoverageByMatchedSubjectCount.liver,1);
  assert.equal(report.releaseEligible,false);
  assert.equal(report.imagesDecoded,0);
  assert.deepEqual(report.privateCandidates[0].usefulLabels,['liver','aorta']);
});
test('CT-INDEX-002: reject archive traversal, duplicate entries and symlink central records',t=>{
  const bad=withZip(t,[['../secrets.txt','no'],['s0001/ct.nii.gz','no']]);
  assert.throws(()=>listLocalZipEntries(bad),/CT_AUDIT_DUPLICATE_OR_UNSAFE_PATH/);
  const dup=withZip(t,[['s0001/ct.nii.gz','a'],['s0001/ct.nii.gz','b']]);
  assert.throws(()=>listLocalZipEntries(dup),/CT_AUDIT_DUPLICATE_OR_UNSAFE_PATH/);
  const sym=withZip(t,[['s0001/ct.nii.gz','a']]);
  const b=fs.readFileSync(sym),cd=b.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  b.writeUInt32LE((0xa000*65536)>>>0,cd+38);fs.writeFileSync(sym,b);
  assert.throws(()=>listLocalZipEntries(sym),/CT_AUDIT_ENCRYPTED_OR_UNSAFE_ZIP_MEMBER/);
});
test('CT-INDEX-003: refuse misleading folder names with no CT-mask pair',()=>{
  const fake=[
    {name:'s0001/ct.nii.gz'},
    {name:'s0002/segmentations/liver.nii.gz'},
    {name:'s0003/some-other.csv'}
  ];
  assert.throws(()=>buildArchiveAudit(fake),/CT_AUDIT_NO_MATCHED_CT_AND_MASKS/);
});
test('CT-INDEX-004: model never infers medical diagnosis, identities or release rights',()=>{
  const report=buildArchiveAudit([
    {name:'s0010/ct.nii.gz'},
    {name:'s0010/segmentations/heart.nii.gz'},
    {name:'s0010/segmentations/lung_upper_lobe_left.nii.gz'}
  ]);
  assert.equal(report.matchedSubjectCount,1);
  assert.equal(report.privateCandidates[0].subject,'s0010');
  assert.deepEqual(report.privateCandidates[0].usefulLabels,['lung_upper_lobe_left','heart']);
  assert.equal(report.imagesPublished,0);
  assert.equal(report.clinicApproved,false);
  assert.equal(report.rightsApproved,false);
  assert.equal(report.privacyApproved,false);
});
