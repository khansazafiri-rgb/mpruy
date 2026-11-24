// MEDCOEL original Atlas: local-only integration of a staged official BP3D source pack.
// No changes to tracked anatomy source, public catalog, production dist, or release policy.
// Usage: node scripts/preview-private-atlas-expansion.mjs bp3d-expansion-staging-XXXXXX
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseOfficialNames, parseOfficialElements } from '../licensing/tools/prepare-bodyparts3d-source.mjs';
import { summarizeGeometry, diagnoseGeometry } from '../apps/4d-lab/tools/review-bp3d-candidate.mjs';
import { createLabPreviewServer, checkBuilds, ROOTS } from './preview-4d-lab.mjs';
import { expandPartOf } from './bp3d-partof-private-expansion.mjs';
import { stagePublishedHra, coverageReport } from './atlas-onepass-supplementary.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.join(root, 'local-data/licensing-quarantine');
const atlasRoot = path.join(root, 'apps/anatomy');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const sameSet = (a,b) => Array.isArray(a) && Array.isArray(b) &&
  a.length === new Set(a).size && b.length === new Set(b).size &&
  a.length === b.length && [...a].sort().every((v,i) => v === [...b].sort()[i]);
const idsPattern = /^FMA\d+-BP\d+$/;
const modelPattern = /^\.\/structures\/[a-z0-9-]+\/model\.glb$/;
const stagePattern = /^bp3d-expansion-staging-[A-Za-z0-9_-]+$/;
const expectedCatalog = Object.freeze({
  'FMA44884-BP5886': 'Plantar venous arch.l',
  'FMA44883-BP5885': 'Plantar venous arch.r',
  'FMA13392-BP4880': 'Scalenus anterior muscle.r',
  'FMA24501-BP8599': 'Navicular bone.l',
  'FMA24500-BP9133': 'Navicular bone.r',
  'FMA21423-BP6043': 'Descending branch of lateral circumflex femoral artery.l'
});

function localChild(base, relative, kind = 'file') {
  const p = path.resolve(base, relative);
  fail(p.startsWith(path.resolve(base) + path.sep), 'Unsafe path: ' + relative);
  const real = fs.realpathSync(p);
  fail(real === p, 'Symlinked private input refused: ' + relative);
  const st = fs.statSync(real);
  fail(kind === 'directory' ? st.isDirectory() : st.isFile(), 'Wrong input type: ' + relative);
  return real;
}
async function hashFile(p) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(p)) h.update(chunk);
  return h.digest('hex');
}
function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), {recursive:true});
  fs.copyFileSync(src, dest, fs.constants.COPYFILE_FICLONE);
}
// Same preview transform as bp3dSource.js. It is an approximate placement,
// not patient registration or anatomy validation.
function atlasBox(bounds) {
  const a=bounds.min,b=bounds.max;
  return [a[0]*.001+.0007,a[2]*.001+.0692,-b[1]*.001-.0987,
          b[0]*.001+.0007,b[2]*.001+.0692,-a[1]*.001-.0987];
}
function patchOnce(code, from, to, name) {
  fail(code.split(from).length === 2, 'Private patch source changed: '+name);
  return code.replace(from, to);
}

