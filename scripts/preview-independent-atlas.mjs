import {auditCrossVersionOverlap} from './audit-atlas-cross-version-overlap.mjs';
import {load43Elements,combine43Registries,serve43Reference} from './load-bp3d43-private-elements.mjs';
// Independent viewer rehearsal. No copy of private model bytes into dist/public.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {prepare} from './prepare-atlas-publication-review.mjs';
import {loadIndependentReview} from './load-independent-source-review.mjs';
import {inspectInstalled,publicationBundleGate} from './atlas-independent-dependency-audit.mjs';
import {checkSourceNotices} from './audit-atlas-publication-rights.mjs';
import {buildHraRegistry,serveHraReference} from './atlas-hra-private-reference.mjs';
import {loadHraFemaleFive,loadHraBatch,mergeHraFemaleReferences} from './load-hra-female-five.mjs';
import {loadAuditedReferenceSuite} from './atlas-audited-reference-suite.mjs';
import {classifyIndependentPath,rawRequestPath} from './independent-atlas-routes.mjs';
import {createLabPreviewServer,ROOTS} from './preview-4d-lab.mjs';
import {assertDistributionClean} from '../licensing/tools/check-distribution.mjs';
import {createIndependentHostHandler} from './independent-atlas-host.mjs';
import {buildPriorityRecovery} from './independent-atlas-priority-recovery.mjs';
import {attachOriginalShell} from './private-atlas-original-shell.mjs';
import {createElementCatalog} from './independent-atlas-element-catalog.mjs';
import {planContextRecovery} from './independent-atlas-context-recovery.mjs';
import {buildThumbnailRecords,createThumbnailService} from './independent-atlas-thumbnails.mjs';
import {learningCoverage} from './independent-atlas-learning-coverage.mjs';
import {loadVerifiedPublisherSources} from './plan-independent-atlas-coverage.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const app=path.join(root,'apps/atlas-independent');
const privateRoot=path.join(root,'local-data/licensing-quarantine');
const folder=process.argv[2]||'';
const completeSuite=process.argv.includes('--audited-reference-suite');
const includeExpansion=process.argv.includes('--include-expansion');assert(!includeExpansion||completeSuite,'Expansion requires audited reference suite');
const includeHyoid=includeExpansion||process.argv.includes('--include-hyoid');assert(!includeHyoid||completeSuite,'Extended hyoid requires audited reference suite');
assert(!completeSuite||!process.argv.some(a=>/^--(?:bp3d43.*-folder|hra.*-folder)=/.test(a)||a==='--hra-source-groups'),'Suite cannot be mixed with explicit reference folders');
const source43Args=process.argv.filter(x=>x.startsWith('--bp3d43-folder='));assert(source43Args.length<=1,'One explicit 4.3 folder only');
const nerve43Args=process.argv.filter(x=>x.startsWith('--bp3d43-nerves-folder='));assert(nerve43Args.length<=1,'One explicit nerve folder only');
const discs43Args=process.argv.filter(x=>x.startsWith('--bp3d43-discs-folder='));assert(discs43Args.length<=1,'One explicit disc folder only');
const costal43Args=process.argv.filter(x=>x.startsWith('--bp3d43-costal-folder='));assert(costal43Args.length<=1,'One explicit costal folder only');
const neck43Args=process.argv.filter(x=>x.startsWith('--bp3d43-neck-cartilage-folder='));assert(neck43Args.length<=1,'One explicit head/neck cartilage folder only');
const visceral43Args=process.argv.filter(x=>x.startsWith('--bp3d43-visceral-folder='));assert(visceral43Args.length<=1,'One explicit visceral folder only');
const cns43Args=process.argv.filter(x=>x.startsWith('--bp3d43-cns-folder='));assert(cns43Args.length<=1,'One explicit CNS folder only');
const pelvic43Args=process.argv.filter(x=>x.startsWith('--bp3d43-pelvic-folder='));assert(pelvic43Args.length<=1,'One explicit pelvic folder only');
const cardio43Args=process.argv.filter(x=>x.startsWith('--bp3d43-cardio-folder='));assert(cardio43Args.length<=1,'One explicit cardiovascular folder only');
const bronchial43Args=process.argv.filter(x=>x.startsWith('--bp3d43-bronchial-folder='));assert(bronchial43Args.length<=1,'One explicit bronchial folder only');
const hraGroups=process.argv.includes('--hra-source-groups');
const hraCardioArgs=process.argv.filter(x=>x.startsWith('--hra-cardio-folder='));assert(hraCardioArgs.length<=1,'One explicit HRA cardiopulmonary folder only');
const hraFemaleArgs=process.argv.filter(x=>x.startsWith('--hra-female-folder='));assert(hraFemaleArgs.length<=1,'One explicit HRA female folder only');
const gap43Args=process.argv.filter(x=>x.startsWith('--bp3d43-gap-folder='));assert(gap43Args.length<=1,'One explicit gap folder only');
const hyoidArgs=process.argv.filter(x=>x.startsWith('--bp3d43-hyoid-folder='));assert(hyoidArgs.length<=1,'One explicit hyoid folder only');
assert(!hyoidArgs.length||!process.argv.some(a=>/^--bp3d43.*-folder=/.test(a)&&!a.startsWith('--bp3d43-hyoid-folder=')),'Supplemental hyoid preview is isolated from baseline batches');
const independent=/^independent-source-review-[A-Za-z0-9_-]+$/.test(folder);
assert(!completeSuite||independent,'Audited suite requires independent private source pack');
assert(independent||/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(folder),'Explicit private preview folder required');
let manifest,models,review,sourcePack;
if(independent){sourcePack=loadIndependentReview(privateRoot,folder);({manifest,models}=sourcePack);review={totals:{candidates:manifest.entries.length,approved:0}};}
else{
 const pack=path.join(privateRoot,folder,'pack');review=prepare(folder);
 const inv=JSON.parse(fs.readFileSync(path.join(pack,'inventory.json'),'utf8'));
 manifest={schema:1,mode:'private-review',publicRelease:'NO_GO',sourceFrame:inv.sourceFrame,entries:inv.converted.map(e=>({id:e.id,name:e.name,group:e.group,regions:e.privateAtlasMeta.regions,layer:e.privateAtlasMeta.layer,path:'models/'+e.id+'.glb',approvedForDistribution:false}))};
 models=new Map(inv.converted.map(e=>['/anatomy/viewer/models/'+e.id+'.glb',path.join(pack,e.modelPath)]));
}
assert(!(source43Args.length||gap43Args.length||nerve43Args.length||discs43Args.length||costal43Args.length||neck43Args.length||visceral43Args.length||cns43Args.length||pelvic43Args.length||cardio43Args.length||bronchial43Args.length||hyoidArgs.length)||independent,'4.3 reference requires independent private preview');
assert(!hraGroups||hraFemaleArgs.length||hraCardioArgs.length,'Explicit audited HRA folder required for source groups');
assert(!(hraFemaleArgs.length||hraCardioArgs.length)||independent,'HRA female reference requires independent private preview');
const source43Registries=[];
for(const [args,flag,file,count] of [[source43Args,'--bp3d43-folder=','bp3d43-dual-source-audit-20261125.json',12],[gap43Args,'--bp3d43-gap-folder=','bp3d43-gap-batch-dual-source-audit-20261125.json',28],[nerve43Args,'--bp3d43-nerves-folder=','bp3d43-nerves32-dual-source-audit-20261125.json',32],[discs43Args,'--bp3d43-discs-folder=','bp3d43-discs-23-dual-source-audit-20261125.json',23],[costal43Args,'--bp3d43-costal-folder=','bp3d43-costal-20-dual-source-audit-20261125.json',20],[neck43Args,'--bp3d43-neck-cartilage-folder=','bp3d43-head-neck-cartilage-14-dual-source-audit-20261125.json',14],[visceral43Args,'--bp3d43-visceral-folder=','bp3d43-visceral-18-dual-source-audit-20261126.json',18],[cns43Args,'--bp3d43-cns-folder=','bp3d43-cns-30-dual-source-audit-20261126.json',30],[pelvic43Args,'--bp3d43-pelvic-folder=','bp3d43-pelvic-digestive-15-dual-source-audit-20261126.json',15],[cardio43Args,'--bp3d43-cardio-folder=','bp3d43-cardiopulmonary-32-dual-source-audit-20261126.json',32],[bronchial43Args,'--bp3d43-bronchial-folder=','bp3d43-bronchial-thymus-22-dual-source-audit-20261126.json',22]])if(args.length)source43Registries.push(load43Elements(privateRoot,args[0].slice(flag.length),JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication',file),'utf8')),count));
const suite=completeSuite?loadAuditedReferenceSuite(privateRoot,{includeHyoid,includeExpansion}):null;
const source43=hyoidArgs.length?load43Elements(privateRoot,hyoidArgs[0].slice('--bp3d43-hyoid-folder='.length),JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication','bp3d43-hyoid-2-dual-source-audit-20261126.json'),'utf8')),2):suite?suite.bp:source43Registries.length?combine43Registries(source43Registries):null;
const crossVersionOverlap=source43?auditCrossVersionOverlap(sourcePack.inventory.bodyModels,source43.inventory.items,JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication/dbcls-full-geometry-audit-20261125.json'),'utf8')).report.samples):null;
if(crossVersionOverlap){const f=path.join(privateRoot,folder,'publication-cross-version-overlap.json'),tmp=f+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(crossVersionOverlap,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(tmp,f);console.log('Private cross-version overlap:',JSON.stringify(crossVersionOverlap.counts));}
const broadRecovery=process.argv.includes('--broad-recovery');
const contextRecovery=process.argv.includes('--context-recovery');
assert(!contextRecovery||independent&&broadRecovery,'Context recovery requires explicit broad independent preview');
const priorityEnabled=broadRecovery||process.argv.includes('--priority-recovery');
const originalUI=process.argv.includes('--original-ui');
assert(!originalUI||independent,'Original shell only in explicit independent private comparison');
assert(!priorityEnabled||independent,'Priority recovery requires an independent source pack');
const elementCatalog=independent&&(originalUI||priorityEnabled)?createElementCatalog(sourcePack):null;
const priority=priorityEnabled?buildPriorityRecovery(privateRoot,sourcePack,{broad:broadRecovery,coveredFma:elementCatalog?.items.map(e=>e.fmaId)||[],rebuild:process.argv.includes('--rebuild-recovery')}):null;
const context=contextRecovery?planContextRecovery(sourcePack.inventory.bodyModels,priority.report.results,elementCatalog?.items.map(e=>e.fmaId)||[]):null;
const contextIds=new Set(context?.accepted.map(x=>x.id)||[]);
const recoveryItems=priority?.items.map(e=>({...e,contextCandidate:contextIds.has(e.id)}))||[];
const coverage=independent&&broadRecovery?learningCoverage({sources:loadVerifiedPublisherSources(sourcePack.folder),body:manifest.entries,selection:elementCatalog?.items||[],recovery:recoveryItems,results:priority?.report.results||[]}):null;
const coverageFile=coverage?path.join(privateRoot,folder,'publication-learning-coverage-'+process.pid+'-'+Date.now()+'.json'):null;
if(coverage)fs.writeFileSync(coverageFile,JSON.stringify(coverage,null,2)+'\n',{flag:'wx',mode:0o600});
const thumbnails=independent?createThumbnailService(buildThumbnailRecords(manifest.entries,elementCatalog?.items,recoveryItems,models,sourcePack.inventory.bodyModels,priority?.models||new Map())):null;
const req=createRequire(path.join(app,'package.json'));
const {build}=await import(pathToFileURL(req.resolve('vite')).href);
const out=fs.mkdtempSync(path.join(privateRoot,'atlas-independent-review-'));
const dependencyAudit=inspectInstalled(app),sourceNotices=checkSourceNotices(),bundleRecord={};
const noticeDir=path.join(root,'licensing/atlas-publication/source-notices');
const notices='MEDCOEL independent viewer — software notices\n\n'+['three','vite'].map(n=>fs.readFileSync(path.join(noticeDir,n+'.txt'),'utf8')).join('\n\n');
await build({root:app,configFile:false,publicDir:false,base:'/anatomy/viewer/',plugins:[publicationBundleGate(app,notices,bundleRecord)],build:{outDir:out,emptyOutDir:true,sourcemap:false}});
const originalShell=originalUI?attachOriginalShell(root,out):null;
const softwareReport=path.join(privateRoot,folder,'publication-software-audit.json');const reportTmp=softwareReport+'.'+process.pid+'.tmp';fs.writeFileSync(reportTmp,JSON.stringify({...dependencyAudit,sourceNotices,bundle:bundleRecord,originalShell},null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(reportTmp,softwareReport);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
let hra;try{hra=independent?sourcePack.hra:await buildHraRegistry(privateRoot);}catch(error){hra={assets:new Map(),blocked:[{reason:String(error.message||error)}]};}
if(hraFemaleArgs.length)hra=mergeHraFemaleReferences(hra,loadHraFemaleFive(privateRoot,hraFemaleArgs[0].slice('--hra-female-folder='.length),hraGroups));
if(hraCardioArgs.length)hra=mergeHraFemaleReferences(hra,loadHraBatch(privateRoot,hraCardioArgs[0].slice('--hra-cardio-folder='.length),'cardiopulmonary-four',hraGroups));
if(suite)hra=mergeHraFemaleReferences(hra,suite.hra);
const port=Number(process.env.PORT||4186);assert(Number.isInteger(port)&&port>=1024&&port<=65535);
// Independent review builds the actual main-web App with a preview-only Anatomy
// page alias. No public assets, stale host build, legacy Atlas or live backend.
let hostHandler=null,hostBuild=null;
if(independent){
 const web=path.join(root,'apps/web'),hostRequire=createRequire(path.join(web,'package.json'));
 const {build:buildHost}=await import(pathToFileURL(hostRequire.resolve('vite')).href);
 hostBuild=fs.mkdtempSync(path.join(privateRoot,'atlas-independent-host-'));fs.chmodSync(hostBuild,0o700);
 await buildHost({root:web,configFile:path.join(web,'vite.atlas-independent-preview.config.js'),publicDir:false,build:{outDir:hostBuild,emptyOutDir:true,sourcemap:false}});
 assertDistributionClean([hostBuild],'Independent Atlas host build');
 assert(fs.statSync(path.join(hostBuild,'index.html')).isFile(),'Host build missing');
 const assets=path.join(hostBuild,'assets');
 const js=fs.readdirSync(assets).filter(n=>n.endsWith('.js'));
 assert(js.some(n=>fs.readFileSync(path.join(assets,n),'utf8').includes('medcoel:independent-atlas-ping')),'Preview host alias missing');
 hostHandler=createIndependentHostHandler(hostBuild,true);
}else if(fs.existsSync(path.join(ROOTS.main,'index.html'))){
 try{assertDistributionClean([ROOTS.main],'Native atlas host preview');hostHandler=createLabPreviewServer(ROOTS).listeners('request')[0];}
 catch(error){console.warn('Host preview withheld:',error.message);}
}
const server=createServer((request,response)=>{
 const send=(status,body,type='text/plain; charset=utf-8')=>{response.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN'});response.end(request.method==='HEAD'?undefined:body);};
 if(request.headers.host!=='127.0.0.1:'+port||!['GET','HEAD'].includes(request.method))return send(403,'Loopback review only');
 const p=rawRequestPath(request.url);if(p===null)return send(404,'Not found');
 const route=classifyIndependentPath(p,independent);
 if(route==='redirect'){response.writeHead(308,{Location:'/anatomy/viewer/','Cache-Control':'no-store'});return response.end();}
 if(route==='host')return hostHandler?hostHandler(request,response,p):send(404,'Host preview unavailable; use /anatomy/viewer/');
 if(route!=='independent')return send(404,'Not found');
 response.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
 if(independent&&p==='/anatomy/viewer/MODEL-ATTRIBUTIONS.json')return send(200,JSON.stringify(sourcePack.attributions),mime['.json']);
 if(p==='/anatomy/viewer/inventory.json')return send(200,JSON.stringify(manifest),mime['.json']);
 if(p.startsWith('/anatomy/viewer/hra-reference/')&&serveHraReference(request,response,hra))return;
 if(p.startsWith('/anatomy/viewer/bp3d43-reference/')&&serve43Reference(request,response,source43))return;
 if(coverage&&p==='/anatomy/viewer/learning-coverage.json')return send(200,JSON.stringify(coverage),mime['.json']);
 if(elementCatalog&&p==='/anatomy/viewer/element-selection.json')return send(200,JSON.stringify(elementCatalog),mime['.json']);
 if(priority&&p==='/anatomy/viewer/priority-recovery/inventory.json')return send(200,JSON.stringify({schema:1,items:recoveryItems,contextMode:context?.mode||null,publicRelease:'NO_GO',registrationValidated:false,clinicalValidation:false}),mime['.json']);
 if(priority&&p==='/anatomy/viewer/priority-recovery/attributions.json')return send(200,JSON.stringify({publicRelease:'NO_GO',items:priority.report.results.filter(r=>r.status==='EXPORTED_ISOLATED_CONCEPT')}),mime['.json']);
 const thumb=p.match(/^\/anatomy\/viewer\/private-thumbnails\/((?:bp|sel)-[a-f0-9]{24})\.png$/);
 if(thumb&&thumbnails?.has(thumb[1])){
  if(request.method==='HEAD')return send(200,undefined,'image/png');
  thumbnails.get(thumb[1]).then(bytes=>{if(!response.destroyed)send(200,bytes,'image/png');}).catch(()=>{if(!response.destroyed)send(503,'Thumbnail unavailable');});return;
 }
 const supplemental=priority?.models.get(p);
 if(supplemental){
  try{assert(fs.realpathSync(supplemental.file)===supplemental.file);const info=fs.statSync(supplemental.file);assert(info.isFile()&&info.size===supplemental.bytes);
   response.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   if(request.method==='HEAD'){response.end();return;}
   const stream=fs.createReadStream(supplemental.file);stream.on('error',()=>response.destroy());response.on('close',()=>stream.destroy());stream.pipe(response);return;
  }catch{return send(404,'Priority model not available');}
 }
 const model=models.get(p);
 if(model){
  try{assert(fs.realpathSync(model)===model);const info=fs.statSync(model);assert(info.isFile());
  response.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(request.method==='HEAD'){response.end();return;}
  const stream=fs.createReadStream(model);stream.on('error',()=>response.destroy());response.on('close',()=>stream.destroy());stream.pipe(response);return;
  }catch{return send(404,'Model not available');}
 }
 if(p!=='/anatomy/viewer/'&&p!=='/anatomy/viewer/THIRD-PARTY-NOTICES.txt'&&!/^\/anatomy\/viewer\/assets\/[a-zA-Z0-9_.-]+\.(js|css)$/.test(p))return send(404,'Not found');
 const file=path.join(out,p==='/anatomy/viewer/'?'index.html':p.slice('/anatomy/viewer/'.length));
 try{assert(fs.realpathSync(file)===file&&fs.statSync(file).isFile());return send(200,fs.readFileSync(file),mime[path.extname(file)]);}
 catch{return send(404,'Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
const baseURL='http://127.0.0.1:'+port;
try{
 const inventoryResponse=await fetch(baseURL+'/anatomy/viewer/inventory.json');assert(inventoryResponse.ok);
 assert.equal((await inventoryResponse.json()).entries.length,manifest.entries.length);
 const queue=[...models.keys()];let checked=0;
 await Promise.all(Array.from({length:4},async()=>{while(queue.length){const route=queue.shift(),response=await fetch(baseURL+route,{method:'HEAD'});assert(response.ok&&response.headers.get('content-type')==='model/gltf-binary','Model route failed: '+route);checked++;}}));
 for(const route of ['/anatomy/viewer/models/nervous.glb','/anatomy/viewer/models/visceral.glb','/anatomy/viewer/bp3d/inventory.json','/anatomy/4d-lab/','/local-data/','/anatomy/viewer/%2e%2e/private'])assert.equal((await fetch(baseURL+route,{method:'HEAD'})).status,404);
 const hraResponse=await fetch(baseURL+'/anatomy/viewer/hra-reference/inventory.json');assert(hraResponse.ok&& (await hraResponse.json()).items.length===hra.assets.size);
 let source43Routes=0;if(source43){const rr=await fetch(baseURL+'/anatomy/viewer/bp3d43-reference/inventory.json');assert(rr.ok&&(await rr.json()).items.length===source43.assets.size);for(const [id,a] of source43.assets){const u=baseURL+'/anatomy/viewer/bp3d43-reference/'+id+'.glb';const r=await fetch(u);assert(r.ok&&r.headers.get('content-type')==='model/gltf-binary'&&Buffer.from(await r.arrayBuffer()).length===a.bytes);source43Routes++;}assert.equal((await fetch(baseURL+'/anatomy/viewer/bp3d43-reference/unknown.glb')).status,404);}
  let hraRoutes=0;for(const id of hra.assets.keys()){const r=await fetch(baseURL+'/anatomy/viewer/hra-reference/'+id+'.glb',{method:'HEAD'});assert(r.ok&&r.headers.get('content-type')==='model/gltf-binary','HRA route failed: '+id);hraRoutes++;}
 let hostQC='NOT_APPLICABLE';
 if(independent){
  for(const p of ['/anatomy','/anatomy/explore','/anatomy/library','/anatomy/system/nervous',...(manifest.entries.length?['/anatomy/structure/'+manifest.entries[0].id]:[])]){const r=await fetch(baseURL+p);assert(r.ok&&r.headers.get('content-type').startsWith('text/html'),'Host route failed: '+p);}
  const fixture=await fetch(baseURL+'/api/medcoel/public-settings');assert(fixture.ok&&(await fixture.json()).showMascots===false);
  for(const p of ['/anatomy/structure/Humerus.r','/anatomy/system/unknown','/anatomy/study','/anatomy/live','/anatomy/viewer/data/atlas-catalog.json','/api/collections/users/records','/assets/not-a-real-asset.js'])assert.equal((await fetch(baseURL+p)).status,404,'Unexpected route '+p);
  const a=await fetch(baseURL+'/anatomy/viewer/MODEL-ATTRIBUTIONS.json');assert(a.ok&&Array.isArray((await a.json()).body));hostQC='PASS';
 }
 if(originalUI){const h=await fetch(baseURL+'/anatomy/viewer/');assert(h.ok&&(await h.text()).includes('originalShellTemplate'));const s=await fetch(baseURL+'/anatomy/viewer/assets/original-shell-private.css');assert(s.ok&&(await s.text()).includes('.atlas-systembar'));}
 if(elementCatalog){const r=await fetch(baseURL+'/anatomy/viewer/element-selection.json');assert(r.ok&& (await r.json()).items.length===elementCatalog.items.length);}
 let thumbnailQC='NOT_APPLICABLE';
 if(thumbnails&&manifest.entries.length){const url=baseURL+'/anatomy/viewer/private-thumbnails/'+manifest.entries[0].id+'.png';const r=await fetch(url);assert(r.ok&&r.headers.get('content-type')==='image/png');assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal((await fetch(baseURL+'/anatomy/viewer/private-thumbnails/legacy.png')).status,404);thumbnailQC='PASS_SAMPLE';}
 if(coverage){const r=await fetch(baseURL+'/anatomy/viewer/learning-coverage.json');assert(r.ok);const d=await r.json();assert.equal(d.targets,coverage.targets);assert.equal(d.publicRelease,'NO_GO');assert.equal(Object.keys(d.systems).length,13);}
 let priorityRoutes=0;
 if(priority){
  const r=await fetch(baseURL+'/anatomy/viewer/priority-recovery/inventory.json');assert(r.ok&& (await r.json()).items.length===priority.items.length);
  for(const [route,asset] of priority.models){const p=await fetch(baseURL+route,{method:'HEAD'});assert(p.ok&&p.headers.get('content-type')==='model/gltf-binary'&&Number(p.headers.get('content-length'))===asset.bytes);priorityRoutes++;}
  const a=await fetch(baseURL+'/anatomy/viewer/priority-recovery/attributions.json');assert(a.ok&&(await a.json()).items.length===priority.items.length);
  assert.equal((await fetch(baseURL+'/anatomy/viewer/priority-recovery/not-approved.glb')).status,404);
 }
 const report={schema:1,crossVersionOverlap:crossVersionOverlap?{bodyModels:crossVersionOverlap.bodyModels,referenceElements:crossVersionOverlap.referenceElements,counts:crossVersionOverlap.counts,rawDigestOccurrences:crossVersionOverlap.rawDigestOccurrences,sourceElementOccurrences:crossVersionOverlap.sourceElementOccurrences}:null,recoveryReused:priority?.reused??null,recoveryFolder:priority?.folder??null,learningCoverage:coverage?{targets:coverage.targets,systems:Object.fromEntries(Object.entries(coverage.systems).map(([g,s])=>[g,{targets:s.targets,counts:s.counts}])),file:coverageFile}:null,thumbnailQC,elementSelectionConcepts:elementCatalog?.items.length||0,contextCandidateModels:contextIds.size,contextHeld:context?.held.length||0,originalUI:originalShell?.mode||'INDEPENDENT_PROTOTYPE',priorityModels:priority?.items.length||0,httpPriorityRoutesVerified:priorityRoutes,hostQC,sourceKind:independent?'independent-bp3d':'z-anatomy-private',models:manifest.entries.length,httpModelRoutesVerified:checked,hraReferences:hra.assets.size,httpHraRoutesVerified:hraRoutes,bp3d43ReferenceElements:source43?.assets.size||0,http43RoutesVerified:source43Routes,httpSmoke:'PASS',browserRuntime:'PENDING',publicRelease:'NO_GO'};
 const f=path.join(privateRoot,folder,'publication-independent-http-qc.json'),tmp=f+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(tmp,f);
 console.log('INDEPENDENT HTTP QC',JSON.stringify(report));
}catch(error){server.close();throw error;}
if(process.argv.includes('--http-only')){server.close();console.log('HTTP QC only: viewer stopped; no browser opened.');}else console.log('INDEPENDENT PRIVATE ATLAS:', baseURL+'/anatomy/viewer/');
console.log('HOST INTEGRATION:',hostHandler?'http://127.0.0.1:'+port+'/anatomy/explore':'not available (standalone preview remains available)');
console.log('CANDIDATE MODELS:',review.totals.candidates,'APPROVED:',review.totals.approved,'PUBLIC RELEASE: NO_GO');
