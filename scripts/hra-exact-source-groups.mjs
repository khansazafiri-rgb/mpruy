import assert from 'node:assert/strict';
export function resolveSourceGroups(gltf,labels){
 const nodes=gltf.nodes||[],meshes=gltf.meshes||[];
 assert(nodes.length<=10000&&meshes.length<=10000,'Source graph cap');
 const parents=new Map();
 for(const [i,n] of nodes.entries()){
  assert(!n.children||Array.isArray(n.children),'Invalid source children');
  if(n.mesh!==undefined)assert(Number.isInteger(n.mesh)&&n.mesh>=0&&n.mesh<meshes.length,'Invalid source mesh');
  for(const child of n.children||[]){assert(Number.isInteger(child)&&child>=0&&child<nodes.length&&!parents.has(child),'Repeated/invalid source parent');parents.set(child,i);}
 }
 const scene=gltf.scenes?.[gltf.scene??0];assert(scene&&Array.isArray(scene.nodes),'Missing default source scene');
 const reachable=new Set(),active=new Set();
 function visit(i){assert(Number.isInteger(i)&&i>=0&&i<nodes.length&&!active.has(i)&&!reachable.has(i),'Repeated/cyclic source scene node');active.add(i);reachable.add(i);for(const c of nodes[i].children||[])visit(c);active.delete(i);}
 for(const i of scene.nodes){assert(!parents.has(i),'Scene root is a child');visit(i);}
 const result=[];
 for(const row of labels.filter(x=>x.status!=='EXACT_NAMED_MESH_NODE')){
  const hits=nodes.map((n,i)=>({n,i})).filter(x=>x.n.name===row.nodeName);
  const base={nodeName:row.nodeName,ontologyId:row.ontologyId,label:row.label};
  if(hits.length!==1||!reachable.has(hits[0].i)||hits[0].n.mesh!==undefined){result.push({...base,status:'HOLD_NO_UNIQUE_SOURCE_GROUP'});continue;}
  const descendants=[];
  function collect(i){const n=nodes[i];if(Number.isInteger(n.mesh))descendants.push({index:i,nodeName:n.name??null,meshIndex:n.mesh});for(const c of n.children||[])collect(c);}
  for(const i of hits[0].n.children||[])collect(i);
  if(!descendants.length||descendants.some(x=>!reachable.has(x.index))){result.push({...base,status:'HOLD_EMPTY_SOURCE_GROUP'});continue;}
  result.push({...base,index:hits[0].i,descendantMeshes:descendants,status:'EXACT_SOURCE_GROUP_DESCENDANTS',clinicalValidation:false,registrationValidated:false});
 }
 return result;
}
