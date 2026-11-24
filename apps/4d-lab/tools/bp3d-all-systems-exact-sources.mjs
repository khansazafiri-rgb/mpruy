// MEDCOEL all-systems *private* BodyParts3D source triage.
// This selects only unambiguous EXACT full-structure terminology, after
// preserving laterality, morphology and complete FMA/BP/FJ OBJ identity.
// NEVER assert that a source-name match implies clinically correct anatomy.
import path from 'node:path';
import {reviewTokens} from './bp3d-mapping-review.mjs';
import {provisionalIdentityIssues} from './bp3d-provisional-mappings.mjs';
import {sourceLeadWarnings} from './bp3d-focus-official-source-leads.mjs';
import {semanticWholePartFlags} from './bp3d-source-name-priority.mjs';

const NOT_IDENTITY=new Set(['the','of']);
const SIDES=new Set(['left','right']);
const keyOf=x=>String(x.fmaId||'')+'|'+String(x.bpId||'');
const sortedKey=x=>reviewTokens(x).filter(t=>!NOT_IDENTITY.has(t)).sort().join(' ');
const CORE_ANATOMY_TYPES=['artery','vein','nerve','muscle','tendon','ligament','cartilage',
  'bone','gland','bronchus','duct','plexus','organ','node'];
const kind=x=>{const tokens=new Set(reviewTokens(x));return CORE_ANATOMY_TYPES.filter(t=>tokens.has(t));};
function additionalSafety(target,source){
 const warnings=[...provisionalIdentityIssues(target,source),
   ...sourceLeadWarnings(target,source),
   ...semanticWholePartFlags(target,source)];
 const a=kind(target),b=kind(source);
 if(a.length&&b.length&&!a.some(x=>b.includes(x)))
   warnings.push('EXPLICIT_TISSUE_CLASS_MISMATCH');
 const aSide=new Set(reviewTokens(target).filter(t=>SIDES.has(t)));
 const bSide=new Set(reviewTokens(source).filter(t=>SIDES.has(t)));
 if(aSide.size!==bSide.size || [...aSide].some(t=>!bSide.has(t)))
   warnings.push('EXACT_LATERALITY_NOT_CORROBORATED');
 return [...new Set(warnings)];
}

/** Every missing catalogue structure gets one explicit selection/rejection row.
 * existing[] MUST be from a checksum/lineage-audited private GLB inventory.
 */
