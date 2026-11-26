// Audit only exact named source hierarchy. No clinical group or spatial registration claim.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stageHraBatch,loadHraBatch} from './load-hra-female-five.mjs';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
import {resolveSourceGroups} from './hra-exact-source-groups.mjs';
export {resolveSourceGroups};
export async function auditGroups(){
 const q=fileURLToPath(new URL('local-data/licensing-quarantine',root)),staged=[],rows=[];
 try{
  for(const [batch,receipt] of [['female-five','hra-female-five-pinned-audit-20261126.json'],['cardiopulmonary-four','hra-cardiopulmonary-four-source-audit-20261126.json']]){
   const folder=await stageHraBatch(q,batch);staged.push(path.join(q,folder));const registry=loadHraBatch(q,folder,batch);
   const report=JSON.parse(fs.readFileSync(new URL(dir+receipt,root),'utf8'));
   for(const a of registry.assets.values()){
    const proof=report.rows.find(x=>x.assetURL===a.public.source&&x.sha256===a.sha256);assert(proof);
    const b=fs.readFileSync(a.file),doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
    const groups=resolveSourceGroups(doc,proof.labels);
    rows.push({id:proof.id,assetURL:proof.assetURL,sha256:proof.sha256,groups});
   }
  }
  const all=rows.flatMap(x=>x.groups);
  assert.equal(rows.length,9);assert.equal(all.length,38);
  const result={schema:1,sourceObjects:9,heldLabelRows:all.length,exactSourceGroups:all.filter(x=>x.status==='EXACT_SOURCE_GROUP_DESCENDANTS').length,remainingHeld:all.filter(x=>x.status!=='EXACT_SOURCE_GROUP_DESCENDANTS').length,scope:'Exact source hierarchy only; overlapping ancestor/descendant groups are not unique anatomy or medically validated completeness.',rows,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
  console.log('HRA EXACT SOURCE GROUP AUDIT '+JSON.stringify(result));return result;
 }finally{for(const p of staged)fs.rmSync(p,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))await auditGroups();
