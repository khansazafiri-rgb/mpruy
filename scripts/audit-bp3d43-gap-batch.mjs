// Resolve element IDs from actual pinned mirror tree, never generic FMA labels.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseMembership,validateCandidates,run} from './intake-bp3d43-priority-elements.mjs';
import {runMirror} from './audit-bp3d43-mirror-elements.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const pin='fd527e6f4daf732fd814314d9257df5877b844bc';
export function resolveGapRows(doc,paths,catalog){
 assert(doc.schema===1&&doc.sourceVersion==='4.3'&&doc.publicRelease==='NO_GO'&&doc.geometryVerified===false&&doc.mirrorCommit===pin&&doc.rows.length===28);
 const rows=doc.rows.map(r=>{
  assert(/^FJ\d+[A-Za-z]?$/.test(r.fj)&&typeof r.name==='string'&&Number.isSafeInteger(r.bytes)&&r.bytes>0);
  const files=paths.filter(p=>p.startsWith('meshes/'+r.fj+'_')&&p.endsWith('.obj'));assert.equal(files.length,1,'Ambiguous mirror identity '+r.fj);
  const name=path.posix.basename(files[0]);const m=name.match(/^(FJ\d+[A-Za-z]?)_(BP\d+)_(FMA\d+)_(.+)\.obj$/);
  assert(m&&m[1]===r.fj&&m[4].replace(/_/g,' ')===r.name,'Source label differs '+r.fj);
  const conceptMembership=['is_a','part_of'].filter(t=>catalog.rows.get(m[3]+':'+t)?.includes(r.fj));assert(conceptMembership.length,'No exact membership '+r.fj);
  return {...r,bp:m[2],fma:m[3],conceptMembership,observedArchiveBasename:name};
 });
 const resolved={...doc,licenseReview:'VERSION_SPECIFIC_REVIEW_REQUIRED',rows};validateCandidates(resolved,catalog);return resolved;
}
function resolve(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-bp43-gap-tree-'));
 try{
  const git=(args,maxBuffer=8*1024*1024)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','credential.helper=','-c','protocol.file.allow=never',...args],{cwd:dir,maxBuffer,timeout:180000,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}});
  git(['init','--quiet']);git(['remote','add','origin','https://github.com/olivercase/body_parts_3d_api.git']);git(['fetch','--no-tags','--depth=1','origin',pin]);assert.equal(git(['rev-parse','FETCH_HEAD']).toString().trim(),pin);
  const doc=JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication/bp3d43-gap-batch-candidates.json'),'utf8'));
  for(const [f,b] of [['MANIFEST.csv',doc.manifestBlob],['metadata/FMA2Obj.txt',doc.membershipBlob]])assert.equal(git(['rev-parse',pin+':'+f]).toString().trim(),b);
  const catalog=parseMembership(git(['show',pin+':metadata/FMA2Obj.txt']).toString('utf8')),paths=git(['ls-tree','-r','-z','--name-only',pin]).toString().split('\0');
  const resolved=resolveGapRows(doc,paths,catalog);console.log('BP3D43 GAP BATCH IDENTITIES',JSON.stringify(resolved));return resolved;
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const doc=resolve(),publisher=run(doc),mirror=runMirror(doc);
const matches=publisher.results.map(p=>{const m=mirror.results.find(x=>x.fj===p.fj);assert(m&&p.rawSHA256===m.rawSHA256&&p.triangles===m.triangles&&p.bp===m.bp&&p.fma===m.fma);return {fj:p.fj,bp:p.bp,fma:p.fma,name:p.name,triangles:p.triangles,rawSHA256:p.rawSHA256};});
assert.equal(matches.length,28);console.log('BP3D43 GAP BATCH DUAL SOURCE PASS',JSON.stringify({matches,geometryPublished:0,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false}));
