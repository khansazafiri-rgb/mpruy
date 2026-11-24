// One private focused-source review pass; no website, deployment, PR or public asset changes.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runBatch} from '../apps/4d-lab/tools/batch-bp3d-candidates.mjs';
import {runAudit} from '../apps/4d-lab/tools/audit-bp3d-completeness.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const PRIVATE=path.join(ROOT,'local-data','licensing-quarantine');
const batch=path.join(PRIVATE,'bp3d-focused');
const report=path.join(PRIVATE,'bp3d-completeness-focused');
const review=path.join(PRIVATE,'bp3d-focused-onepass-review');
const vertebralBatch=path.join(PRIVATE,'bp3d-vertebral');
const vertebralReport=path.join(PRIVATE,'bp3d-completeness-vertebral');
const vertebralReview=path.join(PRIVATE,'bp3d-vertebral-onepass-review');
const allSystemsBatch=path.join(PRIVATE,'bp3d-all-systems');
const allSystemsReport=path.join(PRIVATE,'bp3d-completeness-all-systems');
const allSystemsReview=path.join(PRIVATE,'bp3d-all-systems-onepass-review');
const previewUrl='http://127.0.0.1:4173/anatomy/viewer/?models=bp3d:skeletal,muscular,cardiovascular,visceral';
const allSystemsPreviewUrl='http://127.0.0.1:4173/anatomy/viewer/?models=bp3d';
function requireSafePrivateTarget(target){
 const root=fs.realpathSync(PRIVATE),resolved=path.resolve(target);
 if(resolved===root||path.dirname(resolved)!==root)
   throw Error('Private output must be direct child of licensing-quarantine');
 if(fs.existsSync(resolved)&&fs.lstatSync(resolved).isSymbolicLink())
   throw Error('Symlinked private destination is not allowed');
}
function publishPrivateFolder(from,to){
 requireSafePrivateTarget(from);requireSafePrivateTarget(to);
 const prior=fs.existsSync(to)?to+'.previous-'+Date.now():null;
 if(prior)fs.renameSync(to,prior);
 try{fs.renameSync(from,to);}
 catch(e){if(prior)fs.renameSync(prior,to);throw e;}
 return prior;
}
function runTests(){
 for(const key of ['test:4d-lab','test:anatomy','test:licensing']){
  const result=spawnSync('npm',['run',key],{cwd:ROOT,env:process.env,stdio:'inherit'});
  if(result.status!==0)throw Error(key+' failed, source preview unchanged');
 }
}
function saveStatus(status,target=review){
 fs.mkdirSync(target,{recursive:true});
 fs.writeFileSync(path.join(target,'readiness.json'),JSON.stringify(status,null,2)+'\n');
}
export async function runFocusedOnePass({openPreview=false,skipTests=false,vertebralExact=false,allSystemsExact=false}={}){
 if(allSystemsExact&&vertebralExact)throw Error('Run one private expansion mode per invocation');
 const targetBatch=allSystemsExact?allSystemsBatch:vertebralExact?vertebralBatch:batch;
 const targetReport=allSystemsExact?allSystemsReport:vertebralExact?vertebralReport:report;
 const targetReview=allSystemsExact?allSystemsReview:vertebralExact?vertebralReview:review;
 const result={status:'BLOCKED',publicRelease:'NO_GO',medicalValidation:false,
   clinicalApproval:false,commercialRelease:false,source:'official BodyParts3D FMA/BP/FJ',
   output:targetBatch,report:targetReport,previewUrl:allSystemsExact?allSystemsPreviewUrl:previewUrl,
   existingModelsIntact:true,
   exactVertebralSourcePreview:vertebralExact,
   allSystemsExactSourcePreview:allSystemsExact,
   warnings:['Original Atlas and production assets unchanged',
     'Exact archive and Atlas code commercial redistribution rights NOT CLEARED']};
 let workingBatch=null,workingReport=null;
 try{
  requireSafePrivateTarget(targetBatch);requireSafePrivateTarget(targetReport);
  if(!skipTests)runTests();
  workingBatch=fs.mkdtempSync(path.join(PRIVATE,
    allSystemsExact?'bp3d-all-systems-temp-':vertebralExact?'bp3d-vertebral-temp-':'bp3d-focused-temp-'));
  workingReport=fs.mkdtempSync(path.join(PRIVATE,
    allSystemsExact?'bp3d-all-systems-audit-':vertebralExact?'bp3d-vertebral-audit-':'bp3d-focused-audit-'));
  const inventory=await runBatch({provisional:true,includePromising:true,limitNew:120,
    focusShortlist:!allSystemsExact,vertebralExact,allSystemsExact,outputDir:workingBatch});
  if(inventory.summary.failed||(allSystemsExact?inventory.summary.allSystemsNewModels:vertebralExact?inventory.summary.vertebralNewModels:inventory.summary.focusedNewModels)<1)
    throw Error('Focus source conversion failed or no new source model passed');
  const audit=await runAudit({batch:workingBatch,output:workingReport,checkGeometry:true});
  if(audit.errors.length||audit.summary.converted!==inventory.converted.length||
      audit.summary.commercialReleaseApproved!==0||audit.summary.geometryAnatomyValidated!==0)
    throw Error('Full source FMA/BP/FJ or geometry integrity audit did not pass');
  const priorModels=publishPrivateFolder(workingBatch,targetBatch);workingBatch=null;
  const priorAudit=publishPrivateFolder(workingReport,targetReport);workingReport=null;
  Object.assign(result,{status:'PRIVATE_REVIEW_UNVALIDATED',privatePreview:'READY_FOR_HUMAN_REVIEW',
    previousBatch:priorModels,previousReport:priorAudit,
    priorModelsReused:inventory.summary.reusedPriorReviewModels,
    newFocusedGlbs:vertebralExact?0:inventory.summary.focusedNewModels,
    newExactVertebraGlbs:vertebralExact?inventory.summary.vertebralNewModels:0,
    newAllSystemsGlbs:allSystemsExact?inventory.summary.allSystemsNewModels:0,
    allSystemsSourceSelection:inventory.allSystemsSourceSelection||null,
    modelCount:inventory.converted.length,
    focusedSourceSelection:inventory.focusedSourceSelection||null,
    vertebralSourceSelection:inventory.vertebralSourceSelection||null,
    integrityErrors:0,publicRelease:'NO_GO'});
  saveStatus(result,targetReview);
  console.log('\nPRIVATE '+(allSystemsExact?'ALL-SYSTEMS':vertebralExact?'VERTEBRAL':'FOCUSED')+' GLB REVIEW READY: '+
    result.modelCount+' models ('+result.priorModelsReused+' reused + '+
    (allSystemsExact?result.newAllSystemsGlbs:vertebralExact?result.newExactVertebraGlbs:result.newFocusedGlbs)+
    ' newly converted); public deployment NO-GO. Original Atlas: '+result.previewUrl+
    '\nReport: '+path.join(targetReview,'readiness.json')+'\n');
  if(openPreview){
   const proc=spawnSync('npm',['run','preview:4d-lab'],{cwd:ROOT,
     env:{...process.env,[allSystemsExact?'MEDCOEL_BP3D_ALL_SYSTEMS':vertebralExact?'MEDCOEL_BP3D_VERTEBRAL':'MEDCOEL_BP3D_FOCUSED']:'1'},stdio:'inherit'});
   if(proc.status!==0 && proc.signal!=='SIGINT')
     console.error('Local preview stopped unexpectedly; the private GLB audit remains valid');
  }
  return result;
 }catch(error){
  result.error=String(error?.message||error);
  result.blockers=[result.error,'Medical review and source-archive redistribution permission remain absent'];
  saveStatus(result,targetReview);
  console.error('PRIVATE '+(allSystemsExact?'ALL-SYSTEMS':vertebralExact?'VERTEBRAL':'FOCUSED')+' REVIEW BLOCKED: '
    result.error+'\nOriginal 470/584/602/626 GLBs and production files were not replaced.\n');
  process.exitCode=1;
  return result;
 }finally{
  // Deliberately retain any failed local working directory for forensic review.
  // Never delete or expose source OBJ files to dist or any production path.
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.some(x=>!['--preview','--no-tests','--vertebral-exact','--all-systems-exact'].includes(x))){
  console.error('Usage: node scripts/bp3d-focused-onepass.mjs [--preview] [--no-tests] [--vertebral-exact] [--all-systems-exact]');process.exit(2);
 }
 await runFocusedOnePass({openPreview:args.includes('--preview'),skipTests:args.includes('--no-tests'),
   vertebralExact:args.includes('--vertebral-exact'),allSystemsExact:args.includes('--all-systems-exact')});
}
