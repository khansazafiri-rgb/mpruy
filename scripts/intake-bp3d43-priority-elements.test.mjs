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
