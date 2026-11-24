// Rapid source reconnaissance reuses the last PASSING private 584-model audit.
// Does not redo GLB conversion, scan geometry or approve publisher identities.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseOfficialNames,parseOfficialElements,checkArchiveEntryNames}
 from '../../../licensing/tools/prepare-bodyparts3d-source.mjs';
import {discoverFocusSources,officialLeadCsv}
 from './bp3d-focus-official-source-leads.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const LOCAL=path.join(ROOT,'local-data/licensing-quarantine');
const SOURCE=path.join(LOCAL,'bp3d-4.0');
const BATCH=path.join(LOCAL,'bp3d-provisional');
const AUDIT=path.join(LOCAL,'bp3d-completeness-provisional');
const digest=x=>createHash('sha256').update(x).digest('hex');

export function checkCachedSourceReview({report,focus,inventory,namesBytes,elementsBytes}){
 if(report?.status!=='PRIVATE_REVIEW_UNVALIDATED'||report?.errors?.length||
   report?.summary?.converted!==inventory?.converted?.length||
   report?.summary?.converted!==focus?.rows?.filter(x=>x.status==='converted').length
      +report?.summary?.converted-focus?.rows?.filter(x=>x.status==='converted').length ||
   focus?.reviewOnly!==true||inventory?.approvedForCommercialDistribution!==false ||
   inventory?.geometryRegisteredToMEDCOEL!==false ||
   report?.sourceHashes?.archiveSha256!==inventory?.sourceHashes?.archiveSha256)
   throw Error('A prior passing, rights-blocked private full audit is required');
 if(digest(namesBytes)!==report.sourceHashes.namesSha256||
    digest(elementsBytes)!==report.sourceHashes.elementsSha256)
   throw Error('Publisher FMA/BP/FJ text tables changed after the last full audit');
 return true;
}
export function runFocusedSourceReview(){
 for(const dir of [SOURCE,BATCH,AUDIT])
   if(fs.lstatSync(dir).isSymbolicLink())throw Error('Symlinked review source directory refused');
 const report=JSON.parse(fs.readFileSync(path.join(AUDIT,'full-audit.json'),'utf8'));
 const focus=JSON.parse(fs.readFileSync(path.join(AUDIT,'focus-gaps.json'),'utf8'));
 const inventory=JSON.parse(fs.readFileSync(path.join(BATCH,'inventory.json'),'utf8'));
 const names=fs.readFileSync(path.join(SOURCE,'isa_parts_list_e.txt'));
 const elements=fs.readFileSync(path.join(SOURCE,'isa_element_parts.txt'));
 checkCachedSourceReview({report,focus,inventory,namesBytes:names,elementsBytes:elements});
 const archiveFiles=execFileSync('unzip',['-Z','-1',path.join(SOURCE,'isa_BP3D_4.0_obj_99.zip')],
    {encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
 checkArchiveEntryNames(archiveFiles);
 const findings=discoverFocusSources({focus,officialRows:parseOfficialNames(names.toString('utf8')),
  elements:parseOfficialElements(elements.toString('utf8')),archiveFiles,
  converted:inventory.converted,archiveSha256:report.sourceHashes.archiveSha256});
 fs.writeFileSync(path.join(AUDIT,'official-source-leads.json'),JSON.stringify(findings,null,2)+'\n');
 fs.writeFileSync(path.join(AUDIT,'official-source-leads.csv'),officialLeadCsv(findings));
 console.log(JSON.stringify({status:findings.status,summary:findings.areas,
   missingFocusedStructures:findings.structures.length,convertedNewModels:0,
   releaseApproved:false,files:['official-source-leads.csv','official-source-leads.json']},null,2));
 return findings;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{runFocusedSourceReview();}
 catch(err){console.error('BP3D_OFFICIAL_SOURCE_LEADS_FAILED: '+err.message);process.exitCode=1;}
}
