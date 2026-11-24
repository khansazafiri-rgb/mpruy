import test from 'node:test';
import assert from 'node:assert/strict';
import {safeHraAssetUrl,planHraAssets,inspectGlb,coverageReport} from './atlas-onepass-supplementary.mjs';
import {canonicalExactName,canonicalTerminology} from './bp3d-partof-private-expansion.mjs';

test('official HRA GLB URL only; rejects origin spoofing and external hosts',()=>{
 const url='https://cdn.humanatlas.io/digital-objects/ref-organ/liver-female/v1.2/assets/model.glb';
 assert.equal(safeHraAssetUrl(url),url);
 for(const bad of ['http://cdn.humanatlas.io/a.glb','https://cdn.humanatlas.io.evil.org/a.glb',
   'https://user@cdn.humanatlas.io/a.glb','https://cdn.humanatlas.io/a.glb?x=1',
   'https://example.com/a.glb','https://cdn.humanatlas.io/a.json',null])
   assert.equal(safeHraAssetUrl(bad),null);
 assert.equal(planHraAssets([{object:{file:url}},{object:{file:url}},{object:{file:'https://example.com/a.glb'}}]).assets.length,1);
 assert.equal(planHraAssets([{object:{file:url}},{object:{file:'https://example.com/a.glb'}}]).rejected.length,1);
 assert.throws(()=>planHraAssets({items:[]}));
});
function fixtureGlb(json){
 const str=JSON.stringify(json),n=Math.ceil(Buffer.byteLength(str)/4)*4;
 const b=Buffer.alloc(20+n,32);
 b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);
 b.writeUInt32LE(b.length,8);b.writeUInt32LE(n,12);b.writeUInt32LE(0x4e4f534a,16);
 b.write(str,20,'utf8');return b;
}
test('GLB header and source mesh inventory are validated without claiming geometry QA',()=>{
 const doc={asset:{version:'2.0'},meshes:[{}],nodes:[{}]};
 assert.equal(inspectGlb(fixtureGlb(doc)).meshCount,1);
 assert.throws(()=>inspectGlb(Buffer.from('not a GLB')));
 assert.throws(()=>inspectGlb(fixtureGlb({...doc,images:[{uri:'https://example.com/a.png'}]})));
 assert.throws(()=>inspectGlb(fixtureGlb({...doc,meshes:[]})));
});
test('conservative identity never erases side, anatomical region, or vessel type',()=>{
 assert.equal(canonicalExactName('Femur.l'),canonicalExactName('left femur'));
 assert.equal(canonicalTerminology('Supra-orbital nerve.r'),canonicalTerminology('right supraorbital nerve'));
 assert.equal(canonicalTerminology('Navicular bone of left foot'),canonicalTerminology('Navicular bone of foot.l'));
 assert.notEqual(canonicalTerminology('Navicular bone of left foot'),canonicalTerminology('Navicular bone of right foot'));
 assert.notEqual(canonicalTerminology('Nerve of hand.l'),canonicalTerminology('Nerve of foot.l'));
 assert.notEqual(canonicalTerminology('Angular artery'),canonicalTerminology('Angular gyrus'));
 assert.notEqual(canonicalTerminology('Optic nerve'),canonicalTerminology('Right optic nerve'));
 assert.notEqual(canonicalTerminology('Left branch of right artery'),canonicalTerminology('Right branch of left artery'));
});
test('coverage separates original catalog matches from extra source labels and unmounted assets',()=>{
 const catalog={A:{source:'skeletal',group:'bone'},B:{source:'visceral',group:'urinary'}};
 const list=[{name:'A',system:'skeletal'},{name:'New nerve',system:'nervous'}];
 const r=coverageReport(catalog,list);
 assert.equal(r.catalogCount,2);assert.equal(r.mappedCatalog,1);assert.equal(r.missingCatalog,1);
 assert.equal(r.extraSourceLabels,1);assert.equal(r.perSystem.nervous.coverage,null);
 assert.equal(r.commercialRelease,'NO_GO');
 assert.equal(coverageReport(catalog,[{name:'A',system:'visceral'}]).systemMismatch.length,1);
 assert.equal(coverageReport(catalog,[list[0],list[0]]).duplicateIds.length,1);
});
