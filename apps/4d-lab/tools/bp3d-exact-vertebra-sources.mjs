// PRIVATE ONLY: match publisher bone-level OBJ representations by exact
// vertebral anatomical LEVEL, never group vertebrae, disks, vessels or facet parts.
// A label match permits an UNVERIFIED GLB preview, not clinical approval.
import path from 'node:path';
import {officialVertebralLevel} from './bp3d-source-name-priority.mjs';
import {provisionalIdentityIssues} from './bp3d-provisional-mappings.mjs';

const levels=[
  ...Array.from({length:7},(_,i)=>'c'+(i+1)),
  ...Array.from({length:12},(_,i)=>'t'+(i+1)),
  ...Array.from({length:5},(_,i)=>'l'+(i+1)),
];
export const EXPECTED_VERTEBRA_LEVELS=Object.freeze([...levels,'coccyx']);
const numberToWord=['','first','second','third','fourth','fifth','sixth','seventh',
  'eighth','ninth','tenth','eleventh','twelfth'];
const typeByPrefix={c:'cervical',t:'thoracic',l:'lumbar'};
function atlasNameForLevel(level){
  if(level==='c1')return 'Atlas (C1)';
  if(level==='c2')return 'Axis (C2)';
  if(level==='coccyx')return 'Coccyx';
  return 'Vertebra '+level.toUpperCase();
}
function isWholeBoneExactSource(label,level){
 const n=String(label||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(level==='coccyx')return n==='coccyx';
 if(level==='c1'&&n==='atlas')return true;
 if(level==='c2'&&n==='axis')return true;
 const prefix=level[0],order=Number(level.slice(1));
 const type=typeByPrefix[prefix];
 if(!type||!order||order>12)return false;
 return n===numberToWord[order]+' '+type+' vertebra'||
   n==='vertebra '+level||n===level+' vertebra'||
   n===type+' vertebra '+order;
}
export function selectExactVertebraSources({catalog,officialRows,elements,archiveFiles,existing=[]}){
 if(!catalog||!Array.isArray(officialRows)||!(elements instanceof Map)||
  !Array.isArray(archiveFiles)||!Array.isArray(existing))
   throw Error('Full official publisher catalog/FMA/BP/FJ source required');
 const archive=new Map(archiveFiles.filter(x=>/\.obj$/i.test(x)).map(x=>[
   path.basename(x).replace(/\.obj$/i,'').toUpperCase(),x]));
 const usedRepresentations=new Set(existing.map(x=>x.fmaId+'|'+x.bpId));
 const usedElements=new Set(existing.flatMap(x=>[...(elements.get(x.fmaId)||[])]));
 const qualified=new Map();
 for(const row of officialRows){
   const level=officialVertebralLevel(row.name);
   if(!level||!isWholeBoneExactSource(row.name,level))continue;
   if(!qualified.has(level))qualified.set(level,[]);
   qualified.get(level).push(row);
 }
 const candidates=[],rejected=[];
 for(const level of EXPECTED_VERTEBRA_LEVELS){
   const atlasName=atlasNameForLevel(level),meta=catalog[atlasName];
   if(!meta||meta.source!=='skeletal'){
     rejected.push({atlasName,reason:'NOT_A_SKELETAL_ATLAS_CATALOG_ID'});continue;
   }
   if(existing.some(x=>x.name===atlasName)){
     rejected.push({atlasName,reason:'ATLAS_MODEL_ALREADY_PRESENT'});continue;
   }
   const matches=qualified.get(level)||[];
   if(matches.length!==1){
     rejected.push({atlasName,reason:matches.length?'AMBIGUOUS_OFFICIAL_BONE_LEVEL':'NO_EXACT_OFFICIAL_BONE_LEVEL',
       publisherCandidates:matches.map(x=>({name:x.name,fmaId:x.fmaId,bpId:x.bpId}))});
     continue;
   }
   const row=matches[0],representation=row.fmaId+'|'+row.bpId;
   const fjIds=[...(elements.get(row.fmaId)||[])].sort();
   const issues=provisionalIdentityIssues(atlasName,row.name);
   if(usedRepresentations.has(representation)||usedElements.size&&fjIds.some(x=>usedElements.has(x)))
     issues.push('OFFICIAL_GEOMETRY_ALREADY_USED');
   if(!/^FMA\d+$/.test(row.fmaId)||!/^BP\d+$/.test(row.bpId))
     issues.push('INVALID_PUBLISHER_ID');
   if(!fjIds.length)issues.push('NO_OFFICIAL_FJ_ELEMENTS');
   if(fjIds.some(x=>!archive.has(x.toUpperCase())))issues.push('OFFICIAL_OBJ_MISSING');
   if(issues.length){
     rejected.push({atlasName,reason:issues.join('|'),publisherName:row.name,
       fmaId:row.fmaId,bpId:row.bpId,fjIds});continue;
   }
   usedRepresentations.add(representation);
   for(const id of fjIds)usedElements.add(id);
   candidates.push({atlasName,atlasSystem:'skeletal',
     matchMethod:'provisional-name-review-NOT-validated',
     state:'candidate',geometryIdentityVerified:false,redistributionApproved:false,
     matches:[{fmaId:row.fmaId,bpId:row.bpId,officialName:row.name,
       elementFileIds:fjIds,sourceObjs:fjIds.map(fileId=>({
         fileId,archivePath:archive.get(fileId.toUpperCase())}))}]});
 }
 return {candidates,rejected,summary:{
   targeted:EXPECTED_VERTEBRA_LEVELS.length,selected:candidates.length,rejected:rejected.length,
   approvedForClinicalUse:0,approvedForDistribution:0}};
}
