// Catalogue coverage is a label/geometry inventory, not proof of vascular continuity.
import fs from 'node:fs';
import path from 'node:path';
export function exactLabel(name){
 let n=String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
 const side=n.match(/\.(l|r)$/);
 if(side)n=(side[1]==='l'?'left ':'right ')+n.slice(0,-2);
 return n;
}
const bilateral=labels=>labels.flatMap(n=>['left '+n,'right '+n]);
export const critical=Object.freeze({
 headNeck:bilateral(['common carotid artery','internal carotid artery','external carotid artery','superior thyroid artery','ascending pharyngeal artery','lingual artery','facial artery','occipital artery','posterior auricular artery','maxillary artery','superficial temporal artery','vertebral artery','internal jugular vein','external jugular vein','anterior jugular vein','ophthalmic artery','middle cerebral artery','anterior cerebral artery','posterior cerebral artery']).concat(['basilar artery','anterior communicating artery']),
 thorax:['aorta','arch of aorta','brachiocephalic trunk','superior vena cava','inferior vena cava','pulmonary trunk','right coronary artery','left coronary artery','coronary sinus','azygos vein','hemiazygos vein','thoracic duct',...bilateral(['brachiocephalic vein','subclavian artery','subclavian vein','pulmonary artery','superior pulmonary vein','inferior pulmonary vein'])],
 abdomen:['abdominal aorta','celiac trunk','superior mesenteric artery','inferior mesenteric artery','splenic artery','hepatic artery proper','portal vein','splenic vein','superior mesenteric vein','inferior mesenteric vein',...bilateral(['renal artery','renal vein','gonadal artery','gonadal vein'])],
 pelvis:bilateral(['common iliac artery','internal iliac artery','external iliac artery','common iliac vein','internal iliac vein','external iliac vein']),
 upperLimb:bilateral(['axillary artery','brachial artery','radial artery','ulnar artery','axillary vein','brachial vein','radial vein','ulnar vein','cephalic vein','basilic vein']),
 lowerLimb:bilateral(['femoral artery','deep femoral artery','popliteal artery','anterior tibial artery','posterior tibial artery','fibular artery','dorsalis pedis artery','femoral vein','popliteal vein','great saphenous vein','small saphenous vein'])
});
const multimap=(rows,key)=>{
 const m=new Map();
 for(const r of rows){const k=key(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r);}
 return m;
};
function knownHeadNeck(n){
 return /\b(carotid|jugular|vertebral artery|vertebral vein|basilar artery|ophthalmic artery|cerebral artery|cerebellar artery|communicating artery|superior thyroid artery|ascending pharyngeal artery|lingual artery|facial artery|occipital artery|posterior auricular artery|superficial temporal artery|maxillary artery)\b/.test(n);
}
export function vascularMetadata(e,catalog){
 if(e.system!=='cardiovascular'&&e.system!=='lymphatic')return e;
 const meta=e.privateAtlasMeta||{},n=exactLabel(e.name);
 const matches=Object.entries(catalog).filter(([name,m])=>m.source===e.system&&exactLabel(name)===n);
 const regions=new Set((meta.regions||[]).filter(x=>x!=='whole'));
 if(matches.length===1)for(const x of matches[0][1].regions||[])if(x!=='whole')regions.add(x);
 if(knownHeadNeck(n))regions.add('headNeck');
 if(/\b(common carotid|internal jugular|external jugular|anterior jugular|vertebral artery|vertebral vein)\b/.test(n))regions.add('thorax');
 if(/\b(brachiocephalic|subclavian)\b/.test(n)){regions.add('thorax');regions.add('headNeck');}
 if(/\b(coronary|cardiac|pulmonary|ventricular|atrium)\b/.test(n))regions.add('thorax');
 if(/\b(renal artery|renal vein|hepatic|portal vein|mesenteric|splenic artery|splenic vein|celiac|coeliac)\b/.test(n))regions.add('abdomen');
 return {...e,privateAtlasMeta:{...meta,source:e.system,group:e.group,layer:meta.layer??0,regions:regions.size?[...regions]:['whole']}};
}
export function vascularCoverage({catalog,converted,bundles}){
 const entries=converted.filter(e=>['cardiovascular','lymphatic'].includes(e.system));
 const mounted=multimap(entries,e=>exactLabel(e.name));
 const concepts=bundles.flatMap(b=>b.concepts||[]).filter(c=>['cardiovascular','lymphatic'].includes(c.system));
 const byLabel=multimap(concepts,c=>exactLabel(c.name));
 const geometry=new Map();
 for(const b of bundles)for(const g of b.geometry||[])geometry.set(g.id,g);
 const byFma=multimap(entries,e=>e.fmaId);
 function inspect(name,system){
  const n=exactLabel(name),match=(mounted.get(n)||[]).filter(e=>!system||e.system===system);
  const source=(byLabel.get(n)||[]).filter(c=>!system||c.system===system);
  const fmas=new Set(source.map(c=>c.fmaId));
  const identityMatches=fmas.size===1?(byFma.get([...fmas][0])||[]).filter(e=>!system||e.system===system):[];
  const exact=match.length===1?match[0]:null,identity=identityMatches.length===1?identityMatches[0]:null;
  let status='NO_EXACT_PUBLISHER_LABEL_IN_AUDITED_BUNDLES';
  if(match.length>1||fmas.size>1)status='AMBIGUOUS_IDENTITY_REVIEW';
  else if(exact||identity)status='MATERIALIZED_CANDIDATE';
  else if(source.some(c=>c.geometryStatus==='COMPLETE'&&c.geometryRefs?.length&&c.geometryRefs.every(id=>{
   const g=geometry.get(id);return g?.geometryStatus==='COMPLETE'&&g.publisherElementConceptId===c.fmaId&&g.publisherElementRepresentationId===c.bpId;
  })))status='DIRECT_GEOMETRY_NOT_MATERIALIZED';
  else if(source.some(c=>c.geometryStatus==='COMPLETE'))status='SHARED_OR_COMPOUND_REFERENCE_ONLY';
  else if(source.length)status='SOURCE_GEOMETRY_BLOCKED';
  return {name,system:system||null,status,materializedId:(exact||identity)?.id||null,
   sourceRepresentations:source.map(c=>({id:c.id,fmaId:c.fmaId,tree:c.sourceTree,geometryStatus:c.geometryStatus,elements:c.geometryRefs?.length||0}))};
 }
 const catalogue=Object.entries(catalog).filter(([,m])=>['cardiovascular','lymphatic'].includes(m.source)).map(([name,m])=>({...inspect(name,m.source),regions:m.regions||[],group:m.group}));
 const priorities=Object.fromEntries(Object.entries(critical).map(([region,names])=>[region,names.map(name=>inspect(name,name==='thoracic duct'?'lymphatic':'cardiovascular'))]));
 const summary={};
 for(const r of catalogue){summary[r.system]??={};summary[r.system][r.status]=(summary[r.system][r.status]||0)+1;}
 return {scope:'All original cardiovascular and lymphatic catalogue rows plus explicit bilateral regional checklist. Exact labels only; unresolved synonyms are not missing geometry proof.',
  materializedModels:entries.length,summary,catalogue,priorities,
  continuityValidated:false,anatomicalCompletenessValidated:false,geometryAnatomyValidated:false,publicRelease:'NO_GO'};
}
export function writeVascularCoverage(out,input){
 const report=vascularCoverage(input);
 fs.writeFileSync(path.join(out,'vascular-coverage.json'),JSON.stringify(report,null,2)+'\n');
 const rows=Object.entries(report.priorities).flatMap(([region,rr])=>rr.map(r=>[region,r.name,r.status,r.materializedId||'']));
 const esc=x=>String(x).replace(/[\t\r\n]/g,' ');
 fs.writeFileSync(path.join(out,'vascular-priority.tsv'),'region\tstructure\tstatus\tmodel_id\n'+rows.map(r=>r.map(esc).join('\t')).join('\n')+'\n');
 console.log('VASCULAR COVERAGE',JSON.stringify(report.summary));
 console.log('HEAD AND NECK',JSON.stringify(report.priorities.headNeck.map(r=>({name:r.name,status:r.status}))));
 return report;
}
