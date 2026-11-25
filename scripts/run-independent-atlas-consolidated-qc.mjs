// One local audit after development, never a deployment. Each failed stage is recorded.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {summarizeNpmAudit} from './diagnose-atlas-publication-audit.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const [pack,target,...flags]=process.argv.slice(2);
assert(flags.length<=1&&flags.every(f=>f==='--preview'),'Only optional --preview is supported');
assert(/^independent-source-review-[A-Za-z0-9_-]+$/.test(pack||'')&&/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(target||''),'Provide explicit local review folders');
assert(fs.realpathSync(q)===q);
for(const folder of [pack,target]){const p=path.join(q,folder);assert(fs.realpathSync(p)===p&&fs.statSync(p).isDirectory(),'Missing or unsafe review folder');}
const out=fs.mkdtempSync(path.join(q,'atlas-consolidated-qc-'));fs.chmodSync(out,0o700);
const result={schema:2,pack,target,steps:{},publicRelease:'NO_GO',clinicalValidation:'PENDING',browserRuntime:'PENDING',productionChanged:false};
const guardFiles=['licensing/commercial-release.json','licensing/quarantine-policy.json','licensing/quarantined-hashes.json','deploy/Caddyfile','deploy/anatomy.caddy.snippet','deploy/4d-lab.caddy.snippet','package-lock.json','apps/atlas-independent/package-lock.json','apps/4d-lab/package-lock.json'];
const snapshot=()=>Object.fromEntries(guardFiles.map(n=>[n,createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')]));
const before=snapshot();
const git=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});assert.equal(git.status,0);result.commit=git.stdout.trim();
function step(name,command,args,required=[]){
 if(required.some(k=>result.steps[k]?.status!=='PASS')){result.steps[name]={status:'BLOCKED',reason:'Prior required check failed'};return;}
 const p=spawnSync(command,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:3600000});
 const log=[p.stdout||'',p.stderr||'',p.error?String(p.error):''].join('\n');
 fs.writeFileSync(path.join(out,name+'.log'),log,{flag:'wx',mode:0o600});
 result.steps[name]={status:p.status===0&&!p.error?'PASS':'FAIL',exitCode:p.status,log:name+'.log'};
 console.log('QC',name,result.steps[name].status);return p.stdout||'';
}
function audit(name,args,prerequisite){
 const output=step(name,'npm',args,[prerequisite]);
 if(result.steps[name].status==='BLOCKED')return;
 try{
  const summary=summarizeNpmAudit(JSON.parse(output));
  result.steps[name].audit=summary;
  if(summary.status!=='NO_REPORTED_VULNERABILITIES'||result.steps[name].exitCode!==0)result.steps[name].status='FAIL';
 }catch(e){result.steps[name].status='FAIL';result.steps[name].reason='Audit unavailable or malformed: '+String(e.message);}
}
function consume(name,prefix,output,validate){
 if(result.steps[name].status!=='PASS')return;
 try{
  const line=output.split('\n').find(l=>l.startsWith(prefix+' '));assert(line,'Missing structured result');
  const report=JSON.parse(line.slice(prefix.length+1));validate(report);result.steps[name].report=report;
 }catch(e){result.steps[name].status='FAIL';result.steps[name].reason=String(e.message);}
}
step('install','npm',['ci','--prefix','apps/atlas-independent','--ignore-scripts','--no-audit','--no-fund']);
audit('security',['audit','--prefix','apps/atlas-independent','--json'],'install');
step('host-install','npm',['ci','--ignore-scripts','--no-audit','--no-fund']);
audit('host-security',['audit','--json'],'host-install');
// Source audit imports the old OBJ parser for comparison only. Install its pinned
// tools locally; they are not included in the independent viewer browser bundle.
step('audit-tool-install','npm',['ci','--prefix','apps/4d-lab','--ignore-scripts','--no-audit','--no-fund']);
step('app-tests','npm',['test','--prefix','apps/atlas-independent'],['install']);
step('source-tests',process.execPath,['--test','scripts/independent-bp3d-export.test.mjs','scripts/independent-source-coverage.test.mjs','scripts/audit-bp3d-publication-geometry.test.mjs','scripts/independent-atlas-final-qc.test.mjs','scripts/assemble-atlas-distribution-review.test.mjs','scripts/z-anatomy-final-qc.test.mjs','scripts/expand-independent-source-review.test.mjs','scripts/audit-independent-system-coverage.test.mjs','scripts/independent-atlas-host.test.mjs','scripts/replay-independent-source-evidence.test.mjs','scripts/commercial-release.test.mjs','scripts/production-caddy-quarantine.test.mjs'],['install','audit-tool-install']);
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
const systemOutput=step('system-coverage',process.execPath,['scripts/audit-independent-system-coverage.mjs',finalPack,target],['coverage']);
consume('system-coverage','SYSTEM COVERAGE QC',systemOutput,r=>assert(r.publicRelease==='NO_GO'&&r.clinicalValidation===false&&Object.keys(r.systems).length===13&&r.bodyModels===result.expansion.bodyModels));
const replayOutput=step('source-replay',process.execPath,['scripts/replay-independent-source-evidence.mjs',finalPack],['source-tests','expansion']);
consume('source-replay','INDEPENDENT SOURCE REPLAY',replayOutput,r=>assert(r.publicRelease==='NO_GO'&&r.approved===0&&r.bodyTotal===result.expansion.bodyModels&&r.bodyMatched===r.bodyTotal&&r.hraTotal===result.expansion.hraReferences&&r.hraMatched===r.hraTotal&&r.hraCacheBlocked===0&&r.publicQuarantineRejectsPack===true));
const httpOutput=step('build-and-http',process.execPath,['scripts/preview-independent-atlas.mjs',finalPack,'--http-only'],['security','host-security','app-tests','source-tests','coverage','system-coverage','source-replay']);
consume('build-and-http','INDEPENDENT HTTP QC',httpOutput,r=>assert(r.httpSmoke==='PASS'&&r.hostQC==='PASS'&&r.models===result.expansion.bodyModels&&r.httpModelRoutesVerified===r.models&&r.hraReferences===result.expansion.hraReferences&&r.httpHraRoutesVerified===r.hraReferences&&r.publicRelease==='NO_GO'));
try{assert.deepEqual(snapshot(),before);result.steps['immutable-boundaries']={status:'PASS'};}catch(e){result.steps['immutable-boundaries']={status:'FAIL',reason:String(e.message)};}
result.technicalChecksPassed=Object.values(result.steps).every(s=>s.status==='PASS');
result.previewEligible=result.technicalChecksPassed;
result.releaseBlockers=['Clinical and orientation validation pending','Browser/WebGL runtime pending','Named redistribution and code-origin review pending','Existing public release gate blocked'];
result.note='PASS permits private preview only. Coverage gaps, clinical validation, exact redistribution review and browser validation remain independent requirements. Host security audit covers the root workspace, not just Atlas.';
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
const compact={schema:result.schema,commit:result.commit,finalPack:result.finalPack,steps:Object.fromEntries(Object.entries(result.steps).map(([k,v])=>[k,{status:v.status,exitCode:v.exitCode,reason:v.reason,auditCounts:v.audit?.counts}])),expansion:result.expansion,sourceReplay:result.steps['source-replay']?.report?{bodyMatched:result.steps['source-replay'].report.bodyMatched,bodyTotal:result.steps['source-replay'].report.bodyTotal,hraMatched:result.steps['source-replay'].report.hraMatched,hraTotal:result.steps['source-replay'].report.hraTotal}:null,systemsWithBodyModels:result.steps['system-coverage']?.report?.systemsWithBodyModels,emptySystems:result.steps['system-coverage']?.report?.emptySystems,http:result.steps['build-and-http']?.report,technicalChecksPassed:result.technicalChecksPassed,previewEligible:result.previewEligible,publicRelease:'NO_GO',productionChanged:false,report:path.join(out,'summary.json')};
for(const [name,record] of Object.entries(result.steps)){
 if(record.status!=='FAIL'||!record.log||name==='security'||name==='host-security')continue;
 const tail=fs.readFileSync(path.join(out,record.log),'utf8').trim().split('\n').slice(-12).join('\n').slice(-2400);
 if(tail)console.log('QC FAILURE TAIL '+name+'\n'+tail);
}
console.log('CONSOLIDATED ATLAS QC',JSON.stringify(compact));
if(!result.technicalChecksPassed)process.exitCode=1;
else if(flags.includes('--preview')){
 console.log('PRIVATE PREVIEW ONLY: '+finalPack+' · http://127.0.0.1:'+String(process.env.PORT||4186)+'/anatomy/explore · stop with Ctrl+C');
 const preview=spawnSync(process.execPath,['scripts/preview-independent-atlas.mjs',finalPack],{cwd:root,stdio:'inherit'});
 if(preview.error)throw preview.error;
 if(preview.status!==0&&preview.signal!=='SIGINT')process.exitCode=preview.status||1;
}
