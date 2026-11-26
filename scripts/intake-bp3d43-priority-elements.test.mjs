import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMembership,validateCandidates,selectMember} from './intake-bp3d43-priority-elements.mjs';
test('mixed CR and LF manifest lines retain exact membership and reject wrong versions',()=>{
 const m=parseMembership('# Data Version\t4.3\n# Objects set\t4.3\nFMA1\tis_a\tFJ1+FJ2\rFMA2\tpart_of\tFJ3\r');
 assert.equal(m.all.size,3);assert.deepEqual(m.rows.get('FMA1:is_a'),['FJ1','FJ2']);
 const r={fj:'FJ2',bp:'BP2',fma:'FMA1',name:'Left fixture',conceptMembership:['is_a']};
 const d={sourceVersion:'4.3',geometryVerified:false,publicRelease:'NO_GO',rows:[r]};
 assert.deepEqual(validateCandidates(d,m),[r]);
 assert.throws(()=>validateCandidates({...d,rows:[{...r,fma:'FMA2'}]},m));
 assert.throws(()=>parseMembership('# Data Version 4.0\n# Objects set 4.0\nFMA1 is_a FJ1'));
 assert.equal(selectMember(['FJ2_BP2_FMA1_Left_fixture.obj','FJ1_BP2_FMA1_Other.obj'],r),'FJ2_BP2_FMA1_Left_fixture.obj');
 assert.throws(()=>selectMember(['FJ2_BP2_FMA1_Right_fixture.obj'],r));
 assert.throws(()=>selectMember(['../FJ2_BP2_FMA1_Left_fixture.obj'],r));
 assert.equal(selectMember(['meshes/parts/FJ2_BP2_FMA1_Left_fixture.obj'],r),'meshes/parts/FJ2_BP2_FMA1_Left_fixture.obj');
 assert.throws(()=>selectMember(['FJ2_BP2_FMA1_Left_fixture.obj','nested/FJ2_BP2_FMA1_Left_fixture.obj'],r));
});

import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
test('4.3 element replay is exact and fails the default 4.0 gate',()=>{
 const p=parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
 const a=encodeNativeGlb([{id:'FJ1',...p}],{version:'4.3'},'4.3');
 assert(comparePositions(p.positions,parseNativePositions(a.bytes,'4.3').get('FJ1')));
 assert.throws(()=>parseNativePositions(a.bytes));
 const b=encodeNativeGlb([{id:'FJ1',...p}],{});
 assert(comparePositions(p.positions,parseNativePositions(b.bytes).get('FJ1')));
 assert.throws(()=>parseNativePositions(b.bytes,'4.3'));
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateZipEnvelope,downloadZipValidated} from './intake-bp3d43-priority-elements.mjs';
test('publisher envelope retry rejects HTML and truncated ZIP then accepts valid archive',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bp43-envelope-'));
 try{
  fs.writeFileSync(path.join(dir,'FMA2Obj.txt'),'engineering fixture');
  const valid=path.join(dir,'valid.zip'),out=path.join(dir,'out.zip');
  // Python standard library creates a technical fixture, no anatomy data.
  execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.write(sys.argv[2],"FMA2Obj.txt"); z.close()',valid,path.join(dir,'FMA2Obj.txt')]);
  let calls=0;
  const fetch=(_url,dest)=>{calls++;if(calls===1)fs.writeFileSync(dest,'<html>temporary error</html>');else if(calls===2)fs.writeFileSync(dest,Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),Buffer.alloc(32)]));else fs.copyFileSync(valid,dest);};
  assert.deepEqual(downloadZipValidated('https://example.invalid',out,[],{fetch}),['FMA2Obj.txt']);
  assert.equal(calls,3);assert.deepEqual(fs.readFileSync(out),fs.readFileSync(valid));assert(!fs.existsSync(out+'.partial'));
  assert.throws(()=>downloadZipValidated('https://example.invalid',out,[],{fetch}),/Refusing/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('persistent bad publisher response never leaves an accepted ZIP',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bp43-envelope-'));
 try{const out=path.join(dir,'out.zip');let calls=0;
 const fetch=(_url,dest)=>{calls++;fs.writeFileSync(dest,'<html>not a source archive</html>');};
 assert.throws(()=>downloadZipValidated('https://example.invalid',out,[],{fetch}),/3 bounded attempts/);
 assert.equal(calls,3);assert(!fs.existsSync(out));assert(!fs.existsSync(out+'.partial'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

import {createHash} from 'node:crypto';
import {downloadPublisherManifest} from './intake-bp3d43-priority-elements.mjs';
test('pinned manifest replay rejects a valid ZIP with changed or malformed membership before retrying',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bp43-manifest-'));
 try{
  const valid='# Data Version 4.3\n# Objects set 4.3\nFMA1 is_a FJ1\n',pin=createHash('sha256').update(valid).digest('hex');
  const makeZip=(name,content)=>{const f=path.join(dir,name);execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("FMA2Obj.txt",sys.argv[2]); z.close()',f,content]);return f;};
  const malformed=makeZip('malformed.zip','# Data Version 4.3\n# Objects set 4.3\nFMA1 invalid FJ1'),changed=makeZip('changed.zip',valid.replace('FJ1','FJ2')),exact=makeZip('exact.zip',valid),out=path.join(dir,'out.zip');
  let n=0;const fetch=(_url,dest)=>fs.copyFileSync([malformed,changed,exact][n++],dest);
  const r=downloadPublisherManifest('https://example.invalid',out,[],pin,{fetch});
  assert.equal(n,3);assert.equal(r.bytes.toString(),valid);assert(r.catalog.all.has('FJ1'));assert(!fs.existsSync(out+'.partial'));
  const held=path.join(dir,'held.zip');
  assert.throws(()=>downloadPublisherManifest('https://example.invalid',held,[],pin,{fetch:(_url,dest)=>fs.copyFileSync(changed,dest)}),/3 bounded attempts/);
  assert(!fs.existsSync(held));assert(!fs.existsSync(held+'.partial'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