export function selectAllSystemsExact({catalog,officialRows,elements,archiveFiles,existing=[]}){
 if(!catalog||typeof catalog!=='object'||!Array.isArray(officialRows)||
    !(elements instanceof Map)||!Array.isArray(archiveFiles)||!Array.isArray(existing))
   throw Error('Exact source search requires original catalogue and publisher FMA/BP/FJ metadata');
 const byName=new Map(),zipFiles=new Map();
 for(const row of officialRows){
   if(!/^FMA\d+$/.test(row.fmaId||'')||!/^BP\d+$/.test(row.bpId||'')||!row.name)
     throw Error('Invalid official source identity in all-systems search');
   const key=sortedKey(row.name);
   if(!byName.has(key))byName.set(key,[]);
   byName.get(key).push(row);
 }
 for(const entry of archiveFiles.filter(x=>/\.obj$/i.test(x))){
   const file=path.basename(entry).replace(/\.obj$/i,'').toUpperCase();
   if(zipFiles.has(file)&&zipFiles.get(file)!==entry)
     throw Error('Ambiguous official source OBJ archive entry: '+file);
   zipFiles.set(file,entry);
 }
 const existingNames=new Set(),existingIds=new Set(),usedFj=new Set();
 for(const c of existing){
   if(!catalog[c.name])throw Error('Existing private GLB not in current Atlas catalogue: '+c.name);
   if(existingNames.has(c.name))throw Error('Duplicate Atlas name in private baseline: '+c.name);
   existingNames.add(c.name);existingIds.add(keyOf(c));
   for(const fj of elements.get(c.fmaId)||[])usedFj.add(fj);
 }
 const candidates=[],rejected=[],potential=[];
 for(const atlasName of Object.keys(catalog).sort((a,b)=>a.localeCompare(b,'en'))){
   if(existingNames.has(atlasName))continue;
   const meta=catalog[atlasName],refs=byName.get(sortedKey(atlasName))||[];
   const prefix={atlasName,system:meta.source||'unknown'};
   if(refs.length!==1){
     rejected.push({...prefix,reason:refs.length?
       'AMBIGUOUS_EXACT_OFFICIAL_REPRESENTATIONS':'NO_EXACT_OFFICIAL_REPRESENTATION',
       sourceMatches:refs.map(x=>({officialName:x.name,fmaId:x.fmaId,bpId:x.bpId}))});
     continue;
   }
   const source=refs[0],represent=keyOf(source);
   const fjIds=[...(elements.get(source.fmaId)||[])].sort();
   const issues=additionalSafety(atlasName,source.name);
   if(existingIds.has(represent))issues.push('OFFICIAL_FMA_BP_ALREADY_USED');
   if(fjIds.some(x=>usedFj.has(x)))issues.push('OFFICIAL_FJ_GEOMETRY_ALREADY_USED');
   if(!fjIds.length)issues.push('OFFICIAL_FJ_LIST_MISSING');
   if(fjIds.some(x=>!zipFiles.has(x.toUpperCase())))issues.push('OFFICIAL_OBJ_FILE_MISSING');
   if(new Set(fjIds).size!==fjIds.length)issues.push('OFFICIAL_FJ_LIST_DUPLICATED');
   if(issues.length){
     rejected.push({...prefix,reason:[...new Set(issues)].join('|'),
       officialName:source.name,fmaId:source.fmaId,bpId:source.bpId,fjIds});
     continue;
   }
   potential.push({...prefix,source,fjIds,sourceObjs:fjIds.map(fileId=>({
     fileId,archivePath:zipFiles.get(fileId.toUpperCase())}))});
 }
 // Do not give a shared publisher FJ to whichever alphabetical Atlas name
 // happened to appear first. Reject ALL colliding proposed source matches.
 const byFj=new Map(),byRepresentation=new Map();
 for(const entry of potential){
   const rep=keyOf(entry.source);
   if(!byRepresentation.has(rep))byRepresentation.set(rep,[]);
   byRepresentation.get(rep).push(entry.atlasName);
   for(const fj of entry.fjIds){
     if(!byFj.has(fj))byFj.set(fj,[]);
     byFj.get(fj).push(entry.atlasName);
   }
 }
 for(const entry of potential){
   const rep=keyOf(entry.source),clashes=[...(byRepresentation.get(rep)||[])];
   for(const fj of entry.fjIds)clashes.push(...(byFj.get(fj)||[]));
   const conflicts=[...new Set(clashes)].filter(x=>x!==entry.atlasName);
   if(conflicts.length){
     rejected.push({atlasName:entry.atlasName,system:entry.system,
       reason:'MULTIPLE_ATLAS_NAMES_CLAIM_SAME_OFFICIAL_GEOMETRY',
       conflictWith:conflicts.sort(),officialName:entry.source.name,
       fmaId:entry.source.fmaId,bpId:entry.source.bpId,fjIds:entry.fjIds});
     continue;
   }
   candidates.push({atlasName:entry.atlasName,atlasSystem:entry.system,
     state:'candidate',matchMethod:'provisional-name-review-NOT-validated',
     geometryIdentityVerified:false,redistributionApproved:false,
     matches:[{fmaId:entry.source.fmaId,bpId:entry.source.bpId,
       officialName:entry.source.name,elementFileIds:entry.fjIds,
       sourceObjs:entry.sourceObjs}]});
 }
 const bySystem={};
 for(const name of Object.keys(catalog)){
   const system=catalog[name].source||'unknown';
   if(!bySystem[system])bySystem[system]={catalog:0,previousGLBs:0,newExactSourceLeads:0,
     notYetMapped:0};
   bySystem[system].catalog++;
   if(existingNames.has(name))bySystem[system].previousGLBs++;
 }
 for(const x of candidates)bySystem[x.atlasSystem].newExactSourceLeads++;
 for(const x of rejected)bySystem[x.system].notYetMapped++;
 const summary={catalogCount:Object.keys(catalog).length,priorConverted:existing.length,
   missingBefore:rejected.length+candidates.length,selected:candidates.length,
   rejected:rejected.length,medicallyValidated:0,distributionApproved:0};
 if(summary.priorConverted+summary.selected+summary.rejected!==summary.catalogCount)
   throw Error('All-systems source search did not account for entire catalogue');
 return {status:'ALL_SYSTEMS_EXACT_SOURCE_REVIEW_ONLY',candidates,rejected,
   summary,bySystem,approvedForDistribution:false,
   warnings:['Exact names and complete official OBJ do not establish clinical identity',
     'No source is publicly distributable without separate rights and medical clearance',
     'No missing model is replaced with generic bones, adjacent levels, organ subparts or meshes from the legacy Atlas']};
}