// The four UI adaptations live ONLY in the private Vite invocation, never
// in the tracked viewer or in its normal build. The old nervous GLB remains
// quarantined; the private path cannot fall back to it or to other legacy GLBs.
const gate = "(globalThis.location?.hostname === '127.0.0.1' && new URLSearchParams(globalThis.location.search).get('privateExpansion') === '1' && new URLSearchParams(globalThis.location.search).get('models') === 'bp3d')";
export function privateAtlasPlugin(applied = new Set()) {
  return {
    name:'medcoel-private-expansion-preview', enforce:'pre',
    transform(code,id) {
      const p=id.split('?')[0];
      const rel=path.relative(atlasRoot,p).split(path.sep).join('/');
      if (rel==='src/atlas/catalog.js') {
        code=patchOnce(code,'export function groupFor(name, source) {',
          "if ("+gate+") GROUPS.splice(6,0,{id:'nervous',label:'Saraf & otak (kandidat privat)',source:'nervous',color:'#e4c875',layers:['Struktur sumber']});\nexport function groupFor(name, source) {",rel);
      } else if (rel==='src/atlas/ui.js') {
        code=patchOnce(code,'[...UNAVAILABLE_GROUPS,...temporarilyUnavailable].map',
          '[...UNAVAILABLE_GROUPS.filter(g => !('+gate+' && g.id === "nervous")),...temporarilyUnavailable].map',rel);
      } else if (rel==='src/main.js') {
        code=patchOnce(code,'async function start(){',
          "import {loadBp3dInventory} from './viewer/bp3dSource.js';\nasync function start(){",rel);
        code=patchOnce(code,"  const [systems,catalog]=await Promise.all([loadSystemsData(),fetchJson('data/atlas-catalog.json')]);metadataTimer();",
          "  const [systems,catalog]=await Promise.all([loadSystemsData(),fetchJson('data/atlas-catalog.json')]);\n"+
          "  if ("+gate+") {\n"+
          "    const inv=await loadBp3dInventory();\n"+
          "    if (!inv) throw new Error('Private expansion inventory unavailable');\n"+
          "    systems.nervous=[];\n"+
          "    for (const e of inv.converted) if(e.privateAtlasMeta?.source===e.system) {\n"+
          "      if (Object.hasOwn(catalog,e.name) && catalog[e.name].source!==e.system) throw new Error('Conflicting private structure: '+e.name);\n"+
          "      catalog[e.name]=e.privateAtlasMeta; const list=systems[e.system]??=[]; if(!list.includes(e.name))list.push(e.name);\n"+
          "    }\n"+
          "    if (!systems.nervous.length) throw new Error('No private nervous structures');\n"+
          "  }\n  metadataTimer();",rel);
      } else if (rel==='src/viewer/loadModel.js') {
        code=patchOnce(code,'  if (isQuarantinedSource(systemId)) {',
          "  const localNervous = systemId === 'nervous' && "+gate+";\n"+
          "  if (isQuarantinedSource(systemId) && !localNervous) {",rel);
        code=patchOnce(code,"const officialOnly=bp3dRequested()&&['skeletal','visceral'].includes(systemId)&&",
          "const officialOnly=bp3dRequested()&&("+gate+"||['skeletal','visceral'].includes(systemId))&&",rel);
        code=patchOnce(code,'const model=officialModel||(await loadAtlasScene(systemId));',
          "if (localNervous && !officialModel) throw new Error('Private nervous source unavailable; legacy model remains blocked');\n  const model=officialModel||(await loadAtlasScene(systemId));",rel);
      } else return null;
      applied.add(rel);
      return {code,map:null};
    }
  };
}
async function main() {
  const stageName=process.argv[2];
  fail(process.argv.length===3 && stagePattern.test(stageName||''),'Usage: node scripts/preview-private-atlas-expansion.mjs bp3d-expansion-staging-XXXXXX');
  fail(fs.realpathSync(privateRoot)===privateRoot,'Private root must not be symlinked');
  const stage=localChild(privateRoot,stageName,'directory');
  const base=localChild(privateRoot,'bp3d-all-systems','directory');
  const source=localChild(privateRoot,'bp3d-4.0','directory');
  const old=json(localChild(base,'inventory.json'));
  const manifest=json(localChild(stage,'inventory.json'));
  fail(Array.isArray(old.converted)&&old.converted.length>0&&old.approvedForCommercialDistribution===false,'Expected private baseline inventory');
  fail(Array.isArray(manifest.results)&&manifest.summary?.publicRelease==='NO_GO'&&manifest.summary?.atlasIntegration===false,'Expected staged NO_GO inventory');
  fail(manifest.results.every(e=>e.approvedForDistribution===false),'Unexpected distribution approval');
  const staged=manifest.results.filter(e=>e.status==='PRIVATE_GLB_STAGED');
  fail(staged.length===manifest.summary.staged && manifest.results.length===manifest.summary.candidates,'Staging count mismatch');

  const namesBytes=fs.readFileSync(localChild(source,'isa_parts_list_e.txt'));
  const elementsBytes=fs.readFileSync(localChild(source,'isa_element_parts.txt'));
  const archive=localChild(source,'isa_BP3D_4.0_obj_99.zip');
  fail(old.sourceHashes?.namesSha256===sha(namesBytes)&&old.sourceHashes?.elementsSha256===sha(elementsBytes),'Publisher table hash mismatch against baseline');
  fail(old.sourceHashes?.archiveSha256===await hashFile(archive),'Publisher archive hash mismatch against baseline');
  const rows=parseOfficialNames(namesBytes.toString('utf8'));
  const elements=parseOfficialElements(elementsBytes.toString('utf8'));
  const catalog=json(path.join(atlasRoot,'public/data/atlas-catalog.json'));
  const systems=json(path.join(atlasRoot,'public/data/systems.json'));
  const out=fs.mkdtempSync(path.join(privateRoot,'bp3d-integrated-preview-'));
  const pack=path.join(out,'pack'); fs.mkdirSync(pack);
  const dist=path.join(out,'atlas-dist');
  const oldNames=new Set(), oldIds=new Set(), usedFJ=new Set(), identities=new Set();
  const converted=[];
  for(const e of old.converted){
    fail(typeof e.name==='string'&&modelPattern.test(e.modelPath)&&!oldNames.has(e.name)&&!oldIds.has(e.id),'Invalid baseline identity/path');
    const file=localChild(base,e.modelPath);
    const lineageFile=localChild(base,path.join(path.dirname(e.modelPath),'lineage.json'));
    const lineage=json(lineageFile);
    fail(lineage.approvedForDistribution===false&&Array.isArray(lineage.elements)&&lineage.generatedGLBSHA256===e.glbSha256,'Invalid private baseline lineage: '+e.name);
    fail(await hashFile(file)===e.glbSha256,'Baseline GLB hash mismatch: '+e.name);
    oldNames.add(e.name);oldIds.add(e.id);identities.add(e.fmaId+'-'+e.bpId);
    for(const part of lineage.elements)usedFJ.add(part.id);
    copy(file,path.join(pack,e.modelPath));
    copy(lineageFile,path.join(pack,path.dirname(e.modelPath),'lineage.json'));
    converted.push(e);
  }
  if(old.referenceSurface?.modelPath==='./reference-surface/skin.glb'){
    const file=localChild(base,old.referenceSurface.modelPath);
    fail(await hashFile(file)===old.referenceSurface.glbSha256,'Baseline skin hash mismatch');
    copy(file,path.join(pack,old.referenceSurface.modelPath));
  }
  console.log('BASELINE PRESERVED',converted.length);
  const req=createRequire(path.join(root,'apps/4d-lab/package.json'));
  const {NodeIO}=req('@gltf-transform/core');
  const io=new NodeIO();
  const added=[],retained=[];
  // Prefer smaller source-element sets to keep parent/child meshes from
  // occupying identical physical space. All skipped originals remain staged.
  const sorted=[...staged].sort((a,b)=>a.sourceFJ.length-b.sourceFJ.length ||
    (a.name<b.name?-1:a.name>b.name?1:0));
  const verified=[];
  for(const r of sorted){
    const key=r.fma+'-'+r.bp;
    fail(idsPattern.test(key)&&r.modelPath===key+'/model.glb'&&typeof r.name==='string'&&r.name.length>0,'Invalid staged identity/path');
    fail(rows.some(x=>x.fmaId===r.fma&&x.bpId===r.bp&&x.name===r.name),'Publisher identity differs: '+key);
    fail(sameSet(r.sourceFJ,[...(elements.get(r.fma)||[])]),'Publisher FJ identity differs: '+key);
    const src=localChild(stage,r.modelPath);
    const bytes=fs.readFileSync(src);
    fail(sha(bytes)===r.sha256,'Staged GLB checksum mismatch: '+key);
    const doc=await io.readBinary(new Uint8Array(bytes));
    const geometry=summarizeGeometry(doc);
    fail(sameSet(geometry.meshes.map(m=>m.elementId),r.sourceFJ),'GLB mesh IDs differ: '+key);
    const extras=doc.getRoot().getExtras();
    fail(extras.reviewStatus==='candidate-only'&&extras.provenance?.approvedForDistribution===false,'Missing private source marker: '+key);
    verified.push({r,key,src,geometry,diagnostics:diagnoseGeometry(doc,geometry)});
  }
  for(const v of verified){
    const {r,key,src,geometry,diagnostics}=v;
    let name,system,group,meta;
    if(r.kind==='existing-catalog-review'){
      name=expectedCatalog[key];
      fail(name&&name===r.atlasCandidate&&Object.hasOwn(catalog,name)&&sameSet(r.expectedFJ,r.sourceFJ),'Unreviewed existing catalog target: '+key);
      meta=catalog[name];system=meta.source;group=meta.group;
      fail(Array.isArray(systems[system])&&systems[system].includes(name),'Catalog/system disagreement: '+name);
    }else if(r.kind==='nervous-source-lead'){
      name=r.name;system='nervous';group='nervous';
      meta={source:'nervous',group:'nervous',layer:0,box:atlasBox(geometry.boundsNative),
        regions:r.name==='central canal of spinal cord'?['back']:['headNeck']};
      fail(meta.box.every(Number.isFinite),'Invalid preview bounds: '+name);
      if(Object.hasOwn(catalog,name)){retained.push({key,name,reason:'catalog-name-collision'});continue;}
    }else{throw new Error('Unknown staged candidate kind: '+key);}
    if(oldNames.has(name)||identities.has(key)||r.sourceFJ.some(fj=>usedFJ.has(fj))){
      retained.push({key,name,reason:'overlapping-source-element-or-existing-identity'});continue;
    }
    const id='expansion-'+key.toLowerCase();
    fail(!oldIds.has(id),'Duplicate private ID: '+id);
    const modelPath='./structures/'+id+'/model.glb';
    copy(src,path.join(pack,modelPath));
    const e={id,name,system,group,fmaId:r.fma,bpId:r.bp,modelPath,glbSha256:r.sha256,
      triangles:geometry.triangles,vertices:geometry.vertices,sourceMeshes:geometry.sourceMeshes,
      boundsNative:geometry.boundsNative,diagnostics,state:'converted-unverified',
      mappingMethod:'official-source-identity-private-review-only',
      approvedForDistribution:false,geometryAnatomyValidated:false};
    if(system==='nervous')e.privateAtlasMeta=meta;
    write(path.join(pack,'structures',id,'lineage.json'),{...r,
      generatedGLBSHA256:r.sha256,officialFMAId:r.fma,officialRepresentationId:r.bp,
      elements:r.sourceFJ.map(fj=>({id:fj})),registrationValidated:false,geometryAnatomyValidated:false,
      approvedForDistribution:false,sourceArchiveSHA256:old.sourceHashes.archiveSha256,
      originalStaging:stageName,warning:'Private display candidate, not independently validated'});
    converted.push(e);added.push({key,name,system,flags:diagnostics.flags});
    oldNames.add(name);oldIds.add(id);identities.add(key);r.sourceFJ.forEach(fj=>usedFJ.add(fj));
  }
  const onePass=process.env.MEDCOEL_ATLAS_ONE_PASS==='1';
  const expansionOptions={privateRoot,source,pack,catalog,systems,converted,oldNames,oldIds,usedFJ,identities,io};
  const isaSupplement=onePass ? await expandPartOf({...expansionOptions,tree:'isa'}) : null;
  const partOf=(onePass||process.env.MEDCOEL_BP3D_PARTOF==='1') ? await expandPartOf(expansionOptions) : null;
  let hra=null;
  if(onePass){
    try{hra=await stagePublishedHra(privateRoot);}
    catch(error){hra={status:'BLOCKED',error:String(error.message),assets:[],blocked:[],atlasMounted:false};}
  }
  const coverage=coverageReport(catalog,converted);
  fail(!coverage.duplicateIds.length&&!coverage.systemMismatch.length,'Private source catalogue identity QC failed');
  write(path.join(out,'coverage-report.json'),coverage);
  const summarizeTree=t=>t&&{status:t.status,error:t.error||null,exactCandidateCount:t.exactCandidateCount||0,added:t.added.length,frame:t.frame};
  const perSystem={};
  for(const e of converted)perSystem[e.system]=(perSystem[e.system]||0)+1;
  fail((perSystem.nervous||0)>0,'No independent nervous candidate available');
  const report={baseline:old.converted.length,staged:staged.length,verified:verified.length,
    added:added.length+(isaSupplement?.added.length||0)+(partOf?.added.length||0),
    isaStagedAdded:added.length,isaSupplementAdded:isaSupplement?.added.length||0,partOfAdded:partOf?.added.length||0,
    isaSupplement:summarizeTree(isaSupplement),partOf:summarizeTree(partOf),
    hra:hra&&{status:hra.status,discovered:hra.discovered||0,staged:hra.assets?.length||0,blocked:hra.blocked?.length||0,error:hra.error||null,atlasMounted:false},
    coverage:{catalog:coverage.catalogCount,mapped:coverage.mappedCatalog,missing:coverage.missingCatalog,extraSourceLabels:coverage.extraSourceLabels,perSystem:coverage.perSystem},
    total:converted.length,perSystem,retained,addedEntries:[...added,...(isaSupplement?.added||[]),...(partOf?.added||[])],
    onePass,releaseBlockers:['Exact source-version rights and Atlas viewer code rights unresolved','Clinical identity/geometry and visual browser QA not completed','HRA has no verified registration to BodyParts3D frame'],
    atlasIntegration:'PRIVATE_BUILD_PENDING',geometryAnatomyValidated:false,publicRelease:'NO_GO',out};
  write(path.join(out,'integration-report.json'),report);
  const combined={...old,kind:'official-bp3d-private-expansion-preview',converted,provisionalSource:true,
    summary:{...old.summary,converted:converted.length},systems:perSystem,
    privateExpansion:true,legalStatus:'NOT-CLEARED',approvedForCommercialDistribution:false};
  write(path.join(pack,'inventory.json'),combined);
  console.log(JSON.stringify(report,null,2));

  // Build the actual existing Atlas with its normal quarantine plugin, but to
  // a new gitignored directory. No source edits and no candidate assets in dist.
  const applied=new Set();
  const atlasReq=createRequire(path.join(atlasRoot,'package.json'));
  const {build}=await import(pathToFileURL(atlasReq.resolve('vite')).href);
  process.chdir(atlasRoot);
  try{
    await build({root:atlasRoot,configFile:path.join(atlasRoot,'vite.config.js'),
      base:'/anatomy/viewer/',plugins:[privateAtlasPlugin(applied)],
      build:{outDir:dist,emptyOutDir:true}});
  } finally {process.chdir(root);}
  fail(applied.size===4,'Not all private UI transforms applied');
  const roots={...ROOTS,atlas:dist,bp3d:pack};
  const checked=await checkBuilds(roots);
  fail(checked.ok,'Preview preflight failed: '+checked.problems.join('; '));
  const port=Number(process.env.PORT||4174);
  fail(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid local port');
  const preview=createLabPreviewServer(roots);
  const handle=preview.listeners('request')[0];
  fail(typeof handle==='function','Preview request handler unavailable');
  const server=createServer((req,res)=>{
    if(req.headers.host!=='127.0.0.1:'+port){res.writeHead(403);res.end('Local loopback only');return;}
    handle(req,res);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const origin='http://127.0.0.1:'+port;
  try{
    const inv=await fetch(origin+'/anatomy/viewer/bp3d/inventory.json');
    fail(inv.ok&&(await inv.json()).converted.length===converted.length,'Served inventory mismatch');
    const withheld=await fetch(origin+'/anatomy/viewer/models/nervous.glb',{method:'HEAD'});
    fail(withheld.status===404,'Old nervous model must remain blocked');
    const html=await fetch(origin+'/anatomy/viewer/');
    fail(html.ok&&(await html.text()).includes('loadingOverlay'),'Original viewer HTML unavailable');
    report.atlasIntegration='PRIVATE_SERVER_READY_VISUAL_QA_PENDING';
    report.preview=origin+'/anatomy/viewer/?models=bp3d&privateExpansion=1';
    write(path.join(out,'integration-report.json'),report);
    console.log('\nPRIVATE ATLAS PREVIEW READY: '+converted.length+' candidates; '+perSystem.nervous+' nervous.');
    console.log(report.preview);
    console.log('Report: '+path.join(out,'integration-report.json'));
    console.log('Coverage: '+path.join(out,'coverage-report.json'));
    console.log('Original catalogue: '+coverage.mappedCatalog+'/'+coverage.catalogCount+'; extra source labels: '+coverage.extraSourceLabels);
    if(onePass)console.log('HRA private staged: '+(hra?.assets?.length||0)+'; HRA mounted: 0 (registration pending)');
    console.log('Public release NO_GO; visual/anatomical QA pending. Ctrl+C stops only this preview.');
  }catch(e){server.close();throw e;}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  main().catch(e=>{console.error('PRIVATE PREVIEW BLOCKED:',e.message);process.exitCode=1;});
}
