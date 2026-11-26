// Reacquire exact publisher bytes from retained dual-source receipts, not a new mirror audit.
// No assets leave the runner. Each child uses a fresh private acquisition directory.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {BP43_SUITE,BP43_HYOID,BP43_EXPANSION} from './atlas-reference-suite-spec.mjs';
import {run} from './intake-bp3d43-priority-elements.mjs';
import {load43Elements,select43Acquisition} from './load-bp3d43-private-elements.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const receipts=[...BP43_SUITE,BP43_HYOID,...BP43_EXPANSION];
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function replayPlan(receipt,count){
 assert(receipt.schema===1&&receipt.publicRelease==='NO_GO'&&receipt.geometryPublished===0&&receipt.clinicalValidation===false&&receipt.registrationValidated===false);
 const {publisher,mirror,matches}=receipt;assert(publisher.publicRelease==='NO_GO'&&mirror.publicRelease==='NO_GO'&&publisher.held===0&&mirror.held===0&&publisher.parsed===count&&mirror.passed===count&&matches.length===count&&hex(publisher.manifestSHA256));
 assert.equal(publisher.results.length,count);assert.equal(mirror.results.length,count);assert.equal(new Set(matches.map(x=>x.fj)).size,count);
 const rows=matches.map(m=>{const p=publisher.results.filter(x=>x.fj===m.fj),r=mirror.results.filter(x=>x.fj===m.fj);assert(p.length===1&&r.length===1);const a=p[0],b=r[0];
  assert(a.status==='EXACT_SOURCE_ELEMENT_GEOMETRY_MATCH'&&b.status==='EXACT_MIRROR_ELEMENT_GEOMETRY_MATCH'&&hex(m.rawSHA256)&&hex(m.publisherGLBSHA256)&&hex(m.mirrorGLBSHA256)&&m.triangles>0);
  for(const v of [a,b])assert(v.bp===m.bp&&v.fma===m.fma&&v.rawSHA256===m.rawSHA256&&v.triangles===m.triangles);
  assert(a.glbSHA256===m.publisherGLBSHA256&&b.glbSHA256===m.mirrorGLBSHA256&&a.name===m.name);
  return {fj:m.fj,bp:m.bp,fma:m.fma,name:m.name,conceptMembership:a.conceptMembership};
 });
 return {schema:1,sourceVersion:'4.3',geometryVerified:false,publicRelease:'NO_GO',licenseReview:'VERSION_SPECIFIC_REVIEW_REQUIRED',expectedManifestSHA256:publisher.manifestSHA256,rows};
}
export function retainedReceipt(file){const d=receipts.find(x=>x[1]===file);assert(d,'Unknown receipt');return {evidence:JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication',file),'utf8')),count:d[2]};}
function reports(){return fs.readdirSync(q).filter(x=>/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(x)).flatMap(folder=>{const base=path.join(q,folder),f=path.join(base,'report.json');if(!fs.existsSync(f))return [];assert(fs.realpathSync(base)===base&&fs.realpathSync(f)===f&&fs.statSync(f).isFile()&&fs.statSync(f).size<1024*1024);return [{folder,report:JSON.parse(fs.readFileSync(f,'utf8'))}];});}
function replayOne(file){const {evidence,count}=retainedReceipt(file),doc=replayPlan(evidence,count);run(doc);const folder=select43Acquisition(reports(),evidence);const registry=load43Elements(q,folder,evidence,count);assert.equal(registry.assets.size,count);console.log('EXACT RETAINED PUBLISHER REPLAY PASS '+file+' '+count);}
export async function boundedReplay(items,worker,parallel=2){assert(Number.isInteger(parallel)&&parallel>=1&&parallel<=2);let next=0;const failures=[];await Promise.all(Array.from({length:parallel},async()=>{while(next<items.length&&!failures.length){const item=items[next++];try{await worker(item);}catch(e){failures.push({item,reason:String(e.message)});}}}));assert(!failures.length,'Replay failed; no partial suite: '+JSON.stringify(failures));}
function child(file){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[fileURLToPath(import.meta.url),'--receipt='+file],{stdio:'inherit'});p.once('error',reject);p.once('exit',(code,signal)=>code===0?resolve():reject(Error('Child failed '+file+' '+(signal||code))));});}
if(process.argv[1]===fileURLToPath(import.meta.url)){assert.equal(process.argv.length,3,'Use --all-fresh or one allowlisted --receipt=filename');const arg=process.argv[2];if(arg==='--all-fresh'){fs.mkdirSync(q,{recursive:true,mode:0o700});assert(fs.realpathSync(q)===q&&fs.readdirSync(q).every(x=>!x.startsWith('bp3d43-element-intake-')),'Fresh replay root required; do not delete local packs');await boundedReplay(receipts.map(x=>x[1]),child,2);assert.equal(reports().length,17);console.log('ATLAS EXACT PUBLISHER REPLAY PASS: 17 acquisitions, 376 elements; no new dual-source or release claim.');}else{assert(arg.startsWith('--receipt='));replayOne(arg.slice(10));}}
