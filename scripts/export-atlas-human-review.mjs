// Local reviewer packet, metadata only; never author approvals, change release state or copy geometry.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {buildReviewQueue} from './build-atlas-review-queue.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const hash=x=>createHash('sha256').update(x).digest('hex');
export function csvCell(v){let s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);if(/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function csv(headers,rows){return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
export function createReviewerPacket(queue=buildReviewQueue()){
 assert(queue.publicRelease==='NO_GO'&&queue.clinicalValidation===false&&queue.registrationValidated===false);
 assert.equal(queue.nomenclature.length,428);assert.equal(queue.rights.length,493);
 const termKeys=new Set(),assetKeys=new Set();
 const terms=queue.nomenclature.map(r=>{assert(r.status==='PENDING_MEDICAL_REVIEW'&&r.clinicalValidation===false&&r.reviewer===null&&r.officialTermId===null&&r.reviewedAt===null&&/^[a-f0-9]{64}$/.test(r.identitySHA256)&&!termKeys.has(r.fmaId));termKeys.add(r.fmaId);
  assert(r.identitySHA256===hash(JSON.stringify({fmaId:r.fmaId,sourceName:r.sourceName,labels:r.labels,elements:r.elements,system:r.system})));
  return [r.fmaId,r.identitySHA256,r.sourceName,r.labels.en,r.labels.id,r.labels.latin,r.system,r.flags.join('; '),r.elements,r.status,'','','','','',''];});
 const rights=queue.rights.map(r=>{const key=r.family+':'+r.id;assert(r.status==='HOLD'&&r.approvedForDistribution===false&&r.rightsReviewer===null&&!assetKeys.has(key));assetKeys.add(key);
  const identity={family:r.family,id:r.id,sourceIdentity:r.sourceIdentity,derivedGLBSHA256:r.derivedGLBSHA256??null,sourceReceipt:r.sourceReceipt,workflowRun:r.workflowRun,sourceLicenseStatus:r.sourceLicenseStatus};
  return [r.family,r.id,hash(JSON.stringify(identity)),r.sourceIdentity,r.derivedGLBSHA256??'',r.sourceReceipt,r.workflowRun,r.sourceLicenseStatus,r.license??'',r.attributionCandidate,r.status,'','','','','',''];});
 const data={
  'terminology-review.csv':csv(['fma_id','identity_sha256','source_label','english_candidate','indonesian_candidate','latin_candidate','system','review_flags','source_elements','existing_status','reviewer_name','review_date','official_term_id','official_reference_url','review_decision','notes'],terms),
  'asset-rights-review.csv':csv(['source_family','asset_id','identity_sha256','source_identity','derived_glb_sha256','source_receipt','workflow_run','source_license_status','stated_license','attribution_candidate','existing_status','reviewer_name','review_date','license_evidence_url','distribution_scope','review_decision','notes'],rights),
  'review-source.json':JSON.stringify(queue,null,2)+'\n'};
 const manifest={schema:1,scope:'Metadata-only blank human review templates. The filled rows are not accepted as release authorization.',publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,approvedForDistribution:0,termRows:terms.length,assetRows:rights.length,files:Object.entries(data).map(([file,content])=>({file,sha256:hash(content),bytes:Buffer.byteLength(content)}))};
 return {...data,'packet-manifest.json':JSON.stringify(manifest,null,2)+'\n'};
}
export function exportReviewerPacket(){assert(fs.realpathSync(q)===q&&fs.statSync(q).isDirectory(),'Existing private quarantine required');const data=createReviewerPacket(),out=fs.mkdtempSync(path.join(q,'atlas-human-review-'));fs.chmodSync(out,0o700);
 for(const [name,content] of Object.entries(data))fs.writeFileSync(path.join(out,name),content,{flag:'wx',mode:0o600});
 console.log('ATLAS HUMAN REVIEW PACKET '+JSON.stringify({folder:out,termRows:428,assetRows:493,clinicalValidation:false,approvedForDistribution:0,publicRelease:'NO_GO'}));return out;}
if(process.argv[1]===fileURLToPath(import.meta.url)){assert.deepEqual(process.argv.slice(2),['--export-local'],'Explicit --export-local required');exportReviewerPacket();}
