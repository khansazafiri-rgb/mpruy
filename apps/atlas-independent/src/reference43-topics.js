import {REFERENCE43_TOPIC_ROWS} from './reference43-topic-catalog.js';
export const REGION_TOPICS={all:'Semua topik regio',neck:'Leher','neck-thorax':'Leher dan toraks',brain:'Otak','head-neck':'Kepala dan leher','neck-upper-limb':'Leher dan ekstremitas atas','upper-limb':'Ekstremitas atas',spine:'Spinal',thorax:'Toraks',abdomen:'Abdomen',pelvis:'Pelvis',scrotum:'Skrotum','abdomen-pelvis':'Abdomen dan pelvis',groin:'Inguinal',foot:'Kaki','lower-limb':'Ekstremitas bawah',multiregion:'Lintas regio',unknown:'Belum dipetakan'};
export const SYSTEM_TOPICS={all:'Semua topik sistem',nervous:'Saraf',ligament:'Ligamen',cartilage:'Diskus dan kartilago',vascular:'Vaskular',heart:'Jantung',endocrine:'Endokrin',digestive:'Pencernaan',urinary:'Urinaria',reproductive:'Reproduksi',lymphoid:'Organ limfoid',respiratory:'Respirasi',unknown:'Belum dipetakan'};
const rows=new Map(REFERENCE43_TOPIC_ROWS.map(r=>[r.fj,r]));
export function referenceTopic(e){
 const r=rows.get(e?.fj);
 if(!r||e.source!=='BodyParts3D 4.3'||e.fmaId!==r.fmaId||e.bpId!==r.bpId||e.name!==r.name||e.rawSHA256!==r.rawSHA256)return {region:'unknown',system:'unknown'};
 return {region:r.region,system:r.system};
}
export function browseReferenceTopics(entries,{region='all',system='all',query=''}={}){
 if(!Object.hasOwn(REGION_TOPICS,region)||!Object.hasOwn(SYSTEM_TOPICS,system))return [];
 const q=String(query).trim().toLowerCase();
 return entries.filter(e=>{const t=referenceTopic(e);return (region==='all'||t.region===region)&&(system==='all'||t.system===system)&&[e.name,e.version,e.fj,e.fmaId,e.bpId].some(v=>String(v??'').toLowerCase().includes(q));});
}
export function topicOptions(entries,axis){
 const labels=axis==='region'?REGION_TOPICS:axis==='system'?SYSTEM_TOPICS:null;
 if(!labels)throw Error('Unknown topic axis');
 return Object.entries(labels).map(([value,label])=>({value,label,count:value==='all'?entries.length:entries.filter(e=>referenceTopic(e)[axis]===value).length})).filter(e=>e.value==='all'||e.count>0);
}
