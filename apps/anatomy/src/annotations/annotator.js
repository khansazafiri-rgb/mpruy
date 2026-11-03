import * as THREE from 'three';
import {ownMeshesOf} from '../viewer/loadModel.js';
import {reveal,isolateSelected,frame} from '../atlas/engine.js';
import {deselectPart} from '../viewer/selection.js';
import {hideCallout} from '../ui/callout.js';
import {asset} from '../utils/paths.js';
import {PART_ID,validateDocument,editGeometry} from './schema.js';
import {geometryIdentity,surfaceAnchor,validateOnMesh,reconstructWorld,triangleVertices} from './surfaceAnchor.js';
import {brushFaces} from './surfaceBrush.js';
import {surfacePath} from './surfaceLine.js';
import {createAnnotationOverlay} from './overlay.js';
import {PREFIX,acceptsAnnotatorCommand} from '../integration/annotatorProtocol.js';
import './annotator.css';

export function installAnnotator(viewer) {
 let documentData=null,session=null,selected='greater-tubercle',tool='navigate',brushMm=8,student=false,ready=false;
 let entries=[],history=[],stroke=null,queue=Promise.resolve();
 const {canvas,controls}=viewer,ray=new THREE.Raycaster();ray.firstHitOnly=true;
 const send=(type,payload={})=>window.parent.postMessage({type,version:1,session,...payload},location.origin);
 const error=e=>send('medcoel:anatomy-annotation-error',{message:String(e.message||e).slice(0,500)});
 const landmark=()=>documentData?.landmarks.find(l=>l.id===selected);
 function resolve(surface) {
  const entry=entries.find(e=>e.identity.primitiveId===surface.primitiveId);
  if(!entry||entry.identity.geometryHash!==surface.geometryHash||entry.identity.triangleCount!==surface.triangleCount)throw Error('Surface geometry mismatch; annotation must be remapped');
  return entry;
 }
 const overlay=createAnnotationOverlay(viewer,resolve);
 function validateGeometry(d) {
  validateDocument(d);
  for(const l of d.landmarks){const g=l.geometry;if(!g)continue;
   for(const a of g.anchors||[g.anchor]){const e=resolve(a.surface);validateOnMesh(e.mesh,a,e.identity);}
   if(l.representation==='surface_region')resolve(g.surface);
   if(l.representation==='surface_line'&&g.anchors.length>=2){const e=resolve(g.anchors[0].surface);surfacePath(e.mesh,g.anchors,e.identity);}
  }
 }
 function changed(reason) {
  validateDocument(documentData);overlay.display(landmark());viewer.render();
  send('medcoel:anatomy-annotation-change',{document:documentData,landmarkId:selected,reason,canUndo:history.length>0,surfaces:entries.map(e=>e.identity)});
 }
 function remember(){history.push(structuredClone(documentData));if(history.length>30)history.shift();}
 function replaceGeometry(geometry) {
  const index=documentData.landmarks.findIndex(l=>l.id===selected);
  documentData.landmarks[index]=editGeometry(landmark(),geometry);documentData.revision++;
 }
 function hitAt(event) {
  const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),viewer.camera);
  const hit=ray.intersectObjects(entries.map(e=>e.mesh),false).find(h=>h.object.visible);
  if(!hit)return null;
  return {hit,entry:entries.find(e=>e.mesh===hit.object)};
 }
 function annotate(event) {
  const pick=hitAt(event);if(!pick)return false;
  const {hit,entry}=pick,anchor=surfaceAnchor(hit,entry.identity),l=landmark();
  if(tool==='point')replaceGeometry({anchor});
  if(tool==='line'){
   const anchors=[...(l.geometry?.anchors||[]),anchor];
   if(anchors.length>256)throw Error('Maximum 256 line anchors');
   surfacePath(entry.mesh,anchors,entry.identity);replaceGeometry({anchors});
  }
  if(tool==='paint'||tool==='erase') {
   const previous=l.geometry;
   if(previous&&previous.surface.primitiveId!==entry.identity.primitiveId)throw Error('This pilot region must use one primitive');
   const faces=new Set(previous?.faceIndices||[]);
   for(const f of brushFaces(entry.mesh,hit,brushMm/1000)){if(tool==='paint')faces.add(f);else faces.delete(f);}
   if(faces.size){
    // Keep the leader on an actually selected facet, including after erasing its old anchor.
    let rootAnchor=previous?.anchor||anchor;
    if(!faces.has(rootAnchor.faceIndex)) {
     const f=faces.values().next().value,vs=triangleVertices(entry.mesh,f),point=vs[0].clone().add(vs[1]).add(vs[2]).divideScalar(3);
     rootAnchor=surfaceAnchor({object:entry.mesh,faceIndex:f,point:entry.mesh.localToWorld(point)},entry.identity);
    }
    replaceGeometry({surface:entry.identity,faceIndices:[...faces].sort((a,b)=>a-b),anchor:rootAnchor});
   } else replaceGeometry(null);
  }
  overlay.display(landmark());viewer.render();
  send('medcoel:anatomy-annotation-hit',{landmarkId:selected,faceIndex:hit.faceIndex,anchor});return true;
 }
 function stop(event){event.preventDefault();event.stopImmediatePropagation();}
 function finishStroke(cancel=false) {
  if(!stroke)return;const old=stroke;stroke=null;controls.enabled=true;
  if(cancel){documentData=old.before;if(old.changed)history.pop();overlay.display(landmark());viewer.render();return;}
  if(old.changed)changed('geometry');
 }
 canvas.addEventListener('pointerdown',event=>{
  if(!ready||student||tool==='navigate'||event.button!==0||event.altKey||event.shiftKey)return;
  stop(event);controls.enabled=false;canvas.setPointerCapture(event.pointerId);
  const before=structuredClone(documentData);stroke={before,changed:false,pointer:event.pointerId};
  try {if(annotate(event)){history.push(before);if(history.length>30)history.shift();stroke.changed=true;}}
  catch(e){finishStroke(true);error(e);}
 },true);
 canvas.addEventListener('pointermove',event=>{
  if(!stroke)return;stop(event);
  if(event.pointerId!==stroke.pointer)return;
  if(!['paint','erase'].includes(tool))return;
  try {const before=structuredClone(documentData);if(annotate(event)&&!stroke.changed){history.push(before);stroke.changed=true;}}
  catch(e){finishStroke(true);error(e);}
 },true);
 canvas.addEventListener('pointerup',event=>{if(!stroke)return;stop(event);finishStroke();if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);},true);
 canvas.addEventListener('pointercancel',()=>finishStroke(true),true);
 canvas.addEventListener('lostpointercapture',()=>finishStroke(),true);
 for(const name of ['click','dblclick','touchstart','touchend'])canvas.addEventListener(name,event=>{if(ready&&name!=='touchstart')event.stopImmediatePropagation();},true);
 document.getElementById('resetBtn')?.addEventListener('click',event=>{
  if(!ready)return;event.preventDefault();event.stopImmediatePropagation();
  queue=queue.then(async()=>{finishStroke();await selectPart();overlay.display(landmark());}).catch(error);
 },true);
 async function selectPart(){
  await reveal(PART_ID);isolateSelected();deselectPart();hideCallout();
  if(!entries.length){entries=await Promise.all(ownMeshesOf(PART_ID).map(async(mesh,i)=>({mesh,identity:await geometryIdentity(mesh,PART_ID,i)})));}
  if(!entries.length)throw Error('Right humerus was not found in this Z-Anatomy model');
  await frame(new THREE.Box3().setFromObject(entries[0].mesh));
 }
 async function focus() {
  overlay.display(landmark());const g=landmark()?.geometry;if(!g)return;
  const anchors=g.anchors||[g.anchor],box=new THREE.Box3();
  if(g.faceIndices){const e=resolve(g.surface);for(const f of g.faceIndices)for(const v of triangleVertices(e.mesh,f))box.expandByPoint(e.mesh.localToWorld(v));}
  else for(const a of anchors){const e=resolve(a.surface);box.expandByPoint(reconstructWorld(e.mesh,a,e.identity));}
  box.expandByScalar(.012);
  const a=anchors[0],entry=resolve(a.surface),vs=triangleVertices(entry.mesh,a.faceIndex);
  const normal=new THREE.Triangle(...vs).getNormal(new THREE.Vector3()).applyMatrix3(new THREE.Matrix3().getNormalMatrix(entry.mesh.matrixWorld)).normalize();
  await frame(box,normal);viewer.render();
 }
 async function command(d) {
  if(d.type===PREFIX+'enter') {
   if(session&&session!==d.session)return;
   session=d.session;ready=false;
   const seed=await fetch(asset('data/annotations/skeletal/humerus.r.json')).then(r=>{if(!r.ok)throw Error('Pilot annotation registry unavailable');return r.json();});
   if(d.document.spatialSource.modelSha256!==seed.spatialSource.modelSha256)throw Error('Annotation model checksum does not match this source');
   const modelBytes=await fetch(asset('models/skeletal.glb')).then(r=>{if(!r.ok)throw Error('Skeletal model unavailable');return r.arrayBuffer();});
   const digest=await crypto.subtle.digest('SHA-256',modelBytes);
   const modelHash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
   if(modelHash!==seed.spatialSource.modelSha256)throw Error('Displayed model checksum differs from the reviewed spatial source');
   document.body.classList.add('anatomy-annotator-active');
   await selectPart();validateGeometry(d.document);documentData=structuredClone(d.document);history=[];ready=true;changed('enter');return;
  }
  if(!ready||d.session!==session)return;
  finishStroke();
  if(d.type===PREFIX+'select-part'){await selectPart();overlay.display(landmark());}
  if(d.type===PREFIX+'select-landmark') {
   if(!documentData.landmarks.some(l=>l.id===d.landmarkId))throw Error('Landmark unavailable');
   selected=d.landmarkId;
   if(d.representation&&d.representation!==landmark().representation){remember();const i=documentData.landmarks.findIndex(l=>l.id===selected);documentData.landmarks[i]={...editGeometry(landmark(),null),representation:d.representation};documentData.revision++;changed('representation');}
   tool='navigate';await focus();changed('select');
  }
  if(d.type===PREFIX+'set-tool') {
   const expected={point:'point',paint:'surface_region',erase:'surface_region',line:'surface_line'}[d.tool];
   if(student&&d.tool!=='navigate')throw Error('Student preview is read-only');
   if(expected&&landmark().representation!==expected)throw Error('Choose a matching landmark representation');
   tool=d.tool;brushMm=d.brushMm;canvas.style.cursor=tool==='navigate'?'grab':'crosshair';
  }
  if(d.type===PREFIX+'preview') {
   validateGeometry(d.document);documentData=structuredClone(d.document);student=d.student;tool='navigate';
   document.body.classList.toggle('anatomy-student-preview',student);await focus();changed('preview');
  }
  if(d.type===PREFIX+'clear') {
   if(student)throw Error('Student preview is read-only');
   if(d.action==='undo'){const previous=history.pop();if(previous){const revision=documentData.revision;documentData=previous;documentData.revision=revision+1;}}
   else{remember();replaceGeometry(null);}
   changed(d.action);
  }
 }
 window.addEventListener('message',event=>{
  if(!acceptsAnnotatorCommand(event,location.origin,window.parent,window))return;
  const d=structuredClone(event.data);queue=queue.then(()=>command(d)).catch(error);
 });
 return {getDocument:()=>structuredClone(documentData)};
}
