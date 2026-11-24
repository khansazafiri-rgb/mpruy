// Read-only preparation of rights-review rows from the actual private export.
// Never copies geometry into a public tree and never grants rights.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {inspectNativeGlb} from './z-anatomy-final-qc.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const quarantine=path.join(root,'local-data/licensing-quarantine');
const revision='3c1679595d89aa508ddffc72cd5e125c5d609a59';
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const restricted=/\b(kidney|renal pelvis|renal calyx|calyces|cochlea|vestibule|tympanic|malleus|incus|stapes|inner ear|semicircular duct|semicircular canal)\b/i;
export function reviewRow(entry,lineage,source){
 const why=[];
 if(restricted.test(entry.name)||restricted.test(lineage.sourceObjectName||''))why.push('Known noncommercial contributor category; exclude pending exact independent provenance');
 if(entry.system==='nervous'||/cranial|foramen|foramina|skull|white matter|brain/i.test(entry.name))why.push('Dundee/Brainder/white matter contribution boundaries require explicit source mapping');
 if(lineage.revision!==revision||source.revision!==revision||lineage.archiveSHA256!==source.archiveSHA256||lineage.sourceBlendSHA256!==source.blendSHA256)why.push('Source revision or archive lineage mismatch');
 if(lineage.generatedGLBSHA256!==entry.glbSha256||lineage.approvedForDistribution!==false||entry.approvedForDistribution!==false)why.push('Unexpected candidate identity or approval state');
 return {id:entry.id,name:entry.name,group:entry.group,system:entry.system,sha256:entry.glbSha256,sourceObject:lineage.sourceObjectName,sourceCollections:lineage.sourceCollections,
  sourceRevision:lineage.revision,archiveSHA256:lineage.archiveSHA256,sourceLicenseNoticeSHA256:lineage.sourceLicenseNoticeSHA256,
  status:why.length?'PRIORITY_REVIEW_OR_EXCLUDE':'PENDING_PER_OBJECT_RIGHTS_REVIEW',reasons:why,rightsHolder:null,verifiedLicense:null,reviewer:null,evidence:[],commercialDistributionApproved:false};
}
function safe(base,rel){const p=path.resolve(base,rel);assert(p.startsWith(base+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe path '+rel);return p;}
export function prepare(folder){
 assert(fs.realpathSync(quarantine)===quarantine);
 assert(/^z-anatomy-native-preview-[a-zA-Z0-9_-]+$/.test(folder),'Use an explicit private preview folder basename');
 const dir=path.join(quarantine,folder);assert(fs.realpathSync(dir)===dir);
 const pack=path.join(dir,'pack'),inv=json(safe(pack,'inventory.json')),qc=json(safe(dir,'final-qc-report.json'));
 assert(inv.kind==='z-anatomy-original-source-private'&&inv.source.revision===revision&&inv.approvedForCommercialDistribution===false);
 assert(qc.geometry.verified===inv.converted.length&&qc.httpModelRoutesVerified===inv.converted.length&&qc.publicRelease==='NO_GO');
 assert(qc.httpSmoke==='PASS'&&qc.models===inv.converted.length&&qc.source?.archiveSHA256===inv.source.archiveSHA256&&qc.source?.blendSHA256===inv.source.blendSHA256,'Previous QC does not bind to this source');
 const cached=path.join(quarantine,'z-anatomy-official-'+revision.slice(0,12));
 assert(fs.realpathSync(cached)===cached,'Unsafe publisher cache');
 const archive=safe(cached,'Z-Anatomy.zip'),notice=safe(cached,'License.txt');
 const prefix='https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/'+revision+'/';
 const noticeBytes=fs.readFileSync(notice),noticeDigest=sha(noticeBytes);
 const pinned=fs.readFileSync(path.join(root,'licensing/atlas-publication/source-notices/z-anatomy.txt'));
 assert(noticeBytes.equals(pinned),'Source license differs from pinned publisher notice');
 for(const [file,name,digest] of [[archive,'Z-Anatomy.zip',inv.source.archiveSHA256],[notice,'License.txt',noticeDigest]]){
  const receipt=json(safe(cached,name+'.receipt.json'));
  assert(receipt.url===prefix+name&&receipt.revision===revision&&receipt.approvedForDistribution===false&&receipt.bytes===fs.statSync(file).size&&receipt.sha256===digest&&sha(fs.readFileSync(file))===digest,'Publisher receipt or byte hash mismatch: '+name);
 }
 const rows=[],ids=new Set(),names=new Set();
 for(const e of inv.converted){
  assert(/^za-[a-f0-9]{24}$/.test(e.id)&&!ids.has(e.id)&&e.modelPath==='./structures/'+e.id+'/model.glb');ids.add(e.id);
  const l=json(safe(pack,'structures/'+e.id+'/lineage.json')),b=fs.readFileSync(safe(pack,e.modelPath));
  assert(!names.has(e.name)&&l.sourceLicenseNoticeSHA256===noticeDigest&&typeof l.sourceObjectName==='string'&&e.id==='za-'+sha(Buffer.from(l.sourceObjectName)).slice(0,24),'Source notice, name or object identity mismatch');names.add(e.name);
  assert(sha(b)===e.glbSha256);inspectNativeGlb(b,e,l);rows.push(reviewRow(e,l,inv.source));
 }
 const result={schema:1,source:inv.source,sourceNotice:'https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/'+revision+'/License.txt',
  generalLicense:'CC-BY-SA-4.0; mixed contributor exceptions; not per-object clearance',
  totals:{candidates:rows.length,priorityReview:rows.filter(r=>r.reasons.length).length,approved:0},rows,
  oldViewerCode:'CC-BY-NC-SA-4.0; blocked',publicRelease:'NO_GO',clinicalValidation:'PENDING'};
 const out=path.join(dir,'publication-rights-review.json');assert(!fs.existsSync(out)||fs.realpathSync(out)===out);
 const tmp=out+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(tmp,out);console.log('PRIVATE RIGHTS REVIEW:',out,JSON.stringify(result.totals));
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url))prepare(process.argv[2]||'');
