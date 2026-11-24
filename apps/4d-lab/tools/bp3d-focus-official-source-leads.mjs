// PRIVATE source reconnaissance. No conversion, mapping approval, or distribution.
import path from 'node:path';
import {reviewTokens} from './bp3d-mapping-review.mjs';
import {semanticSourceFlags} from './bp3d-all-systems-triage.mjs';
import {canonicalSourceSide} from './bp3d-provisional-mappings.mjs';
const STOP=new Set(['the','of','and','left','right','bone','muscle','vein','artery','nerve',
  'part','branch','body','segment','organ','gland','tissue','lobe','process']);
const tokens=x=>new Set(reviewTokens(x).filter(t=>t.length>1&&!STOP.has(t)));
const id=x=>x.fmaId+'|'+x.bpId;
const csv=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const location=x=>{const t=tokens(x);return t.has('hand')?'hand':t.has('foot')?'foot':null;};
const level=x=>{const v=String(x).toLowerCase().match(/\b(?:vertebra\s+)?([ctl])\s*(1[0-2]|[1-9])\b/);return v?v[1]+Number(v[2]):null;};
export function sourceLeadWarnings(atlasName,officialName){
 const warnings=semanticSourceFlags(atlasName,officialName);
 const a=canonicalSourceSide(atlasName),b=canonicalSourceSide(officialName);
 if(a==='AMBIGUOUS'||b==='AMBIGUOUS')warnings.push('AMBIGUOUS_LATERALITY');
 else if(a&&b&&a!==b)warnings.push('OPPOSITE_SIDE');
 else if(a&&!b)warnings.push('SOURCE_SIDE_NOT_SPECIFIED');
 const la=location(atlasName),lb=location(officialName);
 if(la&&lb&&la!==lb)warnings.push('HAND_VS_FOOT');
 else if(la&&!lb)warnings.push('HAND_FOOT_NOT_SPECIFIED');
 const va=level(atlasName),vb=level(officialName);
 if(va&&vb&&va!==vb)warnings.push('DIFFERENT_VERTEBRAL_LEVEL');
 else if(va&&!vb)warnings.push('VERTEBRAL_LEVEL_NOT_SPECIFIED');
 return [...new Set(warnings)];
}
export function discoverFocusSources({focus,officialRows,elements,archiveFiles,converted=[],archiveSha256=''}){
 if(focus?.reviewOnly!==true||!Array.isArray(focus.rows)||!Array.isArray(officialRows)||
   !(elements instanceof Map)||!Array.isArray(archiveFiles))throw Error('Original private audit/source tables required');
 const archive=new Set(archiveFiles.filter(x=>/\.obj$/i.test(x))
   .map(x=>path.basename(x).replace(/\.obj$/i,'').toUpperCase()));
 const used=new Set(converted.map(id));
 const publisher=officialRows.map(x=>({...x,terms:tokens(x.name)})),idx=new Map();
 publisher.forEach((r,i)=>{for(const t of r.terms){if(!idx.has(t))idx.set(t,[]);idx.get(t).push(i);}});
 const structures=focus.rows.filter(x=>x.status!=='converted').map(row=>{
   const set=tokens(row.atlasName),pool=new Set();
   for(const t of set)for(const i of idx.get(t)||[])pool.add(i);
   const candidates=[];
   for(const i of pool){
     const src=publisher[i];
     const overlap=[...set].filter(t=>src.terms.has(t)).length;
     const union=new Set([...set,...src.terms]).size;
     if(!overlap)continue;
     const score=+(overlap/union).toFixed(4);
     const ids=[...(elements.get(src.fmaId)||[])].sort(),missing=ids.filter(x=>!archive.has(x.toUpperCase()));
     const warnings=sourceLeadWarnings(row.atlasName,src.name);
     if(used.has(id(src)))warnings.push('FMA_BP_REPRESENTATION_ALREADY_USED');
     if(!ids.length)warnings.push('NO_FJ_IDS');
     if(missing.length)warnings.push('MISSING_OBJ_ELEMENTS');
     candidates.push({officialName:src.name,fmaId:src.fmaId,bpId:src.bpId,
       fjIds:ids,missingFjIds:missing,allObjPresent:ids.length>0&&!missing.length,
       score,warnings,approved:false});
   }
   candidates.sort((a,b)=>b.score-a.score||a.officialName.localeCompare(b.officialName));
   return {area:row.area,atlasName:row.atlasName,system:row.system,
     candidates:candidates.slice(0,8),identityApproved:false,clinicalApproval:false,distributionApproved:false};
 });
 const areas=focus.areas.map(area=>{
   const chosen=structures.filter(x=>x.area===area.id);
   return {label:area.label,missing:chosen.length,withNameLeads:chosen.filter(x=>x.candidates.length).length,
     withUnclaimedCompleteObj:chosen.filter(x=>x.candidates.some(c=>c.allObjPresent &&
       !c.warnings.some(w=>['OPPOSITE_SIDE','HAND_VS_FOOT','DIFFERENT_VERTEBRAL_LEVEL',
       'FMA_BP_REPRESENTATION_ALREADY_USED'].includes(w)))).length};
 });
 return {status:'UNAPPROVED_OFFICIAL_OBJ_NAME_LEADS',sourceArchiveSha256:archiveSha256,
   structures,areas,approvedForDistribution:false,modelsAdded:0};
}
export function officialLeadCsv(report){
 return ['focusArea,atlasName,officialName,FMA,BP,FJ,missingFJ,completeOBJ,tokenScore,warnings,approved',
  ...report.structures.flatMap(x=>x.candidates.length?
   x.candidates.map(c=>[x.area,x.atlasName,c.officialName,c.fmaId,c.bpId,c.fjIds.join('|'),
     c.missingFjIds.join('|'),c.allObjPresent,c.score,c.warnings.join('|'),'false'].map(csv).join(',')):
   [[x.area,x.atlasName,'','','','','','false','','NO_PUBLISHER_NAME_LEAD','false'].map(csv).join(',')])
 ].join('\n')+'\n';
}
