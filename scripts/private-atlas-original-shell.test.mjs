import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {attachOriginalShell} from './private-atlas-original-shell.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
test('original presentation is injected only into an explicit temporary preview build',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-original-shell-test-'));
 try{
  fs.mkdirSync(path.join(out,'assets'));
  const index=path.join(out,'index.html');
  fs.writeFileSync(index,'<!doctype html><html><head></head><body><header></header><main></main><script type="module" src="/anatomy/viewer/assets/independent.js"></script></body></html>');
  const receipt=attachOriginalShell(root,out);
  assert.equal(receipt.mode,'PRIVATE_ORIGINAL_UI_COMPARISON');
  assert.equal(receipt.publicRelease,'NO_GO');
  assert.equal(receipt.legacyJavascriptIncluded,false);
  assert(Object.values(receipt.sourceHashes).every(s=>/^[a-f0-9]{64}$/.test(s)));
  const html=fs.readFileSync(index,'utf8'),template=html.match(/<template id="originalShellTemplate">([\s\S]+)<\/template>/)?.[1];
  assert(template);
  for(const id of ['systemsList','threeCanvas','searchInput','footerIsolateBtn','undoAtlas','infoSidebar'])assert(template.includes('id="'+id+'"'));
  assert(!/<script\b/i.test(template));
  assert(!/src="\/brand\//.test(template));
  const css=fs.readFileSync(path.join(out,'assets/original-shell-private.css'),'utf8');
  assert(css.includes('.atlas-systembar')&&css.includes('#originalEngineControls'));
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
