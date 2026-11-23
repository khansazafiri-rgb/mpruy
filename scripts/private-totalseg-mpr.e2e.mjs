// Real Chromium E2E using explicitly synthetic engineering data ONLY.
// Never reads local-data, medical resources, production keys or owner reports.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {privateMprFixture} from './private-mpr-test-harness.mjs';
import {privateMprPage} from './private-totalseg-mpr.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-synthetic-mpr-e2e-'));
const results=[];
let browser;
function fixturePage(name,payload){
  const root=path.join(tmp,name),shared=path.join(root,'ct-mpr-private'),studio=path.join(root,'abdomen-ct');
  fs.mkdirSync(shared,{recursive:true,mode:0o700});fs.mkdirSync(studio,{mode:0o700});
  fs.copyFileSync(new URL('./private-totalseg-mpr-browser.js',import.meta.url),path.join(shared,'viewer.js'));
  fs.copyFileSync(new URL('./private-totalseg-mpr-geometry.cjs',import.meta.url),path.join(shared,'geometry.js'));
  fs.writeFileSync(path.join(shared,'volume.js'),'window.MEDCOEL_CT_PRIVATE='+JSON.stringify(payload)+';');
  const html=privateMprPage('abdomen-ct').replace('<h1>','<h1>TECHNICAL FIXTURE · NO PATIENT DATA · ')
    .replace('Sumber TotalSegmentator 2.0.1, satu subjek pseudonim. Data voxel asli diverifikasi sebelum bundel dibuat.',
      'SYNTHETIC ENGINEERING FIXTURE. No TotalSegmentator patient data, diagnoses or clinical approval.');
  fs.writeFileSync(path.join(studio,'index.html'),html.replace(/<section id="source-attribution"[\s\S]*?<\/section>/,
    '<p>Engineering fixture created for software tests. NOT sourced from a patient dataset. NOT medical validation.</p>'));
  return pathToFileURL(path.join(studio,'index.html')).href;
}
async function step(name,fn){
  try{await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}
  catch(e){results.push({name,status:'FAIL',error:String(e.message).slice(0,500)});console.error('FAIL '+name+': '+e.message);}
}
try{
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM||undefined});
  await step('MPR-BROWSER-001 three planes, real keyboard sliders, overlay, toggle, HU, wheel and mobile layout',async()=>{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
    try{
      await page.goto(fixturePage('valid',privateMprFixture()));
      await page.waitForFunction(()=>document.body.dataset.mprReady==='true');
      for(const axis of ['x','y','z']){
        const slider=page.locator('#slice-'+axis);await slider.focus();
        await slider.press('Home');await slider.press('ArrowRight');await slider.press('ArrowRight');
        await page.waitForFunction(a=>document.querySelector('#n-'+a).textContent==='2',axis);
      }
      const pixel=async(axis,u,v)=>page.evaluate(([a,x,y])=>Array.from(document.querySelector('#view-'+a).getContext('2d').getImageData(x,y,1,1).data),[axis,u,v]);
      const opacity=page.locator('#opacity');await opacity.focus();await opacity.press('Home');
      await page.waitForFunction(()=>document.querySelector('#pct').textContent==='0%');
      // The percentage changes synchronously; Canvas updates on the next RAF.
      // Wait for the rendered output without weakening the exact-pixel assertion.
      await page.waitForFunction(()=>document.querySelector('#view-z').getContext('2d').getImageData(2,4,1,1).data[0]===73);
      assert.deepEqual(await pixel('z',2,4),[73,73,73,255]);
      assert.deepEqual(await pixel('y',2,3),[73,73,73,255]);
      assert.deepEqual(await pixel('x',2,3),[73,73,73,255]);
      await opacity.press('End');await page.waitForFunction(()=>document.querySelector('#pct').textContent==='100%');
      await page.waitForFunction(()=>document.querySelector('#view-z').getContext('2d').getImageData(2,4,1,1).data[0]===240);
      for(const [axis,u,v] of [['z',2,4],['y',2,3],['x',2,3]])assert.deepEqual(await pixel(axis,u,v),[240,166,61,255]);
      await page.locator('.organ input').first().uncheck();
      await page.selectOption('#window','lung');
      await page.waitForFunction(()=>document.querySelector('#view-z').getContext('2d').getImageData(2,4,1,1).data[0]===222);
      assert.deepEqual(await pixel('z',2,4),[222,222,222,255]);
      await page.selectOption('#window','bone');
      await page.waitForFunction(()=>document.querySelector('#view-z').getContext('2d').getImageData(2,4,1,1).data[0]===64);
      await page.locator('#view-z').hover();await page.mouse.wheel(0,100);
      await page.waitForFunction(()=>document.querySelector('#n-z').textContent==='3');
      assert.equal(await page.inputValue('#slice-x'),'2');assert.equal(await page.inputValue('#slice-y'),'2');
      assert.match(await page.locator('#orientation-z').innerText(),/header RAS.*belum direview klinis/);
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    }finally{await page.close();}
  });
  const cases=[
    ['hu-checksum',d=>{d.hu.sha256='0'.repeat(64);}],
    ['mask-checksum',d=>{d.masks.sha256='0'.repeat(64);}],
    ['gzip-expansion',d=>{
      const raw=Buffer.alloc(2*1024*1024),compressed=zlib.gzipSync(raw);
      d.hu={base64:compressed.toString('base64'),compressedBytes:compressed.length,uncompressedBytes:672,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
    }],
    ['duplicate-bit',d=>{d.organs[1].bit=d.organs[0].bit;}],
    ...['releaseEligible','clinicalApproved','privacyApproved','rightsApproved','orientationApproved'].map(k=>['forged-'+k,d=>{d[k]=true;}])
  ];
  for(const [name,mutate] of cases)await step('MPR-BROWSER blocked '+name,async()=>{
    const payload=privateMprFixture();mutate(payload);
    const page=await browser.newPage();
    try{
      await page.goto(fixturePage(name,payload));
      await page.waitForFunction(()=>document.body.dataset.mprReady==='false');
      assert.match(await page.locator('#status').innerText(),/tidak dapat dimuat/);
      assert.equal(await page.locator('#slice-z').isDisabled(),true);
    }finally{await page.close();}
  });
}finally{
  await browser?.close();fs.rmSync(tmp,{recursive:true,force:true});
}
const report={schema:'medcoel.private-mpr-engineering-browser-qc.v1',data:'SYNTHETIC_ENGINEERING_FIXTURE_ONLY',medicalApproval:false,
  codeCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  rendererSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('./private-totalseg-mpr-browser.js',import.meta.url))).digest('hex'),
  runId:process.env.GITHUB_RUN_ID||null,attempt:process.env.GITHUB_RUN_ATTEMPT||null,
  passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results};
const arg=process.argv.indexOf('--report');
if(arg>=0)fs.writeFileSync(path.resolve(process.argv[arg+1]),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));process.exitCode=report.failed?1:0;
