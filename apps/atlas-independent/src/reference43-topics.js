import {COMPONENT43_TOPIC_ROWS} from './reference43-component-catalog.js';
import {MUSCLE43_TOPIC_ROWS} from './reference43-muscle-catalog.js';
import {REFERENCE43_TOPIC_ROWS} from './reference43-topic-catalog.js';
import {EXPANSION43_TOPIC_ROWS} from './reference43-expansion-catalog.js';
export {EXPANSION43_TOPIC_ROWS};
export const SUPPLEMENTAL43_TOPIC_ROWS=Object.freeze([{"fj":"FJ2772","bpId":"BP22977","fmaId":"FMA52749","name":"Hyoid bone","rawSHA256":"0e29dd64fd4bca2c4c6e2079bf6df138f033f11faf2d3702ab5788b7e3357d49","region":"neck","system":"skeletal"},{"fj":"FJ3201","bpId":"BP22977","fmaId":"FMA52749","name":"Hyoid bone","rawSHA256":"167054d8b26c55d574fe8ddbfa40850b96311f6a90593cb3402c0df8c5584681","region":"neck","system":"skeletal"}].map(Object.freeze));
export const REGION_TOPICS={all:'Semua topik regio',neck:'Leher','neck-thorax':'Leher dan toraks',brain:'Otak','head-neck':'Kepala dan leher','neck-upper-limb':'Leher dan ekstremitas atas','upper-limb':'Ekstremitas atas',spine:'Spinal',thorax:'Toraks',abdomen:'Abdomen',pelvis:'Pelvis',scrotum:'Skrotum','abdomen-pelvis':'Abdomen dan pelvis',groin:'Inguinal',foot:'Kaki','lower-limb':'Ekstremitas bawah',multiregion:'Lintas regio',unknown:'Belum dipetakan'};
export const SYSTEM_TOPICS={all:'Semua topik sistem',skeletal:'Skeletal',muscular:'Otot',nervous:'Saraf',ligament:'Ligamen',cartilage:'Diskus dan kartilago',vascular:'Vaskular',heart:'Jantung',endocrine:'Endokrin',digestive:'Pencernaan',urinary:'Urinaria',reproductive:'Reproduksi',lymphoid:'Organ limfoid',respiratory:'Respirasi',unknown:'Belum dipetakan'};
const rows=new Map([...REFERENCE43_TOPIC_ROWS,...SUPPLEMENTAL43_TOPIC_ROWS,...EXPANSION43_TOPIC_ROWS,...MUSCLE43_TOPIC_ROWS,...COMPONENT43_TOPIC_ROWS].map(r=>[r.fj,r]));
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
