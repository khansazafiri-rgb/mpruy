// One explicit private suite selection; no downloads, public assets or inferred geometry.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {select43Acquisition,load43Elements,combine43Registries} from './load-bp3d43-private-elements.mjs';
import {loadHraBatch,mergeHraFemaleReferences} from './load-hra-female-five.mjs';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
import {BP43_SUITE,HRA_SUITE,BP43_HYOID,BP43_EXPANSION,BP43_MUSCLE,BP43_COMPONENTS,HRA_EXPANSION} from './atlas-reference-suite-spec.mjs';
export {BP43_SUITE,HRA_SUITE};
export function planExactSuite(reports,batches,hraCandidates,hraDescriptors=HRA_SUITE){
 const used=new Set(),bp=batches.map(({flag,evidence,count})=>{
  assert.equal(evidence.matches.length,count);const folder=select43Acquisition(reports,evidence);
  assert(!used.has(folder),'Repeated acquisition');used.add(folder);return {flag,folder,count};
 });
 const hra=hraDescriptors.map(([flag,batch,count])=>{
  const a=hraCandidates.filter(x=>x.batch===batch&&x.count===count&&x.validated===true);
  assert.equal(a.length,1,'Expected exactly one verified HRA '+batch+' folder');assert(!used.has(a[0].folder));used.add(a[0].folder);return {flag,folder:a[0].folder,count,batch};
 });
 return {bp,hra,args:[...bp,...hra].map(x=>x.flag+x.folder).concat('--hra-source-groups')};
}
export function loadAuditedReferenceSuite(q,{includeHyoid=false,includeExpansion=false,includeAuditedExpansion=false}={}){
 assert(fs.realpathSync(q)===q&&path.basename(q)==='licensing-quarantine','Explicit private root');
 const names=fs.readdirSync(q);assert(names.length<=10000,'Too many candidate folders');
 const reports=[],hraCandidates=[];
 for(const folder of names){
  if(!/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(folder))continue;
  const base=path.join(q,folder),file=path.join(base,'report.json');
  if(!fs.existsSync(file))continue;
  try{assert(fs.realpathSync(base)===base&&fs.realpathSync(file)===file&&fs.statSync(file).isFile()&&fs.statSync(file).size<=1024*1024);reports.push({folder,report:JSON.parse(fs.readFileSync(file,'utf8'))});}catch{continue;}
 }
 assert(!includeExpansion||includeHyoid,'Expansion requires the hyoid-extended baseline');assert(!includeAuditedExpansion||includeExpansion,'Audited expansion requires the complete 376 baseline');
 const batches=(includeExpansion?[...BP43_SUITE,BP43_HYOID,...BP43_EXPANSION,...(includeAuditedExpansion?[BP43_MUSCLE,BP43_COMPONENTS]:[])]:includeHyoid?[...BP43_SUITE,BP43_HYOID]:BP43_SUITE).map(([flag,file,count])=>({flag,evidence:JSON.parse(fs.readFileSync(new URL(dir+file,root),'utf8')),count}));
 const hraRegistries=new Map(),hraDescriptors=includeAuditedExpansion?[...HRA_SUITE,...HRA_EXPANSION]:HRA_SUITE;
 for(const [,batch,count] of hraDescriptors)for(const folder of names){
  if(!folder.startsWith('hra-'+batch+'-'))continue;
  try{const registry=loadHraBatch(q,folder,batch,true);assert.equal(registry.assets.size,count);hraCandidates.push({folder,batch,count,validated:true});hraRegistries.set(folder,registry);}catch{continue;}
 }
 const plan=planExactSuite(reports,batches,hraCandidates,hraDescriptors);
 const registries=plan.bp.map((p,i)=>load43Elements(q,p.folder,batches[i].evidence,p.count));
 const baseline=combine43Registries(registries.slice(0,11));
 const extended=includeHyoid?combine43Registries([baseline,registries[11]]):baseline;
 let bp=includeExpansion?combine43Registries([extended,combine43Registries(registries.slice(12,17))]):extended;
 if(includeAuditedExpansion)bp=combine43Registries([bp,registries[17],registries[18]]);
 if(includeExpansion){bp.inventory.expansionProfile=includeAuditedExpansion?'BP43_436_20261127':'BP43_128_20261126';plan.args=['--audited-reference-suite','--include-hyoid','--include-expansion',...(includeAuditedExpansion?['--include-audited-expansion']:[])];}else if(includeHyoid)plan.args=['--audited-reference-suite','--include-hyoid'];
 const hra=plan.hra.reduce((a,p)=>mergeHraFemaleReferences(a,hraRegistries.get(p.folder)),{assets:new Map(),blocked:[]});
 assert.equal(bp.assets.size,includeAuditedExpansion?436:includeExpansion?376:includeHyoid?248:246);assert.equal(hra.assets.size,includeAuditedExpansion?24:9);
 assert.equal([...hra.assets.values()].reduce((n,a)=>n+a.public.sourceCrosswalk.length,0),includeAuditedExpansion?606:160);
 assert.equal([...hra.assets.values()].reduce((n,a)=>n+a.public.sourceGroups.length,0),includeAuditedExpansion?87:37);
 return {plan,bp,hra,includeAuditedExpansion,publicRelease:'NO_GO',registrationValidated:false};
}

// An explicit suite is exactly the 9 HRA objects which were tested. Never append
// previously staged organs with different versions/labels to this audited scope.
export function exactSuiteHra(existing,suite){assert(suite?.publicRelease==='NO_GO'&&suite.hra?.assets instanceof Map&&suite.hra.assets.size===(suite.includeAuditedExpansion===true?24:9)&&suite.hra.blocked.length===0,'Invalid audited HRA scope');for(const [id,asset] of suite.hra.assets){const previous=existing?.assets?.get(id);if(previous)assert(previous.sha256===asset.sha256,'Conflicting HRA version bytes');assert(asset.public.approvedForDistribution===false&&asset.public.registrationValidated===false);}return suite.hra;}
