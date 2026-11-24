// Full MEDCOEL Atlas-to-official BodyParts3D audit. LOCAL ONLY; never publishes or approves any geometry.
import fs from 'node:fs';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseOfficialNames,parseOfficialElements,candidateCrosswalk,mapActualMeshFiles,checkArchiveEntryNames} from '../../../licensing/tools/prepare-bodyparts3d-source.mjs';
import {auditGeneratedBatch} from './bp3d-batch-audit.mjs';
import {buildAllSystemsTriage,triageCsv,geometryCsv,unapprovedTemplate} from './bp3d-all-systems-triage.mjs';
import {buildVisibleGapReview,visibleGapCsv,visibleGapMarkdown} from './bp3d-visible-gap-review.mjs';
import {discoverFocusSources,officialLeadCsv} from './bp3d-focus-official-source-leads.mjs';
import {provisionalIdentityIssues} from './bp3d-provisional-mappings.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const PRIVATE=path.join(ROOT,'local-data/licensing-quarantine');
const CSV=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const pct=(a,b)=>b?+(a/b*100).toFixed(2):0;
const counter=()=>({catalog:0,converted:0,exactNotConverted:0,unmatched:0,ambiguous:0,missingOBJ:0});
const include=(groups,key,status)=>{
  const row=groups[key]??=counter();
  row.catalog++;
  row[status]++;
};
export function auditCompleteness({catalog,officialRows,elementIndex,archiveFiles,inventory,mappingReview}){
  if(!catalog||typeof catalog!=='object'||Array.isArray(catalog))throw Error('Invalid Atlas catalog');
  if(!Array.isArray(inventory?.converted)||inventory.approvedForCommercialDistribution!==false||
    inventory.geometryRegisteredToMEDCOEL!==false)throw Error('Expected rights-blocked private source manifest');
  checkArchiveEntryNames(archiveFiles);
  const mapped=mapActualMeshFiles(candidateCrosswalk(catalog,officialRows),elementIndex,archiveFiles);
  const converted=new Map(),seenIds=new Set(),errors=[];
  for(const item of inventory.converted){
    if(converted.has(item.name)||seenIds.has(item.id))errors.push('duplicate source model: '+item.name);
    if(!catalog[item.name])errors.push('model outside catalog: '+item.name);
    if(!/^FMA\d+$/.test(item.fmaId||'')||!/^BP\d+$/.test(item.bpId||'')||
       !/^\.\/structures\/[a-z0-9-]+\/model\.glb$/.test(item.modelPath||''))
      errors.push('invalid model path/identity: '+item.name);
    converted.set(item.name,item);seenIds.add(item.id);
  }
  const suggestions=new Map((mappingReview?.queue||[]).map(row=>[row.name,row.suggestions?.[0]||null]));
  const systems={},regions={},groups={},structures=[],convertedIdentities=new Set();
  for(const row of mapped.candidates){
    const meta=catalog[row.atlasName], model=converted.get(row.atlasName);
    const official=row.matches.length===1?row.matches[0]:null;
    const allFiles=!!official&&official.sourceObjs.length>0&&official.sourceObjs.every(x=>x.fileId&&x.archivePath);
    let status='unmatched';
    if(model){
      status='converted';
      const exactMatch=row.matches.some(x=>x.fmaId===model.fmaId&&x.bpId===model.bpId);
      const reviewedIdentity=model.mappingMethod==='explicit-reviewed-FMA-BP-FJ-not-clinically-validated' &&
        /^[a-f0-9]{64}$/.test(model.reviewManifestSHA256||'') &&
        officialRows.some(x=>x.fmaId===model.fmaId&&x.bpId===model.bpId);
      // Reuse the EXACT same source identity/laterality guard as the conversion
      // selector. Official BodyParts3D names may use .l/.r suffixes instead of
      // English left/right; a raw-word-only audit incorrectly rejects valid
      // source-side representations even when the converter checked them.
      const provisionalIdentity=inventory.provisionalSource===true &&
        model.mappingMethod==='provisional-name-review-NOT-validated' &&
        officialRows.some(x=>x.fmaId===model.fmaId && x.bpId===model.bpId &&
          provisionalIdentityIssues(row.atlasName,x.name).length===0);
      if(!exactMatch&&!reviewedIdentity&&!provisionalIdentity)
        errors.push('source identity not corroborated by official mapping, reviewer or private provisional record: '+row.atlasName);
      convertedIdentities.add(model.fmaId+'|'+model.bpId);
    }else if(row.matches.length>1)status='ambiguous';
    else if(official)status=allFiles?'exactNotConverted':'missingOBJ';
    const suggest=suggestions.get(row.atlasName);
    const record={name:row.atlasName,system:row.atlasSystem,group:meta.group||'unassigned',
      regions:Array.isArray(meta.regions)?meta.regions:[],
      status,fmaId:model?.fmaId||official?.fmaId||null,bpId:model?.bpId||official?.bpId||null,
      officialName:official?.officialName||
        (model?officialRows.find(x=>x.fmaId===model.fmaId&&x.bpId===model.bpId)?.name:null)||null,
      sourceElements:official?.sourceObjs.map(x=>x.fileId)||[],allSourceOBJPresent:allFiles,
      modelPath:model?.modelPath||null,mappingMethod:model?.mappingMethod||null,
      reviewManifestSHA256:model?.reviewManifestSHA256||null,
      triangles:model?.triangles??null,sourceMeshCount:model?.sourceMeshes??null,
      geometryFlags:model?.diagnostics?.flags||[],
      omittedZeroAreaTriangles:model?.omittedZeroAreaTriangles||0,
      lateralityBoundsReview:model?.boundsNative?.center?.length===3 && (
        (/\.l$/.test(row.atlasName)&&model.boundsNative.center[0]<-5)||
        (/\.r$/.test(row.atlasName)&&model.boundsNative.center[0]>5))?'CHECK_LEFT_RIGHT_BOUNDS':null,
      sourceGeometryValidated:false,distributionApproved:false,
      suggestedIdentity:suggest?{name:suggest.officialName,fmaId:suggest.fmaId,bpId:suggest.bpId,
        confidence:suggest.confidence,sourceElementIds:suggest.sourceElementIds,
        warnings:suggest.warnings,approved:false}:null};
    structures.push(record);
    include(systems,record.system,status);include(groups,record.group,status);
    for(const region of record.regions)include(regions,region,status);
  }
  const archiveIds=new Set(archiveFiles.filter(x=>/\.obj$/i.test(x))
    .map(x=>path.basename(x,path.extname(x)).toUpperCase()));
  const unlinkedOfficial=officialRows.filter(row=>{
    if(convertedIdentities.has(row.fmaId+'|'+row.bpId))return false;
    const fj=[...(elementIndex.get(row.fmaId)||[])];
    return fj.length>0&&fj.every(x=>archiveIds.has(x.toUpperCase()));
  }).map(({name,fmaId,bpId})=>({name,fmaId,bpId}));
  for(const group of [systems,groups,regions])for(const r of Object.values(group))
    r.coveragePercent=pct(r.converted,r.catalog);
  if(structures.length!==Object.keys(catalog).length)errors.push('catalog names silently omitted');
  if(structures.filter(r=>r.status==='converted').length!==converted.size)errors.push('converted count mismatch');
  const missing=structures.filter(r=>r.status!=='converted');
  return {schemaVersion:1,status:errors.length?'AUDIT_ERRORS':'PRIVATE_REVIEW_UNVALIDATED',
    summary:{catalogCount:structures.length,converted:converted.size,missing:missing.length,
      coveragePercent:pct(converted.size,structures.length),
      exactNameNotConverted:missing.filter(r=>r.status==='exactNotConverted').length,
      unmatched:missing.filter(r=>r.status==='unmatched').length,
      ambiguous:missing.filter(r=>r.status==='ambiguous').length,
      missingOBJ:missing.filter(r=>r.status==='missingOBJ').length,
      unlinkedOfficialRepresentationsWithOBJ:unlinkedOfficial.length,
      geometryAnatomyValidated:0,commercialReleaseApproved:0},
    systems,groups,regions,structures,unlinkedOfficial,errors,
    notice:'Counts measure Atlas catalogue mapping, not complete human anatomy. Fuzzy suggestions are never verified matches. No data or asset release authorization.'};
}
export function structureCsv(report){
  return ['atlasName,system,group,regions,status,FMA,BP,sourceFJ,sourceOBJcomplete,reviewCandidate,reviewFMA,reviewBP,reviewConfidence,approved',
    ...report.structures.map(r=>[r.name,r.system,r.group,r.regions.join('|'),r.status,r.fmaId,r.bpId,
      r.sourceElements.join('|'),r.allSourceOBJPresent,r.suggestedIdentity?.name,
      r.suggestedIdentity?.fmaId,r.suggestedIdentity?.bpId,r.suggestedIdentity?.confidence,'false'].map(CSV).join(','))].join('\n')+'\n';
}
export async function runAudit({root=ROOT,source=path.join(PRIVATE,'bp3d-4.0'),
  batch=path.join(PRIVATE,'bp3d-batch'),output=path.join(PRIVATE,'bp3d-completeness'),checkGeometry=true}={}){
  const base=path.resolve(root,'local-data')+path.sep;
  if(![source,batch,output].every(x=>path.resolve(x).startsWith(base)))
    throw Error('All source and output paths must be under local-data');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'apps/anatomy/public/data/atlas-catalog.json'),'utf8'));
  const officialRows=parseOfficialNames(fs.readFileSync(path.join(source,'isa_parts_list_e.txt'),'utf8'));
  const elementIndex=parseOfficialElements(fs.readFileSync(path.join(source,'isa_element_parts.txt'),'utf8'));
  const inventory=JSON.parse(fs.readFileSync(path.join(batch,'inventory.json'),'utf8'));
  const mappingReview=JSON.parse(fs.readFileSync(path.join(batch,'mapping-review.json'),'utf8'));
  const archiveFiles=execFileSync('unzip',['-Z','-1',path.join(source,'isa_BP3D_4.0_obj_99.zip')],
    {encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
  const report=auditCompleteness({catalog,officialRows,elementIndex,archiveFiles,inventory,mappingReview});
  const actualHashes={namesSha256:createHash('sha256').update(fs.readFileSync(path.join(source,'isa_parts_list_e.txt'))).digest('hex'),
    elementsSha256:createHash('sha256').update(fs.readFileSync(path.join(source,'isa_element_parts.txt'))).digest('hex')};
  const archiveHash=createHash('sha256');
  for await(const chunk of createReadStream(path.join(source,'isa_BP3D_4.0_obj_99.zip')))archiveHash.update(chunk);
  actualHashes.archiveSha256=archiveHash.digest('hex');
  report.sourceHashes=actualHashes;
  for(const [key,value] of Object.entries(actualHashes))
    if(inventory.sourceHashes?.[key]!==value)report.errors.push('Source hash mismatch: '+key);
  // Cross-check ALL converted objects against the COMPLETE authoritative FJ element table.
  // An existing GLB with one missing sub-element is not "complete" just because it renders.
  const paths=new Set(archiveFiles);
  for(const item of inventory.converted){
    if(!/^[a-z0-9-]+$/.test(item.id||'')){report.errors.push('Unsafe converted ID: '+item.name);continue;}
    try{
      const lineage=JSON.parse(fs.readFileSync(path.join(batch,'structures',item.id,'lineage.json'),'utf8'));
      if(lineage.atlasCandidateName!==item.name||lineage.officialFMAId!==item.fmaId||
         lineage.officialRepresentationId!==item.bpId||lineage.archiveSHA256!==actualHashes.archiveSha256||
         lineage.generatedGLBSHA256!==item.glbSha256||
         lineage.geometryAnatomyValidated!==false||lineage.approvedForDistribution!==false)
        report.errors.push('Lineage identity/source rights mismatch: '+item.name);
      const required=[...(elementIndex.get(item.fmaId)||[])].sort();
      const actual=(lineage.elements||[]).map(e=>e.id).sort();
      if(!required.length||required.length!==actual.length||required.some((id,i)=>id!==actual[i]))
        report.errors.push('Official source FJ sub-elements missing or substituted: '+item.name);
      for(const e of lineage.elements||[]){
        if(!paths.has(e.zipEntry)||path.basename(e.zipEntry)!==e.id+'.obj'||!/^[a-f0-9]{64}$/.test(e.sha256||''))
          report.errors.push('Unsafe/missing archive FJ element lineage: '+item.name+' '+e.id);
      }
    }catch(error){report.errors.push('Could not verify FJ lineage for '+item.name+': '+error.message);}
  }
  if(checkGeometry){
    report.integrity=await auditGeneratedBatch(batch);
    report.errors.push(...report.integrity.errors);
  }
  if(report.errors.length)report.status='AUDIT_ERRORS';
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'full-audit.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(output,'all-structures.csv'),structureCsv(report));
  fs.writeFileSync(path.join(output,'unlinked-official.csv'),['FMA,BP,officialName',
    ...report.unlinkedOfficial.map(row=>[row.fmaId,row.bpId,row.name].map(CSV).join(','))].join('\n')+'\n');
  const triage=buildAllSystemsTriage(report,mappingReview);
  fs.writeFileSync(path.join(output,'priority-review.json'),JSON.stringify(triage,null,2)+'\n');
  fs.writeFileSync(path.join(output,'priority-review.csv'),triageCsv(triage));
  const focus=buildVisibleGapReview(report,triage);
  fs.writeFileSync(path.join(output,'focus-gaps.json'),JSON.stringify(focus,null,2)+'\n');
  fs.writeFileSync(path.join(output,'focus-gaps.csv'),visibleGapCsv(focus));
  fs.writeFileSync(path.join(output,'focus-gaps.md'),visibleGapMarkdown(focus));
  const leads=discoverFocusSources({focus,officialRows,elements:elementIndex,archiveFiles,
    converted:inventory.converted,archiveSha256:actualHashes.archiveSha256});
  fs.writeFileSync(path.join(output,'official-source-leads.json'),JSON.stringify(leads,null,2)+'\n');
  fs.writeFileSync(path.join(output,'official-source-leads.csv'),officialLeadCsv(leads));
  fs.writeFileSync(path.join(output,'converted-geometry-review.csv'),geometryCsv(triage));
  fs.writeFileSync(path.join(output,'unapproved-identity-template.json'),
    JSON.stringify(unapprovedTemplate(triage,actualHashes.archiveSha256),null,2)+'\n');
  const summary=[
    '# Full BodyParts3D coverage review — original MEDCOEL Atlas UI unchanged',
    '', '| System | Catalog | Converted | Missing | Coverage |','|---|---:|---:|---:|---:|',
    ...Object.entries(report.systems).sort((a,b)=>a[0].localeCompare(b[0])).map(([key,r])=>
      '| '+key+' | '+r.catalog+' | '+r.converted+' | '+(r.catalog-r.converted)+' | '+r.coveragePercent+'% |'),
    '', 'Unconverted: '+report.summary.missing+'; exact source not yet converted: '+report.summary.exactNameNotConverted+
       '; fuzzy/review-only: '+report.summary.unmatched+'; ambiguous: '+report.summary.ambiguous+
       '; missing official OBJ: '+report.summary.missingOBJ+'.',
    'Integrity errors: '+report.errors.length+'.',
    'Human review candidates (not approvals): '+JSON.stringify(triage.summary.byTier)+'.',
    'Converted geometry with diagnostic flags: '+triage.summary.sourceGeometryFlagged+'.',
    '', 'No suggested FMA/BP identity, mesh, clinical geometry, or commercial distribution has been approved.',
    'See focus-gaps.md/csv/json for targeted digiti minimi (hand/foot), nasal, spine, sternum and visceral coverage without inventing geometry.',
    'See official-source-leads.csv/json for all unapproved official FMA/BP/FJ OBJ leads for these missing structures. No lead is converted automatically.',
    'See priority-review.csv, converted-geometry-review.csv and unapproved-identity-template.json for the next clinical review.',
    'See all-structures.csv for every catalog item and unlinked-official.csv for official objects not mapped to Atlas.'
  ].join('\n')+'\n';
  fs.writeFileSync(path.join(output,'SUMMARY.md'),summary);
  console.log(JSON.stringify({status:report.status,summary:report.summary,triage:triage.summary,errors:report.errors.slice(0,25),
    output},null,2));
  if(report.errors.length)process.exitCode=1;
  return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{const reviewed=process.argv.includes('--reviewed'),provisional=process.argv.includes('--provisional');
    if(reviewed&&provisional)throw Error('Choose only one private source audit');
    const sourceType=provisional?'provisional':reviewed?'reviewed':'baseline';
    await runAudit({checkGeometry:!process.argv.includes('--skip-geometry'),
      batch:path.join(PRIVATE,sourceType==='baseline'?'bp3d-batch':'bp3d-'+sourceType),
      output:path.join(PRIVATE,sourceType==='baseline'?'bp3d-completeness':'bp3d-completeness-'+sourceType)});}
  catch(error){console.error('BP3D_FULL_AUDIT_FAILED: '+error.message);process.exitCode=1;}
}
