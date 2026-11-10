import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {planBatch,safeStructureId,suggestForUnmatched,buildBulkHTML,runBatch} from '../tools/batch-bp3d-candidates.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('single batch plans eligible matches and retains unmapped/ambiguous source names',()=>{
  const mapped={candidates:[
    {atlasName:'Femur.l',atlasSystem:'skeletal',state:'candidate',matches:[{
      fmaId:'FMA1',bpId:'BP1',officialName:'left femur',
      sourceObjs:[{fileId:'FJ1',archivePath:'FJ1.obj'}]}]},
    {atlasName:'Femur.r',atlasSystem:'skeletal',state:'candidate',matches:[{
      fmaId:'FMA2',bpId:'BP2',sourceObjs:[{fileId:'FJ2',archivePath:null}]}]},
    {atlasName:'Other',atlasSystem:'muscular',state:'unmatched',matches:[]},
    {atlasName:'Another',atlasSystem:'joints',state:'ambiguous',
      matches:[{fmaId:'FMA1'},{fmaId:'FMA2'}]}
  ]};
  const plan=planBatch(mapped);
  assert.equal(plan.summary.catalogCount,4);
  assert.equal(plan.summary.directlyMappable,1);
  assert.equal(plan.summary.gaps,3);
  assert.equal(plan.eligible[0].name,'Femur.l');
  assert.deepEqual(plan.gaps.map(x=>x.reason).sort(),['ambiguous','missingSource','unmatched']);
  assert.equal(plan.systems.skeletal.missingSource,1);
  assert.equal(plan.summary.geometryValidated,0);
  assert.equal(plan.summary.publicReleaseApproved,0);
  assert.equal(planBatch(mapped,{limit:1}).summary.selected,1);
});
test('stable output paths cannot collide for similarly punctuated structure names',()=>{
  const a=safeStructureId('Anterior tibial artery.l'),b=safeStructureId('Anterior tibial artery (l)');
  assert.notEqual(a,b);
  assert.match(a,/^[a-z0-9-]+$/);
  assert.equal(safeStructureId('Anterior tibial artery.l'),a);
  assert.ok(a.length<90);
});
test('unmatched-name suggestions never auto-promote and do not recommend wrong side',()=>{
  const gaps=[{name:'Femoral arterial branch.l',system:'cardiovascular',reason:'unmatched'},
    {name:'Some structure',system:'skeletal',reason:'ambiguous'}];
  const official=[
    {name:'left femoral arterial branch',fmaId:'FMA1',bpId:'BP1'},
    {name:'right femoral arterial branch',fmaId:'FMA2',bpId:'BP2'},
    {name:'left femoral vein',fmaId:'FMA3',bpId:'BP3'}
  ];
  const out=suggestForUnmatched(gaps,official);
  assert.equal(out[0].reason,'unmatched');
  assert.equal(out[0].suggestions[0].fmaId,'FMA1');
  assert.ok(out[0].suggestions.every(s=>s.fmaId!=='FMA2'));
  assert.match(out[0].suggestions[0].method,/NOT-verified/);
  assert.deepEqual(out[1].suggestions,[]);
});
test('batch preview stays local with Retina-sized canvas and explicit unapproved warning',()=>{
  const html=buildBulkHTML();
  assert.match(html,/new THREE\.WebGLRenderer/);
  assert.match(html,/ren\.setSize\(w,h,true\)/);
  assert.match(html,/#canvas\{width:100%;height:100%\}/);
  assert.match(html,/NOT FOR PUBLIC RELEASE/);
  assert.match(html,/inventory\.json/);
  assert.match(html,/wireframe/i);
});
test('one invocation processes fake official ZIP and writes a structured report, never website data',async(t)=>{
  try{execFileSync('zip',['-v'],{stdio:'ignore'});}catch{t.skip('zip utility missing');return;}
  const dir=path.join(ROOT,'local-data','test-bp3d-'+process.pid+'-'+Date.now());
  const source=path.join(dir,'source'),out=path.join(dir,'output');
  fs.mkdirSync(source,{recursive:true});
  try{
    fs.writeFileSync(path.join(source,'isa_parts_list_e.txt'),
      'concept id\trepresentation id\ten\nFMA24485\tBP601\tleft femur\n');
    fs.writeFileSync(path.join(source,'isa_element_parts.txt'),
      'concept id\tname\telement file id\nFMA24485\tleft femur\tFJ1000\n');
    fs.writeFileSync(path.join(source,'FJ1000.obj'),
      ['v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0','f 1 2 3','f 1 3 4','f 1 1 2'].join('\n'));
    execFileSync('zip',['-q','isa_BP3D_4.0_obj_99.zip','FJ1000.obj'],{cwd:source});
    const result=await runBatch({root:ROOT,sourceDir:source,outputDir:out,limit:1});
    assert.equal(result.summary.selected,1);
    assert.equal(result.summary.converted,1);
    assert.equal(result.summary.failed,0);
    assert.equal(result.summary.candidatesWithOmittedZeroAreaTriangles,1);
    assert.equal(result.summary.totalOmittedZeroAreaTriangles,1);
    assert.equal(result.summary.catalogCount,2237);
    assert.equal(result.approvedForCommercialDistribution,false);
    assert.equal(result.converted[0].name,'Femur.l');
    assert.equal(result.converted[0].triangles,2);
    assert.match(fs.readFileSync(path.join(out,'index.html'),'utf8'),/GLTFLoader/);
    assert.ok(fs.existsSync(path.join(out,'structures',result.converted[0].id,'lineage.json')));
    assert.ok(fs.existsSync(path.join(out,'mapping-gaps.json')));
    assert.ok(!result.converted[0].modelPath.startsWith('/'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
