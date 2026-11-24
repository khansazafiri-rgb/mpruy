// Assemble a rights-review candidate, never a production release.
// Requires explicit model selections and reviewed evidence; no implicit promotion.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepare} from './prepare-atlas-publication-review.mjs';
import {checkReviewEvidence,checkSourceNotices} from './audit-atlas-publication-rights.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const quarantine=path.join(root,'local-data/licensing-quarantine');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const text=v=>typeof v==='string'&&v.trim().length>0;
const hex=/^[a-f0-9]{64}$/;
const date=/^\d{4}-\d{2}-\d{2}$/;
const groups=new Set(['skeletal','muscular','joints','arterial','venous','heart','nervous','lymphatic','respiratory','digestive','urinary','reproductive','endocrine']);
const regions=new Set(['whole','headNeck','thorax','abdomen','pelvis','back','upperLimb','lowerLimb']);
const licenses={'CC-BY-4.0':'https://creativecommons.org/licenses/by/4.0/','CC-BY-SA-4.0':'https://creativecommons.org/licenses/by-sa/4.0/','CC-BY-SA-2.1-JP':'https://creativecommons.org/licenses/by-sa/2.1/jp/','CC0-1.0':'https://creativecommons.org/publicdomain/zero/1.0/'};
function safe(base,rel){
 assert(typeof rel==='string'&&rel&&!path.isAbsolute(rel)&&!rel.includes('\\')&&!rel.split('/').some(x=>!x||x==='.'||x==='..'),'Invalid relative input');
 const p=path.resolve(base,rel);
 assert(p.startsWith(base+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe input '+rel);
 return p;
}
export function validateSelection(report,inventory,selection,verifyEvidence){
 assert(report.publicRelease==='NO_GO'&&inventory.approvedForCommercialDistribution===false&&inventory.sourceFrame==='z-anatomy-world-y-up-metres','Invalid source pack');
 assert(selection?.schema===1&&selection.purpose==='private-distribution-review'&&Array.isArray(selection.entries)&&selection.entries.length>0,'Explicit nonempty selection required');
 assert(text(selection.reviewer)&&date.test(selection.reviewedAt||'')&&selection.reviewedAt<=new Date().toISOString().slice(0,10),'Named and dated reviewer required');
 assert(selection.sourceArchiveSHA256===inventory.source.archiveSHA256&&hex.test(selection.sourceArchiveSHA256),'Wrong source archive');
 const rows=new Map(report.rows.map(r=>[r.id,r])),models=new Map(inventory.converted.map(e=>[e.id,e]));
 assert(rows.size===report.rows.length&&models.size===inventory.converted.length&&rows.size===models.size,'Duplicate or mismatched source inventories');
 const seen=new Set(),names=new Set(),out=[];
 for(const e of selection.entries){
  assert(/^za-[a-f0-9]{24}$/.test(e.id||'')&&!seen.has(e.id),'Duplicate or invalid selected model');
  seen.add(e.id);
  const row=rows.get(e.id),m=models.get(e.id);
  assert(row&&m&&row.sha256===m.glbSha256&&e.sha256===m.glbSha256&&row.name===m.name&&row.group===m.group,'Selection does not match original model');
  assert(m.approvedForDistribution===false&&row.commercialDistributionApproved===false,'Unexpected original approval');
  assert(!names.has(m.name)&&groups.has(m.group)&&Array.isArray(m.privateAtlasMeta?.regions)&&m.privateAtlasMeta.regions.length>0&&m.privateAtlasMeta.regions.every(r=>regions.has(r)),'Invalid display metadata');
  names.add(m.name);
  const review=e.review;
  assert(review?.reviewer===selection.reviewer&&review.reviewedAt===selection.reviewedAt,'Reviewer mismatch');
  assert(review?.decision==='include-in-private-distribution-review','Explicit inclusion review missing');
  assert(checkReviewEvidence(row,review).status==='EVIDENCE_FIELDS_COMPLETE_REQUIRES_HUMAN_APPROVAL','Incomplete object rights evidence: '+m.name);
  assert(Object.hasOwn(licenses,review.license)||review.license==='WRITTEN-GRANT','No supported model redistribution terms');
  assert(text(review.changeDescription)&&text(review.sourceURL)&&/^https:\/\//.test(review.sourceURL),'Source link and change description required');
  assert(Array.isArray(review.evidence)&&review.evidence.length&&review.evidence.every(v=>text(v.reference)&&hex.test(v.sha256||'')&&verifyEvidence(v)),'Missing or altered evidence bytes');
  assert(review.evidence.some(v=>v.kind==='license-terms'),'Actual license evidence required');
  out.push({model:m,review});
 }
 return out;
}
export function assemble(folder,selectionName){
 assert(fs.realpathSync(quarantine)===quarantine);
 assert(/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(folder),'Explicit existing preview folder required');
 assert(/^publication-selection-[A-Za-z0-9_-]+\.json$/.test(selectionName),'Explicit reviewed selection filename required');
 const dir=path.join(quarantine,folder);assert(fs.realpathSync(dir)===dir);
 const pack=path.join(dir,'pack'),selection=read(safe(dir,selectionName));
 const report=prepare(folder),inventory=read(safe(pack,'inventory.json'));
 const sourceNotices=checkSourceNotices();
 const selected=validateSelection(report,inventory,selection,v=>{
  assert(/^publication-evidence\/[A-Za-z0-9_.-]+$/.test(v.reference),'Evidence must be a local review artifact, not an unchecked URL');
  return sha(fs.readFileSync(safe(dir,v.reference)))===v.sha256;
 });
 const out=fs.mkdtempSync(path.join(quarantine,'atlas-distribution-review-'));
 fs.chmodSync(out,0o700);
 try{
  fs.mkdirSync(path.join(out,'models'),{mode:0o700});
  const entries=[],attributions=[];
  for(const {model:m,review:r} of selected){
   const b=fs.readFileSync(safe(pack,'structures/'+m.id+'/model.glb'));
   assert(sha(b)===m.glbSha256,'Source model bytes changed');
   fs.writeFileSync(path.join(out,'models',m.id+'.glb'),b,{flag:'wx',mode:0o600});
   const a={id:m.id,name:m.name,sha256:m.glbSha256,license:r.license,licenseURL:licenses[r.license]||null,rightsHolder:r.rightsHolder,
    attribution:r.attribution,shareAlike:r.shareAlike,sourceURL:r.sourceURL,changeDescription:r.changeDescription};
   attributions.push(a);
   entries.push({id:m.id,name:m.name,group:m.group,regions:m.privateAtlasMeta.regions,path:'models/'+m.id+'.glb',sha256:m.glbSha256,approvedForDistribution:false});
  }
  const write=(n,d)=>fs.writeFileSync(path.join(out,n),JSON.stringify(d,null,2)+'\n',{flag:'wx',mode:0o600});
  write('inventory.json',{schema:1,mode:'private-review',publicRelease:'NO_GO',sourceFrame:inventory.sourceFrame,entries});
  write('MODEL-ATTRIBUTIONS.json',{schema:1,entries:attributions});
  write('distribution-review.json',{schema:1,publicRelease:'NO_GO',selected:entries.length,excluded:inventory.converted.length-entries.length,reviewer:selection.reviewer,reviewedAt:selection.reviewedAt,sourceArchiveSHA256:selection.sourceArchiveSHA256,sourceNotices,selectionSHA256:sha(fs.readFileSync(safe(dir,selectionName))),clinicalValidation:'PENDING',approvedBuild:false});
  console.log('PRIVATE DISTRIBUTION REVIEW',out,entries.length,'selected; not approved for public release');
  return out;
 }catch(error){fs.rmSync(out,{recursive:true,force:true});throw error;}
}
if(process.argv[1]===fileURLToPath(import.meta.url))assemble(process.argv[2]||'',process.argv[3]||'');
