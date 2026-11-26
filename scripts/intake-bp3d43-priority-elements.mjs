// Private element acquisition, not whole-concept export or clinical validation.
// Do not run the third-party downloader or mix 4.3 into the 4.0 coordinate frame.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseObj,encodeNativeGlb} from './independent-bp3d-export.mjs';
import {parseNativePositions,comparePositions} from './audit-bp3d-publication-geometry.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const base='https://lifesciencedb.jp/bp3d';
const manifestURL=base+'/get-info.cgi?version=4.3&cmd=concept-objfiles-list';
const digest=b=>createHash('sha256').update(b).digest('hex');
export function parseMembership(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r\n|\r|\n/),rows=new Map(),all=new Set();
 for(const k of ['Data Version','Objects set'])assert(lines.some(s=>new RegExp('^#\\s*'+k+'\\s+4\\.3\\s*$').test(s)),'Missing version stamp');
 for(const l of lines){
  if(!l.trim()||l.trim().startsWith('#'))continue;
  const m=l.trim().match(/^(FMA\d+)\s+(is_a|part_of)\s+(FJ\d+[A-Za-z]?(?:\+FJ\d+[A-Za-z]?)*)$/);
  assert(m,'Unexpected source membership row');
  const ids=[...new Set(m[3].split('+'))].sort(),key=m[1]+':'+m[2];
  if(rows.has(key))assert.deepEqual(rows.get(key),ids);else rows.set(key,ids);
  for(const id of ids)all.add(id);
 }
 assert(all.size>0);return {rows,all};
}
export function validateCandidates(doc,catalog){
 assert(doc.sourceVersion==='4.3'&&doc.geometryVerified===false&&doc.publicRelease==='NO_GO'&&Array.isArray(doc.rows)&&doc.rows.length<=32);
 const seen=new Set();
 for(const r of doc.rows){
  assert(/^FJ\d+[A-Za-z]?$/.test(r.fj)&&/^BP\d+$/.test(r.bp)&&/^FMA\d+$/.test(r.fma)&&!seen.has(r.fj));
  assert(typeof r.name==='string'&&r.name.trim()&&Array.isArray(r.conceptMembership)&&r.conceptMembership.length>0);
  assert(catalog.all.has(r.fj)&&r.conceptMembership.every(t=>['is_a','part_of'].includes(t)&&catalog.rows.get(r.fma+':'+t)?.includes(r.fj)),'Publisher membership differs from candidate');
  seen.add(r.fj);
 }
 return doc.rows;
}
function download(url,file,extra=[]){
 execFileSync('curl',['--fail','--silent','--show-error','--proto','=https','--connect-timeout','20','--max-time','120','--max-filesize','33554432','--user-agent','MEDCOEL educational source provenance audit/1.0','--output',file,...extra,url],{stdio:['ignore','ignore','inherit']});
 assert(fs.statSync(file).size>0&&fs.statSync(file).size<=33554432);
}
function listing(file){return execFileSync('unzip',['-Z','-1',file],{encoding:'utf8',maxBuffer:1024*1024}).trim().split(/\r?\n/);}
export function validateZipEnvelope(file){
 const size=fs.statSync(file).size;
 assert(size>=22&&size<=33554432,'Publisher archive size invalid');
 const header=Buffer.alloc(4),fd=fs.openSync(file,'r');
 try{assert.equal(fs.readSync(fd,header,0,4,0),4);}finally{fs.closeSync(fd);}
 assert(header.equals(Buffer.from([0x50,0x4b,0x03,0x04])),'Publisher response is not a ZIP archive');
 const names=listing(file);
 assert(names.length>0&&names.length<=10000&&names.every(n=>n.length>0),'Publisher archive directory invalid');
 return names;
}
// Retry transport/ZIP-envelope failures and explicitly pinned manifest integrity.
// Candidate membership and model identity remain strict; no mirror or substitute.
export function downloadZipValidated(url,file,extra=[],{fetch=download,attempts=3,verify=null}={}){
 assert(Number.isInteger(attempts)&&attempts>=1&&attempts<=3);
 const part=file+'.partial';
 assert(!fs.existsSync(file),'Refusing to replace existing source archive');
 let failure;
 for(let i=1;i<=attempts;i++){
  try{
   fs.rmSync(part,{force:true});
   fetch(url,part,extra);
   const names=validateZipEnvelope(part);
   if(verify)verify(part,names);
   fs.renameSync(part,file);
   return names;
  }catch(e){
   failure=e;fs.rmSync(part,{force:true});
   console.warn('Publisher ZIP attempt '+i+'/'+attempts+' failed validation; no source bytes accepted.');
  }
 }
 throw new Error('Publisher ZIP unavailable after '+attempts+' bounded attempts',{cause:failure});
}

