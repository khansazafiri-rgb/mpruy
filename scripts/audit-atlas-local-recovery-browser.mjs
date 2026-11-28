// Actual isolated-recovery browser QC; loopback only, no clinical or release promotion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const [url,...rest]=process.argv.slice(2);assert(!rest.length&&/^http:\/\/127\.0\.0\.1:\d{4,5}\/$/.test(url||''),'Explicit loopback URL required');
assert(fs.realpathSync(q)===q);const base=new URL('anatomy/viewer/',url);
const read=async p=>{const r=await fetch(new URL(p,base),{redirect:'error'});assert(r.ok);const d=await r.json();assert(d.publicRelease==='NO_GO');return d;};
const [inventory,attribution]=await Promise.all([read('priority-recovery/inventory.json'),read('priority-recovery/attributions.json')]);
assert(inventory.contextMode===null&&inventory.clinicalValidation===false&&inventory.registrationValidated===false);
assert(inventory.items.length>=185&&inventory.items.length<=209&&inventory.items.length===attribution.items.length);
const proof=new Map(attribution.items.map(e=>[e.id,e]));assert.equal(proof.size,inventory.items.length);assert.equal(new Set(inventory.items.map(e=>e.id)).size,inventory.items.length);
for(const e of inventory.items){const a=proof.get(e.id);assert(/^bp-[a-f0-9]{24}$/.test(e.id)&&/^FMA\d+$/.test(e.fmaId)&&e.priorityOnly===true&&e.contextCandidate!==true&&e.approvedForDistribution===false&&e.path==='priority-recovery/'+e.id+'.glb'&&a?.fmaId===e.fmaId&&a.name===e.name&&a.group===e.group&&a.status==='EXPORTED_ISOLATED_CONCEPT'&&Number.isSafeInteger(a.triangles)&&a.triangles>0&&Array.isArray(a.sourceElements)&&a.sourceElements.length>0&&a.sourceElements.every(x=>Number.isSafeInteger(x.triangles)&&x.triangles>0)&&a.sourceElements.reduce((n,x)=>n+x.triangles,0)===a.triangles);}
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),channel=process.env.ATLAS_QC_BROWSER_CHANNEL||'';assert(['','chrome','chromium','msedge'].includes(channel));
const out=fs.mkdtempSync(path.join(q,'atlas-recovery-browser-qc-'));fs.chmodSync(out,0o700);
let browser;const rows=[],errors=[],firstGroup=new Set();
try{
 browser=await chromium.launch({headless:true,...(channel?{channel}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await page.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===base.origin||['blob:','data:'].includes(u.protocol)?route.continue():route.abort();});
 page.on('pageerror',e=>errors.push(String(e.message).slice(0,400)));
 await page.goto(base.href);await page.locator('#loadingOverlay.hidden').waitFor({state:'attached',timeout:120000});await page.waitForFunction(()=>document.getElementById('atlasStatus')?.hasAttribute('data-selected-id')&&document.querySelector('#priorityRecovery select')?.options.length>0,{}, {timeout:120000});
 for(const [i,e] of inventory.items.entries()){
  const a=proof.get(e.id),row={id:e.id,name:e.name,fmaId:e.fmaId,group:e.group,expectedTriangles:a.triangles,expectedMeshes:a.sourceElements.length};
  try{
   const search=page.locator('#searchInput');if(!await search.isVisible())await page.locator('#searchOpen').click();await search.fill(e.fmaId);
   await page.locator('#searchResults [data-atlas-entry-id="'+e.id+'"]').click({timeout:20000});
   await page.waitForFunction(({id,triangles,meshes})=>{const s=document.getElementById('atlasStatus'),d=JSON.parse(document.getElementById('view').dataset.renderQc||'{}');return s.dataset.selectedId===id&&s.dataset.isolatedId===id&&s.dataset.loading==='false'&&s.dataset.failedModels==='0'&&s.dataset.visibleModels==='0'&&Number(s.dataset.visibleMeshes)===meshes&&Number(s.dataset.highlightedMeshes)===meshes&&d.visibleGeometryTriangles===triangles&&d.triangles>0;},{id:e.id,triangles:a.triangles,meshes:a.sourceElements.length},{timeout:60000});
   await page.locator('#frontViewBtn').click();await page.waitForFunction(()=>{const d=JSON.parse(document.getElementById('view').dataset.renderQc||'{}');return d.up?.join(',')==='0,0,1'&&d.axis?.[1]<-.99;});
   row.observed=await page.evaluate(()=>{const s=document.getElementById('atlasStatus');return {selectedId:s.dataset.selectedId,isolatedId:s.dataset.isolatedId,visibleModels:Number(s.dataset.visibleModels),visibleMeshes:Number(s.dataset.visibleMeshes),highlightedMeshes:Number(s.dataset.highlightedMeshes),render:JSON.parse(document.getElementById('view').dataset.renderQc||'{}')};});
   if(!firstGroup.has(e.group)||i>=185){const name=e.id+'.png';await page.locator('#threeCanvas').screenshot({path:path.join(out,name)});fs.chmodSync(path.join(out,name),0o600);row.screenshot=name;firstGroup.add(e.group);}
   row.status='TECHNICAL_RENDER_PASS';
  }catch(err){row.status='HOLD_BROWSER_QC';row.reason=String(err.message||err).slice(0,400);}
  rows.push(row);console.log('RECOVERY BROWSER QC '+JSON.stringify({index:i+1,total:inventory.items.length,...row}));
 }
}catch(err){errors.push(String(err.message||err).slice(0,1000));}
finally{
 await browser?.close();
 const report={schema:1,scope:'Exact private recovery selection, isolation, mesh/triangle counts and source anterior orientation. Screenshots need human review.',expected:inventory.items.length,passed:rows.filter(r=>r.status==='TECHNICAL_RENDER_PASS').length,rows,errors,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('ATLAS RECOVERY BROWSER QC '+JSON.stringify({...report,rows:undefined,folder:path.basename(out)}));
 if(report.passed!==report.expected||errors.length)process.exitCode=1;
}
