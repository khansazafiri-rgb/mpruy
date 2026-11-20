import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTypedAnswer, normalizeTerm } from '../typed-anatomy.mjs';
const target={conceptId:'FMA50875',side:'right'};
const terminology={
  status:'approved',conceptId:'FMA50875',
  forms:[
    {language:'id',value:'Saraf optik kanan',side:'right'},
    {language:'en',value:'Right optic nerve',side:'right'},
    {language:'la',value:'Nervus opticus dexter',side:'right'}
  ]
};
test('normalization is Unicode/case/whitespace safe',()=>{
  assert.equal(normalizeTerm('  NÉRVUS -- Opticus   '),'nervus opticus');
});
test('verified Bahasa Indonesia, English, and Latin forms accepted',()=>{
  for(const [answer,language] of [['saraf optik kanan','id'],['RIGHT optic nerve','en'],['Nervus opticus dexter','la']]){
    const r=checkTypedAnswer(answer,target,terminology);
    assert.equal(r.verdict,'correct');assert.equal(r.language,language);
    assert.equal(r.canonical,'FMA50875');
  }
});
test('one minor spelling error can be accepted without changing laterality',()=>{
  const r=checkTypedAnswer('right optic nerbe',target,terminology);
  assert.equal(r.verdict,'accepted-typo');assert.equal(r.matched,'Right optic nerve');
});
test('left, missing laterality, mixed sides or typo in laterality is never correct',()=>{
  for(const answer of ['left optic nerve','saraf optik kiri','optic nerve','right left optic nerve','righ optic nerve','Nervus opticus sinister'])
    assert.equal(checkTypedAnswer(answer,target,terminology).verdict,'wrong',answer);
});
test('terminology and concept identity require reviewed matching scope',()=>{
  assert.equal(checkTypedAnswer('Right optic nerve',target,{...terminology,status:'pending'}).verdict,'wrong');
  assert.equal(checkTypedAnswer('Right optic nerve',target,{...terminology,conceptId:'FMA_OTHER'}).verdict,'wrong');
});
test('difficult anatomy confusables are never accepted through typo tolerance',()=>{
  const one={conceptId:'FMA_ILEUM',side:null}, terms={status:'approved',conceptId:'FMA_ILEUM',forms:[{language:'en',value:'ileum'}]};
  assert.equal(checkTypedAnswer('ilium',one,terms).verdict,'wrong');
  const ulna={conceptId:'FMA_ULNA',side:null},u={status:'approved',conceptId:'FMA_ULNA',forms:[{language:'la',value:'ulna'}]};
  assert.equal(checkTypedAnswer('ulnar',ulna,u).verdict,'wrong');
});
test('general structure cannot answer a more specific target without review-approved synonym',()=>{
  const p={conceptId:'FMA67943'}, t={status:'approved',conceptId:p.conceptId,forms:[{language:'en',value:'pons'}]};
  assert.equal(checkTypedAnswer('brainstem',p,t).verdict,'wrong');
});
test('empty, overly long and numeric identifiers are not accepted as typos',()=>{
  const p={conceptId:'N1'},t={status:'approved',conceptId:'N1',forms:[{language:'en',value:'C1 vertebra'}]};
  for(const s of ['', ' '.repeat(20), 'C2 vertebra', 'x'.repeat(161)])
    assert.equal(checkTypedAnswer(s,p,t).verdict,'wrong');
});
