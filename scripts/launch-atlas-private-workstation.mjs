// Explicit, local-only one-command preflight, coordinate report, and preview.
// Never installs software, switches Git branches, publishes geometry, or deploys.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
import {prepareWorkstation,parsePrepareArgs} from './prepare-atlas-private-workstation.mjs';
import {auditWorkstation} from './audit-atlas-workstation-pack.mjs';
import {loadHierarchy,stageHierarchy} from './audit-hra-lymphatic-hierarchy.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
export function parseLaunchArgs(args){const prep=[],seen=new Set();let includeLymphatic=false,action='plan';for(const a of args){if(a==='--include-lymphatic'){assert(!seen.has(a));seen.add(a);includeLymphatic=true;}else if(['--http-only','--launch-private'].includes(a)){assert(action==='plan','Select at most one execution mode');action=a==='--http-only'?'http-only':'launch-private';}else prep.push(a);}return {...parsePrepareArgs(prep),includeLymphatic,action};}
export function chooseHierarchy(names,validate){const hits=names.filter(n=>/^hra-lymphatic-hierarchy-[A-Za-z0-9_-]+$/.test(n));if(!hits.length)return null;assert.equal(hits.length,1,'Ambiguous private hierarchy acquisition');validate(hits[0]);return hits[0];}
export function previewArgs(result,options,lymphFolder=null){assert(result.prepared===true&&result.publicRelease==='NO_GO'&&result.bp3dElements===376&&result.hraFiles===9&&/^independent-source-review-[A-Za-z0-9_-]+$/.test(result.bodyPack));assert(['plan','http-only','launch-private'].includes(options.action));assert(!options.includeLymphatic||/^hra-lymphatic-hierarchy-[A-Za-z0-9_-]+$/.test(lymphFolder||''),'Exact hierarchy folder required');const args=['scripts/preview-independent-atlas.mjs',result.bodyPack,'--audited-reference-suite','--include-expansion','--original-ui'];if(options.includeLymphatic)args.push('--lymphatic-hierarchy-folder='+lymphFolder);if(options.action==='http-only')args.push('--http-only');return args;}
export async function runLaunch(opts){
 const result=await prepareWorkstation({pack:opts.pack,acquire:opts.acquire});
 if(!result.prepared){console.log('ATLAS PRIVATE LAUNCH BLOCKED '+JSON.stringify({reason:result.reason,publicRelease:'NO_GO'}));return 2;}
 let lymphFolder=null;
 if(opts.includeLymphatic){const validate=folder=>loadHierarchy(q,folder);lymphFolder=chooseHierarchy(fs.readdirSync(q),validate);if(!lymphFolder&&!opts.acquire){console.log('ATLAS PRIVATE LAUNCH BLOCKED: hierarchy missing, use explicit --acquire-missing');return 2;}if(!lymphFolder){const lock=path.join(q,'.atlas-private-workstation-prepare-lock');fs.mkdirSync(lock,{mode:0o700});try{lymphFolder=chooseHierarchy(fs.readdirSync(q),validate);if(!lymphFolder){const s=await stageHierarchy(q);lymphFolder=s.folder;validate(lymphFolder);}}finally{fs.rmdirSync(lock);}}}
 const audit=await auditWorkstation(result.bodyPack,['--include-expansion']);assert(audit.verifiedBodyPack&&audit.verifiedReferenceSuite&&audit.registrationValidated===false&&audit.publicRelease==='NO_GO');
 const args=previewArgs(result,opts,lymphFolder);
 console.log('ATLAS PRIVATE LAUNCH PLAN '+JSON.stringify({bodyPack:result.bodyPack,bodyModels:audit.bodyModels,referenceElements:audit.referenceElements,hraReferenceFiles:audit.hraReferenceFiles,nativeElementOverlap:audit.nativeElementOverlap.counts,lymphaticSourcePaths:lymphFolder?121:0,action:opts.action,command:[process.execPath,...args],registrationValidated:false,clinicalValidation:false,publicRelease:'NO_GO'}));
 if(opts.action==='plan')return 0;
 // No shell interpolation, no externally reachable address. The preview server
 // performs its own source verification and HTTP smoke before declaring ready.
 return await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit'});child.once('error',reject);child.once('exit',(code,signal)=>signal?resolve(1):resolve(code??1));});
}
if(process.argv[1]===fileURLToPath(import.meta.url))process.exitCode=await runLaunch(parseLaunchArgs(process.argv.slice(2)));
