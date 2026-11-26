import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {serveHraReference} from './atlas-hra-private-reference.mjs';
import {mergeHraFemaleReferences} from './load-hra-female-five.mjs';
const id='a'.repeat(24);
test('private HRA route checks exact current bytes, rejects non-GET/HEAD and unknown assets',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hra-route-test-'));
 try{const file=path.join(root,'source.glb'),bytes=Buffer.from('engineering fixture');fs.writeFileSync(file,bytes);
 const sha256=createHash('sha256').update(bytes).digest('hex'),registry={assets:new Map([[id,{file,bytes:bytes.length,sha256,public:{id,name:'fixture'}}]]),blocked:[]};
 const request=(method,url)=>{let status,body;const ok=serveHraReference({method,url},{writeHead(s){status=s;},end(b){body=b;}},registry);assert(ok);return {status,body};};
 const u='/anatomy/viewer/hra-reference/'+id+'.glb';
 assert.deepEqual(request('GET',u),{status:200,body:bytes});assert.deepEqual(request('HEAD',u),{status:200,body:undefined});assert.equal(request('POST',u).status,404);
 fs.writeFileSync(file,Buffer.alloc(bytes.length,1));assert.equal(request('GET',u).status,404);assert.equal(request('GET','/anatomy/viewer/hra-reference/unknown.glb').status,404);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('reference merge cannot replace same identifier with different source hash',()=>{const a={assets:new Map([[id,{sha256:'a'}]]),blocked:[]};assert.throws(()=>mergeHraFemaleReferences(a,{assets:new Map([[id,{sha256:'b'}]]),blocked:[]}));assert.equal(mergeHraFemaleReferences(a,a).assets.size,1);});
