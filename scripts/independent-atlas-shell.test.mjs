import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {attachIndependentShell} from './independent-atlas-shell.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
test('first-party shell attaches without a legacy source tree and binds every existing adapter control',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-independent-shell-'));
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-presentation-source-'));
 fs.mkdirSync(path.join(fixture,'apps/atlas-independent'),{recursive:true});
 fs.cpSync(path.join(root,'apps/atlas-independent/presentation'),path.join(fixture,'apps/atlas-independent/presentation'),{recursive:true});
 try{
  fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html><head></head><body><header></header><main></main><script type="module" src="./assets/app.js"></script></body></html>');
  assert.equal(fs.existsSync(path.join(fixture,'apps/anatomy')),false,'test fixture must have no legacy source');
  const receipt=attachIndependentShell(fixture,out);assert.equal(receipt.legacyCodeIncluded,false);assert.equal(receipt.publicRelease,'NO_GO');
  assert(Object.values(receipt.sourceHashes).every(s=>/^[a-f0-9]{64}$/.test(s)));
  const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
  for(const id of ['app','viewerContainer','threeCanvas','systemsList','searchInput','searchResults','searchOpen','undoAtlas','restoreAtlas','shareAtlas','helpBtn','helpModal','helpClose','regionButton','sceneTitle','sceneSubtitle','infoOpen','infoSidebar','infoExpand','infoToggle','structureInfo','footerBar','footerIsolateBtn','footerHideBtn','footerTransparentBtn','footerFadeOthersBtn','footerFocusBtn','footerShowAllBtn','resetBtn','zoomInAtlas','zoomOutAtlas','panAtlas','frontViewBtn','sideViewBtn','backViewBtn','topViewBtn','loadingOverlay','emptyScene','emptyRestore','returnContext','atlasStatus','atlasSelection'])assert(html.includes('id="'+id+'"'),'missing control '+id);
  const css=fs.readFileSync(path.join(out,'assets/medcoel-independent-shell.css'),'utf8');
  assert(css.includes('--medcoel-gold:#f9c65e'));assert(css.includes('max-width:640px'));assert(!/@import|url\s*\(/i.test(css));
  assert(!css.includes('.atlas-presets{display:none}'),'mobile must retain Guided/reference controls');
  assert.throws(()=>attachIndependentShell(fixture,out),/already attached/);
 }finally{fs.rmSync(out,{recursive:true,force:true});fs.rmSync(fixture,{recursive:true,force:true});}
});