function safeMember(name){return typeof name==='string'&&name.split('/').every(p=>/^[A-Za-z0-9_ .()-]+$/.test(p)&&p!=='.'&&p!=='..');}
function member(file,name){assert(safeMember(name));return execFileSync('unzip',['-p',file,name],{maxBuffer:32*1024*1024});}
// Check pinned source bytes before accepting even a syntactically valid ZIP.
export function readPublisherManifest(file,names,expectedSHA256){
 assert.deepEqual(names,['FMA2Obj.txt']);
 const bytes=member(file,'FMA2Obj.txt');
 if(expectedSHA256!==undefined)assert(/^[a-f0-9]{64}$/.test(expectedSHA256)&&digest(bytes)===expectedSHA256,'Pinned publisher manifest differs; replay held');
 return {bytes,catalog:parseMembership(bytes.toString('utf8'))};
}
export function downloadPublisherManifest(url,file,extra=[],expectedSHA256,options={}){
 if(expectedSHA256!==undefined)assert(/^[a-f0-9]{64}$/.test(expectedSHA256),'Invalid expected publisher manifest hash');
 const names=downloadZipValidated(url,file,extra,{...options,verify:expectedSHA256===undefined?null:(part,entries)=>readPublisherManifest(part,entries,expectedSHA256)});
 return readPublisherManifest(file,names,expectedSHA256);
}
export function selectMember(names,r){
 const prefix=r.fj+'_'+r.bp+'_'+r.fma+'_';
 const matched=names.filter(n=>safeMember(n)&&path.posix.basename(n).startsWith(prefix)&&/\.obj$/i.test(n));
 assert(matched.length===1,'Expected one exact FJ/BP/FMA archive member; actual FJ paths: '+JSON.stringify(names.filter(n=>path.posix.basename(n).startsWith(r.fj+'_')).slice(0,6)).slice(0,600)+'; archive entry count: '+names.length);
 const normalize=s=>s.toLowerCase().replace(/_/g,' ').trim().replace(/\s+/g,' ');
 assert.equal(normalize(path.posix.basename(matched[0]).slice(prefix.length,-4)),normalize(r.name),'Publisher mesh label changed');
 return matched[0];
}
export function run(inputDoc=null,{allowHeld=false}={}){
 const local=path.join(root,'local-data');fs.mkdirSync(local,{recursive:true,mode:0o700});assert(fs.realpathSync(local)===local);
 const q=path.join(local,'licensing-quarantine');fs.mkdirSync(q,{mode:0o700,recursive:true});assert(fs.realpathSync(q)===q);
 const out=fs.mkdtempSync(path.join(q,'bp3d43-element-intake-'));fs.chmodSync(out,0o700);
 const doc=inputDoc||JSON.parse(fs.readFileSync(path.join(root,'licensing/atlas-publication/bp3d43-priority-element-candidates.json'),'utf8'));
 const cookie=path.join(out,'session.cookie'),viewer=base+'/?lng=en';
 const session=['--cookie',cookie,'--cookie-jar',cookie,'--referer',viewer,'--http1.1','--header','Accept-Encoding: identity'];
 // The initial HTML is not evidence; a broken viewer response must not prevent
 // a bounded attempt at the version-stamped manifest itself.
 fs.writeFileSync(cookie,'# Netscape HTTP Cookie File\n',{mode:0o600});
 try{download(viewer,path.join(out,'session.html'),session);}catch{console.warn('Viewer bootstrap unavailable; trying direct version-stamped manifest');}
 const manifestZip=path.join(out,'manifest.zip');const {bytes,catalog}=downloadPublisherManifest(manifestURL,manifestZip,session,doc.expectedManifestSHA256);
 const candidates=validateCandidates(doc,catalog),results=[];
 fs.writeFileSync(path.join(out,'FMA2Obj.txt'),bytes,{flag:'wx',mode:0o600});
 for(const r of candidates){
  const zip=path.join(out,r.fj+'.zip');
  try{
   const args=Object.entries({ids:JSON.stringify([r.fj]),rep_id:JSON.stringify([r.bp]),filename:r.fj,type:'art_file',all_downloads:'1'}).flatMap(([k,v])=>['--data-urlencode',k+'='+v]);
   const names=downloadZipValidated(base+'/download.cgi',zip,[...session,...args]);
   const name=selectMember(names,r),raw=member(zip,name),parsed=parseObj(raw.toString('utf8').replace(/\r\n|\r/g,'\n'));
   assert(parsed.positions.length>0&&parsed.positions.length%9===0);
   fs.writeFileSync(path.join(out,r.fj+'.obj'),raw,{flag:'wx',mode:0o600});
   const rawSHA256=digest(raw),glb=encodeNativeGlb([{id:r.fj,...parsed}],{fmaId:r.fma,bpId:r.bp,officialName:r.name,version:'4.3',scope:'SINGLE_SOURCE_ELEMENT',manifestSHA256:digest(bytes),sourceElements:[{id:r.fj,sha256:rawSHA256,zipEntry:name}]},'4.3');
   const replay=parseNativePositions(glb.bytes,'4.3');assert(replay.size===1&&comparePositions(parsed.positions,replay.get(r.fj)),'Geometry replay differs');
   fs.writeFileSync(path.join(out,r.fj+'.glb'),glb.bytes,{flag:'wx',mode:0o600});
   results.push({...r,status:'EXACT_SOURCE_ELEMENT_GEOMETRY_MATCH',archiveMember:name,rawSHA256,glbSHA256:glb.sha256,archiveSHA256:digest(fs.readFileSync(zip)),rawBytes:raw.length,triangles:parsed.positions.length/9,omitted:parsed.omitted});
  }catch(e){results.push({...r,status:'HOLD',reason:String(e.message)});}
 }
 const report={schema:1,version:'4.3',manifestURL,manifestSHA256:digest(bytes),manifestElements:catalog.all.size,results,parsed:results.filter(r=>r.status==='EXACT_SOURCE_ELEMENT_GEOMETRY_MATCH').length,held:results.filter(r=>r.status==='HOLD').length,clinicalValidation:false,registrationValidated:false,geometryPublished:0,publicRelease:'NO_GO',licenseReview:doc.licenseReview};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('BP3D43 PRIVATE ELEMENT INTAKE',JSON.stringify(report));
 fs.rmSync(cookie,{force:true});fs.rmSync(path.join(out,'session.html'),{force:true});
 if(!allowHeld)assert(report.parsed===candidates.length&&report.held===0,'One or more elements held; review report');return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))run();
