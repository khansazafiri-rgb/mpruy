import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAllSystemsExact,rehydratePrivateInventory}
 from '../tools/bp3d-all-systems-exact-sources.mjs';
const mk=(name,system)=>({name,source:system,group:'test',regions:[]});
const catalog={
 'Liver':mk('Liver','visceral'),
 'Segment of liver':mk('Segment of liver','visceral'),
 'Lesser omentum':mk('Lesser omentum','visceral'),
 'Left superior lobar bronchus':mk('Left superior lobar bronchus','visceral'),
 'Vena cava inferior':mk('Vena cava inferior','cardiovascular'),
 'Abductor digiti minimi of foot.l':mk('Abductor digiti minimi of foot.l','muscular'),
 'Abductor digiti minimi of foot.r':mk('Abductor digiti minimi of foot.r','muscular'),
 'Vertebra C3':mk('Vertebra C3','skeletal'),
 'Vertebra C4':mk('Vertebra C4','skeletal'),
 'Nasal septal cartilage':mk('Nasal septal cartilage','skeletal'),
 'Accessory parotid gland.l':mk('Accessory parotid gland.l','visceral'),
 'Accessory parotid gland.r':mk('Accessory parotid gland.r','visceral')
};
const rows=[
 ['liver','FMA100','BP100','FJ100'],
 ['segment of liver','FMA101','BP101','FJ101'],
 ['lesser omentum','FMA102','BP102','FJ102'],
 ['left superior lobar bronchus','FMA103','BP103','FJ103'],
 ['inferior vena cava','FMA104','BP104','FJ104'],
 ['left abductor digiti minimi of foot','FMA105','BP105','FJ105'],
 ['right abductor digiti minimi of foot','FMA106','BP106','FJ106'],
 ['third cervical vertebra','FMA107','BP107','FJ107'],
 ['fourth cervical vertebra','FMA108','BP108','FJ108'],
 ['septal nasal cartilage','FMA109','BP109','FJ109'],
 ['accessory parotid gland.l','FMA110','BP110','FJ110'],
 ['accessory parotid gland.r','FMA111','BP111','FJ111']
];
const officialRows=rows.map(([name,fmaId,bpId])=>({name,fmaId,bpId}));
const elements=new Map(rows.map((r)=>[r[1],new Set([r[3]])]));
const archiveFiles=rows.map(r=>'objects/'+r[3]+'.obj');
test('all-systems search enumerates the complete catalogue and only selects terminology-identical source meshes',()=>{
 const s=selectAllSystemsExact({catalog,officialRows,elements,archiveFiles});
 assert.equal(s.summary.catalogCount,12);
 assert.equal(s.summary.priorConverted,0);
 assert.equal(s.summary.selected+s.summary.rejected,12);
 assert.equal(s.approvedForDistribution,false);
 for(const x of s.candidates){
  assert.equal(x.matches.length,1);
  assert.equal(x.matches[0].sourceObjs.length,1);
  assert.equal(x.geometryIdentityVerified,false);
  assert.equal(x.redistributionApproved,false);
 }
 const approvedNames=new Set(s.candidates.map(x=>x.atlasName));
 // Explicit whole organ/full phrase succeeds, segment isn't substituted for Liver.
 assert.ok(approvedNames.has('Liver'));
 assert.ok(approvedNames.has('Segment of liver'));
 assert.ok(approvedNames.has('Lesser omentum'));
 assert.ok(approvedNames.has('Left superior lobar bronchus'));
 assert.ok(approvedNames.has('Abductor digiti minimi of foot.l'));
 assert.ok(approvedNames.has('Abductor digiti minimi of foot.r'));
 assert.ok(!approvedNames.has('Vertebra C3')); // name-only generic selector never guesses level synonyms
 assert.ok(approvedNames.has('Nasal septal cartilage')); // exact same 3 structural tokens, different word order
 assert.equal(s.bySystem.visceral.catalog,6);
});
test('names from segment, adjacent bone or opposite side NEVER fill an organ, vertebra or muscle',()=>{
 const wanted={Liver:catalog.Liver,'Vertebra C3':catalog['Vertebra C3'],
   'Abductor digiti minimi of foot.l':catalog['Abductor digiti minimi of foot.l']};
 const source=[
  {name:'segment of liver',fmaId:'FMA10',bpId:'BP10'},
  {name:'Vertebra C4',fmaId:'FMA11',bpId:'BP11'},
  {name:'right abductor digiti minimi of foot',fmaId:'FMA12',bpId:'BP12'}
 ];
 const s=selectAllSystemsExact({catalog:wanted,officialRows:source,
   elements:new Map(source.map((x,i)=>[x.fmaId,new Set(['FJ'+i])])),
   archiveFiles:['FJ0.obj','FJ1.obj','FJ2.obj']});
 assert.equal(s.candidates.length,0);
 assert.equal(s.rejected.length,3);
 assert.equal(s.summary.medicallyValidated,0);
 assert.equal(s.summary.distributionApproved,0);
});
test('shared official FJ, duplicate identity labels, missing OBJ and existing meshes are rejected without first-name bias',()=>{
 const cols={A:{source:'visceral'},B:{source:'visceral'},C:{source:'skeletal'},
   D:{source:'skeletal'}};
 const official=[{name:'A',fmaId:'FMA1',bpId:'BP1'}, {name:'B',fmaId:'FMA2',bpId:'BP2'},
   {name:'C',fmaId:'FMA3',bpId:'BP3'}, {name:'D',fmaId:'FMA4',bpId:'BP4'}];
 const el=new Map([['FMA1',new Set(['FJ1'])],['FMA2',new Set(['FJ1'])],
   ['FMA3',new Set(['FJ3'])],['FMA4',new Set(['FJ4'])]]);
 const s=selectAllSystemsExact({catalog:cols,officialRows:official,elements:el,
   archiveFiles:['FJ1.obj'], // deliberately absent FJ3 to verify blocked OBJ path
   existing:[{name:'D',fmaId:'FMA4',bpId:'BP4'}]});
 assert.equal(s.summary.priorConverted,1);
 assert.equal(s.candidates.length,0);
 assert.ok(s.rejected.filter(x=>x.reason==='MULTIPLE_ATLAS_NAMES_CLAIM_SAME_OFFICIAL_GEOMETRY').length===2);
 assert.ok(s.rejected.some(x=>x.atlasName==='C'&&x.reason.includes('OFFICIAL_OBJ_FILE_MISSING')));
 assert.ok(s.rejected.every(x=>x.atlasName!=='D'));
 assert.equal(s.summary.priorConverted+s.summary.rejected,4);
 const duplicate=selectAllSystemsExact({catalog:{A:cols.A},
   officialRows:[official[0],{...official[0],bpId:'BP9'}],
   elements:el,archiveFiles:['FJ1.obj']});
 assert.equal(duplicate.candidates.length,0);
 assert.equal(duplicate.rejected[0].reason,'AMBIGUOUS_EXACT_OFFICIAL_REPRESENTATIONS');
});
test('a previously audited private model is rehydrated from publisher IDs without changing its identity or licensing status',()=>{
 const source={catalog:{Liver:catalog.Liver},officialRows:[officialRows[0]],
   elements:new Map([['FMA100',new Set(['FJ100'])]]),archiveFiles:['FJ100.obj']};
 const inv={provisionalSource:true,approvedForCommercialDistribution:false,
   geometryRegisteredToMEDCOEL:false,legalStatus:'NOT-CLEARED',
   converted:[{name:'Liver',id:'liver-id',system:'visceral',
     fmaId:'FMA100',bpId:'BP100',sourceMeshes:1,
     mappingMethod:'provisional-name-review-NOT-validated'}]};
 const arr=rehydratePrivateInventory({...source,inventory:inv});
 assert.equal(arr.length,1);
 assert.equal(arr[0].matches[0].fmaId,'FMA100');
 assert.equal(arr[0].matches[0].elementFileIds[0],'FJ100');
 assert.equal(arr[0].geometryIdentityVerified,false);
 assert.throws(()=>rehydratePrivateInventory({...source,
   inventory:{...inv,approvedForCommercialDistribution:true}}),/rights-blocked/);
});
