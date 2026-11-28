import test from 'node:test';
import assert from 'node:assert/strict';
import {initialStudy,baseVisible,displayed,buildAlternatives,revealEntry,materialKind,normalizeName} from '../src/study-state.js';
const e=(id,name,group='respiratory',layer=0,regions=['thorax'])=>({id,name,group,layer,regions});
const entries=[e('p','Right lung'),e('a','Superior lobe of right lung'),e('b','Middle lobe of right lung'),e('c','Inferior lobe of right lung'),e('d','Right main bronchus'),e('n','Spinal cord','nervous',2,['back']),e('v','Thoracic duct','lymphatic',2),e('l','Lymph node','lymphatic',0)];
const byId=new Map(entries.map(x=>[x.id,x])),index=buildAlternatives(entries);
test('region, layers, hide and isolation are deterministic',()=>{
 const s=initialStudy();assert(!baseVisible(byId.get('p'),s));
 s.enabled.add('lymphatic');s.minimumLayer.lymphatic=2;
 assert(baseVisible(byId.get('v'),s));assert(!baseVisible(byId.get('l'),s));
 s.region='headNeck';assert(!baseVisible(byId.get('v'),s));
 revealEntry(byId.get('l'),s,index);assert(baseVisible(byId.get('l'),s));assert.equal(s.region,'whole');
 s.hidden.add('l');assert(!baseVisible(byId.get('l'),s));
 s.isolated='l';assert(baseVisible(byId.get('l'),s));assert(!baseVisible(byId.get('v'),s));
});
test('whole/part alternatives preserve available geometry and reveal explicit selection',()=>{
 const s=initialStudy();s.enabled.add('respiratory');
 const vis=(id,missing=[])=>displayed(byId.get(id),s,index,id=>!missing.includes(id),byId);
 assert(!vis('p'));assert(vis('a'));assert(vis('d'));
 assert(vis('p',['b']));assert(!vis('a',['b']));
 assert(vis('a',['p']));
 s.representation='all';assert(vis('p')&&vis('a'));
 s.representation='auto';revealEntry(byId.get('p'),s,index);assert(vis('p')&&!vis('a'));
 s.overrides={};s.hidden.add('b');assert(vis('p'));
 assert.equal(buildAlternatives([...entries,e('dup','Superior lobe of right lung')]).size,0);
});
test('material identity separates lymphatic and neural structures',()=>{
 assert.equal(materialKind(byId.get('v')),'lymphTrunk');
 assert.equal(materialKind(byId.get('l')),'lymphNode');
 assert.equal(materialKind(byId.get('n')),'spinalCord');
 assert.equal(materialKind(byId.get('d')),'airway');
 assert.equal(materialKind(e('x','Brainstem','nervous')),'brain');
 assert.equal(materialKind(e('y','Lymphatic vessel','lymphatic')),'lymphVessel');
 assert.equal(normalizeName('Femur.l'),'left femur');
});
