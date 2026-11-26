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
let real43=null,serve43=null,realHra=null,serveHra=null,hraStages=[];
const {hierarchyRoute,serveHierarchy}=await import('./atlas-lymphatic-hierarchy-page.mjs');
let realLymph=null,lymphEnabled=false;
if(process.env.HRA_LYMPHATIC_FOLDER){const {loadHierarchy}=await import('./audit-hra-lymphatic-hierarchy.mjs');realLymph=loadHierarchy(path.join(root,'local-data/licensing-quarantine'),process.env.HRA_LYMPHATIC_FOLDER);}
if(['1','gap','combined','expanded','axial','head-neck','visceral','cns','pelvic','cardio','bronchial','hyoid','hyoid-extended','expansion','full-376','muscle-24'].includes(process.env.ATLAS_TEST_REAL43)){
 const q=path.join(root,'local-data/licensing-quarantine'),folders=fs.readdirSync(q).filter(x=>/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(x));
 const mode=process.env.ATLAS_TEST_REAL43,batches=["bp3d43-dual-source-audit-20261125.json","bp3d43-gap-batch-dual-source-audit-20261125.json","bp3d43-nerves32-dual-source-audit-20261125.json","bp3d43-discs-23-dual-source-audit-20261125.json","bp3d43-costal-20-dual-source-audit-20261125.json","bp3d43-head-neck-cartilage-14-dual-source-audit-20261125.json","bp3d43-visceral-18-dual-source-audit-20261126.json","bp3d43-cns-30-dual-source-audit-20261126.json","bp3d43-pelvic-digestive-15-dual-source-audit-20261126.json","bp3d43-cardiopulmonary-32-dual-source-audit-20261126.json","bp3d43-bronchial-thymus-22-dual-source-audit-20261126.json"];
 const size={bronchial:11,cardio:10,pelvic:9,cns:8,visceral:7,'head-neck':6,axial:5,expanded:3,combined:2,'1':1};
 const {BP43_EXPANSION}=await import('./atlas-reference-suite-spec.mjs');
 const selected=mode==='muscle-24'?['bp3d43-muscle-24-dual-source-audit-20261126.json']:mode==='full-376'?[...batches,'bp3d43-hyoid-2-dual-source-audit-20261126.json',...BP43_EXPANSION.map(x=>x[1])]:mode==='expansion'?["bp3d43-cerebral-29-dual-source-audit-20261126.json","bp3d43-axial-bone-32-dual-source-audit-20261126.json","bp3d43-cranial-32-dual-source-audit-20261126.json","bp3d43-limb-facial-bone-25-dual-source-audit-20261126.json","bp3d43-cranial-10-dual-source-audit-20261126.json"]:mode==='hyoid-extended'?[...batches,'bp3d43-hyoid-2-dual-source-audit-20261126.json']:mode==='hyoid'?['bp3d43-hyoid-2-dual-source-audit-20261126.json']:mode==='gap'?[batches[1]]:batches.slice(0,size[mode]);
 if(mode!=='gap')assert.equal(folders.length,selected.length,'Fresh exact source acquisitions required');
 else assert(folders.length>=1,'Fresh gap acquisition required');
 const m=await import('./load-bp3d43-private-elements.mjs');serve43=m.serve43Reference;
 const reports=folders.map(folder=>({folder,report:JSON.parse(fs.readFileSync(path.join(q,folder,'report.json'),'utf8'))}));
 const registries=selected.map(file=>{
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication',file),'utf8'));
  const folder=m.select43Acquisition(reports,evidence);
  return m.load43Elements(q,folder,evidence,evidence.matches.length);
 });
 real43=mode==='full-376'?m.combine43Registries([m.combine43Registries(registries.slice(0,11)),registries[11],m.combine43Registries(registries.slice(12))]):mode==='hyoid'?registries[0]:mode==='hyoid-extended'?m.combine43Registries([m.combine43Registries(registries.slice(0,11)),registries[11]]):m.combine43Registries(registries);
 if(mode==='muscle-24'){assert.equal(real43.assets.size,24);assert.equal(real43.inventory.items.reduce((n,e)=>n+e.triangles,0),83064);}
 if(mode==='full-376'){real43.inventory.expansionProfile='BP43_128_20261126';assert.equal(real43.assets.size,376);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,368);assert.equal(real43.inventory.items.reduce((n,e)=>n+e.triangles,0),1008417);}
 if(mode==='expansion'){real43.inventory.expansionProfile='BP43_128_20261126';assert.equal(real43.assets.size,128);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,128);assert.equal(real43.inventory.items.reduce((n,e)=>n+e.triangles,0),338220);}
 if(mode==='hyoid-extended'){assert.equal(real43.assets.size,248);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,240);assert.equal(real43.inventory.items.reduce((n,e)=>n+e.triangles,0),670197);}
 if(mode==='hyoid'){assert.equal(real43.assets.size,2);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,1);assert.equal(real43.inventory.items.reduce((n,e)=>n+e.triangles,0),2392);}
 if(mode==='bronchial'){assert.equal(real43.assets.size,246);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,239);assert.equal(real43.inventory.items.reduce((sum,e)=>sum+e.triangles,0),667805);}
 if(mode==='cardio'){assert.equal(real43.assets.size,224);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,217);assert.equal(real43.inventory.items.reduce((sum,e)=>sum+e.triangles,0),654933);}
 if(mode==='pelvic'){assert.equal(real43.assets.size,192);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,185);assert.equal(real43.inventory.items.reduce((sum,e)=>sum+e.triangles,0),590913);}
 if(mode==='cns'){assert.equal(real43.assets.size,177);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,170);assert.equal(real43.inventory.items.reduce((sum,e)=>sum+e.triangles,0),586721);}
 if(mode==='visceral'){assert.equal(real43.assets.size,147);assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,140);assert.equal(real43.inventory.items.reduce((sum,e)=>sum+e.triangles,0),392576);}
 if(mode==='head-neck'){
  assert.equal(real43.assets.size,129);
  assert.equal(new Set(real43.inventory.items.map(e=>e.fmaId)).size,122);
  assert.equal(real43.inventory.items.reduce((sum,e)=>sum+e.triangles,0),348858);
 }
}
if(process.env.ATLAS_TEST_HRA_FEMALE==='1'||process.env.ATLAS_TEST_HRA_COMBINED==='1'){
 const q=path.join(root,'local-data/licensing-quarantine'),m=await import('./load-hra-female-five.mjs');
 const batches=process.env.ATLAS_TEST_HRA_COMBINED==='1'?['female-five','cardiopulmonary-four']:['female-five'];
 realHra={assets:new Map(),blocked:[]};
 try{for(const batch of batches){const folder=await m.stageHraBatch(q,batch);hraStages.push(path.join(q,folder));realHra=m.mergeHraFemaleReferences(realHra,m.loadHraBatch(q,folder,batch,process.env.ATLAS_TEST_HRA_GROUPS==='1'));}}catch(e){for(const p of hraStages)fs.rmSync(p,{recursive:true,force:true});throw e;}
 serveHra=(await import('./atlas-hra-private-reference.mjs')).serveHraReference;assert.equal(realHra.assets.size,batches.length===2?9:5);
}
if(real43&&realHra&&['bronchial','hyoid-extended','full-376'].includes(process.env.ATLAS_TEST_REAL43)&&process.env.ATLAS_TEST_HRA_GROUPS==='1'){
 const q=path.join(root,'local-data/licensing-quarantine');
 try{
  const {loadAuditedReferenceSuite}=await import('./atlas-audited-reference-suite.mjs'),suite=loadAuditedReferenceSuite(q,{includeHyoid:['hyoid-extended','full-376'].includes(process.env.ATLAS_TEST_REAL43),includeExpansion:process.env.ATLAS_TEST_REAL43==='full-376'});
  assert.equal(suite.publicRelease,'NO_GO');assert.equal(suite.plan.bp.length,process.env.ATLAS_TEST_REAL43==='full-376'?17:process.env.ATLAS_TEST_REAL43==='hyoid-extended'?12:11);assert.equal(suite.plan.hra.length,2);
  assert.deepEqual([...suite.bp.assets.keys()].sort(),[...real43.assets.keys()].sort());
  assert.deepEqual([...suite.hra.assets.keys()].sort(),[...realHra.assets.keys()].sort());
  real43=suite.bp;realHra=suite.hra;
  console.log('ATLAS AUDITED SUITE PASS: exact '+suite.plan.bp.length+' BP3D and 2 HRA acquisitions selected without fallback; actual suite registries served in browser.');
 }catch(e){for(const p of hraStages)fs.rmSync(p,{recursive:true,force:true});throw e;}
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
const {HRA_LEARNING_LINKS,hraLearningReferences}=await import('../apps/atlas-independent/src/hra-learning-links.js');
const guidedHraRows=realHra&&realHra.assets.size===9&&process.env.ATLAS_TEST_HRA_GROUPS==='1'?[...new Map(HRA_LEARNING_LINKS.map(x=>[x.group+':'+x.target,x])).values()].map(({group,target})=>({group,target,status:'NOT_FOUND_BY_EXACT_CHECK',fmaId:null,representations:[],hraCandidates:hraLearningReferences(group,target,[...realHra.assets.values()].map(x=>x.public))})):[];
if(guidedHraRows.length){assert.equal(guidedHraRows.length,15);assert.equal(guidedHraRows.reduce((n,r)=>n+r.hraCandidates.length,0),24);assert(guidedHraRows.every(r=>r.hraCandidates.length));fixtureCoverage.rows.push(...guidedHraRows);fixtureCoverage.targets=fixtureCoverage.rows.length;fixtureCoverage.hraReferenceTargets=guidedHraRows.length;}
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
  if(realHra&&serveHra(req,res,realHra))return;
  if(realLymph&&p===hierarchyRoute)return serveHierarchy(req,res,lymphEnabled?realLymph:null);
  if(realLymph&&rel==='hra-reference/inventory.json')return send(200,JSON.stringify({items:[],publicRelease:'NO_GO',registrationValidated:false}),'application/json');
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
 assert.equal(await page.locator('#systemsList [data-group]').count(),13);
 await page.waitForFunction(()=>{const d=JSON.parse(document.getElementById('view').dataset.renderQc||'{}');return d.up?.join(',')==='0,0,1'&&d.axis?.[1]<-.99;});
 assert.equal(await page.locator('#atlasStatus').getAttribute('data-visible-models'),'1');
 assert.equal(await page.locator('#atlasStatus').getAttribute('data-failed-models'),'0');
 await page.locator('#backViewBtn').click();await page.waitForFunction(()=>JSON.parse(document.getElementById('view').dataset.renderQc||'{}').axis?.[1]>.99);
 await page.locator('#frontViewBtn').click();await page.waitForFunction(()=>JSON.parse(document.getElementById('view').dataset.renderQc||'{}').axis?.[1]<-.99);
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
 if(guidedHraRows.length){
  await page.getByRole('button',{name:'Belajar',exact:true}).click();
  const system=guided.getByRole('combobox',{name:'Pilih sistem anatomi'}),choice=guided.getByRole('combobox',{name:'Pilih representasi sumber'}),dialog=page.locator('#referenceDialog'),viewport=dialog.locator('#referenceViewport');
  await system.locator('option[value="reproductive"]').waitFor({state:'attached'});
  let opened=0;
  for(const group of [...new Set(guidedHraRows.map(r=>r.group))]){
   await system.selectOption(group);
   const rows=guidedHraRows.filter(r=>r.group===group);
   for(const [i,row] of rows.entries()){
    await guided.getByRole('heading',{name:row.target,exact:true}).waitFor();
    assert.equal(await choice.locator('option').count(),row.hraCandidates.length);
    for(const a of row.hraCandidates){
     await choice.selectOption(a.id);await guided.getByRole('button',{name:'Tampilkan 3D'}).click();
     const source=realHra.assets.get(a.assetId).public,record=(a.kind==='GROUP'?source.sourceGroups:source.sourceCrosswalk).find(x=>x.index===a.nodeIndex);
     const nodes=a.kind==='GROUP'?record.descendantMeshes.map(x=>x.index).sort((a,b)=>a-b):[a.nodeIndex];
     await page.waitForFunction(({id,node,nodes})=>{const e=document.getElementById('referenceViewport');return e.dataset.renderedId===id&&e.dataset.isolatedNode===String(node)&&JSON.stringify(JSON.parse(e.dataset.isolatedSourceNodes||'[]'))===JSON.stringify(nodes);},{id:a.assetId,node:a.nodeIndex,nodes},{timeout:60000});
     assert((await dialog.locator('#referenceStatus').innerText()).includes(a.ontologyId));
     await dialog.locator('#referenceClose').click();await dialog.waitFor({state:'hidden'});await guided.getByRole('status').filter({hasText:'tidak dihitung sebagai struktur utuh'}).waitFor();assert((await guided.innerText()).includes('0/0 checkpoint tersedia'));opened++;
    }
    if(i<rows.length-1)await guided.getByRole('button',{name:'Berikutnya'}).click();
   }
  }
  assert.equal(opened,24);await guided.getByRole('button',{name:'Tutup'}).click();await guided.waitFor({state:'hidden'});
  console.log('HRA GUIDED BROWSER PASS: 15 checkpoints, 24 exact source node/group opens and isolated descendant sets; no coverage promotion.');
 }
 if(realLymph){
  const dialog=page.locator('#referenceDialog'),link=dialog.locator('#lymphaticHierarchyLink');
  let response=page.waitForResponse(r=>r.url().endsWith(hierarchyRoute)&&r.request().method()==='HEAD');await page.getByRole('button',{name:'HRA',exact:true}).click();assert.equal((await response).status(),404);assert(await link.isHidden());await dialog.locator('#referenceClose').click();await dialog.waitFor({state:'hidden'});
  lymphEnabled=true;response=page.waitForResponse(r=>r.url().endsWith(hierarchyRoute)&&r.request().method()==='HEAD');await page.getByRole('button',{name:'HRA',exact:true}).click();assert.equal((await response).status(),200);await link.waitFor({state:'visible'});
  const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.getByRole('heading',{name:'Hierarki limfatik HRA v1.5'}).waitFor();assert.equal(await popup.getByRole('status').innerText(),'121/121 jalur sumber');await popup.locator('#q').fill('UBERON:0001631');await popup.getByRole('button',{name:'Cari',exact:true}).click();await popup.getByRole('status').waitFor();assert((await popup.getByRole('status').innerText())!=='121/121 jalur sumber');await popup.locator('summary').first().click();assert(await popup.getByText('thoracic duct',{exact:true}).first().isVisible());await popup.locator('#q').fill('not a real structure');await popup.getByRole('button',{name:'Cari',exact:true}).click();await popup.getByRole('status').filter({hasText:'0/121 jalur sumber'}).waitFor();await popup.getByRole('link',{name:'Reset',exact:true}).click();await popup.getByRole('status').filter({hasText:'121/121 jalur sumber'}).waitFor();await popup.close();await dialog.locator('#referenceClose').click();await dialog.waitFor({state:'hidden'});
  console.log('HRA LYMPHATIC HIERARCHY BROWSER PASS: actual 121 paths, explicit availability, source ID search, empty result, reset; no new 3D geometry.');
 }
 if(realHra){
  await page.getByRole('button',{name:'HRA',exact:true}).click();
  const dialog=page.locator('#referenceDialog'),viewport=dialog.locator('#referenceViewport'),select=dialog.locator('#referenceSelect'),component=dialog.locator('#referenceComponentSelect');
  await dialog.locator('#referenceStatus').filter({hasText:realHra.assets.size+' kandidat referensi tersedia'}).waitFor();assert.equal(await select.locator('option').count(),realHra.assets.size);
  let n=0;
  let isolated=0,groupCount=0;
  for(const [id,a] of realHra.assets){
   await select.selectOption(id);await dialog.locator('#referenceLoad').click();
   await page.waitForFunction(({id,count})=>{const v=document.getElementById('referenceViewport');return v.dataset.renderedId===id&&Number(v.dataset.renderedTriangles)>0&&v.dataset.renderedComponents===String(count);},{id,count:a.public.sourceCrosswalk.length+(a.public.sourceGroups?.length||0)},{timeout:60000});
   assert.equal(await component.locator('option').count(),a.public.sourceCrosswalk.length+(a.public.sourceGroups?.length||0));
   for(const c of a.public.sourceCrosswalk){assert((await component.locator('option[value="'+c.index+'"]').textContent()).includes(c.ontologyId));n++;}
   for(const g of a.public.sourceGroups||[]){const option=component.locator('option[value="'+g.index+'"]');assert((await option.textContent()).includes('[kelompok sumber]'));await component.selectOption(String(g.index));await dialog.locator('#referenceComponentIsolate').click();assert.equal(await viewport.getAttribute('data-isolated-node'),String(g.index));const actual=JSON.parse(await viewport.getAttribute('data-isolated-source-nodes'));assert.deepEqual(actual,g.descendantMeshes.map(x=>x.index).sort((a,b)=>a-b));await dialog.locator('#referenceComponentRestore').click();assert.equal(await viewport.getAttribute('data-isolated-node'),null);assert.equal(await viewport.getAttribute('data-isolated-source-nodes'),null);groupCount++;}
   const target=a.public.name==='uterus female'?'UBERON:0000002':a.public.name.startsWith('heart ')?'UBERON:0002135':a.public.name.startsWith('lung ')?'UBERON:0012065':null;
   if(target){
    const c=a.public.sourceCrosswalk.find(c=>c.ontologyId===target);assert(c,'Audited isolation target absent');
    await dialog.locator('#referenceComponentSearch').fill(c.ontologyId);assert(await component.locator('option').count()>=1);
    await component.selectOption(String(c.index));await dialog.locator('#referenceComponentIsolate').click();
    await dialog.locator('#referenceStatus').filter({hasText:c.label+' · node'}).waitFor();
    await page.waitForFunction(()=>document.getElementById('referenceViewport').dataset.isolatedNode!==undefined);
    assert.equal(await viewport.getAttribute('data-isolated-node'),String(c.index));
    await dialog.locator('#referenceComponentRestore').click();await dialog.locator('#referenceStatus').filter({hasText:'Semua komponen sumber ditampilkan kembali'}).waitFor();
    assert.equal(await viewport.getAttribute('data-isolated-node'),null);await dialog.locator('#referenceComponentSearch').fill('');isolated++;
   }
  }
  assert.equal(groupCount,process.env.ATLAS_TEST_HRA_GROUPS==='1'?37:0);
  if(groupCount)console.log('HRA SOURCE GROUP BROWSER PASS: '+groupCount+' exact native descendant sets isolated and restored; no held label exposed.');
  assert.equal(n,realHra.assets.size===9?160:19);assert.equal(isolated,realHra.assets.size===9?5:1);
  await dialog.locator('#referenceClose').click();await dialog.waitFor({state:'hidden'});await waitCounts(3,1);
  console.log(realHra.assets.size===9?'HRA COMBINED REAL BROWSER PASS: 9 original organs, 160 exact mapped source nodes, 5 isolation/restore checks; body inventory unchanged.':'HRA FEMALE REAL BROWSER PASS: 5 original organs, 19 exact mapped source nodes, cervix isolation and restore; body inventory unchanged.');
 }
 if(real43){
  await page.getByRole('button',{name:'BP3D 4.3',exact:true}).click();
  const dialog=page.locator('#referenceDialog'),viewport=dialog.locator('#referenceViewport'),select=dialog.locator('#referenceSelect');
  await dialog.locator('#referenceStatus').filter({hasText:real43.assets.size+' kandidat referensi tersedia'}).waitFor();
  assert.equal(await select.locator('option').count(),real43.assets.size);
  if([40,72,115,129,147,177,192,224,246,248].includes(real43.assets.size)){
   const region=dialog.locator('#referenceRegionTopic'),system=dialog.locator('#referenceSystemTopic'),search=dialog.locator('#referenceSearch');
   await region.selectOption('neck-upper-limb');await system.selectOption('nervous');assert.equal(await select.locator('option').count(),6);
   await search.fill('FJ4273');assert.equal(await select.locator('option').count(),1);
   await search.fill('');await region.selectOption('foot');assert.equal(await select.locator('option').count(),0);assert(await dialog.locator('#referenceLoad').isDisabled());
   await region.selectOption('all');await system.selectOption('ligament');assert.equal(await select.locator('option').count(),16);
   if([115,129,147,177,192,224,246,248].includes(real43.assets.size)){await system.selectOption('cartilage');assert.equal(await select.locator('option').count(),real43.assets.size>=224?58:real43.assets.size>=129?57:43);await region.selectOption('spine');assert.equal(await select.locator('option').count(),23);await region.selectOption('thorax');assert.equal(await select.locator('option').count(),20);if(real43.assets.size>=129){await region.selectOption('neck');assert.equal(await select.locator('option').count(),real43.assets.size>=224?10:9);await region.selectOption('head-neck');assert.equal(await select.locator('option').count(),5);}await region.selectOption('all');}
   if(real43.assets.size>=147){await system.selectOption('urinary');assert.equal(await select.locator('option').count(),real43.assets.size>=192?6:5);await region.selectOption('abdomen-pelvis');assert.equal(await select.locator('option').count(),2);await region.selectOption('all');await system.selectOption('lymphoid');assert.equal(await select.locator('option').count(),real43.assets.size>=246?3:1);}
   if(real43.assets.size>=177){await system.selectOption('nervous');await region.selectOption('brain');assert.equal(await select.locator('option').count(),28);await region.selectOption('spine');assert.equal(await select.locator('option').count(),3);await region.selectOption('all');}
   if(real43.assets.size>=192){await system.selectOption('reproductive');assert.equal(await select.locator('option').count(),7);await region.selectOption('scrotum');assert.equal(await select.locator('option').count(),4);await region.selectOption('pelvis');assert.equal(await select.locator('option').count(),3);await region.selectOption('all');}
   if(real43.assets.size>=224){await system.selectOption('heart');assert.equal(await select.locator('option').count(),4);await region.selectOption('thorax');assert.equal(await select.locator('option').count(),4);await region.selectOption('all');await system.selectOption('vascular');assert.equal(await select.locator('option').count(),27);await region.selectOption('lower-limb');assert.equal(await select.locator('option').count(),2);await region.selectOption('all');}
   if(real43.assets.size>=246){await system.selectOption('respiratory');assert.equal(await select.locator('option').count(),24);await region.selectOption('thorax');assert.equal(await select.locator('option').count(),23);await region.selectOption('all');await system.selectOption('lymphoid');await region.selectOption('thorax');assert.equal(await select.locator('option').count(),2);await region.selectOption('all');}
   await system.selectOption('all');assert.equal(await select.locator('option').count(),real43.assets.size);
   console.log('BP3D43 TOPIC FILTER PASS: exact source-ID search, region/system intersection and empty-state load block.');
  }
  if(real43.assets.size===24){const system=dialog.locator('#referenceSystemTopic'),region=dialog.locator('#referenceRegionTopic');await system.selectOption('muscular');assert.equal(await select.locator('option').count(),24);await region.selectOption('upper-limb');assert.equal(await select.locator('option').count(),6);await region.selectOption('lower-limb');assert.equal(await select.locator('option').count(),18);await region.selectOption('all');await system.selectOption('all');}
  if([2,248].includes(real43.assets.size)){const system=dialog.locator('#referenceSystemTopic'),region=dialog.locator('#referenceRegionTopic');await system.selectOption('skeletal');await region.selectOption('neck');assert.equal(await select.locator('option').count(),2);await system.selectOption('all');await region.selectOption('all');}
  if(real43.assets.size===376){
   const {REFERENCE43_TOPIC_ROWS}=await import('../apps/atlas-independent/src/reference43-topic-catalog.js'),{SUPPLEMENTAL43_TOPIC_ROWS,EXPANSION43_TOPIC_ROWS}=await import('../apps/atlas-independent/src/reference43-topics.js');
   const expected=[...REFERENCE43_TOPIC_ROWS,...SUPPLEMENTAL43_TOPIC_ROWS,...EXPANSION43_TOPIC_ROWS],region=dialog.locator('#referenceRegionTopic'),system=dialog.locator('#referenceSystemTopic'),search=dialog.locator('#referenceSearch');
   for(const [r,s] of [['head-neck','nervous'],['head-neck','vascular'],['spine','skeletal'],['lower-limb','skeletal'],['neck','skeletal'],['foot','nervous']]){await region.selectOption(r);await system.selectOption(s);const ids=new Set(expected.filter(x=>x.region===r&&x.system===s).map(x=>x.fj));const actual=await select.locator('option').evaluateAll(nodes=>nodes.map(o=>o.value));assert.deepEqual(actual.sort(),real43.inventory.items.filter(x=>ids.has(x.fj)).map(x=>x.id).sort());if(!ids.size)assert(await dialog.locator('#referenceLoad').isDisabled());}
   await region.selectOption('all');await system.selectOption('all');await search.fill('FJ3931');assert.equal(await select.locator('option').count(),1);await search.fill('Hyoid bone');assert.equal(await select.locator('option').count(),2);await search.fill('');assert.equal(await select.locator('option').count(),376);
   console.log('BP3D43 FULL TOPIC FILTER PASS: six exact regional/system intersections and old/new source ID search.');
  }
  for(const e of real43.inventory.items){
   await select.selectOption(e.id);
   await dialog.locator('#referenceLoad').click();
   await page.waitForFunction(({id,triangles})=>{const v=document.getElementById('referenceViewport');return v.dataset.renderedId===id&&v.dataset.renderedTriangles===String(triangles);},{id:e.id,triangles:e.triangles},{timeout:20000});
   assert((await dialog.locator('#referenceSource').innerText()).includes(e.fj));
   assert.equal(await viewport.locator('canvas').count(),1);
   await dialog.locator('#referenceFit').click();
  }
  if(real43.assets.size===2){
   const {focusedReferenceQuestions}=await import('../apps/atlas-independent/src/reference-challenge-state.js');
   assert.equal(focusedReferenceQuestions(real43.inventory.items).length,0,'One concept must not produce a four-choice quiz');assert(await dialog.locator('#referenceChallengeStart').isDisabled());assert((await dialog.locator('#referenceChallengePoolCount').innerText()).includes('Minimal 4 konsep berbeda'));
   console.log('BP3D43 HYOID PASS: two source elements, one concept; insufficient challenge pool remains blocked.');
  }else if(real43.assets.size!==28){
  const setup=dialog.locator('#referenceChallengeSetup'),challenge=dialog.locator('#referenceChallenge'),feedback=dialog.locator('#referenceChallengeFeedback'),next=dialog.locator('#referenceChallengeNext');
  const currentEntry=async()=>{const id=await viewport.getAttribute('data-rendered-id');const e=real43.inventory.items.find(x=>x.id===id);assert(e,'Challenge must use an audited source element');return e;};
  const start=async(mode,language)=>{await setup.locator('#referenceChallengeMode').selectOption(mode);await setup.locator('#referenceChallengeLanguage').selectOption(language);await setup.locator('#referenceChallengeStart').click();await challenge.waitFor({state:'visible'});assert(await dialog.locator('#referenceSource').isHidden());assert(await select.isHidden());};
  const {challengeLabel,hasChallengeGlossary}=await import('../apps/atlas-independent/src/reference-challenge-language.js');
  const glossaryCount=new Set(real43.inventory.items.filter(hasChallengeGlossary).map(e=>e.fmaId)).size;
  assert.equal(await setup.locator('#referenceChallengeLanguage option[value="latin"]').textContent(),'Latin (provisional)');
  assert((await setup.locator('.hint').filter({hasText:'bukan terminologi FIPAT terverifikasi'}).textContent()).includes('bukan terminologi FIPAT terverifikasi'));
  if(real43.assets.size===24)assert.equal(glossaryCount,24);if(real43.assets.size===128)assert.equal(glossaryCount,128);if(real43.assets.size>=246)assert.equal(glossaryCount,real43.assets.size===376?368:real43.assets.size>=248?240:239);
  if(real43.assets.size>=246||real43.assets.size===12){
   const scope=setup.locator('#referenceChallengeScope'),limit=setup.locator('#referenceChallengeLimit'),region=dialog.locator('#referenceRegionTopic'),system=dialog.locator('#referenceSystemTopic');
   const focusRegion=real43.assets.size===12?'upper-limb':'neck-upper-limb',focusCount=real43.assets.size===12?5:6;
   await scope.check();await region.selectOption(focusRegion);await system.selectOption('nervous');await limit.selectOption('10');
   await setup.locator('#referenceChallengePoolCount').filter({hasText:focusCount+' soal tersedia'}).waitFor();
   await start('mcq','en');
   const qchoices=challenge.locator('#referenceChallengeAnswers button'),seen=new Set();
   const {referenceTopic}=await import('../apps/atlas-independent/src/reference43-topics.js');
   for(let i=0;i<focusCount;i++){await challenge.locator('#referenceChallengeProgress').filter({hasText:'Soal '+(i+1)+'/'+focusCount}).waitFor();await qchoices.first().waitFor();const e=await currentEntry();assert.deepEqual(referenceTopic(e),{region:focusRegion,system:'nervous'});assert(!seen.has(e.fmaId));seen.add(e.fmaId);await challenge.getByRole('button',{name:challengeLabel(e,'en'),exact:true}).click();await next.click();}
   await challenge.locator('#referenceChallengeProgress').filter({hasText:focusCount+'/'+focusCount+' benar'}).waitFor();
   await challenge.locator('#referenceChallengeQuit').click();await setup.waitFor({state:'visible'});
   await region.selectOption('all');await system.selectOption('all');
   await setup.locator('#referenceChallengePoolCount').filter({hasText:'10 soal tersedia'}).waitFor();
   await scope.uncheck();await limit.selectOption('all');
   console.log('BP3D43 FOCUSED CHALLENGE PASS: '+focusCount+' exact regional concepts, 10-question limit, full mode restored.');
  }
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
  for(let i=0;i<glossaryCount;i++){
   await form.waitFor({state:'visible'});await input.waitFor({state:'visible'});
   e=await currentEntry();assert(!seen.has(e.name),'Repeated source label');seen.add(e.name);
   const answer=challengeLabel(e,i%3===0?'id':i%3===1?'latin':'en');
   await input.fill(answer);await form.getByRole('button',{name:'Periksa jawaban'}).click();
   await feedback.filter({hasText:/^Benar\./}).waitFor();assert(await input.isDisabled());
   await next.click();
  }
  await challenge.locator('#referenceChallengeProgress').filter({hasText:glossaryCount+'/'+glossaryCount+' benar · 0 gagal dimuat'}).waitFor();
  await challenge.locator('#referenceChallengeQuit').click();
  if([24,115,128,129,147,177,192,224,246,248,376].includes(real43.assets.size)){
   const modeSelect=setup.locator('#referenceChallengeMode'),langSelect=setup.locator('#referenceChallengeLanguage');
   await modeSelect.selectOption('source-mcq');assert(await langSelect.isDisabled());assert.equal(await langSelect.inputValue(),'en');
   await setup.locator('#referenceChallengeStart').click();await challenge.waitFor({state:'visible'});
   const expected=real43.assets.size===24?24:real43.assets.size===128?128:real43.assets.size===376?368:real43.assets.size===248?240:real43.assets.size===246?239:real43.assets.size>=224?217:real43.assets.size===192?185:real43.assets.size===177?170:real43.assets.size===147?140:real43.assets.size===129?122:109,sourceSeen=new Set();
   for(let i=0;i<expected;i++){
    await challenge.locator('#referenceChallengeProgress').filter({hasText:'Soal '+(i+1)+'/'+expected}).waitFor();
    await choices.first().waitFor({timeout:20000});assert.equal(await choices.count(),4);
    const src=await currentEntry();assert(!sourceSeen.has(src.fmaId),'Repeated source concept');sourceSeen.add(src.fmaId);
    assert.equal(await viewport.getAttribute('data-rendered-triangles'),String(src.triangles));
    const labels=await choices.allTextContents();assert.equal(new Set(labels.map(x=>x.toLowerCase())).size,4);assert.equal(labels.filter(x=>x===src.name).length,1);
    assert(await dialog.locator('#referenceSource').isHidden());assert(await next.isDisabled());
    await challenge.getByRole('button',{name:src.name,exact:true}).click();await feedback.filter({hasText:/^Benar\./}).waitFor();
    assert.equal(await choices.evaluateAll(nodes=>nodes.every(n=>n.disabled)),true);
    await next.click();
   }
   assert.equal(sourceSeen.size,expected);
   await challenge.locator('#referenceChallengeProgress').filter({hasText:expected+'/'+expected+' benar · 0 gagal dimuat'}).waitFor();
   await challenge.locator('#referenceChallengeQuit').click();await setup.waitFor({state:'visible'});
   await modeSelect.selectOption('mcq');assert(await langSelect.isEnabled());
   console.log('BP3D43 SOURCE LABEL CHALLENGE PASS: '+expected+' distinct concepts completed, exact source label, English-only, previous mode restored.');
  }
  // Force a transport failure without changing or replacing an actual model.
  const fail=route=>route.abort('failed'),pattern='**/bp3d43-reference/*.glb';await page.route(pattern,fail);
  await start('mcq','id');await feedback.filter({hasText:'Model gagal dimuat; tidak masuk skor.'}).waitFor();assert.equal(await choices.count(),0);assert(await next.isEnabled());
  await page.unroute(pattern,fail);await next.click();await choices.first().waitFor();assert.equal(await choices.count(),4);
  await challenge.locator('#referenceChallengeQuit').click();
  console.log('BP3D43 CHALLENGE PASS: source labels concealed, MCQ correct/incorrect, '+glossaryCount+' distinct multilingual typed answers, single-submit lock and unavailable model excluded.');
  }else{
   const setup=dialog.locator('#referenceChallengeSetup'),challenge=dialog.locator('#referenceChallenge'),mode=setup.locator('#referenceChallengeMode'),lang=setup.locator('#referenceChallengeLanguage');
   await setup.waitFor({state:'visible'});
   const {hasChallengeGlossary}=await import('../apps/atlas-independent/src/reference-challenge-language.js');
   assert.equal(new Set(real43.inventory.items.filter(hasChallengeGlossary).map(e=>e.fmaId)).size,27);
   assert(await mode.locator('option[value="mcq"]').isEnabled());assert(await mode.locator('option[value="typed"]').isEnabled());
   await mode.selectOption('source-mcq');assert(await lang.isDisabled());assert.equal(await lang.inputValue(),'en');
   await setup.locator('#referenceChallengeStart').click();await challenge.waitFor({state:'visible'});
   const choices=challenge.locator('#referenceChallengeAnswers button');await choices.first().waitFor();assert.equal(await choices.count(),4);
   await challenge.locator('#referenceChallengeProgress').filter({hasText:'Soal 1/27'}).waitFor();
   const id=await dialog.locator('#referenceViewport').getAttribute('data-rendered-id'),asset=real43.inventory.items.find(e=>e.id===id);assert(asset);
   assert.equal((await choices.allTextContents()).filter(x=>x===asset.name).length,1);
   await challenge.locator('#referenceChallengeQuit').click();await setup.waitFor({state:'visible'});
   console.log('BP3D43 GAP SOURCE CHALLENGE PASS: 27 distinct concepts; 27 glossary-bound concepts available; source mode English-only.');
  }
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
 for(const p of hraStages)fs.rmSync(p,{recursive:true,force:true});
}
