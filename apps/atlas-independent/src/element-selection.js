// Exact source-element identities. No inferred geometry, names or tissue assignment.
export function validateElementCatalog(doc,bodyEntries){
 if(doc?.schema!==1||doc.publicRelease!=='NO_GO'||doc.clinicalValidation!==false||!Array.isArray(doc.items))throw Error('Katalog seleksi tidak valid');
 const owners=new Map(bodyEntries.map(e=>[e.id,e])),seen=new Set(),fmas=new Set(bodyEntries.map(e=>e.fmaId));
 for(const e of doc.items){
  if(!/^sel-[a-f0-9]{24}$/.test(e.id||'')||seen.has(e.id)||!/^FMA\d+$/.test(e.fmaId||'')||fmas.has(e.fmaId)||!/^BP\d+$/.test(e.bpId||'')||typeof e.name!=='string'||!e.name.trim()||e.selectionOnly!==true||e.approvedForDistribution!==false||e.clinicalValidation!==false||e.classificationProvisional!==true||!['isa','partof'].includes(e.sourceTree)||!Array.isArray(e.bindings)||!e.bindings.length||!Array.isArray(e.regions)||e.regions.length!==1||e.regions[0]!=='whole')throw Error('Identitas seleksi tidak valid');
  const keys=new Set();
  for(const b of e.bindings){
   const owner=owners.get(b.ownerId),key=b.ownerId+':'+b.elementId;
   if(!owner||owner.group!==e.group||!/^FJ\d+[A-Za-z]?$/.test(b.elementId||'')||keys.has(key))throw Error('Elemen seleksi tidak valid');
   keys.add(key);
  }
  seen.add(e.id);fmas.add(e.fmaId);
 }
 return doc.items;
}
export const elementKey=(ownerId,elementId)=>ownerId+':'+elementId;
export const elementKeys=e=>new Set((e?.bindings||[]).map(b=>elementKey(b.ownerId,b.elementId)));
export const ownsElement=(e,ownerId,elementId)=>!!e?.selectionOnly&&e.bindings.some(b=>b.ownerId===ownerId&&b.elementId===elementId);
export function meshElementId(mesh){
 // GLTFLoader attaches node extras to userData. A plain mesh name is not proof.
 const value=mesh?.userData?.officialElementFileId;
 return /^FJ\d+[A-Za-z]?$/.test(value||'')?value:null;
}
export function hasExactElements(entry,loaded){
 if(!entry?.selectionOnly)return false;
 return entry.bindings.every(b=>loaded.get(b.ownerId)?.has(b.elementId)===true);
}
