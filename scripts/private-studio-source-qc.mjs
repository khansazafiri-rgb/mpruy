#!/usr/bin/env node
// Read-only source-byte/renderer-logic QC. It does NOT run a native browser,
// approve medical labels, change any registry, issue receipts or publish data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {verify} from '../licensing/tools/verify-studio-reproducibility.mjs';
import {inspectStudioResources} from '../licensing/tools/inspect-studio-resources.mjs';
import {verifyPrivateMprFiles} from './finish-all-clinical-studios.mjs';
import {runPrivateMprDom} from './private-mpr-test-harness.mjs';
import {listLocalZipEntries,readVerifiedLocalZipMember,verifiedArchive} from './private-totalseg-archive-audit.mjs';
import {parsePrivateTotalSegNifti,verifyNiftiPair} from './private-totalseg-ct-review.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=file=>{
  const info=fs.lstatSync(file);
  if(!info.isFile()||info.isSymbolicLink()||info.size>32*1024*1024)throw Error('QC_UNSAFE_JSON_INPUT');
  return JSON.parse(fs.readFileSync(file,'utf8'));
};
const assert=(condition,message)=>{if(!condition)throw Error(message);};

async function inspectRealCt(){
  const shared=path.join(ROOT,'local-data/studio-resources/review-overlays/ct-mpr-private');
  const manifest=read(path.join(shared,'bundle-manifest.json'));
  assert(verifyPrivateMprFiles(manifest,name=>fs.readFileSync(path.join(shared,name))),'PRIVATE_MPR_ARTIFACT_BINDING');
  const text=fs.readFileSync(path.join(shared,'volume.js'),'utf8'),prefix='window.MEDCOEL_CT_PRIVATE = ';
  assert(text.startsWith(prefix)&&text.trim().endsWith(';'),'PRIVATE_MPR_NOT_JSON_PACKET');
  const packet=JSON.parse(text.slice(prefix.length).trim().slice(0,-1));
  const archive=await verifiedArchive();
  assert(archive.sha256===packet.archiveSha256&&archive.sha256===manifest.sourceArchiveSha256,'PRIVATE_MPR_ARCHIVE_IDENTITY');
  const zip=path.join(ROOT,'local-data/studio-resources/alternative-candidates/totalsegmentator-small-v201/downloads/Totalsegmentator_dataset_small_v201.zip');
  const entries=new Map(listLocalZipEntries(zip).map(e=>[e.name,e]));
  const member=name=>readVerifiedLocalZipMember(zip,entries.get(name));
  const ctBytes=member(packet.subject+'/ct.nii.gz'),ct=parsePrivateTotalSegNifti(ctBytes,'ct');
  assert(digest(ctBytes)===packet.ctMemberSha256,'PRIVATE_MPR_CT_MEMBER_IDENTITY');
  assert(JSON.stringify(ct.affine)===JSON.stringify(packet.sourceAffine),'PRIVATE_MPR_CT_AFFINE_IDENTITY');
  const huBytes=zlib.gunzipSync(Buffer.from(packet.hu.base64,'base64')),
    maskBytes=zlib.gunzipSync(Buffer.from(packet.masks.base64,'base64'));
  assert(digest(huBytes)===packet.hu.sha256&&digest(maskBytes)===packet.masks.sha256,'PRIVATE_MPR_DECODED_SHA256');
  const [X,Y,Z]=packet.dimensions,maps=packet.sampledSourceIndices;
  const sourceIndex=(x,y,z)=>maps[0][x]+ct.dims[0]*(maps[1][y]+ct.dims[1]*maps[2][z]);
  let huChecked=0;
  for(let z=0;z<Z;z++)for(let y=0;y<Y;y++)for(let x=0;x<X;x++){
    const i=x+X*(y+Y*z),native=Math.round(ct.read(sourceIndex(x,y,z))*ct.scale+ct.intercept);
    assert(huBytes.readInt16LE(i*2)===native,'PRIVATE_MPR_SAMPLED_HU_MISMATCH');huChecked++;
  }
  const masks=[],maskChecks=[];
  for(const organ of packet.organs){
    const receipt=manifest.maskReceipts.find(r=>r.sourceMask===organ.id),bytes=member(receipt.sourceMember);
    assert(digest(bytes)===receipt.sha256,'PRIVATE_MPR_SOURCE_MASK_HASH');
    const mask=parsePrivateTotalSegNifti(bytes,'mask');verifyNiftiPair(ct,mask);
    let checked=0,positive=0;
    for(let z=0;z<Z;z++)for(let y=0;y<Y;y++)for(let x=0;x<X;x++){
      const i=x+X*(y+Y*z),value=mask.read(sourceIndex(x,y,z));
      assert(value===0||value===1,'PRIVATE_MPR_SOURCE_MASK_NONBINARY');
      assert(Boolean(maskBytes.readUInt16LE(i*2)&organ.bit)===Boolean(value),'PRIVATE_MPR_SAMPLED_MASK_ALIGNMENT');
      checked++;positive+=value;
    }
    assert(positive===organ.sampledVoxels,'PRIVATE_MPR_MASK_COUNT_MISMATCH');
    maskChecks.push({id:organ.id,sampledVoxelsChecked:checked,positive,sourceSha256:receipt.sha256});masks.push(mask);
  }
  const interactions=[];
  for(const studio of ['abdomen-ct','chest-ct']){
    const ui=await runPrivateMprDom(packet,{studio});
    assert(ui.document.body.dataset.mprReady==='true','PRIVATE_MPR_DOM_NOT_READY');
    const selected=packet.organs.findIndex(o=>o.id===(studio==='chest-ct'?'heart':'liver')),
      target=packet.organs[selected],nativeMask=masks[selected];
    let index=0;while(index<X*Y*Z&&!(maskBytes.readUInt16LE(index*2)&target.bit))index++;
    assert(index<X*Y*Z,'PRIVATE_MPR_QC_ORGAN_ABSENT');
    const cursor=[index%X,Math.floor(index/X)%Y,Math.floor(index/(X*Y))];
    for(const [i,axis] of ['x','y','z'].entries())await ui.set('slice-'+axis,cursor[i]);
    for(const [i,label] of ui.elements.get('organs').children.entries()){
      const box=label.children[0];box.checked=i===selected;box.dispatch('change');
    }
    await ui.flush();let pixelsChecked=0;
    async function compare(alpha,window,maskEnabled=true){
      await ui.set('opacity',alpha*100);await ui.set('window',window,'change');
      const [level,width]=({soft:[40,400],lung:[-600,1500],bone:[400,1800]})[window];
      for(const [axis,uSize,vSize] of [['x',Y,Z],['y',X,Z],['z',X,Y]]){
        const current=['x','y','z'].map(a=>Number(ui.elements.get('slice-'+a).value));
        for(let v=0;v<vSize;v++)for(let u=0;u<uSize;u++){
          const x=axis==='x'?current[0]:u,y=axis==='z'?Y-1-v:axis==='y'?current[1]:u,z=axis==='z'?current[2]:Z-1-v;
          const source=sourceIndex(x,y,z),value=Math.round(ct.read(source)*ct.scale+ct.intercept);
          const grey=Math.max(0,Math.min(255,Math.round(255*(value-(level-width/2))/width)));
          const expected=alpha&&maskEnabled&&nativeMask.read(source)?[...target.rgb.map(c=>Math.round(grey*(1-alpha)+c*alpha)),255]:[grey,grey,grey,255];
          assert(ui.pixel(axis,u,v).every((n,i)=>n===expected[i]),'PRIVATE_MPR_NATIVE_SOURCE_PIXEL_ALIGNMENT');pixelsChecked++;
        }
      }
    }
    await compare(0,'soft');await compare(1,'soft');await compare(0.55,'soft');await compare(0,'lung');await compare(0,'bone');
    const checkbox=ui.elements.get('organs').children[selected].children[0];
    checkbox.checked=false;checkbox.dispatch('change');await ui.flush();await compare(1,'soft',false);
    const before=['x','y'].map(a=>ui.elements.get('slice-'+a).value);
    ui.elements.get('view-z').dispatch('wheel',{deltaY:100});await ui.flush();
    assert(before.every((v,i)=>v===ui.elements.get('slice-'+['x','y'][i]).value),'PRIVATE_MPR_WHEEL_CHANGED_OTHER_PLANE');
    await compare(0,'soft');
    interactions.push({studio,status:'PASS',engine:'Node VM DOM/Canvas harness; NOT a native browser',pixelsComparedToNativeSource:pixelsChecked,
      nativeBrowser:'BLOCKED: not executed by this source-only tool',clinicalOrientationApproved:false});
  }
  return {status:'PASS',method:'Actual retained publisher CT and 11 source masks, CRC + complete archive hashes + native voxel comparisons',
    archive,ctMemberSha256:packet.ctMemberSha256,sourceAffine:ct.affine,dimensions:packet.dimensions,huChecked,maskChecks,interactions,
    medicalApproval:false,privacyApproval:false,rightsApproval:false,releaseEligible:false};
}

