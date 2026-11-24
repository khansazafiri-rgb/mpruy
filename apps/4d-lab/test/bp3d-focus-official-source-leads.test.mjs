import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverFocusSources,officialLeadCsv,sourceLeadWarnings}
 from '../tools/bp3d-focus-official-source-leads.mjs';
const focus={reviewOnly:true,areas:[
 {id:'digiti-minimi-hand',label:'hand',missing:2},
 {id:'digiti-minimi-foot',label:'foot',missing:1},
 {id:'vertebral-skeleton',label:'spine',missing:1},
 {id:'sternum',label:'sternum',missing:1}
],rows:[
 {area:'digiti-minimi-hand',atlasName:'Abductor digiti minimi of hand.l',system:'muscular',status:'unmatched'},
 {area:'digiti-minimi-hand',atlasName:'Abductor digiti minimi of hand.r',system:'muscular',status:'unmatched'},
 {area:'digiti-minimi-foot',atlasName:'Abductor digiti minimi of foot.l',system:'muscular',status:'unmatched'},
 {area:'vertebral-skeleton',atlasName:'Vertebra C3',system:'skeletal',status:'unmatched'},
 {area:'sternum',atlasName:'Manubrium of sternum',system:'skeletal',status:'unmatched'}
]};
const officialRows=[
 {name:'left abductor digiti minimi of hand',fmaId:'FMA100',bpId:'BP100'},
 {name:'right abductor digiti minimi of hand',fmaId:'FMA101',bpId:'BP101'},
 {name:'left abductor digiti minimi of foot',fmaId:'FMA102',bpId:'BP102'},
 {name:'vertebra C3',fmaId:'FMA103',bpId:'BP103'},
 {name:'vertebra C4',fmaId:'FMA104',bpId:'BP104'},
 {name:'manubrium',fmaId:'FMA105',bpId:'BP105'}
];
const elements=new Map(officialRows.map((x,i)=>[x.fmaId,new Set(['FJ'+(100+i)])]));
const archiveFiles=officialRows.map((x,i)=>'offical-meshes/FJ'+(100+i)+'.obj');
const opts={focus,officialRows,elements,archiveFiles,converted:[]};
test('publisher search returns exact FMA/BP/FJ OBJ file presence, not approved meshes',()=>{
 const report=discoverFocusSources(opts);
 assert.equal(report.structures.length,5);
 assert.equal(report.modelsAdded,0);
 assert.equal(report.approvedForDistribution,false);
 assert.equal(report.areas.find(x=>x.label==='hand').missing,2);
 const left=report.structures.find(x=>x.atlasName==='Abductor digiti minimi of hand.l');
 assert.equal(left.candidates[0].fmaId,'FMA100');
 assert.deepEqual(left.candidates[0].fjIds,['FJ100']);
 assert.equal(left.candidates[0].allObjPresent,true);
 assert.equal(left.candidates[0].approved,false);
 assert.ok(officialLeadCsv(report).includes('FMA100'));
});
test('right/left and hand/foot candidates remain separate; C3 cannot be replaced by C4',()=>{
 assert.ok(sourceLeadWarnings('Abductor digiti minimi of hand.l',
  'right abductor digiti minimi of hand').includes('OPPOSITE_SIDE'));
 assert.ok(sourceLeadWarnings('Abductor digiti minimi of hand.l',
  'left abductor digiti minimi of foot').includes('HAND_VS_FOOT'));
 assert.ok(sourceLeadWarnings('Vertebra C3','vertebra C4').includes('DIFFERENT_VERTEBRAL_LEVEL'));
 assert.equal(discoverFocusSources(opts).structures.find(x=>x.atlasName==='Vertebra C3')
  .candidates[0].officialName,'vertebra C3');
});
test('already-used FMA/BP and missing actual OBJ stay explicitly unsafe and unapproved',()=>{
 const report=discoverFocusSources({...opts,
  archiveFiles:archiveFiles.filter(x=>!x.endsWith('FJ105.obj')),
  converted:[{name:'Preexisting manubrium',fmaId:'FMA105',bpId:'BP105'}]});
 const sternum=report.structures.find(x=>x.area==='sternum').candidates[0];
 assert.equal(sternum.allObjPresent,false);
 assert.ok(sternum.warnings.includes('MISSING_OBJ_ELEMENTS'));
 assert.ok(sternum.warnings.includes('FMA_BP_REPRESENTATION_ALREADY_USED'));
 assert.equal(report.areas.find(x=>x.label==='sternum').withUnclaimedCompleteObj,0);
});
test('without any publisher identity name overlap, no source model is fabricated',()=>{
 const empty=discoverFocusSources({focus:{reviewOnly:true,
  areas:[{id:'n',label:'nasal',missing:1}],
  rows:[{area:'n',atlasName:'Unknown cartilaginous mesh',system:'skeletal',status:'unmatched'}]},
  officialRows,elements,archiveFiles,converted:[]});
 assert.equal(empty.structures[0].candidates.length,0);
 assert.ok(officialLeadCsv(empty).includes('NO_PUBLISHER_NAME_LEAD'));
 assert.throws(()=>discoverFocusSources({...opts,focus:{rows:[]}}),/private audit/i);
});

