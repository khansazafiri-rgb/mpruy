// Source-qualified HRA ASCT+B hierarchy, not geometry, registration or confirmed flow direction.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const quarantine=path.join(root,'local-data/licensing-quarantine');
const revision='27d6d493cd53761abb10f087767ec4cc74acb051';
const directory='digital-objects/asct-b/lymph-vasculature/v1.5/raw/';
const origin='https://raw.githubusercontent.com/hubmapconsortium/hra-kg/'+revision+'/'+directory;
export const source=Object.freeze({revision,version:'v1.5',doi:'https://doi.org/10.48539/HBM622.PDVS.333',license:'CC BY 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',creators:['Dhruv Singhal','Maxim Itkin','Avinash Boppana'],publisher:'HuBMAP',files:[{name:'asct-b-vh-lymph-vasculature.csv',bytes:63716,blob:'1eab86d50aeba777884e493a79d48a8a3e650d30'},{name:'metadata.yaml',bytes:2623,blob:'8e2014a75ae841a8fe6aecb107ac463a15ef569c'}]});
const sha=b=>createHash('sha256').update(b).digest('hex');
function gitBlob(b){return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
export function parseCSV(s){
 assert(typeof s==='string'&&s.length<=128*1024);s=s.replace(/^\uFEFF/,'');
 const rows=[];let row=[],value='',quoted=false,closed=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(closed&&c!==','&&c!=='\r'&&c!=='\n')throw Error('Unexpected character after CSV quotation');
  if(c==='"'){assert(!value.length&&!closed,'Unexpected quote');quoted=true;}
  else if(c===','){row.push(value);value='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';closed=false;}
  else value+=c;
 }
 assert(!quoted,'Unclosed CSV quote');if(row.length||value||closed)rows.push([...row,value]);return rows;
}
export function parseHierarchy(text){
 const rows=parseCSV(text),i=rows.findIndex(r=>r[0]==='AS/1');assert(i>=0);
 const header=rows[i],levels=10;assert.equal(header.length,43);
 for(let n=1;n<=levels;n++)assert.deepEqual(header.slice(3*(n-1),3*n),['AS/'+n,'AS/'+n+'/LABEL','AS/'+n+'/ID']);
 const paths=[],unique=new Map(),edges=new Set(),pathKeys=new Set(),ids=new Set();let missingIdOccurrences=0,pathsWithMissingId=0,maxDepth=0;
 for(const [j,row] of rows.slice(i+1).entries()){
  if(!row.some(v=>v.trim()))continue;assert.equal(row.length,header.length,'CSV width differs');
  const terms=[];let gap=false,missing=false;
  for(let k=0;k<levels*3;k+=3){const [name,label,id]=row.slice(k,k+3).map(x=>x.trim());
   if(!name){assert(!label&&!id,'Label or ID without source structure');gap=true;continue;}
   assert(!gap&&name.length<=400&&label.length<=400,'Noncontiguous structure path');
   assert(!id||/^(FMA|UBERON):[0-9]+$/.test(id),'Unexpected ontology identifier');
   const node={name,label:label||null,ontologyId:id||null};const prev=unique.get(name);
   if(prev)assert.deepEqual(prev,node,'Source-name mapping conflicts');else unique.set(name,node);
   if(id)ids.add(id);else{missing=true;missingIdOccurrences++;}
   if(terms.length)edges.add(JSON.stringify([terms.at(-1).name,name]));terms.push(node);
  }
  assert(terms.length>=2&&terms[0].name==='lymph vasculature'&&terms[0].ontologyId==='UBERON:0004536','Unexpected root');
  const key=JSON.stringify(terms.map(t=>t.name));assert(!pathKeys.has(key),'Duplicate source path');pathKeys.add(key);
  paths.push({sourceRecord:i+j+2,terms});if(missing)pathsWithMissingId++;maxDepth=Math.max(maxDepth,terms.length);
 }
 return {paths,counts:{paths:paths.length,uniqueSourceNames:unique.size,uniqueOntologyIds:ids.size,sourceNamesWithMissingOntologyId:[...unique.values()].filter(x=>!x.ontologyId).length,missingIdOccurrences,pathsWithMissingId,maxDepth,uniqueAdjacentNamePairs:edges.size}};
}
export function auditHierarchy(csv,metadata){
 for(const [i,b] of [csv,metadata].entries()){const f=source.files[i];assert(Buffer.isBuffer(b)&&b.length===f.bytes&&gitBlob(b)===f.blob,'Pinned source blob differs');}
 const meta=metadata.toString('utf8');
 for(const token of [source.doi,source.licenseURL,'publisher: HuBMAP',...source.creators.map(c=>'fullName: '+c)])assert(meta.includes(token),'Source metadata changed');
 const text=csv.toString('utf8');assert(text.includes('Version Number:,v1.5,')&&text.includes('Data DOI:,'+source.doi+','));
 const result=parseHierarchy(text);
 assert.deepEqual(result.counts,{paths:121,uniqueSourceNames:122,uniqueOntologyIds:46,sourceNamesWithMissingOntologyId:72,missingIdOccurrences:175,pathsWithMissingId:74,maxDepth:10,uniqueAdjacentNamePairs:121});
 return {schema:1,source:{...source,files:source.files.map((f,i)=>({...f,url:origin+f.name,sha256:sha([csv,metadata][i])}))},scope:'Exact published nested structure paths. Adjacent name pairs are not validated flow edges. Missing ontology IDs and source qualifiers remain unchanged.',...result,clinicalValidation:false,registrationValidated:false,geometryVerified:false,flowDirectionValidated:false,approvedForDistribution:false,publicRelease:'NO_GO'};
}
async function fetchExact(f){const r=await fetch(origin+f.name,{redirect:'error',signal:AbortSignal.timeout(60000)});assert(r.ok&&r.url===origin+f.name&&r.body,'Pinned HRA source unavailable');const chunks=[];let n=0;for await(const b of r.body){n+=b.length;assert(n<=f.bytes);chunks.push(b);}const b=Buffer.concat(chunks);assert(b.length===f.bytes&&gitBlob(b)===f.blob);return b;}
function checkRoot(q){assert(path.basename(q)==='licensing-quarantine'&&fs.realpathSync(q)===q&&fs.statSync(q).isDirectory(),'Explicit private quarantine required');}
export function loadHierarchy(q,folder){checkRoot(q);assert(/^hra-lymphatic-hierarchy-[A-Za-z0-9_-]+$/.test(folder));const dir=path.join(q,folder);assert(fs.realpathSync(dir)===dir);const bytes=source.files.map(f=>{const p=path.join(dir,f.name);assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile()&&fs.statSync(p).size===f.bytes);return fs.readFileSync(p);});return auditHierarchy(...bytes);}
export async function stageHierarchy(q=quarantine){fs.mkdirSync(q,{recursive:true,mode:0o700});checkRoot(q);const bytes=await Promise.all(source.files.map(fetchExact)),report=auditHierarchy(...bytes);const folder=fs.mkdtempSync(path.join(q,'hra-lymphatic-hierarchy-'));fs.chmodSync(folder,0o700);for(const [i,f] of source.files.entries())fs.writeFileSync(path.join(folder,f.name),bytes[i],{flag:'wx',mode:0o600});return {folder:path.basename(folder),report};}
if(process.argv[1]===fileURLToPath(import.meta.url)){assert.deepEqual(process.argv.slice(2),['--stage-private']);const {folder,report}=await stageHierarchy();const replay=loadHierarchy(quarantine,folder);assert.deepEqual(replay,report);const {paths,...summary}=report;console.log('HRA LYMPHATIC HIERARCHY EXACT SOURCE PASS '+JSON.stringify({folder,...summary}));}
