// Explicit, local-only one-command preflight, coordinate report, and preview.
// Never installs software, switches Git branches, publishes geometry, or deploys.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
import {prepareWorkstation,parsePrepareArgs} from './prepare-atlas-private-workstation.mjs';
import {auditWorkstation} from './audit-atlas-workstation-pack.mjs';
import {loadHierarchy,stageHierarchy} from './audit-hra-lymphatic-hierarchy.mjs';
import {loadHraBatch,stageHraBatch} from './load-hra-female-five.mjs';
import {loadPriorityHra} from './load-hra-priority-isolated.mjs';
export const HRA_SUPPLEMENT_PLAN=Object.freeze([Object.freeze({batch:'digestive-six',flag:'--hra-digestive-folder=',count:6,groups:true}),Object.freeze({batch:'knee-larynx-six',flag:'--hra-knee-larynx-folder=',count:6,groups:true}),Object.freeze({batch:'tonsil-four',flag:'--hra-tonsil-folder=',count:4,groups:false}),Object.freeze({batch:'pelvis-two',flag:'--hra-pelvis-folder=',count:2,groups:false})]);
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
export function parseLaunchArgs(args){const prep=[],seen=new Set();let includeLymphatic=false,broadRecovery=false,includeMuscle=false,includeAuditedExpansion=false,includeHraSupplement=false,includeHraPriority=false,action='plan';for(const a of args){if(a==='--include-lymphatic'){assert(!seen.has(a));seen.add(a);includeLymphatic=true;}else if(a==='--include-muscle-24'){assert(!seen.has(a));seen.add(a);includeMuscle=true;}else if(a==='--include-audited-expansion'){assert(!seen.has(a));seen.add(a);includeAuditedExpansion=true;}else if(a==='--include-hra-supplement'){assert(!seen.has(a));seen.add(a);includeHraSupplement=true;}else if(a==='--include-hra-priority'){assert(!seen.has(a));seen.add(a);includeHraPriority=true;}else if(a==='--broad-recovery'){assert(!seen.has(a));seen.add(a);broadRecovery=true;}else if(['--http-only','--launch-private'].includes(a)){assert(action==='plan','Select at most one execution mode');action=a==='--http-only'?'http-only':'launch-private';}else prep.push(a);}assert(!(includeMuscle&&includeAuditedExpansion),'Audited expansion already includes muscles');return {...parsePrepareArgs(prep),includeLymphatic,broadRecovery,includeMuscle,includeAuditedExpansion,includeHraSupplement,includeHraPriority,action};}
export function chooseHierarchy(names,validate){const hits=names.filter(n=>/^hra-lymphatic-hierarchy-[A-Za-z0-9_-]+$/.test(n));if(!hits.length)return null;assert.equal(hits.length,1,'Ambiguous private hierarchy acquisition');validate(hits[0]);return hits[0];}
export function chooseHraSupplement(names,batch,validate){assert(HRA_SUPPLEMENT_PLAN.some(x=>x.batch===batch),'Unknown HRA supplement');const prefix='hra-'+batch+'-',hits=names.filter(n=>n.startsWith(prefix));if(!hits.length)return null;assert.equal(hits.length,1,'Ambiguous HRA supplement acquisition');assert(/^[A-Za-z0-9_-]+$/.test(hits[0].slice(prefix.length)),'Invalid HRA supplement folder');validate(hits[0]);return hits[0];}
export function chooseHraPriority(names,validate){const hits=names.filter(n=>n.startsWith('hra-priority-isolated-'));if(!hits.length)return null;assert.equal(hits.length,1,'Ambiguous isolated HRA acquisition');assert(/^hra-priority-isolated-[A-Za-z0-9_-]+$/.test(hits[0]),'Invalid isolated HRA folder');validate(hits[0]);return hits[0];}
export function previewArgs(result,options,lymphFolder=null,supplementFolders=null,priorityFolder=null){assert(result.prepared===true&&result.publicRelease==='NO_GO'&&result.bp3dElements===(options.includeAuditedExpansion?436:376)&&result.hraFiles===(options.includeAuditedExpansion?24:9)&&/^independent-source-review-[A-Za-z0-9_-]+$/.test(result.bodyPack));assert(['plan','http-only','launch-private'].includes(options.action));assert(!options.includeLymphatic||/^hra-lymphatic-hierarchy-[A-Za-z0-9_-]+$/.test(lymphFolder||''),'Exact hierarchy folder required');const args=['scripts/preview-independent-atlas.mjs',result.bodyPack,'--audited-reference-suite','--include-expansion','--original-ui'];if(options.includeMuscle)args.push('--include-muscle-24');if(options.includeAuditedExpansion)args.push('--include-audited-expansion');if(options.broadRecovery)args.push('--broad-recovery');if(options.includeLymphatic)args.push('--lymphatic-hierarchy-folder='+lymphFolder);if(options.includeHraSupplement){assert(supplementFolders&&Object.keys(supplementFolders).length===HRA_SUPPLEMENT_PLAN.length,'Exact four supplemental HRA folders required');for(const x of HRA_SUPPLEMENT_PLAN){const f=supplementFolders[x.batch],prefix='hra-'+x.batch+'-';assert(typeof f==='string'&&f.startsWith(prefix)&&/^[A-Za-z0-9_-]+$/.test(f.slice(prefix.length)),'Invalid supplemental HRA folder');args.push(x.flag+f);}}else assert(supplementFolders===null,'Supplement is opt-in only');if(options.includeHraPriority){assert(/^hra-priority-isolated-[A-Za-z0-9_-]+$/.test(priorityFolder||''),'Exact isolated HRA folder required');args.push('--hra-priority-folder='+priorityFolder);}else assert(priorityFolder===null,'Isolated HRA is opt-in only');if(options.action==='http-only')args.push('--http-only');return args;}
export async function runLaunch(opts){
 const result=await prepareWorkstation({pack:opts.pack,acquire:opts.acquire,includeAuditedExpansion:opts.includeAuditedExpansion});
 if(!result.prepared){console.log('ATLAS PRIVATE LAUNCH BLOCKED '+JSON.stringify({reason:result.reason,publicRelease:'NO_GO'}));return 2;}
 let lymphFolder=null;
 if(opts.includeLymphatic){const validate=folder=>loadHierarchy(q,folder);lymphFolder=chooseHierarchy(fs.readdirSync(q),validate);if(!lymphFolder&&!opts.acquire){console.log('ATLAS PRIVATE LAUNCH BLOCKED: hierarchy missing, use explicit --acquire-missing');return 2;}if(!lymphFolder){const lock=path.join(q,'.atlas-private-workstation-prepare-lock');fs.mkdirSync(lock,{mode:0o700});try{lymphFolder=chooseHierarchy(fs.readdirSync(q),validate);if(!lymphFolder){const s=await stageHierarchy(q);lymphFolder=s.folder;validate(lymphFolder);}}finally{fs.rmdirSync(lock);}}}
 const audit=await auditWorkstation(result.bodyPack,[opts.includeAuditedExpansion?'--include-audited-expansion':'--include-expansion']);assert(audit.verifiedBodyPack&&audit.verifiedReferenceSuite&&audit.referenceElements===result.bp3dElements&&audit.hraReferenceFiles===result.hraFiles&&audit.registrationValidated===false&&audit.publicRelease==='NO_GO');
 if(opts.includeMuscle){const {prepareMuscleBatch}=await import('./atlas-muscle-supplement.mjs');const batch=await prepareMuscleBatch(q,opts.acquire);if(!batch){console.log('ATLAS PRIVATE LAUNCH BLOCKED: muscle supplement missing, use explicit --acquire-missing');return 2;}assert.equal(batch.assets.size,24);}
 let supplementFolders=null;
 if(opts.includeHraSupplement){
  supplementFolders={};const lock=path.join(q,'.atlas-private-workstation-prepare-lock');fs.mkdirSync(lock,{mode:0o700});
  try{
   // Validate every existing batch before acquiring missing ones; never choose ambiguous folders.
   const validate=(x,folder)=>assert.equal(loadHraBatch(q,folder,x.batch,x.groups).assets.size,x.count);
   for(const x of HRA_SUPPLEMENT_PLAN)supplementFolders[x.batch]=chooseHraSupplement(fs.readdirSync(q),x.batch,folder=>validate(x,folder));
   if(Object.values(supplementFolders).some(f=>!f)&&!opts.acquire){console.log('ATLAS PRIVATE LAUNCH BLOCKED: supplemental HRA missing; use explicit --acquire-missing');return 2;}
   for(const x of HRA_SUPPLEMENT_PLAN)if(!supplementFolders[x.batch]){const folder=await stageHraBatch(q,x.batch);validate(x,folder);supplementFolders[x.batch]=folder;}
  }finally{fs.rmdirSync(lock);}
 }
 let priorityFolder=null;
 if(opts.includeHraPriority){
  const lock=path.join(q,'.atlas-private-workstation-prepare-lock');fs.mkdirSync(lock,{mode:0o700});
  try{
   const validate=f=>assert.equal(loadPriorityHra(q,f).assets.size,15);
   priorityFolder=chooseHraPriority(fs.readdirSync(q),validate);
   if(!priorityFolder&&!opts.acquire){console.log('ATLAS PRIVATE LAUNCH BLOCKED: isolated HRA missing; use explicit --acquire-missing');return 2;}
   if(!priorityFolder){
    // Python and NumPy must already be installed; never install packages automatically.
    const python=process.env.ATLAS_PYTHON||'python3';
    const code=await new Promise((resolve,reject)=>{const child=spawn(python,['scripts/stage-hra-priority-local.py','--private-quarantine'],{cwd:root,stdio:'inherit'});child.once('error',reject);child.once('exit',(c,signal)=>resolve(signal?1:c??1));});
    assert.equal(code,0,'Isolated HRA acquisition failed');
    priorityFolder=chooseHraPriority(fs.readdirSync(q),validate);assert(priorityFolder,'Missing exact isolated HRA acquisition');
   }
  }finally{fs.rmdirSync(lock);}
 }
 const args=previewArgs(result,opts,lymphFolder,supplementFolders,priorityFolder);
 console.log('ATLAS PRIVATE LAUNCH PLAN '+JSON.stringify({bodyPack:result.bodyPack,bodyModels:audit.bodyModels,referenceElements:result.bp3dElements+(opts.includeMuscle?24:0),baselineReferenceElements:376,muscleSupplement:opts.includeMuscle?24:0,hraReferenceFiles:result.hraFiles+(opts.includeHraSupplement?18:0)+(opts.includeHraPriority?15:0),hraPriorityFiles:opts.includeHraPriority?15:0,hraPriorityFolder:priorityFolder,baselineHraReferenceFiles:result.hraFiles,hraSupplementFiles:opts.includeHraSupplement?18:0,hraSupplementFolders:supplementFolders,expandedReferencePackVerified:opts.includeAuditedExpansion===true,expandedNativeOverlapAudited:opts.includeAuditedExpansion===true,nativeElementOverlap:audit.nativeElementOverlap.counts,versionedCandidateOverlap:{pairs:audit.versionedCandidateOverlap.candidatePairs,elements:audit.versionedCandidateOverlap.candidateElements,matchedPairs:audit.versionedCandidateOverlap.matchedPairs,matchedElements:audit.versionedCandidateOverlap.matchedElements,counts:audit.versionedCandidateOverlap.counts},lymphaticSourcePaths:lymphFolder?121:0,broadRecovery:opts.broadRecovery===true,recoveryMode:opts.broadRecovery?'ISOLATED_REFERENCE_ONLY':'DISABLED',action:opts.action,command:[process.execPath,...args],registrationValidated:false,clinicalValidation:false,publicRelease:'NO_GO'}));
 if(opts.action==='plan')return 0;
 // No shell interpolation, no externally reachable address. The preview server
 // performs its own source verification and HTTP smoke before declaring ready.
 return await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit'});child.once('error',reject);child.once('exit',(code,signal)=>signal?resolve(1):resolve(code??1));});
}
if(process.argv[1]===fileURLToPath(import.meta.url))process.exitCode=await runLaunch(parseLaunchArgs(process.argv.slice(2)));
