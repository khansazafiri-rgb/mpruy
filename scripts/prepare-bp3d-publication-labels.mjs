// Publisher-name and attribution review from an existing exact-source geometry report.
// Does not change the original inventory, model bytes, or release gate.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseOfficialNames,parseOfficialElements} from '../licensing/tools/prepare-bodyparts3d-source.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const sha=b=>createHash('sha256').update(b).digest('hex');
const hex=/^[a-f0-9]{64}$/;
const attribution='BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
const url='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function safe(dir,rel){
 const p=path.resolve(dir,rel);assert(p.startsWith(dir+path.sep)&&fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe local file');return p;
}
export function publisherLabel(row,names,elements){
 assert(['EXACT_RAW_GEOMETRY_MATCH','EXACT_RAW_GEOMETRY_MATCH_LABEL_REVIEW'].includes(row.status)&&row.approvedForDistribution===false&&hex.test(row.sha256||''),'Unverified geometry');
 const hits=names.filter(n=>n.fmaId===row.fmaId&&n.bpId===row.bpId);
 assert(hits.length===1&&typeof hits[0].name==='string'&&hits[0].name.trim(),'Publisher identity ambiguous');
 const ids=[...(elements.get(row.fmaId)||[])],proof=row.sourceElements||[];
 assert(ids.length>0&&ids.length===proof.length&&new Set(proof.map(p=>p.id)).size===ids.length&&proof.every(p=>ids.includes(p.id)&&hex.test(p.sha256||'')),'Publisher element identity mismatch');
 return {id:row.id,displayName:hits[0].name,previousName:row.name,previousLabelVerified:row.displayIdentityVerified===true,fmaId:row.fmaId,bpId:row.bpId,tree:row.tree,sha256:row.sha256,
  sourceElements:proof,sourceHashes:row.sourceHashes,sourceReceipts:row.sourceReceipts,sourceArchive:url+row.tree+'_BP3D_4.0_obj_99.zip',
  license:'CC-BY-4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',licenseEvidence:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',datasetReadme:url+'README_e.html',
  attribution,changes:'Source OBJ elements converted to GLB; zero-area triangles may have been omitted. Native source frame preserved.',
  historicalNotice:'Retain original CC BY-SA 2.1 Japan notices; record reconciliation before distribution.',
  publisherReceiptComplete:row.publisherReceiptComplete===true,registrationValidated:false,clinicalValidation:false,approvedForDistribution:false};
}
export function prepare(folder){
 assert(/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(folder)&&fs.realpathSync(q)===q);
 const dir=path.join(q,folder);assert(fs.realpathSync(dir)===dir);
 const pack=path.join(dir,'pack'),reportPath=safe(dir,'publication-bp3d-geometry-evidence.json'),report=read(reportPath),inv=read(safe(pack,'inventory.json'));
 assert(report.publicRelease==='NO_GO'&&report.approved===0&&inv.approvedForCommercialDistribution===false&&report.total===inv.converted.length);
 const byId=new Map(inv.converted.map(e=>[e.id,e]));assert(byId.size===inv.converted.length&&report.rows.length===byId.size);
 const sources=new Map(),seen=new Set(),rows=[],held=[];
 for(const row of report.rows){
  try{
   assert(/^[a-z0-9-]+$/.test(row.id||'')&&!seen.has(row.id));seen.add(row.id);
   const e=byId.get(row.id);assert(e&&e.name===row.name&&e.fmaId===row.fmaId&&e.bpId===row.bpId&&e.glbSha256===row.sha256&&e.modelPath==='./structures/'+e.id+'/model.glb');
   assert(sha(fs.readFileSync(safe(pack,e.modelPath)))===row.sha256,'GLB changed since geometry audit');
   assert(['isa','partof'].includes(row.tree));
   if(!sources.has(row.tree)){
    const source=path.join(q,row.tree==='isa'?'bp3d-4.0':'bp3d-4.0-partof');assert(fs.realpathSync(source)===source);
    const names=fs.readFileSync(safe(source,row.tree+'_parts_list_e.txt')),elements=fs.readFileSync(safe(source,row.tree+'_element_parts.txt'));
    sources.set(row.tree,{names:parseOfficialNames(names.toString('utf8')),elements:parseOfficialElements(elements.toString('utf8')),hashes:{names:sha(names),elements:sha(elements)}});
   }
   const s=sources.get(row.tree);assert(s.hashes.names===row.sourceHashes?.names&&s.hashes.elements===row.sourceHashes?.elements,'Publisher tables changed');
   const label=publisherLabel(row,s.names,s.elements);
   rows.push(label);
  }catch(error){held.push({id:row.id,reason:String(error.message)});}
 }
 const counts=new Map();for(const r of rows){const k=r.displayName.toLowerCase().trim();counts.set(k,(counts.get(k)||0)+1);}
 // Names shared by multiple representations remain disambiguated by FMA/BP/tree.
 for(const r of rows)r.labelAmbiguous=counts.get(r.displayName.toLowerCase().trim())>1;
 const result={schema:1,scope:'Publisher labels and attribution draft, not commercial approval',sourceAuditSHA256:sha(fs.readFileSync(reportPath)),total:report.total,publisherLabels:rows.length,previousAliasesNotVerified:rows.filter(r=>!r.previousLabelVerified).length,
  ambiguousNames:rows.filter(r=>r.labelAmbiguous).length,completeReceipts:rows.filter(r=>r.publisherReceiptComplete).length,held,rows,approved:0,publicRelease:'NO_GO'};
 const out=path.join(dir,'publication-bp3d-publisher-labels.json'),tmp=out+'.'+randomUUID()+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(tmp,out);
 console.log('BP3D PUBLISHER LABELS',JSON.stringify({...result,rows:undefined,held:held.slice(0,10),file:out}));
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url))prepare(process.argv[2]||'');
