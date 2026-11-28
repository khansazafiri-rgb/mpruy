// Final local rehearsal: no re-export, no uploads, no production access.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
assert(fs.realpathSync(q)===q,'Missing or unsafe private source directory');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function actualFile(dir,rel){const p=path.join(dir,rel);return fs.existsSync(p)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile();}
function chooseNative(){
 const possible=[];
 for(const n of fs.readdirSync(q)){
  if(!/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(n))continue;
  const dir=path.join(q,n);if(fs.realpathSync(dir)!==dir)continue;
  try{
   if(!actualFile(dir,'final-qc-report.json')||!actualFile(dir,'pack/inventory.json'))continue;
   const qc=read(path.join(dir,'final-qc-report.json')),inv=read(path.join(dir,'pack/inventory.json'));
   if(qc.httpSmoke==='PASS'&&qc.publicRelease==='NO_GO'&&inv.approvedForCommercialDistribution===false&&qc.models===inv.converted.length&&qc.httpModelRoutesVerified===inv.converted.length&&qc.source?.revision===inv.source?.revision)
    possible.push({name:n,time:fs.statSync(path.join(dir,'final-qc-report.json')).mtimeMs,models:inv.converted.length});
  }catch(error){console.warn('Skipped source folder',n,String(error.message));}
 }
 possible.sort((a,b)=>b.time-a.time||a.name.localeCompare(b.name));assert(possible.length,'No completed native QC pack found; no re-export attempted');return possible[0];
}
function chooseBp(){
 const possible=[];
 for(const n of fs.readdirSync(q)){
  if(n!=='bp3d-all-systems'&&!/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(n))continue;
  const dir=path.join(q,n),rel=n==='bp3d-all-systems'?'inventory.json':'pack/inventory.json';
  if(fs.realpathSync(dir)!==dir||!actualFile(dir,rel))continue;
  try{const inv=read(path.join(dir,rel));if(inv.approvedForCommercialDistribution===false&&Array.isArray(inv.converted)&&inv.converted.length)possible.push({name:n,count:inv.converted.length,time:fs.statSync(path.join(dir,rel)).mtimeMs});}catch{}
 }
 possible.sort((a,b)=>b.count-a.count||b.time-a.time||a.name.localeCompare(b.name));return possible[0]?.name||'bp3d-all-systems';
}
const native=chooseNative(),bp=chooseBp();
console.log('FINAL REHEARSAL SOURCE',JSON.stringify({native:native.name,nativeModels:native.models,bp,production:'UNCHANGED'}));
function run(command,args){const p=spawnSync(command,args,{cwd:root,stdio:'inherit'});if(p.error)throw p.error;return p.status??1;}
function requireStep(command,args){assert.equal(run(command,args),0,'Required step failed: '+args.join(' '));}
requireStep('npm',['ci','--prefix','apps/atlas-independent','--ignore-scripts']);
requireStep('npm',['test','--prefix','apps/atlas-independent']);
requireStep(process.execPath,['--test','scripts/assemble-atlas-distribution-review.test.mjs','scripts/independent-atlas-final-qc.test.mjs','scripts/z-anatomy-final-qc.test.mjs']);
const auditStatus=run(process.execPath,['scripts/run-atlas-publication-evidence.mjs',native.name,bp]);
console.log('EVIDENCE COMMAND EXIT',auditStatus,'(0 only means reports generated, not license approval)');
if(auditStatus!==0)console.warn('Some evidence checks are blocked; public release remains NO_GO.');
if(process.argv.includes('--audit-only')){process.exitCode=auditStatus;console.log('No viewer started.');}
else{console.log('Starting only the private consolidated review; public release remains NO_GO.');process.exitCode=run(process.execPath,['scripts/preview-independent-atlas.mjs',native.name]);}
