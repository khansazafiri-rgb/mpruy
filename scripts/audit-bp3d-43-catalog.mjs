// Independent metadata-only discovery of Anatomography 4.3. No model publishing,
// no geometry mixing, no third-party downloader execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {loadIndependentReview} from './load-independent-source-review.mjs';
const publisher='https://lifesciencedb.jp/bp3d/get-info.cgi?version=4.3&cmd=concept-objfiles-list';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function parse43Manifest(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
 for(const label of ['Data Version','Objects set'])assert(lines.some(l=>new RegExp('^#\\s*'+label+'\\s+4\\.3\\s*$','i').test(l)),'Manifest missing explicit 4.3 '+label);
 const rows=[],seen=new Map(),elements=new Set();
 for(const line of lines){
  if(!line.trim()||line.trimStart().startsWith('#'))continue;
  const m=line.trim().match(/^(FMA\d+)\s+(is_a|part_of)\s+(FJ\d+[A-Za-z]?(?:\s*\+\s*FJ\d+[A-Za-z]?)*)$/);
  assert(m,'Unexpected manifest row');
  const ids=[...new Set(m[3].split('+').map(x=>x.trim()))].sort();
  const k=m[1]+':'+m[2],prior=seen.get(k);
  if(prior){assert.deepEqual(prior,ids,'Conflicting duplicate concept');continue;}
  seen.set(k,ids);ids.forEach(id=>elements.add(id));rows.push({fmaId:m[1],tree:m[2],elementIds:ids});
 }
 assert(rows.length>0,'Empty manifest');
 return {rows,elements:[...elements].sort()};
}
export function compare43(catalog,body){
 const fmas=new Set(body.map(m=>m.fmaId)),elements=new Set(body.flatMap(m=>m.sourceElements.map(e=>e.id)));
 const rows=catalog.rows.map(r=>({...r,existingConcept:fmas.has(r.fmaId),unseenElementIds:r.elementIds.filter(id=>!elements.has(id))}));
 return {schema:1,version:'4.3',sourceURL:publisher,scope:'Version-stamped publisher membership only; not proof of matching shape, frame, identity, clinical accuracy or commercial clearance.',sourceElements:catalog.elements.length,concepts:new Set(rows.map(r=>r.fmaId)).size,notInCurrentBodyConcepts:new Set(rows.filter(r=>!r.existingConcept).map(r=>r.fmaId)).size,elementIdsNotInCurrentBody:catalog.elements.filter(id=>!elements.has(id)).length,rows,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
}
export function run(folder){
 const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
 const pack=loadIndependentReview(q,folder);
 const out=fs.mkdtempSync(path.join(q,'bp3d-43-catalog-review-'));fs.chmodSync(out,0o700);
 const archive=path.join(out,'publisher-manifest.zip');
 execFileSync('curl',['--fail','--silent','--show-error','--proto','=https','--max-time','90','--max-filesize','16777216','--user-agent','MEDCOEL source provenance review/1.0','--output',archive,publisher],{stdio:['ignore','ignore','inherit']});
 const entries=execFileSync('unzip',['-Z','-1',archive],{encoding:'utf8',maxBuffer:1024*1024}).trim().split(/\r?\n/);
 assert(entries.length===1&&entries[0]==='FMA2Obj.txt','Unexpected archive content');
 const bytes=execFileSync('unzip',['-p',archive,'FMA2Obj.txt'],{maxBuffer:16*1024*1024});
 const catalog=parse43Manifest(bytes.toString('utf8'));
 assert(catalog.elements.length===3210,'Published 4.3 element count changed: review before acquiring');
 const result={...compare43(catalog,pack.inventory.bodyModels),sourcePack:folder,manifestSHA256:hash(bytes),archiveSHA256:hash(fs.readFileSync(archive)),bodyInventorySHA256:hash(fs.readFileSync(path.join(pack.folder,'inventory.json'))),sourceEvidence:'https://doi.org/10.5281/zenodo.22727173',dataLicenseNotice:'CC BY-SA 2.1 Japan per 4.3 reference; retain attribution and share-alike; version-specific commercial review pending',geometryDownloaded:0};
 fs.writeFileSync(path.join(out,'FMA2Obj.txt'),bytes,{flag:'wx',mode:0o600});
 const file=path.join(out,'comparison.json');fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('BP3D 4.3 CATALOG',JSON.stringify({...result,rows:undefined,file}));return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url))run(process.argv[2]||'');
