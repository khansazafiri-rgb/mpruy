// Read-only reconciliation of the running private workstation, never promotes geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {groups,validateInventory} from '../apps/atlas-independent/src/inventory.js';
const key=s=>String(s).trim().toLowerCase().replace(/\s+/g,' ');
export const format=s=>key(s).replace(/^(.*)\.([lr])$/,(_,n,x)=>(x==='l'?'left ':'right ')+n);
const crossGroup={'FMA55099':['respiratory','skeletal'],'FMA9615':['respiratory','skeletal'],'FMA55109':['respiratory','skeletal'],'FMA4706':['heart','venous']};
// Explicit synonym candidates only, pinned to already resolved publisher FMA.
// These are not automatic label/identity changes or proof of full anatomy.
const lungAliases={'apical segment of right lung':'FMA7338','posterior segment of right lung':'FMA7339','anterior segment of right lung':'FMA7359','lateral segment of right lung':'FMA7361','medial segment of right lung':'FMA7360','superior segment of right lower lobe':'FMA7366','apical posterior segment of left lung':'FMA7372','anterior segment of left lung':'FMA7373','superior lingular segment':'FMA7374','inferior lingular segment':'FMA7375'};
const available=new Set(['BODY_MODEL','EXACT_ELEMENT_SELECTION','ISOLATED_REFERENCE','NATIVE_CONTEXT_CANDIDATE']);
export function reconcile(coverage,body,selection,recovery,refs){
 assert(coverage.publicRelease==='NO_GO'&&coverage.clinicalValidation===false&&coverage.registrationValidated===false&&coverage.targets===coverage.rows.length);
 const records=[...body.map(e=>({...e,kind:'BODY_MODEL'})),...selection.map(e=>({...e,kind:'EXACT_ELEMENT_SELECTION'})),...recovery.map(e=>({...e,kind:'ISOLATED_REFERENCE'})),...refs.map(e=>({...e,kind:'BP43_SINGLE_SOURCE_ELEMENT'}))];
 assert(records.every(e=>e.approvedForDistribution===false&&/^FMA\d+$/.test(e.fmaId)&&typeof e.name==='string'));
 const summarize=e=>({id:e.id,name:e.name,fmaId:e.fmaId,group:e.group||null,kind:e.kind,...(e.fj?{fj:e.fj}:{})});
 const rows=coverage.rows.filter(r=>!available.has(r.status)).map(r=>{
  const t=format(r.target),same=records.filter(e=>format(e.name)===t),local=same.filter(e=>e.kind!=='BP43_SINGLE_SOURCE_ELEMENT'&&e.group===r.group),bp43=same.filter(e=>e.kind==='BP43_SINGLE_SOURCE_ELEMENT');
  const link=crossGroup[r.fmaId],cross=link&&link[0]===r.group?records.filter(e=>e.fmaId===r.fmaId&&e.group===link[1]&&e.kind!=='BP43_SINGLE_SOURCE_ELEMENT'):[];
  const aliasFma=r.group==='respiratory'?lungAliases[t]:null,aliases=aliasFma?records.filter(e=>e.fmaId===aliasFma&&e.group===r.group&&e.kind!=='BP43_SINGLE_SOURCE_ELEMENT'):[];
  // Laterality and trunk/component distinctions must NEVER be erased in identity matching.
  // Related source elements are only displayed as partial evidence.
  const related=r.group==='nervous'?refs.filter(e=>{const n=format(e.name);return ['left '+t,'right '+t,'trunk of '+t,'trunk of left '+t,'trunk of right '+t].includes(n)||(['left brachial plexus','right brachial plexus','brachial plexus'].includes(t)&&n.includes('brachial nerve plexus')&&(!t.startsWith('left ')||n.includes('left '))&&(!t.startsWith('right ')||n.includes('right ')));}):[];
  const status=cross.length?'EXACT_FMA_CROSS_SYSTEM_LINK':local.length&&new Set(local.map(e=>e.fmaId)).size===1?'LOCAL_FORMAT_MATCH_REVIEW':aliases.length?'PINNED_SYNONYM_REVIEW':bp43.length?'BP43_EXACT_LABEL_ELEMENT_REVIEW':related.length?'RELATED_COMPONENT_ONLY':same.length?'OTHER_GROUP_OR_AMBIGUOUS_REVIEW':'NO_MATCH_IN_CURRENT_INVENTORIES';
  return {group:r.group,target:r.target,previousStatus:r.status,status,local:local.map(summarize),crossSystem:cross.map(summarize),synonyms:aliases.map(summarize),bp43:bp43.map(summarize),related:related.map(summarize),otherExact:same.filter(e=>!local.includes(e)&&!bp43.includes(e)).map(summarize)};
 });
 const counts={},systems=Object.fromEntries(Object.keys(groups).map(g=>[g,{}]));
 for(const r of rows){counts[r.status]=(counts[r.status]||0)+1;systems[r.group][r.status]=(systems[r.group][r.status]||0)+1;}
 return {schema:1,scope:'Candidate evidence only. Exact labels do not imply complete geometry. No geometry, coverage, or release status promoted.',baselineTargets:coverage.targets,baselineAvailable:coverage.rows.length-rows.length,unresolved:rows.length,inventoryCounts:{body:body.length,selection:selection.length,recovery:recovery.length,bp43:refs.length},counts,systems,rows,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
}
async function run(){
 const [url,...rest]=process.argv.slice(2);assert(!rest.length&&/^http:\/\/127\.0\.0\.1:\d{4,5}\/$/.test(url||''),'Explicit loopback URL required');
 const base=new URL('anatomy/viewer/',url),read=async rel=>{const r=await fetch(new URL(rel,base),{redirect:'error'});assert(r.ok,'Missing '+rel);const d=await r.json();assert(d.publicRelease==='NO_GO','Private inventory required');return d;};
 const [cov,b,s,p,r]=await Promise.all(['learning-coverage.json','inventory.json','element-selection.json','priority-recovery/inventory.json','bp3d43-reference/inventory.json'].map(read));
 const body=validateInventory(b,'127.0.0.1');assert(b.sourceKind==='independent-bp3d'&&body.length===1016&&s.items.length===906&&p.items.length===185&&r.items.length===376&&cov.targets===464,'Expected audited workstation baseline; do not silently compare a different build');
 assert(r.registrationValidated===false&&r.clinicalValidation===false&&r.items.every(e=>e.scope==='SINGLE_SOURCE_ELEMENT'));
 const report=reconcile(cov,body,s.items,p.items,r.items);
 const q=fs.realpathSync(fileURLToPath(new URL('../local-data/licensing-quarantine/',import.meta.url)));assert(path.basename(q)==='licensing-quarantine');
 const out=fs.mkdtempSync(path.join(q,'atlas-gap-reconciliation-'));fs.chmodSync(out,0o700);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('ATLAS GAP RECONCILIATION '+JSON.stringify({...report,rows:undefined,folder:path.basename(out)}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await run();
