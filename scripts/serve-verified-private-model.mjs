// Serve only the exact verified bytes. No stream of unverified mutable files.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function readVerifiedPrivateModel(asset){
 assert(asset&&typeof asset.file==='string'&&/^[a-f0-9]{64}$/.test(asset.sha256)&&Number.isSafeInteger(asset.bytes)&&asset.bytes>0&&asset.bytes<=512*1024*1024,'Invalid private asset receipt');
 assert(fs.realpathSync(asset.file)===asset.file,'Unsafe private asset path');
 const fd=fs.openSync(asset.file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const stat=fs.fstatSync(fd);assert(stat.isFile()&&stat.size===asset.bytes,'Private asset size changed');
  const bytes=Buffer.allocUnsafe(asset.bytes);let offset=0;
  while(offset<bytes.length){const n=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);assert(n>0,'Private asset truncated');offset+=n;}
  assert(fs.fstatSync(fd).size===asset.bytes,'Private asset size changed during read');
  assert(createHash('sha256').update(bytes).digest('hex')===asset.sha256,'Private asset digest changed');
  return bytes;
 }finally{fs.closeSync(fd);}
}
export function serveVerifiedPrivateModel(req,res,asset){
 const deny=()=>{const body='Private model unavailable';res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);};
 if(!['GET','HEAD'].includes(req.method))return deny();
 let bytes;try{bytes=readVerifiedPrivateModel(asset);}catch{return deny();}
 res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(req.method==='HEAD'?undefined:bytes);
}
