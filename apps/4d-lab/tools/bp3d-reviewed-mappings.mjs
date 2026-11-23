// Additions to private source review require an explicit source-identity review.
// This only authorizes local conversion, NOT clinical validation or distribution.
import path from 'node:path';
import {normalizeAnatomyName} from '../../../licensing/tools/prepare-bodyparts3d-source.mjs';
const bySide=name=>{
  const n=normalizeAnatomyName(name);
  if(/^left\b/.test(n))return 'left';
  if(/^right\b/.test(n))return 'right';
  return null;
};
const tissue=name=>{
  const n=normalizeAnatomyName(name);
  for(const type of ['artery','vein','nerve','muscle','cartilage','bone','ligament','tendon'])
    if(new RegExp('\\b'+type+'\\b').test(n))return type;
  return null;
};
export function applyReviewedSourceMappings(mapped,reviews,officialRows,elements,archiveFiles,archiveSha){
  if(!reviews||reviews.schemaVersion!==1||
    reviews.sourceArchiveSha256!==archiveSha||
    !/^[a-f0-9]{64}$/.test(archiveSha)||
    !Array.isArray(reviews.entries)||
    !reviews.entries.length)throw Error('Invalid or unpinned source identity review');
  const byFile=new Map(archiveFiles.filter(x=>/\.obj$/i.test(x))
    .map(x=>[path.basename(x,path.extname(x)).toUpperCase(),x]));
  const candidates=new Map(mapped.candidates.map(x=>[x.atlasName,x]));
  const official=new Map(officialRows.map(x=>[x.fmaId+'|'+x.bpId,x]));
  const seen=new Set();
  const result=mapped.candidates.map(x=>({...x}));
  const outputMap=new Map(result.map(x=>[x.atlasName,x]));
  for(const record of reviews.entries){
    if(!record||typeof record.atlasName!=='string'||seen.has(record.atlasName))
      throw Error('Duplicate or missing Atlas identity in reviewed mapping');
    seen.add(record.atlasName);
    const candidate=candidates.get(record.atlasName);
    if(!candidate||candidate.state!=='unmatched')
      throw Error('Reviewed map may only fill currently unmatched Atlas names: '+record.atlasName);
    if(record.reviewedSourceIdentity!==true||typeof record.reviewer!=='string'||
       record.reviewer.trim().length<3||
       typeof record.identityEvidence!=='string'||record.identityEvidence.trim().length<35)
      throw Error('Identity review lacks explicit reviewer and detailed source evidence');
    const source=official.get(record.fmaId+'|'+record.bpId);
    if(!source||source.name!==record.officialName)throw Error('FMA/BP/name do not identify a unique official source row');
    const sideA=bySide(record.atlasName),sideB=bySide(source.name);
    if(sideA&&sideA!==sideB)throw Error('Laterality is missing or differs from Atlas structure: '+record.atlasName);
    const tissueA=tissue(record.atlasName),tissueB=tissue(source.name);
    if(tissueA&&tissueB&&tissueA!==tissueB)throw Error('Explicit tissue type mismatch: '+record.atlasName);
    const required=[...(elements.get(source.fmaId)||[])].sort();
    const supplied=Array.isArray(record.fjIds)?[...record.fjIds].sort():[];
    if(!required.length||required.length!==supplied.length||
      required.some((id,i)=>id!==supplied[i])||
      new Set(supplied).size!==supplied.length)
      throw Error('Reviewed FJ element list does not match the official source');
    const sourceObjs=required.map(fileId=>({fileId,archivePath:byFile.get(fileId.toUpperCase())||null}));
    if(sourceObjs.some(x=>!x.archivePath))throw Error('Official OBJ missing from archive for '+record.atlasName);
    const entry=outputMap.get(record.atlasName);
    entry.state='candidate';
    entry.matchMethod='explicit-reviewed-FMA-BP-FJ-not-clinically-validated';
    entry.matches=[{fmaId:source.fmaId,bpId:source.bpId,officialName:source.name,
      elementFileIds:required,sourceObjs}];
  }
  return {...mapped,candidates:result};
}
