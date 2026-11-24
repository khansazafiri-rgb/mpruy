export const groups={skeletal:'Tulang',muscular:'Otot',joints:'Sendi',arterial:'Arteri',venous:'Vena',heart:'Jantung',nervous:'Saraf',lymphatic:'Limfatik',respiratory:'Napas',digestive:'Cerna',urinary:'Kemih',reproductive:'Reproduksi',endocrine:'Endokrin'};
export const regions={whole:'Seluruh tubuh',headNeck:'Kepala & leher',thorax:'Toraks',abdomen:'Abdomen',pelvis:'Pelvis',back:'Punggung',upperLimb:'Ekstremitas atas',lowerLimb:'Ekstremitas bawah'};
export function validateInventory(doc,host){
 if(doc?.schema!==1||doc.mode!=='private-review'||host!=='127.0.0.1'||doc.publicRelease!=='NO_GO'||!Array.isArray(doc.entries))throw Error('Inventaris belum diizinkan untuk viewer ini');
 const ids=new Set();
 for(const e of doc.entries){
  if(!/^za-[a-f0-9]{24}$/.test(e.id)||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!Object.hasOwn(groups,e.group)||!Array.isArray(e.regions)||!e.regions.length||e.regions.some(r=>!Object.hasOwn(regions,r))||e.path!=='models/'+e.id+'.glb'||e.approvedForDistribution!==false)throw Error('Identitas inventaris tidak valid');
  ids.add(e.id);
 }
 return doc.entries;
}
export function matchesRegion(entry,region){return region==='whole'||entry.regions.includes(region);}
export function searchEntries(entries,query){const q=query.trim().toLowerCase();return q.length<2?[]:entries.filter(e=>e.name.toLowerCase().includes(q)).slice(0,40);}
