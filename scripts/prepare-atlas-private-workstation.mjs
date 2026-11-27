// Local, explicit, fail-closed preparation. No production writes, no asset upload, no fallback geometry.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {BP43_SUITE,BP43_HYOID,BP43_EXPANSION,HRA_SUITE,BP43_MUSCLE,BP43_COMPONENTS,HRA_EXPANSION} from './atlas-reference-suite-spec.mjs';
import {retainedReceipt,replayPlan,readRetainedReports,boundedReplay,replayReceiptChild} from './replay-audited-bp3d43-suite.mjs';
import {select43Acquisition,load43Elements} from './load-bp3d43-private-elements.mjs';
import {loadHraBatch,stageHraBatch} from './load-hra-female-five.mjs';
import {loadIndependentReview} from './load-independent-source-review.mjs';
import {loadAuditedReferenceSuite} from './atlas-audited-reference-suite.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const packPattern=/^independent-source-review-[A-Za-z0-9_-]+$/;
const descriptors=[...BP43_SUITE,BP43_HYOID,...BP43_EXPANSION];
export function choosePack(names,requested){const matches=names.filter(x=>packPattern.test(x));if(requested!==null){assert(packPattern.test(requested)&&matches.includes(requested),'Explicit private body pack not found');return requested;}assert.equal(matches.length,1,'Exactly one existing body pack required or pass --pack=<exact-folder>');return matches[0];}
export function exactBatchState(reports,evidence){
 const expected=evidence.matches.map(x=>x.fj).sort();assert(expected.length&&new Set(expected).size===expected.length);
 // An existing candidate claiming the same complete set of source IDs is never
 // silently replaced if hashes, status, identity, or acquisition cardinality differ.
 const same=reports.filter(({report})=>Array.isArray(report?.results)&&JSON.stringify(report.results.map(x=>x.fj).sort())===JSON.stringify(expected));
 if(!same.length)return {status:'MISSING'};
 assert.equal(same.length,1,'Ambiguous retained acquisition: inspect, do not overwrite');
 const folder=select43Acquisition(same,evidence);
 return {status:'REUSE',folder};
}
export function exactHraState(names,batch,validate){
 const prefix='hra-'+batch+'-',matches=names.filter(x=>x.startsWith(prefix));
 if(!matches.length)return {status:'MISSING'};
 assert.equal(matches.length,1,'Ambiguous HRA acquisition: inspect, do not overwrite');
 validate(matches[0]);return {status:'REUSE',folder:matches[0]};
}
export function parsePrepareArgs(args){const opts={pack:null,acquire:false};for(const a of args){if(a==='--acquire-missing'){assert(!opts.acquire,'Repeated flag');opts.acquire=true;}else if(a.startsWith('--pack=')){assert(opts.pack===null&&packPattern.test(a.slice(7)),'Invalid or repeated pack flag');opts.pack=a.slice(7);}else throw Error('Unknown argument '+a);}return opts;}
function plan(names,reports,expanded=false){
 const bp=[...descriptors,...(expanded?[BP43_MUSCLE,BP43_COMPONENTS]:[])].map(([,file,count])=>{const {evidence}=retainedReceipt(file);replayPlan(evidence,count);const state=exactBatchState(reports,evidence);if(state.status==='REUSE')assert.equal(load43Elements(q,state.folder,evidence,count).assets.size,count);return {file,count,...state};});
 const hra=[...HRA_SUITE,...(expanded?HRA_EXPANSION:[])].map(([,batch,count])=>({batch,count,...exactHraState(names,batch,folder=>assert.equal(loadHraBatch(q,folder,batch,true).assets.size,count))}));
 return {bp,hra};
}
export async function prepareWorkstation(opts){
 assert(fs.realpathSync(q)===q&&fs.statSync(q).isDirectory(),'Existing private quarantine required');
 const names=fs.readdirSync(q),folder=choosePack(names,opts.pack);const pack=loadIndependentReview(q,folder);
 assert(pack.inventory.publicRelease==='NO_GO'&&pack.inventory.bodyModels.length>0);
 const expanded=opts.includeAuditedExpansion===true;
 const initial=plan(names,readRetainedReports(q),expanded);const needBP=initial.bp.filter(x=>x.status==='MISSING'),needHRA=initial.hra.filter(x=>x.status==='MISSING');
 const report={schema:1,bodyPack:folder,bodyModels:pack.inventory.bodyModels.length,bodyPackVerified:true,bp3dReusedElements:initial.bp.filter(x=>x.status==='REUSE').reduce((n,x)=>n+x.count,0),bp3dMissingElements:needBP.reduce((n,x)=>n+x.count,0),hraReused:initial.hra.filter(x=>x.status==='REUSE').reduce((n,x)=>n+x.count,0),hraMissing:needHRA.reduce((n,x)=>n+x.count,0),bp3dMissingBatches:needBP.map(x=>x.file),hraMissingBatches:needHRA.map(x=>x.batch),clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
 console.log('ATLAS WORKSTATION PREPARE PLAN '+JSON.stringify(report));
 if(!opts.acquire&&(needBP.length||needHRA.length))return {...report,prepared:false,reason:'MISSING_EXACT_ACQUISITIONS'};
 if(opts.acquire&&(needBP.length||needHRA.length)){
  const lock=path.join(q,'.atlas-private-workstation-prepare-lock');fs.mkdirSync(lock,{mode:0o700});
  try{
   // Recheck after obtaining the lock. Existing assets are not modified or removed.
   const current=plan(fs.readdirSync(q),readRetainedReports(q),expanded);await boundedReplay(current.bp.filter(x=>x.status==='MISSING').map(x=>x.file),replayReceiptChild,2);
   for(const x of current.hra.filter(x=>x.status==='MISSING')){const staged=await stageHraBatch(q,x.batch);assert.equal(loadHraBatch(q,staged,x.batch,true).assets.size,x.count);}
  }finally{fs.rmdirSync(lock);}
 }
 const suite=loadAuditedReferenceSuite(q,{includeHyoid:true,includeExpansion:true,includeAuditedExpansion:expanded});
 assert(suite.publicRelease==='NO_GO'&&suite.bp.assets.size===(expanded?436:376)&&suite.hra.assets.size===(expanded?24:9)&&suite.plan.bp.length===(expanded?19:17)&&suite.plan.hra.length===(expanded?5:2));
 return {...report,prepared:true,bp3dElements:expanded?436:376,hraFiles:expanded?24:9,command:['node','scripts/preview-independent-atlas.mjs',folder,'--audited-reference-suite','--include-expansion','--original-ui',...(expanded?['--include-audited-expansion']:[])],readOnlyQCCommand:['node','scripts/audit-atlas-workstation-pack.mjs',folder,'--include-expansion']};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const result=await prepareWorkstation(parsePrepareArgs(process.argv.slice(2)));console.log('ATLAS WORKSTATION PREPARE RESULT '+JSON.stringify(result));if(!result.prepared)process.exitCode=2;}