export async function collectPrivateStudioSourceQc({ownerRoot=ROOT}={}){
  const catalog=read(path.join(ROOT,'shared/studios/catalog.v1.json')),resources=read(path.join(ROOT,'licensing/resources.v1.json'));
  const inputRoot=path.join(ownerRoot,'local-data/studio-resources/review-overlays'),candidateRoot=path.join(ROOT,'local-data/studio-resources/review-overlays');
  const inputs=['all-studios-report.json','review-hub-status.json','next-qc-prompt.md'].map(name=>{
    const file=path.join(inputRoot,name),bytes=fs.readFileSync(file);return {name,bytes:bytes.length,sha256:digest(bytes)};
  });
  const before=read(path.join(inputRoot,'all-studios-report.json')),current=read(path.join(candidateRoot,'all-studios-report.json'));
  const ids=catalog.studios.filter(s=>!s.internal).map(s=>s.id).sort();
  assert(ids.length===24&&JSON.stringify(current.studios.map(s=>s.id).sort())===JSON.stringify(ids),'QC_CATALOG_NOT_24');
  const hub=read(path.join(candidateRoot,'review-hub-status.json'));
  const sourceBytes=await verify({run:false,dataRoot:ownerRoot});
  let ct;
  try{ct=await inspectRealCt();}catch(e){ct={status:'FAIL',error:e.message,releaseEligible:false};}
  const alternativeSources=read(path.join(ROOT,'licensing/candidates/alternative-sources-batch.v1.json')).sources;
  const studioChecks=[];
  for(const studio of catalog.studios.filter(s=>!s.internal)){
    const local=current.studios.find(r=>r.id===studio.id),candidate=local?.previewAvailable===true;
    const gate=inspectStudioResources({studioId:studio.id,catalog,catalogSchema:read(path.join(ROOT,'shared/studios/catalog.schema.json')),
      resources,resourceSchema:read(path.join(ROOT,'licensing/resource-manifest.schema.json')),
      evidence:read(path.join(ROOT,'licensing/commercial-rights-evidence.json')),
      commercialManifest:read(path.join(ROOT,'licensing/commercial-release.json')),
      buildRoot:path.join(ROOT,'apps/studios',studio.id,'dist')});
    const assets=resources.assets.filter(a=>a.id.startsWith(studio.id+'.'));
    const failed=sourceBytes.derived.mismatches.filter(m=>m.id.startsWith(studio.id+'.'));
    const mismatch=studio.id==='pelvis-ultrasound'&&candidate&&hub.results.some(r=>r.studio===studio.id&&r.kind==='fetal-head-contour');
    const ctStudio=['chest-ct','abdomen-ct'].includes(studio.id);
    let previewSource=null;
    if(candidate){
      const candidateId=ctStudio?'totalsegmentator-small-v201':studio.id==='msk-xray'?'fracatlas-v7':null;
      const alternative=alternativeSources.find(s=>s.id===candidateId);
      const canonical=resources.sources.find(s=>s.id===assets.find(a=>!a.sourceFile)?.sourceRef);
      const source=alternative||canonical;
      previewSource=source?{namespace:alternative?'private-candidate':'resource-source',id:source.id,
        officialUrl:source.officialUrl,release:source.sourceVersion||source.release,declaredLicense:source.declaredLicence||source.licenseId,
        candidateBoundToCanonicalRegistry:!alternative,assetClearance:gate.decision.eligible}:null;
    }
    studioChecks.push({id:studio.id,title:studio.title,
      overall:mismatch||gate.decision.eligible?'FAIL':'BLOCKED',
      privateDataPipeline:mismatch?'FAIL':candidate?(ctStudio?ct.status:'PASS'):'BLOCKED',
      nativePrivateBrowser:'BLOCKED',
      sourceScope:mismatch?'FAIL':candidate?'PASS':'BLOCKED',
      sourceScopeNote:mismatch?'HC18 depicts fetal head, not gynecologic pelvis':local.primaryBlocker,
      registeredDerivedBytes:{total:assets.filter(a=>!a.sourceFile).length,missingOrChanged:failed.length},
      registeredSourceLicenses:[...new Set(assets.map(a=>resources.sources.find(s=>s.id===a.sourceRef)?.licenseId).filter(Boolean))],
      privatePreviewSource:previewSource,
      medicalReview:'BLOCKED',privacyReview:'BLOCKED',commercialClearance:'BLOCKED',
      release:{status:gate.decision.eligible?'FAIL':'BLOCKED',eligible:gate.decision.eligible,blockers:[...new Set(gate.errors.map(e=>e.code))]},
      evidence:candidate?[`private preview ${studio.id}/index.html`,ctStudio?'native CT/mask pixel QC in this report':'verified private generator output and registered source byte audit']:
        ['No grounded modality-specific clinical preview in owner-local reports'],
      reviewersRequired:['qualified medical/anatomical reviewer','privacy reviewer','rights/attribution reviewer','owner exact-build approval']});
  }
  return {schema:'medcoel.final-private-studio-qc.v1',auditedAt:new Date().toISOString(),
    codeCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    codeWorktreeDirty:!!execFileSync('git',['status','--porcelain'],{cwd:ROOT,encoding:'utf8'}).trim(),
    pipelineFileSha256:Object.fromEntries(['scripts/private-totalseg-mpr.mjs','scripts/private-totalseg-mpr-browser.js',
      'scripts/private-totalseg-mpr-geometry.cjs','scripts/private-totalseg-ct-review.mjs','scripts/private-studio-source-qc.mjs',
      'licensing/tools/verify-studio-reproducibility.mjs'].map(p=>[p,digest(fs.readFileSync(path.join(ROOT,p)))])),
    sourceInputs:inputs,providedPreviewCount:before.privatePreviewCount,rebuiltPreviewCount:current.privatePreviewCount,
    sourceBytes,ct,studios:studioChecks,
    nativeBrowser:{status:'BLOCKED',note:'Not executed by this source-only tool. Separately record real browser evidence; VM logic is not a native browser.'},
    clinicalApproved:false,privacyApproved:false,rightsApproved:false,releaseEligible:false,publicDeploymentModified:false};
}

