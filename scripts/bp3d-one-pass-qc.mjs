// One-pass local source-QC pipeline. It NEVER uploads, stages, merges or deploys anything.
// Outcome may be PRIVATE_PREVIEW_READY but public BodyParts3D is categorically NO_GO until
// clinical review and exact-archive commercial redistribution rights are documented.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runBatch} from '../apps/4d-lab/tools/batch-bp3d-candidates.mjs';
import {runAudit} from '../apps/4d-lab/tools/audit-bp3d-completeness.mjs';
import {scanDistribution} from '../licensing/tools/check-distribution.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const PRIVATE=path.join(ROOT,'local-data/licensing-quarantine');
const PREVIEW='http://127.0.0.1:4173/anatomy/viewer/?models=bp3d:skeletal,muscular,cardiovascular,visceral';
const PATHS=Object.freeze({
  baseline:path.join(PRIVATE,'bp3d-batch'),
  source:path.join(PRIVATE,'bp3d-4.0'),
  provisional:path.join(PRIVATE,'bp3d-provisional'),
  report:path.join(PRIVATE,'bp3d-completeness-provisional'),
  qc:path.join(PRIVATE,'bp3d-launch-qc'),
});
export function readReleaseDecision({commercial,inventory,audit,distributionErrors=[]}){
  const products=['atlas-viewer','4d-lab'];
  const blockers=[];
  for(const id of products){
    const item=commercial?.products?.[id];
    if(!item)blockers.push(id+': commercial policy missing');
    else if(item.status!=='approved'||!Array.isArray(item.approvedBuilds)||!item.approvedBuilds.length||
      item.ownerOverride?.enabled===true)
      blockers.push(id+': no verified, approved commercial build (status '+item.status+')');
  }
  if(inventory?.approvedForCommercialDistribution!==false||
     inventory?.geometryRegisteredToMEDCOEL!==false ||
     inventory?.legalStatus!=='NOT-CLEARED')
    blockers.push('BodyParts3D source manifest lacks the required explicit rights quarantine');
  if(inventory?.summary?.failed!==0||!Array.isArray(inventory?.converted)||!inventory.converted.length)
    blockers.push('Model conversion is incomplete or empty');
  if(audit?.errors?.length || !audit?.summary || audit.summary.converted!==inventory?.converted.length)
    blockers.push('Source/GLB geometry integrity not verified');
  if(audit?.summary?.commercialReleaseApproved!==0||
     audit?.summary?.geometryAnatomyValidated!==0)
    blockers.push('Unexpected clinical or commercial clearance claims');
  if(distributionErrors.length)blockers.push('Public output contains withheld files: '+distributionErrors.length);
  // Technical source inspection cannot resolve human medical anatomy or archive licence terms.
  blockers.push('Anatomical identity and organ completeness have not received clinical review');
  blockers.push('Exact BodyParts3D 4.0 OBJ licence terms conflict (CC BY-SA 2.1 JP versus page CC BY 4.0)');
  return {publicRelease:'NO_GO',blockers:[...new Set(blockers)]};
}
export function assertPrivateQuarantinePaths(paths=PATHS){
  const base=fs.realpathSync(PRIVATE);
  const validate=p=>{
    const resolved=path.resolve(p);
    if(resolved===base||!resolved.startsWith(base+path.sep))
      throw Error('Private source and reports must remain beneath real licensing-quarantine');
    if(fs.existsSync(resolved)&&fs.lstatSync(resolved).isSymbolicLink())
      throw Error('Symlinked private target is not permitted: '+resolved);
  };
  Object.values(paths).forEach(validate);
  return true;
}
// Reuse fully converted but previously BLOCKED private candidate output.
// Selection is never trusted: the complete official FMA/BP/FJ, hashes, GLB,
// original 470 and distribution checks MUST run again before private promotion.
export function verifyReusableCandidateFolder(input,{privateRoot=PRIVATE,repoRoot=ROOT}={}){
  if(typeof input!=='string'||!input.trim())throw Error('A concrete private candidate folder is required');
  const target=path.resolve(repoRoot,input),base=path.resolve(privateRoot);
  if(path.dirname(target)!==base||!/^bp3d-qa-new-[A-Za-z0-9_-]+$/.test(path.basename(target)))
    throw Error('Resume folder must be a direct bp3d-qa-new-* child of licensing-quarantine');
  if(!fs.existsSync(target)||fs.lstatSync(target).isSymbolicLink())
    throw Error('Private resume folder is missing or redirected by symlinks');
  // macOS exposes system temp dirs through /var -> /private/var; comparing
  // realpath(target) with the caller's spelled-out path falsely rejects an
  // ordinary directory. Compare both canonical parents instead, and require
  // the private root itself to remain inside the canonical project checkout.
  const canonicalProject=fs.realpathSync(repoRoot);
  const expectedPrivateRoot=path.join(canonicalProject,'local-data','licensing-quarantine');
  const canonicalPrivateRoot=fs.realpathSync(base);
  const canonicalTarget=fs.realpathSync(target);
  if(canonicalPrivateRoot!==expectedPrivateRoot ||
     path.dirname(canonicalTarget)!==canonicalPrivateRoot ||
     path.basename(canonicalTarget)!==path.basename(target))
    throw Error('Private resume folder is missing or redirected by symlinks');
  const inventory=JSON.parse(fs.readFileSync(path.join(target,'inventory.json'),'utf8'));
  if(inventory.provisionalSource!==true||
    inventory.approvedForCommercialDistribution!==false||
    inventory.geometryRegisteredToMEDCOEL!==false||
    inventory.legalStatus!=='NOT-CLEARED'||
    !Array.isArray(inventory.converted)||!inventory.converted.length||
    inventory.summary?.failed!==0)
    throw Error('Resume manifest is not an intact, rights-blocked private candidate batch');
  return {target,inventory};
}

