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
const require=createRequire(import.meta.url),appRequire=createRequire(path.join(app,'package.json'));
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {build}=await import(pathToFileURL(appRequire.resolve('vite')).href);
const out=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-atlas-ui-fixture-'));
const ownerA='bp-'+'a'.repeat(24),ownerB='bp-'+'b'.repeat(24),selection='sel-'+'c'.repeat(24);
const entry=(id,n,group)=>({id,name:'Engineering fixture '+n,group,regions:['whole'],fmaId:'FMA'+n,bpId:'BP'+n,path:'models/'+id+'.glb',approvedForDistribution:false,source:'BodyParts3D 4.0',classificationProvisional:true});
const entries=[entry(ownerA,1,'skeletal'),entry(ownerB,2,'muscular')];
const catalog={schema:1,publicRelease:'NO_GO',clinicalValidation:false,items:[{id:selection,name:'Engineering fixture component',group:'muscular',fmaId:'FMA3',bpId:'BP3',sourceTree:'isa',regions:['whole'],selectionOnly:true,bindings:[{ownerId:ownerB,elementId:'FJ2'}],approvedForDistribution:false,clinicalValidation:false,classificationProvisional:true}]};
const triangle=(id,x)=>({id,positions:new Float32Array([x,0,0,x+1,0,0,x,.8,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),omitted:0});
const assets=new Map([[ownerA,encodeNativeGlb([triangle('FJ1',-2)],{}).bytes],[ownerB,encodeNativeGlb([triangle('FJ2',0),triangle('FJ3',2)],{}).bytes]]);
let server,browser;
try{
 await build({root:app,configFile:false,publicDir:false,base:'/anatomy/viewer/',build:{outDir:out,emptyOutDir:true,sourcemap:false}});
 attachOriginalShell(root,out);
 server=createServer((req,res)=>{
  const p=req.url.split('?')[0],send=(status,body,type)=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
  const base='/anatomy/viewer/';
  if(!p.startsWith(base))return send(404,'not found','text/plain');
  const rel=p.slice(base.length);
  if(rel==='inventory.json')return send(200,JSON.stringify({schema:1,mode:'private-review',publicRelease:'NO_GO',sourceFrame:'native-official-OBJ',sourceKind:'independent-bp3d',entries}),'application/json');
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
 await page.setViewportSize({width:390,height:844});
 await page.locator('#searchOpen').click();
 await page.locator('#searchInput').waitFor({state:'visible'});
 assert.equal(await page.locator('#threeCanvas').count(),1);
 assert.deepEqual(errors,[],'browser runtime errors');
 console.log('ATLAS PRIVATE BROWSER FIXTURE PASS: original desktop/mobile shell, exact single-element highlight, isolate, hide, undo and fade. Non-anatomical QA fixtures only.');
}finally{
 await browser?.close();
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(out,{recursive:true,force:true});
}
