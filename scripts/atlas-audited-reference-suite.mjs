// One explicit private suite selection; no downloads, public assets or inferred geometry.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {select43Acquisition,load43Elements,combine43Registries} from './load-bp3d43-private-elements.mjs';
import {loadHraBatch,mergeHraFemaleReferences} from './load-hra-female-five.mjs';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
export const BP43_SUITE=Object.freeze([
 ['--bp3d43-folder=','bp3d43-dual-source-audit-20261125.json',12],
 ['--bp3d43-gap-folder=','bp3d43-gap-batch-dual-source-audit-20261125.json',28],
 ['--bp3d43-nerves-folder=','bp3d43-nerves32-dual-source-audit-20261125.json',32],
 ['--bp3d43-discs-folder=','bp3d43-discs-23-dual-source-audit-20261125.json',23],
 ['--bp3d43-costal-folder=','bp3d43-costal-20-dual-source-audit-20261125.json',20],
 ['--bp3d43-neck-cartilage-folder=','bp3d43-head-neck-cartilage-14-dual-source-audit-20261125.json',14],
 ['--bp3d43-visceral-folder=','bp3d43-visceral-18-dual-source-audit-20261126.json',18],
 ['--bp3d43-cns-folder=','bp3d43-cns-30-dual-source-audit-20261126.json',30],
 ['--bp3d43-pelvic-folder=','bp3d43-pelvic-digestive-15-dual-source-audit-20261126.json',15],
 ['--bp3d43-cardio-folder=','bp3d43-cardiopulmonary-32-dual-source-audit-20261126.json',32],
 ['--bp3d43-bronchial-folder=','bp3d43-bronchial-thymus-22-dual-source-audit-20261126.json',22]
].map(Object.freeze));
export const HRA_SUITE=Object.freeze([['--hra-female-folder=','female-five',5],['--hra-cardio-folder=','cardiopulmonary-four',4]].map(Object.freeze));
export function planExactSuite(reports,batches,hraCandidates){
 const used=new Set(),bp=batches.map(({flag,evidence,count})=>{
  assert.equal(evidence.matches.length,count);const folder=select43Acquisition(reports,evidence);
  assert(!used.has(folder),'Repeated acquisition');used.add(folder);return {flag,folder,count};
 });
 const hra=HRA_SUITE.map(([flag,batch,count])=>{
  const a=hraCandidates.filter(x=>x.batch===batch&&x.count===count&&x.validated===true);
  assert.equal(a.length,1,'Expected exactly one verified HRA '+batch+' folder');assert(!used.has(a[0].folder));used.add(a[0].folder);return {flag,folder:a[0].folder,count,batch};
 });
 return {bp,hra,args:[...bp,...hra].map(x=>x.flag+x.folder).concat('--hra-source-groups')};
}
export function loadAuditedReferenceSuite(q){
 assert(fs.realpathSync(q)===q&&path.basename(q)==='licensing-quarantine','Explicit private root');
 const names=fs.readdirSync(q);assert(names.length<=10000,'Too many candidate folders');
 const reports=[],hraCandidates=[];
 for(const folder of names){
  if(!/^bp3d43-element-intake-[A-Za-z0-9_-]+$/.test(folder))continue;
  const base=path.join(q,folder),file=path.join(base,'report.json');
  if(!fs.existsSync(file))continue;
  try{assert(fs.realpathSync(base)===base&&fs.realpathSync(file)===file&&fs.statSync(file).isFile()&&fs.statSync(file).size<=1024*1024);reports.push({folder,report:JSON.parse(fs.readFileSync(file,'utf8'))});}catch{continue;}
 }
 const batches=BP43_SUITE.map(([flag,file,count])=>({flag,evidence:JSON.parse(fs.readFileSync(new URL(dir+file,root),'utf8')),count}));
 const hraRegistries=new Map();
 for(const [,batch,count] of HRA_SUITE)for(const folder of names){
  if(!folder.startsWith('hra-'+batch+'-'))continue;
  try{const registry=loadHraBatch(q,folder,batch,true);assert.equal(registry.assets.size,count);hraCandidates.push({folder,batch,count,validated:true});hraRegistries.set(folder,registry);}catch{continue;}
 }
 const plan=planExactSuite(reports,batches,hraCandidates);
 const bp=combine43Registries(plan.bp.map((p,i)=>load43Elements(q,p.folder,batches[i].evidence,p.count)));
 const hra=plan.hra.reduce((a,p)=>mergeHraFemaleReferences(a,hraRegistries.get(p.folder)),{assets:new Map(),blocked:[]});
 assert.equal(bp.assets.size,246);assert.equal(hra.assets.size,9);
 assert.equal([...hra.assets.values()].reduce((n,a)=>n+a.public.sourceCrosswalk.length,0),160);
 assert.equal([...hra.assets.values()].reduce((n,a)=>n+a.public.sourceGroups.length,0),37);
 return {plan,bp,hra,publicRelease:'NO_GO',registrationValidated:false};
}
