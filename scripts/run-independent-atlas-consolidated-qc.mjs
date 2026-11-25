// One local audit after development, never a deployment. Each failed stage is recorded.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const [pack,target]=process.argv.slice(2);
assert(/^independent-source-review-[A-Za-z0-9_-]+$/.test(pack||'')&&/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(target||''),'Provide explicit local review folders');
assert(fs.realpathSync(q)===q);
for(const folder of [pack,target]){const p=path.join(q,folder);assert(fs.realpathSync(p)===p&&fs.statSync(p).isDirectory(),'Missing or unsafe review folder');}
const out=fs.mkdtempSync(path.join(q,'atlas-consolidated-qc-'));fs.chmodSync(out,0o700);
const result={schema:1,pack,target,steps:{},publicRelease:'NO_GO',clinicalValidation:'PENDING',browserRuntime:'PENDING',productionChanged:false};
function step(name,command,args,required=[]){
 if(required.some(k=>result.steps[k]?.status!=='PASS')){result.steps[name]={status:'BLOCKED',reason:'Prior required check failed'};return;}
 const p=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:3600000});
 const log=[p.stdout||'',p.stderr||'',p.error?String(p.error):''].join('\n');
 fs.writeFileSync(path.join(out,name+'.log'),log,{flag:'wx',mode:0o600});
 result.steps[name]={status:p.status===0&&!p.error?'PASS':'FAIL',exitCode:p.status,log:name+'.log'};
 console.log('QC',name,result.steps[name].status);return p.stdout||'';
}
step('install','npm',['ci','--prefix','apps/atlas-independent','--ignore-scripts']);
step('security','npm',['audit','--prefix','apps/atlas-independent','--json'],['install']);
step('app-tests','npm',['test','--prefix','apps/atlas-independent'],['install']);
step('source-tests',process.execPath,['--test','scripts/independent-bp3d-export.test.mjs','scripts/independent-source-coverage.test.mjs','scripts/audit-bp3d-publication-geometry.test.mjs','scripts/independent-atlas-final-qc.test.mjs','scripts/assemble-atlas-distribution-review.test.mjs','scripts/z-anatomy-final-qc.test.mjs','scripts/expand-independent-source-review.test.mjs','scripts/audit-independent-system-coverage.test.mjs','scripts/independent-atlas-host.test.mjs'],['install']);
const expansionOutput=step('expansion',process.execPath,['scripts/expand-independent-source-review.mjs',pack,target],['source-tests']);
let finalPack=pack;
if(result.steps.expansion.status==='PASS'){
 try{
  const line=expansionOutput.split('\n').find(l=>l.startsWith('INDEPENDENT BATCH EXPANSION '));assert(line);
  const report=JSON.parse(line.slice('INDEPENDENT BATCH EXPANSION '.length));assert(/^independent-source-review-[A-Za-z0-9_-]+$/.test(report.folder)&&report.publicRelease==='NO_GO'&&report.approved===0);
  finalPack=report.folder;result.expansion=report;
 }catch(e){result.steps.expansion.status='FAIL';result.steps.expansion.reason=String(e.message);}
}
result.finalPack=finalPack;
step('coverage',process.execPath,['scripts/plan-independent-atlas-coverage.mjs',finalPack,target],['source-tests','expansion']);
step('system-coverage',process.execPath,['scripts/audit-independent-system-coverage.mjs',finalPack,target],['coverage']);
step('build-and-http',process.execPath,['scripts/preview-independent-atlas.mjs',finalPack,'--http-only'],['security','app-tests','source-tests','coverage','system-coverage']);
result.technicalChecksPassed=Object.values(result.steps).every(s=>s.status==='PASS');
result.note='PASS is technical evidence only. Coverage gaps, clinical validation, exact redistribution review and browser validation remain independent requirements.';
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('CONSOLIDATED ATLAS QC',JSON.stringify({...result,report:path.join(out,'summary.json')}));
if(!result.technicalChecksPassed)process.exitCode=1;
