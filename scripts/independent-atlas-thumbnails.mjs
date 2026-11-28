// Private thumbnails from verified native source triangles; no legacy image,
// external image service, registration transform or synthetic anatomy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {parseNativePositions} from './audit-bp3d-publication-geometry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const size=128;
const palette={skeletal:[233,220,195],muscular:[173,78,80],joints:[150,187,198],arterial:[212,62,72],venous:[62,108,187],heart:[169,57,73],nervous:[231,189,80],lymphatic:[75,156,114],respiratory:[217,145,160],digestive:[211,156,135],urinary:[158,69,83],reproductive:[202,167,160],endocrine:[157,130,191]};
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(name,data){
 const type=Buffer.from(name),body=Buffer.concat([type,data]);let crc=0xffffffff;
 for(const b of body)crc=crcTable[(crc^b)&255]^(crc>>>8);
 const head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);
 return Buffer.concat([head,body,tail]);
}
function png(pixels){
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 const raw=Buffer.alloc(size*(1+size*4));for(let y=0;y<size;y++)pixels.copy(raw,y*(1+size*4)+1,y*size*4,(y+1)*size*4);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
// Oblique source-axis camera. The preview is not labeled as an anatomical view.
const project=(x,y,z)=>[.8660254*x-.5*z,.1710101*x+.9396926*y+.2961981*z,.4698463*x-.3420201*y+.8137977*z];
export function renderNativeThumbnail(parts,group){
 assert(Array.isArray(parts)&&parts.length&&Object.hasOwn(palette,group));
 let triangles=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 const projected=[];
 for(const p of parts){
  assert(p instanceof Float32Array&&p.length%9===0&&p.length>0);
  triangles+=p.length/9;assert(triangles<=1500000,'Thumbnail triangle budget exceeded');
  const out=new Float32Array(p.length);
  for(let i=0;i<p.length;i+=3){const [x,y,z]=project(p[i],p[i+1],p[i+2]);assert([x,y,z].every(Number.isFinite));out[i]=x;out[i+1]=y;out[i+2]=z;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  projected.push(out);
 }
 const extent=Math.max(maxX-minX,maxY-minY);assert(extent>0,'Degenerate thumbnail bounds');
 const scale=(size-18)/extent,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const depth=new Float64Array(size*size);depth.fill(-Infinity);
 const pixels=Buffer.alloc(size*size*4);let work=0,drawn=0;
 for(const p of projected)for(let i=0;i<p.length;i+=9){
  const x0=(p[i]-cx)*scale+size/2,y0=(cy-p[i+1])*scale+size/2,z0=p[i+2];
  const x1=(p[i+3]-cx)*scale+size/2,y1=(cy-p[i+4])*scale+size/2,z1=p[i+5];
  const x2=(p[i+6]-cx)*scale+size/2,y2=(cy-p[i+7])*scale+size/2,z2=p[i+8];
  const area=(x1-x0)*(y2-y0)-(y1-y0)*(x2-x0);if(Math.abs(area)<1e-9)continue;
  const ax=Math.max(0,Math.floor(Math.min(x0,x1,x2))),bx=Math.min(size-1,Math.ceil(Math.max(x0,x1,x2)));
  const ay=Math.max(0,Math.floor(Math.min(y0,y1,y2))),by=Math.min(size-1,Math.ceil(Math.max(y0,y1,y2)));
  work+=(bx-ax+1)*(by-ay+1);assert(work<=60000000,'Thumbnail raster budget exceeded');
  const u=[p[i+3]-p[i],p[i+4]-p[i+1],z1-z0],v=[p[i+6]-p[i],p[i+7]-p[i+1],z2-z0];
  const nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0],len=Math.hypot(nx,ny,nz);
  const shade=.48+.52*Math.abs((.25*nx+.35*ny+.90277*nz)/(len||1));
  for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++){
   const a=((x+.5-x0)*(y2-y0)-(y+.5-y0)*(x2-x0))/area,b=((x1-x0)*(y+.5-y0)-(y1-y0)*(x+.5-x0))/area;
   if(a<0||b<0||a+b>1)continue;
   const z=z0+a*(z1-z0)+b*(z2-z0),j=y*size+x;if(z<=depth[j])continue;
   depth[j]=z;for(let k=0;k<3;k++)pixels[j*4+k]=Math.round(palette[group][k]*shade);pixels[j*4+3]=255;drawn++;
  }
 }
 assert(drawn>0,'No projected pixels');return png(pixels);
}
export function readThumbnailParts(records){
 const parts=[];let total=0;
 for(const r of records){
  assert(fs.realpathSync(r.file)===r.file&&fs.statSync(r.file).isFile());
  const n=fs.statSync(r.file).size;total+=n;assert(total<=192*1024*1024,'Thumbnail source budget exceeded');
  const bytes=fs.readFileSync(r.file);assert(sha(bytes)===r.sha256,'Thumbnail source checksum mismatch');
  const map=parseNativePositions(bytes);
  if(r.elements){for(const id of r.elements){assert(map.has(id),'Exact thumbnail element absent');parts.push(map.get(id));}}
  else parts.push(...map.values());
 }
 return parts;
}
if(!isMainThread){
 try{const bytes=renderNativeThumbnail(readThumbnailParts(workerData.records),workerData.group);parentPort.postMessage({ok:true,bytes});}catch(e){parentPort.postMessage({ok:false,error:String(e.message)});}
}
export function createThumbnailService(recordsById){
 const cache=new Map(),pending=new Map(),queue=[];let active=0;
 function pump(){
  while(active<2&&queue.length){
   const {id,resolve,reject,records,group}=queue.shift();active++;
   let settled=false,w,timer;
   const finish=(err,b)=>{if(settled)return;settled=true;clearTimeout(timer);active--;pending.delete(id);if(w)void w.terminate();if(err)reject(err);else{cache.set(id,b);while(cache.size>160)cache.delete(cache.keys().next().value);resolve(b);}pump();};
   try{w=new Worker(new URL(import.meta.url),{workerData:{records,group}});timer=setTimeout(()=>finish(Error('Thumbnail timed out')),20000);w.once('message',m=>m.ok?finish(null,Buffer.from(m.bytes)):finish(Error(m.error)));w.once('error',finish);w.once('exit',()=>finish(Error('Thumbnail worker exited')));}catch(e){finish(e);}
  }
 }
 return {has:id=>recordsById.has(id),get(id){
  if(cache.has(id))return Promise.resolve(cache.get(id));
  if(pending.has(id))return pending.get(id);
  const r=recordsById.get(id);if(!r||queue.length>=96)return Promise.reject(Error('Thumbnail unavailable'));
  const p=new Promise((resolve,reject)=>queue.push({id,resolve,reject,...r}));pending.set(id,p);pump();return p;
 }};
}
export function buildThumbnailRecords(body,selection,recovery,models,bodyModels,recoveryModels){
 const out=new Map(),base=new Map(bodyModels.map(m=>[m.sha256,m]));
 // model path map was constructed by the verified pack loader. Match explicit IDs via manifest order.
 assert(body.length===bodyModels.length);
 for(let i=0;i<body.length;i++){
  const e=body[i],m=bodyModels[i],file=models.get('/anatomy/viewer/'+e.path);
  assert(file&&m.fmaId===e.fmaId&&m.bpId===e.bpId&&base.has(m.sha256));
  out.set(e.id,{group:e.group,records:[{file,sha256:m.sha256}]});
 }
 for(const e of selection||[]){
  const owners=new Map();for(const b of e.bindings){const a=owners.get(b.ownerId)||[];a.push(b.elementId);owners.set(b.ownerId,a);}
  const records=[...owners].map(([id,elements])=>{const r=out.get(id);assert(r?.records.length===1);return {...r.records[0],elements};});
  out.set(e.id,{group:e.group,records});
 }
 for(const e of recovery||[]){const r=recoveryModels.get('/anatomy/viewer/'+e.path);assert(r);out.set(e.id,{group:e.group,records:[{file:r.file,sha256:r.sha256}]});}
 return out;
}
