// Audit-only: never changes approvals, never copies assets to public roots.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const base=fileURLToPath(new URL('../licensing/atlas-publication/',import.meta.url));
const registry=JSON.parse(fs.readFileSync(path.join(base,'source-registry.json'),'utf8'));
const hash=(alg,b)=>createHash(alg).update(b).digest('hex');
const gitBlob=b=>hash('sha1',Buffer.concat([Buffer.from('blob '+b.length+'\0'),b]));
const hex64=/^[a-f0-9]{64}$/;
const text=v=>typeof v==='string'&&v.trim().length>0;
export function checkSourceNotices(){
 const out=[];
 assert.equal(registry.publicRelease,'NO_GO');
 for(const s of registry.sources){
  if(!s.notice)continue;
  const p=path.resolve(base,s.notice);
  assert(p.startsWith(base)&&fs.realpathSync(p)===p);
  const b=fs.readFileSync(p);assert.equal(gitBlob(b),s.gitBlob,'Pinned upstream notice changed: '+s.id);
  out.push({id:s.id,license:s.license,sha256:hash('sha256',b),upstreamBlob:s.gitBlob});
 }
 return out;
}
export function checkReviewEvidence(row,evidence){
 const reasons=[];
 if(!evidence)return {status:'MISSING_REVIEW',reasons:['No object-specific rights review']};
 if(evidence.id!==row.id||evidence.sourceObject!==row.sourceObject||evidence.sha256!==row.sha256||
    evidence.archiveSHA256!==row.archiveSHA256||evidence.sourceRevision!==row.sourceRevision||
    !hex64.test(row.sha256||'')||!hex64.test(row.archiveSHA256||''))reasons.push('Exact model and source identity mismatch');
 if(!['CC-BY-4.0','CC-BY-SA-4.0','CC-BY-SA-2.1-JP','CC0-1.0','MIT','WRITTEN-GRANT'].includes(evidence.license))reasons.push('Unsupported or noncommercial licence');
 if(!text(evidence.rightsHolder)||!text(evidence.reviewer)||!text(evidence.reviewedAt)||! /^\d{4}-\d{2}-\d{2}$/.test(evidence.reviewedAt||'')||
    !text(evidence.attribution)||!text(evidence.shareAlike)||!text(evidence.sourceObjectMapping))reasons.push('Missing named review, attribution, adaptation obligations or object mapping');
 if(evidence.commercialUse!==true||evidence.redistribution!==true||evidence.adaptation!==true)reasons.push('Commercial use, redistribution and adaptation not all documented');
 if(!Array.isArray(evidence.evidence)||!evidence.evidence.some(x=>x?.kind==='object-provenance'&&text(x.reference)&&hex64.test(x.sha256||'')))reasons.push('No specific object-provenance evidence digest');
 if(evidence.license==='WRITTEN-GRANT'&&(!Array.isArray(evidence.evidence)||!evidence.evidence.some(x=>x?.kind==='written-commercial-permission'&&text(x.reference)&&hex64.test(x.sha256||''))))reasons.push('No written commercial grant artifact digest');
 if(row.reasons?.some(x=>/noncommercial contributor/i.test(x))&&evidence.license!=='WRITTEN-GRANT')reasons.push('Known NC candidate requires explicit grant or separately sourced replacement');
 if(row.reasons?.some(x=>/mismatch|unexpected candidate/i.test(x)))reasons.push('Source integrity issue must be resolved first');
 return {status:reasons.length?'REJECTED_EVIDENCE':'EVIDENCE_FIELDS_COMPLETE_REQUIRES_HUMAN_APPROVAL',reasons};
}
export function auditReview(report,reviewed=[]){
 assert(Array.isArray(report.rows)&&Array.isArray(reviewed)&&report.publicRelease==='NO_GO');
 const map=new Map();for(const r of reviewed){assert(text(r.id)&&!map.has(r.id),'Duplicate evidence ID');map.set(r.id,r);}
 const ids=new Set();const rows=report.rows.map(r=>{assert(text(r.id)&&!ids.has(r.id),'Duplicate model ID');ids.add(r.id);
  return {id:r.id,name:r.name,group:r.group,...checkReviewEvidence(r,map.get(r.id))};});
 for(const id of map.keys())assert(ids.has(id),'Evidence for unknown model '+id);
 const groups={};for(const r of rows){const g=groups[r.group]??={total:0,missing:0,rejected:0,fieldsComplete:0};g.total++;if(r.status==='MISSING_REVIEW')g.missing++;else if(r.status==='REJECTED_EVIDENCE')g.rejected++;else g.fieldsComplete++;}
 return {sourceNotices:checkSourceNotices(),groups,rows,approved:0,publicRelease:'NO_GO',note:'Schema and integrity checks are not legal verification. No release approval is generated.'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [reviewFile,evidenceFile]=process.argv.slice(2);
 if(!reviewFile){console.log(JSON.stringify({sourceNotices:checkSourceNotices(),publicRelease:'NO_GO'},null,2));}
 else{const result=auditReview(JSON.parse(fs.readFileSync(reviewFile,'utf8')),evidenceFile?JSON.parse(fs.readFileSync(evidenceFile,'utf8')):[]);console.log(JSON.stringify(result,null,2));}
}
