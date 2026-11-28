import test from 'node:test';
import assert from 'node:assert/strict';
import {challengeLabel,typedReferenceAnswer,hasChallengeGlossary} from '../src/reference-challenge-language.js';
const median={fmaId:'FMA37068',name:'Left median nerve'};
const vagus={fmaId:'FMA18157',name:'Trunk of left vagus nerve'};
test('exact multilingual labels and conservative typo',()=>{
 for(const s of ['Left median nerve','saraf median kiri','nervus medianus sinister'])assert.equal(typedReferenceAnswer(median,s).correct,true);
 assert.equal(challengeLabel(median,'latin'),'nervus medianus sinister');
 assert.equal(typedReferenceAnswer(median,'nervus medianuss sinister').kind,'MINOR_TYPO');
});
test('reject missing or opposite side, wrong concept and mismatched source identity',()=>{
 for(const s of ['right median nerve','median nerve','saraf median kanan','nervus medianus dexter','nervus medianus siniste','left radial nerve','left right median nerve'])assert.equal(typedReferenceAnswer(median,s).correct,false);
 assert.equal(typedReferenceAnswer(vagus,'left vagus nerve').correct,false);
 assert.equal(typedReferenceAnswer(vagus,'truncus nervi vagi dextri').correct,false);
 assert.equal(typedReferenceAnswer({...median,name:'Right median nerve'},'left median nerve').correct,false);
});

import {REFERENCE43_TOPIC_ROWS} from '../src/reference43-topic-catalog.js';
test('239 exact source-bound provisional concepts have distinct localized choices and exact scoring',()=>{
 const pool=[...new Map(REFERENCE43_TOPIC_ROWS.filter(hasChallengeGlossary).map(e=>[e.fmaId,e])).values()];
 assert.equal(pool.length,239);
 for(const lang of ['id','en','latin']){
  const labels=pool.map(e=>challengeLabel(e,lang));
  assert.equal(new Set(labels.map(s=>s.toLowerCase())).size,pool.length);
  for(const [i,e] of pool.entries()){
   assert.equal(typedReferenceAnswer(e,labels[i]).correct,true);
   for(const [j,other] of labels.entries())if(i!==j)assert.equal(typedReferenceAnswer(e,other).correct,false,e.name+' vs '+other);
  }
 }
});
test('new organ terms preserve laterality and chamber/segment scope',()=>{
 const find=id=>REFERENCE43_TOPIC_ROWS.find(e=>e.fmaId===id);
 for(const [id,bad] of [['FMA7205','ren dexter'],['FMA7204','ginjal'],['FMA9466','ventriculus sinister'],['FMA9531','atrium sinistrum'],['FMA71195','lobus dexter thymi'],['FMA18257','epididymis dextra']])assert.equal(typedReferenceAnswer(find(id),bad).correct,false);
 assert.equal(hasChallengeGlossary({...find('FMA7205'),name:'Right kidney'}),false);
});

test('all source concepts have explicit glossary coverage and numeric labels cannot be typo-corrected',()=>{const rows=REFERENCE43_TOPIC_ROWS;assert(rows.every(hasChallengeGlossary));const c=rows.find(x=>x.fmaId==='FMA13501');assert(c);assert.equal(typedReferenceAnswer(c,'diskus intervertebralis vertebra torakal T5').correct,false);assert.equal(typedReferenceAnswer(c,'diskus intervertebralis vertebra torakal T44').correct,false);});

import {EXPANSION43_TOPIC_ROWS,SUPPLEMENTAL43_TOPIC_ROWS} from '../src/reference43-topics.js';
test('368 source-bound concepts: every localized label scores only its exact concept',()=>{const pool=[...new Map([...REFERENCE43_TOPIC_ROWS,...SUPPLEMENTAL43_TOPIC_ROWS,...EXPANSION43_TOPIC_ROWS].map(e=>[e.fmaId,e])).values()];assert.equal(pool.length,368);assert(pool.every(hasChallengeGlossary));for(const lang of ['en','id','latin']){const labels=pool.map(e=>challengeLabel(e,lang));assert.equal(new Set(labels.map(s=>s.toLowerCase())).size,368);for(const [i,e] of pool.entries()){assert(typedReferenceAnswer(e,labels[i]).correct,e.name+' exact '+labels[i]);for(const [j,label] of labels.entries())if(i!==j)assert.equal(typedReferenceAnswer(e,label).correct,false,e.name+' vs '+label);}}});
test('expansion preserves source part, trunk, side and vertebral level',()=>{const find=name=>EXPANSION43_TOPIC_ROWS.find(e=>e.name===name);for(const [name,bad] of [['Left femur','femur dextrum'],['Left femur','femur'],['Third cervical vertebra','vertebra cervicalis C4'],['Tenth thoracic vertebra','vertebra thoracica T11'],['Trunk of left maxillary nerve','nervus maxillaris sinister'],['Insular part of left middle cerebral artery','arteria cerebri media sinistra'],['Insular part of left middle cerebral artery','pars sphenoidalis arteriae cerebri mediae sinistrae']])assert.equal(typedReferenceAnswer(find(name),bad).correct,false,name+' '+bad);});
