// Explicit loopback browser QC of actual local review pack, not a clinical audit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {groups,validateInventory} from '../apps/atlas-independent/src/inventory.js';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const args=process.argv.slice(2);assert(args.length===1&&/^http:\/\/127\.0\.0\.1:\d{4,5}\/$/.test(args[0]),'Provide explicit loopback URL ending in /');
const base=new URL('anatomy/viewer/',args[0]),require=createRequire(import.meta.url);
assert(fs.realpathSync(q)===q,'Existing private quarantine required');
const response=await fetch(new URL('inventory.json',base),{redirect:'error'});assert(response.ok);
const doc=await response.json(),entries=validateInventory(doc,'127.0.0.1');assert(doc.sourceKind==='independent-bp3d'&&entries.length>0);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=fs.mkdtempSync(path.join(q,'atlas-system-browser-qc-'));fs.chmodSync(out,0o700);
const rows=[],errors=[];let browser;
const channel=process.env.ATLAS_QC_BROWSER_CHANNEL||'';
assert(['','chrome','chromium','msedge'].includes(channel),'Unsupported browser channel');
try{
 console.log('ATLAS QC BROWSER START '+JSON.stringify({channel:channel||'bundled-headless-shell'}));
 browser=await chromium.launch({headless:true,...(channel?{channel}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});console.log('ATLAS QC BROWSER READY');

 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await page.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===base.origin||['blob:','data:'].includes(u.protocol)?route.continue():route.abort();});
 page.on('pageerror',e=>errors.push(String(e.message).slice(0,400)));
 await page.goto(base.href);await page.locator('#loadingOverlay.hidden').waitFor({state:'attached',timeout:120000});
 assert.equal(await page.locator('#systemsList [data-group]').count(),13,'Wrong viewer build: update before running QC');
 const snapshot=()=>page.evaluate(()=>{const s=document.getElementById('atlasStatus');return {visibleModels:Number(s.dataset.visibleModels),visibleMeshes:Number(s.dataset.visibleMeshes),failedModels:Number(s.dataset.failedModels),loading:s.dataset.loading==='true',render:JSON.parse(document.getElementById('view').dataset.renderQc||'{}')};});
 for(const [group,label] of Object.entries(groups)){
  const expected=entries.filter(e=>e.group===group).length,row={group,label,expected,clinicalValidation:false};
  console.log('SYSTEM BROWSER QC START '+JSON.stringify({group,expected}));
  const tile=page.locator('[data-group="'+group+'"] .sys-toggle');
  try{
   // Disable other active systems first; leave this one visible. No layer/region assumptions.
   for(const g of Object.keys(groups))if(g!==group){const b=page.locator('[data-group="'+g+'"] .sys-toggle');if(await b.getAttribute('aria-pressed')==='true')await b.click();}
   if(expected===0){row.status='NO_MODELS_IN_LOCAL_INVENTORY';rows.push(row);console.log('SYSTEM BROWSER QC '+JSON.stringify(row));continue;}
   if(await tile.getAttribute('aria-pressed')!=='true')await tile.click();
   await page.waitForFunction(n=>{const s=document.getElementById('atlasStatus');return s?.dataset.loading==='false'&&Number(s.dataset.visibleModels)===n;},expected,{timeout:180000});
   await page.locator('#frontViewBtn').click();
   await page.waitForFunction(()=>{const d=JSON.parse(document.getElementById('view').dataset.renderQc||'{}');return d.up?.join(',')==='0,0,1'&&d.axis?.[1]<-.99&&d.triangles>0;},{},{timeout:20000});
   const snap=await snapshot();Object.assign(row,snap);assert(snap.visibleModels===expected&&snap.visibleMeshes>0&&snap.failedModels===0&&snap.render.triangles>0,'Render count or loading failure');
   const png=path.join(out,group+'-anterior.png');await page.locator('#threeCanvas').screenshot({path:png});fs.chmodSync(png,0o600);
   row.status='TECHNICAL_RENDER_PASS';row.screenshot=path.basename(png);
  }catch(e){row.status='HOLD_BROWSER_QC';row.reason=String(e.message).slice(0,400);try{row.observed=await snapshot();}catch{}}
  rows.push(row);console.log('SYSTEM BROWSER QC '+JSON.stringify(row));
 }
}catch(error){errors.push(String(error.message||error).slice(0,1000));throw error;}finally{
 await browser?.close();
 const report={schema:1,scope:'Actual local BP3D review-pack system rendering. Screenshots require human visual review; not anatomical completeness or clinical validation.',bodyModels:entries.length,systems:rows.length,passed:rows.filter(r=>r.status==='TECHNICAL_RENDER_PASS').length,rows,errors,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('ATLAS SYSTEM BROWSER QC '+JSON.stringify({...report,rows:undefined,folder:path.basename(out)}));
 if(rows.length!==13||report.passed!==13||errors.length)process.exitCode=1;
}