/** Reconstruct cached official source lineage for the prior private 626-model
 * inventory. The caller must audit every GLB checksum BEFORE this runs.
 */
export function rehydratePrivateInventory({catalog,officialRows,elements,archiveFiles,inventory}){
 if(!Array.isArray(inventory?.converted)||inventory.provisionalSource!==true||
    inventory.approvedForCommercialDistribution!==false||
    inventory.geometryRegisteredToMEDCOEL!==false||
    inventory.legalStatus!=='NOT-CLEARED')
   throw Error('Full private rights-blocked inventory is required');
 const official=new Map(),sourcePaths=new Map();
 for(const x of officialRows){
   const key=keyOf(x);
   if(!official.has(key))official.set(key,[]);
   official.get(key).push(x);
 }
 for(const x of archiveFiles.filter(x=>/\.obj$/i.test(x))){
   const id=path.basename(x).replace(/\.obj$/i,'').toUpperCase();
   if(sourcePaths.has(id)&&sourcePaths.get(id)!==x)
     throw Error('Duplicate official FJ archive files: '+id);
   sourcePaths.set(id,x);
 }
 const candidates=[];
 for(const c of inventory.converted){
   if(!catalog[c.name]||catalog[c.name].source!==c.system)
     throw Error('Cached model catalog/system mismatch: '+c.name);
   const rows=official.get(keyOf(c))||[];
   if(!rows.length)throw Error('Missing official FMA/BP row for cached model: '+c.name);
   const fjIds=[...(elements.get(c.fmaId)||[])].sort();
   if(!fjIds.length||fjIds.length!==c.sourceMeshes)
     throw Error('Official FJ count changed for cached model: '+c.name);
   const sourceObjs=fjIds.map(fileId=>({fileId,archivePath:sourcePaths.get(fileId.toUpperCase())}));
   if(sourceObjs.some(x=>!x.archivePath))
     throw Error('Missing official FJ OBJ for cached model: '+c.name);
   // Some FMA/BP concept records expose synonyms. The existing audited GLB
   // pins exact officialName in its lineage and is checked again during copy.
   candidates.push({atlasName:c.name,atlasSystem:c.system,state:'candidate',
     matchMethod:c.mappingMethod||'provisional-name-review-NOT-validated',
     reviewManifestSHA256:c.reviewManifestSHA256||null,
     geometryIdentityVerified:false,redistributionApproved:false,
     matches:[{fmaId:c.fmaId,bpId:c.bpId,officialName:rows[0].name,
       elementFileIds:fjIds,sourceObjs}]});
 }
 return candidates;
}
