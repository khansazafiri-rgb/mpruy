// Match cached original HRA GLBs to individually checked publisher-version evidence.
// Keeps the original subject/frame and all quarantine flags; no asset copy or approval.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildHraRegistry} from './atlas-hra-private-reference.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const registry=JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication/source-registry.json'),'utf8'));
const examples=registry.sources.find(s=>s.id==='hra').versionSpecificExamples;
export function matchReferenceEvidence(url,records=examples){
 let u;try{u=new URL(url);}catch{return null;}
 if(u.protocol!=='https:'||u.hostname!=='cdn.humanatlas.io'||u.username||u.password||u.port||u.search||u.hash)return null;
 const m=u.pathname.match(/^\/digital-objects\/ref-organ\/([a-z0-9-]+)\/(v\d+\.\d+(?:\.\d+)?)\/assets\/[a-z0-9-]+\.glb$/);
 if(!m)return null;
 const hits=records.filter(r=>r.id===m[1]&&r.version===m[2]&&r.license==='CC-BY-4.0'&&r.publisher&&r.creators?.length&&r.evidence&&r.doi);
 return hits.length===1?hits[0]:null;
}
export async function prepareHraRightsReview(privateRoot=path.join(root,'local-data/licensing-quarantine')){
 assert(fs.realpathSync(privateRoot)===privateRoot,'Private root must be real');
 const cache=path.join(privateRoot,'hra-reference-organs-private');
 const checked=await buildHraRegistry(privateRoot);
 const rows=[];
 for(const [id,a] of checked.assets){
  const proof=matchReferenceEvidence(a.public.source);
  const receipt=JSON.parse(fs.readFileSync(a.file+'.json','utf8'));
  const bytes=fs.readFileSync(a.file);
  assert(sha(bytes)===receipt.sha256,'Cached reference changed');
  const records=Array.isArray(receipt.metadata)?receipt.metadata:[];
  const exactRecord=records.some(r=>r?.object?.file===a.public.source);
  rows.push({id,name:a.public.name,version:a.public.version,sourceURL:a.public.source,sha256:receipt.sha256,
   bytes:bytes.length,meshCount:a.public.meshCount,exactApiAssetLink:exactRecord,
   publisherLicense:proof?.license||null,creators:proof?.creators||[],doi:proof?.doi||null,
   evidence:proof?.evidence||null,
   attribution:proof?proof.creators.join(', ')+' — '+a.public.name+' '+proof.version+'; '+proof.publisher+' / Human Reference Atlas; '+proof.doi+'; CC BY 4.0; https://creativecommons.org/licenses/by/4.0/':null,
   status:proof&&exactRecord?'PUBLISHER_VERSION_EVIDENCE_MATCHED':'HOLD_VERSION_OR_METADATA_UNVERIFIED',
   registrationValidated:false,clinicalValidation:false,approvedForDistribution:false});
 }
 const result={scope:'Verified private original bytes plus version-specific publisher terms; not release authorization',
   total:rows.length,matched:rows.filter(r=>r.status==='PUBLISHER_VERSION_EVIDENCE_MATCHED').length,
   blocked:checked.blocked,rows,publicRelease:'NO_GO',approved:0};
 if(fs.existsSync(cache)){
  assert(fs.realpathSync(cache)===cache);
  const out=path.join(cache,'publication-reference-rights-review.json');
  // Write via a new exclusive temporary file; never follow an existing output symlink.
  const tmp=out+'.'+process.pid+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(tmp,out);
  console.log('HRA REFERENCE RIGHTS REVIEW:',out,'matched',result.matched,'/',result.total);
 }
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await prepareHraRightsReview();
