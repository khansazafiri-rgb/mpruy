import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLiveLab, LIVE_LAB_PATH, LIVE_LAB_MANIFEST, LIVE_LAB_ATLAS_MANIFEST } from './liveLab.mjs';

const html='<html><script type="module" crossorigin src="/anatomy/4d-lab/assets/index-Qc45Ab.js"></script></html>';
const lab = (change = {}) => async (url, options={}) => {
 if (url === LIVE_LAB_MANIFEST) return new globalThis.Response(
  change.manifestBody ?? JSON.stringify({schema:'medcoel.anatomy.v1',synthetic:true}),
  {status:change.manifestStatus||200,headers:{'content-type':change.manifestType||'application/json'}});
 if (url === LIVE_LAB_ATLAS_MANIFEST) return new globalThis.Response(
  change.atlasBody ?? JSON.stringify({schema:'medcoel.anatomy.v1'}),
  {status:change.atlasStatus||200,headers:{'content-type':change.atlasType||'application/json'}});
 if (url === LIVE_LAB_PATH+'data/atlas/ct.nrrd' ||
     url === LIVE_LAB_PATH+'data/atlas/labels.nrrd') {
  assert.equal(options.method,'HEAD');
  return new globalThis.Response('',{status:change.atlasFileStatus||200,
   headers:{'content-type':change.atlasFileType||'application/octet-stream'}});
 }
 if (url === LIVE_LAB_PATH) return new globalThis.Response(
  change.htmlBody ?? html,
  {status:change.htmlStatus||200,headers:{'content-type':change.htmlType||'text/html'}});
 if (url === '/anatomy/4d-lab/assets/index-Qc45Ab.js') {
  assert.equal(options.method, 'HEAD');
  return new globalThis.Response('',{status:change.jsStatus||200,
   headers:{'content-type':change.jsType||'text/javascript'}});
 }
 throw Error('Unexpected request: '+url);
};
test('live lab is mounted outside the SPA at /anatomy/4d-lab/', () => {
 assert.equal(LIVE_LAB_PATH, '/anatomy/4d-lab/');
 assert.ok(LIVE_LAB_MANIFEST.startsWith(LIVE_LAB_PATH));
});
test('real 4D Lab requires manifest, independent HTML and hashed simulator JS', async () => {
 assert.deepEqual(await checkLiveLab(lab()), {synthetic:true});
 await assert.rejects(checkLiveLab(lab({manifestType:'text/html'})),/belum diarahkan/);
 await assert.rejects(checkLiveLab(lab({manifestStatus:404})),/HTTP 404/);
 await assert.rejects(checkLiveLab(lab({manifestBody:'{"schema":"x"}'})),/tidak dikenali/);
 await assert.rejects(checkLiveLab(lab({htmlBody:'<!doctype html><div id="root"></div>'})),/bukan build asli/);
 await assert.rejects(checkLiveLab(lab({htmlStatus:404})),/Halaman aplikasi 4D Lab/);
 await assert.rejects(checkLiveLab(lab({jsStatus:404})),/JavaScript simulator tidak tersedia/);
 await assert.rejects(checkLiveLab(lab({jsType:'text/html'})),/JavaScript simulator tidak tersedia/);
 await assert.rejects(checkLiveLab(lab({atlasStatus:404})),/Dataset Atlas.*belum diaktifkan/);
 await assert.rejects(checkLiveLab(lab({atlasType:'text/html'})),/bukan manifest pencitraan/);
 await assert.rejects(checkLiveLab(lab({atlasFileStatus:404})),/ct.nrrd belum tersedia/);
 await assert.rejects(checkLiveLab(lab({atlasFileType:'text/html'})),/ct.nrrd belum tersedia/);
});
test('lab availability is shared, and missing/SPA/asset corruption are reported as missing', async () => {
 const {liveLabAvailability}=await import('./liveLab.mjs');
 let calls=0;
 const counting=async(...args)=>{calls++;return lab()(...args);};
 assert.equal(await liveLabAvailability(counting,{fresh:true}),'ready');
 assert.equal(await liveLabAvailability(counting),'ready');assert.equal(calls,6);
 assert.equal(await liveLabAvailability(lab({htmlBody:'<html>MEDCOEL SPA</html>'}),{fresh:true}),'missing');
 assert.equal(await liveLabAvailability(lab({jsStatus:404}),{fresh:true}),'missing');
 assert.equal(await liveLabAvailability(lab({manifestStatus:404}),{fresh:true}),'missing');
 assert.equal(await liveLabAvailability(async()=>{throw Error('offline');},{fresh:true}),'missing');
});

test('liveLabSrc passes only the scenario/workspace deep link to the frame', async () => {
  const { liveLabSrc } = await import('./liveLab.mjs');
  assert.equal(liveLabSrc(''), '/anatomy/4d-lab/');
  assert.equal(liveLabSrc('?scenario=effusion&ws=ausc'), '/anatomy/4d-lab/?scenario=effusion&ws=ausc');
  assert.equal(liveLabSrc('?scenario=hfref&dataset=phantom&atlasBase=//evil.example/'), '/anatomy/4d-lab/?scenario=hfref');
  assert.equal(liveLabSrc('?scenario=<script>&ws=AUSC'), '/anatomy/4d-lab/');
});
