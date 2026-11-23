#!/usr/bin/env node
/**
 * PRIVATE source-archive manifest audit for the TotalSegmentator 2.0.1 small
 * dataset. A 3.2 GB ZIP is NOT extracted. All source files stay on the Mac.
 * Only structural counts and pseudonymous sample paths are recorded.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assessPublisherRecord } from './batch-alternative-resources.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = 'totalsegmentator-small-v201';
const BASE = path.join(ROOT, 'local-data/studio-resources/alternative-candidates');
const INPUT = path.join(BASE,SOURCE,'downloads','Totalsegmentator_dataset_small_v201.zip');
const REPORT = path.join(BASE,SOURCE,'archive-structure-audit.json');
const M = 1024 * 1024;

function assertPrivate(file) {
  const rel = path.relative(ROOT,file);
  if (rel.startsWith('..') || path.isAbsolute(rel) ||
      !file.startsWith(BASE+path.sep)) throw Error('CT_AUDIT_NOT_PRIVATE');
  let cur = ROOT;
  for(const part of rel.split(path.sep).filter(Boolean)){
    cur = path.join(cur,part);
    if(fs.lstatSync(cur,{throwIfNoEntry:false})?.isSymbolicLink())
      throw Error('CT_AUDIT_SYMLINK_REFUSED');
  }
}
function readAt(fd,size,start,bytes) {
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(bytes)||
     start<0||bytes<0||start+bytes>size||bytes>64*M)
    throw Error('CT_AUDIT_ZIP_OFFSET_INVALID');
  const b=Buffer.alloc(bytes);
  if(fs.readSync(fd,b,0,bytes,start)!==bytes)throw Error('CT_AUDIT_ZIP_SHORT_READ');
  return b;
}
function u64(b,offset){
  const n=b.readBigUInt64LE(offset);
  if(n>BigInt(Number.MAX_SAFE_INTEGER))throw Error('CT_AUDIT_ZIP64_UNSAFE_NUMBER');
  return Number(n);
}
const safeEntryName=n=>typeof n==='string'&&n.length>0&&n.length<=360&&
  !n.startsWith('/')&&!n.includes('\\')&&!n.includes('\0')&&
  !/^[A-Za-z]:/.test(n)&&
  n.split('/').filter(Boolean).every(x=>x!=='.'&&x!=='..'&&x.length<150);

export function listLocalZipEntries(file, {maxEntries=80000}={}){
  if(fs.lstatSync(file).isSymbolicLink())throw Error('CT_AUDIT_ZIP_SYMLINK');
  const fd=fs.openSync(file,'r');
  try{
    const size=fs.fstatSync(fd).size;
    if(size<22||size>8*1024**3)throw Error('CT_AUDIT_ZIP_SIZE_INVALID');
    const tailBytes=Math.min(size,65557);
    const tail=readAt(fd,size,size-tailBytes,tailBytes);
    let pos=-1;
    for(let k=tail.length-22;k>=0;k--)
      if(tail.readUInt32LE(k)===0x06054b50&&
        k+22+tail.readUInt16LE(k+20)===tail.length){pos=k;break;}
    if(pos<0)throw Error('CT_AUDIT_NO_EOCD');
    if(tail.readUInt16LE(pos+4)||tail.readUInt16LE(pos+6))
      throw Error('CT_AUDIT_MULTIDISK_ZIP');
    let count=tail.readUInt16LE(pos+10),
        cdBytes=tail.readUInt32LE(pos+12),
        cdOffset=tail.readUInt32LE(pos+16);
    if(count===0xffff||cdBytes===0xffffffff||cdOffset===0xffffffff){
      const eocdAbsolute=size-tailBytes+pos;
      const locator=readAt(fd,size,eocdAbsolute-20,20);
      if(locator.readUInt32LE(0)!==0x07064b50)throw Error('CT_AUDIT_MISSING_ZIP64_LOCATOR');
      if(locator.readUInt32LE(16)!==1)throw Error('CT_AUDIT_ZIP64_MULTIDISK');
      const zip64=readAt(fd,size,u64(locator,8),56);
      if(zip64.readUInt32LE(0)!==0x06064b50)throw Error('CT_AUDIT_BAD_ZIP64_RECORD');
      count=u64(zip64,32);cdBytes=u64(zip64,40);cdOffset=u64(zip64,48);
    }
    if(count<1||count>maxEntries||cdBytes>64*M||cdBytes<46||
       cdOffset+cdBytes>size)throw Error('CT_AUDIT_ZIP_INDEX_TOO_LARGE');
    const cd=readAt(fd,size,cdOffset,cdBytes);
    let p=0;
    const rows=[], unique=new Set();
    for(let i=0;i<count;i++){
      if(p+46>cd.length||cd.readUInt32LE(p)!==0x02014b50)
        throw Error('CT_AUDIT_BAD_CENTRAL_HEADER');
      const flags=cd.readUInt16LE(p+8),method=cd.readUInt16LE(p+10);
      const compressed=cd.readUInt32LE(p+20),uncompressed=cd.readUInt32LE(p+24);
      const nameLength=cd.readUInt16LE(p+28),extra=cd.readUInt16LE(p+30),
            comment=cd.readUInt16LE(p+32);
      const ext=(cd.readUInt32LE(p+38)>>>16)&0xf000;
      if(p+46+nameLength+extra+comment>cd.length||flags&1||
         ![0,8].includes(method)||ext===0xa000)
        throw Error('CT_AUDIT_ENCRYPTED_OR_UNSAFE_ZIP_MEMBER');
      const name=cd.toString('utf8',p+46,p+46+nameLength);
      if(!safeEntryName(name)||unique.has(name))
        throw Error('CT_AUDIT_DUPLICATE_OR_UNSAFE_PATH');
      unique.add(name);
      // The manifest only lists names, NOT archived patient data.
      rows.push({name,compressed,uncompressed,method});
      p+=46+nameLength+extra+comment;
    }
    if(p!==cdBytes)throw Error('CT_AUDIT_CENTRAL_INDEX_MISMATCH');
    return rows;
  }finally{fs.closeSync(fd);}
}

function inspectLayout(entries){
  const subjects=new Map();
  const recognized=/^((?:[^/]+\/){0,2})(s\d{3,6})\/(ct\.nii\.gz|segmentations\/([A-Za-z0-9_]+)\.nii\.gz)$/;
  let ctCount=0,masks=0;
  for(const e of entries){
    const m=recognized.exec(e.name);
    if(!m)continue;
    const id=m[2];let record=subjects.get(id);
    if(!record){record={id,ct:null,labels:[]};subjects.set(id,record);}
    if(m[3]==='ct.nii.gz'){
      if(record.ct)throw Error('CT_AUDIT_DUPLICATE_CT_SUBJECT');
      record.ct=e.name;ctCount++;
    }else{record.labels.push(m[4]);masks++;}
  }
  const ready=[...subjects.values()].filter(s=>s.ct&&s.labels.length);
  const relevant=['liver','spleen','kidney_left','kidney_right',
    'lung_upper_lobe_left','lung_upper_lobe_right','lung_lower_lobe_left',
    'lung_lower_lobe_right','aorta','heart','vertebrae_L1'];
  const found=Object.fromEntries(relevant.map(n=>[n,ready.filter(s=>s.labels.includes(n)).length]));
  return {subjectsDetected:subjects.size,ctVolumePaths:ctCount,
    structureMaskPaths:masks,matchedSubjectCount:ready.length,
    referenceOrganCoverageByMatchedSubjectCount:found,
    privateCandidates:ready.slice(0,4).map(x=>({
      subject:x.id,ctPath:x.ct,maskCount:x.labels.length,
      usefulLabels:relevant.filter(label=>x.labels.includes(label))
    }))};
}
export function buildArchiveAudit(entries){
  const layout=inspectLayout(entries);
  if(!layout.matchedSubjectCount)
    throw Error('CT_AUDIT_NO_MATCHED_CT_AND_MASKS');
  return {schema:'medcoel.private-totalseg-layout-audit.v1',
    source:SOURCE,archiveEntryCount:entries.length,
    ...layout,imagesDecoded:0,imagesPublished:0,
    clinicApproved:false,rightsApproved:false,privacyApproved:false,
    releaseEligible:false};
}
async function verifiedArchive(){
  assertPrivate(INPUT);
  const info=fs.lstatSync(INPUT);
  if(!info.isFile())throw Error('CT_AUDIT_SOURCE_NOT_REGULAR');
  const m=JSON.parse(fs.readFileSync(path.join(ROOT,
    'licensing/candidates/alternative-sources-batch.v1.json'),'utf8'));
  const source=m.sources.find(x=>x.id===SOURCE);
  const evidence=JSON.parse(fs.readFileSync(path.join(BASE,SOURCE,'source-evidence.json'),'utf8'));
  const snapshot=fs.readFileSync(path.join(BASE,SOURCE,'source-metadata.snapshot'));
  const hash=crypto.createHash('sha256').update(snapshot).digest('hex');
  if(evidence.status!=='SOURCE_CANDIDATE_STAGED'||hash!==evidence.metadataSha256)
    throw Error('CT_AUDIT_PUBLISHER_METADATA_CHANGED');
  const f=assessPublisherRecord(source,snapshot).filenamePins.find(x=>
    x.name==='Totalsegmentator_dataset_small_v201.zip');
  if(!f||f.bytes!==info.size||!f.publisherMd5)
    throw Error('CT_AUDIT_PUBLISHER_SIZE_CHANGED');
  const hashes={md5:crypto.createHash('md5'),sha:crypto.createHash('sha256')};
  for await(const chunk of fs.createReadStream(INPUT,{highWaterMark:4*M})){
    hashes.md5.update(chunk);hashes.sha.update(chunk);
  }
  const md5=hashes.md5.digest('hex'),sha=hashes.sha.digest('hex');
  if(md5!==f.publisherMd5.toLowerCase())
    throw Error('CT_AUDIT_ARCHIVE_HASH_MISMATCH');
  const acquisition=JSON.parse(fs.readFileSync(path.join(BASE,'acquisition-report.json'),'utf8'));
  const receipt=acquisition.results.find(x=>x.source===SOURCE&&
    x.filename===f.name&&x.sha256===sha&&
    ['DOWNLOADED_PRIVATE_ONLY','ALREADY_VERIFIED_PRIVATE'].includes(x.status));
  if(!receipt)throw Error('CT_AUDIT_MISSING_VERIFIED_RECEIPT');
  return {sha256:sha,md5,size:info.size};
}

export async function runPrivateTotalSegAudit(){
  const evidence=await verifiedArchive();
  const report={...buildArchiveAudit(listLocalZipEntries(INPUT)), 
    archiveSha256:evidence.sha256,archivePublisherMd5:evidence.md5,
    exactArchiveSize:evidence.size};
  assertPrivate(REPORT);
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  runPrivateTotalSegAudit().then(report=>{
    console.log(JSON.stringify(report,null,2));
    console.log('PRIVATE ONLY: '+path.relative(ROOT,REPORT));
  }).catch(e=>{console.error('TOTALSEG_AUDIT_FAILED: '+e.message);process.exitCode=1;});
