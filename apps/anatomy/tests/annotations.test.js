import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {geometryIdentity,surfaceAnchor,reconstructLocal,reconstructWorld,validateOnMesh} from '../src/annotations/surfaceAnchor.js';
import {surfaceTopology,brushFaces} from '../src/annotations/surfaceBrush.js';
import {surfacePath} from '../src/annotations/surfaceLine.js';
import {validateDocument,parseDocument,transitionLandmark,editGeometry} from '../src/annotations/schema.js';
import {PREFIX,acceptsAnnotatorCommand,acceptsAnnotationEvent} from '../src/integration/annotatorProtocol.js';
const seed=()=>JSON.parse(readFileSync(new URL('../public/data/annotations/skeletal/humerus.r.json',import.meta.url),'utf8'));
async function fixture(){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.1,.1,8,8));mesh.updateMatrixWorld();const identity=await geometryIdentity(mesh,'Humerus.r',0);const f=30;const g=mesh.geometry,p=g.attributes.position,index=g.index;const vertices=[0,1,2].map(i=>new THREE.Vector3().fromBufferAttribute(p,index.getX(f*3+i)));const point=vertices[0].clone().multiplyScalar(.2).addScaledVector(vertices[1],.3).addScaledVector(vertices[2],.5);const hit={object:mesh,point,faceIndex:f,face:{normal:new THREE.Vector3(0,0,1)}};return {mesh,identity,hit,anchor:surfaceAnchor(hit,identity)};}
describe('versioned pilot schema and manual workflow',()=>{
 it('parses six NOT_MAPPED landmarks without fabricated geometry',()=>{const d=seed();expect(parseDocument(JSON.stringify(d))).toEqual(d);expect(d.landmarks).toHaveLength(6);expect(d.landmarks.every(l=>l.status==='NOT_MAPPED'&&l.geometry===null)).toBe(true);});
 it('rejects wrong source, side, versions, duplicate landmarks and oversized input',()=>{
  for(const mutate of [d=>d.schemaVersion=2,d=>d.spatialSource.sourceCommit='8ca3b74',d=>d.spatialSource.partId='Humerus.l',d=>d.landmarks[1]=d.landmarks[0],d=>d.landmarks[0].status='VERIFIED']){const d=seed();mutate(d);expect(()=>validateDocument(d)).toThrow();}
  expect(()=>parseDocument('{')).toThrow();expect(()=>parseDocument(' '.repeat(6000001))).toThrow();
 });
 it('requires complete geometry, ordered transitions and explicit manual verification',async()=>{
  const {anchor}=await fixture();let l={...seed().landmarks[0],representation:'point'};
  expect(()=>transitionLandmark(l,'ANNOTATED')).toThrow();l=transitionLandmark(l,'DRAFT');expect(()=>transitionLandmark(l,'ANNOTATED')).toThrow();
  l=editGeometry(l,{anchor});l=transitionLandmark(l,'ANNOTATED');expect(()=>transitionLandmark(l,'REVIEWED')).toThrow();
  l=transitionLandmark(l,'REVIEWED',{reviewer:'Admin'});expect(()=>transitionLandmark(l,'VERIFIED',{reviewer:'Admin'})).toThrow();
  l=transitionLandmark(l,'VERIFIED',{reviewer:'Admin',manual:true});expect(l.review.decision).toBe('manual');
  const d=seed();d.landmarks[0]=l;expect(validateDocument(d)).toBe(d);
  expect(editGeometry(l,{anchor})).toMatchObject({status:'DRAFT',review:{}});
 });
 it('rejects invalid barycentric weights, facets and review metadata',async()=>{
  const {anchor,identity}=await fixture();const d=seed();d.landmarks[0]=editGeometry(d.landmarks[0],{surface:identity,anchor,faceIndices:[30]});expect(validateDocument(d)).toBe(d);
  d.landmarks[0].geometry.faceIndices=[identity.triangleCount];expect(()=>validateDocument(d)).toThrow();
  d.landmarks[0].geometry.faceIndices=[30];d.landmarks[0].geometry.anchor.barycentric=[1,1,1];expect(()=>validateDocument(d)).toThrow();
 });
});
describe('surface truth survives camera-independent transforms',()=>{
 it('reconstructs a raycast barycentric hit after translation, rotation and scale',async()=>{
  const {mesh,anchor,identity,hit}=await fixture();expect(anchor.barycentric[0]).toBeCloseTo(.2);expect(reconstructLocal(mesh,anchor,identity).distanceTo(hit.point)).toBeLessThan(1e-8);
  mesh.position.set(2,3,4);mesh.rotation.set(.2,.4,.9);mesh.scale.set(2,3,4);mesh.updateMatrixWorld();
  expect(reconstructWorld(mesh,anchor,identity).distanceTo(mesh.localToWorld(hit.point.clone()))).toBeLessThan(1e-7);
  expect(()=>reconstructWorld(mesh,anchor,{...identity,geometryHash:'f'.repeat(64)})).toThrow();
  expect(()=>validateOnMesh(mesh,{...anchor,localPoint:[999,0,0]},identity)).toThrow();
 });
 it('uses deterministic geometry hashes and rejects topology changes',async()=>{
  const {mesh,identity}=await fixture();expect(await geometryIdentity(mesh,'Humerus.r',0)).toEqual(identity);mesh.geometry.attributes.position.setX(0,9);expect((await geometryIdentity(mesh,'Humerus.r',0)).geometryHash).not.toBe(identity.geometryHash);
 });
 it('paints connected facets within a world radius and builds surface-edge paths',async()=>{
  const {mesh,identity,hit,anchor}=await fixture();const facets=brushFaces(mesh,hit,.02);expect(facets).toContain(hit.faceIndex);expect(facets.length).toBeGreaterThan(1);expect(facets.length).toBeLessThan(identity.triangleCount);
  const other={...anchor,faceIndex:100,barycentric:[1,0,0]};const p=surfacePath(mesh,[anchor,other],identity);expect(p.length).toBeGreaterThan(2);expect(p.every(v=>Math.abs(v.z)<1e-8)).toBe(true);expect(surfaceTopology(mesh)).toBe(surfaceTopology(mesh));
 });
 it('rejects paths across disconnected geometry',async()=>{
  const mesh=new THREE.Mesh(new THREE.BufferGeometry());mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,10,0,0,11,0,0,10,1,0],3));const identity=await geometryIdentity(mesh,'Humerus.r',0);
  const a=surfaceAnchor({object:mesh,faceIndex:0,point:new THREE.Vector3(.2,.2,0)},identity),b=surfaceAnchor({object:mesh,faceIndex:1,point:new THREE.Vector3(10.2,.2,0)},identity);expect(()=>surfacePath(mesh,[a,b],identity)).toThrow('disconnected');
 });
});
describe('same-origin versioned annotator bridge',()=>{
 const parent={},self={},origin='https://medcoel.example',session='test-session-123';
 const enter=()=>({origin,source:parent,data:{type:PREFIX+'enter',version:1,session,document:seed()}});
 it('accepts only known commands from the exact parent frame',()=>{
  expect(acceptsAnnotatorCommand(enter(),origin,parent,self)).toBe(true);
  for(const bad of [{...enter(),origin:'https://foreign.example'},{...enter(),source:{}},{...enter(),data:{...enter().data,version:2}},{...enter(),data:{...enter().data,type:PREFIX+'execute'}},{...enter(),data:{...enter().data,document:{}}}])expect(acceptsAnnotatorCommand(bad,origin,parent,self)).toBe(false);
  expect(acceptsAnnotatorCommand(enter(),origin,parent,parent)).toBe(false);
 });
 it('rejects invalid tools, negative brushes, wrong parts and foreign sessions',()=>{
  const command=data=>acceptsAnnotatorCommand({...enter(),data:{version:1,session,...data}},origin,parent,self);
  expect(command({type:PREFIX+'set-tool',tool:'paint',brushMm:8})).toBe(true);expect(command({type:PREFIX+'set-tool',tool:'paint',brushMm:-1})).toBe(false);expect(command({type:PREFIX+'select-part',partId:'Humerus.l'})).toBe(false);
  const event={origin,source:parent,data:{type:'medcoel:anatomy-annotation-change',version:1,session,document:seed()}};
  expect(acceptsAnnotationEvent(event,origin,parent,session)).toBe(true);expect(acceptsAnnotationEvent(event,origin,parent,'different-session')).toBe(false);
 });
});
