import test from 'node:test';
import assert from 'node:assert/strict';
import {auditHumanAnatomyHost} from './human-anatomy-live-readiness.mjs';

const html='<html><script type="module" src="/anatomy/4d-lab/assets/main-Ab12.js"></script></html>';
const validRoutes=new Map([
  ['/anatomy/viewer/',{type:'text/html'}],
  ['/anatomy/viewer/data/atlas-catalog.json',{type:'application/json'}],
  ['/anatomy/viewer/bp3d/inventory.json',{status:404}],
  ['/anatomy/4d-lab/data/phantom/anatomy.json',{type:'application/json',body:'{"schema":"medcoel.anatomy.v1"}'}],
  ['/anatomy/4d-lab/',{type:'text/html',body:html}],
  ['/anatomy/4d-lab/assets/main-Ab12.js',{type:'text/javascript'}],
  ['/anatomy/4d-lab/data/atlas/anatomy.json',{type:'application/json',body:'{"schema":"medcoel.anatomy.v1"}'}],
  ['/anatomy/4d-lab/data/atlas/ct.nrrd',{type:'application/octet-stream'}],
  ['/anatomy/4d-lab/data/atlas/labels.nrrd',{type:'application/octet-stream'}]
]);
const routes=(patch={})=>async (path,options)=>{
 assert.ok(['HEAD','GET',undefined].includes(options?.method));
 const def=patch[path]||validRoutes.get(path);
 if(!def)throw Error('Unexpected route '+path);
 return new Response(def.body||'',{status:def.status||200,
  headers:{'content-type':def.type||'text/plain'}});
};
test('read-only host audit distinguishes actual original mounted applications from license approval',async()=>{
 const result=await auditHumanAnatomyHost(routes());
 assert.equal(result.atlas.mounted,true);
 assert.equal(result.lab4d.mounted,true);
 assert.equal(result.runtimeRoutesReady,true);
 assert.equal(result.quarantine.privateBP3DBlocked,true);
 assert.equal(result.quarantine.atlasCTBlocked,false);
 assert.equal(result.publicReleaseApproved,undefined);
 assert.equal(result.exactBuildApproved,false);
 assert.equal(result.readyForPublicClinicalUse,false);
});
test('a SPA masquerading as Atlas and quarantined CT must NOT be reported as working Human Anatomy',async()=>{
 const result=await auditHumanAnatomyHost(routes({
  '/anatomy/viewer/data/atlas-catalog.json':{type:'text/html',body:'<html>SPA</html>'},
  '/anatomy/4d-lab/data/atlas/anatomy.json':{status:404}
 }));
 assert.equal(result.atlas.mounted,false);
 assert.match(result.atlas.error,/halaman utama/);
 assert.equal(result.lab4d.mounted,false);
 assert.match(result.lab4d.error,/Dataset Atlas.*belum diaktifkan/);
 assert.equal(result.runtimeRoutesReady,false);
 assert.equal(result.readyForPublicClinicalUse,false);
});
test('missing routes, withheld GLBs and status probes are reported independently',async()=>{
 const report=await auditHumanAnatomyHost(routes({
  '/anatomy/4d-lab/assets/main-Ab12.js':{status:404},
  '/anatomy/4d-lab/data/atlas/ct.nrrd':{status:404}
 }));
 assert.equal(report.atlas.mounted,true);
 assert.equal(report.lab4d.mounted,false);
 assert.equal(report.quarantine.atlasCTBlocked,true);
 assert.equal(report.quarantine.privateBP3DBlocked,true);
 assert.match(report.lab4d.error,/JavaScript simulator/);
});
