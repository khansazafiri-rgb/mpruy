// Match cached original HRA GLBs to individually checked publisher-version evidence.
// Keeps the original subject/frame and all quarantine flags; no asset copy or approval.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildHraRegistry} from './atlas-hra-private-reference.mjs';
import {parsePublisherMetadata} from './acquire-hra-publication-metadata.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const registry=JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication/source-registry.json'),'utf8'));
const examples=registry.sources.find(s=>s.id==='hra').versionSpecificExamples;
export function matchReferenceEvidence(url,records=examples){
 if(typeof url!=='string')return null;
 const m=url.match(/^https:\/\/cdn\.humanatlas\.io\/digital-objects\/ref-organ\/([a-z0-9-]+)\/(v\d+\.\d+(?:\.\d+)?)\/assets\/[a-z0-9-]+\.glb$/);
 if(!m)return null;
 const hits=records.filter(r=>r.assetURL===url&&r.id===m[1]&&r.version===m[2]&&r.license==='CC-BY-4.0'&&r.publisher&&r.creators?.length&&r.evidence&&r.doi);
 return hits.length===1?hits[0]:null;
}
const pinnedRevision='27d6d493cd53761abb10f087767ec4cc74acb051';
function loadPublisherProofs(privateRoot,folder){
 if(!folder)return new Map();
 assert(/^hra-publisher-metadata-[A-Za-z0-9_-]+$/.test(folder),'Invalid publisher metadata folder');
 const dir=path.join(privateRoot,folder);assert(fs.realpathSync(dir)===dir);
 function local(name){const p=path.join(dir,name);assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe publisher evidence');return fs.readFileSync(p);}
 const report=JSON.parse(local('publication-hra-metadata-evidence.json').toString('utf8'));
 assert(report.sourceRevision===pinnedRevision&&report.publicRelease==='NO_GO'&&report.approved===0&&Array.isArray(report.rows)&&report.total===report.rows.length,'Invalid metadata evidence report');
 const proofs=new Map(),seen=new Set();
 for(const row of report.rows){
  assert(/^[a-f0-9]{24}$/.test(row.cacheId||'')&&!seen.has(row.cacheId));seen.add(row.cacheId);
  if(row.status!=='PUBLISHER_VERSION_METADATA_MATCHED')continue;
  assert(row.approvedForDistribution===false&&row.publisherRevision===pinnedRevision&&row.registrationValidated===false&&row.clinicalValidation===false,'Unexpected approval');
  const bytes=local(row.cacheId+'.yaml');assert(sha(bytes)===row.metadataSHA256,'Publisher metadata changed');
  const p=parsePublisherMetadata(bytes.toString('utf8'),row.assetURL);
  for(const k of ['id','version','assetURL','publisher','doi','license','evidence'])assert.equal(p[k],row[k],'Metadata identity mismatch: '+k);
  assert.deepEqual(p.creators,row.creators);
  assert(row.cacheId===sha(row.assetURL).slice(0,24)&&/^[a-f0-9]{64}$/.test(row.sha256||''));
  proofs.set(row.cacheId,{...p,sha256:row.sha256,metadataSHA256:row.metadataSHA256,publisherRevision:pinnedRevision});
 }
 return proofs;
}
export async function prepareHraRightsReview(privateRoot=path.join(root,'local-data/licensing-quarantine'),metadataFolder=process.env.MEDCOEL_HRA_METADATA_FOLDER){
 assert(fs.realpathSync(privateRoot)===privateRoot,'Private root must be real');
 const cache=path.join(privateRoot,'hra-reference-organs-private');
 const checked=await buildHraRegistry(privateRoot),publisherProofs=loadPublisherProofs(privateRoot,metadataFolder);
 const rows=[];
 for(const [id,a] of checked.assets){
  const fresh=publisherProofs.get(id);
  const proof=fresh||(!metadataFolder?matchReferenceEvidence(a.public.source):null);
  const receipt=JSON.parse(fs.readFileSync(a.file+'.json','utf8'));
  const bytes=fs.readFileSync(a.file);
  assert(sha(bytes)===receipt.sha256,'Cached reference changed');
  if(fresh)assert(fresh.sha256===receipt.sha256&&fresh.assetURL===a.public.source,'Publisher evidence GLB binding differs');
  const records=Array.isArray(receipt.metadata)?receipt.metadata:[];
  const exactRecord=records.some(r=>r?.object?.file===a.public.source);
  rows.push({id,name:a.public.name,version:a.public.version,sourceURL:a.public.source,sha256:receipt.sha256,
   bytes:bytes.length,meshCount:a.public.meshCount,exactApiAssetLink:exactRecord,
   publisherLicense:proof?.license||null,creators:proof?.creators||[],doi:proof?.doi||null,
   evidence:proof?.evidence||null,metadataSHA256:fresh?.metadataSHA256||null,publisherRevision:fresh?.publisherRevision||null,
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
if(process.argv[1]===fileURLToPath(import.meta.url))await prepareHraRightsReview(undefined,process.argv[2]||process.env.MEDCOEL_HRA_METADATA_FOLDER);
