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
 for(const m of selected)for(let p=m.parent;p;p=p.parent)if(p.isMesh&&!selected.has(p))return false;
 if(component&&(!selected.size||[...selected].some(m=>!originalVisibility.has(m))))return false;
 for(const m of meshes)m.visible=component?selected.has(m)&&originalVisibility.get(m):originalVisibility.get(m);
 return true;
}
