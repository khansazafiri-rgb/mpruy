import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { downloadPrivateArchive, hashFileBounded } from './private-resumable-archive.mjs';
import { openVerifiedPublisherStream } from './verified-publisher-download.mjs';

const data=Buffer.from('MEDCOEL-PRIVATE-RESUMABLE-ARCHIVE-1234567890');
const md5=b=>crypto.createHash('md5').update(b).digest('hex');
const entry={source:'totalsegmentator-small-v201',filename:'fixture.zip',
  expectedBytes:data.length,publisherMd5:md5(data),
  downloadUrl:'https://zenodo.org/records/10047263/files/fixture.zip?download=1'};
function dest(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-resume-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  return path.join(dir,'fixture.zip');
}
function good(source,offset,status=offset?206:200){
  const bytes=source.subarray(status===206?offset:0);
  const headers={'content-type':'application/octet-stream',
    'content-length':String(bytes.length)};
  if(status===206)headers['content-range']='bytes '+offset+'-'+(source.length-1)+'/'+source.length;
  return {response:new Response(bytes,{status,headers}),resumed:status===206,
    touch(){},close(){}};
}
test('RESUME-001: interruption retains partial and exact Range safely resumes',async t=>{
  const out=dest(t);
  let sent=false;
  const interrupted=async()=>({response:{headers:new Headers(),
    body:new ReadableStream({pull(c){
      if (!sent) { sent=true; c.enqueue(data.subarray(0,11)); }
      else c.error(Error('simulated socket stall'));
    }})},resumed:false,touch(){},close(){}});
  await assert.rejects(downloadPrivateArchive(entry,out,{
    openStream:interrupted,maxAttempts:1,logger:()=>{}
  }),/ACQUIRE_RESUMABLE_PARTIAL_RETAINED/);
  assert.equal(fs.existsSync(out),false);
  assert.equal(fs.statSync(out+'.partial').size,11);
  let resumeOffset=null;
  const result=await downloadPrivateArchive(entry,out,{
    openStream:async(_,{offset})=>(resumeOffset=offset,good(data,offset)),
    logger:()=>{}
  });
  assert.equal(resumeOffset,11);
  assert.deepEqual(fs.readFileSync(out),data);
  assert.equal(result.status,'DOWNLOADED_PRIVATE_ONLY');
  assert.equal(result.sha256,(await hashFileBounded(out)).sha256);
  assert.equal(fs.existsSync(out+'.partial'),false);
  assert.equal(fs.existsSync(out+'.partial.json'),false);
});
test('RESUME-002: ignored Range 200 safely restarts instead of appending',async t=>{
  const out=dest(t);
  fs.writeFileSync(out+'.partial',data.subarray(0,14));
  fs.writeFileSync(out+'.partial.json',JSON.stringify({
    schema:'medcoel.private-partial.v1',source:entry.source,filename:entry.filename,
    expectedBytes:entry.expectedBytes,publisherMd5:entry.publisherMd5,downloadUrl:entry.downloadUrl
  }));
  const r=await downloadPrivateArchive(entry,out,{
    openStream:async(_,{offset})=>(assert.equal(offset,14),good(data,offset,200)),
    logger:()=>{}
  });
  assert.equal(r.status,'DOWNLOADED_PRIVATE_ONLY');
  assert.deepEqual(fs.readFileSync(out),data);
});
test('RESUME-003: orphan partial and changed publisher pin fail closed',async t=>{
  const out=dest(t);
  fs.writeFileSync(out+'.partial',data.subarray(0,7));
  await assert.rejects(downloadPrivateArchive(entry,out,{
    openStream:()=>{throw Error('must not fetch');},logger:()=>{}
  }),/ACQUIRE_ORPHAN_PARTIAL/);
  fs.writeFileSync(out+'.partial.json',JSON.stringify({
    schema:'medcoel.private-partial.v1',source:entry.source,filename:entry.filename,
    expectedBytes:entry.expectedBytes,publisherMd5:'f'.repeat(32),downloadUrl:entry.downloadUrl
  }));
  await assert.rejects(downloadPrivateArchive(entry,out,{
    openStream:()=>{throw Error('must not fetch');},logger:()=>{}
  }),/ACQUIRE_PARTIAL_SOURCE_PIN_CHANGED/);
});
test('RESUME-004: HTTP 206 requires exact Content-Range start and total',async()=>{
  const headers={'content-type':'application/octet-stream',
    'content-range':'bytes 12-'+(data.length-1)+'/'+data.length,
    'content-length':String(data.length-12)};
  const accepted=await openVerifiedPublisherStream(entry,{
    fetcher:async()=>new Response(data.subarray(12),{status:206,headers}),offset:12
  });
  assert.equal(accepted.resumed,true);
  assert.deepEqual(Buffer.from(await accepted.response.arrayBuffer()),data.subarray(12));
  accepted.close();
  await assert.rejects(openVerifiedPublisherStream(entry,{
    fetcher:async()=>new Response(data.subarray(11),{status:206,
      headers:{'content-type':'application/octet-stream',
        'content-range':'bytes 11-'+(data.length-1)+'/'+data.length}}),offset:12
  }),/ACQUIRE_INVALID_CONTENT_RANGE/);
  await assert.rejects(openVerifiedPublisherStream(entry,{
    fetcher:async()=>new Response(data.subarray(12),{status:206,
      headers:{'content-type':'application/octet-stream',
        'content-range':'bytes 12-'+(data.length-1)+'/'+(data.length+1)}}),offset:12
  }),/ACQUIRE_INVALID_CONTENT_RANGE/);
});
test('RESUME-005: wrong publisher MD5 never promotes full file',async t=>{
  const out=dest(t), bad={...entry,publisherMd5:md5(Buffer.from('wrong'))};
  await assert.rejects(downloadPrivateArchive(bad,out,{
    openStream:async(_,{offset})=>good(data,offset),logger:()=>{}
  }),/ACQUIRE_COMPLETED_ARCHIVE_MD5_MISMATCH_QUARANTINED/);
  assert.equal(fs.existsSync(out),false);
  assert.equal(fs.existsSync(out+'.partial'),true);
});
