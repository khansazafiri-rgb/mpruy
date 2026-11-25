// Re-obtain publisher bytes and compare hashes; never fabricate historic receipts or replace source assets.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createReadStream} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const base='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fileHash(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
function safe(dir,rel){const p=path.join(dir,rel);assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unsafe local file');return p;}
export function validateReceipt(r,url,hash,bytes){
 return r?.url===url&&r.sha256===hash&&r.bytes===bytes;
}
async function fetchDigest(url,limit){
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(300000),headers:{'Accept-Encoding':'identity'}});
 assert(response.ok&&response.url===url&&response.body,'Publisher fetch failed: '+response.status);
 const h=createHash('sha256');let bytes=0;
 for await(const b of response.body){bytes+=b.length;assert(bytes<=limit,'Publisher size limit exceeded');h.update(b);}
 assert(bytes>0,'Empty publisher response');return {sha256:h.digest('hex'),bytes};
}
// Use curl for large archives: visible progress, persistent private partial and exact
// byte comparison. A partial download is never used as a model or a receipt.
export function archiveTransferArgs(url,partial,expectedBytes){
 assert(/^https:\/\/dbarchive\.biosciencedbc\.jp\/data\/bodyparts3d\/LATEST\/(?:isa|partof)_BP3D_4\.0_obj_99\.zip$/.test(url),'Unrecognized publisher archive URL');
 assert(Number.isSafeInteger(expectedBytes)&&expectedBytes>0&&expectedBytes<=512*1024*1024,'Invalid archive size');
 return ['--disable','--fail','--show-error','--progress-bar','--proto','=https','--connect-timeout','30',
  '--max-time','1800','--speed-limit','1024','--speed-time','90','--max-filesize',String(expectedBytes),
  '--header','Accept-Encoding: identity','--continue-at','-','--output',partial,'--url',url];
}
async function fetchArchiveDigest(url,source,name,expectedBytes,expectedHash){
 const partial=path.join(source,name+'.publisher-verification.part');
 const lock=partial+'.lock';
 // Exclusive local lock prevents two verification processes touching the same partial.
 const fd=fs.openSync(lock,'wx',0o600);
 try{
  if(!fs.existsSync(partial))fs.closeSync(fs.openSync(partial,'wx',0o600));
  assert(fs.realpathSync(partial)===partial&&fs.lstatSync(partial).isFile(),'Unsafe verification partial');
  const size=fs.statSync(partial).size;
  assert(size<=expectedBytes,'Oversized verification partial');
  if(size<expectedBytes){
   console.log('PUBLISHER ARCHIVE RESUME',name,size+'/'+expectedBytes+' bytes');
   const proc=spawnSync('curl',archiveTransferArgs(url,partial,expectedBytes),{stdio:'inherit',timeout:1860000});
   if(proc.error)throw proc.error;
   assert(proc.status===0,'Publisher archive download incomplete (curl '+proc.status+'); existing partial retained for retry');
  }
  const result={bytes:fs.statSync(partial).size,sha256:await fileHash(partial)};
  assert(result.bytes===expectedBytes&&result.sha256===expectedHash,'Fresh publisher archive differs from audited cache; verification partial retained for review');
  return {...result,partial};
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
function atomic(p,d){
 const tmp=p+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(d,null,2)+'\n',{mode:0o600,flag:'wx'});
 try{fs.linkSync(tmp,p);}finally{fs.unlinkSync(tmp);}
}
export async function verifyReceipts(folder){
 assert(/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(folder)&&fs.realpathSync(q)===q);
 const dir=path.join(q,folder);assert(fs.realpathSync(dir)===dir);
 const labelFile=safe(dir,'publication-bp3d-publisher-labels.json'),labels=JSON.parse(fs.readFileSync(labelFile,'utf8'));
 assert(labels.publicRelease==='NO_GO'&&labels.approved===0&&labels.rows.length===labels.total,'Incomplete publisher labels');
 const report={schema:1,scope:'Publisher-byte verification as of current acquisition; not original download history',labelSHA256:sha(fs.readFileSync(labelFile)),sources:{},publicRelease:'NO_GO',approved:0};
 for(const tree of new Set(labels.rows.map(r=>r.tree))){
  assert(['isa','partof'].includes(tree));const source=path.join(q,tree==='isa'?'bp3d-4.0':'bp3d-4.0-partof');
  assert(fs.realpathSync(source)===source);
  const refs=labels.rows.filter(r=>r.tree===tree),files={archive:tree+'_BP3D_4.0_obj_99.zip',names:tree+'_parts_list_e.txt',elements:tree+'_element_parts.txt'};
  const rows=[];
  for(const [kind,name] of Object.entries(files)){
   try{
    const p=safe(source,name),digest=await fileHash(p),bytes=fs.statSync(p).size,url=base+name,receipt=p+'.receipt.json';
    assert(refs.every(r=>r.sourceHashes?.[kind]===digest),'Cached source differs from audited geometry');
    if(fs.existsSync(receipt)){
     const r=JSON.parse(fs.readFileSync(safe(source,name+'.receipt.json'),'utf8'));
     assert(validateReceipt(r,url,digest,bytes),'Existing receipt mismatch; do not overwrite');
     rows.push({kind,name,status:'EXISTING_RECEIPT_MATCH',sha256:digest,bytes,url});continue;
    }
    console.log('VERIFYING PUBLISHER BYTES',name,bytes);
    const remote=kind==='archive'?await fetchArchiveDigest(url,source,name,bytes,digest):await fetchDigest(url,8*1024*1024);
    assert(remote.sha256===digest&&remote.bytes===bytes,'Publisher bytes differ from cached source; keep original');
    assert(await fileHash(p)===digest,'Local source changed during verification');
    const r={url,sha256:digest,bytes,acquiredAt:new Date().toISOString(),method:'fresh-publisher-download-hash-compared-to-existing-cache',historicalAcquisitionVerified:false,approvedForDistribution:false};
    atomic(receipt,r);if(remote.partial)fs.unlinkSync(remote.partial);rows.push({kind,name,status:'FRESH_PUBLISHER_BYTES_MATCH',...r});
   }catch(e){rows.push({kind,name,status:'HOLD',reason:String(e.message)});}
  }
  report.sources[tree]={models:refs.length,files:rows,complete:rows.length===3&&rows.every(r=>r.status!=='HOLD')};
 }
 report.completeModels=Object.values(report.sources).reduce((n,r)=>n+(r.complete?r.models:0),0);
 report.total=labels.total;
 const out=path.join(dir,'publication-bp3d-receipt-verification-'+randomUUID()+'.json');
 atomic(out,report);console.log('BP3D RECEIPT VERIFICATION',JSON.stringify({...report,file:out}));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const r=await verifyReceipts(process.argv[2]||'');if(r.completeModels!==r.total)process.exitCode=1;}
