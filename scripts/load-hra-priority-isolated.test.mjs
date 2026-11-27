import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {expectedPriorityMeshes,validatePriorityFile,loadPriorityHra} from './load-hra-priority-isolated.mjs';
test('exact 15 retained isolated meshes, no duplicate parotid or coccyx',()=>{
 const expected=expectedPriorityMeshes(),rows=[...expected.values()];assert.equal(rows.length,15);assert.equal(rows.reduce((n,x)=>n+x.bytes,0),765408);
 assert.equal(rows.filter(x=>x.label.toLowerCase().includes('parotid')).length,4);assert(rows.filter(x=>x.label.toLowerCase().includes('parotid')).every(x=>x.sourceId.startsWith('mouth-')));
 assert(!rows.some(x=>x.label.toLowerCase()==='coccyx'));
 assert.throws(()=>validatePriorityFile(Buffer.alloc(rows[0].bytes),rows[0]));
});
test('reject absent, extra, ambiguous or nonprivate quarantine directories',()=>{
 const tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'priority-loader-')));
 try{const q=path.join(tmp,'licensing-quarantine');fs.mkdirSync(q);const folder='hra-priority-isolated-test';fs.mkdirSync(path.join(q,folder),{mode:0o700});
 assert.throws(()=>loadPriorityHra(q,folder),/Exact file set/);
 fs.writeFileSync(path.join(q,folder,'extra.glb'),'bad');assert.throws(()=>loadPriorityHra(q,folder),/Exact file set/);
 assert.throws(()=>loadPriorityHra(q,'../bad'));fs.chmodSync(path.join(q,folder),0o755);assert.throws(()=>loadPriorityHra(q,folder),/Private directory/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
