// Coordinates are authored on the displayed Z-Anatomy mesh, never external models.
export const SOURCE_COMMIT = 'a874a3dcb111d5b4de543c5be6253f5013416f4d';
export const PART_ID = 'Humerus.r';
export const STATUSES = ['NOT_MAPPED','DRAFT','ANNOTATED','REVIEWED','VERIFIED'];
export const REPRESENTATIONS = ['point','surface_region','surface_line'];
export const PILOT = [
 ['head','Head of humerus','Caput humeri','surface_region'],
 ['greater-tubercle','Greater tubercle','Tuberculum majus','surface_region'],
 ['lesser-tubercle','Lesser tubercle','Tuberculum minus','surface_region'],
 ['deltoid-tuberosity','Deltoid tuberosity','Tuberositas deltoidea','surface_region'],
 ['intertubercular-sulcus','Intertubercular sulcus','Sulcus intertubercularis','surface_line'],
 ['radial-groove','Radial groove','Sulcus nervi radialis','surface_line'],
];
const fail = message => { throw new Error(message); };
const finite3 = a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
const hash = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
export function validateSurface(s) {
 if (!s || s.partId !== PART_ID || !/^Humerus\.r\/primitive:\d+$/.test(s.primitiveId) || !hash(s.geometryHash) || !Number.isSafeInteger(s.triangleCount) || s.triangleCount < 1 || s.triangleCount > 1000000) fail('Invalid surface identity');
 return s;
}
export function validateAnchor(a) {
 validateSurface(a?.surface);
 if (!Number.isInteger(a.faceIndex) || a.faceIndex < 0 || a.faceIndex >= a.surface.triangleCount || !finite3(a.barycentric) || a.barycentric.some(v=>v < -1e-5 || v > 1.00001) || Math.abs(a.barycentric.reduce((s,v)=>s+v,0)-1)>1e-5 || !finite3(a.localPoint) || !finite3(a.worldPoint) || !finite3(a.normal)) fail('Invalid surface anchor');
 return a;
}
export function geometryComplete(l) {
 const g=l.geometry;
 return !!g && (l.representation==='point' ? !!g.anchor : l.representation==='surface_region' ? !!g.faceIndices?.length : (g.anchors?.length || 0)>=2);
}
export function validateDocument(d) {
 if (!d || d.schemaVersion !== 1 || !Number.isSafeInteger(d.revision) || d.revision < 0 || d.spatialSource?.provider !== 'Z-Anatomy' || d.spatialSource.sourceCommit !== SOURCE_COMMIT || d.spatialSource.system !== 'skeletal' || d.spatialSource.partId !== PART_ID || !hash(d.spatialSource.modelSha256) || d.spatialSource.geometryIndexing !== 'three-mesh-bvh@0.9.13/three@0.185.1') fail('Unsupported annotation source/version');
 if (!Array.isArray(d.landmarks) || d.landmarks.length !== PILOT.length) fail('Expected six pilot landmarks');
 const seen=new Set();
 for(const l of d.landmarks) {
  if(!PILOT.some(([id])=>id===l.id) || seen.has(l.id) || l.parentPart!==PART_ID || typeof l.name_en!=='string' || !l.name_en.trim() || l.name_en.length>120 || typeof l.name_la!=='string' || l.name_la.length>160 || !REPRESENTATIONS.includes(l.representation) || !STATUSES.includes(l.status) || !Array.isArray(l.terminology) || !l.review || typeof l.review!=='object') fail('Invalid landmark');
  seen.add(l.id);
  const g=l.geometry;
  if(g!==null) {
   if(!g || typeof g!=='object') fail('Invalid annotation geometry');
   if(l.representation==='point') validateAnchor(g.anchor);
   if(l.representation==='surface_region') {
    validateSurface(g.surface); validateAnchor(g.anchor);
    if(g.anchor.surface.primitiveId!==g.surface.primitiveId || g.anchor.surface.geometryHash!==g.surface.geometryHash || !Array.isArray(g.faceIndices) || g.faceIndices.length>100000 || new Set(g.faceIndices).size!==g.faceIndices.length || !g.faceIndices.every(f=>Number.isInteger(f)&&f>=0&&f<g.surface.triangleCount)) fail('Invalid region facets');
   }
   if(l.representation==='surface_line') {
    if(!Array.isArray(g.anchors)||g.anchors.length<1||g.anchors.length>256) fail('Invalid line anchors');
    g.anchors.forEach(validateAnchor);
    if(g.anchors.some(a=>a.surface.primitiveId!==g.anchors[0].surface.primitiveId||a.surface.geometryHash!==g.anchors[0].surface.geometryHash)) fail('Line anchors must share one primitive');
   }
  }
  if(l.status==='NOT_MAPPED' && g!==null) fail('Mapped geometry cannot be NOT_MAPPED');
  if(['ANNOTATED','REVIEWED','VERIFIED'].includes(l.status) && !geometryComplete(l)) fail('Complete geometry required');
  if(['REVIEWED','VERIFIED'].includes(l.status) && (!l.review.reviewedBy?.trim() || !Number.isFinite(Date.parse(l.review.reviewedAt)))) fail('Manual review metadata required');
  if(l.status==='VERIFIED' && (l.review.decision!=='manual' || !l.review.verifiedBy?.trim() || !Number.isFinite(Date.parse(l.review.verifiedAt)))) fail('Manual verification required');
 }
 return d;
}
export function parseDocument(text) {
 if(typeof text!=='string'||text.length>6000000) fail('Annotation JSON exceeds limit');
 return validateDocument(JSON.parse(text));
}
export function transitionLandmark(l,next,{reviewer='',manual=false,now=new Date().toISOString()}={}) {
 const current=STATUSES.indexOf(l.status),target=STATUSES.indexOf(next);
 if(target!==current+1 || target<1) fail('Follow the review workflow in order');
 if(target>=2&&!geometryComplete(l)) fail('Complete the geometry first');
 if(target>=3&&!reviewer.trim()) fail('Reviewer name is required');
 if(next==='VERIFIED'&&!manual) fail('Verification requires explicit manual confirmation');
 const copy=globalThis.structuredClone(l);copy.status=next;
 if(next==='REVIEWED') Object.assign(copy.review,{reviewedBy:reviewer.trim(),reviewedAt:now});
 if(next==='VERIFIED') Object.assign(copy.review,{verifiedBy:reviewer.trim(),verifiedAt:now,decision:'manual'});
 return copy;
}
export function editGeometry(l,geometry) {
 return {...globalThis.structuredClone(l),geometry:globalThis.structuredClone(geometry),status:geometry?'DRAFT':'NOT_MAPPED',review:{}};
}
