import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {findInterruptedAllSystemsBatch} from './bp3d-focused-onepass.mjs';
import {runBatch,provisionalSelectionReport,isIncompleteFailedAllSystemsInventory} from '../apps/4d-lab/tools/batch-bp3d-candidates.mjs';

function createStaged(root,name,number,{finalized=false}={}){
 const folder=path.join(root,name),structures=path.join(folder,'structures');
 fs.mkdirSync(structures,{recursive:true});
 for(let i=0;i<number;i++){
  const dir=path.join(structures,'structure-'+i);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir,'model.glb'),'fake bytes - discovery only');
  fs.writeFileSync(path.join(dir,'lineage.json'),'{}');
 }
 if(finalized)fs.writeFileSync(path.join(folder,'inventory.json'),'{}');
 return folder;
}
test('interrupted 702-model private GLB batch is selected for full revalidation, not reconverted',t=>{
 const privateDir=fs.mkdtempSync(path.join(os.tmpdir(),'bp3d-private-resume-'));
 t.after(()=>fs.rmSync(privateDir,{recursive:true,force:true}));
 createStaged(privateDir,'bp3d-all-systems-temp-incomplete',12);
 const complete=createStaged(privateDir,'bp3d-all-systems-temp-completed',16);
 createStaged(privateDir,'bp3d-all-systems-temp-finalized',20,{finalized:true});
 createStaged(privateDir,'bp3d-focused-temp-other',30);
 const best=findInterruptedAllSystemsBatch({privateDir,minModels:12});
 assert.equal(best.dir,complete);
 assert.equal(best.count,16);
 assert.equal(findInterruptedAllSystemsBatch({privateDir,minModels:17}),null);
});
test('never select a symlinked, completed or non-private batch for resume',t=>{
 const privateDir=fs.mkdtempSync(path.join(os.tmpdir(),'bp3d-private-gate-'));
 const elsewhere=fs.mkdtempSync(path.join(os.tmpdir(),'bp3d-other-'));
 t.after(()=>{fs.rmSync(privateDir,{recursive:true,force:true});
   fs.rmSync(elsewhere,{recursive:true,force:true});});
 const actual=createStaged(elsewhere,'bp3d-all-systems-temp-outside',4);
 fs.symlinkSync(actual,path.join(privateDir,'bp3d-all-systems-temp-redirect'),'dir');
 createStaged(privateDir,'bp3d-all-systems-temp-finalized',4,{finalized:true});
 assert.equal(findInterruptedAllSystemsBatch({privateDir,minModels:1}),null);
});
test('staged geometry recovery is forbidden outside the all-systems private source mode',async()=>{
 await assert.rejects(
  runBatch({resumeExistingOutput:true,provisional:true,allSystemsExact:false}),
  /restricted to the private all-systems/
 );
});

test('all-systems 702-model inventory does not dereference a null 584-model provisional selector',()=>{
 assert.equal(provisionalSelectionReport({
   provisional:true,allSystemsExact:true,provisionalInfo:null,
   includePromising:true,limitNew:120
 }),null);
 assert.deepEqual(provisionalSelectionReport({
   provisional:true,allSystemsExact:false,
   provisionalInfo:{summary:{provisionalSelected:114,reviewRejected:2}},
   includePromising:true,limitNew:120
 }),{includePromising:true,limitNew:120,selected:114,rejected:2,approved:0});
 assert.throws(()=>provisionalSelectionReport({
   provisional:true,allSystemsExact:false,provisionalInfo:null
 }),/selector missing/);
});

function partialFailedManifest(){
 return {kind:'official-bp3d-bulk-source-review',provisionalSource:true,
  allSystemsExactSourcePreview:true,legalStatus:'NOT-CLEARED',
  approvedForCommercialDistribution:false,geometryRegisteredToMEDCOEL:false,
  sourceHashes:{archiveSha256:'a'.repeat(64),namesSha256:'b'.repeat(64),
   elementsSha256:'c'.repeat(64)},
  summary:{selected:702,converted:232,failed:470},
  converted:Array.from({length:232},(_,i)=>({name:'mesh'+i})),
  failures:Array.from({length:470},(_,i)=>({name:'old-mesh'+i,error:'historical missing metadata'}))};
}
test('the exact 232/702 partial inventory from the Mac log remains a resumable private FAILED manifest',()=>{
 const data=partialFailedManifest();
 assert.equal(isIncompleteFailedAllSystemsInventory(data),true);
 assert.equal(isIncompleteFailedAllSystemsInventory({...data,summary:{...data.summary,failed:0}}),false);
 assert.equal(isIncompleteFailedAllSystemsInventory({...data,approvedForCommercialDistribution:true}),false);
 assert.equal(isIncompleteFailedAllSystemsInventory({...data,geometryRegisteredToMEDCOEL:true}),false);
 assert.equal(isIncompleteFailedAllSystemsInventory({...data,
  sourceHashes:{...data.sourceHashes,archiveSha256:'untrusted'}}),false);
 assert.equal(isIncompleteFailedAllSystemsInventory({...data,failures:[]}),false);
});
test('source selector finds 702 intact GLBs even when failed 232-model manifest is present',t=>{
 const privateDir=fs.mkdtempSync(path.join(os.tmpdir(),'bp3d-private-failed-manifest-'));
 t.after(()=>fs.rmSync(privateDir,{recursive:true,force:true}));
 const dir=createStaged(privateDir,'bp3d-all-systems-temp-partial',7);
 const bad=createStaged(privateDir,'bp3d-all-systems-temp-not-private',8);
 fs.writeFileSync(path.join(dir,'inventory.json'),JSON.stringify(partialFailedManifest()));
 fs.writeFileSync(path.join(bad,'inventory.json'),JSON.stringify({
  ...partialFailedManifest(),approvedForCommercialDistribution:true
 }));
 const result=findInterruptedAllSystemsBatch({privateDir,minModels:5});
 assert.equal(result.dir,dir);
 assert.equal(result.failedInventory,true);
 assert.equal(result.count,7);
});
