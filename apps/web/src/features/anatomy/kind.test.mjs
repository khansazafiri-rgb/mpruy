import {test} from 'node:test';import assert from 'node:assert/strict';
import {structureKind} from './kind.mjs';
import {buildRegistry,SYSTEMS} from './registry.mjs';
import {makeQuestion} from './study.mjs';

const k=(name,group)=>structureKind({name,group});
test('structure kind reads the anatomical head noun',()=>{
 for(const n of ['Lower canine (left)','Upper first molar tooth (right)','Lower medial incisor (left)','Upper second premolar (right)'])assert.equal(k(n,'skeletal'),'tooth');
 assert.equal(k('Vertebra C4','skeletal'),'vertebra');assert.equal(k('Eighth rib (right)','skeletal'),'skeletal:rib');
 assert.equal(k('Costal cartilage of ninth rib (left)','skeletal'),'costal-cartilage');
 assert.equal(k('Distal phalanx of fourth finger of foot (right)','skeletal'),'phalanx');
 assert.equal(k('Clavicle (right)','skeletal'),'bone');assert.equal(k('Scaphoid bone (right)','skeletal'),'bone');
 assert.equal(k('Extensor digitorum (left)','muscular'),'muscle');assert.equal(k('Gluteus minimus muscle (left)','muscular'),'muscle');
 assert.equal(k('Tendon of extensor digitorum longus (right)','muscular'),'muscular:tendon');
 assert.equal(k('Subtendinous bursa of sartorius muscle (right)','muscular'),'muscular:bursa');
 assert.equal(k('Brachial veins (right)','venous'),'vein');assert.equal(k('Posterior ethmoidal artery (left)','arterial'),'artery');
 assert.equal(k('Deep branch of transverse cervical artery (left)','arterial'),'arterial:branch');
 assert.equal(k('Sural nerve (right)','nervous'),'nerve');assert.equal(k('Abducens nerve (VI) (left)','nervous'),'cranial-nerve');assert.equal(k('Nucleus of abducens nerve (right)','nervous'),'nervous:nucleus');assert.equal(k('Straight gyrus (Gyrus rectus) (right)','nervous'),'nervous:gyrus');
 assert.equal(k('Anterior basal segmental bronchus of left lung (BVIII)','respiratory'),'segmental-bronchus');
 assert.equal(k('Fibular collateral ligament (right)','joints'),'ligament');assert.equal(k('Deep popliteal nodes (right)','lymphatic'),'node');
});

// A small atlas where every tooth, skull bone and rib shares the skeletal system and the head region,
// which is exactly the case that used to give the answer away.
const input={systems:Object.fromEntries(SYSTEMS.map(s=>[s.id,[]])),catalog:{},lexicon:{},definitions:{},synonyms:{},reference:{},previews:{}};
const add=(system,group,regions,names)=>{for(const id of names){input.systems[system].push(id);input.catalog[id]={source:system,group,regions,box:[0,0,0,1,1,1]};}};
add('skeletal','skeletal',['headNeck'],['Lower canine.l','Lower canine.r','Upper canine.l','Lower first molar tooth.l','Upper second premolar.r','Lower lateral incisor.l','Mandible','Maxilla.l','Nasal bone.l','Frontal bone','Zygomatic bone.l']);
add('skeletal','skeletal',['thorax'],['Fifth rib.l','Sixth rib.l','Seventh rib.l','Eighth rib.l','Sternum']);
add('nervous','nervous',['headNeck'],['Facial nerve.l','Lingual nerve.l']);
for(const s of SYSTEMS)if(!input.systems[s.id].length)add(s.id,s.id,['abdomen'],[`Structure ${s.id}`]);
const registry=buildRegistry(input);

test('identify questions use distractors of the same kind, so a tooth is not the only tooth',()=>{
 const teeth=registry.rows.filter(r=>structureKind(r)==='tooth');
 for(let i=0;i<40;i++){
  const q=makeQuestion(registry,{mode:'identify',system:'skeletal',region:'headNeck',rng:()=>((i*7919)%997)/997});
  const target=registry.byId.get(q.targetId);
  const kinds=q.options.map(o=>structureKind(registry.byId.get(o.id)));
  if(structureKind(target)==='tooth'){assert.ok(kinds.every(x=>x==='tooth'),JSON.stringify(q.options));assert.ok(teeth.length>=4);}
  assert.equal(new Set(q.options.map(o=>registry.byId.get(o.id).nameKey)).size,4,'no two options read the same');
 }
});
test('ribs get rib distractors before any other bone',()=>{
 const q=makeQuestion(registry,{mode:'identify',system:'skeletal',region:'thorax',rng:()=>0});
 const target=registry.byId.get(q.targetId);
 const others=q.options.filter(o=>o.id!==q.targetId).map(o=>registry.byId.get(o.id));
 if(structureKind(target)==='skeletal:rib')assert.ok(others.every(r=>structureKind(r)==='skeletal:rib'));
 else assert.ok(others.filter(r=>structureKind(r)==='skeletal:rib').length>=3);
});
