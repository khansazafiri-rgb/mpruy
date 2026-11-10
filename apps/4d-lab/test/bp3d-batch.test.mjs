import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {planBatch,safeStructureId,suggestForUnmatched,buildBulkHTML,REVIEW_SYSTEM_PALETTE,runBatch} from '../tools/batch-bp3d-candidates.mjs';
import {TISSUE_MATERIALS,tissueClass,materialFor} from '../tools/bp3d-review-materials.mjs';
import {reconcileMapping,reviewTokens} from '../tools/bp3d-mapping-review.mjs';
import {Document} from '@gltf-transform/core';
import {diagnoseGeometry,summarizeGeometry} from '../tools/review-bp3d-candidate.mjs';
import {auditGeneratedBatch} from '../tools/bp3d-batch-audit.mjs';

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
    const mapping=JSON.parse(fs.readFileSync(path.join(out,'mapping-review.json'),'utf8'));
    assert.equal(mapping.summary.catalogGaps,2236);
    assert.equal(mapping.summary.automaticallyApproved,0);
    assert.equal(mapping.catalogCount,2237);
    assert.equal(mapping.directConvertedCount,1);
    assert.match(mapping.sourceHashes.archiveSha256,/^[a-f0-9]{64}$/);
    assert.equal(mapping.queue.length,2236);
    assert.equal(fs.readFileSync(path.join(out,'mapping-review.csv'),'utf8').trim().split('\n').length,2237);
    assert.ok(fs.existsSync(path.join(out,'review-materials.js')));
    assert.ok(!result.converted[0].modelPath.startsWith('/'));
    const audit=await auditGeneratedBatch(out);
    assert.equal(audit.independentModels,1);
    assert.deepEqual(audit.errors,[]);
    const model=path.join(out,result.converted[0].modelPath);
    const bytes=fs.readFileSync(model);fs.writeFileSync(model,Buffer.concat([bytes,Buffer.from('tampered')]));
    assert.match((await auditGeneratedBatch(out)).errors[0],/hash mismatch/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('all 6 systems receive distinct illustrative review colors and user can turn them off',()=>{
  assert.deepEqual(Object.keys(REVIEW_SYSTEM_PALETTE).sort(),
    ['cardiovascular','joints','lymphatic','muscular','skeletal','visceral']);
  assert.equal(new Set(Object.values(REVIEW_SYSTEM_PALETTE)).size,6);
  const html=buildBulkHTML();
  assert.match(html,/id="palette" type="checkbox"/);
  assert.match(html,/id="tissue" type="checkbox" checked/);
  assert.match(html,/Illustrative system colors, not verified tissue colors/);
  assert.match(html,/Tissue\/system colors are illustrative, not verified anatomy colors/);
  assert.match(html,/function recolor\(\)/);
  assert.match(html,/recolor\(\);/);
  assert.match(html,/mat\.color\.setHex\(style\.color\)/);
  assert.match(html,/const neutralColor=0xc8cbd0/);
  assert.match(html,/id="legend"/);
  assert.match(html,/ren\.setSize\(w,h,true\)/);
  assert.match(html,/NOT FOR PUBLIC RELEASE/);
});

test('every skeletal bone and every skeletal muscle has one consistent tissue material',()=>{
  for(const name of ['Femur.l','Rib 1.r','Left temporal bone'])
    assert.equal(materialFor({name,system:'skeletal'}).color,TISSUE_MATERIALS.bone.color);
  for(const name of ['Biceps brachii.l','Trapezius.r','Intercostales'])
    assert.equal(materialFor({name,system:'muscular'}).color,TISSUE_MATERIALS.muscle.color);
  assert.equal(tissueClass({name:'Great saphenous vein',system:'cardiovascular'}),'vein');
  assert.equal(tissueClass({name:'Femoral artery',system:'cardiovascular'}),'artery');
  assert.equal(tissueClass({name:'Unspecified vessel',system:'cardiovascular'}),'vessel');
  assert.equal(materialFor({name:'Femur.l',system:'skeletal'},'neutral').color,0xc8cbd0);
  assert.equal(materialFor({name:'Femur.l',system:'skeletal'},'system').color,REVIEW_SYSTEM_PALETTE.skeletal);
});

test('one converted structure retains independent FJ elements with read-only normal and thickness diagnostics',()=>{
  const doc=new Document(),buffer=doc.createBuffer();
  const make=(name,points,normals)=>{
    const p=doc.createAccessor().setType('VEC3').setArray(new Float32Array(points)).setBuffer(buffer);
    const prim=doc.createPrimitive().setAttribute('POSITION',p);
    if(normals)prim.setAttribute('NORMAL',doc.createAccessor().setType('VEC3')
      .setArray(new Float32Array(normals)).setBuffer(buffer));
    doc.createMesh(name).addPrimitive(prim);
  };
  make('FJ1000',[0,0,0,1,0,0,0,1,0],[0,0,1,0,0,1,0,0,1]);
  make('FJ1001',[0,0,0,.00001,0,0,0,.00001,0],null);
  const before=doc.getRoot().listMeshes().map(x=>x.getName());
  const diagnostics=diagnoseGeometry(doc,summarizeGeometry(doc));
  assert.deepEqual(doc.getRoot().listMeshes().map(x=>x.getName()),before);
  assert.equal(diagnostics.meshCount,2);
  assert.ok(diagnostics.flags.includes('missing-or-mismatched-normals'));
  assert.ok(diagnostics.flags.includes('small-element-relative-to-structure'));
  assert.ok(diagnostics.flags.includes('thin-or-planar-element'));
});

test('all unmatched names form a review-only CSV with Latin synonyms, source and side conflict checks',()=>{
  assert.deepEqual(reviewTokens('Arteria femoralis.l'),['left','artery','femoralis']);
  const gaps=[{name:'Arteria femoralis.l',system:'cardiovascular',reason:'unmatched'},
    {name:'Another artery.r',system:'cardiovascular',reason:'unmatched'},
    {name:'Unknown muscle',system:'muscular',reason:'unmatched'}];
  const officialRows=[
    {name:'left femoralis artery',fmaId:'FMA1',bpId:'BP1'},
    {name:'right femoralis artery',fmaId:'FMA2',bpId:'BP2'},
    {name:'right another vein',fmaId:'FMA3',bpId:'BP3'},
  ];
  const {report,csv}=reconcileMapping({gaps,officialRows,converted:[
    {name:'A',fmaId:'FMA9',bpId:'BP9'},{name:'B',fmaId:'FMA9',bpId:'BP9'}],
    elementIndex:new Map([['FMA1',new Set(['FJ1'])]]),archiveFiles:['dir/FJ1.obj']});
  assert.equal(report.queue.length,3);
  assert.equal(report.queue[0].suggestions[0].fmaId,'FMA1');
  assert.equal(report.queue[0].suggestions[0].approved,false);
  assert.equal(report.queue[0].rejections.oppositeSide,1);
  assert.ok(report.queue[1].rejections.tissueType>0);
  assert.equal(report.summary.duplicateDirectIdentities,1);
  assert.equal(report.summary.automaticallyApproved,0);
  assert.equal(report.systems.cardiovascular.unmatched,2);
  assert.equal(csv.trim().split('\n').length,4);
});
