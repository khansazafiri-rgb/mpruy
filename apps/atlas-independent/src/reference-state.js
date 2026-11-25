// HRA source-native reference metadata: never a body overlay.
export function referenceEntries(doc){
 if(doc?.publicRelease!=='NO_GO'||doc.registrationValidated!==false||!Array.isArray(doc.items))throw Error('Inventaris HRA tidak valid');
 const ids=new Set();
 for(const e of doc.items){
  if(!/^[a-f0-9]{24}$/.test(e.id||'')||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!/^v\d+\.\d+(?:\.\d+)?$/.test(e.version||'')||
   !/^https:\/\/cdn\.humanatlas\.io\/digital-objects\/ref-organ\/[a-z0-9-]+\/v\d+\.\d+(?:\.\d+)?\/assets\/[a-z0-9-]+\.glb$/.test(e.source||'')||
   e.approvedForDistribution!==false||e.registrationValidated!==false||!Number.isInteger(e.meshCount)||e.meshCount<1)throw Error('Identitas referensi HRA tidak valid');
  const version=e.source.split('/')[6];if(version!==e.version)throw Error('Versi referensi tidak sesuai');
  ids.add(e.id);
 }
 return doc.items;
}
export function filterReferences(entries,query){
 const q=String(query).trim().toLowerCase();return entries.filter(e=>(e.name+' '+e.version).toLowerCase().includes(q));
}
export function requestTracker(){
 let seq=0;
 return {begin:()=>++seq,cancel:()=>{seq++;},current:id=>id===seq};
}

// Read only original glTF node identities; sanitized Three.js display names
// are not a medical label or a unique identity. Each organ stays in its own frame.
export function sourceNodeComponents(gltf){
 const nodes=gltf?.parser?.json?.nodes,associations=gltf?.parser?.associations;
 if(!Array.isArray(nodes)||!associations?.get||!gltf.scene?.traverse)return [];
 const byNode=new Map();
 gltf.scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let node=mesh,index;
  while(node){
   const a=associations.get(node);
   if(Number.isInteger(a?.nodes)){index=a.nodes;break;}
   node=node.parent;
  }
  const original=nodes[index];
  if(!original||!Number.isInteger(original.mesh)||!associations.get(mesh)||associations.get(mesh).meshes!==original.mesh)return;
  const entry=byNode.get(index)||{index,label:typeof original.name==='string'&&original.name.trim()?original.name:'Unnamed source node '+index,meshes:[]};
  entry.meshes.push(mesh);byNode.set(index,entry);
 });
 return [...byNode.values()].sort((a,b)=>a.label.localeCompare(b.label)||a.index-b.index);
}
export function isolateSourceComponent(meshes,component,originalVisibility){
 const selected=new Set(component?.meshes||[]);
 // A hidden mesh ancestor would also hide a selected child. Reject ambiguous
 // hierarchy instead of claiming that the exact component is isolated.
 for(const m of selected){if(originalVisibility.get(m)!==true)return false;for(let p=m.parent;p;p=p.parent){if(p.isMesh&&(!selected.has(p)||originalVisibility.get(p)!==true))return false;if(!p.isMesh&&p.visible===false)return false;}}
 if(component&&(!selected.size||[...selected].some(m=>!originalVisibility.has(m))))return false;
 for(const m of meshes)m.visible=component?selected.has(m)&&originalVisibility.get(m):originalVisibility.get(m);
 return true;
}

export function reference43Entries(doc){
 if(doc?.schema!==1||doc.publicRelease!=='NO_GO'||doc.clinicalValidation!==false||doc.registrationValidated!==false||!Array.isArray(doc.items)||![12,20,23,28,32,35,40,43,44,48,51,52,55,60,63,64,67,71,72,75,80,83,87,92,95,103,115].includes(doc.items.length))throw Error('Inventaris 4.3 tidak valid');
 const ids=new Set(),elements=new Set(),hashes=new Set();
 for(const e of doc.items){
  if(!/^bp43-[a-f0-9]{24}$/.test(e.id||'')||ids.has(e.id)||!/^FJ\d+[A-Za-z]?$/.test(e.fj||'')||elements.has(e.fj)||!/^FMA\d+$/.test(e.fmaId||'')||!/^BP\d+$/.test(e.bpId||'')||typeof e.name!=='string'||!e.name.trim()||e.source!=='BodyParts3D 4.3'||e.scope!=='SINGLE_SOURCE_ELEMENT'||e.coordinateFrame!=='native-4.3-not-registered'||e.approvedForDistribution!==false||e.registrationValidated!==false||e.clinicalValidation!==false||!Number.isInteger(e.triangles)||e.triangles<1||!['rawSHA256','glbSHA256'].every(k=>/^[a-f0-9]{64}$/.test(e[k]||'')))throw Error('Identitas elemen 4.3 tidak valid');
  if(hashes.has(e.rawSHA256))throw Error('Geometri sumber ganda');ids.add(e.id);elements.add(e.fj);hashes.add(e.rawSHA256);
 }
 return doc.items.map(e=>({...e,version:'4.3 · '+e.fj,meshCount:1}));
}