export function parseQcArgs(args){
  const parsed={};
  for(let i=0;i<args.length;i+=2){
    const key=args[i],value=args[i+1];
    if(!['--owner-root','--out'].includes(key)||key in parsed||!value||value.startsWith('--'))throw Error('QC_INVALID_ARGUMENT');
    parsed[key]=value;
  }
  return parsed;
}
export function assertPrivateQcOutput(file,{repoRoot=ROOT}={}){
  const absolute=path.resolve(file),base=path.resolve(repoRoot);
  if(!absolute.startsWith(path.join(base,'local-data')+path.sep))throw Error('QC_OUTPUT_MUST_REMAIN_PRIVATE');
  let cursor=base;
  for(const part of path.relative(base,absolute).split(path.sep)){
    cursor=path.join(cursor,part);
    if(fs.lstatSync(cursor,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('QC_OUTPUT_SYMLINK_REFUSED');
  }
  return absolute;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=parseQcArgs(process.argv.slice(2));
  const file=assertPrivateQcOutput(args['--out']||path.join(ROOT,'local-data/qc-final-20261123/source-qc.json'));
  const report=await collectPrivateStudioSourceQc({ownerRoot:args['--owner-root']?path.resolve(args['--owner-root']):ROOT});
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});assertPrivateQcOutput(file);
  fs.writeFileSync(file,JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify({providedPreviews:report.providedPreviewCount,rebuiltPreviews:report.rebuiltPreviewCount,
    sourceParents:`${report.sourceBytes.parents.matched}/${report.sourceBytes.parents.total}`,
    derived:`${report.sourceBytes.derived.matched}/${report.sourceBytes.derived.total}`,
    invalidHistoricalToolPins:report.sourceBytes.staleToolDigests.length,currentToolChanges:report.sourceBytes.currentToolChanges.length,
    ct:report.ct.status,releaseEligible:report.releaseEligible,report:file},null,2));
  // A complete medical/public release audit has NOT passed while any row is BLOCKED/FAIL.
  process.exitCode=report.studios.some(s=>s.overall==='FAIL')?1:report.studios.some(s=>s.overall==='BLOCKED')?2:0;
}
