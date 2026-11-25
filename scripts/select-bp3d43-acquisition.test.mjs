import test from 'node:test';
import assert from 'node:assert/strict';
import {select43Acquisition} from './load-bp3d43-private-elements.mjs';
const make=(first)=>Array.from({length:32},(_,i)=>({fj:'FJ'+(first+i),bp:'BP'+(first+i),fma:'FMA'+(first+i),rawSHA256:String(first+i).padStart(64,'0'),publisherGLBSHA256:String(first+i+1000).padStart(64,'0'),triangles:1}));
const report=(folder,rows)=>({folder,report:{parsed:rows.length,results:rows.map(p=>({...p,glbSHA256:p.publisherGLBSHA256}))}});
test('equal-sized nerve and cardiovascular acquisitions are selected by source identity and exact hashes',()=>{const n=make(1),c=make(100),a=report('nerve',n),b=report('cardio',c);assert.equal(select43Acquisition([a,b],{matches:n}),'nerve');assert.equal(select43Acquisition([a,b],{matches:c}),'cardio');assert.throws(()=>select43Acquisition([a],{matches:c}));assert.throws(()=>select43Acquisition([b,{...b,folder:'duplicate'}],{matches:c}));const changed=structuredClone(b);changed.report.results[0].rawSHA256='x';assert.throws(()=>select43Acquisition([changed],{matches:c}));});
