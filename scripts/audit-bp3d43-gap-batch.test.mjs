import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveGapRows,compareGapReports} from './audit-bp3d43-gap-batch.mjs';
const rows=Array.from({length:28},(_,i)=>({fj:'FJ'+(i+1),name:'Fixture '+(i+1),bytes:12}));
const doc={schema:1,sourceVersion:'4.3',publicRelease:'NO_GO',geometryVerified:false,mirrorCommit:'fd527e6f4daf732fd814314d9257df5877b844bc',rows};
const paths=rows.map((r,i)=>'meshes/'+r.fj+'_BP'+(i+1)+'_FMA'+(i+1)+'_'+r.name+'.obj');
const catalog={all:new Set(rows.map(r=>r.fj)),rows:new Map(rows.map((r,i)=>['FMA'+(i+1)+':is_a',[r.fj]]))};
test('one ambiguous filename holds only that identity, all other rows remain auditable',()=>{
 const resolved=resolveGapRows(doc,[...paths,paths[0]],catalog);
 assert.equal(resolved.rows.length,27);assert.equal(resolved.identityHeld.length,1);assert.equal(resolved.identityHeld[0].fj,'FJ1');
 const report=compareGapReports(resolved,null,null);assert.equal(report.held,28);assert.equal(report.matched,0);
});
test('only matching publisher and mirror identity and raw digest count',()=>{
 const resolved=resolveGapRows(doc,paths,catalog);
 const source=resolved.rows.map(r=>({...r,triangles:1,rawSHA256:'a'.repeat(64),status:'EXACT_SOURCE_ELEMENT_GEOMETRY_MATCH'}));
 const mirror=source.map(r=>({...r,status:'EXACT_MIRROR_ELEMENT_GEOMETRY_MATCH'}));
 mirror[0].rawSHA256='b'.repeat(64);mirror[1].fma='FMA999';
 const report=compareGapReports(resolved,{results:source},{results:mirror});
 assert.equal(report.matched,26);assert.equal(report.held,2);assert.equal(report.publicRelease,'NO_GO');
});