function runCommand(name,args,steps){
  const label=[name,...args].join(' ');
  const result=spawnSync(name,args,{cwd:ROOT,stdio:'inherit',env:process.env});
  steps.push({command:label,passed:result.status===0,error:result.error?.message||null});
  if(result.status!==0)throw Error(label+' failed: '+(result.error?.message||result.status||result.signal||'unknown'));
}
const release=()=>JSON.parse(fs.readFileSync(path.join(ROOT,'licensing/commercial-release.json'),'utf8'));
const writeReport=(report)=>{
  fs.mkdirSync(PATHS.qc,{recursive:true});
  fs.writeFileSync(path.join(PATHS.qc,'readiness.json'),JSON.stringify(report,null,2)+'\n');
};
function publishPrivateFolder(from,to){
  // Atomic rename, keeping any previous private review folder/notes. Nothing in dist/ or production is touched.
  const previous=to+'.previous-'+Date.now();
  let archived=false;
  if(fs.existsSync(to)){
    if(fs.lstatSync(to).isSymbolicLink())throw Error('Cannot replace symlinked private output '+to);
    fs.renameSync(to,previous);
    archived=true;
  }
  try {fs.renameSync(from,to);}
  catch(error){if(archived)fs.renameSync(previous,to);throw error;}
  return archived?previous:null;
}
export async function onePass({preview=false,limitNew=120,runTests=true,root=ROOT,resumePrivate=null}={}){
  if(root!==ROOT)throw Error('One-pass QC refuses a different source checkout');
  if(!Number.isSafeInteger(limitNew)||limitNew<1||limitNew>120)
    throw Error('Candidate limit must be 1..120');
  const result={schemaVersion:1,startedAt:new Date().toISOString(),
    operation:'review-only-offline-one-pass',publicRelease:'NO_GO',
    privatePreview:'NOT_READY',previewUrl:PREVIEW,steps:[],addedCandidates:0,
    oldModelsReused:0,bodyparts3dPublished:false,
    warnings:['No production deploy, site upload, release approval or public GLB activation.']};
  let prepared=null,auditDir=null;
  try{
    assertPrivateQuarantinePaths();
    if(!fs.existsSync(path.join(PATHS.baseline,'inventory.json')) ||
       !fs.existsSync(path.join(PATHS.source,'isa_BP3D_4.0_obj_99.zip')))
      throw Error('Official source archive or baseline inventory absent from local private quarantine');
    if(runTests){
      runCommand('npm',['run','test:4d-lab'],result.steps);
      runCommand('npm',['run','test:anatomy'],result.steps);
      runCommand('npm',['run','test:licensing'],result.steps);
      runCommand('npm',['run','build:anatomy'],result.steps);
    }
    let inventory;
    if(resumePrivate){
      const cached=verifyReusableCandidateFolder(resumePrivate);
      prepared=cached.target;
      inventory=cached.inventory;
      result.steps.push({command:'reuse quarantined batch (full source audit still mandatory)',
        passed:true,models:inventory.converted.length,added:inventory.summary.provisionalNewModels});
    }else{
      prepared=fs.mkdtempSync(path.join(PRIVATE,'bp3d-qa-new-'));
      inventory=await runBatch({provisional:true,includePromising:true,limitNew,
        outputDir:prepared});
      result.steps.push({command:'private provisional batch',passed:inventory.summary.failed===0,
        models:inventory.converted.length,added:inventory.summary.provisionalNewModels});
    }
    auditDir=fs.mkdtempSync(path.join(PRIVATE,'bp3d-qa-audit-'));
    if(inventory.summary.failed)throw Error('Private batch contains '+inventory.summary.failed+' model conversion failures; original output preserved');
    const audit=await runAudit({batch:prepared,output:auditDir,checkGeometry:true});
    if(audit.errors.length)throw Error('GLB/FMA/BP/FJ full audit failed: '+audit.errors.slice(0,8).join('; '));
    result.steps.push({command:'full private source geometry and lineage audit',passed:true,checked:audit.summary.converted});
    const focused=JSON.parse(fs.readFileSync(path.join(auditDir,'focus-gaps.json'),'utf8'));
    result.focusCoverage=focused.areas.map(({id,label,total,withMesh,missing,coveragePercent})=>
      ({id,label,total,withMesh,missing,coveragePercent}));
    const leads=JSON.parse(fs.readFileSync(path.join(auditDir,'official-source-leads.json'),'utf8'));
    result.officialSourceLeadReview={
      status:leads.status,
      structuresInvestigated:leads.structures.length,
      focusAreas:leads.areas,
      addedModels:0,approvedForDistribution:false
    };
    result.steps.push({command:'targeted anatomy completeness triage (read-only)',
      passed:true,areas:result.focusCoverage.length});
    const publicDirs=['apps/web/dist','apps/anatomy/dist','apps/4d-lab/dist'];
    const issues=publicDirs.flatMap(p=>scanDistribution(path.join(ROOT,p)).map(x=>p+': '+x));
    if(issues.length)throw Error('Public-dist quarantine violations: '+issues.join('; '));
    result.steps.push({command:'distribution quarantine scan',passed:true});
    const archivedModels=publishPrivateFolder(prepared,PATHS.provisional);
    prepared=null;
    const archivedReport=publishPrivateFolder(auditDir,PATHS.report);
    auditDir=null;
    result.oldModelsReused=inventory.summary.reusedBaselineModels;
    result.addedCandidates=inventory.summary.provisionalNewModels;
    result.previousLocalReview=archivedModels||null;
    result.previousLocalAudit=archivedReport||null;
    result.privatePreview='READY_FOR_HUMAN_REVIEW';
    Object.assign(result,readReleaseDecision({commercial:release(),inventory,audit,distributionErrors:issues}));
    result.completedAt=new Date().toISOString();
    writeReport(result);
    console.log('\nPRIVATE SOURCE QC COMPLETE: '+result.privatePreview+
      '\nBaseline models reused: '+result.oldModelsReused+
      '\nNew candidate GLBs (UNVERIFIED): '+result.addedCandidates+
      '\nPUBLIC DEPLOYMENT: '+result.publicRelease+
      '\nReport: '+path.join(PATHS.qc,'readiness.json')+
      '\nOriginal Atlas preview: '+PREVIEW+'\n');
    if(preview){
      // This is a long-lived interactive LOCAL server: Ctrl-C ends viewing, not the completed QC.
      const server=spawnSync('npm',['run','preview:4d-lab'],{cwd:ROOT,stdio:'inherit',
        env:{...process.env,MEDCOEL_BP3D_PROVISIONAL:'1'}});
      if(server.error||server.status!==0 && server.signal!=='SIGINT'){
        console.error('Local preview could not start or stopped unexpectedly. The private QC report remains valid.');
        result.previewRuntime='STOPPED_OR_FAILED';
      }else result.previewRuntime='STOPPED';
      writeReport(result);
    }
    return result;
  }catch(error){
    result.privatePreview='BLOCKED';
    result.error=String(error?.message||error);
    result.completedAt=new Date().toISOString();
    result.blockers=[result.error,'Commercial/clinical clearance remains blocked'];
    writeReport(result);
    console.error('\nPRIVATE REVIEW QC BLOCKED: '+result.error+
      '\nPrevious candidate folders preserved. No production changes.\n');
    process.exitCode=1;
    return result;
  }finally{
    // Temporary output is kept for forensic review on failure. No broad destructive cleanup.
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2), options={preview:false,runTests:true,limitNew:120,resumePrivate:null};
  const usage='Usage: node scripts/bp3d-one-pass-qc.mjs [--preview] [--limit-new 1..120] [--resume-private local-data/licensing-quarantine/bp3d-qa-new-*] [--no-tests]';
  for(let i=0;i<args.length;i++){
    if(args[i]==='--preview')options.preview=true;
    else if(args[i]==='--no-tests')options.runTests=false;
    else if(args[i]==='--limit-new')options.limitNew=Number(args[++i]);
    else if(args[i]==='--resume-private')options.resumePrivate=args[++i];
    else if(args[i]==='--help'){console.log(usage);process.exit(0);}
    else{console.error(usage);process.exit(2);}
  }
  await onePass(options);
}