test('full English numbered vertebrae appear before generic aggregated meshes even when scores are lower',()=>{
 const atlas={reviewOnly:true,areas:[{id:'vertebral-skeleton',label:'vertebrae',missing:3}],rows:[
  {area:'vertebral-skeleton',atlasName:'Vertebra C3',system:'skeletal',status:'unmatched'},
  {area:'vertebral-skeleton',atlasName:'Vertebra T8',system:'skeletal',status:'unmatched'},
  {area:'vertebral-skeleton',atlasName:'Vertebra L1',system:'skeletal',status:'unmatched'}]};
 const publisher=[
  {name:'vertebra',fmaId:'FMA800',bpId:'BP800'},
  {name:'cervical vertebra',fmaId:'FMA801',bpId:'BP801'},
  {name:'third cervical vertebra',fmaId:'FMA803',bpId:'BP803'},
  {name:'eighth thoracic vertebra',fmaId:'FMA808',bpId:'BP808'},
  {name:'first lumbar vertebra',fmaId:'FMA811',bpId:'BP811'},
  {name:'fourth cervical vertebra',fmaId:'FMA804',bpId:'BP804'},
  ...Array.from({length:10},(_,i)=>({name:'vertebra anatomy region '+i,
    fmaId:'FMA9'+i,bpId:'BP9'+i}))
 ];
 const map=new Map(publisher.map((x,i)=>[x.fmaId,new Set(['FJ'+(900+i)])]));
 const zip=publisher.map((x,i)=>'FJ'+(900+i)+'.obj');
 const result=discoverFocusSources({focus:atlas,officialRows:publisher,elements:map,archiveFiles:zip});
 for(const [name,match] of [
   ['Vertebra C3','third cervical vertebra'],
   ['Vertebra T8','eighth thoracic vertebra'],
   ['Vertebra L1','first lumbar vertebra']
 ]) {
  const row=result.structures.find(x=>x.atlasName===name);
  assert.equal(row.candidates[0].officialName,match,name);
  assert.equal(row.candidates[0].warnings.includes('VERTEBRAL_LEVEL_NOT_SPECIFIED'),false);
  assert.equal(row.candidates[0].approved,false);
 }
 assert.ok(sourceLeadWarnings('Vertebra C3','fourth cervical vertebra')
   .includes('DIFFERENT_VERTEBRAL_LEVEL'));
 assert.ok(sourceLeadWarnings('Vertebra C3','cervical vertebra')
   .includes('VERTEBRAL_LEVEL_NOT_SPECIFIED'));
});
test('whole organ cannot be mistaken for liver segment, mesoappendix for appendix, or taenia for unrelated muscle',()=>{
 for(const [anatomy,source,flag] of [
  ['Liver','segment of liver','WHOLE_ORGAN_VS_SOURCE_SUBPART'],
  ['Meso-appendix','appendix','MESOAPPENDIX_NOT_APPENDIX'],
  ['Free taenia','muscle of free lower limb','TAENIA_NOT_UNRELATED_MUSCLE'],
  ['Sigmoid colon','segment of colon','WHOLE_ORGAN_VS_SOURCE_SUBPART'],
  ['Axis (C2)','intervertebral disk of axis','VERTEBRA_NOT_INTERVERTEBRAL_DISK']
 ])assert.ok(sourceLeadWarnings(anatomy,source).includes(flag),anatomy+' versus '+source);
 assert.ok(!sourceLeadWarnings('Liver','liver').includes('WHOLE_ORGAN_VS_SOURCE_SUBPART'));
 assert.ok(!sourceLeadWarnings('Axis (C2)','axis').includes('VERTEBRA_NOT_INTERVERTEBRAL_DISK'));
});
