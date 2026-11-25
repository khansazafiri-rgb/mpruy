// Acquire per-version HRA publisher metadata from a pinned official HRA-KG commit.
// Strict subset parser: unfamiliar YAML or different asset filename stays on hold.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildHraRegistry} from './atlas-hra-private-reference.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const revision='27d6d493cd53761abb10f087767ec4cc74acb051';
const raw='https://raw.githubusercontent.com/hubmapconsortium/hra-kg/'+revision+'/digital-objects/ref-organ/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pattern=/^https:\/\/cdn\.humanatlas\.io\/digital-objects\/ref-organ\/([a-z0-9-]+)\/(v\d+\.\d+(?:\.\d+)?)\/assets\/([a-z0-9-]+\.glb)$/;
export function parsePublisherMetadata(yaml,source){
 const m=source.match(pattern);assert(m,'Unsupported asset URL');
 assert(typeof yaml==='string'&&yaml.length<262144&&!yaml.includes('\0'),'Invalid metadata');
 const blocks=new Map();let k=null;
 for(const line of yaml.split(/\r?\n/)){
  if(!line.trim()||line.startsWith('#'))continue;
  const field=line.match(/^([a-zA-Z_][a-zA-Z_0-9]*):(?: (.*))?$/);
  if(field){k=field[1];assert(!blocks.has(k),'Duplicate metadata field');blocks.set(k,{scalar:field[2]||'',lines:[]});}
  else {assert(k&&line.startsWith(' '),'Unfamiliar YAML layout');blocks.get(k).lines.push(line);}
 }
 const scalar=key=>{const b=blocks.get(key);assert(b&&!b.lines.length&&b.scalar.trim(),'Missing scalar '+key);return b.scalar.trim().replace(/^"([^"]+)"$/,'$1');};
 const license=blocks.get('license');
 assert(license&&['>-','>','|-','|',''].includes(license.scalar)&&license.lines.map(l=>l.trim()).join(' ')==='Creative Commons Attribution 4.0 International ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))','License requires manual review');
 const creators=blocks.get('creators');assert(creators&&!creators.scalar,'Unfamiliar creators');
 const names=[];
 for(const line of creators.lines){
  const match=line.match(/^  - fullName: ([^<>{}\[\]&*!]+)$/);
  if(match)names.push(match[1].trim());
  else assert(/^    (firstName|lastName|orcid): .+$/.test(line),'Unfamiliar creator metadata');
 }
 assert(names.length&&names.every(Boolean)&&new Set(names).size===names.length,'Missing/duplicate creator');
 const data=blocks.get('datatable');assert(data&&!data.scalar&&data.lines.every(l=>/^  - [A-Za-z0-9_.-]+$/.test(l)),'Unfamiliar asset table');
 const files=data.lines.map(l=>l.slice(4));
 assert(files.filter(f=>f===m[3]).length===1,'Exact published GLB filename absent; no guessed rename');
 const doi=scalar('doi');assert(/^https:\/\/doi\.org\/10\.\d{4,9}\/[A-Za-z0-9._-]+$/.test(doi),'Unrecognized DOI');
 assert(scalar('publisher')==='HuBMAP','Unreviewed publisher');
 return {id:m[1],version:m[2],assetURL:source,title:scalar('title'),publisher:'HuBMAP',creators:names,doi,license:'CC-BY-4.0',evidence:'https://github.com/hubmapconsortium/hra-kg/blob/'+revision+'/digital-objects/ref-organ/'+m[1]+'/'+m[2]+'/raw/metadata.yaml'};
}
async function download(url){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
 assert(r.ok&&r.url===url&&r.body,'Publisher metadata unavailable: '+r.status);
 const chunks=[];let n=0;for await(const b of r.body){n+=b.length;assert(n<=262144,'Metadata too large');chunks.push(b);}
 return Buffer.concat(chunks);
}
export async function acquireMetadata(){
 assert(fs.realpathSync(q)===q);
 const registry=await buildHraRegistry(q),out=fs.mkdtempSync(path.join(q,'hra-publisher-metadata-'));fs.chmodSync(out,0o700);
 const queue=[...registry.assets.values()],rows=[];
 await Promise.all(Array.from({length:4},async()=>{while(queue.length){
  const a=queue.shift(),source=a.public.source;
  try{
   const m=source.match(pattern);assert(m,'Unsupported source path');
   const url=raw+m[1]+'/'+m[2]+'/raw/metadata.yaml',bytes=await download(url),digest=sha(bytes);
   fs.writeFileSync(path.join(out,a.public.id+'.yaml'),bytes,{flag:'wx',mode:0o600});
   const proof=parsePublisherMetadata(bytes.toString('utf8'),source);
   const receiptPath=a.file+'.json';assert(fs.realpathSync(receiptPath)===receiptPath);
   const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
   assert(receipt.url===source&&Array.isArray(receipt.metadata)&&receipt.metadata.some(r=>r?.object?.file===source),'Exact API asset link absent');
   rows.push({...proof,cacheId:a.public.id,metadataSHA256:digest,metadataURL:url,publisherRevision:revision,sha256:receipt.sha256,status:'PUBLISHER_VERSION_METADATA_MATCHED',approvedForDistribution:false,registrationValidated:false,clinicalValidation:false});
  }catch(error){rows.push({cacheId:a.public.id,assetURL:source,status:'HOLD',reason:String(error.message),approvedForDistribution:false});}
 }}));
 rows.sort((a,b)=>a.cacheId.localeCompare(b.cacheId));
 const reasons={};for(const r of rows.filter(x=>x.status==='HOLD'))reasons[r.reason]=(reasons[r.reason]||0)+1;
 const report={schema:1,sourceRevision:revision,total:rows.length,matched:rows.filter(r=>r.status==='PUBLISHER_VERSION_METADATA_MATCHED').length,held:rows.filter(r=>r.status==='HOLD').length,holdReasons:reasons,blockedCache:registry.blocked,rows,approved:0,publicRelease:'NO_GO'};
 const f=path.join(out,'publication-hra-metadata-evidence.json');fs.writeFileSync(f,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('HRA PUBLISHER METADATA',JSON.stringify({...report,rows:undefined,file:f}));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await acquireMetadata();
