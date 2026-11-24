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
