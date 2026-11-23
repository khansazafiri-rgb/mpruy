// Read-only triage of ALL unmapped Atlas names using official-source review suggestions.
// Absolutely no suggestion is anatomical validation, source identity approval or distribution clearance.
import {reviewTokens} from './bp3d-mapping-review.mjs';

const CSV = x => '"' + String(x ?? '').replaceAll('"', '""') + '"';
const identity = x => x ? x.fmaId + '|' + x.bpId : null;
const sameTerminology = (a,b) => {
  const left=reviewTokens(a).sort(),right=reviewTokens(b).sort();
  return left.length>0 && left.length===right.length && left.every((token,i)=>token===right[i]);
};
const categoryOrder={
  TERMINOLOGY_EQUIVALENT_REVIEW:0,
  PROMISING_IDENTITY_REVIEW:1,
  MANUAL_ANATOMICAL_REVIEW:2,
  IDENTITY_COLLISION_REVIEW:3,
  SOURCE_GEOMETRY_MISSING:4,
  NO_PUBLISHER_CANDIDATE:5,
};
export function buildAllSystemsTriage(audit,mappingReview){
  if(!audit||!Array.isArray(audit.structures)||!Array.isArray(mappingReview?.queue))
    throw new Error('Full structure audit and mapping-review queue are both required');
  const reportByName=new Map(mappingReview.queue.map(item=>[item.name,item]));
  const used=new Map();
  for(const item of audit.structures){
    if(item.status==='converted' && item.fmaId && item.bpId){
      const key=item.fmaId+'|'+item.bpId;
      if(!used.has(key))used.set(key,[]);
      used.get(key).push(item.name);
    }
  }
  const proposed=new Map();
  for(const item of audit.structures){
    if(item.status==='converted')continue;
    for(const option of reportByName.get(item.name)?.suggestions||[]){
      const key=identity(option);
      if(!key)continue;
      if(!proposed.has(key))proposed.set(key,new Set());
      proposed.get(key).add(item.name);
    }
  }
  const queue=[],diagnostic=[];
  for(const item of audit.structures){
    if(item.status==='converted'){
      const flags=[...(item.geometryFlags||[])];
      if(item.lateralityBoundsReview)flags.push(item.lateralityBoundsReview);
      if(item.omittedZeroAreaTriangles)flags.push('ZERO_AREA_TRIANGLES_OMITTED');
      if(flags.length)diagnostic.push({name:item.name,system:item.system,group:item.group,
        regions:item.regions||[],flags:[...new Set(flags)],triangles:item.triangles,
        sourceMeshCount:item.sourceMeshCount,sourceGeometryValidated:false,approval:false});
      continue;
    }
    const suggestions=reportByName.get(item.name)?.suggestions||[];
    const best=suggestions[0]||null;
    const key=identity(best);
    const missingFiles=best?(best.sourceElementIds||[]).length===0 ||
      (best.missingElements||[]).length>0:false;
    const collision=!!key&&((used.get(key)||[]).length>0 || (proposed.get(key)||new Set()).size>1);
    const ambiguous=!!best&&(
      best.confidence==='ambiguous-review'||(best.warnings||[]).includes('tied-best-match'));
    const warnings=[...(best?.warnings||[])];
    if(collision)warnings.push('OFFICIAL_IDENTITY_USED_OR_SHARED');
    if(ambiguous)warnings.push('MULTIPLE_POSSIBLE_MATCHES');
    let tier='NO_PUBLISHER_CANDIDATE';
    if(best){
      if(missingFiles)tier='SOURCE_GEOMETRY_MISSING';
      else if(collision)tier='IDENTITY_COLLISION_REVIEW';
      else if(!ambiguous && !warnings.length &&
        sameTerminology(item.name,best.officialName))tier='TERMINOLOGY_EQUIVALENT_REVIEW';
      else if(!ambiguous && !warnings.length &&
        (best.confidence==='high-review'||best.confidence==='medium-review'))
        tier='PROMISING_IDENTITY_REVIEW';
      else tier='MANUAL_ANATOMICAL_REVIEW';
    }
    queue.push({atlasName:item.name,system:item.system,group:item.group||null,
      regions:item.regions||[],tier,unmappedState:item.status,
      candidate:best?{officialName:best.officialName,fmaId:best.fmaId,bpId:best.bpId,
        fjIds:[...(best.sourceElementIds||[])],score:best.similarity,
        confidence:best.confidence,warnings:[...new Set(warnings)],
        approved:false}:null,alternatives:suggestions.length,
      medicalIdentityValidated:false,anatomyGeometryValidated:false,approvedForDistribution:false});
  }
  queue.sort((a,b)=>(categoryOrder[a.tier]-categoryOrder[b.tier]) ||
    a.system.localeCompare(b.system)||a.atlasName.localeCompare(b.atlasName));
  diagnostic.sort((a,b)=>a.system.localeCompare(b.system)||a.name.localeCompare(b.name));
  const bySystem={};
  for(const x of queue){
    const sys=bySystem[x.system]??={total:0};
    sys.total++;
    sys[x.tier]=(sys[x.tier]||0)+1;
  }
  const summary={totalAtlasStructures:audit.structures.length,
    existingConverted:audit.structures.length-queue.length,
    unmapped:queue.length,
    byTier:Object.fromEntries(Object.keys(categoryOrder).map(key=>[key,queue.filter(x=>x.tier===key).length])),
    sourceGeometryFlagged:diagnostic.length,
    suggestedIdentitiesApproved:0,
    addedModels:0,
    distributionApproved:0};
  if(summary.totalAtlasStructures!==summary.existingConverted+summary.unmapped)
    throw new Error('Triage omitted catalog names');
  return {schemaVersion:1,status:'REVIEW_QUEUE_NOT_APPROVED',
    summary,bySystem,queue,geometryReview:diagnostic,
    warnings:['Name similarity is NOT anatomical proof',
      'Original Atlas UI, gold highlight and isolation are unchanged',
      'No medical source, 3D geometry or license is approved by this queue']};
}
export function triageCsv(triage){
  return ['tier,system,group,region,atlasName,officialName,FMA,BP,FJ,confidence,score,warnings,reviewed',
    ...triage.queue.map(x=>[
      x.tier,x.system,x.group,x.regions.join('|'),x.atlasName,
      x.candidate?.officialName,x.candidate?.fmaId,x.candidate?.bpId,
      x.candidate?.fjIds.join('|'),x.candidate?.confidence,x.candidate?.score,
      x.candidate?.warnings.join('|'),'false'].map(CSV).join(','))].join('\n')+'\n';
}
export function geometryCsv(triage){
  return ['system,group,regions,atlasName,geometryFlags,triangles,sourceMeshCount,reviewed',
    ...triage.geometryReview.map(x=>[
      x.system,x.group,x.regions.join('|'),x.name,x.flags.join('|'),
      x.triangles,x.sourceMeshCount,'false'].map(CSV).join(','))].join('\n')+'\n';
}
export function unapprovedTemplate(triage,archiveSha){
  if(!/^[a-f0-9]{64}$/.test(archiveSha||''))
    throw new Error('Official source ZIP SHA256 required to prepare review draft');
  // Candidate draft is deliberately invalid for conversion: reviewer, evidence, and
  // reviewedSourceIdentity must be filled by an actual anatomical source reviewer.
  const entries=triage.queue.filter(x=>x.tier==='TERMINOLOGY_EQUIVALENT_REVIEW' &&
    x.candidate?.fjIds.length).map(x=>({
      atlasName:x.atlasName,officialName:x.candidate.officialName,
      fmaId:x.candidate.fmaId,bpId:x.candidate.bpId,
      fjIds:x.candidate.fjIds,reviewedSourceIdentity:false,reviewer:'',
      identityEvidence:'',clinicallyReviewed:false,approvedForDistribution:false
    }));
  return {schemaVersion:1,sourceArchiveSha256:archiveSha,entries};
}
