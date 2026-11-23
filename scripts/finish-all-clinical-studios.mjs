#!/usr/bin/env node
/**
 * MEDCOEL: one pass over the full, frozen 24-studio catalog.
 * Generates all currently grounded PRIVATE previews, builds a technical
 * coverage report and QC handoff. No public publishing or rights approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import geometry from './private-totalseg-mpr-geometry.cjs';
import { PRIVATE_MPR_ORGAN_IDS } from './private-totalseg-ct-review.mjs';
import { privateMprPage } from './private-totalseg-mpr.mjs';
import { writePrivateReadiness } from './alternative-source-readiness.mjs';
import { generateAllPrivateOverlays } from './generate-all-private-review-overlays.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const OUT=path.join(ROOT,'local-data/studio-resources/review-overlays');
const READY=new Set(['PRIVATE_PREVIEW_READY','PRIVATE_CANDIDATE_REVIEW_READY']);
const notes={
  'brain-anatomy':'No commercial-cleared complete 3D brain geometry',
  'brain-ct':'No verified CT data and annotations for brain',
  'brain-mri':'LPBA40 blocked; alternative MRI and renderer not cleared',
  'head-neck-anatomy':'3D asset file manifest and rights review missing',
  'spine-anatomy':'3D anatomy geometry and rights review pending',
  'thorax-anatomy':'CT organ masks are not a complete licensed 3D anatomy atlas',
  'chest-xray':'Source polygon review required before public use',
  'chest-ct':'Private TotalSegmentator candidate ONLY; legacy TCIA remains quarantined',
  'lung-ultrasound':'Lung ultrasound publisher file manifest/renderer missing',
  'heart-anatomy':'3D heart geometry and rights review missing',
  'cardiac-echo':'Cardiac echo publisher file manifest/renderer missing',
  'cardiac-ct':'Verified cardiac CT source/labels missing',
  'abdomen-anatomy':'CT 2D organ masks are not full cleared 3D abdomen anatomy',
  'abdomen-ct':'TotalSegmentator anatomical mask review pending',
  'abdomen-ultrasound':'Ultrasound source file manifest and renderer missing',
  'fast-ultrasound':'Verified and redistributable FAST dataset missing',
  'pelvis-anatomy':'Full pelvis 3D asset with rights review missing',
  'pelvis-ultrasound':'HC18 is fetal-head obstetrics, NOT gynecologic pelvic ultrasound',
  'upper-limb-anatomy':'Commercial-clear 3D limb assets pending',
  'lower-limb-anatomy':'Commercial-clear 3D limb assets pending',
  'msk-xray':'FracAtlas image, polygon and privacy review pending',
  'knee-mri':'Knee MRI publisher file manifest, annotation and renderer missing',
  'spine-mri':'SPIDER source geometry and clinical label orientation review pending',
  'ecg':'PTB-XL diagnosis and waveform interpretation unapproved'
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
function safe(file){
  const rel=path.relative(ROOT,file);
  if(!rel||rel.startsWith('..')||path.isAbsolute(rel)||
     !file.startsWith(path.join(ROOT,'local-data')+path.sep))
    throw Error('ONE_SHOT_NOT_PRIVATE');
  let p=ROOT;
  for(const part of rel.split(path.sep)){
    p=path.join(p,part);
    if(fs.lstatSync(p,{throwIfNoEntry:false})?.isSymbolicLink())
      throw Error('ONE_SHOT_SYMLINK');
  }
}
function readJSON(file){
  safe(file);
  const stat=fs.lstatSync(file,{throwIfNoEntry:false});
  if(!stat||!stat.isFile()||stat.size>10*1024*1024)
    throw Error('ONE_SHOT_MISSING_OR_UNSAFE_REPORT');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function put(file,data){
  safe(file);
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  safe(file);
  fs.writeFileSync(file,data,{mode:0o600});
}
export function verifyPrivateMprFiles(manifest,read){
  try{
    if(manifest?.schema!=='medcoel.private-mpr-ct.v1'||
       !['releaseEligible','orientationApproved','clinicalApproved','privacyApproved','rightsApproved'].every(k=>manifest[k]===false)||
       !/^s\d{3,6}$/.test(manifest.sourceSubject||'')||
       ![manifest.sourceArchiveSha256,manifest.ctSourceSha256].every(x=>/^[a-f0-9]{64}$/.test(x||'')&&!/^0{64}$/.test(x))||
       !Array.isArray(manifest.organs)||!Array.isArray(manifest.maskReceipts)||
       JSON.stringify(manifest.organs.map(o=>o.id).sort())!==JSON.stringify([...PRIVATE_MPR_ORGAN_IDS].sort())||
       JSON.stringify(manifest.maskReceipts.map(o=>o.sourceMask).sort())!==JSON.stringify([...PRIVATE_MPR_ORGAN_IDS].sort())||
       manifest.maskReceipts.some(r=>!/^[a-f0-9]{64}$/.test(r.sha256||'')||/^0{64}$/.test(r.sha256)||r.sourceMember!==manifest.sourceSubject+'/segmentations/'+r.sourceMask+'.nii.gz'))return false;
    geometry.describe(manifest.sourceAffine,manifest.originalDimensions,manifest.sampledSourceIndices);
    if(!Array.isArray(manifest.dimensions)||manifest.dimensions.length!==3||
       manifest.dimensions.some((n,i)=>!Number.isInteger(n)||n<4||n>192||n!==manifest.sampledSourceIndices[i].length))return false;
    for(const name of ['geometry.js','viewer.js','volume.js']){
      const pin=manifest.files?.[name];
      if(!pin||!Number.isSafeInteger(pin.bytes)||pin.bytes<1||pin.bytes>64*1024*1024||
         !/^[a-f0-9]{64}$/.test(pin.sha256||''))return false;
      const bytes=read(name,pin.bytes);
      if(bytes.length!==pin.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==pin.sha256)return false;
      const code={ 'geometry.js':'./private-totalseg-mpr-geometry.cjs','viewer.js':'./private-totalseg-mpr-browser.js' }[name];
      if(code&&crypto.createHash('sha256').update(fs.readFileSync(new URL(code,import.meta.url))).digest('hex')!==pin.sha256)return false;
    }
    return true;
  }catch{return false;}
}
function availablePrivateViewer(id){
  const page=path.join(OUT,id,'index.html');
  safe(page);
  if(!fs.lstatSync(page,{throwIfNoEntry:false})?.isFile())return false;
  if(['abdomen-ct','chest-ct'].includes(id)){
    const expectedPage=privateMprPage(id);
    if(fs.statSync(page).size!==Buffer.byteLength(expectedPage)||fs.readFileSync(page,'utf8')!==expectedPage)return false;
    const paths=[
      path.join(OUT,id,'static-review.html'),
      path.join(OUT,'ct-mpr-private','volume.js'),
      path.join(OUT,'ct-mpr-private','viewer.js'),
      path.join(OUT,'ct-mpr-private','bundle-manifest.json')
    ];
    for(const p of paths){
      safe(p);
      if(!fs.lstatSync(p,{throwIfNoEntry:false})?.isFile())return false;
    }
    const m=readJSON(paths[3]);
    if(!verifyPrivateMprFiles(m,(name,expected)=>{
      const file=path.join(OUT,'ct-mpr-private',name);safe(file);
      const info=fs.lstatSync(file,{throwIfNoEntry:false});
      if(!info?.isFile()||info.size!==expected)throw Error('ONE_SHOT_UNBOUND_MPR_FILE');
      return fs.readFileSync(file);
    }))return false;
  }
  return true;
}
/** Pure status matrix. Existing previews must be proved by per-file checks. */
export function allStudioMatrix(catalog,readiness,results,valid={}){
  const studios=catalog?.studios?.filter(s=>!s.internal);
  if(!Array.isArray(studios)||studios.length!==24||
     new Set(studios.map(x=>x.id)).size!==24||
     !Array.isArray(readiness?.sources)||!Array.isArray(results))
    throw Error('ONE_SHOT_INCOMPLETE_24_STUDIO_INPUT');
  const byId=new Map(results.map(r=>[r.studio,r]));
  const rows=studios.map(s=>{
    const r=byId.get(s.id),claimed=READY.has(r?.status);
    const hasPreview=claimed&&valid[s.id]===true;
    const state=hasPreview?r.status:
      claimed?'BROKEN_PRIVATE_PREVIEW':
      r?.status==='REVIEW_FAILED_CLOSED'?'RENDER_FAILED_CLOSED':
      s.id==='brain-mri'?'LICENSE_BLOCKED':
      s.id.endsWith('-anatomy')?'ANATOMY_3D_PENDING':'SOURCE_OR_RENDERER_PENDING';
    return {id:s.id,title:s.title,status:state,previewAvailable:hasPreview,
      sourceCandidates:readiness.sources.filter(src=>src.studioIds?.includes(s.id))
        .map(src=>({id:src.id,status:src.status,
          archivesRecorded:src.archivedFileCountFromLastReport||0})),
      primaryBlocker:notes[s.id]||'Exact source/renderer not cleared',
      approval:{medical:false,privacy:false,rights:false,release:false}};
  });
  return {
    schema:'medcoel.all-studios-private-audit.v1',totalStudios:24,
    privatePreviewCount:rows.filter(x=>x.previewAvailable).length,
    notReadyCount:rows.filter(x=>!x.previewAvailable).length,
    sourceCandidateCount:readiness.sources.length,
    liveRightsAuditPerformed:false,publicDeploymentModified:false,
    clinicalApproved:false,rightsApproved:false,privacyApproved:false,
    releaseEligible:false,studios:rows
  };
}
export function allStudioHtml(report){
  const rows=report.studios.map(s=>
    '<tr><td><strong>'+esc(s.title)+'</strong><small>'+esc(s.id)+'</small></td>'+
    '<td>'+esc(s.status)+'</td><td>'+esc(s.primaryBlocker)+'</td><td>'+
    (s.previewAvailable?'<a href="'+esc(s.id)+'/index.html">Preview privat</a>':'Blocked')+
    '</td></tr>').join('\n');
  return '<!doctype html><html lang="id"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>MEDCOEL All 24 Studio Private Review</title>'+
    '<style>:root{color-scheme:dark;font:15px system-ui;background:#101727;color:#edf3ff}'+
    'body{max-width:1350px;margin:0 auto;padding:24px}a{color:#8dc8ff}'+
    'table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #384661;text-align:left}'+
    'small{display:block;color:#acbed8}.warn{border-left:4px solid #ef9999;padding:12px;background:#272135}'+
    '</style></head><body><p><a href="index.html">Private Review Hub</a></p>'+
    '<h1>All 24 MEDCOEL Clinical Studios</h1>'+
    '<p>'+report.privatePreviewCount+'/24 technical private previews; '+
    report.notReadyCount+' unrendered/blocked.</p>'+
    '<p class="warn">Technical previews are NOT clinical, privacy, licensing or release approval. '+
    'TCIA/LPBA40 quarantines remain active. No public deployment.</p>'+
    '<table><thead><tr><th>Studio</th><th>Status</th><th>Blocker / QC</th><th>Local preview</th></tr></thead><tbody>'+
    rows+'</tbody></table></body></html>';
}
export function nextQcMarkdown(report){
  const parts=[
    '# MEDCOEL — ONE PROMPT NEXT QC',
    '',
    'Scope: all 24 Clinical Studios. Review technical, anatomical, licence, privacy and production exposure separately. Never equate a private preview with a cleared public asset.',
    '',
    'Technical previews: '+report.privatePreviewCount+'/24; missing/blocked: '+report.notReadyCount+'/24.',
    '',
    '1. Check exact repo head, all CI, offline synthetic tests and previous integration invariants.',
    '2. Inspect private index.html, static-review.html and interactive CT MPR for both CT studios; test X/Y/Z sliders, opacity, organ toggles, HU windows, source alignment, labels and laterality.',
    '3. Compare actual source manifest/MD5/SHA256, privacy inspection, attribution and legal rights per file. Source CC BY claim is not final signed release evidence.',
    '4. Confirm all 24 studio statuses and do NOT fabricate data, diagnoses, segmentation or anatomy to increase the ready count.',
    '5. Recheck live medcoel.com Atlas/4D endpoints for known skeletal/visceral GLB and CT exposure; this one-shot offline run has NOT rechecked live endpoints.',
    '6. Produce a QC matrix for each studio: PASS / FAIL / BLOCKED, exact evidence, fix PR and clinical/privacy/legal review owner. Do not deploy.',
    '',
    '| Studio | Technical status | Blocker |',
    '|---|---|---|'
  ];
  for(const s of report.studios)parts.push('| '+s.id+' | '+s.status+' | '+s.primaryBlocker+' |');
  return parts.join('\n')+'\n';
}
export async function runAllStudios({reuse=false,log=console.log}={}){
  log('1/4 · Check all 9 publisher-source candidates');
  const readiness=writePrivateReadiness();
  const catalog=JSON.parse(fs.readFileSync(
    path.join(ROOT,'shared/studios/catalog.v1.json'),'utf8'));
  log('2/4 · '+(reuse?'Review existing private assets':'Render all verified private studios in one batch'));
  const results=reuse?readJSON(path.join(OUT,'review-hub-status.json')).results:
    await generateAllPrivateOverlays();
  log('3/4 · Check 24 actual private preview artifacts');
  const valid={};
  for(const r of results)if(READY.has(r.status))valid[r.studio]=availablePrivateViewer(r.studio);
  const report=allStudioMatrix(catalog,readiness,results,valid);
  log('4/4 · Write one-shot summary and next-prompt QC packet');
  put(path.join(OUT,'all-studios-report.json'),JSON.stringify(report,null,2)+'\n');
  put(path.join(OUT,'all-studios-dashboard.html'),allStudioHtml(report));
  put(path.join(OUT,'next-qc-prompt.md'),nextQcMarkdown(report));
  log('Private previews: '+report.privatePreviewCount+'/24; blocked: '+report.notReadyCount+
    '; public releases: 0');
  log('OPEN: local-data/studio-resources/review-overlays/all-studios-dashboard.html');
  if(report.studios.some(s=>['BROKEN_PRIVATE_PREVIEW','RENDER_FAILED_CLOSED'].includes(s.status)))
    process.exitCode=1;
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.some(x=>!['--reuse','--help'].includes(x))){
    console.error('Usage: npm run resources:finish-all [-- --reuse]');process.exitCode=2;
  }else if(args.includes('--help'))console.log('Regenerate all grounded private previews, report all 24, and prepare the next QC prompt. --reuse only checks current previews.');
  else runAllStudios({reuse:args.includes('--reuse')}).catch(e=>{
    console.error('ONE_SHOT_FAILED_CLOSED: '+String(e.message));process.exitCode=1;
  });
}
