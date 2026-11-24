// Isolated regression for the private build transform. No real anatomy or network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {patchPrivateSourceRuntime,patchPrivatePanel} from './z-anatomy-private-runtime.mjs';
const raw=fs.readFileSync(new URL('../apps/anatomy/src/viewer/bp3dSource.js',import.meta.url),'utf8');
const panel=fs.readFileSync(new URL('../apps/anatomy/src/atlas/bp3dPanel.js',import.meta.url),'utf8');
const strip=s=>s.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
class Group{
 constructor(){this.children=[];this.userData={};this.rotation={};this.scale={setScalar(){}};this.position={set(){}};}
 add(x){this.children.push(x);}
}
function api(){
 return new Function('THREE','asset','tissueClass','TISSUE_MATERIALS','NEUTRAL_MATERIAL','console',
  strip(patchPrivateSourceRuntime(raw))+'\nreturn {_bp3dReset,loadBp3dInventory,loadBp3dSystem,bp3dSummary,bp3dHas};')(
  {Group,MeshStandardMaterial:class{}},x=>x,()=>'bone',{bone:{color:0,roughness:1}},{},{error(){}});
}
test('private source and panel transforms compile, anchors fail closed',()=>{
 assert.doesNotThrow(()=>new Function(strip(patchPrivatePanel(panel))));
 assert.throws(()=>patchPrivateSourceRuntime('changed upstream'));
});
test('individual failed GLBs never discard successful source geometry; report partial state',async()=>{
 const a=api();a._bp3dReset('?models=bp3d');
 const converted=[{name:'left carotid fixture',system:'cardiovascular',modelPath:'./structures/a/model.glb'},
 {name:'right carotid fixture',system:'cardiovascular',modelPath:'./structures/b/model.glb'},
 {name:'nerve fixture',system:'nervous',modelPath:'./structures/c/model.glb'}];
 await a.loadBp3dInventory(async()=>({ok:true,json:async()=>({converted})}));
 const loader={loadAsync:async p=>{if(!p.includes('/a/'))throw Error('fixture unavailable');return {scene:{traverse:fn=>fn({isMesh:true})}}}};
 const root=await a.loadBp3dSystem('cardiovascular',loader);
 assert.equal(root.userData.bp3d.partial,true);
 assert.equal(root.userData.bp3d.failed,1);
 assert.equal(root.children[0].children.length,1);
 assert.equal(a.bp3dHas('left carotid fixture'),true);
 assert.equal(a.bp3dHas('right carotid fixture'),false);
 assert.equal(a.bp3dSummary().runtimeLoaded.cardiovascular,1);
 assert.equal(a.bp3dSummary().runtimeFailed[0].name,'right carotid fixture');
 await assert.rejects(a.loadBp3dSystem('nervous',loader),/all 1 models failed/);
 assert.equal(a.bp3dSummary().runtimeFailed.length,2);
 a._bp3dReset('?models=bp3d');assert.equal(a.bp3dSummary().runtimeFailed.length,0);
});
