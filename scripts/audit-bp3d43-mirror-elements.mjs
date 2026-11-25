// Independent mirror audit: checks content-addressed LFS objects, not fresh publisher bytes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseMembership,validateCandidates,selectMember} from './intake-bp3d43-priority-elements.mjs';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const mirror='https://github.com/olivercase/body_parts_3d_api.git',commit='fd527e6f4daf732fd814314d9257df5877b844bc';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function parsePointer(s){
 const m=s.match(/^version https:\/\/git-lfs\.github\.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize ([1-9]\d*)\r?\n?$/);
 assert(m,'Not an exact LFS pointer');const size=Number(m[2]);assert(Number.isSafeInteger(size)&&size<=32*1024*1024,'LFS size limit');return {sha256:m[1],size};
}
export function runMirror(){
 const local=path.join(root,'local-data');fs.mkdirSync(local,{recursive:true,mode:0o700});assert(fs.realpathSync(local)===local);
 const q=path.join(local,'licensing-quarantine');fs.mkdirSync(q,{recursive:true,mode:0o700});assert(fs.realpathSync(q)===q);
 const out=fs.mkdtempSync(path.join(q,'bp3d43-mirror-audit-'));fs.chmodSync(out,0o700);
 try{
  const git=(args,maxBuffer=8*1024*1024)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','credential.helper=','-c','protocol.file.allow=never',...args],{cwd:out,maxBuffer,timeout:180000,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}});
  git(['init','--quiet']);git(['remote','add','origin',mirror]);git(['fetch','--no-tags','--depth=1','origin',commit]);
  assert.equal(git(['rev-parse','FETCH_HEAD']).toString().trim(),commit);
  const doc=JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication/bp3d43-priority-element-candidates.json'),'utf8'));
  for(const [file,blob] of [['MANIFEST.csv',doc.manifestBlob],['metadata/FMA2Obj.txt',doc.membershipBlob]])assert.equal(git(['rev-parse',commit+':'+file]).toString().trim(),blob,'Pinned mirror metadata changed');
  const manifest=git(['show',commit+':metadata/FMA2Obj.txt']),catalog=parseMembership(manifest.toString('utf8')),rows=validateCandidates(doc,catalog);
  const paths=git(['ls-tree','-r','-z','--name-only',commit]).toString().split('\0').filter(Boolean);
  const results=[];
  for(const r of rows){
   try{
    const names=paths.filter(p=>p.startsWith('meshes/')&&/\.obj$/i.test(p));
    const rel=selectMember(names,r);
    const pointer=parsePointer(git(['show',commit+':'+rel]).toString('utf8'));
    assert.equal(pointer.size,r.bytes,'Catalog byte size differs');
    // No checkout, no third-party scripts, fetch only the exact requested path.
    git(['-c','lfs.url=https://github.com/olivercase/body_parts_3d_api.git/info/lfs','lfs','fetch','--include='+rel,'--exclude=','origin',commit]);
    const file=path.join(out,'.git/lfs/objects',pointer.sha256.slice(0,2),pointer.sha256.slice(2,4),pointer.sha256);
    assert(fs.realpathSync(file)===file&&fs.statSync(file).size===pointer.size);
    const raw=fs.readFileSync(file);assert.equal(sha(raw),pointer.sha256,'LFS content digest differs');
    const parsed=parseObj(raw.toString('utf8').replace(/\r\n|\r/g,'\n'));
    const glb=encodeNativeGlb([{id:r.fj,...parsed}],{version:'4.3',scope:'SINGLE_MIRROR_ELEMENT',mirrorCommit:commit,manifestSHA256:sha(manifest),fmaId:r.fma,bpId:r.bp,officialName:r.name,sourceElements:[{id:r.fj,sha256:pointer.sha256}]},'4.3');
    const replay=parseNativePositions(glb.bytes,'4.3');assert(replay.size===1&&comparePositions(parsed.positions,replay.get(r.fj)));
    results.push({...r,status:'EXACT_MIRROR_ELEMENT_GEOMETRY_MATCH',path:rel,rawSHA256:pointer.sha256,glbSHA256:glb.sha256,triangles:parsed.positions.length/9});
   }catch(e){results.push({...r,status:'HOLD',reason:String(e.message).slice(0,400)});}
  }
  const report={schema:1,mirror,commit,manifestSHA256:sha(manifest),results,passed:results.filter(r=>r.status==='EXACT_MIRROR_ELEMENT_GEOMETRY_MATCH').length,held:results.filter(r=>r.status==='HOLD').length,freshPublisherVerified:false,clinicalValidation:false,registrationValidated:false,geometryPublished:0,publicRelease:'NO_GO'};
  console.log('BP3D43 MIRROR GEOMETRY AUDIT',JSON.stringify(report));assert(report.held===0&&report.passed===rows.length,'Mirror geometry held');return report;
 }finally{fs.rmSync(out,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))runMirror();
