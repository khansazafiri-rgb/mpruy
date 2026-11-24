import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {patchNativeEngine,patchNativeUI,patchNativePanel} from './z-anatomy-private-integration.mjs';
import {patchPrivatePanel} from './z-anatomy-private-runtime.mjs';
import {auditNativeInventory} from './z-anatomy-native-inventory-audit.mjs';
import {representationIndex,representationVisible,focusRepresentation,validRepresentationState} from '../apps/anatomy/src/atlas/privateOrganRepresentations.js';
const source=p=>fs.readFileSync(new URL('../apps/anatomy/src/atlas/'+p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm,'').replace(/^export /gm,'');
test('compose private transforms against original renderer; do not apply legacy bands or public links',()=>{
 const engine=patchNativeEngine(source('engine.js'));
 const ui=patchNativeUI(source('ui.js'));
 const panel=patchNativePanel(patchPrivatePanel(source('bp3dPanel.js')));
 for(const s of [engine,ui,panel])assert.doesNotThrow(()=>new Function(strip(s)));
 assert(!engine.includes('1.38, 1.9'));
 assert(engine.includes('saved?.sourceFrame!==nativeFrame'));
 assert(!ui.includes('hostedShareUrl(shareView())'));
 assert(panel.includes('privateRuntimeCoverage')&&panel.includes('nativeRepresentation'));
 assert.throws(()=>patchNativeEngine('upstream changed'));
});
test('explicit organ families preserve incomplete models and unrelated anatomy',()=>{
 const names=['Right lung','Superior lobe of right lung','Middle lobe of right lung','Inferior lobe of right lung','Right main bronchus','Heart','Hypophysis','Adenohypophysis'];
 const cat=Object.fromEntries(names.map(n=>[n,{source:n==='Heart'?'cardiovascular':'visceral'}]));
 const index=representationIndex(cat,()=>true),all=n=>names.includes(n);
 const visible=(id,loaded=all,settings={})=>representationVisible(id,index,loaded,settings);
 assert(!visible('Right lung')&&visible('Superior lobe of right lung'));
 assert(visible('Right lung',n=>n!=='Middle lobe of right lung'));
 assert(visible('Right main bronchus')&&visible('Heart'));
 assert(visible('Superior lobe of right lung',n=>n!=='Right lung'));
 assert(visible('Right lung',all,{representationMode:'all'}));
 assert(visible('Hypophysis')&&!visible('Adenohypophysis'));
 const settings={};focusRepresentation('Right lung',index,settings);
 assert(visible('Right lung',all,settings)&&!visible('Superior lobe of right lung',all,settings));
 assert(!validRepresentationState({representationMode:'invalid'}));
 assert(!representationIndex({...cat,'right upper lobe of lung':{source:'visceral'}},()=>true).has('Right lung'));
});
test('native inventory rejects invalid metadata instead of mislabelling or mounting it',()=>{
 const id='za-'+'a'.repeat(24);
 const e={id,name:'Right lung fixture',system:'visceral',group:'respiratory',modelPath:'./structures/'+id+'/model.glb',approvedForDistribution:false,triangles:12,glbSha256:'b'.repeat(64),
 privateAtlasMeta:{source:'visceral',group:'respiratory',layer:0,regions:['thorax'],box:[0,0,0,1,1,1]}};
 const inv={sourceFrame:'z-anatomy-world-y-up-metres',sourceNativeDisplayOnly:true,approvedForCommercialDistribution:false,converted:[e]};
 assert(auditNativeInventory(inv).passed);
 assert(auditNativeInventory(inv).unavailableGroups.includes('nervous'));
 for(const meta of [{layer:1},{regions:['wrong']},{box:[1,0,0,0,1,1]},{source:'nervous'}])
  assert(!auditNativeInventory({...inv,converted:[{...e,privateAtlasMeta:{...e.privateAtlasMeta,...meta}}]}).passed);
 assert(!auditNativeInventory({...inv,converted:[e,e]}).passed);
 assert(!auditNativeInventory({...inv,approvedForCommercialDistribution:true}).passed);
});
