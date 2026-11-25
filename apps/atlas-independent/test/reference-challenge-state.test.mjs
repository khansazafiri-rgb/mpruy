import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReferenceQuestions,scoreReferenceAnswer} from '../src/reference-challenge-state.js';
const entry=(n,name,fma=n)=>({id:'bp43-'+String(n).padStart(24,'0'),name,fmaId:'FMA'+fma,scope:'SINGLE_SOURCE_ELEMENT',approvedForDistribution:false,clinicalValidation:false,registrationValidated:false});
const data=[entry(1,'Left nerve'),entry(2,'Right nerve'),entry(3,'Other nerve'),entry(4,'Fourth structure'),entry(5,'Left nerve',1)];
test('deduplicate same-label fragments and preserve left/right answer distinctions',()=>{const qs=buildReferenceQuestions(data,()=>.5);assert.equal(qs.length,4);for(const q of qs){assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.label)).size,4);assert(scoreReferenceAnswer(q,q.entry.id));assert.equal(scoreReferenceAnswer(q,q.options.find(o=>o.id!==q.entry.id).id),false);assert.throws(()=>scoreReferenceAnswer(q,'fake'));}});
test('reject public or unvalidated input and insufficient distinct labels',()=>{assert.throws(()=>buildReferenceQuestions([{...data[0],approvedForDistribution:true}]));assert.deepEqual(buildReferenceQuestions(data.slice(0,3)),[]);assert.deepEqual(buildReferenceQuestions([...data,entry(6,'Left nerve',9)],()=>.5),[]);});
