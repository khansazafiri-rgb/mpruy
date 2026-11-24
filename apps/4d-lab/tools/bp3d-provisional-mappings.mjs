// PRIVATE PREVIEW ONLY. Convert source-identified candidates for visual/anatomy review;
// never treat terminology or FMA/BP/FJ presence as medical identity verification.
import {normalizeAnatomyName} from '../../../licensing/tools/prepare-bodyparts3d-source.mjs';
import {semanticSourceFlags} from './bp3d-all-systems-triage.mjs';

const VALID=new Set(['TERMINOLOGY_EQUIVALENT_REVIEW','PROMISING_IDENTITY_REVIEW']);
// A source can express laterality as ".l"/".r" (BodyParts3D catalogue),
// as "left"/"right", or both. Normalize ONCE for selection and final QC.
export function canonicalSourceSide(name){
  const normalized=normalizeAnatomyName(name);
  const matches=normalized.match(/\b(left|right)\b/g)||[];
  const sides=[...new Set(matches)];
  return sides.length>1?'AMBIGUOUS':sides[0]||null;
}
export function provisionalIdentityIssues(atlasName,officialName){
  const issues=[...semanticSourceFlags(atlasName,officialName)];
  const atlasSide=canonicalSourceSide(atlasName);
  const sourceSide=canonicalSourceSide(officialName);
  if(atlasSide==='AMBIGUOUS'||sourceSide==='AMBIGUOUS')
    issues.push('AMBIGUOUS_LATERALITY');
  else if(atlasSide!==sourceSide && (atlasSide||sourceSide))
    issues.push('LATERALITY_NOT_CORROBORATED');
  const a=anatomyClass(atlasName),b=anatomyClass(officialName);
  if(a&&b&&a!==b)issues.push('TISSUE_CLASS_MISMATCH');
  return [...new Set(issues)];
}
const anatomyClass=name=>{
  const n=normalizeAnatomyName(name);
  return ['artery','vein','muscle','cartilage','bone','ligament','nerve','tendon'].find(t=>new RegExp('\\b'+t+'\\b').test(n))||null;
};

/** Prioritize the most defensible unvalidated suggestions. Source identity is checked against official FMA/BP/FJ rows. */
export function selectProvisionalMappings({triage, officialRows, elements, zipFiles,
  existing, includePromising=false, limitNew=100}){
  if(triage?.status!=='REVIEW_QUEUE_NOT_APPROVED'||!Array.isArray(triage.queue))
    throw Error('Unapproved full-catalog triage is required');
  if(!Number.isSafeInteger(limitNew)||limitNew<1||limitNew>200)
    throw Error('Provisional count must be 1..200');
  const official=new Map(officialRows.map(x=>[x.fmaId+'|'+x.bpId,x]));
  const zipIndex=new Map(zipFiles.filter(x=>/\.obj$/i.test(x)).map(x=>[x.split('/').at(-1).replace(/\.obj$/i,'').toUpperCase(),x]));
  const used=new Set(existing.map(x=>x.fmaId+'|'+x.bpId));
  const out=[],rejected=[],seenNames=new Set(),seenOfficial=new Set();
  const sorted=[...triage.queue].sort((a,b)=>
    (a.tier==='TERMINOLOGY_EQUIVALENT_REVIEW'?0:1)-
    (b.tier==='TERMINOLOGY_EQUIVALENT_REVIEW'?0:1)||
    a.system.localeCompare(b.system)||a.atlasName.localeCompare(b.atlasName));
  for(const record of sorted){
    if(!VALID.has(record.tier)||(!includePromising&&record.tier!=='TERMINOLOGY_EQUIVALENT_REVIEW'))
      continue;
    if(out.length>=limitNew)break;
    const c=record.candidate||{},key=c.fmaId+'|'+c.bpId;
    const reason=(()=>{
      if(!/^FMA\d+$/.test(c.fmaId||'')||!/^BP\d+$/.test(c.bpId||''))
        return 'invalid-official-identity';
      if(!Array.isArray(c.warnings)||c.warnings.length||c.approved!==false)
        return 'warning-or-premature-approval';
      if(record.medicalIdentityValidated!==false||record.approvedForDistribution!==false||
        record.anatomyGeometryValidated!==false)
        return 'incorrect-clearance';
      if(used.has(key)||seenOfficial.has(key)||seenNames.has(record.atlasName))
        return 'identity-collision';
      const ref=official.get(key);
      if(!ref||ref.name!==c.officialName)return 'missing-official-FMA-BP-name';
      const sourceIssues=provisionalIdentityIssues(record.atlasName,ref.name);
      if(sourceIssues.length)return 'provisional-source-identity-'+sourceIssues.join('|');
      const required=[...(elements.get(c.fmaId)||[])].sort(),
        supplied=Array.isArray(c.fjIds)?[...c.fjIds].sort():[];
      if(!required.length||new Set(supplied).size!==supplied.length||
        required.length!==supplied.length||required.some((x,i)=>x!==supplied[i]))
        return 'missing-or-mismatched-source-FJ';
      if(required.some(id=>!zipIndex.has(id.toUpperCase())))
        return 'official-OBJ-not-in-archive';
      return null;
    })();
    if(reason){rejected.push({atlasName:record.atlasName,reason});continue;}
    const row=official.get(key),sourceObjs=c.fjIds.map(fileId=>({fileId,archivePath:zipIndex.get(fileId.toUpperCase())}));
    out.push({atlasName:record.atlasName,atlasSystem:record.system,state:'candidate',
      matchMethod:'provisional-name-review-NOT-validated',
      geometryIdentityVerified:false,redistributionApproved:false,
      matches:[{fmaId:c.fmaId,bpId:c.bpId,officialName:row.name,
        elementFileIds:[...c.fjIds],sourceObjs}]});
    seenOfficial.add(key);seenNames.add(record.atlasName);
  }
  return {candidates:out,rejected,summary:{provisionalSelected:out.length,
    reviewRejected:rejected.length,approved:0}};
}
