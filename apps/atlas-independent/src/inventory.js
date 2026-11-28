import {layerLabels,normalizeName} from './study-state.js';
export const groups={skeletal:'Tulang',muscular:'Otot',joints:'Sendi',arterial:'Arteri',venous:'Vena',heart:'Jantung',nervous:'Saraf',lymphatic:'Limfatik',respiratory:'Napas',digestive:'Cerna',urinary:'Kemih',reproductive:'Reproduksi',endocrine:'Endokrin'};
export const regions={whole:'Seluruh tubuh',headNeck:'Kepala & leher',thorax:'Toraks',abdomen:'Abdomen',pelvis:'Pelvis',back:'Punggung',upperLimb:'Ekstremitas atas',lowerLimb:'Ekstremitas bawah'};
export function validateInventory(doc,host){
 if(doc?.schema!==1||doc.mode!=='private-review'||host!=='127.0.0.1'||doc.publicRelease!=='NO_GO'||!Array.isArray(doc.entries))throw Error('Inventaris belum diizinkan untuk viewer ini');
 const independent=doc.sourceKind==='independent-bp3d';
 if(independent&&doc.sourceFrame!=='native-official-OBJ')throw Error('Frame sumber independen tidak valid');
 const ids=new Set();
 for(const e of doc.entries){
  if(!(independent?/^bp-[a-f0-9]{24}$/:/^za-[a-f0-9]{24}$/).test(e.id)||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!Object.hasOwn(groups,e.group)||!Array.isArray(e.regions)||!e.regions.length||e.regions.some(r=>!Object.hasOwn(regions,r))||(e.layer!==undefined&&(!Number.isInteger(e.layer)||e.layer<0||e.layer>=layerLabels[e.group].length))||e.path!=='models/'+e.id+'.glb'||e.approvedForDistribution!==false)throw Error('Identitas inventaris tidak valid');
  if(independent&&(e.source!=='BodyParts3D 4.0'||e.classificationProvisional!==true||e.regions.length!==1||e.regions[0]!=='whole'||e.layer!==undefined||!/^FMA\d+$/.test(e.fmaId)||!/^BP\d+$/.test(e.bpId)))throw Error('Metadata BodyParts3D belum valid');
  ids.add(e.id);
 }
 return doc.entries;
}
export function matchesRegion(entry,region){return region==='whole'||entry.regions.includes(region);}
export function searchEntries(entries,query){const q=normalizeName(query);return q.length<2?[]:entries.filter(e=>normalizeName(e.name).includes(q)||e.name.toLowerCase().includes(q)).slice(0,40);}
