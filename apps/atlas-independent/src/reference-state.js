import {COMPONENT43_TOPIC_ROWS} from './reference43-component-catalog.js';
import {MUSCLE43_TOPIC_ROWS} from './reference43-muscle-catalog.js';
import {REFERENCE43_TOPIC_ROWS} from './reference43-topic-catalog.js';
import {EXPANSION43_TOPIC_ROWS,SUPPLEMENTAL43_TOPIC_ROWS} from './reference43-topics.js';
// HRA source-native reference metadata: never a body overlay.
export function referenceEntries(doc){
 if(doc?.publicRelease!=='NO_GO'||doc.registrationValidated!==false||!Array.isArray(doc.items))throw Error('Inventaris HRA tidak valid');
 const ids=new Set();
 for(const e of doc.items){
  if(!/^[a-f0-9]{24}$/.test(e.id||'')||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!/^v\d+\.\d+(?:\.\d+)?$/.test(e.version||'')||
   !/^https:\/\/cdn\.humanatlas\.io\/digital-objects\/ref-organ\/[a-z0-9-]+\/v\d+\.\d+(?:\.\d+)?\/assets\/[a-z0-9-]+\.glb$/.test(e.source||'')||
   e.approvedForDistribution!==false||e.registrationValidated!==false||!Number.isInteger(e.meshCount)||e.meshCount<1)throw Error('Identitas referensi HRA tidak valid');
  const version=e.source.split('/')[6];if(version!==e.version)throw Error('Versi referensi tidak sesuai');
  if(e.sourceCrosswalk!==undefined){if(!Array.isArray(e.sourceCrosswalk)||!e.sourceCrosswalk.length)throw Error('Crosswalk HRA tidak valid');const idx=new Set();for(const c of e.sourceCrosswalk){if(!Number.isInteger(c.index)||c.index<0||idx.has(c.index)||typeof c.nodeName!=='string'||!c.nodeName.trim()||typeof c.label!=='string'||!c.label.trim()||!/^(FMA|UBERON):\d+$/.test(c.ontologyId))throw Error('Identitas crosswalk HRA tidak valid');idx.add(c.index);}}
  if(e.sourceGroups!==undefined){if(!e.sourceCrosswalk||!Array.isArray(e.sourceGroups)||e.sourceGroups.length>100)throw Error('Inventaris kelompok HRA tidak valid');const used=new Set(e.sourceCrosswalk.map(c=>c.index));for(const g of e.sourceGroups){if(!Number.isInteger(g.index)||g.index<0||used.has(g.index)||typeof g.nodeName!=='string'||!g.nodeName||typeof g.label!=='string'||!g.label||!/^(FMA|UBERON):\d+$/.test(g.ontologyId)||!Array.isArray(g.descendantMeshes)||!g.descendantMeshes.length)throw Error('Identitas kelompok HRA tidak valid');used.add(g.index);}}
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
 if(doc?.schema!==1||doc.publicRelease!=='NO_GO'||doc.clinicalValidation!==false||doc.registrationValidated!==false||!Array.isArray(doc.items)||![2,12,14,15,18,20,22,23,24,26,27,28,29,30,32,33,34,35,36,37,38,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,208,209,210,211,212,213,214,216,217,218,219,220,223,224,226,228,231,232,234,246,248,376,400].includes(doc.items.length))throw Error('Inventaris 4.3 tidak valid');
 const ids=new Set(),elements=new Set(),hashes=new Set();
 for(const e of doc.items){
  if(!/^bp43-[a-f0-9]{24}$/.test(e.id||'')||ids.has(e.id)||!/^FJ\d+[A-Za-z]?$/.test(e.fj||'')||elements.has(e.fj)||!/^FMA\d+$/.test(e.fmaId||'')||!/^BP\d+$/.test(e.bpId||'')||typeof e.name!=='string'||!e.name.trim()||e.source!=='BodyParts3D 4.3'||e.scope!=='SINGLE_SOURCE_ELEMENT'||e.coordinateFrame!=='native-4.3-not-registered'||e.approvedForDistribution!==false||e.registrationValidated!==false||e.clinicalValidation!==false||!Number.isInteger(e.triangles)||e.triangles<1||!['rawSHA256','glbSHA256'].every(k=>/^[a-f0-9]{64}$/.test(e[k]||'')))throw Error('Identitas elemen 4.3 tidak valid');
  if(hashes.has(e.rawSHA256))throw Error('Geometri sumber ganda');ids.add(e.id);elements.add(e.fj);hashes.add(e.rawSHA256);
 }
 if(doc.items.length===36&&doc.expansionProfile==='BP43_COMPONENTS_36_20261126'){for(const r of COMPONENT43_TOPIC_ROWS){const e=doc.items.find(x=>x.fj===r.fj);if(!e||e.bpId!==r.bpId||e.fmaId!==r.fmaId||e.name!==r.name||e.rawSHA256!==r.rawSHA256||e.glbSHA256!==r.glbSHA256||e.triangles!==r.triangles)throw Error('Identitas profil komponen tidak valid');}}
 else if(doc.items.length===400){if(doc.expansionProfile!=='BP43_152_20261126')throw Error('Profil 400 tidak valid');for(const r of [...REFERENCE43_TOPIC_ROWS,...SUPPLEMENTAL43_TOPIC_ROWS,...EXPANSION43_TOPIC_ROWS,...MUSCLE43_TOPIC_ROWS]){const e=doc.items.find(x=>x.fj===r.fj);if(!e||e.bpId!==r.bpId||e.fmaId!==r.fmaId||e.name!==r.name||e.rawSHA256!==r.rawSHA256||(r.glbSHA256&&e.glbSHA256!==r.glbSHA256)||(r.triangles&&e.triangles!==r.triangles))throw Error('Identitas profil 400 tidak valid');}}
 else if(doc.expansionProfile!==undefined||doc.items.length===376){
  if(doc.expansionProfile!=='BP43_128_20261126'||![128,376].includes(doc.items.length))throw Error('Profil ekspansi tidak valid');
  const exact=doc.items.length===376?[...REFERENCE43_TOPIC_ROWS,...SUPPLEMENTAL43_TOPIC_ROWS,...EXPANSION43_TOPIC_ROWS]:EXPANSION43_TOPIC_ROWS;
  for(const r of exact){const e=doc.items.find(x=>x.fj===r.fj);if(!e||e.bpId!==r.bpId||e.fmaId!==r.fmaId||e.name!==r.name||e.rawSHA256!==r.rawSHA256||(r.glbSHA256&&e.glbSHA256!==r.glbSHA256)||(r.triangles&&e.triangles!==r.triangles))throw Error('Identitas ekspansi tidak valid');}
 }
 if([24,400].includes(doc.items.length))for(const r of MUSCLE43_TOPIC_ROWS){const e=doc.items.find(x=>x.fj===r.fj);if(!e||e.bpId!==r.bpId||e.fmaId!==r.fmaId||e.name!==r.name||e.rawSHA256!==r.rawSHA256||e.glbSHA256!==r.glbSHA256||e.triangles!==r.triangles)throw Error('Identitas otot tambahan tidak valid');}
 if([2,248,376,400].includes(doc.items.length))for(const r of SUPPLEMENTAL43_TOPIC_ROWS){const e=doc.items.find(x=>x.fj===r.fj);if(!e||e.bpId!==r.bpId||e.fmaId!==r.fmaId||e.name!==r.name||e.rawSHA256!==r.rawSHA256||e.triangles!==1196)throw Error('Identitas hyoid tambahan tidak valid');}
 return doc.items.map(e=>({...e,version:'4.3 · '+e.fj,meshCount:1}));
}

// Only exact publisher crosswalk node indexes and names may carry ontology labels.
export function applyHraCrosswalk(components,crosswalk){
 if(crosswalk===undefined)return components;
 const result=crosswalk.map(row=>{
  const hits=components.filter(c=>c.index===row.index&&c.label===row.nodeName);
  if(hits.length!==1)throw Error('Crosswalk node differs from rendered GLB');
  return {...hits[0],label:row.label,ontologyId:row.ontologyId};
 });
 return result.sort((a,b)=>a.label.localeCompare(b.label)||a.index-b.index);
}

// Source groups are audited parent nodes, not independent mesh or new concepts.
export function verifyHraGroupRows(gltf,groups){
 const nodes=gltf?.nodes,meshes=gltf?.meshes;
 if(!Array.isArray(nodes)||!Array.isArray(meshes)||!Array.isArray(groups))throw Error('Invalid HRA hierarchy');
 const used=new Set();
 for(const g of groups){
  const root=nodes[g.index];if(!root||root.name!==g.nodeName||root.mesh!==undefined||used.has(g.index)||nodes.filter(n=>n.name===g.nodeName).length!==1)throw Error('Source group identity differs');
  used.add(g.index);
  const seen=new Set([g.index]),actual=[];
  function descend(i){const n=nodes[i];if(!Number.isInteger(i)||!n||seen.has(i))throw Error('Ambiguous source hierarchy');seen.add(i);if(n.mesh!==undefined){if(!Number.isInteger(n.mesh)||!meshes[n.mesh]||typeof n.name!=='string'||!n.name)throw Error('Invalid descendant mesh');actual.push({index:i,nodeName:n.name,meshIndex:n.mesh});}for(const c of n.children||[])descend(c);}
  for(const c of root.children||[])descend(c);
  if(!actual.length||actual.length!==g.descendantMeshes.length||actual.some((x,i)=>{const a=g.descendantMeshes[i];return x.index!==a.index||x.nodeName!==a.nodeName||x.meshIndex!==a.meshIndex;}))throw Error('Audited source descendant set differs');
 }
 return groups;
}
export function applyHraGroups(gltf,rawComponents,crosswalk,groups){
 const direct=applyHraCrosswalk(rawComponents,crosswalk);
 if(groups===undefined)return direct;
 verifyHraGroupRows(gltf,groups);
 const result=groups.map(g=>{
  const children=g.descendantMeshes.map(d=>{const hit=rawComponents.filter(c=>c.index===d.index&&c.label===d.nodeName);if(hit.length!==1||!hit[0].meshes.length)throw Error('Source group descendant not rendered');return hit[0];});
  const all=children.flatMap(c=>c.meshes);if(new Set(all).size!==all.length)throw Error('Repeated group mesh');
  return {index:g.index,label:g.label,ontologyId:g.ontologyId,meshes:all,sourceGroup:true,descendantNodeIndices:g.descendantMeshes.map(x=>x.index)};
 });
 return [...direct,...result].sort((a,b)=>a.label.localeCompare(b.label)||a.index-b.index);
}
