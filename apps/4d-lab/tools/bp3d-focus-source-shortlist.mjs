// Private source previews only: source IDs were transcribed from the user-exported
// 2026-11-24 official-source-leads.csv. This is NOT an anatomical review, medical
// clearance, FMA equivalence approval or licence for redistribution.
import path from 'node:path';
import {provisionalIdentityIssues} from './bp3d-provisional-mappings.mjs';
import {sourceLeadWarnings,sourceLeadRisk} from './bp3d-focus-official-source-leads.mjs';

export const FOCUS_SOURCE_REVIEW_ONLY=Object.freeze([
  {
    "atlasName": "Abductor digiti minimi of hand.l",
    "officialName": "abductor digiti minimi of left hand",
    "fmaId": "FMA37397",
    "bpId": "BP8737",
    "fjIds": [
      "FJ1466M"
    ]
  },
  {
    "atlasName": "Abductor digiti minimi of hand.r",
    "officialName": "abductor digiti minimi of right hand",
    "fmaId": "FMA37396",
    "bpId": "BP7569",
    "fjIds": [
      "FJ1466"
    ]
  },
  {
    "atlasName": "Flexor digiti minimi of hand.l",
    "officialName": "flexor digiti minimi brevis of left hand",
    "fmaId": "FMA37399",
    "bpId": "BP8516",
    "fjIds": [
      "FJ1470M"
    ]
  },
  {
    "atlasName": "Flexor digiti minimi of hand.r",
    "officialName": "flexor digiti minimi brevis of right hand",
    "fmaId": "FMA37398",
    "bpId": "BP4858",
    "fjIds": [
      "FJ1470"
    ]
  },
  {
    "atlasName": "Opponens digiti minimi muscle of hand.l",
    "officialName": "opponens digiti minimi of left hand",
    "fmaId": "FMA37401",
    "bpId": "BP8204",
    "fjIds": [
      "FJ1482M"
    ]
  },
  {
    "atlasName": "Opponens digiti minimi muscle of hand.r",
    "officialName": "opponens digiti minimi of right hand",
    "fmaId": "FMA37400",
    "bpId": "BP4860",
    "fjIds": [
      "FJ1482"
    ]
  },
  {
    "atlasName": "(Opponens digiti minimi muscle of foot).l",
    "officialName": "opponens digiti minimi of left foot",
    "fmaId": "FMA86035",
    "bpId": "BP9018",
    "fjIds": [
      "FJ1399M"
    ]
  },
  {
    "atlasName": "(Opponens digiti minimi muscle of foot).r",
    "officialName": "opponens digiti minimi of right foot",
    "fmaId": "FMA86034",
    "bpId": "BP5046",
    "fjIds": [
      "FJ1399"
    ]
  },
  {
    "atlasName": "Abductor digiti minimi of foot.l",
    "officialName": "abductor digiti minimi of left foot",
    "fmaId": "FMA37464",
    "bpId": "BP9182",
    "fjIds": [
      "FJ1390M"
    ]
  },
  {
    "atlasName": "Abductor digiti minimi of foot.r",
    "officialName": "abductor digiti minimi of right foot",
    "fmaId": "FMA37463",
    "bpId": "BP5056",
    "fjIds": [
      "FJ1390"
    ]
  },
  {
    "atlasName": "Flexor digiti minimi of foot.l",
    "officialName": "flexor digiti minimi brevis of left foot",
    "fmaId": "FMA37472",
    "bpId": "BP8065",
    "fjIds": [
      "FJ1391M"
    ]
  },
  {
    "atlasName": "Flexor digiti minimi of foot.r",
    "officialName": "flexor digiti minimi brevis of right foot",
    "fmaId": "FMA37471",
    "bpId": "BP5050",
    "fjIds": [
      "FJ1391"
    ]
  },
  {
    "atlasName": "Manubrium of sternum",
    "officialName": "manubrium",
    "fmaId": "FMA7486",
    "bpId": "BP8562",
    "fjIds": [
      "FJ3290"
    ]
  },
  {
    "atlasName": "Ethmoid bone",
    "officialName": "ethmoid",
    "fmaId": "FMA52740",
    "bpId": "BP8991",
    "fjIds": [
      "FJ3199"
    ]
  },
  {
    "atlasName": "Nasal septal cartilage",
    "officialName": "septal nasal cartilage",
    "fmaId": "FMA59503",
    "bpId": "BP8657",
    "fjIds": [
      "FJ2557"
    ]
  },
  {
    "atlasName": "Pineal gland",
    "officialName": "pineal body",
    "fmaId": "FMA62033",
    "bpId": "BP5525",
    "fjIds": [
      "FJ1795"
    ]
  },
  {
    "atlasName": "Seminal gland.l",
    "officialName": "left seminal vesicle",
    "fmaId": "FMA19388",
    "bpId": "BP9064",
    "fjIds": [
      "FJ3137"
    ]
  },
  {
    "atlasName": "Seminal gland.r",
    "officialName": "right seminal vesicle",
    "fmaId": "FMA19387",
    "bpId": "BP8530",
    "fjIds": [
      "FJ3143"
    ]
  }
]);
export function selectFocusSourceReview({catalog,officialRows,elements,archiveFiles,existing=[]}){
 if(!catalog||!Array.isArray(officialRows)||!(elements instanceof Map)||!Array.isArray(archiveFiles))
   throw Error('Official source metadata and local Atlas catalog required');
 const official=new Map(officialRows.map(x=>[x.fmaId+'|'+x.bpId,x]));
 const zip=new Map(archiveFiles.filter(x=>/\.obj$/i.test(x))
   .map(x=>[path.basename(x,path.extname(x)).toUpperCase(),x]));
 const usedIds=new Set(existing.map(x=>x.fmaId+'|'+x.bpId));
 const usedFj=new Set(existing.flatMap(x=>[...(elements.get(x.fmaId)||[])]));
 const selected=[],rejected=[],claimedFj=new Set();
 for(const item of FOCUS_SOURCE_REVIEW_ONLY){
   const key=item.fmaId+'|'+item.bpId;
   const row=official.get(key);
   let problem=null;
   if(!catalog[item.atlasName])problem='ATLAS_ID_NOT_IN_CATALOG';
   else if(usedIds.has(key))problem='OFFICIAL_ID_ALREADY_CONVERTED';
   else if(!row||row.name!==item.officialName)problem='PUBLISHER_FMA_BP_NAME_CHANGED';
   else {
     const warnings=[...provisionalIdentityIssues(item.atlasName,row.name),
       ...sourceLeadWarnings(item.atlasName,row.name)];
     // Whitelist is source-name led, not human reviewed. A changed
     // tissue/laterality/whole-part match never silently becomes a candidate.
     if(sourceLeadRisk(warnings)||warnings.some(x=>x==='HAND_FOOT_NOT_SPECIFIED'||x==='AMBIGUOUS_LATERALITY'))
       problem='ANATOMY_NAME_CONFLICT_'+warnings.join('|');
   }
   const required=[...(elements.get(item.fmaId)||[])].sort();
   const supplied=[...item.fjIds].sort();
   if(!problem&&(!required.length||required.length!==supplied.length||
      required.some((x,i)=>x!==supplied[i])))problem='SOURCE_FJ_SET_CHANGED';
   if(!problem&&required.some(x=>!zip.has(x.toUpperCase())))problem='SOURCE_FJ_OBJ_MISSING';
   if(!problem&&required.some(x=>usedFj.has(x)||claimedFj.has(x)))
      problem='SOURCE_FJ_GEOMETRY_ALREADY_CLAIMED';
   if(problem){rejected.push({atlasName:item.atlasName,reason:problem});continue;}
   const sourceObjs=required.map(fileId=>({fileId,archivePath:zip.get(fileId.toUpperCase())}));
   selected.push({atlasName:item.atlasName,atlasSystem:catalog[item.atlasName].source,
     state:'candidate',matchMethod:'provisional-name-review-NOT-validated',
     geometryIdentityVerified:false,redistributionApproved:false,
     matches:[{fmaId:item.fmaId,bpId:item.bpId,officialName:row.name,
       elementFileIds:required,sourceObjs}]});
   usedIds.add(key);
   for(const fj of required)claimedFj.add(fj);
 }
 return {candidates:selected,rejected,summary:{attempted:FOCUS_SOURCE_REVIEW_ONLY.length,
    selected:selected.length,rejected:rejected.length,medicallyApproved:0,commerciallyApproved:0}};
}
