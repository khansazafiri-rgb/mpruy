// Local/CI engineering fixture only. Triangles are NOT anatomical models,
// never included in a review pack, or served by a production build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {attachOriginalShell} from './private-atlas-original-shell.mjs';
import {encodeNativeGlb} from './independent-bp3d-export.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const app=path.join(root,'apps/atlas-independent');
let real43=null,serve43=null;
if(['1','gap','combined'].includes(process.env.ATLAS_TEST_REAL43)){
 const q=path.join(root,'local-data/licensing-quarantine'),folders=fs.readdirSync(q).filter(x=>/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(x));
 const mode=process.env.ATLAS_TEST_REAL43,counts=mode==='combined'?[12,28]:mode==='gap'?[28]:[12];
 assert.equal(folders.length,counts.length,'Fresh exact source acquisitions required');
 const m=await import('./load-bp3d43-private-elements.mjs');serve43=m.serve43Reference;
 const registries=counts.map(count=>{
  const matched=folders.filter(f=>JSON.parse(fs.readFileSync(path.join(q,f,'report.json'),'utf8')).parsed===count);
  assert.equal(matched.length,1,'Expected one acquisition of '+count+' elements');
  const file=count===28?'bp3d43-gap-batch-dual-source-audit-20261125.json':'bp3d43-dual-source-audit-20261125.json';
  return m.load43Elements(q,matched[0],JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication',file),'utf8')),count);
 });
 real43=m.combine43Registries(registries);
}
const require=createRequire(import.meta.url),appRequire=createRequire(path.join(app,'package.json'));
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {build}=await import(pathToFileURL(appRequire.resolve('vite')).href);
const out=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-atlas-ui-fixture-'));
const ownerA='bp-'+'a'.repeat(24),ownerB='bp-'+'b'.repeat(24),selection='sel-'+'c'.repeat(24);
const entry=(id,n,group)=>({id,name:'Engineering fixture '+n,group,regions:['whole'],fmaId:'FMA'+n,bpId:'BP'+n,path:'models/'+id+'.glb',approvedForDistribution:false,source:'BodyParts3D 4.0',classificationProvisional:true});
const entries=[entry(ownerA,1,'skeletal'),entry(ownerB,2,'muscular')];
const catalog={schema:1,publicRelease:'NO_GO',clinicalValidation:false,items:[{id:selection,name:'Engineering fixture component',group:'muscular',fmaId:'FMA3',bpId:'BP3',sourceTree:'isa',regions:['whole'],selectionOnly:true,bindings:[{ownerId:ownerB,elementId:'FJ2'}],approvedForDistribution:false,clinicalValidation:false,classificationProvisional:true}]};
const fixtureCoverage={schema:1,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,targets:3,rows:[
 {group:'muscular',target:'Engineering fixture 2',status:'BODY_MODEL',fmaId:'FMA2',representations:[{id:ownerB,name:entries[1].name,group:'muscular',type:'BODY_MODEL'}]},
 {group:'muscular',target:'Engineering fixture component',status:'EXACT_ELEMENT_SELECTION',fmaId:'FMA3',representations:[{id:selection,name:catalog.items[0].name,group:'muscular',type:'EXACT_ELEMENT_SELECTION'}]},
 {group:'muscular',target:'Unavailable fixture',status:'NOT_FOUND_BY_EXACT_CHECK',fmaId:null,representations:[]}
]};
const triangle=(id,x)=>({id,positions:new Float32Array([x,0,0,x+1,0,0,x,.8,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),omitted:0});
const assets=new Map([[ownerA,encodeNativeGlb([triangle('FJ1',-2)],{}).bytes],[ownerB,encodeNativeGlb([triangle('FJ2',0),triangle('FJ3',2)],{}).bytes]]);
let server,browser;
try{
 await build({root:app,configFile:false,publicDir:false,base:'/anatomy/viewer/',build:{outDir:out,emptyOutDir:true,sourcemap:false}});
 attachOriginalShell(root,out);
 server=createServer((req,res)=>{
  const p=req.url.split('?')[0],send=(status,body,type)=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
  if(p==='/fixture-host')return send(200,'<!doctype html><html><body><iframe id="atlas" src="/anatomy/viewer/" width="1200" height="800"></iframe></body></html>','text/html');
  const base='/anatomy/viewer/';
  if(!p.startsWith(base))return send(404,'not found','text/plain');
  const rel=p.slice(base.length);
  if(real43&&serve43(req,res,real43))return;
  if(rel==='inventory.json')return send(200,JSON.stringify({schema:1,mode:'private-review',publicRelease:'NO_GO',sourceFrame:'native-official-OBJ',sourceKind:'independent-bp3d',entries}),'application/json');
  if(rel==='learning-coverage.json')return send(200,JSON.stringify(fixtureCoverage),'application/json');
  if(rel==='element-selection.json')return send(200,JSON.stringify(catalog),'application/json');
  if(rel==='priority-recovery/inventory.json')return send(200,JSON.stringify({schema:1,publicRelease:'NO_GO',contextMode:null,registrationValidated:false,clinicalValidation:false,items:[]}),'application/json');
  const model=rel.match(/^models\/(bp-[a-f0-9]{24})\.glb$/);
  if(model&&assets.has(model[1]))return send(200,assets.get(model[1]),'model/gltf-binary');
  if(rel===''||/^assets\/[A-Za-z0-9_.-]+\.(js|css)$/.test(rel)){
   const f=path.join(out,rel||'index.html');
   if(fs.existsSync(f))return send(200,fs.readFileSync(f),rel.endsWith('.js')?'text/javascript':rel.endsWith('.css')?'text/css':'text/html');
  }
  return send(404,'not found','text/plain');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/anatomy/viewer/');
 const waitCounts=async(visible,highlighted)=>page.waitForFunction(([v,h])=>{const s=document.getElementById('atlasStatus');return s?.dataset.visibleMeshes===String(v)&&s?.dataset.highlightedMeshes===String(h);},[visible,highlighted],{timeout:20000});
 await page.locator('#loadingOverlay.hidden').waitFor({state:'attached',timeout:30000});
 await waitCounts(1,0);
 assert.equal(await page.locator('#app .atlas-topbar').count(),1);
 assert.equal(await page.locator('#systemsList .sys-tile').count(),13);
 const top=await page.locator('.atlas-topbar').boundingBox(),bottom=await page.locator('.atlas-systembar').boundingBox(),canvas=await page.locator('#threeCanvas').boundingBox();
 assert(top&&bottom&&canvas&&bottom.y>top.y+top.height&&canvas.height>350&&canvas.width>800,'original desktop layout invalid');
 await page.locator('#searchInput').fill('FMA3');
 await page.locator('#searchResults button').first().click();
 await page.locator('#structureInfo h3').filter({hasText:'Engineering fixture component'}).waitFor();
 await waitCounts(3,1);
 await page.locator('#footerIsolateBtn').click();await waitCounts(1,1);
 await page.locator('#undoAtlas').click();await waitCounts(3,1);
 await page.locator('#footerHideBtn').click();await waitCounts(2,0);
 await page.locator('#undoAtlas').click();await waitCounts(3,1);
 await page.locator('#footerTransparentBtn').click();await waitCounts(3,1);
 await page.getByRole('button',{name:'Belajar',exact:true}).click();
 const guided=page.locator('#guidedLearningPanel');
 await guided.getByRole('heading',{name:'Engineering fixture 2'}).waitFor();
 assert((await guided.innerText()).includes('0/2 checkpoint tersedia'));
 await guided.getByRole('button',{name:'Tampilkan 3D'}).click();
 await guided.getByRole('status').filter({hasText:'Struktur berhasil dibuka.'}).waitFor();
 await waitCounts(3,2);
 assert((await guided.innerText()).includes('1/2 checkpoint tersedia'));
 await guided.getByRole('button',{name:'Berikutnya'}).click();
 await guided.getByRole('heading',{name:'Engineering fixture component'}).waitFor();
 await guided.getByRole('button',{name:'Tampilkan 3D'}).click();
 await guided.getByRole('status').filter({hasText:'Struktur berhasil dibuka.'}).waitFor();
 await waitCounts(3,1);
 assert((await guided.innerText()).includes('2/2 checkpoint tersedia'));
 await guided.getByRole('button',{name:'Berikutnya'}).click();
 await guided.getByRole('heading',{name:'Unavailable fixture'}).waitFor();
 assert(await guided.getByRole('button',{name:'Tampilkan 3D'}).isDisabled());
 assert((await guided.innerText()).includes('1 belum tersedia'));
 await guided.getByRole('button',{name:'Tutup'}).click();
 await guided.waitFor({state:'hidden'});
 if(real43){
  await page.getByRole('button',{name:'BP3D 4.3',exact:true}).click();
  const dialog=page.locator('#referenceDialog'),viewport=dialog.locator('#referenceViewport'),select=dialog.locator('#referenceSelect');
  await dialog.locator('#referenceStatus').filter({hasText:real43.assets.size+' kandidat referensi tersedia'}).waitFor();
  assert.equal(await select.locator('option').count(),real43.assets.size);
  for(const e of real43.inventory.items){
   await select.selectOption(e.id);
   await dialog.locator('#referenceLoad').click();
   await page.waitForFunction(({id,triangles})=>{const v=document.getElementById('referenceViewport');return v.dataset.renderedId===id&&v.dataset.renderedTriangles===String(triangles);},{id:e.id,triangles:e.triangles},{timeout:20000});
   assert((await dialog.locator('#referenceSource').innerText()).includes(e.fj));
   assert.equal(await viewport.locator('canvas').count(),1);
   await dialog.locator('#referenceFit').click();
  }
  if(real43.assets.size!==28){
  const setup=dialog.locator('#referenceChallengeSetup'),challenge=dialog.locator('#referenceChallenge'),feedback=dialog.locator('#referenceChallengeFeedback'),next=dialog.locator('#referenceChallengeNext');
  const currentEntry=async()=>{const id=await viewport.getAttribute('data-rendered-id');const e=real43.inventory.items.find(x=>x.id===id);assert(e,'Challenge must use an audited source element');return e;};
  const start=async(mode,language)=>{await setup.locator('#referenceChallengeMode').selectOption(mode);await setup.locator('#referenceChallengeLanguage').selectOption(language);await setup.locator('#referenceChallengeStart').click();await challenge.waitFor({state:'visible'});assert(await dialog.locator('#referenceSource').isHidden());assert(await select.isHidden());};
  const {challengeLabel}=await import('../apps/atlas-independent/src/reference-challenge-language.js');
  await start('mcq','en');
  const choices=challenge.locator('#referenceChallengeAnswers button');
  await choices.first().waitFor();
  assert.equal(await choices.count(),4);
  let e=await currentEntry();
  assert(await next.isDisabled());
  const expectedLabel=challengeLabel(e,'en');
  assert.equal((await choices.allTextContents()).filter(x=>x===expectedLabel).length,1,'Exactly one localized correct answer');
  await challenge.getByRole('button',{name:expectedLabel,exact:true}).click();
  await feedback.filter({hasText:/^Benar\./}).waitFor();
  assert.equal(await choices.evaluateAll(nodes=>nodes.every(n=>n.disabled)),true);
  await next.click();await choices.first().waitFor();
  e=await currentEntry();const labels=await choices.allTextContents(),wrongIndex=labels.findIndex(x=>x!==challengeLabel(e,'en'));assert(wrongIndex>=0);await choices.nth(wrongIndex).click();
  await feedback.filter({hasText:'Belum tepat.'}).waitFor();
  await challenge.locator('#referenceChallengeQuit').click();await setup.waitFor({state:'visible'});
  await start('typed','latin');
  const form=challenge.locator('#referenceChallengeTyped'),input=form.locator('#referenceChallengeInput');
  const seen=new Set();
  for(let i=0;i<10;i++){
   await form.waitFor({state:'visible'});await input.waitFor({state:'visible'});
   e=await currentEntry();assert(!seen.has(e.name),'Repeated source label');seen.add(e.name);
   const answer=challengeLabel(e,i%3===0?'id':i%3===1?'latin':'en');
   await input.fill(answer);await form.getByRole('button',{name:'Periksa jawaban'}).click();
   await feedback.filter({hasText:/^Benar\./}).waitFor();assert(await input.isDisabled());
   await next.click();
  }
  await challenge.locator('#referenceChallengeProgress').filter({hasText:'10/10 benar · 0 gagal dimuat'}).waitFor();
  await challenge.locator('#referenceChallengeQuit').click();
  // Force a transport failure without changing or replacing an actual model.
  const fail=route=>route.abort('failed'),pattern='**/bp3d43-reference/*.glb';await page.route(pattern,fail);
  await start('mcq','id');await feedback.filter({hasText:'Model gagal dimuat; tidak masuk skor.'}).waitFor();assert.equal(await choices.count(),0);assert(await next.isEnabled());
  await page.unroute(pattern,fail);await next.click();await choices.first().waitFor();assert.equal(await choices.count(),4);
  await challenge.locator('#referenceChallengeQuit').click();
  console.log('BP3D43 CHALLENGE PASS: source labels concealed, MCQ correct/incorrect, 10 distinct multilingual typed answers, single-submit lock and unavailable model excluded.');
  }else assert(await dialog.locator('#referenceChallengeSetup').isHidden());
  await dialog.locator('#referenceClose').click();await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelectorAll('#referenceViewport canvas').length===0);
  await waitCounts(3,1);
  console.log('BP3D43 REAL BROWSER PASS: '+real43.assets.size+' actual publisher GLBs rendered with audited triangle counts; body inventory unchanged.');
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#searchOpen').click();
 await page.locator('#searchInput').waitFor({state:'visible'});
 assert.equal(await page.locator('#threeCanvas').count(),1);
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:'+server.address().port+'/fixture-host');
 const embedded=page.frameLocator('#atlas');
 await embedded.locator('#loadingOverlay.hidden').waitFor({state:'attached',timeout:30000});
 const request=async structureId=>page.evaluate(id=>new Promise((resolve,reject)=>{
  const frame=document.getElementById('atlas').contentWindow,requestId=crypto.randomUUID();
  const timer=setTimeout(()=>{window.removeEventListener('message',handle);reject(Error('Missing independent library reply'));},15000);
  function handle(e){if(e.source!==frame||e.origin!==location.origin||e.data?.type!=='medcoel:independent-library-result'||e.data.requestId!==requestId)return;clearTimeout(timer);window.removeEventListener('message',handle);resolve(e.data);}
  window.addEventListener('message',handle);frame.postMessage({type:'medcoel:independent-library-open',version:1,requestId,structureId:id},location.origin);
 }),structureId);
 const opened=await request(selection);assert.equal(opened.ok,true);
 await embedded.locator('#structureInfo h3').filter({hasText:'Engineering fixture component'}).waitFor();
 const missing=await request('bp-'+'d'.repeat(24));assert.equal(missing.ok,false);
 assert.deepEqual(errors,[],'browser runtime errors');
 console.log('ATLAS PRIVATE BROWSER FIXTURE PASS: original desktop/mobile shell, exact single-element highlight, isolate, hide, undo, fade and source-ID iframe bridge, guided exact checkpoint highlight and unavailable checkpoint blocking. Non-anatomical QA fixtures only.');
}finally{
 await browser?.close();
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(out,{recursive:true,force:true});
}
