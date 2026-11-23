import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReviewedSourceMappings} from '../tools/bp3d-reviewed-mappings.mjs';
const sha='a'.repeat(64);
const catalog={candidates:[{atlasName:'Cartilage of nose.l',atlasSystem:'skeletal',state:'unmatched',matches:[]}]};
const official=[{name:'left lateral nasal cartilage',fmaId:'FMA100',bpId:'BP200'}];
const elements=new Map([['FMA100',new Set(['FJ300','FJ301'])]]);
const archive=['dir/FJ300.obj','dir/FJ301.obj'];
const entry={atlasName:'Cartilage of nose.l',fmaId:'FMA100',bpId:'BP200',
 officialName:'left lateral nasal cartilage',fjIds:['FJ301','FJ300'],reviewedSourceIdentity:true,
 reviewer:'Medical anatomy reviewer',identityEvidence:'Direct FMA/BP/FJ reconciliation and manually inspected 3D anatomical region.'};
const reviews={schemaVersion:1,sourceArchiveSha256:sha,entries:[entry]};
test('explicit pinned FMA/BP/FJ review adds a LOCAL candidate without approving anatomy or release',()=>{
 const got=applyReviewedSourceMappings(catalog,reviews,official,elements,archive,sha);
 assert.equal(got.candidates[0].state,'candidate');
 assert.match(got.candidates[0].matchMethod,/not-clinically-validated/);
 assert.equal(got.candidates[0].matches[0].sourceObjs.length,2);
 assert.equal(catalog.candidates[0].state,'unmatched');
});
test('review rejects opposite side, wrong exact identity, missing FJ and wrong archive SHA',()=>{
 const use=(overrides={},reviewOverrides={})=>applyReviewedSourceMappings(catalog,
  {...reviews,...reviewOverrides,entries:[{...entry,...overrides}]},official,elements,archive,sha);
 assert.throws(()=>use({atlasName:'Cartilage of nose.r'}),/unmatched Atlas/);
 assert.throws(()=>use({officialName:'right lateral nasal cartilage'}),/FMA\/BP\/name/);
 assert.throws(()=>use({fjIds:['FJ300']}),/FJ element list/);
 assert.throws(()=>use({}, {sourceArchiveSha256:'b'.repeat(64)}),/unpinned/);
 assert.throws(()=>use({identityEvidence:'seems right'}),/detailed source evidence/);
});
test('review never assigns an explicit artery to a vein even if manually requested',()=>{
 const candidate={candidates:[{atlasName:'Left femoral artery',atlasSystem:'cardiovascular',state:'unmatched',matches:[]}]};
 const row=[{name:'left femoral vein',fmaId:'FMA100',bpId:'BP200'}];
 assert.throws(()=>applyReviewedSourceMappings(candidate,{...reviews,entries:[{...entry,atlasName:'Left femoral artery',officialName:'left femoral vein'}]},row,elements,archive,sha),/tissue type mismatch/);
});
